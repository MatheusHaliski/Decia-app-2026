# RF5 — Utilizar o criador de projetos, escolhendo em cada fase do projeto as unidades de tarefa, em modo manual ou com IA
**HU:** HU5 · **Sprint (board Work Station):** lista *Requisitos Funcionais* sem sprint atribuída (o card "SPRINT 1" cita "RF5 Iniciar sessão", escopo antigo — `RENUMERACAO.md`; fase (e) da ARQUITETURA §6) · **Equivalente FAI:** RF5 Criar esquema (aba "Criar Look": slots por tipo com uma peça de cada, selects alimentados pelo Closet, modo Manual / Com IA, título, ocasião, estilo, orientação livre, foto opcional, capa = composição das peças, selos vindos das peças, pré-visualização do card, cadastrar nova peça inline, mínimo de 2 peças) · **Aba/rota:** Criar Projeto (`/projects/new`; folha "+ Criar"); API `POST /api/projects`, `PUT /api/projects/draft`, `GET /api/me/tasks?phase=&q=` (selects), `POST /api/projects/compose-ai`, `POST /api/projects/from-model/{id}`, `POST /api/projects/{id}/publish`, `POST /api/projects/{id}/decia-session` (RF29)
**Critérios de aceite cobertos:** RF21.CA01 · CA02 · CA03 · CA04 · CA05 · CA06 · CA07 · CA08 · CA09 · CA10 · CA11 · CA12 · CA13 · CA14 — **corpo do card = antigo RF21** (o card RF5 traz os CAs escritos como RF21.CA01–14 e são citados como estão no board; ver `RENUMERACAO.md`). Todas as classes do RF são **(planejado)**; transversais reais do Bloco 1–3: `SecurityConfig`, `SessionActiveFilter`, `Guard`, `CorrelationIdFilter`, `AuditLogPort`, `RedisAdaptersConfig`, `AiProvidersConfig`.

> **HU5** — COMO usuário logado dentro do sistema WS POSSO acessar a aba criar novo projeto PARA criar um esquema de projeto único e personalizado conforme as diretrizes de minha equipe de trabalho.

O **Esquema de Projeto** (`ProjectScheme`, TAXONOMIA §3.1) é a composição ordenada de tarefas (`ProjectTask`) por **7 fases** (`ProjectPhase`: DEMANDA · PLANEJAMENTO · ELABORAÇÃO · ANÁLISE · APROVAÇÃO · EXECUÇÃO · ENCERRAMENTO). Os selects de cada fase listam **somente as unidades de tarefa do Acervo do usuário** (RF6/RF41) compatíveis com a fase (mapa categoria → fase, `PhaseCompatibility`, como `SLOT_BY_CATEGORY` do FAI): Ofício/Protocolo → DEMANDA; ETP/TR/Cronograma → PLANEJAMENTO; Projeto básico/Planilha/Parecer → ELABORAÇÃO/ANÁLISE; Ata/Portaria → APROVAÇÃO; Contrato/Vistoria → EXECUÇÃO; Relatório final → ENCERRAMENTO; OUTRO em qualquer fase. Layout: **Acervo filtrável** (esquerda) · **slots por fase** (centro, `SelectList` + arrastar) · **Ficha do projeto** (direita: título, emoji, objetivo, processo ≤ 2, natureza ≤ 2, departamento, exercício, programa RF25, eixo RF24, prioridade, visibilidade herdada do perfil RF3, **Manual / Com IA**, orientação livre, foto, chancelas vindas das tarefas RF39, pré-visualização com capa-mosaico e `PhaseBar` RF38).

## 1. Diagrama de classes

```mermaid
classDiagram
  direction LR

  class ProjectController {
    <<controller>>
    +create(CreateProjectRequest, CurrentUser, ctx) ProjectView
    +saveDraft(DraftRequest, CurrentUser) void
    +loadDraft(CurrentUser) DraftView
    +composeWithAi(ComposeRequest, CurrentUser, ctx) List~ProjectProposal~
    +fromModel(modelId, CurrentUser, ctx) DraftView
    +publish(id, CurrentUser, ctx) ProjectView
    +openDeciaSession(id, CurrentUser, ctx) SessionView
  }
  class AcervoController {
    <<controller>>
    +listMine(phase, q, filters, CurrentUser) Page~TaskOption~
  }
  class ProjectCompositionService {
    <<service>>
    +create(CreateProjectCommand, CurrentUser, ctx) ProjectScheme
    +validateMinimum(slots) void
    +resolveDefaults(ProjectTask) void
    +applySealsFromTasks(ProjectScheme) void
    +publish(id, CurrentUser, ctx) ProjectScheme
  }
  class PhaseCompatibility {
    <<service>>
    +phasesFor(TaskCategory) Set~ProjectPhase~
    +optionsFor(ownerId, phase, q) List~TaskOption~
  }
  class DependencyGraph {
    <<service>>
    +addDependency(pred, succ, type, lag) void
    +assertNoCycle() void
    +assertDatesConsistent() void
    +criticalPath() List~UUID~
  }
  class ProjectAutopilotService {
    <<service>>
    +compose(ComposeCommand) List~ProjectProposal~
  }
  class DraftService {
    <<service>>
    +save(ownerId, DraftJson) void
    +load(ownerId) Optional~DraftJson~
    +clear(ownerId) void
  }
  class ModelImportService {
    <<service>>
    +fromModel(modelId, CurrentUser) DraftJson
  }
  class DeciaBridgeService {
    <<service>>
    +openSessionFromProject(projectId, CurrentUser) DeciaSession
  }
  class MosaicService {
    <<service>>
    +buildMosaic(ProjectScheme) JSON
  }
  class TaskStateMachine {
    <<service>>
    +transition(TaskItem, TaskState, actor, reason) TaskStateLog
  }
  class AiEngine {
    <<service>>
    +run(AiRequest) AiResponse
    capability COMPOR_PROJETO
  }
  class ProjectRepositoryPort {
    <<port>>
    +save(ProjectScheme) ProjectScheme
  }
  class TaskRepositoryPort {
    <<port>>
    +findMine(ownerId, filters) Page
    +findSharedWithMe(userId) List
  }
  class DraftStorePort {
    <<port>>
    +put(key, json, ttl) void
    +get(key) Optional
  }
  class MuralPort {
    <<port>>
    +publish(MuralEntry) void
  }

  class ProjectScheme {
    <<entity>>
    +UUID id
    +UUID ownerId
    +UUID companyId
    +UUID departmentId
    +String title
    +String emoji
    +String objective
    +Set~ProcessTag~ processTags
    +Set~NatureTag~ natureTags
    +CreationMode creationMode
    +SchemeOrigin origin
    +UUID originalProjectId
    +UUID sourceSessionId
    +String aiOrientation
    +ProjectStatus status
    +ProjectPhase currentPhase
    +Priority priority
    +Visibility visibility
    +int exerciseYear
    +UUID programGroupingId
    +UUID planAxisId
    +CoverMode coverMode
    +String coverUrl
    +JSON mosaicJson
    +JSON criticalPathJson
    +boolean aiGenerated
    +UUID aiInferenceId
    +JSON sealIdsJson
    +JSON autosaveDraftJson
    +long version
  }
  class ProjectTask {
    <<entity>>
    +UUID id
    +UUID projectId
    +UUID taskId
    +ProjectPhase phase
    +int sortOrder
    +UUID responsibleId
    +LocalDate dueAt
    +LocalDate startAt
    +BigDecimal estimatedHours
    +boolean isCritical
    +int slackDays
    +JSON snapshotJson
  }
  class ProjectTaskDependency {
    <<entity>>
    +UUID projectId
    +UUID predecessorProjectTaskId
    +UUID successorProjectTaskId
    +String type
    +int lagDays
  }
  class TaskItem {
    <<entity>>
    +UUID id
    +UUID ownerId
    +String title
    +TaskType type
    +TaskCategory category
    +TaskState state
    +Visibility visibility
    +LocalDate dueAt
    +UUID responsibleId
    +String thumbnailUrl
    +JSON sealIdsJson
    +int projectUsageCount
  }
  class SealBond {
    <<entity>>
    +UUID sealId
    +String targetType
    +UUID targetId
    +SealBondStatus status
  }
  class ProcessKit {
    <<entity>>
    +String name
    +ProcessTag processTag
  }
  class KitItem {
    <<entity>>
    +UUID taskId
    +ProjectPhase phase
    +boolean optional
  }
  class DeciaSession {
    <<entity>>
    +String topic
    +UUID linkedProjectId
    +SessionStatus status
  }
  class AiInferenceLog {
    <<entity>>
    +AiCapability capability
    +String hostRf
    +InferenceResult result
  }
  class ProjectStatus {
    <<enum>>
    RASCUNHO
    PUBLICADO
    EM_DECISAO
    APROVADO
    EM_EXECUCAO
    CONCLUIDO
    ARQUIVADO
    DEVOLVIDO
  }
  class ProjectPhase {
    <<enum>>
    DEMANDA
    PLANEJAMENTO
    ELABORACAO
    ANALISE
    APROVACAO
    EXECUCAO
    ENCERRAMENTO
  }
  class SchemeOrigin {
    <<enum>>
    CRIAR_PROJETO
    DECIA
    REMIX
    AUTOPILOTO
    MODELO
    CENARIO
    DOSSIE
    ATA_VIVA
  }
  class CreationMode {
    <<enum>>
    MANUAL
    COM_IA
  }

  ProjectController --> ProjectCompositionService
  ProjectController --> ProjectAutopilotService
  ProjectController --> DraftService
  ProjectController --> ModelImportService
  ProjectController --> DeciaBridgeService
  AcervoController --> PhaseCompatibility
  ProjectCompositionService --> PhaseCompatibility
  ProjectCompositionService --> DependencyGraph
  ProjectCompositionService --> MosaicService
  ProjectCompositionService --> TaskStateMachine
  ProjectCompositionService --> ProjectRepositoryPort
  ProjectCompositionService --> MuralPort
  PhaseCompatibility --> TaskRepositoryPort
  ProjectAutopilotService --> AiEngine
  ProjectAutopilotService --> TaskRepositoryPort
  DraftService --> DraftStorePort
  ProjectScheme "1" *-- "2..*" ProjectTask
  ProjectScheme "1" *-- "0..*" ProjectTaskDependency
  ProjectTask "0..*" --> "0..1" TaskItem : taskId (nulo se removida)
  ProjectScheme "0..*" --> "0..1" ProjectScheme : originalProjectId (modelo/remix)
  ProjectScheme "1" --> "0..1" DeciaSession : linkedProjectId (RF29)
  ProjectScheme "0..*" --> "0..1" AiInferenceLog
  TaskItem "1" --> "0..*" SealBond : chancela vem da tarefa
  ProcessKit "1" *-- "1..*" KitItem
  KitItem "0..*" --> "1" TaskItem
  ProjectScheme --> ProjectStatus
  ProjectScheme --> ProjectPhase
  ProjectScheme --> SchemeOrigin
  ProjectScheme --> CreationMode
  ProjectTask --> ProjectPhase
  note for ProjectScheme "+14 campos (descriptionMd, iconId, exerciseGroupingId, managementGroupingId, deskSkin, deskBackgroundJson, conformityPercent, hasBlockingPending, evmJson, nextMilestoneAt, lastDeciaEvent*, offeredInCounter, contadores sociais). ProjectTask: +12 (PERT O/M/P, EVM, moscow, canvas*, stickyColor, decisionTraceNodeId, removedByAuthor)."
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph ATOR["Empregado autenticado"]
    A1["Abre /projects/new"]
    A2["Preenche a ficha: título, objetivo, processo (≥1), natureza, departamento, exercício, programa, eixo, prioridade"]
    A3["Modo Manual: escolhe tarefas nos selects de cada fase (ou arrasta do Acervo)"]
    A4["Modo Com IA: confirma processo, natureza e orientação livre"]
    A5["Define dependências (A antes de B) e prazos"]
    A6["Salva · opcional: Publicar no Mural · Abrir sessão DECIA"]
  end
  subgraph FE["Next.js (App Router) · BFF"]
    F1["GET /api/me/tasks?state=DISPONIVEL → conta tarefas"]
    F2{"≥ 2 tarefas DISPONÍVEIS?"}
    F3["EmptyState: orienta Criar Tarefa (RF4) com atalho"]
    F4["Compositor: Acervo filtrável · 7 SelectList por fase · Ficha · PhaseBar + Mosaic (prévia)"]
    F5["SelectList.onCreateNew → RF4 em modal → tarefa volta selecionada na fase"]
    F6["Autosave a cada 10 s: PUT /api/projects/draft (Redis) · recupera ao reabrir"]
    F7["POST /api/projects/compose-ai → 3 propostas (fases, dependências, justificativa ✦) → escolhe e edita"]
    F8["POST /api/projects/from-model/{id} → selects pré-preenchidos com cópias/remixes"]
    F9["POST /api/projects"]
  end
  subgraph WEB["ws-web"]
    W1["JWT + SessionActiveFilter + Guard.requireCanCreate"]
    W2["ProjectController · AcervoController"]
    E422["422 VALIDACAO (título, ≥1 processo, mínimo 1 DEMANDA + 1 outra fase)"]
    E422C["422 CICLO_DEPENDENCIA / PRAZO_ANTERIOR_PREDECESSORA"]
    E403["403 ACESSO_NEGADO (tarefa de terceiro sem permissão de uso)"]
    E409["409 COTA_ESGOTADA (IA)"]
  end
  subgraph APP["ws-application"]
    S1["PhaseCompatibility.optionsFor: só tarefas do meu Acervo + compartilhadas com permissão · filtro categoria→fase · BLOQUEADA/ARQUIVADA desabilitadas com motivo"]
    S2["ProjectCompositionService.validateMinimum: DEMANDA + outra fase · título · ≥1 processo"]
    S3{"válido?"}
    S4["DependencyGraph: assertNoCycle · assertDatesConsistent · criticalPath"]
    S5{"grafo ok?"}
    S6["resolveDefaults: responsável = dono da tarefa · prazo = prazo da tarefa · ordem por fase"]
    S7["applySealsFromTasks: chancelas APROVADAS das tarefas → sealIdsJson · IA sugere tier PROJETO do mesmo emissor"]
    S8["coverMode: FOTO (Estúdio endireitar/recortar) ou MOSAICO (MosaicService)"]
    S9["save ProjectScheme RASCUNHO, origin CRIAR_PROJETO (ou AUTOPILOTO se integral da IA) · visibilidade herdada do perfil"]
    S10["TaskStateMachine: tarefas selecionadas DISPONIVEL → EM_USO (TaskStateLog com projectId) · projectUsageCount++"]
    S11["AuditLog PROJECT_CREATED · DraftService.clear"]
    S12["publish: status PUBLICADO · MuralPort (RF27) · recebe interações (RF18/RF19)"]
    S13["DeciaBridgeService: sessão tema = objetivo, participantes = responsáveis + chefe, tarefas anexadas · projeto EM_DECISAO (RF29)"]
    IA1["ProjectAutopilotService: AiEngine COMPOR_PROJETO só com tarefas do Acervo, respeitando orientação (materiais, prazos, departamento) · AiInferenceLog"]
    M1["ModelImportService: modelo público/chancelado ou Kit → cópias/remixes com crédito (RF26/RF40) · trocar cada uma pelo equivalente do Acervo"]
  end
  subgraph PERS["Persistência"]
    P1[("MySQL: project_schemes, project_tasks, project_task_dependencies, tasks (state), task_state_log, seal_bonds, decia_sessions, audit_log, ai_inference_log")]
    P2[("Redis: draft:project:{userId} TTL 7 d · AiQuota")]
    P3[("S3: foto/capa do projeto · mosaico")]
    P4[("OpenSearch ws-projects (ao publicar)")]
  end

  A1 --> F1 --> F2
  F2 -->|"não"| F3
  F2 -->|"sim"| F4 --> A2
  F4 --> S1
  A2 --> A3 --> F5
  A2 --> A4 --> F7 --> IA1 --> P2
  IA1 -->|"sem cota"| E409
  F4 --> F6 --> P2
  F4 --> F8 --> M1
  A3 --> A5 --> A6 --> F9 --> W1 --> W2 --> S2 --> S3
  W1 -->|"tarefa alheia"| E403
  S3 -->|"não"| E422
  S3 -->|"sim"| S4 --> S5
  S5 -->|"não"| E422C
  S5 -->|"sim"| S6 --> S7 --> S8 --> S9 --> S10 --> S11
  S8 --> P3
  S9 --> P1
  S10 --> P1
  S11 --> P2
  A6 -->|"Publicar"| S12 --> P4
  A6 -->|"Abrir sessão DECIA"| S13 --> P1
```

## 3. Diagrama de sequência

```mermaid
sequenceDiagram
  autonumber
  actor U as Usuário
  participant N as Next.js (App Router)
  participant C as Controller (ws-web)
  participant S as Service (ws-application)
  participant AI as AiEngine
  participant R as Repository/MySQL
  participant RD as Redis
  participant OS as OpenSearch
  participant EV as DomainEvents (AFTER_COMMIT)

  U->>N: abre /projects/new
  N->>C: GET /api/me/tasks?state=DISPONIVEL&size=1
  C->>S: PhaseCompatibility.optionsFor(ownerId)
  S->>R: count tasks DISPONIVEL do dono
  alt menos de 2 tarefas
    S-->>C: total < 2
    C-->>N: 200 {total}
    N-->>U: EmptyState com atalho para Criar Tarefa (RF4)
  else compositor
    C-->>N: 200 opções
    N-->>U: Acervo filtrável · 7 selects vazios · ficha
  end

  U->>N: abre o select da fase PLANEJAMENTO
  N->>C: GET /api/me/tasks?phase=PLANEJAMENTO&q=
  C->>S: PhaseCompatibility.optionsFor(ownerId, phase, q)
  S->>R: tasks do dono + compartilhadas com permissão, categoria compatível
  S-->>C: TaskOption {thumb, tipo, categoria, estado, prazo, disabledReason}
  C-->>N: 200 (BLOQUEADA/ARQUIVADA desabilitadas com motivo)

  loop a cada 10 s ou ao sair do campo
    N->>C: PUT /api/projects/draft {slots, ficha}
    C->>S: DraftService.save
    S->>RD: SET draft:project:{userId} TTL 7 d
  end

  opt modo Com IA
    U->>N: confirma processo, natureza, orientação
    N->>C: POST /api/projects/compose-ai
    C->>S: ProjectAutopilotService.compose
    S->>R: tarefas do Acervo (DISPONIVEL)
    S->>AI: run(COMPOR_PROJETO, hostRf RF5, orientação, lista de tarefas)
    AI->>RD: AiQuota.tryConsume
    alt cota esgotada
      AI-->>S: 409 COTA_ESGOTADA
      S-->>C: 409 (link para a Loja)
      C-->>N: 409
    else ok
      AI->>R: insert ai_inference_log
      AI-->>S: 3 propostas (fases, dependências, justificativa)
      S-->>C: List ProjectProposal
      C-->>N: 200 (escolhe, edita, continua)
    end
  end

  U->>N: define dependências e prazos, salva
  N->>C: POST /api/projects {ficha, slots, dependencies, coverMode, foto}
  C->>S: ProjectCompositionService.create(cmd, currentUser, ctx)
  S->>S: validateMinimum (DEMANDA + outra fase, título, ≥1 processo)
  alt só DEMANDA ou nenhuma tarefa
    S-->>C: 422 VALIDACAO details.slots "mínimo 1 em DEMANDA + 1 em outra fase"
    C-->>N: 422
  else ciclo ou prazo anterior à predecessora
    S->>S: DependencyGraph.assertNoCycle / assertDatesConsistent
    S-->>C: 422 CICLO_DEPENDENCIA ou PRAZO_ANTERIOR_PREDECESSORA
    C-->>N: 422
  else tarefa de terceiro sem permissão
    S-->>C: 403 ACESSO_NEGADO
    C-->>N: 403
  else ok
    S->>S: resolveDefaults (responsável = dono da tarefa, prazo = prazo da tarefa) · criticalPath
    S->>S: applySealsFromTasks (chancela vem da tarefa, RF39) · MosaicService (sem foto)
    S->>R: insert project_schemes (RASCUNHO, origin CRIAR_PROJETO ou AUTOPILOTO, visibility herdada)
    S->>R: insert project_tasks + project_task_dependencies
    S->>R: TaskStateMachine DISPONIVEL → EM_USO + task_state_log(projectId)
    S->>R: insert audit_log PROJECT_CREATED
    S-->>C: ProjectView
    C-->>N: 201 ProjectView
    EV->>RD: DEL draft:project:{userId}
    EV->>OS: index ws-projects (se não PRIVADA)
    N-->>U: ProjectCard com capa-mosaico e PhaseBar
  end

  opt abrir sessão DECIA (RF29)
    U->>N: "Abrir sessão DECIA sobre este projeto"
    N->>C: POST /api/projects/{id}/decia-session
    C->>S: DeciaBridgeService.openSessionFromProject
    S->>R: insert decia_sessions (topic = objective, linkedProjectId) + session_participants (responsáveis + chefe)
    S->>R: update project_schemes.status = EM_DECISAO
    S-->>C: SessionView
    C-->>N: 201 → /decia/{sessionId}
  end
```

## 4. Máquina de estados

Entidade central: **`ProjectScheme.status`** (`ProjectStatus`, TAXONOMIA §3.1/§13), com `ProjectStatusStateMachine`. O criador cria em `RASCUNHO`; `PUBLICADO` (CA11) e `EM_DECISAO` (CA12) nascem daqui; os demais são do RF22 (edição), RF15 (decisão validada) e RF8/RF12 (conclusão). O rascunho de autosave (CA14) **não** é um estado: é `autosaveDraftJson`/Redis antes de existir a entidade.

```mermaid
stateDiagram-v2
  direction LR
  state "RASCUNHO" as RAS
  state "PUBLICADO" as PUB
  state "EM_DECISAO" as DEC
  state "APROVADO" as APR
  state "DEVOLVIDO" as DEV
  state "EM_EXECUCAO" as EXE
  state "CONCLUIDO" as CON
  state "ARQUIVADO" as ARQ

  [*] --> RAS : POST /api/projects válido (CA04) · tarefas → EM_USO · origin CRIAR_PROJETO | AUTOPILOTO | MODELO
  RAS --> RAS : edição na Mesa (RF22) gera ProjectVersion
  RAS --> PUB : Publicar no Mural (CA11) · MuralEntry PROJETO_PUBLICADO · respeita visibility
  RAS --> DEC : Abrir sessão DECIA (CA12, RF29.CA01) · DeciaSession linkedProjectId
  PUB --> DEC : Abrir sessão DECIA a partir do publicado
  DEC --> APR : FinalDecision VALIDADA (RF15) · tarefa ATA_REGISTRO em APROVACAO
  DEC --> DEV : FinalDecision DEVOLVIDA (RF14/RF15)
  DEV --> DEC : sessão REABERTA
  DEV --> RAS : dono retoma a edição
  APR --> EXE : primeira ProjectTask em EXECUCAO iniciada
  PUB --> EXE : início da execução sem sessão
  EXE --> CON : última ProjectTask concluída (RF8.CA05)
  CON --> ARQ : arquivar
  RAS --> ARQ : descartar
  PUB --> ARQ : arquivar
  ARQ --> RAS : reabrir com justificativa (RF22.CA06)
  ARQ --> [*]
  note right of RAS
    Autosave (CA14) vive em Redis/autosaveDraftJson
    antes do POST e não gera EM_USO nas tarefas.
  end note
  note right of CON
    CONCLUIDO e ARQUIVADO bloqueiam edição
    (409 PROJETO_BLOQUEADO, RF22.CA06).
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FE["Frontend · Next.js 15 App Router"]
    PG["app/(shell)/projects/new · 3 colunas (Acervo · slots por fase · Ficha)"]
    UI["packages/ui: SelectList (phase, onCreateNew), PhaseBar (slots), Mosaic, ProjectCard (prévia), TaskCard compact, Seal, Spark ✦, Input/Select, Dialog (RF4 em modal), EmptyState"]
    SN["SidebarNav › + Criar · TopBar"]
    BFF["app/bff/projects/* · app/bff/me/tasks"]
    PG --> UI
    PG --> BFF
    SN --> PG
  end
  subgraph WSWEB["ws-web"]
    SEC["SecurityConfig · SessionActiveFilter · CurrentUserArgumentResolver"]
    PC["ProjectController · AcervoController"]
    GEH["GlobalExceptionHandler"]
  end
  subgraph WSAPP["ws-application"]
    PRJ["projects: ProjectCompositionService · PhaseCompatibility · DependencyGraph (CPM) · DraftService · ModelImportService · MosaicService · ProjectStatusStateMachine"]
    ACV["acervo: TaskStateMachine (EM_USO) · TaskRepositoryPort"]
    AIE["ai: AiEngine COMPOR_PROJETO · ProjectAutopilotService · AiQuota"]
    DEC["decia: DeciaBridgeService (RF29)"]
    SEAL["seals: chancela vem da tarefa · sugestão tier PROJETO"]
    SOC["social: MuralPort · Remix (crédito ao autor, RF26/RF40)"]
    PORTS["ports: ProjectRepositoryPort · TaskRepositoryPort · DraftStorePort · MuralPort · SearchIndexPort · MediaStoragePort · AuditLogPort"]
    EVT["events: ProjectCreated · ProjectPublished (AFTER_COMMIT)"]
    PRJ --> ACV
    PRJ --> AIE
    PRJ --> DEC
    PRJ --> SEAL
    PRJ --> SOC
    PRJ --> PORTS
    PRJ --> EVT
  end
  subgraph WSDOM["ws-domain"]
    DOM["projects: ProjectScheme · ProjectTask · ProjectTaskDependency · ProcessKit · KitItem · enums ProjectStatus/ProjectPhase/SchemeOrigin/CreationMode · acervo: TaskItem · TaskStateLog"]
  end
  subgraph INFRA["ws-infrastructure"]
    MY["persistence-mysql: Jpa*Repository · Flyway V__rf5_projects (planejado)"]
    RDS["cache-redis (RedisAdaptersConfig, flag redis.enabled): DraftStorePort draft:project:{userId} · AiQuota"]
    OSE["search-opensearch: ws-projects"]
    S3["storage-s3: foto do projeto · mosaico"]
    AIP["ai-providers: Claude → Gemini → LocalEngine"]
  end

  BFF -->|"REST JSON"| SEC --> PC --> PRJ
  PC --> GEH
  MY -.implementa.-> PORTS
  RDS -.implementa.-> PORTS
  OSE -.implementa.-> PORTS
  S3 -.implementa.-> PORTS
  AIP -.implementa.-> AIE
  PRJ --> DOM
  MY --> DB[("MySQL 8.4")]
  RDS --> RD[("Redis 7")]
  OSE --> OSX[("OpenSearch 2.19")]
  S3 --> MINIO[("S3 / MinIO")]
  AIP --> CL["Claude · Gemini"]
```

## 6. Rastreabilidade

| CA (card RF5, escrito como RF21) | Classe (§1) | Passo da atividade (§2) | Mensagem da sequência (§3) | Transição de estado (§4) | Componente (§5) | Situação |
|---|---|---|---|---|---|---|
| RF21.CA01 | `PhaseCompatibility.optionsFor`, `TaskRepositoryPort.findMine` | `A1`→`F1`→`F2`→`F4` | 1–9 | — | `PG`, `UI` (`SelectList`, `PhaseBar`) | planejado |
| RF21.CA02 | `PhaseCompatibility` (contagem), `EmptyState` | `F2`→`F3` | 5–7 | — | `UI` (`EmptyState`) | planejado |
| RF21.CA03 | `PhaseCompatibility.phasesFor/optionsFor`, `TaskOption.disabledReason`, `TaskRepositoryPort.findSharedWithMe` | `S1` | 10–14 | — | `ACV`, `UI` (`SelectList`) | planejado |
| RF21.CA04 | `ProjectCompositionService.create/resolveDefaults`, `ProjectTask`, `TaskStateMachine`, `SchemeOrigin.CRIAR_PROJETO` | `S2`→`S6`→`S9`→`S10`→`S11` | 33–34, 44–52 | `[*]`→`RAS`, `TaskState` DISPONIVEL→EM_USO | `PRJ`, `ACV`, `MY` | planejado |
| RF21.CA05 | `ProjectCompositionService.validateMinimum` | `S2`→`S3`→`E422` | 35–37 | — | `GEH` | planejado |
| RF21.CA06 | `ProjectAutopilotService`, `AiEngine` (COMPOR_PROJETO), `AiInferenceLog`, `SchemeOrigin.AUTOPILOTO` | `A4`→`F7`→`IA1`, `E409` | 19–32 | `[*]`→`RAS` (origin AUTOPILOTO) | `AIE`, `AIP`, `RDS` (cota) | planejado |
| RF21.CA07 | `SelectList.onCreateNew`, `TaskCreationService` (RF4) | `F5` | — | — | `UI` (`Dialog` com RF4) | planejado |
| RF21.CA08 | `DependencyGraph.assertNoCycle/assertDatesConsistent/criticalPath`, `ProjectTaskDependency`, `ProjectScheme.criticalPathJson` | `A5`→`S4`→`S5`→`E422C` | 38–40, 44 | — | `PRJ` (CPM) | planejado |
| RF21.CA09 | `ProjectCompositionService.applySealsFromTasks`, `SealBond`, `ProjectScheme.sealIdsJson` | `S7` | 45 | — | `SEAL`, `UI` (`Seal`) | planejado (RF39) |
| RF21.CA10 | `MosaicService`, `ProjectScheme.coverMode/coverUrl/mosaicJson` | `S8` | 45 | — | `UI` (`Mosaic`), `S3` | planejado (RF38) |
| RF21.CA11 | `ProjectCompositionService.publish`, `MuralPort`, `ProjectStatus.PUBLICADO` | `A6`→`S12` | 53 | `RAS`→`PUB` | `SOC`, `OSE` | planejado (RF27, RF18/RF19) |
| RF21.CA12 | `DeciaBridgeService.openSessionFromProject`, `DeciaSession.linkedProjectId`, `ProjectStatus.EM_DECISAO` | `A6`→`S13` | 56–62 | `RAS`→`DEC`, `PUB`→`DEC` | `DEC` | planejado (RF29) |
| RF21.CA13 | `ModelImportService.fromModel`, `ProcessKit`, `KitItem`, `SchemeOrigin.MODELO`, `Remix` | `F8`→`M1` | — | `[*]`→`RAS` (origin MODELO) | `SOC`, `PRJ` | planejado (RF26/RF40) |
| RF21.CA14 | `DraftService`, `DraftStorePort`, `ProjectScheme.autosaveDraftJson` | `F6`, `S11` | 15–18, 52 | nota de `RAS` | `RDS` (`draft:project:{userId}`) | planejado |
