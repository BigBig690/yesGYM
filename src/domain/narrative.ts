export type NarrativeContext =
  | 'opening' | 'workout-prep' | 'workout-start' | 'effort' | 'workout-complete'
  | 'record' | 'achievement' | 'return' | 'recovery' | 'progression' | 'companion';
export type NarrativeStyle = 'epic' | 'playful' | 'calm' | 'cinematic' | 'direct';

const LINES: Record<NarrativeContext, Record<'epic' | 'playful' | 'calm', readonly string[]>> = {
  opening: {
    epic: ['O próximo arco começa com a decisão de aparecer.', 'Toda jornada lendária começou antes do aplauso.', 'Seu capítulo de hoje ainda está em branco.'],
    playful: ['O protagonista chegou. O roteiro já está melhor.', 'Sem trilha sonora? Tudo bem, a jornada começa mesmo assim.', 'A aventura de hoje aceita um passo de cada vez.'],
    calm: ['Chegue como está. O próximo passo pode ser pequeno.', 'Não é preciso resolver a jornada toda hoje.', 'Um começo tranquilo também é um começo.'],
  },
  'workout-prep': {
    epic: ['Prepare o terreno: a próxima etapa será construída repetição por repetição.', 'Foco definido. Seu próximo capítulo está à espera.', 'A preparação também faz parte da evolução.'],
    playful: ['Água por perto, plano aberto e trilha imaginária pronta?', 'Seu eu de daqui a pouco agradece por organizar o treino.', 'A missão é sua. O aquecimento é o prólogo.'],
    calm: ['Organize o espaço e respeite seu ritmo.', 'Uma preparação simples pode deixar tudo mais leve.', 'Respire. Você não precisa ter pressa.'],
  },
  'workout-start': {
    epic: ['A sessão começa. Mostre ao seu limite que ele pode mudar.', 'Primeira série: a abertura de um novo arco.', 'A força se revela no compromisso com o próximo passo.'],
    playful: ['Começou! O episódio de hoje acaba de entrar no ar.', 'Uma série de cada vez. Sem pular para o final da temporada.', 'Aquecimento feito? Seu arco já ganhou ritmo.'],
    calm: ['Comece com atenção ao corpo e ao momento.', 'Uma repetição de cada vez é suficiente.', 'Encontre seu ritmo antes de buscar intensidade.'],
  },
  effort: {
    epic: ['Quando pesa, a técnica e a presença continuam sendo sua força.', 'Respire. O desafio é uma parte do caminho, não toda a história.', 'Persistência também sabe ajustar a rota.'],
    playful: ['Sem cenas de sacrifício: forma boa também é estilo.', 'Respira, protagonista. Seu arco não precisa de pressa.', 'A próxima repetição não precisa de discurso dramático.'],
    calm: ['Faça uma pausa se precisar. Seu corpo também participa da decisão.', 'Atenção e consistência valem mais do que correr.', 'Ajustar o ritmo também é seguir em frente.'],
  },
  'workout-complete': {
    epic: ['Treinamento concluído. O protagonista de amanhã agradece.', 'Você fechou este capítulo com presença. Guarde essa conquista.', 'O trabalho de hoje já faz parte da sua história.'],
    playful: ['Créditos do episódio de hoje: você apareceu e fez acontecer.', 'Treino encerrado. Agora o arco da recuperação entra em cena.', 'Missão de hoje concluída — sem precisar de explosão dramática.'],
    calm: ['Sessão concluída. Reserve um momento para reconhecer seu esforço.', 'Você fez o que pôde hoje. Recuperar também é cuidar.', 'Feche este capítulo com gentileza consigo.'],
  },
  record: {
    epic: ['Limite anterior superado. Um novo patamar aguarda.', 'Seu esforço abriu espaço para uma nova marca.', 'Este recorde registra um caminho que você construiu.'],
    playful: ['Novo recorde! A ficha de personagem acaba de ganhar uma nota.', 'O placar mudou porque você continuou tentando.', 'Um novo marco entrou para a temporada.'],
    calm: ['Uma nova marca apareceu. Reconheça o trabalho por trás dela.', 'Seu progresso tem um registro concreto hoje.', 'Você chegou a um ponto que antes ainda não existia.'],
  },
  achievement: {
    epic: ['Um título conquistado registra sua dedicação em forma de marco.', 'Este emblema tem a história do seu esforço.', 'Mais um sinal de que a jornada está avançando.'],
    playful: ['Novo emblema no inventário. Boa, protagonista.', 'Uma conquista que não veio por acaso.', 'Seu mural de marcos acaba de ganhar uma peça.'],
    calm: ['Uma conquista merece ser apreciada sem pressa.', 'Este marco reconhece a constância que você construiu.', 'Guarde este momento como parte da jornada.'],
  },
  return: {
    epic: ['Nem todo episódio termina em vitória. Alguns são sobre continuar a jornada.', 'Você voltou. Isso também é parte do arco.', 'A pausa fez parte da história; o retorno escreve a próxima página.'],
    playful: ['O protagonista voltou para a temporada. Sem resumo obrigatório.', 'Reentrada desbloqueada. Vamos no seu ritmo.', 'A série continua quando você estiver pronto.'],
    calm: ['Que bom ter você de volta. Retomar pode ser gradual.', 'Não há dívida a pagar: escolha apenas o próximo passo.', 'Você pode recomeçar de um jeito que faça sentido agora.'],
  },
  recovery: {
    epic: ['Recuperação é a preparação silenciosa do próximo arco.', 'Até a evolução precisa de espaço para acontecer.', 'Descanse: a jornada também avança nesse intervalo.'],
    playful: ['Até protagonistas precisam carregar a bateria.', 'A pausa é o intervalo entre dois episódios importantes.', 'Seu corpo pediu tela de descanso. Vale ouvir.'],
    calm: ['Descanso também faz parte do treinamento.', 'Permita que o corpo recupere sem cobrança.', 'Hoje, cuidar da energia já é um bom passo.'],
  },
  progression: {
    epic: ['A evolução se revela capítulo após capítulo.', 'O caminho percorrido também merece ser visto.', 'A continuidade transforma esforço em trajetória.'],
    playful: ['Cada capítulo deixa o protagonista um pouco mais experiente.', 'A jornada soma pontos de presença — sem placar inventado.', 'Olhe para trás só o bastante para notar o caminho.'],
    calm: ['O progresso pode ser discreto e ainda assim real.', 'Um passo consistente já conta.', 'Observe sua jornada com curiosidade, não cobrança.'],
  },
  companion: {
    epic: ['Estou ao seu lado para acompanhar cada capítulo.', 'A jornada é sua. Eu fico por perto quando precisar.', 'Vamos descobrir, um passo de cada vez, até onde você chega.'],
    playful: ['Eu cuido da narração; você escolhe o ritmo.', 'Pronta para acompanhar o próximo capítulo?', 'A aventura fica mais leve quando a gente segue junto.'],
    calm: ['Estou aqui, sem pressa e sem cobrança.', 'Conte comigo para acompanhar seus próximos passos.', 'Você pode seguir no seu próprio ritmo.'],
  },
};

const STYLE_ALIASES: Record<NarrativeStyle, 'epic' | 'playful' | 'calm'> = {
  epic: 'epic', playful: 'playful', calm: 'calm', cinematic: 'epic', direct: 'calm',
};

/** Seleção diária estável por contexto e estilo, sem embaralhar em cada renderização. */
export function getNarrative(context: NarrativeContext, date = new Date(), style: NarrativeStyle = 'epic'): string {
  const lines = LINES[context][STYLE_ALIASES[style]];
  const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
  const contextIndex = Object.keys(LINES).indexOf(context);
  return lines[Math.abs(day + contextIndex * 3) % lines.length] ?? lines[0]!;
}

export type CompanionPersonality = 'strategist' | 'enthusiast' | 'friendly-rival';
export type CompanionNarrativeContext = 'opening' | 'recovery' | 'return' | 'progression';
const COMPANION_LINES: Record<CompanionPersonality, Record<CompanionNarrativeContext, readonly string[]>> = {
  strategist: {
    opening: ['Plano claro, ritmo sustentável. Esse é um bom começo.', 'Vamos observar o cenário antes de escolher o próximo passo.'],
    recovery: ['Recuperar agora pode ser a decisão mais estratégica.', 'Seu corpo também faz parte do plano. Dê espaço para ele responder.'],
    return: ['Reentrada gradual: primeiro, entenda seu ritmo atual.', 'O plano pode recomeçar de onde você está hoje.'],
    progression: ['Consistência é uma estratégia que respeita o tempo.', 'Observe o caminho e ajuste a rota sem pressa.'],
  },
  enthusiast: {
    opening: ['Seu próximo capítulo já tem torcida!', 'A aventura pode começar com um passo pequeno. Estou animada!'],
    recovery: ['Pausa merecida! Vou guardar a torcida para quando você voltar.', 'Recuperação também merece aplausos.'],
    return: ['Que bom ver você de volta! Vamos no seu tempo.', 'Seu retorno já é um capítulo novo — sem cobrança.'],
    progression: ['Cada passo seu merece um pequeno brilho.', 'Olha quanta jornada cabe em continuar aparecendo!'],
  },
  'friendly-rival': {
    opening: ['Vou acompanhar seu ritmo — e torcer para você se surpreender.', 'Um capítulo novo? Aceito o desafio de torcer por você.'],
    recovery: ['Até rivais respeitam um bom intervalo para recuperar.', 'Hoje a disputa é descansar sem culpa. Eu apoio.'],
    return: ['De volta ao arco? Vamos aquecer a rivalidade com respeito.', 'A jornada retomou. Seu ritmo continua sendo seu.'],
    progression: ['Competir com o próprio ontem? Só se for com respeito.', 'Seu caminho está avançando. Vou ficar de olho, na torcida.'],
  },
};

export function getCompanionNarrative(personality: string | undefined, date = new Date(), context: CompanionNarrativeContext = 'opening'): string {
  const key: CompanionPersonality = personality === 'enthusiast' || personality === 'friendly-rival' ? personality : 'strategist';
  const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
  const lines = COMPANION_LINES[key][context];
  return lines[Math.abs(day) % lines.length] ?? lines[0]!;
}
