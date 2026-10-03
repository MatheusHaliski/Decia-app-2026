# RF25 — Agrupar projetos e tarefas em Programas, Exercícios e Gestões (agrupamentos institucionais)
**HU:** HU25 · **Sprint (board Work Station):** Product Backlog (não comprometido na Sprint 4; candidato à Sprint 5) · **Equivalente FAI:** Agrupamentos (Coleções da marca RF35, Eras da celebridade RF34, temporadas) · **Aba/rota:** sub-aba *Programas & Agrupamentos* no perfil (RF19), página do agrupamento (`/groupings/[id]`), página da empresa/departamento (RF28)
**Critérios de aceite cobertos:** RF25.CA01 · CA02 · CA03 · CA04 · CA05

O **Agrupamento** (`Grouping`, = SchemeGrouping do FAI) organiza projetos e tarefas em quatro tipos (`GroupingType`): **PROGRAMA** (= coleção, ex.: "Programa Cidade Acessível 2026"), **EXERCÍCIO** (= temporada, ano orçamentário), **GESTÃO** (= era, período de um chefe ou de uma gestão da empresa) e **FRENTE** (= linha de estilo, tema transversal). EMPRESA e CHEFE criam qualquer tipo; EMPREGADO só cria FRENTE pessoal. A ligação é `GroupingItem` (targetType PROJECT | TASK) e, para projetos, os ponteiros desnormalizados `ProjectScheme.programGroupingId / exerciseGroupingId / managementGroupingId` — **um item pode estar em vários agrupamentos de tipos diferentes, mas em no máximo um por tipo**. A página do agrupamento mostra capa, projetos em grade, progresso agregado e a linha do tempo de decisões (`DecisionTraceNode`, RF29). Agrupamentos aparecem na página da empresa/departamento (RF28) e são indexados para Buscar (RF27). **Encerrar uma GESTÃO** gera automaticamente o **Dossiê de Transição** (`HandoffDossier`, RF36) do período.

| Tipo | Quem cria | Período | Exemplo |
|---|---|---|---|
| PROGRAMA | EMPRESA, CHEFE | livre | Programa Cidade Acessível 2026 |
| EXERCICIO | EMPRESA, CHEFE | ano orçamentário | Exercício 2026 |
| GESTAO | EMPRESA, CHEFE | mandato do chefe / gestão da empresa | Gestão SECID-UTS 2025–2026 |
| FRENTE | EMPRESA, CHEFE, EMPREGADO (pessoal) | livre | Convênios federais |

## 1. Diagrama de classes

```mermaid
classDiagram
direction LR

namespace ws_domain_planejamento {
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
    +targetType: String PROJECT ou TASK
    +targetId: UUID
    +addedAt: Instant
  }
}

namespace ws_domain_projetos_acervo {
  class ProjectScheme {
    <<entity>>
    +id: UUID
    +title: String
    +status: ProjectStatus
    +currentPhase: ProjectPhase
    +programGroupingId: UUID
    +exerciseGroupingId: UUID
    +managementGroupingId: UUID
    +departmentId: UUID
    +coverUrl: String
  }
  class TaskItem {
    <<entity>>
    +id: UUID
    +title: String
    +state: TaskState
    +departmentId: UUID
  }
  class ProjectTask {
    <<entity>>
    +projectId: UUID
    +percentComplete: int
  }
}

namespace ws_domain_identidade_decia {
  class User {
    <<entity>>
    +id: UUID
    +profileType: ProfileType
    +companyId: UUID
    +departmentId: UUID
  }
  class Company {
    <<entity>>
    +id: UUID
    +legalName: String
    +slug: String
  }
  class Department {
    <<entity>>
    +id: UUID
    +companyId: UUID
    +acronym: String
    +headUserId: UUID
  }
  class DecisionTraceNode {
    <<entity>>
    +id: UUID
    +sessionId: UUID
    +nodeType: TraceNodeType DECISAO
    +refId: UUID
    +classLabel: String
    +at: Instant
  }
  class DeciaSession {
    <<entity>>
    +id: UUID
    +linkedProjectId: UUID
  }
}

namespace ws_domain_transicao {
  class HandoffDossier {
    <<entity>>
    +id: UUID
    +subjectType: String GESTAO
    +subjectUserId: UUID
    +groupingId: UUID
    +requestedBy: UUID
    +reason: String FIM_GESTAO
    +generatedAt: Instant
    +contentJson: JSON openProjectsByPhase pendingTasks blockedTasks activeSessions pendingReviews contextSummaries
    +documentTaskId: UUID
    +transitionProjectId: UUID
    +successorUserId: UUID
    +status: HandoffStatus
    +aiInferenceId: UUID
  }
  class HandoffItem {
    <<entity>>
    +dossierId: UUID
    +targetType: String TASK PROJECT SESSION REVIEW
    +targetId: UUID
    +previousResponsibleId: UUID
    +newResponsibleId: UUID
  }
  class Notification {
    <<entity>>
    +recipientId: UUID
    +type: NotificationType DOSSIE_GERADO
    +category: String SISTEMA
  }
}

namespace ws_domain_enums {
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
  class HandoffStatus {
    <<enum>>
    GERADO
    AGUARDANDO_SUCESSOR
    TRANSFERIDO
  }
  class ProfileType {
    <<enum>>
    EMPREGADO
    EMPRESA
    CHEFE_DEPARTAMENTO
  }
}

namespace ws_application {
  class GroupingService {
    <<service>>
    +create(userId, GroupingForm) Grouping
    +canCreate(user, type) boolean EMPRESA CHEFE qualquer tipo, EMPREGADO só FRENTE
    +addItem(userId, groupingId, targetType, targetId) GroupingItem
    +removeItem(userId, groupingId, targetId)
    +page(viewerId, groupingId) GroupingPage capa grade progresso timeline
    +listForOrg(companyId, departmentId) List~Grouping~
    +close(userId, groupingId) Grouping
    -validateOnePerType(targetId, type) 409 AGRUPAMENTO_MESMO_TIPO
  }
  class HandoffService {
    <<service>>
    +generateForManagement(groupingId, requestedBy) HandoffDossier
  }
  class DecisionTraceService {
    <<service>>
    +timelineForProjects(projectIds) List~DecisionTraceNode~
  }
  class AiEngine {
    <<service>>
    +infer(capability DOSSIE, input) AiResult
  }
  class SearchIndexPort {
    <<port>>
    +indexGrouping(Grouping)
  }
  class MediaStoragePort {
    <<port>>
    +put(stream) MediaObject
  }
}

namespace ws_web {
  class GroupingController {
    <<controller>>
    +POST_api_groupings(GroupingForm)
    +GET_api_groupings_id()
    +POST_api_groupings_id_items(targetType, targetId)
    +DELETE_api_groupings_id_items_targetId()
    +POST_api_groupings_id_close()
    +GET_api_companies_slug_groupings()
    +GET_api_departments_id_groupings()
  }
}

namespace ws_infrastructure {
  class OpenSearchIndexAdapter {
    <<adapter>>
  }
  class S3StorageAdapter {
    <<adapter>>
  }
  class CassandraTraceReadAdapter {
    <<adapter>>
  }
  class ClaudeGeminiAdapter {
    <<adapter>>
  }
}

Grouping "1" --> "*" GroupingItem
Grouping "*" --> "1" User : ownerId
Grouping "*" --> "1" Company : companyId
Grouping "*" --> "0..1" Department : departmentId
Grouping "*" --> "0..1" HandoffDossier : handoffDossierId quando GESTAO encerrada
GroupingItem "*" --> "0..1" ProjectScheme : targetId quando PROJECT
GroupingItem "*" --> "0..1" TaskItem : targetId quando TASK
ProjectScheme "*" --> "0..1" Grouping : programGroupingId
ProjectScheme "*" --> "0..1" Grouping : exerciseGroupingId
ProjectScheme "*" --> "0..1" Grouping : managementGroupingId
ProjectScheme "1" --> "*" ProjectTask : progresso agregado
DeciaSession "*" --> "0..1" ProjectScheme : linkedProjectId
DeciaSession "1" --> "*" DecisionTraceNode : linha do tempo de decisões
HandoffDossier "1" --> "*" HandoffItem
HandoffDossier "*" --> "1" Grouping : groupingId
Grouping --> GroupingType
Grouping --> GroupingStatus
HandoffDossier --> HandoffStatus
User --> ProfileType

GroupingController ..> GroupingService
GroupingService ..> DecisionTraceService
GroupingService ..> SearchIndexPort
GroupingService ..> MediaStoragePort : capa
GroupingService ..> HandoffService : AFTER_COMMIT GroupingClosed quando GESTAO
HandoffService ..> AiEngine : DOSSIE contextSummaries
HandoffService ..> Notification : chefe e sucessor
OpenSearchIndexAdapter ..|> SearchIndexPort
S3StorageAdapter ..|> MediaStoragePort
CassandraTraceReadAdapter ..> DecisionTraceService : trace_by_entity
ClaudeGeminiAdapter ..> AiEngine

note for Grouping "tabela groupings · nome, tipo, período, capa, descrição (CA01) · status ATIVO/ENCERRADO, closedAt, handoffDossierId (CA05)"
note for GroupingItem "tabela grouping_items · um item em vários agrupamentos de tipos diferentes, no máximo 1 por tipo (CA02)"
note for GroupingService "canCreate: EMPRESA e CHEFE qualquer tipo, EMPREGADO só FRENTE pessoal — senão 403 ACESSO_NEGADO (CA01)"
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph LU["Usuário"]
    U1["EMPRESA / CHEFE / EMPREGADO cria agrupamento: nome, tipo, período, capa, descrição"]
    U2["Adiciona projeto ou tarefa ao agrupamento"]
    U3["Abre a página do agrupamento"]
    U4["Abre a página da empresa/departamento ou busca por agrupamentos"]
    U5["CHEFE ou EMPRESA encerra uma GESTÃO"]
  end

  subgraph LW["Web / BFF (Next.js App Router)"]
    W1["Sub-aba Programas & Agrupamentos no perfil RF19"]
    W2["Página: capa, projetos em grade, progresso agregado, linha do tempo de decisões"]
    W3["Toast: item já está em outro agrupamento do mesmo tipo — mover?"]
    W4["Seção Agrupamentos na página da empresa/departamento RF28; resultados em Buscar RF27"]
    W5["Aviso: dossiê de transição gerado, link para RF36"]
  end

  subgraph LA["ws-application"]
    A1["GroupingService.create → canCreate"]
    A2{"Perfil pode criar este tipo? EMPRESA/CHEFE qualquer, EMPREGADO só FRENTE"}
    A3["403 ACESSO_NEGADO"]
    A4["Persiste Grouping ATIVO; MediaStoragePort capa; SearchIndexPort.indexGrouping"]
    A5["GroupingService.addItem → validateOnePerType"]
    A6{"Item já em outro agrupamento do mesmo tipo?"}
    A7["409 AGRUPAMENTO_MESMO_TIPO"]
    A8["INSERT GroupingItem; se PROJECT atualiza programGroupingId / exerciseGroupingId / managementGroupingId"]
    A9["GroupingService.page: projetos, progresso agregado = média percentComplete e contagem por status"]
    A10["DecisionTraceService.timelineForProjects: nós DECISAO das sessões vinculadas"]
    A11["GroupingService.listForOrg + SearchService"]
    A12["GroupingService.close"]
    A13{"type == GESTAO?"}
    A14["status ENCERRADO, closedAt"]
    A15["AFTER_COMMIT GroupingClosed → HandoffService.generateForManagement"]
    A16["HandoffDossier subjectType GESTAO, reason FIM_GESTAO, contentJson; HandoffItems; Grouping.handoffDossierId; Notification ao chefe e sucessor"]
  end

  subgraph LI["IA (AiEngine)"]
    I1["DOSSIE: contextSummaries dos projetos abertos, pendências e decisões do período"]
  end

  subgraph LP["Persistência"]
    P1[("MySQL: groupings · S3: capa · OpenSearch: índice de agrupamentos")]
    P2[("MySQL: grouping_items, project_schemes.*GroupingId")]
    P3[("MySQL: project_schemes, project_tasks · Cassandra: trace_by_entity")]
    P4[("MySQL: handoff_dossiers, handoff_items, ai_inference_log · Cassandra: notifications_by_user")]
  end

  U1 --> A1 --> A2
  A2 -->|"não"| A3
  A2 -->|"sim"| A4 --> P1 --> W1
  W1 --> U2 --> A5 --> A6
  A6 -->|"sim"| A7 --> W3
  A6 -->|"não"| A8 --> P2
  W1 --> U3 --> A9 --> P3
  A9 --> A10 --> P3
  A10 --> W2
  U4 --> A11 --> P1
  A11 --> W4
  W1 --> U5 --> A12 --> A14 --> P1
  A14 --> A13
  A13 -->|"não"| W1
  A13 -->|"sim"| A15 --> I1 --> A16 --> P4 --> W5

  classDef err fill:#ffe3e3,stroke:#c0392b,color:#5a1a12
  class A3,A7 err
```

## 3. Diagrama de sequência

```mermaid
sequenceDiagram
  autonumber
  actor U as Usuário (CHEFE)
  participant NX as Next.js (App Router)
  participant C as Controller (ws-web)
  participant S as Service (ws-application)
  participant AI as AiEngine
  participant DB as Repository/MySQL
  participant CS as Cassandra
  participant OS as OpenSearch
  participant DE as DomainEvents (AFTER_COMMIT)

  U->>NX: Novo agrupamento — tipo GESTAO, "Gestão SECID-UTS 2025–2026", período, capa, descrição
  NX->>C: POST /api/groupings {type, label, periodFrom, periodTo, description, cover}
  C->>S: GroupingService.create(userId, form)
  S->>S: canCreate(user, GESTAO)
  alt EMPREGADO tentando criar PROGRAMA, EXERCICIO ou GESTAO (CA01)
    S-->>C: 403 ACESSO_NEGADO {hint: EMPREGADO só cria FRENTE pessoal}
    C-->>NX: 403
  else permitido
    S->>DB: INSERT groupings (type GESTAO, status ATIVO, companyId, departmentId)
    S->>OS: indexGrouping (CA04)
    S-->>C: 201 Grouping
    C-->>NX: 201
    NX-->>U: agrupamento na sub-aba Programas & Agrupamentos
  end

  U->>NX: adiciona o projeto P5 ao agrupamento (CA02)
  NX->>C: POST /api/groupings/{gId}/items {targetType PROJECT, targetId P5}
  C->>S: GroupingService.addItem(userId, gId, PROJECT, P5)
  S->>DB: SELECT grouping_items JOIN groupings WHERE targetId = P5 AND type = GESTAO
  alt P5 já em outra GESTAO
    S-->>C: 409 AGRUPAMENTO_MESMO_TIPO {currentGroupingId}
    C-->>NX: 409
    NX-->>U: "já está em Gestão 2023–2024 — mover?"
  else livre
    S->>DB: INSERT grouping_items (gId, PROJECT, P5)
    S->>DB: UPDATE project_schemes SET managementGroupingId = gId WHERE id = P5
    S-->>C: 201 GroupingItem
    C-->>NX: 201
  end

  U->>NX: abre /groupings/{gId} (CA03)
  NX->>C: GET /api/groupings/{gId}
  C->>S: GroupingService.page(viewerId, gId)
  S->>DB: groupings + grouping_items + project_schemes + AVG project_tasks.percentComplete + COUNT por status
  S->>CS: trace_by_entity WHERE entity IN projetos do agrupamento AND nodeType = DECISAO
  CS-->>S: nós de decisão ordenados por at
  S-->>C: 200 {cover, projects grid, progress agregado, decisionsTimeline}
  C-->>NX: 200
  NX-->>U: capa, grade, progresso, linha do tempo de decisões

  U->>NX: abre /companies/secid (CA04)
  NX->>C: GET /api/companies/secid/groupings
  C->>S: GroupingService.listForOrg(companyId)
  S->>DB: groupings WHERE companyId ORDER BY type, periodFrom
  S-->>C: 200 programas, exercícios, gestões, frentes
  NX->>C: GET /api/search?q=Cidade+Acessivel
  C->>OS: msearch inclui índice de agrupamentos
  OS-->>C: hits de Grouping

  U->>NX: Encerrar gestão (CA05)
  NX->>C: POST /api/groupings/{gId}/close
  C->>S: GroupingService.close(userId, gId)
  S->>DB: UPDATE groupings SET status ENCERRADO, closedAt
  S->>DE: publish GroupingClosed {gId, type GESTAO}
  S-->>C: 200 Grouping ENCERRADO
  C-->>NX: 200
  DE->>S: HandoffService.generateForManagement(gId, requestedBy)
  S->>DB: projetos abertos por fase, tarefas pendentes e bloqueadas, sessões ativas, revisões pendentes do período
  S->>AI: infer(DOSSIE, {projetos, pendências, decisões do período})
  AI-->>S: contextSummaries + ai_inference_log
  S->>DB: INSERT handoff_dossiers (subjectType GESTAO, groupingId gId, reason FIM_GESTAO, status GERADO, contentJson)
  S->>DB: INSERT handoff_items (TASK, PROJECT, SESSION, REVIEW)
  S->>DB: UPDATE groupings SET handoffDossierId
  S->>CS: INSERT notifications_by_user (chefe e sucessor, type DOSSIE_GERADO)
  NX-->>U: aviso "Dossiê de Transição gerado" com link (RF36)
```

## 4. Máquina de estados

Entidade central: **`Grouping.status`** (ATIVO · ENCERRADO). Encerrar um agrupamento do tipo **GESTAO** dispara a criação do `HandoffDossier` (RF36), cujos estados aparecem como consequência.

```mermaid
stateDiagram-v2
  [*] --> ATIVO : POST groupings — EMPRESA/CHEFE qualquer tipo, EMPREGADO só FRENTE
  ATIVO --> ATIVO : adicionar e remover itens, no máximo 1 agrupamento por tipo por item
  ATIVO --> ENCERRADO : encerrar, closedAt
  state "ENCERRADO — somente leitura" as ENCERRADO
  state fim <<choice>>
  ENCERRADO --> fim
  fim --> DOSSIE_GERADO : type == GESTAO, AFTER_COMMIT GroupingClosed
  fim --> [*] : outros tipos
  state "HandoffDossier RF36" as HD {
    state "GERADO" as DOSSIE_GERADO
    DOSSIE_GERADO --> AGUARDANDO_SUCESSOR : sucessor indicado
    AGUARDANDO_SUCESSOR --> TRANSFERIDO : sucessor aceita, HandoffItems reatribuídos
  }
  TRANSFERIDO --> [*]
  note right of ATIVO
    Criação negada ao EMPREGADO fora de FRENTE: 403 ACESSO_NEGADO (CA01).
    Item já no mesmo tipo: 409 AGRUPAMENTO_MESMO_TIPO (CA02).
    Página mostra capa, grade, progresso e decisões (CA03).
    Indexado para Buscar e página da empresa/departamento (CA04).
  end note
  note right of HD
    Grouping.handoffDossierId aponta para o dossiê do período (CA05).
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FE["Frontend Next.js"]
    F1["app/profile — sub-aba Programas & Agrupamentos RF19"]
    F2["app/groupings/[id] — página do agrupamento"]
    F3["app/companies/[slug], app/departments/[id] RF28 — seção Agrupamentos"]
    F4["components/ui: GroupingCard, GroupingForm tipo/período/capa, ItemPicker projeto ou tarefa, ProgressRing, DecisionTimeline, CloseManagementDialog"]
  end

  subgraph WEB["ws-web"]
    C1["GroupingController — /api/groupings, /items, /close, /api/companies/{slug}/groupings, /api/departments/{id}/groupings"]
    C2["SearchController RF27 — /api/search inclui agrupamentos"]
  end

  subgraph APP["ws-application"]
    S1["GroupingService"]
    S2["HandoffService RF36"]
    S3["DecisionTraceService RF29"]
    S4["SearchService RF27"]
    S5["AiEngine"]
    P1["SearchIndexPort"]
    P2["MediaStoragePort"]
  end

  subgraph DOM["ws-domain"]
    D1["Grouping · GroupingItem"]
    D2["ProjectScheme · TaskItem · ProjectTask"]
    D3["HandoffDossier · HandoffItem · Notification · DecisionTraceNode · DeciaSession"]
    D4["User · Company · Department"]
  end

  subgraph INFRA["ws-infrastructure/*"]
    I1[("persistence-mysql: groupings, grouping_items, project_schemes, handoff_dossiers, handoff_items, ai_inference_log")]
    I2[("persistence-cassandra: trace_by_entity, notifications_by_user")]
    I3[("search-opensearch: índice de agrupamentos")]
    I4[("storage-s3: capa do agrupamento")]
    I5["ai-providers: ClaudeGeminiAdapter — DOSSIE"]
    I6["platform: outbox AFTER_COMMIT GroupingClosed"]
  end

  subgraph EXT["Serviços externos"]
    E1(("Claude / Gemini"))
  end

  F1 --- F4
  F2 --- F4
  F3 --- F4
  F1 -->|"HTTPS/JSON"| C1
  F2 -->|"HTTPS/JSON"| C1
  F3 -->|"HTTPS/JSON"| C1
  F3 -->|"HTTPS/JSON"| C2
  C1 --> S1
  C2 --> S4
  S1 --> S3
  S1 --> P1
  S1 --> P2
  S1 --> D1
  S1 --> D2
  S1 --> D4
  D1 --> I6
  I6 --> S2
  S2 --> S5
  S2 --> D3
  S3 --> I2
  S4 --> I3
  D1 --> I1
  D2 --> I1
  D3 --> I1
  D3 --> I2
  D4 --> I1
  P1 --> I3
  P2 --> I4
  S5 --> I5
  I5 -.-> E1
```

## 6. Rastreabilidade

| CA | Elemento do diagrama (classe / passo / mensagem / transição / componente) |
|---|---|
| RF25.CA01 | `Grouping` (type, label, description, coverUrl, periodFrom/To), enums `GroupingType`, `ProfileType`, `GroupingService.create/canCreate` (nota EMPREGADO só FRENTE), `MediaStoragePort` · Atividades `U1 → A1 → A2 → A3 403 ACESSO_NEGADO / A4 → P1` · Sequência `POST /api/groupings` → `alt EMPREGADO tentando criar … → 403` / `INSERT groupings` · Transição `[*] → ATIVO` + nota · Componentes `GroupingForm`, `storage-s3` |
| RF25.CA02 | `GroupingItem` (nota 1 por tipo), `ProjectScheme.programGroupingId/exerciseGroupingId/managementGroupingId`, `GroupingService.addItem/validateOnePerType` · Atividades `U2 → A5 → A6 → A7 409 AGRUPAMENTO_MESMO_TIPO / A8 → P2` · Sequência `POST /api/groupings/{gId}/items` → `alt P5 já em outra GESTAO → 409` / `INSERT grouping_items` + `UPDATE project_schemes SET managementGroupingId` · Transição `ATIVO → ATIVO` · Componente `ItemPicker` |
| RF25.CA03 | `GroupingService.page`, `ProjectTask.percentComplete`, `DecisionTraceNode` (nodeType DECISAO), `DeciaSession.linkedProjectId`, `DecisionTraceService.timelineForProjects`, `CassandraTraceReadAdapter` · Atividades `U3 → A9 → A10 → P3 → W2` · Sequência `GET /api/groupings/{gId}` → `AVG percentComplete + COUNT por status` → `trace_by_entity … nodeType = DECISAO` → `{cover, projects grid, progress, decisionsTimeline}` · Componentes `app/groupings/[id]`, `ProgressRing`, `DecisionTimeline`, `persistence-cassandra` |
| RF25.CA04 | `GroupingService.listForOrg`, `SearchIndexPort.indexGrouping`, `Company`, `Department` · Atividades `U4 → A11 → P1 → W4` · Sequência `indexGrouping (CA04)`, `GET /api/companies/secid/groupings`, `GET /api/search?q=…` → `msearch inclui índice de agrupamentos` · Componentes `F3 (RF28)`, `SearchController RF27`, `search-opensearch` |
| RF25.CA05 | `Grouping.status/closedAt/handoffDossierId`, enums `GroupingStatus`, `HandoffStatus`, `HandoffDossier` (subjectType GESTAO, reason FIM_GESTAO, contentJson), `HandoffItem`, `GroupingService.close`, `HandoffService.generateForManagement`, `AiEngine DOSSIE`, `Notification` · Atividades `U5 → A12 → A14 → A13 (sim) → A15 → I1 → A16 → P4 → W5` · Sequência `POST /api/groupings/{gId}/close` → `publish GroupingClosed` → `HandoffService.generateForManagement` → `infer(DOSSIE …)` → `INSERT handoff_dossiers`, `handoff_items`, `UPDATE groupings SET handoffDossierId`, notificação · Transições `ATIVO → ENCERRADO → fim → DOSSIE_GERADO → AGUARDANDO_SUCESSOR → TRANSFERIDO` · Componentes `CloseManagementDialog`, `HandoffService RF36`, `platform outbox GroupingClosed`, `ai-providers DOSSIE` |
