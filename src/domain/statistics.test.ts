import { describe, expect, it } from 'vitest';
import type { PerformedSet, WorkoutSession } from './models';
import { buildActivityCalendar, calculatePersonalRecords, calculateWorkoutStatistics, getExerciseOptions, localDateKey } from './statistics';

function session(id: string, completedAt: string, exerciseName: string, sourceExerciseId: string, performedSets: PerformedSet[], status: WorkoutSession['status'] = 'completed'): WorkoutSession {
  return { id, routineId: `routine-${id}`, routineName: `Rotina ${id}`, startedAt: new Date(Date.parse(completedAt) - 3600_000).toISOString(), completedAt: status === 'completed' ? completedAt : undefined, status,
    durationSeconds: 3600, exercises: [{ id: `performed-${id}`, sourceExerciseId, name: exerciseName, plannedSets: [], performedSets, order: 0 }] };
}

function set(completed: boolean, load?: number, reps?: number): PerformedSet {
  return { completed, ...(load === undefined ? {} : { load }), ...(reps === undefined ? {} : { reps }) };
}

function atLocalDate(year: number, month: number, day: number, hour = 12): string {
  return new Date(year, month, day, hour).toISOString();
}

describe('workout statistics', () => {
  it('calculates volume only from completed sets with a recorded load and repetitions', () => {
    const workouts = [session('valid', '2026-10-20T15:00:00.000Z', 'Supino', 'supino-id', [set(true, 10, 5), set(true, undefined, 7), set(false, 999, 10)]),
      session('active', '2026-10-21T15:00:00.000Z', 'Supino', 'supino-id', [set(true, 100, 10)], 'in-progress')];
    const stats = calculateWorkoutStatistics(workouts, { now: new Date('2026-10-23T12:00:00.000Z') });
    expect(stats).toMatchObject({ sessionCount: 1, completedSets: 2, setsWithoutLoad: 1, totalVolume: 50, volumeSetCount: 1 });
  });

  it('distinguishes no volume data from zero volume and excludes incomplete values from records', () => {
    const workouts = [session('unweighted', '2026-10-20T15:00:00.000Z', 'Flexão', 'push-up', [set(true, undefined, 12), set(false, 100, 20)])];
    expect(calculateWorkoutStatistics(workouts).totalVolume).toBeNull();
    expect(calculatePersonalRecords(workouts).some((record) => record.value === 100 || record.value === 20)).toBe(false);
    const zero = [session('zero', '2026-10-20T15:00:00.000Z', 'Movimento sem carga', 'bodyweight', [set(true, 0, 8)])];
    expect(calculateWorkoutStatistics(zero).totalVolume).toBe(0);
  });

  it('sorts recorded exercise loads chronologically while grouping by stable exercise id, not similar names', () => {
    const workouts = [session('later', '2026-10-22T15:00:00.000Z', 'Supino reto', 'bench-a', [set(true, 42, 8)]),
      session('earlier', '2026-10-20T15:00:00.000Z', 'Supino', 'bench-a', [set(true, 40, 10)]),
      session('homonym', '2026-10-21T15:00:00.000Z', 'Supino reto', 'bench-b', [set(true, 80, 5)])];
    const options = getExerciseOptions(workouts);
    expect(options).toHaveLength(2);
    expect(options.find((item) => item.id === 'bench-a')?.name).toBe('Supino reto');
    const stats = calculateWorkoutStatistics(workouts, { exerciseId: 'bench-a' });
    expect(stats.records.map((record) => record.load)).toEqual([40, 42]);
    expect(stats.records.map((record) => record.exerciseName)).toEqual(['Supino', 'Supino reto']);
    expect(stats.sessionCount).toBe(2);
  });

  it('computes separate exercise records, session volume and a labeled Epley estimate', () => {
    const workouts = [session('first', '2026-10-20T15:00:00.000Z', 'Supino', 'bench', [set(true, 50, 10), set(true, 55, 5)]),
      session('second', '2026-10-22T15:00:00.000Z', 'Remada', 'row', [set(true, 60, 8)])];
    const records = calculatePersonalRecords(workouts);
    expect(records.find((record) => record.id === 'max-load:bench')?.value).toBe(55);
    expect(records.find((record) => record.id === 'max-load:row')?.value).toBe(60);
    expect(records.find((record) => record.id === 'estimated-1rm:bench')?.value).toBeCloseTo(50 * (1 + 10 / 30));
    expect(records.find((record) => record.id === 'best-session-volume')?.value).toBe(775);
    expect(records.find((record) => record.id === 'estimated-1rm:bench')?.estimated).toBe(true);
  });

  it('uses actual local dates across month and year boundaries for the calendar', () => {
    const lastDay = atLocalDate(2026, 11, 31, 23);
    const firstDay = atLocalDate(2027, 0, 1, 0);
    const workouts = [session('december', lastDay, 'Agachamento', 'squat', [set(true, 80, 6)]), session('january', firstDay, 'Agachamento', 'squat', [set(true, 82, 5)])];
    const december = buildActivityCalendar(workouts, 2026, 11);
    const january = buildActivityCalendar(workouts, 2027, 0);
    expect(december.find((day) => day.dateKey === localDateKey(new Date(lastDay)))?.sessions[0]?.id).toBe('december');
    expect(january.find((day) => day.dateKey === localDateKey(new Date(firstDay)))?.sessions[0]?.id).toBe('january');
    expect(december).toHaveLength(42);
    expect(january).toHaveLength(42);
  });

  it('returns genuine empty states and applies rolling period and current-week counts', () => {
    expect(calculateWorkoutStatistics([])).toMatchObject({ sessionCount: 0, completedSets: 0, totalVolume: null, averageDurationSeconds: null });
    const now = new Date(2026, 9, 23, 12);
    const workouts = [session('in-range', atLocalDate(2026, 9, 22), 'Puxada', 'pull', [set(true, 30, 8)]),
      session('old', atLocalDate(2026, 7, 1), 'Puxada', 'pull', [set(true, 20, 8)])];
    expect(calculateWorkoutStatistics(workouts, { period: '30d', now })).toMatchObject({ sessionCount: 1, sessionsThisWeek: 1 });
  });
});
