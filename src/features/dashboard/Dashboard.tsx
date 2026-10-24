import type { AppData, WorkoutSession } from '../../domain/models';
import { getCompanionCharacter, getCompanionMessage } from '../../domain/companionCatalog';
import { CompanionPortrait } from '../companion/CompanionPortrait';
import { getNarrative } from '../../domain/narrative';
import { Icon } from '../../components/Icon';
import { BrandMark } from '../../components/BrandMark';
import type { AppPage } from '../../components/AppShell';
import { calculateLevel, localDateKey, localWeekKey, reconcileProgression, TITLE_DEFINITIONS } from '../../domain/progression';
import { calculateWorkoutStatistics } from '../../domain/statistics';
import { addLocalDays, countScheduledWeekProgress, getScheduledDayStatus, getWeekDates, nextSequenceRoutineId, weekdayForDate, WEEKDAYS } from '../../domain/trainingPlan';

const routineNames = ['Upper A', 'Upper B', 'Lower A', 'Lower B'] as const;

function getDashboardNarrative(sessions: WorkoutSession[], now = new Date()): 'opening' | 'return' | 'recovery' | 'progression' | 'completed' {
  const completed = sessions.filter((session) => session.status === 'completed' && session.completedAt);
  if (completed.length === 0) return 'opening';
  const latest = completed.reduce((current, candidate) => (Date.parse(candidate.completedAt!) > Date.parse(current.completedAt!) ? candidate : current));
  const elapsedDays = (now.getTime() - Date.parse(latest.completedAt!)) / 86_400_000;
  if (elapsedDays >= 21) return 'return';
  if (elapsedDays < 1) return 'completed';
  if (elapsedDays < 3) return 'recovery';
  return 'progression';
}

function formatDate(isoDate: string): string {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(isoDate));
}

type DashboardProps = {
  data: AppData;
  storageMessage: string | null;
  onNavigate: (page: AppPage) => void;
  onOpenRoutine: (routineName: string) => void;
  onStartRoutine: (routineId: string) => void;
};

export function Dashboard({ data, storageMessage, onNavigate, onOpenRoutine, onStartRoutine }: DashboardProps) {
  const completedSessions = data.sessions.filter((session) => session.status === 'completed' && session.completedAt);
  const recentSessions = [...completedSessions].sort((a, b) => Date.parse(b.completedAt!) - Date.parse(a.completedAt!)).slice(0, 3);
  const displayName = data.profile.showDisplayName === false ? '' : data.profile.displayName?.trim();
  const greetingName = displayName || 'protagonista';
  const context = getDashboardNarrative(data.sessions);
  const narrativeContext = context === 'completed' ? 'workout-complete' : context;
  const narrative = getNarrative(narrativeContext, new Date(), data.preferences.narrativeStyle ?? 'epic');
  const currentProgression = reconcileProgression(data);
  const unlockedAchievements = currentProgression.achievements.filter((achievement) => achievement.unlockedAt);
  const todayKey = localDateKey(new Date().toISOString());
  const currentWeekKey = localWeekKey(new Date().toISOString());
  const missionsInProgress = currentProgression.missions.filter((mission) => mission.status !== 'completed'
    && (mission.dayKey === todayKey || mission.weekKey === currentWeekKey));
  const activeSession = data.sessions.find((session) => session.status === 'in-progress');
  const level = calculateLevel(data.profile.totalXp);
  const allStats = calculateWorkoutStatistics(data.sessions);
  const recentStats = calculateWorkoutStatistics(data.sessions, { period: '30d' });
  const equippedTitle = TITLE_DEFINITIONS.find((title) => title.id === data.progression.equippedTitleId);
  const companionCharacter = getCompanionCharacter(data.companion.characterId);
  const today = new Date();
  const todaySchedule = data.weeklySchedule?.[weekdayForDate(today)];
  const todayStatus = getScheduledDayStatus(todaySchedule, today, data.routines, data.sessions);
  const todayRoutine = todaySchedule?.type === 'workout' ? data.routines.find((routine) => routine.id === todaySchedule.routineId) : undefined;
  const upcomingSchedule = Array.from({ length: 7 }, (_, offset) => addLocalDays(today, offset + 1)).map((date) => ({ date, entry: data.weeklySchedule?.[weekdayForDate(date)] }))
    .find((item) => { const entry = item.entry; return entry?.type === 'workout' && data.routines.some((routine) => routine.id === entry.routineId); });
  const weekProgress = countScheduledWeekProgress(getWeekDates(today), data.weeklySchedule, data.routines, data.sessions);
  const nextSequenceId = nextSequenceRoutineId(data.workoutSequence);
  const nextSequenceRoutine = data.routines.find((routine) => routine.id === nextSequenceId);

  return (
    <div className="dashboard-page">
      {storageMessage && <div className="storage-alert" role="alert"><Icon name="settings" /><span>{storageMessage}</span></div>}
      <section className="dashboard-heading"><div><p className="eyebrow">PURPLE ECLIPSE <span className="heading-divider">/</span> TRAINING ARC 2.0</p><h1>Bem-vindo de volta, <span>{greetingName}</span></h1><p className="heading-subtitle">{displayName && equippedTitle ? <>{equippedTitle.name} <span className="dot-separator">·</span> </> : null}Seu próximo capítulo começa com uma escolha.</p></div><div className="chapter-index"><span>JOURNEY SYSTEM</span><BrandMark className="chapter-mark" /><i>JORNADA EM CONSTRUÇÃO</i></div></section>

      <section className="hero-panel romance-hero" aria-labelledby="hero-title">
        <div className="hero-copy"><p className="eyebrow"><Icon name="spark" /> SEU DIÁRIO DE TREINO</p><h2 id="hero-title">Seu próximo arco<br /><span>começa hoje.</span></h2><p className="hero-quote">“{narrative}”</p><button className="primary-action" onClick={() => onNavigate('training')}>{activeSession ? `Retomar ${activeSession.routineName}` : 'Escolher treino'} <Icon name="arrow" /></button></div>
        <div className="hero-art" aria-label={`Personagem selecionada: ${companionCharacter.name}, de ${companionCharacter.work}`}>
          <div className="hero-petal-orbit" aria-hidden="true"><i /><i /><i /><i /></div>
          <CompanionPortrait character={companionCharacter} displayName={companionCharacter.name} className="hero-companion-portrait" mode="stage" eager />
          <div className="hero-companion-caption"><span>COMPANHEIRA DESTE CAPÍTULO</span><strong>{companionCharacter.name}</strong><small>{companionCharacter.work}</small></div>
          <span className="aura-label label-top">ARC 02 <b>·</b> UM PASSO DE CADA VEZ</span>
        </div>
        <div className="hero-index">01 <span>/</span> 07</div>
      </section>

      <section className="dashboard-plan-glance" aria-label="Agenda e sequência de treinos">
        <article className="today-plan-panel"><div className="plan-glance-kicker"><span>TREINO DE HOJE</span><span>{today.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span></div><h2>{todaySchedule?.type === 'rest' ? 'Descanso programado' : todayRoutine?.name ?? (todayStatus === 'invalid' ? 'Ficha removida' : 'Dia sem programação')}</h2><p>{todayStatus === 'completed' ? 'Treino concluído conforme a agenda.' : todayStatus === 'active' ? 'Sua sessão está em andamento.' : todayStatus === 'pending' ? 'Treino programado · ainda não iniciado.' : todayStatus === 'rest' ? 'Recuperação também faz parte da jornada.' : todaySchedule?.type === 'unconfigured' && todaySchedule.removedRoutineName ? `${todaySchedule.removedRoutineName} foi removida. Corrija este dia.` : 'Defina uma rotina ou marque descanso para este dia.'}</p><div className="plan-glance-actions">{todayRoutine && <button className="primary-action" onClick={() => activeSession ? onNavigate('training') : todayStatus === 'completed' ? onOpenRoutine(todayRoutine.name) : onStartRoutine(todayRoutine.id)}>{activeSession ? `Retomar ${activeSession.routineName}` : todayStatus === 'completed' ? 'Abrir ficha' : 'Iniciar treino'}</button>}<button className="text-link" onClick={() => onNavigate('plan')}>{todayStatus === 'unconfigured' || todayStatus === 'invalid' ? 'Configurar agenda' : 'Ver agenda'} <Icon name="arrow" /></button></div></article>
        <article className="next-plan-panel"><p className="eyebrow">PRÓXIMO TREINO PROGRAMADO</p>{upcomingSchedule ? <><h2>{data.routines.find((routine) => routine.id === (upcomingSchedule.entry?.type === 'workout' ? upcomingSchedule.entry.routineId : ''))?.name}</h2><p>{WEEKDAYS.find(({ id }) => id === weekdayForDate(upcomingSchedule.date))?.label} · {upcomingSchedule.date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</p></> : <><h2>{data.weeklySchedule ? 'Sem treino futuro definido' : 'Configure sua semana'}</h2><p>{data.weeklySchedule ? 'Não há outra ficha programada nos próximos sete dias.' : 'Escolha fichas e dias de descanso.'}</p></>}<div className="plan-glance-actions"><button className="text-link" onClick={() => onNavigate('plan')}>Abrir agenda <Icon name="arrow" /></button></div></article>
        <article className="sequence-glance"><p className="eyebrow">ORDEM DO SEU ARCO</p>{nextSequenceRoutine ? <><h2>{nextSequenceRoutine.name}</h2><p>Próxima ficha · {data.workoutSequence!.currentIndex + 1} de {data.workoutSequence!.routineIds.length}</p><div className="sequence-meter" role="progressbar" aria-label="Progresso da sequência" aria-valuemin={0} aria-valuemax={data.workoutSequence!.routineIds.length} aria-valuenow={data.workoutSequence!.currentIndex}><span style={{ width: `${Math.round(data.workoutSequence!.currentIndex / data.workoutSequence!.routineIds.length * 100)}%` }} /></div></> : <><h2>Sequência não configurada</h2><p>Defina a ordem independente da agenda semanal.</p></>}<button className="text-link" onClick={() => onNavigate('plan')}>Ver sequência <Icon name="arrow" /></button></article>
        <article className="week-glance"><p className="eyebrow">RESUMO DA SEMANA</p>{weekProgress.planned > 0 ? <><strong>{weekProgress.completed} de {weekProgress.planned}</strong><span>dias programados concluídos</span><div className="sequence-meter" role="progressbar" aria-label="Dias de treino programados concluídos nesta semana" aria-valuemin={0} aria-valuemax={weekProgress.planned} aria-valuenow={weekProgress.completed}><span style={{ width: `${Math.round(weekProgress.completed / weekProgress.planned * 100)}%` }} /></div></> : <><strong>Sem meta semanal</strong><span>{data.weeklySchedule ? 'A agenda atual não tem dias de treino.' : 'Configure a agenda para definir os dias de treino.'}</span></>}<button className="text-link" onClick={() => onNavigate('plan')}>Ajustar agenda <Icon name="arrow" /></button></article>
      </section>

      <section className="status-grid" aria-label="Resumo de status">
        <article className="status-panel level-panel"><div className="panel-topline"><span>PAINEL DE STATUS</span><span className="panel-icon"><Icon name="spark" /></span></div><div className="level-row"><div className="level-badge">{level.level}</div><div><span className="data-label">NÍVEL ATUAL</span><strong className="data-placeholder">Patamar {level.level}</strong></div></div><div className="xp-row"><div><span className="data-label">EXPERIÊNCIA</span><strong>{level.totalXp.toLocaleString('pt-BR')} XP</strong></div><span className="lock-mark">✦</span></div><div className="progress-track" role="progressbar" aria-label="Progresso para o próximo nível" aria-valuemin={0} aria-valuemax={100} aria-valuenow={level.progressPercent}><span style={{ width: `${level.progressPercent}%` }} /></div><p className="panel-note">{level.xpIntoLevel} / {level.xpToNextLevel} XP para o nível {level.level + 1}.</p><div className="equipped-title-line"><span>TÍTULO EQUIPADO</span><strong>{equippedTitle?.name ?? 'Nenhum título'}</strong><button className="text-link" onClick={() => onNavigate('progression')}>Ver progressão <Icon name="arrow" /></button></div></article>
        <article className="status-panel session-panel"><div className="panel-topline"><span>REGISTRO DE JORNADA</span><span className="panel-icon"><Icon name="history" /></span></div><div className="session-count">{completedSessions.length.toString().padStart(2, '0')}<span> sessões concluídas</span></div>{recentSessions.length > 0 ? <ul className="recent-list">{recentSessions.map((session) => <li key={session.id}><span className="recent-marker" /><span className="recent-name">{session.routineName}</span><time dateTime={session.completedAt}>{formatDate(session.completedAt!)}</time></li>)}</ul> : <p className="empty-note">Sua primeira sessão concluída vai aparecer aqui. Toda jornada começa com uma.</p>}</article>
      </section>

      <section className="dashboard-stats-glance" aria-label="Resumo de atividade estatística"><div><p className="eyebrow">ATIVIDADE RECENTE</p><h2>Seu ritmo de treinamento</h2><p>{allStats.sessionCount ? `${allStats.sessionsThisWeek} ${allStats.sessionsThisWeek === 1 ? 'sessão concluída' : 'sessões concluídas'} nesta semana · ${recentStats.sessionCount} nos últimos 30 dias.` : 'Conclua uma sessão para começar a acompanhar sua atividade.'}</p></div><div className="dashboard-stats-values"><span><strong>{allStats.completedSets}</strong><small>séries registradas</small></span><span><strong>{allStats.totalVolume === null ? '—' : `${allStats.totalVolume.toLocaleString('pt-BR')} kg·reps`}</strong><small>volume com dados completos</small></span></div><button className="text-link" onClick={() => onNavigate('statistics')}>Ver estatísticas <Icon name="arrow" /></button></section>

      <nav className="dashboard-insight-links" aria-label="Ferramentas de análise"><button onClick={() => onNavigate('workbook')}><span>01</span><strong>Planilha de treino</strong><small>Ficha e último desempenho</small><b aria-hidden="true">→</b></button><button onClick={() => onNavigate('evolution')}><span>02</span><strong>Evolução</strong><small>Compare sessões por exercício</small><b aria-hidden="true">→</b></button><button onClick={() => onNavigate('muscles')}><span>03</span><strong>Mapa muscular</strong><small>Distribuição dos registros</small><b aria-hidden="true">→</b></button></nav>

      <section className="content-section routine-section" aria-labelledby="routine-title"><div className="section-heading"><div><p className="eyebrow">SELECIONE SEU CAMINHO</p><h2 id="routine-title">Rotinas de treinamento</h2></div><button className="text-link" onClick={() => onNavigate('routines')}>Ver rotinas <Icon name="arrow" /></button></div><div className="routine-grid">{routineNames.map((name, index) => { const routine = data.routines.find((item) => item.name.toLowerCase() === name.toLowerCase()); return <div className="routine-tile-wrap" key={name}><button className="routine-tile" onClick={() => onOpenRoutine(name)} aria-label={`Abrir ficha ${name}`}><span className="routine-number">0{index + 1}</span><strong>{name}</strong><span className="routine-detail">{routine ? `${routine.exercises.length} exercícios cadastrados` : 'Toque para criar ou adicionar'}</span><Icon name="arrow" /></button>{routine && !activeSession && <button className="routine-quick-start" aria-label={`Iniciar treino ${name}`} onClick={() => onStartRoutine(routine.id)}>Iniciar treino <span aria-hidden="true">→</span></button>}</div>; })}</div></section>

      <section className="lower-grid">
        <article className="content-panel"><div className="section-heading compact"><div><p className="eyebrow">MARCOS DA JORNADA</p><h2>Recordes & conquistas</h2></div><Icon name="trophy" className="heading-icon" /></div>{unlockedAchievements.length ? <ul className="achievement-list">{unlockedAchievements.slice(0, 3).map((achievement) => <li key={achievement.id}><span className="achievement-gem"><Icon name="trophy" /></span><div><strong>{achievement.title}</strong><span>{achievement.description}</span></div></li>)}</ul> : <div className="panel-empty"><span className="empty-glyph">◇</span><p>Seus marcos reais aparecerão aqui quando forem registrados.</p></div>}<div className="record-note"><span className="record-line" />Recordes pessoais estarão disponíveis em uma próxima etapa.</div><button className="panel-bottom-link" onClick={() => onNavigate('medals')}>Abrir medalhas e títulos <Icon name="arrow" /></button></article>
        <article className="content-panel mission-panel"><div className="section-heading compact"><div><p className="eyebrow">OBJETIVOS DA JORNADA</p><h2>Missões</h2></div><Icon name="spark" className="heading-icon" /></div>{missionsInProgress.length ? <ul className="mission-list">{missionsInProgress.slice(0, 2).map((mission) => <li key={mission.id}><span className="mission-dot" /><div><strong>{mission.title}</strong><span>{mission.description}</span><small>{mission.progress ?? 0}/{mission.target ?? 1} · {mission.rewardXp ?? 0} XP</small></div></li>)}</ul> : <div className="panel-empty"><span className="empty-glyph">✳</span><p>As missões ativas aparecem aqui conforme sua jornada avança.</p></div>}<button className="panel-bottom-link" onClick={() => onNavigate('missions')}>Abrir missões <Icon name="arrow" /></button></article>
      </section>

      <section className="companion-panel companion-dialogue-panel" aria-labelledby="companion-title"><div className="companion-note-art" aria-hidden="true"><Icon name="companion" /><span>✿</span></div><div className="companion-copy"><p className="eyebrow">UMA NOTA PARA O PRÓXIMO CAPÍTULO</p><h2 id="companion-title">{companionCharacter.name}</h2><span className="companion-personality">{data.companion.personalityName || personalityLabel(data.companion.personality)}</span><p className="companion-quote">“{getCompanionMessage(data.companion.characterId, context)}”</p><button className="text-link" onClick={() => onNavigate('companion')}>Abrir coleção de personagens <Icon name="arrow" /></button></div><div className="companion-seal"><span>TRAINING</span><strong>DIARY</strong><i>CAPÍTULO ATUAL</i></div></section>
      <footer className="dashboard-footer"><span>TRAINING ARC 2.0</span><span>JORNADA EM CONSTRUÇÃO <i /></span></footer>
    </div>
  );
}

function personalityLabel(personality: string | undefined): string {
  if (personality === 'enthusiast') return 'Entusiasmada';
  if (personality === 'friendly-rival') return 'Rival amigável';
  return 'Estrategista';
}
