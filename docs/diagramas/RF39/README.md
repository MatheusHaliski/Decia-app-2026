# RF39 — Criar chancelas (EMPRESA / CHEFE DE DEPARTAMENTO) e concedê-las a tarefas, projetos e planos por vínculo sugerido pela IA, por política de critérios ou por premiação; habilitar benefícios resgatáveis
**HU:** HU39 · **Sprint (board Work Station):** Product Backlog (não comprometido na Sprint 4) · **Equivalente FAI:** RF20/RF21 Vínculo com marca/celebridade (SealBond Matcher, revisão opcional, tiers) + RF25 Selos/promoções + RF38 Cupons · **Aba/rota:** Minhas Chancelas (`/seals`, sub-aba Recusadas), fila de revisão (`/seals/review`, CHEFE/CURADOR), Criador de Chancela na página da empresa/departamento (`/companies/[slug]/manage`, `/departments/[slug]`), Benefícios (`/benefits`), curadoria de Excelência (`/curation`)
**Critérios de aceite cobertos:** RF39.CA01 · CA02 · CA03 · CA04 · CA05 · CA06 · CA07 · CA08 · CA09 · CA10 · CA11 · CA12 (corpo do card, inalterado) — regra: o **título do card** define o RF e o corpo traz os próprios CAs. Detalhe no card "WORK AI — Chancelas"; a moeda é DECIA Points (RF42).

Entidades: `Seal` (emissor EMPRESA|CHEFE, `tier` TAREFA|PROJETO|PLANO, `artJson` do lacre, `excellence`, ciclo `availableFrom/Until`, `usageLimit/usageCount`, `autoIssued`), `SealPolicy` (`mode` AUTO|REVISAO, `criteriaJson` com `SealCriterion` CONFORMIDADE_MIN · RASTRO_COMPLETO · PRAZO_CUMPRIDO · REACOES_MIN · REUTILIZACOES_MIN · DECISAO_VALIDADA · SEM_PENDENCIA, `recertifyEveryDays`), `SealBond` (item × emissor, único; `basis` MODELO_MATCH · DEPARTAMENTO_MATCH · PLANO_MATCH · DECISAO_MATCH · POLITICA · INDICACAO · PREMIACAO; `status` `SealBondStatus` SUGERIDA → ACEITA/EDITADA/RECUSADA → EM_REVISAO → APROVADA/APROVADA_PRIVADA/REJEITADA → REVOGADA/EXPIRADA; `authorConsent`; `aiInferenceId`), `SealProposal`, `Benefit` (`BenefitType`), `BenefitRedemption` (idempotente, QR, `ledgerEntryId`). Guards D-14: `requireIssuerOrCurator` (criar/editar/revisar), `requireOwner` (aceitar/editar/recusar/consentir), EMPREGADO → 403 no criador. Os critérios são **calculados pelo sistema** (`MetricCalculator`); a IA (`SUGERIR_CHANCELA`, `AVALIAR_POLITICA`) só sugere/justifica. Tudo em `AuditLog` com `correlationId`.

## 0. Diagrama de casos de uso

Casos de uso derivados dos CAs. Só o lacre nos itens chancelados existe hoje, como DEMO nos cards; criador, fila de revisão, políticas, curadoria e benefícios são planejados (`/seals`, `/seals/review`, `/benefits` e `/curation` são páginas-esqueleto).

```mermaid
flowchart LR
  classDef ator fill:#fde7d3,stroke:#b4531a,color:#1b1b1b
  classDef atorSis fill:#f1ecf9,stroke:#6a4bb3,color:#1b1b1b
  classDef uc fill:#ffffff,stroke:#3557a6,color:#1b1b1b
  classDef ucPlan fill:#ffffff,stroke:#8a8a8a,stroke-dasharray:4 3,color:#555555
  classDef ucDemo fill:#fff8e6,stroke:#b26a00,stroke-dasharray:2 2,color:#1b1b1b
  empresa["«ator» Empresa ou órgão"]:::ator
  chefe["«ator» Chefe de departamento"]:::ator
  dono["«ator» Dono do recurso"]:::ator
  curador["«ator» Curador"]:::ator
  empregado["«ator» Empregado"]:::ator
  visitante["«ator» Visitante"]:::ator
  autenticado["«ator» Pessoa autenticada"]:::ator
  subgraph SIS["Work Station — RF39 Chancelas e benefícios"]
    direction TB
    UC1(["UC1 Criar chancela com política de critérios"]):::ucPlan
    UC2(["UC2 Responder às chancelas sugeridas"]):::ucPlan
    UC3(["UC3 Avaliar a política e conceder a chancela"]):::ucPlan
    UC4(["UC4 Revisar a fila de chancelas"]):::ucPlan
    UC5(["UC5 Consentir em exibir o lacre e virar modelo oficial"]):::ucPlan
    UC6(["UC6 Conceder chancela de Excelência"]):::ucPlan
    UC7(["UC7 Indicar item de colega ou propor chancela"]):::ucPlan
    UC8(["UC8 Revogar ou recertificar chancela"]):::ucPlan
    UC9(["UC9 Publicar benefício da chancela"]):::ucPlan
    UC10(["UC10 Resgatar benefício"]):::ucPlan
    UC11(["UC11 Ver o lacre nos itens chancelados"]):::ucDemo
  end
  ia["«ator» IA (AiGateway)"]:::atorSis
  agendador["«ator» Agendador de trabalhos"]:::atorSis
  empresa --- UC1
  empresa --- UC4
  empresa --- UC8
  empresa --- UC9
  chefe --- UC1
  chefe --- UC4
  chefe --- UC6
  chefe --- UC8
  chefe --- UC9
  dono --- UC2
  dono --- UC5
  dono --- UC10
  curador --- UC4
  curador --- UC6
  empregado --- UC7
  visitante --- UC11
  autenticado --- UC11
  UC5 -. "«extend»" .-> UC4
  UC2 --- ia
  UC3 --- ia
  UC8 --- agendador
```

| Caso de uso | Ator(es) | CAs | Situação |
|---|---|---|---|
| UC1 Criar chancela com política de critérios | `empresa`, `chefe` | RF39.CA01, RF39.CA02 | planejado (EMPREGADO recebe 403) |
| UC2 Responder às chancelas sugeridas | `dono`, `ia` | RF39.CA03, RF39.CA12 | planejado (aceitar, editar ou recusar) |
| UC3 Avaliar a política e conceder a chancela | `ia` | RF39.CA04 | planejado (critérios calculados pelo sistema; a IA só justifica) |
| UC4 Revisar a fila de chancelas | `empresa`, `chefe`, `curador` | RF39.CA04, RF39.CA07, RF39.CA12 | planejado (curador com escopo FILA_REVISAO) |
| UC5 Consentir em exibir o lacre e virar modelo oficial | `dono` | RF39.CA07, RF39.CA11 | planejado |
| UC6 Conceder chancela de Excelência | `curador`, `chefe` | RF39.CA05 | planejado (a partir dos Destaques do RF35) |
| UC7 Indicar item de colega ou propor chancela | `empregado` | RF39.CA06, RF39.CA12 | planejado |
| UC8 Revogar ou recertificar chancela | `empresa`, `chefe`, `agendador` | RF39.CA08 | planejado |
| UC9 Publicar benefício da chancela | `empresa`, `chefe` | RF39.CA09 | planejado |
| UC10 Resgatar benefício | `dono` | RF39.CA10 | planejado (idempotente; 409 sem chancela válida) |
| UC11 Ver o lacre nos itens chancelados | `visitante`, `autenticado` | RF39.CA11 | DEMO no front, sem API (`Seal` em `TaskSchemeCard` e `ProjectCard`) |

## 1. Diagrama de classes

```mermaid
classDiagram
direction LR

namespace ws_domain_seals {
  class Seal {
    <<entity>>
    +id: UUID
    +issuerUserId: UUID
    +issuerKind: String
    +companyId: UUID
    +departmentId: UUID
    +name: String
    +tier: SealTier
    +status: SealStatus
    +artJson: JSON
    +excellence: boolean
    +availableFrom: LocalDate
    +availableUntil: LocalDate
    +usageLimit: int
    +usageCount: int
    +autoIssued: boolean
    +policyId: UUID
    +recertificationRequired: boolean
  }
  class SealPolicy {
    <<entity>>
    +id: UUID
    +sealId: UUID
    +mode: PolicyMode
    +criteriaJson: JSON
    +recertifyEveryDays: int
    +version: int
    +validFrom: LocalDate
  }
  class SealBond {
    <<entity>>
    +id: UUID
    +sealId: UUID
    +issuerUserId: UUID
    +targetType: String
    +targetId: UUID
    +targetOwnerId: UUID
    +requestedBy: UUID
    +basis: SealBondBasis
    +origin: SealBondOrigin
    +confidence: BigDecimal
    +justification: String
    +criteriaReportJson: JSON
    +status: SealBondStatus
    +requiresReview: boolean
    +authorConsent: Boolean
    +aiInferenceId: UUID
    +reviewedBy: UUID
    +reviewNote: String
    +sealCode: String
    +issuedAt: Instant
    +expiresAt: Instant
    +revokeReason: String
    +lastRecertifiedAt: Instant
  }
  class SealProposal {
    <<entity>>
    +id: UUID
    +proposerId: UUID
    +departmentId: UUID
    +name: String
    +rationale: String
    +status: String
    +resultingSealId: UUID
  }
  class Benefit {
    <<entity>>
    +id: UUID
    +sealId: UUID
    +issuerUserId: UUID
    +type: BenefitType
    +title: String
    +rules: String
    +valueJson: JSON
    +startsAt: Instant
    +expiresAt: Instant
    +totalQuota: int
    +perUserLimit: int
    +redeemedCount: int
    +status: String
  }
  class BenefitRedemption {
    <<entity>>
    +id: UUID
    +benefitId: UUID
    +sealBondId: UUID
    +userId: UUID
    +code: String
    +status: String
    +redeemedAt: Instant
    +certificateMediaId: UUID
    +ledgerEntryId: UUID
    +idempotencyKey: String
  }
  class SealTier {
    <<enum>>
    TAREFA
    PROJETO
    PLANO
  }
  class SealBondBasis {
    <<enum>>
    MODELO_MATCH
    DEPARTAMENTO_MATCH
    PLANO_MATCH
    DECISAO_MATCH
    POLITICA
    INDICACAO
    PREMIACAO
  }
  class SealBondStatus {
    <<enum>>
    SUGERIDA
    ACEITA
    EDITADA
    RECUSADA
    EM_REVISAO
    APROVADA
    APROVADA_PRIVADA
    REJEITADA
    REVOGADA
    EXPIRADA
  }
  class SealCriterion {
    <<enum>>
    CONFORMIDADE_MIN
    RASTRO_COMPLETO
    PRAZO_CUMPRIDO
    REACOES_MIN
    REUTILIZACOES_MIN
    DECISAO_VALIDADA
    SEM_PENDENCIA
  }
  class BenefitType {
    <<enum>>
    CERTIFICADO
    CREDITOS_IA
    PONTOS_BONUS
    VITRINE_DIRETA
    PRIORIDADE_REVISAO
    CAPACITACAO
    MENCAO_RELATORIO
  }
}

namespace ws_domain_alvos_pontos {
  class TaskItem {
    <<entity>>
    +id: UUID
    +ownerId: UUID
    +state: TaskState
    +sealIdsJson: JSON
  }
  class ProjectScheme {
    <<entity>>
    +id: UUID
    +ownerId: UUID
    +sealIdsJson: JSON
    +conformityPercent: BigDecimal
  }
  class AnnualPlan {
    <<entity>>
    +id: UUID
    +sealIdsJson: JSON
  }
  class Highlight {
    <<entity>>
    +targetType: String
    +targetId: UUID
    +monthKey: String
  }
  class CuratorAppointment {
    <<entity>>
    +departmentId: UUID
    +curatorUserId: UUID
    +scope: CuratorScope
  }
  class DeciaPointsLedgerEntry {
    <<entity>>
    +eventCode: PointsEvent
    +idempotencyKey: String
  }
  class AiCreditLedgerEntry {
    <<entity>>
    +userId: UUID
    +delta: int
    +source: String
  }
  class AuditLog {
    <<entity>>
    +action: String
    +resourceId: String
    +correlationId: String
  }
}

namespace ws_application {
  class SealService {
    <<service>>
    +create(actor, SealForm) Seal
    +update(actor, sealId, SealForm) Seal
    +propose(actor, SealProposalForm) SealProposal
  }
  class SealBondService {
    <<service>>
    +suggest(targetType, targetId) List~SealBond~
    +respond(actor, bondId, ACEITA|EDITADA|RECUSADA, edits) SealBond
    +indicate(actor, targetType, targetId, sealId) SealBond
    +review(actor, bondId, APROVAR|REJEITAR, note) SealBond
    +consent(actor, bondId, boolean) SealBond
    +awardExcellence(actor, sealId, targetId) SealBond
    +revoke(actor, bondId, reason) SealBond
  }
  class SealPolicyEvaluator {
    <<service>>
    +onRelevantEvent(event) void
    +evaluate(policy, target) CriteriaReport
    +recertify(bond) SealBond
  }
  class BenefitService {
    <<service>>
    +publish(actor, sealId, BenefitForm) Benefit
    +redeem(actor, benefitId) BenefitRedemption
  }
  class MetricCalculator {
    <<service>>
    +conformity(target) BigDecimal
    +traceComplete(target) boolean
    +reactions(target, types) int
    +reuses(target) int
  }
  class SealStateMachine {
    <<service>>
    +transition(bond, to, actor)
  }
  class AiEngine {
    <<service>>
    +run(SUGERIR_CHANCELA | AVALIAR_POLITICA) AiResponse
  }
  class Guard {
    <<service>>
    +requireIssuerOrCurator(actor, deptId)
    +requireOwner(actor, ownerId)
    +requireRole(actor, role)
  }
  class DeciaPointsService {
    <<service>>
    +award(userId, BENEFICIO_BONUS, refId)
  }
  class AuditLogPort {
    <<port>>
    +record(AuditEvent)
  }
  class DomainEvents {
    <<service>>
    +publish(event)
  }
}

namespace ws_web {
  class SealController {
    <<controller>>
    +POST_api_seals(form)
    +PATCH_api_seals_id(form)
    +POST_api_seal_proposals(form)
    +GET_api_me_seal_bonds(status)
    +POST_api_seal_bonds_id_respond(action, edits)
    +POST_api_seal_bonds_indicate(target, sealId)
    +POST_api_seal_bonds_id_review(decision, note)
    +POST_api_seal_bonds_id_consent(value)
    +POST_api_seal_bonds_id_revoke(reason)
    +POST_api_seals_id_excellence(targetId)
  }
  class BenefitController {
    <<controller>>
    +POST_api_seals_id_benefits(form)
    +GET_api_benefits()
    +POST_api_benefits_id_redeem()
  }
}

Seal "1" --> "1" SealPolicy
Seal "1" o-- "0..*" SealBond
Seal "1" o-- "0..*" Benefit
Benefit "1" o-- "0..*" BenefitRedemption
BenefitRedemption "0..*" --> "1" SealBond : exige APROVADA vigente
SealBond ..> TaskItem : TASK
SealBond ..> ProjectScheme : PROJECT
SealBond ..> AnnualPlan : PLAN
SealProposal "0..1" --> "0..1" Seal : resultingSealId
Highlight ..> SealBond : PREMIACAO Excelencia
CuratorAppointment ..> SealBondService : opera em nome do emissor
BenefitRedemption "0..1" --> "0..1" DeciaPointsLedgerEntry : PONTOS_BONUS
BenefitRedemption "0..1" --> "0..1" AiCreditLedgerEntry : CREDITOS_IA
SealBond ..> AuditLog : toda transicao
SealController --> SealService
SealController --> SealBondService
BenefitController --> BenefitService
SealBondService --> SealStateMachine
SealBondService --> SealPolicyEvaluator
SealBondService --> AiEngine
SealBondService --> Guard
SealBondService --> AuditLogPort
SealBondService --> DomainEvents
SealPolicyEvaluator --> MetricCalculator
SealPolicyEvaluator --> AiEngine
SealService --> Guard
SealService --> AuditLogPort
BenefitService --> Guard
BenefitService --> DeciaPointsService
BenefitService --> AuditLogPort
DomainEvents ..> SealPolicyEvaluator : reacao conformidade decisao AFTER_COMMIT
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph ATOR["Ator (EMPRESA · CHEFE · CURADOR · EMPREGADO autor)"]
    A0([Emissor abre o Criador de Chancela]) --> A1["Nome, tier, arte do lacre, ciclo, limite, Excelência, política (critérios + AUTO/REVISAO)"]
    A2([Autor publica projeto/tarefa]) --> A3["Vê até 3 chancelas sugeridas ✦ com confiança e justificativa"]
    A3 --> A4{"Aceita, edita ou recusa?"}
    A5([Chefe/curador abre a fila]) --> A6{"Aprova ou rejeita com o relatório de critérios?"}
    A7([Autor consente exibir lacre e virar MODELO OFICIAL?])
    A8([Empregado indica item de colega ou propõe chancela nova])
    A9([Curadoria concede Excelência a partir dos Destaques])
    A10([Quem tem chancela aprovada resgata benefício])
    A11([Emissor publica benefício])
  end

  subgraph FE["Next.js / BFF (app/(shell)/seals · seals/review · benefits · curation · companies/[slug]/manage)"]
    F1["SealForm (catálogo + upload de arte, Due do ciclo, Switch Excelência, PolicyBuilder) · POST /api/seals"]
    F2["SealSuggestions (Seal preview, confiança) · POST /seal-bonds/{id}/respond"]
    F3["ReviewQueue (criteriaReportJson) · POST /review"]
    F4["ConsentDialog · POST /consent"]
    F5["POST /seal-bonds/indicate · POST /seal-proposals"]
    F6["Sub-aba Recusadas em /seals · Seal (lacre) nos cards · Vitrine/Balcão chancelado"]
    F7["BenefitForm · POST /seals/{id}/benefits · BenefitCard · POST /benefits/{id}/redeem (QR)"]
  end

  subgraph WEB["ws-web"]
    W1["JWT · CorrelationIdFilter"]
    W2["GlobalExceptionHandler"]
  end

  subgraph APP["ws-application"]
    P1{"Guard.requireIssuerOrCurator?"}
    P1 -->|EMPREGADO| E1["403 ACESSO_NEGADO"]
    P2{"availableFrom menor ou igual a availableUntil?"}
    P2 -->|não| E2["400 PERIODO_INVALIDO"]
    P3["Seal ATIVA + SealPolicy v1 · AuditLog SEAL_CREATED"]
    P4["AFTER_COMMIT ProjectPublished → SealBondService.suggest: base modelos chancelados usados, tarefas de membros do departamento, eixo do plano, decisão DECIA"]
    P5["Até 3 SealBond SUGERIDA (basis, confidence, justification, aiInferenceId)"]
    P6{"Guard.requireOwner(alvo)?"}
    P6 -->|não| E3["403 ACESSO_NEGADO"]
    P7{"Resposta"}
    P7 -->|ACEITA ou EDITADA| P8{"requiresReview ou policy REVISAO?"}
    P7 -->|RECUSADA| P9["RECUSADA → sub-aba Recusadas (aplicável depois)"]
    P8 -->|sim| P10["EM_REVISAO → fila do chefe/curador · Notification ao emissor"]
    P8 -->|não, AUTO e critérios ok| P11["APROVADA (autoIssued) · usageCount++"]
    P12["SealPolicyEvaluator.onRelevantEvent (nova reação, conformidade, decisão validada) → MetricCalculator → criteriaReportJson"]
    P12 --> P13{"Critérios atendidos?"}
    P13 -->|sim e AUTO| P11
    P13 -->|sim e REVISAO| P10
    P13 -->|não, vínculo vigente| P14["Recertificação falhou → EXPIRADA com motivo"]
    P15{"Único por (targetId, issuerUserId)?"}
    P15 -->|já existe| E4["409 CHANCELA_DUPLICADA"]
    P16{"Decisão da revisão"}
    P16 -->|APROVAR| P17{"authorConsent?"}
    P16 -->|REJEITAR com nota| P18["REJEITADA · Notification ao autor"]
    P17 -->|true| P19["APROVADA · lacre visível · item vira MODELO_PUBLICO oficial · Vitrine/Balcão chancelado · sealIdsJson"]
    P17 -->|false ou nulo| P20["APROVADA_PRIVADA (conta para métricas, não aparece)"]
    P21{"Excelência: dentro do ciclo e usageCount menor que usageLimit?"}
    P21 -->|não| E5["409 LIMITE_ESGOTADO"]
    P21 -->|sim| P22["SealBond PREMIACAO origin CURADORIA → APROVADA (Destaques RF35)"]
    P23["indicate: SealBond INDICACAO → EM_REVISAO (não emite) · propose: SealProposal PENDENTE"]
    P24{"Resgate: bond APROVADA e vigente, benefício DISPONIVEL, perUserLimit?"}
    P24 -->|bond inválida| E6["409 CHANCELA_INVALIDA"]
    P24 -->|quota esgotada| E7["409 LIMITE_ESGOTADO"]
    P24 -->|ok| P25["BenefitRedemption idempotente (idempotencyKey) em transação · entrega: certificado PDF+QR, AiCreditLedgerEntry, DP BENEFICIO_BONUS, Vitrine direta, prioridade na fila, vaga · AuditLog"]
    P26["Revogação com motivo → REVOGADA · fim do ciclo → EXPIRADA · AuditLog com correlationId"]
    P27["Notification CHANCELA_ESTADO ao autor em cada transição · INDICACAO ao emissor · i18n"]
  end

  subgraph IA["AiEngine (SUGERIR_CHANCELA · AVALIAR_POLITICA)"]
    I1["Sugere chancelas e justificativa a partir dos sinais do sistema"]
    I2["Redige relatório de critérios sobre números do MetricCalculator"]
    I3["AiInferenceLog"]
  end

  subgraph DB["Persistência"]
    D1[("MySQL seals · seal_policies · seal_bonds · seal_proposals · benefits · benefit_redemptions · decia_points_ledger · ai_credit_ledger · audit_log")]
    D2[("S3 arte do lacre · certificados PDF · flag storage.s3")]
    D3[("Cassandra notifications_by_user · flag cassandra.enabled")]
  end

  A1 --> F1 --> W1 --> P1 -->|ok| P2 -->|sim| P3 --> D1
  P3 --> D2
  A2 --> P4 --> I1 --> I3 --> P5 --> D1 --> F2 --> A3
  A4 --> F2 --> W1 --> P6 -->|sim| P15 -->|ok| P7
  P9 --> F6
  P10 --> D1
  P11 --> P17
  P12 --> I2 --> I3
  A5 --> F3 --> W1 --> P1 -->|ok| P16
  A7 --> F4 --> W1 --> P6 --> P17
  P19 --> D1
  P20 --> D1
  P18 --> D1
  A8 --> F5 --> W1 --> P23 --> D1
  A9 --> W1 --> P1 -->|ok| P21
  P22 --> D1
  A11 --> F7 --> W1 --> P1 -->|ok| D1
  A10 --> F7 --> W1 --> P24
  P25 --> D1
  P25 --> D2
  P14 --> D1
  P26 --> D1
  P19 --> P27 --> D3
  P18 --> P27
  P10 --> P27
  E1 --> W2
  E2 --> W2
  E3 --> W2
  E4 --> W2
  E5 --> W2
  E6 --> W2
  E7 --> W2
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
  participant R as Redis
  participant S3 as S3
  participant EV as DomainEvents (AFTER_COMMIT)

  Note over U,EV: CA01 + CA02 — criar chancela
  U->>FE: CHEFE cria Chancela Projeto Conforme (tier PROJETO, política REVISAO)
  FE->>C: POST /api/seals
  C->>S: SealService.create(actor, form)
  S->>S: Guard.requireIssuerOrCurator(actor, deptId)
  alt EMPREGADO
    S-->>C: 403 ACESSO_NEGADO
  else janela invertida
    S-->>C: 400 PERIODO_INVALIDO
  else ok
    S->>S3: put arte do lacre (catálogo ou upload reencodado)
    S->>DB: insert seals (ATIVA) + seal_policies (v1, criteriaJson, mode)
    S->>DB: audit_log SEAL_CREATED (correlationId)
    S-->>C: 201 Seal
  end

  Note over U,EV: CA03 — vínculo sugerido ao publicar
  EV->>S: ProjectPublished(projectId) → SealBondService.suggest(PROJECT, id)
  S->>DB: modelos chancelados usados, tarefas de membros do departamento, planAxisId, decisões DECIA do departamento
  S->>AI: run(SUGERIR_CHANCELA, sinais)
  AI-->>S: até 3 sugestões (sealId, basis, confidence, justification) ✦ + AiInferenceLog
  S->>DB: insert seal_bonds SUGERIDA (único targetId + issuerUserId)
  S->>EV: SealBondSuggested → Notification CHANCELA_ESTADO ao autor
  U->>FE: autor aceita a sugestão 1 e recusa a 2
  FE->>C: POST /api/seal-bonds/{id}/respond {ACEITA}
  C->>S: SealBondService.respond(actor, id, ACEITA)
  S->>S: Guard.requireOwner(actor, bond.targetOwnerId)
  alt policy REVISAO ou requiresReview
    S->>DB: update seal_bonds EM_REVISAO · audit_log
    S->>EV: Notification ao emissor (fila)
  else AUTO e critérios ok
    S->>DB: update seal_bonds APROVADA ou APROVADA_PRIVADA, autoIssued
  end
  S-->>C: 200
  FE->>C: POST /api/seal-bonds/{id2}/respond {RECUSADA}
  C->>S: SealBondService.respond(actor, id2, RECUSADA)
  S->>DB: update RECUSADA (sub-aba Recusadas)

  Note over U,EV: CA04 — política reavaliada a cada evento
  EV->>S: ReactionCreated BEM_FUNDAMENTADO → SealPolicyEvaluator.onRelevantEvent
  S->>S: MetricCalculator: conformidade, rastro completo, prazo, reações, reutilizações, decisão validada, pendências
  S->>AI: run(AVALIAR_POLITICA, relatório numérico)
  AI-->>S: criteriaReportJson redigido ✦
  alt todos atendidos e mode AUTO
    S->>DB: seal_bonds APROVADA (autoIssued) · seals.usage_count++ · audit_log
  else atendidos e mode REVISAO
    S->>DB: seal_bonds EM_REVISAO com relatório
  end

  Note over U,EV: CA07 + CA11 — revisão, consentimento e efeitos
  U->>FE: curador aprova na fila
  FE->>C: POST /api/seal-bonds/{id}/review {APROVAR}
  C->>S: SealBondService.review(actor, id, APROVAR, note)
  S->>S: Guard.requireIssuerOrCurator
  alt authorConsent = true
    S->>DB: APROVADA · sealCode · issuedAt · expiresAt · tasks/project_schemes.seal_ids_json · state MODELO_PUBLICO
    S->>EV: SealBondApproved → Vitrine/Balcão chancelado · Notification
  else sem consentimento
    S->>DB: APROVADA_PRIVADA (conta nas métricas, lacre oculto)
  end
  S-->>C: 200

  Note over U,EV: CA09 + CA10 — benefício e resgate
  U->>FE: resgata Créditos de IA extras
  FE->>C: POST /api/benefits/{id}/redeem
  C->>S: BenefitService.redeem(actor, benefitId)
  S->>DB: select seal_bonds APROVADA vigente do actor para o seal do benefício (lock)
  alt sem chancela aprovada e vigente
    S-->>C: 409 CHANCELA_INVALIDA
  else quota ou perUserLimit esgotado
    S-->>C: 409 LIMITE_ESGOTADO
  else ok (transação)
    S->>DB: insert benefit_redemptions (idempotencyKey, code QR) · benefits.redeemed_count++
    S->>DB: insert ai_credit_ledger (+créditos, source BENEFICIO) ou decia_points_ledger BENEFICIO_BONUS
    S->>R: incr cota/saldo (redis.enabled)
    S->>DB: audit_log BENEFIT_REDEEMED (correlationId)
    S->>EV: BenefitRedeemed → certificado PDF+QR (PipelineJob EXPORT_PDF) · Notification BENEFICIO
    S-->>C: 201 BenefitRedemption
  end
```

## 4. Máquina de estados

Entidade central: `SealBond.status` (`SealBondStatus`, `SealStateMachine` com tabela de transições testada).

```mermaid
stateDiagram-v2
  [*] --> SUGERIDA: IA sugere ao publicar (basis MODELO_MATCH · DEPARTAMENTO_MATCH · PLANO_MATCH · DECISAO_MATCH, CA03)
  [*] --> EM_REVISAO: indicação de colega (basis INDICACAO, CA06) · política REVISAO atendida (CA04)
  [*] --> APROVADA: política AUTO atendida → autoIssued (CA04) · premiação por curadoria dentro do ciclo e limite (basis PREMIACAO, CA05)
  SUGERIDA --> ACEITA: autor aceita (requireOwner)
  SUGERIDA --> EDITADA: autor troca tier ou itens
  SUGERIDA --> RECUSADA: autor recusa → sub-aba Recusadas (CA03)
  RECUSADA --> ACEITA: aplicação posterior pelo autor
  ACEITA --> EM_REVISAO: requiresReview ou política REVISAO
  EDITADA --> EM_REVISAO: requiresReview ou política REVISAO
  ACEITA --> APROVADA: política AUTO e critérios ok
  EDITADA --> APROVADA: política AUTO e critérios ok
  EM_REVISAO --> APROVADA: chefe ou curador aprova com authorConsent = true (CA07)
  EM_REVISAO --> APROVADA_PRIVADA: aprova sem consentimento do autor (conta para métricas, não aparece, CA07)
  EM_REVISAO --> REJEITADA: rejeita com nota (CA12 notifica)
  APROVADA_PRIVADA --> APROVADA: autor consente depois
  APROVADA --> REVOGADA: emissor revoga com motivo (CA08) · AuditLog
  APROVADA --> EXPIRADA: fim do ciclo ou recertificação falha (CA08)
  APROVADA_PRIVADA --> EXPIRADA: fim do ciclo
  APROVADA --> APROVADA: recertificação ok (lastRecertifiedAt) · habilita resgates (CA10)
  REJEITADA --> [*]
  REVOGADA --> [*]
  EXPIRADA --> [*]
  note right of APROVADA
    1 por (targetId, issuerUserId) — 409 CHANCELA_DUPLICADA.
    Lacre visível, item MODELO_PUBLICO oficial, Vitrine/Balcão chancelado (CA11).
  end note
  note left of EM_REVISAO
    Fila do chefe ou do CURADOR nomeado (RF28.CA03)
    com criteriaReportJson ✦.
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FRONT["Frontend Next.js 15"]
    R1["app/(shell)/seals (+ Recusadas) · seals/review · benefits · curation · companies/[slug]/manage · departments/[slug]"]
    R2["components: SealForm · PolicyBuilder · Seal (lacre dourado/azul-marinho, fita Excelência) · SealSuggestions · ReviewQueue · ConsentDialog · BenefitCard (QR) · TaskCard/ProjectCard variants CHANCELADA/CHANCELADO/EXCELENCIA · Spark ✦"]
    BFF["app/bff"]
    R1 --> R2 --> BFF
  end
  subgraph WEB["ws-web"]
    SC["SealController · BenefitController (@Operation RF39.CA01-CA12)"]
    SEC["SecurityConfig · CorrelationIdFilter · GlobalExceptionHandler (main)"]
  end
  subgraph APPL["ws-application"]
    SS["seals/SealService"]
    SBS["seals/SealBondService · SealStateMachine"]
    SPE["seals/SealPolicyEvaluator (listener AFTER_COMMIT + recertificação agendada)"]
    BS["seals/BenefitService (resgate transacional idempotente)"]
    MC["metrics/MetricCalculator (critérios calculados pelo sistema)"]
    DPS["points/DeciaPointsService (BENEFICIO_BONUS) · AiCreditLedger"]
    AIE["ai/AiEngine (SUGERIR_CHANCELA · AVALIAR_POLITICA)"]
    GD["security/Guard (main: requireRole, ownerOrAdmin · planejado: requireIssuerOrCurator, requireOwner)"]
    AUD["audit/AuditLogPort (main)"]
    DE["events/DomainEvents AFTER_COMMIT"]
    SCH["schedulers (ws-bootstrap): recertificação · expiração de ciclo"]
  end
  subgraph DOM["ws-domain"]
    ENT["Seal · SealPolicy · SealBond · SealProposal · Benefit · BenefitRedemption · enums SealTier/SealBondBasis/SealBondStatus/SealCriterion/BenefitType (planejado) · CuratorAppointment (RF28)"]
  end
  subgraph INFRA["ws-infrastructure"]
    MY["persistence-mysql seals · seal_policies · seal_bonds (único target+issuer) · benefits · benefit_redemptions (V__rf39)"]
    S3A["storage-s3 arte do lacre · certificados PDF (flag storage.s3)"]
    RD["cache-redis cota IA · saldo DP (flag redis.enabled)"]
    CASA["persistence-cassandra notifications (flag cassandra.enabled)"]
    AIP["ai-providers ai-claude · ai-gemini · ai-local"]
    PLAT["platform: PDF + QR"]
  end
  BFF --> SC --> SEC
  SC --> SS
  SC --> SBS
  SC --> BS
  SBS --> SPE --> MC
  SBS --> AIE
  SPE --> AIE
  SBS --> GD
  SS --> GD
  BS --> GD
  BS --> DPS
  SBS --> AUD
  SS --> AUD
  BS --> AUD
  DE --> SPE
  DE --> SBS
  SCH --> SPE
  SBS --> ENT --> MY --> MYSQL[("MySQL 8")]
  BS --> S3A --> S3[("S3 / MinIO")]
  BS --> PLAT
  DPS --> RD --> REDIS[("Redis")]
  DE --> CASA --> CASS[("Cassandra")]
  AIE --> AIP --> AI["Claude / Gemini / local"]
```

## 6. Rastreabilidade

| CA | Classe | Passo | Mensagem | Transição | Componente |
|---|---|---|---|---|---|
| RF39.CA01 | `Guard.requireIssuerOrCurator`, `SealService.create/update`, `CuratorAppointment` | A0 → F1 → P1 (403 ACESSO_NEGADO) | 1–5 | — | `SS`, `GD`, `R1 (criador oculto ao EMPREGADO)` |
| RF39.CA02 | `Seal` (name, tier, artJson, availableFrom/Until, usageLimit, excellence), `SealPolicy` (mode, criteriaJson com `SealCriterion`), 400 PERIODO_INVALIDO | A1 → F1 → P2 (400) → P3 | 6–11 | — | `SealForm`, `PolicyBuilder`, `S3A` |
| RF39.CA03 | `SealBondService.suggest/respond`, `SealBond.basis/confidence/justification/aiInferenceId`, `AiCapability SUGERIR_CHANCELA`, sub-aba Recusadas | A2 → P4 → I1 → P5 → A3 → A4 → P6 → P7 → P8/P9 | 12–30 | `[*] → SUGERIDA → ACEITA / EDITADA / RECUSADA` | `SBS`, `AIE`, `SealSuggestions` |
| RF39.CA04 | `SealPolicyEvaluator.onRelevantEvent/evaluate`, `MetricCalculator`, `criteriaReportJson`, `Seal.autoIssued`, `PolicyMode AUTO/REVISAO` | P12 → I2 → P13 → P10/P11 | 31–38 | `[*] → APROVADA (AUTO)` · `[*] → EM_REVISAO (REVISAO)` | `SPE`, `MC`, `DE` |
| RF39.CA05 | `SealBondService.awardExcellence`, `basis PREMIACAO`, `origin CURADORIA`, `Highlight` (RF35), `usageLimit/usageCount` → 409 LIMITE_ESGOTADO | A9 → P21 (409) → P22 | — (POST /seals/{id}/excellence) | `[*] → APROVADA (PREMIACAO)` | `R1 /curation`, `SBS` |
| RF39.CA06 | `SealBondService.indicate` (basis INDICACAO → EM_REVISAO), `SealService.propose`, `SealProposal` | A8 → F5 → P23 | — (POST /indicate, /seal-proposals) | `[*] → EM_REVISAO (INDICACAO)` | `SBS`, `SS` |
| RF39.CA07 | `SealBond.authorConsent`, `SealBondService.consent/review`, `APROVADA_PRIVADA` | A7 → F4 → P17 → P19/P20 | 39–48 | `EM_REVISAO → APROVADA / APROVADA_PRIVADA → APROVADA` | `ConsentDialog`, `ReviewQueue` |
| RF39.CA08 | único (targetId, issuerUserId) → 409 CHANCELA_DUPLICADA, `SealBondService.revoke`, `SealPolicyEvaluator.recertify`, `REVOGADA/EXPIRADA`, `AuditLog` com correlationId | P15 (409) · P14 · P26 | 10, 36 | `APROVADA → REVOGADA / EXPIRADA` + nota | `AUD`, `SCH`, `MY` |
| RF39.CA09 | `Benefit` (`BenefitType`, startsAt/expiresAt, totalQuota, perUserLimit), `BenefitService.publish` | A11 → F7 → P1 | — (POST /seals/{id}/benefits) | — | `BS`, `BenefitForm` |
| RF39.CA10 | `BenefitService.redeem` (transacional, `idempotencyKey`), `BenefitRedemption`, 409 CHANCELA_INVALIDA, `AiCreditLedgerEntry`, DP `BENEFICIO_BONUS` | A10 → F7 → P24 (409) → P25 | 49–61 | `APROVADA → self (habilita resgates)` | `BS`, `DPS`, `RD`, `PLAT (PDF+QR)` |
| RF39.CA11 | `TaskItem/ProjectScheme/AnnualPlan.sealIdsJson`, `TaskState MODELO_PUBLICO`, Vitrine/Balcão "chancelado" (RF27/RF40), métricas do emissor (RF28.CA06) | P19 → F6 | 43–45 | nota de APROVADA | `Seal (lacre)`, `R2 variants CHANCELADA/CHANCELADO` |
| RF39.CA12 | `Notification CHANCELA_ESTADO/INDICACAO`, i18n das mensagens | P27 | 18, 29, 46, 60 | toda transição | `CASA`, `DE` |
