import type { AppData, ScheduleDay, StableId, Weekday, WorkoutSequence, WorkoutSession } from './models';

export const WEEKDAYS: readonly { id: Weekday; label: string; short: string }[] = [
  { id: 'monday', label: 'Segunda-feira', short: 'Seg' }, { id: 'tuesday', label: 'Terça-feira', short: 'Ter' },
  { id: 'wednesday', label: 'Quarta-feira', short: 'Qua' }, { id: 'thursday', label: 'Quinta-feira', short: 'Qui' },
  { id: 'friday', label: 'Sexta-feira', short: 'Sex' }, { id: 'saturday', label: 'Sábado', short: 'Sáb' },
  { id: 'sunday', label: 'Domingo', short: 'Dom' },
];
const jsDayToWeekday: Weekday[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
export type DayStatus = 'unconfigured' | 'rest' | 'pending' | 'active' | 'completed' | 'invalid';

export function weekdayForDate(date: Date): Weekday { return jsDayToWeekday[date.getDay()]!; }
export function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function localDateKeyFromTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? '' : localDateKey(date);
}
export function startOfLocalWeek(date: Date): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysSinceMonday = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - daysSinceMonday);
  return result;
}
export function addLocalDays(date: Date, amount: number): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  result.setDate(result.getDate() + amount);
  return result;
}
export function getWeekDates(date: Date): Date[] {
  const monday = startOfLocalWeek(date);
  return WEEKDAYS.map((_, index) => addLocalDays(monday, index));
}
export function formatWeekRange(dates: Date[]): string {
  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' };
  return `${new Intl.DateTimeFormat('pt-BR', options).format(dates[0])} a ${new Intl.DateTimeFormat('pt-BR', { ...options, year: 'numeric' }).format(dates[6])}`;
}
export function isScheduleFullyConfigured(schedule: Partial<Record<Weekday, ScheduleDay>> | undefined): boolean {
  return WEEKDAYS.every(({ id }) => Boolean(schedule?.[id] && schedule[id]?.type !== 'unconfigured'));
}
export function getScheduledDayStatus(day: ScheduleDay | undefined, date: Date, routines: AppData['routines'], sessions: WorkoutSession[]): DayStatus {
  if (!day || day.type === 'unconfigured') return 'unconfigured';
  if (day.type === 'rest') return 'rest';
  const routine = routines.find((item) => item.id === day.routineId);
  if (!routine) return 'invalid';
  const key = localDateKey(date);
  const matches = sessions.filter((session) => session.routineId === day.routineId);
  if (matches.some((session) => session.status === 'in-progress' && localDateKeyFromTimestamp(session.startedAt) === key)) return 'active';
  if (matches.some((session) => session.status === 'completed' && session.completedAt && localDateKeyFromTimestamp(session.completedAt) === key)) return 'completed';
  return 'pending';
}
export function countScheduledWeekProgress(dates: Date[], schedule: Partial<Record<Weekday, ScheduleDay>> | undefined, routines: AppData['routines'], sessions: WorkoutSession[]) {
  let planned = 0;
  let completed = 0;
  for (const date of dates) {
    const day = schedule?.[weekdayForDate(date)];
    if (day?.type !== 'workout' || !routines.some((routine) => routine.id === day.routineId)) continue;
    planned += 1;
    if (getScheduledDayStatus(day, date, routines, sessions) === 'completed') completed += 1;
  }
  return { planned, completed };
}
export function getCompletedSessionsForDate(date: Date, sessions: WorkoutSession[]): WorkoutSession[] {
  const key = localDateKey(date);
  return sessions.filter((session) => session.status === 'completed' && session.completedAt && localDateKeyFromTimestamp(session.completedAt) === key)
    .sort((a, b) => Date.parse(a.completedAt!) - Date.parse(b.completedAt!));
}

export function createWorkoutSequence(routineIds: StableId[], existingSessions: WorkoutSession[], repeat = true): WorkoutSequence {
  return { routineIds: [...routineIds], currentIndex: 0, repeat, completed: routineIds.length === 0,
    // Eventos históricos anteriores à configuração não podem avançar a nova sequência.
    processedSessionIds: existingSessions.filter((session) => session.status === 'completed').map((session) => session.id) };
}
export function nextSequenceRoutineId(sequence: WorkoutSequence | undefined): StableId | undefined {
  if (!sequence || sequence.routineIds.length === 0 || sequence.completed) return undefined;
  return sequence.routineIds[sequence.currentIndex];
}
export function recordSequenceCompletion(sequence: WorkoutSequence | undefined, session: WorkoutSession): { sequence?: WorkoutSequence; matched: boolean | null } {
  if (!sequence || session.status !== 'completed' || !session.completedAt || sequence.processedSessionIds.includes(session.id)) return { sequence, matched: null };
  const expectedId = nextSequenceRoutineId(sequence);
  const processedSessionIds = [...sequence.processedSessionIds, session.id];
  if (!expectedId || expectedId !== session.routineId) return { sequence: { ...sequence, processedSessionIds, lastCompletionMatched: false }, matched: false };
  const nextIndex = sequence.currentIndex + 1;
  if (nextIndex < sequence.routineIds.length) return { sequence: { ...sequence, currentIndex: nextIndex, processedSessionIds, lastCompletionMatched: true }, matched: true };
  if (sequence.repeat) return { sequence: { ...sequence, currentIndex: 0, processedSessionIds, lastCompletionMatched: true }, matched: true };
  return { sequence: { ...sequence, currentIndex: sequence.routineIds.length, completed: true, processedSessionIds, lastCompletionMatched: true }, matched: true };
}
export function reorderSequence(sequence: WorkoutSequence, from: number, to: number): WorkoutSequence {
  if (from < 0 || to < 0 || from >= sequence.routineIds.length || to >= sequence.routineIds.length || from === to) return sequence;
  const currentId = sequence.routineIds[sequence.currentIndex];
  const routineIds = [...sequence.routineIds];
  const [moved] = routineIds.splice(from, 1);
  routineIds.splice(to, 0, moved!);
  const currentIndex = currentId ? routineIds.indexOf(currentId) : Math.min(sequence.currentIndex, routineIds.length);
  return { ...sequence, routineIds, currentIndex, completed: sequence.completed && currentIndex >= routineIds.length };
}
export function removeRoutineFromTrainingPlan(data: AppData, routineId: string, routineName: string): AppData {
  const weeklySchedule = data.weeklySchedule ? Object.fromEntries(Object.entries(data.weeklySchedule).map(([day, entry]) =>
    entry?.type === 'workout' && entry.routineId === routineId ? [day, { type: 'unconfigured', removedRoutineName: routineName }] : [day, entry])) : undefined;
  const sequence = data.workoutSequence;
  let workoutSequence = sequence;
  if (sequence?.routineIds.includes(routineId)) {
    const currentId = sequence.routineIds[sequence.currentIndex];
    const routineIds = sequence.routineIds.filter((id) => id !== routineId);
    const currentIndex = currentId && currentId !== routineId
      ? Math.max(0, routineIds.indexOf(currentId))
      : sequence.repeat && routineIds.length > 0 ? sequence.currentIndex % routineIds.length : Math.min(sequence.currentIndex, routineIds.length);
    workoutSequence = { ...sequence, routineIds, currentIndex, completed: routineIds.length === 0 || (!sequence.repeat && currentIndex >= routineIds.length) };
  }
  return { ...data, ...(weeklySchedule ? { weeklySchedule } : {}), ...(workoutSequence ? { workoutSequence } : {}) };
}
