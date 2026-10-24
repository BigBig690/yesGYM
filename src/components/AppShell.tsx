import { useState } from 'react';
import type { ReactNode } from 'react';
import { Icon } from './Icon';
import { BrandMark } from './BrandMark';
import type { IconName } from './Icon';
import type { Preferences } from '../domain/models';
import { AnimeCompanionPanel } from './AnimeCompanionPanel';

export type AppPage = 'dashboard' | 'routines' | 'exercises' | 'training' | 'history' | 'plan' | 'statistics' | 'workbook' | 'evolution' | 'muscles' | 'progression' | 'missions' | 'medals' | 'companion' | 'settings';

const navigation: { id: AppPage; label: string; icon: IconName }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'routines', label: 'Rotinas', icon: 'routines' },
  { id: 'exercises', label: 'Exercícios', icon: 'library' },
  { id: 'training', label: 'Treinar', icon: 'training' },
  { id: 'history', label: 'Histórico', icon: 'history' },
  { id: 'plan', label: 'Agenda', icon: 'calendar' },
  { id: 'statistics', label: 'Estatísticas', icon: 'chart' },
  { id: 'workbook', label: 'Planilha', icon: 'workbook' },
  { id: 'evolution', label: 'Evolução', icon: 'chart' },
  { id: 'muscles', label: 'Mapa muscular', icon: 'muscles' },
  { id: 'progression', label: 'Progressão', icon: 'progression' },
  { id: 'missions', label: 'Missões', icon: 'missions' },
  { id: 'medals', label: 'Medalhas', icon: 'medals' },
  { id: 'companion', label: 'Companheira', icon: 'companion' },
  { id: 'settings', label: 'Configurações', icon: 'settings' },
];

const mobilePrimary = new Set<AppPage>(['dashboard', 'routines', 'training', 'plan']);

type AppShellProps = {
  activePage: AppPage;
  onNavigate: (page: AppPage) => void;
  children: ReactNode;
  protagonistName?: string;
  preferences?: Preferences;
  companionCharacterId?: string;
  companionDisplayName?: string;
  levelNotice?: { from: number; to: number } | null;
  onDismissLevelNotice?: () => void;
};

export function AppShell({ activePage, onNavigate, children, protagonistName, preferences, companionCharacterId, companionDisplayName, levelNotice, onDismissLevelNotice }: AppShellProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const primary = navigation.filter((item) => mobilePrimary.has(item.id));
  const secondary = navigation.filter((item) => !mobilePrimary.has(item.id));

  const navigate = (page: AppPage) => {
    onNavigate(page);
    setMoreOpen(false);
  };

  return (
    <div className="app-frame" data-accent={preferences?.accentColor ?? 'electric-blue'} data-theme="dark" data-motion={preferences?.reduceMotion ? 'reduced' : 'full'}>
      <aside className="sidebar" aria-label="Navegação principal">
        <div className="brand-lockup"><BrandMark className="brand-emblem" /><div><strong>TRAINING ARC</strong><span>JOURNEY SYSTEM</span></div></div>
        <p className="nav-caption">JORNADA</p>
        <nav className="side-links">
          {navigation.map((item) => <button key={item.id} className={`nav-link ${activePage === item.id ? 'active' : ''}`} aria-current={activePage === item.id ? 'page' : undefined} onClick={() => navigate(item.id)}><Icon name={item.icon} /><span>{item.label}</span>{item.id === 'training' && <i className="nav-live" />}</button>)}
        </nav>
        <div className="sidebar-bottom"><div className="sidebar-avatar">{(protagonistName?.trim().charAt(0) || 'P').toUpperCase()}</div><div><strong>{protagonistName || 'Protagonista'}</strong><span>Jornada em andamento</span></div></div>
      </aside>

      <div className="main-column">
        <header className="topbar"><div className="breadcrumb"><span>ARC 02</span><b>/</b><strong>{navigation.find((item) => item.id === activePage)?.label}</strong></div><div className="topbar-state"><span className="pulse" />SISTEMA ONLINE</div></header>
        <main id="main-content" className="page-content" tabIndex={-1}>{levelNotice && <div className="level-up-toast" role="status"><span aria-hidden="true">✦</span><div><strong>{levelNotice.to > levelNotice.from + 1 ? `Ascensão múltipla: níveis ${levelNotice.from + 1}–${levelNotice.to}` : `Nível ${levelNotice.to} alcançado`}</strong><small>Seu progresso foi salvo.</small></div><button type="button" aria-label="Dispensar aviso de nível" onClick={onDismissLevelNotice}>×</button></div>}{companionCharacterId && <AnimeCompanionPanel key={`${activePage}:${companionCharacterId}`} page={activePage} characterId={companionCharacterId} displayName={companionDisplayName} />}{children}</main>
      </div>

      <nav className="mobile-nav" aria-label="Navegação móvel">
        {primary.map((item) => <button key={item.id} className={`mobile-link ${activePage === item.id ? 'active' : ''}`} aria-current={activePage === item.id ? 'page' : undefined} onClick={() => navigate(item.id)}><Icon name={item.icon} /><span>{item.label}</span></button>)}
        <div className="mobile-more-wrap">
          <button className={`mobile-link ${moreOpen || secondary.some((item) => item.id === activePage) ? 'active' : ''}`} aria-expanded={moreOpen} aria-controls="mobile-more-menu" onClick={() => setMoreOpen((open) => !open)}><Icon name="more" /><span>Mais</span></button>
          {moreOpen && <div className="mobile-more-menu" id="mobile-more-menu">{secondary.map((item) => <button key={item.id} aria-current={activePage === item.id ? 'page' : undefined} onClick={() => navigate(item.id)}><Icon name={item.icon} />{item.label}</button>)}</div>}
        </div>
      </nav>
    </div>
  );
}
