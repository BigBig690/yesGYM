import type { PerformedExercise, WorkoutSession } from './models';
import { catalogEntryForRoutineExercise } from './exerciseCatalog';

export type InsightPeriod = 'sessions' | '7d' | '30d' | '90d' | 'all';
export type ExerciseTrendPoint = {
  sessionId: string;
  exerciseName: string;
  routineName: string;
  completedAt: string;
  completedSets: number;
  reps: number;
  maximumRecordedLoad: number | null;
  externalLoadVolume: number | null;
  externalLoadSetCount: number;
};
export type MuscleContribution = {
  muscle: string;
  primarySets: number;
  secondarySets: number;
  sessionIds: string[];
  exerciseNames: string[];
  latestAt: string | null;
  externalLoadVolume: number | null;
  externalLoadSetCount: number;
};
export type MuscleSummary = {
  totalUniqueSets: number;
  sessions: number;
  missingMetadataSets: number;
  muscles: MuscleContribution[];
};

function isCompletedSession(session: WorkoutSession): session is WorkoutSession & { completedAt: string } {
  return session.status === 'completed' && typeof session.completedAt === 'string' && Number.isFinite(Date.parse(session.completedAt));
}

function validCompletedSets(exercise: PerformedExercise) {
  return exercise.performedSets.flatMap((set, index) => {
    if (!set.completed || !Number.isInteger(set.reps) || (set.reps ?? -1) < 0) return [];
    const load = typeof set.load === 'number' && Number.isFinite(set.load) && set.load >= 0 ? set.load : undefined;
    return [{ index, reps: set.reps!, ...(load === undefined ? {} : { load }) }];
  });
}

function selectedSessions(sessions: readonly WorkoutSession[], period: InsightPeriod, now: Date): WorkoutSession[] {
  const completed = sessions.filter(isCompletedSession).sort((a, b) => Date.parse(a.completedAt) - Date.parse(b.completedAt));
  if (period === 'sessions') return completed;
  if (period === '7d' || period === '30d' || period === '90d') {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const cutoff = now.getTime() - days * 86_400_000;
    return completed.filter((session) => Date.parse(session.completedAt!) >= cutoff && Date.parse(session.completedAt!) <= now.getTime());
  }
  return completed;
}

/** One point per finished session, keyed by the snapshot's stable exercise ID. */
export function buildExerciseTrend(
  sessions: readonly WorkoutSession[], exerciseId: string, period: InsightPeriod = 'all', now = new Date(),
): ExerciseTrendPoint[] {
  const selected = selectedSessions(sessions, period, now);
  const points: ExerciseTrendPoint[] = [];
  for (const session of selected) {
    const matching = session.exercises.filter((exercise) => exercise.sourceExerciseId === exerciseId);
    if (!matching.length) continue;
    const sets = matching.flatMap(validCompletedSets);
    if (!sets.length) continue;
    const catalog = matching.map((exercise) => catalogEntryForRoutineExercise(exercise)).find(Boolean);
    const loads = sets.flatMap((set) => set.load === undefined ? [] : [set.load]);
    const externalLoadSetCount = catalog?.bodyweight ? 0 : loads.length;
    // Bodyweight movement loads are not presumed to be externally comparable.
    const volume = catalog?.bodyweight ? null : sets.some((set) => set.load !== undefined)
      ? sets.reduce((total, set) => total + (set.load === undefined ? 0 : set.load * set.reps), 0) : null;
    points.push({
      sessionId: session.id,
      exerciseName: matching[0]!.name,
      routineName: session.routineName,
      completedAt: session.completedAt!,
      completedSets: sets.length,
      reps: sets.reduce((total, set) => total + set.reps, 0),
      maximumRecordedLoad: catalog?.bodyweight || loads.length === 0 ? null : Math.max(...loads),
      externalLoadVolume: volume !== null && Number.isFinite(volume) ? volume : null,
      externalLoadSetCount,
    });
  }
  return period === 'sessions' ? points.slice(-10) : points;
}

function muscleTags(exercise: PerformedExercise): { primary: string[]; secondary: string[] } {
  const metadata = catalogEntryForRoutineExercise(exercise);
  return metadata ? { primary: metadata.primaryMuscles, secondary: metadata.secondaryMuscles } : { primary: [], secondary: [] };
}

/** Counts each completed work set once globally; muscle totals are memberships and can overlap. */
export function summarizeMuscleWork(
  sessions: readonly WorkoutSession[], period: InsightPeriod = '30d', now = new Date(),
): MuscleSummary {
  const muscleMap = new Map<string, { primary: number; secondary: number; sessions: Set<string>; exercises: Set<string>; latestAt: string | null; volume: number; volumeSets: number }>();
  const allSessions = selectedSessions(sessions, period, now);
  const uniqueSetIds = new Set<string>();
  const seenSessions = new Set<string>();
  let missingMetadataSets = 0;
  for (const session of allSessions) {
    let contributed = false;
    for (const exercise of session.exercises) {
      const sets = validCompletedSets(exercise);
      if (!sets.length) continue;
      sets.forEach((set) => uniqueSetIds.add(`${session.id}:${exercise.id}:${set.index}`));
      const { primary, secondary } = muscleTags(exercise);
      if (primary.length === 0 && secondary.length === 0) {
        missingMetadataSets += sets.length;
        continue;
      }
      contributed = true;
      const catalog = catalogEntryForRoutineExercise(exercise);
      for (const set of sets) {
        const volume = catalog?.bodyweight || set.load === undefined ? undefined : set.load * set.reps;
        const tags = new Map<string, 'primary' | 'secondary'>();
        primary.forEach((muscle) => tags.set(muscle, 'primary'));
        secondary.forEach((muscle) => { if (!tags.has(muscle)) tags.set(muscle, 'secondary'); });
        for (const [muscle, role] of tags) {
          const value = muscleMap.get(muscle) ?? { primary: 0, secondary: 0, sessions: new Set<string>(), exercises: new Set<string>(), latestAt: null, volume: 0, volumeSets: 0 };
          if (role === 'primary') value.primary += 1; else value.secondary += 1;
          value.sessions.add(session.id);
          value.exercises.add(exercise.name);
          if (!value.latestAt || Date.parse(session.completedAt!) > Date.parse(value.latestAt)) value.latestAt = session.completedAt!;
          if (volume !== undefined && Number.isFinite(volume)) { value.volume += volume; value.volumeSets += 1; }
          muscleMap.set(muscle, value);
        }
      }
    }
    if (contributed) seenSessions.add(session.id);
  }
  return {
    totalUniqueSets: uniqueSetIds.size,
    sessions: seenSessions.size,
    missingMetadataSets,
    muscles: [...muscleMap.entries()].map(([muscle, value]) => ({
      muscle, primarySets: value.primary, secondarySets: value.secondary,
      sessionIds: [...value.sessions], exerciseNames: [...value.exercises], latestAt: value.latestAt,
      externalLoadVolume: value.volumeSets ? value.volume : null,
      externalLoadSetCount: value.volumeSets,
    })).sort((a, b) => (b.primarySets + b.secondarySets) - (a.primarySets + a.secondarySets) || a.muscle.localeCompare(b.muscle, 'pt-BR')),
  };
}

export function getLatestExercisePoint(sessions: readonly WorkoutSession[], exerciseId: string): ExerciseTrendPoint | null {
  return buildExerciseTrend(sessions, exerciseId, 'all').at(-1) ?? null;
}
