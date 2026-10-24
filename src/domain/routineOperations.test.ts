import { describe, expect, it } from 'vitest';
import { createDefaultAppData } from './models';
import { validateAppData } from './models';
import {
  addExercise,
  addMissingStarterRoutines,
  createRoutine,
  deleteRoutine,
  duplicateRoutine,
  moveExercise,
  removeExercise,
  updateExercise,
  updateRoutine,
  validateExerciseDraft,
  validateRoutineName,
} from './routineOperations';

const validExercise = {
  name: 'Supino reto',
  plannedSets: [{ targetReps: 8 }, { targetReps: 10 }],
  restSeconds: 90,
  notes: 'Manter controle',
};

describe('starter routines', () => {
  it('includes the four initial editable templates and uses leg extension in Lower A', () => {
    const data = createDefaultAppData('2026-10-22T10:00:00.000Z');
    expect(data.routines.map((routine) => routine.name)).toEqual(['Upper A', 'Upper B', 'Lower A', 'Lower B']);
    const lowerA = data.routines.find((routine) => routine.name === 'Lower A');
    expect(lowerA?.exercises.some((exercise) => exercise.name === 'Cadeira extensora')).toBe(true);
    expect(lowerA?.exercises.some((exercise) => exercise.name.toLowerCase().includes('búlgaro'))).toBe(false);
    expect(data.routines.every((routine) => routine.exercises.length > 0 && routine.exercises.every((exercise) => exercise.plannedSets.length > 0))).toBe(true);
  });

  it('adds missing templates without duplicating existing names or altering other data', () => {
    const data = createDefaultAppData();
    data.routines = [data.routines[0]!];
    data.profile.displayName = 'Kai';
    const next = addMissingStarterRoutines(data, '2026-10-22T12:00:00.000Z');
    expect(next.routines).toHaveLength(4);
    expect(next.profile.displayName).toBe('Kai');
    expect(addMissingStarterRoutines(next).routines).toHaveLength(4);
  });

  it('accepts stage 2 routine data that predates optional rest and routine notes', () => {
    const data = createDefaultAppData();
    delete data.routines[0]!.notes;
    delete data.routines[0]!.exercises[0]!.restSeconds;
    expect(validateAppData(data)).toBe(true);
  });
});

describe('routine operations', () => {
  it('creates and edits routines', () => {
    let data = createDefaultAppData();
    data = createRoutine(data, 'Mobility', 'Evening routine', '2026-10-22T12:00:00.000Z');
    const created = data.routines.at(-1)!;
    expect(created.name).toBe('Mobility');
    data = updateRoutine(data, created.id, 'Mobility plus', 'Updated', '2026-10-22T13:00:00.000Z');
    expect(data.routines.at(-1)).toMatchObject({ name: 'Mobility plus', notes: 'Updated', updatedAt: '2026-10-22T13:00:00.000Z' });
  });

  it('adds, edits, removes and reorders exercises', () => {
    let data = createDefaultAppData();
    const routineId = data.routines[0]!.id;
    const before = data.routines[0]!.exercises[0]!;
    data = addExercise(data, routineId, validExercise);
    const added = data.routines[0]!.exercises.at(-1)!;
    data = updateExercise(data, routineId, added.id, { ...validExercise, name: 'Supino atualizado' });
    expect(data.routines[0]!.exercises.at(-1)?.name).toBe('Supino atualizado');
    data = moveExercise(data, routineId, added.id, -1);
    const ordered = [...data.routines[0]!.exercises].sort((a, b) => a.order - b.order);
    expect(ordered[ordered.length - 2]?.id).toBe(added.id);
    data = removeExercise(data, routineId, before.id);
    expect(data.routines[0]!.exercises.some((exercise) => exercise.id === before.id)).toBe(false);
    expect(data.routines[0]!.exercises.map((exercise) => exercise.order)).toEqual(data.routines[0]!.exercises.map((_, index) => index));
  });

  it('duplicates a routine with new IDs and copied settings', () => {
    const data = createDefaultAppData();
    const original = data.routines[0]!;
    const result = duplicateRoutine(data, original.id);
    const duplicate = result.data.routines.at(-1)!;
    expect(duplicate.id).not.toBe(original.id);
    expect(duplicate.exercises.map((item) => item.id)).not.toEqual(original.exercises.map((item) => item.id));
    expect(duplicate.exercises[0]?.plannedSets).toEqual(original.exercises[0]?.plannedSets);
  });

  it('deletes a routine without deleting historical sessions', () => {
    const data = createDefaultAppData();
    const routineId = data.routines[0]!.id;
    data.sessions.push({ id: 'history-1', routineId, routineName: 'Upper A', startedAt: '2026-10-21T10:00:00.000Z', completedAt: '2026-10-21T11:00:00.000Z', status: 'completed', exercises: [] });
    const next = deleteRoutine(data, routineId);
    expect(next.routines.some((routine) => routine.id === routineId)).toBe(false);
    expect(next.sessions).toEqual(data.sessions);
  });

  it('validates required names, counts, repetitions and rest without producing partial data', () => {
    expect(validateRoutineName('   ').name).toBeTruthy();
    expect(validateExerciseDraft({ name: '', sets: '-2', reps: '0', restSeconds: '-10', notes: '' })).toMatchObject({ errors: { name: expect.any(String), sets: expect.any(String), reps: expect.any(String), restSeconds: expect.any(String) } });
    expect(validateExerciseDraft({ name: 'Row', sets: '3', reps: '8, 10, 12', restSeconds: '90', notes: '' })).toMatchObject({ value: { plannedSets: [{ targetReps: 8 }, { targetReps: 10 }, { targetReps: 12 }] } });
    expect(validateExerciseDraft({ name: 'Row', sets: '3', reps: '8, 10', restSeconds: '90', notes: '' })).toMatchObject({ errors: { reps: expect.any(String) } });
  });
});
