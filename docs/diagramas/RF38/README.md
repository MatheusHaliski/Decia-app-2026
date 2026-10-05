# RF38 — Aplicar a identidade visual do Work AI — ícones por tipo de tarefa, thumbnails automáticos, capa-mosaico de projeto, fio de decisão, lacres, etiquetas de estado, temas e skins da Mesa
**HU:** HU38 · **Sprint (board Work Station):** Product Backlog (transversal; o design system v2 entra antes de qualquer tela, D-11) · **Equivalente FAI:** anatomia dos cards (v17), anatomia do DNA, Background Studio (RF11), skins de card, temas (RF23 preferências) · **Aba/rota:** transversal — todo card, lista, busca, anexo de mensagem e fio de decisão; preferências em `/settings` (tema, skin da Mesa, reduceMotion); Estúdio de Arte do card (RF11, `/tasks/[id]/art`, `/projects/[id]/art`); galeria `/lab/design-system`
**Critérios de aceite cobertos:** RF38.CA01 · CA02 · CA03 · CA04 · CA05 · CA06 · CA07 · CA08 · CA09 · CA10 (corpo do card, inalterado) — regra: o **título do card** define o RF e o corpo traz os próprios CAs. Fontes de detalhe: `docs/design-system/DESIGN_SYSTEM.md` (§2 tokens, §3 catálogo de componentes, §4 glifos), `ANATOMIA_CARDS.md`, `ANATOMIAS_E_ESTUDIO.md` v3 (enums `TaskCardLayout`, `ProjectCardLayout`, `TaskComposition`, `ProjectComposition`, `SchemeView`, `TaskCardVariant`, `ProjectCardVariant`, `CardArtConfig`), `GLYPHS.md`, `TOKENS.md`.

Regra do design system: **nenhum HTML/CSS solto** nas telas (D-11); todo elemento visual vem de `packages/ui` com tokens `--ws-*` e 4 temas via `data-theme` (claro · escuro · contraste · blueprint). As **variações** dos cards são **flags derivadas dos dados** (`taskVariants(TaskView, viewer)`, `projectVariants(ProjectView, viewer)`), nunca escritas à mão; tipos vêm do OpenAPI (D-21). O backend contribui com: `TaskType` → glifo/cor (`TypeChip`), `PipelineJob THUMBNAIL` assíncrono (`TaskItem.thumbnailUrl/coverMode`), `ProjectScheme.mosaicJson/coverMode` (mosaico 2×3 recomputado AFTER_COMMIT), `aiGenerated/aiInferenceId/reviewedBy` (faísca ✦), `TaskState`/`ProjectStatus` (etiquetas com nome em texto), `legalDueAt` (⚖), `SealBond`/`Seal.artJson` (lacre), `Recognition.medalArtJson` (medalha), `FinalDecision.stampJson` (carimbo), `DecisionTraceNode.classLabel` (fio), `Department.color/monogram`, `Company.logoUrl`, `UserPreferences.theme/deskSkin/reduceMotion`, `UserSkin` (skins compradas, RF42) e `CardArtConfig` (`card_art_json`, Estúdio, proposta Q-58).

## 1. Diagrama de classes

```mermaid
classDiagram
direction LR

namespace ws_domain_dados_visuais {
  class TaskItem {
    <<entity>>
    +id: UUID
    +type: TaskType
    +state: TaskState
    +departmentId: UUID
    +dueAt: LocalDate
    +legalDueAt: LocalDate
    +thumbnailUrl: String
    +coverUrl: String
    +coverMode: CoverMode
    +cardSkin: String
    +cardArtJson: JSON
    +aiGenerated: boolean
    +aiInferenceId: UUID
    +sealIdsJson: JSON
    .. +40 campos ..
  }
  class ProjectScheme {
    <<entity>>
    +id: UUID
    +status: ProjectStatus
    +currentPhase: ProjectPhase
    +departmentId: UUID
    +emoji: String
    +iconId: String
    +coverMode: ProjectCoverMode
    +coverUrl: String
    +mosaicJson: JSON
    +deskSkin: String
    +deskBackgroundJson: JSON
    +cardArtJson: JSON
    +aiGenerated: boolean
    .. +28 campos ..
  }
  class DecisionTraceNode {
    <<entity>>
    +nodeType: TraceNodeType
    +classLabel: MessageClass
    +actorId: UUID
    +at: Instant
  }
  class FinalDecision {
    <<entity>>
    +stampJson: JSON
    +status: DecisionStatus
  }
  class SealBond {
    <<entity>>
    +sealId: UUID
    +status: SealBondStatus
    +basis: SealBondBasis
  }
  class Seal {
    <<entity>>
    +issuerKind: String
    +artJson: JSON
    +excellence: boolean
  }
  class Recognition {
    <<entity>>
    +medalArtJson: JSON
    +name: String
  }
  class Department {
    <<entity>>
    +color: String
    +monogram: String
  }
  class Company {
    <<entity>>
    +logoUrl: String
    +accentColor: String
  }
  class AiInferenceLog {
    <<entity>>
    +id: UUID
    +model: String
    +createdAt: Instant
    +reviewedBy: UUID
    +reviewedAt: Instant
  }
}

namespace ws_domain_preferencias_plataforma {
  class UserPreferences {
    <<entity>>
    +theme: ThemeMode
    +language: UiLanguage
    +density: String
    +fontScale: BigDecimal
    +reduceMotion: boolean
    +deskSkin: DeskSkin
    +defaultCardSkin: String
  }
  class UserSkin {
    <<entity>>
    +userId: UUID
    +skinKind: String
    +skinKey: String
    +acquiredVia: String
  }
  class PipelineJob {
    <<entity>>
    +type: String
    +targetType: String
    +targetId: UUID
    +status: PipelineJobStatus
  }
  class MediaObject {
    <<entity>>
    +objectKey: String
    +variantsJson: JSON
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
}

namespace ws_application {
  class ThumbnailService {
    <<service>>
    +onTaskCreatedOrUpdated(event) PipelineJob
    +render(task) MediaObject
    +replaceManual(actor, taskId, media) TaskItem
    +requestAiCover(actor, taskId) TaskItem
  }
  class MosaicService {
    <<service>>
    +recompute(projectId) ProjectScheme
  }
  class CardArtService {
    <<service>>
    +get(actor, kind, id) CardArtConfig
    +put(actor, kind, id, CardArtConfig, baseRev) CardArtConfig
    +effectiveLayout(card) Composition
  }
  class PreferencesService {
    <<service>>
    +update(actor, PreferencesForm) UserPreferences
  }
  class AiEngine {
    <<service>>
    +run(CAPA_IA) AiResponse
  }
  class Guard {
    <<service>>
    +requireOwner(actor, ownerId)
  }
  class UploadGuard {
    <<service>>
    +checkMagicBytes(bytes)
    +checkPixelCeiling(w, h)
  }
  class StoragePort {
    <<port>>
    +put(key, bytes)
  }
  class JobPort {
    <<port>>
    +enqueue(THUMBNAIL)
  }
}

namespace packages_ui {
  class TaskCard {
    <<component>>
    +layout: TaskCardLayout
    +variants: Set~TaskCardVariant~
    +composition: TaskComposition
    +family: String
  }
  class ProjectCard {
    <<component>>
    +layout: ProjectCardLayout
    +variants: Set~ProjectCardVariant~
    +composition: ProjectComposition
    +cover: String
  }
  class TypeChip {
    <<component>>
    +type: TaskType
  }
  class Tag {
    <<component>>
    +state: TaskState
    +status: ProjectStatus
    +classLabel: MessageClass
    +pulse: boolean
  }
  class Due {
    <<component>>
    +date: LocalDate
    +kind: String
    +legal: boolean
  }
  class Spark {
    <<component>>
    +generatedAt: Instant
    +model: String
    +reviewedBy: String
  }
  class Stamp {
    <<component>>
    +kind: String
    +date: LocalDate
    +reviewer: String
  }
  class SealBadge {
    <<component>>
    +issuer: String
    +excellence: boolean
  }
  class Medal {
    <<component>>
    +name: String
  }
  class Mosaic {
    <<component>>
    +tiles: List
  }
  class ProgressRing {
    <<component>>
    +value: int
    +total: int
  }
  class DecisionThread {
    <<component>>
    +nodes: List
    +stamp: String
  }
  class BackgroundArt {
    <<component>>
    +skin: DeskSkin
  }
  class Monogram {
    <<component>>
    +initials: String
    +dept: String
  }
  class ThemeProvider {
    <<component>>
    +dataTheme: String
    +reduceMotion: boolean
  }
  class Confetti {
    <<component>>
  }
  class TaskCardLayout {
    <<enum>>
    compact
    list
    expanded
    attachment
    mini
  }
  class ProjectCardLayout {
    <<enum>>
    mosaic
    hero
    mural
    postit
  }
  class TaskComposition {
    <<enum>>
    PAGINA
    GRADE
    PRANCHA
    MENSAGEM
    FICHA
  }
  class ProjectComposition {
    <<enum>>
    MOSAICO
    LINHA_TEMPO
    KANBAN_MINI
    PAINEL_METRICAS
    CAPA_FOTO
  }
  class SchemeView {
    <<enum>>
    BOARD
    TIMELINE
    DESK
  }
}

TaskItem ..> TypeChip : type
TaskItem ..> Tag : state
TaskItem ..> Due : dueAt legalDueAt
TaskItem ..> Spark : aiGenerated aiInferenceId
AiInferenceLog ..> Spark : model createdAt reviewedBy
ProjectScheme ..> Mosaic : mosaicJson
ProjectScheme ..> ProgressRing : currentPhase
ProjectScheme ..> Tag : status
DecisionTraceNode ..> DecisionThread : classLabel cor do no
FinalDecision ..> Stamp : stampJson
SealBond ..> SealBadge : status APROVADA
Seal ..> SealBadge : artJson excellence
Recognition ..> Medal : medalArtJson
Department ..> Monogram : color monogram
Department ..> TaskCard : borda na cor
Company ..> ThemeProvider : logoUrl accentColor
UserPreferences ..> ThemeProvider : theme reduceMotion
UserPreferences ..> BackgroundArt : deskSkin
UserSkin ..> BackgroundArt : skins compradas
TaskCard *-- TypeChip
TaskCard *-- Tag
TaskCard *-- Due
TaskCard *-- Spark
TaskCard *-- SealBadge
TaskCard --> TaskCardLayout
TaskCard --> TaskComposition
ProjectCard *-- Mosaic
ProjectCard *-- ProgressRing
ProjectCard *-- Stamp
ProjectCard --> ProjectCardLayout
ProjectCard --> ProjectComposition
ThumbnailService --> JobPort
ThumbnailService --> StoragePort
ThumbnailService --> AiEngine
ThumbnailService --> UploadGuard
ThumbnailService ..> TaskItem : thumbnailUrl coverMode
MosaicService ..> ProjectScheme : mosaicJson
CardArtService ..> TaskItem : cardArtJson
CardArtService ..> ProjectScheme : cardArtJson
CardArtService --> Guard
PreferencesService ..> UserPreferences
PipelineJob ..> ThumbnailService : THUMBNAIL
MediaObject ..> TaskItem : variantsJson thumb
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph ATOR["Ator (qualquer usuário)"]
    A0([Cria ou envia uma tarefa]) --> A1["Arquivo ou texto entra no acervo (RF4)"]
    A2([Abre qualquer lista, busca, anexo ou fio]) --> A3["Vê cards com ícone por tipo, etiqueta de estado em texto, prazo colorido, lacre, faísca"]
    A4([Decisão validada na sessão]) --> A5["Vê carimbo VALIDADO e confete discreto"]
    A6([Preferências]) --> A7["Escolhe tema claro/escuro/contraste/blueprint, skin da Mesa, reduzir movimento"]
    A8([Troca a thumbnail]) --> A9{"Manual ou IA?"}
  end

  subgraph FE["Next.js / BFF (packages/ui · app/(shell)/*)"]
    F1["taskVariants(TaskView, viewer) / projectVariants(ProjectView, viewer) → Set de flags"]
    F2["TaskCard layout compact/list/expanded/attachment/mini · ProjectCard mosaic/hero/mural/postit · effectiveLayout(composition)"]
    F3["TypeChip (glifo + nome) · Tag (nome do estado em texto, estilo tracejado/pulso/cadeado/carimbo/estrela) · Due (âmbar 3 dias, vermelho vencido, ⚖) · Spark tooltip · SealBadge · Medal · Stamp · DecisionThread"]
    F4["ThemeProvider data-theme + prefers-reduced-motion · BackgroundArt(deskSkin) · SidebarNav recolhível · bottom-nav"]
    F5["Micro-interações: encaixe animado ao arrastar para a fase, Confetti na decisão validada, faísca animada durante geração, EmptyState ilustrado"]
    F6["PUT /api/tasks/{id}/cover (manual) · POST /api/tasks/{id}/cover/ai"]
  end

  subgraph WEB["ws-web"]
    W1["TaskController · ProjectController · PreferencesController (MeController existe no main) · CardArtController"]
    W2["GlobalExceptionHandler"]
  end

  subgraph APP["ws-application"]
    P1["DomainEvents TaskCreated/TaskUpdated AFTER_COMMIT → ThumbnailService.onTaskCreatedOrUpdated → PipelineJob THUMBNAIL"]
    P2{"Tipo da tarefa"}
    P2 -->|DOCUMENTO PLANILHA| P3["1ª página estilizada ou mini-gráfico"]
    P2 -->|DESENHO_TECNICO| P4["Silhueta do desenho"]
    P2 -->|LINK| P5["favicon + captura"]
    P2 -->|PASTA PROTOCOLO| P6["Monograma do departamento"]
    P7["UploadGuard (magic bytes, teto de pixels) → reencode webp → MediaObject.variantsJson thumb/preview → TaskItem.thumbnailUrl, coverMode AUTO"]
    P8["MosaicService.recompute(projectId): 6 thumbnails principais + progresso por fase → ProjectScheme.mosaicJson (AFTER_COMMIT de ProjectTask)"]
    P9{"Guard.requireOwner(tarefa)?"}
    P9 -->|não| E1["403 ACESSO_NEGADO"]
    P10["Manual: coverMode MANUAL · IA: AiEngine CAPA_IA → coverMode IA + aiInferenceId"]
    P11["PreferencesService.update → UserPreferences.theme/deskSkin/reduceMotion (RF3)"]
    P12["CardArtService.put(CardArtConfig, baseRev) → 409 REVISAO_DESATUALIZADA se baseRev divergir"]
  end

  subgraph IA["AiEngine (THUMBNAIL · CAPA_IA)"]
    I1["Gera capa sob pedido do dono · AiInferenceLog (model, createdAt) → tooltip gerado por IA em [data], revisado por [pessoa]"]
  end

  subgraph DB["Persistência"]
    D1[("MySQL tasks · project_schemes · user_preferences (V2) · user_skins · pipeline_jobs · media_objects (V2) · ai_inference_log (V2)")]
    D2[("S3 thumbnails · capas · variants · flag storage.s3")]
  end

  A1 --> P1 --> P2
  P3 --> P7
  P4 --> P7
  P5 --> P7
  P6 --> P7
  P7 --> D2
  P7 --> D1
  P7 --> P8 --> D1
  A2 --> F1 --> F2 --> F3
  A3 --> F3
  A4 --> A5 --> F5
  A6 --> A7 --> F4 --> W1 --> P11 --> D1
  A8 --> A9 -->|manual| F6 --> W1 --> P9 -->|sim| P10 --> D1
  A9 -->|IA| F6
  P10 --> I1 --> D1
  F2 --> W1 --> P12 --> D1
  E1 --> W2
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
  participant EV as DomainEvents (AFTER_COMMIT)

  Note over U,EV: CA02 + CA03 — thumbnail automático e capa-mosaico
  U->>FE: envia um DOCUMENTO pdf (RF4)
  FE->>C: POST /api/tasks (multipart)
  C->>S: TaskService.create(actor, form, file)
  S->>DB: insert tasks (thumbnailUrl null, coverMode AUTO)
  S->>EV: TaskCreated
  S-->>FE: 201 TaskItem (card com Skeleton na mídia)
  EV->>S: ThumbnailService.onTaskCreatedOrUpdated → pipeline_jobs THUMBNAIL
  S->>S3: get anexo primário
  S->>S: UploadGuard (magic bytes, teto de pixels) · render 1ª página estilizada → webp
  S->>S3: put thumbnails/{taskId}.webp + variants
  S->>DB: update tasks.thumbnail_url · media_objects.variants_json · pipeline_jobs OK
  S->>EV: ThumbnailReady
  EV->>S: MosaicService.recompute(projectId) para cada projeto que usa a tarefa
  S->>DB: update project_schemes.mosaic_json (6 tiles + progresso por fase)
  FE->>C: GET /api/tasks/{id}
  C-->>FE: TaskView com thumbnailUrl → TaskCard troca Skeleton pela mídia

  Note over U,EV: CA02 — substituir por capa manual ou IA
  U->>FE: pede capa à IA
  FE->>C: POST /api/tasks/{id}/cover/ai
  C->>S: ThumbnailService.requestAiCover(actor, taskId)
  S->>S: Guard.requireOwner(actor, task.ownerId)
  alt não é dono
    S-->>C: 403 ACESSO_NEGADO
  else ok
    S->>AI: run(CAPA_IA, título + tipo + categoria)
    AI->>DB: insert ai_inference_log (model, createdAt)
    AI-->>S: imagem ✦
    S->>S3: put covers/{taskId}.webp
    S->>DB: update tasks coverUrl, coverMode IA, aiInferenceId
    S-->>FE: 200 TaskView (Spark com tooltip gerado por IA em [data])
  end

  Note over U,EV: CA04 + CA06 + CA07 — faísca, carimbo e fio na tela
  U->>FE: abre /tasks/{id}
  FE->>C: GET /api/tasks/{id} + GET /api/trace?targetType=TASK
  C->>S: TaskService.detail + DecisionTraceService.thread
  S->>DB: tasks + ai_inference_log (reviewedBy) + seal_bonds APROVADA + seals.artJson + decision_trace_nodes.classLabel + final_decisions.stampJson
  S-->>FE: TaskView, SealViews, DecisionThread nodes, Stamp
  FE->>FE: taskVariants(view, viewer) → GERADA_IA, CHANCELADA, COM_CARIMBO · render TypeChip, Tag, Due, Spark, SealBadge, DecisionThread (nós por classe), Stamp

  Note over U,EV: CA08 — tema e skin
  U->>FE: escolhe tema Blueprint e skin cortiça
  FE->>C: PATCH /api/me/preferences {theme BLUEPRINT, deskSkin CORTICA, reduceMotion true}
  C->>S: PreferencesService.update(actor, form) (MeController + UserPreferences existem no main)
  S->>DB: update user_preferences
  S-->>FE: 200 → ThemeProvider data-theme=blueprint · BackgroundArt cortiça · animações desligadas
```

## 4. Máquina de estados

Entidade central: `TaskItem.coverMode` (`CoverMode`) e o `PipelineJob THUMBNAIL` que o alimenta; as etiquetas de estado (CA05) renderizam as máquinas de `TaskState` (RF41) e `ProjectStatus` (RF22), não têm máquina própria.

```mermaid
stateDiagram-v2
  state "Sem thumbnail (Skeleton)" as SEM
  [*] --> SEM: tarefa criada ou arquivo atualizado (RF4)
  SEM --> AUTO: PipelineJob THUMBNAIL OK → thumbnailUrl gerado por tipo (CA02)
  SEM --> SEM: PipelineJob FALHA → REPROCESSAR · card mostra placeholder do tipo (TypeChip)
  AUTO --> AUTO: arquivo atualizado → novo job · mosaico dos projetos recalculado (CA03)
  AUTO --> MANUAL: dono envia imagem (UploadGuard, reencode sem EXIF)
  AUTO --> IA: dono pede capa à IA → aiInferenceId · faísca ✦ (CA04)
  MANUAL --> IA: pede capa à IA
  IA --> MANUAL: substitui por imagem própria
  MANUAL --> AUTO: remove a capa manual
  IA --> AUTO: remove a capa gerada
  note right of IA
    Tooltip: gerado por IA em [AiInferenceLog.createdAt]
    revisado por [AiInferenceLog.reviewedBy] (CA04)
  end note
  note right of AUTO
    Fonte por tipo: 1ª página estilizada · mini-gráfico ·
    silhueta do desenho · monograma · favicon + captura
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FRONT["Frontend Next.js 15 · packages/ui (design system DECIA)"]
    TOK["styles/tokens.css --ws-* · 4 temas data-theme (claro · escuro · contraste · blueprint) · motion tokens (prefers-reduced-motion)"]
    GL["icons sprite ws-<nome> (66 glifos: 16 tipos de tarefa, ações, estado/prazo/IA/chancela, social)"]
    CARDS["TaskCard (TaskCardLayout · TaskComposition · TaskCardVariant) · ProjectCard (ProjectCardLayout · ProjectComposition · ProjectCardVariant) · taskVariants/projectVariants · effectiveLayout"]
    ATOMS["TypeChip · Tag · Due · Spark ✦ · Stamp · Seal · Medal · DpChip · PhaseBar · ProgressRing · Mosaic · Monogram · Counters"]
    THREAD["DecisionThread (fio: nós por MessageClass, carimbo)"]
    SHELL["ThemeProvider · SidebarNav recolhível · bottom-nav · TopBar · BackgroundArt(DeskSkin) · PostIt · SchemeView BOARD/TIMELINE/DESK"]
    FX["Confetti · encaixe animado (drag para fase) · faísca animada · EmptyState/ErrorState/Skeleton"]
    STUDIO["Estúdio de Arte do card (RF11): CardArtConfig · ArtKind · composições"]
    LAB["app/lab/design-system (Storybook leve) · api:types gerados do OpenAPI (D-21)"]
    TOK --> ATOMS --> CARDS
    GL --> ATOMS
    CARDS --> THREAD
    SHELL --> CARDS
    FX --> CARDS
    STUDIO --> CARDS
  end
  subgraph WEB["ws-web"]
    CTRL["TaskController · ProjectController · CardArtController · MeController (main: preferências)"]
  end
  subgraph APPL["ws-application"]
    TH["platform/ThumbnailService (PipelineJob THUMBNAIL)"]
    MO["projects/MosaicService (AFTER_COMMIT)"]
    CA["platform/CardArtService (card_art_json, baseRev)"]
    PR["identity/PreferencesService · AccountService (main)"]
    AIE["ai/AiEngine (THUMBNAIL · CAPA_IA)"]
    UG["security/UploadGuard (magic bytes · teto de pixels)"]
    DE["events/DomainEvents AFTER_COMMIT"]
  end
  subgraph DOM["ws-domain"]
    ENT["UserPreferences (main: theme, deskSkin, reduceMotion) · TaskItem.thumbnailUrl/coverMode/cardSkin/cardArtJson · ProjectScheme.mosaicJson/coverMode · UserSkin · Department.color/monogram (planejado)"]
  end
  subgraph INFRA["ws-infrastructure"]
    MY["persistence-mysql user_preferences · media_objects · pipeline_jobs (V2) · colunas de capa (V__rf38)"]
    S3A["storage-s3 thumbnails · capas · variants (flag storage.s3)"]
    PLAT["platform: render de 1ª página · captura de link · reencode webp"]
    AIP["ai-providers (CAPA_IA)"]
  end
  CARDS -->|REST JSON tipos gerados| CTRL
  CTRL --> TH
  CTRL --> CA
  CTRL --> PR
  DE --> TH --> MO
  TH --> AIE --> AIP
  TH --> UG
  TH --> PLAT
  TH --> S3A --> S3[("S3 / MinIO")]
  PR --> ENT --> MY --> MYSQL[("MySQL 8")]
```

## 6. Rastreabilidade

| CA | Classe | Passo | Mensagem | Transição | Componente |
|---|---|---|---|---|---|
| RF38.CA01 | `TaskType` → `TypeChip`, sprite `ws-<nome>` (16 glifos de tipo), `TaskCard` em cards/listas/busca/anexos (`TaskCardLayout`), `DecisionThread` | A2 → A3 → F1 → F2 → F3 | 40–44 | — | `GL`, `ATOMS (TypeChip)`, `CARDS` |
| RF38.CA02 | `ThumbnailService.onTaskCreatedOrUpdated/render/replaceManual/requestAiCover`, `PipelineJob THUMBNAIL`, `TaskItem.thumbnailUrl/coverUrl/coverMode`, `MediaObject.variantsJson`, `AiCapability CAPA_IA` | A1 → P1 → P2 → P3..P6 → P7 · A8 → A9 → F6 → P9 → P10 → I1 | 1–17, 18–30 | `SEM → AUTO → MANUAL / IA` | `TH`, `PLAT`, `S3A`, `AIP` |
| RF38.CA03 | `MosaicService.recompute`, `ProjectScheme.mosaicJson/coverMode MOSAICO`, `ProjectCard layout mosaic`, `Mosaic`, `ProgressRing`, borda `Department.color` | P8 | 14–15 | `AUTO → self (mosaico recalculado)` | `MO`, `ATOMS (Mosaic, ProgressRing)` |
| RF38.CA04 | `Spark` (generatedAt, model, reviewedBy), `TaskItem.aiGenerated/aiInferenceId`, `AiInferenceLog.model/createdAt/reviewedBy`, variante `GERADA_IA` | P10 → I1 · F3 | 25–30, 44 | nota de IA | `ATOMS (Spark ✦)` |
| RF38.CA05 | `Tag` (nome do estado em texto, estilos por `TaskState`/`ProjectStatus`), `Due` (âmbar ≤ 3 dias, vermelho vencido, ⚖ `legalDueAt`), variantes `PRAZO_LEGAL`, `BLOQUEADA`… | F3 | 44 | máquinas de RF41/RF22 renderizadas | `ATOMS (Tag, Due)` |
| RF38.CA06 | `Seal.artJson/issuerKind/excellence` + `SealBond APROVADA` → `Seal` (lacre dourado/azul-marinho), `Recognition.medalArtJson` → `Medal`, `FinalDecision.stampJson` → `Stamp` (VALIDADO/DEVOLVIDO, data, revisor), variantes `CHANCELADA`, `COM_CARIMBO` | F3 | 40–44 | — | `ATOMS (Seal, Medal, Stamp)` |
| RF38.CA07 | `DecisionTraceNode.classLabel` (ARGUMENTO azul · DIVERGENCIA laranja · RISCO vermelho · CONSENSO verde · PERGUNTA roxo) → `DecisionThread` | F3 | 41–44 | — | `THREAD` |
| RF38.CA08 | `UserPreferences.theme/deskSkin/reduceMotion` (existe no main), `ThemeMode` (4 temas + AUTO), `DeskSkin`, `UserSkin`, `ThemeProvider`, `BackgroundArt`, `SidebarNav` recolhível | A6 → A7 → F4 → P11 | 45–49 | — | `TOK`, `SHELL`, `PR`, `MeController` |
| RF38.CA09 | `Department.color/monogram`, `Company.logoUrl/accentColor` → `Monogram`, borda do card na cor do departamento | F3 (TaskCard/ProjectCard) | 40–44 | — | `ATOMS (Monogram)`, `CARDS` |
| RF38.CA10 | `Confetti` (decisão validada), encaixe animado (drag para fase, `SchemeView BOARD`), faísca animada (geração), `EmptyState` ilustrado, `prefers-reduced-motion` + `UserPreferences.reduceMotion` | A4 → A5 → F5 · F4 | 49 | — | `FX`, `TOK (motion)` |
