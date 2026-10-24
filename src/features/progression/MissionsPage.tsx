import { useMemo, useState } from 'react';
import type { AppData, Mission } from '../../domain/models';
import { claimMission, localDateKey, localWeekKey, reconcileProgression } from '../../domain/progression';
import type { SaveResult } from '../../storage/appStorage';

type Props = { data: AppData; onSave: (data: AppData) => SaveResult };

export function MissionsPage({ data, onSave }: Props) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const view = reconcileProgression(data);
  const today = localDateKey(new Date().toISOString());
  const week = localWeekKey(new Date().toISOString());
  const categories: { id: Mission['category']; title: string; caption: string; missions: Mission[] }[] = useMemo(() => [
    { id: 'daily', title: 'Missões diárias', caption: `Reinício por data local · ${today}`, missions: view.missions.filter((mission) => mission.category === 'daily' && mission.dayKey === today) },
    { id: 'weekly', title: 'Missões semanais', caption: `Semana de segunda a domingo · ${week}`, missions: view.missions.filter((mission) => mission.category === 'weekly' && mission.weekKey === week) },
    { id: 'special', title: 'Missões especiais', caption: 'Marcos únicos da jornada', missions: view.missions.filter((mission) => mission.category === 'special') },
  ], [today, view.missions, week]);

  const collect = (mission: Mission) => {
    const result = claimMission(view, mission.id);
    if (!result.ok) { setFeedback(result.error); return; }
    const saved = onSave(result.data);
    setFeedback(saved.ok ? `Recompensa de ${result.xp} XP resgatada.` : `Não foi possível salvar o resgate: ${saved.message}`);
  };

  return <div className="progression-page rpg-page">
    <header className="training-heading progression-heading"><div><p className="eyebrow">PURPLE ECLIPSE · OBJETIVOS</p><h1>Central de missões</h1><p>Avance no seu ritmo. Dias de descanso fazem parte de uma jornada sustentável.</p></div><div className="progression-level-mark"><span>ARC</span><strong>✦</strong></div></header>
    {feedback && <p className="progression-feedback" role="status">{feedback}</p>}
    {categories.map((category) => <section className="progression-section" key={category.id} aria-labelledby={`mission-${category.id}`}><div className="section-heading"><div><p className="eyebrow">{category.caption}</p><h2 id={`mission-${category.id}`}>{category.title}</h2></div><span className="progression-section-count">{category.missions.filter((mission) => mission.status === 'completed').length}/{category.missions.length} concluídas</span></div>
      {category.missions.length ? <div className="progression-mission-list">{category.missions.map((mission) => <MissionCard key={mission.id} mission={mission} onCollect={() => collect(mission)} />)}</div>
        : <div className="progression-empty"><span>◇</span><p>{category.id === 'daily' ? 'Nenhum objetivo diário se aplica agora. Uma agenda de descanso continua sendo uma escolha válida.' : 'Ainda não há objetivos nesta categoria.'}</p></div>}
    </section>)}
  </div>;
}

function MissionCard({ mission, onCollect }: { mission: Mission; onCollect: () => void }) {
  const progress = mission.progress ?? 0; const target = mission.target ?? 1;
  const label = mission.claimedAt ? 'Recompensa resgatada' : mission.status === 'completed' ? 'Concluída · recompensa disponível' : mission.status === 'in-progress' ? 'Em andamento' : 'Disponível';
  return <article className={`progression-mission ${mission.status}`}><div className="mission-heading-row"><div><span className="progression-card-kicker">{mission.dayKey ? `DIA ${mission.dayKey}` : mission.weekKey ? `SEMANA DE ${mission.weekKey}` : 'MARCO ÚNICO'}</span><h3>{mission.title}</h3></div><strong className="mission-status-label">{label}</strong></div><p>{mission.description}</p><div className="mission-progress-track" role="progressbar" aria-label={`Progresso: ${mission.title}`} aria-valuemin={0} aria-valuemax={target} aria-valuenow={Math.min(progress, target)}><span style={{ width: `${Math.min(100, Math.round(progress / target * 100))}%` }} /></div><div className="mission-footer"><span>{Math.min(progress, target)} / {target} · Recompensa: {mission.rewardXp ?? 0} XP</span>{mission.status === 'completed' && !mission.claimedAt && <button className="primary-action mission-claim" onClick={onCollect}>Resgatar recompensa</button>}</div></article>;
}
