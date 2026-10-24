import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import type { AppData } from '../../domain/models';
import { parseBackupJson, serializeBackup } from '../../domain/backup';
import type { ParsedBackup } from '../../domain/backup';
import type { SaveResult } from '../../storage/appStorage';

type BackupSectionProps = {
  data: AppData | null;
  onRestore: (data: AppData) => SaveResult;
  notice?: string | null;
};

export function BackupSection({ data, onRestore, notice }: BackupSectionProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [candidate, setCandidate] = useState<ParsedBackup | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);

  const exportBackup = () => {
    if (!data) return;
    try {
      const date = new Date();
      const localDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const blob = new Blob([serializeBackup(data)], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `training-arc-2-backup-${localDate}.json`;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setFeedback({ kind: 'success', message: 'Backup JSON exportado. Guarde o arquivo em um local seguro.' });
    } catch {
      setFeedback({ kind: 'error', message: 'Não foi possível criar o arquivo de backup neste navegador.' });
    }
  };

  const readFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    setCandidate(null);
    setFeedback(null);
    if (!file) return;
    setBusy(true);
    try {
      const result = parseBackupJson(await readFileText(file));
      if (!result.ok) setFeedback({ kind: 'error', message: result.message });
      else setCandidate(result.backup);
    } catch {
      setFeedback({ kind: 'error', message: 'Não foi possível ler o arquivo selecionado.' });
    } finally { setBusy(false); }
  };

  const restore = () => {
    if (!candidate) return;
    const result = onRestore(candidate.data);
    setConfirm(false);
    if (result.ok) {
      setCandidate(null);
      setFeedback(null);
    } else setFeedback({ kind: 'error', message: `A restauração falhou: ${result.message}` });
  };

  return <section className="settings-panel backup-panel" aria-labelledby="backup-title">
    <div className="settings-section-title"><span className="settings-index">05</span><div><h2 id="backup-title">Backup e restauração</h2><p>Uma cópia local para guardar ou recuperar sua jornada neste dispositivo.</p></div></div>
    <div className="backup-body">
      {notice && <p className="backup-notice" role="status">{notice}</p>}
      {feedback && <p className={`settings-feedback ${feedback.kind}`} role={feedback.kind === 'error' ? 'alert' : 'status'}>{feedback.message}</p>}
      <div className="backup-actions">
        <button className="primary-action" type="button" onClick={exportBackup} disabled={!data}>Exportar backup JSON <span aria-hidden="true">↓</span></button>
        <div className="backup-picker"><input ref={inputRef} id="backup-file" type="file" accept=".json,application/json" onChange={readFile} /><label className="secondary-action" htmlFor="backup-file">Selecionar arquivo JSON</label></div>
      </div>
      <p className="backup-guidance">O arquivo contém seu perfil, rotinas, sessões, histórico, progressão, companheira e preferências. Guarde-o em local seguro; qualquer pessoa com acesso ao arquivo poderá ler esses dados.</p>
      {busy && <p className="backup-notice" role="status">Validando arquivo local…</p>}
      {candidate && <div className="backup-preview" aria-labelledby="backup-preview-title">
        <p className="eyebrow">PRÉVIA VALIDADA · FORMATO {candidate.summary.formatVersion}</p><h3 id="backup-preview-title">Conteúdo do arquivo</h3>
        <dl className="backup-summary">
          <div><dt>Data da exportação</dt><dd>{candidate.summary.exportedAt ? new Date(candidate.summary.exportedAt).toLocaleString('pt-BR') : 'Não informada'}</dd></div>
          <div><dt>Schema</dt><dd>{candidate.summary.schemaVersion}</dd></div>
          <div><dt>Rotinas / exercícios</dt><dd>{candidate.summary.routines} / {candidate.summary.configuredExercises}</dd></div>
          <div><dt>Sessões concluídas / em andamento</dt><dd>{candidate.summary.completedSessions} / {candidate.summary.inProgressSessions}</dd></div>
          <div><dt>Conquistas / registros de progressão</dt><dd>{candidate.summary.achievements} / {candidate.summary.progressionRecords}</dd></div>
          <div><dt>Companheira</dt><dd>{candidate.summary.companionName}</dd></div>
        </dl>
        {candidate.warnings.map((warning) => <p className="backup-warning" key={warning}>{warning}</p>)}
        <p className="backup-replace-warning">A restauração substituirá todos os dados atuais do aplicativo neste dispositivo. Esta ação não pode ser desfeita por aqui.</p>
        <div className="backup-actions"><button className="danger-action" type="button" onClick={() => setConfirm(true)}>Restaurar este backup</button><button className="secondary-action" type="button" onClick={() => { setCandidate(null); setFeedback({ kind: 'success', message: 'Importação cancelada; os dados atuais não foram alterados.' }); }}>Cancelar importação</button></div>
      </div>}
    </div>
    {confirm && <div className="confirm-backdrop"><section className="confirm-dialog settings-confirm" role="alertdialog" aria-modal="true" aria-labelledby="restore-confirm-title" aria-describedby="restore-confirm-description"><div className="confirm-mark">!</div><h2 id="restore-confirm-title">Substituir os dados atuais?</h2><p id="restore-confirm-description">Serão substituídos rotinas, sessões e configurações atuais pelo conteúdo validado do backup. Confirme apenas se deseja continuar.</p><div className="confirm-actions"><button className="secondary-action" autoFocus type="button" onClick={() => setConfirm(false)}>Voltar</button><button className="danger-action" type="button" onClick={restore}>Substituir dados e restaurar</button></div></section></div>}
  </section>;
}

function readFileText(file: File): Promise<string> {
  if (typeof file.text === 'function') return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Conteúdo inválido'));
    reader.onerror = () => reject(new Error('Falha de leitura'));
    reader.readAsText(file, 'UTF-8');
  });
}
