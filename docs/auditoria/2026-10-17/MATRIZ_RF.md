# Matriz dos 74 RF — reavaliada contra o repositório

17/10/2026. Notas **técnicas provisórias** (não são testes com usuários), na rubrica do projeto: funcionalidade 30 %, eficiência 20 %, visual 15 %, recuperação 15 %, acessibilidade 10 %, feedback 10 %. Zero = jornada comprovadamente ausente (página-esqueleto ou nada). **n/v** = dimensão não verificada nesta rodada, fora da média; a nota fica marcada com \*. A coluna *16/10* mostra a nota da auditoria anterior, que se apoiava em código não publicado (ver P02) e por isso não é comparável.

| RF | Objetivo | Tela/fluxo | Componentes e API | Estado | Inicial | Principal erro | Melhoria | Evidência | Prior. | Após | 16/10 |
|---|---|---|---|---|---:|---|---|---|---|---:|---:|
| RF1 | Cadastrar usuário na plataforma com dados de acesso | /register → /verify-email | AuthForms.tsx · RegistrationController (POST /api/auth/register, confirm, resend) | API REAL PARCIAL | 6.39 | Entrega de e-mail não verificada; em dev o log mascara o código apesar do comentário 'echo-body' (logback). | Teste com SMTP controlado (Mailpit) e corrigir a máscara só em dev. | Cadastro real via API nesta rodada; LoggingMailAdapter.java:22 | P1 | **6.39**\* | 6.4 |
| RF2 | Autenticar usuário na plataforma com credenciais de acesso | /login · /settings?tab=sessoes | AuthForms.tsx · AuthController · WsSecurityProperties · lib/api/client.ts | API REAL PARCIAL | 3.39 | Chaves JWT nunca ligadas (record com 2 construtores): login 503 em todo ambiente; navegar durante a renovação revoga a família (REFRESH_REUSO). | Corrigido o binding e a renovação antes da 1ª chamada; falta janela de tolerância ao reuso no servidor (decisão de segurança). | b47945c, 772257d; WsSecurityPropertiesBindingTest; client.restore.test.ts; log REFRESH_REUSO | P0 | **6.22**\* | 7.45 |
| RF3 | Editar informações pessoais e preferências do perfil do usuário | /settings | settings/page.tsx · GET/PUT /api/me/preferences | API REAL PARCIAL | 7.00 | Foto, biografia e especialidades sem UI. | Expor PATCH /api/me (bio, avatar) no perfil. | lib/preferences; MeController | P2 | **7.00**\* | 5.95 |
| RF4 | Utilizar o criador de tarefas, escolhendo o tipo do arquivo e editando detalhes, em modo manual ou com IA | /tasks/new | TaskForm.tsx · TaskController POST /api/tasks · TaskService · V36 task_briefs | AUSENTE → **API REAL PARCIAL** | 0.00 | Antes: página-esqueleto, sem formulário nem API. Agora: falta anexo, dependência estruturada, escolha de outro responsável (sem busca de pessoas) e criação com IA. | Anexos (MediaUploadService), dependências, busca de pessoas, modo IA conforme autonomia. | Jornada: 6 áreas criadas pela UI (evidencias/JORNADA.json); TaskServiceTest; TaskPersistenceIT | P0 | **7.28**\* | 5.75 |
| RF5 | Utilizar o criador de projetos, escolhendo em cada fase do projeto as unidades de tarefa, em modo manual ou com IA | /projects/new | RfPage (esqueleto); ProjectScheme/V12 sem serviço | AUSENTE | 0.00 | Criador de projetos inexistente: só tabelas. | Agregado Projeto com API (fases, tarefas, dependências). | app/(shell)/projects/new/page.tsx | P1 | **0.00** | 0.0 |
| RF6 | Acessar e gerenciar o Perfil  Empresarial (Acervo Digital + Projetos Salvos) | /profile | ProfileView.tsx · lib/social (DEMO) | DEMO EM MEMÓRIA | 4.25 | Conta real logada vê 'Pessoa Exemplo' e acervo de demonstração; contadores fictícios. | Perfil a partir de /api/me + /api/tasks; seguidores reais. (Seguindo e Decisões ocultas corrigidos.) | evidencias/18-perfil-contadores-desktop.png; b602d34 | P1 | **4.35** | 4.25 |
| RF7 | Abrir um esquema de tarefa a partir da lista de um esquema de projeto | /projects/[id] ← card de projeto | ProjectCard.tsx · view-model.ts | DEMO EM MEMÓRIA | 3.15 | Card leva a /projects/[id] esqueleto; mosaico expunha títulos de tarefas ocultas (corrigido). | Página de projeto real com lista de tarefas autorizadas. | b602d34; view-model.test.ts | P1 | **3.15** | 3.2 |
| RF8 | Editar arquivos de tarefas ou projetos dentro de meu perfil do Work Station | /tasks/[id]/edit (peças) | Sem editor de peças no app | AUSENTE | 0.00 | Editar arquivos (peças Letters/Drawings) não existe. | Integrar peças versionadas à tarefa (RF71). | Sem rota /studio | P1 | **0.00** | 4.75 |
| RF9 | Permitir que um chefe de departamento possa adicionar ou remover um usuário da sua lista de empregados atuais | /companies/[slug]/manage/departments | RfPage; department_memberships sem API | AUSENTE | 0.00 | Chefe não consegue adicionar/remover pessoas. | API de lotação com aprovação. | registry.ts | P2 | **0.00** | 5.8 |
| RF10 | Permitir que o chefe de departamento possa atribuir uma tarefa ou projeto a um usuário | /tasks/[id] → Delegar | DelegateDialog.tsx · rules.ts (DEMO) | DEMO EM MEMÓRIA | 4.55 | Delegação só em memória. | Assignments (V20) com API. | social.test.tsx | P2 | **4.55** | 3.2 |
| RF11 | Utilizar o editor de arte de fundo para personalizar esquemas de tarefas e projetos | /settings?tab=aparencia | BackgroundArt · prefs | API REAL PARCIAL | 5.50 | Arte de fundo do shell, não do esquema de tarefa/projeto. | Arte por esquema (cardSkin) na edição da tarefa. | settings/page.tsx | P3 | **5.50**\* | 4.1 |
| RF12 | Editar um esquema de tarefa ou projeto de meu perfil | /tasks/[id]/edit | TaskForm.tsx · PUT /api/tasks/{id} (versão) · 409 EDICAO_CONCORRENTE | AUSENTE → **API REAL PARCIAL** | 0.00 | Antes: esqueleto. Agora: doc pede PATCH/If-Match e a API usa PUT com versão no corpo (divergência). | Reconciliar contrato no RF12. | Jornada: editar e conflito entre abas; TaskControllerWebTest | P1 | **7.28**\* | 5.75 |
| RF13 | Utilizar a funcionalidade gerar artefato dentro de esquemas, chats, abas e feed do Work Station | esquemas/chats | Botão 'Sugerir com IA' mostra 'indisponível' | AUSENTE | 0.00 | Gerar artefato não existe (sem motor de IA registrado). | Depende de AiGateway com motor e RF51. | decia.test.tsx (ai-unavailable) | P2 | **0.00** | 2.3 |
| RF14 | Visualizar perfil de um chefe de departamento | /departments/[slug] | InstitutionalHeader · lib/social (DEMO) | DEMO EM MEMÓRIA | 4.55 | Dados de exemplo; sem API. | API social/institucional. | capturas 42/43 (docs/testes/shell) | P2 | **4.55** | 3.35 |
| RF15 | Visualizar perfil de um empresa ou órgão público/privado | /companies/[slug] | InstitutionalHeader · lib/social (DEMO) | DEMO EM MEMÓRIA | 4.55 | Dados de exemplo; sem API. | API social/institucional. | capturas 42/43 (docs/testes/shell) | P2 | **4.55** | 3.35 |
| RF16 | Visualizar perfil de um usuário comum que é empregado dentro de uma empresa | /u/[username] | ProfileView · rules.canView | DEMO EM MEMÓRIA | 4.25 | SIGILOSO legível por todo o departamento (divergia do backend AccessPolicy). | Corrigido; falta API real. | b602d34; rules.test.ts | P0 | **4.55** | 3.25 |
| RF17 | Visualizar esquemas de tarefa & projetos criados por outros usuários na rede social do Work Station, através da aba "Buscar" | /search · /mural | rules · view-model | DEMO EM MEMÓRIA | 4.25 | Composição de projeto vazava títulos/contagem de tarefas ocultas. | Corrigido no modelo; falta API. | b602d34 | P0 | **4.55** | 3.35 |
| RF18 | Interagir socialmente com tarefas e projetos: curtir,comentar,salvar, compartilhar, remixar,retornar e atribuir | /mural · cards | SocialBar · rules (DEMO) | DEMO EM MEMÓRIA | 4.55 | Curtir/comentar/salvar somem no reload. | API idempotente (V16). | social.test.tsx | P1 | **4.55** | 3.8 |
| RF19 | Curtir, comentar, salvar, compartilhar, retornar, atribuir e remixar tarefas, esquemas de projeto e planos anuais (interações sociais) | /tasks/t-* | SocialBar · RemixDialog (DEMO) | DEMO EM MEMÓRIA | 4.55 | Interações não persistem. | API social. | social.test.tsx | P1 | **4.55** | 3.8 |
| RF20 | Utilizar o construtor de projetos do Work Station para compreender se as tarefas de meu acervo são adequadas dentro de meu ambiente empresarial | /projects/new · /desk | RfPage | AUSENTE | 0.00 | Construtor/mesa de projetos inexistentes. | Agregado Projeto (RF5). | registry.ts | P1 | **0.00** | 0.0 |
| RF21 | Utilizar a mesa de trabalho digital de meu perfil | /projects/new · /desk | RfPage | AUSENTE | 0.00 | Construtor/mesa de projetos inexistentes. | Agregado Projeto (RF5). | registry.ts | P1 | **0.00** | 2.45 |
| RF22 | Editar um Esquema de Projeto na Mesa de Trabalho (quadro por fase, linha do tempo e canvas livre) com versões e histórico | /projects/new · /desk | RfPage | AUSENTE | 0.00 | Construtor/mesa de projetos inexistentes. | Agregado Projeto (RF5). | registry.ts | P1 | **0.00** | 0.0 |
| RF23 | Importar tarefas ou projetos outros provedores para dentro de meu perfil do Work Station | /tasks/new (importar) · peças | Nenhum adapter | AUSENTE | 0.00 | Nenhum conector ou importador. | Ver CONECTORES.md: um adapter por vez, com estados e testes negativos. | CONECTORES.md | P1 | **0.00** | 0.0 |
| RF24 | Visualizar a aba metas & objetivos de minha equipe com insights analíticos gerados por IA | página-esqueleto | RfPage (texto do RF + estado vazio) | AUSENTE | 0.00 | Jornada não implementada. | Implementar na onda correspondente do PLANO_EXECUCAO. | lib/pages/registry.ts | P2 | **0.00** | 0.0 |
| RF25 | Agrupar projetos e tarefas em Programas, Exercícios e Gestões (agrupamentos institucionais) | página-esqueleto | RfPage (texto do RF + estado vazio) | AUSENTE | 0.00 | Jornada não implementada. | Implementar na onda correspondente do PLANO_EXECUCAO. | lib/pages/registry.ts | P2 | **0.00** | 0.0 |
| RF26 | Utilizar o Copilot do WS para criar sugestões de tarefas e projetos de maneira mais prática e funcional | /autopilot · /insights | AiGateway (sem chamador; AiProvidersConfig vazio) | LÓGICA SEM INTERFACE | 0.30 | Copilot sem motor nem chamada. | Registrar motor e expor endpoint com autonomia (RF51). | AiGatewayTest | P1 | **0.30** | 5.05 |
| RF27 | Navegar no Mural (mural da empresa e vitrine de projetos) e Buscar projetos, tarefas, pessoas, empresas e chefes de departamento | /mural | MuralFeed (DEMO) | DEMO EM MEMÓRIA | 4.55 | Feed de exemplo; não comunica trabalho real. | Publicações explícitas (não cada salvamento). | captura 48 | P1 | **4.55** | 3.8 |
| RF28 | Gerir perfis de empresa e chefe de departamento (departamentos, página institucional, chancela de tarefas/projetos e emissão de reconhecimentos) | /companies · /departments | DEMO + esqueletos de gestão | DEMO EM MEMÓRIA | 3.95 | Gestão institucional não operacional. | API institucional (V10). | registry.ts | P2 | **3.95** | 4.1 |
| RF29 | Integrar o DECIA ao Criador de Projetos — compartilhar tarefas/artefatos na sessão, abrir sessão a partir de um projeto, transformar argumentos/divergências/decisões em tarefas e manter o Rastro de Decisão | /decia/decisoes/[id] | DecisionWorkspace · lib/decia (DEMO) | DEMO EM MEMÓRIA | 4.45 | IA aceitável após decidir; versão regredia; critérios mudavam sem aparecer; sem votação nem decisão de grupo. | Corrigidos os 3 primeiros; falta API e deliberação de grupo. | 5866bca; commands.test.ts; captura 17 | P1 | **5.10** | 4.05 |
| RF30 | Gerar um Esquema de Projeto completo com o Autopiloto de Projeto a partir de uma demanda (ofício, e-mail ou frase), reutilizando modelos chancelados | página-esqueleto | RfPage (texto do RF + estado vazio) | AUSENTE | 0.00 | Jornada não implementada. | Implementar na onda correspondente do PLANO_EXECUCAO. | lib/pages/registry.ts | P2 | **0.00** | 0.0 |
| RF31 | Simular cenários sobre um Esquema de Projeto (corte de orçamento, atraso, troca de fornecedor, mudança de escopo) antes de enviá-lo à aprovação | página-esqueleto | RfPage (texto do RF + estado vazio) | AUSENTE | 0.00 | Jornada não implementada. | Implementar na onda correspondente do PLANO_EXECUCAO. | lib/pages/registry.ts | P2 | **0.00** | 0.0 |
| RF32 | Verificar a conformidade de um Esquema de Projeto no Espelho de Conformidade (checklists legais e do departamento) e sugerir as tarefas faltantes | página-esqueleto | RfPage (texto do RF + estado vazio) | AUSENTE | 0.00 | Jornada não implementada. | Implementar na onda correspondente do PLANO_EXECUCAO. | lib/pages/registry.ts | P2 | **0.00** | 0.0 |
| RF33 | Consultar a Memória Institucional (busca semântica sobre sessões encerradas, artefatos, projetos e tarefas) e fazer a IA do DECIA citar fontes institucionais | página-esqueleto | RfPage (texto do RF + estado vazio) | AUSENTE | 0.00 | Jornada não implementada. | Implementar na onda correspondente do PLANO_EXECUCAO. | lib/pages/registry.ts | P2 | **0.00** | 0.0 |
| RF34 | Extrair informações de desenhos técnicos e documentos (dwg/dxf/ifc/glb/pdf) com IA para gerar quantitativos, planilha orçamentária e cronograma pré-preenchidos | /tasks/new (importar) · peças | Nenhum adapter | AUSENTE | 0.00 | Nenhum conector ou importador. | Ver CONECTORES.md: um adapter por vez, com estados e testes negativos. | CONECTORES.md | P1 | **0.00** | 0.0 |
| RF35 | Participar de Metas coletivas, aparecer nos Destaques e receber Reconhecimentos (gamificação ligada ao perfil deliberativo, com DECIA Points como moeda) | página-esqueleto | RfPage (texto do RF + estado vazio) | AUSENTE | 0.00 | Jornada não implementada. | Implementar na onda correspondente do PLANO_EXECUCAO. | lib/pages/registry.ts | P2 | **0.00** | 0.0 |
| RF36 | Gerar o Dossiê de Transição (handoff) quando um empregado muda de departamento, sai ou uma gestão encerra, transferindo projetos, tarefas e pendências com contexto | página-esqueleto | RfPage (texto do RF + estado vazio) | AUSENTE | 0.00 | Jornada não implementada. | Implementar na onda correspondente do PLANO_EXECUCAO. | lib/pages/registry.ts | P2 | **0.00** | 0.0 |
| RF37 | Registrar reuniões com a Ata Viva (transcrição ou gravação → ata como tarefa + tarefas de encaminhamento com responsável e prazo dentro do projeto) | página-esqueleto | RfPage (texto do RF + estado vazio) | AUSENTE | 0.00 | Jornada não implementada. | Implementar na onda correspondente do PLANO_EXECUCAO. | lib/pages/registry.ts | P2 | **0.00** | 0.0 |
| RF38 | Aplicar a identidade visual do Work AI — ícones por tipo de tarefa, thumbnails automáticos, capa-mosaico de projeto, fio de decisão, lacres, etiquetas de estado, temas e skins da Mesa | cards e glifos | components/ui · social cards | DEMO EM MEMÓRIA | 5.70 | Identidade aplicada a dados DEMO. | Aplicar a dados reais (card de tarefa persistida criado). | PersistedTaskCard | P2 | **5.70** | 5.3 |
| RF39 | Criar chancelas (EMPRESA / CHEFE DE DEPARTAMENTO) e concedê-las a tarefas, projetos e planos por vínculo sugerido pela IA, por política de critérios ou por premiação; habilitar benefícios resgatáveis | página-esqueleto | RfPage (texto do RF + estado vazio) | AUSENTE | 0.00 | Jornada não implementada. | Implementar na onda correspondente do PLANO_EXECUCAO. | lib/pages/registry.ts | P2 | **0.00** | 0.0 |
| RF40 | Oferecer tarefas, projetos e kits como modelos no Balcão de Modelos (marketplace interno em DECIA Points, sem dinheiro) e reutilizá-los com crédito ao autor | página-esqueleto | RfPage (texto do RF + estado vazio) | AUSENTE | 0.00 | Jornada não implementada. | Implementar na onda correspondente do PLANO_EXECUCAO. | lib/pages/registry.ts | P2 | **0.00** | 0.0 |
| RF41 | Gerir o Acervo de Tarefas (inventário do usuário): estados, sub-filtros, ordenação, prazos legais, anexos & evidências e ações rápidas | /tasks | MyTasks · GET /api/tasks · lib/tasks/status | DEMO EM MEMÓRIA → **API REAL PARCIAL** | 4.55 | Antes: acervo só DEMO no perfil; estados mistos. Agora: sub-filtros, prazos legais, anexos e favoritos ausentes. | Sub-filtros e busca no acervo real. | Jornada: lista e filtro; tasks.test.tsx | P1 | **6.50**\* | 6.35 |
| RF42 | Acumular DECIA Points por participação de qualidade no chat DECIA e usá-los em compras dentro do app (Loja Work AI: modelos do Balcão, créditos de IA, capas/skins, impulsos, kits) | página-esqueleto | RfPage (texto do RF + estado vazio) | AUSENTE | 0.00 | Jornada não implementada. | Implementar na onda correspondente do PLANO_EXECUCAO. | lib/pages/registry.ts | P2 | **0.00** | 0.0 |
| RF43 | Usar a IA do sistema — insights do Acervo e do Perfil, ranking de usuários, motor do DECIA e Autopilot para criar tarefas e sugerir novos projetos com custo, tempo, prazo e viabilidade (EVM, CPM, PERT, Monte Carlo, ROI, matriz de risco) | /settings (Motor e custo da IA) | AI_MODES economia/avançado | API REAL PARCIAL | 4.80 | Rótulo 'Modo de IA' confundia custo com autonomia; nenhum insight real. | Renomeado; falta motor. | c51cb0e | P2 | **5.00** | 5.2 |
| RF44 | Receber a Tarefa do Dia sugerida pela IA e acompanhar o Hype Score de Eficiência (previsto × realizado), calculado por princípios de gestão empresarial e de projetos, com feedback diário e semana planejada | página-esqueleto | RfPage (texto do RF + estado vazio) | AUSENTE | 0.00 | Jornada não implementada. | Implementar na onda correspondente do PLANO_EXECUCAO. | lib/pages/registry.ts | P2 | **0.00** | 0.0 |
| RF45 | Calcular com a IA o Hype Score do Perfil (0–1000) a partir de tudo o que o usuário produziu, das interações recebidas (curtidas, reações, comentários, salvos, remixes) e da participação no DECIA — exibível ou oculto a critério do usuário, sempre explicável | /profile (Hype) | fixture | DEMO EM MEMÓRIA | 3.50 | Hype é número de exemplo. | Cálculo real com transparência. | fixtures.ts | P3 | **3.50** | 0.0 |
| RF46 | Utilizar chats de mensageria para comunicar-se com outros usuários e atribuir ou receber tarefas e projetos | página-esqueleto | RfPage (texto do RF + estado vazio) | AUSENTE | 0.00 | Jornada não implementada. | Implementar na onda correspondente do PLANO_EXECUCAO. | lib/pages/registry.ts | P2 | **0.00** | 0.0 |
| RF47 | Encontrar palavras-chave em documentos — varrer documentos longos de tarefas e projetos para localizar e extrair termos, frases e palavras (com contexto e fonte) | página-esqueleto | RfPage (texto do RF + estado vazio) | AUSENTE | 0.00 | Jornada não implementada. | Implementar na onda correspondente do PLANO_EXECUCAO. | lib/pages/registry.ts | P2 | **0.00** | 2.45 |
| RF48 | Utilizar a aba Agentes (Copilot de testes) para testar uma contratação antes do início e durante a execução — testes contratuais, orçamentários, comportamentais, de integridade e Score do Contrato, sempre com fundamentação bibliográfica | página-esqueleto | RfPage (texto do RF + estado vazio) | AUSENTE | 0.00 | Jornada não implementada. | Implementar na onda correspondente do PLANO_EXECUCAO. | lib/pages/registry.ts | P2 | **0.00** | 2.45 |
| RF49 | Coordenar Pactos de Desbloqueio entre usuários, chefes e departamentos | página-esqueleto | RfPage (texto do RF + estado vazio) | AUSENTE | 0.00 | Jornada não implementada. | Implementar na onda correspondente do PLANO_EXECUCAO. | lib/pages/registry.ts | P2 | **0.00** | 0.0 |
| RF50 | Analisar o perfil no Copilot e recomendar tarefas, projetos, pessoas da rede e caminhos profissionais | página-esqueleto | RfPage (texto do RF + estado vazio) | AUSENTE | 0.00 | Jornada não implementada. | Implementar na onda correspondente do PLANO_EXECUCAO. | lib/pages/registry.ts | P2 | **0.00** | 5.5 |
| RF51 | Controlar autonomia, escopo e execução da IA em Letters e Drawings | /settings?tab=trabalho · DECIA | lib/ai/autonomy.ts · settings · WorkspaceSections | AUSENTE → **API REAL PARCIAL** | 0.00 | Antes: nenhum controle de autonomia. Agora: política com 5 modos e efeito no DECIA; sem editor de peças nem executor de agente. | Aplicar a política no servidor e nos editores. | c51cb0e; autonomy.test.ts; capturas 11/14/15/16 | P1 | **6.17**\* | 4.5 |
| RF52 | Editar documentos estruturados no Work Station Letters | sem rota (não há /studio) | Nenhum código de Letters no app (protótipo em docs/exemplo_drawings_letters) | AUSENTE | 0.00 | Letters não existe no app. | Editor estruturado com blocos, versões e sugestões revisáveis. | find app components lib | P1 | **0.00** | 4.75 |
| RF53 | Analisar língua, morfossintaxe e gramática no Letters | sem rota (não há /studio) | Nenhum código de Letters no app (protótipo em docs/exemplo_drawings_letters) | AUSENTE | 0.00 | Letters não existe no app. | Editor estruturado com blocos, versões e sugestões revisáveis. | find app components lib | P1 | **0.00** | 3.3 |
| RF54 | Analisar coerência, narrativa, gênero e fontes no Letters | sem rota (não há /studio) | Nenhum código de Letters no app (protótipo em docs/exemplo_drawings_letters) | AUSENTE | 0.00 | Letters não existe no app. | Editor estruturado com blocos, versões e sugestões revisáveis. | find app components lib | P1 | **0.00** | 3.3 |
| RF55 | Revisar, completar e reescrever texto com IA no Letters | sem rota (não há /studio) | Nenhum código de Letters no app (protótipo em docs/exemplo_drawings_letters) | AUSENTE | 0.00 | Letters não existe no app. | Editor estruturado com blocos, versões e sugestões revisáveis. | find app components lib | P1 | **0.00** | 5.5 |
| RF56 | Colaborar, comentar e resolver conflitos em documentos Letters no DECIA | sem rota (não há /studio) | Nenhum código de Letters no app (protótipo em docs/exemplo_drawings_letters) | AUSENTE | 0.00 | Letters não existe no app. | Editor estruturado com blocos, versões e sugestões revisáveis. | find app components lib | P1 | **0.00** | 0.0 |
| RF57 | Selecionar objetos, pontos e regiões no Drawings | sem rota (não há /studio) | lib/studio/selection.ts | LÓGICA SEM INTERFACE | 0.30 | Só biblioteca testada; seleção incluía ocultos e patch ignorava reservas (corrigidos na lógica). | Editor de Drawings que use authorizePatch. | 4c6d05e, 72f5636 | P1 | **0.30** | 5.65 |
| RF58 | Criar e editar geometria vetorial e desenho técnico 2D | sem rota (não há /studio) | Nenhum código | AUSENTE | 0.00 | Funcionalidade inexistente no app. | Ver plano Drawings/Letters. | find app components lib | P1 | **0.00** | 5.15 |
| RF59 | Construir, dividir e desmembrar contornos vetoriais | sem rota (não há /studio) | Nenhum código | AUSENTE | 0.00 | Funcionalidade inexistente no app. | Ver plano Drawings/Letters. | find app components lib | P1 | **0.00** | 5.55 |
| RF60 | Modelar sólidos, superfícies e malhas 3D no Drawings | sem rota (não há /studio) | Nenhum código | AUSENTE | 0.00 | Funcionalidade inexistente no app. | Ver plano Drawings/Letters. | find app components lib | P1 | **0.00** | 4.85 |
| RF61 | Desmembrar e converter estruturas 3D preservando intenção | sem rota (não há /studio) | Nenhum código | AUSENTE | 0.00 | Funcionalidade inexistente no app. | Ver plano Drawings/Letters. | find app components lib | P1 | **0.00** | 4.85 |
| RF62 | Controlar vistas, câmera, perspectiva e coordenadas no Drawings | sem rota (não há /studio) | Nenhum código | AUSENTE | 0.00 | Funcionalidade inexistente no app. | Ver plano Drawings/Letters. | find app components lib | P1 | **0.00** | 5.55 |
| RF63 | Editar cores, gradientes, materiais e estilos de traço | sem rota (não há /studio) | Nenhum código | AUSENTE | 0.00 | Funcionalidade inexistente no app. | Ver plano Drawings/Letters. | find app components lib | P1 | **0.00** | 6.0 |
| RF64 | Gerar assets, wireframes e detalhes internos parametrizados | sem rota (não há /studio) | lib/pieces/wireframe.ts | LÓGICA SEM INTERFACE | 0.30 | Só biblioteca. | Editor de Drawings que use authorizePatch. | 4c6d05e, 72f5636 | P1 | **0.30** | 5.7 |
| RF65 | Editar regiões hierárquicas e camadas sobrepostas no Drawings | sem rota (não há /studio) | lib/pieces/layers.ts | LÓGICA SEM INTERFACE | 0.30 | Só biblioteca testada; seleção incluía ocultos e patch ignorava reservas (corrigidos na lógica). | Editor de Drawings que use authorizePatch. | 4c6d05e, 72f5636 | P1 | **0.30** | 5.7 |
| RF66 | Editar desenhos simultaneamente no DECIA com reservas transacionais | sem rota (não há /studio) | lib/pieces/collab.ts · lib/pieces/patch.ts | LÓGICA SEM INTERFACE | 0.30 | Só biblioteca testada; seleção incluía ocultos e patch ignorava reservas (corrigidos na lógica). | Editor de Drawings que use authorizePatch. | 4c6d05e, 72f5636 | P1 | **0.30** | 5.7 |
| RF67 | Completar geometria e prever traçados no Drawings | sem rota (não há /studio) | lib/pieces/wireframe.ts | LÓGICA SEM INTERFACE | 0.30 | Só biblioteca. | Editor de Drawings que use authorizePatch. | 4c6d05e, 72f5636 | P1 | **0.30** | 4.65 |
| RF68 | Gerar, auditar, estilizar, otimizar e converter desenhos com IA | sem rota (não há /studio) | Nenhum código | AUSENTE | 0.00 | Funcionalidade inexistente no app. | Ver plano Drawings/Letters. | find app components lib | P1 | **0.00** | 4.1 |
| RF69 | Salvar, exportar, recuperar e navegar no histórico das peças | sem rota (não há /studio) | Nenhum código | AUSENTE | 0.00 | Funcionalidade inexistente no app. | Ver plano Drawings/Letters. | find app components lib | P1 | **0.00** | 5.25 |
| RF70 | Importar, exportar e referenciar conteúdo técnico nas peças | /tasks/new (importar) · peças | Nenhum adapter | AUSENTE | 0.00 | Nenhum conector ou importador. | Ver CONECTORES.md: um adapter por vez, com estados e testes negativos. | CONECTORES.md | P1 | **0.00** | 4.2 |
| RF71 | Integrar peças Letters e Drawings à jornada de tarefas, projetos e DECIA | sem rota (não há /studio) | Nenhum código | AUSENTE | 0.00 | Funcionalidade inexistente no app. | Ver plano Drawings/Letters. | find app components lib | P1 | **0.00** | 3.45 |
| RF72 | Validar qualidade, desempenho e evidências dos editores | CI | .github/workflows/ci.yml | LÓGICA SEM INTERFACE | 0.30 | CI de main vermelha (npm ci, vitest .tsx); teste de lease instável (~1/5). | Restaurada; estabilizar lease.test.ts. | 4c6d05e; execuções locais | P0 | **0.60** | 5.35 |
| RF73 | Separar editor determinístico e Assistente IA com navegação acessível | sem rota (não há /studio) | Nenhum código | AUSENTE | 0.00 | Funcionalidade inexistente no app. | Ver plano Drawings/Letters. | find app components lib | P1 | **0.00** | 6.85 |
| RF74 | Capturar PNG e oferecer prévia fantasma multimodal no Drawings | sem rota (não há /studio) | Nenhum código | AUSENTE | 0.00 | Funcionalidade inexistente no app. | Ver plano Drawings/Letters. | find app components lib | P1 | **0.00** | 4.3 |

## Subnotas (inicial → após)

| RF | Func. | Efic. | Visual | Recup. | Acess. | Feedb. |
|---|---|---|---|---|---|---|
| RF1 | 6 | 7 | 7 | 6 | n/v | 6 |
| RF2 | 1 → 6 | 5 → 7 | 7 | 2 → 5 | n/v | 4 → 6 |
| RF3 | 7 | 7 | 7 | 7 | n/v | 7 |
| RF4 | 0 → 7 | 0 → 7 | 0 → 7 | 0 → 8 | 0 → n/v | 0 → 8 |
| RF5 | 0 | 0 | 0 | 0 | 0 | 0 |
| RF6 | 2 | 6 | 7 | 2 | 6 | 5 → 6 |
| RF7 | 1 | 4 | 6 | 1 | 6 | 4 |
| RF8 | 0 | 0 | 0 | 0 | 0 | 0 |
| RF9 | 0 | 0 | 0 | 0 | 0 | 0 |
| RF10 | 3 | 6 | 7 | 2 | 6 | 5 |
| RF11 | 4 | 6 | 7 | 6 | n/v | 6 |
| RF12 | 0 → 7 | 0 → 7 | 0 → 7 | 0 → 8 | 0 → n/v | 0 → 8 |
| RF13 | 0 | 0 | 0 | 0 | 0 | 0 |
| RF14 | 3 | 6 | 7 | 2 | 6 | 5 |
| RF15 | 3 | 6 | 7 | 2 | 6 | 5 |
| RF16 | 2 → 3 | 6 | 7 | 2 | 6 | 5 |
| RF17 | 2 → 3 | 6 | 7 | 2 | 6 | 5 |
| RF18 | 3 | 6 | 7 | 2 | 6 | 5 |
| RF19 | 3 | 6 | 7 | 2 | 6 | 5 |
| RF20 | 0 | 0 | 0 | 0 | 0 | 0 |
| RF21 | 0 | 0 | 0 | 0 | 0 | 0 |
| RF22 | 0 | 0 | 0 | 0 | 0 | 0 |
| RF23 | 0 | 0 | 0 | 0 | 0 | 0 |
| RF24 | 0 | 0 | 0 | 0 | 0 | 0 |
| RF25 | 0 | 0 | 0 | 0 | 0 | 0 |
| RF26 | 1 | 0 | 0 | 0 | 0 | 0 |
| RF27 | 3 | 6 | 7 | 2 | 6 | 5 |
| RF28 | 2 | 5 | 7 | 2 | 6 | 4 |
| RF29 | 3 → 4 | 6 | 7 | 2 → 3 | 6 | 4 → 6 |
| RF30 | 0 | 0 | 0 | 0 | 0 | 0 |
| RF31 | 0 | 0 | 0 | 0 | 0 | 0 |
| RF32 | 0 | 0 | 0 | 0 | 0 | 0 |
| RF33 | 0 | 0 | 0 | 0 | 0 | 0 |
| RF34 | 0 | 0 | 0 | 0 | 0 | 0 |
| RF35 | 0 | 0 | 0 | 0 | 0 | 0 |
| RF36 | 0 | 0 | 0 | 0 | 0 | 0 |
| RF37 | 0 | 0 | 0 | 0 | 0 | 0 |
| RF38 | 5 | 6 | 7 | 5 | 6 | 6 |
| RF39 | 0 | 0 | 0 | 0 | 0 | 0 |
| RF40 | 0 | 0 | 0 | 0 | 0 | 0 |
| RF41 | 3 → 6 | 6 → 7 | 7 | 2 → 6 | 6 → n/v | 5 → 7 |
| RF42 | 0 | 0 | 0 | 0 | 0 | 0 |
| RF43 | 2 | 6 → 7 | 7 | 5 | 6 | 6 |
| RF44 | 0 | 0 | 0 | 0 | 0 | 0 |
| RF45 | 1 | 5 | 6 | 2 | 6 | 4 |
| RF46 | 0 | 0 | 0 | 0 | 0 | 0 |
| RF47 | 0 | 0 | 0 | 0 | 0 | 0 |
| RF48 | 0 | 0 | 0 | 0 | 0 | 0 |
| RF49 | 0 | 0 | 0 | 0 | 0 | 0 |
| RF50 | 0 | 0 | 0 | 0 | 0 | 0 |
| RF51 | 0 → 5 | 0 → 7 | 0 → 7 | 0 → 6 | 0 → n/v | 0 → 7 |
| RF52 | 0 | 0 | 0 | 0 | 0 | 0 |
| RF53 | 0 | 0 | 0 | 0 | 0 | 0 |
| RF54 | 0 | 0 | 0 | 0 | 0 | 0 |
| RF55 | 0 | 0 | 0 | 0 | 0 | 0 |
| RF56 | 0 | 0 | 0 | 0 | 0 | 0 |
| RF57 | 1 | 0 | 0 | 0 | 0 | 0 |
| RF58 | 0 | 0 | 0 | 0 | 0 | 0 |
| RF59 | 0 | 0 | 0 | 0 | 0 | 0 |
| RF60 | 0 | 0 | 0 | 0 | 0 | 0 |
| RF61 | 0 | 0 | 0 | 0 | 0 | 0 |
| RF62 | 0 | 0 | 0 | 0 | 0 | 0 |
| RF63 | 0 | 0 | 0 | 0 | 0 | 0 |
| RF64 | 1 | 0 | 0 | 0 | 0 | 0 |
| RF65 | 1 | 0 | 0 | 0 | 0 | 0 |
| RF66 | 1 | 0 | 0 | 0 | 0 | 0 |
| RF67 | 1 | 0 | 0 | 0 | 0 | 0 |
| RF68 | 0 | 0 | 0 | 0 | 0 | 0 |
| RF69 | 0 | 0 | 0 | 0 | 0 | 0 |
| RF70 | 0 | 0 | 0 | 0 | 0 | 0 |
| RF71 | 0 | 0 | 0 | 0 | 0 | 0 |
| RF72 | 1 → 2 | 0 | 0 | 0 | 0 | 0 |
| RF73 | 0 | 0 | 0 | 0 | 0 | 0 |
| RF74 | 0 | 0 | 0 | 0 | 0 | 0 |
