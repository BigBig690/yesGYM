import { describe, expect, it, vi } from 'vitest';
import { createDefaultAppData, validateAppData } from '../domain/models';
import { loadAppData, restoreAppData, saveAppData, STORAGE_KEYS } from './appStorage';
import type { StorageLike } from './appStorage';

function memoryStorage(initial: string | null = null): StorageLike {
  let value = initial;
  return {
    getItem: vi.fn(() => value),
    setItem: vi.fn((_key: string, next: string) => { value = next; }),
    removeItem: vi.fn(() => { value = null; }),
  };
}

describe('loadAppData', () => {
  it('returns default state when there is no saved data', () => {
    const storage = memoryStorage();
    const result = loadAppData(storage);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.source).toBe('initial');
      expect(result.data.schemaVersion).toBe(2);
      expect(result.data.sessions).toEqual([]);
    }
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('reads valid stored data', () => {
    const data = createDefaultAppData('2026-01-01T12:00:00.000Z');
    const result = loadAppData(memoryStorage(JSON.stringify(data)));
    expect(result).toEqual({ ok: true, data, source: 'stored' });
  });

  it('migrates a removed companion selection to Yotsuba while preserving training and companion settings', () => {
    const data = createDefaultAppData('2026-01-01T12:00:00.000Z');
    data.companion = { ...data.companion, characterId: 'tanjiro-kamado', displayName: 'Tanjiro Kamado', personality: 'strategist', personalityName: 'Observadora' };
    data.profile.totalXp = 345;
    data.routines[0]!.name = 'Upper A editada';
    data.sessions.push({ id: 'historic-session', routineId: 'old-routine', routineName: 'Ficha arquivada', startedAt: '2026-01-02T10:00:00.000Z', completedAt: '2026-01-02T11:00:00.000Z', status: 'completed', exercises: [] });
    const storage = memoryStorage(JSON.stringify(data));
    const result = loadAppData(storage);
    expect(result).toMatchObject({ ok: true, source: 'migrated' });
    if (result.ok) {
      expect(result.data.companion).toMatchObject({ characterId: 'yotsuba-nakano', displayName: 'Yotsuba Nakano', personality: 'strategist', personalityName: 'Observadora' });
      expect(result.data.profile.totalXp).toBe(345);
      expect(result.data.routines[0]?.name).toBe('Upper A editada');
      expect(result.data.sessions[0]?.id).toBe('historic-session');
    }
    const saved = JSON.parse(storage.getItem(STORAGE_KEYS.appData) ?? 'null') as ReturnType<typeof createDefaultAppData>;
    expect(saved.companion.characterId).toBe('yotsuba-nakano');
    expect(storage.setItem).toHaveBeenCalledOnce();
  });

  it('preserves a removed selection and all stored data if its compatibility migration cannot be written', () => {
    const data = createDefaultAppData();
    data.companion.characterId = 'monkey-d-luffy';
    data.companion.displayName = 'Monkey D. Luffy';
    const raw = JSON.stringify(data);
    const storage: StorageLike = { getItem: () => raw, setItem: () => { throw new Error('blocked'); }, removeItem: vi.fn() };
    expect(loadAppData(storage)).toMatchObject({ ok: false, code: 'migration-failed' });
    expect(storage.getItem(STORAGE_KEYS.appData)).toBe(raw);
  });

  it('persists and reloads agenda and sequence through the centralized app record', () => {
    const data = { ...createDefaultAppData('2026-01-01T12:00:00.000Z'),
      weeklySchedule: { monday: { type: 'workout' as const, routineId: 'routine-upper-a' }, wednesday: { type: 'rest' as const } },
      workoutSequence: { routineIds: ['routine-upper-a'], currentIndex: 0, repeat: true, processedSessionIds: ['past-session'], completed: false } };
    const storage = memoryStorage();
    expect(saveAppData(data, storage)).toEqual({ ok: true });
    expect(loadAppData(storage)).toMatchObject({ ok: true, data: { weeklySchedule: data.weeklySchedule, workoutSequence: data.workoutSequence } });
  });

  it('detects corrupt JSON and does not replace it', () => {
    const storage = memoryStorage('{broken');
    const result = loadAppData(storage);
    expect(result).toMatchObject({ ok: false, code: 'corrupt' });
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('detects incompatible schema versions and preserves their contents', () => {
    const raw = JSON.stringify({ schemaVersion: 99, retained: true });
    const storage = memoryStorage(raw);
    expect(loadAppData(storage)).toMatchObject({ ok: false, code: 'incompatible-version' });
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(storage.getItem(STORAGE_KEYS.appData)).toBe(raw);
  });

  it('migrates version 1 without removing routines or inventing historical XP', () => {
    const data = createDefaultAppData('2026-01-01T12:00:00.000Z');
    data.profile.totalXp = 77;
    data.sessions.push({ id: 'old-session', routineId: 'old-routine', routineName: 'Upper A', startedAt: '2026-01-02T12:00:00.000Z', completedAt: '2026-01-02T13:00:00.000Z', status: 'completed', exercises: [] });
    const legacy = { ...data, schemaVersion: 1 as const } as Record<string, unknown> & { schemaVersion: 1 };
    delete legacy.progression;
    const storage = memoryStorage(JSON.stringify(legacy));
    const result = loadAppData(storage);
    expect(result).toMatchObject({ ok: true, source: 'migrated' });
    if (result.ok) {
      expect(result.data.schemaVersion).toBe(2);
      expect(result.data.routines).toHaveLength(data.routines.length);
      expect(result.data.profile.totalXp).toBe(77);
      expect(result.data.progression.xpAwards).toEqual([{ id: 'session:old-session', sourceType: 'session', sourceId: 'old-session', amount: 0, awardedAt: '2026-01-02T13:00:00.000Z' }]);
    }
  });

  it('preserves the original data when a schema migration cannot be written', () => {
    const data = createDefaultAppData();
    const legacy = { ...data, schemaVersion: 1 as const } as Record<string, unknown> & { schemaVersion: 1 };
    delete legacy.progression;
    const raw = JSON.stringify(legacy);
    const storage: StorageLike = { getItem: () => raw, setItem: () => { throw new Error('blocked'); }, removeItem: () => undefined };
    expect(loadAppData(storage)).toMatchObject({ ok: false, code: 'migration-failed' });
    expect(storage.getItem(STORAGE_KEYS.appData)).toBe(raw);
  });

  it('repairs a partially invalid progression ledger without replaying old sessions for XP', () => {
    const data = createDefaultAppData();
    data.profile.totalXp = 125;
    data.sessions.push({ id: 'historic', routineId: 'old', routineName: 'Upper A', startedAt: '2026-02-01T10:00:00.000Z', completedAt: '2026-02-01T11:00:00.000Z', status: 'completed', exercises: [] });
    const partial = { ...data, progression: { xpAwards: 'broken', unlockedTitles: [] } };
    const result = loadAppData(memoryStorage(JSON.stringify(partial)));
    expect(result).toMatchObject({ ok: true, source: 'migrated' });
    if (result.ok) {
      expect(result.data.profile.totalXp).toBe(125);
      expect(result.data.progression.xpAwards).toEqual([{ id: 'session:historic', sourceType: 'session', sourceId: 'historic', amount: 0, awardedAt: '2026-02-01T11:00:00.000Z' }]);
    }
  });

  it('protects valid schema 2 sessions missing XP receipts without increasing historical XP', () => {
    const data = createDefaultAppData('2026-01-01T00:00:00.000Z');
    data.profile.totalXp = 145;
    data.sessions.push({ id: 'legacy-session', routineId: 'deleted-routine', routineName: 'Snapshot antigo',
      startedAt: '2026-02-01T10:00:00.000Z', completedAt: '2026-02-01T11:00:00.000Z', status: 'completed', exercises: [] });
    const storage = memoryStorage(JSON.stringify(data));
    const loaded = loadAppData(storage);
    expect(loaded).toMatchObject({ ok: true, source: 'migrated' });
    if (!loaded.ok) return;
    expect(loaded.data.profile.totalXp).toBe(145);
    expect(loaded.data.progression.xpAwards).toEqual([{ id: 'session:legacy-session', sourceType: 'session', sourceId: 'legacy-session', amount: 0, awardedAt: '2026-02-01T11:00:00.000Z' }]);
    const reread = loadAppData(storage);
    expect(reread).toMatchObject({ ok: true, source: 'stored' });
    if (reread.ok) expect(reread.data.profile.totalXp).toBe(145);
  });

  it('reports read failures', () => {
    const storage: StorageLike = { getItem: () => { throw new Error('blocked'); }, setItem: vi.fn(), removeItem: vi.fn() };
    expect(loadAppData(storage)).toMatchObject({ ok: false, code: 'read-failed' });
  });

  it('reports when storage is unavailable', () => {
    expect(loadAppData(null)).toMatchObject({ ok: false, code: 'unavailable' });
  });
});

describe('saveAppData', () => {
  it('writes validated data', () => {
    const storage = memoryStorage();
    expect(saveAppData(createDefaultAppData(), storage)).toEqual({ ok: true });
    expect(storage.setItem).toHaveBeenCalledOnce();
  });

  it('persists routine updates for a subsequent read', () => {
    const storage = memoryStorage();
    const data = createDefaultAppData();
    data.routines[0]!.name = 'Upper A personalizada';
    expect(saveAppData(data, storage)).toEqual({ ok: true });
    const loaded = loadAppData(storage);
    expect(loaded.ok).toBe(true);
    if (loaded.ok) expect(loaded.data.routines[0]?.name).toBe('Upper A personalizada');
  });

  it('reports write failures', () => {
    const storage: StorageLike = { getItem: () => null, setItem: () => { throw new Error('full'); }, removeItem: vi.fn() };
    expect(saveAppData(createDefaultAppData(), storage)).toMatchObject({ ok: false, code: 'write-failed' });
  });

  it('rolls back a partial ordinary save failure to the previous raw document', () => {
    const previous = JSON.stringify(createDefaultAppData('2026-01-01T00:00:00.000Z'));
    let value: string | null = previous;
    let writes = 0;
    const storage: StorageLike = {
      getItem: () => value,
      setItem: (_key, next) => { writes += 1; value = next; if (writes === 1) throw new Error('partial failure'); },
      removeItem: () => { value = null; },
    };
    const next = createDefaultAppData('2026-02-01T00:00:00.000Z');
    next.profile.displayName = 'Novo nome';
    expect(saveAppData(next, storage)).toMatchObject({ ok: false, code: 'write-failed', message: expect.stringContaining('recuperados') });
    expect(value).toBe(previous);
    expect(writes).toBe(2);
  });

  it('does not overwrite corrupt existing data', () => {
    const raw = '{broken';
    const storage = memoryStorage(raw);
    expect(saveAppData(createDefaultAppData(), storage)).toMatchObject({ ok: false, code: 'corrupt' });
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(storage.getItem(STORAGE_KEYS.appData)).toBe(raw);
  });
});

describe('restoreAppData', () => {
  it('replaces the whole validated application state and preserves IDs and data on subsequent read', () => {
    const current = createDefaultAppData('2026-01-01T12:00:00.000Z');
    const storage = memoryStorage(JSON.stringify(current));
    const imported = createDefaultAppData('2026-02-01T12:00:00.000Z');
    imported.routines[0]!.id = 'backup-routine-id';
    imported.sessions.push({ id: 'old-session', routineId: 'removed-routine', routineName: 'Snapshot', startedAt: '2026-02-02T09:00:00.000Z', completedAt: '2026-02-02T10:00:00.000Z', status: 'completed', exercises: [] });
    expect(restoreAppData(imported, storage)).toEqual({ ok: true });
    const loaded = loadAppData(storage);
    expect(loaded).toMatchObject({ ok: true, source: 'migrated' });
    if (loaded.ok) {
      expect(loaded.data.routines[0]?.id).toBe('backup-routine-id');
      expect(loaded.data.sessions[0]?.id).toBe('old-session');
      expect(loaded.data.sessions[0]?.routineId).toBe('removed-routine');
      expect(loaded.data.sessions[0]?.routineName).toBe('Snapshot');
      expect(loaded.data.profile.totalXp).toBe(imported.profile.totalXp);
      expect(loaded.data.progression.xpAwards).toEqual([{ id: 'session:old-session', sourceType: 'session', sourceId: 'old-session', amount: 0, awardedAt: '2026-02-02T10:00:00.000Z' }]);
    }
  });

  it('does not mutate storage when imported data is invalid', () => {
    const original = JSON.stringify(createDefaultAppData());
    const storage = memoryStorage(original);
    const invalid = { ...createDefaultAppData(), schemaVersion: 77 };
    expect(restoreAppData(invalid as ReturnType<typeof createDefaultAppData>, storage)).toMatchObject({ ok: false, code: 'invalid-data' });
    expect(storage.getItem(STORAGE_KEYS.appData)).toBe(original);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('rolls back a partial write failure to the exact raw previous state', () => {
    const previous = '{"old":"preserved exactly"}';
    let value: string | null = previous;
    let writes = 0;
    const storage: StorageLike = {
      getItem: () => value,
      setItem: (_key, next) => { writes += 1; value = next; if (writes === 1) throw new Error('partial failure'); },
      removeItem: () => { value = null; },
    };
    expect(restoreAppData(createDefaultAppData(), storage)).toMatchObject({ ok: false, code: 'write-failed', message: expect.stringContaining('recuperados') });
    expect(value).toBe(previous);
    expect(writes).toBe(2);
  });

  it('leaves original data untouched if the snapshot cannot be read', () => {
    const storage: StorageLike = { getItem: () => { throw new Error('blocked'); }, setItem: vi.fn(), removeItem: vi.fn() };
    expect(restoreAppData(createDefaultAppData(), storage)).toMatchObject({ ok: false, code: 'read-failed' });
    expect(storage.setItem).not.toHaveBeenCalled();
  });
});

describe('domain model validation', () => {
  it('accepts the initial domain model', () => {
    expect(validateAppData(createDefaultAppData())).toBe(true);
  });

  it('rejects invalid session status and malformed dates', () => {
    const data = createDefaultAppData();
    data.sessions.push({
      id: 'session-1', routineId: 'routine-1', routineName: 'Upper A',
      startedAt: 'not-a-date', status: 'completed', completedAt: 'also-not-a-date', exercises: [],
    });
    expect(validateAppData(data)).toBe(false);
  });
});
