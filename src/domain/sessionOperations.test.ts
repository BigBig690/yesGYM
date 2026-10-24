import { describe, expect, it } from 'vitest';
import { createDefaultAppData, validateAppData } from './models';
import {
  adjustRestTimer, completeWorkoutSession, createWorkoutSession, discardWorkoutSession,
  finishExpiredRestTimer, getRestSecondsRemaining, getSessionProgress, pauseRestTimer,
  resumeRestTimer, startRestTimer, togglePerformedSet, updatePerformedSet, validatePerformedSetDraft,
} from './sessionOperations';

function start() {
  const data = createDefaultAppData('2026-01-01T00:00:00.000Z');
  let id = 0;
  const result = createWorkoutSession(data, data.routines[0]!.id, '2026-02-01T10:00:00.000Z', () => `generated-${++id}`);
  if (!result.ok) throw new Error(result.error);
  return result;
}

describe('sessões de treino', () => {
  it('starts a session with an independent snapshot and empty performed sets', () => {
    const result = start();
    const source = result.data.routines[0]!;
    const changed = { ...result.data, routines: result.data.routines.map((routine) => routine.id === source.id ? { ...routine, name: 'Rotina alterada', exercises: [] } : routine) };
    expect(result.session.routineName).toBe(source.name);
    expect(result.session.exercises[0]?.name).toBe(source.exercises[0]?.name);
    expect(result.session.exercises[0]?.performedSets.every((set) => !set.completed && set.reps === undefined && set.load === undefined)).toBe(true);
    expect(changed.sessions[0]?.exercises.length).toBe(result.session.exercises.length);
    expect(validateAppData(result.data)).toBe(true);
  });

  it('prevents concurrent sessions and rejects a deleted routine', () => {
    const result = start();
    expect(createWorkoutSession(result.data, result.data.routines[1]!.id).ok).toBe(false);
    const noRoutines = { ...createDefaultAppData(), routines: [] };
    expect(createWorkoutSession(noRoutines, 'missing').ok).toBe(false);
  });

  it('validates set entries and records decimal loads, reps, RIR and notes', () => {
    expect(validatePerformedSetDraft({ load: '-2', reps: '8', rir: '', notes: '' }).ok).toBe(false);
    expect(validatePerformedSetDraft({ load: '12.5', reps: '8.2', rir: '3', notes: '' }).ok).toBe(false);
    expect(validatePerformedSetDraft({ load: '12.5', reps: '8', rir: '11', notes: '' }).ok).toBe(false);
    const result = start();
    const exercise = result.session.exercises[0]!;
    const saved = updatePerformedSet(result.data, result.session.id, exercise.id, 0, { load: '12.5', reps: '8', rir: '10', notes: 'Boa execução' });
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    const changed = saved.session.exercises[0]!.performedSets[0]!;
    expect(changed).toMatchObject({ load: 12.5, reps: 8, rir: 10, notes: 'Boa execução', completed: false });
    expect(validateAppData(saved.data)).toBe(true);
  });

  it('requires reps to complete a set, counts only completed sets, and preserves values when reopened', () => {
    const result = start();
    const exercise = result.session.exercises[0]!;
    const blankToggle = togglePerformedSet(result.data, result.session.id, exercise.id, 0);
    expect(blankToggle.ok).toBe(false);
    const draft = updatePerformedSet(result.data, result.session.id, exercise.id, 0, { load: '0', reps: '7', rir: '', notes: '' });
    if (!draft.ok) throw new Error(draft.error);
    expect(getSessionProgress(draft.session).completed).toBe(0);
    const marked = togglePerformedSet(draft.data, result.session.id, exercise.id, 0);
    if (!marked.ok) throw new Error(marked.error);
    expect(getSessionProgress(marked.session).completed).toBe(1);
    const reopened = togglePerformedSet(marked.data, result.session.id, exercise.id, 0);
    if (!reopened.ok) throw new Error(reopened.error);
    expect(reopened.session.exercises[0]!.performedSets[0]).toMatchObject({ load: 0, reps: 7, completed: false });
  });

  it('finalizes one session with real duration and refuses repeated finalization', () => {
    const result = start();
    const completed = completeWorkoutSession(result.data, result.session.id, '2026-02-01T10:42:10.000Z');
    if (!completed.ok) throw new Error(completed.error);
    expect(completed.session).toMatchObject({ status: 'completed', durationSeconds: 2530 });
    expect(completed.data.sessions).toHaveLength(1);
    expect(completeWorkoutSession(completed.data, result.session.id).ok).toBe(false);
  });

  it('recovers, pauses, resumes and expires rest from timestamps', () => {
    const result = start();
    const startMs = Date.parse('2026-02-01T10:00:00.000Z');
    const running = startRestTimer(result.data, result.session.id, 90, startMs);
    if (!running.ok) throw new Error(running.error);
    expect(getRestSecondsRemaining(running.session.restTimer!, startMs + 15_500)).toBe(75);
    const paused = pauseRestTimer(running.data, result.session.id, startMs + 15_500);
    if (!paused.ok) throw new Error(paused.error);
    expect(paused.session.restTimer).toMatchObject({ status: 'paused', remainingSeconds: 75 });
    const resumed = resumeRestTimer(paused.data, result.session.id, startMs + 30_000);
    if (!resumed.ok) throw new Error(resumed.error);
    expect(getRestSecondsRemaining(resumed.session.restTimer!, startMs + 105_000)).toBe(0);
    const expired = finishExpiredRestTimer(resumed.data, result.session.id, startMs + 105_000);
    expect(expired?.ok && expired.session.restTimer?.status).toBe('finished');
    expect(adjustRestTimer(paused.data, result.session.id, 120).ok).toBe(true);
  });

  it('discards only the active session and leaves completed history untouched', () => {
    const result = start();
    const completed = completeWorkoutSession(result.data, result.session.id, '2026-02-01T10:20:00.000Z');
    if (!completed.ok) throw new Error(completed.error);
    const withActive = createWorkoutSession(completed.data, completed.data.routines[1]!.id, '2026-02-02T10:00:00.000Z');
    if (!withActive.ok) throw new Error(withActive.error);
    const discarded = discardWorkoutSession(withActive.data, withActive.session.id);
    expect(discarded.ok && discarded.data.sessions.map((session) => session.id)).toEqual([result.session.id]);
  });
});
