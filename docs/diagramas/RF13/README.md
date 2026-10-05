# RF13 — Utilizar a funcionalidade gerar artefato dentro de esquemas, chats, abas e feed do Work Station
**HU:** HU13 · **Sprint (board Work Station):** lista *Requisitos Funcionais* (card renumerado, sem sprint atribuída — a confirmar) · **Equivalente FAI:** RF13 artefatos automáticos do FAI (ata) — citado no card RF37 ("Ata Viva estende os artefatos automáticos do RF13"); no Work Station o escopo sai da sessão DECIA e vai para esquemas, chats de mensageria (RF46), abas e feed · **Aba/rota:** botão **Gerar artefato ✦** em `/tasks/[id]`, `/projects/[id]` (e Mesa), `/decia/[sessionId]` (aba Artefatos), `/messages/[conversationId]` (RF46), abas `/tasks`, `/search`, `/insights`, `/departments/[slug]/team` e itens do `/mural`; lista em `/me/artifacts`; API `POST /api/artifacts`
**Critérios de aceite cobertos:** RF13.CA01 · RF13.CA02 · RF13.CA03 · RF13.CA04 · RF13.CA05 · RF13.CA06 — corpo do card vazio: CAs derivados do título + HU13 + `docs/diagramas/_anterior/RF13/README.md` (RF13.CA01–CA06 da sessão: geração, EXPORT_PDF, notificação, Transformar em tarefa, Regerar, INDEXAR_MEMORIA) + RF42.CA06 (cota) + RF33.CA03 (citações), marcados **(CA a confirmar)**

> **HU13** — COMO usuário conectado dentro do Work Station POSSO clicar em gerar artefato dentro de um esquema ou chat DECIA PARA receber um arquivo produzido por IA e alinhado com os objetivos de minha equipe.

A TAXONOMIA §5.14 só prevê `SessionArtifact` (artefato **da sessão**, gerado automaticamente ao validar a decisão). Este RF **propõe** ampliá-lo para **`GeneratedArtifact`** (tabela `generated_artifacts`), com **origem** `ArtifactOrigin` (ESQUEMA_TAREFA · ESQUEMA_PROJETO · CHAT_DECIA · CHAT_MENSAGERIA · ABA · FEED), pedido explícito do usuário (`requestedBy`, `instruction`) e **alinhamento com os objetivos da equipe** (`goalAlignmentJson`: eixo do `AnnualPlan` do departamento e `CollectiveGoal` abertas). `SessionArtifact` vira o caso `originType = CHAT_DECIA` (geração automática do antigo RF13 continua). Tudo o que era do antigo RF13 se mantém: `AiEngine` capability ARTEFATO, `contentMd` como fonte e PDF derivado (`PipelineJob EXPORT_PDF`), `INDEXAR_MEMORIA`, `Notification`, **Transformar em tarefa** e **Regerar**. Novo: **cota de IA** (`AiQuota`, 409 `COTA_ESGOTADA`), origem/visibilidade e DECIA Points `ARTEFATO_USADO` quando o artefato é usado numa decisão (RF42).

| CA | Enunciado (CA a confirmar) |
|---|---|
| **RF13.CA01** | Dado o usuário em um esquema (tarefa/projeto), chat (sessão DECIA ou mensageria RF46), aba (Acervo, Buscar, Insights, Minha equipe) ou item do feed/Mural, quando aciona **Gerar artefato ✦**, então escolhe o `kind` compatível com a origem (RELATORIO · ATA · CHECKLIST · RESUMO_PDF · **MINUTA_DOCUMENTO · PLANILHA · CRONOGRAMA · APRESENTACAO (propostos)**) e uma instrução (≤ 1 000); `POST /api/artifacts {originType, originId, kind, instruction}` cria `GeneratedArtifact` **(proposta)** `status = SOLICITADO` e devolve `202 {artifactId}`; a geração roda em `PipelineJob GERAR_ARTEFATO` **(tipo proposto)** com resposta esperada ≤ 30 s; kind incompatível ou instrução vazia → `422 VALIDACAO`; origem sem conteúdo (chat vazio, aba sem itens) → `409 SEM_BASE_PARA_ARTEFATO`. |
| **RF13.CA02** | Dado o job, então o serviço monta o **contexto por origem**: esquema → `TaskItem`/`ProjectScheme` + `ProjectTask`s + decisões vinculadas (`DeciaSession.linkedProjectId`); chat → `SessionMessage`s + `MessageClassification` (ou `DirectMessage`s da `DirectConversation`, TAXONOMIA §12b, RF46); aba → filtros ativos + itens visíveis; feed → `MuralEntry` alvo; sempre acrescenta os **objetivos da equipe** (`PlanAxis` do `AnnualPlan` do departamento, `CollectiveGoal` ABERTAS) em `goalAlignmentJson`; só entra o que o requerente pode ver (`canView`); `accessClass` RESTRITO/SIGILOSO em qualquer item → motor local (`result = BLOQUEADO_SIGILO` para externo) ou item mascarado. |
| **RF13.CA03** | Dado o contexto, então `AiEngine` (capability ARTEFATO, `hostRf = RF13`, `inputSummaryJson.originType`) gera `title` + `contentMd` fundamentado com citações da Memória Institucional (`Citation`; "Sem precedente" quando vazio, RF33.CA03), após `AiQuota.tryConsume` (créditos comprados antes da cota mensal; sem saldo → `409 COTA_ESGOTADA` + Loja); `AiInferenceLog` registra provider, modo (ECONOMIA/AVANCADO), tokens e `quotaSource`; o artefato carrega faísca ✦ com tooltip "gerado por IA em data" (RF38.CA04); limite de 10 gerações/hora por usuário → `429 LIMITE_GERACAO` **(proposta)**. |
| **RF13.CA04** | Dado `contentMd` salvo (`status = GERADO`), então `PipelineJob EXPORT_PDF` (ou XLSX para PLANILHA/CRONOGRAMA) renderiza o arquivo, grava em S3 (`MediaObject`) e preenche `mediaObjectId`; `PipelineJob INDEXAR_MEMORIA` indexa `InstitutionalMemoryDocument.sourceType = ARTEFATO`; falha de render mantém o `contentMd` legível e o job vai a REPROCESSAR; falha de indexação não bloqueia (RF33.CA06). |
| **RF13.CA05** | Dado o artefato pronto, então `Notification` tipo ARTEFATO vai ao requerente (e a todos os participantes quando a origem é chat, `groupKey = originId`); o artefato aparece **na origem** (painel Artefatos do esquema, aba Artefatos da sessão, mensagem SISTEMA no chat, bloco da aba, comentário do item do feed) e em `/me/artifacts`; ações: baixar (URL assinada), **Transformar em tarefa** (`TaskItem` com `sourceKind` DECIA se origem for sessão, senão TEXTO_IA; ATA → ATA_REGISTRO, RELATORIO/MINUTA → DOCUMENTO, CHECKLIST → FORMULARIO, PLANILHA → PLANILHA, CRONOGRAMA → CRONOGRAMA; `convertedTaskId`; repetir → `409 ARTEFATO_JA_CONVERTIDO`), **Regerar** com ajuste (nova linha, anterior preservada, `supersedesArtifactId`), compartilhar no Mural (RF26.CA05); anexado numa sessão e usado na decisão → `MessageAttachment.usedInDecision` e DP `ARTEFATO_USADO` (RF42). |
| **RF13.CA06** | Dado o pedido, então `403 ACESSO_NEGADO` quando o requerente não pode ver a origem (não participante da sessão/chat, item PRIVADO de terceiro, aba de gestão sem `requireDeptHead`); a visibilidade do artefato herda a da origem (`Visibility` da tarefa/projeto, participantes do chat, dono da aba); artefatos de origem SIGILOSA nunca vão ao Mural nem à Memória pública; `AuditLog` ARTIFACT_GENERATED com `correlationId`. |

## 1. Diagrama de classes

```mermaid
classDiagram
  direction LR

  class GeneratedArtifact {
    <<entity>>
    +UUID id
    +ArtifactOrigin originType
    +UUID originId
    +UUID sessionId
    +UUID requestedBy
    +UUID departmentId
    +ArtifactKind kind
    +String title
    +String instruction
    +String contentMd
    +UUID mediaObjectId
    +String goalAlignmentJson
    +String citationsJson
    +Visibility visibility
    +AccessClassification accessClass
    +ArtifactStatus status
    +Instant generatedAt
    +UUID aiInferenceId
    +Instant notifiedAt
    +UUID convertedTaskId
    +UUID supersedesArtifactId
    +String correlationId
  }
  class ArtifactOrigin {
    <<enum>>
    ESQUEMA_TAREFA
    ESQUEMA_PROJETO
    CHAT_DECIA
    CHAT_MENSAGERIA
    ABA
    FEED
  }
  class ArtifactKind {
    <<enum>>
    RELATORIO
    ATA
    CHECKLIST
    RESUMO_PDF
    MINUTA_DOCUMENTO
    PLANILHA
    CRONOGRAMA
    APRESENTACAO
  }
  class ArtifactStatus {
    <<enum>>
    SOLICITADO
    GERANDO
    GERADO
    ARQUIVO_PRONTO
    FALHA
    BLOQUEADO_SIGILO
    CONVERTIDO
    SUBSTITUIDO
  }
  class SessionArtifact {
    <<entity>>
    +UUID id
    +UUID sessionId
    +ArtifactKind kind
    +String contentMd
    +UUID convertedTaskId
  }
  class TaskItem {
    <<entity>>
    +UUID id
    +UUID ownerId
    +String title
    +TaskType type
    +TaskCategory category
    +SourceKind sourceKind
    +String sourceRef
    +AccessClassification accessClass
    +Visibility visibility
    +boolean aiGenerated
    +UUID aiInferenceId
  }
  class ProjectScheme {
    <<entity>>
    +UUID id
    +UUID ownerId
    +UUID departmentId
    +String title
    +String objective
    +UUID planAxisId
    +Visibility visibility
  }
  class DeciaSession {
    <<entity>>
    +UUID id
    +String topic
    +UUID linkedProjectId
    +SessionStatus status
    +AiMode aiMode
  }
  class SessionMessage {
    <<entity>>
    +UUID id
    +UUID sessionId
    +String bodyMd
    +UUID classificationId
  }
  class MuralEntry {
    <<entity>>
    +UUID id
    +String kind
    +String targetType
    +UUID targetId
  }
  class PlanAxis {
    <<entity>>
    +UUID id
    +UUID planId
    +String name
    +String goal
    +String indicator
  }
  class CollectiveGoal {
    <<entity>>
    +UUID id
    +UUID departmentId
    +String title
    +String criterionJson
    +GoalStatus status
  }
  class MediaObject {
    <<entity>>
    +UUID id
    +String bucket
    +String key
    +String mimeType
    +AccessClassification accessClass
  }
  class PipelineJob {
    <<entity>>
    +UUID id
    +String type
    +UUID targetId
    +PipelineJobStatus status
    +int attempts
    +String lastError
  }
  class Notification {
    <<entity>>
    +UUID recipientId
    +NotificationType type
    +String resourceType
    +UUID resourceId
    +String groupKey
  }
  class AiInferenceLog {
    <<entity>>
    +UUID id
    +AiCapability capability
    +String hostRf
    +String provider
    +String mode
    +String result
    +String quotaSource
    +String inputSummaryJson
  }
  class AiQuota {
    <<entity>>
    +String scope
    +UUID scopeId
    +String monthKey
    +int consumed
    +int purchasedCredits
  }
  class InstitutionalMemoryDocument {
    <<entity>>
    +String docId
    +String sourceType
    +UUID sourceId
    +String text
  }
  class MessageAttachment {
    <<entity>>
    +UUID messageId
    +String targetType
    +UUID targetId
    +boolean usedInDecision
  }

  class ArtifactController {
    <<controller>>
    +POST_api_artifacts(body) 202
    +GET_api_artifacts_id() 200
    +GET_api_artifacts_id_download() 302
    +POST_api_artifacts_id_regenerate(instruction) 202
    +POST_api_artifacts_id_to_task() 201
    +GET_api_me_artifacts(originType, kind, page) 200
    +GET_api_origins_type_id_artifacts() 200
  }
  class ArtifactService {
    <<service>>
    +request(actor, originType, originId, kind, instruction) GeneratedArtifact
    +generate(artifactId) GeneratedArtifact
    +regenerate(actor, artifactId, instruction) GeneratedArtifact
    +toTask(actor, artifactId) TaskItem
    +listForOrigin(viewer, originType, originId) List
    +listMine(userId, filters, page) Page
    +onDecisionValidated(event) geracao automatica CHAT_DECIA
  }
  class ArtifactContextBuilder {
    <<service>>
    +build(originType, originId, viewer) ArtifactContext
    +teamGoals(departmentId) GoalAlignment
    +maxAccessClass(context) AccessClassification
  }
  class TaskCreationService {
    <<service>>
    +createFromArtifact(artifact, actor) TaskItem
  }
  class AccessPolicy {
    <<service>>
    +canView(user, originType, originId) boolean
    +requireDeptHead(user, deptId) void
  }
  class AiEnginePort {
    <<port>>
    +generateArtifact(kind, context, instruction, accessClass) ArtifactDraft
  }
  class QuotaPort {
    <<port>>
    +tryConsume(userId, capability) QuotaSource
  }
  class MemorySearchPort {
    <<port>>
    +cite(query, filters) List~Citation~
    +index(InstitutionalMemoryDocument)
  }
  class MediaStoragePort {
    <<port>>
    +put(bucket, key, bytes) MediaObject
    +presignedUrl(mediaId) URL
  }
  class DocumentRenderPort {
    <<port>>
    +renderPdf(contentMd) bytes
    +renderXlsx(contentMd) bytes
  }
  class NotificationPort {
    <<port>>
    +notify(recipients, type, resource, groupKey)
  }
  class GeneratedArtifactRepository {
    <<adapter>>
    MySQL generated_artifacts
  }
  class PipelineJobRunner {
    <<adapter>>
    platform GERAR_ARTEFATO EXPORT_PDF INDEXAR_MEMORIA
  }

  GeneratedArtifact --> ArtifactOrigin
  GeneratedArtifact --> ArtifactKind
  GeneratedArtifact --> ArtifactStatus
  GeneratedArtifact ..> TaskItem : originId quando ESQUEMA_TAREFA
  GeneratedArtifact ..> ProjectScheme : originId quando ESQUEMA_PROJETO
  GeneratedArtifact ..> DeciaSession : originId quando CHAT_DECIA
  GeneratedArtifact ..> MuralEntry : originId quando FEED
  GeneratedArtifact ..> MediaObject : mediaObjectId
  GeneratedArtifact ..> AiInferenceLog : aiInferenceId
  GeneratedArtifact ..> TaskItem : convertedTaskId
  GeneratedArtifact ..> GeneratedArtifact : supersedesArtifactId
  GeneratedArtifact ..> PlanAxis : goalAlignmentJson
  GeneratedArtifact ..> CollectiveGoal : goalAlignmentJson
  SessionArtifact ..|> GeneratedArtifact : caso CHAT_DECIA
  DeciaSession "1" --> "*" SessionMessage
  PipelineJob ..> GeneratedArtifact : targetId
  Notification ..> GeneratedArtifact : resourceId
  InstitutionalMemoryDocument ..> GeneratedArtifact : sourceId ARTEFATO
  MessageAttachment ..> GeneratedArtifact : targetType ARTIFACT
  AiQuota ..> AiInferenceLog : quotaSource

  ArtifactController --> ArtifactService
  ArtifactService --> ArtifactContextBuilder
  ArtifactService --> AccessPolicy
  ArtifactService --> QuotaPort
  ArtifactService --> AiEnginePort
  ArtifactService --> MemorySearchPort : citacoes
  ArtifactService --> GeneratedArtifactRepository
  ArtifactService --> NotificationPort
  ArtifactService --> TaskCreationService
  ArtifactService --> PipelineJob : agenda GERAR_ARTEFATO EXPORT_PDF INDEXAR_MEMORIA
  PipelineJobRunner --> ArtifactService : generate
  PipelineJobRunner --> DocumentRenderPort
  PipelineJobRunner --> MediaStoragePort
  PipelineJobRunner --> MemorySearchPort : index

  note for GeneratedArtifact "PROPOSTA — amplia SessionArtifact (TAXONOMIA §5.14) com origem fora da sessao, pedido do usuario, alinhamento com objetivos da equipe, cota e status. Tabela generated_artifacts. sessionId nulo fora de CHAT_DECIA"
  note for ArtifactKind "RELATORIO ATA CHECKLIST RESUMO_PDF existem · MINUTA_DOCUMENTO PLANILHA CRONOGRAMA APRESENTACAO sao PROPOSTA"
  note for ArtifactStatus "PROPOSTA — SessionArtifact nao tem status · ARQUIVO_PRONTO quando EXPORT_PDF termina"
  note for ArtifactContextBuilder "contexto por origem + PlanAxis do AnnualPlan do departamento + CollectiveGoal ABERTAS = alinhado com os objetivos de minha equipe (HU13)"
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  classDef err fill:#ffe3e3,stroke:#c0392b,color:#5a1a12
  classDef ai fill:#fff3d6,stroke:#d68910,color:#5c3b00
  classDef store fill:#eef6ff,stroke:#4a4852,color:#1f2937

  subgraph L1["Ator humano · usuário conectado"]
    U1["Está em um esquema, chat, aba ou item do feed e clica Gerar artefato ✦"]
    U2["Escolhe o tipo (compatível com a origem) e escreve a instrução"]
    U3["Recebe notificação e abre o artefato na origem ou em Meus artefatos"]
    U4{"Ação?"}
    U5["Baixar"]
    U6["Transformar em tarefa"]
    U7["Regerar com ajuste"]
    U8["Compartilhar no Mural / anexar em sessão"]
    U9(["Fim"])
  end

  subgraph L2["Web/BFF (Next.js App Router)"]
    W1["ArtifactButton ✦ (tipos por origem) · ArtifactDialog (instrução ≤ 1000)"]
    W2["POST /api/artifacts {originType, originId, kind, instruction} → 202 artifactId"]
    W3["Polling GET /api/artifacts/{id} ou SSE · estado gerando com motion spark"]
    W4["ArtifactPanel na origem · /me/artifacts · MarkdownViewer enquanto o arquivo não está pronto"]
    W5["Exibe 403 ACESSO_NEGADO"]
    W6["Exibe 422 VALIDACAO · 409 SEM_BASE_PARA_ARTEFATO"]
    W7["Exibe 409 COTA_ESGOTADA (Loja) · 429 LIMITE_GERACAO"]
    W8["Exibe 409 ARTEFATO_JA_CONVERTIDO"]
  end

  subgraph L3["ws-application · ArtifactService"]
    S1{"AccessPolicy.canView(origem)?"}
    S2{"kind compatível e instrução não vazia?"}
    S3{"Origem tem conteúdo?"}
    S4{"QuotaPort.tryConsume ARTEFATO ok e menos de 10/hora?"}
    S5["INSERT generated_artifacts (SOLICITADO, visibility herdada) · PipelineJob GERAR_ARTEFATO · AuditLog"]
    S6["ArtifactContextBuilder.build por origem + teamGoals (PlanAxis, CollectiveGoal) · só itens canView"]
    S7{"maxAccessClass RESTRITO ou SIGILOSO?"}
    S8["MemorySearchPort.cite → citações (Sem precedente se vazio)"]
    S9["UPDATE generated_artifacts (GERADO, title, contentMd, citationsJson, goalAlignmentJson, aiInferenceId)"]
    S10["Agenda PipelineJob EXPORT_PDF (ou XLSX) e INDEXAR_MEMORIA"]
    S11["NotificationPort ARTEFATO (requerente, grupo se chat, groupKey = originId) · notifiedAt"]
    S12{"convertedTaskId nulo?"}
    S13["TaskCreationService.createFromArtifact (tipo por kind, sourceKind DECIA ou TEXTO_IA, aiGenerated) · convertedTaskId · status CONVERTIDO"]
    S14["regenerate: nova linha com supersedesArtifactId · anterior SUBSTITUIDO"]
    S15["Share no Mural (RF26) · MessageAttachment ARTIFACT → usedInDecision → DP ARTEFATO_USADO (RF42)"]
  end

  subgraph L4["IA (AiEngine) · capability ARTEFATO"]
    A1["Redige o artefato alinhado aos objetivos da equipe, cita fontes, estrutura por kind"]
    A2["Motor local / mascaramento · result BLOQUEADO_SIGILO para provedor externo"]
    A3["AiInferenceLog (hostRf RF13, originType, provider, mode, tokens, quotaSource) → faísca ✦"]
  end

  subgraph L5["Persistência"]
    D1[("MySQL generated_artifacts · pipeline_jobs · audit_log · ai_inference_log")]
    D2[("MySQL tasks · project_schemes · project_tasks · plan_axes · collective_goals · mural_entries")]
    D3[("Cassandra messages_by_session · notifications_by_user + MySQL notifications")]
    D4[("Redis quota:USER:id:mes · rate artifact:user:hora")]
    D5[("S3 ws-artifacts + MySQL media_objects")]
    D6[("OpenSearch ws-memory (citações e indexação ARTEFATO)")]
  end

  subgraph L6["PipelineJobRunner (assíncrono)"]
    F1["GERAR_ARTEFATO: ArtifactService.generate"]
    F2["EXPORT_PDF / XLSX: render contentMd → S3 → mediaObjectId · status ARQUIVO_PRONTO"]
    F3{"render OK?"}
    F4["REPROCESSAR com backoff · contentMd continua legível"]
    F5["INDEXAR_MEMORIA: embedding → ws-memory (sourceType ARTEFATO) · falha não bloqueia"]
  end

  U1 --> W1 --> U2 --> W2 --> S1
  S1 -->|"não"| W5 --> U9
  S1 -->|"sim"| S2
  S2 -->|"não"| W6 --> U9
  S2 -->|"sim"| S3
  S3 -->|"não"| W6
  S3 -->|"sim"| S4 --> D4
  S4 -->|"não"| W7 --> U9
  S4 -->|"sim"| S5 --> D1
  S5 --> W3
  S5 --> F1 --> S6 --> D2
  S6 --> D3
  S6 --> S7
  S7 -->|"sim"| A2 --> S9
  S7 -->|"não"| S8 --> D6
  S8 --> A1 --> A3 --> D1
  A1 --> S9 --> D1
  S9 --> S10 --> D1
  S10 --> F2 --> F3
  F3 -->|"sim"| D5
  F3 -->|"não"| F4 --> F2
  S10 --> F5 --> D6
  S9 --> S11 --> D3
  S11 --> U3 --> W4 --> U4
  U4 -->|"baixar"| U5 --> D5
  U5 --> U9
  U4 -->|"tarefa"| U6 --> S12
  S12 -->|"não"| W8 --> U9
  S12 -->|"sim"| S13 --> D2
  S13 --> U9
  U4 -->|"regerar"| U7 --> S14 --> S4
  U4 -->|"compartilhar"| U8 --> S15 --> D2
  S15 --> U9

  class W5,W6,W7,W8 err
  class A1,A2,A3 ai
  class D1,D2,D3,D4,D5,D6 store
```

## 3. Diagrama de sequência

```mermaid
sequenceDiagram
  autonumber
  actor U as Usuário
  participant FE as Next.js (App Router)
  participant C as Controller (ws-web)
  participant S as Service (ws-application)
  participant AI as AiEngine
  participant DB as Repository/MySQL
  participant CS as Cassandra
  participant OS as OpenSearch
  participant R as Redis
  participant S3 as S3
  participant EV as DomainEvents (AFTER_COMMIT)

  rect rgb(245, 242, 239)
    Note over U,EV: Caminho feliz — gera checklist a partir de um esquema de projeto, alinhado aos objetivos da equipe, e transforma em tarefa
    U->>FE: Em /projects/P1 clica Gerar artefato ✦ › CHECKLIST, instrução "checklist de licitação por fase"
    FE->>C: POST /api/artifacts {originType ESQUEMA_PROJETO, originId P1, kind CHECKLIST, instruction}
    C->>S: ArtifactService.request(actor, ESQUEMA_PROJETO, P1, CHECKLIST, instruction)
    S->>DB: SELECT project_schemes P1 (ownerId, visibility, departmentId, planAxisId) · canView
    S->>R: INCR artifact:user:{id}:{hora} (≤ 10) · GET quota:USER:{id}:{mes}
    R-->>S: dentro do limite · quotaSource MENSAL
    S->>DB: INSERT generated_artifacts (SOLICITADO, visibility herdada) · INSERT pipeline_jobs (GERAR_ARTEFATO) · INSERT audit_log
    S-->>C: 202 {artifactId A1, status SOLICITADO}
    C-->>FE: 202
    FE-->>U: Card do artefato em estado gerando (motion spark)
    Note over S,S3: PipelineJobRunner executa GERAR_ARTEFATO
    S->>DB: UPDATE generated_artifacts SET status = GERANDO
    S->>DB: SELECT project_tasks + tasks (só canView) · plan_axes do AnnualPlan do departamento · collective_goals ABERTA
    S->>DB: SELECT decia_sessions WHERE linkedProjectId = P1 · final_decisions VALIDADA
    S->>OS: search ws-memory (tema do projeto, departamento) → citações
    OS-->>S: Citation[] (ou vazio = Sem precedente)
    S->>AI: generateArtifact(CHECKLIST, contexto + goalAlignment, instruction, accessClass INTERNO)
    AI-->>S: ArtifactDraft {title, contentMd, citations, confidence}
    S->>DB: INSERT ai_inference_log (ARTEFATO, hostRf RF13, inputSummaryJson.originType, quotaSource)
    S->>R: DECR quota:USER:{id}:{mes}
    S->>DB: UPDATE generated_artifacts SET status = GERADO, title, contentMd, citationsJson, goalAlignmentJson, aiInferenceId, generatedAt
    S->>DB: INSERT pipeline_jobs (EXPORT_PDF) · INSERT pipeline_jobs (INDEXAR_MEMORIA)
    S-)EV: ArtifactGenerated(A1)
    EV->>CS: INSERT notifications_by_user (requerente, ARTEFATO, groupKey = P1)
    EV->>DB: INSERT notifications · UPDATE generated_artifacts SET notifiedAt
    Note over S,S3: PipelineJobRunner executa EXPORT_PDF e INDEXAR_MEMORIA
    S->>S3: PUT ws-artifacts/P1/A1.pdf
    S3-->>S: etag, sha256
    S->>DB: INSERT media_objects · UPDATE generated_artifacts SET mediaObjectId, status = ARQUIVO_PRONTO · pipeline_jobs OK
    S->>OS: index ws-memory {sourceType ARTEFATO, sourceId A1, text, embedding}
    FE->>C: GET /api/artifacts/A1 (polling)
    C->>S: ArtifactService.get(viewer, A1)
    S-->>C: 200 GeneratedArtifact {contentMd, mediaObjectId, citations, goalAlignment, ✦}
    C-->>FE: 200
    FE-->>U: Checklist no painel Artefatos do projeto — baixar, Transformar em tarefa, Regerar
    U->>FE: Transformar em tarefa
    FE->>C: POST /api/artifacts/A1/to-task
    C->>S: ArtifactService.toTask(actor, A1)
    S->>DB: SELECT generated_artifacts A1 (convertedTaskId IS NULL)
    S->>DB: INSERT tasks (type FORMULARIO, category FORMULARIO, sourceKind TEXTO_IA, sourceRef A1, aiGenerated, aiInferenceId)
    S->>DB: UPDATE generated_artifacts SET convertedTaskId, status = CONVERTIDO
    S-->>C: 201 TaskItem
    C-->>FE: 201
    FE-->>U: Tarefa criada no acervo — link para /tasks/[id]
  end

  alt RF13.CA06 — requerente não pode ver a origem
    FE->>C: POST /api/artifacts {CHAT_DECIA, S9}
    C->>S: request(...)
    S->>DB: SELECT session_participants WHERE sessionId = S9 AND userId = actor → vazio
    S-->>C: 403 ACESSO_NEGADO
    C-->>FE: 403
  else RF13.CA03 — sem cota e sem créditos
    S->>R: GET quota:USER:{id}:{mes} → 0 e purchasedCredits 0
    S-->>C: 409 COTA_ESGOTADA (atalho para a Loja Work Station)
    C-->>FE: 409
  else RF13.CA01 — origem sem conteúdo
    S->>CS: SELECT messages_by_session WHERE sessionId = S9 → 0 mensagens
    S-->>C: 409 SEM_BASE_PARA_ARTEFATO
    C-->>FE: 409
  else RF13.CA02 — item SIGILOSO no contexto
    S->>AI: generateArtifact(kind, contexto, instruction, accessClass SIGILOSO)
    AI-->>S: motor local · result BLOQUEADO_SIGILO para provedor externo
    S->>DB: UPDATE generated_artifacts SET status = GERADO (aviso de motor local) ou BLOQUEADO_SIGILO
  else RF13.CA04 — falha ao renderizar PDF
    S->>S: DocumentRenderPort.renderPdf(contentMd) → exceção
    S->>DB: UPDATE pipeline_jobs SET status = REPROCESSAR, attempts + 1, lastError
    Note over S,DB: contentMd continua legível na origem — retry com backoff
  else RF13.CA05 — artefato já convertido
    S->>DB: SELECT generated_artifacts A1 → convertedTaskId preenchido
    S-->>C: 409 ARTEFATO_JA_CONVERTIDO
    C-->>FE: 409
  end
```

## 4. Máquina de estados

Entidade central: **`GeneratedArtifact.status`** (enum `ArtifactStatus`, **proposta** — `SessionArtifact` da TAXONOMIA não tem status). Os jobs `EXPORT_PDF` e `INDEXAR_MEMORIA` seguem `PipelineJobStatus` (PENDENTE → RODANDO → OK | FALHA → REPROCESSAR) como no `_anterior/RF13`.

```mermaid
stateDiagram-v2
  direction LR
  [*] --> SOLICITADO : POST /api/artifacts (CA01) — cota consumida, PipelineJob GERAR_ARTEFATO
  SOLICITADO --> GERANDO : runner pega o job — contexto por origem + objetivos da equipe (CA02)
  GERANDO --> GERADO : AiEngine ARTEFATO devolve contentMd com citações (CA03)
  GERANDO --> BLOQUEADO_SIGILO : item SIGILOSO sem motor local disponível (CA02)
  GERANDO --> FALHA : erro do provedor após retries — cota estornada
  GERADO --> ARQUIVO_PRONTO : EXPORT_PDF OK — mediaObjectId (CA04)
  GERADO --> CONVERTIDO : Transformar em tarefa (CA05)
  ARQUIVO_PRONTO --> CONVERTIDO : Transformar em tarefa (CA05)
  GERADO --> SUBSTITUIDO : Regerar — nova linha com supersedesArtifactId (CA05)
  ARQUIVO_PRONTO --> SUBSTITUIDO : Regerar (CA05)
  FALHA --> SOLICITADO : usuário tenta de novo
  CONVERTIDO --> [*]
  SUBSTITUIDO --> [*]
  BLOQUEADO_SIGILO --> [*]

  note right of GERADO
    Notification ARTEFATO ao requerente (grupo se chat) — notifiedAt
    contentMd ja legivel na origem antes do PDF
    INDEXAR_MEMORIA roda em paralelo e nao muda o status
  end note
  note right of CONVERTIDO
    convertedTaskId preenchido — repetir devolve 409 ARTEFATO_JA_CONVERTIDO
    TaskItem com sourceKind DECIA (sessao) ou TEXTO_IA (demais origens)
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FE["Frontend Next.js (App Router)"]
    F1["Origens: app/tasks/[id] · app/projects/[id] (+ Mesa) · app/decia/[sessionId]/artifacts · app/messages/[conversationId] (RF46) · abas app/tasks, app/search, app/insights, app/departments/[slug]/team · app/mural (item)"]
    F2["app/me/artifacts · Meus artefatos"]
    F3["components/ui: ArtifactButton ✦ · ArtifactDialog (kind por origem, instrução) · ArtifactPanel · ArtifactCard (AiSpark, citações, alinhamento) · MarkdownViewer · ToTaskButton · RegenerateDialog · NotificationBell"]
  end

  subgraph WEB["ws-web"]
    C1["ArtifactController (POST /api/artifacts · GET /api/artifacts/{id} · .../download · .../regenerate · .../to-task · GET /api/me/artifacts · GET /api/origins/{type}/{id}/artifacts)"]
    C2["OriginAccessGuard (canView por origem · participante · requireDeptHead nas abas de gestão)"]
  end

  subgraph APP["ws-application"]
    S1["ArtifactService (request, generate, regenerate, toTask, listForOrigin, listMine, onDecisionValidated)"]
    S2["ArtifactContextBuilder (contexto por origem + PlanAxis + CollectiveGoal)"]
    S3["TaskCreationService (RF20/RF29)"]
    S4["AccessPolicy"]
    S5["AiEngine (RF43) · ARTEFATO"]
    P1["AiEnginePort"]
    P2["QuotaPort"]
    P3["MemorySearchPort (cite, index)"]
    P4["MediaStoragePort"]
    P5["DocumentRenderPort (PDF, XLSX)"]
    P6["NotificationPort"]
    P7["PipelineJobScheduler"]
  end

  subgraph DOM["ws-domain · br.gov.pr.secid.workstation"]
    D1["GeneratedArtifact* (amplia SessionArtifact) · ArtifactOrigin* · ArtifactKind (+4*) · ArtifactStatus*"]
    D2["TaskItem · ProjectScheme · ProjectTask · DeciaSession · SessionMessage · MessageClassification · MuralEntry (leitura)"]
    D3["PlanAxis · CollectiveGoal (objetivos da equipe)"]
    D4["MediaObject · PipelineJob · AiInferenceLog · AiQuota · Notification · MessageAttachment · InstitutionalMemoryDocument · Citation · AuditLog"]
  end

  subgraph INFRA["ws-infrastructure/*"]
    I1["persistence-mysql: GeneratedArtifactRepository · PipelineJobRepository · MediaObjectRepository · TaskItemRepository · PlanAxisRepository · CollectiveGoalRepository · AiInferenceLogRepository"]
    I2["persistence-cassandra: CassandraMessageAdapter (messages_by_session) · NotificationFeedAdapter"]
    I3["search-opensearch: OpenSearchMemoryAdapter (ws-memory: cite + index)"]
    I4["cache-redis: RedisQuotaAdapter (quota:*) · RateLimitAdapter (artifact:user:hora)"]
    I5["storage-s3: S3MediaAdapter (bucket ws-artifacts, URL assinada)"]
    I6["ai-providers: ClaudeAdapter · GeminiAdapter · LocalEngine (BLOQUEADO_SIGILO)"]
    I7["platform: PipelineJobRunner (GERAR_ARTEFATO*, EXPORT_PDF, INDEXAR_MEMORIA) · DocumentRenderAdapter · OutboxRelay · NotificationAdapter"]
  end

  subgraph EXT["Serviços externos"]
    X1["Claude / Gemini"]
  end

  MY[("MySQL 8")]
  CA[("Cassandra")]
  OS[("OpenSearch")]
  RD[("Redis")]
  S3[("S3 / MinIO")]

  F1 --> F3
  F2 --> F3
  F3 -->|"HTTPS/JSON"| C1 --> C2 --> S1
  S1 --> S2
  S1 --> S3
  S1 --> S4
  S1 --> P1 --> S5
  S1 --> P2
  S1 --> P3
  S1 --> P6
  S1 --> P7
  P7 -.->|"jobs"| I7
  I7 --> P4
  I7 --> P5
  I7 --> P3
  S1 --> D1
  S2 --> D2
  S2 --> D3
  S3 --> D2
  S1 --> D4
  S5 -.-> I6 --> X1
  P2 -.-> I4 --> RD
  P3 -.-> I3 --> OS
  P4 -.-> I5 --> S3
  P6 -.-> I2
  S2 -.-> I2
  S1 --> I1 --> MY
  I2 --> CA
```

*Legenda: `*` = proposta (fora da TAXONOMIA v1).*

## 6. Rastreabilidade

| CA | Classe | Passo (atividades) | Mensagem (sequência) | Transição (estados) | Componente |
|---|---|---|---|---|---|
| RF13.CA01 | `GeneratedArtifact` (proposta: originType, originId, kind, instruction, status), enums `ArtifactOrigin`, `ArtifactKind` (+4 propostos), `ArtifactController.POST_api_artifacts`, `ArtifactService.request`, `PipelineJob` GERAR_ARTEFATO | U1, U2, W1, W2, S2, S3, S5, W6 | 1–10; `alt` 409 SEM_BASE_PARA_ARTEFATO | `[*] → SOLICITADO` | `ArtifactButton`, `ArtifactDialog`, `ArtifactController`, `GeneratedArtifactRepository`, `PipelineJobRunner` |
| RF13.CA02 | `ArtifactContextBuilder.build/teamGoals/maxAccessClass`, `PlanAxis`, `CollectiveGoal`, `GeneratedArtifact.goalAlignmentJson`, `DeciaSession.linkedProjectId`, `SessionMessage`, `MuralEntry`, `AccessPolicy.canView` | S6, S7, A2, D2, D3 | 12–14; `alt` SIGILOSO | `SOLICITADO → GERANDO`, `GERANDO → BLOQUEADO_SIGILO` | `ArtifactContextBuilder`, `CassandraMessageAdapter`, `PlanAxisRepository`, `CollectiveGoalRepository`, `LocalEngine` |
| RF13.CA03 | `AiEnginePort.generateArtifact`, `AiInferenceLog` (ARTEFATO, hostRf RF13, quotaSource), `AiQuota`, `QuotaPort`, `MemorySearchPort.cite`, `Citation`, `GeneratedArtifact.citationsJson/aiInferenceId` | S4, S8, A1, A3, W7, D4 | 5–6, 15–20; `alt` 409 COTA_ESGOTADA | `GERANDO → GERADO`, `GERANDO → FALHA` | `AiEngine ARTEFATO`, `ClaudeAdapter/GeminiAdapter`, `RedisQuotaAdapter`, `RateLimitAdapter`, `OpenSearchMemoryAdapter`, `AiSpark` |
| RF13.CA04 | `PipelineJob` EXPORT_PDF / INDEXAR_MEMORIA, `MediaObject`, `GeneratedArtifact.mediaObjectId`, `DocumentRenderPort`, `MediaStoragePort`, `InstitutionalMemoryDocument` (ARTEFATO) | S10, F2–F5, D5, D6 | 21, 26–30; `alt` REPROCESSAR | `GERADO → ARQUIVO_PRONTO` | `PipelineJobRunner`, `DocumentRenderAdapter`, `S3MediaAdapter`, `OpenSearchMemoryAdapter` |
| RF13.CA05 | `Notification` (ARTEFATO, groupKey = originId), `GeneratedArtifact.notifiedAt/convertedTaskId/supersedesArtifactId`, `ArtifactService.toTask/regenerate/listForOrigin/listMine`, `TaskCreationService.createFromArtifact`, `TaskItem.sourceKind` (DECIA / TEXTO_IA), `MessageAttachment.usedInDecision` | S11, U3–U8, W4, S12–S15, W8 | 22–24, 31–44; `alt` 409 ARTEFATO_JA_CONVERTIDO | `GERADO/ARQUIVO_PRONTO → CONVERTIDO`, `→ SUBSTITUIDO`; nota de GERADO | `ArtifactPanel`, `ArtifactCard`, `ToTaskButton`, `RegenerateDialog`, `app/me/artifacts`, `NotificationFeedAdapter`, `TaskCreationService` |
| RF13.CA06 | `AccessPolicy.canView/requireDeptHead`, `OriginAccessGuard`, `GeneratedArtifact.visibility/accessClass`, `AuditLog` ARTIFACT_GENERATED | S1, W5, S5 | 4; `alt` 403 ACESSO_NEGADO | nota de GERADO (SIGILOSO não vai ao Mural nem à Memória pública) | `OriginAccessGuard`, `AccessPolicy`, `AuditLogRepository` |

**Dúvidas para confirmar:** (a) ampliar `SessionArtifact` para `GeneratedArtifact` (tabela nova) ou acrescentar `originType/originId/requestedBy` à tabela `session_artifacts` existente; (b) novos `ArtifactKind` (MINUTA_DOCUMENTO, PLANILHA, CRONOGRAMA, APRESENTACAO) e seus renderizadores (XLSX/PPTX); (c) "alinhado com os objetivos de minha equipe" = `PlanAxis` do plano do departamento + `CollectiveGoal` ABERTAS (ou também `Insight` EQUIPE do RF43); (d) geração a partir de **abas** e **feed**: quais abas e o que é o "contexto" de um item do feed; (e) cota: usa a `AiQuota` mensal do usuário (RF42.CA06) e o limite 10/hora; (f) o artefato gerado fora da sessão também pontua DP (`ARTEFATO_USADO` só quando usado em decisão); (g) sprint do card.


Tela/aba: `/messages/[conversationId]` (esqueleto em `app/(shell)/messages/[conversationId]/page.tsx`) · `/tasks` (esqueleto em `app/(shell)/tasks/page.tsx`) · `/tasks/[id]` (esqueleto em `app/(shell)/tasks/[id]/page.tsx`) · `/projects/[id]` (esqueleto em `app/(shell)/projects/[id]/page.tsx`) · `/decia/[sessionId]` (esqueleto em `app/(shell)/decia/[sessionId]/page.tsx`)
