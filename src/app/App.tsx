import { useCallback, useEffect, useState } from 'react';
import type { AppPage } from '../components/AppShell';
import { AppShell } from '../components/AppShell';
import type { AppData } from '../domain/models';
import { Dashboard } from '../features/dashboard/Dashboard';
import { PlaceholderPage } from '../features/navigation/PlaceholderPage';
import { RoutinesPage } from '../features/routines/RoutinesPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { CompanionPage } from '../features/companion/CompanionPage';
import { TrainingPage } from '../features/training/TrainingPage';
import { HistoryPage } from '../features/history/HistoryPage';
import { ProgressionPage } from '../features/progression/ProgressionPage';
import { StatisticsPage } from '../features/statistics/StatisticsPage';
import { TrainingPlanPage } from '../features/plan/TrainingPlanPage';
import { ExerciseLibraryPage } from '../features/exercises/ExerciseLibraryPage';
import { BackupSection } from '../features/settings/BackupSection';
import { TrainingSpreadsheetPage } from '../features/statistics/TrainingSpreadsheetPage';
import { ExerciseEvolutionPage } from '../features/statistics/ExerciseEvolutionPage';
import { MuscleMapPage } from '../features/statistics/MuscleMapPage';
import { MissionsPage } from '../features/progression/MissionsPage';
import { MedalsPage } from '../features/progression/MedalsPage';
import { activeWorkout } from '../domain/sessionOperations';
import { calculateLevel, reconcileProgression } from '../domain/progression';
import { CURRENT_SCHEMA_VERSION } from '../domain/models';
import type { Preferences } from '../domain/models';
import { recordSequenceCompletion } from '../domain/trainingPlan';
import { loadAppData, restoreAppData, saveAppData } from '../storage/appStorage';
import type { SaveResult } from '../storage/appStorage';

export function App() {
  const [appData, setAppData] = useState<AppData | null>(null);
  const [storageMessage, setStorageMessage] = useState<string | null>(null);
  const [activePage, setActivePage] = useState<AppPage>('dashboard');
  const [selectedRoutineId, setSelectedRoutineId] = useState<string | null>(null);
  const [requestedRoutineName, setRequestedRoutineName] = useState<string | null>(null);
  const [previewPreferences, setPreviewPreferences] = useState<Preferences | null>(null);
  const [requestedTrainingRoutineId, setRequestedTrainingRoutineId] = useState<string | null>(null);
  const [recoveredSessionId, setRecoveredSessionId] = useState<string | null>(null);
  const [restoreNotice, setRestoreNotice] = useState<string | null>(null);
  const [insightExerciseId, setInsightExerciseId] = useState<string | null>(null);
  const [settingsRoutineId, setSettingsRoutineId] = useState<string | null>(null);
  const [levelNotice, setLevelNotice] = useState<{ from: number; to: number } | null>(null);

  useEffect(() => {
    const result = loadAppData();
    if (result.ok) {
      const hasCompletedSessions = result.data.sessions.some((session) => session.status === 'completed');
      const reconciled = hasCompletedSessions ? reconcileProgression(result.data) : result.data;
      if (hasCompletedSessions && JSON.stringify(reconciled) !== JSON.stringify(result.data)) {
        const saved = saveAppData(reconciled);
        setAppData(saved.ok ? reconciled : result.data);
        if (!saved.ok) setStorageMessage(saved.message);
      } else setAppData(result.data);
      setRecoveredSessionId(activeWorkout(result.data)?.id ?? null);
    }
    else setStorageMessage(result.message);
  }, []);

  const data = appData;
  const navigate = (page: AppPage) => {
    setActivePage(page);
    if (page !== 'settings') setSettingsRoutineId(null);
    setPreviewPreferences(null);
    if (page !== 'routines') setRequestedRoutineName(null);
  };
  const preview = useCallback((preferences: Preferences | null) => setPreviewPreferences(preferences), []);
  const effectivePreferences = previewPreferences ?? data?.preferences;
  const saveData = (next: AppData): SaveResult => {
    let withSequence = next;
    const previousCompleted = new Set((appData?.sessions ?? []).filter((session) => session.status === 'completed').map((session) => session.id));
    const newlyCompleted = next.sessions.filter((session) => session.status === 'completed' && !previousCompleted.has(session.id))
      .sort((a, b) => Date.parse(a.completedAt ?? a.startedAt) - Date.parse(b.completedAt ?? b.startedAt));
    for (const session of newlyCompleted) {
      const result = recordSequenceCompletion(withSequence.workoutSequence, session);
      if (result.sequence) withSequence = { ...withSequence, workoutSequence: result.sequence };
    }
    const reconciled = reconcileProgression(withSequence);
    const result = saveAppData(reconciled);
    if (result.ok) {
      const beforeLevel = calculateLevel(appData?.profile.totalXp ?? 0).level;
      const afterLevel = calculateLevel(reconciled.profile.totalXp).level;
      if (afterLevel > beforeLevel) setLevelNotice({ from: beforeLevel, to: afterLevel });
      setAppData(reconciled);
      setStorageMessage(null);
      setRestoreNotice(null);
    } else {
      setStorageMessage(result.message);
    }
    return result;
  };
  const restoreData = useCallback((restored: AppData): SaveResult => {
    // Restauração preserva o recibo de XP do arquivo e não reprocessa os eventos do histórico.
    const result = restoreAppData(restored);
    if (result.ok) {
      setAppData(restored);
      setRecoveredSessionId(activeWorkout(restored)?.id ?? null);
      setStorageMessage(null);
      setPreviewPreferences(null);
      setRestoreNotice('Backup restaurado com sucesso. A sessão em andamento, quando existente, está preservada.');
    } else setStorageMessage(result.message);
    return result;
  }, []);
  const openRoutine = (routineName: string) => {
    const found = data?.routines.find((routine) => routine.name.toLocaleLowerCase('pt-BR') === routineName.toLocaleLowerCase('pt-BR'));
    setSelectedRoutineId(found?.id ?? null);
    setRequestedRoutineName(found ? null : routineName);
    setActivePage('routines');
  };
  const openTrainingWithRoutine = (routineId: string) => {
    if (!data || activeWorkout(data)) setRequestedTrainingRoutineId(null);
    else setRequestedTrainingRoutineId(routineId);
    setActivePage('training');
  };
  const clearRequestedTrainingRoutine = useCallback(() => setRequestedTrainingRoutineId(null), []);

  return (
    <AppShell activePage={activePage} onNavigate={navigate} protagonistName={data?.profile.showDisplayName === false ? undefined : data?.profile.displayName} preferences={effectivePreferences} companionCharacterId={data?.companion.characterId ?? 'yotsuba-nakano'} companionDisplayName={data?.companion.displayName} levelNotice={levelNotice} onDismissLevelNotice={() => setLevelNotice(null)}>
      {activePage === 'dashboard'
        ? <Dashboard data={data ?? createSafeDashboardData()} storageMessage={storageMessage} onNavigate={navigate} onOpenRoutine={openRoutine} onStartRoutine={openTrainingWithRoutine} />
        : activePage === 'routines'
          ? <RoutinesPage data={data ?? createSafeDashboardData()} selectedRoutineId={selectedRoutineId} requestedRoutineName={requestedRoutineName} canEdit={data !== null} storageMessage={storageMessage} onSelectRoutine={(id) => { setSelectedRoutineId(id); setRequestedRoutineName(null); }} onStartTraining={openTrainingWithRoutine} onSaveData={saveData} />
          : activePage === 'exercises' && data
            ? <ExerciseLibraryPage data={data} onSave={saveData} />
          : activePage === 'training' && data
            ? <TrainingPage data={data} onSaveData={saveData} requestedRoutineId={requestedTrainingRoutineId} onClearRequestedRoutine={clearRequestedTrainingRoutine} recoveredSessionId={recoveredSessionId} storageMessage={storageMessage} />
            : activePage === 'plan' && data
              ? <TrainingPlanPage data={data} onSave={saveData} onOpenRoutine={(id) => { setSelectedRoutineId(id); setActivePage('routines'); }} onStartRoutine={openTrainingWithRoutine} />
            : activePage === 'history' && data
              ? <HistoryPage data={data} />
          : activePage === 'statistics' && data
            ? <StatisticsPage sessions={data.sessions} />
          : activePage === 'workbook' && data
            ? <TrainingSpreadsheetPage data={data} onEditRoutine={(id) => { setSettingsRoutineId(id); setActivePage('settings'); }} onOpenEvolution={(id) => { setInsightExerciseId(id ?? null); setActivePage('evolution'); }} />
          : activePage === 'evolution' && data
            ? <ExerciseEvolutionPage sessions={data.sessions} requestedExerciseId={insightExerciseId} onSelectExercise={setInsightExerciseId} />
          : activePage === 'muscles' && data
            ? <MuscleMapPage sessions={data.sessions} />
          : activePage === 'progression' && data
            ? <ProgressionPage data={data} onSave={saveData} />
          : activePage === 'missions' && data
            ? <MissionsPage data={data} onSave={saveData} />
          : activePage === 'medals' && data
            ? <MedalsPage data={data} onSave={saveData} />
          : activePage === 'settings' && data
              ? <SettingsPage data={data} onSave={saveData} onPreview={preview} onRestore={restoreData} restoreNotice={restoreNotice} focusRoutineId={settingsRoutineId} />
            : activePage === 'settings'
              ? <div className="settings-page"><section className="placeholder-page" aria-labelledby="settings-unavailable-title"><div className="placeholder-symbol">!</div><p className="eyebrow">PREFERÊNCIAS</p><h1 id="settings-unavailable-title">As configurações não puderam ser carregadas.</h1><p>{storageMessage ?? 'Os dados locais precisam estar disponíveis para editar preferências.'} O conteúdo original foi preservado. Você ainda pode restaurar um backup válido para recuperar o aplicativo.</p></section><BackupSection data={null} onRestore={restoreData} notice={restoreNotice} /></div>
            : activePage === 'companion' && data
              ? <CompanionPage data={data} onOpenSettings={() => navigate('settings')} onSave={saveData} />
              : <PlaceholderPage page={activePage} />}
    </AppShell>
  );
}

function createSafeDashboardData(): AppData {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    profile: { totalXp: 0, createdAt: new Date(0).toISOString() },
    routines: [],
    sessions: [],
    achievements: [],
    missions: [],
    progression: { xpAwards: [], unlockedTitles: [] },
    companion: { characterId: 'yotsuba-nakano', displayName: 'Yotsuba Nakano', appearance: 'default' },
    preferences: { weightUnit: 'kg', colorTheme: 'dark', accentColor: 'purple-eclipse', narrativeStyle: 'epic', reduceMotion: false },
  };
}
