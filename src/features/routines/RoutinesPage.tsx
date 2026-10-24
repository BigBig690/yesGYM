import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { AppData, RoutineExercise } from '../../domain/models';
import {
  addExercise,
  addMissingStarterRoutines,
  createRoutine,
  deleteRoutine,
  duplicateRoutine,
  moveExercise,
  removeExercise,
  updateExercise,
  updateRoutine,
  validateExerciseDraft,
  validateRoutineName,
  type ExerciseDraft,
  type ExerciseDraftErrors,
} from '../../domain/routineOperations';
import type { SaveResult } from '../../storage/appStorage';
import { Icon } from '../../components/Icon';
import { catalogEntryForRoutineExercise } from '../../domain/exerciseCatalog';
import { ExerciseIllustration } from '../exercises/ExerciseIllustration';

type RoutinesPageProps = {
  data: AppData;
  selectedRoutineId: string | null;
  requestedRoutineName: string | null;
  canEdit: boolean;
  storageMessage: string | null;
  onSelectRoutine: (id: string | null) => void;
  onStartTraining: (routineId: string) => void;
  onSaveData: (data: AppData) => SaveResult;
};

const emptyExerciseDraft: ExerciseDraft = { name: '', sets: '3', reps: '10', restSeconds: '90', notes: '' };

function getRepSummary(exercise: RoutineExercise): string {
  const reps = exercise.plannedSets.map((set) => set.targetReps);
  if (reps.length === 0) return 'Sem séries planejadas';
  const unique = new Set(reps);
  return unique.size === 1 ? `${reps[0]} repetições` : `${reps.join(' / ')} repetições`;
}

function getDraft(exercise: RoutineExercise): ExerciseDraft {
  const reps = exercise.plannedSets.map((set) => String(set.targetReps));
  const sameReps = reps.every((value) => value === reps[0]);
  return {
    name: exercise.name,
    sets: String(exercise.plannedSets.length || 1),
    reps: sameReps ? reps[0] || '10' : reps.join(', '),
    restSeconds: String(exercise.restSeconds ?? 90),
    notes: exercise.notes ?? '',
  };
}

export function RoutinesPage({ data, selectedRoutineId, requestedRoutineName, canEdit, storageMessage, onSelectRoutine, onStartTraining, onSaveData }: RoutinesPageProps) {
  const selectedRoutine = data.routines.find((routine) => routine.id === selectedRoutineId) ?? null;
  const [isCreating, setIsCreating] = useState(false);
  const [routineName, setRoutineName] = useState('');
  const [routineNotes, setRoutineNotes] = useState('');
  const [routineNameError, setRoutineNameError] = useState<string | null>(null);
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [exerciseDraft, setExerciseDraft] = useState<ExerciseDraft>(emptyExerciseDraft);
  const [exerciseErrors, setExerciseErrors] = useState<ExerciseDraftErrors>({});
  const [deleteConfirmation, setDeleteConfirmation] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (isCreating) {
      setRoutineName(requestedRoutineName ?? '');
      setRoutineNotes('');
      setRoutineNameError(null);
      setEditingExerciseId(null);
      return;
    }
    if (selectedRoutine) {
      setRoutineName(selectedRoutine.name);
      setRoutineNotes(selectedRoutine.notes ?? '');
      setRoutineNameError(null);
      setEditingExerciseId(null);
    }
  }, [isCreating, requestedRoutineName, selectedRoutine?.id, selectedRoutine?.name, selectedRoutine?.notes]);

  const commit = (next: AppData, feedback: string): boolean => {
    const result = onSaveData(next);
    if (!result.ok) {
      setSaveFeedback(null);
      return false;
    }
    setSaveFeedback(feedback);
    return true;
  };

  const handleCreateRoutine = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors = validateRoutineName(routineName);
    if (errors.name) {
      setRoutineNameError(errors.name);
      return;
    }
    const next = createRoutine(data, routineName, routineNotes);
    const created = next.routines[next.routines.length - 1];
    if (created && commit(next, 'Rotina criada e salva neste dispositivo.')) {
      setIsCreating(false);
      onSelectRoutine(created.id);
    }
  };

  const handleUpdateRoutine = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedRoutine) return;
    const errors = validateRoutineName(routineName);
    if (errors.name) {
      setRoutineNameError(errors.name);
      return;
    }
    const next = updateRoutine(data, selectedRoutine.id, routineName, routineNotes);
    commit(next, 'Alterações da rotina salvas neste dispositivo.');
  };

  const startNewRoutine = () => {
    setIsCreating(true);
    onSelectRoutine(null);
    setEditingExerciseId(null);
    setSaveFeedback(null);
  };

  const handleAddStarterRoutines = () => {
    const next = addMissingStarterRoutines(data);
    if (next === data) {
      setSaveFeedback('Os modelos iniciais já estão adicionados.');
      return;
    }
    const result = onSaveData(next);
    if (!result.ok) return;
    setSaveFeedback('Modelos iniciais adicionados. Edite-os para adaptar à sua rotina.');
    setIsCreating(false);
    const firstMissing = next.routines.find((routine) => !data.routines.some((item) => item.id === routine.id));
    onSelectRoutine(firstMissing?.id ?? null);
  };

  const handleDuplicate = () => {
    if (!selectedRoutine) return;
    const result = duplicateRoutine(data, selectedRoutine.id);
    if (result.duplicatedId && commit(result.data, 'Rotina duplicada e salva neste dispositivo.')) {
      setIsCreating(false);
      onSelectRoutine(result.duplicatedId);
    }
  };

  const handleDelete = () => {
    if (!selectedRoutine) return;
    const next = deleteRoutine(data, selectedRoutine.id);
    if (commit(next, 'Rotina excluída. O histórico de sessões foi preservado.')) {
      setDeleteConfirmation(false);
      onSelectRoutine(null);
    }
  };

  const beginExerciseEdit = (exercise?: RoutineExercise) => {
    setEditingExerciseId(exercise?.id ?? 'new');
    setExerciseDraft(exercise ? getDraft(exercise) : emptyExerciseDraft);
    setExerciseErrors({});
    setSaveFeedback(null);
  };

  const handleSaveExercise = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedRoutine || !editingExerciseId) return;
    const validation = validateExerciseDraft(exerciseDraft);
    if ('errors' in validation) {
      setExerciseErrors(validation.errors);
      return;
    }
    const next = editingExerciseId === 'new'
      ? addExercise(data, selectedRoutine.id, validation.value)
      : updateExercise(data, selectedRoutine.id, editingExerciseId, validation.value);
    if (commit(next, editingExerciseId === 'new' ? 'Exercício adicionado e salvo.' : 'Exercício atualizado e salvo.')) {
      setEditingExerciseId(null);
      setExerciseErrors({});
    }
  };

  const handleRemoveExercise = (exerciseId: string) => {
    if (!selectedRoutine) return;
    if (commit(removeExercise(data, selectedRoutine.id, exerciseId), 'Exercício removido e alterações salvas.')) {
      if (editingExerciseId === exerciseId) setEditingExerciseId(null);
    }
  };

  const handleMoveExercise = (exerciseId: string, direction: -1 | 1) => {
    if (!selectedRoutine) return;
    commit(moveExercise(data, selectedRoutine.id, exerciseId, direction), 'Ordem dos exercícios salva.');
  };

  const exercises = selectedRoutine ? [...selectedRoutine.exercises].sort((a, b) => a.order - b.order) : [];
  const canManage = canEdit;

  return (
    <div className="routines-page">
      <header className="routines-heading"><div><p className="eyebrow">CENTRO DE PREPARAÇÃO · ARC 03</p><h1>Rotinas de treinamento</h1><p>Organize seu próximo capítulo. Os modelos são pontos de partida editáveis, não prescrições individuais.</p></div><button className="primary-action" disabled={!canManage} onClick={startNewRoutine}>Criar rotina <span aria-hidden="true">＋</span></button></header>
      {storageMessage && <div className="routine-alert" role="alert">{storageMessage} A alteração não será indicada como salva enquanto o armazenamento apresentar erro.</div>}
      {requestedRoutineName && !data.routines.some((routine) => routine.name.toLocaleLowerCase('pt-BR') === requestedRoutineName.toLocaleLowerCase('pt-BR')) && !isCreating && <div className="requested-routine"><span>A rotina {requestedRoutineName} não existe neste conjunto.</span><button className="text-link" onClick={() => { setIsCreating(true); setRoutineName(requestedRoutineName); }}>Criar “{requestedRoutineName}”</button></div>}

      <div className="routines-layout">
        <aside className="routine-list-panel" aria-label="Lista de rotinas">
          <div className="routine-list-heading"><span>SUAS ROTINAS</span><b>{data.routines.length.toString().padStart(2, '0')}</b></div>
          {data.routines.length ? <div className="routine-select-list">{data.routines.map((routine, index) => <button key={routine.id} className={`routine-select-card ${selectedRoutineId === routine.id && !isCreating ? 'selected' : ''}`} aria-current={selectedRoutineId === routine.id && !isCreating ? 'true' : undefined} onClick={() => { setIsCreating(false); onSelectRoutine(routine.id); setSaveFeedback(null); }}><span className="routine-select-number">{String(index + 1).padStart(2, '0')}</span><span className="routine-select-copy"><strong>{routine.name}</strong><small>{routine.exercises.length} exercícios · {routine.exercises.reduce((total, exercise) => total + exercise.plannedSets.length, 0)} séries</small></span><Icon name="arrow" /></button>)}</div> : <div className="routine-list-empty"><span>◇</span><p>Nenhuma rotina cadastrada.</p></div>}
          {data.routines.length === 0 && canManage && <button className="starter-model-button" onClick={handleAddStarterRoutines}>Adicionar os 4 modelos iniciais</button>}
          {data.routines.length > 0 && canManage && data.routines.length < 4 && <button className="starter-model-link" onClick={handleAddStarterRoutines}>Adicionar modelos iniciais que faltam</button>}
          <p className="routine-template-note">Modelos gerais e editáveis. Sem cargas pessoais ou prescrição individual.</p>
        </aside>

        <section className="routine-editor-panel" aria-label="Editor da rotina">
          {isCreating ? <form className="routine-main-form" onSubmit={handleCreateRoutine} noValidate>
            <div className="editor-topline"><span>NOVA ROTINA</span><span className="editor-status">RASCUNHO</span></div>
            <div className="routine-name-field"><label htmlFor="new-routine-name">Nome da rotina</label><input id="new-routine-name" autoFocus value={routineName} aria-invalid={Boolean(routineNameError)} aria-describedby={routineNameError ? 'new-routine-name-error' : undefined} onChange={(event) => { setRoutineName(event.target.value); setRoutineNameError(null); }} placeholder="Ex.: Mobilidade" />{routineNameError && <span className="field-error" id="new-routine-name-error">{routineNameError}</span>}</div>
            <div className="routine-name-field"><label htmlFor="new-routine-notes">Observações <span>(opcional)</span></label><textarea id="new-routine-notes" value={routineNotes} onChange={(event) => setRoutineNotes(event.target.value)} rows={3} placeholder="Contexto ou lembretes da rotina" /></div>
            <div className="form-actions"><button className="primary-action" type="submit" disabled={!canManage}>Criar e salvar <Icon name="arrow" /></button><button className="secondary-action" type="button" onClick={() => { setIsCreating(false); setRoutineNameError(null); }}>Cancelar</button></div>
          </form> : selectedRoutine ? <>
            <div className="editor-topline"><span>FICHA DE TREINAMENTO</span><span className="editor-status"><i /> MODELO EDITÁVEL</span></div>
            <form className="routine-main-form existing-routine-form" onSubmit={handleUpdateRoutine} noValidate>
              <div className="routine-title-row"><div className="routine-name-field"><label htmlFor="routine-name">Nome da rotina</label><input id="routine-name" value={routineName} aria-invalid={Boolean(routineNameError)} aria-describedby={routineNameError ? 'routine-name-error' : undefined} onChange={(event) => { setRoutineName(event.target.value); setRoutineNameError(null); }} />{routineNameError && <span className="field-error" id="routine-name-error">{routineNameError}</span>}</div><div className="routine-actions"><button className="icon-action" type="submit" disabled={!canManage} aria-label="Salvar nome e observações da rotina" title="Salvar rotina">✓</button><button className="icon-action" type="button" onClick={handleDuplicate} disabled={!canManage} aria-label="Duplicar rotina" title="Duplicar">⧉</button><button className="icon-action danger" type="button" onClick={() => setDeleteConfirmation(true)} disabled={!canManage} aria-label="Excluir rotina" title="Excluir">⌫</button></div></div>
              <div className="routine-name-field"><label htmlFor="routine-notes">Observações <span>(opcional)</span></label><textarea id="routine-notes" value={routineNotes} onChange={(event) => setRoutineNotes(event.target.value)} rows={2} placeholder="Lembretes da rotina" /></div>
            </form>
            <div className="exercise-section-heading"><div><h2>Exercícios <span>{String(selectedRoutine.exercises.length).padStart(2, '0')}</span></h2><p>Séries planejadas, repetições e intervalo entre séries.</p></div><div className="routine-detail-actions"><button className="primary-action start-routine-action" onClick={() => onStartTraining(selectedRoutine.id)} disabled={!canManage}>Iniciar treino <Icon name="arrow" /></button><button className="add-exercise-button" onClick={() => beginExerciseEdit()} disabled={!canManage}>＋ <span>Adicionar exercício</span></button></div></div>
            {exercises.length ? <ol className="exercise-list">{exercises.map((exercise, index) => <li className="exercise-item" key={exercise.id}>
              {editingExerciseId === exercise.id ? <ExerciseForm draft={exerciseDraft} errors={exerciseErrors} disabled={!canManage} onChange={setExerciseDraft} onCancel={() => setEditingExerciseId(null)} onSubmit={handleSaveExercise} /> : <>
                <ExerciseIllustration exercise={catalogEntryForRoutineExercise(exercise)} className="routine-exercise-thumb" /><span className="exercise-index">{String(index + 1).padStart(2, '0')}</span><div className="exercise-summary"><strong>{exercise.name}</strong><div><span>{exercise.plannedSets.length} séries</span><i>·</i><span>{getRepSummary(exercise)}</span><i>·</i><span>{exercise.restSeconds === undefined ? 'Descanso não informado' : `${exercise.restSeconds}s descanso`}</span></div>{exercise.notes && <p>{exercise.notes}</p>}{catalogEntryForRoutineExercise(exercise) && <small>{catalogEntryForRoutineExercise(exercise)?.primaryMuscles.join(' · ')}</small>}</div><div className="exercise-controls"><button className="icon-action small" onClick={() => handleMoveExercise(exercise.id, -1)} disabled={!canManage || index === 0} aria-label={`Mover ${exercise.name} para cima`} title="Mover para cima">↑</button><button className="icon-action small" onClick={() => handleMoveExercise(exercise.id, 1)} disabled={!canManage || index === exercises.length - 1} aria-label={`Mover ${exercise.name} para baixo`} title="Mover para baixo">↓</button><button className="icon-action small" onClick={() => beginExerciseEdit(exercise)} disabled={!canManage} aria-label={`Editar ${exercise.name}`} title="Editar">✎</button><button className="icon-action small danger" onClick={() => handleRemoveExercise(exercise.id)} disabled={!canManage} aria-label={`Remover ${exercise.name}`} title="Remover">×</button></div>
              </>}
            </li>)}</ol> : <div className="exercise-empty"><span>◇</span><div><strong>Esta rotina ainda não tem exercícios.</strong><p>Adicione o primeiro exercício para montar a ficha.</p></div></div>}
            {editingExerciseId === 'new' && <div className="exercise-item new-exercise-item"><ExerciseForm draft={exerciseDraft} errors={exerciseErrors} disabled={!canManage} onChange={setExerciseDraft} onCancel={() => setEditingExerciseId(null)} onSubmit={handleSaveExercise} /></div>}
            <div className="routine-editor-footer"><span>ATUALIZADA {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(selectedRoutine.updatedAt))}</span><span>ALTERAÇÕES SALVAS NESTE DISPOSITIVO</span></div>
          </> : <div className="routine-editor-empty"><div className="editor-empty-symbol"><Icon name="routines" /></div><p className="eyebrow">SELECIONE UMA FICHA</p><h2>{data.routines.length ? 'Escolha uma rotina para visualizar e editar.' : 'Sua primeira ficha começa com um modelo ou uma ideia sua.'}</h2><p>{data.routines.length ? 'Os detalhes e exercícios aparecem neste painel.' : 'Você pode adicionar os quatro modelos iniciais ou criar uma rotina do zero.'}</p>{data.routines.length === 0 && canManage && <div className="empty-actions"><button className="primary-action" onClick={handleAddStarterRoutines}>Adicionar modelos iniciais</button><button className="secondary-action" onClick={startNewRoutine}>Criar do zero</button></div>}</div>}
          {saveFeedback && <div className="save-feedback" role="status"><span>✓</span>{saveFeedback}</div>}
        </section>
      </div>

      {deleteConfirmation && selectedRoutine && <div className="confirm-backdrop"><section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-routine-title" aria-describedby="delete-routine-description" onKeyDown={(event) => { if (event.key === 'Escape') setDeleteConfirmation(false); }}><div className="confirm-mark">!</div><h2 id="delete-routine-title">Excluir {selectedRoutine.name}?</h2><p id="delete-routine-description">A rotina será removida. As sessões históricas e os exercícios já registrados nelas serão preservados.</p><div className="confirm-actions"><button className="secondary-action" autoFocus onClick={() => setDeleteConfirmation(false)}>Manter rotina</button><button className="danger-action" onClick={handleDelete}>Excluir rotina</button></div></section></div>}
    </div>
  );
}

type ExerciseFormProps = {
  draft: ExerciseDraft;
  errors: ExerciseDraftErrors;
  disabled: boolean;
  onChange: (draft: ExerciseDraft) => void;
  onCancel: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

function ExerciseForm({ draft, errors, disabled, onChange, onCancel, onSubmit }: ExerciseFormProps) {
  const update = (key: keyof ExerciseDraft, value: string) => onChange({ ...draft, [key]: value });
  return <form className="exercise-form" onSubmit={onSubmit} noValidate>
    <div className="exercise-form-title"><span>{draft.name ? 'EDITAR EXERCÍCIO' : 'NOVO EXERCÍCIO'}</span><small>Valores de planejamento — sem carga pessoal</small></div>
    <div className="exercise-fields"><div className="routine-name-field exercise-name-field"><label htmlFor="exercise-name">Nome do exercício</label><input id="exercise-name" autoFocus value={draft.name} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'exercise-name-error' : undefined} onChange={(event) => update('name', event.target.value)} placeholder="Ex.: Remada baixa" />{errors.name && <span className="field-error" id="exercise-name-error">{errors.name}</span>}</div>
      <div className="routine-name-field"><label htmlFor="exercise-sets">Séries</label><input id="exercise-sets" type="number" min="1" max="30" step="1" inputMode="numeric" value={draft.sets} aria-invalid={Boolean(errors.sets)} aria-describedby={errors.sets ? 'exercise-sets-error' : undefined} onChange={(event) => update('sets', event.target.value)} />{errors.sets && <span className="field-error" id="exercise-sets-error">{errors.sets}</span>}</div>
      <div className="routine-name-field"><label htmlFor="exercise-reps">Repetições por série</label><input id="exercise-reps" inputMode="numeric" value={draft.reps} aria-invalid={Boolean(errors.reps)} aria-describedby={errors.reps ? 'exercise-reps-error' : 'exercise-reps-hint'} onChange={(event) => update('reps', event.target.value)} />{errors.reps && <span className="field-error" id="exercise-reps-error">{errors.reps}</span>}<span className="field-hint" id="exercise-reps-hint">Um valor para todas ou uma lista separada por vírgulas.</span></div>
      <div className="routine-name-field"><label htmlFor="exercise-rest">Descanso <span>(segundos)</span></label><input id="exercise-rest" type="number" min="0" max="7200" step="1" inputMode="numeric" value={draft.restSeconds} aria-invalid={Boolean(errors.restSeconds)} aria-describedby={errors.restSeconds ? 'exercise-rest-error' : undefined} onChange={(event) => update('restSeconds', event.target.value)} />{errors.restSeconds && <span className="field-error" id="exercise-rest-error">{errors.restSeconds}</span>}</div>
      <div className="routine-name-field exercise-notes-field"><label htmlFor="exercise-notes">Observações <span>(opcional)</span></label><textarea id="exercise-notes" value={draft.notes} rows={2} onChange={(event) => update('notes', event.target.value)} placeholder="Lembretes de execução" /></div></div>
    <div className="exercise-form-actions"><button className="primary-action" type="submit" disabled={disabled}>Salvar exercício</button><button className="secondary-action" type="button" onClick={onCancel}>Cancelar</button></div>
  </form>;
}
