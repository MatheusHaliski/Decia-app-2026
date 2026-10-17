# RF70 — Importar, exportar e referenciar conteúdo técnico nas peças
**HU:** — (sem HU no board; RF especificado em 15/10/2026) · **Sprint (board Work Station):** lista *Requisitos Funcionais* sem sprint atribuída · **Equivalente FAI:** — · **Aba/rota:** Letters (`/letters`, `/letters/[pieceId]`) e Drawings (`/drawings`, `/drawings/[pieceId]`); peça aberta a partir de `/tasks/[id]`, `/projects/[id]` e da sessão DECIA `/decia/[sessionId]` · **Página-esqueleto:** registrada em 17/10/2026; editores ainda não implementados (Ondas 3–5 do PLANO_ONDAS)
**Critérios de aceite cobertos:** RF70.CA01 … RF70.CA07 — corpo do card = especificação de docs/produto/requisitos-studio/RF70.md (CAs copiados como estão escritos); classes reais: `MediaUploadService` (escrito, ainda não é bean — D-67), `MediaUploadInspector` e `MagicBytes` (tipo real por assinatura, limites por categoria), `MediaAccessPolicy`, `MediaObject`, `TaskAttachment`, `ResourceAuthorizer`, `AccessPolicy`, `lib/pieces/authorship.ts` (origem `IMPORT`, categoria `IMPORTED`), `lib/pieces/provenance.ts` (`c2pa.opened`); o restante (planejado)

Permite usar formatos e referências externas nas peças com fidelidade e limites verificáveis. Cada formato tem parser ou conversor validado, limites e mensagem clara para o que não é suportado. O original importado nunca é sobrescrito pela conversão, e as perdas (achatado, aproximado, descartado) aparecem antes do aceite. Referências externas (Xref) guardam vínculo, versão e permissão, sem acesso arbitrário a arquivos ou URLs. Conteúdo ativo (scripts SVG, macros, links remotos) não é executado, e instruções dentro de documentos são dados, nunca comandos.

**Estado em 17/10/2026:** a MATRIZ_RF classifica o RF70 como AUSENTE (0,00): não há importador, conversor nem conector (CONECTORES.md: nenhum adapter de terceiros; Word e Excel são formatos ainda sem fluxo). O que existe é a inspeção de upload do D-67: `MagicBytes` reconhece PNG, JPEG, GIF, WEBP, PDF, ZIP/DOCX/XLSX/PPTX, DWG, DXF, IFC e GLB pelo conteúdo, recusa extensão divergente (`415 TIPO_DIVERGENTE`) ou tipo fora da lista (`415 TIPO_NAO_PERMITIDO`), limita tamanho por categoria (`413`) e pixels (`422 IMAGEM_GRANDE_DEMAIS`). O `MediaUploadService` ainda não é bean. Detectar o tipo não equivale a ler o formato. Pelo PLANO_ONDAS o RF70 entra na Onda 9 (conectores e documentos técnicos), com a meta de publicar a matriz de leitura/escrita/fidelidade e implementar parsers isolados por formato com proveniência. A conclusão segue a prova do RF72: CA → teste → evidência.

## Critérios de aceite

| CA | Enunciado (Dado / Quando / Então) |
|---|---|
| **RF70.CA01** | Dados formatos nativos ws-studio/ws-asset, quando exporta e reimporta, então preserva IDs, topologia, camadas, materiais, metadados e câmera suportados. |
| **RF70.CA02** | Dados SVG, PNG/JPEG/WebP, PDF, DXF/DWG, GLB/IFC, quando o formato está habilitado, então existe parser/conversor validado, limites e mensagem clara para recursos não suportados. |
| **RF70.CA03** | Dadas fontes WOFF2, paletas JSON e referências visuais, quando importa, então valida origem/formato, não executa conteúdo ativo e mantém associação ao projeto. |
| **RF70.CA04** | Dado XOPEN/Xref, quando abre referência externa, então preserva vínculo, versão e permissão, sem acesso arbitrário a arquivos ou URLs. |
| **RF70.CA05** | Dado arquivo malformado, excessivo ou com dependências ausentes, quando abre, então rejeita/solicita correção sem destruir o projeto existente. |
| **RF70.CA06** | Dada perda de fidelidade, quando converte, então informa o que será achatado, aproximado ou descartado antes do aceite. |
| **RF70.CA07** | Dada exportação GLB, quando valida, então passa validador de formato e preserva unidades, normais e materiais compatíveis; isso não certifica fabricação ou projeto. |

## Matriz de leitura, escrita e fidelidade por formato

Fontes: `docs/auditoria/2026-10-15/catalogo-conteudo-importavel.json` (tipos e sanitização), D-67 (detecção real) e `docs/produto/DRAWER_EDITOR_DE_PECAS.md` (DWG exige motor validado). **Só formatos com estado "habilitado" aparecem como operação na interface.** Em 17/10/2026 nenhum está habilitado: todos os pendentes ficam fora dos menus "Importar" e "Exportar", sem logo nem promessa.

| Formato | Detecção no upload (real) | Leitura para edição | Escrita (exportação) | Fidelidade a provar antes de habilitar | Estado |
|---|---|---|---|---|---|
| `ws-studio` / `ws-asset` (JSON nativo) | não reconhecido (fora do D-67) | pendente | pendente | round-trip de IDs, topologia, camadas, materiais, metadados e câmera | pendente (Onda 3) |
| SVG | recusado (`415 TIPO_NAO_PERMITIDO`) | pendente: sanitizar scripts, `foreignObject`, links externos | pendente | efeitos, filtros e texto em caminho achatados | pendente |
| PNG / JPEG / WebP | sim | pendente: camada raster ancorada | pendente | dimensões, perfil sRGB, alpha (PNG/WebP) | pendente |
| PDF | sim | pendente: referência visual, sem edição de conteúdo | pendente (Letters) | paginação e fontes; JavaScript e anexos descartados | pendente |
| DXF | sim | pendente: parser isolado, entidades suportadas listadas | pendente | camadas, unidades, blocos; entidades sem suporte descartadas e listadas | pendente |
| DWG | sim (`AC10xx`) | sem motor/SDK licenciado e validado: não oferecido | não oferecido | versões suportadas a definir após avaliação | não oferecido |
| GLB | sim (glTF v2) | pendente: inspeção de cena | pendente | validador glTF, unidades, normais, materiais compatíveis | pendente |
| IFC | sim (`ISO-10303-21`) | pendente: só visualização de referência | não oferecido | entidades e propriedades listadas, sem certificação | pendente |
| WOFF2 | recusado (fora do D-67) | pendente: validar tabela de fontes e licença | — | — | pendente |
| Paleta JSON | não reconhecido | pendente: esquema fechado, sem expressões | pendente | espaço de cor e nomes preservados | pendente |
| Referência visual (`image/*`) | sim (PNG/JPEG/WEBP/GIF) | pendente: referência, não geometria | — | associação ao projeto e à revisão | pendente |
| DOCX / XLSX | sim (subtipo pelo conteúdo) | pendente | pendente | estilos e fórmulas aproximados; macros nunca executadas | pendente |

## 0. Diagrama de casos de uso

Casos de uso derivados dos CAs. Todos são planejados: não há importador, conversor nem conector; existe só a detecção do tipo real no upload (D-67), ainda sem serviço ativo.

```mermaid
flowchart LR
  classDef ator fill:#fde7d3,stroke:#b4531a,color:#1b1b1b
  classDef atorSis fill:#f1ecf9,stroke:#6a4bb3,color:#1b1b1b
  classDef uc fill:#ffffff,stroke:#3557a6,color:#1b1b1b
  classDef ucPlan fill:#ffffff,stroke:#8a8a8a,stroke-dasharray:4 3,color:#555555
  dono["«ator» Dono do recurso"]:::ator
  colaborador["«ator» Colaborador explícito"]:::ator
  subgraph SIS["Work Station — RF70 Importar e exportar conteúdo"]
    direction TB
    UC1(["UC1 Exportar e reimportar formato nativo"]):::ucPlan
    UC2(["UC2 Importar arquivo técnico ou imagem"]):::ucPlan
    UC3(["UC3 Importar fonte, paleta ou referência visual"]):::ucPlan
    UC4(["UC4 Abrir referência externa (Xref)"]):::ucPlan
    UC5(["UC5 Revisar perdas de fidelidade antes do aceite"]):::ucPlan
    UC6(["UC6 Corrigir arquivo recusado"]):::ucPlan
    UC7(["UC7 Exportar GLB validado"]):::ucPlan
    UC8(["UC8 Verificar o tipo real do arquivo"]):::ucPlan
  end
  conectores["«ator» Google Workspace · Microsoft 365 · e-Protocolo"]:::atorSis
  dono --- UC1
  colaborador --- UC1
  dono --- UC2
  colaborador --- UC2
  dono --- UC3
  colaborador --- UC3
  dono --- UC4
  colaborador --- UC4
  dono --- UC6
  colaborador --- UC6
  dono --- UC7
  colaborador --- UC7
  UC2 -. "«include»" .-> UC8
  UC3 -. "«include»" .-> UC8
  UC2 -. "«include»" .-> UC5
  UC6 -. "«extend»" .-> UC2
  UC4 --- conectores
```

| Caso de uso | Ator(es) | CAs | Situação |
|---|---|---|---|
| UC1 Exportar e reimportar formato nativo | `dono`, `colaborador` | RF70.CA01 | planejado |
| UC2 Importar arquivo técnico ou imagem | `dono`, `colaborador` | RF70.CA02, RF70.CA05 | planejado |
| UC3 Importar fonte, paleta ou referência visual | `dono`, `colaborador` | RF70.CA03 | planejado |
| UC4 Abrir referência externa (Xref) | `dono`, `colaborador`, `conectores` | RF70.CA04 | planejado (conectores na Onda 9) |
| UC5 Revisar perdas de fidelidade antes do aceite | — (incluído por UC2) | RF70.CA06 | planejado |
| UC6 Corrigir arquivo recusado | `dono`, `colaborador` | RF70.CA05 | planejado |
| UC7 Exportar GLB validado | `dono`, `colaborador` | RF70.CA07 | planejado |
| UC8 Verificar o tipo real do arquivo | — (incluído por UC2, UC3) | RF70.CA02, RF70.CA03, RF70.CA05 | planejado (detecção real em `MagicBytes`; `MediaUploadService` ainda não é bean, D-67) |

## 1. Diagrama de classes

Legenda: **(real)** = código no repositório em 17/10/2026; demais classes **(planejado)**. `WorkPiece` e `PieceRevision` seguem `LETTERS_DRAWINGS_ENGENHARIA.md` §3; `MediaObject` e `TaskAttachment` seguem a TAXONOMIA.

```mermaid
classDiagram
direction LR
namespace importacao_planejado {
  class PieceImport {
    <<entity>>
    +id: UUID
    +pieceId: UUID
    +projectId: UUID
    +originalMediaId: UUID
    +formatId: String
    +state: ImportState
    +lossReportJson: JSON
    +parserVersion: String
    +requestedBy: UUID
  }
  class FormatCapability {
    <<entity>>
    +formatId: String
    +mime: String
    +canRead: boolean
    +canWrite: boolean
    +fidelityJson: JSON
    +limitsJson: JSON
    +enabled: boolean
  }
  class ExternalReference {
    <<entity>>
    +pieceId: UUID
    +targetPieceId: UUID
    +pinnedRevisionId: UUID
    +accessStatus: String
    +divergent: boolean
  }
  class ImportedAsset {
    <<entity>>
    +kind: FONTE PALETA REFERENCIA
    +mediaId: UUID
    +projectId: UUID
    +sourceOrigin: String
  }
  class ImportState {
    <<enum>>
    RECEBIDO
    VALIDADO
    IMPORTADO
    REJEITADO
  }
  class WorkPiece {
    <<entity>>
    +id: UUID
    +accessClass: AccessClassification
    +schemaVersion: int
    +version: long
  }
  class PieceRevision {
    <<entity>>
    +origin: IMPORTACAO
    +sha256: String
  }
}
namespace midia_real {
  class MediaObject {
    <<entity>>
    +objectKey: String
    +mimeType: String
    +sizeBytes: long
    +sha256: String
    +accessClass: MediaAccessClass
  }
  class TaskAttachment {
    <<entity>>
    +taskId: UUID
    +mediaObjectId: UUID
    +mimeType: String
    +antivirusStatus: String
  }
  class MediaUploadService {
    <<service>>
    +upload(owner, candidate, classification, publicAsset) Stored
    +authorizeRead(viewer, mediaId, parentVisible) ReadGrant
  }
  class MagicBytes {
    <<service>>
  }
}
class PieceImportService {
  <<service>>
  +receive(actor, pieceId, upload) PieceImport
  +accept(actor, importId, acceptedLosses) PieceRevision
  +openReference(actor, referenceId) ExternalReference
}
class PieceExportService {
  <<service>>
  +export(actor, revisionId, formatId) PieceExport
}
class FormatConverterPort {
  <<port>>
  +parse(media, limits) ParsedScene
  +write(scene, format) bytes
}
class IsolatedParserAdapter {
  <<adapter>>
}
class GlbValidatorAdapter {
  <<adapter>>
}
class ResourceAuthorizer {
  <<service>>
  +require(viewer, resource, action) void
}
PieceImport --> ImportState
PieceImport --> MediaObject : original preservado
PieceImport --> FormatCapability : consulta matriz
PieceImport --> PieceRevision : gera ao aceitar
WorkPiece "1" --> "*" ExternalReference : Xref
ExternalReference --> PieceRevision : versão fixada
ImportedAsset --> MediaObject
PieceImportService ..> MediaUploadService : tipo real e limites
MediaUploadService ..> MagicBytes
PieceImportService ..> FormatConverterPort
PieceExportService ..> FormatConverterPort
FormatConverterPort <|.. IsolatedParserAdapter
FormatConverterPort <|.. GlbValidatorAdapter
PieceImportService ..> ResourceAuthorizer : EDIT na peça e VIEW na referência
note for MediaUploadService "(real) escrito, ainda não é bean (D-67)"
note for TaskAttachment "(real) anexo de tarefa, não é peça editável"
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph ATOR["Ator: dono ou colaborador explícito da peça"]
    A0(["Escolhe Importar ou Abrir referência"])
    A1["Seleciona arquivo de formato habilitado"]
    A2{"Aceita as perdas listadas?"}
    A3(["Abre referência externa (Xref)"])
    A4(["Exporta GLB ou formato nativo"])
  end
  subgraph FE["Next.js / BFF (planejado)"]
    F1["Menu mostra só formatos habilitados da matriz"]
    F2["Relatório de fidelidade: achatado, aproximado, descartado"]
    F3["Prévia da referência com versão fixada e aviso de divergência"]
  end
  subgraph APP["ws-application"]
    P1{"ResourceAuthorizer (real): EDIT na peça?"}
    P2{"MagicBytes (real): tipo real confere?"}
    P3{"Tamanho e pixels dentro do limite?"}
    P4{"FormatCapability habilitada?"}
    P5["Parser isolado: sem rede, sem conteúdo ativo, tempo e memória limitados"]
    P6{"Malformado ou dependência ausente?"}
    P7["Nova PieceRevision origem IMPORTACAO, ContributionEvent IMPORT, original intocado"]
    P8{"Referência visível ao ator? (VIEW)"}
    P9["ExternalReference com revisão fixada; não concede acesso ao alvo"]
    P10["Validador glTF: unidades, normais, materiais; sem certificar fabricação"]
  end
  subgraph IA["IA (AiEngine)"]
    I1["Não participa: instruções em arquivos são dados, nunca comandos"]
  end
  subgraph PER["Persistência"]
    D1[("S3: original em quarentena e depois classe pela classificação")]
    D2[("MySQL: piece_imports, external_references, piece_revisions")]
  end
  A0 --> F1 --> A1 --> P1
  P1 -->|invisível| E1["404 NAO_ENCONTRADO"]
  P1 -->|sem EDIT| E2["403 ACESSO_NEGADO"]
  P1 -->|autorizado| P2
  P2 -->|não| E3["415 TIPO_DIVERGENTE ou TIPO_NAO_PERMITIDO (real)"]
  P2 -->|sim| P3
  P3 -->|não| E4["413 ARQUIVO_GRANDE"]
  P3 -->|sim| D1 --> P4
  P4 -->|não| E5["422 FORMATO_NAO_SUPORTADO com o que falta"]
  P4 -->|sim| P5 --> P6
  P6 -->|sim| E6["REJEITADO: pede correção, projeto existente intacto"]
  P6 -->|não| F2 --> A2
  A2 -->|não| E7["REJEITADO pelo usuário, nada aplicado"]
  A2 -->|sim| P7 --> D2
  A3 --> P8
  P8 -->|não| E1
  P8 -->|sim| P9 --> F3
  A4 --> P10 --> D1
  I1 -.-> P5
```

## 3. Diagrama de sequência

```mermaid
sequenceDiagram
  autonumber
  participant U as Usuário
  participant FE as Next.js (App Router)
  participant C as Controller (ws-web)
  participant S as Service (ws-application)
  participant DB as Repository/MySQL
  participant S3 as S3
  participant EV as DomainEvents (AFTER_COMMIT)
  U->>FE: Importar planta.dxf na peça Drawings
  FE->>C: POST /api/pieces/{id}/imports (multipart, expectedVersion)
  C->>S: PieceImportService.receive(actor, pieceId, upload)
  S->>S: ResourceAuthorizer.require(EDIT)
  alt 404 NAO_ENCONTRADO
    S-->>FE: 404 igual para inexistente e invisível
  else 403 ACESSO_NEGADO
    S-->>FE: 403 sem EDIT na peça
  else autorizado
    S->>S: MediaUploadService e MagicBytes conferem tipo real e limites
    alt 413 ARQUIVO_GRANDE
      S-->>FE: 413 acima do limite da categoria CAD
    else 422 FORMATO_NAO_SUPORTADO
      S-->>FE: 422 formato detectado mas sem parser habilitado na matriz
    else aceito para análise
      S->>S3: original em quarentena, nunca sobrescrito
      S->>DB: PieceImport RECEBIDO
      S->>S: parser isolado (sem rede, limites de tempo e memória)
      S->>DB: PieceImport VALIDADO com lossReportJson
      S-->>FE: 202 relatório de fidelidade
      FE-->>U: lista do que será achatado, aproximado ou descartado
      U->>FE: aceita as perdas
      FE->>C: POST /api/pieces/{id}/imports/{importId}/accept (expectedVersion)
      C->>S: PieceImportService.accept
      alt 409 REVISAO_DESATUALIZADA
        S-->>FE: 409 a peça mudou durante a análise, importação continua VALIDADA
      else versão confere
        S->>DB: PieceRevision origem IMPORTACAO e PieceImport IMPORTADO
        S->>EV: PieceImported com ContributionEvent IMPORT
        S-->>FE: 201 nova revisão
      end
    end
  end
  U->>FE: abre referência externa da peça
  FE->>C: GET /api/pieces/{id}/references/{refId}
  C->>S: openReference, relê VIEW no alvo
  S-->>FE: revisão fixada, indicador de divergência, sem URL arbitrária
```

## 4. Máquina de estados

Entidade central: `PieceImport.state` (`ImportState`, planejado). Cada transição registra autor, formato, versão do parser e hash do original; o aceite gera `ContributionEvent` de origem `IMPORT` (real em `lib/pieces/authorship.ts`), e a autoria da peça fica `IMPORTED` até haver log completo, como manda o catálogo de 15/10.

```mermaid
stateDiagram-v2
  [*] --> RECEBIDO: upload autorizado e tipo real confere
  RECEBIDO --> VALIDADO: parser isolado conclui e gera relatório de perdas
  RECEBIDO --> REJEITADO: malformado, excessivo ou dependência ausente
  VALIDADO --> IMPORTADO: usuário aceita as perdas e a versão confere
  VALIDADO --> REJEITADO: usuário recusa as perdas
  VALIDADO --> VALIDADO: 409 REVISAO_DESATUALIZADA, aguarda novo aceite
  IMPORTADO --> [*]
  REJEITADO --> [*]
  note right of REJEITADO
    Projeto existente intacto.
    Original guardado para correção ou descarte.
  end note
  note left of IMPORTADO
    Nova PieceRevision origem IMPORTACAO.
    Original nunca sobrescrito.
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FRONT["Frontend Next.js"]
    R1["app/(shell)/letters e drawings: página-esqueleto (real) · [pieceId] (planejado)"]
    R2["ImportDialog · FidelityReport · ReferencePanel · ExportDialog (planejado)"]
    R3["lib/pieces/authorship.ts e provenance.ts (real)"]
    BFF["app/bff"]
    R1 --> R2 --> BFF
    R2 --> R3
  end
  subgraph WEB["ws-web"]
    PIC["PieceImportController (planejado)"]
    SEC["SecurityConfig · GlobalExceptionHandler (real)"]
  end
  subgraph APPL["ws-application"]
    PIS["pieces/PieceImportService · PieceExportService (planejado)"]
    MUS["media/MediaUploadService · MediaUploadInspector · MagicBytes (real, ainda não é bean)"]
    RA["security/ResourceAuthorizer (real)"]
    FCP["ports: FormatConverterPort (planejado) · MediaStoragePort (real)"]
  end
  subgraph DOM["ws-domain"]
    ENT["PieceImport · FormatCapability · ExternalReference · ImportedAsset (planejado)"]
    MED["MediaObject · TaskAttachment · MediaAccessPolicy · AccessPolicy (real)"]
  end
  subgraph INFRA["ws-infrastructure"]
    PAR["conversores isolados: SVG sanitizado, DXF, glTF (planejado)"]
    MY["persistence-mysql: media_objects, media_scans (real) · piece_imports (planejado)"]
    S3A["storage-s3: S3StorageConfig · LocalMediaStorage (real)"]
    AIP["ai-providers: não usado na importação"]
  end
  BFF --> PIC --> SEC
  PIC --> PIS
  PIS --> RA --> MED
  PIS --> MUS --> MED
  PIS --> FCP
  PIS --> ENT
  FCP --> PAR
  FCP --> S3A --> S3[("S3 / MinIO")]
  PIS --> MY --> MYSQL[("MySQL 8")]
  AIP -.-> EXT[("Claude / Gemini")]
```

## 6. Rastreabilidade

| CA | Classe | Passo | Mensagem | Transição | Componente | Prova exigida (RF72) |
|---|---|---|---|---|---|---|
| **RF70.CA01** | `FormatCapability` de `ws-studio`/`ws-asset`, `PieceExportService`, `PieceImportService` | A4 → P10; A0 → P7 | `imports` e `accept` com 201 | `RECEBIDO → VALIDADO → IMPORTADO` | `PIS`, `FCP` | teste de round-trip com biblioteca de peças conhecidas: IDs, topologia, camadas, materiais, metadados e câmera iguais |
| **RF70.CA02** | `FormatCapability.enabled`, `FormatConverterPort`, `IsolatedParserAdapter`, matriz desta página | F1 → P4 → P5 | 422 `FORMATO_NAO_SUPORTADO` | `RECEBIDO → REJEITADO` | `PAR`, `FCP` | por formato habilitado: corpus de arquivos válidos e adversos, limites medidos, mensagem para recurso sem suporte |
| **RF70.CA03** | `ImportedAsset` (FONTE, PALETA, REFERENCIA), `MagicBytes`, sanitização | A1 → P2 → P5 | `imports` com 415 (real) e 202 | `RECEBIDO → VALIDADO` | `MUS`, `PAR` | teste: WOFF2 e paleta com conteúdo ativo recusados; associação ao projeto persistida |
| **RF70.CA04** | `ExternalReference` (`pinnedRevisionId`, `accessStatus`, `divergent`), `ResourceAuthorizer` | A3 → P8 → P9 → F3 | `GET .../references/{refId}` | — | `PIS`, `RA` | teste com duas contas: referência a peça revogada responde 404; caminho local ou URL arbitrária recusados |
| **RF70.CA05** | `PieceImport` REJEITADO, parser isolado, original em quarentena | P3 → E4; P6 → E6 | 413 `ARQUIVO_GRANDE` e ramo REJEITADO | `RECEBIDO → REJEITADO` | `MUS`, `PAR` | teste: arquivo truncado, bomba de descompressão e dependência ausente; hash da peça existente inalterado |
| **RF70.CA06** | `PieceImport.lossReportJson`, `FidelityReport` | P6 → F2 → A2 | 202 relatório e `accept` | `VALIDADO → IMPORTADO` ou `VALIDADO → REJEITADO` | `R2`, `PIS` | teste: nada é aplicado antes do aceite; relatório lista itens achatados, aproximados e descartados |
| **RF70.CA07** | `GlbValidatorAdapter`, `PieceExportService` | A4 → P10 | — (`POST /api/pieces/{id}/exports`) | — | `PAR`, `S3A` | validador glTF oficial sem erros; unidades, normais e materiais conferidos; texto da tela não fala em certificação |
