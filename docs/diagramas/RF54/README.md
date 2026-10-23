# RF54 — Analisar coerência, narrativa, gênero e fontes no Letters
**HU:** — (sem HU no board; RF especificado em 15/10/2026) · **Sprint (board Work Station):** lista *Requisitos Funcionais* sem sprint atribuída · **Equivalente FAI:** — · **Aba/rota:** Letters (`/letters`, `/letters/[pieceId]`; peça aberta a partir de `/tasks/[id]` e da sessão DECIA `/decia/[sessionId]`) · **Página-esqueleto:** registrada em 17/10/2026; editor ainda não implementado (Onda 4 do PLANO_ONDAS)
**Critérios de aceite cobertos:** RF54.CA01 … RF54.CA07 — corpo do card = especificação de docs/produto/requisitos-studio/RF54.md (CAs copiados como estão escritos); classes reais: `AiGateway`/`AiBudget` (sem motor registrado), `ResourceAuthorizer`, `AccessPolicy`, `lib/ai/autonomy.ts` (evaluateAiAction), página-esqueleto `app/(shell)/letters/page.tsx`; o restante (planejado)

A pessoa escolhe o gênero do texto (técnico, acadêmico, jornalístico ou narrativo) e pede ao Letters uma leitura de coerência, tom, continuidade e fontes: cada achado aponta os trechos de evidência, separa contradição demonstrável de hipótese e de contexto insuficiente, cada indicador por parágrafo mostra rubrica e evidência, cada citação recebe o estado acessível, indisponível ou não verificada, e o relatório declara o que ficou fora da cobertura, sem substituir o julgamento do autor nem reescrever o texto.

**Estado em 17/10/2026.** Nada deste RF existe no app (MATRIZ_RF: AUSENTE, 0,00). PLANO_ONDAS (Onda 4) registra que os alertas de gênero do protótipo são heurísticos e que continuidade narrativa e fontes não são analisadas. Reais e reaproveitados: `AiGateway` (orçamento `429 IA_ORCAMENTO_ESGOTADO`, classificação `422 IA_CONTEUDO_RESTRITO`, trilha `AiInferenceLog`; nenhum `AiEnginePort` registrado), `evaluateAiAction` e `ResourceAuthorizer` (um vínculo de fonte não concede acesso: a fonte que a pessoa não vê é “indisponível”, sem revelar existência).

**Heurística × mock × IA real.** Contagens de primeira pessoa, conectores e comprimento de frase são *heurística* e aparecem como contagem de avisos ou “não avaliado”, nunca como nota calibrada; testes usam ledgers e respostas *mock*; *IA real* só com `inferenceId` e após consentimento, e mesmo assim a nota só é exibida com rubrica e versão.

## Critérios de aceite

| CA | Enunciado (Dado / Quando / Então) |
|---|---|
| **RF54.CA01** | Dado gênero técnico, acadêmico, jornalístico ou narrativo, quando analisa, então usa critérios do gênero escolhido e explica mudanças de tom. |
| **RF54.CA02** | Dada notícia neutra com primeira pessoa, quando detecta subjetividade, então sinaliza o trecho sem declarar todo uso como erro obrigatório. |
| **RF54.CA03** | Dado personagem morto que reaparece depois, quando não há explicação narrativa identificada, então aponta as duas passagens e pede revisão de continuidade. |
| **RF54.CA04** | Dadas cronologia e entidades ao longo de capítulos, quando analisa, então diferencia contradição demonstrável de hipótese e contexto insuficiente. |
| **RF54.CA05** | Dado indicador por parágrafo de coerência, clareza, sintaxe e tom, quando apresenta nota, então informa rubrica e evidência; heurística não aparece como nota calibrada de IA. |
| **RF54.CA06** | Dadas citações e afirmações factuais, quando verifica fontes, então distingue referência acessível, indisponível e não verificada. |
| **RF54.CA07** | Dado documento longo, quando segmenta contexto, então mantém vínculos entre achados e trechos e informa limites da cobertura. |

## 0. Diagrama de casos de uso

Quem tem acesso à peça escolhe o gênero e pede a leitura de coerência, continuidade e fontes; o relatório aponta evidências e limites sem reescrever o texto. A análise contextual pela IA estende a leitura e depende do modo de autonomia. Nada disto existe em tela hoje.

```mermaid
flowchart LR
  classDef ator fill:#fde7d3,stroke:#b4531a,color:#1b1b1b
  classDef atorSis fill:#f1ecf9,stroke:#6a4bb3,color:#1b1b1b
  classDef uc fill:#ffffff,stroke:#3557a6,color:#1b1b1b
  classDef ucPlan fill:#ffffff,stroke:#8a8a8a,stroke-dasharray:4 3,color:#555555
  autenticado["«ator» Pessoa autenticada"]:::ator
  subgraph SIS["Work Station — RF54 Coerência e fontes"]
    direction TB
    UC1(["UC1 Escolher o gênero do texto"]):::ucPlan
    UC2(["UC2 Pedir leitura de coerência e tom"]):::ucPlan
    UC3(["UC3 Revisar trechos de subjetividade sinalizados"]):::ucPlan
    UC4(["UC4 Revisar continuidade narrativa e cronologia"]):::ucPlan
    UC5(["UC5 Consultar indicadores por parágrafo com rubrica"]):::ucPlan
    UC6(["UC6 Verificar citações e fontes"]):::ucPlan
    UC7(["UC7 Consultar limites da cobertura do relatório"]):::ucPlan
    UC8(["UC8 Pedir análise contextual à IA"]):::ucPlan
    UC9(["UC9 Verificar acesso à fonte vinculada (ResourceAuthorizer)"]):::ucPlan
    UC10(["UC10 Verificar o modo de autonomia (evaluateAiAction)"]):::ucPlan
  end
  ia["«ator» IA (AiGateway)"]:::atorSis
  autenticado --- UC1
  autenticado --- UC2
  autenticado --- UC3
  autenticado --- UC4
  autenticado --- UC5
  autenticado --- UC6
  autenticado --- UC7
  autenticado --- UC8
  UC2 -. "«include»" .-> UC1
  UC6 -. "«include»" .-> UC9
  UC8 -. "«include»" .-> UC10
  UC8 -. "«extend»" .-> UC2
  UC8 --- ia
```

| Caso de uso | Ator(es) | CAs | Situação |
|---|---|---|---|
| UC1 Escolher o gênero do texto | `autenticado` (incluído por UC2) | RF54.CA01 | planejado |
| UC2 Pedir leitura de coerência e tom | `autenticado` | RF54.CA01 · CA02 | planejado |
| UC3 Revisar trechos de subjetividade sinalizados | `autenticado` | RF54.CA02 | planejado |
| UC4 Revisar continuidade narrativa e cronologia | `autenticado` | RF54.CA03 · CA04 | planejado |
| UC5 Consultar indicadores por parágrafo com rubrica | `autenticado` | RF54.CA05 | planejado |
| UC6 Verificar citações e fontes | `autenticado` | RF54.CA06 | planejado |
| UC7 Consultar limites da cobertura do relatório | `autenticado` | RF54.CA07 | planejado |
| UC8 Pedir análise contextual à IA | `autenticado`, `ia` (estende UC2) | RF54.CA04 · CA05 | planejado |
| UC9 Verificar acesso à fonte vinculada (ResourceAuthorizer) | — (incluído por UC6) | RF54.CA06 | planejado — `ResourceAuthorizer` real; fonte invisível = indisponível |
| UC10 Verificar o modo de autonomia (evaluateAiAction) | — (incluído por UC8) | RF54.CA05 | planejado — função real `lib/ai/autonomy.ts`, sem editor |

## 1. Diagrama de classes

```mermaid
classDiagram
direction LR

class TextGenre {
  <<enum>>
  TECNICO
  ACADEMICO
  JORNALISTICO
  NARRATIVO
}
class Certainty {
  <<enum>>
  CONTRADICAO_DEMONSTRAVEL
  HIPOTESE
  CONTEXTO_INSUFICIENTE
}
class SourceStatus {
  <<enum>>
  ACESSIVEL
  INDISPONIVEL
  NAO_VERIFICADA
}
class GenreProfile {
  <<entity>>
  +genre: TextGenre
  +rubricVersion: String
  +criteria: List~String~
}
class DiscourseFinding {
  <<entity>>
  +id: UUID
  +kind: String
  +anchors: List~Anchor~
  +certainty: Certainty
  +explanation: String
  +origin: String
  +baseRevision: long
}
class NarrativeLedger {
  <<entity>>
  +pieceId: UUID
  +baseRevision: long
  +entities: List~String~
}
class NarrativeEvent {
  <<entity>>
  +entityId: String
  +kind: String
  +storyTime: String
  +narrationOrder: int
  +anchor: Anchor
}
class ParagraphIndicator {
  <<entity>>
  +blockId: String
  +dimension: String
  +value: Decimal
  +rubricVersion: String
  +evidence: Anchor
  +calibrated: boolean
}
class FactualClaim {
  <<entity>>
  +anchor: Anchor
  +text: String
  +isCitation: boolean
}
class SourceLink {
  <<entity>>
  +resourceRef: String
  +versionHash: String
  +status: SourceStatus
}
class CoverageReport {
  <<entity>>
  +segments: int
  +analyzedBlockIds: List~String~
  +skippedBlockIds: List~String~
  +limits: String
}
class DiscourseAnalysisService {
  <<service>>
  +analyze(actor, pieceId, genre, scope, baseRevision) CoverageReport
}
class ContextSegmenter {
  <<service>>
  +segment(document, budget) List~Segment~
}
class SourceVerifier {
  <<service>>
  +verify(actor, claim) SourceLink
}
class AiGateway {
  <<service>>
  +infer(AiRequest) AiResult
}
class ResourceAuthorizer {
  <<service>>
  +require(actor, resource, action) void
}

GenreProfile --> TextGenre
DiscourseFinding --> Certainty
SourceLink --> SourceStatus
NarrativeLedger "1" --> "*" NarrativeEvent
FactualClaim "1" --> "0..1" SourceLink
DiscourseAnalysisService ..> GenreProfile : critérios do gênero
DiscourseAnalysisService ..> ContextSegmenter
DiscourseAnalysisService ..> NarrativeLedger
DiscourseAnalysisService ..> DiscourseFinding
DiscourseAnalysisService ..> ParagraphIndicator
DiscourseAnalysisService ..> SourceVerifier
DiscourseAnalysisService ..> CoverageReport
DiscourseAnalysisService ..> AiGateway
SourceVerifier ..> ResourceAuthorizer : vínculo não concede acesso

note for DiscourseFinding "(planejado) contradição exige duas âncoras"
note for ParagraphIndicator "(planejado) sem calibração mostra contagem ou não avaliado"
note for AiGateway "(real) sem motor registrado"
note for ResourceAuthorizer "(real) fonte invisível vira INDISPONIVEL sem revelar existência"
```

Legenda: **(real)** `AiGateway` (com `AiBudget`), `ResourceAuthorizer` (sobre `AccessPolicy`). **(planejado)** todas as demais (`LETTERS_DRAWINGS_ENGENHARIA.md` §4 itens 4–5, ledger de entidades e eventos; `SourceLink` do modelo canônico §3; fontes institucionais via RF33).

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph H["Usuário (autor)"]
    A0(["Escolhe gênero e escopo"])
    A1["Pede análise de coerência, narrativa e fontes"]
    A2{"Revisa achado: confirma, descarta ou edita o trecho?"}
  end
  subgraph W["Web/BFF (Next.js)"]
    W1["Achados com trechos de evidência e grau de certeza"]
    W2["Indicadores por parágrafo com rubrica, ou não avaliado"]
    W3["Fontes com estado e relatório de cobertura"]
  end
  subgraph S["ws-application"]
    S1{"Peça visível e gênero informado?"}
    S2["ContextSegmenter divide respeitando orçamento e mantém âncoras"]
    S3["Aplica critérios do GenreProfile e heurísticas locais"]
    S4["Atualiza NarrativeLedger de entidades e eventos"]
    S5{"Há duas âncoras que se contradizem?"}
    S6{"Fonte citada é acessível para a pessoa?"}
  end
  subgraph IA["IA (AiEngine via AiGateway)"]
    I1{"Modo, orçamento e classificação permitem?"}
    I2["Análise por segmento como dado, saída estruturada"]
  end
  subgraph P["Persistência"]
    P1[("DiscourseFinding, ParagraphIndicator, CoverageReport")]
  end
  A0 --> A1 --> S1
  S1 -->|"invisível"| E404["404 NAO_ENCONTRADO"]
  S1 -->|"sem gênero"| E422["422 VALIDACAO motivo GENERO_NAO_INFORMADO"]
  S1 -->|"ok"| S2 --> S3 --> I1
  I1 -->|"não"| HEU["Segue só com heurística, sem nota calibrada"]
  I1 -->|"orçamento"| E429["429 IA_ORCAMENTO_ESGOTADO"]
  I1 -->|"sim"| I2 --> S4
  HEU --> S4
  S4 --> S5
  S5 -->|"sim"| C1["CONTRADICAO_DEMONSTRAVEL com as duas passagens"]
  S5 -->|"indício sem prova"| C2["HIPOTESE, pede revisão de continuidade"]
  S5 -->|"falta contexto"| C3["CONTEXTO_INSUFICIENTE"]
  C1 --> S6
  C2 --> S6
  C3 --> S6
  S6 -->|"sim"| SA["ACESSIVEL"]
  S6 -->|"não ou sem permissão"| SI["INDISPONIVEL"]
  S6 -->|"sem referência conferida"| SN["NAO_VERIFICADA"]
  SA --> P1
  SI --> P1
  SN --> P1
  P1 --> W1 --> W2 --> W3 --> A2
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
  participant O as OpenSearch

  U->>N: Escolhe gênero NARRATIVO e pede análise do documento
  N->>C: POST /api/pieces/{id}/discourse-analyses com gênero, escopo e baseRevision
  C->>S: DiscourseAnalysisService.analyze
  S->>R: ResourceAuthorizer.require(VIEW)
  alt peça invisível
    S-->>N: 404 NAO_ENCONTRADO
  else gênero ausente
    S-->>N: 422 VALIDACAO motivo GENERO_NAO_INFORMADO
  else analisável
    S->>S: ContextSegmenter.segment com âncoras por bloco
    loop cada segmento dentro do orçamento
      S->>AI: AiGateway.infer com o segmento como dado
      AI-->>S: entidades, eventos e tom estruturados
    end
    S->>S: NarrativeLedger detecta morte no cap. 2 e reaparição no cap. 7
    S->>O: busca a fonte citada na memória institucional autorizada
    O-->>S: resultado filtrado por visibilidade
    S->>R: DiscourseFinding, ParagraphIndicator, SourceLink e CoverageReport
    S-->>N: achados ancorados, indicadores com rubrica, fontes e cobertura
  end
  opt orçamento esgotado no meio dos segmentos
    S-->>N: 429 IA_ORCAMENTO_ESGOTADO, cobertura parcial declarada
  end
  U->>N: Abre achado de continuidade
  N-->>U: duas passagens destacadas e pedido de revisão
```

## 4. Máquina de estados

Entidades afetadas: a peça Letters (`WorkPiece.state`, planejado), a proposta de IA (eventual sugestão de redação) e o achado de discurso (`DiscourseFinding`, planejado). A análise nunca altera o texto nem o estado da peça.

```mermaid
stateDiagram-v2
  state PecaLetters {
    [*] --> RASCUNHO
    RASCUNHO --> EM_REVISAO: pessoa envia versão para revisão
    EM_REVISAO --> RASCUNHO: devolvida ou conteúdo alterado
    EM_REVISAO --> PUBLICADA: publicação explícita por humano autorizado
    RASCUNHO --> ARQUIVADA: arquivar
    PUBLICADA --> ARQUIVADA: arquivar
  }
  state PropostaIA {
    [*] --> PROPOSTA: sugestão pedida pelo autor
    PROPOSTA --> ACEITA: aceite explícito na mesma revisão
    PROPOSTA --> REJEITADA: rejeitada
    PROPOSTA --> INVALIDADA_POR_POLITICA: autonomia alterada
    PROPOSTA --> OBSOLETA_POR_REVISAO: texto alterado
  }
  state AchadoDiscurso {
    [*] --> ACHADO_ABERTO: análise da revisão atual
    ACHADO_ABERTO --> REVISADO_PELO_AUTOR: autor edita o trecho
    ACHADO_ABERTO --> MANTIDO_PELO_AUTOR: autor mantém, por exemplo flashback
    ACHADO_ABERTO --> ACHADO_DESCARTADO: revisão-base mudou
    MANTIDO_PELO_AUTOR --> ACHADO_ABERTO: reabrir
  }
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FRONT["Next.js app/ e components/"]
    LP["app/(shell)/letters, página-esqueleto (real)"]
    LE["LettersEditor e painel Texto e Fontes (planejado)"]
    UI["components/ui"]
    BFF["app/bff"]
  end
  subgraph LIB["lib/*"]
    AUT["lib/ai/autonomy.ts (real)"]
  end
  subgraph WEB["ws-web"]
    DC["DiscourseAnalysisController (planejado)"]
  end
  subgraph APP["ws-application"]
    DAS["letters/DiscourseAnalysisService, ContextSegmenter, SourceVerifier (planejado)"]
    GW["ai/AiGateway e AiBudget (real)"]
    RA["security/ResourceAuthorizer (real)"]
  end
  subgraph DOM["ws-domain"]
    AP["security/AccessPolicy (real)"]
    ENT["DiscourseFinding, NarrativeLedger, SourceLink (planejado)"]
  end
  subgraph INF["ws-infrastructure"]
    MY["persistence-mysql achados e cobertura (planejado)"]
    OS["search-opensearch ws-memory, RF33"]
    AIP["ai-providers AiEnginePort (nenhum registrado)"]
  end
  EXT["Claude / Gemini, só PUBLICO e INTERNO com consentimento"]
  LP --> LE --> UI
  LE --> AUT
  LE --> BFF --> DC --> DAS
  DAS --> RA --> AP
  DAS --> ENT --> MY
  DAS --> OS
  DAS --> GW --> AIP --> EXT
```

## 6. Rastreabilidade

| CA | Classe | Passo (atividade) | Mensagem (sequência) | Transição | Componente |
|---|---|---|---|---|---|
| **RF54.CA01** | `GenreProfile` (genre, rubricVersion, criteria), `TextGenre` | A0 → S1 → S3 | 1–3 e 7 | — | `LE`, `DAS` |
| **RF54.CA02** | `DiscourseFinding` kind SUBJETIVIDADE com `Certainty.HIPOTESE`, sem correção obrigatória | S3 → W1 → A2 | 14 | `ACHADO_ABERTO → MANTIDO_PELO_AUTOR` | `DAS`, `LE` |
| **RF54.CA03** | `NarrativeLedger`, `NarrativeEvent` (MORTE, APARICAO), duas `anchors` | S4 → S5 → C2 | 10 e 16–17 | `ACHADO_ABERTO → REVISADO_PELO_AUTOR` | `DAS`, `ENT` |
| **RF54.CA04** | `Certainty` (CONTRADICAO_DEMONSTRAVEL, HIPOTESE, CONTEXTO_INSUFICIENTE) | S5 → C1 / C2 / C3 | 10 | — | `DAS` |
| **RF54.CA05** | `ParagraphIndicator` (rubricVersion, evidence, calibrated), origem heurística | HEU → W2 | 13–14 | — | `DAS`, `LE` |
| **RF54.CA06** | `FactualClaim`, `SourceLink.status`, `SourceVerifier`, `ResourceAuthorizer` | S6 → SA / SI / SN | 11–12 | — | `DAS`, `OS`, `RA` |
| **RF54.CA07** | `ContextSegmenter`, `CoverageReport` (analyzedBlockIds, skippedBlockIds, limits) | S2 → P1 → W3 | 7–9 e 15 | `ACHADO_ABERTO → ACHADO_DESCARTADO` quando a revisão muda | `DAS`, `MY` |

Regras transversais refletidas: autorização no servidor (404 uniforme, fonte invisível sem revelar existência); SIGILOSO só dono e colaboradores explícitos (D-139) e fora do provedor externo; texto analisado é dado, nunca comando; a análise não reescreve, não publica e não marca revisão como concluída.
