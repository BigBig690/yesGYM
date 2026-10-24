import { Icon } from '../../components/Icon';
import type { AppPage } from '../../components/AppShell';

const content: Partial<Record<Exclude<AppPage, 'dashboard'>, { eyebrow: string; title: string; description: string; icon: 'routines' | 'training' | 'history' | 'statistics' | 'chart' | 'progression' | 'companion' | 'settings' | 'spark' | 'trophy' }>> = {
  exercises: { eyebrow: 'BIBLIOTECA · MOVIMENTOS', title: 'Catálogo de exercícios', description: 'Consulte movimentos, músculos, equipamentos e instruções.', icon: 'routines' },
  routines: { eyebrow: 'CENTRO DE PREPARAÇÃO', title: 'Suas rotinas aguardam o primeiro capítulo.', description: 'Upper A, Upper B, Lower A e Lower B estarão disponíveis para configurar e usar em uma próxima etapa.', icon: 'routines' },
  plan: { eyebrow: 'AGENDA SEMANAL', title: 'Agenda & sequência', description: 'Planeje a semana e organize a ordem das fichas.', icon: 'chart' },
  training: { eyebrow: 'SESSÃO DE TREINO', title: 'O espaço de treino está sendo preparado.', description: 'O registro de séries e a conclusão de sessões serão implementados em uma próxima etapa. Seus dados não serão simulados aqui.', icon: 'training' },
  history: { eyebrow: 'REGISTROS DA JORNADA', title: 'Cada sessão deixará sua marca aqui.', description: 'Quando houver sessões concluídas, o histórico aparecerá nesta área. Por enquanto, nenhum registro foi criado.', icon: 'history' },
  statistics: { eyebrow: 'DADOS REAIS · ARC 06', title: 'Suas estatísticas aguardam os registros.', description: 'Conclua sessões para consultar frequência, volume, recordes e evolução real.', icon: 'statistics' },
  workbook: { eyebrow: 'FICHA ORGANIZADA · ARC 12', title: 'Planilha de treino', description: 'Consulte fichas, músculos e os últimos registros por exercício.', icon: 'routines' },
  evolution: { eyebrow: 'REGISTROS POR MOVIMENTO · ARC 12', title: 'Evolução de desempenho', description: 'Compare sessões do mesmo exercício usando os registros concluídos.', icon: 'chart' },
  muscles: { eyebrow: 'DISTRIBUIÇÃO OBSERVÁVEL · ARC 12', title: 'Mapa muscular', description: 'Consulte a distribuição dos exercícios registrados por grupo muscular.', icon: 'progression' },
  progression: { eyebrow: 'EVOLUÇÃO', title: 'Seu próximo patamar está por definir.', description: 'O painel de nível e XP aparecerá quando as regras de progressão forem implementadas. Nenhum valor de evolução é estimado.', icon: 'progression' },
  missions: { eyebrow: 'OBJETIVOS', title: 'Central de missões', description: 'Acompanhe metas reais e resgate recompensas uma única vez.', icon: 'spark' },
  medals: { eyebrow: 'COLEÇÃO', title: 'Medalhas & títulos', description: 'Marcos calculados a partir das sessões concluídas.', icon: 'trophy' },
  companion: { eyebrow: 'COMPANHEIRA DE JORNADA', title: 'Uma presença para acompanhar seus capítulos.', description: 'A representação inicial está no dashboard. Personalidade, reações e interações serão adicionadas depois.', icon: 'companion' },
  settings: { eyebrow: 'PREFERÊNCIAS', title: 'Seu sistema, do seu jeito.', description: 'Os campos para personalização estão preparados nos modelos. Os controles serão disponibilizados quando puderem salvar as escolhas.', icon: 'settings' },
};

type PlaceholderPageProps = { page: Exclude<AppPage, 'dashboard'> };

export function PlaceholderPage({ page }: PlaceholderPageProps) {
  const pageContent = content[page] ?? content.progression!;
  return <section className="placeholder-page" aria-labelledby="placeholder-title"><div className="placeholder-symbol"><Icon name={pageContent.icon} /></div><p className="eyebrow">{pageContent.eyebrow}</p><h1 id="placeholder-title">{pageContent.title}</h1><p>{pageContent.description}</p><div className="coming-tag"><span /> ETAPA FUTURA</div></section>;
}
