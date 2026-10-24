import type { WorkoutSession } from './models';
import { localWeekKey } from './progression';

export type StatisticsPeriod = 'all' | '30d' | '90d';
export type CompletedSetRecord = {
  sessionId: string;
  routineName: string;
  completedAt: string;
  exerciseId: string;
  exerciseName: string;
  setNumber: number;
  load?: number;
  reps?: number;
  rir?: number;
  volume?: number;
};
export type ExerciseOption = { id: string; name: string };
export type PersonalRecord = {
  id: string;
  title: string;
  value: number;
  exerciseName?: string;
  exerciseId?: string;
  sessionId: string;
  routineName: string;
  completedAt: string;
  detail: string;
  estimated?: boolean;
};
export type WorkoutStatistics = {
  sessions: WorkoutSession[];
  records: CompletedSetRecord[];
  sessionCount: number;
  completedSets: number;
  setsWithoutLoad: number;
  totalVolume: number | null;
  volumeSetCount: number;
  sessionsThisWeek: number;
  totalDurationSeconds: number;
  averageDurationSeconds: number | null;
};
export type CalendarDay = { date: Date; dateKey: string; inMonth: boolean; sessions: WorkoutSession[] };

function completedSessions(sessions: readonly WorkoutSession[]): WorkoutSession[] {
  return sessions.filter((session) => session.status === 'completed' && Boolean(session.completedAt));
}

export function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function sessionLocalDateKey(session: WorkoutSession): string | null {
  if (session.status !== 'completed' || !session.completedAt) return null;
  const date = new Date(session.completedAt);
  return Number.isNaN(date.getTime()) ? null : localDateKey(date);
}

export function getExerciseOptions(sessions: readonly WorkoutSession[]): ExerciseOption[] {
  const names = new Map<string, { name: string; date: number }>();
  for (const session of completedSessions(sessions)) {
    for (const exercise of session.exercises) {
      if (!exercise.performedSets.some((set) => set.completed)) continue;
      const prior = names.get(exercise.sourceExerciseId);
      const timestamp = Date.parse(session.completedAt!);
      if (!prior || timestamp >= prior.date) names.set(exercise.sourceExerciseId, { name: exercise.name, date: timestamp });
    }
  }
  return [...names.entries()].map(([id, value]) => ({ id, name: value.name })).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

export function calculateWorkoutStatistics(
  sessions: readonly WorkoutSession[],
  options: { period?: StatisticsPeriod; exerciseId?: string; now?: Date } = {},
): WorkoutStatistics {
  const now = options.now ?? new Date();
  const cutoff = options.period === '30d' ? now.getTime() - 30 * 86_400_000
    : options.period === '90d' ? now.getTime() - 90 * 86_400_000 : Number.NEGATIVE_INFINITY;
  const filteredSessions = completedSessions(sessions).filter((session) => {
    const completedAt = Date.parse(session.completedAt!);
    return completedAt >= cutoff && (!options.exerciseId || session.exercises.some((exercise) => exercise.sourceExerciseId === options.exerciseId
      && exercise.performedSets.some((set) => set.completed)));
  }).sort((a, b) => Date.parse(a.completedAt!) - Date.parse(b.completedAt!));
  const records: CompletedSetRecord[] = [];
  let completedSets = 0;
  let setsWithoutLoad = 0;
  let totalVolume = 0;
  let volumeSetCount = 0;
  for (const session of filteredSessions) {
    for (const exercise of session.exercises) {
      if (options.exerciseId && exercise.sourceExerciseId !== options.exerciseId) continue;
      exercise.performedSets.forEach((set, index) => {
        if (!set.completed) return;
        completedSets += 1;
        const validReps = typeof set.reps === 'number' && Number.isInteger(set.reps) && set.reps >= 0;
        const validLoad = typeof set.load === 'number' && Number.isFinite(set.load) && set.load >= 0;
        if (!validLoad) setsWithoutLoad += 1;
        const calculatedVolume = validLoad && validReps && set.load !== undefined && set.reps !== undefined ? set.load * set.reps : undefined;
        const volume = calculatedVolume !== undefined && Number.isFinite(calculatedVolume) ? calculatedVolume : undefined;
        if (volume !== undefined) { totalVolume += volume; volumeSetCount += 1; }
        records.push({ sessionId: session.id, routineName: session.routineName, completedAt: session.completedAt!, exerciseId: exercise.sourceExerciseId,
          exerciseName: exercise.name, setNumber: index + 1,
          ...(validLoad ? { load: set.load } : {}), ...(validReps ? { reps: set.reps } : {}), ...(typeof set.rir === 'number' ? { rir: set.rir } : {}),
          ...(volume === undefined ? {} : { volume }) });
      });
    }
  }
  const durations = filteredSessions.map(sessionDuration);
  const totalDurationSeconds = durations.reduce((sum, duration) => sum + duration, 0);
  const weekKey = localWeekKey(now.toISOString());
  return {
    sessions: filteredSessions, records, sessionCount: filteredSessions.length, completedSets, setsWithoutLoad,
    totalVolume: volumeSetCount ? totalVolume : null, volumeSetCount,
    sessionsThisWeek: filteredSessions.filter((session) => localWeekKey(session.completedAt!) === weekKey).length,
    totalDurationSeconds, averageDurationSeconds: durations.length ? totalDurationSeconds / durations.length : null,
  };
}

function sessionDuration(session: WorkoutSession): number {
  if (typeof session.durationSeconds === 'number' && Number.isFinite(session.durationSeconds) && session.durationSeconds >= 0) return session.durationSeconds;
  const elapsed = (Date.parse(session.completedAt!) - Date.parse(session.startedAt)) / 1000;
  return Number.isFinite(elapsed) && elapsed >= 0 ? Math.floor(elapsed) : 0;
}

/** Epley estimate: load × (1 + repetitions / 30), only for recorded completed sets with positive reps and known load. */
export function calculatePersonalRecords(sessions: readonly WorkoutSession[], exerciseId?: string): PersonalRecord[] {
  const history = calculateWorkoutStatistics(sessions, { exerciseId });
  const records: PersonalRecord[] = [];
  const best = (id: string, title: string, value: number, record: CompletedSetRecord, detail: string, estimated = false) => ({
    id, title, value, exerciseName: record.exerciseName, exerciseId: record.exerciseId, sessionId: record.sessionId,
    routineName: record.routineName, completedAt: record.completedAt, detail, ...(estimated ? { estimated: true } : {}),
  } satisfies PersonalRecord);
  const exerciseIds = [...new Set(history.records.map((record) => record.exerciseId))];
  for (const id of exerciseIds) {
    const exerciseRecords = history.records.filter((record) => record.exerciseId === id);
    const exerciseName = exerciseRecords.at(-1)?.exerciseName ?? 'Exercício';
    const loads = exerciseRecords.filter((record) => record.load !== undefined);
    const maxLoad = [...loads].sort((a, b) => (b.load! - a.load!) || (Date.parse(a.completedAt) - Date.parse(b.completedAt)))[0];
    if (maxLoad) records.push(best(`max-load:${id}`, `Maior carga · ${exerciseName}`, maxLoad.load!, maxLoad, `Série ${maxLoad.setNumber} · ${maxLoad.load} kg × ${maxLoad.reps ?? 'repetições não registradas'}`));
    const reps = exerciseRecords.filter((record) => record.reps !== undefined);
    const maxReps = [...reps].sort((a, b) => (b.reps! - a.reps!) || (Date.parse(a.completedAt) - Date.parse(b.completedAt)))[0];
    if (maxReps) records.push(best(`max-reps:${id}`, `Mais repetições · ${exerciseName}`, maxReps.reps!, maxReps, `Série ${maxReps.setNumber}${maxReps.load === undefined ? '' : ` · ${maxReps.load} kg`}`));
    const estimates = exerciseRecords.filter((record) => record.load !== undefined && (record.reps ?? 0) > 0)
      .map((record) => ({ record, value: record.load! * (1 + record.reps! / 30) }));
    const estimated = estimates.sort((a, b) => b.value - a.value || Date.parse(a.record.completedAt) - Date.parse(b.record.completedAt))[0];
    if (estimated) records.push(best(`estimated-1rm:${id}`, `1RM estimado · ${exerciseName}`, estimated.value, estimated.record,
      `Estimativa Epley a partir de ${estimated.record.load} kg × ${estimated.record.reps} reps. Não é um levantamento máximo testado.`, true));
  }
  const volumeBySession = new Map<string, { volume: number; session: WorkoutSession }>();
  for (const session of history.sessions) {
    let volume = 0; let count = 0;
    for (const record of history.records.filter((item) => item.sessionId === session.id && item.volume !== undefined)) { volume += record.volume!; count += 1; }
    if (count) volumeBySession.set(session.id, { volume, session });
  }
  const maxVolume = [...volumeBySession.values()].sort((a, b) => b.volume - a.volume || Date.parse(a.session.completedAt!) - Date.parse(b.session.completedAt!))[0];
  if (maxVolume) records.push({ id: 'best-session-volume', title: 'Maior volume em sessão', value: maxVolume.volume, sessionId: maxVolume.session.id,
    routineName: maxVolume.session.routineName, completedAt: maxVolume.session.completedAt!, detail: `${maxVolume.volume.toLocaleString('pt-BR')} kg·reps somados em séries com carga e repetições registradas.` });
  return records;
}

export function buildActivityCalendar(sessions: readonly WorkoutSession[], year: number, month: number): CalendarDay[] {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - ((first.getDay() + 6) % 7));
  const grouped = new Map<string, WorkoutSession[]>();
  for (const session of completedSessions(sessions)) {
    const key = sessionLocalDateKey(session);
    if (key) grouped.set(key, [...(grouped.get(key) ?? []), session]);
  }
  const days: CalendarDay[] = [];
  for (let index = 0; index < 42; index += 1) {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
    days.push({ date, dateKey: localDateKey(date), inMonth: date.getMonth() === month, sessions: grouped.get(localDateKey(date)) ?? [] });
  }
  return days;
}

export function formatDuration(seconds: number): string {
  const minutes = Math.floor(Math.max(0, seconds) / 60);
  const hours = Math.floor(minutes / 60);
  return hours ? `${hours}h ${String(minutes % 60).padStart(2, '0')}min` : `${minutes}min`;
}
