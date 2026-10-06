# DECIA — Modelo funcional da decisão estruturada (v1)

> **DECIA = Decisão com Inteligência Artificial** (definição oficial: board "Work Station" cartão de visão, `README.md:4`,
> `docs/arquitetura/ARQUITETURA.md:5`). Este documento **não** muda o nome nem a sigla; muda o que o DECIA estrutura.
>
> Etiquetas usadas em todo o pacote `docs/decia/`:
> - **[REF-x]** — regra sustentada por uma referência de `docs/produto/BIBLIOGRAFIA.md` ou do Anexo R de
>   `docs/produto/DECIA_SESSAO_E_MESA.md` (matriz completa em `02_MATRIZ_BIBLIOGRAFICA.md`).
> - **[BOARD RFn]** — regra que vem de um cartão do board (fonte de verdade dos RFs; nenhum RF novo é criado aqui).
> - **PRODUCT HYPOTHESIS** — ideia de produto plausível, **sem** sustentação nas referências fornecidas; precisa de
>   validação com usuários antes de virar regra fixa.
> - **DESIGN PROPOSAL** — escolha de interface/engenharia proposta por nós; não é conclusão acadêmica.

## 1. Definição funcional

O DECIA é a **infraestrutura de decisão** do Work Station: transforma uma pergunta decisória em um registro
estruturado, comparável e rastreável, acompanha a execução e devolve o aprendizado para decisões futuras.

A sessão deliberativa em grupo (chat classificado, `DeciaSession`, RF29/RF13/RF37) **continua existindo** e passa a ser
**um dos modos de construir** uma decisão, não o único. Uma decisão pode nascer:

| Origem | Quando | Liga a |
|---|---|---|
| Decisão rápida | pergunta simples, 1 pessoa ou poucas | nada além do próprio registro |
| Decisão padrão / profunda | problema com alternativas e critérios reais | opcional: projeto (`project_schemes`), sessão DECIA |
| A partir de uma sessão DECIA | a deliberação em grupo já existe | `decisions.session_id`; o `FinalDecision` (RF29 / validação humana) aponta para o mesmo assunto por `decisions.final_decision_id` |

Pergunta central que o sistema responde: **"Como esta decisão foi construída?"** — e não "qual opção a IA recomenda?".

## 2. Modelo mental — nove estágios

```
1 PROBLEMA → 2 CONTEXTO → 3 EVIDÊNCIAS → 4 ALTERNATIVAS → 5 CRITÉRIOS → 6 ANÁLISE → 7 DECISÃO → 8 EXECUÇÃO → 9 APRENDIZADO
```

- Os estágios são o **modelo mental**, não nove telas. O workspace agrupa-os em 6 seções (ver `05_WORKSPACE_E_NAVEGACAO.md`).
- O percurso Divergir → Convergir já usado na sessão (Double Diamond **[REF-DD]**) mapeia para 1–4 (divergir: abrir o
  problema e as opções) e 5–7 (convergir: comparar e escolher).
- A questão → posições → argumentos do IBIS **[REF-IBIS]** (Kunz & Rittel 1970; Conklin 2005) é a espinha: **pergunta
  decisória** (issue) → **alternativas** (positions) → **evidências que sustentam/contradizem** (arguments pró/contra).
- O loop 9 → 1 é a **aprendizagem de laço duplo** de Argyris & Schön (1978) **[REF-ARGYRIS]**: a revisão não corrige só a
  ação (laço simples), questiona as premissas que levaram a ela.

## 3. Regras de ouro (implementáveis)

| # | Regra | Fonte |
|---|---|---|
| G1 | Toda decisão tem **uma pergunta decisória** e **um responsável humano** (`ownerUserId`). A IA nunca é responsável. | [REF-PARASURAMAN] níveis de automação; [REF-SHNEIDERMAN] alto controle humano; [BOARD] objetivo 1 "responsabilidade decisória final sob autoridade humana" |
| G2 | Sugestão da IA ≠ decisão humana: todo conteúdo gerado tem `origin = IA` + `aiInferenceId`, aparece com ✦ e só entra no registro quando um humano aceita. | [REF-AMERSHI] G1/G2/G11; [BOARD RF38.CA04] faísca ✦ |
| G3 | **Modelo transparente antes de modelo opaco**: a pontuação das alternativas é a soma ponderada explícita (§6.1); a IA não substitui a matriz. | [REF-DOSHIVELEZ] interpretabilidade; [REF-MITTELSTADT] opacidade como risco ético. A fórmula específica (soma ponderada/MCDA) é **PRODUCT HYPOTHESIS** — não há referência de MCDA na bibliografia |
| G4 | Fato ≠ premissa ≠ opinião ≠ previsão ≠ evidência: cada enunciado tem **natureza** explícita. | [REF-TOULMIN] dados × garantia × qualificador |
| G5 | **Julgamento independente antes do consenso**: em decisões em grupo, cada participante avalia antes de ver a média. | [REF-NOISE] higiene de decisão; [REF-NGT]; [REF-DELPHI]; [REF-JANIS] groupthink; [REF-STASSER] perfil oculto |
| G6 | Divergência alta é **sinal**, não ruído a esconder numa média. | [REF-SUNSTEIN]; [REF-JANIS]; [REF-KIALO] consenso por opção |
| G7 | O que se sabia **no momento da decisão** é congelado (snapshot imutável com hash); mudanças posteriores nunca reescrevem o passado. | [REF-FOWLER-ES] event sourcing; [REF-WALSH] memória organizacional; LGPD art. 20 (revisão de decisões automatizadas exige reconstrução) |
| G8 | Qualidade da decisão ≠ qualidade do resultado: a revisão avalia o **processo** separado do **resultado**. | [REF-ARGYRIS]; **PRODUCT HYPOTHESIS** para o quadrante "boa decisão × mau resultado" (sem referência específica na bibliografia) |
| G9 | Nada de pontos por **quantidade** (evidências, mensagens). Métricas são de **cobertura e acompanhamento**, nunca de volume. | [REF-GOODHART]; [REF-KERR]; [REF-DECI-CROWDING] |
| G10 | Confiança humana ≠ força da evidência ≠ pontuação do modelo: três indicadores separados, nunca fundidos. | [REF-TOULMIN] qualificador × dados; [REF-AMERSHI] G2 "deixar claro quão bem o sistema faz" |
| G11 | Sem precisão falsa: confiança em passos de 5 pp e faixas BAIXA/MÉDIA/ALTA; nunca "72,43 %". | **DESIGN PROPOSAL** (coerente com [REF-AMERSHI] G2) |
| G12 | Padrões de decisão são **comportamento observado**, nunca traço de personalidade. | [REF-EDMONDSON] segurança psicológica; [BOARD RF45] "sempre explicável"; [REF-ZUBOFF]/[REF-AJUNWA] vigilância |

## 4. Domínio — contexto "5b DECIA decisão estruturada" (migration V22)

Pacote Java `br.gov.pr.secid.workstation.domain.decisao`. Todas as tabelas novas: ids `BINARY(16)`, enums `VARCHAR + CHECK`,
convenções do V2 (D-23). Nenhuma migration aplicada é editada; ligações com tabelas antigas saem **da tabela nova**.

### 4.1 Reuso (não duplicar)

| Necessidade | Reusa | Não cria |
|---|---|---|
| Sessão em grupo | `decia_sessions` (FK opcional) | outro chat |
| Validação formal pelo revisor (RF29, carimbo VALIDADO/DEVOLVIDO) | `final_decisions` + `decision_reviews` (FK opcional `final_decision_id`) | outro fluxo de aprovação |
| Cenários do simulador | `project_scenarios` (FK opcional) | outro simulador |
| Cenários do resumo da sessão | `summary_scenarios` (FK opcional na alternativa) | — |
| Tarefas, projetos, marcos | `tasks`, `project_schemes` via `decision_work_links` | cópia de tarefa |
| Arquivos | `media_objects` (FK opcional na evidência) | outro storage |
| Proveniência de IA | `ai_inference_log` (FK `ai_inference_id`) | outro log de IA |
| Visibilidade | `Visibility` {PRIVADA, DEPARTAMENTO, EMPRESA, PUBLICA} + `AccessClassification` | novo vocabulário |
| Auditoria de segurança | `audit_log` (ações `DECISAO_*`) | — |

### 4.2 Entidades novas

| Entidade → tabela | Atributos principais | Observações |
|---|---|---|
| `Decision` → `decisions` (versioned) | title(160), **question(500)**, contextMd, objective, constraintsMd, scope, stakeholdersJson, resourcesMd, dependenciesMd, targetDate, ownerUserId, createdByUserId, companyId, departmentId?, sessionId?, projectId?, finalDecisionId?, supersedesDecisionId?, **status** `DecisionLifecycle`, **complexity** `DecisionComplexity`, **kind** `DecisionKind`, **impact** / **urgency** `DecisionLevel`, visibility, accessClass, weightingEnabled, independentScoring, templateKey?, selectedAlternativeId?, decidedAt?, decisionConfidencePct?, rationale?, reviewEveryDays? | agregado raiz. `selectedAlternativeId` é o estado **atual**; o do momento da decisão vive no snapshot |
| `DecisionParticipant` → `decision_participants` | decisionId, userId, role `DecisionRole` {CONDUTOR, APROVADOR, CONTRIBUIDOR, INFORMADO}, joinedAt, assessmentsSubmittedAt? | papéis DACI **[REF-DACI]**; único (decisão, usuário) |
| `DecisionAlternative` → `decision_alternatives` | label (A, B…), title, description, **doNothing**, prosJson, consJson, estimatedCost?, estimatedDurationDays?, dependenciesMd?, status {ATIVA, DESCARTADA}, discardReason?, origin, aiInferenceId?, summaryScenarioId?, projectScenarioId?, position | "não agir" é alternativa de primeira classe |
| `DecisionCriterion` → `decision_criteria` | name, description, direction {MAIOR_MELHOR, MENOR_MELHOR} (dica), **weightPct?** DECIMAL(5,2), catalogKey?, origin, aiInferenceId?, position | critérios escolhidos por decisão, nunca universais |
| `CriterionAssessment` → `criterion_assessments` | alternativeId, criterionId, assessorUserId, **score 1–5** (5 = mais desejável), rationale?, submittedAt, origin | uma linha por avaliador; consenso = mediana (§6.2) |
| `DecisionEvidence` → `decision_evidence` | **nature** {FATO, EVIDENCIA, OPINIAO}, kind `EvidenceKind`, title, summary, sourceLabel, sourceUrl?, mediaId?, taskId?, authorLabel?, observedAt?, retrievedAt?, **sourceQuality** `SourceQuality`, **relevance** / **reliability** `RelevanceLevel`, origin, aiInferenceId?, addedByUserId, supersededAt? | fonte preservada; nunca apagada (só `supersededAt`) |
| `EvidenceLink` → `decision_evidence_links` | evidenceId, targetType {ALTERNATIVA, CRITERIO, PREMISSA, RISCO, AVALIACAO}, targetId, **stance** {SUSTENTA, CONTRADIZ, CONTEXTO}, note? | a mesma evidência pode sustentar A e contradizer B |
| `DecisionAssumption` → `decision_assumptions` | statement, importance `DecisionLevel`, **confidencePct?** (0–100, passo 5), validationStatus {NAO_VALIDADA, EM_VALIDACAO, VALIDADA, INVALIDADA}, ownerUserId?, alternativeId?, validationNote?, validatedAt?, origin, aiInferenceId? | registro de premissas |
| `DecisionRisk` → `decision_risks` | title, description?, alternativeId?, **likelihood** `Likelihood`, **impact** `DecisionLevel`, mitigation?, ownerUserId?, source {MANUAL, PRE_MORTEM, RED_TEAM, IA}, status {ABERTO, MITIGADO, ACEITO, OCORREU, ENCERRADO}, origin, aiInferenceId? | severidade calculada (§6.6), não digitada |
| `DecisionScenario` → `decision_scenarios` | alternativeId?, case {MELHOR, BASE, PIOR}, description, likelihood, assumptionIdsJson, expectedResult, projectScenarioId? | |
| `DecisionForecast` → `decision_forecasts` | alternativeId?, statement (binário e verificável), **probabilityPct** (5–95, passo 5), resolveBy, forecasterUserId, resolution {PENDENTE, OCORREU, NAO_OCORREU, ANULADA}, resolvedAt?, resolvedByUserId? | base da calibração (§6.9) |
| `DecisionRecommendation` → `decision_recommendations` | alternativeId?, source {MODELO, IA}, reasoningMd, supportingJson, contradictingJson, criticalAssumptionIdsJson, limitationsMd, whatWouldChangeMd, modelVersion, aiInferenceId?, status {SUGERIDA, ACEITA, DESCARTADA}, createdAt | nunca "escolha B" sem os 4 porquês (§7) |
| `DecisionTrigger` → `decision_triggers` | conditionText ("o que mudaria esta decisão"), metricKey?, comparator?, threshold?, status {ATIVO, DISPARADO, ARQUIVADO}, firedAt? | |
| `DecisionSnapshot` → `decision_snapshots` (append-only) | kind {DECISAO, REABERTURA, CHECKPOINT}, versionNumber, takenAt, takenByUserId, contentJson (MEDIUMTEXT), **contentSha256**, rationale, confidencePct?, selectedAlternativeLabel, modelVersion | FK da decisão **RESTRICT**: não se apaga decisão com histórico |
| `DecisionCheckpoint` → `decision_checkpoints` | dueAt, kind {PROGRAMADO, GATILHO}, status {AGENDADO, CONCLUIDO, PERDIDO, CANCELADO}, completedAt?, completedByUserId?, stillValid?, assumptionsChanged?, newEvidence?, confidencePctAfter?, action {MANTER, AJUSTAR, REABRIR}?, note? | |
| `DecisionOutcome` → `decision_outcomes` | result {SUCESSO, PARCIAL, FALHOU, CANCELADA, SUBSTITUIDA}, observedAt, summary, metricsJson?, recordedByUserId | único por decisão |
| `DecisionRetrospective` → `decision_retrospectives` | outcomeId?, whatHappened, whatExpected, whatWasRight, whatWasWrong, failedAssumptionIdsJson, **processQuality** {ADEQUADA, PARCIAL, INADEQUADA}, lessonsMd, shareAsLesson, reviewedByUserId, reviewedAt | `DecisionReview` já existe (validação RF29) → nome distinto |
| `DecisionWorkLink` → `decision_work_links` | targetType {TAREFA, PROJETO, MARCO}, targetId, createdByUserId, createdAt | decisão → trabalho sem copiar dados |
| `DecisionEvent` → `decision_events` (append-only) | actorUserId? (nulo = IA/sistema), type `DecisionEventType`, payloadJson (diff), at, correlationId | trilha de auditoria + linha do tempo do card + analytics |

`origin` = `ContentOrigin` {HUMANO, IA, IMPORTADA} em toda entidade que a IA pode propor.

Valores dos enums que a tabela acima não lista:
`DecisionKind` {ESTRATEGICA, TATICA, OPERACIONAL, TECNICA, FINANCEIRA, PRODUTO, PESSOAS, CONTRATACAO, RISCO} ·
`EvidenceKind` {DOCUMENTO, METRICA, CONJUNTO_DADOS, PESQUISA, FEEDBACK_USUARIO, BENCHMARK, TESTE_TECNICO,
OPINIAO_ESPECIALISTA, FONTE_EXTERNA, NORMA} · `SourceQuality` {PRIMARIA, SECUNDARIA, INTERNA, ESPECIALISTA, NAO_VERIFICADA}
(classificação de apoio, nunca verdade absoluta) · `RelevanceLevel` {BAIXA, MEDIA, ALTA} · `Likelihood` {RARA, POSSIVEL,
PROVAVEL, QUASE_CERTA}.

### 4.3 Ciclo de vida — `DecisionLifecycle`

```
RASCUNHO → ENQUADRAMENTO → PESQUISA → COMPARACAO → AGUARDANDO_DECISAO → DECIDIDA → EM_EXECUCAO → RESOLVIDA → REVISADA → ARQUIVADA
                                                         ↑                         │ (REABERTA volta para COMPARACAO)
```

| De | Para |
|---|---|
| RASCUNHO | ENQUADRAMENTO, ARQUIVADA |
| ENQUADRAMENTO | PESQUISA, COMPARACAO, ARQUIVADA |
| PESQUISA | COMPARACAO, ENQUADRAMENTO, ARQUIVADA |
| COMPARACAO | AGUARDANDO_DECISAO, PESQUISA, ARQUIVADA |
| AGUARDANDO_DECISAO | DECIDIDA, COMPARACAO |
| DECIDIDA | EM_EXECUCAO, REABERTA, RESOLVIDA |
| EM_EXECUCAO | RESOLVIDA, REABERTA |
| RESOLVIDA | REVISADA, REABERTA |
| REVISADA | ARQUIVADA, REABERTA |
| REABERTA | COMPARACAO |
| ARQUIVADA | — (final) |

- **Decisão rápida** pode ir RASCUNHO → AGUARDANDO_DECISAO? Não: sobe ENQUADRAMENTO → COMPARACAO → AGUARDANDO_DECISAO numa
  única ação de UI (as transições continuam explícitas na trilha).
- **DECIDIDA** exige o guarda pré-decisão (§6.10) e grava o snapshot `DECISAO`.
- **REABERTA** grava snapshot `REABERTURA` (o anterior permanece) e volta a COMPARACAO.
- Quando a governança exige revisor (sessão RF29), o `FinalDecision` passa por EM_REVISAO → VALIDADA/DEVOLVIDA; DEVOLVIDA
  devolve a decisão para COMPARACAO.

### 4.4 Complexidade e divulgação progressiva

| Complexidade | Campos exigidos | Recursos que aparecem |
|---|---|---|
| **RAPIDA** | pergunta, ≥ 2 alternativas (ou 1 + "não agir"), critério-chave (texto), escolha, motivo | — |
| **PADRAO** | + contexto/objetivo, ≥ 2 critérios, avaliações, ≥ 1 evidência | matriz, trade-offs, riscos, premissas |
| **PROFUNDA** | + pesos, evidência por critério crítico, premissas críticas tratadas, ≥ 1 risco por alternativa líder, previsão | cenários, sensibilidade, pré-mortem, red team, checkpoints |

Sugestão automática (o usuário sempre pode trocar) — **DESIGN PROPOSAL**: `impact ∈ {ALTO, CRITICO}` ou ≥ 5 participantes →
PROFUNDA; `impact = MEDIO` ou ≥ 3 alternativas → PADRAO; resto → RAPIDA.

## 5. Indicadores separados (nunca um número mágico)

| Indicador | Pergunta que responde | Origem | Exibição |
|---|---|---|---|
| **Confiança humana** | "Quão provável você acha que dará certo?" | digitada pelo responsável (0–100, passo 5) | BAIXA/MÉDIA/ALTA + "70 %" só no detalhe |
| **Força da evidência** | "Quanto o registro sustenta a escolha?" | calculada (§6.5) | FRACA/MODERADA/FORTE |
| **Pontuação do modelo** | "Como a matriz ordena as alternativas?" | calculada (§6.1) | 1,0–5,0 com 1 casa + contribuição por critério |
| **Prontidão** | "Dá para decidir agora?" | regras (§6.7) | NÃO PRONTA / PRECISA DE EVIDÊNCIA / PRONTA PARA REVISÃO / PRONTA PARA DECIDIR + checklist |
| **Saúde** | "Onde o registro está fraco?" | componentes (§6.8) | 5 componentes, cada um OK/ATENÇÃO/FALTA — sem total |
| **Risco** | "O que pode dar errado e quão grave?" | matriz probabilidade × impacto (§6.6) | BAIXO/MÉDIO/ALTO/CRÍTICO |
| **Impacto / Urgência** | "Quanto importa / quão cedo?" | declarados | BAIXO/MÉDIO/ALTO/CRÍTICO |
| **Frescor** | "A decisão ainda vale?" | regras (§6.11) | FRESCA / REVISÃO DEVIDA / VENCIDA |

Contraste destacado (G10): **confiança ALTA + evidência FRACA** gera o alerta "confiança acima do que o registro sustenta".

## 6. Regras de cálculo (contrato — Java e TypeScript seguem os mesmos vetores de `contracts/decia/vetores.json`)

### 6.1 Pontuação ponderada

- Escala de avaliação: inteiro **1–5**, sempre **desejabilidade** (5 = melhor para a decisão). O critério "Custo" recebe 5
  para a alternativa **mais barata**. `direction` é só dica de interface.
- Nota de consenso de (alternativa, critério) = **mediana** das avaliações (com número par, média dos dois centrais).
- Pesos: com `weightingEnabled = false`, todos os critérios valem igual. Com `true`, `weightPct` de todos os critérios é
  obrigatório, cada um em [0, 100], e a soma deve ser **100 ± 0,01**; senão a matriz fica **inválida** (sem ranking) e a
  UI mostra "os pesos somam X %".
- `score(alt) = Σ_c nota(alt, c) × w_c / Σ_c w_c`, resultado em [1, 5], arredondado a **2 casas** no cálculo e exibido
  com **1 casa**. A contribuição de cada critério (`nota × w_c / Σw`) é sempre exibida (explicabilidade).
- Alternativas `DESCARTADA` ficam fora do ranking. Célula sem avaliação → a alternativa fica **incompleta** e não entra no
  ranking (nunca imputar zero).
- Empate: diferença < 0,05 → "empate técnico" (sem líder).

### 6.2 Divergência entre avaliadores

- Para cada (alternativa, critério) com ≥ 2 avaliadores: `amplitude = max − min`.
- `amplitude ≥ 3` → **divergência alta**; `= 2` → moderada; `≤ 1` → baixa. (**DESIGN PROPOSAL** para os limiares.)
- Com `independentScoring = true`, a mediana e as notas dos outros só aparecem para quem já enviou as próprias
  (`assessmentsSubmittedAt`) ou depois que o condutor "revela" a rodada (G5).

### 6.3 Dominância (Pareto)

- A **domina** B se `nota(A, c) ≥ nota(B, c)` em todos os critérios e `>` em pelo menos um (usando notas de consenso).
- A explicação lista os critérios em que A é estritamente melhor e confirma "nenhum critério em que B é melhor".
- Alternativa dominada não é removida: recebe a etiqueta "dominada por A" e continua inspecionável.

### 6.4 Sensibilidade dos pesos

- Só com `weightingEnabled`. Para cada critério `c` e cada alternativa desafiante `X ≠ líder`, procura o **menor** novo
  peso `w'_c` em [0, 100] (passo de 1 pp) tal que X passe a liderar, redistribuindo os demais pesos **proporcionalmente**
  para manter a soma 100.
- Saída: lista ordenada pela menor mudança `|w'_c − w_c|`. Ex.: "Se Custo for de 20 % para 35 %, A passa a liderar".
- Mudança ≤ 10 pp → **recomendação sensível** (alerta); nenhuma inversão possível → **robusta**.

### 6.5 Força da evidência (da alternativa selecionada ou da líder)

Peso de confiabilidade: ALTA = 3, MEDIA = 2, BAIXA = 1. Evidência `supersededAt` não conta.
- `apoio` = Σ peso das evidências com `SUSTENTA` ligadas à alternativa (ou a uma avaliação dela).
- `contra` = Σ peso das com `CONTRADIZ`.
- `OPINIAO` vale metade do peso.
- **FORTE**: apoio ≥ 6 **e** ≥ 2 evidências independentes (fontes distintas) **e** contra < apoio / 2.
- **MODERADA**: apoio ≥ 3 e contra < apoio.
- **FRACA**: resto. Sem nenhuma evidência → FRACA com motivo "sem evidência".
(Limiares: **DESIGN PROPOSAL**; a separação entre confiança e evidência é [REF-TOULMIN].)

### 6.6 Severidade de risco

| Probabilidade \ Impacto | BAIXO | MEDIO | ALTO | CRITICO |
|---|---|---|---|---|
| RARA | BAIXO | BAIXO | MEDIO | ALTO |
| POSSIVEL | BAIXO | MEDIO | ALTO | ALTO |
| PROVAVEL | MEDIO | ALTO | ALTO | CRITICO |
| QUASE_CERTA | MEDIO | ALTO | CRITICO | CRITICO |

- **Risco da decisão** = maior severidade entre riscos `ABERTO` da alternativa selecionada (ou líder) e riscos sem
  alternativa; premissa `INVALIDADA` com importância CRITICA eleva para no mínimo ALTO. Sem riscos → "não avaliado"
  (nunca BAIXO por omissão).
- Matriz probabilidade × impacto: citada pelo board **[BOARD RF43]** ("matriz de risco"); os valores das células são
  **DESIGN PROPOSAL**.

### 6.7 Prontidão

Checklist (cada item: OK, ALERTA ou FALTA):

| Item | RAPIDA | PADRAO | PROFUNDA |
|---|---|---|---|
| pergunta definida (≥ 15 caracteres e termina com "?") | exige | exige | exige |
| responsável definido | exige | exige | exige |
| ≥ 2 alternativas ativas (inclui "não agir") | exige | exige | exige |
| critérios definidos | 1 (texto) | ≥ 2 | ≥ 2 + pesos válidos |
| matriz completa | — | exige | exige |
| evidência crítica (força ≥ MODERADA na líder) | — | alerta | exige |
| premissas críticas não `INVALIDADA` e tratadas | — | alerta | exige |
| riscos avaliados para a líder | — | alerta | exige |

Resultado: qualquer FALTA nos 3 primeiros → **NÃO PRONTA**; FALTA de evidência → **PRECISA DE EVIDÊNCIA**; só ALERTAs →
**PRONTA PARA REVISÃO**; tudo OK → **PRONTA PARA DECIDIR**.

### 6.8 Saúde (componentes, sem total)

`evidenceCoverage` (critérios com ≥ 1 evidência / critérios), `assumptionValidation` (críticas validadas / críticas),
`alternativeCoverage` (≥ 2 ativas e "não agir" considerado), `stakeholderAlignment` (sem divergência alta aberta),
`freshness` (§6.11). Cada um: OK (≥ 0,8 ou verdadeiro), ATENÇÃO (≥ 0,5), FALTA. **Não existe "nota geral"** (não é OVR).

### 6.9 Confiança, previsões e calibração

- `confidencePct` aceita 0–100 em passos de 5. Faixa: BAIXA < 40 ≤ MÉDIA < 70 ≤ ALTA.
- Previsões: `probabilityPct` em 5–95 (passo 5), enunciado binário e verificável, data de resolução.
- **Brier** = média de `(p − o)²` (p em [0,1], o ∈ {0,1}) **só** para previsões `OCORREU`/`NAO_OCORREU`. Nunca é "nota do
  usuário"; aparece só em "Calibração das minhas previsões" com n ≥ 10. Buckets de calibração: 5–15, 20–35, 40–60,
  65–80, 85–95 (frequência observada vs. média declarada). **PRODUCT HYPOTHESIS** — Brier/calibração não constam da
  bibliografia fornecida; ver `02_MATRIZ_BIBLIOGRAFICA.md` §4.

### 6.10 Guarda pré-decisão (prevenção de erro sem burocracia)

Bloqueia (`DECISAO_INCOMPLETA`): sem alternativa selecionada; sem responsável; motivo vazio (< 10 caracteres); alternativa
selecionada `DESCARTADA`. Avisa (exige confirmação explícita, fica na trilha): prontidão ≠ PRONTA PARA DECIDIR em
PADRAO/PROFUNDA; risco CRÍTICO aberto; divergência alta aberta; premissa crítica `NAO_VALIDADA`; confiança ALTA com
evidência FRACA. RAPIDA nunca recebe avisos de evidência.

### 6.11 Frescor

- `VENCIDA`: checkpoint `PERDIDO`, ou gatilho `DISPARADO` sem tratamento, ou premissa crítica `INVALIDADA` depois da decisão.
- `REVISAO_DEVIDA`: checkpoint vence em ≤ 7 dias, ou evidência nova ligada depois do snapshot, ou `reviewEveryDays` excedido.
- `FRESCA`: resto. Só se aplica a DECIDIDA/EM_EXECUCAO/RESOLVIDA.

### 6.12 Snapshot

- Conteúdo canônico: alternativas, critérios + pesos, avaliações, notas de consenso, ranking, evidências (com
  `retrievedAt`), links, premissas, riscos, previsões, recomendação vigente, prontidão, responsável, participantes,
  motivo, confiança, versão do modelo (`decia-scoring-v1`).
- JSON canônico (chaves ordenadas, sem espaços) → `contentSha256`. Re-hash diferente = adulteração (teste-guarda).
- Snapshot nunca é atualizado (append-only); a tela "No momento da decisão" lê só dele.

## 7. IA no DECIA — crítica, não eco

A IA pode: organizar informação, apontar lacunas, resumir evidências, sugerir critérios e alternativas (inclusive "não
agir"), detectar inconsistências, simular cenários e **desafiar** a escolha atual. Modos de desafio ("Desafiar a
decisão"): *Desafie meu raciocínio* · *Encontre alternativas que faltam* · *Encontre premissas sem suporte* · *Busque
evidência contrária* · *Explique os trade-offs*. Base: [REF-JANIS] advogado do diabo; [REF-SUNSTEIN]; [REF-TESSLER]
mediação por LLM; [REF-AMERSHI] G8/G9 (dispensar e corrigir com facilidade).

Toda recomendação (`DecisionRecommendation`) responde obrigatoriamente: **O que sustenta? O que contradiz? Que premissas
importam? O que mudaria a resposta?** + limitações. Recomendação sem `supportingJson` **e** `contradictingJson` é rejeitada
pelo domínio. A recomendação `source = MODELO` é a líder da matriz (§6.1), determinística; `source = IA` é sugestão com ✦.

A IA facilitadora fala de estrutura ("Há forte divergência no critério Segurança", "B depende de três premissas não
validadas"), não de escolha. Explicações nunca são apresentadas como prova causal de como o modelo decidiu
([REF-DOSHIVELEZ]).

Modos de IA existentes (ECONOMIA/AVANCADO, RF43.CA06) e a regra de sigilo (`AccessClassification.allowsExternalAi()`)
valem também aqui.

## 8. Permissões e governança

- Visibilidade da decisão = `Visibility` (PRIVADA por padrão) + `AccessClassification`.
- Ver: participantes + escopo da visibilidade. Editar estrutura: CONDUTOR, APROVADOR e o responsável. Avaliar:
  CONTRIBUIDOR+. Decidir (DECIDIDA) e reabrir: **só o responsável** (ou APROVADOR por delegação explícita, registrada).
  INFORMADO só lê.
- Toda escrita gera `DecisionEvent` (quem, o quê, quando, diff); decisões com `impact ≥ ALTO` também vão ao `audit_log`.
- Texto humano nunca é sobrescrito pela IA: a sugestão chega como proposta com diff e precisa de aceite.
- BOLA/BFLA dos endpoints seguem o Bloco 4/5 de segurança (pendente): **nenhuma API de decisão é exposta antes dele**.

## 9. Analytics (eventos) e métricas de produto

Eventos (`lib/decia/analytics.ts` / `DecisionEventType`): `decision_created`, `evidence_added`, `alternative_added`,
`criterion_changed`, `decision_compared`, `decision_challenged`, `decision_finalized`, `decision_reopened`,
`checkpoint_completed`, `outcome_recorded`, `review_completed`, `card_flipped`, `ai_suggestion_accepted`,
`ai_suggestion_dismissed`.

Métricas (sempre com contexto, nunca "tempo no app"): `decisionCompletionRate`, `timeToDecision` (por complexidade),
`evidenceCoverage`, `reviewCompletionRate`, `checkpointCompliance`, `outcomeCaptureRate`. **Sem XP por quantidade** (G9).

## 10. Conflitos com o board (para o dono decidir — Q-152…)

| Q | Conflito | Proposta |
|---|---|---|
| Q-152 | RF42/HU42 premiam "argumentos com evidência" com DECIA Points; G9 proíbe pontuar quantidade | pontuar só eventos de **qualidade verificada** (evidência ligada que sustentou/contradisse a decisão final, revisão concluída), com teto por decisão |
| Q-153 | `DeliberativeProfile` (clareza, consistência…) e Hype Score (RF45) medem pessoas; G12 pede comportamento observado | rotular como "padrões observados nas suas decisões", nunca exibir para terceiros sem opt-in; nada de diagnóstico |
| Q-154 | O board não tem RF específico para premissas, previsões, checkpoints, resultado e revisão pós-decisão | tratados como extensão de **RF29 (Rastro de Decisão)** e do objetivo 1 do board; o dono confirma ou cria cartões |
| Q-155 | Status da sessão (`SessionStatus`) × ciclo da decisão (`DecisionLifecycle`) | sessão = espaço de deliberação; decisão = registro; uma sessão pode gerar N decisões |
| Q-156 | Referências de calibração (Brier/Tetlock), pré-mortem (G. Klein), MCDA (Keeney/Saaty) e heurísticas (Nielsen) não estão na bibliografia | incluir na `BIBLIOGRAFIA.md` após verificação humana; até lá, essas regras ficam como PRODUCT HYPOTHESIS |
