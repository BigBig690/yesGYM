import { useMemo, useState } from 'react';
import type { AppData, ScheduleDay, Weekday } from '../../domain/models';
import { addLocalDays, countScheduledWeekProgress, createWorkoutSequence, formatWeekRange, getCompletedSessionsForDate, getScheduledDayStatus, getWeekDates, isScheduleFullyConfigured, localDateKey, nextSequenceRoutineId, reorderSequence, WEEKDAYS } from '../../domain/trainingPlan';
import type { SaveResult } from '../../storage/appStorage';

type Props = { data: AppData; onSave: (data: AppData) => SaveResult; onOpenRoutine: (id: string) => void; onStartRoutine: (id: string) => void };
const labels = { unconfigured: 'Não configurado', rest: 'Descanso', pending: 'Pendente', active: 'Em andamento', completed: 'Concluído', invalid: 'Ficha removida' } as const;

export function TrainingPlanPage({ data, onSave, onOpenRoutine, onStartRoutine }: Props) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Partial<Record<Weekday, ScheduleDay>>>(data.weeklySchedule ?? {});
  const [sequenceDraft, setSequenceDraft] = useState<string[]>(data.workoutSequence?.routineIds ?? []);
  const [candidate, setCandidate] = useState('');
  const [repeat, setRepeat] = useState(data.workoutSequence?.repeat ?? true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dates = useMemo(() => getWeekDates(addLocalDays(new Date(), weekOffset * 7)), [weekOffset]);
  const todayKey = localDateKey(new Date());
  const isPast = localDateKey(dates[6]!) < todayKey;
  const progress = countScheduledWeekProgress(getWeekDates(new Date()), data.weeklySchedule, data.routines, data.sessions);
  const sequence = data.workoutSequence;
  const nextId = nextSequenceRoutineId(sequence);

  const save = (next: AppData, success: string) => {
    const result = onSave(next);
    if (result.ok) { setMessage(success); setError(null); return true; }
    setError(result.message); setMessage(null); return false;
  };
  const beginEditing = () => { setDraft(data.weeklySchedule ?? {}); setEditing(true); setMessage(null); setError(null); };
  const saveSchedule = () => {
    if (!isScheduleFullyConfigured(draft)) { setError('Defina uma rotina ou descanso para cada um dos sete dias antes de salvar.'); return; }
    if (save({ ...data, weeklySchedule: draft }, 'Programação semanal salva neste dispositivo.')) setEditing(false);
  };
  const selectDay = (weekday: Weekday, value: string) => {
    setDraft((current) => ({ ...current, [weekday]: value === 'unconfigured' ? undefined : value === 'rest' ? { type: 'rest' } : { type: 'workout', routineId: value } }));
  };
  const setRemainingRest = () => setDraft((current) => Object.fromEntries(WEEKDAYS.map(({ id }) => [id, current[id] ?? { type: 'rest' }])) as Partial<Record<Weekday, ScheduleDay>>);
  const saveSequence = () => {
    if (sequenceDraft.some((id) => !data.routines.some((routine) => routine.id === id))) { setError('Remova ou substitua fichas que já não existem.'); return; }
    const currentRoutineId = sequence && !sequence.completed ? sequence.routineIds[sequence.currentIndex] : undefined;
    const expectedRemoved = Boolean(currentRoutineId && !sequenceDraft.includes(currentRoutineId));
    const nextIndex = currentRoutineId && sequenceDraft.includes(currentRoutineId)
      ? sequenceDraft.indexOf(currentRoutineId)
      : repeat && sequenceDraft.length > 0 ? (sequence?.currentIndex ?? 0) % sequenceDraft.length : Math.min(sequence?.currentIndex ?? 0, sequenceDraft.length);
    const created = sequence ? {
      ...sequence,
      routineIds: [...sequenceDraft],
      currentIndex: nextIndex,
      repeat,
      completed: sequenceDraft.length === 0 || (!repeat && (sequence.completed && !currentRoutineId || expectedRemoved && nextIndex >= sequenceDraft.length)),
    } : createWorkoutSequence(sequenceDraft, data.sessions, repeat);
    if (save({ ...data, workoutSequence: created }, 'Sequência salva. Sessões anteriores à configuração não avançam o novo ciclo.')) setError(null);
  };
  const updateSequence = (routineIds: string[]) => setSequenceDraft(routineIds);

  return <div className="training-plan-page">
    <header className="page-heading plan-heading"><div><p className="eyebrow">MAPA DA JORNADA</p><h1>Agenda & sequência</h1><p>Planeje os dias da semana e mantenha uma ordem de fichas independente do calendário.</p></div><span className="plan-heading-mark" aria-hidden="true">↗</span></header>
    {(error || message) && <p className={error ? 'plan-feedback error' : 'plan-feedback'} role={error ? 'alert' : 'status'}>{error ?? message}</p>}

    <section className="plan-section" aria-labelledby="weekly-plan-heading">
      <div className="plan-section-head"><div><p className="eyebrow">PROGRAMAÇÃO RECORRENTE</p><h2 id="weekly-plan-heading">Sua semana</h2></div><button className="secondary-action" onClick={editing ? () => { setEditing(false); setDraft(data.weeklySchedule ?? {}); setError(null); } : beginEditing}>{editing ? 'Cancelar edição' : data.weeklySchedule ? 'Editar semana' : 'Configurar semana'}</button></div>
      <div className="week-controls"><button className="secondary-action" aria-label="Semana anterior" onClick={() => setWeekOffset((value) => value - 1)}>←</button><strong>{weekOffset === 0 ? 'Semana atual' : weekOffset < 0 ? 'Semana anterior' : 'Semana futura'} · {formatWeekRange(dates)}</strong><button className="secondary-action" aria-label="Próxima semana" onClick={() => setWeekOffset((value) => value + 1)}>→</button><button className="text-link" onClick={() => setWeekOffset(0)}>Voltar para hoje</button></div>
      {editing ? <div className="schedule-editor"><p>Escolha uma ficha ou marque descanso em cada dia. Dias sem escolha continuam não configurados.</p><div className="schedule-day-grid">{WEEKDAYS.map(({ id, label }, index) => <label className="schedule-day-card editing" key={id}><span className="schedule-day-name">{label}</span><span className="schedule-date-number">{dates[index]!.getDate()}</span><select aria-label={`Programação de ${label}`} value={draft[id]?.type === 'workout' ? draft[id].routineId : draft[id]?.type === 'rest' ? 'rest' : 'unconfigured'} onChange={(event) => selectDay(id, event.target.value)}><option value="unconfigured">Não configurado</option><option value="rest">Descanso</option>{data.routines.map((routine) => <option key={routine.id} value={routine.id}>{routine.name}</option>)}</select>{draft[id]?.type === 'unconfigured' && <small>{draft[id].removedRoutineName ? `A ficha ${draft[id].removedRoutineName} foi removida. Escolha novamente.` : 'Escolha uma opção para este dia.'}</small>}</label>)}</div><div className="schedule-editor-actions"><button className="secondary-action" onClick={setRemainingRest}>Marcar dias restantes como descanso</button><button className="primary-action" onClick={saveSchedule}>Salvar semana</button></div></div>
      : !data.weeklySchedule ? <div className="plan-empty"><span>◇</span><div><strong>A agenda ainda não foi configurada</strong><p>Os sete dias estão sem decisão. Configure uma ficha ou escolha descanso para cada dia.</p></div><button className="primary-action" onClick={beginEditing}>Configurar semana</button></div>
      : <><p className="schedule-view-note">{isPast ? 'Esta é a programação recorrente atual. Semanas anteriores exibem abaixo apenas sessões realmente registradas.' : 'A agenda se repete a cada semana. O estado do treino vem das sessões salvas.'}</p><div className="schedule-day-grid">{dates.map((date, index) => {
        const weekday = WEEKDAYS[index]!.id;
        const scheduled = data.weeklySchedule?.[weekday];
        const isToday = localDateKey(date) === todayKey;
        const routine = scheduled?.type === 'workout' ? data.routines.find((item) => item.id === scheduled.routineId) : undefined;
        const status = getScheduledDayStatus(scheduled, date, data.routines, data.sessions);
        const actualSessions = isPast ? getCompletedSessionsForDate(date, data.sessions) : [];
        const showRecurrence = !isPast;
        return <article key={localDateKey(date)} className={`schedule-day-card ${isToday ? 'today' : ''} ${status}`} aria-label={`${WEEKDAYS[index]!.label}, ${labels[status]}${isToday ? ', hoje' : ''}`}><div className="schedule-card-top"><span className="schedule-day-name">{WEEKDAYS[index]!.label}</span>{isToday && <strong className="today-tag">HOJE</strong>}</div><span className="schedule-date-number">{date.getDate()}</span>{showRecurrence ? <><strong className="schedule-assignment">{status === 'invalid' ? 'Ficha removida' : status === 'unconfigured' ? 'Não configurado' : status === 'rest' ? 'Descanso' : routine?.name}</strong><span className="schedule-status">{status === 'rest' ? '◇ Dia de recuperação' : labels[status]}</span>{status === 'unconfigured' && scheduled?.type === 'unconfigured' && <small className="schedule-invalid-note">{scheduled.removedRoutineName ? `${scheduled.removedRoutineName} foi removida; escolha outra ficha ou descanso.` : 'Defina uma ficha ou descanso.'}</small>}<div className="schedule-actions">{routine && <><button className="text-link" onClick={() => onOpenRoutine(routine.id)}>Abrir ficha</button>{status !== 'active' && <button className="text-link" onClick={() => onStartRoutine(routine.id)}>Iniciar treino</button>}</>}{!editing && <button className="text-link" onClick={beginEditing}>Editar programação</button>}</div></> : <div className="past-sessions">{actualSessions.length ? actualSessions.map((session) => <div key={session.id}><strong>{session.routineName}</strong><span>{session.exercises.reduce((sum, exercise) => sum + exercise.performedSets.filter((set) => set.completed).length, 0)} séries concluídas · Concluído</span></div>) : <span>Nenhuma sessão registrada</span>}</div>}</article>;
      })}</div>{!isPast && <p className="plan-summary">Nesta semana: <strong>{progress.completed} de {progress.planned}</strong> dias programados concluídos. {progress.planned === 0 && 'Ainda não há dias de treino programados.'}</p>}</>}
    </section>

    {isPast && <section className="plan-section past-plan-note"><p className="eyebrow">REGISTRO REAL</p><h2>Semana consultada</h2><p>A recorrência atual não é usada para afirmar o que estava planejado no passado. Os cartões mostram somente sessões concluídas registradas em cada data local.</p></section>}

    <section className="plan-section sequence-section" aria-labelledby="sequence-heading"><div className="plan-section-head"><div><p className="eyebrow">ORDEM DE TREINAMENTO</p><h2 id="sequence-heading">Sequência de fichas</h2></div></div><p className="schedule-view-note">A sequência avança somente quando uma sessão é concluída para a próxima ficha esperada. Ela não depende dos dias da agenda.</p>
      {sequenceDraft.length === 0 && !sequence ? <div className="plan-empty"><span>↗</span><div><strong>Nenhuma sequência configurada</strong><p>Escolha fichas para definir qual vem depois, independente da programação semanal.</p></div></div> : null}
      <div className="sequence-editor"><div className="sequence-add"><label htmlFor="sequence-routine">Adicionar ficha</label><select id="sequence-routine" value={candidate} onChange={(event) => setCandidate(event.target.value)}><option value="">Escolha uma rotina</option>{data.routines.filter((routine) => !sequenceDraft.includes(routine.id)).map((routine) => <option key={routine.id} value={routine.id}>{routine.name}</option>)}</select><button className="secondary-action" disabled={!candidate} onClick={() => { updateSequence([...sequenceDraft, candidate]); setCandidate(''); }}>Adicionar</button></div>
        {sequenceDraft.length > 0 && <ol className="sequence-list">{sequenceDraft.map((id, index) => { const routine = data.routines.find((item) => item.id === id); const isNext = id === nextId && sequence; return <li key={`${id}-${index}`} className={isNext ? 'next' : ''}><span className="sequence-position">{String(index + 1).padStart(2, '0')}</span><strong>{routine?.name ?? 'Ficha removida'}</strong>{isNext && <span className="sequence-next-label">PRÓXIMA</span>}<div className="sequence-item-actions"><button aria-label={`Mover ${routine?.name ?? 'ficha'} para cima`} disabled={index === 0} onClick={() => setSequenceDraft(reorderSequence({ routineIds: sequenceDraft, currentIndex: sequence?.currentIndex ?? 0, repeat, processedSessionIds: sequence?.processedSessionIds ?? [], completed: sequence?.completed ?? false }, index, index - 1).routineIds)}>↑</button><button aria-label={`Mover ${routine?.name ?? 'ficha'} para baixo`} disabled={index === sequenceDraft.length - 1} onClick={() => setSequenceDraft(reorderSequence({ routineIds: sequenceDraft, currentIndex: sequence?.currentIndex ?? 0, repeat, processedSessionIds: sequence?.processedSessionIds ?? [], completed: sequence?.completed ?? false }, index, index + 1).routineIds)}>↓</button><button aria-label={`Remover ${routine?.name ?? 'ficha'} da sequência`} onClick={() => setSequenceDraft(sequenceDraft.filter((_, itemIndex) => itemIndex !== index))}>Remover</button></div></li>; })}</ol>}
        {sequenceDraft.length > 0 && <><label className="sequence-repeat"><input type="checkbox" checked={repeat} onChange={(event) => setRepeat(event.target.checked)} /> Recomeçar do primeiro item ao concluir o ciclo</label><div className="sequence-controls"><button className="primary-action" onClick={saveSequence}>Salvar sequência</button>{sequence?.completed && <button className="secondary-action" onClick={() => save({ ...data, workoutSequence: { ...sequence, currentIndex: 0, completed: false } }, 'Sequência reiniciada. O histórico foi preservado.')}>Reiniciar ciclo</button>}</div></>}
        {sequence && sequenceDraft.length === 0 && <button className="secondary-action" onClick={() => { const next = { ...data }; delete next.workoutSequence; save(next, 'Sequência removida. O histórico de sessões foi preservado.'); }}>Remover sequência salva</button>}
        {sequence && sequence.routineIds.length > 0 && <div className="sequence-progress"><strong>{sequence.completed ? 'Sequência concluída' : nextId ? `Próxima: ${data.routines.find((item) => item.id === nextId)?.name ?? 'Ficha removida'}` : 'Sequência sem próximo treino'}</strong><span>{sequence.completed ? `${sequence.routineIds.length} de ${sequence.routineIds.length}` : `${Math.min(sequence.currentIndex + 1, sequence.routineIds.length)} de ${sequence.routineIds.length}`}</span><div className="sequence-meter" role="progressbar" aria-label="Progresso da sequência" aria-valuemin={0} aria-valuemax={sequence.routineIds.length} aria-valuenow={sequence.currentIndex}><span style={{ width: `${sequence.completed ? 100 : Math.round(sequence.currentIndex / sequence.routineIds.length * 100)}%` }} /></div>{sequence.lastCompletionMatched === false && <p role="status">A última sessão foi registrada, mas não correspondia à próxima ficha. A ordem foi mantida.</p>}</div>}
      </div>
    </section>
  </div>;
}
