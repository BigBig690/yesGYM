import { getCompanionCharacter } from '../domain/companionCatalog';
import type { AppPage } from './AppShell';
import { CompanionPortrait } from '../features/companion/CompanionPortrait';

type CompanionPageContext = { label: string; note: string; stamp: string };

/** Page-specific captions keep the selected character useful without claiming an event that did not happen. */
export const COMPANION_PAGE_CONTEXTS: Partial<Record<AppPage, CompanionPageContext>> = {
  routines: { label: 'ESCOLHA SUA PRÓXIMA CENA', note: 'Organize suas fichas e siga o plano que combina com a sua jornada.', stamp: 'FICHAS' },
  exercises: { label: 'NOTAS DE MOVIMENTO', note: 'Explore o catálogo e confira os detalhes antes de ajustar uma ficha.', stamp: 'BIBLIOTECA' },
  training: { label: 'UM PASSO DE CADA VEZ', note: 'Registre o que realmente realizou e use os controles no seu ritmo.', stamp: 'SESSÃO' },
  history: { label: 'DIÁRIO DA JORNADA', note: 'O histórico mantém os registros das sessões que você concluiu.', stamp: 'REGISTROS' },
  plan: { label: 'PLANEJE COM CALMA', note: 'Uma semana pode incluir treino, descanso ou dias ainda sem configuração.', stamp: 'AGENDA' },
  statistics: { label: 'LEITURA DOS REGISTROS', note: 'Os resumos desta página são calculados a partir dos dados disponíveis.', stamp: 'ESTATÍSTICAS' },
  workbook: { label: 'FICHA À VISTA', note: 'Compare o planejamento com o último desempenho registrado, sem misturá-los.', stamp: 'PLANILHA' },
  evolution: { label: 'CAPÍTULO A CAPÍTULO', note: 'Compare o mesmo exercício quando houver registros válidos suficientes.', stamp: 'EVOLUÇÃO' },
  muscles: { label: 'MAPA DE TREINO', note: 'As regiões destacadas vêm de séries concluídas associadas ao catálogo.', stamp: 'MAPA' },
  progression: { label: 'SUA JORNADA, SEU RITMO', note: 'Progressão e marcos refletem as regras e os registros salvos no aplicativo.', stamp: 'PROGRESSÃO' },
  missions: { label: 'OBJETIVOS DA JORNADA', note: 'Confira metas, progresso e recompensas conforme os dados registrados.', stamp: 'MISSÕES' },
  medals: { label: 'MARCOS REGISTRADOS', note: 'Os emblemas aparecem quando seus critérios reais são alcançados.', stamp: 'COLEÇÃO' },
  settings: { label: 'PERSONALIZE SEU ESPAÇO', note: 'Ajuste preferências, companheira e seus dados locais com tranquilidade.', stamp: 'PREFERÊNCIAS' },
};

type AnimeCompanionPanelProps = {
  page: AppPage;
  characterId: string;
  displayName?: string;
};

export function AnimeCompanionPanel({ page, characterId, displayName }: AnimeCompanionPanelProps) {
  const context = COMPANION_PAGE_CONTEXTS[page];
  if (!context) return null;

  const character = getCompanionCharacter(characterId);
  return (
    <aside className={`anime-companion-panel anime-companion-panel--${page}`} aria-label={`${character.name} na página ${context.stamp.toLocaleLowerCase('pt-BR')}`}>
      <div className="anime-companion-art-wrap">
        <CompanionPortrait character={character} displayName={displayName || character.name} mode="card" className="anime-companion-art" eager />
        <span className="anime-companion-art-sticker" aria-hidden="true">✦</span>
      </div>
      <div className="anime-companion-copy">
        <span className="anime-companion-kicker"><i aria-hidden="true" /> {context.label}</span>
        <strong>{displayName || character.name}</strong>
        <span className="anime-companion-franchise">{character.work}</span>
        <p>{context.note}</p>
      </div>
      <span className="anime-companion-stamp" aria-hidden="true">{context.stamp}</span>
      <span className="anime-companion-spark anime-companion-spark--one" aria-hidden="true">✧</span>
      <span className="anime-companion-spark anime-companion-spark--two" aria-hidden="true">✿</span>
    </aside>
  );
}
