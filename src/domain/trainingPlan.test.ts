import { describe, expect, it } from 'vitest';
import { createDefaultAppData, validateAppData } from './models';
import { completeWorkoutSession, createWorkoutSession, discardWorkoutSession } from './sessionOperations';
import { deleteRoutine } from './routineOperations';
import { countScheduledWeekProgress, createWorkoutSequence, getScheduledDayStatus, getWeekDates, localDateKey, localDateKeyFromTimestamp, nextSequenceRoutineId, recordSequenceCompletion, reorderSequence, startOfLocalWeek } from './trainingPlan';

describe('agenda e sequência de treino', () => {
  it('preserva a distinção entre semana não configurada e descanso explícito', () => {
    const data = createDefaultAppData();
    expect(data.weeklySchedule).toBeUndefined();
    expect(getScheduledDayStatus(undefined, new Date(2026, 9, 26), data.routines, [])).toBe('unconfigured');
    expect(getScheduledDayStatus({ type: 'rest' }, new Date(2026, 9, 26), data.routines, [])).toBe('rest');
  });

  it('inicia a semana na segunda-feira e atravessa mês e ano usando datas locais', () => {
    expect(localDateKey(startOfLocalWeek(new Date(2026, 10, 1, 23, 30)))).toBe('2026-10-26');
    expect(getWeekDates(new Date(2026, 0, 1)).map(localDateKey)).toEqual(['2025-12-29', '2025-12-30', '2025-12-31', '2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04']);
    expect(localDateKeyFromTimestamp('2026-10-26T01:30:00.000Z')).toBe(localDateKey(new Date('2026-10-26T01:30:00.000Z')));
  });

  it('marca ativa ou concluída apenas a ficha programada no dia local', () => {
    const data = createDefaultAppData();
    const routine = data.routines[0]!;
    const date = new Date(2026, 9, 26, 12);
    const start = createWorkoutSession(data, routine.id, new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9).toISOString(), () => 'generated-id');
    if (!start.ok) throw new Error(start.error);
    const planned = { type: 'workout' as const, routineId: routine.id };
    expect(getScheduledDayStatus(planned, date, data.routines, [start.session])).toBe('active');
    const done = completeWorkoutSession(start.data, start.session.id, new Date(date.getFullYear(), date.getMonth(), date.getDate(), 10).toISOString());
    if (!done.ok) throw new Error(done.error);
    expect(getScheduledDayStatus(planned, date, data.routines, done.data.sessions)).toBe('completed');
    expect(getScheduledDayStatus({ ...planned, routineId: data.routines[1]!.id }, date, data.routines, done.data.sessions)).toBe('pending');
    const discarded = discardWorkoutSession(start.data, start.session.id);
    if (!discarded.ok) throw new Error(discarded.error);
    expect(discarded.data.sessions).toHaveLength(0);
  });

  it('conta dias programados distintos, não sessões extras', () => {
    const data = createDefaultAppData();
    const dates = getWeekDates(new Date(2026, 9, 28));
    const routine = data.routines[0]!;
    const schedule = { monday: { type: 'workout' as const, routineId: routine.id }, wednesday: { type: 'workout' as const, routineId: routine.id }, sunday: { type: 'rest' as const } };
    const completed = (id: string, date: Date) => ({ id, routineId: routine.id, routineName: routine.name, startedAt: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9).toISOString(), completedAt: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 10).toISOString(), status: 'completed' as const, exercises: [] });
    expect(countScheduledWeekProgress(dates, schedule, data.routines, [completed('a', dates[0]!), completed('b', dates[0]!)])).toEqual({ planned: 2, completed: 1 });
  });

  it('cria sequência sem premiar histórico e avança somente na conclusão esperada uma vez', () => {
    const data = createDefaultAppData();
    const [first, second] = data.routines;
    const past = { id: 'past', routineId: first!.id, routineName: first!.name, startedAt: '2026-01-01T09:00:00Z', completedAt: '2026-01-01T10:00:00Z', status: 'completed' as const, exercises: [] };
    const sequence = createWorkoutSequence([first!.id, second!.id], [past]);
    expect(nextSequenceRoutineId(sequence)).toBe(first!.id);
    const active = { ...past, id: 'active', status: 'in-progress' as const, completedAt: undefined };
    expect(recordSequenceCompletion(sequence, active).sequence).toBe(sequence);
    const done = { ...active, status: 'completed' as const, completedAt: '2026-01-02T10:00:00Z' };
    const result = recordSequenceCompletion(sequence, done);
    expect(result.matched).toBe(true);
    expect(result.sequence?.currentIndex).toBe(1);
    expect(recordSequenceCompletion(result.sequence, done).sequence).toBe(result.sequence);
  });

  it('registra conclusão fora de ordem sem avançar e não avança por descarte', () => {
    const data = createDefaultAppData();
    const first = data.routines[0]!;
    const second = data.routines[1]!;
    const sequence = createWorkoutSequence([first.id, second.id], [], true);
    const discardedStart = createWorkoutSession(data, second.id, '2026-01-01T09:00:00Z', () => 'session-2');
    if (!discardedStart.ok) throw new Error(discardedStart.error);
    const discarded = discardWorkoutSession(discardedStart.data, discardedStart.session.id);
    if (!discarded.ok) throw new Error(discarded.error);
    expect(recordSequenceCompletion(sequence, discarded.session).matched).toBeNull();
    const outOfOrder = { ...discarded.session, status: 'completed' as const, completedAt: '2026-01-01T10:00:00Z' };
    const mismatch = recordSequenceCompletion(sequence, outOfOrder);
    expect(mismatch.matched).toBe(false);
    expect(mismatch.sequence?.currentIndex).toBe(0);
    expect(recordSequenceCompletion(mismatch.sequence, outOfOrder).sequence).toBe(mismatch.sequence);
  });

  it('reordena mantendo a rotina esperada, repete o ciclo ou marca o fim', () => {
    const data = createDefaultAppData();
    const ids = data.routines.slice(0, 3).map((item) => item.id);
    const sequence = { ...createWorkoutSequence(ids, [], true), currentIndex: 1 };
    const reordered = reorderSequence(sequence, 0, 2);
    expect(reordered.routineIds[reordered.currentIndex]).toBe(ids[1]);
    const noRepeat = { ...createWorkoutSequence(ids.slice(0, 1), [], false) };
    const completion = { id: 's', routineId: ids[0]!, routineName: 'x', startedAt: '2026-01-01T09:00:00Z', completedAt: '2026-01-01T10:00:00Z', status: 'completed' as const, exercises: [] };
    const result = recordSequenceCompletion(noRepeat, completion);
    expect(result.sequence?.completed).toBe(true);
    expect(nextSequenceRoutineId(result.sequence)).toBeUndefined();
  });

  it('remove refs de rotina excluída sem mexer em sessões históricas', () => {
    const data = createDefaultAppData();
    const routine = data.routines[0]!;
    const history = { id: 'history', routineId: routine.id, routineName: routine.name, startedAt: '2026-01-01T09:00:00Z', completedAt: '2026-01-01T10:00:00Z', status: 'completed' as const, exercises: [] };
    const prepared = { ...data, sessions: [history], weeklySchedule: { monday: { type: 'workout' as const, routineId: routine.id } }, workoutSequence: createWorkoutSequence([routine.id], [], true) };
    const changed = deleteRoutine(prepared, routine.id);
    expect(changed.weeklySchedule?.monday).toEqual({ type: 'unconfigured', removedRoutineName: routine.name });
    expect(changed.workoutSequence?.routineIds).toEqual([]);
    expect(changed.sessions[0]).toBe(history);
  });

  it('valida configuração de agenda e sequência e aceita dados antigos sem esses campos', () => {
    const data = createDefaultAppData();
    const { weeklySchedule: _schedule, workoutSequence: _sequence, ...oldData } = data;
    expect(validateAppData(oldData)).toBe(true);
    expect(validateAppData({ ...data, workoutSequence: { routineIds: ['x', 'x'], currentIndex: 0, repeat: true, processedSessionIds: [], completed: false } })).toBe(false);
    expect(validateAppData({ ...data, weeklySchedule: { funday: { type: 'rest' } } })).toBe(false);
  });
});
