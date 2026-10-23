# RF34 — Extrair informações de desenhos técnicos e documentos (dwg/dxf/ifc/glb/pdf) com IA para gerar quantitativos, planilha orçamentária e cronograma pré-preenchidos
**HU:** HU34 · **Sprint (board Work Station):** Product Backlog (não comprometido na Sprint 4) · **Equivalente FAI:** pipelines de imagem do RF4 (Flat Lay, Estúdio, filtro de logos) e RF16 Geração 3D · **Aba/rota:** ação **Extrair com IA** no detalhe da tarefa DESENHO_TECNICO / DOCUMENTO (`/tasks/[id]`, painel `ExtractionPanel`), visualizador 3D (`/tasks/[id]/viewer`), resultado vira tarefa PLANILHA/CRONOGRAMA no mesmo projeto (RF4/RF5)
**Critérios de aceite cobertos:** RF34.CA01 · CA02 · CA03 · CA04 · CA05 · CA06 (corpo do card, inalterado) — regra: o **título do card** define o RF e o corpo traz os próprios CAs.

`ExtractionResult` (kind QUANTITATIVOS · ITENS_PRAZOS · ESTRUTURAL; `rowsJson` com confiança por linha; `layersJson`; `status` `ExtractionStatus` PROCESSANDO · PRONTA · REVISADA · CONVERTIDA · FALHA) nasce de uma `TaskItem` DESENHO_TECNICO (.dwg/.dxf/.ifc) ou DOCUMENTO (.pdf/.docx). A leitura **estrutural** (camadas/blocos/entidades, OCR) é feita pelo `platform` (parsers + OCR) e pelo `LocalEngine`; a **interpretação semântica** (item, unidade, quantidade, datas, responsáveis) usa `AiEngine` capabilities `EXTRAIR_DESENHO`/`EXTRAIR_DOCUMENTO`; sem provedor externo só a estrutural, com aviso (CA06). O arquivo passa por `OwnMedia` (`restricted/` quando RESTRITO/SIGILOSO), magic bytes, limite por formato e **teto de pixels** antes de alocar (SEG). Correções do usuário (`ExtractionCorrection`) ficam por departamento e alimentam as próximas extrações (few-shot/regras locais). Converter cria `TaskItem` PLANILHA (PLANILHA_ORCAMENTARIA) ou CRONOGRAMA com `sourceKind EXTRACAO`, `originalTaskId` = tarefa de origem, faísca ✦, e `ProjectTask` no mesmo projeto.

## 0. Diagrama de casos de uso

Casos de uso derivados dos CAs. Todos são planejados: o detalhe da tarefa existe, mas não há `ExtractionPanel`, visualizador 3D nem `ExtractionService`. Só o dono da tarefa extrai.

```mermaid
flowchart LR
  classDef ator fill:#fde7d3,stroke:#b4531a,color:#1b1b1b
  classDef atorSis fill:#f1ecf9,stroke:#6a4bb3,color:#1b1b1b
  classDef uc fill:#ffffff,stroke:#3557a6,color:#1b1b1b
  classDef ucPlan fill:#ffffff,stroke:#8a8a8a,stroke-dasharray:4 3,color:#555555
  dono["«ator» Dono do recurso"]:::ator
  subgraph SIS["Work Station — RF34 Extração com IA"]
    direction TB
    UC1(["UC1 Extrair quantitativos de desenho técnico"]):::ucPlan
    UC2(["UC2 Extrair itens e prazos de documento"]):::ucPlan
    UC3(["UC3 Fazer só a leitura estrutural, sem IA externa"]):::ucPlan
    UC4(["UC4 Revisar e corrigir a tabela extraída"]):::ucPlan
    UC5(["UC5 Converter em planilha orçamentária ou cronograma"]):::ucPlan
    UC6(["UC6 Medir e capturar no visualizador 3D"]):::ucPlan
  end
  ia["«ator» IA (AiGateway)"]:::atorSis
  dono --- UC1
  dono --- UC2
  dono --- UC4
  dono --- UC5
  dono --- UC6
  UC3 -. "«extend»" .-> UC1
  UC3 -. "«extend»" .-> UC2
  UC1 --- ia
  UC2 --- ia
```

| Caso de uso | Ator(es) | CAs | Situação |
|---|---|---|---|
| UC1 Extrair quantitativos de desenho técnico | `dono`, `ia` | RF34.CA01 | planejado |
| UC2 Extrair itens e prazos de documento | `dono`, `ia` | RF34.CA02 | planejado |
| UC3 Fazer só a leitura estrutural, sem IA externa | — (estende UC2) | RF34.CA06 | planejado |
| UC4 Revisar e corrigir a tabela extraída | `dono` | RF34.CA04 | planejado |
| UC5 Converter em planilha orçamentária ou cronograma | `dono` | RF34.CA03 | planejado |
| UC6 Medir e capturar no visualizador 3D | `dono` | RF34.CA05 | planejado |

## 1. Diagrama de classes

```mermaid
classDiagram
direction LR

namespace ws_domain_ia {
  class ExtractionResult {
    <<entity>>
    +id: UUID
    +taskId: UUID
    +kind: ExtractionKind
    +rowsJson: JSON
    +layersJson: JSON
    +derivedTaskId: UUID
    +status: ExtractionStatus
    +aiInferenceId: UUID
  }
  class ExtractionCorrection {
    <<entity>>
    +id: UUID
    +extractionId: UUID
    +rowIndex: int
    +field: String
    +oldValue: String
    +newValue: String
    +userId: UUID
    +departmentId: UUID
    +at: Instant
  }
  class AiInferenceLog {
    <<entity>>
    +capability: AiCapability
    +provider: AiProvider
    +model: String
    +latencyMs: int
    +estimatedCostUsd: BigDecimal
    +result: InferenceResult
    +fallbackUsed: boolean
  }
  class ExtractionKind {
    <<enum>>
    QUANTITATIVOS
    ITENS_PRAZOS
    ESTRUTURAL
  }
  class ExtractionStatus {
    <<enum>>
    PROCESSANDO
    PRONTA
    REVISADA
    CONVERTIDA
    FALHA
  }
}

namespace ws_domain_acervo {
  class TaskItem {
    <<entity>>
    +id: UUID
    +ownerId: UUID
    +departmentId: UUID
    +title: String
    +type: TaskType
    +category: TaskCategory
    +format: String
    +accessClass: AccessClassification
    +state: TaskState
    +sourceKind: SourceKind
    +originalTaskId: UUID
    +aiGenerated: boolean
    +aiInferenceId: UUID
    .. +45 campos ..
  }
  class TaskAttachment {
    <<entity>>
    +id: UUID
    +taskId: UUID
    +mediaObjectId: UUID
    +mimeType: String
    +sizeBytes: long
    +sha256: String
    +antivirusStatus: String
    +ocrStatus: String
    +ocrTextRef: String
    +isPrimary: boolean
  }
  class Evidence {
    <<entity>>
    +ownerId: UUID
    +mediaObjectId: UUID
    +linkedTaskId: UUID
    +studioStatus: StudioStatus
    +derivedTaskId: UUID
  }
  class ProjectTask {
    <<entity>>
    +projectId: UUID
    +taskId: UUID
    +phase: ProjectPhase
  }
}

namespace ws_domain_platform {
  class MediaObject {
    <<entity>>
    +id: UUID
    +bucket: String
    +objectKey: String
    +mimeType: String
    +sizeBytes: long
    +sha256: String
    +ownerId: UUID
    +accessClass: String
    +variantsJson: JSON
  }
  class PipelineJob {
    <<entity>>
    +type: String
    +targetId: UUID
    +status: PipelineJobStatus
  }
}

namespace ws_application {
  class ExtractionService {
    <<service>>
    +extractQuantities(actor, taskId) ExtractionResult
    +extractItemsAndDeadlines(actor, taskId) ExtractionResult
    +review(actor, extractionId, corrections) ExtractionResult
    +convert(actor, extractionId, targetType, projectId) TaskItem
    +captureFromViewer(actor, taskId, image) Evidence
  }
  class StructuralReader {
    <<service>>
    +readCad(media) Layers
    +readIfc(media) Entities
    +readPdf(media) Text
  }
  class TaskService {
    <<service>>
    +createDerived(actor, TaskForm, originalTaskId) TaskItem
  }
  class OwnMedia {
    <<service>>
    +requireAccess(actor, MediaObject)
  }
  class UploadGuard {
    <<service>>
    +checkMagicBytes(bytes)
    +checkPixelCeiling(width, height)
    +checkSizeByFormat(format, size)
  }
  class AiEngine {
    <<service>>
    +run(AiRequest) AiResponse
  }
  class Guard {
    <<service>>
    +requireOwner(actor, ownerId)
  }
  class StoragePort {
    <<port>>
    +get(key)
    +put(key, bytes)
  }
  class OcrPort {
    <<port>>
    +ocr(media) Text
  }
  class JobPort {
    <<port>>
    +enqueue(PipelineJob)
  }
}

namespace ws_web {
  class ExtractionController {
    <<controller>>
    +POST_api_tasks_id_extract(kind)
    +GET_api_extractions_id()
    +PATCH_api_extractions_id_rows(corrections)
    +POST_api_extractions_id_convert(targetType, projectId)
    +POST_api_tasks_id_viewer_capture(image)
  }
}

namespace ws_infrastructure {
  class S3StorageAdapter {
    <<adapter>>
  }
  class PlatformOcrAdapter {
    <<adapter>>
  }
  class CadParserAdapter {
    <<adapter>>
  }
  class LocalEngine {
    <<adapter>>
  }
}

TaskItem "1" o-- "0..*" TaskAttachment
TaskAttachment "1" --> "1" MediaObject
TaskItem "1" o-- "0..*" ExtractionResult : extracoes
ExtractionResult "1" o-- "0..*" ExtractionCorrection
ExtractionResult "0..1" --> "0..1" TaskItem : derivedTaskId PLANILHA CRONOGRAMA
TaskItem "0..*" --> "0..1" TaskItem : originalTaskId
Evidence "0..1" --> "0..1" TaskItem : derivedTaskId IMAGEM_EDITADA
ProjectTask "0..*" --> "1" TaskItem
PipelineJob ..> ExtractionResult : OCR TRANSCRICAO
ExtractionController --> ExtractionService
ExtractionService --> StructuralReader
ExtractionService --> TaskService
ExtractionService --> OwnMedia
ExtractionService --> UploadGuard
ExtractionService --> AiEngine
ExtractionService --> Guard
ExtractionService --> JobPort
StructuralReader --> StoragePort
StructuralReader --> OcrPort
AiEngine ..> AiInferenceLog
S3StorageAdapter ..|> StoragePort
PlatformOcrAdapter ..|> OcrPort
CadParserAdapter ..> StructuralReader
LocalEngine ..> AiEngine : leitura estrutural sem semantica
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph ATOR["Ator (EMPREGADO dono da tarefa)"]
    A0([Abre /tasks/id DESENHO_TECNICO ou DOCUMENTO]) --> A1{"Ação"}
    A1 -->|dwg dxf ifc| A2["Extrair quantitativos"]
    A1 -->|pdf docx| A3["Extrair itens e prazos"]
    A1 -->|glb| A4["Abre visualizador 3D, mede distância/área, captura"]
    A5["Revisa e corrige a tabela"]
    A6{"Converter?"}
    A6 -->|PLANILHA| A7["Nova tarefa PLANILHA no mesmo projeto"]
    A6 -->|CRONOGRAMA| A8["Nova tarefa CRONOGRAMA no mesmo projeto"]
  end

  subgraph FE["Next.js / BFF (app/(shell)/tasks/[id] · tasks/[id]/viewer)"]
    F1["POST /api/tasks/{id}/extract?kind="]
    F2["ExtractionPanel: tabela editável com confiança por linha · Spark ✦ · banner de fallback"]
    F3["PATCH /api/extractions/{id}/rows"]
    F4["POST /api/extractions/{id}/convert"]
    F5["Viewer3D (glb) · POST /tasks/{id}/viewer/capture"]
  end

  subgraph WEB["ws-web · ExtractionController"]
    W1["JWT · CorrelationIdFilter · rate limit por usuário"]
    W2["GlobalExceptionHandler"]
  end

  subgraph APP["ws-application · ExtractionService"]
    P1{"Guard.requireOwner(tarefa) e OwnMedia(anexo)?"}
    P1 -->|não| E1["403 ACESSO_NEGADO"]
    P2{"Tipo/formato compatível com a ação?"}
    P2 -->|não| E2["422 VALIDACAO details.kind"]
    P3["UploadGuard: magic bytes · limite por formato · teto de pixels antes de alocar (SEG)"]
    P3 -->|falha| E3["422 ARQUIVO_INVALIDO"]
    P4["ExtractionResult PROCESSANDO · PipelineJob"]
    P5["StructuralReader: camadas/blocos/entidades (CAD/IFC) ou texto + OCR (PDF)"]
    P6{"accessClass RESTRITO/SIGILOSO ou sem chave externa?"}
    P6 -->|sim| P7["Só leitura estrutural (ESTRUTURAL) · aviso ao usuário"]
    P6 -->|não| P8["Masking + interpretação semântica pela IA"]
    P9["rowsJson com confiança por linha · status PRONTA"]
    P10["Grava ExtractionCorrection por célula alterada (departmentId) · status REVISADA"]
    P11["TaskService.createDerived: PLANILHA (PLANILHA_ORCAMENTARIA) ou CRONOGRAMA · sourceKind EXTRACAO · originalTaskId · aiGenerated · ProjectTask no mesmo projeto · status CONVERTIDA"]
    P12["captureFromViewer → Evidence → tarefa IMAGEM_EDITADA via Estúdio (RF4)"]
  end

  subgraph IA["AiEngine (EXTRAIR_DESENHO · EXTRAIR_DOCUMENTO)"]
    I1["Claude → Gemini → LocalEngine (estrutural)"]
    I2["Usa correções anteriores do departamento como exemplos"]
    I3["AiInferenceLog (modelo, custo, latência, fallbackUsed)"]
  end

  subgraph DB["Persistência"]
    D1[("MySQL extraction_results · extraction_corrections · tasks · project_tasks · evidences · ai_inference_log · pipeline_jobs")]
    D2[("S3 anexos (restricted/ para RESTRITO/SIGILOSO) · flag storage.s3")]
    D3[("OpenSearch ocrTextRef · flag opensearch.enabled")]
  end

  A2 --> F1 --> W1 --> P1 -->|sim| P2 -->|sim| P3 --> P4 --> D1
  A3 --> F1
  P4 --> P5 --> D2
  P5 --> D3
  P5 --> P6
  P7 --> P9
  P8 --> I1 --> I2 --> I3 --> P9 --> D1 --> F2 --> A5 --> F3 --> W1 --> P10 --> D1
  A5 --> A6
  A7 --> F4 --> W1 --> P11 --> D1
  A8 --> F4
  A4 --> F5 --> W1 --> P12 --> D1
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
  participant S3 as S3
  participant EV as DomainEvents (AFTER_COMMIT)

  U->>FE: Extrair quantitativos no .dxf
  FE->>C: POST /api/tasks/{id}/extract?kind=QUANTITATIVOS
  C->>S: ExtractionService.extractQuantities(actor, taskId)
  S->>S: Guard.requireOwner + OwnMedia(anexo principal)
  alt não é dono ou anexo em restricted/ sem acesso
    S-->>C: 403 ACESSO_NEGADO
  else tipo não é DESENHO_TECNICO
    S-->>C: 422 VALIDACAO details.kind
  else ok
    S->>S3: get anexo (magic bytes, limite por formato, teto de pixels)
    S->>DB: insert extraction_results (PROCESSANDO) + pipeline_jobs
    S-->>C: 202 extractionId
  end
  S->>S: StructuralReader.readCad → camadas e entidades (layersJson)
  alt accessClass RESTRITO/SIGILOSO ou sem chave externa
    S->>AI: run(EXTRAIR_DESENHO, LocalEngine only)
    AI-->>S: tabela estrutural sem interpretação semântica · fallbackUsed
    S->>DB: extraction_results kind ESTRUTURAL, status PRONTA · aviso
  else provedor externo
    S->>DB: load extraction_corrections do departamento (exemplos)
    S->>AI: run(EXTRAIR_DESENHO, camadas mascaradas + exemplos)
    AI->>AI: Claude → fallback Gemini → fallback LocalEngine
    AI-->>S: rows (item, unidade, quantidade, área/volume, confiança por linha) ✦
    S->>DB: extraction_results rowsJson, status PRONTA
  end
  AI->>DB: insert ai_inference_log (modelo, custo, latência)
  S->>EV: ExtractionReady → Notification
  FE->>C: GET /api/extractions/{id}
  C-->>FE: ExtractionResult para a tabela editável

  U->>FE: corrige 2 linhas
  FE->>C: PATCH /api/extractions/{id}/rows {corrections}
  C->>S: ExtractionService.review(actor, id, corrections)
  S->>DB: insert extraction_corrections (old, new, userId, departmentId) · status REVISADA
  S-->>FE: 200

  U->>FE: Converter em PLANILHA no projeto X
  FE->>C: POST /api/extractions/{id}/convert {PLANILHA, projectId}
  C->>S: ExtractionService.convert(actor, id, PLANILHA, projectId)
  S->>S: Guard.requireOwner(projeto) ou membro responsável
  S->>DB: insert tasks (PLANILHA, PLANILHA_ORCAMENTARIA, sourceKind EXTRACAO, originalTaskId, aiGenerated, aiInferenceId) + project_tasks
  S->>DB: extraction_results derivedTaskId, status CONVERTIDA
  S->>EV: TaskCreated → PipelineJob THUMBNAIL · reuseCount da origem
  S-->>FE: 201 TaskItem com Spark ✦

  U->>FE: abre .glb no visualizador, mede e captura
  FE->>C: POST /api/tasks/{id}/viewer/capture (imagem)
  C->>S: ExtractionService.captureFromViewer(actor, taskId, image)
  S->>S: UploadGuard (magic bytes, teto de pixels, reencode sem EXIF)
  S->>S3: put evidences/{id}.webp
  S->>DB: insert evidences (linkedTaskId, studioStatus ORIGINAL)
  S-->>FE: 201 Evidence (vira IMAGEM_EDITADA pelo Estúdio, RF4)
```

## 4. Máquina de estados

Entidade central: `ExtractionResult.status` (`ExtractionStatus`).

```mermaid
stateDiagram-v2
  [*] --> PROCESSANDO: POST /extract (CA01, CA02) · PipelineJob
  PROCESSANDO --> PRONTA: leitura estrutural + interpretação IA (ou só estrutural com aviso, CA06) · rows com confiança
  PROCESSANDO --> FALHA: arquivo corrompido, parser ou OCR falhou · ai_inference_log ERRO
  FALHA --> PROCESSANDO: tentar de novo
  PRONTA --> REVISADA: usuário corrige células → ExtractionCorrection por departamento (CA04)
  REVISADA --> REVISADA: novas correções
  PRONTA --> CONVERTIDA: converter em PLANILHA ou CRONOGRAMA (CA03)
  REVISADA --> CONVERTIDA: converter em PLANILHA ou CRONOGRAMA (CA03)
  CONVERTIDA --> [*]
  FALHA --> [*]
  note right of CONVERTIDA
    derivedTaskId aponta para a nova tarefa com
    sourceKind EXTRACAO, originalTaskId e faísca ✦.
  end note
  note right of PRONTA
    kind ESTRUTURAL quando só o LocalEngine leu
    (RESTRITO/SIGILOSO ou sem chave externa).
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FRONT["Frontend Next.js 15"]
    R1["app/(shell)/tasks/[id] (ação Extrair com IA) · tasks/[id]/viewer (glb)"]
    R2["components: ExtractionPanel (tabela editável, confiança) · Viewer3D · TypeChip · Spark ✦ · Toast (fallback) · Button"]
    BFF["app/bff"]
    R1 --> R2 --> BFF
  end
  subgraph WEB["ws-web"]
    EC["ExtractionController (@Operation RF34.CA01-CA06)"]
    SEC["SecurityConfig · CorrelationIdFilter · GlobalExceptionHandler (main)"]
  end
  subgraph APPL["ws-application"]
    ES["acervo/ExtractionService"]
    SR["acervo/StructuralReader"]
    TS["acervo/TaskService (RF4)"]
    OM["security/OwnMedia (restricted/)"]
    UG["security/UploadGuard (magic bytes · teto de pixels)"]
    AIE["ai/AiEngine (EXTRAIR_DESENHO · EXTRAIR_DOCUMENTO) · Masking (main) · AiBudget"]
    GD["security/Guard (main)"]
    DE["events/DomainEvents AFTER_COMMIT"]
    PORTS["ports: StoragePort · OcrPort · JobPort · AiProviderPort"]
  end
  subgraph DOM["ws-domain"]
    ENT["ExtractionResult · ExtractionCorrection · ExtractionStatus · TaskItem · TaskAttachment · Evidence (planejado) · MediaObject · AiInferenceLog (V2)"]
  end
  subgraph INFRA["ws-infrastructure"]
    MY["persistence-mysql extraction_* (V__rf34)"]
    S3A["storage-s3 anexos · restricted/ (flag storage.s3)"]
    PLAT["platform: CadParserAdapter (dxf/dwg/ifc) · PlatformOcrAdapter · antivírus hook"]
    AIP["ai-providers ai-claude · ai-gemini · ai-local (LocalEngine estrutural)"]
    OSA["search-opensearch ocrTextRef (flag opensearch.enabled)"]
  end
  BFF --> EC --> SEC
  EC --> ES
  ES --> SR
  ES --> TS
  ES --> OM
  ES --> UG
  ES --> AIE
  ES --> GD
  ES --> DE
  SR --> PORTS
  AIE --> PORTS
  ES --> ENT --> MY --> MYSQL[("MySQL 8")]
  PORTS --> S3A --> S3[("S3 / MinIO")]
  PORTS --> PLAT
  PORTS --> AIP --> AI["Claude / Gemini / local"]
  PLAT --> OSA --> OPENS[("OpenSearch")]
```

## 6. Rastreabilidade

| CA | Classe | Passo | Mensagem | Transição | Componente |
|---|---|---|---|---|---|
| RF34.CA01 | `ExtractionService.extractQuantities`, `StructuralReader.readCad/readIfc`, `ExtractionResult.rowsJson` (item, unidade, quantidade, área/volume, confiança), `ExtractionKind QUANTITATIVOS` | A2 → F1 → P1 (403) → P2 (422) → P3 → P4 → P5 → P8 → I1 → P9 | 1–25 | `[*] → PROCESSANDO → PRONTA` | `ES`, `SR`, `PLAT (CadParserAdapter)`, `ExtractionPanel` |
| RF34.CA02 | `ExtractionService.extractItemsAndDeadlines`, `StructuralReader.readPdf`, `OcrPort`, `ExtractionKind ITENS_PRAZOS` | A3 → F1 → P5 (OCR) → P8 | — (mesmo fluxo com kind ITENS_PRAZOS) | `PROCESSANDO → PRONTA` | `PLAT (PlatformOcrAdapter)`, `OSA` |
| RF34.CA03 | `ExtractionService.convert`, `TaskService.createDerived`, `TaskType PLANILHA/CRONOGRAMA`, `SourceKind EXTRACAO`, `originalTaskId`, `ProjectTask`, `derivedTaskId` | A6 → A7/A8 → F4 → P11 | 30–37 | `PRONTA/REVISADA → CONVERTIDA` | `TS`, `Spark ✦` |
| RF34.CA04 | `ExtractionService.review`, `ExtractionCorrection` (departmentId), exemplos nas próximas extrações | A5 → F3 → P10 · I2 | 26–29, 16 | `PRONTA → REVISADA` | `ExtractionPanel`, `MY` |
| RF34.CA05 | `ExtractionService.captureFromViewer`, `Evidence`, `UploadGuard`, tarefa IMAGEM_EDITADA (RF4) | A4 → F5 → P12 | 38–43 | — | `Viewer3D`, `UG`, `S3A` |
| RF34.CA06 | `AiInferenceLog` (modelo, custo, latência), `LocalEngine` (estrutural sem semântica), `ExtractionKind ESTRUTURAL`, aviso | P6 → P7 · I3 | 13–16, 22 | nota de PRONTA | `AIP`, `Toast` |

Tela/aba: `/tasks/[id]` (esqueleto em `app/(shell)/tasks/[id]/page.tsx`) · `/tasks/new` (esqueleto em `app/(shell)/tasks/new/page.tsx`)
