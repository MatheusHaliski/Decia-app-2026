# RF21 — Compor um Esquema de Projeto no Criador de Projetos, escolhendo em cada fase (select) as unidades de tarefa do meu Acervo, em modo manual ou com IA
**HU:** HU21 · **Sprint (board Work Station):** 4 · **Equivalente FAI:** RF5 Criar esquema (aba "Criar Look": slots por tipo com uma peça de cada, selects alimentados pelo Closet, modo Manual / Com IA, título, ocasião, estilo, orientação livre, foto opcional, capa = composição das peças, selos vindos das peças, pré-visualização do card, cadastrar nova peça inline, mínimo de 2 peças) · **Aba/rota:** Criar Projeto (`/projects/new`)
**Critérios de aceite cobertos:** RF21.CA01 · CA02 · CA03 · CA04 · CA05 · CA06 · CA07 · CA08 · CA09 · CA10 · CA11 · CA12 · CA13 · CA14

O **Esquema de Projeto** (`ProjectScheme`, = look) é a composição ordenada de tarefas (`TaskItem`, = peças) em **7 fases** (`ProjectPhase`: DEMANDA · PLANEJAMENTO · ELABORAÇÃO · ANÁLISE · APROVAÇÃO · EXECUÇÃO · ENCERRAMENTO). Cada fase tem um **select múltiplo pesquisável** cujo conteúdo são as tarefas do Acervo do usuário (RF41) **compatíveis com a fase** (mapa `PHASE_BY_CATEGORY`, equivalente ao `SLOT_BY_CATEGORY` do FAI). Cada tarefa selecionada vira um `ProjectTask` (fase, ordem, responsável, prazo) e as dependências viram `ProjectTaskDependency` (sem ciclos). O compositor funciona em modo **Manual** ou **Com IA** (AiEngine `COMPOR_PROJETO` devolve 3 propostas usando só tarefas do Acervo), aceita "Criar a partir de modelo" (Kit / modelo chancelado, com `Remix` e crédito) e mantém **autosave** do rascunho em `ProjectScheme.autosaveDraftJson`.

| Categoria (`TaskCategory`) | Fase(s) compatível(is) — `PHASE_BY_CATEGORY` |
|---|---|
| OFICIO_MEMORANDO, PROTOCOLO (tipo) | DEMANDA |
| ETP, TERMO_REFERENCIA, CRONOGRAMA | PLANEJAMENTO |
| PROJETO_BASICO_EXECUTIVO, PLANILHA_ORCAMENTARIA, PARECER_TECNICO, MAPA_GEORREFERENCIA | ELABORAÇÃO · ANÁLISE |
| ATA, PORTARIA_RESOLUCAO, LICENCA_ANUENCIA | APROVAÇÃO |
| CONTRATO_CONVENIO, VISTORIA_RELATORIO_FOTOGRAFICO | EXECUÇÃO |
| Relatório final (DOCUMENTO em ENCERRAMENTO) | ENCERRAMENTO |
| OUTRO, FORMULARIO | qualquer fase |

## 1. Diagrama de classes

```mermaid
classDiagram
direction LR

namespace wai_domain_projetos {
  class ProjectScheme {
    <<entity>>
    +id: UUID
    +ownerId: UUID
    +companyId: UUID
    +departmentId: UUID
    +title: String
    +emoji: String
    +iconId: String
    +objective: String 1 frase
    +descriptionMd: String
    +processTags: Set~ProcessTag~ max 2
    +natureTags: Set~NatureTag~ max 2
    +creationMode: CreationMode
    +origin: SchemeOrigin
    +originalProjectId: UUID
    +sourceSessionId: UUID
    +aiOrientation: String
    +status: ProjectStatus
    +currentPhase: ProjectPhase
    +priority: Priority
    +visibility: Visibility herdada do perfil
    +exerciseYear: int
    +programGroupingId: UUID
    +planAxisId: UUID
    +coverMode: CoverMode
    +coverUrl: String
    +mosaicJson: JSON
    +criticalPathJson: JSON
    +nextMilestoneAt: LocalDate
    +aiGenerated: boolean
    +aiInferenceId: UUID
    +sealIdsJson: JSON
    +autosaveDraftJson: JSON
    +version: long
    .. +12 campos ..
  }
  class ProjectTask {
    <<entity>>
    +id: UUID
    +projectId: UUID
    +taskId: UUID
    +phase: ProjectPhase
    +sortOrder: int
    +responsibleId: UUID padrão dono da tarefa
    +dueAt: LocalDate padrão prazo da tarefa
    +startAt: LocalDate
    +estimatedHours: BigDecimal
    +pertOptimistic: BigDecimal
    +pertMostLikely: BigDecimal
    +pertPessimistic: BigDecimal
    +isCritical: boolean
    +slackDays: int
    +moscow: String MUST SHOULD COULD WONT
    +snapshotJson: JSON
  }
  class ProjectTaskDependency {
    <<entity>>
    +id: UUID
    +projectId: UUID
    +predecessorProjectTaskId: UUID
    +successorProjectTaskId: UUID
    +type: DependencyType
    +lagDays: int
  }
  class ProcessKit {
    <<entity>>
    +id: UUID
    +ownerId: UUID
    +name: String
    +processTag: ProcessTag
    +sealIdsJson: JSON
    +remixCount: int
  }
  class KitItem {
    <<entity>>
    +id: UUID
    +kitId: UUID
    +taskId: UUID
    +phase: ProjectPhase
    +sortOrder: int
    +optional: boolean
  }
}

namespace wai_domain_acervo {
  class TaskItem {
    <<entity>>
    +id: UUID
    +ownerId: UUID
    +title: String
    +type: TaskType
    +category: TaskCategory
    +state: TaskState
    +visibility: Visibility
    +dueAt: LocalDate
    +thumbnailUrl: String
    +sealIdsJson: JSON
    +originalTaskId: UUID
    +blockReason: String
    +projectUsageCount: int
    .. +45 campos ..
  }
  class TaskStateLog {
    <<entity>>
    +id: UUID
    +taskId: UUID
    +fromState: TaskState
    +toState: TaskState
    +actorId: UUID
    +reason: String
    +projectId: UUID
    +correlationId: String
    +at: Instant
  }
}

namespace wai_domain_outros {
  class SealBond {
    <<entity>>
    +id: UUID
    +sealId: UUID
    +targetType: String TASK ou PROJECT
    +targetId: UUID
    +basis: SealBondBasis
    +status: SealBondStatus
    +confidence: BigDecimal
  }
  class PlanAxis {
    <<entity>>
    +id: UUID
    +planId: UUID
    +position: int 1 a 6
    +name: String
  }
  class Grouping {
    <<entity>>
    +id: UUID
    +type: GroupingType PROGRAMA
    +label: String
  }
  class Remix {
    <<entity>>
    +id: UUID
    +actorId: UUID
    +sourceType: String
    +sourceId: UUID
    +resultType: String
    +resultId: UUID
    +modelOfferId: UUID
  }
  class MuralEntry {
    <<entity>>
    +id: UUID
    +kind: String PROJETO_PUBLICADO
    +targetType: TargetType PROJECT
    +targetId: UUID
  }
  class DeciaSession {
    <<entity>>
    +id: UUID
    +topic: String = objective
    +linkedProjectId: UUID
    +status: SessionStatus
  }
  class AiInferenceLog {
    <<entity>>
    +id: UUID
    +capability: AiCapability COMPOR_PROJETO
    +result: String
  }
}

namespace wai_domain_enums {
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
  class CreationMode {
    <<enum>>
    MANUAL
    COM_IA
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
  class DependencyType {
    <<enum>>
    FS
    SS
    FF
    SF
  }
  class TaskState {
    <<enum>>
    RASCUNHO
    DISPONIVEL
    EM_USO
    BLOQUEADA
    CONCLUIDA
    ARQUIVADA
    MODELO_PUBLICO
    OFERECIDA
  }
}

namespace wai_application {
  class ProjectComposerService {
    <<service>>
    +openComposer(userId) ComposerState
    +autosave(userId, draftId, DraftJson) ProjectScheme
    +listPhaseOptions(userId, phase, query) List~TaskOption~
    +compose(userId, ProjectForm) ProjectScheme
    +composeWithAi(userId, processTags, natureTags, orientation) List~Proposal~
    +fromModel(userId, modelId ou kitId) ComposerState
    +validateMinimum(selections) 422 FASES_MINIMAS
    +validateDependencies(deps, dueDates) 422 DEPENDENCIA_CICLICA ou PRAZO_ANTERIOR_PREDECESSORA
    +criticalPath(tasks, deps) List~UUID~
    +publish(projectId) ProjectScheme
    +openDeciaSession(projectId) DeciaSession
  }
  class AcervoService {
    <<service>>
    +countAvailable(userId) int
    +listCompatible(userId, phase, filters) List~TaskItem~
    +markInUse(taskIds, projectId, correlationId)
  }
  class TaskCreatorService {
    <<service>>
    +save(userId, TaskForm) TaskItem
  }
  class SealService {
    <<service>>
    +inheritFromTasks(taskIds) List~SealBond~
    +suggestForProject(projectId, issuerIds) List~SealBond~
  }
  class MuralService {
    <<service>>
    +publishProject(projectId) MuralEntry
  }
  class DeciaSessionService {
    <<service>>
    +openFromProject(projectId) DeciaSession
  }
  class AiEngine {
    <<service>>
    +infer(capability, input, mode) AiResult
  }
  class MediaStoragePort {
    <<port>>
    +put(stream) MediaObject
    +studio(mediaId, ops) MediaObject
  }
  class SearchIndexPort {
    <<port>>
    +indexProject(ProjectScheme)
  }
}

namespace wai_web {
  class ProjectController {
    <<controller>>
    +GET_api_projects_composer()
    +PUT_api_projects_drafts_id(DraftJson)
    +GET_api_acervo_tasks(phase, q, filters)
    +POST_api_projects_ai_compose(body)
    +POST_api_projects(ProjectForm)
    +POST_api_projects_from_model(modelId)
    +POST_api_projects_id_publish()
    +POST_api_projects_id_decia_session()
  }
}

namespace wai_infrastructure {
  class ClaudeGeminiAdapter {
    <<adapter>>
  }
  class S3StorageAdapter {
    <<adapter>>
  }
  class OpenSearchIndexAdapter {
    <<adapter>>
  }
}

ProjectScheme "1" --> "*" ProjectTask : tarefas por fase
ProjectScheme "1" --> "*" ProjectTaskDependency : grafo sem ciclos
ProjectScheme "*" --> "0..1" PlanAxis : planAxisId
ProjectScheme "*" --> "0..1" Grouping : programGroupingId
ProjectScheme "*" --> "0..1" ProjectScheme : originalProjectId remix ou modelo
ProjectScheme "1" --> "*" SealBond : targetId quando PROJECT
ProjectScheme "1" --> "0..1" MuralEntry : publicação
ProjectScheme "1" --> "0..1" DeciaSession : linkedProjectId
ProjectScheme "*" --> "0..1" AiInferenceLog : aiInferenceId
ProjectTask "*" --> "0..1" TaskItem : taskId
ProjectTaskDependency "*" --> "1" ProjectTask : predecessor
ProjectTaskDependency "*" --> "1" ProjectTask : successor
ProjectTaskDependency --> DependencyType
ProcessKit "1" --> "*" KitItem
KitItem "*" --> "1" TaskItem
TaskItem "1" --> "*" TaskStateLog : DISPONIVEL para EM_USO
TaskItem "1" --> "*" SealBond : chancela vem da tarefa
Remix "*" --> "1" ProjectScheme : resultId
ProjectScheme --> ProjectStatus
ProjectScheme --> ProjectPhase : currentPhase
ProjectScheme --> CreationMode
ProjectScheme --> SchemeOrigin
ProjectTask --> ProjectPhase
TaskItem --> TaskState

ProjectController ..> ProjectComposerService
ProjectController ..> AcervoService
ProjectController ..> TaskCreatorService : modal Cadastrar nova tarefa
ProjectComposerService ..> AcervoService
ProjectComposerService ..> SealService
ProjectComposerService ..> MuralService
ProjectComposerService ..> DeciaSessionService
ProjectComposerService ..> AiEngine : COMPOR_PROJETO 3 propostas
ProjectComposerService ..> MediaStoragePort : foto do projeto
ProjectComposerService ..> SearchIndexPort
ClaudeGeminiAdapter ..> AiEngine
S3StorageAdapter ..|> MediaStoragePort
OpenSearchIndexAdapter ..|> SearchIndexPort

note for ProjectScheme "tabela project_schemes · mínimo 1 tarefa em DEMANDA + 1 em outra fase (CA04, CA05) · autosaveDraftJson sem ProjectTask persistido não gera EM_USO (CA14)"
note for ProjectTask "tabela project_tasks · responsibleId padrão = dono da tarefa, dueAt padrão = prazo da tarefa (CA04)"
note for ProjectTaskDependency "tabela project_task_dependencies · ciclo ou prazo anterior à predecessora = 422 (CA08)"
note for AcervoService "listCompatible filtra por PHASE_BY_CATEGORY e devolve BLOQUEADA/ARQUIVADA desabilitadas com motivo (CA03)"
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph LU["Usuário"]
    U1["Abre /projects/new"]
    U2["Escolhe modo: Manual, Com IA ou Criar a partir de modelo"]
    U3["Abre o select de uma fase, pesquisa e seleciona tarefas; ou arrasta do Acervo"]
    U4["Cadastrar nova tarefa dentro do select"]
    U5["Define dependências A antes de B, prazos e responsáveis"]
    U6["Preenche ficha: título, emoji, objetivo, processo, natureza, departamento, exercício, programa, eixo, prioridade, orientação para a IA, foto"]
    U7["Salvar"]
    U8["Sai sem salvar"]
    U9["Publicar no Mural"]
    U10["Abrir sessão DECIA sobre este projeto"]
    U11["Escolhe 1 das 3 propostas e edita"]
  end

  subgraph LW["Web / BFF (Next.js App Router)"]
    W1["Compositor: Acervo filtrável à esquerda, 7 selects de fase ao centro, ficha à direita"]
    W2["Orientação: cadastre tarefas primeiro, atalho para /tasks/new"]
    W3["Modal RF20; ao salvar a tarefa volta já selecionada na fase"]
    W4["Autosave a cada alteração: PUT /api/projects/drafts/{id}"]
    W5["Pré-visualização do card: capa mosaico + barra de 7 fases + chancelas + caminho crítico"]
    W6["Campos destacados com 422"]
    W7["Recupera rascunho na próxima abertura"]
  end

  subgraph LA["wai-application"]
    A1["AcervoService.countAvailable"]
    A2{"≥ 2 tarefas DISPONIVEIS?"}
    A3["AcervoService.listCompatible: só meu Acervo + compartilhadas com permissão, PHASE_BY_CATEGORY, thumbnail, tipo, categoria, estado, prazo; BLOQUEADA/ARQUIVADA desabilitadas com motivo"]
    A4["ProjectComposerService.validateDependencies"]
    A5{"Ciclo?"}
    A6["422 DEPENDENCIA_CICLICA"]
    A7{"Prazo do sucessor anterior ao da predecessora?"}
    A8["422 PRAZO_ANTERIOR_PREDECESSORA"]
    A9["criticalPath CPM → criticalPathJson"]
    A10["SealService.inheritFromTasks: chancelas do projeto vêm das tarefas; sugere tier PROJETO do mesmo emissor"]
    A11["ProjectComposerService.compose → validateMinimum"]
    A12{"≥ 1 tarefa em DEMANDA e ≥ 1 em outra fase, título e ≥ 1 processo?"}
    A13["422 FASES_MINIMAS: indica o mínimo exigido"]
    A14{"Foto enviada?"}
    A15["Capa = mosaico das tarefas, coverMode MOSAICO"]
    A16["MediaStoragePort.studio endireitar/recortar, coverMode FOTO"]
    A17["Persiste ProjectScheme origin CRIAR_PROJETO ou AUTOPILOTO, ProjectTasks, dependências; visibilidade herdada do perfil"]
    A18["AcervoService.markInUse: tarefas DISPONIVEL → EM_USO + TaskStateLog com projectId"]
    A19["ProjectComposerService.fromModel: cópias/remixes das tarefas com Remix e crédito ao autor; cada uma trocável pelo equivalente do meu Acervo"]
    A20["ProjectComposerService.autosave → autosaveDraftJson; sem ProjectTask persistido, sem EM_USO"]
    A21["MuralService.publishProject → status PUBLICADO, MuralEntry, SearchIndexPort"]
    A22["DeciaSessionService.openFromProject: tema = objetivo, participantes = responsáveis + chefe, tarefas anexadas; projeto → EM_DECISAO"]
  end

  subgraph LI["IA (AiEngine)"]
    I1["COMPOR_PROJETO: 3 esquemas distintos só com tarefas do meu Acervo, respeitando orientação, materiais, prazos e departamento; fases, dependências e justificativa"]
  end

  subgraph LP["Persistência"]
    P1[("MySQL: tasks do Acervo")]
    P2[("MySQL: project_schemes autosaveDraftJson")]
    P3[("MySQL: project_schemes, project_tasks, project_task_dependencies, task_state_log, seal_bonds, remixes")]
    P4[("MySQL: ai_inference_log")]
    P5[("S3: foto do projeto tratada")]
    P6[("MySQL: mural_entries · OpenSearch: índice de projetos")]
    P7[("MySQL: decia_sessions, session_participants, message_attachments")]
  end

  U1 --> A1 --> P1
  A1 --> A2
  A2 -->|"não"| W2
  A2 -->|"sim"| W1 --> U2
  U2 -->|"Manual"| U3
  U2 -->|"Com IA"| I1
  U2 -->|"Modelo ou Kit"| A19 --> U3
  I1 --> P4
  I1 --> U11 --> U3
  U3 --> A3 --> P1
  A3 --> U5
  U3 --> U4 --> W3 --> U3
  U5 --> A4 --> A5
  A5 -->|"sim"| A6 --> W6
  A5 -->|"não"| A7
  A7 -->|"sim"| A8 --> W6
  A7 -->|"não"| A9 --> A10 --> W5
  W5 --> U6
  U3 --> W4 --> A20 --> P2
  U6 --> W4
  U6 --> U7 --> A11 --> A12
  A12 -->|"não"| A13 --> W6 --> U3
  A12 -->|"sim"| A14
  A14 -->|"não"| A15 --> A17
  A14 -->|"sim"| A16 --> P5 --> A17
  A17 --> P3
  A17 --> A18 --> P3
  A17 --> U9 --> A21 --> P6
  A17 --> U10 --> A22 --> P7
  U8 --> W4
  U8 -.-> W7

  classDef err fill:#ffe3e3,stroke:#c0392b,color:#5a1a12
  classDef warn fill:#fff4d6,stroke:#b7791f,color:#5a3b06
  class A6,A8,A13 err
  class W2 warn
```

## 3. Diagrama de sequência

```mermaid
sequenceDiagram
  autonumber
  actor U as Usuário
  participant NX as Next.js (App Router)
  participant C as Controller (wai-web)
  participant S as Service (wai-application)
  participant AI as AiEngine
  participant DB as Repository/MySQL
  participant OS as OpenSearch
  participant DE as DomainEvents (AFTER_COMMIT)

  U->>NX: abre /projects/new
  NX->>C: GET /api/projects/composer
  C->>S: ProjectComposerService.openComposer(userId)
  S->>DB: COUNT tasks WHERE ownerId AND state = DISPONIVEL
  alt menos de 2 tarefas DISPONIVEIS
    S-->>C: 200 {composerEnabled: false, hint: CADASTRE_TAREFAS, shortcut: /tasks/new}
    C-->>NX: 200
    NX-->>U: orientação com atalho para o RF20 (CA02)
  else 2 ou mais
    S->>DB: SELECT project_schemes WHERE ownerId AND autosaveDraftJson IS NOT NULL
    S-->>C: 200 {composerEnabled: true, draft recuperado ou vazio}
    C-->>NX: 200
    NX-->>U: Acervo à esquerda, 7 selects vazios ou com o rascunho, ficha à direita (CA01, CA14)
  end

  U->>NX: abre o select da fase PLANEJAMENTO e digita "ETP"
  NX->>C: GET /api/acervo/tasks?phase=PLANEJAMENTO&q=ETP
  C->>S: AcervoService.listCompatible(userId, PLANEJAMENTO, q)
  S->>DB: tasks WHERE ownerId OR sharedWith AND category IN PHASE_BY_CATEGORY[PLANEJAMENTO] AND title LIKE
  DB-->>S: lista com thumbnail, tipo, categoria, estado, prazo
  S-->>C: 200 opções — BLOQUEADA/ARQUIVADA com disabled = true e disabledReason (CA03)
  C-->>NX: 200

  U->>NX: Cadastrar nova tarefa dentro do select (CA07)
  NX->>C: POST /api/tasks (modal RF20)
  C->>S: TaskCreatorService.save(userId, form)
  S->>DB: INSERT tasks (state DISPONIVEL)
  S-->>C: 201 TaskItem
  C-->>NX: 201
  NX-->>U: tarefa já selecionada na fase PLANEJAMENTO

  loop a cada alteração no compositor
    NX->>C: PUT /api/projects/drafts/{draftId} {selections, deps, sheet}
    C->>S: ProjectComposerService.autosave
    S->>DB: UPSERT project_schemes SET autosaveDraftJson, status RASCUNHO (sem project_tasks, sem EM_USO)
    S-->>C: 204
  end

  opt modo Com IA (CA06)
    U->>NX: confirma processo LICITACAO, natureza TECNICA e orientação "pavimentação com FINISA, 90 dias"
    NX->>C: POST /api/projects/ai-compose {processTags, natureTags, orientation}
    C->>S: ProjectComposerService.composeWithAi
    S->>DB: tasks DISPONIVEIS do Acervo do usuário
    S->>AI: infer(COMPOR_PROJETO, {acervo, orientação, departamento}, mode)
    AI-->>S: 3 propostas {fases preenchidas, dependências, justificativa}
    S->>DB: INSERT ai_inference_log (capability COMPOR_PROJETO)
    S-->>C: 200 propostas
    C-->>NX: 200
    NX-->>U: escolhe 1 e edita (origem AUTOPILOTO se integralmente da IA)
  end

  U->>NX: define A antes de B e prazo de B anterior ao de A
  NX->>C: POST /api/projects/validate-dependencies {deps, dueDates}
  C->>S: ProjectComposerService.validateDependencies
  alt ciclo ou prazo inválido (CA08)
    S-->>C: 422 DEPENDENCIA_CICLICA ou 422 PRAZO_ANTERIOR_PREDECESSORA {details, correlationId}
    C-->>NX: 422
    NX-->>U: aresta destacada com o motivo
  else válido
    S->>S: criticalPath CPM
    S-->>C: 200 {criticalPath: [ids]}
    C-->>NX: 200
    NX-->>U: caminho crítico na pré-visualização e chancelas das tarefas em "Chancelas do projeto" (CA09)
  end

  U->>NX: Salvar
  NX->>C: POST /api/projects {ProjectForm}
  C->>S: ProjectComposerService.compose(userId, form)
  S->>S: validateMinimum: 1 em DEMANDA + 1 em outra fase, título, ≥1 processo
  alt sem tarefa ou só DEMANDA (CA05)
    S-->>C: 422 FASES_MINIMAS {details: [{field: phases, code: MINIMO_DEMANDA_MAIS_UMA}]}
    C-->>NX: 422
    NX-->>U: indica o mínimo exigido
  else válido (CA04)
    S->>DB: UPDATE project_schemes SET title, objective, origin CRIAR_PROJETO, creationMode, visibility herdada do perfil, autosaveDraftJson NULL
    S->>DB: INSERT project_tasks (phase, sortOrder, responsibleId = dono da tarefa, dueAt = prazo da tarefa)
    S->>DB: INSERT project_task_dependencies
    S->>DB: UPDATE tasks SET state EM_USO WHERE id IN selecionadas
    S->>DB: INSERT task_state_log (DISPONIVEL → EM_USO, projectId, correlationId)
    S->>DB: UPDATE project_schemes SET coverMode MOSAICO, mosaicJson (sem foto, CA10)
    S->>DE: publish ProjectCreated
    S-->>C: 201 ProjectScheme
    C-->>NX: 201
    NX-->>U: card do projeto com capa mosaico e barra de fases
  end
  DE->>S: SealService.suggestForProject (chancela tier PROJETO do mesmo emissor, CA09)
  DE->>AI: infer(SUGERIR_CHANCELA, {projeto, chancelas das tarefas})

  U->>NX: Publicar no Mural (CA11)
  NX->>C: POST /api/projects/{id}/publish
  C->>S: ProjectComposerService.publish
  S->>DB: UPDATE project_schemes SET status PUBLICADO
  S->>DB: INSERT mural_entries (kind PROJETO_PUBLICADO)
  S->>OS: indexProject respeitando visibility
  S-->>C: 200
  C-->>NX: 200

  U->>NX: Abrir sessão DECIA sobre este projeto (CA12)
  NX->>C: POST /api/projects/{id}/decia-session
  C->>S: DeciaSessionService.openFromProject
  S->>DB: INSERT decia_sessions (topic = objective, linkedProjectId)
  S->>DB: INSERT session_participants (responsáveis + chefe do departamento)
  S->>DB: INSERT message_attachments (tarefas do projeto)
  S->>DB: UPDATE project_schemes SET status EM_DECISAO
  S-->>C: 201 DeciaSession
  C-->>NX: 201
  NX-->>U: redireciona para a sessão (RF29)
```

## 4. Máquina de estados

Entidade central: **`ProjectScheme.status`** (enum `ProjectStatus`). O RF21 cobre o nascimento do esquema: rascunho de autosave (RASCUNHO com `autosaveDraftJson` e **sem** `ProjectTask`), esquema salvo (RASCUNHO com `ProjectTask`s e tarefas EM_USO), publicação (PUBLICADO, CA11) e abertura de sessão (EM_DECISAO, CA12). Os demais estados pertencem ao RF22/RF29 e aparecem para contexto.

```mermaid
stateDiagram-v2
  state "RASCUNHO — autosave" as RASC_AUTO
  state "RASCUNHO — salvo" as RASC_SALVO
  [*] --> RASC_AUTO : primeira alteração no compositor, PUT drafts
  RASC_AUTO --> RASC_AUTO : autosave a cada alteração
  RASC_AUTO --> [*] : descartar rascunho
  RASC_AUTO --> RASC_SALVO : POST projects válido, ProjectTasks persistidos, tarefas EM_USO
  RASC_SALVO --> RASC_SALVO : editar no RF22, nova ProjectVersion
  RASC_SALVO --> PUBLICADO : publicar no Mural, MuralEntry, índice OpenSearch
  RASC_SALVO --> EM_DECISAO : abrir sessão DECIA sobre este projeto
  PUBLICADO --> EM_DECISAO : abrir sessão DECIA
  EM_DECISAO --> APROVADO : FinalDecision VALIDADA pelo chefe, RF15 RF29
  EM_DECISAO --> DEVOLVIDO : FinalDecision DEVOLVIDA com motivo
  DEVOLVIDO --> EM_DECISAO : sessão reaberta, RF14
  DEVOLVIDO --> RASC_SALVO : ajustar o esquema
  APROVADO --> EM_EXECUCAO : primeira ProjectTask em EXECUCAO iniciada
  EM_EXECUCAO --> CONCLUIDO : todas as ProjectTasks concluídas
  CONCLUIDO --> ARQUIVADO : arquivar
  PUBLICADO --> ARQUIVADO : arquivar
  ARQUIVADO --> [*]
  note right of RASC_AUTO
    autosaveDraftJson preenchido, nenhum ProjectTask.
    Não gera EM_USO nas tarefas (CA14).
    Recuperado na próxima abertura do compositor.
  end note
  note right of RASC_SALVO
    Exige 1 tarefa em DEMANDA + 1 em outra fase (CA04, CA05).
    origin CRIAR_PROJETO ou AUTOPILOTO quando veio integralmente da IA (CA06).
    Tarefas selecionadas passam a EM_USO com TaskStateLog (RF41).
  end note
  note left of EM_DECISAO
    Sessão nasce com tema = objetivo,
    participantes = responsáveis + chefe,
    tarefas anexadas (CA12, RF29).
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FE["Frontend Next.js"]
    F1["app/projects/new — compositor 3 colunas"]
    F2["components/ui: AcervoPanel com filtros e busca, PhaseSelect x7 multi pesquisável, DragDropTask, DependencyEditor, ProjectSheet, AiComposePanel 3 propostas, ModelPicker Kit/modelo, CardPreview mosaico + barra de fases + chancelas, CriticalPathPreview"]
    F3["Modal TaskCreator RF20 devolve a tarefa selecionada"]
    F4["Autosave hook: debounce + PUT drafts"]
  end

  subgraph WEB["wai-web"]
    C1["ProjectController — /api/projects, /composer, /drafts, /ai-compose, /from-model, /validate-dependencies, /publish, /decia-session"]
    C2["AcervoController — /api/acervo/tasks?phase=&q="]
    C3["TaskController RF20 — /api/tasks"]
  end

  subgraph APP["wai-application"]
    S1["ProjectComposerService"]
    S2["AcervoService RF41"]
    S3["TaskCreatorService RF20"]
    S4["SealService RF39"]
    S5["MuralService RF27"]
    S6["DeciaSessionService RF29"]
    S7["AiEngine"]
    P1["MediaStoragePort"]
    P2["SearchIndexPort"]
  end

  subgraph DOM["wai-domain"]
    D1["ProjectScheme · ProjectTask · ProjectTaskDependency · ProcessKit · KitItem"]
    D2["TaskItem · TaskStateLog · SealBond · Remix · PlanAxis · Grouping"]
    D3["MuralEntry · DeciaSession · AiInferenceLog · DomainEventOutbox"]
    D4["PHASE_BY_CATEGORY · CPM caminho crítico · validação de ciclos"]
  end

  subgraph INFRA["wai-infrastructure/*"]
    I1[("persistence-mysql: project_schemes, project_tasks, project_task_dependencies, tasks, task_state_log, seal_bonds, remixes, mural_entries, decia_sessions, ai_inference_log")]
    I2[("storage-s3: foto do projeto, capa tratada no Estúdio")]
    I3[("search-opensearch: índice de projetos ao publicar")]
    I4["ai-providers: ClaudeGeminiAdapter — COMPOR_PROJETO, SUGERIR_CHANCELA, CAPA_IA"]
    I5["platform: outbox AFTER_COMMIT, PipelineJob"]
  end

  subgraph EXT["Serviços externos"]
    E1(("Claude / Gemini"))
  end

  F1 --- F2
  F1 --- F3
  F1 --- F4
  F1 -->|"HTTPS/JSON"| C1
  F2 -->|"HTTPS/JSON"| C2
  F3 -->|"HTTPS/JSON"| C3
  C1 --> S1
  C2 --> S2
  C3 --> S3
  S1 --> S2
  S1 --> S4
  S1 --> S5
  S1 --> S6
  S1 --> S7
  S1 --> P1
  S1 --> P2
  S4 --> S7
  S1 --> D1
  S1 --> D4
  S2 --> D2
  S5 --> D3
  S6 --> D3
  D1 --> I1
  D2 --> I1
  D3 --> I1
  D3 --> I5
  P1 --> I2
  P2 --> I3
  S7 --> I4
  I4 -.-> E1
```

## 6. Rastreabilidade

| CA | Elemento do diagrama (classe / passo / mensagem / transição / componente) |
|---|---|
| RF21.CA01 | `ProjectComposerService.openComposer`, `AcervoService.countAvailable` · Atividades `U1 → A1 → A2 (sim) → W1` · Sequência `GET /api/projects/composer` → `else 2 ou mais` → "Acervo à esquerda, 7 selects vazios, ficha à direita" · Componentes `AcervoPanel`, `PhaseSelect x7`, `ProjectSheet` |
| RF21.CA02 | Atividades `A2 (não) → W2` (orientação + atalho /tasks/new) · Sequência `alt menos de 2 tarefas DISPONIVEIS` → `{composerEnabled: false, hint: CADASTRE_TAREFAS}` |
| RF21.CA03 | `AcervoService.listCompatible` (nota PHASE_BY_CATEGORY, desabilitadas com motivo), tabela `PHASE_BY_CATEGORY` do cabeçalho, enum `TaskState` · Atividades `U3 → A3 → P1` · Sequência `GET /api/acervo/tasks?phase=PLANEJAMENTO&q=ETP` → "BLOQUEADA/ARQUIVADA com disabled e disabledReason" · Componentes `AcervoController`, `PhaseSelect` |
| RF21.CA04 | Classes `ProjectScheme` (origin CRIAR_PROJETO, visibility herdada), `ProjectTask` (nota responsibleId/dueAt padrão), `TaskStateLog`, `AcervoService.markInUse` · Atividades `U7 → A11 → A12 (sim) → A17 → A18 → P3` · Sequência `else válido (CA04)`: UPDATE project_schemes, INSERT project_tasks, UPDATE tasks EM_USO, INSERT task_state_log · Transição `RASC_AUTO → RASC_SALVO` e nota |
| RF21.CA05 | `ProjectComposerService.validateMinimum` · Atividades `A12 (não) → A13 422 FASES_MINIMAS → W6` · Sequência `alt sem tarefa ou só DEMANDA` → `422 FASES_MINIMAS` · Nota do estado RASC_SALVO |
| RF21.CA06 | `ProjectComposerService.composeWithAi`, `AiEngine` (COMPOR_PROJETO), `AiInferenceLog`, enums `CreationMode.COM_IA`, `SchemeOrigin.AUTOPILOTO` · Atividades `U2 (Com IA) → I1 → P4 → U11` · Sequência `opt modo Com IA`: `POST /api/projects/ai-compose` → 3 propostas → INSERT ai_inference_log · Componentes `AiComposePanel`, `ai-providers` |
| RF21.CA07 | `TaskCreatorService.save`, `ProjectController ..> TaskCreatorService` · Atividades `U4 → W3 → U3` · Sequência "Cadastrar nova tarefa dentro do select" → `POST /api/tasks (modal RF20)` → "já selecionada na fase" · Componentes `Modal TaskCreator RF20`, `TaskController RF20` |
| RF21.CA08 | Classes `ProjectTaskDependency` (nota 422), enum `DependencyType`, `ProjectComposerService.validateDependencies/criticalPath`, `ProjectScheme.criticalPathJson`, `ProjectTask.isCritical/slackDays` · Atividades `U5 → A4 → A5/A6 → A7/A8 → A9` · Sequência `POST /api/projects/validate-dependencies` → `alt ciclo ou prazo inválido` / `else válido` (criticalPath CPM) · Componentes `DependencyEditor`, `CriticalPathPreview`, `D4` |
| RF21.CA09 | Classes `SealBond` (TASK ou PROJECT), `TaskItem.sealIdsJson`, `ProjectScheme.sealIdsJson`, `SealService.inheritFromTasks/suggestForProject` · Atividades `A10` · Sequência "chancelas das tarefas em Chancelas do projeto" e `DE->>S: SealService.suggestForProject` (tier PROJETO do mesmo emissor) · Componente `SealService RF39` |
| RF21.CA10 | `ProjectScheme.coverMode/coverUrl/mosaicJson`, `MediaStoragePort.studio` · Atividades `A14 → A15` (mosaico) / `A14 → A16 → P5` (foto tratada) · Sequência `UPDATE project_schemes SET coverMode MOSAICO, mosaicJson` · Componentes `CardPreview`, `storage-s3` |
| RF21.CA11 | `ProjectComposerService.publish`, `MuralService.publishProject`, `MuralEntry`, `SearchIndexPort` · Atividades `U9 → A21 → P6` · Sequência `POST /api/projects/{id}/publish` → status PUBLICADO, INSERT mural_entries, indexProject respeitando visibility · Transição `RASC_SALVO → PUBLICADO` · Componentes `MuralService RF27`, `search-opensearch` |
| RF21.CA12 | `DeciaSessionService.openFromProject`, `DeciaSession` (topic = objective, linkedProjectId) · Atividades `U10 → A22 → P7` · Sequência `POST /api/projects/{id}/decia-session` → decia_sessions, session_participants, message_attachments, status EM_DECISAO · Transição `RASC_SALVO/PUBLICADO → EM_DECISAO` e nota · Componente `DeciaSessionService RF29` |
| RF21.CA13 | Classes `ProcessKit`, `KitItem`, `Remix`, `ProjectScheme.originalProjectId`, enum `SchemeOrigin.MODELO/REMIX`, `ProjectComposerService.fromModel` · Atividades `U2 (Modelo ou Kit) → A19 → U3` · Componentes `ModelPicker Kit/modelo`, `ProjectController /from-model` |
| RF21.CA14 | `ProjectScheme.autosaveDraftJson`, `ProjectComposerService.autosave` · Atividades `U3/U6 → W4 → A20 → P2`, `U8 → W4`, `W7` (recupera) · Sequência `loop a cada alteração` → `PUT /api/projects/drafts/{draftId}` (sem project_tasks, sem EM_USO) e `SELECT ... autosaveDraftJson IS NOT NULL` na abertura · Estado `RASC_AUTO` + nota · Componente `Autosave hook` |
