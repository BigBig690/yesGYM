import type { AppData, PlannedSet, Routine, RoutineExercise } from './models';
import { addMissingStarterRoutines as findMissingStarterRoutines } from './routineTemplates';
import { removeRoutineFromTrainingPlan } from './trainingPlan';

export type RoutineNameErrors = { name?: string };

export type ExerciseDraft = {
  name: string;
  sets: string;
  reps: string;
  restSeconds: string;
  notes: string;
};

export type ExerciseDraftErrors = {
  name?: string;
  sets?: string;
  reps?: string;
  restSeconds?: string;
};

export type ValidatedExerciseDraft = {
  name: string;
  plannedSets: PlannedSet[];
  restSeconds: number;
  notes?: string;
};

export function validateRoutineName(name: string): RoutineNameErrors {
  return name.trim() ? {} : { name: 'Informe um nome para a rotina.' };
}

function parseWholeNumber(value: string): number | null {
  if (!/^\d+$/.test(value.trim())) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export function validateExerciseDraft(draft: ExerciseDraft): { value: ValidatedExerciseDraft } | { errors: ExerciseDraftErrors } {
  const errors: ExerciseDraftErrors = {};
  const sets = parseWholeNumber(draft.sets);
  const repValues = draft.reps.split(',').map((part) => parseWholeNumber(part));
  const restSeconds = parseWholeNumber(draft.restSeconds);

  if (!draft.name.trim()) errors.name = 'Informe o nome do exercício.';
  if (sets === null || sets < 1 || sets > 30) errors.sets = 'Use um número inteiro de 1 a 30 séries.';
  if (repValues.length === 0 || repValues.some((reps) => reps === null || reps < 1 || reps > 1000)) {
    errors.reps = 'Use repetições inteiras entre 1 e 1000.';
  } else if (sets !== null && repValues.length !== 1 && repValues.length !== sets) {
    errors.reps = 'Informe um valor ou um valor para cada série.';
  }
  if (restSeconds === null || restSeconds > 7200) errors.restSeconds = 'Use um descanso inteiro entre 0 e 7200 segundos.';
  if (Object.keys(errors).length > 0 || sets === null || restSeconds === null) return { errors };

  const validRepValues = repValues.filter((reps): reps is number => reps !== null);
  const plannedReps = validRepValues.length === 1
    ? Array.from({ length: sets }, () => validRepValues[0]!)
    : validRepValues;

  return {
    value: {
      name: draft.name.trim(),
      plannedSets: plannedReps.map((targetReps) => ({ targetReps })),
      restSeconds,
      notes: draft.notes.trim() || undefined,
    },
  };
}

export function createStableId(prefix: string): string {
  return `${prefix}-${globalThis.crypto.randomUUID()}`;
}

export function addMissingStarterRoutines(data: AppData, now = new Date().toISOString()): AppData {
  const missing = findMissingStarterRoutines(data.routines, now);
  return missing.length === 0 ? data : { ...data, routines: [...data.routines, ...missing] };
}

export function createRoutine(data: AppData, name: string, notes: string, now = new Date().toISOString()): AppData {
  const routine: Routine = {
    id: createStableId('routine'),
    name: name.trim(),
    notes: notes.trim() || undefined,
    exercises: [],
    createdAt: now,
    updatedAt: now,
  };
  return { ...data, routines: [...data.routines, routine] };
}

export function updateRoutine(data: AppData, routineId: string, name: string, notes: string, now = new Date().toISOString()): AppData {
  return {
    ...data,
    routines: data.routines.map((routine) => routine.id === routineId
      ? { ...routine, name: name.trim(), notes: notes.trim() || undefined, updatedAt: now }
      : routine),
  };
}

export function addExercise(data: AppData, routineId: string, exercise: ValidatedExerciseDraft, now = new Date().toISOString()): AppData {
  return {
    ...data,
    routines: data.routines.map((routine) => {
      if (routine.id !== routineId) return routine;
      const nextExercise: RoutineExercise = {
        id: createStableId('exercise'),
        ...exercise,
        order: routine.exercises.length,
      };
      return { ...routine, exercises: [...routine.exercises, nextExercise], updatedAt: now };
    }),
  };
}

export function updateExercise(data: AppData, routineId: string, exerciseId: string, exercise: ValidatedExerciseDraft, now = new Date().toISOString()): AppData {
  return {
    ...data,
    routines: data.routines.map((routine) => routine.id !== routineId ? routine : {
      ...routine,
      updatedAt: now,
      exercises: routine.exercises.map((item) => item.id === exerciseId ? {
        ...item, ...exercise,
        ...(item.name.trim().toLocaleLowerCase('pt-BR') === exercise.name.trim().toLocaleLowerCase('pt-BR') ? {} : { catalogExerciseId: undefined }),
      } : item),
    }),
  };
}

export function removeExercise(data: AppData, routineId: string, exerciseId: string, now = new Date().toISOString()): AppData {
  return {
    ...data,
    routines: data.routines.map((routine) => routine.id !== routineId ? routine : {
      ...routine,
      updatedAt: now,
      exercises: routine.exercises.filter((exercise) => exercise.id !== exerciseId)
        .map((exercise, index) => ({ ...exercise, order: index })),
    }),
  };
}

export function moveExercise(data: AppData, routineId: string, exerciseId: string, direction: -1 | 1, now = new Date().toISOString()): AppData {
  return {
    ...data,
    routines: data.routines.map((routine) => {
      if (routine.id !== routineId) return routine;
      const exercises = [...routine.exercises].sort((a, b) => a.order - b.order);
      const index = exercises.findIndex((exercise) => exercise.id === exerciseId);
      const destination = index + direction;
      if (index < 0 || destination < 0 || destination >= exercises.length) return routine;
      [exercises[index], exercises[destination]] = [exercises[destination]!, exercises[index]!];
      return { ...routine, updatedAt: now, exercises: exercises.map((exercise, order) => ({ ...exercise, order })) };
    }),
  };
}

export function duplicateRoutine(data: AppData, routineId: string, now = new Date().toISOString()): { data: AppData; duplicatedId: string | null } {
  const original = data.routines.find((routine) => routine.id === routineId);
  if (!original) return { data, duplicatedId: null };
  const duplicatedId = createStableId('routine');
  const duplicate: Routine = {
    ...original,
    id: duplicatedId,
    name: `${original.name} — cópia`,
    exercises: original.exercises.map((exercise) => ({
      ...exercise,
      id: createStableId('exercise'),
      plannedSets: exercise.plannedSets.map((set) => ({ ...set })),
    })),
    createdAt: now,
    updatedAt: now,
  };
  return { data: { ...data, routines: [...data.routines, duplicate] }, duplicatedId };
}

export function deleteRoutine(data: AppData, routineId: string): AppData {
  const removed = data.routines.find((routine) => routine.id === routineId);
  const planUpdated = removed ? removeRoutineFromTrainingPlan(data, routineId, removed.name) : data;
  return { ...planUpdated, routines: planUpdated.routines.filter((routine) => routine.id !== routineId) };
}
