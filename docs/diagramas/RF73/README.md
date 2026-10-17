# RF73 — Separar editor determinístico e Assistente IA com navegação acessível
**HU:** — (sem HU no board; RF especificado em 16/10/2026) · **Sprint (board Work Station):** lista *Requisitos Funcionais* sem sprint atribuída · **Equivalente FAI:** — · **Aba/rota:** Letters (`/letters`, `/letters/[pieceId]`) e Drawings (`/drawings`, `/drawings/[pieceId]`); peça aberta a partir de `/tasks/[id]`, `/projects/[id]` e da sessão DECIA `/decia/[sessionId]` · **Página-esqueleto:** registrada em 17/10/2026; editores ainda não implementados (Ondas 3–5 do PLANO_ONDAS)
**Critérios de aceite cobertos:** RF73.CA01 … RF73.CA10 — corpo do card = especificação de docs/produto/requisitos-studio/RF73.md (CAs copiados como estão escritos); classes reais: `lib/ai/autonomy.ts` (`AiProposal`, `proposalValidity`, `evaluateAiAction`, `MODE_CAPABILITIES`), `lib/pieces/patch.ts` (`authorizePatch` único para MANUAL e IA), `lib/pieces/layers.ts`, `lib/studio/selection.ts`, `components/decia/AiSuggestion.tsx` e `decia.test.tsx`, `AiGateway`; o restante (planejado)

Separa a edição determinística das propostas de IA sem trocar de documento. O editor e a seleção continuam visíveis enquanto o Assistente IA ocupa uma região complementar lateral, retrátil e nomeada. Abrir o assistente não inicia inferência. Comandos manuais de seleção, geometria, aparência e histórico aplicam direto no documento e nunca chamam o provedor. Cada proposta mostra original, prévia, feedback, aprovar, rejeitar e refinar, com estado assíncrono explícito (`idle`, `loading`, `suggesting`, `diff`, `error`). O foco é previsível, carregamento e erro são anunciados por `aria-live`, um arraste vira uma única ação reversível e a mudança de revisão invalida propostas antigas.

**Estado em 17/10/2026:** a MATRIZ_RF classifica o RF73 como AUSENTE (0,00), porque não há rota de editor no app. A nota de referência 6,95 do PLANO_ONDAS vem da prévia local de 16/10 (`docs/produto/ARQUITETURA_PAINEIS_EDITOR_IA.md`, capturas em `docs/auditoria/2026-10-16/paineis-bezier/`), cujos módulos `EditorPanels`, `Studio`, `DrawingCommands`, `BezierEditor`, `DrawingJourney`, `LettersAgent`, `AssetWorkbench` e `png-preview` não estão no repositório (a auditoria de 17/10 não encontrou `components/studio/*`). São reais a regra única de autorização de patch para edição manual e IA, a validade de proposta por política e revisão (`PROPOSTA_OBSOLETA_REVISAO`), a seleção por janela, cruzamento e laço e o cartão de sugestão do DECIA com aceitar e descartar. Pelo PLANO_ONDAS o RF73 entra na Onda 5 (Drawings): consolidar contratos de comandos e estados e testar foco, responsividade e preservação de rascunho. A conclusão segue a prova do RF72: CA → teste → evidência.

## Critérios de aceite

| CA | Enunciado (Dado / Quando / Então) |
|---|---|
| **RF73.CA01** | Dado um documento aberto, quando abre o Assistente IA, então mantém editor e seleção visíveis, com região complementar retrátil identificada e sem iniciar inferência. |
| **RF73.CA02** | Dados os comandos manuais, quando executa seleção, geometria, aparência ou histórico, então aplica deterministicamente no documento e não aciona o provedor de IA. |
| **RF73.CA03** | Dada proposta de IA, quando apresenta, então distingue original, prévia, feedback, aprovar, rejeitar e refinar; estado assíncrono explicita idle/loading/suggesting/diff/error. |
| **RF73.CA04** | Dado uso por teclado, quando abre/fecha o drawer ou conclui proposta, então gerencia foco de forma previsível e preserva navegação Tab sem armadilha. |
| **RF73.CA05** | Dada sugestão aceita ou rejeitada, quando a operação termina, então devolve foco ao texto, objeto ou prancheta correspondente; falhas permanecem anunciadas no assistente. |
| **RF73.CA06** | Dados carregamento e erro, quando surgem, então os anuncia respectivamente por aria-live polite e assertive; controles possuem nomes acessíveis. |
| **RF73.CA07** | Dada troca de painel ou fechamento do assistente, quando reabre, então mantém rascunho, seleção, histórico e proposta ainda válida; alterações de revisão invalidam propostas antigas. |
| **RF73.CA08** | Dado um arraste contínuo, quando solta ou cancela, então registra uma única ação reversível ou descarta o rascunho temporário; comandos devem usar histórico unitário. |
| **RF73.CA09** | Dados componentes, quando altera matemática geométrica, transporte de IA ou acessibilidade, então testes isolados cobrem o módulo e os fluxos integrados cobrem foco, concorrência e rejeição de resposta obsoleta. |
| **RF73.CA10** | Dados comandos e cards, quando testa a UI, então usa identificadores editor-cmd-{comando}, ai-suggestion-card-{id}, ai-btn-apply/reject e seletores por papel/nome; critérios WCAG são verificados no escopo declarado sem alegar certificação global. |

## Contrato de foco e anúncios

| Evento | Foco vai para | Anúncio | Identificador de teste |
|---|---|---|---|
| abrir o assistente | título da região do assistente | — (nenhuma inferência) | `editor-cmd-toggle-ai` |
| fechar o assistente (botão ou Escape) | botão que o abriu | — | `editor-cmd-toggle-ai` |
| pedir proposta | permanece no formulário do assistente | `aria-live="polite"`: carregando | `editor-cmd-execute-2d` |
| proposta pronta | cartão da proposta | `polite`: proposta disponível | `ai-suggestion-card-{id}` |
| aceitar | texto, objeto ou prancheta alvo | `polite`: aplicada na revisão rN | `ai-btn-apply` / `ai-btn-accept` |
| rejeitar | texto, objeto ou prancheta alvo | `polite`: descartada | `ai-btn-reject` |
| erro ou proposta obsoleta | permanece no assistente | `aria-live="assertive"` | `ai-suggestion-card-{id}` |

O assistente não é modal: não prende o foco nem torna o editor inerte, e a página não ganha um segundo landmark `main`. Campos de texto não disparam atalhos de comando.

## 1. Diagrama de classes

Legenda: **(real)** = código no repositório em 17/10/2026; demais classes **(planejado)**. As classes de interface seguem a tabela de responsabilidades de `ARQUITETURA_PAINEIS_EDITOR_IA.md`; `PieceRevision` segue `LETTERS_DRAWINGS_ENGENHARIA.md` §3.

```mermaid
classDiagram
direction LR
namespace editor_planejado {
  class EditorPanels {
    <<adapter>>
    +open() void
    +close() void
    +returnFocus(target) void
  }
  class Studio {
    <<adapter>>
    +selection: Set
    +activeLayerId: String
    +revision: int
  }
  class DrawingCommands {
    <<adapter>>
    +execute(commandId) HistoryEntry
  }
  class BezierEditor {
    <<adapter>>
    +beginDrag() DraftGesture
    +commit() HistoryEntry
    +cancel() void
  }
  class AssistantPanel {
    <<adapter>>
    +state: AssistantState
    +draftPrompt: String
    +proposal: AiProposal
  }
  class HistoryEntry {
    <<entity>>
    +commandId: String
    +origin: MANUAL ou IA
    +baseRevision: int
    +inverse: Patch
  }
  class AssistantState {
    <<enum>>
    IDLE
    LOADING
    SUGGESTING
    DIFF
    ERROR
  }
}
namespace logica_real {
  class AiProposal {
    <<entity>>
    +id: string
    +policyVersion: number
    +baseRevision: number
    +targetIds: List~string~
    +reviewedBy: string
  }
  class AutonomyTs {
    <<service>>
    +proposalValidity(policy, proposal, rev, editable) Verdict
    +evaluateAiAction(policy, action, ctx) Verdict
  }
  class PatchTs {
    <<service>>
    +authorizePatch(stack, locks, req, now) PatchVerdict
  }
  class SelectionTs {
    <<service>>
    +selectInBounds(mode) ids
    +selectInPolygon() ids
  }
  class AiSuggestion {
    <<adapter>>
    +status: SUGERIDA ACEITA DESCARTADA
  }
}
class PieceProposalService {
  <<service>>
  +request(actor, pieceId, scope, baseRevision) AiProposal
  +apply(actor, proposalId, currentRevision) PieceRevision
}
class AiGateway {
  <<service>>
  +infer(req) AiResult
}
class PieceRevision {
  <<entity>>
  +baseVersion: long
  +origin: RevisionOrigin
}
EditorPanels --> Studio : mesmo documento montado
EditorPanels --> AssistantPanel : região complementar
Studio --> DrawingCommands
Studio --> BezierEditor
DrawingCommands --> HistoryEntry : uma entrada por comando
BezierEditor --> HistoryEntry : uma entrada por gesto
DrawingCommands ..> PatchTs : MANUAL
AssistantPanel --> AssistantState
AssistantPanel --> AiProposal
AssistantPanel ..> AutonomyTs : validade antes de mostrar e aplicar
AssistantPanel ..> PieceProposalService : só sob pedido
PieceProposalService ..> AiGateway
PieceProposalService ..> PatchTs : IA, mesma regra
PieceProposalService --> PieceRevision : nova revisão ao aceitar
Studio ..> SelectionTs
note for DrawingCommands "nunca chama PieceProposalService nem AiGateway"
note for AiSuggestion "(real) components/decia, aceitar e descartar com origem explícita"
note for AutonomyTs "(real) lib/ai/autonomy.ts, PROPOSTA_OBSOLETA_REVISAO"
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph ATOR["Ator: editor da peça, teclado ou ponteiro"]
    A0(["Documento aberto em /drawings/[pieceId] ou /letters/[pieceId]"])
    A1{"O que faz?"}
    A2["Arrasta âncora ou objeto"]
    A3["Abre o Assistente IA"]
    A4["Escreve o pedido e envia"]
    A5{"Aprova, rejeita ou refina?"}
  end
  subgraph FE["Next.js: EditorPanels e Studio (planejado)"]
    F1["Comando manual: seleção, geometria, aparência, histórico"]
    F2{"authorizePatch (real) MANUAL aceita?"}
    F3["Aplica no documento e grava HistoryEntry unitária"]
    F4{"Soltou ou cancelou?"}
    F5["Drawer abre, foco no título, editor e seleção visíveis, estado IDLE"]
    F6["LOADING anunciado polite"]
    F7["SUGGESTING e DIFF: original, prévia, feedback, aprovar, rejeitar, refinar"]
    F8{"proposalValidity (real): mesma política e revisão?"}
    F9["Foco volta ao texto, objeto ou prancheta"]
    F10["ERROR anunciado assertive, rascunho e seleção preservados"]
  end
  subgraph APP["ws-application (planejado)"]
    P1{"ResourceAuthorizer: EDIT na peça?"}
    P2["PieceProposalService.request com baseRevision e escopo"]
    P3{"Revisão atual = baseRevision?"}
    P4["apply: authorizePatch IA, nova PieceRevision, ContributionEvent AI_PROPOSAL_ACCEPTED"]
  end
  subgraph IA["IA (AiEngine)"]
    I1["AiGateway (real): orçamento, sigilo, fallback"]
  end
  subgraph PER["Persistência"]
    D1[("MySQL: piece_revisions e AiInferenceLog")]
  end
  A0 --> A1
  A1 -->|comando| F1 --> F2
  F2 -->|não| E1["Bloqueado: camada travada, oculta, fora da seleção ou reservada"]
  F2 -->|sim| F3
  A1 -->|arraste| A2 --> F4
  F4 -->|soltou| F3
  F4 -->|cancelou| E2["Rascunho temporário descartado, peça inalterada"]
  A1 -->|assistente| A3 --> F5 --> A4 --> P1
  P1 -->|invisível| E3["404 NAO_ENCONTRADO"]
  P1 -->|sem EDIT| E4["403 ACESSO_NEGADO"]
  P1 -->|autorizado| F6 --> P2 --> I1
  I1 -->|falha| E5["503 IA_INDISPONIVEL"] --> F10
  I1 -->|proposta| F7 --> A5
  A5 -->|refinar| A4
  A5 -->|rejeitar| F9
  A5 -->|aprovar| F8
  F8 -->|não| E6["409 REVISAO_DESATUALIZADA: proposta invalidada"] --> F10
  F8 -->|sim| P3
  P3 -->|não| E6
  P3 -->|sim| P4 --> D1
  P4 --> F9
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
  U->>FE: Shift+C na âncora selecionada (comando manual)
  FE->>FE: authorizePatch MANUAL, aplica e grava uma HistoryEntry
  Note over FE,AI: nenhuma chamada ao provedor
  U->>FE: editor-cmd-toggle-ai abre o assistente
  FE->>FE: foco no título, estado IDLE, sem inferência
  U->>FE: pede completar a curva selecionada
  FE->>FE: aria-live polite anuncia carregando
  FE->>C: POST /api/pieces/{id}/proposals (escopo, baseRevision 12)
  C->>S: PieceProposalService.request
  S->>S: ResourceAuthorizer.require(EDIT) e evaluateAiAction
  alt 403 ACESSO_NEGADO
    S-->>FE: 403, anúncio assertive no assistente
  else 503 IA_INDISPONIVEL
    S->>AI: infer via AiGateway
    AI-->>S: indisponível ou orçamento esgotado
    S-->>FE: 503, rascunho mantido e anúncio assertive
  else proposta gerada
    S->>AI: infer via AiGateway (contexto autorizado)
    AI-->>S: patch tipado
    S->>DB: AiInferenceLog
    S-->>FE: AiProposal (baseRevision 12)
    FE-->>U: cartão ai-suggestion-card com original, prévia e ações
    U->>FE: ai-btn-apply
    FE->>C: POST /api/pieces/{id}/proposals/{proposalId}/apply (currentRevision)
    C->>S: apply
    alt 409 REVISAO_DESATUALIZADA
      S-->>FE: 409, proposta invalidada, anúncio assertive
    else revisão confere
      S->>DB: PieceRevision 13 e ContributionEvent AI_PROPOSAL_ACCEPTED
      S-->>FE: 201
      FE-->>U: foco volta ao objeto alvo, anúncio polite
    end
  end
```

## 4. Máquina de estados

Entidade central: `AssistantPanel.state` (`AssistantState`, planejado). A prévia de 16/10 só tinha `idle`, `loading`, `diff` e `error`; `suggesting` com fila e cancelamento remoto é parte desta especificação e do RF74. Aceitar grava revisão e `ContributionEvent`; rejeitar registra a decisão sem alterar a peça.

```mermaid
stateDiagram-v2
  [*] --> IDLE: assistente aberto, sem inferência
  IDLE --> LOADING: pedido explícito do usuário
  LOADING --> SUGGESTING: resposta parcial em streaming
  SUGGESTING --> DIFF: proposta completa e validada
  LOADING --> DIFF: proposta completa e validada
  LOADING --> ERROR: 503 IA_INDISPONIVEL, 403 ou timeout
  SUGGESTING --> ERROR: falha no meio da resposta
  DIFF --> IDLE: aprovar com revisão igual, foco no alvo
  DIFF --> IDLE: rejeitar, foco no alvo
  DIFF --> LOADING: refinar com feedback
  DIFF --> ERROR: 409 REVISAO_DESATUALIZADA invalida a proposta
  ERROR --> IDLE: nova tentativa explícita ou fechar
  IDLE --> [*]: fechar o assistente, rascunho preservado
  note right of DIFF
    Reabrir mantém proposta ainda válida.
    Mudança de revisão a invalida.
  end note
  note left of ERROR
    Anúncio aria-live assertive.
    Foco permanece no assistente.
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FRONT["Frontend Next.js"]
    R1["app/(shell)/letters e drawings: página-esqueleto (real) · [pieceId] (planejado)"]
    R2["EditorPanels · Studio · DrawingCommands · BezierEditor · AssistantPanel (planejado)"]
    R3["lib/ai/autonomy.ts · lib/pieces/patch.ts e layers.ts · lib/studio/selection.ts (real)"]
    R4["components/decia/AiSuggestion e decia.test.tsx (real)"]
    BFF["app/bff"]
    R1 --> R2 --> R3
    R2 --> R4
    R2 --> BFF
  end
  subgraph WEB["ws-web"]
    PPC["PieceProposalController (planejado)"]
  end
  subgraph APPL["ws-application"]
    PPS["pieces/PieceProposalService (planejado)"]
    RA["security/ResourceAuthorizer (real)"]
    AG["ai/AiGateway · AiBudget (real, sem chamador de produção)"]
  end
  subgraph DOM["ws-domain"]
    ENT["PieceRevision · PieceProposal (planejado) · AiInferenceLog (TAXONOMIA)"]
  end
  subgraph INFRA["ws-infrastructure"]
    MY["persistence-mysql"]
    S3A["storage-s3: conteúdo das revisões"]
    AIP["ai-providers: AiProvidersConfig vazio"]
  end
  BFF --> PPC --> PPS
  PPS --> RA
  PPS --> AG --> AIP --> EXT[("Claude / Gemini")]
  PPS --> ENT --> MY --> MYSQL[("MySQL 8")]
  PPS --> S3A --> S3[("S3 / MinIO")]
```

## 6. Rastreabilidade

| CA | Classe | Passo | Mensagem | Transição | Componente | Prova exigida (RF72) |
|---|---|---|---|---|---|---|
| **RF73.CA01** | `EditorPanels.open`, `AssistantPanel` (região nomeada, não modal) | A3 → F5 | `editor-cmd-toggle-ai` sem requisição de rede | `[*] → IDLE` | `R2` | E2E: abrir o drawer não gera requisição; editor e seleção continuam visíveis em desktop e celular |
| **RF73.CA02** | `DrawingCommands.execute`, `authorizePatch` MANUAL (real), `SelectionTs` (real) | A1 → F1 → F2 → F3 | Note: nenhuma chamada ao provedor | — | `R2`, `R3` | teste: comandos de seleção, geometria, aparência e histórico com o provedor espionado e zero chamadas |
| **RF73.CA03** | `AssistantState`, `AiProposal`, `AiSuggestion` (real) | F6 → F7 → A5 | cartão com original, prévia e ações | `IDLE → LOADING → SUGGESTING → DIFF` | `R2`, `R4` | teste de componente com os cinco estados e as seis ações rotuladas |
| **RF73.CA04** | `EditorPanels.returnFocus`, contrato de foco | F5 → F9 | `editor-cmd-toggle-ai` | `IDLE → [*]` | `R2` | E2E só com teclado: abrir, fechar com Escape, Tab sai do drawer sem armadilha |
| **RF73.CA05** | `EditorPanels.returnFocus(target)` | A5 → F9; F10 | `ai-btn-apply` e resposta 201 | `DIFF → IDLE` | `R2` | teste: após aceitar ou rejeitar, `document.activeElement` é o alvo; erro continua visível no assistente |
| **RF73.CA06** | regiões `aria-live` polite e assertive | F6; F10 | anúncios polite e assertive | `IDLE → LOADING`, `LOADING → ERROR` | `R2` | teste de anúncios e verificação axe de nomes acessíveis no escopo declarado |
| **RF73.CA07** | `AssistantPanel.draftPrompt`, `proposalValidity` (real, `PROPOSTA_OBSOLETA_REVISAO`) | F8 → E6 | 409 `REVISAO_DESATUALIZADA` | `DIFF → ERROR` e nota de DIFF | `R2`, `R3` | teste: fechar e reabrir mantém rascunho, seleção, histórico e proposta; nova revisão invalida a proposta |
| **RF73.CA08** | `BezierEditor.beginDrag/commit/cancel`, `HistoryEntry` | A2 → F4 → F3 ou E2 | — (local) | — | `R2` | teste: um gesto gera uma entrada de histórico; cancelar deixa a peça com hash igual |
| **RF73.CA09** | testes isolados de `bezier-edit`, `autonomy`, `patch`, `selection` e fluxos integrados | todo o fluxo | 409 e 503 da sequência | `DIFF → ERROR` | `R3`, `R4`, `PPS` | vitest por módulo (já existem `autonomy.test.ts`, `patch.test.ts`, `selection.test.ts`) e E2E de foco, concorrência e resposta obsoleta |
| **RF73.CA10** | identificadores `editor-cmd-*`, `ai-suggestion-card-*`, `ai-btn-apply/reject` | contrato de foco | todas as mensagens com testId | — | `R2` | testes usam testId e `getByRole` com nome; relatório WCAG declara escopo e não alega certificação global |
