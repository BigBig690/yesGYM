import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../app/App';
import { createDefaultAppData } from '../../domain/models';
import { STORAGE_KEYS } from '../../storage/appStorage';

describe('routines flow', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  async function openRoutines(user: ReturnType<typeof userEvent.setup>) {
    const buttons = await screen.findAllByRole('button', { name: 'Rotinas' });
    await user.click(buttons[0]!);
    expect(await screen.findByRole('heading', { name: 'Rotinas de treinamento' })).toBeInTheDocument();
  }

  it('provides four initial routines and opens the matching routine from the dashboard', async () => {
    const user = userEvent.setup();
    render(<App />);
    const shortcut = await screen.findByRole('button', { name: 'Abrir ficha Upper A' });
    await user.click(shortcut);
    expect(await screen.findByLabelText('Nome da rotina')).toHaveValue('Upper A');
    expect(screen.getByText('Supino reto com barra')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Supino reto com barra: posição inicial' })).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: 'Dashboard' })[0]!);
    await user.click(await screen.findByRole('button', { name: 'Abrir ficha Lower A' }));
    expect(await screen.findByLabelText('Nome da rotina')).toHaveValue('Lower A');
    expect(screen.getByText('Cadeira extensora')).toBeInTheDocument();
  });

  it('offers to create a missing routine when opened from a dashboard shortcut', async () => {
    const user = userEvent.setup();
    const oldData = createDefaultAppData();
    oldData.routines = [];
    window.localStorage.setItem(STORAGE_KEYS.appData, JSON.stringify(oldData));
    render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Abrir ficha Upper B' }));
    expect(await screen.findByText(/a rotina Upper B não existe/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Criar “Upper B”/ }));
    expect(screen.getByLabelText('Nome da rotina')).toHaveValue('Upper B');
  });

  it('lets a previous empty state add the starter models without replacing its other data', async () => {
    const user = userEvent.setup();
    const oldData = createDefaultAppData();
    oldData.routines = [];
    oldData.profile.displayName = 'Aki';
    oldData.sessions.push({ id: 'past', routineId: 'deleted-routine', routineName: 'Old routine', startedAt: '2026-10-20T10:00:00.000Z', completedAt: '2026-10-20T11:00:00.000Z', status: 'completed', exercises: [] });
    window.localStorage.setItem(STORAGE_KEYS.appData, JSON.stringify(oldData));
    render(<App />);
    await openRoutines(user);
    await user.click(screen.getByRole('button', { name: 'Adicionar os 4 modelos iniciais' }));
    expect(await screen.findByLabelText('Nome da rotina')).toHaveValue('Upper A');
    await user.click(screen.getAllByRole('button', { name: 'Dashboard' })[0]!);
    expect(await screen.findByRole('heading', { name: /bem-vindo de volta, Aki/i })).toBeInTheDocument();
    expect(screen.getByText('Old routine')).toBeInTheDocument();
  });

  it('creates and persists a routine and its exercises after a fresh app load', async () => {
    const user = userEvent.setup();
    const firstRender = render(<App />);
    await openRoutines(user);
    await user.click(screen.getByRole('button', { name: /Criar rotina/ }));
    await user.type(screen.getByLabelText('Nome da rotina'), 'Mobilidade');
    await user.type(screen.getByLabelText(/Observações/), 'Rotina de recuperação');
    await user.click(screen.getByRole('button', { name: /Criar e salvar/ }));
    expect(await screen.findByLabelText('Nome da rotina')).toHaveValue('Mobilidade');

    await user.click(screen.getByRole('button', { name: /Adicionar exercício/ }));
    await user.type(screen.getByLabelText('Nome do exercício'), 'Alongamento de quadril');
    await user.clear(screen.getByLabelText('Séries'));
    await user.type(screen.getByLabelText('Séries'), '2');
    await user.clear(screen.getByLabelText('Repetições por série'));
    await user.type(screen.getByLabelText('Repetições por série'), '30');
    await user.clear(screen.getByLabelText(/Descanso/));
    await user.type(screen.getByLabelText(/Descanso/), '45');
    await user.click(screen.getByRole('button', { name: 'Salvar exercício' }));
    expect(await screen.findByText('Alongamento de quadril')).toBeInTheDocument();

    firstRender.unmount();
    render(<App />);
    await openRoutines(user);
    await user.click(await screen.findByRole('button', { name: /Mobilidade/ }));
    expect(await screen.findByLabelText('Nome da rotina')).toHaveValue('Mobilidade');
    const editor = screen.getByLabelText('Editor da rotina');
    expect(within(editor).getByText('Alongamento de quadril')).toBeInTheDocument();
    expect(within(editor).getByText(/45s descanso/)).toBeInTheDocument();
  });

  it('keeps the edit form open and shows field-level validation errors', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openRoutines(user);
    await user.click(screen.getByRole('button', { name: /Upper A/ }));
    await user.click(screen.getByRole('button', { name: /Adicionar exercício/ }));
    await user.clear(screen.getByLabelText('Nome do exercício'));
    await user.clear(screen.getByLabelText('Séries'));
    await user.type(screen.getByLabelText('Séries'), '-1');
    await user.click(screen.getByRole('button', { name: 'Salvar exercício' }));
    expect(screen.getByText('Informe o nome do exercício.')).toBeInTheDocument();
    expect(screen.getByText('Use um número inteiro de 1 a 30 séries.')).toBeInTheDocument();
    expect(screen.getByLabelText('Séries')).toHaveValue(-1);
  });

  it('requires confirmation before deleting a routine', async () => {
    const user = userEvent.setup();
    render(<App />);
    const shortcut = await screen.findByRole('button', { name: 'Abrir ficha Upper A' });
    await user.click(shortcut);
    await user.click(screen.getByRole('button', { name: 'Excluir rotina' }));
    const dialog = screen.getByRole('alertdialog');
    expect(within(dialog).getByText(/sessões históricas.*preservados/i)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Manter rotina' }));
    expect(screen.getByLabelText('Nome da rotina')).toHaveValue('Upper A');

    await user.click(screen.getByRole('button', { name: 'Excluir rotina' }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Excluir rotina' }));
    expect(await screen.findByText(/escolha uma rotina para visualizar/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Upper A/ })).not.toBeInTheDocument();
  });

  it('does not show a save as successful when local storage rejects a write', async () => {
    const user = userEvent.setup();
    render(<App />);
    const shortcut = await screen.findByRole('button', { name: 'Abrir ficha Upper A' });
    await user.click(shortcut);
    const nameInput = screen.getByLabelText('Nome da rotina');
    await user.clear(nameInput);
    await user.type(nameInput, 'Upper A revisada');
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    try {
      await user.click(screen.getByRole('button', { name: 'Salvar nome e observações da rotina' }));
      expect(await screen.findByRole('alert')).toHaveTextContent(/não foi possível gravar/i);
      expect(screen.queryByText('Alterações da rotina salvas neste dispositivo.')).not.toBeInTheDocument();
      expect(nameInput).toHaveValue('Upper A revisada');
    } finally {
      setItemSpy.mockRestore();
    }
  });
});
