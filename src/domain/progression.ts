import type { Achievement, AppData, Mission, StableId, WorkoutSession } from './models';

export type LevelProgress = {
  level: number;
  totalXp: number;
  xpIntoLevel: number;
  xpToNextLevel: number;
  progressPercent: number;
};

export type TitleDefinition = { id: string; name: string; description: string; sessionGoal: number };
export type AchievementDefinition = { id: string; name: string; description: string; criterion: string; category: 'journey' | 'consistency' | 'mastery' };

export const TITLE_DEFINITIONS: readonly TitleDefinition[] = [
  { id: 'first-step', name: 'Primeiro Passo', description: 'Finalize seu primeiro treino.', sessionGoal: 1 },
  { id: 'in-training', name: 'Em Treinamento', description: 'Finalize cinco sessões.', sessionGoal: 5 },
  { id: 'constant-presence', name: 'Presença Constante', description: 'Finalize doze sessões.', sessionGoal: 12 },
];

export const ACHIEVEMENT_DEFINITIONS: readonly AchievementDefinition[] = [
  { id: 'first-session', name: 'Despertar', description: 'Sua jornada começou com um treino concluído.', criterion: 'Finalizar 1 sessão.', category: 'journey' },
  { id: 'five-sessions', name: 'Em Movimento', description: 'Cinco sessões concluídas na jornada.', criterion: 'Finalizar 5 sessões.', category: 'journey' },
  { id: 'ten-sets', name: 'Base construída', description: 'Dez séries concluídas registradas.', criterion: 'Concluir 10 séries em sessões finalizadas.', category: 'mastery' },
  { id: 'ten-sessions', name: 'Dez capítulos', description: 'Dez sessões concluídas na jornada.', criterion: 'Finalizar 10 sessões.', category: 'journey' },
  { id: 'twelve-sessions', name: 'Presença Constante', description: 'Doze sessões concluídas com continuidade.', criterion: 'Finalizar 12 sessões.', category: 'consistency' },
  { id: 'three-week-sessions', name: 'Ritmo de jornada', description: 'Três sessões em uma semana.', criterion: 'Finalizar 3 sessões na mesma semana local.', category: 'consistency' },
  { id: 'four-active-weeks', name: 'Rotina Estabelecida', description: 'Treinos distribuídos por quatro semanas.', criterion: 'Concluir sessões em 4 semanas distintas.', category: 'consistency' },
  { id: 'two-routines', name: 'Explorador de Rotinas', description: 'Duas fichas diferentes fizeram parte da jornada.', criterion: 'Concluir 2 rotinas diferentes.', category: 'mastery' },
  { id: 'exercise-evolution', name: 'Evolução Registrada', description: 'Um exercício possui registros em dias diferentes.', criterion: 'Registrar o mesmo exercício em 2 datas locais.', category: 'mastery' },
  { id: 'level-five', name: 'Nível 5', description: 'Alcançou o nível 5.', criterion: 'Chegar ao nível 5.', category: 'journey' },
  { id: 'level-ten', name: 'Nível 10', description: 'Alcançou o nível 10.', criterion: 'Chegar ao nível 10.', category: 'journey' },
];

export const MISSION_DEFINITIONS = {
  firstSession: { id: 'first-session', title: 'Abrir o arco', description: 'Finalize uma sessão de treino.', target: 1, rewardXp: 40 },
  dailyScheduled: { id: 'daily-scheduled', title: 'Plano cumprido', description: 'Conclua a rotina programada para hoje.', target: 1, rewardXp: 20 },
  weeklySets: { id: 'weekly-sets', title: 'Construir a base', description: 'Conclua 8 séries nesta semana.', target: 8, rewardXp: 30 },
  weeklyConsistency: { id: 'weekly-consistency', title: 'Ritmo de jornada', description: 'Finalize 3 sessões nesta semana.', target: 3, rewardXp: 60 },
  weeklyDays: { id: 'weekly-days', title: 'Presença em dias distintos', description: 'Treine em 2 dias diferentes nesta semana.', target: 2, rewardXp: 30 },
} as const;

/** Custo crescente: 100 XP para o nível 2, depois +50 XP por nível. */
export function getXpToNextLevel(level: number): number {
  return 100 + Math.max(0, Math.floor(level) - 1) * 50;
}

export function calculateLevel(totalXp: number): LevelProgress {
  let remaining = Number.isFinite(totalXp) ? Math.max(0, Math.floor(totalXp)) : 0;
  let level = 1;
  let threshold = getXpToNextLevel(level);
  while (remaining >= threshold) {
    remaining -= threshold;
    level += 1;
    threshold = getXpToNextLevel(level);
  }
  return { level, totalXp: Math.max(0, Math.floor(Number.isFinite(totalXp) ? totalXp : 0)), xpIntoLevel: remaining,
    xpToNextLevel: threshold, progressPercent: Math.round((remaining / threshold) * 100) };
}

/** 10 XP pela sessão finalizada, 5 por série concluída e 1 por bloco de 5 repetições registradas. */
export function calculateSessionXp(session: WorkoutSession): number {
  if (session.status !== 'completed' || !session.completedAt) return 0;
  const sets = session.exercises.flatMap((exercise) => exercise.performedSets).filter((set) => set.completed);
  const actualReps = sets.reduce((sum, set) => sum + (set.reps ?? 0), 0);
  return 10 + sets.length * 5 + Math.floor(actualReps / 5);
}

export function localWeekKey(isoDate: string): string {
  const date = new Date(isoDate);
  const day = date.getDay();
  date.setDate(date.getDate() - ((day + 6) % 7));
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function localDateKey(isoDate: string): string {
  const date = new Date(isoDate);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function weekdayKey(day: number): keyof NonNullable<AppData['weeklySchedule']> | undefined {
  return (['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const)[day];
}

function firstSessionForWeeklyGoal(sessions: WorkoutSession[], target: number): WorkoutSession | undefined {
  const counts = new Map<string, number>();
  for (const session of sessions) {
    const key = localWeekKey(session.completedAt!);
    const count = (counts.get(key) ?? 0) + 1;
    counts.set(key, count);
    if (count >= target) return session;
  }
  return undefined;
}

function firstRepeatedExerciseDate(sessions: WorkoutSession[]): string | undefined {
  const dates = new Map<string, Set<string>>();
  for (const session of sessions) for (const exercise of session.exercises) {
    const key = exercise.catalogExerciseId ?? exercise.sourceExerciseId;
    const seen = dates.get(key) ?? new Set<string>();
    const date = localDateKey(session.completedAt!);
    if (seen.size && !seen.has(date)) return session.completedAt;
    seen.add(date);
    dates.set(key, seen);
  }
  return undefined;
}

export function reconcileProgression(data: AppData, now = new Date().toISOString()): AppData {
  const completed = data.sessions.filter(isCompleted).sort((a, b) => Date.parse(a.completedAt!) - Date.parse(b.completedAt!));
  const awards = [...data.progression.xpAwards];
  const awardedSessions = new Set(awards.filter((award) => award.sourceType === 'session').map((award) => award.sourceId));
  let earnedXp = 0;
  for (const session of completed) {
    if (awardedSessions.has(session.id)) continue;
    const amount = calculateSessionXp(session);
    awards.push({ id: `session:${session.id}`, sourceType: 'session', sourceId: session.id, amount, awardedAt: session.completedAt! });
    awardedSessions.add(session.id);
    earnedXp += amount;
  }

  const unlockedTitles = [...data.progression.unlockedTitles];
  for (const title of TITLE_DEFINITIONS) {
    if (completed.length >= title.sessionGoal && !unlockedTitles.some((item) => item.id === title.id)) {
      unlockedTitles.push({ id: title.id, unlockedAt: completed[title.sessionGoal - 1]!.completedAt! });
    }
  }

  const totalXp = data.profile.totalXp + earnedXp;
  const achievements = reconcileAchievements(data.achievements, completed, calculateLevel(totalXp).level);
  const missions = reconcileMissions(data, data.missions, completed, now);
  return {
    ...data,
    profile: { ...data.profile, totalXp: data.profile.totalXp + earnedXp,
      ...(data.progression.equippedTitleId && unlockedTitles.some((item) => item.id === data.progression.equippedTitleId)
        ? { title: titleName(data.progression.equippedTitleId) } : {}) },
    achievements,
    missions,
    progression: { ...data.progression, xpAwards: awards, unlockedTitles },
  };
}

export function equipTitle(data: AppData, titleId: string | null): { ok: true; data: AppData } | { ok: false; error: string } {
  if (titleId !== null && (!TITLE_DEFINITIONS.some((title) => title.id === titleId)
    || !data.progression.unlockedTitles.some((title) => title.id === titleId))) {
    return { ok: false, error: 'Esse título ainda não foi desbloqueado.' };
  }
  const progression = { ...data.progression, equippedTitleId: titleId ?? undefined };
  const profile = { ...data.profile, title: titleId ? titleName(titleId) : undefined };
  return { ok: true, data: { ...data, progression, profile } };
}

export function claimMission(data: AppData, missionId: StableId, now = new Date().toISOString()): { ok: true; data: AppData; xp: number } | { ok: false; error: string } {
  const mission = data.missions.find((item) => item.id === missionId);
  if (!mission || mission.status !== 'completed') return { ok: false, error: 'A missão ainda não foi concluída.' };
  if (mission.claimedAt || data.progression.xpAwards.some((award) => award.sourceType === 'mission' && award.sourceId === mission.id)) {
    return { ok: false, error: 'A recompensa desta missão já foi resgatada.' };
  }
  const xp = mission.rewardXp ?? 0;
  const nextMission: Mission = { ...mission, claimedAt: now };
  return { ok: true, xp, data: { ...data, profile: { ...data.profile, totalXp: data.profile.totalXp + xp },
    missions: data.missions.map((item) => item.id === mission.id ? nextMission : item),
    progression: { ...data.progression, xpAwards: [...data.progression.xpAwards,
      { id: `mission:${mission.id}`, sourceType: 'mission', sourceId: mission.id, amount: xp, awardedAt: now }] } } };
}

function isCompleted(session: WorkoutSession): session is WorkoutSession & { completedAt: string } {
  return session.status === 'completed' && Boolean(session.completedAt);
}

function titleName(id: string): string {
  return TITLE_DEFINITIONS.find((title) => title.id === id)?.name ?? '';
}

export function reconcileAchievements(existing: Achievement[], sessions: WorkoutSession[], level = 1): Achievement[] {
  const completedSets = sessions.reduce((sum, session) => sum + session.exercises.reduce((exerciseSum, exercise) =>
    exerciseSum + exercise.performedSets.filter((set) => set.completed).length, 0), 0);
  const setThresholdSession = sessions.find((session) => {
    const index = sessions.indexOf(session);
    return sessions.slice(0, index + 1).reduce((sum, item) => sum + item.exercises.reduce((n, exercise) => n + exercise.performedSets.filter((set) => set.completed).length, 0), 0) >= 10;
  });
  const criteria: Record<string, string | undefined> = {
    'first-session': sessions[0]?.completedAt,
    'five-sessions': sessions[4]?.completedAt,
    'ten-sets': completedSets >= 10 ? setThresholdSession?.completedAt : undefined,
    'ten-sessions': sessions.length >= 10 ? sessions[9]?.completedAt : undefined,
    'twelve-sessions': sessions[11]?.completedAt,
    'three-week-sessions': firstSessionForWeeklyGoal(sessions, 3)?.completedAt,
    'four-active-weeks': sessions.length && new Set(sessions.map((session) => localWeekKey(session.completedAt!))).size >= 4
      ? sessions.find((_, index) => new Set(sessions.slice(0, index + 1).map((item) => localWeekKey(item.completedAt!))).size >= 4)?.completedAt : undefined,
    'two-routines': new Set(sessions.map((session) => session.routineId)).size >= 2
      ? sessions.find((_, index) => new Set(sessions.slice(0, index + 1).map((item) => item.routineId)).size >= 2)?.completedAt : undefined,
    'exercise-evolution': firstRepeatedExerciseDate(sessions),
    'level-five': level >= 5 ? sessions.at(-1)?.completedAt : undefined,
    'level-ten': level >= 10 ? sessions.at(-1)?.completedAt : undefined,
  };
  const result = existing.map((item) => ({ ...item }));
  for (const definition of ACHIEVEMENT_DEFINITIONS) {
    const unlockedAt = criteria[definition.id];
    const prior = result.find((item) => item.id === definition.id);
    if (prior) {
      if (!prior.unlockedAt && unlockedAt) prior.unlockedAt = unlockedAt;
      prior.criterion = definition.criterion;
      prior.category = definition.category;
    } else result.push({ id: definition.id, title: definition.name, description: definition.description, criterion: definition.criterion, category: definition.category, ...(unlockedAt ? { unlockedAt } : {}) });
  }
  return result;
}

function reconcileMissions(data: AppData, existing: Mission[], sessions: WorkoutSession[], now: string): Mission[] {
  const weeks = new Set<string>([localWeekKey(now), ...sessions.map((session) => localWeekKey(session.completedAt!)),
    ...existing.flatMap((mission) => mission.weekKey ? [mission.weekKey] : [])]);
  const missions = new Map(existing.map((mission) => [mission.id, mission]));
  const firstSession = sessions[0];
  missions.set(MISSION_DEFINITIONS.firstSession.id, updatedMission(missions.get(MISSION_DEFINITIONS.firstSession.id), {
    ...MISSION_DEFINITIONS.firstSession, category: 'special', description: MISSION_DEFINITIONS.firstSession.description, progress: Math.min(1, sessions.length),
  }, firstSession?.completedAt));
  const today = localDateKey(now);
  const sessionsToday = sessions.filter((session) => localDateKey(session.completedAt!) === today);
  const dayName = weekdayKey(new Date(now).getDay());
  const scheduled = dayName ? data.weeklySchedule?.[dayName] : undefined;
  if (scheduled?.type === 'workout' && data.routines.some((routine) => routine.id === scheduled.routineId)) {
    const scheduledDone = sessionsToday.find((session) => session.routineId === scheduled.routineId);
    const id = `${MISSION_DEFINITIONS.dailyScheduled.id}:${today}:${scheduled.routineId}`;
    missions.set(id, updatedMission(missions.get(id), { ...MISSION_DEFINITIONS.dailyScheduled, id, category: 'daily', dayKey: today,
      description: `${MISSION_DEFINITIONS.dailyScheduled.description} (${today}).`, progress: scheduledDone ? 1 : 0 }, scheduledDone?.completedAt));
  }
  for (const weekKey of [...weeks].sort()) {
    const sessionsThisWeek = sessions.filter((session) => localWeekKey(session.completedAt!) === weekKey);
    const setsThisWeek = sessionsThisWeek.reduce((sum, session) => sum + session.exercises.reduce((n, exercise) =>
      n + exercise.performedSets.filter((set) => set.completed).length, 0), 0);
    const sessionAtGoal = sessionsThisWeek[MISSION_DEFINITIONS.weeklyConsistency.target - 1]?.completedAt;
    const setAtGoal = thresholdSessionForSets(sessionsThisWeek, MISSION_DEFINITIONS.weeklySets.target)?.completedAt;
    const distinctDays = [...new Set(sessionsThisWeek.map((session) => localDateKey(session.completedAt!)))];
    const dayAtGoal = distinctDays.length >= MISSION_DEFINITIONS.weeklyDays.target
      ? sessionsThisWeek.find((session) => localDateKey(session.completedAt!) === distinctDays[1])?.completedAt : undefined;
    const setsId = `${MISSION_DEFINITIONS.weeklySets.id}:${weekKey}`;
    const consistencyId = `${MISSION_DEFINITIONS.weeklyConsistency.id}:${weekKey}`;
    missions.set(setsId, updatedMission(missions.get(setsId), { ...MISSION_DEFINITIONS.weeklySets, category: 'weekly',
      id: setsId, description: `${MISSION_DEFINITIONS.weeklySets.description} Semana de ${weekKey}.`, progress: Math.min(MISSION_DEFINITIONS.weeklySets.target, setsThisWeek), weekKey }, setAtGoal));
    missions.set(consistencyId, updatedMission(missions.get(consistencyId), { ...MISSION_DEFINITIONS.weeklyConsistency, category: 'weekly',
      id: consistencyId, description: `${MISSION_DEFINITIONS.weeklyConsistency.description} Semana de ${weekKey}.`,
      progress: Math.min(MISSION_DEFINITIONS.weeklyConsistency.target, sessionsThisWeek.length), weekKey }, sessionAtGoal));
    const daysId = `${MISSION_DEFINITIONS.weeklyDays.id}:${weekKey}`;
    missions.set(daysId, updatedMission(missions.get(daysId), { ...MISSION_DEFINITIONS.weeklyDays, id: daysId, category: 'weekly', weekKey,
      description: `${MISSION_DEFINITIONS.weeklyDays.description} Semana de ${weekKey}.`, progress: Math.min(MISSION_DEFINITIONS.weeklyDays.target, distinctDays.length) }, dayAtGoal));
  }
  return [...missions.values()];
}

function updatedMission(prior: Mission | undefined, values: Pick<Mission, 'id' | 'title' | 'description' | 'progress' | 'target' | 'rewardXp'> & Partial<Pick<Mission, 'weekKey' | 'dayKey' | 'category'>>, reachedAt?: string): Mission {
  const progress = values.progress ?? 0;
  const completedAt = prior?.completedAt ?? (progress >= (values.target ?? 1) ? reachedAt : undefined);
  return { ...prior, ...values, status: completedAt ? 'completed' : progress > 0 ? 'in-progress' : 'available',
    ...(completedAt ? { completedAt } : {}), ...(prior?.claimedAt ? { claimedAt: prior.claimedAt } : {}) };
}

function thresholdSessionForSets(sessions: WorkoutSession[], target: number): WorkoutSession | undefined {
  let total = 0;
  for (const session of sessions) {
    total += session.exercises.reduce((sum, exercise) => sum + exercise.performedSets.filter((set) => set.completed).length, 0);
    if (total >= target) return session;
  }
  return undefined;
}
