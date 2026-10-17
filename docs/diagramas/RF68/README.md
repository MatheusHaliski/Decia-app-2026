# RF68 — Gerar, auditar, estilizar, otimizar e converter desenhos com IA
**HU:** — (sem HU no board; RF especificado em 15/10/2026) · **Sprint (board Work Station):** lista *Requisitos Funcionais* sem sprint atribuída · **Equivalente FAI:** — · **Aba/rota:** Drawings (`/drawings`, `/drawings/[pieceId]`; peça aberta a partir de `/tasks/[id]` e da sessão DECIA `/decia/[sessionId]`) · **Página-esqueleto:** registrada em 17/10/2026; editor ainda não implementado (Onda 5 do PLANO_ONDAS)
**Critérios de aceite cobertos:** RF68.CA01 … RF68.CA07 — corpo do card = especificação de docs/produto/requisitos-studio/RF68.md (CAs copiados como estão escritos); classes reais: `AiGateway`/`AiEnginePort`/`AiBudget`/`AiInferenceLogPort`/`PersonalDataMasker` (ws-application, sem motor registrado), `AutonomyMode`/`evaluateAiAction`/`proposalValidity` (`lib/ai/autonomy.ts`), `authorizePatch`/`PatchOrigin` (`lib/pieces/patch.ts`), `computeAuthorship`/`ContributionEvent` (`lib/pieces/authorship.ts`), `buildProvenanceManifest` (`lib/pieces/provenance.ts`), `ClassifiedField` (`lib/pieces/classification.ts`), `DrawingAnnotation` (`lib/drawings/taxonomy.ts`), `AiSuggestion` (`components/decia`); o restante (planejado)

O RF68 reúne os cinco comandos de IA do Drawings — gerar (AI_GENERATE/AIGEN), auditar (AI_AUDIT/AIAUD), estilizar (AI_STYLE/AISTY), otimizar (AI_OPTIMIZE/AIOPT) e converter raster ou croqui em vetor (AI_CONVERT/AICONV) — como pedidos rastreáveis que devolvem propostas estruturadas e revisáveis, validadas por ferramentas determinísticas antes de tocar a peça. Cada comando respeita o nível de autonomia do RF51, passa por `authorizePatch` com origem IA, registra custo, provedor, modelo e versão e nunca publica certificação, aprovação técnica ou autoria humana presumida.

**Estado em 17/10/2026:** a MATRIZ_RF registra RF68 como AUSENTE (0.00) e o PLANO_ONDAS o coloca na **Onda 6 — IA no servidor** (nota 4.5 do protótipo local), pedindo ferramentas determinísticas por comando, contratos de IA e validação de topologia, fontes e custo. `CONECTORES.md`: nenhum provedor de IA ativo — `AiGateway` existe e é testado (orçamento `429 IA_ORCAMENTO_ESGOTADO`, sigilo `422 IA_CONTEUDO_RESTRITO` com registro `BLOQUEADO_SIGILO`, mascaramento, trilha sem prompt, `503 IA_INDISPONIVEL` sem motor local), mas não tem chamador de produção e `AiProvidersConfig` está vazio. RESTRITO/SIGILOSO nunca vão a provedor externo; classificação ausente é tratada como RESTRITO. As referências a Illustrator e AutoCAD são inspiração semântica, não paridade.

## Critérios de aceite

| CA | Enunciado (Dado / Quando / Então) |
|---|---|
| **RF68.CA01** | Dado AI_GENERATE/AIGEN, quando envia intenção e restrições, então recebe proposta estruturada de geometrias compatíveis com o motor e uma prévia revisável. |
| **RF68.CA02** | Dado AI_AUDIT/AIAUD, quando analisa, então aponta duplicatas, perfis abertos, colisões e achados técnicos com localização, regra, tolerância e grau de certeza. |
| **RF68.CA03** | Dado AI_STYLE/AISTY, quando seleciona referência, então propõe materiais/traços/hachuras sem modificar topologia ou acesso silenciosamente. |
| **RF68.CA04** | Dado AI_OPTIMIZE/AIOPT, quando simplifica, então mede erro máximo, redução de tamanho e preserva cotas, conectividade, furos e partes protegidas. |
| **RF68.CA05** | Dado AI_CONVERT/AICONV, quando vetoriza raster/croqui, então mantém referência, escala declarada e incertezas; permite corrigir contornos antes de gravar. |
| **RF68.CA06** | Dado nível 1 a 4, quando executa esses comandos, então respeita RF51 e não amplia autonomia por causa do nome do comando. |
| **RF68.CA07** | Dado resultado não verificável, quando conclui, então informa pendências e não publica certificação ABNT, aprovação técnica ou autoria humana presumida. |

## Contrato por comando (planejado)

| Comando | Ferramenta determinística que valida | Saída revisável | Nunca faz |
|---|---|---|---|
| AI_GENERATE | Esquema de geometria do motor (tipos suportados, unidades, camada alvo) | Prévia vetorial separada | Gravar sem aceite |
| AI_AUDIT | Detectores de duplicata, perfil aberto e colisão com tolerância | Lista de achados com localização, regra, tolerância e certeza | Corrigir sozinho |
| AI_STYLE | Comparação de topologia e ACL antes e depois | Materiais, traços e hachuras propostos | Alterar geometria ou acesso |
| AI_OPTIMIZE | Erro máximo (Hausdorff), contagem de nós, cotas, conectividade, furos e partes protegidas | Relatório antes/depois | Remover parte protegida |
| AI_CONVERT | Referência da imagem, escala declarada e incerteza por contorno | Contornos editáveis antes de gravar | Inventar escala |

O nível de autonomia vem da política da peça ou sessão (cinco modos de `lib/ai/autonomy.ts`, D-136, que substituem os níveis 1 a 4 da especificação): o nome do comando nunca muda o modo. Revisar a prévia tem equivalente por teclado e campos numéricos para cada ajuste de contorno (WCAG 2.5.7).

## 1. Diagrama de classes

```mermaid
classDiagram
direction LR
namespace ws_application_ai_real {
  class AiGateway {
    <<service>>
    +infer(AiRequest) AiResult
  }
  class AiEnginePort {
    <<port>>
    +provider() AiProvider
    +complete(prompt, maxOutputTokens) Completion
  }
  class AiBudget {
    <<service>>
    +reserve(userId, companyId, estimatedTokens) Reservation
    +settle(reservation, actualTokens) void
  }
}
namespace lib_real {
  class AutonomyPolicy {
    <<service>>
    +evaluateAiAction(policy, action, ctx) Verdict
    +proposalValidity(policy, proposal, rev, editableIds) Verdict
  }
  class AuthorizePatch {
    <<service>>
    +authorizePatch(stack, locks, req, now) PatchVerdict
  }
  class ProvenanceManifest {
    <<entity>>
    +authorship: AuthorshipResult
    +eventChainHead: string
    +signed: boolean
  }
}
namespace ws_domain_drawings_ai_planejado {
  class AiDrawingCommand {
    <<enum>>
    AI_GENERATE
    AI_AUDIT
    AI_STYLE
    AI_OPTIMIZE
    AI_CONVERT
  }
  class AiDrawingProposal {
    <<entity>>
    +id: UUID
    +command: AiDrawingCommand
    +status: AiProposalStatus
    +policyVersion: int
    +baseRevision: long
    +targetIds: List~UUID~
    +inferenceId: UUID
    +provider: AiProvider
    +model: String
    +estimatedCostUsd: BigDecimal
  }
  class AuditFinding {
    <<entity>>
    +kind: String
    +location: String
    +rule: String
    +tolerance: String
    +certainty: double
  }
  class OptimizationReport {
    <<entity>>
    +maxError: double
    +sizeReduction: double
    +dimensionsPreserved: boolean
    +connectivityPreserved: boolean
    +holesPreserved: boolean
  }
  class VectorizationResult {
    <<entity>>
    +sourceRef: String
    +declaredScale: String
    +uncertaintyJson: JSON
  }
  class PendingVerification {
    <<entity>>
    +items: List~String~
    +certificationClaimed: boolean
  }
  class DrawingToolPort {
    <<port>>
    +validateSchema(geometry) Report
    +audit(scope, tolerance) List~AuditFinding~
    +diffTopology(before, after) Report
    +simplify(scope, maxError) OptimizationReport
  }
  class DrawingAiService {
    <<service>>
    +request(command, scope, intent) AiDrawingProposal
    +accept(proposalId) Revision
    +reject(proposalId) void
  }
}
DrawingAiService ..> AutonomyPolicy : modo não muda pelo comando
DrawingAiService ..> AiGateway : única porta de inferência
AiGateway ..> AiEnginePort
AiGateway ..> AiBudget
DrawingAiService ..> DrawingToolPort : valida antes da prévia
DrawingAiService ..> AuthorizePatch : origem IA
DrawingAiService --> AiDrawingProposal
AiDrawingProposal --> AiDrawingCommand
AiDrawingProposal "1" --> "*" AuditFinding
AiDrawingProposal --> OptimizationReport
AiDrawingProposal --> VectorizationResult
AiDrawingProposal --> PendingVerification
DrawingAiService ..> ProvenanceManifest : signed false, sem selo
note for AiGateway "real - classe ausente vira RESTRITO - RESTRITO e SIGILOSO nunca vão a provedor externo"
note for ProvenanceManifest "real em lib/pieces/provenance.ts - assinatura não implementada"
note for PendingVerification "planejado - certificationClaimed sempre false sem validação profissional"
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph PES["Pessoa"]
    P0(["Escolhe comando AIGEN, AIAUD, AISTY, AIOPT ou AICONV e o escopo"])
    P1["Informa intenção, restrições, referência, tolerância ou escala declarada"]
    P2{"Revisa a prévia: aceita, corrige contornos ou rejeita?"}
  end
  subgraph BFF["Next.js / BFF (app/(shell)/drawings)"]
    B1["Mostra modo vigente, custo estimado e destino (motor local ou externo)"]
    B2["Prévia separada do desenho com achados, relatório ou contornos editáveis"]
    B3["Painel de pendências: não verificado, sem certificação e autoria calculada"]
  end
  subgraph APP["ws-application"]
    S1{"ResourceAuthorizer: acesso à peça?"}
    S2{"evaluateAiAction: o modo permite propor?"}
    S3{"AiGateway: orçamento, classificação e motor"}
    S4{"DrawingToolPort: esquema, topologia, erro e preservação ok?"}
    S5{"proposalValidity e authorizePatch IA"}
    S6["Grava revisão, ContributionEvent e manifesto signed false"]
  end
  subgraph IA["IA (AiEngine)"]
    I1["Devolve proposta estruturada para o comando"]
  end
  subgraph DB["Persistência"]
    D1[("ai_inference_log: provedor, modelo, custo, versão, resultado")]
    D2[("MySQL: propostas e revisões (planejado)")]
    D3[("S3: raster de origem e prévias")]
  end
  E403["403 ACESSO_NEGADO"]
  E409["409 REGIAO_RESERVADA"]
  E422["422 VALIDACAO (esquema incompatível, topologia alterada, parte protegida ou IA_CONTEUDO_RESTRITO)"]
  E429["429 ORCAMENTO_IA (IA_ORCAMENTO_ESGOTADO)"]
  E503["503 IA_INDISPONIVEL"]
  P0 --> P1 --> B1 --> S1
  S1 -->|não| E403
  S1 -->|sim| S2
  S2 -->|"MANUAL ou sem pedido"| E422
  S2 -->|sim| S3
  S3 -->|"orçamento esgotado"| E429
  S3 -->|"RESTRITO/SIGILOSO sem motor local"| E422
  S3 -->|"sem motor"| E503
  S3 -->|ok| I1 --> D1
  I1 --> S4
  S4 -->|não| E422
  S4 -->|sim| D2 --> B2 --> P2
  P1 -->|"AICONV"| D3
  P2 -->|"corrige contornos"| B2
  P2 -->|rejeita| D2
  P2 -->|aceita| S5
  S5 -->|"reserva de outra pessoa"| E409
  S5 -->|"obsoleta ou fora do escopo"| E422
  S5 -->|ok| S6 --> D2
  S6 --> B3
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
  participant S3 as S3
  participant EV as DomainEvents (AFTER_COMMIT)
  U->>N: AIOPT na camada Contornos, erro máximo 0,5 mm
  N->>C: POST /api/drawings/pieceId/ai/commands (AI_OPTIMIZE, scope, maxError)
  C->>S: DrawingAiService.request
  alt sem acesso à peça
    S-->>N: 403 ACESSO_NEGADO
  end
  S->>S: evaluateAiAction PROPOR_ALTERACAO no modo vigente
  S->>S: AiGateway.infer (orçamento, classificação, mascaramento)
  alt orçamento esgotado
    S-->>N: 429 ORCAMENTO_IA (IA_ORCAMENTO_ESGOTADO)
  else RESTRITO ou SIGILOSO sem motor local
    S-->>N: 422 VALIDACAO (IA_CONTEUDO_RESTRITO, BLOQUEADO_SIGILO na trilha)
  else nenhum motor registrado
    S-->>N: 503 IA_INDISPONIVEL
  end
  S->>AI: complete(geometria mascarada e restrições)
  AI-->>S: geometria simplificada proposta
  S->>DB: ai_inference_log (provedor, modelo, custo, versão)
  S->>S: DrawingToolPort.simplify e diffTopology
  alt cota, furo, conectividade ou parte protegida perdida
    S-->>N: 422 VALIDACAO (relatório do que seria perdido)
  end
  S->>DB: AiDrawingProposal EM_REVISAO com OptimizationReport
  S-->>N: prévia com erro máximo medido e redução de tamanho
  U->>N: aceita
  N->>C: POST ai/proposals/id/accept
  C->>S: proposalValidity e authorizePatch IA
  alt região reservada por outra pessoa
    S-->>N: 409 REGIAO_RESERVADA
  else política ou revisão mudou
    S-->>N: 422 VALIDACAO (proposta invalidada)
  end
  S->>DB: revisão e ContributionEvent AI_PROPOSAL_ACCEPTED
  S->>EV: DrawingPatched após commit
  S-->>N: revisão e pendências (sem certificação, manifesto signed false)
  U->>N: AICONV de croqui com escala 1 para 50
  N->>C: POST ai/commands (AI_CONVERT, imageRef, declaredScale)
  C->>S: DrawingAiService.request (AI_CONVERT)
  S->>S3: lê raster de referência autorizado
  S-->>N: contornos editáveis com incerteza por trecho, corrigir antes de gravar
```

## 4. Máquina de estados

Entidades: proposta de comando de IA (`AiDrawingProposal.status`, planejado sobre `AiProposal` real) e reserva do escopo alvo (`DrawingLease`, planejado sobre `RegionLock` real). A categoria de autoria final vem de `computeAuthorship` (real) e pode ser `UNVERIFIED` quando os logs estão incompletos.

```mermaid
stateDiagram-v2
  state "Proposta de IA (AiDrawingProposal.status)" as PROP {
    [*] --> SOLICITADA: comando com escopo, intenção e modo vigente
    SOLICITADA --> GERADA: AiGateway devolve proposta e DrawingToolPort valida
    GERADA --> EM_REVISAO: prévia separada com custo, modelo e versão
    EM_REVISAO --> EM_REVISAO: pessoa corrige contornos
    EM_REVISAO --> ACEITA: revisão humana, proposalValidity e authorizePatch ok
    EM_REVISAO --> REJEITADA: pessoa rejeita, peça intacta
    EM_REVISAO --> INVALIDADA_POR_POLITICA: modo, mandato, revisão ou escopo mudou
    ACEITA --> [*]
    REJEITADA --> [*]
    INVALIDADA_POR_POLITICA --> [*]
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

`429 ORCAMENTO_IA`, `503 IA_INDISPONIVEL` e `422 IA_CONTEUDO_RESTRITO` encerram o pedido sem proposta; não há repetição automática de chamada cobrada. `ACEITA` não equivale a aprovação técnica: pendências continuam abertas.

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FRONT["Frontend Next.js"]
    PG["app/(shell)/drawings/page.tsx (real, esqueleto)"]
    ED["AiAssistantDrawer, ProposalPreview, PendingPanel (planejado)"]
    DS["components/decia/AiSuggestion (real, padrão de proposta)"]
    LIB["lib/ai/autonomy.ts, lib/pieces/patch.ts, authorship.ts, provenance.ts (real)"]
    PG --> ED --> LIB
    ED --> DS
  end
  subgraph WEB["ws-web"]
    DC["DrawingAiController (planejado)"]
  end
  subgraph APPL["ws-application"]
    AIS["DrawingAiService (planejado)"]
    GW["ai/AiGateway, AiBudget, PersonalDataMasker, AiInferenceLogPort (real)"]
    RA["security/ResourceAuthorizer (real)"]
    TP["DrawingToolPort: ferramentas determinísticas (planejado)"]
  end
  subgraph DOM["ws-domain"]
    ENT["AiDrawingProposal, AuditFinding, OptimizationReport, VectorizationResult (planejado)"]
    IAL["ia/AiInferenceLog e AiProvider (real)"]
  end
  subgraph INFRA["ws-infrastructure"]
    AIP["ai-providers (AiProvidersConfig vazio)"]
    PLAT["platform (geometria e vetorização determinísticas, planejado)"]
    MY["persistence-mysql"]
    S3A["storage-s3"]
  end
  EXT["Claude / Gemini (não registrados)"]
  ED --> DC --> AIS --> RA
  AIS --> GW --> AIP -.-> EXT
  GW --> IAL --> MY --> MYSQL[("MySQL 8")]
  AIS --> TP --> PLAT
  AIS --> ENT --> MY
  AIS --> S3A --> S3[("S3 / MinIO")]
```

## 6. Rastreabilidade

| CA | Classe | Passo | Mensagem | Transição | Componente |
|---|---|---|---|---|---|
| RF68.CA01 | `AiDrawingCommand.AI_GENERATE`, `DrawingToolPort.validateSchema`, `AiDrawingProposal` | P0 → P1 → S3 → I1 → S4 → B2 | POST ai/commands, alt 422 esquema | PROP `SOLICITADA → GERADA → EM_REVISAO` | `AIS`, `TP`, `GW` |
| RF68.CA02 | `AuditFinding` (kind, location, rule, tolerance, certainty), `DrawingToolPort.audit` | S4 → B2 | prévia com achados | PROP `GERADA → EM_REVISAO` | `TP`, `PLAT` |
| RF68.CA03 | `DrawingToolPort.diffTopology`, `ResourceAuthorizer` (real) | S4 → E422 ou B2 | alt 422 topologia ou acesso alterado | — | `TP`, `RA` |
| RF68.CA04 | `OptimizationReport` (maxError, sizeReduction, cotas, conectividade, furos) | S4 → B2 → P2 | DrawingToolPort.simplify, alt 422 perda | PROP `EM_REVISAO → ACEITA` | `TP`, `PLAT` |
| RF68.CA05 | `VectorizationResult` (sourceRef, declaredScale, uncertaintyJson) | P1 → D3 → B2 → P2 corrige | AICONV, contornos editáveis | PROP `EM_REVISAO → EM_REVISAO` | `S3A`, `PLAT` |
| RF68.CA06 | `AutonomyPolicy.evaluateAiAction` (real), `AuthorizePatch` origem IA (real) | S2 → E422 ou S3; S5 | evaluateAiAction no modo vigente | PROP `EM_REVISAO → INVALIDADA_POR_POLITICA` | `LIB`, `AIS` |
| RF68.CA07 | `PendingVerification`, `ProvenanceManifest.signed=false` (real), `computeAuthorship` (real) | S6 → B3 | revisão e pendências sem certificação | PROP `ACEITA` sem aprovação técnica | `LIB`, `ED` |
