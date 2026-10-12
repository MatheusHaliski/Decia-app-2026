# Matriz de cobertura dos 48 RF — revisão do board e código

**11/10/2026 · baseline `1932b73` · fonte: 48 cartões ativos do Trello, consultados ao vivo, e documentos locais.**

Nenhum RF foi classificado como completamente implementado nesta revisão. Entidades, migrations, telas e testes de regras não equivalem a uma jornada real completa. Os documentos locais contêm critérios “CA a confirmar”; os cartões sem descrição exigem critérios derivados explícitos para declarar aceite integral.

A classificação indica o nível de evidência encontrado, não ausência de todos os componentes de uma funcionalidade. A revisão de cada CA deve registrar endpoint/caso de uso, política de acesso, teste e resultado.

| RF | Requisito local | Evidência/estado conservador | Próxima entrega necessária |
|---|---|---|---|
| RF1 | Cadastrar usuário na plataforma com dados de acesso | Parcial com API de identidade | Concluir aceite/versões de políticas, validação institucional e envio real de e-mail |
| RF2 | Autenticar usuário na plataforma com credenciais de acesso | Parcial com API de identidade | Validar sessão real, 2FA/OIDC conforme board; corrigir binding JWT e envio nativo seguro |
| RF3 | Editar informações pessoais e preferências do perfil do usuário | Parcial com API de identidade | Concluir direitos do titular, exportação, anonimização e preferências persistidas |
| RF4 | Utilizar o criador de tarefas, escolhendo o tipo do arquivo e editando detalhes, em modo manual ou com IA | Especificação/domínio/tela não comprovam entrega ponta a ponta | API do criador de tarefas, edição/upload e modo assistido governado |
| RF5 | Utilizar o criador de projetos, escolhendo em cada fase do projeto as unidades de tarefa, em modo manual ou com IA | Especificação/domínio/tela não comprovam entrega ponta a ponta | API do construtor por fases, versões e validação de composição |
| RF6 | Acessar e gerenciar o Perfil Empresarial (Acervo Digital + Projetos Salvos) | UI/regras DEMO; integração real pendente | Perfil empresarial e acervo/projetos persistidos com autorização |
| RF7 | Abrir um esquema de tarefa a partir da lista de um esquema de projeto | UI/regras DEMO; integração real pendente | Abrir tarefa vinculada ao projeto com autorização e contexto |
| RF8 | Editar arquivos de tarefas ou projetos dentro de meu perfil do Work Station | Especificação/domínio/tela não comprovam entrega ponta a ponta | Editor persistente, upload seguro e concorrência |
| RF9 | Permitir que um chefe de departamento possa adicionar ou remover um usuário da sua lista de empregados atuais | Especificação/domínio/tela não comprovam entrega ponta a ponta | Gestão real de vínculos departamento–empregado e trilha |
| RF10 | Permitir que o chefe de departamento possa atribuir uma tarefa ou projeto a um usuário | Especificação/domínio/tela não comprovam entrega ponta a ponta | Atribuição persistente, aceite e notificações sem exposição indevida |
| RF11 | Utilizar o editor de arte de fundo para personalizar esquemas de tarefas e projetos | Especificação/domínio/tela não comprovam entrega ponta a ponta | Persistir aparência e versões; validar acessibilidade e exportação |
| RF12 | Editar um esquema de tarefa ou projeto de meu perfil | Especificação/domínio/tela não comprovam entrega ponta a ponta | Edição real de tarefa/projeto, histórico e controle de versão |
| RF13 | Utilizar a funcionalidade gerar artefato dentro de esquemas, chats, abas e feed do Work Station | Especificação/domínio/tela não comprovam entrega ponta a ponta | Geração de artefatos com fontes, limites de acesso e aceite humano |
| RF14 | Visualizar perfil de um chefe de departamento | UI/regras DEMO; integração real pendente | Perfil do chefe com dados reais e filtragem por autorização |
| RF15 | Visualizar perfil de um empresa ou órgão público/privado | UI/regras DEMO; integração real pendente | Página institucional real, vínculo/verificação e visibilidade |
| RF16 | Visualizar perfil de um usuário comum que é empregado dentro de uma empresa | UI/regras DEMO; integração real pendente | Perfil empregado real e política de visibilidade |
| RF17 | Visualizar esquemas de tarefa & projetos criados por outros usuários na rede social do Work Station, através da aba "Buscar" | UI/regras DEMO; integração real pendente | Busca de conteúdo persistente com filtro de autorização |
| RF18 | Interagir socialmente com tarefas e projetos: curtir, comentar, salvar, compartilhar, remixar, retornar e atribuir | UI/regras DEMO; integração real pendente | Interações persistentes, autoria, deduplicação e isolamento |
| RF19 | Curtir, comentar, salvar, compartilhar, retornar, atribuir e remixar tarefas, esquemas de projeto e planos anuais (interações sociais) | UI/regras DEMO; integração real pendente | Integrar todas as interações sociais à API e testar por tipo de alvo |
| RF20 | Utilizar o construtor de projetos do Work Station para compreender se as tarefas de meu acervo são adequadas dentro de meu ambiente empresarial | Especificação/domínio/tela não comprovam entrega ponta a ponta | Validar adequação de tarefas ao contexto empresarial com critérios explicáveis |
| RF21 | Utilizar a mesa de trabalho digital de meu perfil | Especificação/domínio/tela não comprovam entrega ponta a ponta | Mesa persistente com ações reais e recuperação de edição |
| RF22 | Editar um Esquema de Projeto na Mesa de Trabalho (quadro por fase, linha do tempo e canvas livre) com versões e histórico | Especificação/domínio/tela não comprovam entrega ponta a ponta | Quadro/timeline/canvas com histórico e conflitos de versão |
| RF23 | Importar tarefas ou projetos de outros provedores para dentro de meu perfil do Work Station | Especificação/domínio/tela não comprovam entrega ponta a ponta | Importadores com limites, sanitização, proveniência e idempotência |
| RF24 | Visualizar a aba metas & objetivos de minha equipe com insights analíticos gerados por IA | Especificação/domínio/tela não comprovam entrega ponta a ponta | Metas de equipe persistentes, analytics e insights governados |
| RF25 | Agrupar projetos e tarefas em Programas, Exercícios e Gestões (agrupamentos institucionais) | Especificação/domínio/tela não comprovam entrega ponta a ponta | Agrupamentos institucionais com autorização e regras de vínculo |
| RF26 | Utilizar o Copilot do WS para criar sugestões de tarefas e projetos de maneira mais prática e funcional | Especificação/domínio/tela não comprovam entrega ponta a ponta | Copilot com sugestões fundamentadas, autorização e aceite explícito |
| RF27 | Navegar no Mural (mural da empresa e vitrine de projetos) e Buscar projetos, tarefas, pessoas, empresas e chefes de departamento | UI/regras DEMO; integração real pendente | Mural/busca reais, paginação e isolamento institucional |
| RF28 | Gerir perfis de empresa e chefe de departamento (departamentos, página institucional, chancela de tarefas/projetos e emissão de reconhecimentos) | Especificação/domínio/tela não comprovam entrega ponta a ponta | Aprovação/gestão institucional, perfis e reconhecimentos reais |
| RF29 | Integrar o DECIA ao Criador de Projetos — compartilhar tarefas/artefatos na sessão, abrir sessão a partir de um projeto, transformar argumentos/divergências/decisões em tarefas e manter o Rastro de Decisão | UI/regras DEMO; integração real pendente | API de decisão + integração projetos/sessões/tarefas + rastro imutável |
| RF30 | Gerar um Esquema de Projeto completo com o Autopiloto de Projeto a partir de uma demanda (ofício, e-mail ou frase), reutilizando modelos chancelados | Especificação/domínio/tela não comprovam entrega ponta a ponta | Autopiloto com modelos autorizados, fontes e revisão humana |
| RF31 | Simular cenários sobre um Esquema de Projeto (corte de orçamento, atraso, troca de fornecedor, mudança de escopo) antes de enviá-lo à aprovação | Especificação/domínio/tela não comprovam entrega ponta a ponta | Simulação de cenários reproducível com premissas e limites explícitos |
| RF32 | Verificar a conformidade de um Esquema de Projeto no Espelho de Conformidade (checklists legais e do departamento) e sugerir as tarefas faltantes | Especificação/domínio/tela não comprovam entrega ponta a ponta | Conformidade por checklist versionado, evidência e aprovação humana |
| RF33 | Consultar a Memória Institucional (busca semântica sobre sessões encerradas, artefatos, projetos e tarefas) e fazer a IA do DECIA citar fontes institucionais | Especificação/domínio/tela não comprovam entrega ponta a ponta | Memória indexada com fontes/citações e isolamento de sigilo |
| RF34 | Extrair informações de desenhos técnicos e documentos (dwg/dxf/ifc/glb/pdf) com IA para gerar quantitativos, planilha orçamentária e cronograma pré-preenchidos | Especificação/domínio/tela não comprovam entrega ponta a ponta | Extração segura por formato, rastreio da fonte e correção humana |
| RF35 | Participar de Metas coletivas, aparecer nos Destaques e receber Reconhecimentos (gamificação ligada ao perfil deliberativo, com DECIA Points como moeda) | Especificação/domínio/tela não comprovam entrega ponta a ponta | Metas e reconhecimentos reais; validar incentivos e privacidade |
| RF36 | Gerar o Dossiê de Transição (handoff) quando um empregado muda de departamento, sai ou uma gestão encerra, transferindo projetos, tarefas e pendências com contexto | Especificação/domínio/tela não comprovam entrega ponta a ponta | Dossiê de transição com pendências, autorização e trilha de transferência |
| RF37 | Registrar reuniões com a Ata Viva (transcrição ou gravação → ata como tarefa + tarefas de encaminhamento com responsável e prazo dentro do projeto) | Especificação/domínio/tela não comprovam entrega ponta a ponta | Gravação/transcrição com consentimento, retenção e encaminhamentos reais |
| RF38 | Aplicar a identidade visual do Work AI — ícones por tipo de tarefa, thumbnails automáticos, capa-mosaico de projeto, fio de decisão, lacres, etiquetas de estado, temas e skins da Mesa | Base visual implementada; auditoria incompleta | Remover jargão do modo normal; auditar temas, semântica e performance |
| RF39 | Criar chancelas (EMPRESA / CHEFE DE DEPARTAMENTO) e concedê-las a tarefas, projetos e planos por vínculo sugerido pela IA, por política de critérios ou por premiação; habilitar benefícios resgatáveis | Especificação/domínio/tela não comprovam entrega ponta a ponta | Chancelas/políticas/benefícios reais com trilha de concessão e resgate |
| RF40 | Oferecer tarefas, projetos e kits como modelos no Balcão de Modelos (marketplace interno em DECIA Points, sem dinheiro) e reutilizá-los com crédito ao autor | Especificação/domínio/tela não comprovam entrega ponta a ponta | Marketplace interno com crédito ao autor e transações idempotentes |
| RF41 | Gerir o Acervo de Tarefas (inventário do usuário): estados, sub-filtros, ordenação, prazos legais, anexos & evidências e ações rápidas | UI/regras DEMO; integração real pendente | API do acervo, filtros, prazos, anexos e ações rápidas persistentes |
| RF42 | Acumular DECIA Points por participação de qualidade no chat DECIA e usá-los em compras dentro do app (Loja Work AI: modelos do Balcão, créditos de IA, capas/skins, impulsos, kits) | Especificação/domínio/tela não comprovam entrega ponta a ponta | Ledger de pontos, antifraude, idempotência e compras atômicas |
| RF43 | Usar a IA do sistema — insights do Acervo e do Perfil, ranking de usuários, motor do DECIA e Autopilot para criar tarefas e sugerir novos projetos com custo, tempo, prazo e viabilidade (EVM, CPM, PERT, Monte Carlo, ROI, matriz de risco) | Especificação/domínio/tela não comprovam entrega ponta a ponta | Clientes de IA, orçamento, sigilo, avaliação e motores quantitativos rastreáveis |
| RF44 | Receber a Tarefa do Dia sugerida pela IA e acompanhar o Hype Score de Eficiência (previsto × realizado), calculado por princípios de gestão empresarial e de projetos, com feedback diário e semana planejada | Especificação/domínio/tela não comprovam entrega ponta a ponta | Planejamento diário e eficiência com métricas justas e contestação |
| RF45 | Calcular com a IA o Hype Score do Perfil (0–1000) a partir de tudo o que o usuário produziu, das interações recebidas (curtidas, reações, comentários, salvos, remixes) e da participação no DECIA — exibível ou oculto a critério do usuário, sempre explicável | Especificação/domínio/tela não comprovam entrega ponta a ponta | Hype explicável, privacidade/opt-out e proteção contra incentivo a volume |
| RF46 | Utilizar chats de mensageria para comunicar-se com outros usuários e atribuir ou receber tarefas e projetos | Especificação/domínio/tela não comprovam entrega ponta a ponta | Mensageria real, entrega autorizada, histórico e atribuições |
| RF47 | Encontrar palavras-chave em documentos — varrer documentos longos de tarefas e projetos para localizar e extrair termos, frases e palavras (com contexto e fonte) | Especificação/domínio/tela não comprovam entrega ponta a ponta | OCR/extração + índice autorizado e contexto da fonte |
| RF48 | Utilizar a aba Agentes (Copilot de testes) para testar uma contratação antes do início e durante a execução — testes contratuais, orçamentários, comportamentais, de integridade e Score do Contrato, sempre com fundamentação bibliográfica | Especificação/domínio/tela não comprovam entrega ponta a ponta | Agentes de testes com fundamentação, gate de sigilo e revisão humana |

## Ordem de execução

1. Identidade/segurança: carregamento JWT, envio seguro dos formulários, direitos/termos e controles de autorização.
2. Núcleo: acervo/tarefas, projetos e API decisória persistente, com outbox, versão e snapshots.
3. Institucional/colaboração: vínculos, atribuições, mensageria e notificações.
4. Planejamento, simulação, conformidade e memória, com fontes e isolamento de acesso.
5. IA e agentes: governança, avaliação, custo e aceite humano.
6. Gamificação/marketplace: ledger, antifraude e revisão de incentivos.
7. Acessibilidade, performance, operação e aceite por RF/CA.

## Definição de completamente implementado

Cada CA confirmado no board deve ter fluxo real, persistência quando necessária, autenticação/autorização, erros/estados e acessibilidade, testes unitários/integração/E2E pertinentes, evidência de execução e nenhum bloqueador aberto. Confirmar também operação, retenção, concorrência e privacidade conforme o RF.

## Melhorias posteriores ao cenário inicial

- RF1/RF2: binding JWT corrigido e formulários POST; testes de regressão aprovados. Outros critérios continuam abertos.
- RF4/RF8/RF12/RF41: núcleo de tarefas manuais com API, persistência, versionamento e histórico; interface conectada. Histórico e restauração passaram com MySQL e navegador, incluindo login real e reinício da API; isolamento empresarial e sigilo validados. Estes RF permanecem parciais.
- Evidências e limites: [VALIDACAO.md](VALIDACAO.md).

## Acesso externo confirmado

Configurar `TRELLO_API_KEY` e `TRELLO_TOKEN` em segredos do ambiente, com destinos `api.trello.com`; liberar `api.trello.com` e `trello.com`. Não usar o token do convite como token de API e não enviar valores pelo chat. A leitura autenticada funcionou após o usuário configurar as variáveis. 48 RF ativos foram reconciliados; as implementações permanecem em andamento.

## Reconciliação com o Trello

Foram lidos 203 cartões do board, incluindo arquivados. A lista Requisitos Funcionais tem 48 RF ativos e dois cartões RF17/RF18 arquivados. Os 18 cartões antigos nas listas Sprint Backlog também estão arquivados. A numeração atual RF1–RF48 é a fonte desta matriz. As descrições ativas e seus links estão em `TRELLO_RF_ATIVOS.md`.

- Q-166 resolvida pelo usuário: administração exige concessão explícita para SIGILOSO (D-107). Nome/perfil no shell passam a vir da conta real (D-108). Resultados atuais em `VALIDACAO.md`.
