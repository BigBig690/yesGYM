import type { AppData, PerformedExercise, PerformedSet, RestTimerState, Routine, StableId, WorkoutSession } from './models';
import { catalogEntryForRoutineExercise, defaultWarmupPlan } from './exerciseCatalog';

export type OperationResult = { ok: true; data: AppData; session: WorkoutSession } | { ok: false; error: string };
export type PerformedSetDraft = { load: string; reps: string; rir: string; notes: string };
export type PerformedSetErrors = Partial<Record<keyof PerformedSetDraft, string>>;
export type SetDraftResult = { ok: true; value: Omit<PerformedSet, 'completed'> } | { ok: false; errors: PerformedSetErrors };

export function createWorkoutSession(
  data: AppData,
  routineId: StableId,
  now = new Date().toISOString(),
  makeId: () => StableId = createStableId,
): OperationResult {
  if (data.sessions.some((session) => session.status === 'in-progress')) return { ok: false, error: 'Já existe uma sessão em andamento. Retome-a antes de iniciar outra.' };
  const routine = data.routines.find((item) => item.id === routineId);
  if (!routine) return { ok: false, error: 'A rotina selecionada não está mais disponível.' };
  const snapshot = copyRoutine(routine, now, makeId);
  const next = { ...data, sessions: [...data.sessions, snapshot] };
  return { ok: true, data: next, session: snapshot };
}

function copyRoutine(routine: Routine, now: string, makeId: () => StableId): WorkoutSession {
  const exercises: PerformedExercise[] = [...routine.exercises]
    .sort((a, b) => a.order - b.order)
    .map((exercise) => ({
      id: makeId(), sourceExerciseId: exercise.id, name: exercise.name, notes: exercise.notes, restSeconds: exercise.restSeconds,
      catalogExerciseId: exercise.catalogExerciseId ?? catalogEntryForRoutineExercise(exercise)?.id,
      plannedSets: exercise.plannedSets.map((set) => ({ ...set })),
      performedSets: exercise.plannedSets.map(() => ({ completed: false })), order: exercise.order,
    }));
  return { id: makeId(), routineId: routine.id, routineName: routine.name, startedAt: now, status: 'in-progress', exercises,
    warmup: defaultWarmupPlan(routine).map((stage) => ({ ...stage, status: 'pending' as const })) };
}

export function updateWarmupStage(data: AppData, sessionId: StableId, stageId: string, status: 'pending' | 'completed' | 'skipped'): OperationResult {
  const session = data.sessions.find((item) => item.id === sessionId && item.status === 'in-progress');
  if (!session || !session.warmup?.some((stage) => stage.id === stageId)) return { ok: false, error: 'Etapa de aquecimento indisponível nesta sessão.' };
  const next = { ...session, warmup: session.warmup.map((stage) => stage.id === stageId ? { ...stage, status } : stage) };
  return replaceActiveSession(data, next);
}

export function resetWarmup(data: AppData, sessionId: StableId): OperationResult {
  const session = data.sessions.find((item) => item.id === sessionId && item.status === 'in-progress');
  if (!session?.warmup) return { ok: false, error: 'Aquecimento indisponível nesta sessão.' };
  const next = { ...session, warmup: session.warmup.map((stage) => ({ ...stage, status: 'pending' as const })) };
  return replaceActiveSession(data, next);
}

function replaceActiveSession(data: AppData, next: WorkoutSession): OperationResult {
  return { ok: true, data: { ...data, sessions: data.sessions.map((item) => item.id === next.id ? next : item) }, session: next };
}

export function activeWorkout(data: AppData): WorkoutSession | undefined {
  return data.sessions.find((session) => session.status === 'in-progress');
}

export function getSessionProgress(session: WorkoutSession): { completed: number; planned: number } {
  return session.exercises.reduce((total, exercise) => ({
    completed: total.completed + exercise.performedSets.filter((set) => set.completed).length,
    planned: total.planned + exercise.plannedSets.length,
  }), { completed: 0, planned: 0 });
}

export function draftFromSet(set: PerformedSet): PerformedSetDraft {
  return { load: set.load === undefined ? '' : String(set.load), reps: set.reps === undefined ? '' : String(set.reps), rir: set.rir === undefined ? '' : String(set.rir), notes: set.notes ?? '' };
}

export function validatePerformedSetDraft(draft: PerformedSetDraft): SetDraftResult {
  const errors: PerformedSetErrors = {};
  const load = parseOptionalNumber(draft.load, 'Carga', errors, false);
  const reps = parseOptionalNumber(draft.reps, 'Repetições', errors, true);
  const rir = parseOptionalNumber(draft.rir, 'RIR', errors, true);
  if (rir !== undefined && (rir < 0 || rir > 10)) errors.rir = 'O RIR deve estar entre 0 e 10.';
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { ...(load === undefined ? {} : { load }), ...(reps === undefined ? {} : { reps }), ...(rir === undefined ? {} : { rir }), ...(draft.notes.trim() ? { notes: draft.notes.trim() } : {}) } };
}

function parseOptionalNumber(value: string, label: string, errors: PerformedSetErrors, integer: boolean): number | undefined {
  if (value.trim() === '') return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || (integer && !Number.isInteger(parsed))) {
    errors[label === 'Carga' ? 'load' : label === 'Repetições' ? 'reps' : 'rir'] = integer ? 'Informe um número inteiro igual ou maior que zero.' : 'Informe um número igual ou maior que zero.';
    return undefined;
  }
  return parsed;
}

export function updatePerformedSet(data: AppData, sessionId: StableId, exerciseId: StableId, setIndex: number, draft: PerformedSetDraft): OperationResult {
  const validation = validatePerformedSetDraft(draft);
  if (!validation.ok) return { ok: false, error: Object.values(validation.errors).join(' ') };
  const session = findActiveSession(data, sessionId);
  if (!session) return { ok: false, error: 'A sessão em andamento não foi encontrada.' };
  const exercise = session.exercises.find((item) => item.id === exerciseId);
  const current = exercise?.performedSets[setIndex];
  if (!exercise || !current) return { ok: false, error: 'A série selecionada não está disponível.' };
  if (current.completed && validation.value.reps === undefined) return { ok: false, error: 'Uma série concluída precisa manter as repetições registradas.' };
  const performedSets = [...exercise.performedSets];
  performedSets[setIndex] = { ...current, ...validation.value };
  if (validation.value.load === undefined) delete performedSets[setIndex]!.load;
  if (validation.value.reps === undefined) delete performedSets[setIndex]!.reps;
  if (validation.value.rir === undefined) delete performedSets[setIndex]!.rir;
  if (validation.value.notes === undefined) delete performedSets[setIndex]!.notes;
  return replaceSession(data, session, { ...exercise, performedSets });
}

export function togglePerformedSet(data: AppData, sessionId: StableId, exerciseId: StableId, setIndex: number): OperationResult {
  const session = findActiveSession(data, sessionId);
  if (!session) return { ok: false, error: 'A sessão em andamento não foi encontrada.' };
  const exercise = session.exercises.find((item) => item.id === exerciseId);
  const set = exercise?.performedSets[setIndex];
  if (!exercise || !set) return { ok: false, error: 'A série selecionada não está disponível.' };
  if (!set.completed && set.reps === undefined) return { ok: false, error: 'Registre as repetições realizadas antes de concluir a série.' };
  const performedSets = [...exercise.performedSets];
  performedSets[setIndex] = { ...set, completed: !set.completed };
  return replaceSession(data, session, { ...exercise, performedSets });
}

function findActiveSession(data: AppData, sessionId: string) {
  return data.sessions.find((session) => session.id === sessionId && session.status === 'in-progress');
}

function replaceSession(data: AppData, session: WorkoutSession, changedExercise: PerformedExercise): OperationResult {
  const nextSession = { ...session, exercises: session.exercises.map((item) => item.id === changedExercise.id ? changedExercise : item) };
  return withSession(data, nextSession);
}

function withSession(data: AppData, session: WorkoutSession): OperationResult {
  return { ok: true, data: { ...data, sessions: data.sessions.map((item) => item.id === session.id ? session : item) }, session };
}

export function completeWorkoutSession(data: AppData, sessionId: StableId, now = new Date().toISOString()): OperationResult {
  const session = findActiveSession(data, sessionId);
  if (!session) return { ok: false, error: 'Esta sessão já foi finalizada ou não está mais disponível.' };
  const durationSeconds = Math.max(0, Math.floor((Date.parse(now) - Date.parse(session.startedAt)) / 1000));
  const restTimer = session.restTimer ? { ...session.restTimer, status: 'finished' as const, remainingSeconds: 0, endsAt: undefined } : undefined;
  const nextSession: WorkoutSession = { ...session, status: 'completed', completedAt: now, durationSeconds, ...(restTimer ? { restTimer } : {}) };
  return withSession(data, nextSession);
}

export function discardWorkoutSession(data: AppData, sessionId: StableId): OperationResult {
  const session = findActiveSession(data, sessionId);
  if (!session) return { ok: false, error: 'A sessão em andamento não foi encontrada.' };
  return { ok: true, data: { ...data, sessions: data.sessions.filter((item) => item.id !== session.id) }, session };
}

export function getRestSecondsRemaining(timer: RestTimerState, now = Date.now()): number {
  if (timer.status !== 'running' || !timer.endsAt) return timer.remainingSeconds;
  return Math.max(0, Math.ceil((Date.parse(timer.endsAt) - now) / 1000));
}

export function startRestTimer(data: AppData, sessionId: StableId, durationSeconds: number, now = Date.now(), exerciseId?: string, setIndex?: number): OperationResult {
  if (!Number.isInteger(durationSeconds) || durationSeconds < 0 || durationSeconds > 7200) return { ok: false, error: 'A duração do descanso deve estar entre 0 e 7200 segundos.' };
  const timer: RestTimerState = { status: durationSeconds === 0 ? 'finished' : 'running', durationSeconds, remainingSeconds: durationSeconds,
    ...(durationSeconds ? { endsAt: new Date(now + durationSeconds * 1000).toISOString() } : {}),
    ...(exerciseId ? { exerciseId } : {}), ...(setIndex === undefined ? {} : { setIndex }) };
  return updateTimer(data, sessionId, timer);
}

export function pauseRestTimer(data: AppData, sessionId: StableId, now = Date.now()): OperationResult {
  const session = findActiveSession(data, sessionId);
  if (!session?.restTimer || session.restTimer.status !== 'running') return { ok: false, error: 'Não há descanso em andamento para pausar.' };
  const remainingSeconds = getRestSecondsRemaining(session.restTimer, now);
  return updateTimer(data, sessionId, { ...session.restTimer, status: remainingSeconds === 0 ? 'finished' : 'paused', remainingSeconds, endsAt: undefined });
}

export function resumeRestTimer(data: AppData, sessionId: StableId, now = Date.now()): OperationResult {
  const session = findActiveSession(data, sessionId);
  if (!session?.restTimer || session.restTimer.status !== 'paused') return { ok: false, error: 'O descanso não está pausado.' };
  if (session.restTimer.remainingSeconds === 0) return updateTimer(data, sessionId, { ...session.restTimer, status: 'finished' });
  return updateTimer(data, sessionId, { ...session.restTimer, status: 'running', endsAt: new Date(now + session.restTimer.remainingSeconds * 1000).toISOString() });
}

export function adjustRestTimer(data: AppData, sessionId: StableId, durationSeconds: number): OperationResult {
  if (!Number.isInteger(durationSeconds) || durationSeconds < 0 || durationSeconds > 7200) return { ok: false, error: 'Informe um descanso entre 0 e 7200 segundos.' };
  const session = findActiveSession(data, sessionId);
  if (!session) return { ok: false, error: 'A sessão em andamento não foi encontrada.' };
  const timer: RestTimerState = { status: 'paused', durationSeconds, remainingSeconds: durationSeconds,
    ...(session.restTimer?.exerciseId ? { exerciseId: session.restTimer.exerciseId } : {}),
    ...(session.restTimer?.setIndex === undefined ? {} : { setIndex: session.restTimer.setIndex }) };
  return updateTimer(data, sessionId, timer);
}

export function restartRestTimer(data: AppData, sessionId: StableId, now = Date.now()): OperationResult {
  const session = findActiveSession(data, sessionId);
  if (!session?.restTimer) return { ok: false, error: 'Não há descanso configurado para reiniciar.' };
  return startRestTimer(data, sessionId, session.restTimer.durationSeconds, now, session.restTimer.exerciseId, session.restTimer.setIndex);
}

export function skipRestTimer(data: AppData, sessionId: StableId): OperationResult {
  const session = findActiveSession(data, sessionId);
  if (!session?.restTimer) return { ok: false, error: 'Não há descanso ativo para ignorar.' };
  return updateTimer(data, sessionId, { ...session.restTimer, status: 'finished', remainingSeconds: 0, endsAt: undefined });
}

export function finishExpiredRestTimer(data: AppData, sessionId: StableId, now = Date.now()): OperationResult | null {
  const session = findActiveSession(data, sessionId);
  const timer = session?.restTimer;
  if (!session || !timer || timer.status !== 'running' || getRestSecondsRemaining(timer, now) > 0) return null;
  return updateTimer(data, sessionId, { ...timer, status: 'finished', remainingSeconds: 0, endsAt: undefined });
}

function updateTimer(data: AppData, sessionId: string, timer: RestTimerState): OperationResult {
  const session = findActiveSession(data, sessionId);
  if (!session) return { ok: false, error: 'A sessão em andamento não foi encontrada.' };
  const nextSession = { ...session, restTimer: timer };
  return withSession(data, nextSession);
}

function createStableId(): StableId {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
