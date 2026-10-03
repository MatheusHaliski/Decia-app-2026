# RF34 — Extrair informações de desenhos técnicos e documentos (dwg/dxf/ifc/glb/pdf) com IA para gerar quantitativos, planilha orçamentária e cronograma pré-preenchidos

**HU:** HU34 · **Sprint (board Work Station):** Product Backlog (pós-Sprint 4, a priorizar) · **Equivalente FAI:** pipelines de imagem do RF4 (Flat Lay, Estúdio, filtro de logos) e RF16 Geração 3D — aplicados ao artefato de trabalho · **Aba/rota:** ação "Extrair com IA" na tarefa DESENHO_TECNICO / DOCUMENTO (`/tasks/[id]`, RF20); visualizador 3D (`/tasks/[id]/viewer`, rota a confirmar)

**Critérios de aceite cobertos:** RF34.CA01 · RF34.CA02 · RF34.CA03 · RF34.CA04 · RF34.CA05 · RF34.CA06

> Contextos da TAXONOMIA: **2. Acervo** (`TaskItem` tipos DESENHO_TECNICO · DOCUMENTO · PLANILHA · CRONOGRAMA · IMAGEM_EDITADA, `TaskAttachment` com `mimeType`, `antivirusStatus`, `ocrStatus`, `Evidence.studioStatus`), **3. Criador de Projetos** (`ProjectTask` da tarefa derivada no mesmo projeto), **10. IA** (`ExtractionResult` kind QUANTITATIVOS · ITENS_PRAZOS · ESTRUTURAL, `ExtractionCorrection`, `AiInferenceLog` capability `EXTRAIR_DESENHO` / `EXTRAIR_DOCUMENTO`) e **12. Plataforma** (`MediaObject`, `PipelineJob OCR`). Sem IA externa o **motor local** lê camadas/blocos (ESTRUTURAL) sem interpretação semântica e avisa. `RESTRITO`/`SIGILOSO` nunca vai a IA externa.

## 1. Diagrama de classes

```mermaid
classDiagram
  direction LR
  namespace ws-domain {
    class TaskItem {
      <<entity>>
      +UUID id
      +UUID ownerId
      +UUID departmentId
      +String title
      +TaskType type
      +TaskCategory category
      +AccessClassification accessClass
      +String format
      +SourceKind sourceKind
      +String sourceRef
      +UUID originalTaskId
      +UUID sourceProjectId
      +boolean aiGenerated
      +UUID aiInferenceId
      +JSON aiConfidenceJson
    }
    class TaskAttachment {
      <<entity>>
      +UUID id
      +UUID taskId
      +UUID mediaObjectId
      +String fileName
      +String mimeType
      +long sizeBytes
      +String antivirusStatus
      +String ocrStatus
      +String ocrTextRef
      +boolean isPrimary
    }
    class MediaObject {
      <<entity>>
      +UUID id
      +String bucket
      +String key
      +String mimeType
      +AccessClassification accessClass
      +JSON variantsJson
    }
    class ExtractionResult {
      <<entity>>
      +UUID id
      +UUID taskId
      +String kind
      +JSON rowsJson
      +JSON layersJson
      +UUID derivedTaskId
      +String status
      +UUID aiInferenceId
    }
    class ExtractionCorrection {
      <<entity>>
      +UUID id
      +UUID extractionId
      +int rowIndex
      +String field
      +String oldValue
      +String newValue
      +UUID userId
      +UUID departmentId
      +Instant at
    }
    class ProjectTask {
      <<entity>>
      +UUID id
      +UUID projectId
      +UUID taskId
      +ProjectPhase phase
    }
    class Evidence {
      <<entity>>
      +UUID id
      +UUID ownerId
      +UUID mediaObjectId
      +String caption
      +UUID linkedTaskId
      +String studioStatus
      +UUID derivedTaskId
    }
    class PipelineJob {
      <<entity>>
      +UUID id
      +String type
      +UUID targetId
      +String status
    }
    class AiInferenceLog {
      <<entity>>
      +UUID id
      +UUID userId
      +UUID departmentId
      +AiCapability capability
      +String provider
      +String model
      +int latencyMs
      +BigDecimal estimatedCostUsd
      +String result
      +boolean fallbackUsed
    }
    class TaskType {
      <<enum>>
      DESENHO_TECNICO
      DOCUMENTO
      PLANILHA
      CRONOGRAMA
      IMAGEM_EDITADA
    }
    class ExtractionKind {
      <<enum>>
      QUANTITATIVOS
      ITENS_PRAZOS
      ESTRUTURAL
    }
    class AiCapability {
      <<enum>>
      EXTRAIR_DESENHO
      EXTRAIR_DOCUMENTO
    }
  }
  namespace ws-application {
    class ExtractionService {
      <<service>>
      +extractQuantities(actorId, taskId) ExtractionResult
      +extractItemsAndDeadlines(actorId, taskId) ExtractionResult
      +correctRow(actorId, extractionId, rowIndex, field, newValue) ExtractionCorrection
      +derive(actorId, extractionId, targetType, projectId) TaskItem
      +viewerUrl(actorId, taskId) PresignedUrl
      +captureAsImage(actorId, taskId, imageBytes) TaskItem
    }
    class TaskService {
      <<service>>
      +create(ownerId, form) TaskItem
    }
    class AiEngine {
      <<service>>
      +interpretCad(layers, departmentCorrections) List~Row~
      +extractFromDocument(text, departmentCorrections) List~Row~
    }
    class CadReaderPort {
      <<port>>
      +readLayers(bytes, format) CadStructure
      +supports(mimeType) boolean
    }
    class AiProviderPort {
      <<port>>
      +complete(prompt, mode, accessClass) AiResult
    }
    class MediaStoragePort {
      <<port>>
      +get(mediaObjectId) bytes
      +presign(mediaObjectId, ttl) PresignedUrl
      +put(bytes, mimeType, accessClass) MediaObject
    }
    class OcrPort {
      <<port>>
      +extractText(bytes) String
    }
  }
  namespace ws-web {
    class ExtractionController {
      <<controller>>
      +extract(taskId, kind)
      +correct(extractionId, rowIndex, body)
      +derive(extractionId, body)
      +viewer(taskId)
      +capture(taskId, image)
    }
  }
  namespace ws-infrastructure {
    class DxfCadReaderAdapter {
      <<adapter>>
      dwg e dxf
    }
    class IfcCadReaderAdapter {
      <<adapter>>
      ifc e glb
    }
    class TesseractOcrAdapter {
      <<adapter>>
    }
    class S3MediaStorageAdapter {
      <<adapter>>
    }
    class ClaudeAdapter {
      <<adapter>>
    }
    class LocalStructuralEngine {
      <<adapter>>
      camadas e blocos sem semântica
    }
  }
  TaskItem "1" --> "*" TaskAttachment
  TaskAttachment --> MediaObject : mediaObjectId
  TaskItem "1" --> "*" ExtractionResult : origem
  ExtractionResult --> TaskItem : derivedTaskId PLANILHA ou CRONOGRAMA
  ExtractionResult "1" --> "*" ExtractionCorrection
  ExtractionResult --> ExtractionKind : kind
  ExtractionResult --> AiInferenceLog : aiInferenceId
  TaskItem --> TaskItem : originalTaskId tarefa de origem
  ProjectTask --> TaskItem : taskId tarefa derivada no mesmo projeto
  Evidence --> TaskItem : derivedTaskId IMAGEM_EDITADA
  Evidence --> MediaObject : captura do visualizador
  PipelineJob ..> TaskAttachment : type OCR
  TaskItem --> TaskType : type
  AiInferenceLog --> AiCapability
  ExtractionService ..> ExtractionResult
  ExtractionService ..> ExtractionCorrection
  ExtractionService ..> CadReaderPort : camadas e entidades
  ExtractionService ..> OcrPort : pdf escaneado
  ExtractionService ..> MediaStoragePort : arquivo e presign
  ExtractionService ..> AiEngine : interpretação semântica ✦
  ExtractionService ..> TaskService : tarefa derivada RF20
  ExtractionService ..> AiInferenceLog
  AiEngine ..> AiProviderPort
  ExtractionController ..> ExtractionService
  DxfCadReaderAdapter ..|> CadReaderPort
  IfcCadReaderAdapter ..|> CadReaderPort
  TesseractOcrAdapter ..|> OcrPort
  S3MediaStorageAdapter ..|> MediaStoragePort
  ClaudeAdapter ..|> AiProviderPort
  LocalStructuralEngine ..|> AiProviderPort : provider LOCAL
  note for ExtractionResult "tabela extraction_results · rowsJson [{item, unit, qty, area, volume, confidence}] · status proposto PROCESSANDO · PRONTA · REVISADA · CONVERTIDA · FALHA"
  note for ExtractionCorrection "tabela extraction_corrections · alimenta as próximas extrações do mesmo departamento (CA04)"
  note for TaskItem "tabela tasks · .. +40 campos .."
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph L1["Ator humano"]
    U1["Abre tarefa DESENHO_TECNICO (.dwg, .dxf, .ifc) e clica Extrair quantitativos"]
    U2["Abre tarefa DOCUMENTO (pdf, docx) e clica Extrair itens e prazos"]
    U3["Revisa a tabela e corrige linhas"]
    U4{"Gerar PLANILHA ou CRONOGRAMA?"}
    U5["Abre .glb no visualizador 3D e mede distância ou área"]
    U6["Captura a tela do visualizador"]
  end
  subgraph L2["Web/BFF (Next.js App Router)"]
    W1["Tabela item, unidade, quantidade, área ou volume com confiança por linha"]
    W2["Aviso: leitura estrutural local, sem interpretação semântica"]
    W3["Nova tarefa com faísca ✦ vinculada à origem, no mesmo projeto"]
    W4["Viewer3D (glTF) com ferramentas de medição"]
  end
  subgraph L3["ws-application"]
    S1{"Ator pode editar a tarefa e anexo antivirusStatus LIMPO?"}
    S2{"mimeType suportado por CadReaderPort ou OCR?"}
    S3["MediaStoragePort.get · CadReaderPort.readLayers → layersJson (ESTRUTURAL)"]
    S4{"ocrStatus pronto?"}
    S5["OcrPort.extractText · PipelineJob OCR · ocrTextRef"]
    S6{"IA externa disponível e accessClass não RESTRITO ou SIGILOSO?"}
    S7["Carrega ExtractionCorrection do departamento como exemplos"]
    S8["ExtractionResult PRONTA · rowsJson com confidence · AiInferenceLog EXTRAIR_DESENHO ou EXTRAIR_DOCUMENTO"]
    S9["ExtractionResult PRONTA só com layersJson e linhas sem confiança · fallbackUsed"]
    S10["ExtractionCorrection (rowIndex, field, oldValue, newValue, departmentId) · rowsJson atualizado · status REVISADA"]
    S11["TaskService.create PLANILHA ou CRONOGRAMA: aiGenerated, originalTaskId = origem, aiInferenceId · ProjectTask no mesmo projeto · derivedTaskId · status CONVERTIDA"]
    S12["MediaStoragePort.presign do .glb"]
    S13["TaskService.create IMAGEM_EDITADA (RF20) · Evidence studioStatus RECORTADA · derivedTaskId"]
    E1["403 ACESSO_NEGADO"]
    E2["409 ANTIVIRUS_PENDENTE"]
    E3["422 VALIDACAO (formato não suportado)"]
  end
  subgraph L4["IA (AiEngine)"]
    A1["interpretCad ✦: item, unidade, quantidade, área, volume, confiança"]
    A2["extractFromDocument ✦: itens, valores, datas, responsáveis"]
    A3["LocalStructuralEngine: camadas e blocos, sem semântica"]
  end
  subgraph L5["Persistência"]
    D1[("S3: arquivo original · captura do visualizador")]
    D2[("MySQL: extraction_results · extraction_corrections · ai_inference_log · pipeline_jobs")]
    D3[("MySQL: tasks · task_attachments · project_tasks · evidences")]
    D4[("OpenSearch: ocrTextRef")]
  end
  U1 --> S1
  U2 --> S1
  S1 -->|"sem permissão"| E1
  S1 -->|"antivírus pendente"| E2
  S1 -->|"ok"| S2
  S2 -->|"não"| E3
  S2 -->|"desenho"| S3 --> D1
  S2 -->|"documento"| S4
  S4 -->|"não"| S5 --> D4
  S4 -->|"sim"| S6
  S5 --> S6
  S3 --> S6
  S6 -->|"sim"| S7
  S7 -->|"desenho"| A1 --> S8
  S7 -->|"documento"| A2 --> S8
  S6 -->|"não"| A3 --> S9 --> W2
  S8 --> D2
  S9 --> D2
  S8 --> W1
  W2 --> W1
  W1 --> U3 --> S10 --> D2
  S10 --> U4
  U4 -->|"PLANILHA"| S11
  U4 -->|"CRONOGRAMA"| S11
  S11 --> D3
  S11 --> W3
  U5 --> S12 --> D1
  S12 --> W4 --> U6 --> S13 --> D3
  S13 --> D1
  classDef err fill:#fde2e2,stroke:#b91c1c,color:#7f1d1d
  class E1,E2,E3 err
```

## 3. Diagrama de sequência

```mermaid
sequenceDiagram
  autonumber
  actor U as Usuário
  participant NX as Next.js (App Router)
  participant C as Controller (ws-web)
  participant S as Service (ws-application)
  participant AI as AiEngine
  participant DB as Repository/MySQL
  participant S3 as S3
  participant EV as DomainEvents (AFTER_COMMIT)

  Note over U,EV: CA01 e CA06 — extrair quantitativos de um desenho técnico
  U->>NX: clica Extrair quantitativos em /tasks/[id] (.dxf)
  NX->>C: POST /api/tasks/{taskId}/extractions {kind QUANTITATIVOS}
  C->>S: ExtractionService.extractQuantities(actorId, taskId)
  alt sem permissão de edição
    S-->>C: 403 ACESSO_NEGADO
  else anexo com antivirusStatus PENDENTE
    S-->>C: 409 ANTIVIRUS_PENDENTE
  else mimeType não suportado
    S-->>C: 422 VALIDACAO
  else ok
    S->>DB: SELECT tasks, task_attachments (isPrimary)
    S->>S3: GET objeto (MediaStoragePort)
    S->>S: CadReaderPort.readLayers → camadas, blocos, entidades
    S->>DB: SELECT extraction_corrections do departamento (exemplos)
    alt IA externa disponível e accessClass PUBLICO ou INTERNO
      S->>AI: interpretCad(layers, corrections)
      AI-->>S: linhas item, unit, qty, area, volume, confidence ✦
    else sem IA externa ou RESTRITO/SIGILOSO (CA06)
      S->>AI: LocalStructuralEngine (provider LOCAL)
      AI-->>S: camadas e blocos sem semântica · fallbackUsed
    end
    S->>DB: INSERT extraction_results (PRONTA, rowsJson, layersJson) · INSERT ai_inference_log (EXTRAIR_DESENHO, modelo, custo, latência)
    S-->>NX: 201 tabela com confiança por linha (ou aviso de leitura estrutural)
  end

  Note over U,EV: CA02 — itens e prazos de um documento (OCR quando necessário)
  U->>NX: clica Extrair itens e prazos em DOCUMENTO pdf
  NX->>C: POST /api/tasks/{taskId}/extractions {kind ITENS_PRAZOS}
  C->>S: ExtractionService.extractItemsAndDeadlines(actorId, taskId)
  S->>S3: GET objeto
  alt pdf sem camada de texto
    S->>DB: INSERT pipeline_jobs (OCR) · OcrPort.extractText · UPDATE task_attachments SET ocrStatus, ocrTextRef
  end
  S->>AI: extractFromDocument(text, corrections)
  AI-->>S: itens, valores, datas, responsáveis ✦
  S->>DB: INSERT extraction_results · INSERT ai_inference_log (EXTRAIR_DOCUMENTO)
  S-->>NX: 201 ExtractionResult

  Note over U,EV: CA04 e CA03 — corrigir e converter em PLANILHA ou CRONOGRAMA
  U->>NX: corrige a quantidade da linha 3
  NX->>C: PATCH /api/extractions/{id}/rows/3 {field qty, newValue}
  C->>S: ExtractionService.correctRow(actorId, id, 3, qty, newValue)
  S->>DB: INSERT extraction_corrections (oldValue, newValue, departmentId) · UPDATE extraction_results SET rowsJson, status = REVISADA
  S-->>NX: 200
  U->>NX: Gerar planilha orçamentária
  NX->>C: POST /api/extractions/{id}/derive {targetType PLANILHA, projectId}
  C->>S: ExtractionService.derive(actorId, id, PLANILHA, projectId)
  S->>S: TaskService.create (PLANILHA, PLANILHA_ORCAMENTARIA, aiGenerated, originalTaskId, aiInferenceId)
  S->>DB: INSERT tasks · INSERT project_tasks (mesmo projeto, fase da origem) · UPDATE extraction_results SET derivedTaskId, status = CONVERTIDA
  S-)EV: TaskDerivedFromExtraction
  EV->>DB: thumbnail mini-gráfico (RF38) · AuditLog
  S-->>NX: 201 TaskItem com faísca ✦

  Note over U,EV: CA05 — visualizador 3D e captura como IMAGEM_EDITADA
  U->>NX: abre .glb em /tasks/[id]/viewer
  NX->>C: GET /api/tasks/{taskId}/viewer
  C->>S: ExtractionService.viewerUrl(actorId, taskId)
  S->>S3: presign (TTL curto)
  S-->>NX: 200 URL assinada · Viewer3D mede distância e área
  U->>NX: captura a tela
  NX->>C: POST /api/tasks/{taskId}/viewer/capture (png)
  C->>S: ExtractionService.captureAsImage(actorId, taskId, png)
  S->>S3: PUT captura (MediaObject)
  S->>DB: INSERT evidences (studioStatus RECORTADA, linkedTaskId) · INSERT tasks (IMAGEM_EDITADA, RF20) · UPDATE evidences SET derivedTaskId
  S-->>NX: 201 TaskItem IMAGEM_EDITADA
```

## 4. Máquina de estados

Entidade central: `ExtractionResult.status`. A TAXONOMIA lista o campo `status` sem valores — os estados abaixo são **proposta** (registrar em `DECISOES.md`).

```mermaid
stateDiagram-v2
  direction LR
  [*] --> PROCESSANDO : POST /api/tasks/{id}/extractions (CA01, CA02)
  PROCESSANDO --> PRONTA : linhas com confiança ✦ ou leitura estrutural local (CA06)
  PROCESSANDO --> FALHA : arquivo corrompido, formato não suportado ou antivírus
  PRONTA --> REVISADA : PATCH rows/{i} grava ExtractionCorrection (CA04)
  REVISADA --> REVISADA : novas correções
  PRONTA --> CONVERTIDA : POST derive → TaskItem PLANILHA ou CRONOGRAMA (CA03)
  REVISADA --> CONVERTIDA : POST derive → TaskItem PLANILHA ou CRONOGRAMA (CA03)
  PRONTA --> PROCESSANDO : reprocessar com IA externa após fallback
  CONVERTIDA --> [*]
  FALHA --> [*]
  note right of PRONTA
    rowsJson [{item, unit, qty, area, volume, confidence}]
    fallbackUsed = true exibe aviso de leitura estrutural (CA06)
  end note
  note right of CONVERTIDA
    derivedTaskId aponta para a tarefa com faísca ✦
    originalTaskId da derivada = tarefa de origem
  end note
  note left of REVISADA
    Correções por departmentId alimentam as próximas extrações (CA04)
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FE["Next.js (frontend)"]
    direction TB
    P1["app/tasks/[id]/page.tsx · ação Extrair com IA"]
    P2["app/tasks/[id]/viewer/page.tsx · Viewer3D (three.js, glTF)"]
    UI1["components/ui: ExtractionTable (confiança por linha, edição) · DeriveButton · FallbackBanner · MeasureTool"]
  end
  subgraph WEB["ws-web (REST · br.gov.pr.secid.workstation.web)"]
    direction TB
    C1["ExtractionController"]
  end
  subgraph APP["ws-application"]
    direction TB
    S1["ExtractionService"]
    S2["TaskService (RF20)"]
    S3["AiEngine"]
    PT1["CadReaderPort"]
    PT2["OcrPort"]
    PT3["MediaStoragePort"]
    PT4["AiProviderPort"]
  end
  subgraph DOM["ws-domain"]
    direction TB
    E1["TaskItem · TaskAttachment · MediaObject · Evidence · ProjectTask"]
    E2["ExtractionResult · ExtractionCorrection · AiInferenceLog · PipelineJob"]
  end
  subgraph INFRA["ws-infrastructure"]
    direction TB
    I1["storage-s3: S3MediaStorageAdapter (get, put, presign)"]
    I2["ai-providers: ClaudeAdapter · GeminiAdapter · LocalStructuralEngine"]
    I3["platform: DxfCadReaderAdapter · IfcCadReaderAdapter · TesseractOcrAdapter · PipelineJob OCR"]
    I4["persistence-mysql: ExtractionResult/Correction repositories"]
    I5["search-opensearch: ocrTextRef"]
  end
  subgraph EXT["Serviços externos"]
    X1(["Claude / Gemini"])
  end
  P1 --> C1
  P2 --> C1
  UI1 -.-> P1
  UI1 -.-> P2
  C1 --> S1
  S1 --> S2
  S1 --> S3
  S1 -.-> PT1
  S1 -.-> PT2
  S1 -.-> PT3
  S3 -.-> PT4
  S1 --> E1
  S1 --> E2
  S1 --> I4
  S1 --> I5
  I1 -. implementa .-> PT3
  I3 -. implementa .-> PT1
  I3 -. implementa .-> PT2
  I2 -. implementa .-> PT4
  I2 --> X1
  classDef port stroke-dasharray: 4 3
  class PT1,PT2,PT3,PT4 port
```

## 6. Rastreabilidade

| CA | Elemento do diagrama (classe / passo / mensagem / transição / componente) |
|---|---|
| RF34.CA01 | Classes `ExtractionService.extractQuantities`, `CadReaderPort.readLayers`, `ExtractionResult.kind = QUANTITATIVOS`, `rowsJson` (item, unit, qty, area, volume, confidence), `layersJson`, `AiEngine.interpretCad`; atividades `U1 → S1 → S2 → S3 → S6 → S7 → A1 → S8 → W1` (403, 409 ANTIVIRUS_PENDENTE, 422 formato); sequência bloco «CA01 e CA06»; transição `[*] → PROCESSANDO → PRONTA`; componentes `ExtractionTable`, `DxfCadReaderAdapter`, `IfcCadReaderAdapter` |
| RF34.CA02 | Classes `ExtractionService.extractItemsAndDeadlines`, `OcrPort`, `TaskAttachment.ocrStatus/ocrTextRef`, `PipelineJob OCR`, `AiEngine.extractFromDocument`, `ExtractionResult.kind = ITENS_PRAZOS`; atividades `U2 → S1 → S2 → S4 → S5 → S6 → A2 → S8`; sequência bloco «CA02»; componentes `TesseractOcrAdapter`, `search-opensearch: ocrTextRef` |
| RF34.CA03 | Classes `ExtractionService.derive`, `ExtractionResult.derivedTaskId`, `TaskItem.originalTaskId/aiGenerated/aiInferenceId`, `ProjectTask` (mesmo projeto), `TaskService.create`; atividades `U4 → S11 → W3`; sequência bloco «CA04 e CA03» (`POST /api/extractions/{id}/derive`, evento thumbnail RF38); transições `PRONTA/REVISADA → CONVERTIDA` e nota; componente `DeriveButton` |
| RF34.CA04 | Classes `ExtractionCorrection` (rowIndex, field, oldValue, newValue, departmentId), `ExtractionService.correctRow`, `AiEngine.*(…, departmentCorrections)`; atividades `U3 → S10`, `S7` (correções como exemplos); sequência bloco «CA04 e CA03» (`PATCH /api/extractions/{id}/rows/{i}`) e SELECT extraction_corrections no bloco «CA01»; transição `PRONTA → REVISADA` e nota; componente `ExtractionTable` (edição) |
| RF34.CA05 | Classes `ExtractionService.viewerUrl/captureAsImage`, `MediaStoragePort.presign/put`, `Evidence.studioStatus/derivedTaskId`, `TaskType.IMAGEM_EDITADA`; atividades `U5 → S12 → W4 → U6 → S13`; sequência bloco «CA05»; componentes `app/tasks/[id]/viewer`, `Viewer3D`, `MeasureTool`, `storage-s3` |
| RF34.CA06 | Classes `AiInferenceLog` (EXTRAIR_DESENHO / EXTRAIR_DOCUMENTO, modelo, custo, latência, fallbackUsed), `LocalStructuralEngine ..|> AiProviderPort`, `TaskItem.accessClass`; atividades `S6 → A3 → S9 → W2`; sequência bloco «CA01 e CA06» alt «sem IA externa ou RESTRITO/SIGILOSO»; transição `PROCESSANDO → PRONTA` (leitura estrutural) e nota; componentes `FallbackBanner`, `ai-providers: LocalStructuralEngine` |

> Dúvidas para `docs/DECISOES.md`: valores de `ExtractionResult.status` (proposta PROCESSANDO · PRONTA · REVISADA · CONVERTIDA · FALHA); vínculo da tarefa derivada com a origem — usei `TaskItem.originalTaskId` (campo de crédito de remix) por não existir `SourceKind` de extração (alternativa: novo `SourceKind.EXTRACAO`); `OcrPort`, `MediaStoragePort`, `409 ANTIVIRUS_PENDENTE` e bibliotecas CAD (ezdxf, IfcOpenShell) são propostas; `.dwg` exige conversão prévia para `.dxf` (ODA File Converter) — confirmar licenciamento.
