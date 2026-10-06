# RF25 — Agrupar projetos e tarefas em Programas, Exercícios e Gestões (agrupamentos institucionais)
**HU:** HU25 · **Sprint (board Work Station):** Product Backlog (não comprometido na Sprint 4) · **Equivalente FAI:** Agrupamentos (Coleções da marca RF35, Eras da celebridade RF34, temporadas) · **Aba/rota:** sub-aba **Programas & Agrupamentos** do perfil (`/profile?tab=programas`, `/u/[username]?tab=programas`), página do agrupamento (`/groupings/[id]`), páginas da empresa/departamento (`/companies/[slug]`, `/departments/[slug]`, RF28)
**Critérios de aceite cobertos:** RF25.CA01 · CA02 · CA03 · CA04 · CA05 (corpo do card, inalterado) — regra: o **título do card** define o RF e o corpo traz os próprios CAs.

Tipos (`GroupingType`): **PROGRAMA** (= coleção, EMPRESA/CHEFE), **EXERCICIO** (= temporada, ano orçamentário), **GESTAO** (= era, período de um chefe ou de uma gestão), **FRENTE** (= linha de estilo; a única que o EMPREGADO cria, pessoal). Um projeto aponta direto para até três agrupamentos (`ProjectScheme.programGroupingId / exerciseGroupingId / managementGroupingId`) e `GroupingItem` registra qualquer item (PROJECT · TASK). Encerrar uma GESTAO dispara o **Dossiê de Transição** (RF36) por evento AFTER_COMMIT.

## 1. Diagrama de classes

```mermaid
classDiagram
direction LR

namespace ws_domain_planning {
  class Grouping {
    <<entity>>
    +id: UUID
    +ownerId: UUID
    +companyId: UUID
    +departmentId: UUID
    +type: GroupingType
    +label: String
    +description: String
    +coverUrl: String
    +periodFrom: LocalDate
    +periodTo: LocalDate
    +accentColor: String
    +status: GroupingStatus
    +closedAt: Instant
    +handoffDossierId: UUID
  }
  class GroupingItem {
    <<entity>>
    +id: UUID
    +groupingId: UUID
    +targetType: String
    +targetId: UUID
    +addedAt: Instant
  }
  class GroupingType {
    <<enum>>
    PROGRAMA
    EXERCICIO
    GESTAO
    FRENTE
  }
  class GroupingStatus {
    <<enum>>
    ATIVO
    ENCERRADO
  }
}

namespace ws_domain_projects_acervo {
  class ProjectScheme {
    <<entity>>
    +id: UUID
    +title: String
    +status: ProjectStatus
    +currentPhase: ProjectPhase
    +exerciseYear: int
    +programGroupingId: UUID
    +exerciseGroupingId: UUID
    +managementGroupingId: UUID
    +visibility: Visibility
    .. +30 campos ..
  }
  class TaskItem {
    <<entity>>
    +id: UUID
    +title: String
    +state: TaskState
    +visibility: Visibility
    .. +50 campos ..
  }
}

namespace ws_domain_decia_handoff {
  class DecisionTraceNode {
    <<entity>>
    +nodeType: TraceNodeType
    +refId: UUID
    +at: Instant
  }
  class HandoffDossier {
    <<entity>>
    +id: UUID
    +subjectType: String
    +groupingId: UUID
    +reason: HandoffReason
    +status: HandoffStatus
  }
  class InstitutionalMemoryDocument {
    <<entity>>
    +sourceType: MemorySourceType
    +sourceId: UUID
    +exerciseYear: int
  }
}

namespace ws_application {
  class GroupingService {
    <<service>>
    +create(actor, GroupingForm) Grouping
    +update(actor, id, GroupingForm) Grouping
    +addItem(actor, groupingId, targetType, targetId) GroupingItem
    +removeItem(actor, groupingId, itemId)
    +page(actor, id) GroupingPageView
    +close(actor, id, reason) Grouping
    +listForProfile(viewer, ownerId) List~Grouping~
  }
  class GroupingProgressService {
    <<service>>
    +aggregate(groupingId) ProgressView
    +decisionTimeline(groupingId) List~DecisionTraceNode~
  }
  class HandoffService {
    <<service>>
    +generateForGrouping(groupingId, requestedBy) HandoffDossier
  }
  class Guard {
    <<service>>
    +requireRole(actor, role)
    +requireOwner(actor, ownerId)
    +requireSameCompany(actor, companyId)
  }
  class DomainEvents {
    <<service>>
    +publish(GroupingClosed)
  }
  class SearchIndexPort {
    <<port>>
    +indexGrouping(Grouping)
  }
  class StoragePort {
    <<port>>
    +putCover(MediaObject)
  }
}

namespace ws_web {
  class GroupingController {
    <<controller>>
    +POST_api_groupings(form)
    +PATCH_api_groupings_id(form)
    +GET_api_groupings_id()
    +POST_api_groupings_id_items(targetType, targetId)
    +DELETE_api_groupings_id_items_itemId()
    +POST_api_groupings_id_close(reason)
    +GET_api_users_id_groupings()
  }
}

namespace ws_infrastructure {
  class OpenSearchIndexAdapter {
    <<adapter>>
  }
  class S3StorageAdapter {
    <<adapter>>
  }
}

Grouping "1" o-- "0..*" GroupingItem : agrupa
GroupingItem "0..*" --> "0..1" ProjectScheme : PROJECT
GroupingItem "0..*" --> "0..1" TaskItem : TASK
ProjectScheme "0..*" --> "0..1" Grouping : programGroupingId
ProjectScheme "0..*" --> "0..1" Grouping : exerciseGroupingId
ProjectScheme "0..*" --> "0..1" Grouping : managementGroupingId
Grouping "0..1" --> "0..1" HandoffDossier : handoffDossierId
GroupingProgressService ..> DecisionTraceNode : linha do tempo RF29
Grouping ..> InstitutionalMemoryDocument : pesquisavel RF27/RF33
GroupingController --> GroupingService
GroupingService --> GroupingProgressService
GroupingService --> Guard
GroupingService --> DomainEvents
GroupingService --> SearchIndexPort
GroupingService --> StoragePort
DomainEvents ..> HandoffService : GroupingClosed GESTAO
OpenSearchIndexAdapter ..|> SearchIndexPort
S3StorageAdapter ..|> StoragePort
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph ATOR["Ator (EMPRESA · CHEFE · EMPREGADO)"]
    A0([Abre Programas & Agrupamentos]) --> A1{"Ação"}
    A1 -->|criar| A2["Informa nome, tipo, período, capa e descrição"]
    A1 -->|adicionar item| A3["Arrasta projeto ou tarefa para o agrupamento"]
    A1 -->|abrir página| A4["Abre /groupings/[id]"]
    A1 -->|encerrar GESTAO| A5["Clica Encerrar gestão"]
  end

  subgraph FE["Next.js / BFF (app/(shell)/profile · groupings · companies)"]
    F1["GroupingForm (TypeChip por tipo, Due do período, upload de capa via PendingUpload)"]
    F2["POST /api/groupings"]
    F3["POST /api/groupings/{id}/items"]
    F4["GET /api/groupings/{id} → capa, grade ProjectCard, ProgressRing, DecisionThread"]
    F5["POST /api/groupings/{id}/close"]
  end

  subgraph WEB["ws-web · GroupingController"]
    W1["JWT + CorrelationIdFilter"]
    W2["GlobalExceptionHandler"]
  end

  subgraph APP["ws-application · GroupingService"]
    P1{"Perfil × tipo"}
    P1 -->|EMPREGADO e tipo diferente de FRENTE| E1["403 ACESSO_NEGADO"]
    P1 -->|EMPRESA ou CHEFE| P2
    P1 -->|EMPREGADO e FRENTE| P2
    P2{"periodFrom menor ou igual a periodTo?"}
    P2 -->|não| E2["400 PERIODO_INVALIDO"]
    P2 -->|sim| P3["Capa: magic bytes + teto de pixels (SEG) + reencode sem EXIF"]
    P3 --> P4["Grava Grouping ATIVO"]
    P5{"Item visível ao ator e da mesma empresa?"}
    P5 -->|não| E3["403 ACESSO_NEGADO"]
    P5 -->|sim| P6{"Já existe agrupamento do mesmo tipo neste projeto?"}
    P6 -->|sim| E4["409 TIPO_JA_VINCULADO"]
    P6 -->|não| P7["Grava GroupingItem + ProjectScheme.*GroupingId"]
    P8["Guard.requireRole EMPRESA ou requireDeptHead"]
    P8 --> P9{"type = GESTAO?"}
    P9 -->|não| P10["status = ENCERRADO"]
    P9 -->|sim| P11["status = ENCERRADO + DomainEvents GroupingClosed"]
    P12["GroupingProgressService: progresso agregado + linha do tempo de decisões (DecisionTraceNode)"]
  end

  subgraph IA["AiEngine (capability DOSSIE, RF36)"]
    I1["HandoffService.generateForGrouping → resumo de contexto ✦"]
    I2["AiInferenceLog"]
  end

  subgraph DB["Persistência"]
    D1[("MySQL groupings · grouping_items · project_schemes")]
    D2[("S3 capas · flag storage.s3")]
    D3[("OpenSearch ws-groupings · flag opensearch.enabled")]
  end

  A2 --> F1 --> F2 --> W1 --> P1
  P4 --> D1
  P3 --> D2
  P4 --> D3
  A3 --> F3 --> W1 --> P5
  P7 --> D1
  A4 --> F4 --> W1 --> P12 --> D1
  A5 --> F5 --> W1 --> P8
  P10 --> D1
  P11 --> D1
  P11 --> I1 --> I2
  E1 --> W2
  E2 --> W2
  E3 --> W2
  E4 --> W2
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
  participant S3 as S3
  participant OS as OpenSearch
  participant EV as DomainEvents (AFTER_COMMIT)

  U->>FE: cria Programa Cidade Acessível 2026 (capa, período)
  FE->>C: POST /api/groupings
  C->>S: GroupingService.create(actor, form)
  S->>S: Guard.requireRole EMPRESA ou CHEFE (EMPREGADO só FRENTE)
  alt EMPREGADO tentando PROGRAMA
    S-->>C: 403 ACESSO_NEGADO
  else período invertido
    S-->>C: 400 PERIODO_INVALIDO
  else válido
    S->>S3: put cover (reencode, sem EXIF)
    S->>DB: insert groupings (ATIVO)
    S->>EV: GroupingCreated
    S-->>C: 201 Grouping
  end
  EV->>OS: index ws-groupings (opensearch.enabled, falha não bloqueia)

  U->>FE: arrasta projeto para o programa
  FE->>C: POST /api/groupings/{id}/items {PROJECT, projectId}
  C->>S: GroupingService.addItem(actor, id, PROJECT, projectId)
  S->>DB: select project_schemes (visibilidade, companyId, programGroupingId)
  alt projeto já tem PROGRAMA
    S-->>C: 409 TIPO_JA_VINCULADO
  else livre
    S->>DB: insert grouping_items + update project_schemes.program_grouping_id
    S-->>C: 201 GroupingItem
  end

  U->>FE: abre /groupings/{id}
  FE->>C: GET /api/groupings/{id}
  C->>S: GroupingService.page(actor, id)
  S->>DB: grouping + itens + progresso por fase + decision_trace_nodes dos projetos
  S-->>FE: capa, grade, progresso agregado, linha do tempo de decisões

  U->>FE: encerra a GESTAO 2023-2026
  FE->>C: POST /api/groupings/{id}/close
  C->>S: GroupingService.close(actor, id, reason)
  S->>S: Guard.requireRole EMPRESA ou requireDeptHead
  S->>DB: update groupings status ENCERRADO, closedAt
  S->>EV: GroupingClosed(type GESTAO)
  S-->>C: 200
  EV->>S: HandoffService.generateForGrouping(groupingId)
  S->>DB: coleta projetos abertos, tarefas pendentes, sessões ativas
  S->>AI: run(DOSSIE, dados coletados)
  AI-->>S: resumo de contexto ✦ + AiInferenceLog
  S->>DB: insert handoff_dossiers + update groupings.handoff_dossier_id
  S->>EV: HandoffGenerated → Notification TRANSICAO
```

## 4. Máquina de estados

Entidade central: `Grouping.status` (`GroupingStatus`). Os itens (`GroupingItem`) não têm estado.

```mermaid
stateDiagram-v2
  [*] --> ATIVO: POST /api/groupings (CA01)
  ATIVO --> ATIVO: adiciona ou remove itens (CA02) · edita capa e descrição · aparece na página da empresa e na busca (CA04)
  ATIVO --> ENCERRADO: POST /close (EMPRESA ou CHEFE)
  ENCERRADO --> ENCERRADO: só leitura · página com linha do tempo de decisões (CA03)
  ENCERRADO --> [*]
  note right of ENCERRADO
    type = GESTAO: GroupingClosed AFTER_COMMIT gera
    HandoffDossier (RF36) e grava handoffDossierId (CA05).
  end note
  note left of ATIVO
    Regra por tipo: um projeto tem no máximo
    1 PROGRAMA + 1 EXERCICIO + 1 GESTAO (409 TIPO_JA_VINCULADO).
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FRONT["Frontend Next.js 15"]
    R1["app/(shell)/profile (sub-aba Programas) · /groupings/[id] · /companies/[slug] · /departments/[slug]"]
    R2["components: GroupingCard · GroupingForm · ProjectCard (grid) · ProgressRing · DecisionThread · EmptyState"]
    BFF["app/bff"]
    R1 --> R2 --> BFF
  end
  subgraph WEB["ws-web"]
    GC["GroupingController (@Operation RF25.CA01-CA05)"]
    SEC["SecurityConfig · CorrelationIdFilter · GlobalExceptionHandler (main)"]
  end
  subgraph APPL["ws-application"]
    GS["planning/GroupingService"]
    GP["planning/GroupingProgressService"]
    HS["handoff/HandoffService (RF36)"]
    GD["security/Guard (sec-b3 + requireDeptHead planejado)"]
    DE["events/DomainEvents AFTER_COMMIT"]
    AIE["ai/AiEngine"]
    PORTS["ports: SearchIndexPort · StoragePort · AiProviderPort"]
  end
  subgraph DOM["ws-domain"]
    ENT["Grouping · GroupingItem · GroupingType · GroupingStatus (planejado)"]
  end
  subgraph INFRA["ws-infrastructure"]
    MY["persistence-mysql (Flyway V__rf25_groupings)"]
    S3A["storage-s3 (flag storage.s3)"]
    OSA["search-opensearch (flag opensearch.enabled)"]
    AIP["ai-providers (ai-claude · ai-gemini · ai-local)"]
  end
  BFF --> GC --> GS
  GC --> SEC
  GS --> GP
  GS --> GD
  GS --> DE --> HS --> AIE
  GS --> PORTS
  GS --> ENT --> MY --> MYSQL[("MySQL 8")]
  PORTS --> S3A --> S3[("S3 / MinIO")]
  PORTS --> OSA --> OPENS[("OpenSearch")]
  PORTS --> AIP --> AI["Claude / Gemini / local"]
```

## 6. Rastreabilidade

| CA | Classe | Passo | Mensagem | Transição | Componente |
|---|---|---|---|---|---|
| RF25.CA01 | `Grouping` (type, label, periodFrom/To, coverUrl, description), `GroupingType`, `GroupingService.create`, `Guard.requireRole` | A2 → F1 → F2 → P1 (403) → P2 (400 PERIODO_INVALIDO) → P3 → P4 | 1–11 | `[*] → ATIVO` | `GC`, `GS`, `GroupingForm`, `S3A` |
| RF25.CA02 | `GroupingItem`, `ProjectScheme.programGroupingId/exerciseGroupingId/managementGroupingId`, `GroupingService.addItem` | A3 → F3 → P5 → P6 (409 TIPO_JA_VINCULADO) → P7 | 12–19 | `ATIVO → self (itens)` · nota de ATIVO | `GS`, `MY` |
| RF25.CA03 | `GroupingProgressService.aggregate/decisionTimeline`, `DecisionTraceNode` | A4 → F4 → P12 | 20–24 | `ENCERRADO → self (linha do tempo)` | `GP`, `ProgressRing`, `DecisionThread` |
| RF25.CA04 | `SearchIndexPort.indexGrouping`, `InstitutionalMemoryDocument`, páginas RF28 | P4 → D3 | 11 | `ATIVO → self (busca e página)` | `OSA`, `R1 (/companies, /departments)` |
| RF25.CA05 | `Grouping.closedAt/handoffDossierId`, `DomainEvents GroupingClosed`, `HandoffService.generateForGrouping`, `HandoffDossier` | A5 → F5 → P8 → P9 → P11 → I1 → I2 | 25–36 | `ATIVO → ENCERRADO` + nota | `DE`, `HS`, `AIE`, `AIP` |

Tela/aba: `/companies/[slug]` (esqueleto em `app/(shell)/companies/[slug]/page.tsx`) · `/profile` (esqueleto em `app/(shell)/profile/page.tsx`)
