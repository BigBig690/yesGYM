# Training Arc 2.0

Exercise data by [RepDB](https://repdb.co)

Training Arc 2.0 é uma aplicação local para acompanhar uma jornada de treino com identidade original inspirada em progressão de anime e RPG. A interface tem navegação responsiva, dashboard baseado em registros reais e um sistema editável de rotinas. As alterações são armazenadas no `localStorage` do navegador.

## Requisitos

- Node.js 20.19+ ou 22.12+
- npm

## Instalação e execução

```bash
npm install
npm run dev
```

O Vite informará o endereço local no terminal.

## Verificações

```bash
npm test
npm run typecheck
npm run build
```

## Persistência

Os dados são guardados somente no `localStorage` do navegador, sob uma chave centralizada. O formato contém `schemaVersion`; dados ausentes geram um estado inicial em memória. Dados inválidos ou de versão incompatível são retornados como erro e não são substituídos automaticamente.

## Escopo atual

- Dashboard com saudação, sessões concluídas, atalhos para as rotinas e estados vazios.
- Navegação por barra lateral no desktop e barra inferior no celular.
- Rotinas Upper A, Upper B, Lower A e Lower B com exercícios iniciais editáveis.
- Criação, edição, remoção, duplicação e reorganização de rotinas e exercícios.
- Persistência local de rotinas; exclusão de uma rotina preserva sessões históricas.
- Execução de sessões a partir de uma rotina, com cópia imutável do planejamento no início, registro/editabilidade de séries e validação dos valores realizados.
- Salvamento automático da sessão em andamento e recuperação após recarregar o aplicativo, incluindo recuperação de descanso por timestamps.
- Cronômetro de descanso opcional, com início, pausa, retomada, ajuste, reinício e encerramento.
- Finalização e descarte confirmados; sessões finalizadas entram no Histórico e sessões descartadas não são contadas como treinos.
- Histórico cronológico com detalhes reais das séries, preservados independentemente de mudanças posteriores nas rotinas.
- Estatísticas calculadas sem duplicar ou persistir o histórico: sessões finalizadas, séries marcadas como concluídas, volume com valores completos, duração, frequência semanal local, tendências por ID de exercício, recordes e calendário mensal.
- Agenda recorrente semanal opcional em **Agenda**: cada dia fica sem configuração até o usuário escolher uma ficha ou descanso; a edição dos sete dias é salva como uma mudança única. A navegação entre semanas usa datas locais e sessões registradas, sem fingir que a agenda atual existia em semanas anteriores.
- Sequência configurável de fichas, independente da agenda. Ela avança uma vez somente ao concluir a próxima rotina esperada; sessões antigas são marcadas como já existentes ao criar uma sequência, conclusões fora de ordem são registradas sem avançar, e sessões preservam seus próprios snapshots.
- Definições estatísticas: volume por série = carga em kg × repetições; volume total soma apenas séries concluídas com ambos os valores válidos e é exibido como kg·reps (não equivale ao trabalho fisiológico total). Série sem carga continua na contagem de séries e fica explicitamente fora do volume. Duração usa `durationSeconds` salvo ou, se ausente em dados antigos, a diferença entre início e conclusão. Semana começa na segunda-feira local; o calendário também usa datas locais.
- Recordes são recalculados a partir das séries concluídas: maior carga e reps são separados por ID estável de exercício; maior volume de sessão é o somatório disponível de kg·reps; 1RM estimado usa Epley (`carga × (1 + reps / 30)`) e é rotulado como estimativa, nunca como teste real. Gráfico de carga só aparece com dados de ao menos duas sessões para o exercício selecionado.
- Progressão RPG com XP calculado nas sessões finalizadas: 10 XP por sessão, 5 XP por série concluída e 1 XP por bloco de 5 repetições concluídas e registradas.
- Níveis determinísticos: nível 2 custa 100 XP; cada nível seguinte aumenta o custo em 50 XP (150, 200, 250...). XP excedente avança vários níveis de uma vez.
- Títulos: Primeiro Passo (1 sessão), Em Treinamento (5 sessões) e Presença Constante (12 sessões); títulos desbloqueados podem ser equipados no painel de Progressão.
- Missões: finalizar a primeira sessão (40 XP); concluir 8 séries na semana local (30 XP); finalizar 3 sessões na semana (60 XP); treinar em 2 dias distintos (30 XP); e, quando houver ficha programada em um dia, concluir essa rotina (20 XP). A semana começa na segunda-feira local; missões de períodos anteriores permanecem no registro e cada recibo de recompensa só pode ser resgatado uma vez. Dias de descanso e dias sem programação não recebem uma missão diária de treino.
- Medalhas calculadas do histórico: primeira, 5, 10 e 12 sessões; 10 séries; três sessões em uma semana; quatro semanas distintas; duas rotinas; exercício registrado em datas distintas; níveis 5 e 10. Medalhas não concedem XP adicional. Os critérios não suportados por dados mensuráveis não são incluídos.
- XP, missões, títulos e conquistas são reconciliados idempotentemente com base em sessões finalizadas e recibos de recompensa persistidos.
- A migração do esquema 1 para 2 mantém rotinas, histórico e XP existente. Sessões antigas recebem recibos de 0 XP e não são premiadas retroativamente. Uma progressão parcial inválida é reparada sem reprocessar sessões antigas como novas recompensas.
- Ao ler um documento schema 2 válido que contenha sessões concluídas sem recibo de XP, o armazenamento centralizado grava recibos de proteção de 0 XP. Isso conserva o total já registrado e impede que uma reconciliação futura conceda XP retroativo ao histórico.
- Página da companheira com identidade visual original, falas contextuais e atalho de personalização do tom. O nome mostrado é sempre canônico; apelidos antigos continuam aceitos no armazenamento e backups, mas não são editáveis nem exibidos.
- Galeria persistente com exatamente as nove personagens confirmadas: Ichika, Nino, Miku, Yotsuba e Itsuki Nakano; Marin Kitagawa e Wakana Gojo; Kaoruko Waguri e Rintaro Tsumugi. A coleção é agrupada por série, oferece filtros e mantém detalhes, personalidade, falas contextuais e seleção atual. Instalações novas começam com Yotsuba; seleções existentes válidas (incluindo o ID legado `miku`) continuam válidas. IDs de três personagens de uma edição temporária da galeria são migrados para Yotsuba, preservando as demais preferências e o progresso.
- Configurações funcionais para apelido, exibição do nome, seis paletas (Purple Eclipse, Crimson, Azure, Emerald, Rose e Amber), tom narrativo, movimento e personalidade da companheira. IDs antigos de cor permanecem compatíveis com preferências e backups anteriores.
- Preferências e os dados de perfil/companheira são salvos pelo mesmo armazenamento centralizado de `localStorage` usado pelas rotinas. Falhas não são exibidas como salvamento bem-sucedido.
- Backup local JSON (formato `training-arc-2-backup`, versão 1), contendo a versão do schema da aplicação e o estado integral persistido. A restauração valida o documento antes da confirmação, mostra uma prévia e substitui a única chave centralizada com verificação e tentativa de rollback.
- Biblioteca local com 26 exercícios catalogados: os 20 movimentos das fichas iniciais e seis alternativas. A busca aceita nomes e termos alternativos, filtros por músculos, equipamento, tipo e peso corporal; o catálogo oferece instruções e ilustrações locais inicial/posição de esforço. Os movimentos personalizados fora do catálogo continuam válidos. Fontes, licença e atribuição: `src/assets/exercises/SOURCES.md`.
- **Planilha de treino** mostra fichas por rotina com músculos, séries e repetições planejadas, descanso, carga planejada somente quando cadastrada, e último desempenho concluído por ID estável do exercício. A carga realizada no histórico aparece separada da carga alvo; dados ausentes são rotulados.
- **Evolução por exercício** compara as últimas até 10 sessões, 30 dias, 90 dias ou todo o histórico. Repetições são somadas por sessão, carga é o maior valor registrado em uma série e volume externo soma carga (kg) × repetições somente quando registrado. Exercícios de peso corporal não recebem uma carga equivalente estimada. Séries não concluídas, sessões em andamento e planejamentos não entram.
- **Mapa muscular** usa as séries principais/secundárias concluídas nos períodos de 7, 30, 90 dias ou no histórico completo sobre regiões anatômicas SVG locais da biblioteca `body-muscles` 1.0.0. O total global conta cada série uma vez; contagens por metadados podem se sobrepor. A figura é uma referência anatômica educativa: não mede ativação, força, tamanho ou hipertrofia. Braquial e romboides permanecem na lista textual porque o catálogo anatômico não os representa como regiões separadas; não são atribuídos a regiões vizinhas.
- Configurações incluem um gerenciador de exercícios por rotina com prévia, substituição, adição, remoção, ordenação e edição de séries/repetições/descanso em rascunho com salvar/cancelar. Substituições usam um ID de instância novo; registros históricos mantêm seus próprios snapshots e IDs.
- Antes da sessão, o aplicativo mostra três orientações opcionais de aquecimento; a sessão copia as orientações e permite concluir, pular ou reiniciar etapas. O aquecimento não conta como séries nem altera XP, estatísticas ou recompensas. Orientações iniciais são distintas para Upper A, Upper B, Lower A e Lower B; cada rotina pode personalizá-las nas Configurações.
- Backups de schema 1 são migrados explicitamente para schema 2; sessões antigas recebem recibos de 0 XP para impedir concessões retroativas. Sessões concluídas sem recibo também recebem marcador 0 XP durante a validação do backup, sem recalcular recompensas.
- A galeria lista somente as nove personagens confirmadas. Nove retratos locais ficam em `src/assets/companions/{id}.png` e são resolvidos somente se o arquivo correspondente for realmente empacotado pelo Vite. O inventário de origem e as limitações de direitos estão em `src/assets/companions/SOURCES.md`; referências adicionais de identificação estão em `ASSET_SOURCES.md`. As fontes não confirmam licença ampla de redistribuição: antes de publicar ou distribuir o site, obtenha autorização/licença ou remova os retratos. Ausências e falhas de carregamento acionam o fallback com iniciais e nome.
- O redesign editorial romântico usa ornamentos CSS originais e os nove retratos locais já existentes. A galeria destaca a personagem selecionada e mantém as demais por franquia; o Dashboard amplia a composição com a mesma arte local. Consulte `docs/TRAINING_ARC_VISUAL_SPEC.md` e `ASSET_SOURCES.md` para fontes e limites de redistribuição.
- O mapa usa regiões SVG incorporadas localmente pelo pacote `body-muscles` 1.0.0, mapeadas explicitamente para rótulos reais do catálogo de exercícios. A visualização é interativa por toque, ponteiro e teclado, com destaque binário de registros concluídos; as regiões sem vínculo com exercícios são identificadas como tais. A licença Apache 2.0 e o NOTICE são servidos em `public/licenses/body-muscles/`.
- A paleta permanece escura; a preferência de movimento reduz efeitos e a configuração do sistema operacional `prefers-reduced-motion` é sempre respeitada.
- As mensagens dos nove personagens cobrem preparação, treino, esforço, conclusão, recuperação, retorno, progressão, nível, missão, medalha, evolução, novidade e histórico insuficiente. A seleção permanece estável por personagem/contexto/dia; eventos de conclusão só são usados após a conclusão registrada.
- **Missões** tem uma página própria com seções diária, semanal e especial. Metas são derivadas do histórico: a tarefa diária só aparece para uma ficha válida programada hoje; semanas contam sessões e dias locais distintos. Dias de descanso não são tratados como falha.
- **Medalhas** tem uma coleção própria de marcos bloqueados e desbloqueados, critérios, datas e títulos equipáveis. A lista é derivada do histórico e os desbloqueios preservam a primeira data; trocar título não remove títulos obtidos. Medalhas não têm recompensa XP adicional.
- Identidade Purple Eclipse usa tokens CSS globais para controles e estados ativos; o menu lateral e o menu móvel podem rolar para acomodar as novas páginas. Movimento reduzido continua respeitado.

As fichas iniciais são modelos gerais de organização, sem cargas pessoais ou prescrição individualizada. O Lower A usa cadeira extensora e não inclui agachamento búlgaro.

## Estrutura do código

O sistema visual atual e seus limites de escopo estão descritos em [`docs/TRAINING_ARC_VISUAL_SPEC.md`](docs/TRAINING_ARC_VISUAL_SPEC.md).

- `src/app`: composição e navegação do aplicativo.
- `src/components`: shell, marca e ícones compartilhados.
- `src/features`: Dashboard, rotinas, configurações, companheira e telas futuras.
- `src/domain/exerciseCatalog.ts`: catálogo, busca, resolução por exercício e orientações iniciais de aquecimento.
- `src/features/exercises`: biblioteca, imagens e apresentação de detalhes.
- `src/domain/trainingInsights.ts`: métricas derivadas e filtragem temporal para evolução de exercícios e mapa muscular.
- `src/features/statistics`: estatísticas existentes, planilha por rotina, evolução individual e mapa muscular.
- `src/domain`: modelos, validação, templates e regras sem acesso à interface.
- `src/storage`: acesso centralizado ao `localStorage`.
- `src/features/plan` e `src/domain/trainingPlan.ts`: interface e regras de agenda semanal, datas locais e sequência das rotinas.
- `src/styles`: tokens e estilos responsivos próprios.
- `src/test`: configuração compartilhada dos testes.

Para conferir testes, tipos e build de produção, use os comandos descritos em **Verificações**.

## Agenda e sequência

Na seção **Agenda**, configure cada dia com uma rotina existente ou escolha **Descanso**. Dias sem configuração não são tratados como descanso. O atalho “Marcar dias restantes como descanso” só altera o rascunho; confirme em **Salvar semana** para gravar. A agenda recorrente atual é salva no mesmo documento local do aplicativo e incluída automaticamente nos backups JSON existentes. Semanas anteriores mostram sessões concluídas reais, não uma reconstrução da agenda antiga.

A sequência é uma ordem separada da agenda semanal. Selecione e reordene fichas com os controles acessíveis, escolha se o ciclo recomeça automaticamente, e salve. Uma sessão concluída conta no máximo uma vez; iniciar ou descartar uma sessão não avança. Criar uma sequência não contabiliza sessões anteriores à sua configuração. A Etapa 10 não altera XP ou recompensas.

## Backup

Em **Configurações → Backup**, use **Exportar backup** para baixar o arquivo JSON local. Para restaurar, selecione um backup, revise a prévia e confirme explicitamente a substituição. A validação ocorre antes da gravação; em caso de erro, a aplicação tenta restaurar a chave central de `localStorage`. Guarde os arquivos exportados em um local seguro. Os backups não são enviados pela aplicação a nenhum servidor.

## Retratos e distribuição

As imagens desta galeria foram obtidas das páginas oficiais identificadas no arquivo `src/assets/companions/SOURCES.md`. Elas continuam sendo material protegido de seus titulares; o fato de estarem disponíveis no site oficial ou para download não equivale a uma licença de redistribuição. O uso local no workspace não libera a publicação dos arquivos. Antes de distribuir/publicar o site, remova-os ou obtenha autorização expressa compatível com a distribuição pretendida.

As ilustrações de exercícios vêm do RepDB Free Exercise Dataset sob a licença free tier versão 1.0. Essa licença permite uso pessoal/comercial dentro de aplicações com atribuição, e proíbe republicar/reempacotar o conjunto como dataset independente. A fonte declara ilustrações originais encomendadas pelo RepDB e geradas com ferramentas de IA. Consulte `src/assets/exercises/SOURCES.md` e o [texto integral da licença](https://github.com/RepDB/exercise-dataset/blob/main/LICENSE.md). As imagens não são necessárias de um servidor remoto durante o uso.
