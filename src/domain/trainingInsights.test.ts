import { describe, expect, it } from 'vitest';
import type { PerformedSet, WorkoutSession } from './models';
import { buildExerciseTrend, summarizeMuscleWork } from './trainingInsights';

function session(id: string, completedAt: string, exercises: WorkoutSession['exercises'], status: WorkoutSession['status'] = 'completed'): WorkoutSession {
  return { id, routineId: 'routine', routineName: 'Upper A', startedAt: completedAt, completedAt: status === 'completed' ? completedAt : undefined, status, exercises };
}
function exercise(id: string, catalogExerciseId: string | undefined, sets: PerformedSet[], name = 'Supino reto com barra') {
  return { id: `snap-${id}`, sourceExerciseId: id, name, ...(catalogExerciseId ? { catalogExerciseId } : {}), order: 0, plannedSets: [{ targetReps: 8 }], performedSets: sets };
}
const done = (reps: number, load?: number, completed = true): PerformedSet => ({ reps, ...(load === undefined ? {} : { load }), completed });

describe('insights por exercício e grupo muscular', () => {
  it('calcula carga, reps e volume somente com séries concluídas válidas', () => {
    const sessions = [session('a', '2026-10-01T12:00:00.000Z', [exercise('bench-id', 'bench-press', [done(8, 20), done(10, 12), done(99, 99, false)])])];
    expect(buildExerciseTrend(sessions, 'bench-id')).toMatchObject([{ completedSets: 2, reps: 18, maximumRecordedLoad: 20, externalLoadVolume: 280 }]);
  });

  it('exclui sessão em andamento, série não concluída, carga ausente e valores sem suporte do volume', () => {
    const sessions = [
      session('active', '2026-10-01T12:00:00.000Z', [exercise('id', 'bench-press', [done(10, 50)])], 'in-progress'),
      session('finished', '2026-10-02T12:00:00.000Z', [exercise('id', 'bench-press', [done(8), done(4, 10, false)])]),
      session('body', '2026-10-03T12:00:00.000Z', [exercise('bw-id', 'bodyweight-reverse-lunge', [done(12, 10)])]),
    ];
    expect(buildExerciseTrend(sessions, 'id')).toMatchObject([{ completedSets: 1, reps: 8, maximumRecordedLoad: null, externalLoadVolume: null }]);
    expect(buildExerciseTrend(sessions, 'bw-id')[0]).toMatchObject({ maximumRecordedLoad: null, externalLoadVolume: null, reps: 12 });
  });

  it('filtra por período local de tempo e limita últimas sessões por exercício', () => {
    const sessions = ['2026-01-01T12:00:00.000Z', '2026-10-01T12:00:00.000Z', '2026-10-20T12:00:00.000Z']
      .map((date, index) => session(`s${index}`, date, [exercise('id', 'bench-press', [done(5, 10)])]));
    expect(buildExerciseTrend(sessions, 'id', '30d', new Date('2026-10-23T12:00:00.000Z')).map((point) => point.sessionId)).toEqual(['s1', 's2']);
    expect(buildExerciseTrend(sessions, 'id', 'sessions', new Date('2026-10-23T12:00:00.000Z'))).toHaveLength(3);
    const twelve = Array.from({ length: 12 }, (_, index) => session(`recent-${index}`, `2026-10-${String(index + 1).padStart(2, '0')}T12:00:00.000Z`, [exercise('id', 'bench-press', [done(5, 10)])]));
    expect(buildExerciseTrend(twelve, 'id', 'sessions').map((point) => point.sessionId)).toEqual(Array.from({ length: 10 }, (_, index) => `recent-${index + 2}`));
  });

  it('ignora repetições negativas e cargas inválidas em dados malformados', () => {
    const malformed = session('bad', '2026-10-20T12:00:00.000Z', [exercise('id', 'bench-press', [])]);
    malformed.exercises[0]!.performedSets.push({ completed: true, reps: -2, load: -20 } as unknown as PerformedSet);
    expect(buildExerciseTrend([malformed], 'id')).toEqual([]);
    expect(summarizeMuscleWork([malformed], 'all').totalUniqueSets).toBe(0);
  });

  it('conta uma série uma vez no total mesmo quando ela contribui para vários músculos', () => {
    const summary = summarizeMuscleWork([session('s', '2026-10-20T12:00:00.000Z', [exercise('id', 'bench-press', [done(8, 20)])])], 'all');
    expect(summary.totalUniqueSets).toBe(1);
    expect(summary.sessions).toBe(1);
    expect(summary.muscles.find((item) => item.muscle === 'Peitoral maior')).toMatchObject({ primarySets: 1, secondarySets: 0, externalLoadVolume: 160 });
    expect(summary.muscles.find((item) => item.muscle === 'Tríceps')).toMatchObject({ primarySets: 0, secondarySets: 1, externalLoadVolume: 160 });
  });

  it('sinaliza exercícios sem metadados e não altera os nomes dos snapshots históricos', () => {
    const old = session('old', '2026-10-20T12:00:00.000Z', [exercise('custom', undefined, [done(9, 5)], 'Nome antigo preservado')]);
    const summary = summarizeMuscleWork([old], 'all');
    expect(summary).toMatchObject({ totalUniqueSets: 1, missingMetadataSets: 1 });
    expect(old.exercises[0]?.name).toBe('Nome antigo preservado');
    expect(buildExerciseTrend([old], 'custom')[0]?.exerciseName).toBe('Nome antigo preservado');
  });
});
