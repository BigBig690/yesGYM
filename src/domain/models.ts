import { createStarterRoutines } from './routineTemplates';

export const CURRENT_SCHEMA_VERSION = 2 as const;

export type IsoDateTime = string;
export type StableId = string;

export type PlannedSet = {
  targetReps: number;
  targetLoad?: number;
  targetRir?: number;
};

export type RoutineExercise = {
  id: StableId;
  name: string;
  notes?: string;
  plannedSets: PlannedSet[];
  restSeconds?: number;
  order: number;
  /** Stable metadata reference; omitted for user-defined movements outside the catalog. */
  catalogExerciseId?: StableId;
};

export type WarmupStageId = 'general' | 'specific' | 'preparatory';
export type WarmupStage = { id: WarmupStageId; title: string; instructions: string };
export type WarmupPlan = WarmupStage[];
export type WarmupProgress = WarmupStage & { status: 'pending' | 'completed' | 'skipped' };

export type Routine = {
  id: StableId;
  name: string;
  exercises: RoutineExercise[];
  notes?: string;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  warmupPlan?: WarmupPlan;
};

export type PerformedSet = {
  reps?: number;
  load?: number;
  rir?: number;
  notes?: string;
  completed: boolean;
};

export type PerformedExercise = {
  id: StableId;
  sourceExerciseId: StableId;
  name: string;
  notes?: string;
  restSeconds?: number;
  plannedSets: PlannedSet[];
  performedSets: PerformedSet[];
  order: number;
  catalogExerciseId?: StableId;
};

export type WorkoutSession = {
  id: StableId;
  routineId: StableId;
  routineName: string;
  startedAt: IsoDateTime;
  completedAt?: IsoDateTime;
  status: 'in-progress' | 'completed';
  exercises: PerformedExercise[];
  notes?: string;
  durationSeconds?: number;
  restTimer?: RestTimerState;
  warmup?: WarmupProgress[];
};

export type RestTimerState = {
  status: 'running' | 'paused' | 'finished';
  durationSeconds: number;
  remainingSeconds: number;
  endsAt?: IsoDateTime;
  exerciseId?: StableId;
  setIndex?: number;
};

export type ProgressionProfile = {
  totalXp: number;
  createdAt: IsoDateTime;
  displayName?: string;
  title?: string;
  showDisplayName?: boolean;
};

export type Achievement = {
  id: StableId;
  title: string;
  description: string;
  criterion?: string;
  unlockedAt?: IsoDateTime;
  category?: 'journey' | 'consistency' | 'mastery';
};

export type XpAward = {
  id: string;
  sourceType: 'session' | 'mission';
  sourceId: StableId;
  amount: number;
  awardedAt: IsoDateTime;
};

export type UnlockedTitle = {
  id: string;
  unlockedAt: IsoDateTime;
};

export type ProgressionState = {
  xpAwards: XpAward[];
  unlockedTitles: UnlockedTitle[];
  equippedTitleId?: string;
};

export type Mission = {
  id: StableId;
  title: string;
  description: string;
  status: 'available' | 'in-progress' | 'completed';
  completedAt?: IsoDateTime;
  progress?: number;
  target?: number;
  rewardXp?: number;
  weekKey?: string;
  dayKey?: string;
  category?: 'daily' | 'weekly' | 'special';
  claimedAt?: IsoDateTime;
};

export type CompanionSettings = {
  characterId: string;
  displayName: string;
  appearance: string;
  personality?: string;
  personalityName?: string;
};

export type Preferences = {
  weightUnit: 'kg' | 'lb';
  colorTheme: 'system' | 'light' | 'dark';
  accentColor?: 'electric-blue' | 'violet' | 'teal' | 'amber' | 'purple-eclipse' | 'crimson' | 'azure' | 'emerald' | 'rose';
  narrativeStyle?: 'epic' | 'playful' | 'calm' | 'cinematic' | 'direct';
  reduceMotion?: boolean;
};

export type Weekday = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
export type ScheduleDay = { type: 'rest' } | { type: 'unconfigured'; removedRoutineName?: string } | { type: 'workout'; routineId: StableId };
export type WeeklySchedule = Partial<Record<Weekday, ScheduleDay>>;
export type WorkoutSequence = { routineIds: StableId[]; currentIndex: number; repeat: boolean; processedSessionIds: StableId[]; completed: boolean; lastCompletionMatched?: boolean };

export type AppData = {
  schemaVersion: typeof CURRENT_SCHEMA_VERSION;
  profile: ProgressionProfile;
  routines: Routine[];
  sessions: WorkoutSession[];
  achievements: Achievement[];
  missions: Mission[];
  progression: ProgressionState;
  companion: CompanionSettings;
  preferences: Preferences;
  /** Omitted weekday means not configured; a rest is an explicit decision. */
  weeklySchedule?: WeeklySchedule;
  workoutSequence?: WorkoutSequence;
};

export function createDefaultAppData(now = new Date().toISOString()): AppData {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    profile: { totalXp: 0, createdAt: now, showDisplayName: true },
    routines: createStarterRoutines(now),
    sessions: [],
    achievements: [],
    missions: [],
    progression: { xpAwards: [], unlockedTitles: [] },
    companion: { characterId: 'yotsuba-nakano', displayName: 'Yotsuba Nakano', appearance: 'default', personality: 'enthusiast' },
    preferences: { weightUnit: 'kg', colorTheme: 'dark', accentColor: 'purple-eclipse', narrativeStyle: 'epic', reduceMotion: false },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNonEmptyString(value: unknown): value is string {
  return isString(value) && value.trim().length > 0;
}

function isIsoDateTime(value: unknown): value is IsoDateTime {
  return isString(value) && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(value)
    && !Number.isNaN(Date.parse(value));
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || isString(value);
}

function isPlannedSet(value: unknown): value is PlannedSet {
  if (!isRecord(value) || !Number.isInteger(value.targetReps) || (value.targetReps as number) < 0) return false;
  return (value.targetLoad === undefined || (typeof value.targetLoad === 'number' && Number.isFinite(value.targetLoad) && value.targetLoad >= 0))
    && (value.targetRir === undefined || (typeof value.targetRir === 'number' && Number.isFinite(value.targetRir) && value.targetRir >= 0));
}

function isPerformedSet(value: unknown): value is PerformedSet {
  if (!isRecord(value) || typeof value.completed !== 'boolean' || !isOptionalString(value.notes)) return false;
  const validReps = value.reps === undefined || (Number.isInteger(value.reps) && (value.reps as number) >= 0);
  const validLoad = value.load === undefined || (typeof value.load === 'number' && Number.isFinite(value.load) && value.load >= 0);
  const validRir = value.rir === undefined || (typeof value.rir === 'number' && Number.isInteger(value.rir) && value.rir >= 0 && value.rir <= 10);
  return validReps && validLoad && validRir && (!value.completed || value.reps !== undefined);
}

function isRestTimer(value: unknown): value is RestTimerState {
  if (!isRecord(value) || !['running', 'paused', 'finished'].includes(String(value.status))
    || typeof value.durationSeconds !== 'number' || !Number.isInteger(value.durationSeconds) || value.durationSeconds < 0
    || typeof value.remainingSeconds !== 'number' || !Number.isInteger(value.remainingSeconds) || value.remainingSeconds < 0
    || value.remainingSeconds > value.durationSeconds) return false;
  return (value.endsAt === undefined || isIsoDateTime(value.endsAt))
    && (value.status === 'running' ? isIsoDateTime(value.endsAt) : value.endsAt === undefined)
    && (value.exerciseId === undefined || isNonEmptyString(value.exerciseId))
    && (value.setIndex === undefined || (Number.isInteger(value.setIndex) && (value.setIndex as number) >= 0));
}

function isRoutineExercise(value: unknown): value is RoutineExercise {
  return isRecord(value) && isNonEmptyString(value.id) && isNonEmptyString(value.name)
    && Array.isArray(value.plannedSets) && value.plannedSets.every(isPlannedSet)
    && (value.restSeconds === undefined || (Number.isInteger(value.restSeconds) && (value.restSeconds as number) >= 0))
    && Number.isInteger(value.order) && (value.order as number) >= 0 && isOptionalString(value.notes)
    && (value.catalogExerciseId === undefined || isNonEmptyString(value.catalogExerciseId));
}

function isWarmupStage(value: unknown): value is WarmupStage {
  return isRecord(value) && ['general', 'specific', 'preparatory'].includes(String(value.id))
    && isNonEmptyString(value.title) && isString(value.instructions);
}

function isRoutine(value: unknown): value is Routine {
  return isRecord(value) && isNonEmptyString(value.id) && isNonEmptyString(value.name)
    && Array.isArray(value.exercises) && value.exercises.every(isRoutineExercise)
    && isOptionalString(value.notes) && isIsoDateTime(value.createdAt) && isIsoDateTime(value.updatedAt)
    && (value.warmupPlan === undefined || (Array.isArray(value.warmupPlan) && value.warmupPlan.every(isWarmupStage)
      && hasUniqueIds(value.warmupPlan as WarmupStage[])));
}

function isPerformedExercise(value: unknown): value is PerformedExercise {
  return isRecord(value) && isNonEmptyString(value.id) && isNonEmptyString(value.sourceExerciseId)
    && isNonEmptyString(value.name) && Array.isArray(value.plannedSets) && value.plannedSets.every(isPlannedSet)
    && Array.isArray(value.performedSets) && value.performedSets.every(isPerformedSet)
    && Number.isInteger(value.order) && (value.order as number) >= 0 && isOptionalString(value.notes)
    && (value.restSeconds === undefined || (Number.isInteger(value.restSeconds) && (value.restSeconds as number) >= 0))
    && (value.catalogExerciseId === undefined || isNonEmptyString(value.catalogExerciseId));
}

function isSession(value: unknown): value is WorkoutSession {
  if (!isRecord(value) || !isNonEmptyString(value.id) || !isNonEmptyString(value.routineId)
    || !isNonEmptyString(value.routineName) || !isIsoDateTime(value.startedAt)
    || !Array.isArray(value.exercises) || !value.exercises.every(isPerformedExercise) || !isOptionalString(value.notes)) return false;
  const validTimer = value.restTimer === undefined || (isRestTimer(value.restTimer) && value.restTimer.status !== 'running');
  const validWarmup = value.warmup === undefined || (Array.isArray(value.warmup) && value.warmup.every((step) => isWarmupStage(step)
    && ['pending', 'completed', 'skipped'].includes(String((step as Record<string, unknown>).status))));
  const validExtras = validWarmup && (value.durationSeconds === undefined || (Number.isInteger(value.durationSeconds) && (value.durationSeconds as number) >= 0))
    && (value.restTimer === undefined || isRestTimer(value.restTimer));
  if (!validExtras) return false;
  if (value.status === 'in-progress') return value.completedAt === undefined;
  return value.status === 'completed' && isIsoDateTime(value.completedAt) && validTimer;
}

function isAchievement(value: unknown): value is Achievement {
  return isRecord(value) && isNonEmptyString(value.id) && isNonEmptyString(value.title)
    && isString(value.description) && (value.criterion === undefined || isString(value.criterion))
    && (value.unlockedAt === undefined || isIsoDateTime(value.unlockedAt))
    && (value.category === undefined || ['journey', 'consistency', 'mastery'].includes(String(value.category)));
}

function isMission(value: unknown): value is Mission {
  return isRecord(value) && isNonEmptyString(value.id) && isNonEmptyString(value.title)
    && isString(value.description) && ['available', 'in-progress', 'completed'].includes(String(value.status))
    && (value.completedAt === undefined || isIsoDateTime(value.completedAt))
    && (value.progress === undefined || (Number.isInteger(value.progress) && (value.progress as number) >= 0))
    && (value.target === undefined || (Number.isInteger(value.target) && (value.target as number) > 0))
    && (value.rewardXp === undefined || (Number.isInteger(value.rewardXp) && (value.rewardXp as number) >= 0))
    && (value.weekKey === undefined || /^\d{4}-\d{2}-\d{2}$/.test(String(value.weekKey)))
    && (value.dayKey === undefined || /^\d{4}-\d{2}-\d{2}$/.test(String(value.dayKey)))
    && (value.category === undefined || ['daily', 'weekly', 'special'].includes(String(value.category)))
    && (value.claimedAt === undefined || isIsoDateTime(value.claimedAt));
}

export function validateProgressionState(value: unknown): value is ProgressionState {
  if (!isRecord(value) || !Array.isArray(value.xpAwards) || !Array.isArray(value.unlockedTitles)) return false;
  const validAwards = value.xpAwards.every((award) => isRecord(award) && isNonEmptyString(award.id)
    && ['session', 'mission'].includes(String(award.sourceType)) && isNonEmptyString(award.sourceId)
    && Number.isInteger(award.amount) && (award.amount as number) >= 0 && isIsoDateTime(award.awardedAt));
  const validTitles = value.unlockedTitles.every((title) => isRecord(title) && isNonEmptyString(title.id) && isIsoDateTime(title.unlockedAt));
  return validAwards && validTitles && hasUniqueIds(value.xpAwards as XpAward[])
    && hasUniqueIds(value.unlockedTitles as UnlockedTitle[])
    && (value.equippedTitleId === undefined || isNonEmptyString(value.equippedTitleId));
}

function hasUniqueIds(values: readonly { id: string }[]): boolean {
  return new Set(values.map((value) => value.id)).size === values.length;
}

function validateCoreAppData(value: Record<string, unknown>): boolean {
  return isRecord(value.profile) && Number.isInteger(value.profile.totalXp)
    && (value.profile.totalXp as number) >= 0 && isIsoDateTime(value.profile.createdAt)
    && (value.profile.displayName === undefined || isString(value.profile.displayName))
    && (value.profile.title === undefined || isString(value.profile.title))
    && (value.profile.showDisplayName === undefined || typeof value.profile.showDisplayName === 'boolean')
    && Array.isArray(value.routines) && value.routines.every(isRoutine)
    && hasUniqueIds(value.routines as Routine[])
    && value.routines.every((routine) => hasUniqueIds((routine as Routine).exercises))
    && Array.isArray(value.sessions) && value.sessions.every(isSession)
    && (value.sessions as WorkoutSession[]).filter((session) => session.status === 'in-progress').length <= 1
    && hasUniqueIds(value.sessions as WorkoutSession[])
    && value.sessions.every((session) => hasUniqueIds((session as WorkoutSession).exercises))
    && Array.isArray(value.achievements) && value.achievements.every(isAchievement)
    && Array.isArray(value.missions) && value.missions.every(isMission)
    && isRecord(value.companion) && isNonEmptyString(value.companion.characterId)
    && isNonEmptyString(value.companion.displayName) && isNonEmptyString(value.companion.appearance)
    && (value.companion.personality === undefined || isString(value.companion.personality))
    && (value.companion.personalityName === undefined || isString(value.companion.personalityName))
    && isRecord(value.preferences) && ['kg', 'lb'].includes(String(value.preferences.weightUnit))
    && ['system', 'light', 'dark'].includes(String(value.preferences.colorTheme))
    && (value.preferences.accentColor === undefined || ['electric-blue', 'violet', 'teal', 'amber', 'purple-eclipse', 'crimson', 'azure', 'emerald', 'rose'].includes(String(value.preferences.accentColor)))
    && (value.preferences.narrativeStyle === undefined || ['epic', 'playful', 'calm', 'cinematic', 'direct'].includes(String(value.preferences.narrativeStyle)))
    && (value.preferences.reduceMotion === undefined || typeof value.preferences.reduceMotion === 'boolean')
    && validateTrainingPlanFields(value);
}

function validateTrainingPlanFields(value: Record<string, unknown>): boolean {
  const validSequence = value.workoutSequence === undefined || (isRecord(value.workoutSequence)
    && Array.isArray(value.workoutSequence.routineIds) && value.workoutSequence.routineIds.every(isNonEmptyString)
    && hasNoDuplicates(value.workoutSequence.routineIds as string[])
    && Number.isInteger(value.workoutSequence.currentIndex) && (value.workoutSequence.currentIndex as number) >= 0
    && (value.workoutSequence.currentIndex as number) <= value.workoutSequence.routineIds.length
    && typeof value.workoutSequence.repeat === 'boolean' && typeof value.workoutSequence.completed === 'boolean'
    && Array.isArray(value.workoutSequence.processedSessionIds) && value.workoutSequence.processedSessionIds.every(isNonEmptyString)
    && (value.workoutSequence.lastCompletionMatched === undefined || typeof value.workoutSequence.lastCompletionMatched === 'boolean')
    && hasNoDuplicates(value.workoutSequence.processedSessionIds as string[]));
  const weekdays: Weekday[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const validSchedule = value.weeklySchedule === undefined || (isRecord(value.weeklySchedule)
    && Object.keys(value.weeklySchedule).every((key) => weekdays.includes(key as Weekday))
    && Object.values(value.weeklySchedule).every((day) => isRecord(day)
      && (day.type === 'rest' || (day.type === 'unconfigured' && (day.removedRoutineName === undefined || isString(day.removedRoutineName)))
        || (day.type === 'workout' && isNonEmptyString(day.routineId)))));
  return validSequence && validSchedule;
}

export function validateAppDataCore(value: unknown): value is Record<string, unknown> & { schemaVersion: number } {
  return isRecord(value) && typeof value.schemaVersion === 'number' && validateCoreAppData(value);
}

export function validateLegacyAppData(value: unknown): value is Record<string, unknown> & { schemaVersion: 1 } {
  return isRecord(value) && value.schemaVersion === 1 && validateCoreAppData(value);
}

export function validateAppData(value: unknown): value is AppData {
  if (!isRecord(value) || value.schemaVersion !== CURRENT_SCHEMA_VERSION
    || !validateCoreAppData(value) || !validateProgressionState(value.progression)) return false;
  const progression = value.progression;
  return (progression.equippedTitleId === undefined
    || progression.unlockedTitles.some((title) => title.id === progression.equippedTitleId));
}

function hasNoDuplicates(values: string[]): boolean { return new Set(values).size === values.length; }
