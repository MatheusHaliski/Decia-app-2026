# RF30 — Gerar um Esquema de Projeto completo com o Autopiloto de Projeto a partir de uma demanda (ofício, e-mail ou frase), reutilizando modelos chancelados
**HU:** HU30 · **Sprint (board Work Station):** Product Backlog (não comprometido na Sprint 4) · **Equivalente FAI:** Autopiloto + "Vista-me" (RF28) · **Aba/rota:** Autopiloto (`/autopilot`), proposta aberta na Mesa em modo rascunho (`/desk?draft=`), botão **Abrir sessão DECIA sobre a proposta** (RF29)
**Critérios de aceite cobertos:** RF30.CA01 · CA02 · CA03 · CA04 · CA05 · CA06 (corpo do card, inalterado) — regra: o **título do card** define o RF e o corpo traz os próprios CAs. O RF43 §7 estende o Autopilot (tarefas em lote e Ficha de Viabilidade); o RF26 (Copilot) é a porta de entrada nos criadores.

Fluxo: demanda (texto, ofício/e-mail colado ou `TaskItem` DOCUMENTO do acervo) → `AiEngine` capability `AUTOPILOT_PROJETO` extrai objetivo, prazo, departamento provável e categoria (CA01) → compõe fases, tarefas, dependências, responsáveis sugeridos e prazos **remixando modelos chancelados** (`SealBond APROVADA`, `ModelOffer shelf CHANCELADO`) e projetos semelhantes da Memória Institucional (RF33) com **crédito** a cada modelo (`ProjectScheme.originalProjectId`, `TaskItem.originalTaskId`, `Remix`) (CA02) → proposta mostrada na Mesa em **rascunho não persistido** (`ProjectDraft` em Redis com TTL; flag `redis.enabled`, fallback em memória) até o usuário confirmar (CA03) → `ProjectScheme origin AUTOPILOTO`, faísca ✦ e `AiInferenceLog` (CA04). Sem chave externa: `LocalEngine` (regras + modelos chancelados) com aviso (CA05).

## 1. Diagrama de classes

```mermaid
classDiagram
direction LR

namespace ws_domain_projects {
  class ProjectScheme {
    <<entity>>
    +id: UUID
    +ownerId: UUID
    +departmentId: UUID
    +title: String
    +objective: String
    +creationMode: CreationMode
    +origin: SchemeOrigin
    +originalProjectId: UUID
    +sourceSessionId: UUID
    +status: ProjectStatus
    +currentPhase: ProjectPhase
    +exerciseYear: int
    +aiGenerated: boolean
    +aiInferenceId: UUID
    +autosaveDraftJson: JSON
    .. +25 campos ..
  }
  class ProjectTask {
    <<entity>>
    +projectId: UUID
    +taskId: UUID
    +phase: ProjectPhase
    +sortOrder: int
    +responsibleId: UUID
    +dueAt: LocalDate
    +pertOptimistic: BigDecimal
    +pertMostLikely: BigDecimal
    +pertPessimistic: BigDecimal
    +snapshotJson: JSON
  }
  class ProjectTaskDependency {
    <<entity>>
    +predecessorProjectTaskId: UUID
    +successorProjectTaskId: UUID
    +type: String
    +lagDays: int
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
}

namespace ws_domain_acervo_seals_social {
  class TaskItem {
    <<entity>>
    +id: UUID
    +title: String
    +type: TaskType
    +category: TaskCategory
    +accessClass: AccessClassification
    +state: TaskState
    +originalTaskId: UUID
    +sealIdsJson: JSON
    +reuseCount: int
    .. +45 campos ..
  }
  class SealBond {
    <<entity>>
    +targetType: String
    +targetId: UUID
    +status: SealBondStatus
  }
  class ModelOffer {
    <<entity>>
    +targetType: String
    +targetId: UUID
    +shelf: Shelf
    +license: ModelLicense
  }
  class Remix {
    <<entity>>
    +actorId: UUID
    +sourceType: String
    +sourceId: UUID
    +resultType: String
    +resultId: UUID
  }
}

namespace ws_domain_ia {
  class AiInferenceLog {
    <<entity>>
    +id: UUID
    +capability: AiCapability
    +hostRf: String
    +provider: AiProvider
    +model: String
    +latencyMs: int
    +estimatedCostUsd: BigDecimal
    +result: InferenceResult
    +fallbackUsed: boolean
    +inputSummaryJson: JSON
    +correlationId: String
  }
  class InstitutionalMemoryDocument {
    <<entity>>
    +sourceType: MemorySourceType
    +sourceId: UUID
    +embedding: dense_vector
  }
}

namespace ws_application {
  class AutopilotService {
    <<service>>
    +extractDemand(actor, DemandInput) DemandSummary
    +compose(actor, DemandSummary) ProjectDraft
    +previewOnDesk(actor, draftId) ProjectDraft
    +editDraft(actor, draftId, DraftPatch) ProjectDraft
    +confirm(actor, draftId) ProjectScheme
    +discard(actor, draftId)
    +openSessionOnDraft(actor, draftId) DeciaSession
  }
  class ProjectDraft {
    <<service>>
    +draftId: UUID
    +phases: List~PhaseDraft~
    +tasks: List~TaskDraft~
    +dependencies: List~DependencyDraft~
    +referenceModels: List~ModelCredit~
    +inferenceId: UUID
    +fallbackUsed: boolean
    +expiresAt: Instant
  }
  class ModelCatalog {
    <<service>>
    +chanceladosFor(departmentId, processTag) List~TaskItem~
    +similarProjects(embedding) List~ProjectScheme~
  }
  class CriticalPathService {
    <<service>>
    +compute(tasks, deps) CriticalPath
  }
  class AiEngine {
    <<service>>
    +run(AiRequest) AiResponse
  }
  class DeciaBridgeService {
    <<service>>
    +openSessionFromDraft(actor, draft) DeciaSession
  }
  class Guard {
    <<service>>
    +requireOwner(actor, ownerId)
    +requireSameCompany(actor, companyId)
  }
  class DraftCachePort {
    <<port>>
    +put(draftId, ProjectDraft, ttl)
    +get(draftId)
    +evict(draftId)
  }
  class SearchIndexPort {
    <<port>>
    +knn(ws_memory, embedding, filter)
  }
  class QuotaPort {
    <<port>>
    +tryConsume(scope, id, units)
  }
}

namespace ws_web {
  class AutopilotController {
    <<controller>>
    +POST_api_autopilot_demands(DemandInput)
    +POST_api_autopilot_drafts(DemandSummary)
    +GET_api_autopilot_drafts_id()
    +PATCH_api_autopilot_drafts_id(DraftPatch)
    +POST_api_autopilot_drafts_id_confirm()
    +DELETE_api_autopilot_drafts_id()
    +POST_api_autopilot_drafts_id_decia_session()
  }
}

namespace ws_infrastructure {
  class RedisDraftCacheAdapter {
    <<adapter>>
  }
  class InMemoryDraftCache {
    <<adapter>>
  }
  class OpenSearchIndexAdapter {
    <<adapter>>
  }
  class LocalEngine {
    <<adapter>>
  }
}

ProjectScheme "1" *-- "0..*" ProjectTask
ProjectScheme "1" *-- "0..*" ProjectTaskDependency
ProjectTask "0..*" --> "0..1" TaskItem
ProjectScheme "0..*" --> "0..1" ProjectScheme : originalProjectId credito
TaskItem "0..*" --> "0..1" TaskItem : originalTaskId credito
Remix ..> ProjectScheme : resultado AUTOPILOTO
ModelCatalog ..> SealBond : APROVADA
ModelCatalog ..> ModelOffer : shelf CHANCELADO
ModelCatalog ..> InstitutionalMemoryDocument : similares RF33
AutopilotController --> AutopilotService
AutopilotService --> ProjectDraft
AutopilotService --> ModelCatalog
AutopilotService --> CriticalPathService
AutopilotService --> AiEngine
AutopilotService --> DeciaBridgeService
AutopilotService --> Guard
AutopilotService --> DraftCachePort
AutopilotService --> QuotaPort
ModelCatalog --> SearchIndexPort
AiEngine ..> AiInferenceLog
AutopilotService ..> ProjectScheme : confirm cria origin AUTOPILOTO
AutopilotService ..> Remix : credito aos modelos
RedisDraftCacheAdapter ..|> DraftCachePort
InMemoryDraftCache ..|> DraftCachePort
OpenSearchIndexAdapter ..|> SearchIndexPort
LocalEngine ..> AiEngine : fallback regras + modelos chancelados
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph ATOR["Ator (EMPREGADO · CHEFE)"]
    A0([Abre /autopilot]) --> A1["Informa a demanda: texto livre, ofício/e-mail colado ou DOCUMENTO do acervo"]
    A2["Confere objetivo, prazo, departamento e categoria extraídos ✦"]
    A3["Vê a proposta na Mesa em rascunho"]
    A4{"Ação por tarefa"}
    A4 -->|aceitar| A5["Mantém"]
    A4 -->|remover| A6["Remove"]
    A4 -->|trocar| A7["Troca por outra do acervo ou modelo"]
    A8{"Confirmar?"}
    A8 -->|sim| A9["Confirma e salva"]
    A8 -->|decidir em grupo| A10["Abrir sessão DECIA sobre a proposta"]
    A8 -->|não| A11["Descarta"]
  end

  subgraph FE["Next.js / BFF (app/(shell)/autopilot · desk)"]
    F1["DemandForm (Textarea, AttachmentPicker DOCUMENTO) · POST /api/autopilot/demands"]
    F2["POST /api/autopilot/drafts"]
    F3["Mesa em modo rascunho: PhaseBar + SelectList por fase + PostIt · banner fallback quando LocalEngine"]
    F4["PATCH /drafts/{id} (aceitar, remover, trocar)"]
    F5["POST /drafts/{id}/confirm"]
    F6["POST /drafts/{id}/decia-session"]
  end

  subgraph WEB["ws-web · AutopilotController"]
    W1["JWT · CorrelationIdFilter · rate limit por usuário"]
    W2["GlobalExceptionHandler"]
  end

  subgraph APP["ws-application · AutopilotService"]
    P1{"DOCUMENTO anexado é do ator ou visível? (Guard.requireOwner / visibilidade)"}
    P1 -->|não| E1["403 ACESSO_NEGADO"]
    P2{"Documento RESTRITO/SIGILOSO?"}
    P2 -->|sim| P3["Só LocalEngine + aviso"]
    P2 -->|não| P4["Masking de dados pessoais"]
    P5{"QuotaPort.tryConsume ok?"}
    P5 -->|não| E2["429 COTA_ESGOTADA"]
    P6["ModelCatalog: modelos chancelados do departamento + projetos semelhantes bem avaliados (RF33)"]
    P7["CriticalPathService: dependências sem ciclo, prazos por PERT"]
    P8["ProjectDraft em DraftCachePort (TTL 24 h) — nada persistido no MySQL"]
    P9{"Draft existe e pertence ao ator?"}
    P9 -->|não| E3["404 NAO_ENCONTRADO ou 403"]
    P10["confirm: ProjectScheme RASCUNHO origin AUTOPILOTO · ProjectTask por fase · dependências · Remix e reuseCount++ por modelo usado · aiGenerated + aiInferenceId"]
    P11["DeciaBridgeService.openSessionFromDraft (tema = objetivo, anexos = tarefas propostas)"]
    P12["evict draft"]
  end

  subgraph IA["AiEngine (AUTOPILOT_PROJETO)"]
    I1["Extrai objetivo, prazo, departamento provável, categoria do processo"]
    I2["Claude → Gemini → LocalEngine (regras + modelos chancelados)"]
    I3["Compõe fases, tarefas (tipo e categoria), dependências, responsáveis por histórico, prazos · crédito por modelo"]
    I4["AiInferenceLog (modelo, custo, latência, modelos de referência, fallbackUsed)"]
  end

  subgraph DB["Persistência"]
    D1[("MySQL project_schemes · project_tasks · project_task_dependencies · remixes · ai_inference_log")]
    D2[("Redis draft:{id} TTL · quota · flag redis.enabled (fallback in-memory)")]
    D3[("OpenSearch ws-memory · ws-projects · flag opensearch.enabled")]
  end

  A1 --> F1 --> W1 --> P1 -->|sim| P2
  P3 --> P5
  P4 --> P5
  P5 -->|sim| I1 --> I4 --> A2
  A2 --> F2 --> W1 --> P6 --> D3
  P6 --> I2 --> I3 --> I4 --> P7 --> P8 --> D2 --> F3 --> A3 --> A4
  A5 --> A8
  A6 --> F4 --> W1 --> P9 -->|sim| P8
  A7 --> F4
  A9 --> F5 --> W1 --> P9 --> P10 --> D1 --> P12
  A10 --> F6 --> W1 --> P9 --> P11 --> D1
  A11 --> P12 --> D2
  E1 --> W2
  E2 --> W2
  E3 --> W2
```

## 3. Diagrama de sequência

```mermaid
sequenceDiagram
  autonumber
  participant U as Usuário
  participant FE as Next.js (App Router)
  participant C as Controller (ws-web)
  participant S as Service (ws-application)
  participant AI as AiEngine
  participant DB as Repository/MySQL
  participant R as Redis
  participant OS as OpenSearch
  participant EV as DomainEvents (AFTER_COMMIT)

  U->>FE: cola ofício e clica Gerar proposta
  FE->>C: POST /api/autopilot/demands {text, documentTaskId}
  C->>S: AutopilotService.extractDemand(actor, input)
  S->>S: Guard.requireOwner ou visibilidade do DOCUMENTO
  S->>R: QuotaPort.tryConsume(USER, actor, 1)
  alt cota esgotada
    S-->>C: 429 COTA_ESGOTADA (atalho Loja, RF42.CA06)
  else ok
    S->>AI: run(AUTOPILOT_PROJETO extrair, texto mascarado)
    alt documento RESTRITO/SIGILOSO ou sem chave externa
      AI->>AI: LocalEngine (regras) · fallbackUsed = true
    else provedor externo
      AI->>AI: Claude → fallback Gemini
    end
    AI->>DB: insert ai_inference_log
    AI-->>S: objetivo, prazo, departamento provável, categoria ✦
    S-->>FE: DemandSummary + aviso de fallback se houver
  end

  U->>FE: confirma a leitura e pede o esquema
  FE->>C: POST /api/autopilot/drafts (DemandSummary)
  C->>S: AutopilotService.compose(actor, summary)
  S->>DB: modelos chancelados do departamento (seal_bonds APROVADA, model_offers CHANCELADO)
  S->>OS: knn ws-memory projetos semelhantes bem avaliados (RF33)
  S->>AI: run(AUTOPILOT_PROJETO compor, modelos + semelhantes + histórico de responsáveis)
  AI-->>S: fases, tarefas, dependências, responsáveis, prazos, crédito por modelo
  S->>S: CriticalPathService.compute (sem ciclo, PERT)
  S->>R: put draft:{id} (TTL 24 h)
  S-->>FE: ProjectDraft (nada persistido)
  FE->>U: Mesa em modo rascunho com Spark ✦

  U->>FE: remove uma tarefa e troca outra
  FE->>C: PATCH /api/autopilot/drafts/{id}
  C->>S: AutopilotService.editDraft(actor, id, patch)
  S->>R: get draft (403 se não é do ator)
  S->>R: put draft atualizado
  S-->>FE: ProjectDraft

  alt confirmar
    U->>FE: Confirmar
    FE->>C: POST /api/autopilot/drafts/{id}/confirm
    C->>S: AutopilotService.confirm(actor, id)
    S->>DB: insert project_schemes (RASCUNHO, origin AUTOPILOTO, aiGenerated, aiInferenceId) + project_tasks + dependencies
    S->>DB: insert remixes + update tasks.reuse_count dos modelos usados
    S->>EV: ProjectCreated(AUTOPILOTO)
    S->>R: evict draft
    S-->>FE: 201 ProjectScheme → /desk
  else decidir em grupo
    U->>FE: Abrir sessão DECIA sobre a proposta
    FE->>C: POST /api/autopilot/drafts/{id}/decia-session
    C->>S: AutopilotService.openSessionOnDraft(actor, id)
    S->>S: DeciaBridgeService.openSessionFromDraft (tema = objetivo)
    S->>DB: insert decia_sessions + anexos = tarefas propostas
    S-->>FE: 201 DeciaSession → /decia/[sessionId]
  end
  EV->>EV: PipelineJob THUMBNAIL · indexação ws-projects
```

## 4. Máquina de estados

Entidade central: a proposta (`ProjectDraft`, só em cache) até virar `ProjectScheme`; depois vale `ProjectStatus` (máquina do RF22). Aqui os estados do rascunho do Autopiloto:

```mermaid
stateDiagram-v2
  [*] --> DEMANDA_EXTRAIDA: POST /demands → objetivo, prazo, departamento, categoria ✦ (CA01)
  DEMANDA_EXTRAIDA --> PROPOSTA_EM_RASCUNHO: POST /drafts → fases, tarefas, dependências, créditos (CA02) · guardado em Redis com TTL
  PROPOSTA_EM_RASCUNHO --> PROPOSTA_EM_RASCUNHO: PATCH aceita, remove, troca tarefas (CA03)
  PROPOSTA_EM_RASCUNHO --> PERSISTIDO_RASCUNHO: POST /confirm → ProjectScheme RASCUNHO origin AUTOPILOTO (CA04)
  PROPOSTA_EM_RASCUNHO --> EM_DECISAO_DECIA: POST /decia-session → sessão com a proposta como anexos (CA06)
  PROPOSTA_EM_RASCUNHO --> DESCARTADA: DELETE ou TTL de 24 h vencido
  PERSISTIDO_RASCUNHO --> [*]: segue ProjectStatus (RF22)
  EM_DECISAO_DECIA --> [*]: decisão validada cria o projeto (RF29.CA02)
  DESCARTADA --> [*]
  note right of PROPOSTA_EM_RASCUNHO
    Nada é persistido no MySQL até confirmar (CA03).
    fallbackUsed = true quando só LocalEngine (CA05).
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FRONT["Frontend Next.js 15"]
    R1["app/(shell)/autopilot · desk (modo rascunho)"]
    R2["components: DemandForm · AttachmentPicker · PhaseBar · SelectList · PostIt · BackgroundArt · Spark ✦ · Toast (fallback) · Button abrir-decia"]
    BFF["app/bff"]
    R1 --> R2 --> BFF
  end
  subgraph WEB["ws-web"]
    AC["AutopilotController (@Operation RF30.CA01-CA06)"]
    SEC["SecurityConfig · CorrelationIdFilter · GlobalExceptionHandler (main)"]
  end
  subgraph APPL["ws-application"]
    AS["projects/AutopilotService · ProjectDraft"]
    MCAT["seals/ModelCatalog"]
    CP["metrics/CriticalPathService (determinístico)"]
    BS["decia/DeciaBridgeService (RF29)"]
    AIE["ai/AiEngine (AUTOPILOT_PROJETO) · Masking (main) · AiBudget"]
    GD["security/Guard (sec-b3)"]
    DE["events/DomainEvents AFTER_COMMIT"]
    PORTS["ports: DraftCachePort · QuotaPort · SearchIndexPort · AiProviderPort"]
  end
  subgraph DOM["ws-domain"]
    ENT["ProjectScheme · ProjectTask · ProjectTaskDependency · SchemeOrigin · Remix · AiInferenceLog (planejado)"]
  end
  subgraph INFRA["ws-infrastructure"]
    MY["persistence-mysql (V2 ai_inference_log existe · V__rf21/rf30 projetos)"]
    RD["cache-redis draft TTL · quota (flag redis.enabled · fallback in-memory)"]
    OSA["search-opensearch ws-memory · ws-projects (flag opensearch.enabled)"]
    AIC["ai-providers/ai-claude (ai.provider.claude)"]
    AIG["ai-providers/ai-gemini (ai.provider.gemini)"]
    AIL["ai-providers/ai-local LocalEngine (ai.local.only = TRUE no V2)"]
  end
  BFF --> AC --> SEC
  AC --> AS
  AS --> MCAT
  AS --> CP
  AS --> BS
  AS --> AIE
  AS --> GD
  AS --> DE
  AS --> PORTS
  MCAT --> PORTS
  AIE --> PORTS
  AS --> ENT --> MY --> MYSQL[("MySQL 8")]
  PORTS --> RD --> REDIS[("Redis")]
  PORTS --> OSA --> OPENS[("OpenSearch")]
  PORTS --> AIC --> CLAUDE["Claude"]
  PORTS --> AIG --> GEM["Gemini"]
  PORTS --> AIL
```

## 6. Rastreabilidade

| CA | Classe | Passo | Mensagem | Transição | Componente |
|---|---|---|---|---|---|
| RF30.CA01 | `AutopilotService.extractDemand`, `DemandInput` (texto · colado · `TaskItem` DOCUMENTO), `AiCapability AUTOPILOT_PROJETO` | A1 → F1 → P1 (403) → P2 → P5 (429) → I1 → A2 | 1–15 | `[*] → DEMANDA_EXTRAIDA` | `DemandForm`, `AC`, `AIE` |
| RF30.CA02 | `AutopilotService.compose`, `ModelCatalog.chanceladosFor/similarProjects`, `SealBond APROVADA`, `ModelOffer CHANCELADO`, `Remix`, `ProjectTaskDependency`, `CriticalPathService` | A2 → F2 → P6 → I2 → I3 → P7 | 16–24 | `DEMANDA_EXTRAIDA → PROPOSTA_EM_RASCUNHO` | `MCAT`, `CP`, `OSA` |
| RF30.CA03 | `ProjectDraft`, `DraftCachePort` (TTL, nada no MySQL), `AutopilotService.editDraft` | A3 → A4 → F3/F4 → P8 → P9 | 25–31 | `PROPOSTA_EM_RASCUNHO → self` | `RD`, `desk` modo rascunho, `SelectList`, `PostIt` |
| RF30.CA04 | `SchemeOrigin AUTOPILOTO`, `ProjectScheme.aiGenerated/aiInferenceId`, `AiInferenceLog` (modelo, custo, latência, modelos de referência) | A9 → F5 → P10 → D1 | 32–38 | `PROPOSTA_EM_RASCUNHO → PERSISTIDO_RASCUNHO` | `Spark ✦`, `MY` |
| RF30.CA05 | `LocalEngine`, `AiInferenceLog.fallbackUsed`, aviso no front | P2 → P3 · I2 (fallback) · F3 banner | 9–10 | nota de PROPOSTA_EM_RASCUNHO | `AIL`, `Toast` |
| RF30.CA06 | `AutopilotService.openSessionOnDraft`, `DeciaBridgeService.openSessionFromDraft` | A10 → F6 → P9 → P11 | 39–44 | `PROPOSTA_EM_RASCUNHO → EM_DECISAO_DECIA` | `BS`, `Button abrir-decia` |

Tela/aba: `/autopilot` (esqueleto em `app/(shell)/autopilot/page.tsx`)
