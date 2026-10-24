import { useState } from 'react';
import type { AppData, WorkoutSession } from '../../domain/models';
import { getSessionProgress } from '../../domain/sessionOperations';

export function HistoryPage({ data }: { data: AppData }) {
  const completed = [...data.sessions]
    .filter((session) => session.status === 'completed' && session.completedAt)
    .sort((a, b) => Date.parse(b.completedAt!) - Date.parse(a.completedAt!));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = completed.find((session) => session.id === selectedId);

  return <div className="history-page">
    <header className="training-heading"><div><p className="eyebrow">REGISTROS DA JORNADA · ARC 04</p><h1>Histórico de sessões</h1><p>Uma linha do tempo construída apenas com treinos que você concluiu.</p></div><span className="history-count">{String(completed.length).padStart(2, '0')} <small>SESSÕES</small></span></header>
    {completed.length ? <div className="history-layout"><section className="history-list" aria-label="Sessões concluídas">{completed.map((session) => <HistoryRow key={session.id} session={session} selected={selectedId === session.id} onSelect={() => setSelectedId(session.id)} />)}</section>
      <section className="history-detail" aria-labelledby="history-detail-title">{selected ? <HistoryDetail session={selected} onClose={() => setSelectedId(null)} /> : <div className="history-detail-empty"><span>◇</span><h2>Escolha uma sessão</h2><p>Os exercícios e as séries registradas aparecerão neste painel.</p></div>}</section></div>
      : <section className="history-empty"><div className="history-empty-symbol">↻</div><p className="eyebrow">SEU ARQUIVO DE TREINAMENTO</p><h2>Nenhuma sessão concluída ainda.</h2><p>Quando você finalizar um treino, a data, duração e séries reais serão registradas aqui. Sessões descartadas não aparecem no histórico.</p></section>}
  </div>;
}

function HistoryRow({ session, selected, onSelect }: { session: WorkoutSession; selected: boolean; onSelect: () => void }) {
  const progress = getSessionProgress(session);
  return <button className={`history-row ${selected ? 'selected' : ''}`} aria-pressed={selected} onClick={onSelect}>
    <span className="history-row-date">{formatDay(session.completedAt!)}</span><span className="history-row-copy"><strong>{session.routineName}</strong><small>{formatTime(session.completedAt!)} · {formatDuration(session.durationSeconds ?? elapsed(session))}</small></span><span className="history-row-progress">{progress.completed}/{progress.planned}<small>SÉRIES</small></span><span className="history-row-arrow" aria-hidden="true">→</span>
  </button>;
}

function HistoryDetail({ session, onClose }: { session: WorkoutSession; onClose: () => void }) {
  const progress = getSessionProgress(session);
  return <div className="history-detail-content"><div className="history-detail-top"><div><p className="eyebrow">SESSÃO CONCLUÍDA</p><h2 id="history-detail-title">{session.routineName}</h2></div><button className="secondary-action history-close" onClick={onClose}>Fechar</button></div>
    <p className="history-detail-meta">{formatDateTime(session.completedAt!)} · {formatDuration(session.durationSeconds ?? elapsed(session))} · {progress.completed} de {progress.planned} séries</p>
    <ol className="history-exercise-list">{[...session.exercises].sort((a, b) => a.order - b.order).map((exercise, exerciseIndex) => <li className="history-exercise" key={exercise.id}><div className="history-exercise-heading"><span>{String(exerciseIndex + 1).padStart(2, '0')}</span><div><strong>{exercise.name}</strong><small>Planejado: {exercise.plannedSets.length} séries · {exercise.plannedSets.map((set) => set.targetReps).join(' / ')} reps</small></div></div>{exercise.notes && <p className="history-exercise-note">{exercise.notes}</p>}
      <ul>{exercise.performedSets.map((set, index) => <li className={set.completed ? 'done' : 'not-done'} key={index}><strong>Série {index + 1}</strong><span>{set.completed ? 'Concluída' : 'Não concluída'}</span>{set.load !== undefined && <span>{formatLoad(set.load)} kg</span>}{set.reps !== undefined && <span>{set.reps} reps</span>}{set.rir !== undefined && <span>RIR {set.rir}</span>}{set.notes && <p>{set.notes}</p>}</li>)}</ul>
    </li>)}</ol>
  </div>;
}

function elapsed(session: WorkoutSession): number {
  return Math.max(0, Math.floor((Date.parse(session.completedAt ?? session.startedAt) - Date.parse(session.startedAt)) / 1000));
}
function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours ? `${hours}h ${minutes.toString().padStart(2, '0')}min` : `${minutes}min ${seconds.toString().padStart(2, '0')}s`;
}
function formatDay(iso: string): string { return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(iso)); }
function formatDateTime(iso: string): string { return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full', timeStyle: 'short' }).format(new Date(iso)); }
function formatTime(iso: string): string { return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso)); }
function formatLoad(load: number): string { return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(load); }
