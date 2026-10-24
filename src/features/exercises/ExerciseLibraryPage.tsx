import { useMemo, useState } from 'react';
import type { AppData, Routine } from '../../domain/models';
import { EXERCISE_CATALOG, searchExerciseCatalog } from '../../domain/exerciseCatalog';
import { ExerciseIllustration, exerciseImageUrl } from './ExerciseIllustration';
import type { SaveResult } from '../../storage/appStorage';

export function ExerciseLibraryPage({ data, onSave }: { data: AppData; onSave: (data: AppData) => SaveResult }) {
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState('');
  const [equipment, setEquipment] = useState('');
  const [type, setType] = useState('');
  const [bodyweight, setBodyweight] = useState(false);
  const [movement, setMovement] = useState('');
  const [illustrated, setIllustrated] = useState(false);
  const [selectedId, setSelectedId] = useState<string>(EXERCISE_CATALOG[0]?.id ?? '');
  const [routineId, setRoutineId] = useState(data.routines[0]?.id ?? '');
  const [feedback, setFeedback] = useState('');
  const results = useMemo(() => searchExerciseCatalog(query, { muscle: muscle || undefined, equipment: equipment || undefined, type: type || undefined, movement: movement || undefined, bodyweight })
    .filter((exercise) => !illustrated || Boolean(exerciseImageUrl(exercise.imageId))), [query, muscle, equipment, type, movement, bodyweight, illustrated]);
  const selected = results.find((exercise) => exercise.id === selectedId) ?? results[0];
  const addToRoutine = () => {
    const routine = data.routines.find((item) => item.id === routineId);
    if (!routine || !selected) return;
    const now = new Date().toISOString();
    const nextRoutine: Routine = { ...routine, updatedAt: now, exercises: [...routine.exercises, { id: crypto.randomUUID(), catalogExerciseId: selected.id, name: selected.name, order: routine.exercises.length, plannedSets: [{ targetReps: 10 }, { targetReps: 10 }, { targetReps: 10 }], restSeconds: 90 }] };
    const result = onSave({ ...data, routines: data.routines.map((item) => item.id === routine.id ? nextRoutine : item) });
    setFeedback(result.ok ? `${selected.name} adicionado a ${routine.name}.` : `Não foi possível salvar: ${result.message}`);
  };
  return <div className="exercise-library-page">
    <header className="exercise-library-heading"><div><p className="eyebrow">BIBLIOTECA · MOVIMENTOS</p><h1>Catálogo de exercícios</h1><p>Metadados e ilustrações locais para movimentos identificados. Exercícios personalizados das suas fichas continuam válidos.</p></div><span>{EXERCISE_CATALOG.length} movimentos</span></header>
    <section className="exercise-library-filters" aria-label="Pesquisar e filtrar exercícios">
      <label>Buscar exercício<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nome, músculo ou variante" /></label>
      <label>Grupo muscular<select value={muscle} onChange={(event) => setMuscle(event.target.value)}><option value="">Todos</option>{[...new Set(EXERCISE_CATALOG.flatMap((item) => [...item.primaryMuscles, ...item.secondaryMuscles]))].filter(Boolean).sort().map((item) => <option key={item}>{item}</option>)}</select></label>
      <label>Equipamento<select value={equipment} onChange={(event) => setEquipment(event.target.value)}><option value="">Todos</option>{[...new Set(EXERCISE_CATALOG.flatMap((item) => item.equipment))].filter(Boolean).sort().map((item) => <option key={item}>{item}</option>)}</select></label>
      <label>Categoria<select value={type} onChange={(event) => setType(event.target.value)}><option value="">Todas</option><option value="composto">Compostos</option><option value="isolado">Isolados</option></select></label>
      <label className="exercise-filter-toggle"><input type="checkbox" checked={bodyweight} onChange={(event) => setBodyweight(event.target.checked)} /> Peso corporal</label>
      <label>Padrão de movimento<select value={movement} onChange={(event) => setMovement(event.target.value)}><option value="">Todos</option>{[...new Set(EXERCISE_CATALOG.map((item) => item.movement))].sort().map((item) => <option key={item}>{item}</option>)}</select></label>
      <label className="exercise-filter-toggle"><input type="checkbox" checked={illustrated} onChange={(event) => setIllustrated(event.target.checked)} /> Somente com ilustração</label>
      <button className="text-link" onClick={() => { setQuery(''); setMuscle(''); setEquipment(''); setType(''); setMovement(''); setBodyweight(false); setIllustrated(false); }}>Limpar pesquisa e filtros</button>
    </section>
    <div className="exercise-library-layout"><section className="exercise-results" aria-label="Resultados do catálogo">{results.length ? results.map((exercise) => <button key={exercise.id} className={`exercise-result ${selected?.id === exercise.id ? 'selected' : ''}`} onClick={() => setSelectedId(exercise.id)} aria-pressed={selected?.id === exercise.id}><ExerciseIllustration exercise={exercise} /><span><strong>{exercise.name}</strong><small>{exercise.primaryMuscles.join(' · ')}</small></span></button>) : <div className="exercise-empty"><strong>Nenhum movimento encontrado</strong><p>Experimente remover filtros ou alterar os termos da busca.</p></div>}</section>
      {selected && <article className="exercise-detail"><ExerciseIllustration exercise={selected} paired /><p className="eyebrow">{selected.type.toLocaleUpperCase('pt-BR')} · {selected.movement}</p><h2>{selected.name}</h2>{selected.alternateNames.length > 0 && <p className="exercise-alternates">Também conhecido como: {selected.alternateNames.join(', ')}</p>}<div className="exercise-meta"><span><strong>Principais</strong>{selected.primaryMuscles.join(', ')}</span><span><strong>Secundários</strong>{selected.secondaryMuscles.length ? selected.secondaryMuscles.join(', ') : 'Não informado pela fonte'}</span><span><strong>Equipamento</strong>{selected.equipment.length ? selected.equipment.join(', ') : 'Peso corporal'}</span></div><h3>Execução</h3><ol>{selected.instructions.map((step) => <li key={step}>{step}</li>)}</ol>{selected.tips.length > 0 && <><h3>Orientações técnicas</h3><ul>{selected.tips.map((tip) => <li key={tip}>{tip}</li>)}</ul></>}<button className="text-link exercise-alternatives" onClick={() => { setQuery(selected.primaryMuscles[0] ?? ''); setMuscle(selected.primaryMuscles[0] ?? ''); setEquipment(''); setType(''); setMovement(''); setBodyweight(false); setIllustrated(false); }}>Encontrar alternativas para {selected.primaryMuscles[0] ?? 'este movimento'}</button><small className="exercise-source">Metadados e ilustrações: RepDB Free Exercise Dataset. <a href={selected.sourceUrl} target="_blank" rel="noreferrer">Fonte</a>. Consulte SOURCES.md para termos e atribuição.</small><div className="exercise-add-row"><label htmlFor="exercise-add-routine">Adicionar à rotina</label><select id="exercise-add-routine" value={routineId} onChange={(event) => setRoutineId(event.target.value)}>{data.routines.map((routine) => <option key={routine.id} value={routine.id}>{routine.name}</option>)}</select><button className="primary-action" disabled={!data.routines.length} onClick={addToRoutine}>Adicionar movimento</button></div></article>}
    </div>{feedback && <p role="status" className="exercise-feedback">{feedback}</p>}
  </div>;
}
