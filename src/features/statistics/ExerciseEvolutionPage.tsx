import { useMemo, useState } from 'react';
import type { WorkoutSession } from '../../domain/models';
import { getExerciseOptions } from '../../domain/statistics';
import { buildExerciseTrend, type InsightPeriod } from '../../domain/trainingInsights';

export function ExerciseEvolutionPage({ sessions, requestedExerciseId, onSelectExercise }: {
  sessions: readonly WorkoutSession[];
  requestedExerciseId?: string | null;
  onSelectExercise?: (id: string) => void;
}) {
  const options = useMemo(() => getExerciseOptions(sessions), [sessions]);
  const [exerciseId, setExerciseId] = useState(requestedExerciseId ?? options[0]?.id ?? '');
  const [period, setPeriod] = useState<InsightPeriod>('all');
  const selected = exerciseId || options[0]?.id || '';
  const name = options.find((item) => item.id === selected)?.name ?? sessions.flatMap((session) => session.exercises).find((exercise) => exercise.sourceExerciseId === selected)?.name;
  const points = useMemo(() => selected ? buildExerciseTrend(sessions, selected, period) : [], [sessions, selected, period]);
  const chooseExercise = (id: string) => { setExerciseId(id); onSelectExercise?.(id); };

  return <div className="insight-page evolution-page">
    <header className="training-heading"><div><p className="eyebrow">ARC 12 · REGISTROS POR MOVIMENTO</p><h1>Evolução de desempenho</h1><p>Compare apenas o mesmo ID de exercício, usando séries concluídas em sessões finalizadas.</p></div></header>
    <section className="workbook-controls evolution-controls" aria-label="Seleção de exercício e período">
      <label>Exercício<select aria-label="Exercício para evolução" value={selected} onChange={(event) => chooseExercise(event.target.value)}><option value="">Selecione um exercício</option>{options.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>Período<select aria-label="Período da evolução" value={period} onChange={(event) => setPeriod(event.target.value as InsightPeriod)}><option value="sessions">Últimas sessões (até 10)</option><option value="30d">Últimos 30 dias</option><option value="90d">Últimos 90 dias</option><option value="all">Todo o histórico</option></select></label>
    </section>
    {!selected || points.length === 0 ? <section className="statistics-empty"><span aria-hidden="true">◇</span><h2>{options.length ? 'Sem registros neste período' : 'Ainda não há histórico de exercícios'}</h2><p>{options.length ? 'Escolha outro período ou conclua uma sessão com séries registradas para este exercício.' : 'Somente sessões concluídas com séries marcadas como realizadas aparecem aqui.'}</p></section> : <>
      <section className="evolution-summary" aria-label="Resumo do exercício selecionado"><div><span>EXERCÍCIO</span><strong>{name}</strong></div><div><span>SESSÕES COM REGISTRO</span><strong>{points.length}</strong></div><div><span>SÉRIES CONCLUÍDAS</span><strong>{points.reduce((sum, point) => sum + point.completedSets, 0)}</strong></div><div><span>ÚLTIMO REGISTRO</span><strong>{formatDate(points.at(-1)!.completedAt)}</strong></div></section>
      <section className="evolution-charts" aria-label="Métricas de evolução">
        <TrendChart title="Maior carga registrada por sessão" unit="kg" points={points.map((point) => ({ date: point.completedAt, value: point.maximumRecordedLoad, session: point.routineName }))} empty="Sem carga comparável registrada para este exercício. Carga ausente não é zero." />
        <TrendChart title="Repetições concluídas por sessão" unit="reps" points={points.map((point) => ({ date: point.completedAt, value: point.reps, session: point.routineName }))} empty="Sem repetições válidas registradas." />
        <TrendChart title="Volume externo registrado por sessão" unit="kg·reps" points={points.map((point) => ({ date: point.completedAt, value: point.externalLoadVolume, session: point.routineName }))} empty="Sem séries com carga externa e repetições compatíveis. Este indicador não mede hipertrofia." />
      </section>
      <p className="statistics-definition">Carga mostra o maior valor registrado em uma série da sessão; repetições somam as séries concluídas; volume externo é a soma carga × repetições quando há carga válida. Exercícios de peso corporal não recebem carga equivalente estimada. Estes indicadores descrevem registros, não uma medida fisiológica.</p>
      <details className="statistics-record-details" open><summary>Sessões comparadas ({points.length})</summary><ul className="statistics-set-history">{[...points].reverse().map((point) => <li key={point.sessionId}><time dateTime={point.completedAt}>{formatDate(point.completedAt)}</time><strong>{point.routineName}</strong><span>{point.maximumRecordedLoad === null ? 'Carga —' : `${point.maximumRecordedLoad} kg`}</span><small>{point.completedSets} séries · {point.reps} reps · volume {point.externalLoadVolume === null ? 'não calculável' : `${point.externalLoadVolume} kg·reps em ${point.externalLoadSetCount} séries com carga registrada`}</small></li>)}</ul></details>
    </>}
  </div>;
}

function TrendChart({ title, unit, points, empty }: { title: string; unit: string; points: { date: string; value: number | null; session: string }[]; empty: string }) {
  const present = points.filter((point): point is typeof point & { value: number } => point.value !== null && Number.isFinite(point.value));
  if (!present.length) return <article className="trend-card"><h2>{title}</h2><p className="statistics-empty-inline">{empty}</p></article>;
  const max = Math.max(...present.map((point) => point.value), 1);
  const coordinates = present.map((point, index) => ({ ...point, x: 34 + (present.length === 1 ? 0 : index / (present.length - 1) * 532), y: 166 - point.value / max * 130 }));
  return <article className="trend-card"><h2>{title}</h2><p>Valores por sessão concluída · unidade: {unit}</p><svg viewBox="0 0 600 205" role="img" aria-label={`${title}, ${present.length} registros válidos`} className="trend-svg"><line x1="30" y1="170" x2="575" y2="170" />{coordinates.length > 1 && <polyline points={coordinates.map((point) => `${point.x},${point.y}`).join(' ')} />}{coordinates.map((point) => <g key={`${point.date}-${point.session}`}><circle cx={point.x} cy={point.y} r="5" /><text x={point.x} y={point.y - 10} textAnchor="middle">{point.value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</text></g>)}</svg><ul className="trend-axis" aria-label="Valores registrados">{present.map((point, index) => <li key={`${point.date}-${index}`}><time dateTime={point.date}>{formatDate(point.date)}</time><strong>{point.value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} {unit}</strong></li>)}</ul></article>;
}

function formatDate(iso: string) { return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(iso)); }
