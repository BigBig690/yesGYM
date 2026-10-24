import type { Routine, RoutineExercise, WarmupPlan } from './models';

export type ExerciseCatalogEntry = {
  id: string; name: string; alternateNames: string[]; primaryMuscles: string[]; secondaryMuscles: string[];
  equipment: string[]; movement: string; type: 'composto' | 'isolado'; bodyweight: boolean;
  instructions: string[]; tips: string[]; sourceName: string; sourceUrl: string; imageId: string;
};

const repdb = 'https://github.com/RepDB/exercise-dataset';
const row = (id: string, name: string, alternateNames: string, primaryMuscles: string, secondaryMuscles: string,
  equipment: string, movement: string, type: 'composto' | 'isolado', instructions: string[], tips: string[] = [], bodyweight = false): ExerciseCatalogEntry => ({
  id, name, alternateNames: alternateNames ? alternateNames.split('|') : [], primaryMuscles: primaryMuscles.split('|'),
  secondaryMuscles: secondaryMuscles ? secondaryMuscles.split('|') : [], equipment: equipment ? equipment.split('|') : [],
  movement, type, bodyweight, instructions, tips, sourceName: 'RepDB Free Exercise Dataset', sourceUrl: repdb, imageId: id,
});

export const EXERCISE_CATALOG: readonly ExerciseCatalogEntry[] = [
  row('bench-press','Supino reto com barra','supino reto|barbell bench press','Peitoral maior','Deltoide anterior|Tríceps','Barra|Banco reto','Empurrar horizontal','composto',['Deite no banco com os olhos sob a barra.','Segure um pouco além da largura dos ombros.','Desça a barra até a região média do peito.','Empurre até estender os braços com controle.'],['Mantenha os pés apoiados e estáveis.']),
  row('barbell-row','Remada curvada com barra','remada curvada|bent-over barbell row','Latíssimo do dorso|Romboides','Bíceps|Deltoide posterior','Barra','Puxar horizontal','composto',['Incline o tronco pelo quadril com leve flexão dos joelhos.','Segure a barra um pouco além dos ombros.','Puxe em direção à parte inferior do peito.','Desça a barra com controle.'],['Evite embalar o tronco.']),
  row('dumbbell-shoulder-press','Desenvolvimento com halteres','desenvolvimento|dumbbell shoulder press','Deltoide anterior|Deltoide lateral','Trapézio|Tríceps','Halteres','Empurrar vertical','composto',['Comece com os halteres na altura dos ombros.','Empurre acima da cabeça sem arquear a lombar.','Retorne os halteres com controle.'],['Mantenha punhos alinhados aos cotovelos.']),
  row('lat-pulldown','Puxada frontal','puxada alta|lat pulldown','Latíssimo do dorso','Bíceps|Deltoide posterior|Romboides','Polia alta','Puxar vertical','composto',['Sente-se com as coxas estabilizadas sob o apoio.','Segure a barra e puxe em direção à parte alta do peito.','Retorne à posição inicial com controle.'],['Conduza o movimento pelos cotovelos.']),
  row('lateral-raise','Elevação lateral','elevação lateral com halteres|dumbbell lateral raise','Deltoide lateral','Deltoide anterior','Halteres','Abdução do ombro','isolado',['Fique em pé com os halteres ao lado do corpo.','Eleve os braços lateralmente até aproximadamente a altura dos ombros.','Desça com controle.'],['Mantenha leve flexão nos cotovelos.']),
  row('incline-db-press','Supino inclinado com halteres','incline dumbbell press','Peitoral maior','Deltoide anterior|Tríceps','Halteres|Banco inclinado','Empurrar inclinado','composto',['Ajuste o banco inclinado e posicione halteres junto aos ombros.','Empurre os halteres para cima e levemente para dentro.','Desça com controle até a altura dos ombros.']),
  row('seated-cable-row','Remada baixa','remada sentada no cabo|seated cable row','Latíssimo do dorso|Romboides','Bíceps|Eretores da coluna|Deltoide posterior','Polia baixa','Puxar horizontal','composto',['Sente-se com os pés nos apoios e segure o puxador.','Puxe em direção ao abdômen inferior.','Estenda os braços de volta sem perder o controle.'],['Mantenha o tronco estável.']),
  row('cable-fly','Crucifixo no cabo','crossover|cable fly','Peitoral maior','Deltoide anterior','Polias','Adução horizontal','isolado',['Fique entre as polias com os cabos posicionados.','Abra os braços com cotovelos levemente flexionados.','Traga as mãos à frente do peito em arco.','Retorne controlando o alongamento.']),
  row('single-arm-db-row','Remada unilateral com halter','single-arm dumbbell row','Latíssimo do dorso|Romboides','Bíceps|Deltoide posterior','Halter|Banco','Puxar horizontal unilateral','composto',['Apoie uma mão e um joelho no banco.','Com o outro braço, puxe o halter em direção ao quadril.','Desça até estender o braço com controle.','Repita do outro lado.'],['Evite girar o tronco.']),
  row('barbell-curl','Rosca direta','barbell curl|rosca com barra','Bíceps braquial','Braquial|Flexores do antebraço','Barra','Flexão do cotovelo','isolado',['Segure a barra com pegada supinada na largura dos ombros.','Flexione os cotovelos trazendo a barra em direção aos ombros.','Desça com controle.'],['Evite balançar o tronco.']),
  row('leg-press','Leg press','leg press machine','Glúteo máximo|Quadríceps','Posteriores da coxa','Máquina de leg press','Agachar guiado','composto',['Sente-se com os pés na plataforma aproximadamente à largura dos ombros.','Desça flexionando os joelhos dentro de uma amplitude confortável.','Empurre a plataforma sem travar os joelhos.'],['Mantenha quadris e lombar apoiados.']),
  row('romanian-deadlift','Levantamento terra romeno','terra romeno com barra|romanian deadlift','Glúteo máximo|Posteriores da coxa','Eretores da coluna','Barra','Dobradiça de quadril','composto',['Segure a barra à frente das coxas.','Leve o quadril para trás mantendo leve flexão dos joelhos.','Desça a barra junto às pernas até sentir alongamento confortável.','Estenda o quadril para retornar.'],['Mantenha a coluna neutra.']),
  row('leg-extension','Cadeira extensora','extensão de joelhos|leg extension','Quadríceps','','Cadeira extensora','Extensão do joelho','isolado',['Sente-se e ajuste o apoio próximo aos tornozelos.','Estenda os joelhos com controle.','Retorne sem deixar a carga despencar.'],['Ajuste o eixo da máquina ao joelho.']),
  row('leg-curl','Mesa flexora','flexora deitada|lying leg curl','Posteriores da coxa','Gastrocnêmio','Mesa flexora','Flexão do joelho','isolado',['Deite-se na máquina com os tornozelos sob o rolo.','Flexione os joelhos levando os calcanhares em direção aos glúteos.','Retorne lentamente.'],['Mantenha os quadris apoiados.']),
  row('standing-calf-raise','Panturrilha em pé','standing calf raise','Gastrocnêmio','Sóleo','Máquina de panturrilha em pé','Flexão plantar','isolado',['Posicione os pés na plataforma ou máquina.','Eleve os calcanhares apoiando-se na ponta dos pés.','Desça os calcanhares com controle.']),
  row('hack-squat','Agachamento no hack','hack squat','Glúteo máximo|Quadríceps','Gastrocnêmio|Posteriores da coxa','Máquina hack','Agachar guiado','composto',['Apoie costas e ombros nos suportes da máquina.','Posicione os pés na plataforma.','Flexione joelhos e quadris dentro de amplitude controlada.','Empurre a plataforma para retornar.'],['Mantenha a lombar apoiada.']),
  row('hip-thrust','Elevação pélvica com barra','barbell hip thrust|hip thrust','Glúteo máximo|Glúteo médio','Posteriores da coxa','Barra|Banco','Extensão do quadril','composto',['Apoie a parte superior das costas em um banco e a barra sobre o quadril.','Eleve o quadril até alinhar as coxas ao tronco.','Desça com controle.'],['Evite hiperestender a lombar.']),
  row('seated-leg-curl','Cadeira flexora','flexora sentada|seated leg curl','Posteriores da coxa','Gastrocnêmio','Cadeira flexora','Flexão do joelho','isolado',['Ajuste encosto e rolo para alinhar ao joelho.','Flexione os joelhos contra o apoio.','Retorne lentamente à posição inicial.']),
  row('smith-machine-reverse-lunge','Afundo reverso no Smith','afundo no smith|smith reverse lunge','Glúteo máximo|Quadríceps','Glúteo médio|Posteriores da coxa','Máquina Smith','Avanço unilateral para trás','composto',['Posicione a barra apoiada nos trapézios e destrave.','Dê um passo para trás e flexione as pernas com controle.','Empurre pelo pé da frente para retornar.'],['Ajuste a passada para manter estabilidade.']),
  row('seated-calf-raise','Panturrilha sentada','seated calf raise','Sóleo','Gastrocnêmio','Máquina de panturrilha sentada','Flexão plantar','isolado',['Sente-se com o apoio sobre as coxas.','Eleve os calcanhares e depois desça com controle.']),
  row('db-bench-press','Supino reto com halteres','dumbbell bench press','Peitoral maior','Deltoide anterior|Tríceps','Halteres|Banco reto','Empurrar horizontal','composto',['Deite no banco com os halteres à altura do peito.','Empurre até estender os braços.','Desça lentamente.']),
  row('chest-supported-db-row','Remada com peito apoiado','chest-supported dumbbell row','Latíssimo do dorso|Romboides','Bíceps|Deltoide posterior','Halteres|Banco inclinado','Puxar horizontal','composto',['Deite de frente em banco inclinado com os halteres abaixo.','Puxe os halteres em direção às laterais do tronco.','Desça com controle.']),
  row('cable-lateral-raise','Elevação lateral na polia','cable lateral raise','Deltoide lateral','Deltoide anterior|Trapézio','Polia baixa','Abdução do ombro','isolado',['Fique de lado para uma polia baixa e segure a alça com a mão oposta.','Eleve o braço lateralmente até aproximadamente paralelo ao chão.','Desça com controle.']),
  row('dumbbell-romanian-deadlift','Terra romeno com halteres','dumbbell romanian deadlift','Glúteo máximo|Posteriores da coxa','Eretores da coluna|Flexores do antebraço','Halteres','Dobradiça de quadril','composto',['Segure halteres à frente das coxas com joelhos levemente flexionados.','Leve o quadril para trás e desça os halteres junto às pernas.','Estenda o quadril para retornar.']),
  row('bodyweight-reverse-lunge','Afundo reverso sem carga','bodyweight reverse lunge|avanço para trás','Glúteo máximo|Quadríceps','Posteriores da coxa','','Avanço unilateral para trás','composto',['Fique em pé e dê um passo para trás.','Flexione as pernas em movimento controlado.','Empurre pelo pé da frente para voltar e alterne os lados.'],[],true),
  row('chest-press-machine','Supino na máquina','machine chest press','Peitoral maior','Deltoide anterior|Tríceps','Máquina de supino','Empurrar horizontal','composto',['Sente-se com as costas apoiadas e alças na altura do peito.','Empurre as alças à frente.','Retorne lentamente.']),
];

export function findCatalogExercise(id: string | undefined): ExerciseCatalogEntry | undefined {
  return id ? EXERCISE_CATALOG.find((exercise) => exercise.id === id) : undefined;
}
export function searchExerciseCatalog(query: string, filters: { muscle?: string; equipment?: string; type?: string; movement?: string; bodyweight?: boolean; illustrated?: boolean } = {}): ExerciseCatalogEntry[] {
  const needle = query.trim().toLocaleLowerCase('pt-BR');
  return EXERCISE_CATALOG.filter((exercise) => (!needle || [exercise.name, ...exercise.alternateNames, ...exercise.primaryMuscles, ...exercise.secondaryMuscles, ...exercise.equipment, exercise.movement].some((term) => term.toLocaleLowerCase('pt-BR').includes(needle)))
    && (!filters.muscle || [...exercise.primaryMuscles, ...exercise.secondaryMuscles].includes(filters.muscle))
    && (!filters.equipment || exercise.equipment.includes(filters.equipment))
    && (!filters.type || exercise.type === filters.type)
    && (!filters.movement || exercise.movement === filters.movement)
    && (filters.bodyweight !== true || exercise.bodyweight)
    && (filters.illustrated !== true || Boolean(exercise.imageId)));
}
const aliases: Record<string, string> = {
  'supino reto com barra':'bench-press','remada curvada com barra':'barbell-row','desenvolvimento com halteres':'dumbbell-shoulder-press',
  'puxada frontal':'lat-pulldown','elevação lateral':'lateral-raise','supino inclinado com halteres':'incline-db-press','remada baixa':'seated-cable-row',
  'crucifixo no cabo':'cable-fly','remada unilateral com halter':'single-arm-db-row','rosca direta':'barbell-curl','leg press':'leg-press',
  'levantamento terra romeno':'romanian-deadlift','cadeira extensora':'leg-extension','mesa flexora':'leg-curl','panturrilha em pé':'standing-calf-raise',
  'agachamento no hack':'hack-squat','elevação pélvica com barra':'hip-thrust','cadeira flexora':'seated-leg-curl','afundo reverso no smith':'smith-machine-reverse-lunge','panturrilha sentada':'seated-calf-raise',
};
export function catalogEntryForRoutineExercise(exercise: Pick<RoutineExercise, 'catalogExerciseId' | 'name'>): ExerciseCatalogEntry | undefined {
  return findCatalogExercise(exercise.catalogExerciseId) ?? findCatalogExercise(aliases[exercise.name.trim().toLocaleLowerCase('pt-BR')]);
}

export function defaultWarmupPlan(routine: Routine): WarmupPlan {
  const specific = routine.id === 'routine-upper-a' ? 'Prepare empurrar horizontal, remada e movimentos acima da cabeça com movimentos leves e controlados.'
    : routine.id === 'routine-upper-b' ? 'Familiarize-se com empurrar inclinado, remadas e adução dos braços, sem gerar fadiga.'
      : routine.id === 'routine-lower-a' ? 'Prepare os padrões de leg press, extensão de joelho e dobradiça de quadril com amplitude confortável.'
        : routine.id === 'routine-lower-b' ? 'Familiarize-se com agachar guiado, extensão do quadril, flexão do joelho e passada para trás.'
          : routine.exercises.length ? `Faça movimentos leves e confortáveis relacionados a ${[...new Set(routine.exercises.map((e) => catalogEntryForRoutineExercise(e)?.primaryMuscles[0]).filter(Boolean))].join(', ')}. Se os metadados forem insuficientes, use uma preparação geral e ajuste esta orientação.`
            : 'Os metadados desta ficha não permitem sugerir uma preparação específica. Use movimentos gerais confortáveis e edite esta orientação se desejar.';
  const defaults: WarmupPlan = [
    { id: 'general', title: 'Preparação geral', instructions: 'Faça alguns minutos de movimento leve disponível para você; caminhada ou bicicleta ergométrica são opções se houver acesso.' },
    { id: 'specific', title: 'Preparação específica', instructions: specific },
    { id: 'preparatory', title: 'Séries preparatórias', instructions: 'Quando apropriado, use algumas séries progressivas leves nos movimentos principais. Ajuste à experiência e à carga do dia; não existe carga universal e não é necessário buscar esforço máximo.' },
  ];
  return defaults.map((stage) => routine.warmupPlan?.find((custom) => custom.id === stage.id) ?? stage);
}
