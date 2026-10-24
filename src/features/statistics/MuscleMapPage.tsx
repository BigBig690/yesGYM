import { useMemo, useState } from 'react';
import type { WorkoutSession } from '../../domain/models';
import { EXERCISE_CATALOG } from '../../domain/exerciseCatalog';
import { summarizeMuscleWork, type InsightPeriod } from '../../domain/trainingInsights';
import { MuscleFigure, MUSCLE_MAP_REGIONS, UNMAPPED_CATALOG_MUSCLES, type MuscleView } from './MuscleFigure';

const GROUPS: { id: string; label: string; muscles: string[] }[] = [
  { id: 'chest', label: 'Peito', muscles: ['Peitoral maior'] },
  { id: 'shoulders', label: 'Ombros', muscles: ['Deltoide anterior', 'Deltoide lateral', 'Deltoide posterior'] },
  { id: 'arms', label: 'Braços', muscles: ['Bíceps braquial', 'Braquial', 'Tríceps', 'Flexores do antebraço'] },
  { id: 'back', label: 'Costas', muscles: ['Latíssimo do dorso', 'Romboides', 'Trapézio', 'Eretores da coluna'] },
  { id: 'glutes', label: 'Glúteos', muscles: ['Glúteo máximo', 'Glúteo médio'] },
  { id: 'quads', label: 'Quadríceps', muscles: ['Quadríceps'] },
  { id: 'hamstrings', label: 'Posteriores da coxa', muscles: ['Posteriores da coxa'] },
  { id: 'calves', label: 'Panturrilhas', muscles: ['Gastrocnêmio', 'Sóleo'] },
];
const ALL_MUSCLES = [...new Set(EXERCISE_CATALOG.flatMap((exercise) => [...exercise.primaryMuscles, ...exercise.secondaryMuscles]))].sort((a, b) => a.localeCompare(b, 'pt-BR'));

export function MuscleMapPage({ sessions }: { sessions: readonly WorkoutSession[] }) {
  const [period, setPeriod] = useState<InsightPeriod>('30d');
  const [view, setView] = useState<MuscleView>('front');
  const [selectedMuscle, setSelectedMuscle] = useState(ALL_MUSCLES[0] ?? '');
  const summary = useMemo(() => summarizeMuscleWork(sessions, period), [sessions, period]);
  const recordedMuscles = useMemo(() => new Set(summary.muscles.filter((item) => item.primarySets + item.secondarySets > 0).map((item) => item.muscle)), [summary]);
  const selectedRegion = Object.values(MUSCLE_MAP_REGIONS).flat().find((region) => region.id === selectedMuscle);
  const knownMuscles = useMemo(() => new Set(ALL_MUSCLES), []);
  const metricMuscle = selectedRegion?.muscles.find((muscle) => knownMuscles.has(muscle)) ?? selectedMuscle;
  const selected = knownMuscles.has(metricMuscle) ? summary.muscles.find((item) => item.muscle === metricMuscle) : undefined;
  const selectedTitle = selectedRegion?.label ?? selectedMuscle;
  const selectedGroup = GROUPS.find((group) => selectedRegion ? selectedRegion.muscles.some((muscle) => group.muscles.includes(muscle)) : group.muscles.includes(selectedMuscle));

  return <div className="insight-page muscle-map-page">
    <header className="training-heading"><div><p className="eyebrow">DIÁRIO DE MOVIMENTO · DADOS OBSERVÁVEIS</p><h1>Mapa muscular</h1><p>Um mapa corporal educativo para explorar os músculos associados aos exercícios da sua biblioteca e aos registros concluídos.</p></div></header>
    <section className="workbook-controls muscle-controls"><label>Período<select aria-label="Período do mapa muscular" value={period} onChange={(event) => setPeriod(event.target.value as InsightPeriod)}><option value="7d">Últimos 7 dias</option><option value="30d">Últimos 30 dias</option><option value="90d">Últimos 90 dias</option><option value="all">Todo o histórico</option></select></label><div className="muscle-total"><strong>{summary.totalUniqueSets}</strong><span>séries únicas concluídas</span><strong>{summary.sessions}</strong><span>sessões com metadados musculares</span></div></section>
    <div className="muscle-map-layout">
      <section className="muscle-figures" aria-label="Mapa corporal interativo">
        <div className="muscle-view-switch" role="group" aria-label="Ângulo do mapa corporal">
          <button type="button" aria-pressed={view === 'front'} onClick={() => setView('front')}>Frente</button>
          <button type="button" aria-pressed={view === 'back'} onClick={() => setView('back')}>Costas</button>
        </div>
        <div className="muscle-figure-stage"><MuscleFigure title={view === 'front' ? 'Vista frontal' : 'Vista posterior'} view={view} selectedMuscle={selectedMuscle} recordedMuscles={recordedMuscles} onSelect={setSelectedMuscle} /></div>
        <div className="muscle-legend" aria-label="Legenda do mapa">
          <span><i className="no-record" />Sem séries concluídas no período</span>
          <span><i className="has-record" />Com séries concluídas registradas</span>
          <span><i className="selected-record" />Região selecionada</span>
          <span><i className="keyboard-focus" />Foco de teclado</span>
          <span><i className="untracked-region" />Região sem associação no catálogo</span>
        </div>
        <p className="statistics-definition">Os contornos anatômicos vieram da biblioteca Body Muscles. As regiões marcadas refletem apenas séries concluídas vinculadas aos metadados dos exercícios; o mapa não estima ativação, intensidade ou resultado fisiológico.</p>
        <p className="anatomy-attribution">Contornos: body-muscles 1.0.0 · Ivan Vulović · Apache 2.0 · <a href="/licenses/body-muscles/LICENSE">licença e avisos</a>.</p>
      </section>
      <section className="muscle-detail" aria-live="polite" aria-labelledby="muscle-detail-title">
        <p className="eyebrow">{selectedGroup?.label ?? (selectedRegion?.muscles.length === 0 ? 'REGIÃO ANATÔMICA · SEM DADOS DO CATÁLOGO' : 'GRUPO MUSCULAR')}</p><h2 id="muscle-detail-title">{selectedTitle || 'Selecione um grupo'}</h2>
        {!knownMuscles.has(metricMuscle) ? <p>Esta região está desenhada para referência anatômica, mas não tem associação aos metadados dos exercícios atuais. Nenhuma série foi atribuída a ela.</p> : <>
          <dl className="muscle-stats"><div><dt>Séries associadas</dt><dd>{selected ? selected.primarySets + selected.secondarySets : 0}</dd></div><div><dt>Participação principal</dt><dd>{selected?.primarySets ?? 0}</dd></div><div><dt>Participação secundária</dt><dd>{selected?.secondarySets ?? 0}</dd></div><div><dt>Sessões</dt><dd>{selected?.sessionIds.length ?? 0}</dd></div><div><dt>Volume externo registrado</dt><dd>{selected?.externalLoadVolume === null || selected?.externalLoadVolume === undefined ? 'Não calculável' : `${selected.externalLoadVolume.toLocaleString('pt-BR')} kg·reps · ${selected.externalLoadSetCount} séries com carga`}</dd></div><div><dt>Último treino</dt><dd>{selected?.latestAt ? formatDate(selected.latestAt) : 'Sem registros'}</dd></div></dl>
          {selectedRegion && selectedRegion.muscles.length > 1 && <p className="muscle-alias-note">A figura reúne regiões anatômicas próximas. As contagens abaixo mostram apenas o rótulo de catálogo “{metricMuscle}”, sem somar aliases.</p>}
          <h3>Exercícios associados</h3>{selected ? <ul>{selected.exerciseNames.map((name) => <li key={name}>{name}</li>)}</ul> : <p>Nenhuma série concluída associada a este músculo no período. Séries planejadas e sessões descartadas não são contabilizadas.</p>}
        </>}
        <p className="muscle-limit-note">As contagens podem sobrepor músculos: uma série pode contribuir para mais de um grupo conforme os metadados principal e secundário. A contagem geral acima conta cada série uma única vez.</p>
      </section>
    </div>
    {summary.missingMetadataSets > 0 && <p className="statistics-definition" role="status">{summary.missingMetadataSets} séries concluídas pertencem a exercícios sem metadados musculares identificados e não aparecem por região.</p>}
    <section className="muscle-accessible-list" aria-labelledby="muscle-list-title"><h2 id="muscle-list-title">Consultar grupos musculares</h2><p>Lista textual acessível como alternativa ao mapa corporal.</p><div>{ALL_MUSCLES.map((muscle) => <button key={muscle} className={selectedMuscle === muscle ? 'selected' : ''} aria-pressed={selectedMuscle === muscle} onClick={() => setSelectedMuscle(muscle)}>{muscle}<span>{summary.muscles.find((item) => item.muscle === muscle)?.primarySets ?? 0} principais · {summary.muscles.find((item) => item.muscle === muscle)?.secondarySets ?? 0} secundárias</span>{UNMAPPED_CATALOG_MUSCLES.includes(muscle as typeof UNMAPPED_CATALOG_MUSCLES[number]) && <small>Sem região desenhada separadamente</small>}</button>)}</div></section>
  </div>;
}

function formatDate(iso: string) { return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(iso)); }
