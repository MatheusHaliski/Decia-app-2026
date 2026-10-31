# RF63 — Editar cores, gradientes, materiais e estilos de traço
**HU:** — (sem HU no board; RF especificado em 15/10/2026) · **Sprint (board Work Station):** lista *Requisitos Funcionais* sem sprint atribuída · **Equivalente FAI:** — · **Aba/rota:** Drawings (`/drawings`, `/drawings/[pieceId]`; peça aberta a partir de `/tasks/[id]` e da sessão DECIA `/decia/[sessionId]`) · **Página-esqueleto:** registrada em 17/10/2026; editor ainda não implementado (Onda 5 do PLANO_ONDAS)
**Critérios de aceite cobertos:** RF63.CA01 … RF63.CA08 — corpo do card = especificação de docs/produto/requisitos-studio/RF63.md (CAs copiados como estão escritos); classes reais: `authorizePatch`/`PatchOrigin`/`PatchDenial` (`lib/pieces/patch.ts`), `PieceLayer`/`LayerStack` (`lib/pieces/layers.ts`), `canEditDrawingTarget` (`lib/drawings/selection.ts`), `editableNodeIds` (`lib/studio/selection.ts`), `RenderMode`/`toWireframe` (`lib/pieces/wireframe.ts`), `DrawingClassification.accessibility` (`lib/pieces/classification.ts`), `AiGateway`/`AiEnginePort`/`AiBudget` (ws-application, sem motor registrado); o restante (planejado)

O RF63 define como a pessoa autorizada refina a aparência de uma peça do Drawings — cor sólida, gradientes linear e radial, preenchimento, traço (largura, padrão, opacidade, terminações e junções), hachuras e presets técnicos, paletas inspiradas em Itten, materiais de partes 3D e a alternância wireframe/preenchido — sempre dentro do escopo autorizado pela mesma porta de patch (`authorizePatch`) que vale para edição manual e para propostas de IA. Toda conversão de cor declara o perfil usado e só é oferecida quando é de fato suportada.

**Estado em 17/10/2026:** a MATRIZ_RF registra RF63 como AUSENTE (nota 0.00) neste repositório; a nota 6.0 do PLANO_ONDAS (Onda 5) refere-se ao protótipo local (`docs/exemplo_drawings_letters/work_station_letters_drawings.tsx`: cor, espessura e opacidade de traço em um painel de propriedades), que não é o editor do produto. A rota `/drawings` é só página-esqueleto (`app/(shell)/drawings/page.tsx`, `RfPage`). As referências a Illustrator/AutoCAD (`COMANDOS_REFERENCIA_ILLUSTRATOR_AUTOCAD.md`) são inspiração semântica, nunca promessa de paridade. Nenhum motor de IA está registrado (`CONECTORES.md`: `AiGateway` sem chamador de produção, `AiProvidersConfig` vazio).

**Atualização 31/10/2026 (parcial):** o modelo 3D do `/drawings` tem 15 materiais fisicamente baseados (metais, vidro, cerâmica, mármore, madeira, concreto, plástico, borracha, veludo). Os valores são físicos e testados, e madeira, concreto, aço escovado e mármore têm texturas procedurais. A visualização vai de PBR em tempo real a path tracing fotorrealista. Gradientes e estilos de traço 2D continuam ausentes.

## Critérios de aceite

| CA | Enunciado (Dado / Quando / Então) |
|---|---|
| **RF63.CA01** | Dada seleção de objeto, região ou camada, quando altera cor sólida, gradiente linear/radial e preenchimento, então afeta somente o escopo autorizado. |
| **RF63.CA02** | Dado traço, quando ajusta largura, padrão, opacidade, terminações e junções, então renderiza e exporta a mesma aparência dentro das capacidades declaradas. |
| **RF63.CA03** | Dadas hachuras de seção, cotas e hierarquia de linhas, quando usa preset técnico, então referencia norma/edição aplicável e não declara conformidade sem validação. |
| **RF63.CA04** | Dadas harmonias Itten e controles inspirados em Munsell, quando recomenda paleta, então identifica o modelo e não confunde HSL/RGB com Munsell calibrado. |
| **RF63.CA05** | Dado RGB/CMYK/ICC, quando converte ou exporta, então informa perfil utilizado e só habilita conversão efetivamente suportada. |
| **RF63.CA06** | Dado material de parte 3D, quando edita, então conserva geometria, seleção e ordem de camadas. |
| **RF63.CA07** | Dada alternância wireframe/preenchido, quando ocorre, então mantém estruturas selecionáveis e permite recuperar o estado anterior pelo histórico. |
| **RF63.CA08** | Dada seleção e atributo ativo (preenchimento ou traço), quando usa Shift+X, D ou /, então troca os atributos suportados, restaura branco/preto de 1 unidade ou aplica nenhum ao atributo escolhido; não intercepta texto em campos e rejeita conversões não suportadas sem perda da aparência. |

## Suporte de cor e aparência declarado

| Recurso | Situação declarada na interface | Observação |
|---|---|---|
| sRGB (prévia, PNG, SVG) | Suportado no plano da primeira entrega | Espaço de trabalho único; perfil informado na exportação como `sRGB IEC 61966-2.1` |
| HSL/HSV como seletor | Suportado como controle de entrada | Rotulado HSL; nunca rotulado como Munsell |
| CMYK | **Não implementado** — conversão desabilitada | Nenhuma fórmula RGB→CMYK; fidelidade de impressão não é declarada |
| Perfis ICC | **Não implementado** — leitura e aplicação de perfil desabilitadas | Exportação informa “sem perfil ICC incorporado” |
| Munsell calibrado | **Não implementado** | Controles “inspirados em Munsell” (matiz, valor, croma aproximados) identificam o modelo real usado |
| Harmonias Itten | Heurística declarada | Complementar, análoga, tríade, claro/escuro, quente/frio; não é nota de qualidade |
| Hachuras e presets técnicos | Referência a norma/edição a verificar | NBR 10067/10126/12298 vieram do prompt; nenhum selo “ABNT aprovado” |
| Traço composto exigido por gradiente/hachura | Recusado sem perda | Atalhos Shift+X, D e / preservam a aparência original |

Cada arraste (alças de gradiente, vetor, ponto de stop, espessura) tem alternativa numérica equivalente por teclado e campo (WCAG 2.5.7). Cor nunca é o único sinal: reservas, erros e estados aparecem com texto.

## 0. Diagrama de casos de uso

Casos de uso derivados dos CAs. Todos são planejados: o editor do Drawings ainda não existe, só as regras puras de `lib/pieces/` e `lib/drawings/`.

```mermaid
flowchart LR
  classDef ator fill:#fde7d3,stroke:#b4531a,color:#1b1b1b
  classDef atorSis fill:#f1ecf9,stroke:#6a4bb3,color:#1b1b1b
  classDef uc fill:#ffffff,stroke:#3557a6,color:#1b1b1b
  classDef ucPlan fill:#ffffff,stroke:#8a8a8a,stroke-dasharray:4 3,color:#555555
  dono["«ator» Dono do recurso"]:::ator
  colaborador["«ator» Colaborador explícito"]:::ator
  subgraph SIS["Work Station — RF63 Cores e traço"]
    direction TB
    UC1(["UC1 Aplicar cor, gradiente e preenchimento à seleção"]):::ucPlan
    UC2(["UC2 Ajustar o estilo do traço"]):::ucPlan
    UC3(["UC3 Aplicar hachura ou preset técnico"]):::ucPlan
    UC4(["UC4 Pedir paleta por harmonia de cor"]):::ucPlan
    UC5(["UC5 Converter ou exportar com perfil de cor"]):::ucPlan
    UC6(["UC6 Editar material de parte 3D"]):::ucPlan
    UC7(["UC7 Alternar wireframe e preenchido"]):::ucPlan
    UC8(["UC8 Trocar ou restaurar preenchimento e traço por atalho"]):::ucPlan
    UC9(["UC9 Verificar o escopo autorizado do patch"]):::ucPlan
  end
  ia["«ator» IA (AiGateway)"]:::atorSis
  dono --- UC1
  colaborador --- UC1
  dono --- UC2
  colaborador --- UC2
  dono --- UC3
  colaborador --- UC3
  dono --- UC4
  colaborador --- UC4
  dono --- UC5
  colaborador --- UC5
  dono --- UC6
  colaborador --- UC6
  dono --- UC7
  colaborador --- UC7
  dono --- UC8
  colaborador --- UC8
  UC1 -. "«include»" .-> UC9
  UC6 -. "«include»" .-> UC9
  UC8 -. "«include»" .-> UC9
  UC4 --- ia
```

| Caso de uso | Ator(es) | CAs | Situação |
|---|---|---|---|
| UC1 Aplicar cor, gradiente e preenchimento à seleção | `dono`, `colaborador` | RF63.CA01 | planejado |
| UC2 Ajustar o estilo do traço | `dono`, `colaborador` | RF63.CA02 | planejado |
| UC3 Aplicar hachura ou preset técnico | `dono`, `colaborador` | RF63.CA03 | planejado |
| UC4 Pedir paleta por harmonia de cor | `dono`, `colaborador`, `ia` | RF63.CA04 | planejado (IA só como proposta revisável; nenhum motor registrado) |
| UC5 Converter ou exportar com perfil de cor | `dono`, `colaborador` | RF63.CA05 | planejado (só sRGB no plano; CMYK e ICC desabilitados) |
| UC6 Editar material de parte 3D | `dono`, `colaborador` | RF63.CA06 | planejado |
| UC7 Alternar wireframe e preenchido | `dono`, `colaborador` | RF63.CA07 | planejado (conversão pura em `lib/pieces/wireframe.ts`) |
| UC8 Trocar ou restaurar preenchimento e traço por atalho | `dono`, `colaborador` | RF63.CA08 | planejado |
| UC9 Verificar o escopo autorizado do patch | — (incluído por UC1, UC6, UC8) | RF63.CA01, RF63.CA06, RF63.CA08 | planejado (regra pura `authorizePatch` em `lib/pieces/patch.ts`, sem editor) |

## 1. Diagrama de classes

```mermaid
classDiagram
direction LR
namespace lib_pieces_real {
  class LayerStack {
    <<entity>>
    +layers: List~PieceLayer~
    +activeLayerId: string
  }
  class AuthorizePatch {
    <<service>>
    +authorizePatch(stack, locks, req, now) PatchVerdict
  }
  class RenderMode {
    <<enum>>
    FILLED
    WIREFRAME
  }
}
namespace ws_application_ai_real {
  class AiGateway {
    <<service>>
    +infer(AiRequest) AiResult
  }
}
namespace ws_domain_drawings_planejado {
  class DrawingObject {
    <<entity>>
    +id: UUID
    +layerId: UUID
    +regionIds: List~UUID~
    +revision: long
    +renderMode: RenderMode
    +material: Material3D
  }
  class AppearanceStyle {
    <<entity>>
    +fill: Paint
    +stroke: StrokeStyle
    +colorSpace: ColorSpace
    +unsupportedJson: JSON
  }
  class StrokeStyle {
    <<entity>>
    +width: double
    +dashPattern: List~Double~
    +opacity: double
    +linecap: LineCap
    +linejoin: LineJoin
  }
  class ColorSpace {
    <<enum>>
    SRGB
    CMYK_NAO_SUPORTADO
    ICC_NAO_SUPORTADO
  }
  class TechnicalStylePreset {
    <<entity>>
    +standardRef: String
    +edition: String
    +conformance: ConformanceClaim
  }
  class PaletteSuggestion {
    <<entity>>
    +model: ColorModel
    +munsellCalibrated: boolean
    +origin: SuggestionOrigin
  }
  class AppearanceService {
    <<service>>
    +applyPaint(scope, attr, paint) Revision
    +applyStroke(scope, stroke) Revision
    +swapFillStroke(scope) Revision
    +toggleRenderMode(scope) Revision
  }
  class ColorProfilePort {
    <<port>>
    +capabilities() List~ColorSpace~
  }
}
DrawingObject --> AppearanceStyle : aparência
AppearanceStyle *-- StrokeStyle : traço
AppearanceStyle --> ColorSpace
DrawingObject --> RenderMode
AppearanceService ..> AuthorizePatch : mesma porta MANUAL e IA
AuthorizePatch ..> LayerStack
AppearanceService ..> ColorProfilePort : só conversões suportadas
AppearanceService ..> TechnicalStylePreset
AppearanceService ..> AiGateway : paleta como proposta
AiGateway ..> PaletteSuggestion
note for AuthorizePatch "real em lib/pieces/patch.ts - PatchOrigin MANUAL ou IA - recusa CAMADA_OCULTA, FORA_DA_SELECAO, REGIAO_RESERVADA"
note for AiGateway "real - nenhum AiEnginePort registrado em 17/10/2026"
note for AppearanceStyle "Paint.kind NENHUM, SOLIDO, GRADIENTE_LINEAR, GRADIENTE_RADIAL, HACHURA"
note for PaletteSuggestion "ColorModel ITTEN_HARMONIA, HSL, SRGB, INSPIRADO_EM_MUNSELL - origin HEURISTICA_LOCAL, MOCK, IA_REAL"
note for TechnicalStylePreset "ConformanceClaim NAO_DECLARADA por padrão - sem selo ABNT"
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph PES["Pessoa (proprietário ou colaborador autorizado)"]
    P0(["Seleciona objeto, região ou camada no modo Editar"]) --> P1{"Qual atributo?"}
    P1 -->|"cor ou gradiente"| P2["Ajusta cor, stops e vetor por arraste ou por campos numéricos (WCAG 2.5.7)"]
    P1 -->|"traço"| P3["Largura, padrão, opacidade, terminação, junção, limite de mitra"]
    P1 -->|"preset técnico"| P4["Escolhe hachura, cota ou hierarquia de linhas"]
    P1 -->|"Shift+X, D ou /"| P5["Troca preenchimento e traço, restaura branco/preto de 1 unidade ou aplica nenhum"]
    P1 -->|"material 3D"| P6["Edita material da parte selecionada"]
    P1 -->|"wireframe ou preenchido"| P7["Alterna modo de render no escopo"]
    P8(["Pede paleta ao Assistente IA"])
    P9(["Exporta PNG, SVG ou PDF"])
    P10(["Desfaz pelo histórico"])
  end
  subgraph BFF["Next.js / BFF (app/(shell)/drawings)"]
    B1{"Foco em campo de texto?"}
    B2["Prévia local e patch com expectedRevision, leaseId, fencingToken e idempotencyKey"]
    B3["Painel mostra capacidades declaradas: sRGB ativo, CMYK e ICC desabilitados"]
    B4["Mostra proposta separada do desenho, com origem, modelo de cor, custo e versão"]
  end
  subgraph APP["ws-application"]
    S1{"ResourceAuthorizer: acesso à peça?"}
    S2{"authorizePatch MANUAL ou IA"}
    S3{"Atributo representável sem perda?"}
    S4["AppearanceService grava nova revisão e preserva atributos não suportados"]
    S5["Preset referencia norma e edição com conformance NAO_DECLARADA"]
    S6{"Conversão suportada por ColorProfilePort?"}
    S7{"AiGateway: classe, orçamento e motor"}
    S8["Toggle de render guarda o estado anterior na revisão"]
  end
  subgraph IA["IA (AiEngine)"]
    I1["Propõe paleta identificando o modelo (Itten, HSL); nunca rotula como Munsell calibrado"]
    I2["Sem motor: heurística local rotulada HEURISTICA_LOCAL"]
  end
  subgraph DB["Persistência"]
    D1[("MySQL: drawing_objects e revisões (planejado)")]
    D2[("ai_inference_log: provedor, modelo, custo, versão")]
    D3[("S3: exportação com perfil informado")]
  end
  E403["403 ACESSO_NEGADO (SIGILOSO sem concessão explícita)"]
  E409["409 REGIAO_RESERVADA"]
  E422["422 VALIDACAO (fora da seleção, camada oculta ou conversão não suportada)"]
  E429["429 ORCAMENTO_IA (IA_ORCAMENTO_ESGOTADO)"]
  E503["503 IA_INDISPONIVEL"]
  P2 --> B2
  P3 --> B2
  P4 --> S5 --> B2
  P5 --> B1
  B1 -->|sim| P0
  B1 -->|não| B2
  P6 --> B2
  P7 --> S8 --> B2
  B2 --> S1
  S1 -->|não| E403
  S1 -->|sim| S2
  S2 -->|REGIAO_RESERVADA| E409
  S2 -->|"FORA_DA_SELECAO, CAMADA_OCULTA, CAMADA_TRAVADA"| E422
  S2 -->|ok| S3
  S3 -->|não| E422
  S3 -->|sim| S4 --> D1
  P9 --> B3 --> S6
  S6 -->|"CMYK ou ICC"| E422
  S6 -->|sRGB| D3
  P8 --> S7
  S7 -->|"RESTRITO/SIGILOSO sem motor local"| E422
  S7 -->|"orçamento esgotado"| E429
  S7 -->|"sem motor"| E503
  E503 --> I2
  S7 -->|ok| I1
  I1 --> D2
  I1 --> B4
  I2 --> B4
  B4 -->|aceita| S2
  P10 --> D1
```

## 3. Diagrama de sequência

```mermaid
sequenceDiagram
  autonumber
  participant U as Usuário
  participant N as Next.js (App Router)
  participant C as Controller (ws-web)
  participant S as Service (ws-application)
  participant AI as AiEngine
  participant DB as Repository/MySQL
  participant R as Redis
  participant S3 as S3
  participant EV as DomainEvents (AFTER_COMMIT)
  U->>N: seleciona região B2 na camada Frente e define gradiente radial (arraste ou campos)
  N->>C: PATCH /api/drawings/pieceId/appearance (expectedRevision, leaseId, fencingToken, idempotencyKey)
  C->>S: AppearanceService.applyPaint(actor, scope, FILL, paint)
  S->>DB: carrega peça, ACL e accessClass
  alt sem acesso ou SIGILOSO sem concessão explícita
    S-->>C: ApiException ACESSO_NEGADO
    C-->>N: 403 ACESSO_NEGADO
  end
  S->>S: authorizePatch(stack, locks, MANUAL, targets)
  alt alvo em região reservada por outra pessoa
    S-->>N: 409 REGIAO_RESERVADA (sem revelar conteúdo alheio)
  else alvo fora da seleção ou camada oculta
    S-->>N: 422 VALIDACAO (FORA_DA_SELECAO ou CAMADA_OCULTA)
  end
  S->>DB: grava revisão nova com AppearanceStyle e atributos não suportados preservados
  S->>EV: AppearanceChanged após commit
  EV->>R: publica patch aos colegas da peça
  S-->>N: 200 revisão nova
  U->>N: exporta PDF em CMYK
  N->>C: POST /api/drawings/pieceId/exports (formato PDF, espaço CMYK)
  C->>S: ExportService.export
  alt CMYK ou ICC não suportado
    S-->>N: 422 VALIDACAO (conversão não suportada, perfil atual sRGB)
  end
  S->>S3: grava exportação sRGB com perfil informado
  S-->>N: 201 exportação e metadados do perfil
  U->>N: pede paleta (harmonia complementar)
  N->>C: POST /api/drawings/pieceId/ai/palette
  C->>S: AiGateway.infer (capability e classificação da peça)
  alt orçamento esgotado
    S-->>N: 429 ORCAMENTO_IA (IA_ORCAMENTO_ESGOTADO)
  else sem motor registrado ou RESTRITO sem motor local
    S-->>N: 503 IA_INDISPONIVEL e heurística local rotulada
  end
  S->>AI: complete(prompt mascarado)
  AI-->>S: paleta com modelo identificado
  S->>DB: ai_inference_log (provedor, modelo, custo, versão)
  S-->>N: PaletteSuggestion EM_REVISAO
  N-->>U: proposta separada do desenho, aceitar ou rejeitar
```

## 4. Máquina de estados

Entidades: a proposta de paleta/estilo da IA (`AiDrawingProposal.status`, planejado, sobre `AiProposal`/`proposalValidity` reais de `lib/ai/autonomy.ts`), a reserva de região (`DrawingLease`, planejado sobre `RegionLock` real) e o modo de render do escopo (`RenderMode` real).

```mermaid
stateDiagram-v2
  state "Proposta de IA (AiDrawingProposal.status)" as PROP {
    [*] --> SOLICITADA: pedido explícito do usuário
    SOLICITADA --> GERADA: AiGateway devolve paleta ou estilo
    GERADA --> EM_REVISAO: exibida separada do desenho
    EM_REVISAO --> ACEITA: revisão humana e authorizePatch IA ok
    EM_REVISAO --> REJEITADA: usuário rejeita, desenho intacto
    EM_REVISAO --> INVALIDADA_POR_POLITICA: versão da política, revisão ou escopo mudou
    ACEITA --> [*]
    REJEITADA --> [*]
    INVALIDADA_POR_POLITICA --> [*]
  }
  state "Reserva de região (DrawingLease)" as LEASE {
    [*] --> LIVRE
    LIVRE --> RESERVADA: acquireLock sem interseção na mesma camada
    RESERVADA --> RESERVADA: renovação com fencing token vigente
    RESERVADA --> LIBERADA: releaseLocks pelo dono
    RESERVADA --> EXPIRADA: relógio do servidor passa de expiresAt
    LIBERADA --> [*]
    EXPIRADA --> [*]
  }
  state "Modo de render do escopo (RenderMode)" as RENDER {
    [*] --> FILLED
    FILLED --> WIREFRAME: toWireframe guarda o estado anterior na revisão
    WIREFRAME --> FILLED: desfazer pelo histórico ou completeWireframe
  }
```

Falhas `429 ORCAMENTO_IA` e `503 IA_INDISPONIVEL` não criam proposta: a solicitação termina sem estado novo e a nova tentativa é explícita (sem repetição automática de chamada cobrada). Expirar ou liberar uma reserva nunca apaga o desenho.

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FRONT["Frontend Next.js"]
    PG["app/(shell)/drawings/page.tsx (real, esqueleto RfPage)"]
    ED["DrawingEditor, AppearancePanel, AiAssistantDrawer (planejado)"]
    LIB["lib/pieces/patch.ts, layers.ts, wireframe.ts e lib/drawings/selection.ts (real)"]
    BFF["app/bff (planejado para /api/drawings)"]
    PG --> ED --> LIB
    ED --> BFF
  end
  subgraph WEB["ws-web"]
    DC["DrawingController (planejado)"]
  end
  subgraph APPL["ws-application"]
    AS["AppearanceService e ExportService (planejado)"]
    PS["DrawingPatchService com authorizePatch no servidor (planejado)"]
    RA["security/ResourceAuthorizer (real)"]
    GW["ai/AiGateway, AiBudget, PersonalDataMasker (real)"]
    EVT["DomainEvents AFTER_COMMIT"]
  end
  subgraph DOM["ws-domain"]
    AP["security/AccessPolicy (real)"]
    ENT["DrawingPiece, DrawingObject, AppearanceStyle, TechnicalStylePreset (planejado)"]
  end
  subgraph INFRA["ws-infrastructure"]
    MY["persistence-mysql"]
    RD["cache-redis (presença e fan-out)"]
    S3A["storage-s3 (exportações)"]
    AIP["ai-providers (AiProvidersConfig vazio)"]
    PLAT["platform (rasterização e perfis, planejado)"]
  end
  EXT["Claude / Gemini (não registrados)"]
  BFF --> DC --> AS --> PS
  PS --> RA --> AP
  AS --> GW --> AIP -.-> EXT
  AS --> PLAT
  PS --> ENT --> MY --> MYSQL[("MySQL 8")]
  PS --> EVT --> RD --> REDIS[("Redis")]
  AS --> S3A --> S3[("S3 / MinIO")]
```

## 6. Rastreabilidade

| CA | Classe | Passo | Mensagem | Transição | Componente |
|---|---|---|---|---|---|
| RF63.CA01 | `AppearanceService.applyPaint`, `Paint.kind` (nota de `AppearanceStyle`), `AuthorizePatch` (real), `canEditDrawingTarget` (real) | P0 → P1 → P2 → B2 → S1 → S2 → S4 | PATCH appearance, `authorizePatch`, alt 409/422 | LEASE `RESERVADA` | `PS`, `LIB`, `RA` |
| RF63.CA02 | `StrokeStyle` (largura, padrão, opacidade, linecap, linejoin), `ColorProfilePort` | P3 → B2 → S3 → S4; P9 → B3 → S6 | POST exports, alt 422 conversão | — | `AS`, `PLAT`, `S3A` |
| RF63.CA03 | `TechnicalStylePreset` (standardRef, edition, conformance `NAO_DECLARADA`) | P4 → S5 → B2 | PATCH appearance com preset | — | `ENT`, `AS` |
| RF63.CA04 | `PaletteSuggestion` (model, munsellCalibrated=false, origin), `AiGateway` (real) | P8 → S7 → I1/I2 → B4 | POST ai/palette, alt 429/503 | PROP `SOLICITADA → GERADA → EM_REVISAO` | `GW`, `AIP`, `EXT` |
| RF63.CA05 | `ColorSpace` (SRGB, CMYK_NAO_SUPORTADO, ICC_NAO_SUPORTADO), `ColorProfilePort.capabilities` | P9 → B3 → S6 → D3 ou E422 | alt 422 conversão não suportada, exportação com perfil informado | — | `PLAT`, `S3A` |
| RF63.CA06 | `DrawingObject.material` (`Material3D`), `DrawingObject.layerId/regionIds`, `LayerStack` (real) | P6 → B2 → S2 → S4 | PATCH appearance (material) | — | `AS`, `ENT` |
| RF63.CA07 | `RenderMode`/`toWireframe`/`completeWireframe` (real), `editableNodeIds` (real), revisão anterior | P7 → S8 → B2; P10 → D1 | PATCH appearance (render) | RENDER `FILLED ⇄ WIREFRAME` | `LIB`, `MY` |
| RF63.CA08 | `AppearanceService.swapFillStroke` (Shift+X), restaurar padrão (D) e nenhum (/), `AppearanceStyle.unsupportedJson` | P5 → B1 → B2 → S3 → E422 sem perda ou S4 | PATCH appearance, alt 422 | — | `ED`, `AS` |
