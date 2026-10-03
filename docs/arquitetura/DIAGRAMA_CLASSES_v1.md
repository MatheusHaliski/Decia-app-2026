# Diagrama de classes v1 — núcleo do Work AI / DECIA

Entidades centrais pedidas na sessão inicial: **Tarefa**, **ProjectScheme**, **ProjectTask**, **Plano Anual**, **Chancela / Vínculo / Benefício**, **DecisionTrace**, **DeciaPointsLedger**, mais a **sessão DECIA** que as liga. Atributos completos em [`TAXONOMIA.md`](TAXONOMIA.md); aqui só os que explicam as relações. Diagramas por RF em [`../diagramas/`](../diagramas/).

## 1. Acervo, projetos e planejamento (Tarefa = peça · Esquema de Projeto = look · Plano Anual = DNA)

```mermaid
classDiagram
  direction LR
  class User {
    <<entity>>
    +UUID id
    +String username
    +ProfileType profileType
    +Role role
    +UUID companyId
    +UUID departmentId
    +HypeVisibility hypeVisibility
  }
  class Department {
    <<entity>>
    +String acronym
    +String color
    +String monogram
    +UUID headUserId
  }
  class TaskItem {
    <<entity>> Tarefa
    +String title
    +TaskType type
    +TaskCategory category
    +Set~ProcessTag~ processTags
    +Set~NatureTag~ natureTags
    +AccessClassification accessClass
    +TaskState state
    +Visibility visibility
    +LocalDate dueAt
    +UUID legalDeadlineRuleId
    +SourceKind sourceKind
    +UUID originalTaskId
    +boolean offeredInCounter
    +boolean aiGenerated
    +int reuseCount
  }
  class TaskAttachment {
    <<entity>>
    +UUID mediaObjectId
    +String mimeType
    +String antivirusStatus
  }
  class ProjectScheme {
    <<entity>> Esquema de Projeto
    +String title
    +String objective
    +SchemeOrigin origin
    +CreationMode creationMode
    +ProjectStatus status
    +ProjectPhase currentPhase
    +Visibility visibility
    +int exerciseYear
    +UUID planAxisId
    +UUID sourceSessionId
    +BigDecimal conformityPercent
    +JSON evmJson
  }
  class ProjectTask {
    <<entity>> ligação tarefa x projeto
    +ProjectPhase phase
    +int sortOrder
    +UUID responsibleId
    +LocalDate dueAt
    +BigDecimal pertO_M_P
    +boolean isCritical
    +JSON snapshotJson
    +boolean removedByAuthor
    +canvasX_Y_scale_rotation
  }
  class ProjectTaskDependency {
    <<entity>>
    +UUID predecessorId
    +UUID successorId
    +String type FS SS FF SF
  }
  class ProjectVersion {
    <<entity>>
    +int versionNumber
    +JSON diffJson
  }
  class AnnualPlan {
    <<entity>> Plano Anual / Trilha
    +PlanScope scope
    +int exerciseYear
    +String title
    +UUID derivedFromPlanId
  }
  class PlanAxis {
    <<entity>> eixo (6 por plano)
    +int position
    +String name
    +String goal
    +String indicator
    +String color
  }
  class Grouping {
    <<entity>> Programa Exercicio Gestao Frente
    +GroupingType type
    +String label
    +int periodFrom
    +int periodTo
  }
  class ProcessKit {
    <<entity>> Kit de Processo
    +String name
    +ProcessTag processTag
  }

  User "1" --> "*" TaskItem : owner
  Department "1" --> "*" TaskItem
  TaskItem "1" --> "*" TaskAttachment
  TaskItem "0..1" --> "*" TaskItem : originalTaskId (remix / extraída)
  User "1" --> "*" ProjectScheme : owner
  ProjectScheme "1" *-- "*" ProjectTask
  ProjectTask "*" --> "0..1" TaskItem : taskId (snapshot se excluída)
  ProjectScheme "1" *-- "*" ProjectTaskDependency
  ProjectScheme "1" *-- "*" ProjectVersion
  AnnualPlan "1" *-- "6" PlanAxis
  PlanAxis "1" --> "*" ProjectScheme : PlanAxisProject (1 eixo por plano)
  AnnualPlan "0..1" --> "*" AnnualPlan : derivedFromPlanId
  Grouping "1" --> "*" ProjectScheme : GroupingItem
  Grouping "1" --> "*" TaskItem : GroupingItem
  ProcessKit "1" --> "*" TaskItem : KitItem
```

## 2. Sessão DECIA e Rastro de Decisão (hub do app, RF4–RF17, RF29)

```mermaid
classDiagram
  direction TB
  class DeciaSession {
    <<entity>>
    +String topic
    +UUID adminUserId
    +SessionAccess accessMode
    +SessionStatus status
    +AiMode aiMode
    +UUID linkedProjectId
    +int messageTtlDays
  }
  class SessionParticipant {
    <<entity>>
    +ParticipantRole role
    +boolean canReplyDivergence
  }
  class SessionMessage {
    <<entity>> Cassandra messages_by_session
    +TIMEUUID id
    +String authorKind HUMANO IA
    +String bodyMd
    +Instant sentAt
  }
  class MessageClassification {
    <<entity>>
    +MessageClass label
    +BigDecimal confidence
    +boolean hasEvidence
    +UUID linkedTaskId
    +UUID aiInferenceId
  }
  class MessageAttachment {
    <<entity>>
    +TargetType targetType
    +UUID targetId
    +boolean usedInDecision
  }
  class Divergence {
    <<entity>>
    +String status ABERTA EM_RESPOSTA RESOLVIDA
  }
  class AiQuestion {
    <<entity>>
    +String kind RISCO PONTO_CRITICO
    +String status
  }
  class AnalyticalSummary {
    <<entity>>
    +JSON argumentsJson
    +JSON recommendationsJson
    +JSON evaluationCriteriaJson
    +UUID complianceResultId
  }
  class SummaryScenario {
    <<entity>>
    +JSON advantagesJson
    +JSON disadvantagesJson
    +UUID linkedProjectScenarioId
  }
  class FinalDecision {
    <<entity>>
    +String decisionText
    +DecisionStatus status
    +boolean proposedByAi
    +UUID resultingTaskId
    +JSON stampJson VALIDADO DEVOLVIDO
  }
  class DecisionReview {
    <<entity>>
    +UUID reviewerId
    +String outcome
    +String reason
  }
  class ReopenRequest {
    <<entity>>
    +String justification
    +String status
  }
  class SessionArtifact {
    <<entity>>
    +String kind RELATORIO ATA CHECKLIST
    +UUID convertedTaskId
  }
  class DecisionTraceNode {
    <<entity>> append-only
    +TraceNodeType nodeType
    +UUID refId
    +MessageClass classLabel
    +UUID actorId
    +Instant at
  }
  class DecisionTraceEdge {
    <<entity>> append-only
    +String relation ORIGINOU TRANSFORMOU_EM DECIDIU REVISOU
  }
  class SessionArchive {
    <<entity>>
    +UUID exportMediaId
    +String checksum
  }

  DeciaSession "1" *-- "*" SessionParticipant
  DeciaSession "1" *-- "*" SessionMessage
  SessionMessage "1" --> "0..1" MessageClassification
  SessionMessage "1" *-- "0..5" MessageAttachment
  DeciaSession "1" *-- "*" Divergence
  Divergence "1" --> "1" SessionMessage : originMessage
  DeciaSession "1" *-- "*" AiQuestion
  DeciaSession "1" *-- "*" AnalyticalSummary
  AnalyticalSummary "1" *-- "*" SummaryScenario
  AnalyticalSummary "1" --> "0..1" FinalDecision
  FinalDecision "1" --> "0..1" DecisionReview
  FinalDecision "1" --> "*" ReopenRequest
  DeciaSession "1" *-- "*" SessionArtifact
  DeciaSession "1" --> "0..1" SessionArchive
  DeciaSession "1" *-- "*" DecisionTraceNode
  DecisionTraceNode "1" --> "*" DecisionTraceEdge : from
  DecisionTraceEdge "*" --> "1" DecisionTraceNode : to
  DeciaSession "0..1" ..> "0..1" ProjectScheme : linkedProjectId
  FinalDecision ..> TaskItem : resultingTaskId ATA_REGISTRO
  DecisionTraceNode ..> TaskItem : refId
  DecisionTraceNode ..> ProjectScheme : refId
  class ProjectScheme
  class TaskItem
```

## 3. Chancelas, benefícios, Balcão e DECIA Points (RF39, RF40, RF42)

```mermaid
classDiagram
  direction LR
  class Seal {
    <<entity>> Chancela
    +UUID issuerUserId
    +String issuerKind EMPRESA CHEFE
    +String name
    +SealTier tier
    +boolean excellence
    +Instant availableFrom
    +Instant availableUntil
    +Integer usageLimit
    +int usageCount
    +boolean autoIssued
  }
  class SealPolicy {
    <<entity>> política de concessão
    +String mode AUTO REVISAO
    +JSON criteriaJson
    +int recertifyEveryDays
    +int version
  }
  class SealBond {
    <<entity>> Vínculo de Chancela
    +TargetType targetType
    +UUID targetId
    +SealBondBasis basis
    +SealBondStatus status
    +BigDecimal confidence
    +String justification
    +boolean requiresReview
    +Boolean authorConsent
    +String sealCode
    +Instant expiresAt
  }
  class SealProposal {
    <<entity>>
    +UUID proposerId
    +String status
  }
  class Benefit {
    <<entity>> Benefício
    +BenefitType type
    +Integer totalQuota
    +int perUserLimit
    +Instant expiresAt
  }
  class BenefitRedemption {
    <<entity>> Resgate
    +String code
    +String status
    +String idempotencyKey
    +UUID ledgerEntryId
  }
  class Recognition {
    <<entity>> Reconhecimento
    +String name
    +String source MANUAL META BENEFICIO
  }
  class ModelOffer {
    <<entity>> modelo no Balcão
    +TargetType targetType
    +int pricePoints
    +ModelLicense license
    +String shelf COMUNIDADE CHANCELADO
    +boolean isHandover
  }
  class DeciaPointsLedgerEntry {
    <<entity>> DECIA Points
    +UUID userId
    +int delta
    +PointsEvent eventCode
    +String refType
    +UUID refId
    +UUID sessionId
    +BigDecimal qualityMultiplier
    +String idempotencyKey UNIQUE
    +String status CONFIRMADO SUSPENSO ESTORNADO
    +UUID counterpartyUserId
    +Instant expiresAt
  }
  class DeciaPointsRule {
    <<entity>> versionada
    +PointsEvent eventCode
    +int points
    +Integer dailyCap
    +Instant validFrom
    +Instant validTo
  }
  class StoreItem {
    <<entity>> Loja Work AI
    +StoreItemKind kind
    +int pricePoints
  }
  class StorePurchase {
    <<entity>>
    +int pricePaid
    +JSON deliveryJson
    +String idempotencyKey
  }
  class AiCreditLedgerEntry {
    <<entity>> cota de IA
    +int delta
    +String source COMPRA BENEFICIO CONSUMO
  }

  Seal "1" --> "1" SealPolicy
  Seal "1" --> "*" SealBond
  SealBond ..> TaskItem : targetId
  SealBond ..> ProjectScheme : targetId
  SealBond ..> AnnualPlan : targetId
  SealProposal ..> Seal : resultingSealId
  Seal "1" --> "*" Benefit
  Benefit "1" --> "*" BenefitRedemption
  BenefitRedemption --> SealBond : exige APROVADA vigente
  BenefitRedemption ..> DeciaPointsLedgerEntry : PONTOS_BONUS
  BenefitRedemption ..> AiCreditLedgerEntry : CREDITOS_IA
  Recognition ..> Benefit : source BENEFICIO
  ModelOffer ..> TaskItem : targetId
  ModelOffer ..> ProjectScheme : targetId
  ModelOffer ..> ProcessKit : targetId
  ModelOffer ..> DeciaPointsLedgerEntry : remix debita comprador e credita autor
  DeciaPointsRule "1" --> "*" DeciaPointsLedgerEntry : ruleVersionId
  DeciaSession ..> DeciaPointsLedgerEntry : eventos pontuáveis (AFTER_COMMIT)
  StoreItem "1" --> "*" StorePurchase
  StorePurchase --> DeciaPointsLedgerEntry : COMPRA_LOJA
  StorePurchase ..> AiCreditLedgerEntry : créditos
  class TaskItem
  class ProjectScheme
  class AnnualPlan
  class ProcessKit
  class DeciaSession
```

## 4. Reputação e eficiência (RF44, RF45) — como se ligam ao núcleo

```mermaid
classDiagram
  direction LR
  class DailyTask {
    <<entity>> Tarefa do Dia (único userId+taskDate)
    +LocalDate taskDate
    +JSON priorityIndexJson
    +JSON hsePredictedJson
    +JSON hseRealizedJson
    +DailyFeedback feedback
    +BigDecimal actualHours
  }
  class HseWeights {
    <<entity>>
    +JSON weightsJson
    +int version
  }
  class ProfileHypeScore {
    <<entity>> 0..1000 (único userId+scoreDate)
    +int score
    +String bandCode
    +JSON blocksJson
    +int halfLifeDays
    +String idempotencyKey
  }
  class DeliberativeProfile {
    <<entity>> objetivo 2
    +BigDecimal clarity
    +BigDecimal evidenceUse
    +BigDecimal consistency
    +BigDecimal completeness
    +BigDecimal reuse
  }
  class Reaction {
    <<entity>>
    +ReactionType reactionType
    +BigDecimal actorHypeAtTime
  }
  User "1" --> "*" DailyTask
  DailyTask --> TaskItem
  HseWeights ..> DailyTask : versão dos pesos
  User "1" --> "*" ProfileHypeScore
  User "1" --> "*" DeliberativeProfile
  ProfileHypeScore ..> DeciaPointsLedgerEntry : bloco Participação DECIA
  ProfileHypeScore ..> Reaction : bloco Reconhecimento social
  ProfileHypeScore ..> SealBond : bloco Reconhecimentos e chancelas
  ProfileHypeScore ..> DailyTask : bloco Eficiência (HSE médio)
  DeliberativeProfile ..> DeciaPointsLedgerEntry : multiplicador 0,5–2,0
  class User
  class TaskItem
  class DeciaPointsLedgerEntry
  class SealBond
```

## 5. Camadas (hexagonal) — onde cada classe vive

| Camada | Classes |
|---|---|
| `wai-domain` | todas as `<<entity>>` acima, enums, `*Repository` |
| `wai-application` | `AcervoService`, `TaskCreatorService`, `ProjectComposerService`, `ProjectDeskService`, `PlanService`, `GroupingService`, `DeciaSessionService`, `MessageService`, `ClassificationService`, `SummaryService`, `DecisionService`, `DecisionTraceService`, `DeciaBridgeService`, `SealService`, `SealPolicyEvaluator`, `BenefitService`, `CounterService`, `DeciaPointsService`, `StoreService`, `DailyTaskService`, `HypeScoreService`, `AiEngine`, `Guard`, `DomainEvents`; portas `AiProviderPort`, `MediaStoragePort`, `SearchIndexPort`, `EmbeddingPort`, `TimelineProjectionPort`, `NotificationProjectionPort`, `MessageStorePort`, `CounterStorePort`, `RateLimitPort`, `TokenIssuerPort`, `ExternalDocPort`, `AntivirusPort`, `OcrPort`, `CadReaderPort`, `TranscriptionPort`, `EmailSenderPort` |
| `wai-infrastructure` | `Mysql*Adapter`, `Cassandra*Adapter`, `OpenSearch*Adapter`, `Redis*Adapter`, `S3MediaStorage`, `ClaudeProvider`, `GeminiProvider`, `LocalEngine`, `GoogleWorkspaceAdapter`, `Microsoft365Adapter`, `EProtocoloAdapter` |
| `wai-web` | `AuthController`, `AccountController`, `TaskController`, `ProjectController`, `PlanController`, `GroupingController`, `DeciaSessionController`, `MessageController`, `DecisionController`, `SealController`, `BenefitController`, `CounterController`, `PointsController`, `StoreController`, `DailyTaskController`, `HypeController`, `InsightsController`, `AdminController` |
