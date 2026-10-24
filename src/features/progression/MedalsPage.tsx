import { useState } from 'react';
import type { AppData } from '../../domain/models';
import { ACHIEVEMENT_DEFINITIONS, calculateLevel, equipTitle, reconcileProgression, TITLE_DEFINITIONS } from '../../domain/progression';
import type { SaveResult } from '../../storage/appStorage';

type Props = { data: AppData; onSave: (data: AppData) => SaveResult };

export function MedalsPage({ data, onSave }: Props) {
  const [message, setMessage] = useState<string | null>(null);
  const view = reconcileProgression(data);
  const level = calculateLevel(view.profile.totalXp);
  const unlocks = new Map(view.achievements.map((item) => [item.id, item.unlockedAt]));
  const titles = new Set(view.progression.unlockedTitles.map((item) => item.id));
  const categories = [{ id: 'journey', name: 'Primeiros passos' }, { id: 'consistency', name: 'Disciplina' }, { id: 'mastery', name: 'Domínio' }] as const;
  const toggleTitle = (id: string | null) => {
    const result = equipTitle(view, id);
    if (!result.ok) { setMessage(result.error); return; }
    const saved = onSave(result.data);
    setMessage(saved.ok ? id ? 'Título equipado.' : 'Título removido do perfil.' : `Não foi possível salvar: ${saved.message}`);
  };
  return <div className="progression-page rpg-page">
    <header className="training-heading progression-heading"><div><p className="eyebrow">PURPLE ECLIPSE · COLEÇÃO</p><h1>Medalhas & títulos</h1><p>Marcos desbloqueados a partir das sessões e registros válidos da sua jornada.</p></div><div className="progression-level-mark"><span>NÍVEL</span><strong>{level.level}</strong></div></header>
    {message && <p className="progression-feedback" role="status">{message}</p>}
    <section className="progression-section" aria-labelledby="titles-heading"><div className="section-heading"><div><p className="eyebrow">IDENTIDADE DE JORNADA</p><h2 id="titles-heading">Títulos</h2></div><span className="progression-section-count">{titles.size}/{TITLE_DEFINITIONS.length} obtidos</span></div><div className="progression-title-grid">{TITLE_DEFINITIONS.map((title) => { const unlocked = titles.has(title.id); const equipped = view.progression.equippedTitleId === title.id; return <article className={`progression-title-card ${unlocked ? 'unlocked' : 'locked'}`} key={title.id}><span className="progression-card-kicker">{equipped ? 'EQUIPADO' : unlocked ? 'DISPONÍVEL' : 'BLOQUEADO'}</span><h3>{title.name}</h3><p>{title.description}</p><small>Critério: {title.sessionGoal} {title.sessionGoal === 1 ? 'sessão' : 'sessões'} finalizadas.</small>{unlocked && <button className={equipped ? 'secondary-action' : 'text-link'} disabled={equipped} onClick={() => toggleTitle(title.id)}>{equipped ? 'Equipado' : 'Equipar título'}</button>}</article>; })}</div>{view.progression.equippedTitleId && <button className="text-link progression-clear-title" onClick={() => toggleTitle(null)}>Remover título equipado</button>}</section>
    {categories.map((category) => {
      const items = ACHIEVEMENT_DEFINITIONS.filter((item) => item.category === category.id);
      return <section className="progression-section" key={category.id} aria-labelledby={`medals-${category.id}`}><div className="section-heading"><div><p className="eyebrow">GALERIA DE MARCOS</p><h2 id={`medals-${category.id}`}>{category.name}</h2></div><span className="progression-section-count">{items.filter((item) => unlocks.get(item.id)).length}/{items.length} desbloqueadas</span></div><div className="progression-achievement-grid">{items.map((achievement) => { const unlockedAt = unlocks.get(achievement.id); return <article className={`progression-achievement ${unlockedAt ? 'unlocked' : 'locked'}`} key={achievement.id}><span className="achievement-gem" aria-hidden="true">{unlockedAt ? '✦' : '◇'}</span><div><span className="progression-card-kicker">{unlockedAt ? `DESBLOQUEADA · ${new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(unlockedAt))}` : 'BLOQUEADA'}</span><h3>{achievement.name}</h3><p>{achievement.description}</p><small>{achievement.criterion}</small></div></article>; })}</div></section>;
    })}
    <p className="progression-formula">Medalhas registram marcos e não concedem XP adicional. Títulos desbloqueados permanecem na coleção ao equipar outro.</p>
  </div>;
}
