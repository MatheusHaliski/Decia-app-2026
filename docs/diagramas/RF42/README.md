# RF42 — Acumular DECIA Points por participação de qualidade no chat DECIA e usá-los em compras dentro do app (Loja Work AI: modelos do Balcão, créditos de IA, capas/skins, impulsos, kits)
**HU:** HU42 · **Sprint (board Work Station):** Product Backlog (não comprometido na Sprint 4) · **Equivalente FAI:** RF30 FAI Points + RF41 FAI Points em jogos e criações (ledger idempotente, regras em banco, tetos, cupons) · **Aba/rota:** DECIA Points (`/points`: saldo, extrato, regras, gráfico mensal), Loja Work AI (`/store`), extrato por sessão no perfil deliberativo (`/profile?tab=decia-points`), fila de suspensos do chefe (`/moderation`), dashboard (`/admin/dashboard`, `/issuer/dashboard`)
**Critérios de aceite cobertos:** RF42.CA01 · CA02 · CA03 · CA04 · CA05 · CA06 · CA07 · CA08 · CA09 · CA10 (corpo do card, inalterado) — regra: o **título do card** define o RF e o corpo traz os próprios CAs. Proposta de nova redação e economia em `docs/produto/DECIA_POINTS.md` (não adotada aqui; os valores abaixo são os do card).

Os **DECIA Points** são a única moeda (sem dinheiro real, sem gateway, CA10). Ganha-se **só por participar bem no DECIA**: `PointsEvent` ARGUMENTO_EVIDENCIA (+5, teto 10 msgs/dia/sessão) · CONSENSO (+3) · DIVERGENCIA_RESOLVIDA (+8) · PERGUNTA_RESPONDIDA (+4) · ARTEFATO_USADO (+6 ao autor) · DECISAO_VALIDADA (+15 × multiplicador 0,5–2,0 do perfil deliberativo) · PRESENCA_ENCERRADA (+2) · REACAO_QUALIDADE (+2, teto 20/dia) · ATA_RATIFICADA/ENCAMINHAMENTO_CUMPRIDO (+3/+5) · BENEFICIO_BONUS · META_ATINGIDA; não pontuam ruído, auto-reação, sessão de teste (`User.testAccount`), repetidas (`similarityHash` > 90 %). Cada evento confirmado pela IA vira **1 `DeciaPointsLedgerEntry` idempotente** (`idempotencyKey` = tipo + id do evento + usuário, `correlationId`, `ruleVersionId`); regras em `DeciaPointsRule` versionada (ADMIN/EMPRESA, vigência; não altera o passado). Gasto: `StoreItem` (`StoreItemKind`) → `StorePurchase` transacional (409 SALDO_INSUFICIENTE / ITEM_INDISPONIVEL) com entrega (modelo copiado, `AiCreditLedgerEntry`, `UserSkin`, impulso `MuralEntry.boostUntil`); Balcão credita o autor no mesmo lançamento (RF40). Antifraude suspende (`LedgerStatus SUSPENSO`) para o chefe confirmar/estornar; expiração (`expiresAt`, aviso 30 dias) e doação com limite mensal (`PointsDonation`).

## 1. Diagrama de classes

```mermaid
classDiagram
direction LR

namespace ws_domain_points {
  class DeciaPointsLedgerEntry {
    <<entity>>
    +id: UUID
    +userId: UUID
    +delta: int
    +eventCode: PointsEvent
    +refType: String
    +refId: UUID
    +sessionId: UUID
    +ruleVersionId: UUID
    +qualityMultiplier: BigDecimal
    +idempotencyKey: String
    +status: LedgerStatus
    +suspendedReason: String
    +reviewedBy: UUID
    +counterpartyUserId: UUID
    +correlationId: String
    +expiresAt: Instant
    +createdAt: Instant
  }
  class DeciaPointsRule {
    <<entity>>
    +id: UUID
    +eventCode: PointsEvent
    +points: int
    +dailyCap: int
    +weeklyCap: int
    +perSessionCap: int
    +oncePerRef: boolean
    +multiplierSource: String
    +validFrom: Instant
    +validTo: Instant
    +active: boolean
    +editedBy: UUID
  }
  class StoreItem {
    <<entity>>
    +id: UUID
    +kind: StoreItemKind
    +refId: UUID
    +title: String
    +pricePoints: int
    +stock: int
    +availableFrom: Instant
    +availableUntil: Instant
    +companyId: UUID
    +active: boolean
  }
  class StorePurchase {
    <<entity>>
    +id: UUID
    +buyerId: UUID
    +storeItemId: UUID
    +pricePaid: int
    +ledgerEntryId: UUID
    +deliveryJson: JSON
    +status: PurchaseStatus
    +idempotencyKey: String
  }
  class AiCreditLedgerEntry {
    <<entity>>
    +id: UUID
    +userId: UUID
    +departmentId: UUID
    +delta: int
    +source: String
    +refId: UUID
    +expiresAt: Instant
  }
  class PointsDonation {
    <<entity>>
    +id: UUID
    +fromUserId: UUID
    +toUserId: UUID
    +points: int
    +message: String
    +ledgerDebitId: UUID
    +ledgerCreditId: UUID
    +monthKey: String
  }
  class PointsEvent {
    <<enum>>
    ARGUMENTO_EVIDENCIA
    CONSENSO
    DIVERGENCIA_RESOLVIDA
    PERGUNTA_RESPONDIDA
    ARTEFATO_USADO
    DECISAO_VALIDADA
    PRESENCA_ENCERRADA
    REACAO_QUALIDADE
    ATA_RATIFICADA
    ENCAMINHAMENTO_CUMPRIDO
    META_ATINGIDA
    BENEFICIO_BONUS
    COMPRA_LOJA
    VENDA_BALCAO
    DOACAO_ENVIADA
    DOACAO_RECEBIDA
    ESTORNO
    EXPIRACAO
  }
  class LedgerStatus {
    <<enum>>
    CONFIRMADO
    SUSPENSO
    ESTORNADO
  }
  class StoreItemKind {
    <<enum>>
    MODELO_BALCAO
    CREDITOS_IA
    SKIN_MESA
    MOLDURA_CARD
    CAPA_IA_LOTE
    IMPULSO_MURAL
    SESSAO_IA_AVANCADA
    KIT_CHANCELADO
    CERTIFICADO_PERSONALIZADO
  }
  class PurchaseStatus {
    <<enum>>
    CONCLUIDA
    FALHA
    ESTORNADA
  }
}

namespace ws_domain_fontes_destinos {
  class MessageClassification {
    <<entity>>
    +messageId: UUID
    +label: MessageClass
    +hasEvidence: boolean
    +confidence: BigDecimal
  }
  class SessionMessage {
    <<entity>>
    +similarityHash: String
    +authorId: UUID
  }
  class Divergence {
    <<entity>>
    +status: String
    +resolvedByReplyId: UUID
  }
  class FinalDecision {
    <<entity>>
    +status: DecisionStatus
  }
  class DeliberativeProfile {
    <<entity>>
    +clarity: BigDecimal
    +evidenceUse: BigDecimal
    +consistency: BigDecimal
  }
  class User {
    <<entity>>
    +id: UUID
    +testAccount: boolean
    +accountOrigin: AccountOrigin
  }
  class Company {
    <<entity>>
    +pointsPolicyJson: JSON
  }
  class UserSkin {
    <<entity>>
    +skinKey: String
    +acquiredVia: String
    +purchaseId: UUID
  }
  class MuralEntry {
    <<entity>>
    +kind: MuralKind
    +boostUntil: Instant
  }
  class AiQuota {
    <<entity>>
    +purchasedCredits: int
  }
}

namespace ws_application {
  class DeciaPointsService {
    <<service>>
    +award(userId, eventCode, refType, refId, sessionId) DeciaPointsLedgerEntry
    +transfer(buyerId, sellerId, points, refId, key) LedgerPair
    +balance(userId) int
    +statement(userId, page) Page~LedgerView~
    +donate(actor, toUserId, points, message) PointsDonation
    +expire() void
  }
  class PointsRuleEngine {
    <<service>>
    +resolve(eventCode, at) DeciaPointsRule
    +applyCaps(userId, rule, sessionId) boolean
    +multiplier(userId) BigDecimal
  }
  class AntiFraudService {
    <<service>>
    +check(event) Verdict
    +suspend(entry, reason)
    +review(actor, entryId, CONFIRMAR|ESTORNAR, reason)
  }
  class StoreService {
    <<service>>
    +catalog(viewer) List~StoreItem~
    +purchase(actor, itemId) StorePurchase
    -deliver(purchase) DeliveryResult
  }
  class AiQuotaService {
    <<service>>
    +consume(userId, units) QuotaSource
  }
  class Guard {
    <<service>>
    +requireRole(actor, role)
    +requireDeptHead(actor, deptId)
    +requireOwner(actor, ownerId)
  }
  class CachePort {
    <<port>>
    +balance(userId)
    +incr(userId, delta)
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
  class PointsController {
    <<controller>>
    +GET_api_points_balance()
    +GET_api_points_statement(page)
    +GET_api_points_rules()
    +PUT_api_points_rules(rules)
    +POST_api_points_donations(toUserId, points)
    +GET_api_points_suspended()
    +POST_api_points_entries_id_review(decision, reason)
  }
  class StoreController {
    <<controller>>
    +GET_api_store()
    +POST_api_store_items_id_purchase()
  }
}

namespace ws_infrastructure {
  class RedisBalanceAdapter {
    <<adapter>>
  }
}

DeciaPointsRule "1" o-- "0..*" DeciaPointsLedgerEntry : ruleVersionId
StoreItem "1" o-- "0..*" StorePurchase
StorePurchase "1" --> "1" DeciaPointsLedgerEntry : debito COMPRA_LOJA
StorePurchase ..> AiCreditLedgerEntry : CREDITOS_IA
StorePurchase ..> UserSkin : SKIN_MESA MOLDURA_CARD
StorePurchase ..> MuralEntry : IMPULSO_MURAL boostUntil
AiCreditLedgerEntry ..> AiQuota : purchasedCredits
PointsDonation "1" --> "2" DeciaPointsLedgerEntry : debito e credito
DeciaPointsLedgerEntry "0..1" --> "0..1" DeciaPointsLedgerEntry : counterparty
MessageClassification ..> DeciaPointsService : ARGUMENTO_EVIDENCIA CONSENSO
Divergence ..> DeciaPointsService : DIVERGENCIA_RESOLVIDA
FinalDecision ..> DeciaPointsService : DECISAO_VALIDADA
DeliberativeProfile ..> PointsRuleEngine : qualityMultiplier
SessionMessage ..> AntiFraudService : similarityHash
User ..> AntiFraudService : testAccount nao pontua
Company ..> PointsRuleEngine : pointsPolicyJson tetos expiracao doacao
PointsController --> DeciaPointsService
PointsController --> AntiFraudService
StoreController --> StoreService
DeciaPointsService --> PointsRuleEngine
DeciaPointsService --> AntiFraudService
DeciaPointsService --> CachePort
DeciaPointsService --> AuditLogPort
StoreService --> DeciaPointsService
StoreService --> AiQuotaService
StoreService --> AuditLogPort
AntiFraudService --> Guard
DomainEvents ..> DeciaPointsService : eventos da sessao AFTER_COMMIT
RedisBalanceAdapter ..|> CachePort
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph ATOR["Ator (participante do DECIA · comprador · CHEFE · ADMIN/EMPRESA)"]
    A0([Participa da sessão DECIA]) --> A1["Mensagem com evidência, resposta a divergência, artefato usado, decisão validada…"]
    A2([Abre /points]) --> A3["Saldo, extrato paginado, regras em linguagem simples, gráfico mensal"]
    A4([Abre /store]) --> A5["Escolhe item (modelo, créditos de IA, skin, impulso, sessão IA avançada, kit, certificado)"]
    A6([Usa função de IA]) --> A7["Cota comprada consumida antes da mensal · card mostra a origem"]
    A8([CHEFE abre fila de suspensos]) --> A9{"Confirma ou estorna com motivo?"}
    A10([ADMIN/EMPRESA edita regras]) --> A11["Nova versão com vigência"]
    A12([Doa pontos a colega])
  end

  subgraph FE["Next.js / BFF (app/(shell)/points · store · moderation · profile · admin)"]
    F1["TopBar DpChip saldo · PointsPage (extrato, regras, gráfico)"]
    F2["StoreGrid (StoreItem cards) · Dialog confirmar · POST /api/store/items/{id}/purchase"]
    F3["Toast 409 SALDO_INSUFICIENTE com atalho ganhar pontos no DECIA · ITEM_INDISPONIVEL"]
    F4["SuspendedQueue · POST /entries/{id}/review"]
    F5["RulesEditor (versionado) · PUT /api/points/rules"]
    F6["Perfil deliberativo: DP por tipo de evento e por sessão"]
  end

  subgraph WEB["ws-web"]
    W1["JWT · CorrelationIdFilter · rate limit"]
    W2["GlobalExceptionHandler"]
  end

  subgraph APP["ws-application"]
    P1["DomainEvents AFTER_COMMIT (MessageClassified, DivergenceResolved, DecisionValidated, SessionClosed, ReactionCreated, MinutesRatified…) → DeciaPointsService.award"]
    P2{"IA confirmou a classificação/condição?"}
    P2 -->|não| P3["Não pontua (RUIDO, fora do tema)"]
    P4{"AntiFraudService.check: auto-reação, conta de teste, repetida maior que 90%, conluio?"}
    P4 -->|suspeito| P5["Lançamento SUSPENSO para revisão do chefe"]
    P6["PointsRuleEngine.resolve(eventCode, at) → regra vigente · applyCaps (dia/semana/sessão) · multiplier 0,5–2,0 do perfil deliberativo"]
    P7{"idempotencyKey já existe?"}
    P7 -->|sim| P8["Reprocessamento ignorado (sem duplicar)"]
    P7 -->|não| P9["Insert ledger CONFIRMADO (valor, motivo, sessão, ruleVersionId, correlationId) · saldo em cache"]
    P10{"Saldo suficiente e item disponível?"}
    P10 -->|saldo| E1["409 SALDO_INSUFICIENTE"]
    P10 -->|estoque ou período| E2["409 ITEM_INDISPONIVEL"]
    P10 -->|ok| P11["Transação atômica: ledger COMPRA_LOJA (idempotencyKey) + StorePurchase + entrega: cópia do modelo (credita o autor no mesmo lançamento, RF40) · AiCreditLedgerEntry · UserSkin · MuralEntry.boostUntil · sessão aiMode AVANCADO"]
    P12["AiQuotaService.consume: purchasedCredits antes do monthlyLimit · quotaSource CREDITO · sem cota → aviso + Loja"]
    P13["Guard.requireDeptHead → review: CONFIRMAR (→ CONFIRMADO) ou ESTORNAR (→ ESTORNADO + ledger ESTORNO) · AuditLog"]
    P14["Guard.requireRole ADMIN ou EMPRESA → DeciaPointsRule nova versão (validFrom) · lançamentos passados intactos · AuditLog"]
    P15["Job: expiresAt (política da empresa, ex. 12 meses) → aviso 30 dias antes → ledger EXPIRACAO"]
    P16{"Doação dentro do limite mensal?"}
    P16 -->|não| E3["409 LIMITE_ESGOTADO"]
    P16 -->|sim| P17["PointsDonation + ledger DOACAO_ENVIADA/DOACAO_RECEBIDA (doador não ganha pontos)"]
    P18["Invariante CA10: nenhum campo de moeda real, nenhum gateway · auditoria com correlationId sem dados sensíveis"]
  end

  subgraph IA["AiEngine"]
    I1["Confirma classificação (RF7), resolução de divergência (RF10), convergência (CONSENSO) · AiInferenceLog"]
  end

  subgraph DB["Persistência"]
    D1[("MySQL decia_points_ledger · decia_points_rules · store_items · store_purchases · ai_credit_ledger · points_donations · user_skins · audit_log")]
    D2[("Redis saldo · tetos diários · cota IA · flag redis.enabled (fallback sum no MySQL)")]
    D3[("Cassandra notifications_by_user · flag cassandra.enabled")]
  end

  A1 --> I1 --> P1 --> P2 -->|sim| P4 -->|limpo| P6 --> P7
  P5 --> D1
  P9 --> D1
  P9 --> D2
  P9 --> D3
  A2 --> F1 --> W1 --> D1
  A4 --> A5 --> F2 --> W1 --> P10
  P11 --> D1
  P11 --> D2
  E1 --> F3
  E2 --> F3
  A6 --> P12 --> D2
  A8 --> A9 --> F4 --> W1 --> P13 --> D1
  A10 --> A11 --> F5 --> W1 --> P14 --> D1
  A12 --> W1 --> P16
  P17 --> D1
  P15 --> D1
  P15 --> D3
  F6 --> D1
  P11 -.-> P18
  E1 --> W2
  E2 --> W2
  E3 --> W2
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
  participant EV as DomainEvents (AFTER_COMMIT)

  Note over U,EV: CA01 + CA02 — ganho idempotente com regra versionada
  U->>FE: envia mensagem na sessão citando a tarefa Planilha v2
  FE->>C: POST /api/decia/sessions/{id}/messages
  C->>S: DeciaMessageService.send → MessageSent
  EV->>AI: run(CLASSIFICAR_MENSAGEM)
  AI-->>EV: ARGUMENTO, hasEvidence = true, confidence 0.9
  EV->>S: DeciaPointsService.award(userId, ARGUMENTO_EVIDENCIA, MESSAGE, msgId, sessionId)
  S->>S: AntiFraudService.check (testAccount, similarityHash, auto-reação)
  alt suspeito
    S->>DB: insert ledger SUSPENSO (suspendedReason) → fila do chefe
  else limpo
    S->>DB: PointsRuleEngine.resolve(ARGUMENTO_EVIDENCIA, now) → regra vigente (+5, teto 10/dia/sessão)
    S->>R: contador do teto dia+sessão
    alt teto atingido
      S-->>EV: sem lançamento
    else ok
      S->>DB: insert decia_points_ledger (delta 5, idempotencyKey ARGUMENTO_EVIDENCIA+msgId+userId, ruleVersionId, correlationId)
      alt idempotencyKey duplicada (reprocessamento)
        DB-->>S: unique violation → ignora
      end
      S->>R: incr saldo
      S->>EV: PointsAwarded → Notification PONTOS
    end
  end

  Note over U,EV: CA01 — decisão validada com multiplicador
  EV->>S: DecisionValidated(sessionId) → award(DECISAO_VALIDADA) para cada contribuinte
  S->>DB: deliberative_profiles → qualityMultiplier 0,5–2,0
  S->>DB: insert ledger (15 × multiplicador, idempotencyKey DECISAO_VALIDADA+decisionId+userId)

  Note over U,EV: CA03 — tela DECIA Points
  U->>FE: abre /points
  FE->>C: GET /api/points/balance + /statement?page=1 + /rules
  C->>S: DeciaPointsService.balance/statement · PointsRuleEngine vigentes
  S->>R: saldo (fallback sum ledger CONFIRMADO)
  S->>DB: ledger paginado (evento, sessão, pontos, data) + rules ativas
  S-->>FE: saldo, extrato, regras em linguagem simples, série mensal (i18n)

  Note over U,EV: CA04 + CA05 + CA06 — compra na Loja
  U->>FE: compra Créditos de IA extras (200 DP)
  FE->>C: POST /api/store/items/{id}/purchase
  C->>S: StoreService.purchase(actor, itemId)
  S->>DB: select store_items (lock) · active, estoque, período
  alt item indisponível
    S-->>C: 409 ITEM_INDISPONIVEL
  else saldo insuficiente
    S-->>C: 409 SALDO_INSUFICIENTE (mensagem clara + atalho DECIA)
  else ok (transação)
    S->>DB: insert ledger COMPRA_LOJA (-200, idempotencyKey COMPRA+itemId+buyer+nonce)
    alt kind MODELO_BALCAO
      S->>DB: insert ledger VENDA_BALCAO (+preço ao autor, counterparty) · cópia conforme licença (RF40)
    else kind CREDITOS_IA
      S->>DB: insert ai_credit_ledger (+créditos, source COMPRA)
      S->>R: quota purchasedCredits
    else kind SKIN_MESA ou MOLDURA_CARD
      S->>DB: insert user_skins (acquiredVia COMPRA)
    else kind IMPULSO_MURAL
      S->>DB: mural_entries IMPULSO boostUntil +24 h
    end
    S->>DB: insert store_purchases (CONCLUIDA, deliveryJson) · audit_log STORE_PURCHASE
    S->>R: saldo
    S-->>C: 201 StorePurchase (extrato mostra a compra)
  end
  U->>FE: usa o Autopiloto
  FE->>C: POST /api/autopilot/drafts
  C->>S: AiQuotaService.consume(userId, 1)
  S->>R: purchasedCredits primeiro, depois monthlyLimit
  S-->>FE: quotaSource CREDITO (origem exibida no card)

  Note over U,EV: CA07 — antifraude e revisão do chefe
  U->>FE: CHEFE abre fila de suspensos
  FE->>C: POST /api/points/entries/{id}/review {ESTORNAR, reason}
  C->>S: AntiFraudService.review(actor, id, ESTORNAR, reason)
  S->>S: Guard.requireDeptHead
  S->>DB: update ledger ESTORNADO + insert ledger ESTORNO · audit_log POINTS_REVIEWED
  S-->>C: 200

  Note over U,EV: CA09 — expiração e doação
  EV->>S: job diário DeciaPointsService.expire()
  S->>DB: ledger com expiresAt em 30 dias → Notification aviso · vencidos → ledger EXPIRACAO
  U->>FE: doa 50 DP a um colega
  FE->>C: POST /api/points/donations {toUserId, points, message}
  C->>S: DeciaPointsService.donate(actor, toUserId, 50, message)
  alt limite mensal da empresa atingido
    S-->>C: 409 LIMITE_ESGOTADO
  else ok
    S->>DB: insert points_donations + ledger DOACAO_ENVIADA (-50) e DOACAO_RECEBIDA (+50)
    S-->>C: 201
  end
```

## 4. Máquina de estados

Entidade central: `DeciaPointsLedgerEntry.status` (`LedgerStatus`). O ledger é append-only: estorno e expiração são **novos lançamentos** (ESTORNO, EXPIRACAO), nunca UPDATE do valor.

```mermaid
stateDiagram-v2
  [*] --> CONFIRMADO: evento confirmado pela IA · regra vigente · dentro dos tetos · idempotencyKey nova (CA01, CA02)
  [*] --> SUSPENSO: AntiFraudService detecta repetição, conluio, auto-interação ou sessão fictícia (CA07)
  SUSPENSO --> CONFIRMADO: chefe confirma (Guard.requireDeptHead) · AuditLog
  SUSPENSO --> ESTORNADO: chefe estorna com motivo → lançamento ESTORNO espelho · AuditLog
  CONFIRMADO --> ESTORNADO: estorno posterior (chancela revogada, compra com FALHA) → lançamento ESTORNO
  CONFIRMADO --> CONFIRMADO: expiresAt atingido → novo lançamento EXPIRACAO negativo (CA09) · o original não muda
  ESTORNADO --> [*]
  CONFIRMADO --> [*]
  note right of CONFIRMADO
    Saldo = soma dos CONFIRMADO (cache Redis, fallback MySQL).
    Reprocessar o evento não cria segundo lançamento (unique idempotencyKey).
  end note
  note left of SUSPENSO
    Não entra no saldo nem no Hype (RF45.CA03).
    Fila /moderation do chefe.
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FRONT["Frontend Next.js 15"]
    R1["app/(shell)/points · store · moderation (fila de suspensos) · profile (DP por origem) · admin (regras) · TopBar (saldo)"]
    R2["components: DpChip · PointsPage (extrato, regras, gráfico) · StoreGrid · StoreItemCard · Dialog · Toast (409 + atalho) · SuspendedQueue · RulesEditor"]
    BFF["app/bff"]
    R1 --> R2 --> BFF
  end
  subgraph WEB["ws-web"]
    PC["PointsController · StoreController (@Operation RF42.CA01-CA10)"]
    SEC["SecurityConfig · CorrelationIdFilter · GlobalExceptionHandler (main)"]
  end
  subgraph APPL["ws-application"]
    DPS["points/DeciaPointsService (award · transfer · donate · expire)"]
    PRE["points/PointsRuleEngine (regras versionadas, tetos, multiplicador)"]
    AF["points/AntiFraudService (compartilhado com RF45)"]
    SS["points/StoreService (compra transacional + entrega)"]
    AQ["ai/AiQuotaService (créditos antes da cota mensal)"]
    GD["security/Guard (main: requireRole · planejado: requireDeptHead)"]
    AUD["audit/AuditLogPort (main)"]
    DE["events/DomainEvents AFTER_COMMIT (eventos da sessão, reações, atas, metas, chancelas)"]
    SCH["schedulers (ws-bootstrap): expiração de pontos · aviso 30 dias"]
  end
  subgraph DOM["ws-domain"]
    ENT["DeciaPointsLedgerEntry · DeciaPointsRule · StoreItem · StorePurchase · AiCreditLedgerEntry · PointsDonation · UserSkin · enums PointsEvent/LedgerStatus/StoreItemKind/PurchaseStatus (planejado) · User.testAccount (V2, coluna gerada)"]
  end
  subgraph INFRA["ws-infrastructure"]
    MY["persistence-mysql decia_points_ledger (unique idempotency_key) · decia_points_rules · store_* · ai_credit_ledger · points_donations (V__rf42)"]
    RD["cache-redis saldo · tetos · cota IA (flag redis.enabled)"]
    CASA["persistence-cassandra notifications (flag cassandra.enabled)"]
  end
  BFF --> PC --> SEC
  PC --> DPS
  PC --> AF
  PC --> SS
  DPS --> PRE
  DPS --> AF
  SS --> DPS
  SS --> AQ
  AF --> GD
  DPS --> AUD
  SS --> AUD
  DE --> DPS
  SCH --> DPS
  DPS --> ENT --> MY --> MYSQL[("MySQL 8")]
  DPS --> RD --> REDIS[("Redis")]
  AQ --> RD
  DE --> CASA --> CASS[("Cassandra")]
```

## 6. Rastreabilidade

| CA | Classe | Passo | Mensagem | Transição | Componente |
|---|---|---|---|---|---|
| RF42.CA01 | `DeciaPointsService.award`, `DeciaPointsLedgerEntry` (delta, eventCode, sessionId, idempotencyKey, correlationId), `PointsEvent`, unique `idempotencyKey` | A1 → I1 → P1 → P2 → P4 → P6 → P7 → P8/P9 | 1–22 | `[*] → CONFIRMADO` + nota | `DPS`, `DE`, `MY (unique)` |
| RF42.CA02 | `DeciaPointsRule` (points, caps, validFrom/To, editedBy), `PointsRuleEngine.resolve/applyCaps/multiplier`, `ruleVersionId`, `qualityMultiplier` | P6 · A10 → A11 → F5 → P14 | 9–11, 20–22 | — | `PRE`, `RulesEditor` |
| RF42.CA03 | `DeciaPointsService.balance/statement`, `PointsController`, regras vigentes, série mensal, i18n | A2 → A3 → F1 | 23–28 | nota de CONFIRMADO (saldo) | `PointsPage`, `DpChip`, `RD` |
| RF42.CA04 | `StoreService.purchase/deliver` (transação atômica), `StoreItem`, `StorePurchase` (idempotencyKey, deliveryJson), 409 SALDO_INSUFICIENTE / ITEM_INDISPONIVEL | A4 → A5 → F2 → P10 (409) → P11 → F3 | 29–48 | — | `SS`, `StoreGrid`, `Toast` |
| RF42.CA05 | `DeciaPointsService.transfer` (COMPRA_LOJA + VENDA_BALCAO, `counterpartyUserId`), licença RF40 | P11 (MODELO_BALCAO) | 38–39 | — | `DPS` |
| RF42.CA06 | `AiCreditLedgerEntry`, `AiQuota.purchasedCredits`, `AiQuotaService.consume`, `quotaSource CREDITO`, aviso + Loja | A6 → A7 → P12 | 40–41, 49–53 | — | `AQ`, `RD` |
| RF42.CA07 | `AntiFraudService.check/suspend/review`, `LedgerStatus SUSPENSO/ESTORNADO`, `User.testAccount`, `SessionMessage.similarityHash`, `Guard.requireDeptHead`, `AuditLog` | P4 → P5 · A8 → A9 → F4 → P13 | 7–8, 54–59 | `[*] → SUSPENSO → CONFIRMADO / ESTORNADO` | `AF`, `SuspendedQueue`, `AUD` |
| RF42.CA08 | extrato por tipo de evento e por sessão no perfil deliberativo (RF19/RF43), pontos por departamento e custo de IA no dashboard (RF18/RF28) | F6 | 26–28 | — | `R1 profile`, `admin/issuer dashboard` |
| RF42.CA09 | `DeciaPointsLedgerEntry.expiresAt`, `DeciaPointsService.expire/donate`, `PointsDonation` (monthKey, limite), `Company.pointsPolicyJson`, lançamento EXPIRACAO | P15 · A12 → P16 (409) → P17 | 60–67 | `CONFIRMADO → self (EXPIRACAO)` | `SCH`, `DPS` |
| RF42.CA10 | invariante sem moeda real/gateway; `AuditLog` com `correlationId` e `metadataJson` sanitizado em todo lançamento | P18 | 20, 46, 58 | append-only (estorno e expiração são lançamentos) | `AUD`, `MY` |
