import { createDefaultAppData, CURRENT_SCHEMA_VERSION, validateAppData, validateAppDataCore, validateLegacyAppData } from '../domain/models';
import type { AppData, WorkoutSession, XpAward } from '../domain/models';
import { normalizeRemovedCompanionData } from '../domain/companionCatalog';

export const STORAGE_KEYS = {
  appData: 'training-arc-2:data',
} as const;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type LoadResult =
  | { ok: true; data: AppData; source: 'stored' | 'initial' | 'migrated' }
  | { ok: false; code: 'unavailable' | 'read-failed' | 'corrupt' | 'incompatible-version' | 'migration-failed'; message: string };

export type SaveResult =
  | { ok: true }
  | { ok: false; code: 'unavailable' | 'invalid-data' | 'write-failed' | 'read-failed' | 'corrupt' | 'incompatible-version' | 'migration-failed'; message: string };

function browserStorage(): StorageLike | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function loadAppData(storage: StorageLike | null = browserStorage()): LoadResult {
  if (!storage) return { ok: false, code: 'unavailable', message: 'O armazenamento local não está disponível.' };

  let raw: string | null;
  try {
    raw = storage.getItem(STORAGE_KEYS.appData);
  } catch {
    return { ok: false, code: 'read-failed', message: 'Não foi possível ler os dados locais.' };
  }
  if (raw === null) return { ok: true, data: createDefaultAppData(), source: 'initial' };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, code: 'corrupt', message: 'Os dados locais estão corrompidos. O conteúdo original foi preservado.' };
  }
  if (typeof parsed === 'object' && parsed !== null && 'schemaVersion' in parsed
    && (parsed as { schemaVersion?: unknown }).schemaVersion === 1) {
    if (!validateLegacyAppData(parsed)) return { ok: false, code: 'corrupt', message: 'Os dados da versão anterior não passaram pela validação. O conteúdo original foi preservado.' };
    const migrated = normalizeRemovedCompanionData(migrateVersionOneData(parsed));
    try {
      storage.setItem(STORAGE_KEYS.appData, JSON.stringify(migrated));
    } catch {
      return { ok: false, code: 'migration-failed', message: 'Não foi possível atualizar os dados locais. O conteúdo original foi preservado.' };
    }
    return { ok: true, data: migrated, source: 'migrated' };
  }
  if (typeof parsed === 'object' && parsed !== null && 'schemaVersion' in parsed
    && (parsed as { schemaVersion?: unknown }).schemaVersion !== CURRENT_SCHEMA_VERSION) {
    return { ok: false, code: 'incompatible-version', message: 'A versão dos dados locais não é compatível. O conteúdo original foi preservado.' };
  }
  if (!validateAppData(parsed)) {
    if (validateAppDataCore(parsed) && parsed.schemaVersion === CURRENT_SCHEMA_VERSION) {
      const repaired = normalizeRemovedCompanionData(repairProgressionData(parsed));
      try {
        storage.setItem(STORAGE_KEYS.appData, JSON.stringify(repaired));
      } catch {
        return { ok: false, code: 'migration-failed', message: 'Não foi possível reparar os dados de progressão. O conteúdo original foi preservado.' };
      }
      return { ok: true, data: repaired, source: 'migrated' };
    }
    return { ok: false, code: 'corrupt', message: 'Os dados locais não correspondem ao formato esperado. O conteúdo original foi preservado.' };
  }
  // Sessões concluídas sem recibo podem ser anteriores ao ledger de XP. Marque-as
  // com 0 XP para que a reconciliação da interface nunca as premie retroativamente.
  const guarded = normalizeRemovedCompanionData(addZeroReceiptsForUnrecordedSessions(parsed));
  if (guarded !== parsed) {
    try {
      storage.setItem(STORAGE_KEYS.appData, JSON.stringify(guarded));
    } catch {
      return { ok: false, code: 'migration-failed', message: 'Não foi possível proteger o histórico contra recompensas retroativas. O conteúdo original foi preservado.' };
    }
    return { ok: true, data: guarded, source: 'migrated' };
  }
  return { ok: true, data: parsed, source: 'stored' };
}

function addZeroReceiptsForUnrecordedSessions(data: AppData): AppData {
  const recordedIds = new Set(data.progression.xpAwards
    .filter((award) => award.sourceType === 'session')
    .map((award) => award.sourceId));
  const missing = data.sessions.filter((session): session is WorkoutSession & { completedAt: string } =>
    session.status === 'completed' && Boolean(session.completedAt) && !recordedIds.has(session.id));
  if (missing.length === 0) return data;
  return {
    ...data,
    progression: {
      ...data.progression,
      xpAwards: [...data.progression.xpAwards, ...missing.map((session): XpAward => ({
        id: `session:${session.id}`, sourceType: 'session', sourceId: session.id, amount: 0, awardedAt: session.completedAt,
      }))],
    },
  };
}

/** Recupera apenas a progressão parcial; recibos antigos ausentes ficam em 0 XP para não premiar novamente o histórico. */
export function repairProgressionData(value: Record<string, unknown> & { schemaVersion: number }): AppData {
  const sessions = value.sessions as WorkoutSession[];
  const rawProgression = typeof value.progression === 'object' && value.progression !== null
    ? value.progression as Record<string, unknown> : {};
  const existingAwards = Array.isArray(rawProgression.xpAwards) ? uniqueById(rawProgression.xpAwards.filter(isAward)) : [];
  const awardedIds = new Set(existingAwards.filter((award) => award.sourceType === 'session').map((award) => award.sourceId));
  const missingReceipts: XpAward[] = sessions.filter((session) => session.status === 'completed' && session.completedAt && !awardedIds.has(session.id)).map((session) => ({
    id: `session:${session.id}`, sourceType: 'session', sourceId: session.id, amount: 0, awardedAt: session.completedAt!,
  }));
  const titles = Array.isArray(rawProgression.unlockedTitles) ? uniqueById(rawProgression.unlockedTitles.filter((item): item is { id: string; unlockedAt: string } =>
    typeof item === 'object' && item !== null && typeof (item as { id?: unknown }).id === 'string'
    && typeof (item as { unlockedAt?: unknown }).unlockedAt === 'string' && isIsoDate((item as { unlockedAt: string }).unlockedAt))) : [];
  const equippedTitleId = typeof rawProgression.equippedTitleId === 'string' && titles.some((item) => item.id === rawProgression.equippedTitleId)
    ? rawProgression.equippedTitleId : undefined;
  return { ...value, progression: { xpAwards: [...existingAwards, ...missingReceipts], unlockedTitles: titles, ...(equippedTitleId ? { equippedTitleId } : {}) } } as unknown as AppData;
}

function isAward(value: unknown): value is XpAward {
  if (typeof value !== 'object' || value === null) return false;
  const award = value as Partial<XpAward>;
  return typeof award.id === 'string' && typeof award.sourceId === 'string'
    && (award.sourceType === 'session' || award.sourceType === 'mission')
    && typeof award.amount === 'number' && Number.isInteger(award.amount) && award.amount >= 0
    && typeof award.awardedAt === 'string' && isIsoDate(award.awardedAt);
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(value) && !Number.isNaN(Date.parse(value));
}

function uniqueById<T extends { id: string }>(items: T[]): T[] {
  const ids = new Set<string>();
  return items.filter((item) => {
    if (ids.has(item.id)) return false;
    ids.add(item.id);
    return true;
  });
}

/** A migração não reconstrói XP: sessões antigas recebem um recibo de 0 XP para impedir premiação retroativa. */
export function migrateVersionOneData(value: Record<string, unknown> & { schemaVersion: 1 }): AppData {
  const sessions = value.sessions as WorkoutSession[];
  return {
    ...value,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    progression: {
      xpAwards: sessions.filter((session) => session.status === 'completed' && session.completedAt).map((session) => ({
        id: `session:${session.id}`, sourceType: 'session' as const, sourceId: session.id, amount: 0, awardedAt: session.completedAt!,
      })),
      unlockedTitles: [],
    },
  } as unknown as AppData;
}

export function saveAppData(data: AppData, storage: StorageLike | null = browserStorage()): SaveResult {
  if (!storage) return { ok: false, code: 'unavailable', message: 'O armazenamento local não está disponível.' };
  if (!validateAppData(data)) return { ok: false, code: 'invalid-data', message: 'Os dados não passaram pela validação.' };
  const normalizedData = normalizeRemovedCompanionData(data);
  const current = loadAppData(storage);
  if (!current.ok) return current;
  let previous: string | null;
  try { previous = storage.getItem(STORAGE_KEYS.appData); }
  catch { return { ok: false, code: 'read-failed', message: 'Não foi possível proteger os dados atuais antes de salvar.' }; }
  const next = JSON.stringify(normalizedData);
  try {
    storage.setItem(STORAGE_KEYS.appData, next);
    if (storage.getItem(STORAGE_KEYS.appData) !== next) throw new Error('A gravação não pôde ser confirmada.');
    return { ok: true };
  } catch {
    try {
      if (previous === null) storage.removeItem(STORAGE_KEYS.appData);
      else storage.setItem(STORAGE_KEYS.appData, previous);
      if (storage.getItem(STORAGE_KEYS.appData) !== previous) throw new Error('O rollback não pôde ser confirmado.');
      return { ok: false, code: 'write-failed', message: 'Não foi possível gravar. Os dados locais anteriores foram recuperados.' };
    } catch {
      return { ok: false, code: 'write-failed', message: 'Não foi possível gravar, e o navegador não confirmou a recuperação dos dados anteriores. Verifique o armazenamento antes de fechar esta página.' };
    }
  }
}

/** Restaura um único documento validado. O snapshot bruto permite rollback mesmo se um storage simulado falhar após alterar a chave. */
export function restoreAppData(data: AppData, storage: StorageLike | null = browserStorage()): SaveResult {
  if (!storage) return { ok: false, code: 'unavailable', message: 'O armazenamento local não está disponível.' };
  if (!validateAppData(data)) return { ok: false, code: 'invalid-data', message: 'Os dados do backup não passaram pela validação.' };
  const normalizedData = normalizeRemovedCompanionData(data);

  let previous: string | null;
  try { previous = storage.getItem(STORAGE_KEYS.appData); }
  catch { return { ok: false, code: 'read-failed', message: 'Não foi possível proteger os dados atuais antes da restauração.' }; }

  const next = JSON.stringify(normalizedData);
  try {
    storage.setItem(STORAGE_KEYS.appData, next);
    if (storage.getItem(STORAGE_KEYS.appData) !== next) throw new Error('A gravação não pôde ser confirmada.');
    return { ok: true };
  } catch {
    try {
      if (previous === null) storage.removeItem(STORAGE_KEYS.appData);
      else storage.setItem(STORAGE_KEYS.appData, previous);
      if (storage.getItem(STORAGE_KEYS.appData) !== previous) throw new Error('O rollback não pôde ser confirmado.');
      return { ok: false, code: 'write-failed', message: 'A restauração falhou. Os dados locais anteriores foram recuperados.' };
    } catch {
      return { ok: false, code: 'write-failed', message: 'A gravação falhou e o navegador também não confirmou a recuperação dos dados anteriores. Feche outras abas que usem este app e não feche esta página até verificar o armazenamento.' };
    }
  }
}
