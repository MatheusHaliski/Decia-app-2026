# RF61 — Desmembrar e converter estruturas 3D preservando intenção
**HU:** — (sem HU no board; RF especificado em 15/10/2026) · **Sprint (board Work Station):** lista *Requisitos Funcionais* sem sprint atribuída · **Equivalente FAI:** — · **Aba/rota:** Drawings (`/drawings`, `/drawings/[pieceId]`; peça aberta a partir de `/tasks/[id]` e da sessão DECIA `/decia/[sessionId]`) · **Página-esqueleto:** registrada em 17/10/2026; editor ainda não implementado (Onda 5 do PLANO_ONDAS)
**Critérios de aceite cobertos:** RF61.CA01 … RF61.CA08 — corpo do card = especificação de docs/produto/requisitos-studio/RF61.md (CAs copiados como estão escritos); classes reais: `authorizePatch` (`lib/pieces/patch.ts`), `LayerStack` (`lib/pieces/layers.ts`), `RegionLock` (`lib/pieces/collab.ts`), `evaluateAiAction`/`proposalValidity` (`lib/ai/autonomy.ts`); o restante (planejado)

O RF61 separa operações que a referência CAD costuma misturar: `EXPLODIR` uma malha em faces independentes (superfícies abertas não são sólidos), converter em superfície preservando coordenadas e materiais, `SEPARAR_DISJUNTOS` corpos mantendo-os volumétricos, fatiar por plano (SLICE) com original recuperável, recompor em sólido só com malha fechada ou reparo revisável, explodir blocos preservando atributos como texto (BURST), consolidar representação explicando o que se remove e projetar o 3D em vetores 2D editáveis com profundidade zero (FLATTEN/Expand Appearance). Regra central: **desmembrar nunca descarta propriedades sem avisar** — cada operação gera um relatório de preservação (o que fica, o que se perde, o que exige confirmação) e mantém vínculo de proveniência com o objeto de origem. Toda operação é **capacidade futura declarada por operação**: a interface informa disponível, parcial, futura ou não suportada (por exemplo, blocos com atributos ainda sem modelo). Plano de corte e câmera de projeção têm campos numéricos equivalentes ao arraste (WCAG 2.5.7) e o relatório é lido pelo leitor de tela. Nomes AutoCAD (EXPLODE, CONVTOSURFACE, SOLIDEDIT, BREP) são inspiração semântica, sem paridade.

Estado real (MATRIZ_RF de 17/10/2026: AUSENTE, 0,00): não há código 3D nesta árvore; só a autorização de patch, camadas, reservas e autonomia (funções puras) servem de base. A evidência local de 15/10 (`docs/auditoria/2026-10-15/comandos-do-zero/`, etapas 13–15: SLICE, EXPLODE em faces e CONVTOSOLID com verificação de fechamento, sem provar ausência de autointerseção) está em código ainda fora do repositório. Fontes: `COMANDOS_REFERENCIA_ILLUSTRATOR_AUTOCAD.md` §1 (aviso do usuário: explodir sólido destrói o volume, para corpos disjuntos usa-se Separate), PLANO_ONDAS Onda 5.

## Critérios de aceite

| CA | Enunciado (Dado / Quando / Então) |
|---|---|
| **RF61.CA01** | Dado EXPLODE/X ou MESHELEMENTS, quando desmembra malha, então gera faces independentes e identifica que superfícies abertas não são sólidos. |
| **RF61.CA02** | Dado CONVTOSURFACE, quando converte, então preserva coordenadas, materiais e correspondência com objeto de origem. |
| **RF61.CA03** | Dado SEPARATE/SOLIDEDIT Body Separate, quando há corpos disjuntos, então separa componentes mantendo-os volumétricos quando fechados. |
| **RF61.CA04** | Dado SLICE, quando define plano por normal/posição ou pontos, então cria partes corretas, preserva original recuperável e informa corte sem interseção. |
| **RF61.CA05** | Dado CONVTOSOLID, quando recebe malha aberta/não manifold, então recusa ou oferece reparo revisável; não presume volume válido. |
| **RF61.CA06** | Dado BURST, quando existem atributos de bloco, então converte seus valores para texto sem perda; sem suporte a blocos deve informar indisponibilidade. |
| **RF61.CA07** | Dado BREP, quando consolida representação suportada, então explica o que é removido; malha consolidada não é rotulada como sólido B-rep. |
| **RF61.CA08** | Dado FLATTEN/Expand Appearance, quando projeta na câmera/plano escolhido, então cria vetores 2D editáveis com profundidade zero e sem remover o 3D original sem confirmação. |

## 1. Diagrama de classes

**(real)**: `PatchAuthorizer`, `RegionLock`, `AutonomyPolicy`. Demais **(planejado)**; `SolidBody` e `OperationCapability` são os mesmos do RF60 e não constam de `docs/arquitetura/TAXONOMIA.md`.

```mermaid
classDiagram
direction LR
namespace lib_real {
  class PatchAuthorizer {
    <<service>>
    +authorizePatch(stack, locks, req, now) PatchVerdict
  }
  class RegionLock {
    <<entity>>
    +layerId: string
    +regionIds: List~string~
    +expiresAt: number
  }
  class AutonomyPolicy {
    <<service>>
    +evaluateAiAction(policy, action, ctx) Verdict
  }
}
namespace desmembrar_planejado {
  class DecomposeKind {
    <<enum>>
    EXPLODIR_FACES
    CONVERTER_SUPERFICIE
    SEPARAR_DISJUNTOS
    FATIAR
    RECOMPOR_SOLIDO
    EXPLODIR_BLOCO
    CONSOLIDAR_REPRESENTACAO
    PROJETAR_2D
  }
  class SolidBody {
    <<entity>>
    +representation: MALHA_ou_BREP_FUTURO
    +closed: boolean
    +manifold: boolean
    +materialIds: List~string~
  }
  class SurfacePatch {
    <<entity>>
    +isOpen: boolean
    +materialId: string
  }
  class SlicePlane {
    <<entity>>
    +normal: Vec3
    +position: Vec3
    +throughPoints: List~Vec3~
  }
  class BlockAttribute {
    <<entity>>
    +tag: string
    +value: string
  }
  class FlattenProjection {
    <<entity>>
    +cameraId: string
    +plane: string
    +depth: zero
    +keepOriginal: boolean
  }
  class MeshRepairProposal {
    <<entity>>
    +holesFilled: number
    +nonManifoldEdges: number
    +reviewedBy: string
  }
  class IntentPreservationReport {
    <<entity>>
    +preserved: List~string~
    +lost: List~string~
    +requiresConfirmation: boolean
    +unsupportedReason: string
  }
  class ProvenanceLink {
    <<entity>>
    +sourceId: string
    +derivedIds: List~string~
    +operation: DecomposeKind
  }
  class OperationCapability {
    <<entity>>
    +operation: DecomposeKind
    +status: DISPONIVEL_PARCIAL_FUTURA_NAO_SUPORTADA
    +limitation: string
  }
}
namespace ws_planejado {
  class DecomposeService {
    <<service>>
    +analyze(actor, pieceId, kind, targets) IntentPreservationReport
    +apply(actor, pieceId, kind, confirmation) DrawingRevision
  }
  class MeshKernelPort {
    <<port>>
    +split(body, plane) List~SolidBody~
    +components(body) List~SolidBody~
    +checkClosed(body) MeshVerdict
  }
  class DrawingRepositoryPort {
    <<port>>
    +saveRevision(revision) void
    +restore(revisionId) Drawing
  }
}
DecomposeService ..> DecomposeKind
DecomposeService ..> IntentPreservationReport
DecomposeService ..> ProvenanceLink
DecomposeService ..> OperationCapability
DecomposeService ..> MeshKernelPort
DecomposeService ..> DrawingRepositoryPort
DecomposeService ..> PatchAuthorizer
DecomposeService ..> AutonomyPolicy
SolidBody ..> SurfacePatch
MeshKernelPort ..> SlicePlane
MeshRepairProposal ..> SolidBody
BlockAttribute ..> ProvenanceLink
FlattenProjection ..> ProvenanceLink
note for IntentPreservationReport "nenhuma propriedade some sem aviso - lost nao vazio exige confirmacao, unsupportedReason bloqueia"
note for SolidBody "malha consolidada nunca e rotulada como B-rep enquanto nao houver kernel"
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph P["Pessoa"]
    A1["Seleciona sólido, malha ou bloco (clique ou lista navegável)"]
    A2["Escolhe a operação: explodir faces, converter em superfície, separar disjuntos, fatiar, recompor, explodir bloco, consolidar ou projetar em 2D"]
    A3["Informa plano de corte (normal e posição ou três pontos) ou câmera e plano de projeção em campos"]
    A4["Lê o relatório de preservação e confirma, revisa reparo ou cancela"]
  end
  subgraph FE["Next.js (App Router) · BFF"]
    F1["OperationCapability da operação (DISPONIVEL, PARCIAL, FUTURA, NAO_SUPORTADA)"]
    F2{"Suportada?"}
    F3["Informa indisponibilidade (ex.: blocos com atributos sem modelo) sem alterar nada"]
    F4["POST /api/drawings/[pieceId]/decompose/analyze (planejado)"]
    F5["Mostra relatório: preservado, perdido, superfícies abertas, corpos fechados, corte sem interseção"]
    F6["Projeção 2D cria vetores com profundidade zero, e remover o 3D é opção separada e desmarcada"]
    F7["POST /api/drawings/[pieceId]/decompose/apply com confirmação e baseRevision"]
  end
  subgraph APP["ws-application"]
    S1{"Peça visível e ator editor?"}
    S2{"authorizePatch (camada, escopo, reserva)"}
    S3["DecomposeService.analyze gera IntentPreservationReport"]
    S4{"Recompor: malha fechada e manifold?"}
    S5["Gera MeshRepairProposal revisável, sem presumir volume"]
    S6{"Plano intercepta o sólido?"}
    S7["Grava revisão nova com ProvenanceLink, materiais e coordenadas, original recuperável"]
    E404["404 NAO_ENCONTRADO"]
    E403["403 ACESSO_NEGADO"]
    E409["409 REGIAO_RESERVADA"]
    E422["422 GEOMETRIA_INVALIDA"]
  end
  subgraph IA["IA (AiEngine)"]
    I1["Pedido explícito: explicar a diferença entre explodir e separar"]
    I2["Explicação e proposta de operação, nunca executada sozinha"]
  end
  subgraph DB["Persistência"]
    D1[("MySQL: drawing_revisions, provenance_links (planejado)")]
    D2[("S3: malha original da revisão anterior e GLB")]
  end

  A1 --> A2 --> F1 --> F2
  F2 -->|"não"| F3
  F2 -->|"sim"| A3 --> F4 --> S1 -->|"não visível"| E404
  S1 -->|"leitor"| E403
  S1 -->|"ok"| S2 -->|"reserva alheia"| E409
  S2 -->|"ok"| S3 --> S4
  S4 -->|"não"| S5 --> F5
  S4 -->|"sim ou não se aplica"| S6
  S6 -->|"não intercepta"| E422
  S6 -->|"sim ou não se aplica"| F5
  F5 --> F6 --> A4
  A4 -->|"confirma"| F7 --> S7 --> D1 & D2
  A4 -->|"cancela"| F3
  A2 -.->|"assistente"| I1 --> I2 --> F5
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
  participant R as Repository/MySQL
  participant S3 as S3
  participant EV as DomainEvents (AFTER_COMMIT)

  U->>N: seleciona o sólido e escolhe fatiar com normal 0 0 1 e posição z 40
  N->>N: OperationCapability indica PARCIAL com malha poligonal
  N->>C: POST /api/drawings/{pieceId}/decompose/analyze
  C->>S: DecomposeService.analyze(actor, pieceId, FATIAR, targets)
  S->>R: findVisible(pieceId, actor)
  alt peça invisível ou inexistente
    S-->>C: 404 NAO_ENCONTRADO
  else ator sem papel de edição
    S-->>C: 403 ACESSO_NEGADO
  else sólido em região reservada por outra pessoa
    S-->>C: 409 REGIAO_RESERVADA
  else plano não intercepta o sólido
    S-->>C: 422 GEOMETRIA_INVALIDA informando corte sem interseção
  else análise concluída
    S-->>C: relatório com duas partes fechadas e materiais preservados
  end
  C-->>N: relatório lido por aria-live
  U->>N: confirma
  N->>C: POST /api/drawings/{pieceId}/decompose/apply com confirmação
  C->>S: DecomposeService.apply(actor, pieceId, FATIAR, confirmação)
  S->>S3: guarda a malha original da revisão anterior
  S->>R: grava partes e ProvenanceLink com o sólido de origem
  S-->>C: 200 com nova revisão
  S->>EV: SolidDecomposed
  U->>N: recompor em sólido uma malha aberta
  N->>C: POST /api/drawings/{pieceId}/decompose/analyze
  C->>S: analyze RECOMPOR_SOLIDO
  S-->>N: recusa volume e oferece MeshRepairProposal revisável
  opt explicação pedida à IA
    U->>N: pergunta se deve explodir ou separar
    N->>C: POST /api/drawings/{pieceId}/ai/ask
    C->>S: evaluateAiAction(policy, RESPONDER, ctx)
    S->>AI: operação, tipo de corpo e relatório
    AI-->>S: explicação identificada como IA
    S-->>N: resposta sem executar nada
  end
```

## 4. Máquina de estados

Seleção, reserva e comando seguem o RF57; o **desmembramento** (planejado) garante que nenhuma propriedade se perca sem aviso.

```mermaid
stateDiagram-v2
  direction LR
  state Selecao {
    [*] --> VAZIA
    VAZIA --> PARCIAL : escolhe corpos, faces ou bloco
    PARCIAL --> NOS : corpos editáveis
    PARCIAL --> REGIAO : faces de um corpo
    NOS --> VAZIA : Escape
    REGIAO --> VAZIA : Escape
  }
  state Reserva {
    [*] --> LIVRE
    LIVRE --> RESERVADA : acquire sem conflito
    RESERVADA --> EXPIRADA : prazo vence
    RESERVADA --> LIBERADA : dono libera
    EXPIRADA --> LIVRE
    LIBERADA --> LIVRE
  }
  state Comando {
    [*] --> EM_EDICAO
    EM_EDICAO --> APLICADO : confirmação e revisão gravada
    APLICADO --> DESFEITO : Ctrl+Z restaura o original
    DESFEITO --> APLICADO : refazer
  }
  state Desmembramento {
    [*] --> ANALISE
    ANALISE --> INDISPONIVEL : operação não suportada
    ANALISE --> REPARO_PROPOSTO : malha aberta ou não manifold
    ANALISE --> AVISO_PERDA : relatório lista perdas
    ANALISE --> PRONTO : nada se perde
    REPARO_PROPOSTO --> PRONTO : reparo revisado e aceito
    AVISO_PERDA --> PRONTO : pessoa confirma
    AVISO_PERDA --> [*] : pessoa cancela
    INDISPONIVEL --> [*]
    PRONTO --> [*]
  }
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FRONT["Frontend Next.js"]
    PG["app/(shell)/drawings/page.tsx (real, página-esqueleto)"]
    V3D["Área 3D do DrawingEditor (planejado)"]
    REP["Relatório de preservação e campos de plano e câmera (planejado)"]
    PATCH["lib/pieces/patch.ts, layers.ts, collab.ts (real)"]
    AUT["lib/ai/autonomy.ts (real)"]
    UI["components/ui (real)"]
    BFF["BFF /api/drawings (planejado)"]
  end
  subgraph WEB["ws-web"]
    DC["DrawingController (planejado)"]
  end
  subgraph APP["ws-application"]
    DS["DecomposeService (planejado)"]
  end
  subgraph DOM["ws-domain"]
    DD["SolidBody, IntentPreservationReport, ProvenanceLink, OperationCapability (planejado)"]
  end
  subgraph INFRA["ws-infrastructure"]
    MK["MeshKernelAdapter (planejado)"]
    MY["persistence-mysql (planejado)"]
    ST["storage-s3 (planejado)"]
    AIP["ai-providers (real no gateway)"]
  end
  EXT["Claude/Gemini"]

  PG --> V3D --> REP & UI & PATCH & AUT
  V3D --> BFF --> DC --> DS --> DD
  DS --> MK & MY & ST
  DS --> AIP --> EXT
```

## 6. Rastreabilidade

| CA | Classe (§1) | Passo da atividade (§2) | Mensagem da sequência (§3) | Transição (§4) | Componente (§5) | Situação |
|---|---|---|---|---|---|---|
| RF61.CA01 | `DecomposeKind.EXPLODIR_FACES`, `SurfacePatch.isOpen`, `IntentPreservationReport` | `A2`, `S3`, `F5` | 3–11 | `ANALISE`→`AVISO_PERDA`→`PRONTO` | `REP`, `DS`, `MK` | planejado (capacidade futura) |
| RF61.CA02 | `DecomposeKind.CONVERTER_SUPERFICIE`, `ProvenanceLink`, `SolidBody.materialIds` | `S7` | 15–17 | `ANALISE`→`PRONTO` | `DS`, `MY` | planejado |
| RF61.CA03 | `MeshKernelPort.components`, `SolidBody.closed` | `S3`, `F5` | 3–11 | `ANALISE`→`PRONTO` | `DS`, `MK` | planejado |
| RF61.CA04 | `SlicePlane`, `MeshKernelPort.split`, `DrawingRepositoryPort.restore` | `A3`, `S6`, `E422`, `S7` | 1–18 | `EM_EDICAO`→`APLICADO`→`DESFEITO` | `REP`, `MK`, `ST` | planejado |
| RF61.CA05 | `MeshKernelPort.checkClosed`, `MeshRepairProposal` | `S4`, `S5` | 19–22 | `ANALISE`→`REPARO_PROPOSTO`→`PRONTO` | `DS`, `MK` | planejado |
| RF61.CA06 | `BlockAttribute`, `OperationCapability.status` NAO_SUPORTADA | `F1`, `F2`, `F3` | 2 | `ANALISE`→`INDISPONIVEL` | `REP` | planejado (sem modelo de blocos hoje) |
| RF61.CA07 | `DecomposeKind.CONSOLIDAR_REPRESENTACAO`, `SolidBody.representation`, `IntentPreservationReport.lost` | `S3`, `F5`, `A4` | 10–11 | `ANALISE`→`AVISO_PERDA` | `REP`, `DS` | planejado |
| RF61.CA08 | `FlattenProjection` (depth zero, keepOriginal), `ProvenanceLink` | `A3`, `F6`, `A4`, `S1`, `S2`, `E404`, `E403`, `E409` | 5–8, 12–17 | `AVISO_PERDA`→`PRONTO` | `REP`, `DS`, `PATCH` | planejado |

Desmembrar nunca descarta propriedades sem avisar: toda perda listada no relatório exige confirmação e a revisão anterior permanece recuperável. Nenhum CA é marcado como concluído por este diagrama.
