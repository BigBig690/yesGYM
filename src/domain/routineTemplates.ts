import type { Routine, RoutineExercise } from './models';

type ExerciseTemplate = {
  name: string;
  sets: number;
  reps: number;
  restSeconds: number;
  notes?: string;
  catalogId: string;
};

type RoutineTemplate = {
  id: string;
  name: string;
  notes: string;
  exercises: ExerciseTemplate[];
};

const templates: readonly RoutineTemplate[] = [
  {
    id: 'routine-upper-a',
    name: 'Upper A',
    notes: 'Modelo geral editável. Ajuste exercícios, séries e descanso à sua realidade.',
    exercises: [
      { name: 'Supino reto com barra', catalogId: 'bench-press', sets: 3, reps: 8, restSeconds: 120 },
      { name: 'Remada curvada com barra', catalogId: 'barbell-row', sets: 3, reps: 8, restSeconds: 120 },
      { name: 'Desenvolvimento com halteres', catalogId: 'dumbbell-shoulder-press', sets: 3, reps: 10, restSeconds: 90 },
      { name: 'Puxada frontal', catalogId: 'lat-pulldown', sets: 3, reps: 10, restSeconds: 90 },
      { name: 'Elevação lateral', catalogId: 'lateral-raise', sets: 3, reps: 12, restSeconds: 60 },
    ],
  },
  {
    id: 'routine-upper-b',
    name: 'Upper B',
    notes: 'Modelo geral editável. Ajuste exercícios, séries e descanso à sua realidade.',
    exercises: [
      { name: 'Supino inclinado com halteres', catalogId: 'incline-db-press', sets: 3, reps: 10, restSeconds: 90 },
      { name: 'Remada baixa', catalogId: 'seated-cable-row', sets: 3, reps: 10, restSeconds: 90 },
      { name: 'Crucifixo no cabo', catalogId: 'cable-fly', sets: 3, reps: 12, restSeconds: 60 },
      { name: 'Remada unilateral com halter', catalogId: 'single-arm-db-row', sets: 3, reps: 10, restSeconds: 90 },
      { name: 'Rosca direta', catalogId: 'barbell-curl', sets: 3, reps: 12, restSeconds: 60 },
    ],
  },
  {
    id: 'routine-lower-a',
    name: 'Lower A',
    notes: 'Modelo geral editável. Inclui cadeira extensora no lugar de agachamento búlgaro.',
    exercises: [
      { name: 'Leg press', catalogId: 'leg-press', sets: 3, reps: 10, restSeconds: 120 },
      { name: 'Levantamento terra romeno', catalogId: 'romanian-deadlift', sets: 3, reps: 8, restSeconds: 120 },
      { name: 'Cadeira extensora', catalogId: 'leg-extension', sets: 3, reps: 12, restSeconds: 75 },
      { name: 'Mesa flexora', catalogId: 'leg-curl', sets: 3, reps: 12, restSeconds: 75 },
      { name: 'Panturrilha em pé', catalogId: 'standing-calf-raise', sets: 3, reps: 12, restSeconds: 60 },
    ],
  },
  {
    id: 'routine-lower-b',
    name: 'Lower B',
    notes: 'Modelo geral editável. Ajuste exercícios, séries e descanso à sua realidade.',
    exercises: [
      { name: 'Agachamento no hack', catalogId: 'hack-squat', sets: 3, reps: 10, restSeconds: 120 },
      { name: 'Elevação pélvica com barra', catalogId: 'hip-thrust', sets: 3, reps: 10, restSeconds: 90 },
      { name: 'Cadeira flexora', catalogId: 'seated-leg-curl', sets: 3, reps: 12, restSeconds: 75 },
      { name: 'Afundo reverso no Smith', catalogId: 'smith-machine-reverse-lunge', sets: 3, reps: 10, restSeconds: 90 },
      { name: 'Panturrilha sentada', catalogId: 'seated-calf-raise', sets: 3, reps: 12, restSeconds: 60 },
    ],
  },
];

function toRoutineExercise(template: ExerciseTemplate, index: number, routineId: string): RoutineExercise {
  return {
    id: `exercise-${routineId.replace('routine-', '')}-${index + 1}`,
    name: template.name,
    plannedSets: Array.from({ length: template.sets }, () => ({ targetReps: template.reps })),
    restSeconds: template.restSeconds,
    notes: template.notes,
    order: index,
    catalogExerciseId: template.catalogId,
  };
}

export function createStarterRoutines(now = new Date().toISOString()): Routine[] {
  return templates.map((template) => ({
    id: template.id,
    name: template.name,
    notes: template.notes,
    exercises: template.exercises.map((exercise, index) => toRoutineExercise(exercise, index, template.id)),
    createdAt: now,
    updatedAt: now,
  }));
}

export function addMissingStarterRoutines(current: Routine[], now = new Date().toISOString()): Routine[] {
  const names = new Set(current.map((routine) => routine.name.trim().toLocaleLowerCase('pt-BR')));
  return createStarterRoutines(now).filter((routine) => !names.has(routine.name.toLocaleLowerCase('pt-BR')));
}
