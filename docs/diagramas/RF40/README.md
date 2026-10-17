# RF40 — Oferecer tarefas, projetos e kits como modelos no Balcão de Modelos (marketplace interno em DECIA Points, sem dinheiro) e reutilizá-los com crédito ao autor
**HU:** HU40 · **Sprint (board Work Station):** Product Backlog (não comprometido na Sprint 4) · **Equivalente FAI:** estado "À venda" da peça (RF4.CA8 / RF31), sub-aba "Peças à venda", Arara do Desapego e o remix · **Aba/rota:** Balcão de Modelos (`/models`, prateleiras Chancelados · Comunidade, também pela Loja `/store`), ação **Oferecer como modelo** no card (`/tasks/[id]`, `/projects/[id]`, kits), sub-aba **Meus modelos oferecidos** no perfil (`/profile?tab=modelos`), "repassar ao Balcão" ao arquivar (RF41)
**Critérios de aceite cobertos:** RF40.CA01 · CA02 · CA03 · CA04 · CA05 · CA06 · CA07 · CA08 (corpo do card, inalterado) — regra: o **título do card** define o RF e o corpo traz os próprios CAs. A HU40 ainda diz "Pontos de Contribuição" (= DECIA Points, RF42).

`ModelOffer` (targetType TASK · PROJECT · KIT, `pricePoints` 0 = grátis, `license` `ModelLicense` COPIA_LIVRE · ATRIBUICAO · SOMENTE_LEITURA, `visibility`, `shelf` COMUNIDADE · CHANCELADO, `isHandover` repasse, `status` `OfferStatus` ATIVA · RETIRADA · ESGOTADA, contadores). O item passa a `TaskItem.offeredInCounter = true` + `TaskState OFERECIDA` mantendo o estado de trabalho (`TaskStateLog`). **Remixar** = `Remix` + cópia respeitando a licença + **1 lançamento** no ledger que debita o comprador e credita o autor (`DeciaPointsLedgerEntry COMPRA_LOJA` com `counterpartyUserId`, `idempotencyKey`; `VENDA_BALCAO` espelho) — grátis credita só `reuseCount`. Saldo insuficiente → `409 SALDO_INSUFICIENTE`. **Nenhum campo de moeda real, nenhum gateway** (CA08). Destacar/converter em chancelado passa pelo fluxo RF39 (indicação → chancela) preservando `originalTaskId/originalProjectId`.

## 0. Diagrama de casos de uso

Quem usa o Balcão de Modelos e para quê. Atores do catálogo de [`ATORES_E_ATRIBUTOS.md`](../../arquitetura/ATORES_E_ATRIBUTOS.md) §2 e permissões da Matriz A de [`ABAS_POR_PERFIL.md`](../../produto/ABAS_POR_PERFIL.md) (6.1); casos tracejados são planejados — hoje só existem as entidades `ModelOffer` e `StoreItem`, sem serviço nem tela.

```mermaid
flowchart LR
  classDef ator fill:#fde7d3,stroke:#b4531a,color:#1b1b1b
  classDef atorSis fill:#f1ecf9,stroke:#6a4bb3,color:#1b1b1b
  classDef uc fill:#ffffff,stroke:#3557a6,color:#1b1b1b
  classDef ucPlan fill:#ffffff,stroke:#8a8a8a,stroke-dasharray:4 3,color:#555555
  dono["«ator» Dono do recurso"]:::ator
  autenticado["«ator» Pessoa autenticada"]:::ator
  empregado["«ator» Empregado"]:::ator
  chefe["«ator» Chefe de departamento"]:::ator
  empresa["«ator» Empresa ou órgão"]:::ator
  subgraph SIS["Work Station — RF40 Balcão de Modelos"]
    direction TB
    UC1(["UC1 Oferecer tarefa, projeto ou kit como modelo"]):::ucPlan
    UC2(["UC2 Navegar nas prateleiras do Balcão"]):::ucPlan
    UC3(["UC3 Reutilizar (remixar) um modelo"]):::ucPlan
    UC4(["UC4 Copiar conforme a licença com crédito ao autor"]):::ucPlan
    UC5(["UC5 Pagar o modelo em DECIA Points"]):::ucPlan
    UC6(["UC6 Repassar a tarefa ao Balcão ao arquivar"]):::ucPlan
    UC7(["UC7 Acompanhar e retirar meus modelos oferecidos"]):::ucPlan
    UC8(["UC8 Destacar modelo da comunidade para chancela"]):::ucPlan
  end
  dono --- UC1
  dono --- UC6
  dono --- UC7
  autenticado --- UC2
  empregado --- UC3
  chefe --- UC8
  empresa --- UC8
  UC3 -. "«include»" .-> UC4
  UC5 -. "«extend»" .-> UC3
  UC6 -. "«extend»" .-> UC1
```

| Caso de uso | Ator(es) | CAs | Situação |
|---|---|---|---|
| UC1 Oferecer tarefa, projeto ou kit como modelo | Dono do recurso | RF40.CA01, RF40.CA08 | planejado |
| UC2 Navegar nas prateleiras do Balcão (Chancelados · Comunidade) | Pessoa autenticada | RF40.CA02 | planejado (`/models` é página-esqueleto) |
| UC3 Reutilizar (remixar) um modelo | Empregado | RF40.CA03, RF40.CA08 | planejado |
| UC4 Copiar conforme a licença com crédito ao autor | — (incluído por UC3) | RF40.CA04 | planejado |
| UC5 Pagar o modelo em DECIA Points (só quando o preço é maior que 0) | — (estende UC3) | RF40.CA03, RF40.CA08 | planejado |
| UC6 Repassar a tarefa ao Balcão ao arquivar (preço 0, etiqueta repasse) | Dono do recurso | RF40.CA05 | planejado |
| UC7 Acompanhar e retirar meus modelos oferecidos | Dono do recurso | RF40.CA06 | planejado |
| UC8 Destacar modelo da comunidade para chancela (RF39) | Chefe de departamento, Empresa ou órgão | RF40.CA07 | planejado |

## 1. Diagrama de classes

```mermaid
classDiagram
direction LR

namespace ws_domain_balcao_points {
  class ModelOffer {
    <<entity>>
    +id: UUID
    +ownerId: UUID
    +targetType: String
    +targetId: UUID
    +pricePoints: int
    +license: ModelLicense
    +usageDescription: String
    +visibility: Visibility
    +shelf: Shelf
    +isHandover: boolean
    +availableFrom: LocalDate
    +availableUntil: LocalDate
    +status: OfferStatus
    +viewsCount: long
    +remixCount: long
    +pointsEarned: long
    +highlightedBy: UUID
  }
  class DeciaPointsLedgerEntry {
    <<entity>>
    +id: UUID
    +userId: UUID
    +delta: int
    +eventCode: PointsEvent
    +refType: String
    +refId: UUID
    +idempotencyKey: String
    +status: LedgerStatus
    +counterpartyUserId: UUID
    +correlationId: String
  }
  class Remix {
    <<entity>>
    +id: UUID
    +actorId: UUID
    +sourceType: String
    +sourceId: UUID
    +resultType: String
    +resultId: UUID
    +modelOfferId: UUID
    +ledgerEntryId: UUID
    +at: Instant
  }
  class StoreItem {
    <<entity>>
    +kind: StoreItemKind
    +refId: UUID
    +pricePoints: int
  }
  class ModelLicense {
    <<enum>>
    COPIA_LIVRE
    ATRIBUICAO
    SOMENTE_LEITURA
  }
  class Shelf {
    <<enum>>
    COMUNIDADE
    CHANCELADO
  }
  class OfferStatus {
    <<enum>>
    ATIVA
    RETIRADA
    ESGOTADA
  }
}

namespace ws_domain_alvos {
  class TaskItem {
    <<entity>>
    +id: UUID
    +ownerId: UUID
    +title: String
    +state: TaskState
    +offeredInCounter: boolean
    +originalTaskId: UUID
    +reuseCount: int
    +remixesCount: long
    +sealIdsJson: JSON
    .. +45 campos ..
  }
  class ProjectScheme {
    <<entity>>
    +id: UUID
    +ownerId: UUID
    +origin: SchemeOrigin
    +originalProjectId: UUID
    +offeredInCounter: boolean
    +sealIdsJson: JSON
    .. +32 campos ..
  }
  class ProcessKit {
    <<entity>>
    +id: UUID
    +ownerId: UUID
    +name: String
    +offeredInCounter: boolean
    +remixCount: int
  }
  class TaskStateLog {
    <<entity>>
    +taskId: UUID
    +fromState: TaskState
    +toState: TaskState
    +reason: String
  }
  class SealBond {
    <<entity>>
    +targetId: UUID
    +basis: SealBondBasis
    +status: SealBondStatus
  }
  class User {
    <<entity>>
    +id: UUID
    +companyId: UUID
    +departmentId: UUID
  }
}

namespace ws_application {
  class ModelCounterService {
    <<service>>
    +offer(actor, targetType, targetId, OfferForm) ModelOffer
    +withdraw(actor, offerId) ModelOffer
    +browse(viewer, shelf, filters, sort, page) Page~OfferView~
    +remix(actor, offerId, projectId) Remix
    +handoverOnArchive(actor, taskId) ModelOffer
    +highlight(actor, offerId) ModelOffer
    +myOffers(actor) List~OfferView~
  }
  class LicenseEnforcer {
    <<service>>
    +copy(offer, actor) CopyResult
    -readOnlyReference(offer, projectId)
    -attributedCopy(offer)
    -freeCopy(offer)
  }
  class DeciaPointsService {
    <<service>>
    +transfer(buyerId, sellerId, points, refId, idempotencyKey) LedgerPair
    -balance(userId) int
  }
  class SealBondService {
    <<service>>
    +indicate(actor, targetType, targetId, sealId) SealBond
  }
  class VisibilityFilter {
    <<service>>
    +allowedFor(viewer) Filter
  }
  class Guard {
    <<service>>
    +requireOwner(actor, ownerId)
    +requireIssuerOrCurator(actor, deptId)
  }
  class AuditLogPort {
    <<port>>
    +record(AuditEvent)
  }
  class CachePort {
    <<port>>
    +balance(userId)
    +counters(offerIds)
  }
  class DomainEvents {
    <<service>>
    +publish(event)
  }
}

namespace ws_web {
  class ModelCounterController {
    <<controller>>
    +POST_api_models_offers(target, form)
    +DELETE_api_models_offers_id()
    +GET_api_models(shelf, filters, sort, page)
    +POST_api_models_offers_id_remix(projectId)
    +POST_api_models_offers_id_highlight()
    +GET_api_me_models_offers()
  }
}

namespace ws_infrastructure {
  class RedisCacheAdapter {
    <<adapter>>
  }
  class OpenSearchIndexAdapter {
    <<adapter>>
  }
}

ModelOffer ..> TaskItem : TASK
ModelOffer ..> ProjectScheme : PROJECT
ModelOffer ..> ProcessKit : KIT
ModelOffer "1" o-- "0..*" Remix
Remix "1" --> "0..1" DeciaPointsLedgerEntry : ledgerEntryId
DeciaPointsLedgerEntry "1" --> "0..1" DeciaPointsLedgerEntry : counterparty espelho
Remix ..> TaskItem : resultado com originalTaskId
Remix ..> ProjectScheme : resultado origin REMIX
TaskItem "1" o-- "0..*" TaskStateLog : OFERECIDA
ModelOffer ..> SealBond : shelf CHANCELADO quando APROVADA
StoreItem ..> ModelOffer : kind MODELO_BALCAO
User "1" o-- "0..*" ModelOffer : oferece
ModelCounterController --> ModelCounterService
ModelCounterService --> LicenseEnforcer
ModelCounterService --> DeciaPointsService
ModelCounterService --> SealBondService
ModelCounterService --> VisibilityFilter
ModelCounterService --> Guard
ModelCounterService --> AuditLogPort
ModelCounterService --> CachePort
ModelCounterService --> DomainEvents
RedisCacheAdapter ..|> CachePort
OpenSearchIndexAdapter ..> ModelCounterService : busca e ordenacao
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph ATOR["Ator (EMPREGADO autor · comprador · EMPRESA/CHEFE)"]
    A0([No card de tarefa, projeto ou kit]) --> A1["Oferecer como modelo: preço em DP (0 = grátis), licença, descrição, visibilidade, período"]
    A2([Abre /models]) --> A3{"Prateleira"}
    A3 -->|Chancelados| A4["Modelos oficiais (RF39)"]
    A3 -->|Comunidade| A5["Modelos oferecidos por empregados"]
    A6["Filtra por categoria, tipo, departamento, licença, preço · ordena por remixes, reações, recentes"]
    A7["Clica Reutilizar (remixar)"]
    A8([Arquiva uma tarefa]) --> A9{"Repassar ao Balcão?"}
    A10([Perfil › Meus modelos oferecidos]) --> A11["Vê visualizações, remixes, DP recebidos · retira a oferta"]
    A12([EMPRESA/CHEFE destaca modelo da comunidade])
  end

  subgraph FE["Next.js / BFF (app/(shell)/models · store · tasks/[id] · profile)"]
    F1["OfferForm (Input DP, Select licença, Select visibilidade, Due período) · POST /api/models/offers"]
    F2["ModelShelf: TaskCard/ProjectCard variants NO_BALCAO/CHANCELADO · DpChip preço · Tag repasse · filtros"]
    F3["POST /offers/{id}/remix → Dialog saldo · atalho ganhar pontos no DECIA se 409"]
    F4["Dialog repassar ao Balcão (preço 0, etiqueta repasse)"]
    F5["MyOffers (Counters) · DELETE /offers/{id}"]
    F6["POST /offers/{id}/highlight → indicação RF39"]
  end

  subgraph WEB["ws-web · ModelCounterController"]
    W1["JWT · CorrelationIdFilter"]
    W2["GlobalExceptionHandler"]
  end

  subgraph APP["ws-application · ModelCounterService"]
    P1{"Guard.requireOwner(item)?"}
    P1 -->|não| E1["403 ACESSO_NEGADO"]
    P2{"Preço maior ou igual a 0, período válido, item não ARQUIVADO/BLOQUEADO?"}
    P2 -->|não| E2["422 VALIDACAO details"]
    P3["ModelOffer ATIVA shelf COMUNIDADE · TaskItem.offeredInCounter · TaskState → OFERECIDA (TaskStateLog, estado de trabalho preservado) · AuditLog OFFER_CREATED"]
    P4["browse: VisibilityFilter + shelf (CHANCELADO = SealBond APROVADA) + filtros + ordenação · contadores em cache"]
    P5{"Oferta ATIVA, visível e dentro do período?"}
    P5 -->|não| E3["409 ITEM_INDISPONIVEL"]
    P6{"pricePoints maior que 0?"}
    P6 -->|sim| P7{"Saldo do comprador suficiente?"}
    P7 -->|não| E4["409 SALDO_INSUFICIENTE + atalho para o DECIA"]
    P7 -->|sim| P8["DeciaPointsService.transfer: 1 lançamento COMPRA_LOJA (débito, counterparty = autor) + VENDA_BALCAO (crédito) · idempotencyKey = REMIX+offerId+buyerId · transação"]
    P6 -->|grátis| P9["Só reuseCount++ do original (RF23)"]
    P10["LicenseEnforcer.copy"]
    P10 --> P11{"Licença"}
    P11 -->|SOMENTE_LEITURA| P12["Apenas Levar ao projeto como referência (ProjectTask aponta para o original, não editável)"]
    P11 -->|ATRIBUICAO| P13["Cópia com originalTaskId/originalProjectId e crédito visível imutável"]
    P11 -->|COPIA_LIVRE| P14["Cópia completa editável (origin REMIX)"]
    P15["Remix gravado · remixCount++, pointsEarned += · Notification REMIX ao autor"]
    P16["handoverOnArchive: ModelOffer isHandover, pricePoints 0, etiqueta repasse"]
    P17["withdraw: status RETIRADA (cópias já feitas permanecem) · AuditLog"]
    P18["highlight: Guard.requireIssuerOrCurator → SealBondService.indicate(INDICACAO) → RF39 → shelf CHANCELADO preservando crédito do autor"]
    P19["Invariante CA08: nenhum campo monetário, nenhum gateway · todo movimento é ledger auditado"]
  end

  subgraph DB["Persistência"]
    D1[("MySQL model_offers · remixes · decia_points_ledger · tasks · task_state_log · project_schemes · audit_log")]
    D2[("Redis saldo DP · contadores · flag redis.enabled")]
    D3[("OpenSearch ws-models · flag opensearch.enabled")]
    D4[("Cassandra notifications_by_user · flag cassandra.enabled")]
  end

  A1 --> F1 --> W1 --> P1 -->|sim| P2 -->|sim| P3 --> D1
  P3 --> D3
  A2 --> A3
  A4 --> A6
  A5 --> A6 --> F2 --> W1 --> P4 --> D3
  P4 --> D2
  A7 --> F3 --> W1 --> P5 -->|sim| P6
  P8 --> D1
  P8 --> D2
  P9 --> D1
  P8 --> P10
  P9 --> P10
  P12 --> P15
  P13 --> P15
  P14 --> P15 --> D1
  P15 --> D4
  A9 -->|sim| F4 --> W1 --> P16 --> D1
  A10 --> A11 --> F5 --> W1 --> P17 --> D1
  A12 --> F6 --> W1 --> P18 --> D1
  P8 -.-> P19
  E1 --> W2
  E2 --> W2
  E3 --> W2
  E4 --> W2
```

## 3. Diagrama de sequência

```mermaid
sequenceDiagram
  autonumber
  participant U as Usuário
  participant FE as Next.js (App Router)
  participant C as Controller (ws-web)
  participant S as Service (ws-application)
  participant DB as Repository/MySQL
  participant R as Redis
  participant OS as OpenSearch
  participant EV as DomainEvents (AFTER_COMMIT)

  U->>FE: Oferecer como modelo (30 DP, ATRIBUICAO, EMPRESA)
  FE->>C: POST /api/models/offers {TASK, taskId, form}
  C->>S: ModelCounterService.offer(actor, TASK, id, form)
  S->>S: Guard.requireOwner(actor, task.ownerId)
  alt não é dono
    S-->>C: 403 ACESSO_NEGADO
  else item ARQUIVADO ou período inválido
    S-->>C: 422 VALIDACAO
  else ok
    S->>DB: insert model_offers (ATIVA, COMUNIDADE) · update tasks offered_in_counter, state OFERECIDA · task_state_log
    S->>DB: audit_log OFFER_CREATED
    S->>EV: OfferCreated
    S-->>C: 201 ModelOffer
  end
  EV->>OS: index ws-models (opensearch.enabled)

  U->>FE: comprador abre o Balcão, filtra e ordena
  FE->>C: GET /api/models?shelf=COMUNIDADE&categoria=ETP&sort=remixes
  C->>S: ModelCounterService.browse(viewer, shelf, filters, sort, page)
  S->>S: VisibilityFilter.allowedFor(viewer)
  S->>OS: search ws-models (filtros, ordenação)
  S->>R: contadores dos itens
  S-->>FE: página com cards (DpChip preço, Tag repasse, lacre nos chancelados)

  U->>FE: Reutilizar no projeto X
  FE->>C: POST /api/models/offers/{id}/remix {projectId}
  C->>S: ModelCounterService.remix(actor, offerId, projectId)
  S->>DB: select model_offers (lock) · oferta ATIVA e no período
  alt indisponível
    S-->>C: 409 ITEM_INDISPONIVEL
  else preço maior que 0
    S->>R: saldo do comprador (fallback MySQL sum)
    alt saldo insuficiente
      S-->>C: 409 SALDO_INSUFICIENTE (mensagem + atalho ganhar pontos no DECIA)
    else ok (transação)
      S->>DB: insert decia_points_ledger COMPRA_LOJA (-30, counterparty autor, idempotencyKey REMIX+offer+buyer)
      S->>DB: insert decia_points_ledger VENDA_BALCAO (+30 ao autor, mesmo correlationId)
      S->>R: ajusta saldos
    end
  else grátis
    S->>DB: update tasks.reuse_count++ do original
  end
  S->>S: LicenseEnforcer.copy(offer, actor)
  alt SOMENTE_LEITURA
    S->>DB: insert project_tasks apontando para o original (referência, não editável)
  else ATRIBUICAO
    S->>DB: insert tasks cópia (originalTaskId, crédito imutável) + project_tasks
  else COPIA_LIVRE
    S->>DB: insert tasks cópia editável (sourceKind REMIX) + project_tasks
  end
  S->>DB: insert remixes (modelOfferId, ledgerEntryId) · model_offers remix_count++, points_earned+=
  S->>DB: audit_log MODEL_REMIXED (correlationId)
  S->>EV: ModelRemixed → Notification REMIX ao autor
  S-->>C: 201 Remix

  U->>FE: autor retira a oferta
  FE->>C: DELETE /api/models/offers/{id}
  C->>S: ModelCounterService.withdraw(actor, id)
  S->>DB: update model_offers RETIRADA · tasks offered_in_counter false · state volta ao de trabalho (task_state_log)
  S-->>C: 204 (cópias já feitas permanecem)

  U->>FE: CHEFE destaca modelo da comunidade
  FE->>C: POST /api/models/offers/{id}/highlight
  C->>S: ModelCounterService.highlight(actor, id)
  S->>S: Guard.requireIssuerOrCurator → SealBondService.indicate(INDICACAO)
  S->>DB: update model_offers highlighted_by · seal_bonds EM_REVISAO (RF39) · crédito do autor preservado
  S-->>C: 200
```

## 4. Máquina de estados

Entidade central: `ModelOffer.status` (`OfferStatus`); em paralelo a tarefa entra em `TaskState OFERECIDA` (RF41) mantendo o estado de trabalho no `TaskStateLog`.

```mermaid
stateDiagram-v2
  [*] --> ATIVA: Oferecer como modelo (CA01) ou repasse ao arquivar com preço 0 (CA05)
  ATIVA --> ATIVA: remix debita comprador e credita autor em 1 lançamento (CA03) · cópia conforme licença (CA04) · contadores (CA06)
  ATIVA --> ATIVA: destacado por EMPRESA/CHEFE → indicação RF39 · ao aprovar, shelf passa a CHANCELADO (CA07)
  ATIVA --> RETIRADA: autor retira a oferta (cópias permanecem, CA06)
  ATIVA --> ESGOTADA: availableUntil vencido ou limite de cópias da oferta
  RETIRADA --> ATIVA: autor oferece de novo
  RETIRADA --> [*]
  ESGOTADA --> [*]
  note right of ATIVA
    shelf COMUNIDADE (empregado) ou CHANCELADO (SealBond APROVADA).
    409 SALDO_INSUFICIENTE · 409 ITEM_INDISPONIVEL.
    Sem moeda real, sem gateway (CA08).
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FRONT["Frontend Next.js 15"]
    R1["app/(shell)/models (prateleiras) · store (atalho) · tasks/[id] · projects/[id] (ação Oferecer) · profile (Meus modelos oferecidos)"]
    R2["components: OfferForm · ModelShelf · TaskCard/ProjectCard (variants NO_BALCAO · CHANCELADO · REMIX) · DpChip · Tag repasse · Seal · Counters · Dialog (saldo)"]
    BFF["app/bff"]
    R1 --> R2 --> BFF
  end
  subgraph WEB["ws-web"]
    MC["ModelCounterController (@Operation RF40.CA01-CA08)"]
    SEC["SecurityConfig · CorrelationIdFilter · GlobalExceptionHandler (main)"]
  end
  subgraph APPL["ws-application"]
    MS["counter/ModelCounterService"]
    LE["counter/LicenseEnforcer"]
    DPS["points/DeciaPointsService (transfer idempotente, RF42)"]
    SBS["seals/SealBondService.indicate (RF39)"]
    TSM["acervo/TaskStateMachine (OFERECIDA)"]
    VF["social/VisibilityFilter"]
    GD["security/Guard (main: ownerOrAdmin · planejado: requireIssuerOrCurator)"]
    AUD["audit/AuditLogPort (main)"]
    DE["events/DomainEvents AFTER_COMMIT"]
    PORTS["ports: CachePort · SearchIndexPort · NotificationPort"]
  end
  subgraph DOM["ws-domain"]
    ENT["ModelOffer · ModelLicense · Shelf · OfferStatus · Remix · DeciaPointsLedgerEntry · TaskItem.offeredInCounter · ProcessKit (planejado)"]
  end
  subgraph INFRA["ws-infrastructure"]
    MY["persistence-mysql model_offers · remixes · decia_points_ledger (V__rf40)"]
    RD["cache-redis saldo · contadores (flag redis.enabled)"]
    OSA["search-opensearch ws-models (flag opensearch.enabled)"]
    CASA["persistence-cassandra notifications (flag cassandra.enabled)"]
  end
  BFF --> MC --> SEC
  MC --> MS
  MS --> LE
  MS --> DPS
  MS --> SBS
  MS --> TSM
  MS --> VF
  MS --> GD
  MS --> AUD
  MS --> DE
  MS --> PORTS
  MS --> ENT --> MY --> MYSQL[("MySQL 8")]
  PORTS --> RD --> REDIS[("Redis")]
  PORTS --> OSA --> OPENS[("OpenSearch")]
  DE --> CASA --> CASS[("Cassandra")]
```

## 6. Rastreabilidade

| CA | Classe | Passo | Mensagem | Transição | Componente |
|---|---|---|---|---|---|
| RF40.CA01 | `ModelOffer` (pricePoints, license, usageDescription, visibility, availableFrom/Until), `ModelCounterService.offer`, `TaskState OFERECIDA` + `TaskStateLog`, `offeredInCounter` | A1 → F1 → P1 (403) → P2 (422) → P3 | 1–11 | `[*] → ATIVA` | `OfferForm`, `MS`, `TSM` |
| RF40.CA02 | `Shelf COMUNIDADE/CHANCELADO`, `ModelCounterService.browse`, filtros e ordenação (remixes · reações · recentes), `SealBond APROVADA` | A2 → A3 → A6 → F2 → P4 | 12–17 | nota de ATIVA | `ModelShelf`, `OSA`, `RD` |
| RF40.CA03 | `DeciaPointsService.transfer` (COMPRA_LOJA + VENDA_BALCAO, `counterpartyUserId`, `idempotencyKey`), 409 SALDO_INSUFICIENTE, grátis → `reuseCount` | A7 → F3 → P5 (409 ITEM_INDISPONIVEL) → P6 → P7 (409 SALDO_INSUFICIENTE) → P8/P9 | 18–31 | `ATIVA → self (remix)` | `DPS`, `Dialog (saldo)` |
| RF40.CA04 | `LicenseEnforcer.copy`, `ModelLicense` (SOMENTE_LEITURA referência · ATRIBUICAO crédito imutável · COPIA_LIVRE), `Remix`, `originalTaskId/originalProjectId` | P10 → P11 → P12/P13/P14 → P15 | 32–40 | `ATIVA → self (cópia conforme licença)` | `LE` |
| RF40.CA05 | `ModelCounterService.handoverOnArchive`, `ModelOffer.isHandover`, preço 0, etiqueta repasse (RF41) | A8 → A9 → F4 → P16 | — (fluxo de arquivar do RF41) | `[*] → ATIVA (repasse)` | `Tag repasse`, `MS` |
| RF40.CA06 | `ModelOffer.viewsCount/remixCount/pointsEarned`, `ModelCounterService.myOffers/withdraw`, `OfferStatus RETIRADA` | A10 → A11 → F5 → P17 | 41–45 | `ATIVA → RETIRADA` | `MyOffers (Counters)`, `R1 profile` |
| RF40.CA07 | `ModelCounterService.highlight`, `highlightedBy`, `SealBondService.indicate` (INDICACAO → RF39), `Shelf CHANCELADO`, crédito preservado | A12 → F6 → P18 | 46–50 | `ATIVA → self (destacado → chancelado)` | `SBS`, `GD` |
| RF40.CA08 | invariante: sem campo monetário, sem gateway; todo movimento é `DeciaPointsLedgerEntry` com `AuditLog`/`correlationId` | P19 | 27–29, 39 | nota de ATIVA | `DPS`, `AUD`, `MY` |
