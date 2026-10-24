import { describe, expect, it } from 'vitest';
import { createDefaultAppData } from './models';
import type { WorkoutSession } from './models';
import { calculateLevel, calculateSessionXp, claimMission, equipTitle, localDateKey, localWeekKey, reconcileProgression } from './progression';
import { createWorkoutSession, discardWorkoutSession } from './sessionOperations';

function completedSession(id: string, completedAt: string, setCount = 0, reps = 0): WorkoutSession {
  return { id, routineId: 'routine', routineName: 'Upper A', startedAt: completedAt, completedAt, status: 'completed', exercises: [{
    id: `exercise-${id}`, sourceExerciseId: 'source', name: 'Remada', order: 0, plannedSets: Array.from({ length: setCount }, () => ({ targetReps: 8 })),
    performedSets: Array.from({ length: setCount }, (_, index) => ({ completed: true, reps: index === 0 ? reps : 0 })),
  }] };
}

describe('progression domain', () => {
  it('calculates session XP only from a completed event and actually completed sets', () => {
    const noSets = completedSession('empty', '2026-10-20T12:00:00.000Z');
    expect(calculateSessionXp(noSets)).toBe(10);
    expect(calculateSessionXp({ ...noSets, status: 'in-progress', completedAt: undefined })).toBe(0);
    expect(calculateSessionXp(completedSession('sets', '2026-10-20T12:00:00.000Z', 2, 13))).toBe(22);
  });

  it('does not award XP when an in-progress session is discarded', () => {
    const data = createDefaultAppData();
    let id = 0;
    const started = createWorkoutSession(data, data.routines[0]!.id, '2026-10-20T12:00:00.000Z', () => `stable-${++id}`);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    const discarded = discardWorkoutSession(started.data, started.session.id);
    expect(discarded.ok).toBe(true);
    if (!discarded.ok) return;
    const progressed = reconcileProgression(discarded.data, '2026-10-20T13:00:00.000Z');
    expect(progressed.profile.totalXp).toBe(0);
    expect(progressed.progression.xpAwards).toEqual([]);
  });

  it('calculates a deterministic level and multiple level gains without negative levels', () => {
    expect(calculateLevel(-20)).toMatchObject({ level: 1, totalXp: 0, xpIntoLevel: 0, progressPercent: 0 });
    expect(calculateLevel(100)).toMatchObject({ level: 2, xpIntoLevel: 0, xpToNextLevel: 150 });
    expect(calculateLevel(600)).toMatchObject({ level: 4, xpIntoLevel: 150, xpToNextLevel: 250, progressPercent: 60 });
  });

  it('awards the same completed session exactly once and unlocks titles and achievements from history', () => {
    let data = createDefaultAppData();
    data.sessions = Array.from({ length: 12 }, (_, index) => completedSession(`session-${index}`, `2026-10-${String(index + 1).padStart(2, '0')}T12:00:00.000Z`, 1, 10));
    data = reconcileProgression(data, '2026-10-22T12:00:00.000Z');
    const xpAfterFirstRun = data.profile.totalXp;
    const awards = data.progression.xpAwards.length;
    const unlockedAt = data.achievements.find((item) => item.id === 'first-session')?.unlockedAt;
    data = reconcileProgression(data, '2026-10-22T12:00:00.000Z');
    expect(data.profile.totalXp).toBe(xpAfterFirstRun);
    expect(data.progression.xpAwards).toHaveLength(awards);
    expect(data.progression.unlockedTitles.map((item) => item.id)).toEqual(['first-step', 'in-training', 'constant-presence']);
    expect(data.achievements.find((item) => item.id === 'first-session')?.unlockedAt).toBe(unlockedAt);
    expect(data.achievements.find((item) => item.id === 'ten-sets')?.unlockedAt).toBe('2026-10-10T12:00:00.000Z');
  });

  it('only equips unlocked titles', () => {
    const data = createDefaultAppData();
    expect(equipTitle(data, 'in-training')).toMatchObject({ ok: false });
    data.sessions = [completedSession('one', '2026-10-20T12:00:00.000Z')];
    const reconciled = reconcileProgression(data, '2026-10-21T12:00:00.000Z');
    expect(equipTitle(reconciled, 'first-step')).toMatchObject({ ok: true, data: { progression: { equippedTitleId: 'first-step' }, profile: { title: 'Primeiro Passo' } } });
  });

  it('tracks session, completed-set, and weekly consistency mission progress from real records', () => {
    const data = createDefaultAppData();
    data.sessions = [1, 2, 3].map((day) => completedSession(`week-${day}`, `2026-10-20T${String(day + 8).padStart(2, '0')}:00:00.000Z`, 3, 10));
    const next = reconcileProgression(data, '2026-10-22T12:00:00.000Z');
    const first = next.missions.find((item) => item.id === 'first-session');
    const weekKey = localWeekKey('2026-10-20T12:00:00.000Z');
    const series = next.missions.find((item) => item.id === `weekly-sets:${weekKey}`);
    const consistent = next.missions.find((item) => item.id === `weekly-consistency:${weekKey}`);
    expect(first).toMatchObject({ status: 'completed', progress: 1, target: 1 });
    expect(series).toMatchObject({ status: 'completed', progress: 8, target: 8, rewardXp: 30 });
    expect(consistent).toMatchObject({ status: 'completed', progress: 3, target: 3, rewardXp: 60 });
  });

  it('resets weekly objectives by local week and retains the previous week record', () => {
    const data = createDefaultAppData();
    data.sessions = [completedSession('week-a', '2026-10-19T12:00:00.000Z', 8)];
    let next = reconcileProgression(data, '2026-10-19T13:00:00.000Z');
    const oldWeek = localWeekKey('2026-10-19T12:00:00.000Z');
    const nextWeek = localWeekKey('2026-10-26T12:00:00.000Z');
    next = reconcileProgression(next, '2026-10-26T12:00:00.000Z');
    expect(next.missions.find((item) => item.id === `weekly-sets:${oldWeek}`)?.status).toBe('completed');
    expect(next.missions.find((item) => item.id === `weekly-sets:${nextWeek}`)).toMatchObject({ status: 'available', progress: 0 });
    expect(oldWeek).not.toBe(nextWeek);
  });

  it('allows a mission reward to be claimed once and persists an XP receipt', () => {
    let data = createDefaultAppData();
    data.sessions = [completedSession('first', '2026-10-20T12:00:00.000Z')];
    data = reconcileProgression(data, '2026-10-20T12:00:00.000Z');
    const before = data.profile.totalXp;
    const result = claimMission(data, 'first-session', '2026-10-20T13:00:00.000Z');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    data = result.data;
    expect(data.profile.totalXp).toBe(before + 40);
    expect(claimMission(data, 'first-session').ok).toBe(false);
    expect(data.progression.xpAwards.filter((item) => item.sourceType === 'mission')).toHaveLength(1);
  });

  it('tracks daily goals by local civil date and only counts completed work sets', () => {
    const data = createDefaultAppData();
    const scheduledRoutineId = data.routines[0]!.id;
    data.weeklySchedule = { tuesday: { type: 'workout', routineId: scheduledRoutineId } };
    data.sessions = [{ ...completedSession('d1', '2026-10-20T09:00:00-03:00', 2), routineId: scheduledRoutineId },
      { ...completedSession('active', '2026-10-20T10:00:00-03:00', 8), status: 'in-progress', completedAt: undefined }];
    const next = reconcileProgression(data, '2026-10-20T18:00:00-03:00');
    expect(localDateKey('2026-10-20T23:30:00-03:00')).toBe('2026-10-20');
    expect(next.missions.find((mission) => mission.id === `daily-scheduled:2026-10-20:${scheduledRoutineId}`)).toMatchObject({ progress: 1, status: 'completed' });
  });

  it('counts weekly training days distinctly and retains prior daily records across a date change', () => {
    let data = createDefaultAppData();
    data.sessions = [completedSession('a', '2026-10-20T09:00:00-03:00', 1), completedSession('b', '2026-10-20T15:00:00-03:00', 1), completedSession('c', '2026-10-22T09:00:00-03:00', 1)];
    data = reconcileProgression(data, '2026-10-22T18:00:00-03:00');
    const week = localWeekKey('2026-10-20T09:00:00-03:00');
    expect(data.missions.find((mission) => mission.id === `weekly-days:${week}`)).toMatchObject({ progress: 2, status: 'completed' });
    const next = reconcileProgression(data, '2026-10-23T08:00:00-03:00');
    expect(next.missions.some((mission) => mission.id.startsWith('daily-scheduled:2026-10-23:'))).toBe(false);
  });

  it('unlocks additional medals from real history, preserves original dates, and grants no medal XP', () => {
    let data = createDefaultAppData();
    data.sessions = [completedSession('a', '2026-10-05T10:00:00-03:00', 2), completedSession('b', '2026-10-12T10:00:00-03:00', 2),
      { ...completedSession('c', '2026-10-19T10:00:00-03:00', 2), routineId: 'routine-b' }, completedSession('d', '2026-10-26T10:00:00-03:00', 2)];
    data = reconcileProgression(data, '2026-10-26T12:00:00-03:00');
    const date = data.achievements.find((item) => item.id === 'four-active-weeks')?.unlockedAt;
    expect(date).toBe('2026-10-26T10:00:00-03:00');
    expect(data.achievements.find((item) => item.id === 'two-routines')?.unlockedAt).toBe('2026-10-19T10:00:00-03:00');
    const xp = data.profile.totalXp;
    const again = reconcileProgression(data, '2026-10-26T13:00:00-03:00');
    expect(again.achievements.find((item) => item.id === 'four-active-weeks')?.unlockedAt).toBe(date);
    expect(again.profile.totalXp).toBe(xp);
  });
});
