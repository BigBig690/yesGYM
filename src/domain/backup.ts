import { CURRENT_SCHEMA_VERSION, validateAppData, validateLegacyAppData } from './models';
import type { AppData, WorkoutSession, XpAward } from './models';
import { normalizeRemovedCompanionSelection } from './companionCatalog';

export const BACKUP_FORMAT = 'training-arc-2-backup' as const;
export const BACKUP_FORMAT_VERSION = 1 as const;

export type BackupSummary = {
  formatVersion: number;
  schemaVersion: number;
  exportedAt?: string;
  routines: number;
  configuredExercises: number;
  completedSessions: number;
  inProgressSessions: number;
  achievements: number;
  progressionRecords: number;
  companionName: string;
};

export type ParsedBackup = {
  data: AppData;
  summary: BackupSummary;
  warnings: string[];
};

export type BackupParseResult = { ok: true; backup: ParsedBackup } | { ok: false; message: string };

type BackupEnvelope = {
  format: typeof BACKUP_FORMAT;
  backupVersion: typeof BACKUP_FORMAT_VERSION;
  applicationSchemaVersion: number;
  exportedAt: string;
  data: AppData;
};

export function createBackup(data: AppData, exportedAt = new Date().toISOString()): BackupEnvelope {
  if (!validateAppData(data)) throw new Error('Os dados atuais não passaram pela validação de backup.');
  return { format: BACKUP_FORMAT, backupVersion: BACKUP_FORMAT_VERSION, applicationSchemaVersion: CURRENT_SCHEMA_VERSION, exportedAt, data: normalizeCompanionInData(data) };
}

export function serializeBackup(data: AppData, exportedAt = new Date().toISOString()): string {
  return JSON.stringify(createBackup(data, exportedAt), null, 2);
}

export function parseBackupJson(json: string): BackupParseResult {
  let parsed: unknown;
  try { parsed = JSON.parse(json) as unknown; }
  catch { return { ok: false, message: 'O arquivo não contém JSON válido.' }; }

  if (!isRecord(parsed)) return invalid('O conteúdo precisa ser um objeto JSON.');
  if (parsed.format !== BACKUP_FORMAT) return invalid('O formato do arquivo não é um backup Training Arc reconhecido.');
  if (parsed.backupVersion !== BACKUP_FORMAT_VERSION) return invalid('A versão do formato de backup não é compatível.');
  if (!hasOnlyKeys(parsed, ['format', 'backupVersion', 'applicationSchemaVersion', 'exportedAt', 'data'])) return invalid('O arquivo contém campos desconhecidos no envelope.');
  if (!Number.isInteger(parsed.applicationSchemaVersion) || typeof parsed.applicationSchemaVersion !== 'number') return invalid('A versão do schema da aplicação está ausente ou inválida.');
  if (parsed.applicationSchemaVersion !== 1 && parsed.applicationSchemaVersion !== CURRENT_SCHEMA_VERSION) return invalid('A versão do schema incluída neste backup não é suportada.');
  if (typeof parsed.exportedAt !== 'string' || !isIso(parsed.exportedAt)) return invalid('A data de exportação está ausente ou inválida.');
  if (!isRecord(parsed.data)) return invalid('Os dados do backup estão ausentes ou inválidos.');

  let data: AppData;
  const warnings: string[] = [];
  if (parsed.applicationSchemaVersion === 1) {
    if (!hasOnlyKeys(parsed.data, ['schemaVersion', 'profile', 'routines', 'sessions', 'achievements', 'missions', 'companion', 'preferences'])
      || parsed.data.schemaVersion !== 1 || !validateLegacyAppData(parsed.data) || !hasOnlyKnownDataKeys(parsed.data, true)) {
      return invalid('Os dados do schema 1 estão incompletos ou não passaram pela validação.');
    }
    data = migrateV1BackupData(parsed.data as Record<string, unknown> & { schemaVersion: 1 });
    warnings.push('Backup do schema 1 migrado para o schema atual. Sessões antigas preservam o XP existente e não recebem XP retroativo.');
  } else {
    if (parsed.data.schemaVersion !== CURRENT_SCHEMA_VERSION || !validateAppData(parsed.data) || !hasOnlyKnownDataKeys(parsed.data, false)) {
      return invalid('Os dados do backup estão incompletos, incompatíveis ou contêm campos desconhecidos.');
    }
    data = parsed.data as unknown as AppData;
  }

  if (!uniqueAwardSources(data.progression.xpAwards)) return invalid('O registro de XP contém recibos duplicados para a mesma origem.');
  const repaired = addZeroReceiptsForUnrecordedSessions(data);
  data = repaired.data;
  if (repaired.count > 0) warnings.push(`${repaired.count} sessão(ões) histórica(s) sem recibo receberam um marcador de 0 XP para impedir premiação duplicada. Nenhum XP foi reconstruído.`);

  const normalizedCompanion = normalizeRemovedCompanionSelection(data.companion);
  if (normalizedCompanion !== data.companion) {
    data = { ...data, companion: normalizedCompanion };
    warnings.push('A companheira removida deste catálogo foi substituída por Yotsuba. Rotinas, histórico, progressão e demais preferências foram preservados.');
  }

  const summary: BackupSummary = {
    formatVersion: BACKUP_FORMAT_VERSION,
    schemaVersion: parsed.applicationSchemaVersion,
    exportedAt: parsed.exportedAt,
    routines: data.routines.length,
    configuredExercises: data.routines.reduce((total, routine) => total + routine.exercises.length, 0),
    completedSessions: data.sessions.filter((session) => session.status === 'completed').length,
    inProgressSessions: data.sessions.filter((session) => session.status === 'in-progress').length,
    achievements: data.achievements.length,
    progressionRecords: data.progression.xpAwards.length + data.progression.unlockedTitles.length,
    companionName: data.companion.displayName,
  };
  return { ok: true, backup: { data, summary, warnings } };
}

function normalizeCompanionInData(data: AppData): AppData {
  const companion = normalizeRemovedCompanionSelection(data.companion);
  return companion === data.companion ? data : { ...data, companion };
}

function addZeroReceiptsForUnrecordedSessions(data: AppData): { data: AppData; count: number } {
  const sessionReceipts = new Set(data.progression.xpAwards.filter((award) => award.sourceType === 'session').map((award) => award.sourceId));
  const missing: XpAward[] = data.sessions.filter((session): session is WorkoutSession & { completedAt: string } =>
    session.status === 'completed' && Boolean(session.completedAt) && !sessionReceipts.has(session.id))
    .map((session) => ({ id: `session:${session.id}`, sourceType: 'session', sourceId: session.id, amount: 0, awardedAt: session.completedAt }));
  return { data: missing.length ? { ...data, progression: { ...data.progression, xpAwards: [...data.progression.xpAwards, ...missing] } } : data, count: missing.length };
}

function migrateV1BackupData(value: Record<string, unknown> & { schemaVersion: 1 }): AppData {
  const sessions = value.sessions as WorkoutSession[];
  return { ...value, schemaVersion: CURRENT_SCHEMA_VERSION, progression: {
    xpAwards: sessions.filter((session): session is WorkoutSession & { completedAt: string } => session.status === 'completed' && Boolean(session.completedAt))
      .map((session) => ({ id: `session:${session.id}`, sourceType: 'session' as const, sourceId: session.id, amount: 0, awardedAt: session.completedAt })),
    unlockedTitles: [],
  } } as unknown as AppData;
}

function uniqueAwardSources(awards: XpAward[]): boolean {
  const keys = awards.map((award) => `${award.sourceType}:${award.sourceId}`);
  return new Set(keys).size === keys.length;
}

function hasOnlyKnownDataKeys(data: Record<string, unknown>, legacy: boolean): boolean {
  const check = (value: unknown, keys: string[]): value is Record<string, unknown> => isRecord(value) && hasOnlyKeys(value, keys);
  const every = (value: unknown, predicate: (item: unknown) => boolean) => Array.isArray(value) && value.every(predicate);
  const plannedSets = (value: unknown) => every(value, (set) => check(set, ['targetReps', 'targetLoad', 'targetRir']));
  if (!check(data, legacy
    ? ['schemaVersion', 'profile', 'routines', 'sessions', 'achievements', 'missions', 'companion', 'preferences']
    : ['schemaVersion', 'profile', 'routines', 'sessions', 'achievements', 'missions', 'progression', 'companion', 'preferences', 'weeklySchedule', 'workoutSequence'])) return false;
  if (!check(data.profile, ['totalXp', 'createdAt', 'displayName', 'title', 'showDisplayName'])) return false;
  if (!check(data.companion, ['characterId', 'displayName', 'appearance', 'personality', 'personalityName'])) return false;
  if (!check(data.preferences, ['weightUnit', 'colorTheme', 'accentColor', 'narrativeStyle', 'reduceMotion'])) return false;
  if (!every(data.routines, (routine) => check(routine, ['id', 'name', 'exercises', 'notes', 'createdAt', 'updatedAt', 'warmupPlan'])
    && (routine.warmupPlan === undefined || every(routine.warmupPlan, (stage) => check(stage, ['id', 'title', 'instructions'])))
    && every(routine.exercises, (exercise) => check(exercise, ['id', 'name', 'notes', 'plannedSets', 'restSeconds', 'order', 'catalogExerciseId']) && plannedSets(exercise.plannedSets)))) return false;
  if (!every(data.sessions, (session) => check(session, ['id', 'routineId', 'routineName', 'startedAt', 'completedAt', 'status', 'exercises', 'notes', 'durationSeconds', 'restTimer', 'warmup'])
    && (session.warmup === undefined || every(session.warmup, (stage) => check(stage, ['id', 'title', 'instructions', 'status'])))
    && every(session.exercises, (exercise) => check(exercise, ['id', 'sourceExerciseId', 'name', 'notes', 'restSeconds', 'plannedSets', 'performedSets', 'order', 'catalogExerciseId'])
      && plannedSets(exercise.plannedSets) && every(exercise.performedSets, (set) => check(set, ['reps', 'load', 'rir', 'notes', 'completed'])))
    && (session.restTimer === undefined || check(session.restTimer, ['status', 'durationSeconds', 'remainingSeconds', 'endsAt', 'exerciseId', 'setIndex'])))) return false;
  if (!every(data.achievements, (item) => check(item, ['id', 'title', 'description', 'criterion', 'unlockedAt', 'category']))) return false;
  if (!every(data.missions, (item) => check(item, ['id', 'title', 'description', 'status', 'completedAt', 'progress', 'target', 'rewardXp', 'weekKey', 'dayKey', 'category', 'claimedAt']))) return false;
  if (!legacy) {
    if (data.weeklySchedule !== undefined && (!check(data.weeklySchedule, ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])
      || Object.values(data.weeklySchedule).some((day) => !check(day, isRecord(day) && (day.type === 'rest' || day.type === 'unconfigured') ? ['type', 'removedRoutineName'] : ['type', 'routineId'])))) return false;
    if (data.workoutSequence !== undefined && (!check(data.workoutSequence, ['routineIds', 'currentIndex', 'repeat', 'processedSessionIds', 'completed', 'lastCompletionMatched'])
      || !every(data.workoutSequence.routineIds, (id) => typeof id === 'string') || !every(data.workoutSequence.processedSessionIds, (id) => typeof id === 'string'))) return false;
    const progression = data.progression;
    if (!check(progression, ['xpAwards', 'unlockedTitles', 'equippedTitleId'])
      || !every(progression.xpAwards, (item) => check(item, ['id', 'sourceType', 'sourceId', 'amount', 'awardedAt']))
      || !every(progression.unlockedTitles, (item) => check(item, ['id', 'unlockedAt']))) return false;
  }
  return true;
}

function hasOnlyKeys(value: Record<string, unknown>, keys: string[]): boolean {
  return Object.keys(value).every((key) => keys.includes(key));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isIso(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(value) && !Number.isNaN(Date.parse(value));
}

function invalid(message: string): BackupParseResult { return { ok: false, message }; }
