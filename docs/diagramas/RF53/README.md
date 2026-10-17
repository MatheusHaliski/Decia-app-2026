# RF53 — Analisar língua, morfossintaxe e gramática no Letters
**HU:** — (sem HU no board; RF especificado em 15/10/2026) · **Sprint (board Work Station):** lista *Requisitos Funcionais* sem sprint atribuída · **Equivalente FAI:** — · **Aba/rota:** Letters (`/letters`, `/letters/[pieceId]`; peça aberta a partir de `/tasks/[id]` e da sessão DECIA `/decia/[sessionId]`) · **Página-esqueleto:** registrada em 17/10/2026; editor ainda não implementado (Onda 4 do PLANO_ONDAS)
**Critérios de aceite cobertos:** RF53.CA01 … RF53.CA07 — corpo do card = especificação de docs/produto/requisitos-studio/RF53.md (CAs copiados como estão escritos); classes reais: `AiGateway`/`AiBudget` (sem motor registrado), `ResourceAuthorizer`, `AccessPolicy`, `lib/ai/autonomy.ts` (evaluateAiAction), página-esqueleto `app/(shell)/letters/page.tsx`; o restante (planejado)

A pessoa seleciona um trecho em português no Letters e pede a análise linguística: o painel marca as classes de palavras com legenda e posição, aponta sujeito, predicado, regência, concordância, crase, flexões, tratamento e tempos verbais como achados ancorados à revisão analisada, explica cada hipótese com regra e referência verificável, troca de idioma só quando há recursos compatíveis e respeita o que a pessoa ignora ou adiciona ao dicionário pessoal, sem enviar cada tecla a um provedor.

**Estado em 17/10/2026.** Nada da análise linguística existe no app (MATRIZ_RF: AUSENTE, 0,00; PLANO_ONDAS Onda 4: “análise linguística local cobre poucos padrões”). Fora do app, o protótipo `docs/exemplo_drawings_letters/work_station_letters_drawings.tsx` colore classes gramaticais por um dicionário fixo de palavras (`posDict`) — é **heurística** de demonstração, não análise. O script de consulta bibliográfica citado em `LETTERS_LINGUA_PORTUGUESA.md` não está versionado neste repositório e nenhum analisador morfossintático está instalado. Reais e reaproveitados: `AiGateway` (orçamento, classificação, trilha; nenhum motor registrado), `evaluateAiAction` (modo da autonomia) e a autorização por recurso.

**Heurística × mock × IA real.** Cada achado traz `origin`: *HEURISTICA* (regra local determinística), *ANALISADOR_LOCAL* (modelo versionado, licença e corpus documentados), *MOCK* (só em testes, nunca exibido como resultado) ou *IA_REAL* (explicação contextual via `AiGateway`, com `inferenceId`). Uma LLM não é apresentada como autoridade gramatical; métricas de acerto vêm só da avaliação em corpus.

## Critérios de aceite

| CA | Enunciado (Dado / Quando / Então) |
|---|---|
| **RF53.CA01** | Dado português selecionado, quando analisa, então diferencia substantivos, verbos, adjetivos, pronomes, advérbios, preposições, conjunções, artigos, numerais e interjeições com legenda e posições no texto. |
| **RF53.CA02** | Dado um corpus de referência anotado, quando identifica sujeito, predicado, regência, concordância, crase e flexões, então mede desempenho por categoria e expõe casos incertos. |
| **RF53.CA03** | Dado tratamento tu/você e tempos/modos distintos, quando há inconsistência contextual, então explica a hipótese e oferece alternativa preservando intenção. |
| **RF53.CA04** | Dada uma correção, quando informa a justificativa, então identifica regra e referência bibliográfica consultada; não inventa edição, página ou citação. |
| **RF53.CA05** | Dada outra língua, quando troca o idioma, então carrega recursos compatíveis ou informa indisponibilidade, sem aplicar regras portuguesas como universais. |
| **RF53.CA06** | Dada análise em tempo real, quando o texto muda, então atualiza somente achados da revisão correta e não reenvia a cada tecla sem controle de frequência/custo. |
| **RF53.CA07** | Dado nome próprio, variedade regional ou falso positivo, quando o usuário ignora ou adiciona ao dicionário pessoal, então respeita a preferência e permite reversão. |

## 1. Diagrama de classes

```mermaid
classDiagram
direction LR

class PartOfSpeech {
  <<enum>>
  SUBSTANTIVO
  VERBO
  ADJETIVO
  PRONOME
  ADVERBIO
  PREPOSICAO
  CONJUNCAO
  ARTIGO
  NUMERAL
  INTERJEICAO
}
class AnalysisOrigin {
  <<enum>>
  HEURISTICA
  ANALISADOR_LOCAL
  MOCK
  IA_REAL
}
class AnalysisRun {
  <<entity>>
  +id: UUID
  +pieceId: UUID
  +baseRevision: long
  +language: String
  +analyzerVersion: String
  +origin: AnalysisOrigin
}
class TokenTag {
  <<entity>>
  +start: int
  +end: int
  +lemma: String
  +pos: PartOfSpeech
  +features: Map
  +alternatives: List~PartOfSpeech~
}
class LinguisticFinding {
  <<entity>>
  +id: UUID
  +blockId: String
  +start: int
  +end: int
  +category: String
  +ruleId: String
  +confidence: Decimal
  +hypothesis: boolean
  +alternative: String
}
class GrammarRule {
  <<entity>>
  +id: String
  +statement: String
  +referenceId: UUID
}
class BibliographicReference {
  <<entity>>
  +author: String
  +title: String
  +edition: String
  +page: String
  +verified: boolean
}
class LanguageResource {
  <<entity>>
  +language: String
  +variant: String
  +version: String
  +license: String
  +available: boolean
}
class EvaluationReport {
  <<entity>>
  +corpusId: String
  +analyzerVersion: String
  +scoreByCategory: Map
  +uncertainCases: List~String~
}
class PersonalDictionary {
  <<entity>>
  +userId: UUID
  +language: String
  +entries: List~String~
  +ignoredFindingKeys: List~String~
}
class LanguageAnalysisService {
  <<service>>
  +analyze(actor, pieceId, selection, language, baseRevision) AnalysisRun
  +ignore(actor, findingId) void
  +addToDictionary(actor, term) void
  +revert(actor, entryId) void
}
class AnalysisScheduler {
  <<service>>
  +schedule(pieceId, revision) void
}
class LinguisticAnalyzerPort {
  <<port>>
  +tag(text, language) List~TokenTag~
}
class AiGateway {
  <<service>>
  +infer(AiRequest) AiResult
}
class ResourceAuthorizer {
  <<service>>
  +require(actor, resource, action) void
}

AnalysisRun "1" --> "*" TokenTag
AnalysisRun "1" --> "*" LinguisticFinding
AnalysisRun --> AnalysisOrigin
TokenTag --> PartOfSpeech
LinguisticFinding --> GrammarRule : justificativa
GrammarRule --> BibliographicReference : fonte consultada
LanguageAnalysisService ..> AnalysisScheduler
LanguageAnalysisService ..> LinguisticAnalyzerPort
LanguageAnalysisService ..> LanguageResource : idioma compatível
LanguageAnalysisService ..> PersonalDictionary
LanguageAnalysisService ..> AiGateway : explicação contextual
LanguageAnalysisService ..> ResourceAuthorizer
EvaluationReport ..> LinguisticAnalyzerPort : avalia versão

note for AiGateway "(real) sem motor registrado, RESTRITO e SIGILOSO não saem"
note for AnalysisScheduler "(planejado) pausa de 400 a 800 ms, teto de frequência e custo"
note for BibliographicReference "(planejado) edição e página nulas quando não conferidas"
```

Legenda: **(real)** `AiGateway` (com `AiBudget`), `ResourceAuthorizer` (sobre `AccessPolicy`). **(planejado)** todas as demais classes (`LETTERS_DRAWINGS_ENGENHARIA.md` §4, pipeline linguístico; taxonomia funcional em `LETTERS_LINGUA_PORTUGUESA.md`).

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph H["Usuário"]
    A0(["Seleciona trecho e idioma"])
    A1["Pede análise ou ativa análise contínua"]
    A2["Abre achado e lê regra e referência"]
    A3{"Ignorar, adicionar ao dicionário ou pedir alternativa?"}
    A4["Reverte preferência no dicionário pessoal"]
  end
  subgraph W["Web/BFF (Next.js)"]
    W1["Legenda de classes e marcação por posição"]
    W2["Achados com origem heurística, analisador ou IA real"]
    W3["Descarta achados de revisão anterior"]
  end
  subgraph S["ws-application"]
    S1{"Peça visível e seleção dentro do limite?"}
    S2{"Recursos para o idioma?"}
    S3{"Pausa, frequência e custo dentro do teto?"}
    S4["Normaliza, segmenta e analisa com versão do analisador"]
    S5["Filtra pelo dicionário pessoal e ignorados"]
    S6{"Achado ainda pertence à revisão atual?"}
  end
  subgraph IA["IA (AiEngine via AiGateway)"]
    I1{"Modo e classificação permitem?"}
    I2["Explica hipótese tu/você ou tempo/modo e propõe alternativa"]
  end
  subgraph P["Persistência"]
    P1[("AnalysisRun e LinguisticFinding")]
    P2[("PersonalDictionary")]
    P3[("EvaluationReport por categoria, offline")]
  end
  A0 --> A1 --> S1
  S1 -->|"invisível"| E404["404 NAO_ENCONTRADO"]
  S1 -->|"excede limite"| E422["422 VALIDACAO motivo SELECAO_EXCEDE_LIMITE"]
  S1 -->|"ok"| S2
  S2 -->|"não"| W0["Informa indisponibilidade, nenhuma regra portuguesa aplicada"]
  S2 -->|"sim"| S3
  S3 -->|"não"| E429["429 LIMITE_FREQUENCIA, sem reenvio automático"]
  S3 -->|"sim"| S4 --> S5 --> P1 --> S6
  S6 -->|"não"| W3
  S6 -->|"sim"| W1 --> W2 --> A2
  P3 -.->|"confiança e casos incertos"| W2
  A2 --> A3
  A3 -->|"ignorar ou dicionário"| P2 --> A4
  A3 -->|"alternativa"| I1
  I1 -->|"não"| E403["403 ACESSO_NEGADO motivo MODO_NAO_PERMITE"]
  I1 -->|"sim"| I2 --> W2
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
  participant D as Redis

  U->>N: Seleciona parágrafo em pt-BR e pede análise
  N->>C: POST /api/pieces/{id}/language-analyses com seleção, idioma e baseRevision
  C->>S: LanguageAnalysisService.analyze
  S->>R: ResourceAuthorizer.require(VIEW)
  alt peça invisível
    S-->>N: 404 NAO_ENCONTRADO
  else idioma sem LanguageResource disponível
    S-->>N: 200 indisponível para o idioma, nenhum achado gerado
  else análise contínua acima do teto
    S->>D: contador por pessoa e peça
    S-->>N: 429 LIMITE_FREQUENCIA
  else analisável
    S->>S: segmenta, etiqueta e aplica regras com versão do analisador
    S->>R: AnalysisRun, TokenTag e LinguisticFinding ancorados à baseRevision
    S-->>N: legenda, posições, regra, referência e confiança
  end
  U->>N: Edita o texto durante a análise
  N->>N: descarta achados cuja baseRevision não é a atual
  U->>N: Pede alternativa para tu e você misturados
  N->>C: POST /api/findings/{fid}/alternative
  C->>S: evaluateAiAction(RESPONDER) e classificação da peça
  alt modo MANUAL ou conteúdo RESTRITO sem motor local
    S-->>N: 403 ACESSO_NEGADO ou 422 IA_CONTEUDO_RESTRITO
  else permitido
    S->>AI: AiGateway.infer com o trecho como dado
    AI-->>S: hipótese e alternativa
    S-->>N: proposta preservando a intenção, selo IA real
  end
  U->>N: Adiciona nome próprio ao dicionário pessoal
  N->>C: POST /api/me/dictionary
  C->>S: LanguageAnalysisService.addToDictionary
  S->>R: PersonalDictionary atualizado, reversível
  S-->>N: achados correspondentes ocultos
```

## 4. Máquina de estados

Entidades afetadas: a peça Letters (`WorkPiece.state`, planejado), a proposta de IA (alternativa contextual do CA03) e o achado linguístico (`LinguisticFinding`, planejado). A análise não muda o estado da peça.

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
    [*] --> PROPOSTA: alternativa pedida pela pessoa
    PROPOSTA --> ACEITA: aceite explícito na mesma revisão
    PROPOSTA --> REJEITADA: rejeitada
    PROPOSTA --> INVALIDADA_POR_POLITICA: autonomia alterada
    PROPOSTA --> OBSOLETA_POR_REVISAO: texto alterado
  }
  state AchadoLinguistico {
    [*] --> ACHADO_ABERTO: análise da revisão atual
    ACHADO_ABERTO --> ACHADO_IGNORADO: ignorar
    ACHADO_ABERTO --> NO_DICIONARIO: adicionar ao dicionário pessoal
    ACHADO_IGNORADO --> ACHADO_ABERTO: reverter
    NO_DICIONARIO --> ACHADO_ABERTO: remover do dicionário
    ACHADO_ABERTO --> ACHADO_DESCARTADO: revisão-base mudou
    ACHADO_ABERTO --> ACHADO_RESOLVIDO: trecho corrigido pela pessoa
  }
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FRONT["Next.js app/ e components/"]
    LP["app/(shell)/letters, página-esqueleto (real)"]
    LE["LettersEditor e painel Língua (planejado)"]
    UI["components/ui"]
    BFF["app/bff"]
  end
  subgraph LIB["lib/*"]
    AUT["lib/ai/autonomy.ts (real)"]
    LH["lib/letters regras locais e pausa (planejado)"]
  end
  subgraph WEB["ws-web"]
    LC["LanguageAnalysisController (planejado)"]
  end
  subgraph APP["ws-application"]
    LAS["letters/LanguageAnalysisService e AnalysisScheduler (planejado)"]
    GW["ai/AiGateway e AiBudget (real)"]
    RA["security/ResourceAuthorizer (real)"]
  end
  subgraph DOM["ws-domain"]
    AP["security/AccessPolicy (real)"]
    ENT["AnalysisRun, LinguisticFinding, PersonalDictionary (planejado)"]
  end
  subgraph INF["ws-infrastructure"]
    MY["persistence-mysql achados e dicionário (planejado)"]
    RD["cache-redis teto de frequência"]
    AIP["ai-providers analisador local e AiEnginePort (nenhum registrado)"]
  end
  EXT["Claude / Gemini, só PUBLICO e INTERNO com consentimento"]
  LP --> LE --> UI
  LE --> LH
  LE --> AUT
  LE --> BFF --> LC --> LAS
  LAS --> RA --> AP
  LAS --> ENT --> MY
  LAS --> RD
  LAS --> GW --> AIP --> EXT
```

## 6. Rastreabilidade

| CA | Classe | Passo (atividade) | Mensagem (sequência) | Transição | Componente |
|---|---|---|---|---|---|
| **RF53.CA01** | `TokenTag` (start, end, pos), `PartOfSpeech` (dez classes), legenda | S4 → W1 | 1–11 | `[*] → ACHADO_ABERTO` | `LE`, `LAS`, `AIP` |
| **RF53.CA02** | `EvaluationReport` (scoreByCategory, uncertainCases), `LinguisticFinding.confidence` | P3 → W2 | 11 (confiança exibida) | — | `LAS`, `AIP` |
| **RF53.CA03** | `LinguisticFinding.hypothesis/alternative`, `AiGateway`, `evaluateAiAction(RESPONDER)` | A3 → I1 → I2 | 14–20 | `PROPOSTA → ACEITA / REJEITADA / OBSOLETA_POR_REVISAO` | `GW`, `AUT` |
| **RF53.CA04** | `GrammarRule`, `BibliographicReference` (edition e page só quando verified) | A2 | 11 | — | `LAS`, `ENT` |
| **RF53.CA05** | `LanguageResource` (language, variant, available) | S2 → W0 | 6 | nenhuma (sem achados) | `LAS` |
| **RF53.CA06** | `AnalysisScheduler`, `AnalysisRun.baseRevision` | S3 → E429, S6 → W3 | 7–8 e 12–13 | `ACHADO_ABERTO → ACHADO_DESCARTADO` | `LH`, `RD`, `LAS` |
| **RF53.CA07** | `PersonalDictionary` (entries, ignoredFindingKeys), `revert` | A3 → P2 → A4 | 21–25 | `ACHADO_ABERTO → ACHADO_IGNORADO / NO_DICIONARIO` e volta | `LAS`, `MY` |

Regras transversais refletidas: autorização no servidor (404 uniforme); SIGILOSO só dono e colaboradores explícitos (D-139) e nunca enviado a provedor externo; instruções dentro do texto analisado são dados; análise não publica nem marca nada como concluído.
