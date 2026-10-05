# RF30 — Gerar um Esquema de Projeto completo com o Autopiloto de Projeto a partir de uma demanda (ofício, e-mail ou frase), reutilizando modelos chancelados

**HU:** HU30 · **Sprint (board Work Station):** Product Backlog (pós-Sprint 4, a priorizar) · **Equivalente FAI:** Autopiloto + "Vista-me" (RF28) · **Aba/rota:** Autopiloto (`/autopilot`); proposta exibida na Mesa de Trabalho (RF22) em modo rascunho

**Critérios de aceite cobertos:** RF30.CA01 · RF30.CA02 · RF30.CA03 · RF30.CA04 · RF30.CA05 · RF30.CA06

> Contextos da TAXONOMIA: **3. Criador de Projetos** (`ProjectScheme` com `origin = AUTOPILOTO`, `ProjectTask`, `ProjectTaskDependency`), **2. Acervo** (`TaskItem` com `sourceKind = AUTOPILOT`), **6. Chancelas** (`SealBond APROVADA` = modelos chancelados), **8. Social** (`Remix` = crédito a cada modelo usado) e **10. IA do sistema** (`AiInferenceLog` capability `AUTOPILOT_PROJETO`, `InstitutionalMemoryDocument` para "projetos semelhantes", RF33). A proposta **não é persistida** no MySQL até o usuário confirmar (CA03): vive em Redis (`autopilot:draft:{draftId}`, TTL) — decisão a confirmar em `DECISOES.md`.

## 1. Diagrama de classes

```mermaid
classDiagram
  direction LR
  namespace ws-domain {
    class ProjectScheme {
      <<entity>>
      +UUID id
      +UUID ownerId
      +UUID departmentId
      +String title
      +String objective
      +CreationMode creationMode
      +SchemeOrigin origin
      +UUID originalProjectId
      +String aiOrientation
      +ProjectStatus status
      +ProjectPhase currentPhase
      +String deskSkin
      +boolean aiGenerated
      +UUID aiInferenceId
      +JSON autosaveDraftJson
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
      +BigDecimal estimatedHours
      +String moscow
      +JSON snapshotJson
      +double canvasX
      +double canvasY
    }
    class ProjectTaskDependency {
      <<entity>>
      +UUID id
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
      +AccessClassification accessClass
      +SourceKind sourceKind
      +UUID originalTaskId
      +boolean aiGenerated
      +UUID aiInferenceId
    }
    class SealBond {
      <<entity>>
      +UUID id
      +UUID sealId
      +String targetType
      +UUID targetId
      +SealBondStatus status
      +Instant issuedAt
    }
    class Remix {
      <<entity>>
      +UUID id
      +UUID actorId
      +String sourceType
      +UUID sourceId
      +String resultType
      +UUID resultId
      +UUID ledgerEntryId
    }
    class AiInferenceLog {
      <<entity>>
      +UUID id
      +UUID userId
      +UUID departmentId
      +AiCapability capability
      +String provider
      +String model
      +String mode
      +int latencyMs
      +int inputTokens
      +int outputTokens
      +BigDecimal estimatedCostUsd
      +String result
      +boolean fallbackUsed
      +JSON inputSummaryJson
      +String outputSummary
    }
    class InstitutionalMemoryDocument {
      <<entity>>
      +String docId
      +String sourceType
      +UUID sourceId
      +UUID companyId
      +UUID departmentId
      +String category
      +float[] embedding
    }
    class DeciaSession {
      <<entity>>
      +UUID id
      +String topic
      +UUID linkedProjectId
      +SessionStatus status
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
    class AiCapability {
      <<enum>>
      AUTOPILOT_PROJETO
      AUTOPILOT_TAREFAS
      COMPOR_PROJETO
      MEMORIA_BUSCA
    }
  }
  namespace ws-application {
    class AutopilotService {
      <<service>>
      +analyzeDemand(actorId, demandText, documentTaskId) DemandAnalysis
      +proposeScheme(actorId, analysis) AutopilotDraft
      +updateDraft(actorId, draftId, patch) AutopilotDraft
      +confirm(actorId, draftId) ProjectScheme
      +discard(actorId, draftId) void
    }
    class MemoryService {
      <<service>>
      +similarProjects(analysis, companyId, visibilityCtx) List~Citation~
    }
    class DeciaBridgeService {
      <<service>>
      +openSessionFromProject(actorId, projectId) DeciaSession
    }
    class AiEngine {
      <<service>>
      +extractDemand(text, accessClass) DemandAnalysis
      +composeScheme(analysis, templates, similar, history) SchemeProposal
      +isExternalAvailable(departmentId) boolean
    }
    class AiProviderPort {
      <<port>>
      +complete(prompt, mode, accessClass) AiResult
    }
    class EmbeddingPort {
      <<port>>
      +embed(text) float[]
    }
    class SearchIndexPort {
      <<port>>
      +knn(index, vector, filters, k) List~Hit~
    }
    class DraftCachePort {
      <<port>>
      +put(draftId, draft, ttl) void
      +get(draftId) AutopilotDraft
      +evict(draftId) void
    }
  }
  namespace ws-web {
    class AutopilotController {
      <<controller>>
      +analyze(body)
      +propose(body)
      +patchDraft(draftId, patch)
      +confirm(draftId)
      +discard(draftId)
      +openSession(draftId)
    }
  }
  namespace ws-infrastructure {
    class ClaudeAdapter {
      <<adapter>>
    }
    class GeminiAdapter {
      <<adapter>>
    }
    class LocalAutopilotEngine {
      <<adapter>>
      regras + modelos chancelados
    }
    class OpenSearchIndexAdapter {
      <<adapter>>
      índice ws-memory
    }
    class RedisDraftCache {
      <<adapter>>
      autopilot draft TTL
    }
  }
  ProjectScheme "1" --> "*" ProjectTask
  ProjectScheme "1" --> "*" ProjectTaskDependency
  ProjectTask --> TaskItem : taskId
  ProjectScheme --> SchemeOrigin
  ProjectScheme --> CreationMode
  ProjectScheme --> ProjectPhase : currentPhase
  ProjectScheme --> AiInferenceLog : aiInferenceId
  ProjectScheme --> ProjectScheme : originalProjectId modelo
  Remix --> ProjectScheme : resultId
  Remix ..> SealBond : sourceId modelo chancelado
  SealBond ..> ProjectScheme : targetType PROJECT
  AiInferenceLog --> AiCapability
  DeciaSession --> ProjectScheme : linkedProjectId
  AutopilotService ..> AiEngine
  AutopilotService ..> MemoryService : RF33 semelhantes
  AutopilotService ..> DraftCachePort : rascunho volátil
  AutopilotService ..> ProjectScheme : confirm
  AutopilotService ..> Remix : crédito por modelo
  AutopilotService ..> AiInferenceLog
  AutopilotService ..> DeciaBridgeService : CA06
  AiEngine ..> AiProviderPort
  MemoryService ..> EmbeddingPort
  MemoryService ..> SearchIndexPort
  AutopilotController ..> AutopilotService
  ClaudeAdapter ..|> AiProviderPort
  GeminiAdapter ..|> AiProviderPort
  LocalAutopilotEngine ..|> AiProviderPort : fallback provider LOCAL
  OpenSearchIndexAdapter ..|> SearchIndexPort
  RedisDraftCache ..|> DraftCachePort
  note for ProjectScheme "tabela project_schemes · origin AUTOPILOTO · creationMode COM_IA · .. +25 campos .."
  note for AiInferenceLog "capability AUTOPILOT_PROJETO · inputSummaryJson lista os modelos de referência · .. +10 campos .."
  note for TaskItem "sourceKind AUTOPILOT quando a tarefa nasce da proposta · .. +40 campos .."
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph L1["Ator humano"]
    U1["Abre /autopilot e informa a demanda: texto livre, ofício ou e-mail colado, ou DOCUMENTO do acervo"]
    U2["Revê a proposta na Mesa de Trabalho em modo rascunho"]
    U3{"Aceitar, remover ou trocar tarefa?"}
    U4["Confirma a proposta"]
    U5["Clica Abrir sessão DECIA sobre a proposta"]
  end
  subgraph L2["Web/BFF (Next.js App Router)"]
    W1["Aviso de fallback: motor local, sem IA externa"]
    W2["Mesa RF22 com cartões rascunho, faísca ✦ e créditos aos modelos usados"]
    W3["Card do projeto com faísca ✦ e origem AUTOPILOTO"]
  end
  subgraph L3["ws-application"]
    S1{"Demanda vazia ou DOCUMENTO inacessível?"}
    S2{"accessClass RESTRITO ou SIGILOSO?"}
    S3{"Chave de IA e cota disponíveis?"}
    S4["Mascara campos sensíveis e segue com provider externo"]
    S5["Seleciona modelos chancelados: SealBond APROVADA targetType PROJECT da empresa ou departamento"]
    S6["MemoryService.similarProjects: projetos CONCLUIDO semelhantes (RF33)"]
    S7["Monta AutopilotDraft: fases, tarefas (tipo e categoria), dependências, responsáveis sugeridos por histórico do departamento, prazos, créditos"]
    S8["DraftCachePort.put (Redis, TTL) · nada no MySQL"]
    S9["DraftCachePort.put com patch do usuário"]
    S10["Transação: ProjectScheme origin AUTOPILOTO, creationMode COM_IA, aiGenerated · ProjectTask + ProjectTaskDependency · TaskItem sourceKind AUTOPILOT quando nova"]
    S11["Remix por modelo usado (crédito ao autor) · AiInferenceLog (modelo, custo, latência, modelos de referência)"]
    S12["DraftCachePort.evict · evento ProjectCreated"]
    S13["DeciaBridgeService.openSessionFromProject (RF29.CA01) · projeto EM_DECISAO"]
    E1["422 VALIDACAO"]
    E2["403 ACESSO_NEGADO (DOCUMENTO de outro usuário sem permissão)"]
  end
  subgraph L4["IA (AiEngine)"]
    A1["extractDemand ✦: objetivo, prazo, departamento provável, categoria do processo"]
    A2["composeScheme ✦ remixando modelos chancelados e semelhantes"]
    A3["LocalAutopilotEngine: regras + modelos chancelados, result FALLBACK"]
  end
  subgraph L5["Persistência"]
    D1[("Redis: autopilot draft TTL · quota de IA")]
    D2[("MySQL: seal_bonds · project_schemes (modelos) · tasks")]
    D3[("OpenSearch: ws-memory kNN")]
    D4[("MySQL: project_schemes · project_tasks · project_task_dependencies · tasks · remixes · ai_inference_log")]
    D5[("MySQL: decia_sessions")]
  end
  U1 --> S1
  S1 -->|"sim"| E1
  S1 -->|"sem permissão"| E2
  S1 -->|"ok"| S2
  S2 -->|"sim"| A3
  S2 -->|"não"| S3
  S3 -->|"não"| A3 --> W1
  S3 -->|"sim"| S4 --> A1
  A1 --> S5 --> D2
  W1 --> S5
  S5 --> S6 --> D3
  S6 --> A2 --> S7 --> S8 --> D1
  S8 --> W2 --> U2 --> U3
  U3 -->|"ajusta"| S9 --> D1
  S9 --> W2
  U3 -->|"pronto"| U4 --> S10 --> D4
  S10 --> S11 --> D4
  S11 --> S12 --> W3
  W3 --> U5 --> S13 --> D5
  classDef err fill:#fde2e2,stroke:#b91c1c,color:#7f1d1d
  class E1,E2 err
```

## 3. Diagrama de sequência

```mermaid
sequenceDiagram
  autonumber
  actor U as Usuário
  participant NX as Next.js (App Router)
  participant C as Controller (ws-web)
  participant S as Service (ws-application)
  participant AI as AiEngine
  participant DB as Repository/MySQL
  participant OS as OpenSearch
  participant R as Redis
  participant EV as DomainEvents (AFTER_COMMIT)

  Note over U,EV: CA01 — demanda em texto livre, ofício colado ou DOCUMENTO do acervo
  U->>NX: cola o ofício em /autopilot
  NX->>C: POST /api/autopilot/analyze {demandText, documentTaskId?}
  C->>S: AutopilotService.analyzeDemand(actorId, text, docId)
  alt texto vazio e sem documento
    S-->>C: 422 VALIDACAO
  else DOCUMENTO sem permissão
    S-->>C: 403 ACESSO_NEGADO
  else ok
    S->>R: GET quota:DEPARTMENT:{id}:{month}
    alt sem chave de IA ou cota esgotada (CA05)
      S->>AI: extractDemand via LocalAutopilotEngine (provider LOCAL)
      AI-->>S: DemandAnalysis parcial + fallbackUsed = true
      S-->>NX: 200 análise + aviso de fallback
    else provider externo disponível
      S->>AI: extractDemand(text, accessClass) com campos sensíveis mascarados
      AI-->>S: objetivo, prazo, departamento provável, categoria ✦
      S-->>NX: 200 DemandAnalysis
    end
  end

  Note over U,EV: CA02 e CA03 — proposta remixando modelos chancelados, rascunho não persistido
  NX->>C: POST /api/autopilot/propose {analysis}
  C->>S: AutopilotService.proposeScheme(actorId, analysis)
  S->>DB: SELECT seal_bonds APROVADA targetType PROJECT (empresa, departamento) + project_schemes modelo
  S->>OS: kNN ws-memory (MemoryService.similarProjects, filtros visibilidade e empresa)
  OS-->>S: projetos semelhantes com score
  S->>AI: composeScheme(analysis, modelos, semelhantes, histórico de responsáveis)
  AI-->>S: fases, tarefas (tipo e categoria), dependências, responsáveis, prazos, créditos ✦
  S->>R: SET autopilot:draft:{draftId} (TTL 24h)
  S-->>NX: 200 AutopilotDraft
  NX-->>U: Mesa de Trabalho em modo rascunho (RF22)
  U->>NX: remove uma tarefa e troca outra
  NX->>C: PATCH /api/autopilot/drafts/{draftId}
  C->>S: AutopilotService.updateDraft(actorId, draftId, patch)
  S->>R: GET + SET autopilot:draft:{draftId}
  S-->>NX: 200 AutopilotDraft

  Note over U,EV: CA04 — confirmação persiste com origem AUTOPILOTO e log de inferência
  U->>NX: Confirmar
  NX->>C: POST /api/autopilot/drafts/{draftId}/confirm
  C->>S: AutopilotService.confirm(actorId, draftId)
  S->>R: GET autopilot:draft:{draftId}
  alt rascunho expirou
    S-->>C: 409 RASCUNHO_EXPIRADO
  else ok
    S->>DB: INSERT project_schemes (origin AUTOPILOTO, creationMode COM_IA, aiGenerated, aiInferenceId)
    S->>DB: INSERT project_tasks · project_task_dependencies · tasks (sourceKind AUTOPILOT)
    S->>DB: INSERT remixes (um por modelo chancelado usado) · INSERT ai_inference_log (AUTOPILOT_PROJETO)
    S->>R: DEL autopilot:draft:{draftId}
    S-)EV: ProjectCreated(origin AUTOPILOTO)
    EV->>DB: thumbnails e mosaico (RF38) · DeciaPointsLedgerEntry para autores remixados (RF42)
    S-->>C: 201 ProjectScheme
  end

  Note over U,EV: CA06 — decidir em grupo sobre o esqueleto
  U->>NX: Abrir sessão DECIA sobre a proposta
  NX->>C: POST /api/projects/{projectId}/decia-session
  C->>S: DeciaBridgeService.openSessionFromProject (RF29.CA01)
  S->>DB: INSERT decia_sessions · UPDATE project_schemes SET status = EM_DECISAO
  S-->>NX: 201 DeciaSession
```

## 4. Máquina de estados

Entidade central: `ProjectScheme.status` (`ProjectStatus`) — precedida pelos estados **voláteis** do `AutopilotDraft` (Redis, fora do MySQL), que não são estados da entidade e existem só até a confirmação (CA03).

```mermaid
stateDiagram-v2
  direction LR
  state "AutopilotDraft (Redis, volátil)" as Draft {
    [*] --> Analisada : POST /api/autopilot/analyze (CA01)
    Analisada --> Proposta : POST /api/autopilot/propose (CA02)
    Proposta --> Ajustada : PATCH drafts/{id} aceitar, remover, trocar (CA03)
    Ajustada --> Ajustada : novos ajustes
    Proposta --> Expirada : TTL vence
    Ajustada --> Expirada : TTL vence
    Proposta --> Descartada : DELETE drafts/{id}
    Ajustada --> Descartada : DELETE drafts/{id}
    Expirada --> [*]
    Descartada --> [*]
  }
  Draft --> RASCUNHO : POST drafts/{id}/confirm → ProjectScheme origin AUTOPILOTO ✦ (CA04)
  RASCUNHO --> PUBLICADO : publicar
  RASCUNHO --> EM_DECISAO : Abrir sessão DECIA sobre a proposta (CA06, RF29.CA01)
  PUBLICADO --> EM_DECISAO : Abrir sessão DECIA
  EM_DECISAO --> APROVADO : decisão VALIDADA
  EM_DECISAO --> DEVOLVIDO : decisão DEVOLVIDA
  APROVADO --> EM_EXECUCAO
  EM_EXECUCAO --> CONCLUIDO
  CONCLUIDO --> ARQUIVADO
  note right of Draft
    Nada é persistido no MySQL até confirmar (CA03)
    Fallback local marca fallbackUsed e avisa (CA05)
  end note
  note right of RASCUNHO
    aiGenerated = true · aiInferenceId → ai_inference_log
    Remix por modelo chancelado usado (crédito)
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FE["Next.js (frontend)"]
    direction TB
    P1["app/autopilot/page.tsx · entrada da demanda (texto, colar, DOCUMENTO)"]
    P2["app/projects/[id]/desk · Mesa de Trabalho em modo rascunho (RF22)"]
    UI1["components/ui: DeskCanvas · DraftTaskCard ✦ · FallbackBanner · ModelCreditChip"]
  end
  subgraph WEB["ws-web (REST · br.gov.pr.secid.workstation.web)"]
    direction TB
    C1["AutopilotController"]
    C2["ProjectDeciaController (RF29)"]
  end
  subgraph APP["ws-application"]
    direction TB
    S1["AutopilotService"]
    S2["MemoryService (RF33)"]
    S3["DeciaBridgeService (RF29)"]
    S4["AiEngine"]
    PT1["AiProviderPort"]
    PT2["EmbeddingPort"]
    PT3["SearchIndexPort"]
    PT4["DraftCachePort"]
  end
  subgraph DOM["ws-domain"]
    direction TB
    E1["ProjectScheme · ProjectTask · ProjectTaskDependency · TaskItem"]
    E2["SealBond · Remix · AiInferenceLog · InstitutionalMemoryDocument"]
    E3["SchemeOrigin · CreationMode · ProjectPhase · AiCapability"]
  end
  subgraph INFRA["ws-infrastructure"]
    direction TB
    I1["persistence-mysql: ProjectScheme/ProjectTask/SealBond/Remix/AiInferenceLog repositories"]
    I2["cache-redis: RedisDraftCache · AiQuota"]
    I3["search-opensearch: OpenSearchIndexAdapter (ws-memory)"]
    I4["ai-providers: ClaudeAdapter · GeminiAdapter · LocalAutopilotEngine · AiProviderCircuitState"]
    I5["platform: DomainEventOutbox · FeatureFlag ai.local.only"]
  end
  subgraph EXT["Serviços externos"]
    X1(["Claude / Gemini"])
  end
  P1 --> C1
  P2 --> C1
  P2 --> C2
  UI1 -.-> P2
  C1 --> S1
  C2 --> S3
  S1 --> S2
  S1 --> S3
  S1 --> S4
  S1 -.-> PT4
  S4 -.-> PT1
  S2 -.-> PT2
  S2 -.-> PT3
  S1 --> E1
  S1 --> E2
  E1 --> E3
  S1 --> I1
  S1 --> I5
  I2 -. implementa .-> PT4
  I3 -. implementa .-> PT3
  I4 -. implementa .-> PT1
  I4 -. implementa .-> PT2
  I4 --> X1
  classDef port stroke-dasharray: 4 3
  class PT1,PT2,PT3,PT4 port
```

## 6. Rastreabilidade

| CA | Elemento do diagrama (classe / passo / mensagem / transição / componente) |
|---|---|
| RF30.CA01 | Classes `AutopilotService.analyzeDemand`, `AiEngine.extractDemand`, `TaskItem` (DOCUMENTO de entrada, `accessClass`); atividades `U1 → S1 → S2/S3 → S4 → A1` (422 VALIDACAO, 403 ACESSO_NEGADO); sequência bloco «CA01» (`POST /api/autopilot/analyze`); transição `[*] → Analisada`; componente `app/autopilot`, `AutopilotController.analyze` |
| RF30.CA02 | Classes `SealBond APROVADA` (modelos chancelados), `MemoryService.similarProjects`, `AiEngine.composeScheme`, `Remix` (crédito), `ProjectTaskDependency`, `ProjectTask.responsibleId/dueAt`; atividades `S5 → S6 → A2 → S7`; sequência bloco «CA02 e CA03» (SELECT seal_bonds, kNN ws-memory, composeScheme ✦); transição `Analisada → Proposta`; componentes `MemoryService`, `search-opensearch`, `ModelCreditChip` |
| RF30.CA03 | Classes `DraftCachePort`, `RedisDraftCache`, `AutopilotService.updateDraft/discard`; atividades `S8 → W2 → U2 → U3 → S9` (nada no MySQL); sequência bloco «CA02 e CA03» (`SET autopilot:draft` TTL, `PATCH /api/autopilot/drafts/{id}`); estados voláteis `Proposta → Ajustada → Descartada/Expirada`; componentes `DeskCanvas`, `DraftTaskCard`, `cache-redis` |
| RF30.CA04 | Classes `ProjectScheme.origin = AUTOPILOTO`, `creationMode = COM_IA`, `aiGenerated`, `aiInferenceId`, `AiInferenceLog` (modelo, custo, latência, `inputSummaryJson` com modelos de referência); atividades `U4 → S10 → S11 → S12 → W3`; sequência bloco «CA04» (INSERT project_schemes, remixes, ai_inference_log; 409 RASCUNHO_EXPIRADO); transição `Draft → RASCUNHO` e nota; componente `persistence-mysql` |
| RF30.CA05 | Classes `LocalAutopilotEngine ..|> AiProviderPort`, `AiInferenceLog.fallbackUsed/result FALLBACK`, `AiEngine.isExternalAvailable`; atividades `S2/S3 → A3 → W1` (sem chave ou cota, ou RESTRITO/SIGILOSO); sequência bloco «CA01» alt «sem chave de IA ou cota esgotada»; nota do estado `Draft`; componentes `FallbackBanner`, `ai-providers`, `FeatureFlag ai.local.only` |
| RF30.CA06 | Classes `DeciaBridgeService.openSessionFromProject`, `DeciaSession.linkedProjectId`; atividades `W3 → U5 → S13 → D5`; sequência bloco «CA06» (`POST /api/projects/{id}/decia-session`, EM_DECISAO); transição `RASCUNHO → EM_DECISAO`; componente `ProjectDeciaController (RF29)` |

> Dúvidas para `docs/DECISOES.md`: onde vive o rascunho não persistido (Redis com TTL vs. somente cliente vs. `ProjectScheme.autosaveDraftJson` — esta última contradiz CA03); `DraftCachePort` e `409 RASCUNHO_EXPIRADO` são propostas; TaskItems novos criados pela proposta recebem `sourceKind AUTOPILOT`, mas tarefas reaproveitadas de modelos entram como `REMIX`.


Tela/aba: `/autopilot` (esqueleto em `app/(shell)/autopilot/page.tsx`)
