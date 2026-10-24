import { useEffect, useState } from 'react';
import type { AppData, Routine, RoutineExercise } from '../../domain/models';
import { defaultWarmupPlan, EXERCISE_CATALOG, findCatalogExercise } from '../../domain/exerciseCatalog';
import type { SaveResult } from '../../storage/appStorage';
import { ExerciseIllustration } from '../exercises/ExerciseIllustration';

export function RoutineExerciseManager({ data, onSave, focusRoutineId }: { data: AppData; onSave: (data: AppData) => SaveResult; focusRoutineId?: string | null }) {
  const [routineId, setRoutineId] = useState(data.routines[0]?.id ?? '');
  const [draft, setDraft] = useState<Routine | null>(() => data.routines[0] ? structuredClone(data.routines[0]) : null);
  const [candidate, setCandidate] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [pendingRoutineId, setPendingRoutineId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const routine = draft ?? data.routines.find((item) => item.id === routineId) ?? null;
  useEffect(() => { if (!draft && !data.routines.some((item) => item.id === routineId)) setRoutineId(data.routines[0]?.id ?? ''); }, [data.routines, draft, routineId]);
  useEffect(() => {
    if (!focusRoutineId) return;
    const source = data.routines.find((item) => item.id === focusRoutineId);
    if (source) { setRoutineId(source.id); setDraft(structuredClone(source)); setDirty(false); setFeedback(null); }
  }, [focusRoutineId]);
  const begin = (nextId = routineId) => {
    const source = data.routines.find((item) => item.id === nextId);
    setRoutineId(nextId); setDraft(source ? structuredClone(source) : null); setFeedback(null);
  };
  const update = (exerciseId: string, patch: Partial<RoutineExercise>) => { setDirty(true); setDraft((current) => { const base = current ?? data.routines.find((item) => item.id === routineId); return base ? ({ ...base, exercises: base.exercises.map((item) => item.id === exerciseId ? { ...item, ...patch } : item) }) : current; }); };
  const add = () => {
    const id = candidate.add ?? EXERCISE_CATALOG[0]?.id;
    const item = EXERCISE_CATALOG.find((exercise) => exercise.id === id);
    if (!routine || !item) return;
    const exercise: RoutineExercise = { id: crypto.randomUUID(), catalogExerciseId: item.id, name: item.name, plannedSets: [{ targetReps: 10 }, { targetReps: 10 }, { targetReps: 10 }], restSeconds: 90, order: routine.exercises.length };
    setDirty(true); setDraft({ ...routine, exercises: [...routine.exercises, exercise] });
  };
  const replace = (exerciseId: string) => {
    const id = candidate[exerciseId];
    const selected = EXERCISE_CATALOG.find((item) => item.id === id);
    const old = routine?.exercises.find((item) => item.id === exerciseId);
    if (!selected || !old) return;
    update(exerciseId, { id: crypto.randomUUID(), catalogExerciseId: selected.id, name: selected.name });
  };
  const move = (exerciseId: string, delta: number) => {
    if (!routine) return;
    const index = routine.exercises.findIndex((item) => item.id === exerciseId);
    const destination = index + delta;
    if (index < 0 || destination < 0 || destination >= routine.exercises.length) return;
    const exercises = [...routine.exercises];
    [exercises[index], exercises[destination]] = [exercises[destination]!, exercises[index]!];
    setDirty(true); setDraft({ ...routine, exercises: exercises.map((item, order) => ({ ...item, order })) });
  };
  const updateWarmup = (id: string, instructions: string) => {
    if (!routine) return;
    const plan = routine.warmupPlan ?? defaultWarmupPlan(routine);
    setDirty(true); setDraft({ ...routine, warmupPlan: plan.map((stage) => stage.id === id ? { ...stage, instructions } : stage) });
  };
  const save = () => {
    if (!routine) return;
    if (routine.exercises.some((item) => !item.name.trim() || item.plannedSets.length < 1 || item.plannedSets.some((set) => !Number.isInteger(set.targetReps) || set.targetReps < 0) || (item.restSeconds ?? 0) < 0)) {
      setFeedback({ ok: false, text: 'Revise nomes, repetições, séries e descanso antes de salvar.' }); return;
    }
    const updated = { ...routine, updatedAt: new Date().toISOString(), exercises: routine.exercises.map((item, order) => ({ ...item, order })) };
    const result = onSave({ ...data, routines: data.routines.map((item) => item.id === updated.id ? updated : item) });
    if (result.ok) { setDraft(null); setDirty(false); setFeedback({ ok: true, text: 'Alterações da rotina salvas. Os snapshots históricos foram preservados.' }); }
    else setFeedback({ ok: false, text: `Não foi possível salvar: ${result.message}` });
  };
  if (!routine) return <section className="settings-panel"><h2>Exercícios das rotinas</h2><p>Crie ou adicione uma rotina antes de organizar exercícios.</p></section>;
  return <section className="settings-panel routine-exercise-manager" aria-labelledby="routine-manager-title"><div className="settings-section-title"><span className="settings-index">05</span><div><h2 id="routine-manager-title">Exercícios e aquecimento das rotinas</h2><p>Edite um rascunho, confira a ficha e salve quando estiver pronta.</p></div></div>
    <label className="routine-manager-select">Rotina<select value={routineId} onChange={(event) => { if (dirty) setPendingRoutineId(event.target.value); else begin(event.target.value); }}>{data.routines.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <ol className="routine-manager-list">{routine.exercises.map((exercise, index) => <li key={exercise.id}><div className="routine-manager-exercise"><ExerciseIllustration exercise={EXERCISE_CATALOG.find((item) => item.id === exercise.catalogExerciseId)} /><div className="routine-manager-fields"><label>Nome<input value={exercise.name} onChange={(event) => update(exercise.id, { name: event.target.value })} /></label><label>Séries<input type="number" min="1" value={exercise.plannedSets.length} onChange={(event) => { const count = Math.max(1, Math.min(30, Number(event.target.value) || 1)); const plannedSets = [...exercise.plannedSets.slice(0, count), ...Array.from({ length: Math.max(0, count - exercise.plannedSets.length) }, () => ({ targetReps: 10 }))]; update(exercise.id, { plannedSets }); }} /></label><label>Repetições<input type="number" min="0" value={exercise.plannedSets[0]?.targetReps ?? 0} onChange={(event) => { const reps = Number(event.target.value); update(exercise.id, { plannedSets: exercise.plannedSets.map((set) => ({ ...set, targetReps: reps })) }); }} /></label><label>Descanso (s)<input type="number" min="0" value={exercise.restSeconds ?? 0} onChange={(event) => update(exercise.id, { restSeconds: Number(event.target.value) })} /></label></div>
      <div className="routine-replace-row"><label>Substituir por<select value={candidate[exercise.id] ?? ''} onChange={(event) => setCandidate({ ...candidate, [exercise.id]: event.target.value })}><option value="">Escolher movimento</option>{EXERCISE_CATALOG.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.equipment.length ? item.equipment.join(', ') : 'peso corporal'}</option>)}</select></label><button type="button" className="secondary-action" disabled={!candidate[exercise.id]} onClick={() => replace(exercise.id)}>Aplicar substituição</button>{findCatalogExercise(candidate[exercise.id]) && <div className="routine-substitute-preview"><ExerciseIllustration exercise={findCatalogExercise(candidate[exercise.id])} /><span><strong>{findCatalogExercise(candidate[exercise.id])?.name}</strong><small>Músculos: {findCatalogExercise(candidate[exercise.id])?.primaryMuscles.join(', ')}</small><small>Equipamento: {findCatalogExercise(candidate[exercise.id])?.equipment.join(', ') || 'Peso corporal'}</small></span></div>}</div>
      <div className="routine-order-actions"><button type="button" className="secondary-action" disabled={index === 0} onClick={() => move(exercise.id, -1)}>Mover para cima</button><button type="button" className="secondary-action" disabled={index === routine.exercises.length - 1} onClick={() => move(exercise.id, 1)}>Mover para baixo</button><button type="button" className="text-link" onClick={() => setRemoveId(exercise.id)}>Remover</button></div></div></li>)}</ol>
    <div className="routine-manager-add"><label>Adicionar movimento<select value={candidate.add ?? ''} onChange={(event) => setCandidate({ ...candidate, add: event.target.value })}><option value="">Selecione do catálogo</option>{EXERCISE_CATALOG.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.equipment.length ? item.equipment.join(', ') : 'peso corporal'}</option>)}</select></label><button type="button" className="secondary-action" disabled={!candidate.add} onClick={add}>Adicionar à ficha</button></div>
    <details className="routine-warmup-editor"><summary>Aquecimento desta rotina</summary><p>Edite as orientações. Elas são sugestões gerais, não uma prescrição individual.</p>{(routine.warmupPlan ?? defaultWarmupPlan(routine)).map((stage) => <label key={stage.id}>{stage.title}<textarea rows={3} value={stage.instructions} onChange={(event) => updateWarmup(stage.id, event.target.value)} /></label>)}</details>
    <div className="routine-manager-preview"><strong>Prévia · {routine.name}</strong><p>{routine.exercises.length} exercícios · {routine.exercises.map((item) => item.name).join(' → ') || 'Ficha vazia'}</p></div>
    {feedback && <p role={feedback.ok ? 'status' : 'alert'} className={`routine-manager-feedback ${feedback.ok ? '' : 'error'}`}>{feedback.text}</p>}
    <div className="routine-manager-actions"><button type="button" className="primary-action" onClick={save}>Salvar alterações da ficha</button><button type="button" className="secondary-action" onClick={() => { setDraft(null); setDirty(false); setFeedback({ ok: true, text: 'Edição cancelada. A ficha salva foi mantida.' }); }}>Cancelar edição</button></div>
    {removeId && <div className="confirm-backdrop"><section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="remove-routine-ex-title"><h2 id="remove-routine-ex-title">Remover exercício?</h2><p>O rascunho da rotina será atualizado. Sessões anteriores continuarão preservadas.</p><div className="confirm-actions"><button className="secondary-action" onClick={() => setRemoveId(null)}>Cancelar</button><button className="danger-action" onClick={() => { const remaining = routine.exercises.filter((item) => item.id !== removeId).map((item, order) => ({ ...item, order })); setDirty(true); setDraft({ ...routine, exercises: remaining }); setRemoveId(null); }}>Remover do rascunho</button></div></section></div>}
    {pendingRoutineId && <div className="confirm-backdrop"><section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="switch-routine-title"><h2 id="switch-routine-title">Descartar alterações?</h2><p>As mudanças não salvas em {routine.name} serão descartadas antes de abrir outra rotina.</p><div className="confirm-actions"><button className="secondary-action" onClick={() => setPendingRoutineId(null)}>Continuar editando</button><button className="danger-action" onClick={() => { const next = pendingRoutineId; setPendingRoutineId(null); setDirty(false); begin(next); }}>Descartar e trocar</button></div></section></div>}
  </section>;
}
