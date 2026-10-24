export type CompanionWork = 'The Quintessential Quintuplets' | 'My Dress-Up Darling' | 'The Fragrant Flower Blooms with Dignity';
export type CompanionMessageContext = 'opening' | 'preparation' | 'workout' | 'effort' | 'completed' | 'recovery' | 'return' | 'progression' | 'levelUp' | 'mission' | 'achievement' | 'evolution' | 'feature' | 'insufficient';

export type CompanionCharacter = {
  id: string;
  name: string;
  work: CompanionWork;
  personality: string;
  summary: string;
  messages: Record<CompanionMessageContext, readonly string[]>;
};

const sharedMessages = (name: string, lines: readonly [string, string, string, string, string, string, string, string], voice = 'com atenção ao seu próprio caminho'): CompanionCharacter['messages'] => {
  const variants = (original: string, context: string): readonly string[] => [original,
    `${name}: ${voice}; ${context} também se constrói com escolhas possíveis.`,
    `${name}: sem pressa — ${context} no seu ritmo continua valendo.`,
    `${name}: guarde este momento como parte da jornada; ${context} não exige perfeição.`];
  return {
    opening: variants(lines[0], 'um novo capítulo'), preparation: variants(lines[1], 'a preparação'),
    workout: variants(lines[2], 'o treino'), effort: variants(lines[3], 'o esforço'), completed: variants(lines[4], 'a conclusão'),
    recovery: variants(lines[5], 'o descanso'), return: variants(lines[6], 'o retorno'), progression: variants(lines[7], 'a evolução'),
    levelUp: variants(`${name}: novo patamar alcançado; a jornada segue no seu ritmo.`, 'a mudança de nível'),
    mission: variants(`${name}: objetivo concluído de verdade. Sua recompensa está registrada.`, 'a missão'),
    achievement: variants(`${name}: este marco foi desbloqueado e já faz parte da sua história.`, 'a conquista'),
    evolution: variants(`${name}: há registros em momentos diferentes; sua trajetória pode ser comparada.`, 'a evolução registrada'),
    feature: variants(`${name}: explore esta área quando ela for útil para sua jornada.`, 'a novidade'),
    insufficient: variants(`${name}: ainda há poucos registros para comparar. Mais dados reais virão com o tempo.`, 'o histórico'),
  };
};

export const COMPANION_CHARACTERS: readonly CompanionCharacter[] = [
  { id: 'ichika-nakano', name: 'Ichika Nakano', work: 'The Quintessential Quintuplets', personality: 'Confiante, observadora e bem-humorada.', summary: 'Uma presença experiente que incentiva você a levar sua própria jornada a sério.', messages: sharedMessages('Ichika', ['Qual é o plano para este capítulo?', 'Preparação feita. Agora, um passo de cada vez.', 'Vamos encontrar o ritmo que funciona para você.', 'O esforço de hoje tem seu próprio valor.', 'Cena encerrada. Você fez sua parte.', 'Até uma protagonista precisa de uma pausa entre as cenas.', 'Voltar já é um bom começo.', 'Seu progresso está sendo construído capítulo por capítulo.'], 'com olhar atento e um toque de humor') },
  { id: 'nino-nakano', name: 'Nino Nakano', work: 'The Quintessential Quintuplets', personality: 'Direta, determinada e cuidadosa com quem importa.', summary: 'Uma voz firme, que lembra que consistência também pode ser um gesto de cuidado.', messages: sharedMessages('Nino', ['Vamos cuidar do que está ao seu alcance hoje.', 'Sem pressa: organize o espaço e comece quando estiver pronto.', 'Concentre-se em uma série por vez.', 'Firmeza também é respeitar seus limites.', 'Treino encerrado. Boa dedicação.', 'Recuperar faz parte de cuidar do corpo.', 'Não precisa compensar a pausa. Só retome no seu tempo.', 'Pequenos compromissos repetidos viram progresso.'], 'com firmeza e cuidado') },
  { id: 'miku-nakano', name: 'Miku Nakano', work: 'The Quintessential Quintuplets', personality: 'Reservada, curiosa e perseverante.', summary: 'Uma companheira tranquila para os dias em que aparecer já é uma conquista pessoal.', messages: sharedMessages('Miku', ['Podemos começar em silêncio, no seu ritmo.', 'Deixe tudo pronto e escolha seu primeiro passo.', 'Uma série de cada vez. Você não precisa correr.', 'Persistir também pode ser algo calmo.', 'Você chegou ao fim do treino de hoje.', 'Descanso é parte do treinamento.', 'Que bom ter você de volta. Recomece com gentileza.', 'A jornada continua mesmo quando o avanço é discreto.'], 'com calma e curiosidade') },
  { id: 'yotsuba-nakano', name: 'Yotsuba Nakano', work: 'The Quintessential Quintuplets', personality: 'Entusiasmada, generosa e cheia de energia.', summary: 'Energia acolhedora para celebrar a decisão de comparecer, sem cobrar desempenho.', messages: sharedMessages('Yotsuba', ['Ei, você chegou! Vamos fazer o melhor possível hoje.', 'Prepare tudo com calma e escolha por onde começar.', 'Vamos nessa, no ritmo que seu corpo pedir!', 'Continue com atenção; cada esforço conta.', 'Treino concluído! Valeu por aparecer hoje!', 'Pausa merecida. Hidratação e recuperação também contam.', 'Que bom ver você por aqui de novo. Sem cobrança!', 'Um passo de cada vez e a jornada ganha força.'], 'com entusiasmo e acolhimento') },
  { id: 'itsuki-nakano', name: 'Itsuki Nakano', work: 'The Quintessential Quintuplets', personality: 'Responsável, aplicada e atenciosa.', summary: 'Uma companhia ponderada, que incentiva planejamento e cuidado durante a jornada.', messages: sharedMessages('Itsuki', ['Vamos começar com uma intenção clara para hoje.', 'Confira seu espaço e siga o plano sem se apressar.', 'Mantenha a atenção no movimento e nos seus registros.', 'Consistência inclui reconhecer seus limites.', 'Você cumpriu o treino que planejou para hoje.', 'Uma boa recuperação ajuda a cuidar da próxima sessão.', 'Retome quando estiver pronto; não há dívida a pagar.', 'O progresso é resultado de cuidado e continuidade.'], 'com planejamento e atenção') },
  { id: 'marin-kitagawa', name: 'Marin Kitagawa', work: 'My Dress-Up Darling', personality: 'Expressiva, criativa e encorajadora.', summary: 'Uma presença vibrante que incentiva você a deixar a jornada com a sua cara.', messages: sharedMessages('Marin', ['Esse capítulo é seu. Faça do seu jeito!', 'Ajuste o que precisar para se sentir à vontade.', 'Curta o processo e registre o que realmente rolou.', 'Seu esforço não precisa parecer com o de ninguém.', 'Você mandou bem em aparecer e concluir!', 'Recuperar também é uma escolha inteligente.', 'Voltar no seu ritmo combina com a sua jornada.', 'Cada capítulo acrescenta algo à sua própria história.'], 'com energia criativa e espontânea') },
  { id: 'wakana-gojo', name: 'Wakana Gojo', work: 'My Dress-Up Darling', personality: 'Gentil, paciente e dedicado ao ofício.', summary: 'Uma companhia serena que valoriza atenção, prática e respeito ao próprio ritmo.', messages: sharedMessages('Wakana', ['Vamos trabalhar com atenção, sem exigir perfeição.', 'Prepare o que precisar; um começo simples basta.', 'Cuide da execução e anote somente o que fez.', 'Prática paciente também é progresso.', 'Bom trabalho. Você concluiu o treino de hoje.', 'Dar tempo ao corpo também é cuidar do processo.', 'Retomar com calma é suficiente.', 'Habilidade e força crescem com prática consistente.'], 'com paciência e atenção aos detalhes') },
  { id: 'kaoruko-waguri', name: 'Kaoruko Waguri', work: 'The Fragrant Flower Blooms with Dignity', personality: 'Afetuosa, otimista e respeitosa.', summary: 'Uma presença calorosa que oferece incentivo sem transformar treino em obrigação.', messages: sharedMessages('Kaoruko', ['Espero que este momento seja bom para você.', 'Comece do jeito que deixar o treino confortável.', 'Estou torcendo por você, série após série.', 'Lembre-se de tratar seu corpo com gentileza.', 'Você terminou o que podia fazer hoje. Obrigada por isso.', 'Descanse sem culpa; cuidar de si também importa.', 'Fico feliz que tenha voltado. Vá com calma.', 'Toda pequena continuidade merece espaço.'], 'com calor e respeito, sem cobrança') },
  { id: 'rintaro-tsumugi', name: 'Rintaro Tsumugi', work: 'The Fragrant Flower Blooms with Dignity', personality: 'Reservado, honesto e leal.', summary: 'Uma voz discreta que reconhece o esforço sem exagerar as expectativas.', messages: sharedMessages('Rintaro', ['Não precisa provar nada. Só comece se fizer sentido.', 'Organize seu treino e siga no seu tempo.', 'Faça o que está planejado e registre com honestidade.', 'Um limite respeitado também é uma boa decisão.', 'Sessão encerrada. Você apareceu e fez o seu.', 'Recuperação não precisa de justificativa.', 'Tudo bem voltar aos poucos.', 'A continuidade vale mais que uma performance perfeita.'], 'com franqueza discreta e lealdade') },
];

const LEGACY_IDS: Readonly<Record<string, string>> = { miku: 'miku-nakano' };
const REMOVED_SELECTION_IDS: ReadonlySet<string> = new Set(['naruto-uzumaki', 'tanjiro-kamado', 'monkey-d-luffy']);

/** Keep data saved by the brief-lived action-character gallery while selecting a valid romantic-series character. */
export function normalizeRemovedCompanionSelection<T extends { characterId: string; displayName: string }>(selection: T): T {
  if (!REMOVED_SELECTION_IDS.has(selection.characterId)) return selection;
  return { ...selection, characterId: 'yotsuba-nakano', displayName: 'Yotsuba Nakano' };
}

export function normalizeRemovedCompanionData<T extends { companion: { characterId: string; displayName: string } }>(data: T): T {
  const companion = normalizeRemovedCompanionSelection(data.companion);
  return companion === data.companion ? data : { ...data, companion };
}

export function getCompanionCharacter(characterId: string): CompanionCharacter {
  const canonicalId = LEGACY_IDS[characterId] ?? characterId;
  return COMPANION_CHARACTERS.find((character) => character.id === canonicalId) ?? COMPANION_CHARACTERS[3]!;
}

export function getCompanionMessage(characterId: string, context: CompanionMessageContext, date = new Date()): string {
  const character = getCompanionCharacter(characterId);
  const lines = character.messages[context];
  const day = Math.floor(date.getTime() / 86_400_000);
  return lines[Math.abs(day) % lines.length]!;
}
