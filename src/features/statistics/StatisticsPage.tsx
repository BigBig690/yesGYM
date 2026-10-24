import { useMemo, useState } from 'react';
import type { WorkoutSession } from '../../domain/models';
import { buildActivityCalendar, calculatePersonalRecords, calculateWorkoutStatistics, formatDuration, getExerciseOptions } from '../../domain/statistics';
import type { CompletedSetRecord, StatisticsPeriod } from '../../domain/statistics';

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

export function StatisticsPage({ sessions }: { sessions: readonly WorkoutSession[] }) {
  const [period, setPeriod] = useState<StatisticsPeriod>('all');
  const [exerciseId, setExerciseId] = useState('');
  const [month, setMonth] = useState(() => { const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), 1); });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const options = useMemo(() => getExerciseOptions(sessions), [sessions]);
  const stats = useMemo(() => calculateWorkoutStatistics(sessions, { period, exerciseId: exerciseId || undefined }), [sessions, period, exerciseId]);
  const records = useMemo(() => calculatePersonalRecords(stats.sessions, exerciseId || undefined), [stats.sessions, exerciseId]);
  const calendar = useMemo(() => buildActivityCalendar(sessions, month.getFullYear(), month.getMonth()), [sessions, month]);
  const monthSessions = useMemo(() => sessions.filter((session) => session.status === 'completed' && session.completedAt
    && new Date(session.completedAt).getFullYear() === month.getFullYear() && new Date(session.completedAt).getMonth() === month.getMonth()), [sessions, month]);
  const selectedSessions = selectedDay ? calendar.find((day) => day.dateKey === selectedDay)?.sessions ?? [] : [];

  return <div className="statistics-page">
    <header className="training-heading statistics-heading"><div><p className="eyebrow">DADOS REAIS · ARC 06</p><h1>Estatísticas & evolução</h1><p>Métricas calculadas a partir das sessões concluídas e dos registros efetivamente feitos.</p></div><span className="statistics-heading-mark" aria-hidden="true">↗</span></header>

    <section className="statistics-filters" aria-label="Filtros das estatísticas">
      <div className="setting-field"><label htmlFor="statistics-period">Período</label><select id="statistics-period" value={period} onChange={(event) => setPeriod(event.target.value as StatisticsPeriod)}><option value="all">Todo o histórico</option><option value="90d">Últimos 90 dias</option><option value="30d">Últimos 30 dias</option></select></div>
      <div className="setting-field"><label htmlFor="statistics-exercise">Exercício</label><select id="statistics-exercise" value={exerciseId} onChange={(event) => setExerciseId(event.target.value)}><option value="">Todos os exercícios</option>{options.map((exercise) => <option key={exercise.id} value={exercise.id}>{exercise.name}</option>)}</select></div>
      <p>O filtro de exercício usa o identificador original do exercício, não apenas o nome. Séries planejadas e sessões descartadas não entram nos cálculos.</p>
    </section>

    {stats.sessionCount === 0 ? <section className="statistics-empty" aria-live="polite"><span aria-hidden="true">◇</span><h2>{sessions.some((session) => session.status === 'completed') ? 'Nenhuma sessão neste filtro.' : 'Seu histórico ainda está começando.'}</h2><p>{sessions.some((session) => session.status === 'completed') ? 'Escolha outro período ou exercício para ver registros existentes.' : 'Conclua uma sessão e registre séries realizadas para começar a visualizar volume, frequência e evolução.'}</p></section> : <>
      <section className="statistics-metrics" aria-label="Resumo do período">
        <Metric label={exerciseId ? 'Sessões com este exercício' : 'Sessões concluídas'} value={String(stats.sessionCount)} detail={`${stats.sessionsThisWeek} nesta semana`} />
        <Metric label="Séries concluídas" value={String(stats.completedSets)} detail={stats.setsWithoutLoad ? `${stats.setsWithoutLoad} sem carga registrada` : 'Considera apenas séries marcadas como feitas'} />
        <Metric label="Volume registrado" value={stats.totalVolume === null ? '—' : `${stats.totalVolume.toLocaleString('pt-BR')} kg·reps`} detail={stats.totalVolume === null ? 'Sem séries com carga e reps válidas' : `Soma de ${stats.volumeSetCount} séries com carga e reps registradas`} />
        <Metric label="Duração média" value={stats.averageDurationSeconds === null ? '—' : formatDuration(stats.averageDurationSeconds)} detail={`Tempo acumulado: ${formatDuration(stats.totalDurationSeconds)}`} />
      </section>
      {stats.setsWithoutLoad > 0 && <p className="statistics-definition">Séries sem carga anotada continuam contando como séries concluídas, mas ficam fora do volume. Carga ausente não é tratada como zero.</p>}

      <section className="statistics-section" aria-labelledby="records-title"><SectionHeading eyebrow="MARCOS CALCULADOS" title="Recordes pessoais" id="records-title" />
        {records.length ? <div className="statistics-record-grid">{records.map((record) => <article className="statistics-record" key={record.id}><span className="statistics-record-kicker">{record.estimated ? 'ESTIMATIVA · NÃO TESTADA' : 'REGISTRO REAL'}</span><h3>{record.title}</h3><strong>{record.value.toLocaleString('pt-BR', { maximumFractionDigits: record.estimated ? 1 : 2 })}{record.id.startsWith('max-load:') ? ' kg' : record.id.startsWith('max-reps:') ? ' reps' : record.id.startsWith('estimated-1rm:') ? ' kg' : ' kg·reps'}</strong><p>{record.routineName} · {formatDate(record.completedAt)}</p><small>{record.detail}</small></article>)}</div> : <p className="statistics-empty-inline">Ainda não há séries concluídas com valores suficientes para recordes neste filtro.</p>}
      </section>

      <section className="statistics-section" aria-labelledby="evolution-title"><SectionHeading eyebrow="CARGAS REGISTRADAS" title="Evolução por exercício" id="evolution-title" />
        {!exerciseId ? <p className="statistics-empty-inline">Escolha um exercício acima para consultar seus registros sem misturar movimentos diferentes.</p> : <ExerciseEvolution records={stats.records.filter((record) => record.load !== undefined)} />}
      </section>
    </>}

    <section className="statistics-section statistics-calendar-section" aria-labelledby="calendar-title">
      <div className="statistics-calendar-heading"><SectionHeading eyebrow="FREQUÊNCIA LOCAL" title="Calendário de atividade" id="calendar-title" /><div className="statistics-month-controls"><button className="secondary-action" aria-label="Mês anterior" onClick={() => { setMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1)); setSelectedDay(null); }}>‹</button><strong>{new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(month)}</strong><button className="secondary-action" aria-label="Próximo mês" onClick={() => { setMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1)); setSelectedDay(null); }}>›</button></div></div>
      <p className="statistics-calendar-count">{monthSessions.length} {monthSessions.length === 1 ? 'treino concluído' : 'treinos concluídos'} neste mês</p>
      <div className="activity-calendar" role="grid" aria-label="Calendário mensal de treinos"><div className="calendar-weekdays" role="row">{WEEKDAYS.map((weekday) => <span role="columnheader" key={weekday}>{weekday}</span>)}</div><div className="calendar-days">{Array.from({ length: 6 }, (_, weekIndex) => <div className="calendar-week-row" role="row" key={weekIndex}>{calendar.slice(weekIndex * 7, weekIndex * 7 + 7).map((day) => <button role="gridcell" aria-selected={selectedDay === day.dateKey} aria-label={`${formatDateKey(day.dateKey)}${day.sessions.length ? `, ${day.sessions.length} ${day.sessions.length === 1 ? 'treino' : 'treinos'}` : ', sem treinos'}`} className={`calendar-day${day.inMonth ? '' : ' outside-month'}${day.sessions.length ? ' has-activity' : ''}${selectedDay === day.dateKey ? ' selected' : ''}`} data-activity={Math.min(day.sessions.length, 3)} key={day.dateKey} onClick={() => setSelectedDay(day.dateKey)}><span>{day.date.getDate()}</span>{day.sessions.length > 0 && <i aria-hidden="true" />}</button>)}</div>)}</div></div>
      {selectedDay && <div className="calendar-selection" aria-live="polite"><h3>{formatDateKey(selectedDay)}</h3>{selectedSessions.length ? <ul>{selectedSessions.map((session) => <li key={session.id}><strong>{session.routineName}</strong><span>{session.exercises.reduce((total, exercise) => total + exercise.performedSets.filter((set) => set.completed).length, 0)} séries concluídas · {formatClockDuration(session.durationSeconds)}</span></li>)}</ul> : <p>Nenhuma sessão finalizada neste dia.</p>}</div>}
      <p className="statistics-definition">As datas do calendário usam o fuso horário local do dispositivo. A semana das métricas começa na segunda-feira. Duração usa o valor salvo ou a diferença entre início e conclusão.</p>
    </section>
  </div>;
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <article className="statistics-metric"><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>;
}

function SectionHeading({ eyebrow, title, id }: { eyebrow: string; title: string; id: string }) {
  return <div className="section-heading statistics-section-heading"><div><p className="eyebrow">{eyebrow}</p><h2 id={id}>{title}</h2></div></div>;
}

function ExerciseEvolution({ records }: { records: CompletedSetRecord[] }) {
  const ordered = [...records].sort((a, b) => Date.parse(a.completedAt) - Date.parse(b.completedAt) || a.setNumber - b.setNumber);
  const distinctSessions = new Set(ordered.map((record) => record.sessionId)).size;
  if (ordered.length === 0) return <p className="statistics-empty-inline">Não há cargas registradas para este exercício. Cargas ausentes não são exibidas como zero.</p>;
  return <div className="statistics-evolution">
    {distinctSessions >= 2 ? <div className="statistics-chart-wrap"><svg className="statistics-chart" viewBox="0 0 640 250" role="img" aria-label={`Evolução de cargas: ${ordered.length} séries registradas em ${distinctSessions} sessões`}>
      <line x1="48" y1="20" x2="48" y2="210" /><line x1="48" y1="210" x2="620" y2="210" />
      {chartCoordinates(ordered).map((point, index) => <g key={`${point.record.sessionId}-${point.record.setNumber}-${index}`}><circle cx={point.x} cy={point.y} r="5"><title>{point.record.load} kg · {point.record.reps ?? '—'} reps · {formatDate(point.record.completedAt)}</title></circle></g>)}
      <polyline points={chartCoordinates(ordered).map((point) => `${point.x},${point.y}`).join(' ')} />
      <text x="7" y="25">kg</text><text x="48" y="235">{formatDate(ordered[0]!.completedAt)}</text><text x="620" y="235" textAnchor="end">{formatDate(ordered.at(-1)!.completedAt)}</text>
    </svg><p>O gráfico mostra cada série com carga informada; repetições e origem detalhada aparecem na lista abaixo.</p></div>
      : <p className="statistics-empty-inline">Há registros, mas uma tendência só é exibida após cargas em pelo menos duas sessões diferentes.</p>}
    <details className="statistics-record-details" open><summary>Registros que sustentam a evolução ({ordered.length})</summary><ul className="statistics-set-history">{[...ordered].reverse().map((record, index) => <li key={`${record.sessionId}-${record.setNumber}-${index}`}><time dateTime={record.completedAt}>{formatDate(record.completedAt)}</time><strong>Série {record.setNumber}</strong><span>{record.load} kg{record.reps === undefined ? '' : ` × ${record.reps} reps`}</span><small>{record.routineName}</small></li>)}</ul></details>
  </div>;
}

function chartCoordinates(records: CompletedSetRecord[]) {
  const loads = records.map((record) => record.load ?? 0);
  const timestamps = records.map((record) => Date.parse(record.completedAt));
  const firstTimestamp = Math.min(...timestamps); const lastTimestamp = Math.max(...timestamps);
  const min = Math.min(...loads); const max = Math.max(...loads);
  return records.map((record, index) => ({ record, x: lastTimestamp === firstTimestamp ? 48 + index / Math.max(records.length - 1, 1) * 572 : 48 + (timestamps[index]! - firstTimestamp) / (lastTimestamp - firstTimestamp) * 572,
    y: max === min ? 115 : 195 - ((record.load! - min) / (max - min)) * 165 }));
}

function formatDate(iso: string): string { return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso)); }
function formatDateKey(key: string): string { const [year, month, day] = key.split('-').map(Number); return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' }).format(new Date(year!, month! - 1, day!)); }
function formatClockDuration(seconds?: number): string { return seconds === undefined ? 'duração não registrada' : formatDuration(seconds); }
