# RF65 — Editar regiões hierárquicas e camadas sobrepostas no Drawings
**HU:** — (sem HU no board; RF especificado em 15/10/2026) · **Sprint (board Work Station):** lista *Requisitos Funcionais* sem sprint atribuída · **Equivalente FAI:** — · **Aba/rota:** Drawings (`/drawings`, `/drawings/[pieceId]`; peça aberta a partir de `/tasks/[id]` e da sessão DECIA `/decia/[sessionId]`) · **Página-esqueleto:** registrada em 17/10/2026; editor ainda não implementado (Onda 5 do PLANO_ONDAS)
**Critérios de aceite cobertos:** RF65.CA01 … RF65.CA07 — corpo do card = especificação de docs/produto/requisitos-studio/RF65.md (CAs copiados como estão escritos); classes reais: `PieceLayer`/`LayerStack`/`switchActiveLayer`/`setLayerLocked`/`canEditInActiveLayer` (`lib/pieces/layers.ts`), `RegionLock`/`acquireLock`/`canEditRegions` (`lib/pieces/collab.ts`), `authorizePatch`/`PatchDenial` (`lib/pieces/patch.ts`), `DrawingEditScope`/`DrawingEditTarget` (`lib/drawings/selection.ts`), `geometryBounds`/`editableNodeIds` (`lib/studio/selection.ts`), `ClassifiedField.rubricVersion` (`lib/pieces/classification.ts`); o restante (planejado)

O RF65 organiza o contexto espacial de uma peça do Drawings em quatro eixos independentes — camada, região, objeto e detalhe (`DRAWINGS_CAMADAS_COLABORACAO_DECIA.md`): subdividir regiões em grades M×N com caminho hierárquico estável, reservar regiões menores ou maiores respeitando reservas alheias, isolar camadas profundas ou superficiais sem perder as demais, ocultar divisórias e rótulos sem liberar reservas e recalcular métricas globais com fórmula declarada. Seleção nunca é autorização: o servidor decide pela geometria transformada inteira, não pelo centro.

**Estado em 17/10/2026:** a MATRIZ_RF registra RF65 como LÓGICA SEM INTERFACE (0.30). `lib/pieces/layers.ts` (camada ativa, travada, ordem por `depth`), `lib/pieces/collab.ts` (reserva por região e camada com lease de 60 s) e `lib/pieces/patch.ts` (porta única para edição manual e IA, recusa atômica com `CAMADA_OCULTA`, `CAMADA_INATIVA`, `FORA_DA_SELECAO`, `REGIAO_RESERVADA`) são funções puras testadas, sem editor nem servidor. `acquireLock` compara ids de região iguais; o conflito entre ancestral e descendente (região maior contendo menor) exige expandir o caminho hierárquico no servidor (planejado). O PLANO_ONDAS (Onda 5, nota 5.7) pede unificar a árvore cena → camada → região → objeto em um modelo persistente. A IA, quando existir, só explica métricas ou propõe alterações dentro da reserva vigente, sempre como proposta revisável e sem enviar RESTRITO/SIGILOSO a provedor externo.

## Critérios de aceite

| CA | Enunciado (Dado / Quando / Então) |
|---|---|
| **RF65.CA01** | Dada grade M×N, quando subdivide região, então cria caminho hierárquico estável e permite focar qualquer nível. |
| **RF65.CA02** | Dada reserva de região menor, quando edita, então limita objetos e geometria à região e camada permitidas. |
| **RF65.CA03** | Dada reserva de região maior, quando transforma, então considera as subáreas incluídas, sem ignorar reservas conflitantes. |
| **RF65.CA04** | Dadas camadas profundas/superficiais, quando isola uma, então preserva objetos das demais e mantém composição e ordem na reabertura. |
| **RF65.CA05** | Dadas divisórias, rótulos e badges, quando oculta, então limpa a visualização sem liberar reservas ou alterar a geometria. |
| **RF65.CA06** | Dada alteração local, quando atualiza métricas globais, então usa fórmula/rubrica declarada, distingue heurística de qualidade profissional e explica a contribuição de cada métrica. |
| **RF65.CA07** | Dado movimento/rotação, quando o limite físico ultrapassa reserva, então servidor rejeita considerando a geometria transformada, não apenas o centro. |

## Regras de produto

- Caminho de região estável e legível (`root/5/3/1`): subdividir de novo não renumera regiões existentes; foco e reserva referenciam o caminho.
- Camada é organização autoral, não classificação de acesso: ocultar uma camada não esconde conteúdo de colaboradores; isso exige política de acesso separada.
- Divisórias, rótulos e badges são preferências de visualização por pessoa; ocultá-los não toca `DrawingLease` nem a geometria.
- Métricas globais (equilíbrio, densidade, ocupação) são heurísticas com fórmula e `rubricVersion` publicadas; dimensão não avaliada aparece como “não avaliado”, nunca como zero.
- Mover e girar oferecem campos numéricos (posição, ângulo, pivô) além do arraste (WCAG 2.5.7); a validação usa a caixa transformada do objeto com filhos.

## 1. Diagrama de classes

```mermaid
classDiagram
direction LR
namespace lib_pieces_real {
  class PieceLayer {
    <<entity>>
    +id: string
    +depth: number
    +visible: boolean
    +locked: boolean
  }
  class LayerStack {
    <<entity>>
    +layers: List~PieceLayer~
    +activeLayerId: string
    +switchActiveLayer(stack, layerId) LayerStack
    +setLayerLocked(stack, layerId, locked) LayerStack
  }
  class RegionLock {
    <<entity>>
    +pieceId: string
    +layerId: string
    +regionIds: List~string~
    +ownerId: string
    +expiresAt: number
  }
  class AuthorizePatch {
    <<service>>
    +authorizePatch(stack, locks, req, now) PatchVerdict
  }
  class DrawingEditTarget {
    <<entity>>
    +layerId: string
    +regionIds: List~string~
    +objectPath: List~string~
  }
}
namespace ws_domain_drawings_planejado {
  class DrawingRegion {
    <<entity>>
    +id: UUID
    +pieceId: UUID
    +parentId: UUID
    +path: String
    +gridM: int
    +gridN: int
    +bounds: Bounds
  }
  class RegionTreeService {
    <<service>>
    +subdivide(regionId, m, n) List~DrawingRegion~
    +ancestorsAndDescendants(path) Set~String~
  }
  class TransformValidator {
    <<service>>
    +transformedBounds(objectId, matrix) Bounds
    +regionsTouched(bounds) List~String~
  }
  class ViewPreference {
    <<entity>>
    +userId: UUID
    +showDividers: boolean
    +showLabels: boolean
    +showBadges: boolean
    +isolatedLayerId: UUID
  }
  class CompositionMetric {
    <<entity>>
    +code: String
    +formula: String
    +rubricVersion: String
    +kind: MetricKind
    +contributionJson: JSON
  }
  class MetricKind {
    <<enum>>
    HEURISTICA
    RUBRICA_PROFISSIONAL
    NAO_AVALIADO
  }
  class DrawingLeaseService {
    <<service>>
    +acquire(pieceId, layerId, regionPath, actor) DrawingLease
  }
}
LayerStack "1" *-- "1..*" PieceLayer
DrawingRegion "1" *-- "*" DrawingRegion : subdivide
RegionTreeService ..> DrawingRegion
DrawingLeaseService ..> RegionTreeService : expande ancestrais e descendentes
DrawingLeaseService ..> RegionLock
AuthorizePatch ..> RegionLock
AuthorizePatch ..> DrawingEditTarget
TransformValidator ..> DrawingEditTarget : regionIds da geometria transformada
CompositionMetric --> MetricKind
note for AuthorizePatch "real - CAMADA_OCULTA, CAMADA_INATIVA, CAMADA_TRAVADA, FORA_DA_SELECAO, REGIAO_RESERVADA"
note for RegionLock "real em lib/pieces/collab.ts - conflito por id de região igual - hierarquia planejada"
note for ViewPreference "planejado - só visualização, nunca libera reserva"
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph PES["Pessoa (autor ou colaborador autorizado)"]
    P0(["Subdivide região em grade M×N"]) --> P1["Foca um nível pelo caminho root/5/3/1"]
    P2(["Reserva região menor ou maior na camada ativa"])
    P3(["Edita, move ou gira objeto por arraste ou campos numéricos"])
    P4(["Isola camada profunda ou superficial"])
    P5(["Oculta divisórias, rótulos e badges"])
    P6(["Consulta métricas globais e a contribuição de cada uma"])
  end
  subgraph BFF["Next.js / BFF (app/(shell)/drawings)"]
    B1["Prévia local da transformação e patch com expectedRevision, leaseId e fencingToken"]
    B2["Preferência de visualização salva por pessoa"]
    B3["Painel de métricas: fórmula, rubricVersion, heurística ou rubrica, não avaliado"]
  end
  subgraph APP["ws-application"]
    S1["RegionTreeService.subdivide com caminho estável"]
    S2{"ResourceAuthorizer: acesso à peça?"}
    S3{"Conflito com reserva ancestral, descendente ou igual na mesma camada?"}
    S4["TransformValidator: caixa transformada com filhos e regiões tocadas"]
    S5{"authorizePatch: camada ativa visível, seleção e reserva"}
    S6["Grava camadas isoladas sem tocar objetos das demais e mantém depth"]
    S7["MetricsService recalcula com fórmula declarada"]
  end
  subgraph IA["IA (AiEngine)"]
    I1["Explica contribuição das métricas a pedido, sem alterar o desenho"]
  end
  subgraph DB["Persistência"]
    D1[("MySQL: regiões, camadas, ordem e revisões (planejado)")]
    D2[("MySQL: drawing_leases com fencing token (planejado)")]
    D3[("MySQL: view_preferences (planejado)")]
  end
  E403["403 ACESSO_NEGADO"]
  E409["409 REGIAO_RESERVADA"]
  E422["422 VALIDACAO (FORA_DA_SELECAO, CAMADA_OCULTA ou geometria transformada fora da reserva)"]
  E503["503 IA_INDISPONIVEL (fórmula declarada continua visível)"]
  P0 --> S1 --> D1 --> P1
  P2 --> S2
  S2 -->|não| E403
  S2 -->|sim| S3
  S3 -->|sim| E409
  S3 -->|não| D2
  P3 --> B1 --> S4 --> S5
  S5 -->|"região de outra pessoa"| E409
  S5 -->|"fora da reserva ou camada"| E422
  S5 -->|ok| D1 --> S7
  P4 --> S6 --> D1
  P5 --> B2 --> D3
  P6 --> S7 --> B3
  B3 -->|"pede explicação"| I1
  I1 -->|"sem motor"| E503
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
  participant EV as DomainEvents (AFTER_COMMIT)
  U->>N: subdivide a região root/5 em grade 3×3
  N->>C: POST /api/drawings/pieceId/regions/root-5/subdivide (m 3, n 3)
  C->>S: RegionTreeService.subdivide
  S->>DB: cria root/5/1 … root/5/9 sem renumerar as existentes
  S-->>N: árvore de regiões
  U->>N: reserva root/5 (região maior) na camada Frente
  N->>C: POST /api/drawings/pieceId/leases (layerId, regionPath root/5)
  C->>S: DrawingLeaseService.acquire
  S->>DB: SELECT FOR UPDATE das reservas da peça (relógio do banco)
  alt sem acesso à peça ou SIGILOSO sem concessão
    S-->>N: 403 ACESSO_NEGADO
  else root/5/3/1 já reservada por outra pessoa na mesma camada
    S-->>N: 409 REGIAO_RESERVADA (sem revelar conteúdo nem autor além do permitido)
  end
  S-->>N: lease com fencingToken e expiresAt
  U->>N: gira a mesa 30 graus (campo numérico ou arraste)
  N->>C: PATCH /api/drawings/pieceId/objects/mesa (matrix, expectedRevision, leaseId)
  C->>S: TransformValidator.transformedBounds e authorizePatch MANUAL
  alt caixa girada com filhos ultrapassa a reserva
    S-->>N: 422 VALIDACAO (geometria transformada fora da reserva, mesmo com centro dentro)
  else alcança região reservada por outra pessoa
    S-->>N: 409 REGIAO_RESERVADA
  end
  S->>DB: grava revisão e métricas recalculadas com rubricVersion
  S->>EV: DrawingPatched após commit
  S-->>N: revisão e deltas das métricas com contribuição
  U->>N: pede explicação da métrica de equilíbrio
  N->>C: POST /api/drawings/pieceId/metrics/equilibrio/explain
  C->>S: AiGateway.infer (RESPONDER)
  alt sem motor registrado
    S-->>N: 503 IA_INDISPONIVEL (fórmula declarada exibida)
  else orçamento esgotado
    S-->>N: 429 ORCAMENTO_IA
  end
  S->>AI: complete(fórmula, valores e contexto mascarado)
  AI-->>S: explicação marcada como texto de IA
  S-->>N: explicação sem alterar o desenho
```

## 4. Máquina de estados

Entidades: reserva de região (`DrawingLease`, planejado sobre `RegionLock` real), estado de cada camada na pilha (`PieceLayer` real: `visible`, `locked`, camada ativa) e proposta de IA (`AiDrawingProposal.status`, planejado), que neste RF só ocorre quando a IA propõe alterar objetos da região reservada.

```mermaid
stateDiagram-v2
  state "Reserva de região (DrawingLease)" as LEASE {
    [*] --> LIVRE
    LIVRE --> RESERVADA: sem conflito com ancestral, descendente ou mesma região
    RESERVADA --> RESERVADA: renovação com fencing token
    RESERVADA --> LIBERADA: dono libera
    RESERVADA --> EXPIRADA: relógio do servidor
    LIBERADA --> [*]
    EXPIRADA --> [*]
  }
  state "Camada na pilha (PieceLayer)" as LAYER {
    [*] --> ATIVA
    ATIVA --> SOMENTE_LEITURA: switchActiveLayer para outra
    SOMENTE_LEITURA --> ATIVA: switchActiveLayer
    SOMENTE_LEITURA --> OCULTA: isolar outra camada
    OCULTA --> SOMENTE_LEITURA: mostrar
    ATIVA --> TRAVADA: setLayerLocked
    SOMENTE_LEITURA --> TRAVADA: setLayerLocked
    TRAVADA --> SOMENTE_LEITURA: destravar
  }
  state "Proposta de IA (AiDrawingProposal.status)" as PROP {
    [*] --> SOLICITADA
    SOLICITADA --> GERADA
    GERADA --> EM_REVISAO
    EM_REVISAO --> ACEITA: revisão humana e authorizePatch IA
    EM_REVISAO --> REJEITADA
    EM_REVISAO --> INVALIDADA_POR_POLITICA: reserva expirou, revisão ou política mudou
    ACEITA --> [*]
    REJEITADA --> [*]
    INVALIDADA_POR_POLITICA --> [*]
  }
```

Ocultar divisórias, rótulos e badges não é transição de nenhuma dessas máquinas: só muda `ViewPreference`. Camada `OCULTA` recusa patch com `CAMADA_OCULTA` (não se altera o que não se vê).

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FRONT["Frontend Next.js"]
    PG["app/(shell)/drawings/page.tsx (real, esqueleto)"]
    ED["RegionGrid, LayerPanel, MetricsPanel (planejado)"]
    LIB["lib/pieces/layers.ts, collab.ts, patch.ts e lib/studio/selection.ts (real)"]
    PG --> ED --> LIB
  end
  subgraph WEB["ws-web"]
    DC["DrawingRegionController e DrawingLeaseController (planejado)"]
  end
  subgraph APPL["ws-application"]
    RT["RegionTreeService, TransformValidator, MetricsService (planejado)"]
    LS["DrawingLeaseService com bloqueio transacional (planejado)"]
    RA["security/ResourceAuthorizer (real)"]
    GW["ai/AiGateway (real)"]
  end
  subgraph DOM["ws-domain"]
    AP["security/AccessPolicy (real)"]
    ENT["DrawingRegion, DrawingLease, ViewPreference, CompositionMetric (planejado)"]
  end
  subgraph INFRA["ws-infrastructure"]
    MY["persistence-mysql"]
    RD["cache-redis (presença)"]
    AIP["ai-providers (sem motor)"]
  end
  EXT["Claude / Gemini (não registrados)"]
  ED --> DC --> RT
  DC --> LS --> RA --> AP
  RT --> GW --> AIP -.-> EXT
  LS --> ENT --> MY --> MYSQL[("MySQL 8")]
  LS --> RD --> REDIS[("Redis")]
```

## 6. Rastreabilidade

| CA | Classe | Passo | Mensagem | Transição | Componente |
|---|---|---|---|---|---|
| RF65.CA01 | `DrawingRegion` (path, gridM, gridN, parentId), `RegionTreeService.subdivide` | P0 → S1 → D1 → P1 | POST regions/root-5/subdivide | — | `RT`, `ENT` |
| RF65.CA02 | `DrawingEditTarget` (real), `AuthorizePatch` (real), `canEditInActiveLayer` (real) | P2 → S2 → S3 → D2; P3 → S5 | POST leases, PATCH objects, alt 422 | LEASE `LIVRE → RESERVADA` | `LS`, `LIB` |
| RF65.CA03 | `RegionTreeService.ancestorsAndDescendants`, `DrawingLeaseService.acquire`, `RegionLock` (real) | P2 → S3 → E409 ou D2 | alt 409 root/5/3/1 já reservada | LEASE `LIVRE → RESERVADA` só sem conflito | `LS` |
| RF65.CA04 | `LayerStack.switchActiveLayer` (real), `PieceLayer.depth` (real), `ViewPreference.isolatedLayerId` | P4 → S6 → D1 | — | LAYER `SOMENTE_LEITURA → OCULTA` | `ED`, `MY` |
| RF65.CA05 | `ViewPreference` (showDividers, showLabels, showBadges) | P5 → B2 → D3 | — | nenhuma transição de LEASE | `ED` |
| RF65.CA06 | `CompositionMetric` (formula, rubricVersion, kind, contributionJson), `MetricKind`, `ClassifiedField.rubricVersion` (real) | P6 → S7 → B3 → I1 | revisão e deltas das métricas, explain com alt 503/429 | — | `RT`, `GW` |
| RF65.CA07 | `TransformValidator.transformedBounds/regionsTouched`, `geometryBounds` (real) | P3 → B1 → S4 → S5 → E422 ou E409 | PATCH objects/mesa, alt 422 e 409 | — | `RT`, `LIB` |
