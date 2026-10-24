import { useState } from 'react';
import type { AppData } from '../../domain/models';
import { COMPANION_CHARACTERS, getCompanionCharacter, getCompanionMessage } from '../../domain/companionCatalog';
import type { CompanionCharacter, CompanionWork } from '../../domain/companionCatalog';
import type { SaveResult } from '../../storage/appStorage';
import { CompanionPortrait } from './CompanionPortrait';

type CompanionPageProps = { data: AppData; onOpenSettings: () => void; onSave: (next: AppData) => SaveResult };
const COMPANION_WORKS: readonly CompanionWork[] = ['The Quintessential Quintuplets', 'My Dress-Up Darling', 'The Fragrant Flower Blooms with Dignity'];

export function CompanionPage({ data, onOpenSettings, onSave }: CompanionPageProps) {
  const selected = getCompanionCharacter(data.companion.characterId);
  const [details, setDetails] = useState<CompanionCharacter | null>(null);
  const [workFilter, setWorkFilter] = useState<CompanionWork | 'all'>('all');
  const [feedback, setFeedback] = useState<{ kind: 'status' | 'alert'; text: string } | null>(null);

  const confirmSelection = () => {
    if (!details) return;
    const result = onSave({ ...data, companion: { ...data.companion, characterId: details.id, displayName: details.name, appearance: 'default' } });
    if (result.ok) {
      setFeedback({ kind: 'status', text: `${details.name} agora acompanha sua jornada.` });
      setDetails(null);
    } else setFeedback({ kind: 'alert', text: `A seleção não foi salva: ${result.message}` });
  };

  return <div className="companion-page">
    <header className="settings-heading companion-page-heading"><p className="eyebrow">ROMANCE · COTIDIANO · TREINO</p><h1>Sua companheira</h1><p>Uma pequena coleção de personagens para acompanhar seu diário de progresso. As mensagens são originais do Training Arc e acompanham sua rotina com leveza e incentivo.</p></header>
    {feedback && <p className={`companion-feedback ${feedback.kind}`} role={feedback.kind}>{feedback.text}</p>}
    <section className="companion-feature" aria-labelledby="companion-page-title">
      <CompanionPortrait character={selected} displayName={selected.name} className="companion-stage" mode="stage" eager />
      <div className="companion-feature-copy"><p className="eyebrow">PERSONAGEM EM DESTAQUE · 01 / 09</p><h2 id="companion-page-title">{selected.name}</h2><p className="companion-work-label">{selected.work}</p><p className="companion-style-pill">{selected.personality}</p><blockquote>“{getCompanionMessage(selected.id, 'opening')}”</blockquote><p className="companion-future-note">{selected.summary} Os retratos locais aparecem quando disponíveis; se uma arte falhar, o cartão preserva o nome e usa iniciais claramente identificadas.</p><button className="secondary-action" type="button" onClick={onOpenSettings}>Personalizar o tom</button></div>
    </section>

    <section className="companion-gallery" aria-labelledby="companion-gallery-title">
      <div className="companion-gallery-heading"><div><p className="eyebrow">NOVE PERSONAGENS · TRÊS SÉRIES</p><h2 id="companion-gallery-title">Escolha sua companheira</h2></div><p>Seleção atual: <strong>{selected.name}</strong></p></div>
      <div className="companion-work-filter" role="group" aria-label="Filtrar personagens por série">
        <button type="button" aria-pressed={workFilter === 'all'} onClick={() => setWorkFilter('all')}>Todas as séries</button>
        {COMPANION_WORKS.map((work) => <button key={work} type="button" aria-pressed={workFilter === work} onClick={() => setWorkFilter(work)}>{work}</button>)}
      </div>
      {COMPANION_WORKS.filter((work) => workFilter === 'all' || workFilter === work).map((work) => <section className="companion-work-group" key={work} aria-label={work} data-franchise={franchiseId(work)}>
        <h3>{work}</h3><div className="companion-card-grid">{COMPANION_CHARACTERS.filter((character) => character.work === work).map((character) => {
          const isSelected = selected.id === character.id;
          const archiveNumber = String(COMPANION_CHARACTERS.indexOf(character) + 1).padStart(2, '0');
          return <article className={`companion-choice${isSelected ? ' is-selected' : ''}`} key={character.id} data-archive-number={archiveNumber}>
            <CompanionPortrait character={character} mode="card" className="companion-card-portrait" />
            <div className="companion-choice-copy"><h4>{character.name}</h4><p>{character.personality}</p>{isSelected && <span className="companion-selected-tag">Acompanhando agora</span>}</div>
            <button className="secondary-action companion-detail-button" type="button" onClick={() => { setFeedback(null); setDetails(character); }} aria-label={`Ver detalhes de ${character.name}`}>{isSelected ? 'Ver seleção' : 'Ver detalhes'}</button>
          </article>;
        })}</div>
      </section>)}
    </section>

    {details && <div className="confirm-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDetails(null); }}><section className="confirm-dialog companion-detail-dialog" role="dialog" aria-modal="true" aria-labelledby="companion-detail-title" aria-describedby="companion-detail-description" onKeyDown={(event) => { if (event.key === 'Escape') setDetails(null); }}>
      <button className="dialog-close" autoFocus type="button" aria-label="Fechar detalhes" onClick={() => setDetails(null)}>×</button>
      <CompanionPortrait character={details} mode="detail" className="companion-card-portrait detail-portrait" />
      <p className="eyebrow">{details.work}</p><h2 id="companion-detail-title">{details.name}</h2><p className="companion-style-pill">{details.personality}</p><p id="companion-detail-description">{details.summary}</p>
      <blockquote>“{getCompanionMessage(details.id, 'preparation')}”</blockquote><p className="companion-messages-label">Uma fala para cada contexto</p><ul className="companion-message-list">{(['workout', 'effort', 'completed', 'recovery', 'return', 'progression'] as const).map((context) => <li key={context}><strong>{contextLabel(context)}:</strong> {getCompanionMessage(details.id, context)}</li>)}</ul>
      <div className="confirm-actions"><button className="secondary-action" type="button" onClick={() => setDetails(null)}>Voltar à galeria</button><button className="primary-action" type="button" onClick={confirmSelection}>{selected.id === details.id ? 'Manter seleção' : 'Escolher companheira'}</button></div>
    </section></div>}
  </div>;
}

function franchiseId(work: CompanionWork): string {
  if (work === 'The Quintessential Quintuplets') return 'quintuplets';
  if (work === 'My Dress-Up Darling') return 'dress-up';
  return 'fragrant-flower';
}

function contextLabel(context: 'workout' | 'effort' | 'completed' | 'recovery' | 'return' | 'progression'): string {
  const labels = { workout: 'Treino', effort: 'Esforço', completed: 'Conclusão', recovery: 'Recuperação', return: 'Retorno', progression: 'Jornada' };
  return labels[context];
}
