import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createDefaultAppData } from '../../domain/models';
import { completeWorkoutSession, createWorkoutSession } from '../../domain/sessionOperations';
import { RoutineExerciseManager } from './RoutineExerciseManager';

describe('gerenciador de movimentos e aquecimento', () => {
  it('previsualiza substituto, mantém configurações de trabalho e preserva snapshot histórico', async () => {
    const user = userEvent.setup();
    const initial = createDefaultAppData('2026-01-01T00:00:00.000Z');
    let sequence = 0;
    const started = createWorkoutSession(initial, 'routine-upper-a', '2026-01-02T10:00:00.000Z', () => `new-${++sequence}`);
    if (!started.ok) throw new Error(started.error);
    const done = completeWorkoutSession(started.data, started.session.id, '2026-01-02T11:00:00.000Z');
    if (!done.ok) throw new Error(done.error);
    let saved = done.data;
    const onSave = vi.fn((next: typeof saved) => { saved = next; return { ok: true as const }; });
    render(<RoutineExerciseManager data={saved} onSave={onSave} />);
    const firstExercise = screen.getAllByRole('listitem')[0]!;
    await user.selectOptions(within(firstExercise).getByLabelText('Substituir por'), 'db-bench-press');
    expect(screen.getAllByText(/Peitoral maior/).length).toBeGreaterThan(0);
    await user.click(within(firstExercise).getByRole('button', { name: 'Aplicar substituição' }));
    expect(screen.getAllByRole('textbox')[0]).toHaveValue('Supino reto com halteres');
    expect(onSave).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Salvar alterações da ficha' }));
    expect(onSave).toHaveBeenCalledOnce();
    expect(saved.routines[0]?.exercises[0]).toMatchObject({ name: 'Supino reto com halteres', plannedSets: [{ targetReps: 8 }, { targetReps: 8 }, { targetReps: 8 }], restSeconds: 120 });
    expect(saved.sessions[0]?.exercises[0]).toMatchObject({ name: 'Supino reto com barra', sourceExerciseId: 'exercise-upper-a-1', catalogExerciseId: 'bench-press' });
  });

  it('cancelar edição mantém a rotina persistida sem salvar o rascunho', async () => {
    const user = userEvent.setup();
    const data = createDefaultAppData();
    const onSave = vi.fn(() => ({ ok: true as const }));
    render(<RoutineExerciseManager data={data} onSave={onSave} />);
    const firstExercise = screen.getAllByRole('listitem')[0]!;
    await user.selectOptions(within(firstExercise).getByLabelText('Substituir por'), 'db-bench-press');
    await user.click(within(firstExercise).getByRole('button', { name: 'Aplicar substituição' }));
    await user.click(screen.getByRole('button', { name: 'Cancelar edição' }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getAllByRole('textbox')[0]).toHaveValue('Supino reto com barra');
  });

  it('não anuncia sucesso quando o salvamento falha', async () => {
    const user = userEvent.setup();
    const data = createDefaultAppData();
    render(<RoutineExerciseManager data={data} onSave={() => ({ ok: false, code: 'write-failed', message: 'quota cheia' })} />);
    await user.click(screen.getByRole('button', { name: 'Salvar alterações da ficha' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível salvar: quota cheia');
    expect(screen.queryByText(/alterações da rotina salvas/i)).not.toBeInTheDocument();
  });
});
