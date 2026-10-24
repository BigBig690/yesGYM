import { describe, expect, it } from 'vitest';
import { createDefaultAppData, validateAppData } from './models';
import { catalogEntryForRoutineExercise, defaultWarmupPlan, EXERCISE_CATALOG, searchExerciseCatalog } from './exerciseCatalog';
import { createWorkoutSession, resetWarmup, updateWarmupStage } from './sessionOperations';
import { parseBackupJson, serializeBackup } from './backup';

describe('catálogo de exercícios', () => {
  it('associa todos os movimentos das quatro fichas iniciais a IDs e metadados distintos', () => {
    const data = createDefaultAppData('2026-01-01T00:00:00.000Z');
    const initial = data.routines.flatMap((routine) => routine.exercises);
    expect(initial).toHaveLength(20);
    expect(new Set(initial.map((item) => item.catalogExerciseId)).size).toBe(20);
    expect(initial.every((item) => catalogEntryForRoutineExercise(item))).toBe(true);
    expect(EXERCISE_CATALOG).toHaveLength(26);
  });

  it('busca por nome e alias e filtra por músculo, equipamento, categoria e peso corporal', () => {
    expect(searchExerciseCatalog('crucifixo')[0]?.id).toBe('cable-fly');
    expect(searchExerciseCatalog('avanço para trás')[0]?.id).toBe('bodyweight-reverse-lunge');
    expect(searchExerciseCatalog('', { muscle: 'Quadríceps', equipment: 'Cadeira extensora' }).map((item) => item.id)).toContain('leg-extension');
    expect(searchExerciseCatalog('', { type: 'isolado', bodyweight: true })).toEqual([]);
  });

  it('preserva compatibilidade com rotinas legadas e permite movimentos personalizados', () => {
    const routine = createDefaultAppData().routines[0]!;
    delete routine.exercises[0]!.catalogExerciseId;
    expect(catalogEntryForRoutineExercise(routine.exercises[0]! )?.id).toBe('bench-press');
    routine.exercises.push({ id: 'my-move', name: 'Movimento personalizado', plannedSets: [{ targetReps: 8 }], order: 5 });
    expect(catalogEntryForRoutineExercise(routine.exercises[5]!)).toBeUndefined();
  });

  it('snapshota aquecimento e ID de catálogo sem contar aquecimento como série', () => {
    const data = createDefaultAppData('2026-01-01T00:00:00.000Z');
    let nextId = 0;
    const started = createWorkoutSession(data, data.routines[0]!.id, '2026-01-02T10:00:00.000Z', () => `stable-${++nextId}`);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    expect(started.session.exercises[0]?.catalogExerciseId).toBe('bench-press');
    expect(started.session.warmup?.map((step) => step.id)).toEqual(['general', 'specific', 'preparatory']);
    const done = updateWarmupStage(started.data, started.session.id, 'general', 'completed');
    expect(done.ok && done.session.warmup?.[0]?.status).toBe('completed');
    if (!done.ok) return;
    const reset = resetWarmup(done.data, started.session.id);
    expect(reset.ok && reset.session.warmup?.every((step) => step.status === 'pending')).toBe(true);
    expect(validateAppData(reset.ok ? reset.data : done.data)).toBe(true);
    const backup = parseBackupJson(serializeBackup(reset.ok ? reset.data : done.data, '2026-01-02T10:01:00.000Z'));
    expect(backup.ok).toBe(true);
    if (backup.ok) expect(backup.backup.data.sessions[0]?.warmup).toEqual(reset.ok ? reset.session.warmup : done.session.warmup);
  });

  it('gera preparações iniciais diferentes para Upper e Lower e conserva instruções personalizadas', () => {
    const data = createDefaultAppData();
    const plans = data.routines.map((routine) => defaultWarmupPlan(routine));
    expect(plans[0]?.[1]?.instructions).not.toBe(plans[2]?.[1]?.instructions);
    data.routines[0]!.warmupPlan = [{ id: 'general', title: 'Preparação geral', instructions: 'Plano do usuário' }];
    expect(defaultWarmupPlan(data.routines[0]!)).toHaveLength(3);
    expect(defaultWarmupPlan(data.routines[0]!)[0]?.instructions).toBe('Plano do usuário');
    expect(validateAppData(data)).toBe(true);
  });
});
