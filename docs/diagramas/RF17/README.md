# RF17 — Visualizar esquemas de tarefa & projetos criados por outros usuários na rede social do Work Station, através da aba "Buscar"
**HU:** HU17 · **Sprint (board Work Station):** lista *Requisitos Funcionais* sem sprint atribuída (card renomeado em 2026-10-02; origem RF27 = Sprint 4; o card "SPRINT 3" cita "RF17 Encerrar sessão", escopo antigo preservado em `_anterior/RF17` — `RENUMERACAO.md`) · **Equivalente FAI:** RF8 Buscar/Explorar (busca textual com abas e contadores, "looks parecidos com este") · **Aba/rota:** Buscar (`/search`, abas PROJETOS · TAREFAS · PESSOAS · EMPRESAS · CHEFES DE DEPARTAMENTO) e páginas de leitura de esquema de terceiros (`/tasks/[id]`, `/projects/[id]`); API `GET /api/search?q=&tab=&filters…&page=`, `GET /api/search/suggestions`, `GET /api/projects/{id}/similar`, `GET /api/tasks/{id}`, `GET /api/projects/{id}` · **real:** `GET /api/tasks/{id}` (`TaskController.get`, `@AuthorizedBy("require")`) e `GET /api/people/{id}/tasks` (`PeopleController`, em curso, Onda 1)
**Critérios de aceite cobertos:** RF17.CA01 … RF17.CA06 — corpo do card vazio: CAs derivados do título + HU17 + RF27 (CA03 busca, CA04 visibilidade, CA05 semântica); todos marcados "(CA a confirmar)". O Mural (RF27.CA01/CA02/CA06) continua no RF27. Todas as classes do RF são **(planejado)**; reais: `OpenSearchAdaptersConfig` (flag `opensearch.enabled`), `AiProvidersConfig`, `Guard`, `SecurityConfig`. Atualização 17/10/2026 **(real)**: regra de leitura `AccessPolicy.visible/decide/sigiloso` (D-139), `TaskController.get` → `TaskService.get` → `ResourceAuthorizer.require` com `404 NAO_ENCONTRADO` uniforme, `TaskService.listOf` (em curso, Onda 1) e `components/social/TaskDetail.tsx` com o mesmo 404 (D-141).

> **HU17** — COMO usuário autenticado no sistema POSSO visualizar esquemas de tarefa ou projeto criados por outros usuários, chefes ou empresas na aba "Buscar/Explorar" PARA me inspirar em outras combinações e ampliar minhas referências de projetos.

A busca lê os índices OpenSearch `ws-tasks`, `ws-projects`, `ws-people` e `ws-orgs` (ARQUITETURA §3.2) com o mesmo `AccessPolicy.visibilityFilter` dos perfis (RF16), devolve 5 abas com contadores e abre o esquema de terceiro em **modo leitura** com crédito do autor. "Projetos parecidos" usa `AiEngine` capability `MEMORIA_BUSCA` (embedding) e kNN em `ws-memory` (RF33), com fallback textual. A indexação é assíncrona (`PipelineJob INDEXAR_BUSCA`, proposta) a partir dos eventos de publicação/alteração/arquivamento.

**Atualização 17/10/2026.** A busca segue **(planejado)**, mas a regra de leitura que ela vai aplicar já é **(real)** no domínio: `ws-domain/.../security/AccessPolicy.java` — `visible` e `decide` só admitem ADMIN fora de SIGILOSO (`sigiloso(ScopedResource)`, **D-139**; `AccessPolicyMatrixTest`); SIGILOSO equivale a PRIVADA (só dono e colaboradores explícitos) e RESTRITO nunca passa de DEPARTAMENTO. A leitura de tarefa de terceiro já é real em `GET /api/tasks/{id}` (`TaskController.get` → `TaskService.get` → `ResourceAuthorizer.require(VIEW)`): invisível responde **`404 NAO_ENCONTRADO`** com a mesma mensagem de id inexistente; visível sem permissão de edição → `PUT /api/tasks/{id}` `403 ACESSO_NEGADO`. O front faz o mesmo: `components/social/TaskDetail.tsx` mostra `404 NAO_ENCONTRADO` para tarefa invisível (**D-141**, Q-239, revisa a D-93). A composição de projeto no front não vaza títulos nem a contagem de tarefas ocultas (`lib/social/view-model.ts`, commit `b602d34`). As tarefas de uma pessoa (`GET /api/people/{id}/tasks` → `TaskService.listOf`, filtro por `AccessPolicy.visible`) estão **(em curso, Onda 1)** — RF16.

## Critérios de aceite derivados da HU17 (todos "CA a confirmar")

| CA | Enunciado (Dado / Quando / Então) |
|---|---|
| **RF17.CA01** (CA a confirmar) | Dado um usuário autenticado em `/search`, quando digita um termo, então o sistema busca em título, descrição, tags e texto OCR (OpenSearch `ws-tasks`, `ws-projects`, `ws-people`, `ws-orgs`) e devolve **5 abas com contadores** (PROJETOS · TAREFAS · PESSOAS · EMPRESAS · CHEFES DE DEPARTAMENTO) em ≤ 1 s p95; termo vazio mostra sugestões (recentes, em alta, chancelados) via `GET /api/search/suggestions`. |
| **RF17.CA02** (CA a confirmar) | Dado uma aba, quando aplico filtros (categoria, tipo, fase, departamento, exercício, chancelado, prazo) e pagino (20 por página), então a URL reflete `q`, `tab`, filtros e `page`; a tela mostra `Skeleton` ao carregar, `EmptyState` ilustrado e `ErrorState` com "tentar de novo" em erro (`503 BUSCA_INDISPONIVEL` quando o OpenSearch está fora ou a flag está desligada). |
| **RF17.CA03** (CA a confirmar) | Dado os resultados, quando são devolvidos, então só contêm itens que o viewer pode ver (`AccessPolicy.visibilityFilter` aplicado como filtro da query): `PUBLICA` sempre; `EMPRESA` se mesma empresa; `DEPARTAMENTO` se membro; `PRIVADA` só os meus; `RASCUNHO` nunca aparece para terceiros; `accessClass` SIGILOSO nunca é indexado e RESTRITO só para o departamento dono. Resultados de outra empresa só se `PUBLICA`. **Real (17/10/2026):** a regra item a item já existe em `AccessPolicy.visible/decide` — SIGILOSO só para dono e colaboradores explícitos, sem acesso implícito do ADMIN (`AccessPolicy.sigiloso`, D-139, `AccessPolicyMatrixTest`); a busca que a aplicará segue planejada. |
| **RF17.CA04** (CA a confirmar) | Dado um resultado de tarefa ou projeto de outro usuário, quando o abro, então vejo o esquema completo em **modo leitura** (ficha, fases e tarefas do projeto, capa, chancelas) com o **crédito do autor** (avatar + link para RF16/RF14/RF15), as ações inline do RF18/RF19 e "Levar ao meu acervo" (RF7/RF41.CA08); edição é `403 ACESSO_NEGADO`; item que ficou PRIVADA depois de indexado responde `404` e sai do índice. **Real (17/10/2026):** `GET /api/tasks/{id}` → invisível = `404 NAO_ENCONTRADO` uniforme (`ResourceAuthorizer.require` → `AccessDecision.NOT_FOUND`), também no front (`components/social/TaskDetail.tsx`, D-141, revisa a D-93); editar sem permissão → `PUT /api/tasks/{id}` `403 ACESSO_NEGADO`; o card de projeto não mostra título nem total de tarefa oculta (`lib/social/view-model.ts`, `b602d34`). Leitura de projeto pela API segue planejada (Onda 2). |
| **RF17.CA05** (CA a confirmar) | Dado um projeto aberto, quando clico em "projetos parecidos com este", então o sistema gera o embedding (`AiEngine MEMORIA_BUSCA`) e faz kNN em `ws-memory` com o mesmo `visibilityFilter`, devolvendo até 10 projetos com score e motivo ("mesmo processo, 4 tarefas em comum"); sem IA disponível cai para "mais do mesmo processo/departamento" (busca textual); `AiInferenceLog` registra a inferência. |
| **RF17.CA06** (CA a confirmar) | Dado que um autor publica, altera a visibilidade ou arquiva uma tarefa/projeto, quando a transação é confirmada, então o evento AFTER_COMMIT agenda `PipelineJob INDEXAR_BUSCA` (tipo proposto) e o índice reflete a mudança em ≤ 60 s; falha deixa o job `REPROCESSAR` sem afetar a operação do autor. |

## 1. Diagrama de classes

```mermaid
classDiagram
  direction LR

  class SearchController {
    <<controller>>
    +search(q, tab, filters, page, CurrentUser) SearchResultView
    +suggestions(CurrentUser) SuggestionsView
    +similar(projectId, CurrentUser) List~SimilarProjectView~
  }
  class ReadOnlySchemeController {
    <<controller>>
    +task(id, CurrentUser) TaskReadView
    +project(id, CurrentUser) ProjectReadView
  }
  class SearchService {
    <<service>>
    +search(SearchQuery, viewer) SearchResultView
    +suggestions(viewer) SuggestionsView
    -countersPerTab(q, viewer) Map
  }
  class SimilarProjectsService {
    <<service>>
    +similar(projectId, viewer) List~SimilarProjectView~
    -fallbackTextual(project, viewer) List
  }
  class SchemeReadService {
    <<service>>
    +task(id, viewer) TaskReadView
    +project(id, viewer) ProjectReadView
    -creditOf(owner) AuthorCredit
  }
  class SearchIndexer {
    <<service>>
    +onPublished(target) void
    +onVisibilityChanged(target) void
    +onArchived(target) void
    +run(PipelineJob) void
  }
  class AccessPolicy {
    <<service>>
    +visibilityFilter(viewer) VisibilityScope
    +canView(viewer, item) boolean
    +visible(Viewer, ScopedResource)$ boolean
    +decide(Viewer, ScopedResource, ResourceAction)$ AccessDecision
    -sigiloso(ScopedResource)$ boolean
  }
  class AccessDecision {
    <<enum>>
    ALLOW
    FORBIDDEN
    NOT_FOUND
  }
  class TaskController {
    <<controller>>
    +get(CurrentUser, UUID id) TaskView
    +update(CurrentUser, UUID id, TaskRequest, RequestContext) TaskView
  }
  class TaskService {
    <<service>>
    +get(CurrentUser, UUID id) TaskView
    +listOf(CurrentUser, ownerId, limit) List~TaskView~
  }
  class ResourceAuthorizer {
    <<service>>
    +require(Viewer, ScopedResource, ResourceAction) void
  }
  class AiEngine {
    <<service>>
    +run(AiRequest) AiResponse
    capability MEMORIA_BUSCA
  }
  class SearchIndexPort {
    <<port>>
    +search(index, query, scope, page) SearchPage
    +count(index, query, scope) long
    +index(doc) void
    +delete(index, id) void
    +knn(index, vector, scope, k) List
  }
  class SearchQuery {
    <<value>>
    +String q
    +SearchTab tab
    +Map filters
    +int page
    +int size
  }
  class VisibilityScope {
    <<value>>
    +UUID viewerId
    +UUID companyId
    +Set~UUID~ departmentIds
    +Set~Visibility~ visibilities
  }
  class PipelineJobPort {
    <<port>>
    +enqueue(type, targetType, targetId) PipelineJob
  }
  class TaskRepositoryPort {
    <<port>>
    +findById(id) Optional
  }
  class ProjectRepositoryPort {
    <<port>>
    +findById(id) Optional
  }

  class TaskItem {
    <<entity>>
    +UUID id
    +UUID ownerId
    +UUID departmentId
    +String title
    +String summary
    +Set~String~ tags
    +TaskCategory category
    +TaskType type
    +TaskState state
    +Visibility visibility
    +AccessClassification accessClass
    +JSON sealIdsJson
  }
  class ProjectScheme {
    <<entity>>
    +UUID id
    +UUID ownerId
    +UUID departmentId
    +String title
    +String objective
    +Set~ProcessTag~ processTags
    +ProjectStatus status
    +ProjectPhase currentPhase
    +Visibility visibility
    +int exerciseYear
    +JSON sealIdsJson
  }
  class User {
    <<entity>>
    +String username
    +String fullName
    +String jobTitle
    +ProfileType profileType
    +UUID companyId
    +UUID departmentId
  }
  class Company {
    <<entity>>
    +String legalName
    +String slug
  }
  class Department {
    <<entity>>
    +String name
    +String acronym
    +UUID headUserId
  }
  class TaskAttachment {
    <<entity>>
    +String ocrTextRef
  }
  class InstitutionalMemoryDocument {
    <<document>>
    +String docId
    +MemorySourceType sourceType
    +UUID sourceId
    +String text
    +float[] embedding
    +Visibility visibility
    +AccessClassification accessClass
  }
  class PipelineJob {
    <<entity>>
    +String type
    +PipelineJobStatus status
    +int attempts
  }
  class AiInferenceLog {
    <<entity>>
    +AiCapability capability
    +String hostRf
  }
  class SearchTab {
    <<enum>>
    PROJETOS
    TAREFAS
    PESSOAS
    EMPRESAS
    CHEFES_DE_DEPARTAMENTO
  }
  class Visibility {
    <<enum>>
    PRIVADA
    DEPARTAMENTO
    EMPRESA
    PUBLICA
  }
  class AccessClassification {
    <<enum>>
    PUBLICO
    INTERNO
    RESTRITO
    SIGILOSO
  }

  SearchController --> SearchService
  SearchController --> SimilarProjectsService
  ReadOnlySchemeController --> SchemeReadService
  SearchService --> AccessPolicy
  TaskController --> TaskService
  TaskService --> ResourceAuthorizer : require VIEW ou EDIT
  ResourceAuthorizer --> AccessPolicy : decide
  AccessPolicy ..> AccessDecision
  note for AccessPolicy "Real em ws-domain: visible e decide só admitem ADMIN fora de SIGILOSO (D-139, AccessPolicyMatrixTest). visibilityFilter e canView seguem planejados para a busca."
  note for ResourceAuthorizer "Real: NOT_FOUND vira 404 NAO_ENCONTRADO com a mesma mensagem de id inexistente. FORBIDDEN vira 403 ACESSO_NEGADO."
  SearchService --> SearchIndexPort
  SearchService ..> SearchQuery
  SearchService ..> VisibilityScope
  SimilarProjectsService --> AiEngine
  SimilarProjectsService --> SearchIndexPort
  SimilarProjectsService --> AccessPolicy
  SchemeReadService --> AccessPolicy
  SchemeReadService --> TaskRepositoryPort
  SchemeReadService --> ProjectRepositoryPort
  SearchIndexer --> SearchIndexPort
  SearchIndexer --> PipelineJobPort
  SearchQuery --> SearchTab
  SearchIndexPort ..> TaskItem : ws-tasks
  SearchIndexPort ..> ProjectScheme : ws-projects
  SearchIndexPort ..> User : ws-people
  SearchIndexPort ..> Company : ws-orgs
  SearchIndexPort ..> Department : ws-orgs (chefes)
  SearchIndexPort ..> InstitutionalMemoryDocument : ws-memory (kNN)
  TaskItem "1" --> "0..*" TaskAttachment : texto OCR indexado
  PipelineJob "0..*" --> "1" TaskItem : INDEXAR_BUSCA
  PipelineJob "0..*" --> "1" ProjectScheme : INDEXAR_BUSCA
  SimilarProjectsService ..> AiInferenceLog
  TaskItem --> Visibility
  TaskItem --> AccessClassification
  note for SearchIndexPort "SIGILOSO nunca entra no índice. RESTRITO entra com departmentId e só sai na query do departamento dono. RASCUNHO não é indexado."
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph ATOR["Usuário autenticado"]
    A1["Abre /search e digita um termo (ou deixa vazio)"]
    A2["Escolhe uma aba, aplica filtros e pagina"]
    A3["Abre um resultado de tarefa/projeto de terceiro"]
    A4["Clica 'projetos parecidos com este' · interage · Levar ao meu acervo"]
  end
  subgraph FE["Next.js (App Router) · BFF"]
    F1["GET /api/search/suggestions (termo vazio: recentes, em alta, chancelados)"]
    F2["GET /api/search?q=&tab=&categoria=&tipo=&fase=&dept=&exercicio=&chancelado=&prazo=&page= · URL reflete tudo · Skeleton"]
    F3["5 Tabs com contadores · TaskCard / ProjectCard / Avatar (pessoas) / logo (empresas) / Monogram (chefes) · EmptyState · ErrorState tentar de novo"]
    F4["GET /api/tasks/{id} ou /api/projects/{id} → modo leitura com crédito do autor + ações inline (RF18/RF19) + Levar ao meu acervo (RF7)"]
    F5["GET /api/projects/{id}/similar"]
  end
  subgraph WEB["ws-web"]
    W1["JWT + SessionActiveFilter + CurrentUserArgumentResolver"]
    W2["SearchController · ReadOnlySchemeController"]
    E503["503 BUSCA_INDISPONIVEL (OpenSearch fora / flag opensearch.enabled off)"]
    E403["403 ACESSO_NEGADO (tentar editar esquema de terceiro)"]
    E404["404 (item que ficou PRIVADA ou foi arquivado)"]
    E404U["404 NAO_ENCONTRADO uniforme (real): invisível = inexistente · front TaskDetail.tsx igual (D-141)"]
  end
  subgraph APP["ws-application"]
    S1["AccessPolicy.visibilityFilter(viewer) → VisibilityScope {companyId, departmentIds, visibilities}"]
    S2["SearchService.search: query multi-campo (título, descrição, tags, OCR) + filtro de escopo + filtros da aba"]
    S3["countersPerTab: 5 contagens em paralelo (ws-tasks, ws-projects, ws-people, ws-orgs)"]
    S4["Resultados paginados (20) ordenados por relevância"]
    R1["SchemeReadService: canView? → ficha completa em leitura, fases/tarefas, capa, chancelas, creditOf(owner)"]
    R2{"viewer pode ver o item?"}
    SIM1["SimilarProjectsService: AiEngine MEMORIA_BUSCA → embedding do projeto"]
    SIM2{"IA disponível?"}
    SIM3["kNN em ws-memory (k=10) com o mesmo VisibilityScope · score + motivo (processo, tarefas em comum)"]
    SIM4["fallback textual: mesmo processo/departamento"]
    RT1["GET /api/tasks/{id} (real): TaskController.get → TaskService.get → ResourceAuthorizer.require(VIEW) → AccessPolicy.decide · SIGILOSO sem vínculo explícito = NOT_FOUND, inclusive ADMIN (D-139)"]
    IDX["SearchIndexer (AFTER_COMMIT de TaskPublished/ProjectPublished/VisibilityChanged/Archived) → PipelineJob INDEXAR_BUSCA → index/delete ≤ 60 s · falha → REPROCESSAR"]
  end
  subgraph PERS["Persistência"]
    P1[("OpenSearch: ws-tasks · ws-projects · ws-people · ws-orgs · ws-memory (dense_vector)")]
    P2[("MySQL: tasks, project_schemes, users, companies, departments, pipeline_jobs, ai_inference_log")]
    P3[("Redis: sugestões (recentes, em alta) · cache de contadores")]
  end

  A1 -->|"vazio"| F1 --> P3
  A1 --> F2 --> W1 --> W2 --> S1 --> S2 --> S3 --> S4 --> F3
  S2 --> P1
  S2 -->|"índice indisponível"| E503
  A2 --> F2
  A3 --> F4 --> W2 --> R1 --> R2
  R2 -->|"não (PRIVADA agora)"| E404
  R2 -->|"editar"| E403
  R2 -->|"sim"| F4
  R1 --> P2
  A4 --> F5 --> W2 --> SIM1 --> SIM2
  SIM2 -->|"sim"| SIM3 --> P1
  SIM2 -->|"não"| SIM4 --> P1
  SIM1 --> P2
  P2 -.eventos de publicação/visibilidade/arquivamento.-> IDX --> P1
  IDX --> P2
  F4 -.->|"tarefa (real)"| RT1
  RT1 -->|"NOT_FOUND"| E404U
  RT1 -->|"ALLOW"| F4
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
  participant OS as OpenSearch
  participant R as Repository/MySQL
  participant RD as Redis
  participant EV as DomainEvents (AFTER_COMMIT)

  U->>N: digita "pavimentação" em /search
  N->>C: GET /api/search?q=pavimentacao&tab=PROJETOS&page=0
  C->>S: SearchService.search(query, viewer)
  S->>S: AccessPolicy.visibilityFilter(viewer) → VisibilityScope
  par contadores das 5 abas
    S->>OS: count ws-projects (q + scope)
    S->>OS: count ws-tasks (q + scope + accessClass != SIGILOSO, RESTRITO só do meu departamento)
    S->>OS: count ws-people
    S->>OS: count ws-orgs (empresas)
    S->>OS: count ws-orgs (chefes)
  end
  alt OpenSearch indisponível ou flag desligada
    S-->>C: 503 BUSCA_INDISPONIVEL
    C-->>N: 503 (ErrorState "tentar de novo")
  else ok
    S->>OS: search ws-projects (título, objetivo, tags, OCR) + scope + filtros, page 0, size 20
    OS-->>S: hits ordenados por relevância (≤ 1 s p95)
    S-->>C: SearchResultView {counters por aba, page}
    C-->>N: 200 (URL com q, tab, filtros, page)
    N-->>U: 5 Tabs com contadores + ProjectCards
  end

  U->>N: abre um projeto de outro departamento
  N->>C: GET /api/projects/{id}
  C->>S: SchemeReadService.project(id, viewer)
  S->>R: project_schemes + project_tasks + seal_bonds + owner
  alt visibilidade mudou para PRIVADA depois de indexado
    S-->>C: 404 PROJETO_NAO_ENCONTRADO
    C-->>N: 404 (item sai do índice no próximo INDEXAR_BUSCA)
  else pode ver
    S->>S: creditOf(owner) → avatar + link /u/{username} ou /departments/{slug} ou /companies/{slug}
    S-->>C: ProjectReadView {readOnly=true, credit, actions: interações + Levar ao meu acervo}
    C-->>N: 200 (modo leitura, edição oculta)
  end
  N->>C: PATCH /api/projects/{id} (tentativa de edição)
  C-->>N: 403 ACESSO_NEGADO

  U->>N: "projetos parecidos com este"
  N->>C: GET /api/projects/{id}/similar
  C->>S: SimilarProjectsService.similar(id, viewer)
  S->>AI: run(MEMORIA_BUSCA, hostRf RF17, texto do projeto mascarado)
  alt IA disponível
    AI->>R: insert ai_inference_log
    AI-->>S: embedding
    S->>OS: knn ws-memory (k=10, scope do viewer)
    OS-->>S: vizinhos com score
    S-->>C: até 10 projetos com score e motivo ("mesmo processo, 4 tarefas em comum")
  else IA indisponível (circuit aberto / cota)
    S->>OS: search ws-projects mesmo processo/departamento
    S-->>C: lista textual com aviso "sem IA"
  end
  C-->>N: 200

  Note over R,OS: Indexação assíncrona (CA06)
  EV->>R: ProjectPublished / VisibilityChanged / Archived → enqueue PipelineJob INDEXAR_BUSCA
  R->>OS: index ou delete (≤ 60 s) — falha → attempts++ e REPROCESSAR

  Note over U,R: Real (17/10/2026) — leitura de tarefa de terceiro
  U->>N: abre /tasks/{id} de outra pessoa
  N->>C: GET /api/tasks/{id}
  C->>S: TaskService.get e ResourceAuthorizer.require(viewer, tarefa, VIEW)
  S->>R: tasks.findById
  S->>S: AccessPolicy.decide (SIGILOSO sem vínculo explícito = NOT_FOUND, inclusive ADMIN, D-139)
  alt NOT_FOUND (invisível ou inexistente)
    S-->>C: 404 NAO_ENCONTRADO (mesma mensagem de id inexistente)
    C-->>N: 404 e TaskDetail.tsx mostra 404 NAO_ENCONTRADO (D-141)
  else ALLOW
    S-->>C: TaskView
    C-->>N: 200 (modo leitura)
  end
```

## 4. Máquina de estados

Entidade central: este RF só lê `TaskItem`/`ProjectScheme`; o que tem ciclo próprio aqui é a **presença no índice** (derivada de `state`/`status`, `visibility`, `accessClass` e do `PipelineJob INDEXAR_BUSCA`, CA03/CA06). As máquinas de `TaskState` e `ProjectStatus` estão em RF4/RF5 §4.

```mermaid
stateDiagram-v2
  direction LR
  state "NAO_INDEXADO (RASCUNHO · SIGILOSO · PRIVADA de terceiro)" as NAO
  state "INDEXACAO_PENDENTE (PipelineJob INDEXAR_BUSCA PENDENTE/RODANDO)" as PEN
  state "INDEXADO (visível conforme scope)" as IDX
  state "REMOCAO_PENDENTE" as REMP
  state "REPROCESSAR (falha, attempts++)" as REP

  [*] --> NAO : criação (RF4/RF5) em RASCUNHO
  NAO --> PEN : publicar / DISPONIVEL / visibility ≥ DEPARTAMENTO [accessClass != SIGILOSO] (CA06)
  PEN --> IDX : index OK (≤ 60 s) · documento com visibility, companyId, departmentId, accessClass
  PEN --> REP : erro no OpenSearch
  REP --> PEN : nova tentativa agendada
  REP --> [*] : attempts esgotados (lastError, operação do autor não afetada)
  IDX --> PEN : título/tags/visibility alterados (RF12) → reindexa
  IDX --> REMP : visibility → PRIVADA · ARQUIVADA/ARQUIVADO · accessClass → SIGILOSO
  REMP --> NAO : delete OK (quem abrir o link antigo recebe 404)
  REMP --> REP : erro
  note left of NAO
    Real (D-139): SIGILOSO também fica fora da leitura
    do ADMIN sem vínculo explícito (AccessPolicy.sigiloso).
  end note
  note right of IDX
    A query sempre aplica VisibilityScope do viewer:
    PUBLICA · +EMPRESA · +DEPARTAMENTO · PRIVADA só os meus ·
    RESTRITO só para o departamento dono (CA03).
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FE["Frontend · Next.js 15 App Router"]
    PG["app/(shell)/search · ?q=&tab=&filtros&page= · páginas de leitura tasks/[id] e projects/[id] (readOnly) · components/social/TaskDetail.tsx 404 NAO_ENCONTRADO (real, D-141) · lib/social/view-model.ts sem vazar oculto (b602d34)"]
    UI["packages/ui: Input (busca), Tabs (com contadores), TaskCard, ProjectCard, Avatar/Monogram, Seal, Counters, Skeleton, EmptyState, ErrorState (tentar de novo), Button (Levar ao meu acervo)"]
    SN["TopBar (busca global → /search) · SidebarNav › Descobrir › Buscar"]
    BFF["app/bff/search/* · app/bff/tasks/* · app/bff/projects/*"]
    PG --> UI
    PG --> BFF
    SN --> PG
  end
  subgraph WSWEB["ws-web"]
    SEC["SecurityConfig · SessionActiveFilter · CurrentUserArgumentResolver"]
    SC["SearchController · ReadOnlySchemeController"]
    TC["TaskController GET /api/tasks/{id} (real) · PeopleController GET /api/people/{id}/tasks (em curso, Onda 1)"]
    GEH["GlobalExceptionHandler (403, 404, 503)"]
  end
  subgraph WSAPP["ws-application"]
    SRCH["search: SearchService · SimilarProjectsService · SearchIndexer"]
    RD["acervo/projects: SchemeReadService"]
    AIE["ai: AiEngine MEMORIA_BUSCA (embeddings) · circuit breaker"]
    SECU["security: AccessPolicy.visibilityFilter/canView (planejado) · AccessPolicy.visible/decide/sigiloso em ws-domain (real, D-139) · ResourceAuthorizer.require (real)"]
    TS["acervo: TaskService.get (real) · TaskService.listOf (real, em curso, Onda 1)"]
    TS --> SECU
    PORTS["ports: SearchIndexPort · PipelineJobPort · TaskRepositoryPort · ProjectRepositoryPort · UserRepositoryPort · CounterCachePort"]
    EVT["events: TaskPublished · ProjectPublished · VisibilityChanged · Archived (AFTER_COMMIT) → SearchIndexer"]
    SRCH --> SECU
    SRCH --> AIE
    SRCH --> PORTS
    RD --> SECU
    RD --> PORTS
    EVT --> SRCH
  end
  subgraph WSDOM["ws-domain"]
    DOM["acervo: TaskItem · TaskAttachment (OCR) · projects: ProjectScheme · identity: User · Company · Department · platform: PipelineJob · AiInferenceLog · memory: InstitutionalMemoryDocument"]
  end
  subgraph INFRA["ws-infrastructure"]
    OSE["search-opensearch (OpenSearchAdaptersConfig, flag opensearch.enabled): índices ws-tasks · ws-projects · ws-people · ws-orgs · ws-memory (dense_vector) · fallback MySQL LIKE sem a flag"]
    MY["persistence-mysql: Jpa*Repository · pipeline_jobs"]
    RDS["cache-redis: sugestões, contadores"]
    AIP["ai-providers: Claude → Gemini → LocalEngine (embeddings locais)"]
    PLT["platform: worker INDEXAR_BUSCA"]
  end

  BFF -->|"REST JSON"| SEC --> SC --> SRCH
  SC --> RD
  SC --> GEH
  SEC --> TC --> TS
  TC --> GEH
  OSE -.implementa SearchIndexPort.-> PORTS
  MY -.implementa.-> PORTS
  RDS -.implementa.-> PORTS
  AIP -.implementa.-> AIE
  PLT --> SRCH
  SRCH --> DOM
  OSE --> OSX[("OpenSearch 2.19")]
  MY --> DB[("MySQL 8.4")]
  RDS --> RDX[("Redis 7")]
  AIP --> CL["Claude · Gemini"]
```

## 6. Rastreabilidade

| CA | Classe (§1) | Passo da atividade (§2) | Mensagem da sequência (§3) | Transição de estado (§4) | Componente (§5) | Situação |
|---|---|---|---|---|---|---|
| RF17.CA01 | `SearchController.search/suggestions`, `SearchService.search/countersPerTab`, `SearchQuery`, `SearchTab`, `SearchIndexPort.search/count` | `A1`→`F1`/`F2`→`S2`→`S3`→`S4`→`F3` | 1–10, 14–18 | — | `PG`, `UI` (`Tabs`), `SRCH`, `OSE`, `RDS` | planejado (`OpenSearchAdaptersConfig` real) |
| RF17.CA02 | URL `?q=&tab=&filtros&page=`, `Skeleton`/`EmptyState`/`ErrorState`, `503 BUSCA_INDISPONIVEL` | `A2`→`F2`→`F3`, `E503` | 11–13 | — | `UI`, `GEH`, `OSE` (flag) | planejado |
| RF17.CA03 | `AccessPolicy.visibilityFilter`, `VisibilityScope`, `SearchIndexer` (SIGILOSO nunca, RESTRITO por departamento, RASCUNHO nunca) | `S1`→`S2`, `RT1` | 4–9, 46 | nota de `IDX`, `NAO` (nota D-139) | `SECU`, `OSE`, `TS` | planejado (busca); **real**: `AccessPolicy.visible/decide/sigiloso` (classe `AccessPolicy`, D-139, `AccessPolicyMatrixTest`) |
| RF17.CA04 | `ReadOnlySchemeController`, `SchemeReadService.task/project/creditOf`, `AccessPolicy.canView` | `A3`→`F4`→`R1`→`R2`, `E403`, `E404`, `F4`→`RT1`→`E404U` | 19–29, 42–50 | `IDX`→`REMP`→`NAO` | `RD`, `UI` (`ProjectCard`, `Seal`, `Counters`), `TC`, `TS`, `PG` | planejado (RF7, RF16, RF18/RF19); **real**: `TaskController.get` → `TaskService.get` → `ResourceAuthorizer.require` (`404 NAO_ENCONTRADO` uniforme), `components/social/TaskDetail.tsx` (D-141), composição de projeto sem vazamento (`lib/social/view-model.ts`, `b602d34`) |
| RF17.CA05 | `SimilarProjectsService.similar/fallbackTextual`, `AiEngine` (MEMORIA_BUSCA), `SearchIndexPort.knn`, `InstitutionalMemoryDocument`, `AiInferenceLog` | `A4`→`F5`→`SIM1`→`SIM2`→`SIM3`/`SIM4` | 30–42 | — | `AIE`, `AIP`, `OSE` (`ws-memory`) | planejado (RF33) |
| RF17.CA06 | `SearchIndexer.onPublished/onVisibilityChanged/onArchived/run`, `PipelineJob INDEXAR_BUSCA`, `PipelineJobPort` | `IDX` | 43–44 | `NAO`→`PEN`→`IDX`, `IDX`→`REMP`, `REP` | `EVT`, `PLT`, `MY` | planejado |
