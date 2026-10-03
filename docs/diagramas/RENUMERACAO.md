# Renumeração dos RFs no board Work Station (leitura de 2026-10-03)

Entre 2026-10-01 e 2026-10-02 os cards RF4–RF26 da lista *Requisitos Funcionais* foram **renomeados no padrão de numeração do FAI**, mas os corpos (critérios de aceite) continuam com os ids antigos e, em vários cards, o corpo não corresponde ao novo título. Os diagramas em `docs/diagramas/RFnn/` seguem a **numeração anterior** (a que os CAs ainda citam). Esta tabela liga as duas numerações até o board estabilizar (ver Q-44 em `../DECISOES.md`).

| Card atual (título novo) | Corpo/CAs que o card contém | Pasta de diagramas correspondente | Observação |
|---|---|---|---|
| RF1, RF2, RF3 | inalterados | RF1, RF2, RF3 | RF3 = perfil **e preferências** (o brief chama a tela de preferências de "RF23") |
| RF4 Criador de tarefas (manual/IA) | vazio | RF20 | corpo do criador de tarefas está no card RF20 |
| RF5 Criador de projetos por fase | CAs **RF21.CA01–14** | RF21 | corpo = antigo RF21 |
| RF6 Perfil Empresarial (Acervo + Projetos salvos) | vazio | RF19 + RF41 | |
| RF7 Abrir tarefa a partir do projeto | vazio | RF23 (parte "Levar ao meu acervo") | |
| RF8 Editar arquivos de tarefas/projetos | vazio | RF22 | |
| RF9 Chefe adiciona/remove empregado | vazio | RF28 (CA02 lotação) | **novo escopo**; antes RF9 = participantes da sessão |
| RF10 Chefe atribui tarefa/projeto | vazio | — (novo) | ver RF46; precisa de CAs |
| RF11 Editor de arte de fundo | vazio | RF38 (Estúdio de Arte do Card) | |
| RF12 Editar esquema de tarefa/projeto | vazio | RF22 | |
| RF13 Gerar artefato em esquemas, chats, abas e feed | vazio | RF13 (artefatos da sessão) | escopo ampliado para fora da sessão |
| RF14 Ver perfil de chefe | vazio | RF28 (página do departamento) | |
| RF15 Ver perfil de empresa/órgão | vazio | RF28 (página da empresa) | |
| RF16 Ver perfil de empregado | vazio | RF19 (CA02 perfil de terceiros) | |
| RF17 Ver esquemas de outros na aba Buscar | vazio | RF27 | |
| RF18 Interagir socialmente (+ retornar, atribuir) | vazio | RF26 | "retornar" e "atribuir" são interações novas |
| RF19 Curtir … retornar, atribuir e remixar | CAs **RF26.CA01–09** | RF26 | corpo = antigo RF26 |
| RF20 Construtor de projetos (adequação do acervo) | CAs **RF20.CA01–15** (criador de tarefas) | RF20 | título e corpo divergem |
| RF21 Mesa de trabalho digital do perfil | vazio | RF22 | |
| RF22 Editar projeto na Mesa | inalterado | RF22 | |
| RF23 Importar de outros provedores | CAs **RF23.CA01–05** (extrair tarefa + snapshot) | RF23 + RF20 (fontes Google/Microsoft) | título e corpo divergem |
| RF24 Metas & objetivos da equipe com insights IA | CAs **RF24.CA01–07** (Plano Anual) | RF24 | |
| RF25 Agrupamentos | inalterado | RF25 | |
| RF26 Copilot do WS para sugerir tarefas/projetos | CAs **RF19.CA01–07** (perfil) | RF19 (corpo) / RF30+RF43 (título) | título e corpo divergem |
| RF27–RF45 | inalterados | RF27–RF45 | |
| RF46 Chats de mensageria + atribuir/receber tarefas | vazio (HU46) | — (novo) | precisa de CAs |
| *(sem card)* sessão DECIA: tema/acesso, iniciar, mensagens, classificar, divergências, participantes, responder, resumo, decisão, artefatos, reabertura, revisão, perguntas, encerrar, indicadores | só nas listas Sprint 1–3 (HU1–HU18 antigas) | RF4–RF18 | o centro do produto ficou sem cards RF; o brief ainda cita RF4–RF17 |
