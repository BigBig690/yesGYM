import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Icon } from '../../components/Icon';
import type { AppData, WorkoutSession } from '../../domain/models';
import { getCompanionCharacter, getCompanionMessage } from '../../domain/companionCatalog';
import { CompanionPortrait } from '../companion/CompanionPortrait';
import {
  activeWorkout, adjustRestTimer, completeWorkoutSession, createWorkoutSession, discardWorkoutSession,
  draftFromSet, finishExpiredRestTimer, getRestSecondsRemaining, getSessionProgress, pauseRestTimer,
  restartRestTimer, resumeRestTimer, skipRestTimer, startRestTimer, togglePerformedSet, updatePerformedSet,
  validatePerformedSetDraft, type PerformedSetDraft as SetDraft,
} from '../../domain/sessionOperations';
import type { OperationResult } from '../../domain/sessionOperations';
import type { SaveResult } from '../../storage/appStorage';
import { defaultWarmupPlan, findCatalogExercise } from '../../domain/exerciseCatalog';
import { ExerciseIllustration } from '../exercises/ExerciseIllustration';
import { resetWarmup, updateWarmupStage } from '../../domain/sessionOperations';

type TrainingPageProps = {
  data: AppData;
  onSaveData: (data: AppData) => SaveResult;
  requestedRoutineId: string | null;
  onClearRequestedRoutine: () => void;
  recoveredSessionId: string | null;
  storageMessage: string | null;
};

export function TrainingPage({ data, onSaveData, requestedRoutineId, onClearRequestedRoutine, recoveredSessionId, storageMessage }: TrainingPageProps) {
  const [selectedRoutineId, setSelectedRoutineId] = useState<string | null>(null);
  const [confirmationRoutineId, setConfirmationRoutineId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const session = activeWorkout(data);
  const requestedRoutine = data.routines.find((routine) => routine.id === requestedRoutineId);

  useEffect(() => {
    if (!requestedRoutineId) return;
    if (!session && requestedRoutine) setConfirmationRoutineId(requestedRoutine.id);
    onClearRequestedRoutine();
  }, [requestedRoutineId, requestedRoutine, session, onClearRequestedRoutine]);

  const beginSession = () => {
    if (!confirmationRoutineId) return;
    const result = createWorkoutSession(data, confirmationRoutineId);
    if (!result.ok) { setError(result.error); setConfirmationRoutineId(null); return; }
    const saved = onSaveData(result.data);
    if (!saved.ok) { setError(`A sessão não foi iniciada porque não pôde ser salva: ${saved.message}`); return; }
    setError(null);
    setSelectedRoutineId(null);
    setConfirmationRoutineId(null);
  };

  if (session) return <ActiveWorkoutView session={session} data={data} onSaveData={onSaveData} recovered={session.id === recoveredSessionId} storageMessage={storageMessage} />;

  return <div className="training-page">
    <header className="training-heading"><div><p className="eyebrow">SESSÃO DE TREINO · ARC 04</p><h1>Escolha sua ficha</h1><p>Ao iniciar, os exercícios e o planejamento ficam registrados como uma fotografia desta sessão.</p></div><div className="training-symbol" aria-hidden="true"><Icon name="training" /></div></header>
    {(error || storageMessage) && <div className="training-alert" role="alert">{error ?? storageMessage}</div>}
    {data.routines.length ? <div className="training-routine-grid">{data.routines.map((routine, index) => <article className={`training-routine-card ${selectedRoutineId === routine.id ? 'selected' : ''}`} key={routine.id}>
      <button className="training-routine-select" onClick={() => setSelectedRoutineId(routine.id)} aria-pressed={selectedRoutineId === routine.id}><span className="training-card-number">{String(index + 1).padStart(2, '0')}</span><span className="training-card-copy"><small>FICHA · {routine.exercises.length} EXERCÍCIOS</small><strong>{routine.name}</strong><span>{routine.exercises.slice(0, 3).map((exercise) => exercise.name).join(' · ')}{routine.exercises.length > 3 ? ` · +${routine.exercises.length - 3}` : ''}</span></span><Icon name="arrow" /></button>
      <button className="primary-action training-start-button" onClick={() => { setError(null); setConfirmationRoutineId(routine.id); }}><span>Iniciar {routine.name}</span><Icon name="arrow" /></button>
    </article>)}</div> : <section className="training-empty"><span>◇</span><h2>Nenhuma ficha disponível</h2><p>Crie uma rotina ou adicione os modelos iniciais na seção Rotinas antes de iniciar uma sessão.</p></section>}
    {confirmationRoutineId && <StartConfirmation routine={data.routines.find((item) => item.id === confirmationRoutineId)} onCancel={() => setConfirmationRoutineId(null)} onConfirm={beginSession} />}
  </div>;
}

function StartConfirmation({ routine, onCancel, onConfirm }: { routine: AppData['routines'][number] | undefined; onCancel: () => void; onConfirm: () => void }) {
  return <div className="confirm-backdrop"><section className="confirm-dialog start-warmup-dialog" role="alertdialog" aria-modal="true" aria-labelledby="start-session-title" aria-describedby="start-session-description" onKeyDown={(event) => { if (event.key === 'Escape') onCancel(); }}><div className="confirm-mark training-confirm-mark"><Icon name="training" /></div><h2 id="start-session-title">Iniciar {routine?.name ?? 'treino'}?</h2><p id="start-session-description">A sessão guardará uma cópia desta ficha com {routine?.exercises.length ?? 0} exercícios. Cargas e repetições realizadas começarão em branco.</p>{routine && <div className="warmup-preview"><p className="eyebrow">AQUECIMENTO · OPCIONAL</p><p>Estas sugestões não bloqueiam o treino nem contam como séries efetivas.</p>{defaultWarmupPlan(routine).map((stage) => <div key={stage.id}><strong>{stage.title}</strong><span>{stage.instructions}</span></div>)}</div>}<div className="confirm-actions"><button className="secondary-action" autoFocus onClick={onCancel}>Voltar</button><button className="primary-action" onClick={onConfirm}>Iniciar sessão</button></div></section></div>;
}

function ActiveWorkoutView({ session, data, onSaveData, recovered, storageMessage }: { session: WorkoutSession; data: AppData; onSaveData: (data: AppData) => SaveResult; recovered: boolean; storageMessage: string | null }) {
  const [now, setNow] = useState(Date.now());
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(session.exercises.map((exercise) => exercise.id)));
  const [drafts, setDrafts] = useState<Record<string, SetDraft>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, Partial<Record<keyof SetDraft, string>>>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [timerInput, setTimerInput] = useState(() => String(session.restTimer?.durationSeconds ?? session.exercises[0]?.restSeconds ?? ''));
  const [finalizeConfirmation, setFinalizeConfirmation] = useState(false);
  const [discardConfirmation, setDiscardConfirmation] = useState(false);
  const [restNotice, setRestNotice] = useState(false);
  const progress = getSessionProgress(session);
  const selectedTimerExercise = session.exercises.find((exercise) => exercise.id === session.restTimer?.exerciseId) ?? session.exercises[0];
  const selectedTimerSet = session.restTimer?.setIndex;
  const elapsedSeconds = Math.max(0, Math.floor((now - Date.parse(session.startedAt)) / 1000));
  const secondsLeft = session.restTimer ? getRestSecondsRemaining(session.restTimer, now) : 0;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const result = finishExpiredRestTimer(data, session.id, now);
    if (!result?.ok) return;
    if (persist(result.data)) setRestNotice(true);
  // The timestamp check only writes once when an active deadline expires.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, session.id, session.restTimer?.status, session.restTimer?.endsAt]);

  useEffect(() => {
    if (session.restTimer?.status === 'running') setTimerInput(String(session.restTimer.durationSeconds));
  }, [session.restTimer?.durationSeconds, session.restTimer?.status]);

  function persist(next: AppData): boolean {
    const result = onSaveData(next);
    if (!result.ok) { setActionError(`Alteração não salva: ${result.message}`); setMessage(null); return false; }
    setActionError(null);
    setMessage('Salvo automaticamente neste dispositivo.');
    return true;
  }

  function perform(operation: ReturnType<typeof togglePerformedSet>) {
    if (!operation.ok) { setActionError(operation.error); setMessage(null); return false; }
    return persist(operation.data);
  }

  const setKey = (exerciseId: string, index: number) => `${exerciseId}:${index}`;
  const readDraft = (exerciseId: string, index: number): SetDraft => {
    const exercise = session.exercises.find((item) => item.id === exerciseId);
    const set = exercise?.performedSets[index];
    return drafts[setKey(exerciseId, index)] ?? (set ? draftFromSet(set) : { load: '', reps: '', rir: '', notes: '' });
  };

  const changeSet = (exerciseId: string, index: number, field: keyof SetDraft, value: string) => {
    const key = setKey(exerciseId, index);
    const draft = { ...readDraft(exerciseId, index), [field]: value };
    setDrafts((previous) => ({ ...previous, [key]: draft }));
    const validation = validatePerformedSetDraft(draft);
    setFieldErrors((previous) => ({ ...previous, [key]: validation.ok ? {} : validation.errors }));
    if (!validation.ok) { setMessage(null); return; }
    const currentSet = session.exercises.find((item) => item.id === exerciseId)?.performedSets[index];
    if (currentSet?.completed && validation.value.reps === undefined) {
      setFieldErrors((previous) => ({ ...previous, [key]: { reps: 'Uma série concluída precisa manter as repetições registradas.' } }));
      return;
    }
    const result = updatePerformedSet(data, session.id, exerciseId, index, draft);
    if (!result.ok) { setActionError(result.error); return; }
    if (!persist(result.data)) setDrafts((previous) => { const next = { ...previous }; delete next[key]; return next; });
  };

  const changeTimer = (operation: OperationResult) => {
    if (!operation.ok) { setActionError(operation.error); return; }
    persist(operation.data);
  };

  const timerAction = (action: 'start' | 'apply' | 'pause' | 'resume' | 'restart' | 'skip') => {
    const parsed = Number(timerInput);
    let result: OperationResult;
    if (action === 'restart') {
      result = restartRestTimer(data, session.id);
    } else if (action === 'start') {
      const duration = parsed;
      if (!Number.isInteger(duration) || duration < 1 || duration > 7200) { setActionError('Informe um descanso entre 1 e 7200 segundos.'); return; }
      result = startRestTimer(data, session.id, duration, Date.now(), selectedTimerExercise?.id, selectedTimerSet);
    } else if (action === 'apply') {
      result = adjustRestTimer(data, session.id, parsed);
    } else if (action === 'pause') result = pauseRestTimer(data, session.id);
    else if (action === 'resume') result = resumeRestTimer(data, session.id);
    else result = skipRestTimer(data, session.id);
    changeTimer(result);
  };

  const toggleExpanded = (exerciseId: string) => setExpanded((current) => {
    const next = new Set(current);
    if (next.has(exerciseId)) next.delete(exerciseId); else next.add(exerciseId);
    return next;
  });

  const finish = () => {
    const result = completeWorkoutSession(data, session.id);
    if (!result.ok) { setActionError(result.error); return; }
    if (persist(result.data)) setFinalizeConfirmation(false);
  };
  const discard = () => {
    const result = discardWorkoutSession(data, session.id);
    if (!result.ok) { setActionError(result.error); return; }
    if (persist(result.data)) setDiscardConfirmation(false);
  };

  const timerStatus = session.restTimer?.status ?? 'idle';
  const completionRatio = progress.planned ? `${Math.round(progress.completed / progress.planned * 100)}%` : '0%';

  return <div className="active-workout-page">
    <header className="active-workout-heading"><div><p className="eyebrow">{recovered ? 'SESSÃO RECUPERADA' : 'SESSÃO EM ANDAMENTO'} · ARC 04</p><h1>{session.routineName}</h1><p>Iniciada às <time dateTime={session.startedAt}>{formatTime(session.startedAt)}</time> · <span className="elapsed-value">{formatDuration(elapsedSeconds)}</span> decorridos</p></div><div className="workout-live-mark"><span className="pulse"/>AO VIVO</div></header>
    {recovered && <div className="recovered-banner" role="status"><span>↻</span> Sessão recuperada. Seus registros e o descanso foram restaurados.</div>}
    {(actionError || storageMessage) && <div className="training-alert" role="alert">{actionError ?? storageMessage}</div>}
    <section className="workout-progress-panel" aria-label="Progresso das séries"><div><span>PROGRESSO DA SESSÃO</span><strong>{progress.completed}<small> / {progress.planned} séries</small></strong></div><div className="workout-progress-track" role="progressbar" aria-valuenow={progress.completed} aria-valuemin={0} aria-valuemax={progress.planned} aria-label="Séries concluídas"><span style={{ width: completionRatio }}/></div><p>Somente séries marcadas como concluídas contam no progresso.</p></section>

    {session.warmup?.length ? <section className="session-warmup" aria-labelledby="session-warmup-title"><div className="workout-section-heading"><div><p className="eyebrow">PREPARAÇÃO OPCIONAL</p><h2 id="session-warmup-title">Aquecimento da ficha</h2></div><button className="text-link" onClick={() => { const result = resetWarmup(data, session.id); if (result.ok) persist(result.data); else setActionError(result.error); }}>Reiniciar etapas</button></div><p className="session-warmup-note">Orientações gerais, não uma prescrição individual. Você pode pular qualquer etapa; o aquecimento não é contado como séries de trabalho.</p><div className="session-warmup-grid">{session.warmup.map((stage) => <article key={stage.id} className={`session-warmup-step ${stage.status}`}><span>{stage.status === 'completed' ? '✓ Concluída' : stage.status === 'skipped' ? '↷ Pulada' : '○ Opcional'}</span><h3>{stage.title}</h3><p>{stage.instructions}</p><div><button className="secondary-action" onClick={() => { const result = updateWarmupStage(data, session.id, stage.id, stage.status === 'completed' ? 'pending' : 'completed'); if (result.ok) persist(result.data); else setActionError(result.error); }}>{stage.status === 'completed' ? 'Reabrir' : 'Concluir etapa'}</button>{stage.status === 'pending' && <button className="text-link" onClick={() => { const result = updateWarmupStage(data, session.id, stage.id, 'skipped'); if (result.ok) persist(result.data); else setActionError(result.error); }}>Pular</button>}</div></article>)}</div></section> : null}

    <div className="workout-main-grid"><section className="workout-exercises" aria-labelledby="workout-exercises-title"><div className="workout-section-heading"><div><p className="eyebrow">ORDEM PLANEJADA</p><h2 id="workout-exercises-title">Exercícios <span>{session.exercises.length.toString().padStart(2, '0')}</span></h2></div><span className="session-clock"><Icon name="clock" />{formatDuration(elapsedSeconds)}</span></div>
      {session.exercises.map((exercise, exerciseIndex) => {
        const completedSets = exercise.performedSets.filter((set) => set.completed).length;
        const currentSet = exercise.performedSets.findIndex((set) => !set.completed);
        const isExpanded = expanded.has(exercise.id);
        return <article className={`workout-exercise ${isExpanded ? 'expanded' : ''}`} key={exercise.id}>
          <header className="workout-exercise-heading"><span className="exercise-index">{String(exerciseIndex + 1).padStart(2, '0')}</span><div><h3>{exercise.name}</h3><p>{completedSets} de {exercise.plannedSets.length} séries concluídas {currentSet >= 0 ? `· série atual ${currentSet + 1}` : '· planejamento concluído'}</p></div><button className="exercise-expand-button" aria-expanded={isExpanded} aria-controls={`exercise-panel-${exercise.id}`} onClick={() => toggleExpanded(exercise.id)}>{isExpanded ? 'Recolher' : 'Expandir'} <span aria-hidden="true">{isExpanded ? '−' : '+'}</span></button></header>
          {isExpanded && <div id={`exercise-panel-${exercise.id}`} className="workout-exercise-body">{(() => { const catalog = findCatalogExercise(exercise.catalogExerciseId); return catalog ? <div className="session-exercise-technique"><ExerciseIllustration exercise={catalog} /><div><strong>{catalog.primaryMuscles.join(' · ')}</strong><span>Equipamento: {catalog.equipment.join(', ') || 'Peso corporal'}</span><details><summary>Ver instruções e detalhes</summary><ol>{catalog.instructions.map((line) => <li key={line}>{line}</li>)}</ol>{catalog.tips.map((tip) => <p key={tip}>{tip}</p>)}</details></div></div> : null; })()}<div className="exercise-plan-line"><span>PLANEJAMENTO</span><strong>{exercise.plannedSets.length} séries · {getRepPlan(exercise)}</strong>{exercise.restSeconds !== undefined && <small>Descanso planejado: {formatDuration(exercise.restSeconds)}</small>}</div>{exercise.notes && <p className="workout-exercise-note">{exercise.notes}</p>}
            <div className="performed-sets-list">{exercise.performedSets.map((set, setIndex) => {
              const key = setKey(exercise.id, setIndex);
              const draft = readDraft(exercise.id, setIndex);
              const errors = fieldErrors[key] ?? {};
              const planned = exercise.plannedSets[setIndex];
              return <fieldset className={`performed-set ${set.completed ? 'completed' : ''}`} key={setIndex}>
                <legend><span className="set-number">SÉRIE {setIndex + 1}</span><span className="set-state">{set.completed ? 'CONCLUÍDA' : setIndex === currentSet ? 'ATUAL' : 'PENDENTE'}</span>{planned && <span className="planned-reference">Meta: {planned.targetReps} reps{planned.targetLoad !== undefined ? ` · ${planned.targetLoad} kg` : ''}</span>}</legend>
                <div className="set-input-grid">
                  <div className="set-input"><label htmlFor={`${key}-load`}>Carga (kg)</label><input id={`${key}-load`} type="number" min="0" step="0.25" inputMode="decimal" value={draft.load} aria-invalid={Boolean(errors.load)} aria-describedby={errors.load ? `${key}-load-error` : `${key}-load-hint`} onChange={(event: ChangeEvent<HTMLInputElement>) => changeSet(exercise.id, setIndex, 'load', event.target.value)} placeholder="—" />{errors.load && <span className="set-error" id={`${key}-load-error`}>{errors.load}</span>}<span className="set-hint" id={`${key}-load-hint`}>Halteres: registre a carga total dos dois.</span></div>
                  <div className="set-input"><label htmlFor={`${key}-reps`}>Repetições</label><input id={`${key}-reps`} type="number" min="0" step="1" inputMode="numeric" value={draft.reps} aria-invalid={Boolean(errors.reps)} aria-describedby={errors.reps ? `${key}-reps-error` : undefined} onChange={(event: ChangeEvent<HTMLInputElement>) => changeSet(exercise.id, setIndex, 'reps', event.target.value)} placeholder="—" />{errors.reps && <span className="set-error" id={`${key}-reps-error`}>{errors.reps}</span>}</div>
                  <div className="set-input"><label htmlFor={`${key}-rir`}>RIR <span>(opcional · 0–10)</span></label><input id={`${key}-rir`} type="number" min="0" max="10" step="1" inputMode="numeric" value={draft.rir} aria-invalid={Boolean(errors.rir)} aria-describedby={errors.rir ? `${key}-rir-error` : undefined} onChange={(event: ChangeEvent<HTMLInputElement>) => changeSet(exercise.id, setIndex, 'rir', event.target.value)} placeholder="—" />{errors.rir && <span className="set-error" id={`${key}-rir-error`}>{errors.rir}</span>}</div>
                  <div className="set-input set-notes"><label htmlFor={`${key}-notes`}>Observação <span>(opcional)</span></label><input id={`${key}-notes`} value={draft.notes} onChange={(event: ChangeEvent<HTMLInputElement>) => changeSet(exercise.id, setIndex, 'notes', event.target.value)} placeholder="Como foi esta série?" /></div>
                </div>
                <button className={`set-complete-button ${set.completed ? 'is-complete' : ''}`} onClick={() => perform(togglePerformedSet(data, session.id, exercise.id, setIndex))}>{set.completed ? '✓ Série concluída · reabrir' : 'Marcar série como concluída'}</button>
              </fieldset>;
            })}</div>
          </div>}
        </article>;
      })}
    </section>

    <aside className="workout-side-column"><section className="rest-timer-panel" aria-labelledby="rest-timer-title"><div className="panel-topline"><span>INTERVALO OPCIONAL</span><Icon name="clock" /></div><h2 id="rest-timer-title">Descanso</h2><div className={`rest-clock ${timerStatus === 'finished' && restNotice ? 'rest-finished' : ''}`} aria-live="polite" aria-atomic="true">{formatDuration(secondsLeft)}</div><p className="rest-state-text">{timerStatus === 'running' ? 'Descanso em andamento' : timerStatus === 'paused' ? 'Descanso pausado' : timerStatus === 'finished' ? 'Intervalo encerrado. Continue quando estiver pronto.' : selectedTimerExercise?.restSeconds !== undefined ? `Planejado: ${formatDuration(selectedTimerExercise.restSeconds)}` : 'Sem intervalo planejado para esta ficha.'}</p>
        <div className="timer-adjust"><label htmlFor="rest-duration">Duração (segundos)</label><div><input id="rest-duration" type="number" min="0" max="7200" step="1" value={timerInput} onChange={(event) => setTimerInput(event.target.value)} placeholder="Informe o tempo" /><button className="secondary-action" disabled={timerStatus === 'running'} onClick={() => timerAction('apply')}>Aplicar</button></div></div>
        <div className="timer-actions">{timerStatus === 'running' ? <><button className="secondary-action" onClick={() => timerAction('pause')}>Pausar</button><button className="text-link" onClick={() => timerAction('skip')}>Ignorar descanso</button></> : timerStatus === 'paused' ? <><button className="primary-action" onClick={() => timerAction('resume')}>Retomar</button><button className="secondary-action" onClick={() => timerAction('restart')}>Reiniciar</button><button className="text-link" onClick={() => timerAction('skip')}>Ignorar</button></> : <button className="primary-action" disabled={!Number.isInteger(Number(timerInput)) || Number(timerInput) < 1 || Number(timerInput) > 7200} onClick={() => timerAction('start')}>{timerStatus === 'finished' ? 'Iniciar novamente' : 'Iniciar descanso'}</button>}</div>
      </section>
      <section className="companion-coach-panel"><CompanionPortrait character={getCompanionCharacter(data.companion.characterId)} displayName={getCompanionCharacter(data.companion.characterId).name} className="mini-companion-orb" mode="compact" eager /><div><small>{getCompanionCharacter(data.companion.characterId).name.toLocaleUpperCase('pt-BR')} · APOIO</small><p>“{getCompanionMessage(data.companion.characterId, 'effort')}”</p></div></section>
      <div className="workout-feedback" aria-live="polite">{actionError && !storageMessage ? '' : message}</div>
      <div className="workout-session-actions"><button className="secondary-action" onClick={() => setDiscardConfirmation(true)}>Descartar sessão</button><button className="primary-action" onClick={() => setFinalizeConfirmation(true)}>Finalizar treino</button></div>
    </aside></div>

    {finalizeConfirmation && <ProgressConfirmation title="Finalizar sessão?" description={`Você concluiu ${progress.completed} de ${progress.planned} séries planejadas. Séries pendentes não serão registradas como realizadas.`} confirmLabel="Finalizar sessão" onCancel={() => setFinalizeConfirmation(false)} onConfirm={finish} />}
    {discardConfirmation && <ProgressConfirmation title="Descartar sessão?" description="Os registros desta sessão em andamento serão descartados. Sessões concluídas, rotinas e configurações serão preservadas." confirmLabel="Descartar sessão" onCancel={() => setDiscardConfirmation(false)} onConfirm={discard} danger />}
  </div>;
}

function ProgressConfirmation({ title, description, confirmLabel, onCancel, onConfirm, danger = false }: { title: string; description: string; confirmLabel: string; onCancel: () => void; onConfirm: () => void; danger?: boolean }) {
  return <div className="confirm-backdrop"><section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="session-confirm-title" aria-describedby="session-confirm-description" onKeyDown={(event) => { if (event.key === 'Escape') onCancel(); }}><div className={`confirm-mark ${danger ? '' : 'training-confirm-mark'}`}>{danger ? '!' : '✓'}</div><h2 id="session-confirm-title">{title}</h2><p id="session-confirm-description">{description}</p><div className="confirm-actions"><button className="secondary-action" autoFocus onClick={onCancel}>Continuar treino</button><button className={danger ? 'danger-action' : 'primary-action'} onClick={onConfirm}>{confirmLabel}</button></div></section></div>;
}

function getRepPlan(exercise: WorkoutSession['exercises'][number]): string {
  const reps = exercise.plannedSets.map((set) => set.targetReps);
  return reps.every((count) => count === reps[0]) ? `${reps[0] ?? 0} repetições` : `${reps.join(' / ')} repetições`;
}

function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  return hours ? `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    : `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}
