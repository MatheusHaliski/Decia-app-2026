# RF67 — Completar geometria e prever traçados no Drawings
**HU:** — (sem HU no board; RF especificado em 15/10/2026) · **Sprint (board Work Station):** lista *Requisitos Funcionais* sem sprint atribuída · **Equivalente FAI:** — · **Aba/rota:** Drawings (`/drawings`, `/drawings/[pieceId]`; peça aberta a partir de `/tasks/[id]` e da sessão DECIA `/decia/[sessionId]`) · **Página-esqueleto:** registrada em 17/10/2026; editor ainda não implementado (Onda 5 do PLANO_ONDAS)
**Critérios de aceite cobertos:** RF67.CA01 … RF67.CA07 — corpo do card = especificação de docs/produto/requisitos-studio/RF67.md (CAs copiados como estão escritos); classes reais: `AutonomyMode`/`MODE_CAPABILITIES`/`AiProposal`/`proposalValidity`/`evaluateAiAction` (`lib/ai/autonomy.ts`), `authorizePatch`/`aiScopeIsBounded` (`lib/pieces/patch.ts`), `DrawingEditScope` (`lib/drawings/selection.ts`), `Geometry`/`snapPoint`/`editableNodeIds` (`lib/studio/selection.ts`), `ContributionEvent`/`ContributionOrigin` (`lib/pieces/authorship.ts`), `AiGateway`/`AiBudget` (ws-application, sem motor registrado); o restante (planejado)

O RF67 define o comando de completar (AI_COMPLETE/AICOMP) e a previsão de traçados no Drawings: o escopo (objeto, wireframe, região menor ou maior) fixa revisão e elementos preservados; arcos e traços lineares recebem pontos fantasma com hipótese e confiança heurística; fachadas simétricas e curvas Bézier são validadas por continuidade, tangência e simetria com tolerância informada; leiautes de mobiliário e roteamentos MEP só usam dimensões, restrições, obstáculos e regras explícitas, com fontes e validação profissional. Nada é aplicado além do nível de autonomia autorizado.

**Estado em 17/10/2026:** a MATRIZ_RF registra RF67 como LÓGICA SEM INTERFACE (0.30) e o PLANO_ONDAS (Onda 5, nota 4.65) aponta que a previsão é geométrica local e que intenção semântica e cenas complexas não estão validadas. `COMPLETAR_E_PREVISIBILIDADE.md` cita `lib/studio/stroke-prediction.ts` e `components/studio/GeometryComposer.tsx`, que **não existem neste repositório** (ficaram no checkout de desenvolvimento local); aqui são (planejado). Real neste repositório: a autonomia em cinco modos (`lib/ai/autonomy.ts`, D-136), a exigência de seleção concreta para IA (`aiScopeIsBounded`, `IA_SEM_SELECAO`) e a cadeia de autoria com `inferenceId`, provedor e modelo (`lib/pieces/authorship.ts`). Hipótese algorítmica local roda sem rede e é rotulada como tal; plausibilidade heurística nunca é apresentada como probabilidade calibrada.

## Critérios de aceite

| CA | Enunciado (Dado / Quando / Então) |
|---|---|
| **RF67.CA01** | Dado AI_COMPLETE/AICOMP, quando escolhe objeto, wireframe, região menor ou maior, então fixa escopo, revisão e elementos preservados. |
| **RF67.CA02** | Dado arco parcial ou traço linear, quando prevê continuação, então mostra pontos fantasma com hipótese/confiança e só aplica conforme nível autorizado. |
| **RF67.CA03** | Dada fachada simétrica ou curva Bézier, quando completa, então valida continuidade, tangência e simetria dentro de tolerância informada. |
| **RF67.CA04** | Dado arranjo de mobiliário, quando sugere layout, então recebe dimensões e restrições explícitas e verifica colisões e circulação; não inventa medidas ou normas. |
| **RF67.CA05** | Dado roteamento MEP, quando sugere percurso, então usa obstáculos, conexões e regras da disciplina, identifica fontes e exige validação profissional aplicável. |
| **RF67.CA06** | Dado usuário que rejeita a predição, quando continua desenhando, então não altera o traço nem repete chamadas pagas sem controle. |
| **RF67.CA07** | Dado custo/rede indisponível, quando usa hipótese algorítmica local, então identifica sua origem e não a rotula como inferência de LLM. |

## Nível de autonomia e aplicação (RF51, `lib/ai/autonomy.ts`)

| Modo | Previsão de traçado | Aplicação |
|---|---|---|
| MANUAL | Só hipótese local se a pessoa acionar; sem IA | Nunca automática |
| SOB_SOLICITACAO | Proposta só quando pedida | Aceite explícito, manual |
| SUGESTOES | Pontos fantasma espontâneos | Aceite explícito, manual |
| ASSISTIDO | Pontos fantasma espontâneos | Após revisão, só na seleção editável e na mesma revisão |
| AGENTE | Passos do mandato | Dentro do mandato, com log e parada |

O nome do comando não amplia autonomia. Aceitar pontos fantasma tem alternativa por teclado (Tab percorre os pontos, Enter aceita, Esc rejeita) e campos numéricos para ajustar cada ponto (WCAG 2.5.7).

## 1. Diagrama de classes

```mermaid
classDiagram
direction LR
namespace lib_real {
  class AutonomyPolicy {
    <<service>>
    +evaluateAiAction(policy, action, ctx) Verdict
    +proposalValidity(policy, proposal, rev, editableIds) Verdict
  }
  class AiProposal {
    <<entity>>
    +id: string
    +policyVersion: number
    +baseRevision: number
    +targetIds: List~string~
    +reviewedBy: string
  }
  class AuthorizePatch {
    <<service>>
    +authorizePatch(stack, locks, req, now) PatchVerdict
    +aiScopeIsBounded(scope) boolean
  }
  class ContributionEvent {
    <<entity>>
    +origin: ContributionOrigin
    +inferenceId: string
    +provider: string
    +model: string
  }
}
namespace ws_domain_completion_planejado {
  class CompletionRequest {
    <<entity>>
    +command: String
    +scopeKind: CompletionScope
    +baseRevision: long
    +preservedIds: List~UUID~
    +policyVersion: int
  }
  class CompletionScope {
    <<enum>>
    OBJETO
    WIREFRAME
    REGIAO_MENOR
    REGIAO_MAIOR
  }
  class StrokePrediction {
    <<entity>>
    +kind: PredictionKind
    +ghostPoints: List~Point~
    +hypothesis: String
    +heuristicConfidence: double
    +origin: PredictionOrigin
  }
  class PredictionOrigin {
    <<enum>>
    HEURISTICA_LOCAL
    IA_REAL
    MOCK
  }
  class GeometryValidator {
    <<service>>
    +continuity(curves, tolerance) Report
    +tangency(curves, toleranceDeg) Report
    +symmetry(axis, objects, tolerance) Report
  }
  class LayoutConstraintSet {
    <<entity>>
    +dimensions: List~Dimension~
    +clearances: List~Clearance~
    +source: String
  }
  class MepRouteSuggestion {
    <<entity>>
    +discipline: String
    +obstacles: List~UUID~
    +connections: List~UUID~
    +rulesSource: String
    +requiresProfessionalValidation: boolean
  }
  class PredictionThrottle {
    <<service>>
    +allow(userId, scope) boolean
  }
  class CompletionService {
    <<service>>
    +start(request) CompletionRequest
    +predictLocal(stroke) StrokePrediction
    +predictSemantic(request) AiProposal
    +accept(proposalId) Revision
    +reject(proposalId) void
  }
}
CompletionRequest --> CompletionScope
StrokePrediction --> PredictionOrigin
CompletionService ..> AutonomyPolicy : aplica conforme nível
CompletionService ..> AuthorizePatch : origem IA exige seleção concreta
CompletionService ..> GeometryValidator
CompletionService ..> LayoutConstraintSet : sem medida inventada
CompletionService ..> MepRouteSuggestion
CompletionService ..> PredictionThrottle : sem chamadas pagas repetidas
CompletionService ..> AiProposal
CompletionService ..> ContributionEvent : aceite registra inferência
note for StrokePrediction "planejado - heuristicConfidence é plausibilidade, não probabilidade calibrada"
note for AutonomyPolicy "real em lib/ai/autonomy.ts - MANUAL, SOB_SOLICITACAO, SUGESTOES, ASSISTIDO, AGENTE"
note for MepRouteSuggestion "planejado - sempre exige validação profissional aplicável"
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph PES["Pessoa"]
    P0(["Aciona AI_COMPLETE e escolhe objeto, wireframe, região menor ou maior"])
    P1(["Desenha arco parcial ou traço linear"])
    P2(["Pede completar fachada simétrica ou curva Bézier com tolerância"])
    P3(["Pede leiaute de mobiliário informando dimensões e restrições"])
    P4(["Pede percurso MEP"])
    P5{"Aceita os pontos fantasma?"}
    P6(["Rejeita e continua desenhando"])
  end
  subgraph BFF["Next.js / BFF (app/(shell)/drawings)"]
    B1["Fixa escopo, revisão e elementos preservados no pedido"]
    B2["Hipótese geométrica local sem rede, rotulada HEURISTICA_LOCAL"]
    B3["Pontos fantasma tracejados com hipótese e confiança heurística"]
    B4["Debounce e PredictionThrottle: sem nova chamada paga após rejeição"]
  end
  subgraph APP["ws-application"]
    S1{"ResourceAuthorizer e authorizePatch: escopo editável e reservado?"}
    S2{"evaluateAiAction: nível permite propor ou aplicar?"}
    S3{"GeometryValidator dentro da tolerância?"}
    S4{"Dimensões e restrições explícitas?"}
    S5["Verifica colisões e faixas de circulação informadas"]
    S6["Usa obstáculos, conexões e regras declaradas; cita fontes; marca validação profissional"]
    S7{"AiGateway: classe, orçamento e motor"}
    S8["Aceite grava patch e ContributionEvent com inferenceId"]
  end
  subgraph IA["IA (AiEngine)"]
    I1["Interpretação semântica (ex.: braço e luminária de poste) como alternativas explicadas"]
  end
  subgraph DB["Persistência"]
    D1[("MySQL: revisões e propostas (planejado)")]
    D2[("ai_inference_log: custo, modelo, versão")]
  end
  E403["403 ACESSO_NEGADO"]
  E409["409 REGIAO_RESERVADA"]
  E422["422 VALIDACAO (tolerância excedida, dimensões ausentes ou IA_SEM_SELECAO)"]
  E429["429 ORCAMENTO_IA"]
  E503["503 IA_INDISPONIVEL"]
  P0 --> B1 --> S1
  S1 -->|"sem acesso"| E403
  S1 -->|"reserva de outra pessoa"| E409
  S1 -->|"escopo sem seleção concreta"| E422
  S1 -->|ok| S2
  P1 --> B2 --> B3 --> P5
  P5 -->|sim| S2
  P5 -->|não| P6 --> B4
  S2 -->|"modo não permite aplicar"| B3
  S2 -->|"permite"| S8 --> D1
  P2 --> S3
  S3 -->|não| E422
  S3 -->|sim| B3
  P3 --> S4
  S4 -->|não| E422
  S4 -->|sim| S5 --> B3
  P4 --> S6 --> B3
  S2 -->|"proposta semântica"| S7
  S7 -->|"orçamento esgotado"| E429
  S7 -->|"sem motor ou rede"| E503 --> B2
  S7 -->|ok| I1 --> D2
  I1 --> B3
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
  U->>N: AI_COMPLETE na região reservada B2 (modo ASSISTIDO)
  N->>C: POST /api/drawings/pieceId/completions (scopeKind, baseRevision, preservedIds)
  C->>S: CompletionService.start
  alt sem acesso à peça
    S-->>N: 403 ACESSO_NEGADO
  else região de outra pessoa
    S-->>N: 409 REGIAO_RESERVADA
  else IA sem seleção concreta
    S-->>N: 422 VALIDACAO (IA_SEM_SELECAO)
  end
  S->>DB: grava CompletionRequest com revisão e elementos preservados
  U->>N: desenha arco parcial
  N->>N: hipótese local sem rede (HEURISTICA_LOCAL)
  N-->>U: pontos fantasma com hipótese e confiança heurística
  U->>N: pede interpretação semântica do poste
  N->>C: POST /api/drawings/pieceId/completions/id/semantic
  C->>S: evaluateAiAction PROPOR_ALTERACAO e AiGateway.infer
  alt sem motor ou rede
    S-->>N: 503 IA_INDISPONIVEL (mantém hipótese local rotulada)
  else orçamento esgotado
    S-->>N: 429 ORCAMENTO_IA (sem nova tentativa automática)
  end
  S->>AI: complete(traçado, vista, unidades e escopo)
  AI-->>S: alternativas braço e luminária com explicação
  S->>DB: AiProposal EM_REVISAO e ai_inference_log
  S-->>N: alternativas como pontos fantasma
  U->>N: aceita a alternativa luminária
  N->>C: POST completions/id/accept
  C->>S: proposalValidity, GeometryValidator e authorizePatch IA
  alt revisão ou política mudou
    S-->>N: 422 VALIDACAO (proposta invalidada, rascunho preservado)
  else tangência ou simetria fora da tolerância
    S-->>N: 422 VALIDACAO (relatório de continuidade e tolerância)
  end
  S->>DB: patch e ContributionEvent AI_PROPOSAL_ACCEPTED com inferenceId
  S->>EV: DrawingPatched após commit
  S-->>N: revisão nova
```

## 4. Máquina de estados

Entidades: proposta de completar (`AiDrawingProposal.status`, planejado sobre `AiProposal` real), predição local de traçado (`StrokePrediction`, planejado) e reserva do escopo (`DrawingLease`, planejado sobre `RegionLock` real).

```mermaid
stateDiagram-v2
  state "Proposta de IA (AiDrawingProposal.status)" as PROP {
    [*] --> SOLICITADA: AI_COMPLETE com escopo e revisão fixados
    SOLICITADA --> GERADA: AiGateway devolve alternativas
    GERADA --> EM_REVISAO: pontos fantasma exibidos
    EM_REVISAO --> ACEITA: nível autoriza e validações ok
    EM_REVISAO --> REJEITADA: usuário rejeita, traço intacto
    EM_REVISAO --> INVALIDADA_POR_POLITICA: modo, revisão ou escopo mudou
    ACEITA --> [*]
    REJEITADA --> [*]
    INVALIDADA_POR_POLITICA --> [*]
  }
  state "Predição local (StrokePrediction)" as LOCAL {
    [*] --> CALCULADA: arco ou linha detectados sem rede
    CALCULADA --> EXIBIDA: pontos fantasma rotulados HEURISTICA_LOCAL
    EXIBIDA --> INCORPORADA: aceite explícito
    EXIBIDA --> DESCARTADA: rejeição ou novo traço
    INCORPORADA --> [*]
    DESCARTADA --> [*]
  }
  state "Reserva do escopo (DrawingLease)" as LEASE {
    [*] --> LIVRE
    LIVRE --> RESERVADA: acquire
    RESERVADA --> RESERVADA: renovação com fencing token
    RESERVADA --> LIBERADA: dono libera
    RESERVADA --> EXPIRADA: relógio do servidor
    LIBERADA --> [*]
    EXPIRADA --> [*]
  }
```

Rejeitar (`REJEITADA` ou `DESCARTADA`) não altera o traço e alimenta `PredictionThrottle`: nenhuma chamada paga é repetida sem novo pedido explícito.

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FRONT["Frontend Next.js"]
    PG["app/(shell)/drawings/page.tsx (real, esqueleto)"]
    ED["GhostPointsLayer, CompletionPanel, stroke-prediction local (planejado neste repositório)"]
    LIB["lib/ai/autonomy.ts, lib/pieces/patch.ts, authorship.ts (real)"]
    PG --> ED --> LIB
  end
  subgraph WEB["ws-web"]
    DC["DrawingCompletionController (planejado)"]
  end
  subgraph APPL["ws-application"]
    CS["CompletionService, GeometryValidator, PredictionThrottle (planejado)"]
    RA["security/ResourceAuthorizer (real)"]
    GW["ai/AiGateway e AiBudget (real)"]
  end
  subgraph DOM["ws-domain"]
    ENT["CompletionRequest, StrokePrediction, LayoutConstraintSet, MepRouteSuggestion (planejado)"]
  end
  subgraph INFRA["ws-infrastructure"]
    MY["persistence-mysql"]
    AIP["ai-providers (sem motor)"]
  end
  EXT["Claude / Gemini (não registrados)"]
  ED --> DC --> CS --> RA
  CS --> GW --> AIP -.-> EXT
  CS --> ENT --> MY --> MYSQL[("MySQL 8")]
```

## 6. Rastreabilidade

| CA | Classe | Passo | Mensagem | Transição | Componente |
|---|---|---|---|---|---|
| RF67.CA01 | `CompletionRequest` (command, scopeKind, baseRevision, preservedIds), `CompletionScope`, `aiScopeIsBounded` (real) | P0 → B1 → S1 | POST completions, alt 403/409/422 | PROP `[*] → SOLICITADA`; LEASE `RESERVADA` | `CS`, `LIB` |
| RF67.CA02 | `StrokePrediction` (ghostPoints, hypothesis, heuristicConfidence), `evaluateAiAction` (real), `MODE_CAPABILITIES` (real) | P1 → B2 → B3 → P5 → S2 | pontos fantasma, aceite | LOCAL `EXIBIDA → INCORPORADA`; PROP `EM_REVISAO → ACEITA` | `ED`, `LIB` |
| RF67.CA03 | `GeometryValidator.continuity/tangency/symmetry` com tolerância | P2 → S3 → B3 ou E422 | alt 422 relatório de tolerância | — | `CS` |
| RF67.CA04 | `LayoutConstraintSet` (dimensions, clearances, source), verificação de colisão e circulação | P3 → S4 → S5 ou E422 | — | — | `CS`, `ENT` |
| RF67.CA05 | `MepRouteSuggestion` (obstacles, connections, rulesSource, requiresProfessionalValidation) | P4 → S6 → B3 | — | — | `CS`, `ENT` |
| RF67.CA06 | `PredictionThrottle`, `CompletionService.reject` | P5 → P6 → B4 | alt 429 sem nova tentativa automática | PROP `EM_REVISAO → REJEITADA`; LOCAL `EXIBIDA → DESCARTADA` | `CS`, `GW` |
| RF67.CA07 | `PredictionOrigin.HEURISTICA_LOCAL`, `ContributionEvent` sem inferenceId para heurística (real) | S7 → E503 → B2 | alt 503 mantém hipótese local rotulada | LOCAL `CALCULADA → EXIBIDA` | `ED`, `GW` |
