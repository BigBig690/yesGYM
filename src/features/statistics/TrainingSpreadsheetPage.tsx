import { useMemo, useState } from 'react';
import type { AppData } from '../../domain/models';
import { catalogEntryForRoutineExercise } from '../../domain/exerciseCatalog';
import { getLatestExercisePoint } from '../../domain/trainingInsights';
import { ExerciseIllustration } from '../exercises/ExerciseIllustration';

export function TrainingSpreadsheetPage({ data, onEditRoutine, onOpenEvolution }: {
  data: AppData;
  onEditRoutine: (routineId: string) => void;
  onOpenEvolution: (exerciseId?: string) => void;
}) {
  const [routineId, setRoutineId] = useState(data.routines[0]?.id ?? '');
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState('');
  const routine = data.routines.find((item) => item.id === routineId);
  const muscleOptions = useMemo(() => [...new Set(routine?.exercises.flatMap((item) => {
    const catalog = catalogEntryForRoutineExercise(item);
    return [...(catalog?.primaryMuscles ?? []), ...(catalog?.secondaryMuscles ?? [])];
  }) ?? [])].sort((a, b) => a.localeCompare(b, 'pt-BR')), [routine]);
  const exercises = (routine?.exercises ?? []).filter((exercise) => {
    const catalog = catalogEntryForRoutineExercise(exercise);
    const terms = [exercise.name, ...(catalog?.primaryMuscles ?? []), ...(catalog?.secondaryMuscles ?? [])].join(' ').toLocaleLowerCase('pt-BR');
    return terms.includes(query.trim().toLocaleLowerCase('pt-BR')) && (!muscle || [...(catalog?.primaryMuscles ?? []), ...(catalog?.secondaryMuscles ?? [])].includes(muscle));
  }).sort((a, b) => a.order - b.order);

  return <div className="insight-page workbook-page">
    <header className="training-heading"><div><p className="eyebrow">ARC 12 · FICHA ORGANIZADA</p><h1>Planilha de treino</h1><p>Planejamento e desempenho recente lado a lado, com cargas planejadas e realizadas identificadas separadamente.</p></div></header>
    <section className="workbook-controls" aria-label="Filtros da planilha">
      <label>Rotina<select aria-label="Rotina da planilha" value={routineId} onChange={(event) => setRoutineId(event.target.value)}>{data.routines.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>Buscar exercício<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nome ou grupo muscular" /></label>
      <label>Grupo muscular<select value={muscle} onChange={(event) => setMuscle(event.target.value)}><option value="">Todos</option>{muscleOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
      {routine && <button className="secondary-action" onClick={() => onEditRoutine(routine.id)}>Editar ficha nas Configurações</button>}
    </section>
    {!routine ? <section className="statistics-empty"><h2>Nenhuma rotina disponível</h2><p>Crie uma ficha para visualizar sua planilha de treino.</p></section> : exercises.length === 0 ? <section className="statistics-empty"><h2>Nenhum exercício neste filtro</h2><p>Limpe a busca ou escolha outro grupo muscular.</p><button className="secondary-action" onClick={() => { setQuery(''); setMuscle(''); }}>Limpar filtros</button></section> : <section className="workbook-list" aria-label={`Exercícios de ${routine.name}`}>
      {exercises.map((exercise, index) => {
        const catalog = catalogEntryForRoutineExercise(exercise);
        const last = getLatestExercisePoint(data.sessions, exercise.id);
        const plannedReps = exercise.plannedSets.length ? [...new Set(exercise.plannedSets.map((set) => set.targetReps))].join(', ') : '—';
        const targetLoad = exercise.plannedSets.map((set) => set.targetLoad).filter((value): value is number => value !== undefined);
        return <article className="workbook-row" key={exercise.id}>
          <div className="workbook-exercise"><ExerciseIllustration exercise={catalog} /><div><span className="workbook-index">MOVIMENTO {String(index + 1).padStart(2, '0')}</span><h2>{exercise.name}</h2><p>{catalog ? `Principal: ${catalog.primaryMuscles.join(', ')}${catalog.secondaryMuscles.length ? ` · Secundário: ${catalog.secondaryMuscles.join(', ')}` : ''}` : 'Grupos musculares não identificados no catálogo.'}</p></div></div>
          <dl className="workbook-values"><div><dt>Séries</dt><dd>{exercise.plannedSets.length || '—'}</dd></div><div><dt>Reps alvo</dt><dd>{plannedReps}</dd></div><div><dt>Descanso</dt><dd>{exercise.restSeconds === undefined ? '—' : `${exercise.restSeconds}s`}</dd></div><div><dt>Carga planejada</dt><dd>{targetLoad.length ? `${targetLoad.map((value) => value.toLocaleString('pt-BR')).join(', ')} kg` : 'Não definida'}</dd></div></dl>
          <div className="workbook-last"><span>ÚLTIMO REGISTRO</span>{last ? <><strong>{last.maximumRecordedLoad === null ? `${last.reps} reps` : `${last.maximumRecordedLoad.toLocaleString('pt-BR')} kg · ${last.reps} reps`}</strong><time dateTime={last.completedAt}>{formatDate(last.completedAt)}</time><small>{last.completedSets} séries concluídas · {last.routineName}</small></> : <p>Sem histórico concluído suficiente para este ID.</p>}</div>
          <div className="workbook-actions"><details><summary>Detalhes</summary><p>{exercise.notes || catalog?.instructions.join(' ') || 'Não há instruções técnicas cadastradas.'}</p><p>Equipamento: {catalog?.equipment.join(', ') || 'não identificado'}</p></details><button className="text-link" onClick={() => onOpenEvolution(exercise.id)}>Ver histórico →</button></div>
        </article>;
      })}
      <p className="statistics-definition">Valores alvo vêm da ficha. Carga realizada vem apenas de séries concluídas no histórico e não é carregada como meta. O mesmo exercício é identificado pelo ID estável registrado em cada sessão.</p>
    </section>}
  </div>;
}

function formatDate(iso: string) { return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(iso)); }
