# Status de implementação por RF

<!-- GERADO por scripts/rf/gerar-catalogo.mjs (scripts/rf/status.mjs) — não editar à mão. Teste: lib/rf/catalog.test.ts. -->

Derivado do código, não declarado: endpoints do `ws-web` (`@Tag`/`@Operation` com "RFnn" e `@…Mapping`) cruzados com as
rotas de `lib/pages/registry.ts` (RFs citados; o primeiro é o principal) e o estado delas em `lib/pages/status.ts`.

| Status | Regra | RFs | % |
|---|---|---:|---:|
| `api` | endpoint que cita o RF **e** rota `live` que o cita (ponta a ponta) | 15 | 18,5% |
| `parcial` | endpoint sem rota `live`, ou RF principal de rota `live` sem endpoint próprio | 5 | 6,2% |
| `demo` | sem endpoint; alguma rota `demo` (repositório em memória) o cita | 48 | 59,3% |
| `planejado` | nada acima (esqueleto, preview ou citação de passagem) | 13 | 16,0% |
| **total** | | **81** | |

**Ponta a ponta (`api`): 15 de 81 RFs = 18,5%.** Com `parcial`: 20 = 24,7%.
Endpoints lidos: 95 (0 sem RF no `@Tag` nem no `@Operation`).

Limites: a classificação é por citação. Um RF `api` pode ter CAs ainda não atendidos (ver o "Estado da implementação" de cada
README e [CA_TESTES.md](CA_TESTES.md)); um RF citado de passagem numa rota `live` não ganha `api` sem endpoint próprio.

| RF | Título | Status | Endpoints | Rotas (estado; * = principal) |
|---|---|---|---:|---|
| [RF1](../diagramas/RF1/README.md) | Cadastrar usuário na plataforma com dados de acesso | `api` | 5 | `/register` live*, `/verify-email` live*, `/termos` live*, `/privacidade` live* |
| [RF2](../diagramas/RF2/README.md) | Autenticar usuário na plataforma com credenciais de acesso | `api` | 15 | `/login` live*, `/password-reset` live* |
| [RF3](../diagramas/RF3/README.md) | Editar informações pessoais e preferências do perfil do usuário | `api` | 13 | `/settings` live* |
| [RF4](../diagramas/RF4/README.md) | Utilizar o criador de tarefas, escolhendo o tipo do arquivo e editando detalhes, em modo manual ou com IA | `api` | 2 | `/tasks/new` live* |
| [RF5](../diagramas/RF5/README.md) | Utilizar o criador de projetos, escolhendo em cada fase do projeto as unidades de tarefa, em modo manual ou com IA | `demo` | 0 | `/projects/new` demo* |
| [RF6](../diagramas/RF6/README.md) | Acessar e gerenciar o Perfil Empresarial (Acervo Digital + Projetos Salvos) | `api` | 1 | `/profile` live*, `/u/[username]` live |
| [RF7](../diagramas/RF7/README.md) | Abrir um esquema de tarefa a partir da lista de um esquema de projeto | `demo` | 0 | `/tasks/[id]` live, `/projects/[id]` demo* |
| [RF8](../diagramas/RF8/README.md) | Editar arquivos de tarefas ou projetos dentro de meu perfil do Work Station | `parcial` | 0 | `/tasks/[id]/edit` live*, `/projects/[id]/edit` demo |
| [RF9](../diagramas/RF9/README.md) | Permitir que um chefe de departamento possa adicionar ou remover um usuário da sua lista de empregados atuais | `planejado` | 0 | `/departments/[slug]` live, `/companies/[slug]/manage/departments` skeleton, `/departments/[slug]/team` skeleton* |
| [RF10](../diagramas/RF10/README.md) | Permitir que o chefe de departamento possa atribuir uma tarefa ou projeto a um usuário | `api` | 1 | `/messages` live, `/tasks/[id]` live, `/projects/[id]` demo, `/departments/[slug]/team` skeleton |
| [RF11](../diagramas/RF11/README.md) | Utilizar o editor de arte de fundo para personalizar esquemas de tarefas e projetos | `demo` | 0 | `/tasks/[id]/edit` live, `/projects/[id]/edit` demo, `/lab/anatomias` live |
| [RF12](../diagramas/RF12/README.md) | Editar um esquema de tarefa ou projeto de meu perfil | `api` | 2 | `/profile` live, `/tasks/[id]/edit` live, `/projects/[id]/edit` demo |
| [RF13](../diagramas/RF13/README.md) | Utilizar a funcionalidade gerar artefato dentro de esquemas, chats, abas e feed do Work Station | `demo` | 0 | `/messages/[conversationId]` live, `/tasks` live, `/tasks/[id]` live, `/projects/[id]` demo, `/decia/[sessionId]` demo |
| [RF14](../diagramas/RF14/README.md) | Visualizar perfil de um chefe de departamento | `api` | 5 | `/departments/[slug]` live*, `/lab/perfis` live* |
| [RF15](../diagramas/RF15/README.md) | Visualizar perfil de um empresa ou órgão público/privado | `api` | 5 | `/companies/[slug]` live*, `/lab/perfis` live |
| [RF16](../diagramas/RF16/README.md) | Visualizar perfil de um usuário comum que é empregado dentro de uma empresa | `api` | 6 | `/u/[username]` live*, `/lab/perfis` live |
| [RF17](../diagramas/RF17/README.md) | Visualizar esquemas de tarefa & projetos criados por outros usuários na rede social do Work Station, através da aba "Buscar" | `api` | 1 | `/search` live |
| [RF18](../diagramas/RF18/README.md) | Interagir socialmente com tarefas e projetos: curtir, comentar, salvar, compartilhar, remixar, retornar e atribuir | `demo` | 0 | `/mural` demo, `/u/[username]` live, `/tasks` live, `/tasks/[id]` live, `/admin` demo* |
| [RF19](../diagramas/RF19/README.md) | Curtir, comentar, salvar, compartilhar, retornar, atribuir e remixar tarefas, esquemas de projeto e planos anuais (interações sociais) | `demo` | 0 | `/mural` demo, `/profile` live, `/u/[username]` live, `/tasks/[id]` live |
| [RF20](../diagramas/RF20/README.md) | Utilizar o construtor de projetos do Work Station para compreender se as tarefas de meu acervo são adequadas dentro de meu ambiente empresarial | `parcial` | 10 | `/find` preview, `/projects/new` demo, `/insights` skeleton |
| [RF21](../diagramas/RF21/README.md) | Utilizar a mesa de trabalho digital de meu perfil | `demo` | 0 | `/desk` demo* |
| [RF22](../diagramas/RF22/README.md) | Editar um Esquema de Projeto na Mesa de Trabalho (quadro por fase, linha do tempo e canvas livre) com versões e histórico | `demo` | 0 | `/desk` demo, `/projects/[id]/edit` demo* |
| [RF23](../diagramas/RF23/README.md) | Importar tarefas ou projetos de outros provedores para dentro de meu perfil do Work Station | `planejado` | 0 | `/tasks/new` live |
| [RF24](../diagramas/RF24/README.md) | Visualizar a aba metas & objetivos de minha equipe com insights analíticos gerados por IA | `demo` | 0 | `/companies/[slug]` live, `/plans` skeleton*, `/goals` demo |
| [RF25](../diagramas/RF25/README.md) | Agrupar projetos e tarefas em Programas, Exercícios e Gestões (agrupamentos institucionais) | `planejado` | 0 | `/companies/[slug]` live, `/profile` live |
| [RF26](../diagramas/RF26/README.md) | Utilizar o Copilot do WS para criar sugestões de tarefas e projetos de maneira mais prática e funcional | `demo` | 0 | `/autopilot` demo, `/insights` skeleton |
| [RF27](../diagramas/RF27/README.md) | Navegar no Mural (mural da empresa e vitrine de projetos) e Buscar projetos, tarefas, pessoas, empresas e chefes de departamento | `api` | 4 | `/mural` demo*, `/search` live*, `/find` preview |
| [RF28](../diagramas/RF28/README.md) | Gerir perfis de empresa e chefe de departamento (departamentos, página institucional, chancela de tarefas/projetos e emissão de reconhecimentos) | `demo` | 0 | `/companies` skeleton*, `/companies/[slug]` live, `/departments/[slug]` live, `/recognitions` skeleton, `/issuer/dashboard` skeleton*, `/companies/[slug]/manage/departments` skeleton*, `/departments/[slug]/team` skeleton, `/seals/review` demo, `/curation` skeleton*, `/admin` demo |
| [RF29](../diagramas/RF29/README.md) | Integrar o DECIA ao Criador de Projetos — compartilhar tarefas/artefatos na sessão, abrir sessão a partir de um projeto, transformar argumentos/divergências/decisões em tarefas e manter o Rastro de Decisão | `api` | 4 | `/projects/[id]` demo, `/agents` preview, `/decia` demo*, `/decia/decisoes/[decisionId]` demo*, `/decia/[sessionId]` demo*, `/decia/review` demo*, `/lab/decia` live* |
| [RF30](../diagramas/RF30/README.md) | Gerar um Esquema de Projeto completo com o Autopiloto de Projeto a partir de uma demanda (ofício, e-mail ou frase), reutilizando modelos chancelados | `demo` | 0 | `/autopilot` demo* |
| [RF31](../diagramas/RF31/README.md) | Simular cenários sobre um Esquema de Projeto (corte de orçamento, atraso, troca de fornecedor, mudança de escopo) antes de enviá-lo à aprovação | `demo` | 0 | `/projects/[id]/simulate` demo* |
| [RF32](../diagramas/RF32/README.md) | Verificar a conformidade de um Esquema de Projeto no Espelho de Conformidade (checklists legais e do departamento) e sugerir as tarefas faltantes | `demo` | 0 | `/projects/[id]/mirror` demo* |
| [RF33](../diagramas/RF33/README.md) | Consultar a Memória Institucional (busca semântica sobre sessões encerradas, artefatos, projetos e tarefas) e fazer a IA do DECIA citar fontes institucionais | `demo` | 0 | `/memory` demo*, `/find` preview |
| [RF34](../diagramas/RF34/README.md) | Extrair informações de desenhos técnicos e documentos (dwg/dxf/ifc/glb/pdf) com IA para gerar quantitativos, planilha orçamentária e cronograma pré-preenchidos | `parcial` | 0 | `/tasks/[id]` live, `/tasks/extrair` live*, `/tasks/[id]/extrair` live*, `/tasks/new` live |
| [RF35](../diagramas/RF35/README.md) | Participar de Metas coletivas, aparecer nos Destaques e receber Reconhecimentos (gamificação ligada ao perfil deliberativo, com DECIA Points como moeda) | `demo` | 0 | `/goals` demo*, `/highlights` skeleton*, `/recognitions` skeleton*, `/curation` skeleton |
| [RF36](../diagramas/RF36/README.md) | Gerar o Dossiê de Transição (handoff) quando um empregado muda de departamento, sai ou uma gestão encerra, transferindo projetos, tarefas e pendências com contexto | `demo` | 0 | `/departments/[slug]/team` skeleton, `/handoffs` demo* |
| [RF37](../diagramas/RF37/README.md) | Registrar reuniões com a Ata Viva (transcrição ou gravação → ata como tarefa + tarefas de encaminhamento com responsável e prazo dentro do projeto) | `demo` | 0 | `/decia` demo, `/decia/[sessionId]` demo, `/lab/decia` live |
| [RF38](../diagramas/RF38/README.md) | Aplicar a identidade visual do Work AI — ícones por tipo de tarefa, thumbnails automáticos, capa-mosaico de projeto, fio de decisão, lacres, etiquetas de estado, temas e skins da Mesa | `parcial` | 0 | `/settings` live, `/lab/design-system` live*, `/lab/anatomias` live* |
| [RF39](../diagramas/RF39/README.md) | Criar chancelas (EMPRESA / CHEFE DE DEPARTAMENTO) e concedê-las a tarefas, projetos e planos por vínculo sugerido pela IA, por política de critérios ou por premiação; habilitar benefícios resgatáveis | `demo` | 0 | `/companies/[slug]` live, `/benefits` demo*, `/seals/review` demo*, `/seals` demo*, `/curation` skeleton |
| [RF40](../diagramas/RF40/README.md) | Oferecer tarefas, projetos e kits como modelos no Balcão de Modelos (marketplace interno em DECIA Points, sem dinheiro) e reutilizá-los com crédito ao autor | `demo` | 0 | `/models` demo*, `/profile` live, `/store` demo |
| [RF41](../diagramas/RF41/README.md) | Gerir o Acervo de Tarefas (inventário do usuário): estados, sub-filtros, ordenação, prazos legais, anexos & evidências e ações rápidas | `api` | 14 | `/tasks` live*, `/tasks/[id]` live*, `/attachments` live* |
| [RF42](../diagramas/RF42/README.md) | Acumular DECIA Points por participação de qualidade no chat DECIA e usá-los em compras dentro do app (Loja Work AI: modelos do Balcão, créditos de IA, capas/skins, impulsos, kits) | `demo` | 0 | `/points` demo*, `/store` demo* |
| [RF43](../diagramas/RF43/README.md) | Usar a IA do sistema — insights do Acervo e do Perfil, ranking de usuários, motor do DECIA e Autopilot para criar tarefas e sugerir novos projetos com custo, tempo, prazo e viabilidade (EVM, CPM, PERT, Monte Carlo, ROI, matriz de risco) | `demo` | 0 | `/agents` preview, `/autopilot` demo, `/insights` skeleton*, `/departments/[slug]/team` skeleton, `/admin` demo |
| [RF44](../diagramas/RF44/README.md) | Receber a Tarefa do Dia sugerida pela IA e acompanhar o Hype Score de Eficiência (previsto × realizado), calculado por princípios de gestão empresarial e de projetos, com feedback diário e semana planejada | `parcial` | 0 | `/today` live*, `/profile` live, `/tasks` live, `/desk` demo |
| [RF45](../diagramas/RF45/README.md) | Calcular com a IA o Hype Score do Perfil (0–1000) a partir de tudo o que o usuário produziu, das interações recebidas (curtidas, reações, comentários, salvos, remixes) e da participação no DECIA — exibível ou oculto a critério do usuário, sempre explicável | `planejado` | 0 | `/profile` live |
| [RF46](../diagramas/RF46/README.md) | Utilizar chats de mensageria para comunicar-se com outros usuários e atribuir ou receber tarefas e projetos | `api` | 11 | `/messages` live*, `/messages/[conversationId]` live*, `/decia/[sessionId]` demo, `/departments/[slug]/team` skeleton |
| [RF47](../diagramas/RF47/README.md) | Encontrar palavras-chave em documentos — varrer documentos longos de tarefas e projetos para localizar e extrair termos, frases e palavras (com contexto e fonte) | `planejado` | 0 | `/find` preview*, `/agents` preview |
| [RF48](../diagramas/RF48/README.md) | Utilizar a aba Agentes (Copilot de testes) para testar uma contratação antes do início e durante a execução — testes contratuais, orçamentários, comportamentais, de integridade e Score do Contrato, sempre com fundamentação bibliográfica | `planejado` | 0 | `/find` preview, `/agents` preview* |
| [RF49](../diagramas/RF49/README.md) | Coordenar Pactos de Desbloqueio entre usuários, chefes e departamentos | `demo` | 0 | `/goals` demo |
| [RF50](../diagramas/RF50/README.md) | Analisar o perfil no Copilot e recomendar tarefas, projetos, pessoas da rede e caminhos profissionais | `planejado` | 0 | `/insights` skeleton |
| [RF51](../diagramas/RF51/README.md) | Controlar autonomia, escopo e execução da IA em Letters e Drawings | `demo` | 0 | `/letters` demo, `/letters/[pieceId]` demo, `/drawings` demo, `/admin` demo |
| [RF52](../diagramas/RF52/README.md) | Editar documentos estruturados no Work Station Letters | `demo` | 0 | `/letters` demo*, `/letters/[pieceId]` demo* |
| [RF53](../diagramas/RF53/README.md) | Analisar língua, morfossintaxe e gramática no Letters | `demo` | 0 | `/letters` demo, `/letters/[pieceId]` demo |
| [RF54](../diagramas/RF54/README.md) | Analisar coerência, narrativa, gênero e fontes no Letters | `demo` | 0 | `/letters` demo, `/letters/[pieceId]` demo |
| [RF55](../diagramas/RF55/README.md) | Revisar, completar e reescrever texto com IA no Letters | `demo` | 0 | `/letters` demo, `/letters/[pieceId]` demo |
| [RF56](../diagramas/RF56/README.md) | Colaborar, comentar e resolver conflitos em documentos Letters no DECIA | `demo` | 0 | `/letters` demo |
| [RF57](../diagramas/RF57/README.md) | Selecionar objetos, pontos e regiões no Drawings | `demo` | 0 | `/drawings` demo* |
| [RF58](../diagramas/RF58/README.md) | Criar e editar geometria vetorial e desenho técnico 2D | `demo` | 0 | `/drawings` demo |
| [RF59](../diagramas/RF59/README.md) | Construir, dividir e desmembrar contornos vetoriais | `demo` | 0 | `/drawings` demo |
| [RF60](../diagramas/RF60/README.md) | Modelar sólidos, superfícies e malhas 3D no Drawings | `demo` | 0 | `/drawings` demo |
| [RF61](../diagramas/RF61/README.md) | Desmembrar e converter estruturas 3D preservando intenção | `demo` | 0 | `/drawings` demo |
| [RF62](../diagramas/RF62/README.md) | Controlar vistas, câmera, perspectiva e coordenadas no Drawings | `demo` | 0 | `/drawings` demo |
| [RF63](../diagramas/RF63/README.md) | Editar cores, gradientes, materiais e estilos de traço | `demo` | 0 | `/drawings` demo |
| [RF64](../diagramas/RF64/README.md) | Gerar assets, wireframes e detalhes internos parametrizados | `demo` | 0 | `/drawings` demo |
| [RF65](../diagramas/RF65/README.md) | Editar regiões hierárquicas e camadas sobrepostas no Drawings | `demo` | 0 | `/drawings` demo |
| [RF66](../diagramas/RF66/README.md) | Editar desenhos simultaneamente no DECIA com reservas transacionais | `demo` | 0 | `/drawings` demo |
| [RF67](../diagramas/RF67/README.md) | Completar geometria e prever traçados no Drawings | `demo` | 0 | `/drawings` demo |
| [RF68](../diagramas/RF68/README.md) | Gerar, auditar, estilizar, otimizar e converter desenhos com IA | `demo` | 0 | `/drawings` demo |
| [RF69](../diagramas/RF69/README.md) | Salvar, exportar, recuperar e navegar no histórico das peças | `demo` | 0 | `/letters` demo, `/drawings` demo |
| [RF70](../diagramas/RF70/README.md) | Importar, exportar e referenciar conteúdo técnico nas peças | `demo` | 0 | `/tasks/extrair` live, `/tasks/[id]/extrair` live, `/letters` demo, `/drawings` demo |
| [RF71](../diagramas/RF71/README.md) | Integrar peças Letters e Drawings à jornada de tarefas, projetos e DECIA | `demo` | 0 | `/letters` demo, `/drawings` demo |
| [RF72](../diagramas/RF72/README.md) | Validar qualidade, desempenho e evidências dos editores | `demo` | 0 | `/letters` demo, `/drawings` demo |
| [RF73](../diagramas/RF73/README.md) | Separar editor determinístico e Assistente IA com navegação acessível | `demo` | 0 | `/letters/[pieceId]` demo, `/drawings` demo |
| [RF74](../diagramas/RF74/README.md) | Capturar PNG e oferecer prévia fantasma multimodal no Drawings | `demo` | 0 | `/drawings` demo |
| [RF75](../diagramas/RF75/README.md) | Work Station Career Guidance: guiar a pessoa em transição de carreira com perguntas, tarefas-guia e evidências | `planejado` | 0 | `/profile` live, `/insights` skeleton |
| [RF76](../diagramas/RF76/README.md) | Treino e Simulados por Profissão | `planejado` | 0 | `/profile` live |
| [RF77](../diagramas/RF77/README.md) | Ranking da temporada, níveis e "Em alta na profissão" | `planejado` | 0 | `/profile` live |
| [RF78](../diagramas/RF78/README.md) | Memória da Profissão: história, grandes projetos e vitrine da profissão preferida | `planejado` | 0 | `/profile` live |
| [RF79](../diagramas/RF79/README.md) | Desafios de Empresa com selo específico em níveis bronze, prata e ouro | `planejado` | 0 | `/profile` live |
| [RF80](../diagramas/RF80/README.md) | Feed da rede Work Station: projetos e tarefas publicados por todas as pessoas, com filtros por todos os campos públicos | `demo` | 0 | `/mural` demo |
| [RF81](../diagramas/RF81/README.md) | Cadastrar-se com a profissão preferida para criar tarefas e projetos únicos da própria área | `planejado` | 0 | `/tasks/new` live, `/settings` live, `/register` live, `/verify-email` live |
