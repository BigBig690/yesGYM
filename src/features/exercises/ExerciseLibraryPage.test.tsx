import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExerciseLibraryPage } from './ExerciseLibraryPage';
import { createDefaultAppData } from '../../domain/models';
import type { AppData } from '../../domain/models';
import { EXERCISE_CATALOG } from '../../domain/exerciseCatalog';
import { exerciseImageUrl } from './ExerciseIllustration';

describe('biblioteca de exercícios', () => {
  it('mostra detalhes e filtra o catálogo enquanto a pessoa digita', async () => {
    const user = userEvent.setup();
    render(<ExerciseLibraryPage data={createDefaultAppData()} onSave={() => ({ ok: true })} />);
    await user.type(screen.getByLabelText('Buscar exercício'), 'cadeira extensora');
    expect(await screen.findByRole('heading', { name: 'Cadeira extensora' })).toBeInTheDocument();
    expect(screen.getAllByText(/Quadríceps/).length).toBeGreaterThan(0);
    await user.clear(screen.getByLabelText('Buscar exercício'));
    await user.type(screen.getByLabelText('Buscar exercício'), 'não existe esse movimento');
    expect(screen.getByText('Nenhum movimento encontrado')).toBeInTheDocument();
  });

  it('adiciona o movimento escolhido na rotina sem registrar cargas pessoais', async () => {
    const user = userEvent.setup();
    let saved: AppData | undefined;
    const onSave = vi.fn((_next: AppData) => ({ ok: true as const }));
    onSave.mockImplementation((next) => { saved = next; return { ok: true as const }; });
    render(<ExerciseLibraryPage data={createDefaultAppData()} onSave={onSave} />);
    await user.selectOptions(screen.getByLabelText('Adicionar à rotina'), 'routine-lower-a');
    await user.click(screen.getByRole('button', { name: 'Adicionar movimento' }));
    expect(saved?.routines.find((routine) => routine.id === 'routine-lower-a')?.exercises.at(-1)).toMatchObject({ catalogExerciseId: 'bench-press', name: 'Supino reto com barra' });
    expect(JSON.stringify(saved)).not.toContain('targetLoad');
  });

  it('resolve cada uma das 26 duplas start/peak para assets Vite locais reais', () => {
    expect(EXERCISE_CATALOG).toHaveLength(26);
    for (const exercise of EXERCISE_CATALOG) {
      expect(exerciseImageUrl(exercise.id, 'start'), `${exercise.id} start`).toBeTruthy();
      expect(exerciseImageUrl(exercise.id, 'peak'), `${exercise.id} peak`).toBeTruthy();
    }
  });

  it('mostra fallback acessível se uma imagem local falhar ao carregar', () => {
    render(<ExerciseLibraryPage data={createDefaultAppData()} onSave={() => ({ ok: true })} />);
    fireEvent.error(screen.getAllByAltText('Supino reto com barra: posição inicial')[0]!);
    expect(screen.getByRole('img', { name: 'Ilustração indisponível: Supino reto com barra' })).toBeInTheDocument();
  });
});
