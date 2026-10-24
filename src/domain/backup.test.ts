import { describe, expect, it } from 'vitest';
import { createDefaultAppData, validateAppData } from './models';
import { parseBackupJson, serializeBackup } from './backup';

function populatedData() {
  const data = createDefaultAppData('2026-10-01T08:00:00.000Z');
  data.profile.totalXp = 245;
  data.profile.displayName = 'Aki';
  data.companion = { ...data.companion, characterId: 'original-id', displayName: 'Hoshi', personality: 'friendly-rival' };
  data.preferences.accentColor = 'violet';
  data.progression.xpAwards.push({ id: 'session:historic', sourceType: 'session', sourceId: 'historic', amount: 37, awardedAt: '2026-10-02T08:00:00.000Z' });
  data.progression.unlockedTitles.push({ id: 'first-step', unlockedAt: '2026-10-02T08:00:00.000Z' });
  data.progression.equippedTitleId = 'first-step';
  data.achievements.push({ id: 'first-session', title: 'Arco iniciado', description: 'Primeira sessão', category: 'journey', unlockedAt: '2026-10-02T08:00:00.000Z' });
  data.missions.push({ id: 'weekly-sets:2026-09-28', title: 'Base', description: 'Séries', status: 'completed', category: 'weekly', progress: 8, target: 8, rewardXp: 30, weekKey: '2026-09-28', claimedAt: '2026-10-02T08:00:00.000Z' });
  data.sessions.push({ id: 'historic', routineId: 'deleted-routine', routineName: 'Ficha antiga', startedAt: '2026-10-02T07:00:00.000Z', completedAt: '2026-10-02T08:00:00.000Z', status: 'completed', exercises: [{ id: 'snap-ex-1', sourceExerciseId: 'deleted-exercise', name: 'Nome preservado', plannedSets: [{ targetReps: 8 }], performedSets: [{ reps: 8, load: 10.5, rir: 2, notes: 'boa forma', completed: true }], order: 0 }] });
  data.sessions.push({ id: 'active', routineId: 'routine-a', routineName: 'Upper A', startedAt: '2026-10-03T08:00:00.000Z', status: 'in-progress', exercises: [], restTimer: { status: 'running', durationSeconds: 90, remainingSeconds: 60, endsAt: '2026-10-03T08:01:00.000Z', exerciseId: 'e1', setIndex: 0 } });
  return data;
}

function envelope(data: unknown, schema = 2) {
  return JSON.stringify({ format: 'training-arc-2-backup', backupVersion: 1, applicationSchemaVersion: schema,
    exportedAt: '2026-10-23T12:00:00.000Z', data });
}

describe('backup JSON', () => {
  it('round-trips agenda and sequence without replaying session events', () => {
    const data = createDefaultAppData('2026-10-01T08:00:00.000Z');
    data.weeklySchedule = { monday: { type: 'workout', routineId: data.routines[0]!.id }, sunday: { type: 'rest' } };
    data.workoutSequence = { routineIds: [data.routines[0]!.id], currentIndex: 0, repeat: true, processedSessionIds: ['already-counted'], completed: false };
    const result = parseBackupJson(serializeBackup(data, '2026-10-02T08:00:00.000Z'));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.backup.data.weeklySchedule).toEqual(data.weeklySchedule);
    expect(result.backup.data.workoutSequence).toEqual(data.workoutSequence);
  });
  it('exports and imports the full state without changing historical snapshots, active timer, XP or preferences', () => {
    const original = populatedData();
    const parsed = parseBackupJson(serializeBackup(original, '2026-10-23T12:00:00.000Z'));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.backup.data).toEqual(original);
    expect(validateAppData(parsed.backup.data)).toBe(true);
    expect(parsed.backup.summary).toMatchObject({ routines: 4, completedSessions: 1, inProgressSessions: 1, achievements: 1, companionName: 'Hoshi' });
    expect(parsed.backup.data.sessions[0]?.routineId).toBe('deleted-routine');
    expect(parsed.backup.data.sessions[0]?.exercises[0]?.name).toBe('Nome preservado');
    expect(parsed.backup.data.sessions[1]?.restTimer?.endsAt).toBe('2026-10-03T08:01:00.000Z');
    expect(parsed.backup.data.progression.xpAwards[0]?.amount).toBe(37);
    expect(parsed.backup.data.profile.totalXp).toBe(245);
  });

  it('rejects malformed JSON, unknown formats and unsupported versions', () => {
    expect(parseBackupJson('{broken')).toMatchObject({ ok: false });
    expect(parseBackupJson(envelope(populatedData()).replace('training-arc-2-backup', 'other'))).toMatchObject({ ok: false, message: expect.stringContaining('formato') });
    expect(parseBackupJson(envelope(populatedData()).replace('"backupVersion":1', '"backupVersion":99'))).toMatchObject({ ok: false, message: expect.stringContaining('versão do formato') });
    expect(parseBackupJson(envelope(populatedData(), 99))).toMatchObject({ ok: false, message: expect.stringContaining('schema') });
  });

  it('rejects missing fields, invalid domain values and unknown nested properties', () => {
    const data = populatedData();
    const noRoutines = { ...data, routines: undefined };
    expect(parseBackupJson(envelope(noRoutines))).toMatchObject({ ok: false });
    const invalidLoad = structuredClone(data);
    invalidLoad.sessions[0]!.exercises[0]!.performedSets[0]!.load = -2;
    expect(parseBackupJson(envelope(invalidLoad))).toMatchObject({ ok: false });
    const unknown = { ...data, profile: { ...data.profile, privateExtra: 'not silently ignored' } };
    expect(parseBackupJson(envelope(unknown))).toMatchObject({ ok: false, message: expect.stringContaining('desconhecidos') });
  });

  it('migrates supported schema 1 backups without generating XP or losing existing totals', () => {
    const data = populatedData() as unknown as Record<string, unknown>;
    delete data.progression;
    data.schemaVersion = 1;
    const parsed = parseBackupJson(envelope(data, 1));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.backup.data.schemaVersion).toBe(2);
    expect(parsed.backup.data.profile.totalXp).toBe(245);
    expect(parsed.backup.data.progression.xpAwards).toEqual([{ id: 'session:historic', sourceType: 'session', sourceId: 'historic', amount: 0, awardedAt: '2026-10-02T08:00:00.000Z' }]);
    expect(parsed.backup.warnings[0]).toContain('schema 1');
  });

  it('adds a zero XP guard receipt for old completed sessions missing one', () => {
    const data = populatedData();
    data.progression.xpAwards = [];
    const result = parseBackupJson(envelope(data));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.backup.data.profile.totalXp).toBe(245);
    expect(result.backup.data.progression.xpAwards).toEqual([{ id: 'session:historic', sourceType: 'session', sourceId: 'historic', amount: 0, awardedAt: '2026-10-02T08:00:00.000Z' }]);
    expect(result.backup.warnings.join(' ')).toContain('0 XP');
  });

  it('normalizes a removed companion in an older backup without replaying or dropping user data', () => {
    const data = populatedData();
    data.companion = { ...data.companion, characterId: 'naruto-uzumaki', displayName: 'Naruto Uzumaki', personality: 'friendly-rival', personalityName: 'Rival gentil' };
    const parsed = parseBackupJson(envelope(data));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.backup.data.companion).toMatchObject({ characterId: 'yotsuba-nakano', displayName: 'Yotsuba Nakano', personality: 'friendly-rival', personalityName: 'Rival gentil' });
    expect(parsed.backup.data.profile.totalXp).toBe(data.profile.totalXp);
    expect(parsed.backup.data.sessions.map((session) => session.id)).toEqual(data.sessions.map((session) => session.id));
    expect(parsed.backup.data.progression.xpAwards).toEqual(data.progression.xpAwards);
    expect(parsed.backup.warnings.join(' ')).toContain('Yotsuba');
    expect(parsed.backup.summary.companionName).toBe('Yotsuba Nakano');
  });
});
