import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createDefaultAppData } from '../../domain/models';
import { ExerciseEvolutionPage } from './ExerciseEvolutionPage';
import { MuscleMapPage } from './MuscleMapPage';
import { MUSCLE_MAP_REGIONS, UNMAPPED_CATALOG_MUSCLES } from './MuscleFigure';
import { getAnatomyForView, getRegionAnatomy } from './anatomyMuscleMap';
import { TrainingSpreadsheetPage } from './TrainingSpreadsheetPage';

describe('planilha, evolução e mapa muscular', () => {
  it('separa a carga planejada da realizada e permite filtrar a planilha', async () => {
    const data = createDefaultAppData();
    const routine = data.routines[0]!;
    const bench = routine.exercises.find((item) => item.catalogExerciseId === 'bench-press')!;
    bench.plannedSets = [{ targetReps: 8, targetLoad: 30 }];
    data.sessions.push({ id: 'done', routineId: routine.id, routineName: routine.name, startedAt: '2026-10-20T10:00:00.000Z', completedAt: '2026-10-20T11:00:00.000Z', status: 'completed', exercises: [{ id: 'snap', sourceExerciseId: bench.id, catalogExerciseId: 'bench-press', name: bench.name, order: 0, plannedSets: [{ targetReps: 8 }], performedSets: [{ completed: true, reps: 8, load: 25 }] }] });
    render(<TrainingSpreadsheetPage data={data} onEditRoutine={() => undefined} onOpenEvolution={() => undefined} />);
    expect(screen.getByText('30 kg')).toBeInTheDocument();
    expect(screen.getByText('25 kg · 8 reps')).toBeInTheDocument();
    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText('Grupo muscular'), 'Peitoral maior');
    expect(screen.getByRole('heading', { name: bench.name })).toBeInTheDocument();
  });

  it('mostra um estado vazio claro em evolução e aceita o fallback textual do mapa', async () => {
    render(<ExerciseEvolutionPage sessions={[]} />);
    expect(screen.getByText('Ainda não há histórico de exercícios')).toBeInTheDocument();
    render(<MuscleMapPage sessions={[]} />);
    expect(screen.getByRole('group', { name: 'Vista frontal com grupos musculares selecionáveis' })).toBeInTheDocument();
    expect(screen.getByText('Séries associadas')).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Selecionar Peitoral maior' }));
    expect(screen.getByRole('heading', { name: 'Peitoral maior' })).toBeInTheDocument();
  });

  it('liga regiões vetoriais selecionáveis aos músculos catalogados e permite navegar pelo teclado', async () => {
    render(<MuscleMapPage sessions={[]} />);
    const pectoral = screen.getByRole('button', { name: 'Selecionar Peitoral maior' });
    expect(pectoral.querySelectorAll('path.anatomy-region-path')).toHaveLength(4);
    pectoral.focus();
    await userEvent.keyboard('{Enter}');
    expect(screen.getByRole('heading', { name: 'Peitoral maior' })).toBeInTheDocument();
    expect(pectoral).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Costas' }));
    expect(screen.getByRole('group', { name: 'Vista posterior com grupos musculares selecionáveis' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Selecionar Posteriores da coxa' })).toBeInTheDocument();
  });

  it('maps every muscle metadata label to an anatomically placed selectable region and colors only actual records', () => {
    const catalogMuscles = new Set(['Bíceps braquial', 'Bíceps', 'Braquial', 'Flexores do antebraço', 'Deltoide anterior', 'Deltoide lateral', 'Deltoide posterior', 'Tríceps', 'Trapézio', 'Eretores da coluna', 'Gastrocnêmio', 'Posteriores da coxa', 'Glúteo máximo', 'Glúteo médio', 'Quadríceps', 'Sóleo', 'Latíssimo do dorso', 'Romboides', 'Peitoral maior']);
    const mapped = new Set(Object.values(MUSCLE_MAP_REGIONS).flatMap((regions) => regions.flatMap((region) => region.muscles)));
    expect([...catalogMuscles].filter((muscle) => !mapped.has(muscle))).toEqual([...UNMAPPED_CATALOG_MUSCLES]);

    const completedAt = new Date().toISOString();
    render(<MuscleMapPage sessions={[{ id: 'logged', routineId: 'routine', routineName: 'Upper A', startedAt: completedAt, completedAt, status: 'completed', exercises: [{ id: 'snapshot', sourceExerciseId: 'bench', catalogExerciseId: 'bench-press', name: 'Supino reto com barra', order: 0, plannedSets: [{ targetReps: 8 }], performedSets: [{ completed: true, reps: 8, load: 40 }] }] }]} />);
    const pectoral = screen.getByRole('button', { name: 'Selecionar Peitoral maior' });
    expect(pectoral).toHaveClass('has-records');
    expect(screen.getByRole('button', { name: 'Selecionar Quadríceps' })).not.toHaveClass('has-records');
    expect(screen.getByText(/refletem apenas séries concluídas vinculadas aos metadados/)).toBeInTheDocument();
  });

  it('usa as regiões SVG locais da biblioteca para áreas delimitadas e não atribui dados a músculos sem metadados', async () => {
    for (const view of ['front', 'back'] as const) {
      const anatomyIds = new Set(getAnatomyForView(view).map((part) => part.id));
      for (const region of MUSCLE_MAP_REGIONS[view]) {
        const shapes = getRegionAnatomy(region, view);
        expect(shapes).toHaveLength(region.anatomyIds.length);
        expect(shapes.every((shape) => anatomyIds.has(shape.id))).toBe(true);
        expect(shapes.every((shape) => shape.path.length > 30)).toBe(true);
      }
    }

    render(<MuscleMapPage sessions={[]} />);
    await userEvent.click(screen.getByRole('button', { name: /Selecionar Abdômen/ }));
    expect(screen.getByRole('heading', { name: 'Abdômen' })).toBeInTheDocument();
    expect(screen.getByText(/não tem associação aos metadados dos exercícios atuais/)).toBeInTheDocument();
    expect(screen.queryByText('Séries associadas')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Selecionar Antebraço · vista anterior/ }));
    expect(screen.getByRole('heading', { name: 'Antebraço · vista anterior' })).toBeInTheDocument();
    expect(screen.getByText(/não tem associação aos metadados dos exercícios atuais/)).toBeInTheDocument();
  });
});
