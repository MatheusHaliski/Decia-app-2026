# RF38 — Aplicar a identidade visual do Work AI — ícones por tipo de tarefa, thumbnails automáticos, capa-mosaico de projeto, fio de decisão, lacres, etiquetas de estado, temas e skins da Mesa
**HU:** HU38 · **Sprint (board Work Station):** Product Backlog (não priorizado — pós-Sprint 4) · **Equivalente FAI:** anatomia dos cards (v17), anatomia do DNA, Background Studio (RF11), skins de card, temas (RF23 preferências) · **Aba/rota:** transversal (design system em `components/ui`); capa manual/IA em `/tasks/[id]` e `/projects/[id]`; temas e skins em `/settings/preferences`
**Critérios de aceite cobertos:** RF38.CA01 · RF38.CA02 · RF38.CA03 · RF38.CA04 · RF38.CA05 · RF38.CA06 · RF38.CA07 · RF38.CA08 · RF38.CA09 · RF38.CA10

> Conceito "a repartição do futuro": papelaria pública (carimbo, protocolo, pasta suspensa, clipe, lacre) em flat/duotone; tudo que a IA gerou carrega a **faísca âmbar ✦**. O RF é majoritariamente frontend (componentes do design system), com três pontos de backend: o **thumbnail assíncrono** (`PipelineJob THUMBNAIL` → `ThumbnailService`), a **capa-mosaico** recalculada por evento (`CardArtService`) e a **capa por IA** (`AiEngine CAPA_IA`). Preferências visuais vivem em `UserPreferences`; skins adquiridas em `UserSkin`.

## 1. Diagrama de classes

```mermaid
classDiagram
  direction LR

  class TaskItem {
    <<entity>>
    +UUID id
    +TaskType type
    +TaskCategory category
    +TaskState state
    +LocalDate dueAt
    +LocalDate legalDueAt
    +UUID legalDeadlineRuleId
    +boolean aiGenerated
    +UUID aiInferenceId
    +String thumbnailUrl
    +String coverUrl
    +CoverMode coverMode
    +String cardSkin
    +String format
    +UUID departmentId
    +String sealIdsJson
  }
  class ProjectScheme {
    <<entity>>
    +UUID id
    +String title
    +String emoji
    +String iconId
    +UUID departmentId
    +ProjectPhase currentPhase
    +ProjectCoverMode coverMode
    +String coverUrl
    +String mosaicJson
    +String deskSkin
    +String deskBackgroundJson
    +LocalDate nextMilestoneAt
    +String lastDeciaEventLabel
    +boolean aiGenerated
  }
  class ProjectTask {
    <<entity>>
    +UUID projectId
    +UUID taskId
    +ProjectPhase phase
    +int percentComplete
    +String snapshotJson
  }
  class UserPreferences {
    <<entity>>
    +UUID userId
    +ThemeMode theme
    +String density
    +BigDecimal fontScale
    +boolean reduceMotion
    +DeskSkin deskSkin
    +String defaultCardSkin
    +String dashboardLayoutJson
  }
  class UserSkin {
    <<entity>>
    +UUID id
    +UUID userId
    +String skinKind
    +String skinKey
    +String acquiredVia
    +UUID purchaseId
  }
  class PipelineJob {
    <<entity>>
    +UUID id
    +String type
    +String targetType
    +UUID targetId
    +String status
    +int attempts
    +String lastError
    +Instant scheduledAt
  }
  class MediaObject {
    <<entity>>
    +UUID id
    +String bucket
    +String key
    +String mimeType
    +String variantsJson
    +AccessClassification accessClass
  }
  class TaskVersion {
    <<entity>>
    +UUID taskId
    +int versionNumber
    +String externalRevisionId
    +String thumbnailUrl
  }
  class AiInferenceLog {
    <<entity>>
    +UUID id
    +AiCapability capability
    +String provider
    +String model
    +String result
    +UUID reviewedBy
    +Instant reviewedAt
    +Instant createdAt
  }
  class Department {
    <<entity>>
    +UUID id
    +String acronym
    +String color
    +String monogram
    +UUID headUserId
  }
  class Company {
    <<entity>>
    +UUID id
    +String logoUrl
    +String coatOfArmsUrl
    +String accentColor
  }
  class Seal {
    <<entity>>
    +UUID id
    +String issuerKind
    +String artJson
    +String iconUrl
    +boolean excellence
  }
  class SealBond {
    <<entity>>
    +UUID sealId
    +UUID targetId
    +SealBondStatus status
    +String sealCode
  }
  class Recognition {
    <<entity>>
    +UUID id
    +UUID recipientUserId
    +String medalArtJson
  }
  class FinalDecision {
    <<entity>>
    +UUID id
    +DecisionStatus status
    +String stampJson
  }
  class DecisionTraceNode {
    <<entity>>
    +UUID id
    +TraceNodeType nodeType
    +String classLabel
    +Instant at
  }
  class DecisionTraceEdge {
    <<entity>>
    +UUID fromNodeId
    +UUID toNodeId
    +String relation
  }
  class LegalDeadlineRule {
    <<entity>>
    +UUID id
    +TaskCategory category
    +int days
    +boolean businessDays
    +String legalBasis
  }

  class TaskType {
    <<enum>>
    TEXTO_MANUAL
    TEXTO_IA
    IMAGEM_WEB
    IMAGEM_EDITADA
    PLANILHA
    DOCUMENTO
    PASTA
    LINK
    DESENHO_TECNICO
    FORMULARIO
    ATA_REGISTRO
    EMAIL
    PROTOCOLO
    CRONOGRAMA
    ESTUDO_TECNICO_PRELIMINAR
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
  class CoverMode {
    <<enum>>
    AUTO
    MANUAL
    IA
  }
  class ProjectCoverMode {
    <<enum>>
    MOSAICO
    FOTO
    IA
  }
  class ThemeMode {
    <<enum>>
    AUTO
    CLARO
    ESCURO
    ALTO_CONTRASTE
    BLUEPRINT
  }
  class DeskSkin {
    <<enum>>
    PAPEL
    CORTICA
    BLUEPRINT
    PAPEL_TIMBRADO
  }
  class MessageClass {
    <<enum>>
    ARGUMENTO azul
    DIVERGENCIA laranja
    RISCO vermelho
    CONSENSO verde
    PERGUNTA roxo
    RUIDO
  }
  class DecisionStatus {
    <<enum>>
    PROPOSTA
    EM_REVISAO
    VALIDADA
    DEVOLVIDA
    SUBSTITUIDA
  }

  class TaskController {
    <<controller>>
    +PUT tasks_id_cover
    +POST tasks_id_cover_ai
    +DELETE tasks_id_cover
  }
  class ProjectController {
    <<controller>>
    +PUT projects_id_cover
    +POST projects_id_cover_ai
    +PATCH projects_id_icon
  }
  class PreferencesController {
    <<controller>>
    +GET me_preferences
    +PATCH me_preferences
  }
  class ThumbnailService {
    <<service>>
    +schedule(taskId) PipelineJob
    +render(taskId) MediaObject
    +strategyFor(type, format) ThumbnailStrategy
    +replaceManual(taskId, mediaId) TaskItem
    +requestAiCover(taskId, prompt) TaskItem
  }
  class ThumbnailStrategy {
    <<port>>
    +render(task, media) MediaObject
  }
  class FirstPageStrategy {
    <<adapter>>
  }
  class MiniChartStrategy {
    <<adapter>>
  }
  class CadSilhouetteStrategy {
    <<adapter>>
  }
  class MonogramStrategy {
    <<adapter>>
  }
  class FaviconCaptureStrategy {
    <<adapter>>
  }
  class CardArtService {
    <<service>>
    +rebuildMosaic(projectId) ProjectScheme
    +phaseRing(projectId) PhaseProgress
    +requestAiCover(projectId, theme) ProjectScheme
    +sealWaxFor(sealBond) SealWaxSpec
    +stampFor(decision) StampSpec
  }
  class AiEngine {
    <<service>>
    +run(capability, input, accessClass) AiResult
  }
  class PreferencesService {
    <<service>>
    +update(userId, patch) UserPreferences
    +availableSkins(userId) List~UserSkin~
  }

  TaskItem --> TaskType : type
  TaskItem --> TaskState : state
  TaskItem --> CoverMode : coverMode
  TaskItem ..> MediaObject : thumbnailUrl e coverUrl
  TaskItem ..> AiInferenceLog : aiInferenceId
  TaskItem ..> LegalDeadlineRule : legalDeadlineRuleId
  TaskItem "1" --> "*" TaskVersion : versões
  TaskItem --> Department : departmentId
  ProjectScheme --> ProjectCoverMode : coverMode
  ProjectScheme "1" --> "*" ProjectTask : tarefas do mosaico
  ProjectTask --> TaskItem : taskId
  ProjectScheme --> Department : departmentId
  Department --> Company : companyId
  UserPreferences --> ThemeMode : theme
  UserPreferences --> DeskSkin : deskSkin
  UserPreferences "1" --> "*" UserSkin : skins adquiridas
  PipelineJob ..> TaskItem : THUMBNAIL
  SealBond --> Seal : sealId
  SealBond ..> TaskItem : lacre no card
  FinalDecision --> DecisionStatus : status
  DecisionTraceNode ..> MessageClass : classLabel
  DecisionTraceNode "1" --> "*" DecisionTraceEdge : fio

  TaskController --> ThumbnailService
  ProjectController --> CardArtService
  PreferencesController --> PreferencesService
  ThumbnailService --> ThumbnailStrategy
  ThumbnailStrategy <|.. FirstPageStrategy
  ThumbnailStrategy <|.. MiniChartStrategy
  ThumbnailStrategy <|.. CadSilhouetteStrategy
  ThumbnailStrategy <|.. MonogramStrategy
  ThumbnailStrategy <|.. FaviconCaptureStrategy
  ThumbnailService --> AiEngine : CAPA_IA
  CardArtService --> AiEngine : CAPA_IA
  ThumbnailService ..> PipelineJob
  ThumbnailService ..> MediaObject
  CardArtService ..> ProjectScheme
  CardArtService ..> SealBond
  CardArtService ..> FinalDecision
  PreferencesService ..> UserPreferences

  note for TaskItem "tabela tasks · +40 campos · thumbnailUrl, coverUrl, coverMode (RF38.CA02)"
  note for ProjectScheme "tabela project_schemes · +30 campos · mosaicJson 2x3 + anel por fase (RF38.CA03)"
  note for UserPreferences "tabela user_preferences · RF38.CA08 · reduceMotion alimenta prefers-reduced-motion"
  note for CoverMode "TAXONOMIA lista AUTO MANUAL IA para TaskItem e MOSAICO FOTO IA para ProjectScheme · unificar nome a confirmar"
  note for MessageClass "cores dos nós do fio de decisão (RF38.CA07)"
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  classDef err fill:#FFE3E3,stroke:#C0392B,color:#5B1A12
  classDef ai fill:#FFF3D6,stroke:#D68910,color:#5C3B00
  classDef store fill:#EEF6FF,stroke:#4A4852,color:#1F2937

  subgraph L_user["Ator humano · Usuário"]
    U1["Cria ou envia uma tarefa (RF20)"]
    U2["Vê o card com ícone do tipo, etiqueta de estado, prazo, lacre, faísca ✦ e thumbnail"]
    U3{"Quer trocar a capa?"}
    U4["Envia imagem manual"]
    U5["Pede capa à IA (tema ou título)"]
    U6["Altera tema, skin da Mesa, densidade, reduzir movimento"]
    U7["Passa o mouse na faísca ✦: tooltip gerado por IA em data, revisado por pessoa"]
  end

  subgraph L_web["Web/BFF · Next.js + components/ui"]
    W1["TaskTypeIcon: glifo + cor por TaskType (tabela de identidade); rótulo textual sempre presente"]
    W2["StateTag: etiqueta de protocolo com nome do estado em texto (tracejado, pulso, cadeado, carimbo verde, esmaecido, estrela)"]
    W3["DeadlineBadge: âmbar a 3 dias, vermelho vencido, ícone ⚖ se legalDueAt"]
    W4["SealWax (dourado empresa, azul-marinho chefe, fita vermelha Excelência) · Medal · DecisionStamp VALIDADO/DEVOLVIDO com data e revisor"]
    W5["DecisionThread: linha vertical com nós coloridos por classLabel (azul, laranja, vermelho, verde, roxo)"]
    W6["ProjectMosaicCover 2x3 + PhaseRing + borda na cor do departamento · DeptMonogram · CompanyLogo"]
    W7["ThemeProvider: AUTO, CLARO, ESCURO, ALTO_CONTRASTE, BLUEPRINT · DeskSkin · menu recolhível responsivo"]
    W8["MotionProvider: encaixe animado, confete discreto, faísca animada, empty states; desliga com prefers-reduced-motion ou reduceMotion"]
    W9["PUT /tasks/id/cover (mediaId) · POST /tasks/id/cover/ai · PATCH /me/preferences"]
    W10["Thumbnail placeholder (skeleton com glifo do tipo) enquanto o job roda"]
  end

  subgraph L_app["wai-application · ThumbnailService · CardArtService · PreferencesService"]
    A1["Evento TaskCreated ou TaskAttachmentReady → ThumbnailService.schedule → PipelineJob THUMBNAIL"]
    A2{"Estratégia por tipo e formato?"}
    A3["DOCUMENTO: primeira página estilizada"]
    A4["PLANILHA: mini-gráfico dos dados"]
    A5["DESENHO_TECNICO: silhueta do dwg/dxf/ifc/glb"]
    A6["TEXTO, FORMULARIO, ATA, PROTOCOLO, EMAIL: monograma das iniciais sobre a cor da categoria"]
    A7["LINK: favicon + captura"]
    A8["Grava variante thumb em MediaObject.variantsJson e TaskItem.thumbnailUrl (coverMode AUTO)"]
    A9["Evento TaskThumbnailReady → CardArtService.rebuildMosaic para cada projeto que contém a tarefa"]
    A10["Mosaico 2x3 das tarefas principais + percentComplete por fase + Department.color → mosaicJson"]
    A11{"Imagem manual válida (mime real, tamanho, antivírus)?"}
    A12["coverMode MANUAL · coverUrl = mediaId"]
    A13{"Cota de IA disponível (RF42.CA06)?"}
    A14{"accessClass RESTRITO ou SIGILOSO?"}
    A15["coverMode IA · coverUrl · aiGenerated true · aiInferenceId (faísca ✦)"]
    A16["PreferencesService.update: valida skin possuída (UserSkin ou PADRAO)"]
    E1["422 VALIDACAO (mime inválido, arquivo grande, infectado)"]
    E2["409 COTA_ESGOTADA → atalho para a Loja Work AI"]
    E3["403 SKIN_NAO_ADQUIRIDA"]
  end

  subgraph L_ai["IA (AiEngine) · capability CAPA_IA e THUMBNAIL"]
    I1["Gera ilustração flat a partir do tema (ex.: pavimentação urbana) com PII mascarada"]
    I2["Motor local: monograma/paleta determinística (BLOQUEADO_SIGILO para externo)"]
    I3["AiInferenceLog: provider, model, createdAt, reviewedBy → alimenta o tooltip da faísca"]
  end

  subgraph L_db["Persistência"]
    D1["MySQL pipeline_jobs (THUMBNAIL PENDENTE → RODANDO → OK | FALHA → REPROCESSAR)"]
    D2["S3 MediaObject variantes thumb e preview"]
    D3["MySQL tasks.thumbnailUrl, coverUrl, coverMode · task_versions.thumbnailUrl"]
    D4["MySQL project_schemes.mosaicJson, coverUrl, coverMode"]
    D5["MySQL user_preferences · user_skins"]
    D6["MySQL ai_inference_log"]
  end

  U1 --> A1 --> D1
  A1 --> W10
  D1 --> A2
  A2 -- "DOCUMENTO" --> A3
  A2 -- "PLANILHA" --> A4
  A2 -- "DESENHO_TECNICO" --> A5
  A2 -- "texto e afins" --> A6
  A2 -- "LINK" --> A7
  A3 --> A8
  A4 --> A8
  A5 --> A8
  A6 --> A8
  A7 --> A8
  A8 --> D2
  A8 --> D3
  A8 --> A9 --> A10 --> D4
  A10 --> W6
  D3 --> W1 --> U2
  W2 --> U2
  W3 --> U2
  W4 --> U2
  W5 --> U2
  U2 --> U7
  U2 --> U3
  U3 -- "imagem manual" --> U4 --> W9 --> A11
  A11 -- "não" --> E1
  A11 -- "sim" --> A12 --> D3
  U3 -- "capa por IA" --> U5 --> W9 --> A13
  A13 -- "não" --> E2
  A13 -- "sim" --> A14
  A14 -- "sim" --> I2 --> A15
  A14 -- "não" --> I1 --> A15
  I1 --> I3 --> D6
  A15 --> D3
  A15 --> A9
  U6 --> W9 --> A16
  A16 -- "skin não possuída" --> E3
  A16 -- "ok" --> D5 --> W7 --> W8

  class E1,E2,E3 err
  class I1,I2,I3 ai
  class D1,D2,D3,D4,D5,D6 store
```

## 3. Diagrama de sequência

```mermaid
sequenceDiagram
  autonumber
  actor U as Usuário
  participant N as Next.js (App Router)
  participant C as Controller (wai-web)
  participant S as Service (wai-application)
  participant AI as AiEngine
  participant DB as Repository/MySQL
  participant S3 as S3
  participant R as Redis
  participant EV as DomainEvents (AFTER_COMMIT)

  U->>N: Envia documento como tarefa (RF20)
  N->>C: POST /tasks (multipart)
  C->>S: AcervoService.create → commit
  S->>EV: TaskCreated(taskId)
  EV->>S: ThumbnailService.schedule(taskId)
  S->>DB: INSERT pipeline_jobs (THUMBNAIL, PENDENTE)
  S-->>N: 201 TaskItem (thumbnailUrl null → skeleton com glifo do tipo)
  Note over S,S3: worker assíncrono (platform) pega o job
  S->>DB: UPDATE pipeline_jobs RODANDO
  S->>S3: GET original · PUT variante thumb (primeira página estilizada)
  S->>DB: UPDATE tasks (thumbnailUrl, coverMode AUTO) · media_objects.variantsJson · pipeline_jobs OK
  S->>EV: TaskThumbnailReady(taskId)
  EV->>S: CardArtService.rebuildMosaic(projectId) para cada projeto da tarefa
  S->>DB: SELECT project_tasks + tasks.thumbnailUrl + percentComplete por fase
  S->>DB: UPDATE project_schemes (mosaicJson 2x3, anel de fase, Department.color)
  S->>R: DEL cache card:project:id
  N->>C: GET /tasks/id (SWR revalida)
  C-->>N: 200 TaskItem com thumbnailUrl, state, dueAt, legalDueAt, sealIdsJson, aiGenerated
  N-->>U: Card: TaskTypeIcon + StateTag + DeadlineBadge ⚖ + SealWax + ✦

  U->>N: Pedir capa à IA
  N->>C: POST /tasks/id/cover/ai (tema)
  C->>S: ThumbnailService.requestAiCover(taskId, tema)
  S->>R: GET quota:USER:id:mês (créditos comprados antes da cota mensal)
  alt sem cota e sem créditos
    S-->>N: 409 COTA_ESGOTADA (atalho para a Loja)
  else accessClass RESTRITO ou SIGILOSO
    S->>AI: run(CAPA_IA, tema, accessClass)
    AI-->>S: motor local (monograma e paleta) · result BLOQUEADO_SIGILO para externo
    S->>DB: INSERT ai_inference_log · UPDATE tasks (coverUrl, coverMode IA, aiGenerated, aiInferenceId)
    S-->>N: 200 TaskItem com aviso de motor local
  else cota ok e acesso PUBLICO ou INTERNO
    S->>AI: run(CAPA_IA, tema mascarado)
    AI-->>S: imagem flat + confiança
    S->>S3: PUT cover
    S->>DB: INSERT ai_inference_log · UPDATE tasks (coverUrl, coverMode IA, aiGenerated, aiInferenceId)
    S->>EV: TaskCoverChanged(taskId) → rebuildMosaic
    S-->>N: 200 TaskItem
    N-->>U: Capa com faísca ✦ e tooltip gerado por IA em data, revisado por
  end

  U->>N: Tema BLUEPRINT + skin da Mesa CORTICA + reduzir movimento
  N->>C: PATCH /me/preferences
  C->>S: PreferencesService.update(userId, patch)
  alt skin não adquirida (UserSkin ausente e não PADRAO)
    S-->>N: 403 SKIN_NAO_ADQUIRIDA
  else ok
    S->>DB: UPDATE user_preferences (theme, deskSkin, reduceMotion)
    S-->>N: 200 UserPreferences
    N-->>U: ThemeProvider aplica data-theme e MotionProvider desliga animações
  end
```

## 4. Máquina de estados

O RF não tem entidade com estado próprio. Usa-se o `PipelineJob.status` do job `THUMBNAIL` e o `TaskItem.coverMode` que ele afeta (o mesmo vale para `ProjectScheme.coverMode` MOSAICO → FOTO → IA).

```mermaid
stateDiagram-v2
  direction LR

  state "PipelineJob THUMBNAIL" as Job {
    [*] --> PENDENTE : TaskCreated ou TaskAttachmentReady
    PENDENTE --> RODANDO : worker pega o job
    RODANDO --> OK : variante thumb gravada
    RODANDO --> FALHA : erro de render ou mime não suportado
    FALHA --> REPROCESSAR : attempts menor que 3 (backoff)
    REPROCESSAR --> PENDENTE
    FALHA --> [*] : attempts esgotados · card fica com glifo do tipo
    OK --> [*]
  }

  state "TaskItem.coverMode" as Cover {
    [*] --> SemThumb : tarefa criada
    SemThumb --> AUTO : job OK (thumbnailUrl)
    AUTO --> MANUAL : usuário envia imagem válida
    AUTO --> IA : capa gerada (aiGenerated, aiInferenceId, faísca ✦)
    MANUAL --> IA : usuário pede capa à IA
    IA --> MANUAL : usuário substitui por imagem
    MANUAL --> AUTO : usuário restaura automática
    IA --> AUTO : usuário restaura automática
    AUTO --> AUTO : anexo principal muda → novo job THUMBNAIL
  }

  Job --> Cover : OK publica TaskThumbnailReady

  note right of Cover
    Qualquer mudança de coverMode ou thumbnailUrl
    dispara CardArtService.rebuildMosaic nos projetos
    que contêm a tarefa (RF38.CA03)
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FE["Frontend Next.js"]
    FE1["app/ · tasks, projects, sessions, profile, settings/preferences"]
    FE2["components/ui · design system: TaskTypeIcon · TaskThumbnail · StateTag · DeadlineBadge · AiSpark ✦ · SealWax · Medal · DecisionStamp · DecisionThread · ProjectMosaicCover · PhaseRing · DeptMonogram · ThemeProvider · DeskSkin · MotionProvider · EmptyState"]
    FE3["tokens · cores por TaskType, cores por MessageClass, temas CLARO/ESCURO/ALTO_CONTRASTE/BLUEPRINT, prefers-reduced-motion"]
  end

  subgraph WEB["wai-web"]
    C1["TaskController (cover)"]
    C2["ProjectController (cover, icon)"]
    C3["PreferencesController"]
  end

  subgraph APP["wai-application"]
    S1["ThumbnailService + ThumbnailStrategy (FirstPage, MiniChart, CadSilhouette, Monogram, FaviconCapture)"]
    S2["CardArtService (mosaico, anel, lacre, carimbo)"]
    S3["PreferencesService"]
    S4["AiEngine (RF43) · CAPA_IA"]
    P1["StoragePort"]
  end

  subgraph DOM["wai-domain · br.gov.pr.secid.workai"]
    D1["TaskItem · TaskVersion · ProjectScheme · ProjectTask"]
    D2["UserPreferences · UserSkin"]
    D3["PipelineJob · MediaObject · AiInferenceLog"]
    D4["Seal · SealBond · Recognition · FinalDecision · DecisionTraceNode · Department · Company"]
  end

  subgraph INFRA["wai-infrastructure/*"]
    I1["persistence-mysql"]
    I2["storage-s3 · variantes thumb/preview/cover"]
    I3["cache-redis · cache de cards e preferências"]
    I4["ai-providers · ClaudeAdapter · GeminiAdapter · LocalEngine"]
    I5["platform · PipelineJob worker · DomainEventOutbox · renderers (pdf, xlsx, dwg/ifc/glb, headless capture)"]
  end

  subgraph EXT["Serviços externos"]
    X1["Claude / Gemini (capa por IA)"]
    X2["Google Workspace · Microsoft 365 (export da 1ª página de gdoc/docx vinculados → TaskVersion.thumbnailUrl)"]
  end

  FE1 --> C1
  FE1 --> C2
  FE1 --> C3
  FE2 -.-> FE1
  FE3 -.-> FE2
  C1 --> S1
  C2 --> S2
  C3 --> S3
  S1 --> S4
  S2 --> S4
  S1 --> P1
  S1 --> D1
  S1 --> D3
  S2 --> D1
  S2 --> D4
  S3 --> D2
  D1 --> I1
  D2 --> I1
  D3 --> I1
  D4 --> I1
  P1 --> I2
  S4 --> I4 --> X1
  I5 --> S1
  I5 --> S2
  I5 --> X2
  FE1 -.-> I3
```

## 6. Rastreabilidade

| CA | Elemento do diagrama (classe / passo / mensagem / transição / componente) |
|---|---|
| RF38.CA01 | Enum `TaskType` (15 valores) e `TaskItem.type`; atividade W1 (TaskTypeIcon com rótulo textual) e U2; sequência msg 18 (card com TaskTypeIcon); componentes `TaskTypeIcon`, `tokens · cores por TaskType`; o mesmo ícone é reutilizado em `DecisionThread` e anexos de mensagem (W5). |
| RF38.CA02 | Classes `ThumbnailService`, `ThumbnailStrategy` + 5 adapters, `PipelineJob` (THUMBNAIL), `MediaObject.variantsJson`, `TaskItem.thumbnailUrl/coverUrl/coverMode`, `CoverMode`; atividades A1→A2→A3..A7→A8, W10, U3→U4/U5, A11 (422 VALIDACAO), A13 (409 COTA_ESGOTADA), A14, A15; sequência msgs 1–10 e 19–34; máquina de estados `PipelineJob THUMBNAIL` e `TaskItem.coverMode`; componentes `ThumbnailService`, `PipelineJob worker`, `storage-s3`, `renderers`. |
| RF38.CA03 | Classes `ProjectScheme.mosaicJson/coverUrl/coverMode`, `ProjectCoverMode`, `ProjectTask.percentComplete/phase`, `Department.color`, `CardArtService.rebuildMosaic/phaseRing`; atividades A9, A10, W6; sequência msgs 11–15 (TaskThumbnailReady → rebuildMosaic → DEL cache) e 32; nota da máquina de estados (qualquer mudança dispara rebuild); componentes `CardArtService`, `ProjectMosaicCover`, `PhaseRing`. |
| RF38.CA04 | Classes `TaskItem.aiGenerated/aiInferenceId`, `ProjectScheme.aiGenerated`, `AiInferenceLog.createdAt/model/reviewedBy/reviewedAt`; atividades U7, I3, A15; sequência msgs 31 e 34 (tooltip gerado por IA em data, revisado por); transição `AUTO → IA` (faísca ✦); componentes `AiSpark ✦`. |
| RF38.CA05 | Enum `TaskState` (8 valores), `TaskItem.dueAt/legalDueAt/legalDeadlineRuleId`, `LegalDeadlineRule`; atividades W2 (nome do estado em texto, estilos tracejado/pulso/cadeado/carimbo/esmaecido/estrela) e W3 (âmbar 3 dias, vermelho vencido, ⚖); sequência msg 18; componentes `StateTag`, `DeadlineBadge`. |
| RF38.CA06 | Classes `Seal.artJson/issuerKind/excellence`, `SealBond.status/sealCode`, `Recognition.medalArtJson`, `FinalDecision.stampJson/status`, `DecisionStatus`, `CardArtService.sealWaxFor/stampFor`; atividade W4; sequência msg 18 (SealWax); componentes `SealWax`, `Medal`, `DecisionStamp`. |
| RF38.CA07 | Classes `DecisionTraceNode.classLabel`, `DecisionTraceEdge`, enum `MessageClass` com cores; atividade W5; componentes `DecisionThread`, `tokens · cores por MessageClass`. |
| RF38.CA08 | Classes `UserPreferences.theme/deskSkin/density/fontScale`, `ThemeMode` (inclui BLUEPRINT), `DeskSkin` (PAPEL, CORTICA, BLUEPRINT, PAPEL_TIMBRADO), `UserSkin`, `PreferencesService`, `PreferencesController`; atividades U6, W7 (menu recolhível responsivo), A16 (403 SKIN_NAO_ADQUIRIDA); sequência msgs 35–41; componentes `ThemeProvider`, `DeskSkin`, `settings/preferences`, `cache-redis`. |
| RF38.CA09 | Classes `Department.monogram/color/acronym`, `Company.logoUrl/coatOfArmsUrl/accentColor`, `TaskItem.departmentId`, `ProjectScheme.departmentId`; atividades A10 (borda na cor do departamento) e W6 (DeptMonogram, CompanyLogo); componente `DeptMonogram`. |
| RF38.CA10 | Classe `UserPreferences.reduceMotion`; atividade W8 (encaixe animado, confete, faísca animada, empty states; desliga com prefers-reduced-motion); sequência msg 41 (MotionProvider desliga animações); componentes `MotionProvider`, `EmptyState`, `tokens · prefers-reduced-motion`. |
