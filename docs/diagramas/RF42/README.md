# RF42 — Acumular DECIA Points por participação de qualidade no chat DECIA e usá-los em compras dentro do app (Loja Work Station: modelos do Balcão, créditos de IA, capas/skins, impulsos, kits)
**HU:** HU42 · **Sprint (board Work Station):** Product Backlog (não priorizado — pós-Sprint 4) · **Equivalente FAI:** RF30 FAI Points + RF41 FAI Points em jogos e criações (ledger idempotente, regras em banco, tetos, cupons) · **Aba/rota:** DECIA Points (`/points`: saldo, extrato, regras), Loja Work Station (`/store`)
**Critérios de aceite cobertos:** RF42.CA01 · RF42.CA02 · RF42.CA03 · RF42.CA04 · RF42.CA05 · RF42.CA06 · RF42.CA07 · RF42.CA08 · RF42.CA09 · RF42.CA10

> Contexto Balcão & Loja & DECIA Points (bounded context 7). Entidade central: `DeciaPointsLedgerEntry` (status CONFIRMADO | SUSPENSO | ESTORNADO), **append-only e idempotente** (`idempotencyKey = eventCode + refId + userId`). Regras vêm de `DeciaPointsRule` versionada com vigência; o lançamento guarda `ruleVersionId`, logo alterar a regra não altera o passado. Gastos passam por `StoreService` (débito atômico + entrega) e `AiCreditLedgerEntry` (cota comprada consumida antes da mensal). `AntiFraudService` suspende lançamentos para revisão do chefe. Nenhum campo de moeda real (RF42.CA10).

## 1. Diagrama de classes

```mermaid
classDiagram
  direction LR

  class DeciaPointsLedgerEntry {
    <<entity>>
    +UUID id
    +UUID userId
    +int delta
    +PointsEvent eventCode
    +String refType
    +UUID refId
    +UUID sessionId
    +UUID ruleVersionId
    +BigDecimal qualityMultiplier
    +String idempotencyKey
    +LedgerStatus status
    +String suspendedReason
    +UUID reviewedBy
    +UUID counterpartyUserId
    +String correlationId
    +Instant expiresAt
    +Instant createdAt
  }
  class DeciaPointsRule {
    <<entity>>
    +UUID id
    +PointsEvent eventCode
    +int points
    +Integer dailyCap
    +Integer weeklyCap
    +Integer perSessionCap
    +boolean oncePerRef
    +String multiplierSource
    +Instant validFrom
    +Instant validTo
    +boolean active
    +UUID editedBy
    +String description
  }
  class StoreItem {
    <<entity>>
    +UUID id
    +StoreItemKind kind
    +UUID refId
    +String title
    +int pricePoints
    +Integer stock
    +Instant availableFrom
    +Instant availableUntil
    +UUID companyId
    +boolean active
  }
  class StorePurchase {
    <<entity>>
    +UUID id
    +UUID buyerId
    +UUID storeItemId
    +int pricePaid
    +UUID ledgerEntryId
    +String deliveryJson
    +PurchaseStatus status
    +String idempotencyKey
  }
  class AiCreditLedgerEntry {
    <<entity>>
    +UUID id
    +UUID userId
    +UUID departmentId
    +int delta
    +String source
    +UUID refId
    +Instant expiresAt
  }
  class AiQuota {
    <<entity>>
    +String scope
    +UUID scopeId
    +String monthKey
    +int monthlyLimit
    +int consumed
    +int purchasedCredits
  }
  class PointsDonation {
    <<entity>>
    +UUID id
    +UUID fromUserId
    +UUID toUserId
    +int points
    +String message
    +UUID ledgerDebitId
    +UUID ledgerCreditId
    +String monthKey
  }
  class UserSkin {
    <<entity>>
    +UUID userId
    +String skinKind
    +String skinKey
    +String acquiredVia
    +UUID purchaseId
  }
  class MuralEntry {
    <<entity>>
    +UUID id
    +String kind
    +UUID targetId
    +Instant boostUntil
  }
  class Company {
    <<entity>>
    +UUID id
    +String pointsPolicyJson
  }
  class User {
    <<entity>>
    +UUID id
    +boolean testAccount
  }
  class MessageClassification {
    <<entity>>
    +UUID messageId
    +MessageClass label
    +boolean hasEvidence
    +UUID confirmedByUserId
  }
  class SessionMessage {
    <<entity>>
    +TimeUUID id
    +UUID sessionId
    +String similarityHash
  }
  class DeliberativeProfile {
    <<entity>>
    +UUID userId
    +String periodKey
    +BigDecimal clarity
    +BigDecimal evidenceUse
    +BigDecimal consistency
  }
  class Reaction {
    <<entity>>
    +UUID actorId
    +UUID targetId
    +ReactionType reactionType
    +String ignoredReason
  }
  class Notification {
    <<entity>>
    +UUID recipientId
    +String category
  }
  class AuditLog {
    <<entity>>
    +UUID actorId
    +String action
    +String correlationId
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

  class PointsController {
    <<controller>>
    +GET points_balance
    +GET points_ledger
    +GET points_rules
    +GET points_monthly
    +POST points_donate
    +POST points_entries_id_review
  }
  class StoreController {
    <<controller>>
    +GET store_items
    +POST store_purchases
  }
  class DeciaPointsService {
    <<service>>
    +award(userId, eventCode, refType, refId, sessionId, occurredAt) DeciaPointsLedgerEntry
    +balance(userId) int
    +ledger(userId, page) Page~DeciaPointsLedgerEntry~
    +transfer(from, to, points, refType, refId, idempotencyKey) TransferResult
    +donate(from, to, points, message) PointsDonation
    +review(entryId, chief, confirm, reason) DeciaPointsLedgerEntry
    +expire(policy) int
    +consumeAiQuota(userId, units) QuotaSource
  }
  class StoreService {
    <<service>>
    +catalog(companyId) List~StoreItem~
    +purchase(buyer, itemId, idempotencyKey) StorePurchase
    +deliver(purchase) DeliveryResult
  }
  class AntiFraudService {
    <<service>>
    +check(userId, eventCode, refId, sessionId) FraudVerdict
    +isRepeated(message) boolean
    +isCollusion(reactions) boolean
    +isFakeSession(sessionId) boolean
  }
  class RulesRepository {
    <<port>>
    +activeRule(eventCode, at) DeciaPointsRule
  }
  class AiEngine {
    <<service>>
    +run(capability, input, accessClass) AiResult
  }

  DeciaPointsLedgerEntry --> PointsEvent : eventCode
  DeciaPointsLedgerEntry --> LedgerStatus : status
  DeciaPointsLedgerEntry --> DeciaPointsRule : ruleVersionId
  DeciaPointsRule --> PointsEvent : eventCode
  StoreItem --> StoreItemKind : kind
  StorePurchase --> StoreItem : storeItemId
  StorePurchase --> DeciaPointsLedgerEntry : ledgerEntryId
  StorePurchase --> PurchaseStatus : status
  StorePurchase ..> UserSkin : entrega SKIN_MESA
  StorePurchase ..> AiCreditLedgerEntry : entrega CREDITOS_IA
  StorePurchase ..> MuralEntry : entrega IMPULSO_MURAL
  AiCreditLedgerEntry ..> AiQuota : purchasedCredits
  PointsDonation --> DeciaPointsLedgerEntry : ledgerDebitId
  PointsDonation --> DeciaPointsLedgerEntry : ledgerCreditId
  Company ..> DeciaPointsRule : pointsPolicyJson (tetos, expiração, doação)
  MessageClassification ..> DeciaPointsLedgerEntry : ARGUMENTO_EVIDENCIA quando hasEvidence
  SessionMessage ..> AntiFraudService : similarityHash
  Reaction ..> AntiFraudService : conluio e auto-reação
  DeliberativeProfile ..> DeciaPointsLedgerEntry : qualityMultiplier 0,5 a 2,0
  User ..> AntiFraudService : testAccount não pontua

  PointsController --> DeciaPointsService
  StoreController --> StoreService
  StoreService --> DeciaPointsService
  DeciaPointsService --> AntiFraudService
  DeciaPointsService --> RulesRepository
  AiEngine ..> DeciaPointsService : confirma classificação (RF7) antes do award
  DeciaPointsService ..> DeciaPointsLedgerEntry
  DeciaPointsService ..> PointsDonation
  DeciaPointsService ..> AiCreditLedgerEntry
  DeciaPointsService ..> Notification
  DeciaPointsService ..> AuditLog
  StoreService ..> StorePurchase

  note for DeciaPointsLedgerEntry "tabela decia_points_ledger · append-only · idempotencyKey única (eventCode + refId + userId) · sem moeda real"
  note for DeciaPointsRule "tabela decia_points_rules · versionada por validFrom/validTo · editável por ADMIN/EMPRESA · lançamentos passados imutáveis"
  note for StorePurchase "tabela store_purchases · débito e entrega na mesma transação · idempotencyKey"
  note for LedgerStatus "nomes LedgerStatus e PurchaseStatus a confirmar · TAXONOMIA só lista valores"
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  classDef err fill:#FFE3E3,stroke:#C0392B,color:#5B1A12
  classDef ai fill:#FFF3D6,stroke:#D68910,color:#5C3B00
  classDef store fill:#EEF6FF,stroke:#4A4852,color:#1F2937

  subgraph L_user["Ator humano · participante do DECIA · comprador · CHEFE"]
    U1["Participa da sessão DECIA: argumento com evidência, consenso, resolve divergência, responde pergunta, compartilha artefato"]
    U2["Abre /points: saldo, extrato, regras em linguagem simples, gráfico mensal"]
    U3["Abre /store e compra um item (modelo, créditos de IA, skin, impulso, kit, certificado)"]
    U4["Usa função de IA (TEXTO_IA, Autopilot, Simulador, extração)"]
    U5["Doa pontos a um colega"]
    U6["CHEFE revisa lançamentos SUSPENSOS: confirma ou estorna com motivo"]
  end

  subgraph L_web["Web/BFF · Next.js /points · /store · perfil deliberativo · dashboard"]
    W1["GET /points/balance · /points/ledger?page= · /points/rules · /points/monthly (i18n)"]
    W2["POST /store/purchases (itemId, Idempotency-Key)"]
    W3["POST /points/donate (toUserId, points, message)"]
    W4["POST /points/entries/id/review (confirm | estornar, reason)"]
    W5["Perfil deliberativo: DP por tipo de evento e por sessão (RF19) · Dashboard: DP por departamento e custo de IA comprado (RF18/RF28)"]
    W6["Card de IA mostra a origem da cota (CREDITO comprado, MENSAL, PONTOS) · sem cota: aviso + link para a Loja"]
  end

  subgraph L_ai["IA (AiEngine) · RF7/RF8/RF10/RF11/RF15/RF16"]
    I1["Confirma a classificação ou condição: ARGUMENTO com hasEvidence, CONSENSO confirmado, divergência marcada resolvida, pergunta respondida com evidência, artefato usado no resumo/decisão, decisão validada"]
    I2["Emite DomainEvent pontuável (eventCode, refId, userId, sessionId, occurredAt)"]
  end

  subgraph L_app["ws-application · DeciaPointsService · StoreService · AntiFraudService"]
    S1["award: idempotencyKey = eventCode + refId + userId"]
    S2{"idempotencyKey já existe?"}
    S3["RulesRepository.activeRule(eventCode, occurredAt) → pontos, tetos, oncePerRef, ruleVersionId"]
    S4{"Teto diário/semanal/por sessão atingido ou oncePerRef já usado?"}
    S5["qualityMultiplier 0,5–2,0 pelo DeliberativeProfile (só DECISAO_VALIDADA)"]
    S6{"AntiFraudService: repetida (similaridade maior que 90%), auto-reação, conluio, sessão fictícia, testAccount?"}
    S7["INSERT ledger CONFIRMADO (delta, ruleVersionId, sessionId, correlationId, expiresAt pela política)"]
    S8["INSERT ledger SUSPENSO (suspendedReason) · Notification ao CHEFE"]
    S9["Atualiza saldo em cache · Notification ao usuário"]
    S10["StoreService.purchase: SELECT item FOR UPDATE"]
    S11{"Item ativo, no período e com estoque?"}
    S12{"Saldo maior ou igual ao preço?"}
    S13["Transação atômica: ledger COMPRA_LOJA (−preço) + entrega: MODELO_BALCAO → crédito VENDA_BALCAO ao autor no mesmo lançamento (RF40) · CREDITOS_IA → AiCreditLedgerEntry COMPRA · SKIN → UserSkin · IMPULSO → MuralEntry.boostUntil · SESSAO_IA_AVANCADA → DeciaSession.aiMode · StorePurchase CONCLUIDA"]
    S14["consumeAiQuota: créditos comprados (AiCreditLedgerEntry) antes da cota mensal (AiQuota) · registra quotaSource no AiInferenceLog"]
    S15{"Há cota ou crédito?"}
    S16{"Doação dentro do limite mensal da política e sem auto-doação?"}
    S17["PointsDonation: ledger DOACAO_ENVIADA (doador, sem ganho) + DOACAO_RECEBIDA (colega), mesma transação"]
    S18["review: CONFIRMADO ou ESTORNADO + lançamento ESTORNO espelho · audit_log (actor, reason, correlationId)"]
    S19["Job mensal expire: pontos com expiresAt vencido → lançamento EXPIRACAO · aviso 30 dias antes"]
    E1["409 SALDO_INSUFICIENTE"]
    E2["409 ITEM_INDISPONIVEL"]
    E3["409 LIMITE_DOACAO"]
    E4["403 ACESSO_NEGADO (não é CHEFE do departamento)"]
    X1(["Sem lançamento (idempotente)"])
    X2(["Sem lançamento (teto ou oncePerRef)"])
  end

  subgraph L_db["Persistência"]
    D1["MySQL decia_points_ledger (único idempotencyKey) · decia_points_rules"]
    D2["Redis saldo:userId · cap:userId:eventCode:dia · lock compra"]
    D3["MySQL store_items · store_purchases · ai_credit_ledger · user_skins · mural_entries · points_donations"]
    D4["Redis quota:USER:id:mês · MySQL ai_quotas · ai_inference_log.quotaSource"]
    D5["audit_log · DomainEventOutbox → notifications_by_user"]
  end

  U1 --> I1 --> I2 --> S1 --> S2
  S2 -- "sim" --> X1
  S2 -- "não" --> S3 --> D1
  S3 --> S4
  S4 -- "sim" --> X2
  S4 -- "não" --> S5 --> S6
  S6 -- "fraude" --> S8 --> D1
  S6 -- "ok" --> S7 --> D1
  S7 --> S9 --> D2
  S9 --> D5
  S8 --> D5

  U2 --> W1 --> D1
  W1 --> D2
  U2 --> W5

  U3 --> W2 --> S10 --> S11
  S11 -- "não" --> E2
  S11 -- "sim" --> S12
  S12 -- "não" --> E1
  S12 -- "sim" --> S13 --> D1
  S13 --> D3
  S13 --> D2
  S13 --> D5

  U4 --> S14 --> S15
  S15 -- "não" --> W6
  S15 -- "sim" --> D4
  D4 --> W6

  U5 --> W3 --> S16
  S16 -- "não" --> E3
  S16 -- "sim" --> S17 --> D1
  S17 --> D3

  U6 --> W4 --> S18
  S18 -- "não é chefe" --> E4
  S18 --> D1
  S18 --> D5

  S19 --> D1
  S19 --> D5

  class E1,E2,E3,E4 err
  class I1,I2 ai
  class D1,D2,D3,D4,D5 store
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
  participant DB as Repository/MySQL
  participant R as Redis
  participant EV as DomainEvents (AFTER_COMMIT)

  Note over U,EV: Ganho — evento pontuável na sessão DECIA
  U->>N: Envia mensagem citando a tarefa T como evidência (RF29)
  N->>C: POST /sessions/id/messages
  C->>S: SessionService.post → commit
  S->>AI: run(CLASSIFICAR_MENSAGEM)
  AI-->>S: ARGUMENTO, hasEvidence true, confiança 0,91
  S->>DB: INSERT message_classifications
  S->>EV: MessageClassified(messageId, ARGUMENTO_EVIDENCIA, authorId, sessionId)
  EV->>S: DeciaPointsService.award(authorId, ARGUMENTO_EVIDENCIA, MESSAGE, messageId, sessionId, occurredAt)
  S->>DB: SELECT decia_points_rules WHERE eventCode AND validFrom até validTo cobre occurredAt (+5, perSessionCap 10/dia)
  S->>R: INCR cap:authorId:ARGUMENTO_EVIDENCIA:sessionId:dia
  alt teto de 10 mensagens/dia por sessão atingido
    S-->>EV: sem lançamento (teto)
  else AntiFraudService detecta repetição (similarityHash maior que 90%) ou conluio
    S->>DB: INSERT decia_points_ledger (SUSPENSO, suspendedReason, idempotencyKey, ruleVersionId, correlationId)
    S->>EV: LedgerEntrySuspended(entryId, chiefId)
    EV-->>DB: notifications (CHEFE: lançamento para revisão)
  else ok
    S->>DB: INSERT decia_points_ledger (CONFIRMADO, +5, ruleVersionId, sessionId, idempotencyKey, correlationId, expiresAt)
    Note over S,DB: reprocessar o mesmo evento viola a chave única e é ignorado (idempotente)
    S->>R: INCRBY saldo:authorId 5
    S->>EV: PointsAwarded(entryId)
    EV-->>DB: notifications (+5 DP, motivo, sessão)
  end

  Note over U,EV: Gasto — compra na Loja Work Station
  U->>N: Comprar Créditos de IA (50 DP)
  N->>C: POST /store/purchases (itemId, Idempotency-Key k)
  C->>S: StoreService.purchase(buyer, itemId, k)
  S->>R: SET NX compra:k (lock)
  S->>DB: SELECT store_items FOR UPDATE (active, período, stock)
  alt item inativo, fora do período ou sem estoque
    S-->>N: 409 ITEM_INDISPONIVEL
  else saldo (SUM delta CONFIRMADO) menor que preço
    S-->>N: 409 SALDO_INSUFICIENTE (atalho para ganhar pontos no DECIA)
  else ok (transação única)
    S->>DB: INSERT decia_points_ledger (COMPRA_LOJA, −50, idempotencyKey k, correlationId c)
    S->>DB: INSERT ai_credit_ledger (source COMPRA, +N, expiresAt) · UPDATE store_items stock−1
    S->>DB: INSERT store_purchases (CONCLUIDA, pricePaid 50, ledgerEntryId, deliveryJson creditsAdded)
    S->>R: INCRBY saldo:buyer −50 · INCRBY quota:USER:buyer:mês purchasedCredits · DEL lock
    S->>EV: StorePurchaseCompleted(purchaseId)
    EV-->>DB: audit_log (correlationId c, sem dados sensíveis) · notifications
    S-->>N: 201 StorePurchase (extrato mostra a compra)
  end

  Note over U,EV: Consumo de cota comprada antes da mensal
  U->>N: Gerar TEXTO_IA
  N->>C: POST /tasks/ai-text
  C->>S: AiEngine.run(PREENCHER_TAREFA) → DeciaPointsService.consumeAiQuota(userId, 1)
  S->>R: GET quota:USER:id:mês (purchasedCredits, consumed, monthlyLimit)
  alt purchasedCredits maior que 0
    S->>DB: INSERT ai_credit_ledger (CONSUMO, −1) · ai_inference_log.quotaSource CREDITO
    S-->>N: 200 com origem da cota CREDITO
  else cota mensal disponível
    S->>R: INCR quota consumed · quotaSource MENSAL
    S-->>N: 200 com origem MENSAL
  else sem cota
    S-->>N: 409 COTA_ESGOTADA (aviso + link para a Loja)
  end
```

## 4. Máquina de estados

Entidade central: `DeciaPointsLedgerEntry.status`. O ledger é append-only: expiração e estorno não alteram o lançamento original, geram lançamentos espelho (`EXPIRACAO`, `ESTORNO`).

```mermaid
stateDiagram-v2
  direction LR

  state fraud <<choice>>
  [*] --> fraud : evento pontuável confirmado pela IA · regra vigente · dentro dos tetos · idempotencyKey nova
  fraud --> CONFIRMADO : AntiFraudService ok
  fraud --> SUSPENSO : repetição, auto-reação, conluio, sessão fictícia, testAccount

  SUSPENSO --> CONFIRMADO : CHEFE confirma (reviewedBy, audit_log)
  SUSPENSO --> ESTORNADO : CHEFE estorna com motivo · gera lançamento ESTORNO espelho

  CONFIRMADO --> ESTORNADO : estorno posterior (compra FALHA, fraude confirmada) · lançamento ESTORNO espelho

  state CONFIRMADO {
    [*] --> Vigente
    Vigente --> AvisoExpiracao : 30 dias antes de expiresAt (política da empresa)
    AvisoExpiracao --> Expirado : expiresAt atingido · lançamento EXPIRACAO espelho
    Vigente --> Expirado : sem aviso configurado
  }

  ESTORNADO --> [*]

  note right of SUSPENSO
    Saldo exibido = SUM(delta) dos lançamentos CONFIRMADO.
    SUSPENSO não conta até a revisão do chefe (RF42.CA07).
  end note
  note left of CONFIRMADO
    Alterar DeciaPointsRule cria nova versão (validFrom);
    o lançamento mantém ruleVersionId e não é recalculado (RF42.CA02).
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FE["Frontend Next.js"]
    FE1["app/points (saldo, extrato paginado, regras em linguagem simples, gráfico mensal) · app/store (Loja Work Station) · app/profile (perfil deliberativo: DP por evento e sessão) · app/admin e app/companies (dashboard: DP por departamento, custo de IA comprado, regras e revisão de suspensos)"]
    FE2["components/ui · PointsChip (ficha DP com faísca ✦) · LedgerTable · RulesPlainText · MonthlyChart · StoreItemCard · QuotaSourceBadge · ReviewQueue"]
  end

  subgraph WEB["ws-web"]
    C1["PointsController"]
    C2["StoreController"]
    C3["AdminRulesController (ADMIN/EMPRESA edita regras com vigência)"]
  end

  subgraph APP["ws-application"]
    S1["DeciaPointsService"]
    S2["StoreService"]
    S3["AntiFraudService"]
    S4["AiEngine (RF43) · confirma classificação · consome cota"]
    S5["CounterService (RF40) · entrega MODELO_BALCAO"]
    S6["PreferencesService (RF38) · libera UserSkin"]
    P1["RulesRepository"]
  end

  subgraph DOM["ws-domain · br.gov.pr.secid.workstation"]
    D1["DeciaPointsLedgerEntry · DeciaPointsRule · PointsDonation"]
    D2["StoreItem · StorePurchase · AiCreditLedgerEntry · AiQuota · UserSkin · MuralEntry"]
    D3["MessageClassification · SessionMessage.similarityHash · Reaction · DeliberativeProfile · User.testAccount · Company.pointsPolicyJson"]
  end

  subgraph INFRA["ws-infrastructure/*"]
    I1["persistence-mysql · decia_points_ledger, decia_points_rules, store_items, store_purchases, ai_credit_ledger, points_donations"]
    I2["cache-redis · saldo por usuário · contadores de teto · quota mensal · locks de idempotência"]
    I3["persistence-cassandra · notifications_by_user"]
    I4["platform · DomainEventOutbox (AFTER_COMMIT) · AuditLog (correlationId, sem dados sensíveis) · scheduler mensal de expiração e aviso 30 dias · i18n"]
  end

  FE1 --> C1
  FE1 --> C2
  FE1 --> C3
  FE2 -.-> FE1
  C1 --> S1
  C2 --> S2
  C3 --> P1
  S2 --> S1
  S2 --> S5
  S2 --> S6
  S1 --> S3
  S1 --> P1
  S4 --> S1
  S1 --> D1
  S2 --> D2
  S3 --> D3
  D1 --> I1
  D2 --> I1
  D3 --> I1
  S1 --> I2
  S2 --> I2
  I4 --> S1
  I4 --> I3
```

## 6. Rastreabilidade

| CA | Elemento do diagrama (classe / passo / mensagem / transição / componente) |
|---|---|
| RF42.CA01 | Classes `DeciaPointsLedgerEntry` (idempotencyKey, delta, eventCode, sessionId, correlationId), `DeciaPointsService.award`, `AiEngine` (confirma classificação), enum `PointsEvent`; atividades I1, I2, S1, S2 → X1 (idempotente), S7; sequência msgs 1–9 e 15–18 (chave única, reprocessar não duplica); transição `[*] → fraud → CONFIRMADO`; componentes `DomainEventOutbox (AFTER_COMMIT)`. |
| RF42.CA02 | Classes `DeciaPointsRule` (points, dailyCap, weeklyCap, perSessionCap, oncePerRef, validFrom/validTo, editedBy), `DeciaPointsLedgerEntry.ruleVersionId/qualityMultiplier`, `RulesRepository.activeRule`, `DeliberativeProfile`; atividades S3, S4 → X2, S5; sequência msgs 9–11 (regra vigente em occurredAt, teto); nota da máquina de estados (nova versão não recalcula); componentes `AdminRulesController`, `RulesRepository`. |
| RF42.CA03 | Classes `DeciaPointsService.balance/ledger`, `PointsController` (balance, ledger, rules, monthly); atividades U2, W1 (i18n); componentes `app/points`, `LedgerTable`, `RulesPlainText`, `MonthlyChart`, `platform · i18n`. |
| RF42.CA04 | Classes `StoreItem`, `StorePurchase` (pricePaid, ledgerEntryId, deliveryJson, status, idempotencyKey), `StoreService.purchase/deliver`, enums `StoreItemKind`, `PurchaseStatus`; atividades U3, W2, S10, S11 → E2 (409 ITEM_INDISPONIVEL), S12 → E1 (409 SALDO_INSUFICIENTE), S13 (transação atômica + entrega); sequência msgs 19–32; componentes `StoreController`, `StoreItemCard`, `cache-redis · locks`. |
| RF42.CA05 | Classes `DeciaPointsService.transfer`, `DeciaPointsLedgerEntry.counterpartyUserId`, `CounterService`; atividade S13 (MODELO_BALCAO → crédito VENDA_BALCAO ao autor no mesmo lançamento, respeitando a licença); componente `CounterService (RF40) · entrega MODELO_BALCAO`. Detalhe da transferência no RF40 §3. |
| RF42.CA06 | Classes `AiCreditLedgerEntry` (source COMPRA/CONSUMO), `AiQuota.purchasedCredits/consumed/monthlyLimit`, `DeciaPointsService.consumeAiQuota`; atividades U4, S14, S15, W6 (origem da cota, aviso + Loja); sequência msgs 33–41 (crédito antes da mensal, 409 COTA_ESGOTADA); componentes `QuotaSourceBadge`, `AiEngine · consome cota`, `cache-redis · quota mensal`. |
| RF42.CA07 | Classes `AntiFraudService` (isRepeated, isCollusion, isFakeSession), `DeciaPointsLedgerEntry.status/suspendedReason/reviewedBy`, `SessionMessage.similarityHash`, `Reaction.ignoredReason`, `User.testAccount`, `DeciaPointsService.review`; atividades S6 → S8, U6, W4, S18 → E4; sequência msgs 12–14; estados `SUSPENSO → CONFIRMADO / ESTORNADO` e nota do saldo; componente `ReviewQueue`. |
| RF42.CA08 | Classes `DeciaPointsLedgerEntry.eventCode/sessionId`, `DeliberativeProfile`, `AiCreditLedgerEntry.departmentId`; atividade W5 (perfil deliberativo por evento/sessão, dashboard por departamento e custo de IA); componentes `app/profile`, `app/admin e app/companies`. |
| RF42.CA09 | Classes `Company.pointsPolicyJson`, `DeciaPointsLedgerEntry.expiresAt`, `PointsDonation` (monthKey, ledgerDebitId, ledgerCreditId), `DeciaPointsService.expire/donate`, eventos `EXPIRACAO`, `DOACAO_ENVIADA`, `DOACAO_RECEBIDA`; atividades U5, W3, S16 → E3 (409 LIMITE_DOACAO), S17 (doador sem ganho), S19 (job mensal, aviso 30 dias); estado composto `CONFIRMADO` (Vigente → AvisoExpiracao → Expirado); componente `scheduler mensal de expiração`. |
| RF42.CA10 | Nota da classe `DeciaPointsLedgerEntry` (sem moeda real), `AuditLog.correlationId`; atividade D5 e S18 (audit_log); sequência msg 31 (audit_log correlationId, sem dados sensíveis); componente `platform · AuditLog` — nenhum componente de gateway ou campo monetário em qualquer diagrama. |
