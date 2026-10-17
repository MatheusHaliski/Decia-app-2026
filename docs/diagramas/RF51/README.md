# RF51 — Controlar autonomia, escopo e execução da IA em Letters e Drawings
**HU:** — (sem HU no board; RF especificado em 15/10/2026) · **Sprint (board Work Station):** lista *Requisitos Funcionais* sem sprint atribuída · **Equivalente FAI:** — · **Aba/rota:** Configurações › Trabalho › Autonomia da IA (`/settings?tab=trabalho`), Letters (`/letters`) e Drawings (`/drawings`) · **Página-esqueleto:** registrada em 17/10/2026 (`/letters` e `/drawings`); política real em `lib/ai/autonomy.ts`, aplicação no servidor e nos editores pendente (Onda 6 do PLANO_ONDAS)
**Critérios de aceite cobertos:** RF51.CA01 … RF51.CA07 — corpo do card = especificação de docs/produto/requisitos-studio/RF51.md (CAs copiados como estão escritos); classes reais: `lib/ai/autonomy.ts` (AiPolicy, AgentCharter, AgentRun, AiProposal, evaluateAiAction, proposalValidity, changeMode), `lib/pieces/patch.ts` (authorizePatch), `lib/pieces/authorship.ts`, `lib/preferences/types.ts` (aiAutonomyDefault), `components/decia/WorkspaceSections.tsx`, `AiGateway`/`AiBudget`/`AiEnginePort` (sem motor registrado), `ResourceAuthorizer`, `AccessPolicy`; o restante (planejado)

A pessoa escolhe, antes de qualquer análise ou alteração de uma peça Letters ou Drawings, em que modo a IA pode atuar (Manual, Sob solicitação, Sugestões, Assistido ou Agente, D-136), vê o que cada modo pode fazer, recebe só diagnósticos, propostas com diff ou execuções limitadas conforme o modo, e qualquer troca de modo, revisão ou reserva invalida as propostas pendentes sem perder o rascunho; a autorização e a política valem no servidor, e nada é publicado automaticamente.

**Estado em 17/10/2026.** Real: os cinco modos e suas capacidades (`MODE_CAPABILITIES`), a decisão única `evaluateAiAction` usada pela UI do DECIA (`WorkspaceSections` mostra a ação de IA como bloqueada em Manual e explica o modo Sob solicitação), a preferência pessoal `aiAutonomyDefault` (padrão `SOB_SOLICITACAO`, persistida em `notificationPrefsJson`; o seletor hoje fica na aba **Trabalho**, `/settings?tab=trabalho` — a aba própria `?tab=ia` é planejada), o mandato do agente (`validateCharter`: passos ≤ 50, tokens ≤ 200 000, prazo ≤ 8 h) e a porta `AiGateway` (orçamento `429 IA_ORCAMENTO_ESGOTADO`, classificação `422 IA_CONTEUDO_RESTRITO`, trilha `AiInferenceLog`). Planejado: `AiPolicyService` no servidor, persistência de propostas e execuções, editores Letters/Drawings que consumam a política e um motor registrado em `AiEnginePort` (hoje nenhum adaptador implementa a porta, portanto toda chamada responde `503 IA_INDISPONIVEL`).

**Heurística × mock × IA real.** Diagnósticos locais (regras determinísticas no cliente ou no servidor) aparecem com o selo *heurística*; testes usam motores simulados (*mock*) e nunca são exibidos como resultado de modelo; *IA real* só quando `AiGateway` devolve `AiResult` com `provider`/`model` e `inferenceId`. O selo acompanha cada diagnóstico e cada proposta.

Correspondência entre os níveis do card e os modos implementados (D-136):

| Nível do card | Modo(s) em `AutonomyMode` | Ação permitida (`AiAction`) | Altera conteúdo? |
|---|---|---|---|
| 0 (IA desligada) | `MANUAL` | nenhuma | não |
| 1 Diagnóstico | `SOB_SOLICITACAO` (a pedido) ou `SUGESTOES` (espontâneo) | `RESPONDER`, `SUGESTAO_ESPONTANEA` | não |
| 2 Proposta | `SOB_SOLICITACAO`, `SUGESTOES` | `PROPOR_ALTERACAO` | só pelo aceite humano explícito |
| 3 Transformação local | `ASSISTIDO` | `APLICAR_ALTERACAO` (proposta revisada, seleção editável, mesma revisão) | sim, com checkpoint e rollback |
| 4 Agente | `AGENTE` | `EXECUTAR_PASSO` dentro do `AgentCharter` | sim, só rascunho, com log e parada |

## Critérios de aceite

| CA | Enunciado (Dado / Quando / Então) |
|---|---|
| **RF51.CA01** | Dado o nível 1, quando a análise termina, então somente diagnósticos e métricas explicáveis são exibidos; texto e geometria permanecem idênticos. |
| **RF51.CA02** | Dado o nível 2, quando uma proposta é gerada, então mostra diff e prévia, e só altera conteúdo após aceite explícito; rejeitar preserva o original. |
| **RF51.CA03** | Dado o nível 3, quando executa uma transformação local autorizada, então restringe objetos/blocos à seleção e registra checkpoint, validações e rollback. |
| **RF51.CA04** | Dado o nível 4, quando recebe um objetivo, então apresenta plano, ferramentas permitidas, escopo e orçamento; para ao atingir limite, conflito ou incerteza impeditiva. |
| **RF51.CA05** | Dada uma revisão ou reserva alterada, quando uma proposta antiga é aplicada, então rejeita a proposta sem perder o rascunho e solicita nova análise. |
| **RF51.CA06** | Dado um documento ou imagem contendo instruções, quando entra no contexto, então é tratado como dado e não altera permissões, ferramentas ou política do agente. |
| **RF51.CA07** | Dada uma inferência paga, quando é solicitada, então informa envio de dados, provedor e limite; registra tokens/custo quando disponíveis, permite cancelamento e não faz repetição automática ilimitada. |

## 1. Diagrama de classes

```mermaid
classDiagram
direction LR

class AutonomyMode {
  <<enum>>
  MANUAL
  SOB_SOLICITACAO
  SUGESTOES
  ASSISTIDO
  AGENTE
}
class AiPolicy {
  <<entity>>
  +mode: AutonomyMode
  +version: int
  +changedBy: String
  +charter: AgentCharter
}
class AgentCharter {
  <<entity>>
  +goal: String
  +scopeTargetIds: List~String~
  +allowedTools: List~String~
  +maxSteps: int
  +maxTokens: int
  +expiresAt: Instant
}
class AgentRun {
  <<entity>>
  +policyVersion: int
  +status: AgentRunStatus
  +steps: List~AgentStep~
  +tokensUsed: int
}
class AiProposal {
  <<entity>>
  +policyVersion: int
  +baseRevision: int
  +targetIds: List~String~
  +reviewedBy: String
}
class AutonomyRules {
  <<service>>
  +evaluateAiAction(policy, action, ctx) Verdict
  +proposalValidity(policy, proposal, revision, editableIds) Verdict
  +changeMode(policy, members, actor, to, now, charter) AiPolicy
  +recordAgentStep(policy, run, step, now) AgentRun
}
class PatchAuthorizer {
  <<service>>
  +authorizePatch(stack, locks, req, now) PatchVerdict
}
class WorkPiece {
  <<entity>>
  +id: String
  +ownerId: String
  +accessClass: AccessClassification
  +revisionId: String
}
class PieceRevision {
  <<entity>>
  +baseRevision: long
  +origin: ContributionOrigin
  +inferenceId: UUID
  +checkpoint: boolean
}
class AiPolicyService {
  <<service>>
  +changeMode(actor, pieceId, to, charter) AiPolicy
  +evaluate(actor, pieceId, action, ctx) Verdict
  +invalidatePending(pieceId, policyVersion) int
}
class ContextBuilder {
  <<service>>
  +build(actor, pieceId, selection) AiContext
}
class AiGateway {
  <<service>>
  +infer(AiRequest) AiResult
}
class AiInferenceLog {
  <<entity>>
  +provider: AiProvider
  +model: String
  +inputTokens: int
  +outputTokens: int
  +estimatedCostUsd: BigDecimal
}
class ResourceAuthorizer {
  <<service>>
  +require(actor, resource, action) void
}
class AiPolicyController {
  <<controller>>
  +putPolicy(pieceId, body) AiPolicyView
  +postAnalysis(pieceId, body) AnalysisView
  +postApply(pieceId, proposalId) RevisionView
}

AiPolicy --> AutonomyMode : mode
AiPolicy "1" --> "0..1" AgentCharter : charter
AgentRun --> AgentCharter : mandato
AiProposal ..> AiPolicy : policyVersion
AiPolicyService ..> AutonomyRules : mesmas regras no servidor
AiPolicyService ..> PatchAuthorizer
AiPolicyService ..> ResourceAuthorizer
AiPolicyService ..> ContextBuilder
ContextBuilder ..> AiGateway
AiGateway ..> AiInferenceLog : trilha
AiPolicyController ..> AiPolicyService
WorkPiece "1" --> "*" PieceRevision : revisões
AiProposal ..> WorkPiece : alvos

note for AutonomyRules "(real) funções puras de lib/ai/autonomy.ts"
note for PatchAuthorizer "(real) lib/pieces/patch.ts, IA exige seleção concreta"
note for AiGateway "(real) AiBudget, classificação e trilha, AiEnginePort sem motor registrado"
note for AiPolicyService "(planejado) ws-application/ai"
note for ContextBuilder "(planejado) documento entra só como dado citado"
note for ResourceAuthorizer "(real) traduz AccessPolicy, 404 uniforme e SIGILOSO sem ADMIN"
```

Legenda: **(real)** `AutonomyMode`, `AiPolicy`, `AgentCharter`, `AgentRun`, `AiProposal`, `AutonomyRules` (agrupa as funções de `lib/ai/autonomy.ts`), `PatchAuthorizer` (`lib/pieces/patch.ts`), `WorkPiece` (interface TS em memória de `lib/pieces/service.ts`), `AiGateway` (com `AiBudget` e a porta `AiEnginePort`), `AiInferenceLog`, `ResourceAuthorizer` (sobre `AccessPolicy`). **(planejado)** `PieceRevision`, `AiPolicyService`, `ContextBuilder`, `AiPolicyController` e a versão Java de `WorkPiece` (modelo canônico de `LETTERS_DRAWINGS_ENGENHARIA.md` §3; ainda fora da TAXONOMIA).

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph H["Usuário (proprietário ou editor)"]
    A0(["Abre peça em /letters ou /drawings"])
    A1["Escolhe modo de autonomia"]
    A2["Pede análise, proposta ou objetivo do agente"]
    A3{"Confirma envio de dados, provedor e limite?"}
    A4{"Aceita, rejeita ou cancela?"}
    A5["Interrompe o agente a qualquer momento"]
  end
  subgraph W["Web/BFF (Next.js)"]
    W1["Mostra capacidades do modo e o selo heurística, mock ou IA real"]
    W2["Diálogo de consentimento com custo estimado"]
    W3["Exibe diagnóstico, diff e prévia"]
    W4["Mantém o rascunho local e pede nova análise"]
  end
  subgraph S["ws-application"]
    S1["ResourceAuthorizer: peça visível? senão 404 NAO_ENCONTRADO"]
    S2{"Ator é proprietário?"}
    S3["changeMode: versão da política +1, propostas pendentes invalidadas, execuções encerradas, aviso aos demais"]
    S4{"evaluateAiAction permite a ação?"}
    S5["ContextBuilder: seleção autorizada, documento como dado"]
    S6{"proposalValidity: mesma política, mesma revisão, alvos editáveis?"}
    S7["authorizePatch: camada, seleção e reserva"]
    S8["Checkpoint, aplica, valida e oferece rollback"]
    S9{"Agente: limite, conflito ou incerteza impeditiva?"}
  end
  subgraph IA["IA (AiEngine via AiGateway)"]
    I1{"Orçamento e classificação permitem?"}
    I2["Inferência sem repetição automática"]
  end
  subgraph P["Persistência"]
    P1[("AiPolicy e propostas, MySQL")]
    P2[("AiInferenceLog com tokens e custo")]
    P3[("PieceRevision com checkpoint")]
  end
  A0 --> S1 --> W1 --> A1 --> S2
  S2 -->|"não"| E403["403 ACESSO_NEGADO"]
  S2 -->|"sim"| S3 --> P1
  W1 --> A2 --> S4
  S4 -->|"não"| E403M["403 ACESSO_NEGADO motivo MODO_NAO_PERMITE"]
  S4 -->|"sim"| W2 --> A3
  A3 -->|"não"| W4
  A3 -->|"sim"| S5 --> I1
  I1 -->|"orçamento"| E429["429 IA_ORCAMENTO_ESGOTADO"]
  I1 -->|"RESTRITO ou SIGILOSO sem motor local"| E422["422 IA_CONTEUDO_RESTRITO"]
  I1 -->|"sim"| I2 --> P2 --> W3
  W3 -->|"nível 1 só diagnóstico"| A4
  W3 -->|"nível 2, 3 ou 4"| A4
  A4 -->|"rejeita ou cancela"| W4
  A4 -->|"aceita"| S6
  S6 -->|"não"| E409["409 PROPOSTA_OBSOLETA"] --> W4
  S6 -->|"sim"| S7
  S7 -->|"região de outro"| E409R["409 CONFLITO_RESERVA"] --> W4
  S7 -->|"ok"| S8 --> P3
  S8 --> S9
  S9 -->|"sim"| STOP["Para e reporta: LIMITE_ATINGIDO ou INTERROMPIDO"]
  S9 -->|"não, próximo passo do plano"| I2
  A5 --> STOP
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
  participant E as DomainEvents (AFTER_COMMIT)

  U->>N: Seleciona modo ASSISTIDO na peça
  N->>C: PUT /api/pieces/{id}/ai-policy com modo e versão atual
  C->>S: AiPolicyService.changeMode(actor, pieceId, ASSISTIDO)
  S->>R: ResourceAuthorizer.require(EDIT) e papel PROPRIETARIO
  alt peça invisível ou SIGILOSO sem vínculo explícito
    S-->>N: 404 NAO_ENCONTRADO (mesma resposta de id inexistente)
  else ator não é proprietário
    S-->>N: 403 ACESSO_NEGADO motivo SEM_PERMISSAO
  else troca permitida
    S->>R: grava AiPolicy versão n+1 e marca propostas como INVALIDADA_POR_POLITICA
    S->>E: AiPolicyChanged (aviso aos participantes)
    S-->>N: 200 política vigente e capacidades do modo
  end
  U->>N: Pede proposta sobre a seleção
  N->>U: Mostra dados enviados, provedor e limite de custo
  U->>N: Confirma
  N->>C: POST /api/pieces/{id}/analyses com seleção e baseRevision
  C->>S: evaluateAiAction(PROPOR_ALTERACAO) e ContextBuilder.build
  S->>AI: AiGateway.infer com documento citado como dado
  alt orçamento esgotado
    AI-->>S: 429 IA_ORCAMENTO_ESGOTADO
    S-->>N: erro recuperável, edição manual segue disponível
  else nenhum motor registrado
    AI-->>S: 503 IA_INDISPONIVEL
    S-->>N: sem nova tentativa automática
  else inferência concluída
    AI-->>S: AiResult com provider, model e inferenceId
    S->>R: AiInferenceLog com tokens e custo, AiProposal PROPOSTA
    S-->>N: diff, prévia e selo IA real
  end
  U->>N: Aceita a proposta revisada
  N->>C: POST /api/pieces/{id}/proposals/{pid}/apply
  C->>S: proposalValidity e authorizePatch
  alt política ou revisão mudou
    S-->>N: 409 PROPOSTA_OBSOLETA (rascunho preservado, pedir nova análise)
  else região reservada por outro participante
    S-->>N: 409 CONFLITO_RESERVA
  else válida
    S->>R: PieceRevision com checkpoint e ContributionEvent AI_PROPOSAL_ACCEPTED
    S->>E: PieceRevised
    S-->>N: nova revisão e rollback disponível
  end
```

## 4. Máquina de estados

Entidades afetadas: a peça Letters/Drawings (`WorkPiece.state`, planejado), a proposta de IA (`AiProposal`, real como validação pura; estados persistidos planejados) e a execução do agente (`AgentRunStatus`, real).

```mermaid
stateDiagram-v2
  state PecaLetters {
    [*] --> RASCUNHO: peça criada (manual, modelo ou artefato DECIA)
    RASCUNHO --> EM_REVISAO: pessoa envia versão para revisão
    EM_REVISAO --> RASCUNHO: devolvida ou conteúdo alterado
    EM_REVISAO --> PUBLICADA: publicação explícita por humano autorizado
    PUBLICADA --> RASCUNHO: nova revisão de trabalho, versão publicada preservada
    RASCUNHO --> ARQUIVADA: arquivar
    PUBLICADA --> ARQUIVADA: arquivar
    ARQUIVADA --> RASCUNHO: restaurar
    note right of PUBLICADA
      Nenhum modo, nem AGENTE, leva a PUBLICADA.
      IA só altera RASCUNHO.
    end note
  }
  state PropostaIA {
    [*] --> GERANDO: pedido explícito ou sugestão permitida pelo modo
    GERANDO --> CANCELADA: usuário cancela a inferência
    GERANDO --> PROPOSTA: resultado validado
    PROPOSTA --> ACEITA: aceite explícito e proposalValidity ok
    PROPOSTA --> REJEITADA: rejeitar preserva o original
    PROPOSTA --> INVALIDADA_POR_POLITICA: modo trocado, versão da política +1
    PROPOSTA --> OBSOLETA_POR_REVISAO: revisão ou reserva alterada
  }
  state ExecucaoAgente {
    [*] --> EXECUTANDO: startAgentRun com mandato válido
    EXECUTANDO --> EXECUTANDO: recordAgentStep com checkpoint
    EXECUTANDO --> LIMITE_ATINGIDO: passos, tokens ou prazo do mandato
    EXECUTANDO --> INTERROMPIDO: stopAgentRun por editor ou troca de modo
    EXECUTANDO --> CONCLUIDO: objetivo atingido
  }
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FRONT["Next.js app/ e components/"]
    SET["app/(shell)/settings, seletor de autonomia (real, aba trabalho)"]
    LET["app/(shell)/letters e drawings, páginas-esqueleto (real)"]
    WS["components/decia/WorkspaceSections e AiSuggestion (real)"]
    UI["components/ui"]
    BFF["app/bff"]
  end
  subgraph LIB["lib/*"]
    AUT["lib/ai/autonomy.ts (real)"]
    PAT["lib/pieces/patch.ts e collab.ts (real)"]
    PRF["lib/preferences/types.ts aiAutonomyDefault (real)"]
  end
  subgraph WEB["ws-web"]
    CTR["AiPolicyController e PieceController (planejado)"]
  end
  subgraph APP["ws-application"]
    APS["ai/AiPolicyService e ContextBuilder (planejado)"]
    GW["ai/AiGateway e AiBudget (real)"]
    RA["security/ResourceAuthorizer (real)"]
  end
  subgraph DOM["ws-domain"]
    AP["security/AccessPolicy (real, D-139)"]
    ENT["ia/AiInferenceLog (real) e WorkPiece, PieceRevision (planejado)"]
  end
  subgraph INF["ws-infrastructure"]
    MY["persistence-mysql ai_inference_log (real) e pieces (planejado)"]
    AIP["ai-providers, adaptadores de AiEnginePort (nenhum registrado)"]
    RD["cache-redis cotas e avisos de troca de modo"]
    CA["persistence-cassandra passos do agente (planejado)"]
  end
  EXT["Claude / Gemini"]
  SET --> PRF --> AUT
  SET --> UI
  WS --> AUT
  LET --> PAT
  LET --> BFF --> CTR --> APS
  APS --> RA --> AP
  APS --> GW --> AIP --> EXT
  GW --> RD
  APS --> ENT --> MY
  APS --> CA
```

## 6. Rastreabilidade

| CA | Classe | Passo (atividade) | Mensagem (sequência) | Transição | Componente |
|---|---|---|---|---|---|
| **RF51.CA01** | `AiAction.RESPONDER/SUGESTAO_ESPONTANEA`, `MODE_CAPABILITIES` (proposes/applies), selo heurística × IA real | A2 → S4 → I2 → W3 “nível 1 só diagnóstico” | 10–22 (sem apply) | `PropostaIA` não é criada; `PecaLetters` permanece | `AUT`, `WS` |
| **RF51.CA02** | `AiProposal`, `AiPolicyService.evaluate(PROPOR_ALTERACAO)`, diff e prévia | W3 → A4 → S6 | 20–22 e 23–30 | `PROPOSTA → ACEITA` ou `PROPOSTA → REJEITADA` | `WS`, `APS` |
| **RF51.CA03** | `ASSISTIDO`, `PatchAuthorizer.authorizePatch` (IA_SEM_SELECAO), `PieceRevision.checkpoint` | S6 → S7 → S8 → P3 | 25 e 28–30 | `PROPOSTA → ACEITA` | `PAT`, `APS`, `MY` |
| **RF51.CA04** | `AgentCharter` (goal, allowedTools, scopeTargetIds, maxSteps, maxTokens, expiresAt), `AgentRun`, `stopAgentRun` | S9 → STOP, A5 | 1–9 (mandato exigido na troca para AGENTE) | `EXECUTANDO → LIMITE_ATINGIDO / INTERROMPIDO / CONCLUIDO` | `AUT`, `APS`, `CA` |
| **RF51.CA05** | `proposalValidity` (PROPOSTA_OBSOLETA_POLITICA, PROPOSTA_OBSOLETA_REVISAO, FORA_DO_ESCOPO), `RegionLock` | S6 → E409 → W4, S7 → E409R | 7 e 25–27 | `PROPOSTA → OBSOLETA_POR_REVISAO`, `PROPOSTA → INVALIDADA_POR_POLITICA` | `APS`, `PAT` |
| **RF51.CA06** | `ContextBuilder.build` (documento como dado citado), `AiPolicy` alterável só por `changeMode` do proprietário | S5 | 14–15 | nenhuma transição disparada por conteúdo | `APS`, `GW` |
| **RF51.CA07** | `AiGateway`, `AiBudget`, `AiInferenceLog` (inputTokens, outputTokens, estimatedCostUsd), cancelamento | W2 → A3 → I1 → E429/E422, I2 sem repetição | 10–19 e 21 | `GERANDO → CANCELADA` | `GW`, `RD`, `AIP` |

Regras transversais refletidas: autorização no servidor (`ResourceAuthorizer`, 404 uniforme D-141); SIGILOSO só dono e colaboradores explícitos, sem ADMIN implícito (D-139); troca de modo invalida propostas e encerra execuções (D-136); nenhuma publicação automática (nota em `PUBLICADA`); conteúdo RESTRITO/SIGILOSO não vai a provedor externo (`AiGateway`).
