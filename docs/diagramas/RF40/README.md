# RF40 — Oferecer tarefas, projetos e kits como modelos no Balcão de Modelos (marketplace interno em DECIA Points, sem dinheiro) e reutilizá-los com crédito ao autor
**HU:** HU40 · **Sprint (board Work Station):** Product Backlog (não priorizado — pós-Sprint 4) · **Equivalente FAI:** estado "À venda" da peça (RF4.CA8 / RF31), sub-aba "Peças à venda" do perfil, Arara do Desapego do Meu Quarto e o remix · **Aba/rota:** Balcão de Modelos (`/models`, também acessível pela Loja Work Station), sub-aba "Meus modelos oferecidos" no perfil (RF19)
**Critérios de aceite cobertos:** RF40.CA01 · RF40.CA02 · RF40.CA03 · RF40.CA04 · RF40.CA05 · RF40.CA06 · RF40.CA07 · RF40.CA08

> Contexto Balcão & Loja & DECIA Points (bounded context 7). Entidade central: `ModelOffer` (status ATIVA → RETIRADA | ESGOTADA) sobre um alvo `TASK | PROJECT | KIT`. A oferta liga `TaskItem.offeredInCounter = true` (etiqueta `OFERECIDA`) sem destruir o estado de trabalho. O remix é uma **transferência** no ledger de DECIA Points (`DeciaPointsService`: débito do comprador + crédito do autor na mesma transação, `counterpartyUserId`, `idempotencyKey`), registrada em `Remix`. Não existe moeda real nem gateway (RF40.CA08).

## 1. Diagrama de classes

```mermaid
classDiagram
  direction LR

  class ModelOffer {
    <<entity>>
    +UUID id
    +UUID ownerId
    +OfferTargetType targetType
    +UUID targetId
    +int pricePoints
    +ModelLicense license
    +String usageDescription
    +OfferVisibility visibility
    +Shelf shelf
    +boolean isHandover
    +Instant availableFrom
    +Instant availableUntil
    +OfferStatus status
    +long viewsCount
    +int remixCount
    +long pointsEarned
    +UUID highlightedBy
  }
  class Remix {
    <<entity>>
    +UUID id
    +UUID actorId
    +String sourceType
    +UUID sourceId
    +String resultType
    +UUID resultId
    +UUID modelOfferId
    +UUID ledgerEntryId
    +Instant at
  }
  class DeciaPointsLedgerEntry {
    <<entity>>
    +UUID id
    +UUID userId
    +int delta
    +PointsEvent eventCode
    +String refType
    +UUID refId
    +String idempotencyKey
    +String status
    +UUID counterpartyUserId
    +String correlationId
  }
  class TaskItem {
    <<entity>>
    +UUID id
    +UUID ownerId
    +String title
    +TaskState state
    +boolean offeredInCounter
    +UUID originalTaskId
    +SourceKind sourceKind
    +int reuseCount
    +Visibility visibility
    +String sealIdsJson
  }
  class ProjectScheme {
    <<entity>>
    +UUID id
    +UUID ownerId
    +String title
    +boolean offeredInCounter
    +UUID originalProjectId
    +SchemeOrigin origin
    +String sealIdsJson
  }
  class ProcessKit {
    <<entity>>
    +UUID id
    +UUID ownerId
    +String name
    +boolean offeredInCounter
    +int remixCount
    +String sealIdsJson
  }
  class KitItem {
    <<entity>>
    +UUID kitId
    +UUID taskId
    +ProjectPhase phase
    +int sortOrder
  }
  class ProjectTask {
    <<entity>>
    +UUID projectId
    +UUID taskId
    +ProjectPhase phase
    +String snapshotJson
  }
  class TaskStateLog {
    <<entity>>
    +UUID taskId
    +TaskState fromState
    +TaskState toState
    +UUID actorId
    +String reason
    +String correlationId
  }
  class SealBond {
    <<entity>>
    +UUID id
    +UUID targetId
    +SealBondBasis basis
    +SealBondStatus status
  }
  class StoreItem {
    <<entity>>
    +UUID id
    +StoreItemKind kind
    +UUID refId
    +int pricePoints
  }
  class Notification {
    <<entity>>
    +UUID recipientId
    +String category
    +String resourceType
    +UUID resourceId
  }
  class AuditLog {
    <<entity>>
    +UUID actorId
    +String action
    +String resourceType
    +UUID resourceId
    +String correlationId
  }

  class ModelLicense {
    <<enum>>
    COPIA_LIVRE
    ATRIBUICAO
    SOMENTE_LEITURA
  }
  class OfferStatus {
    <<enum>>
    ATIVA
    RETIRADA
    ESGOTADA
  }
  class Shelf {
    <<enum>>
    COMUNIDADE
    CHANCELADO
  }
  class OfferVisibility {
    <<enum>>
    DEPARTAMENTO
    EMPRESA
    PUBLICO
  }
  class OfferTargetType {
    <<enum>>
    TASK
    PROJECT
    KIT
  }
  class TaskState {
    <<enum>>
    DISPONIVEL
    EM_USO
    CONCLUIDA
    ARQUIVADA
    MODELO_PUBLICO
    OFERECIDA
    ...2 valores
  }
  class PointsEvent {
    <<enum>>
    VENDA_BALCAO
    COMPRA_LOJA
    ESTORNO
    ...16 valores
  }

  class ModelOfferController {
    <<controller>>
    +POST model_offers
    +GET model_offers
    +GET model_offers_id
    +POST model_offers_id_remix
    +DELETE model_offers_id
    +POST model_offers_id_highlight
    +GET me_model_offers
  }
  class CounterService {
    <<service>>
    +offer(owner, targetType, targetId, form) ModelOffer
    +offerHandover(owner, taskId) ModelOffer
    +browse(shelf, filters, sort, page) Page~ModelOffer~
    +remix(offerId, buyer, idempotencyKey) Remix
    +takeToProject(offerId, buyer, projectId, phase) ProjectTask
    +withdraw(offerId, owner) ModelOffer
    +highlight(offerId, issuer) SealBond
    +myOffers(owner) List~ModelOffer~
  }
  class DeciaPointsService {
    <<service>>
    +balance(userId) int
    +transfer(from, to, points, refType, refId, idempotencyKey) TransferResult
  }
  class AcervoService {
    <<service>>
    +copyTask(sourceId, newOwner, license) TaskItem
    +copyProject(sourceId, newOwner, license) ProjectScheme
    +copyKit(sourceId, newOwner, license) ProcessKit
  }
  class TaskStateMachine {
    <<service>>
    +markOffered(taskId, actor) TaskStateLog
    +unmarkOffered(taskId, actor) TaskStateLog
  }
  class SealService {
    <<service>>
    +nominate(targetId, sealId, actor) SealBond
  }

  ModelOffer --> ModelLicense : license
  ModelOffer --> OfferStatus : status
  ModelOffer --> Shelf : shelf
  ModelOffer --> OfferVisibility : visibility
  ModelOffer --> OfferTargetType : targetType
  ModelOffer ..> TaskItem : targetType TASK
  ModelOffer ..> ProjectScheme : targetType PROJECT
  ModelOffer ..> ProcessKit : targetType KIT
  ModelOffer "1" --> "*" Remix : modelOfferId
  Remix --> DeciaPointsLedgerEntry : ledgerEntryId
  DeciaPointsLedgerEntry --> PointsEvent : eventCode
  DeciaPointsLedgerEntry ..> DeciaPointsLedgerEntry : counterpartyUserId
  TaskItem --> TaskState : state
  TaskItem ..> TaskItem : originalTaskId (crédito)
  ProjectScheme ..> ProjectScheme : originalProjectId (crédito)
  ProcessKit "1" --> "*" KitItem : kitId
  ProjectScheme "1" --> "*" ProjectTask : projectId
  TaskItem "1" --> "*" TaskStateLog : taskId
  ModelOffer ..> SealBond : highlightedBy → INDICACAO
  StoreItem ..> ModelOffer : kind MODELO_BALCAO

  ModelOfferController --> CounterService
  CounterService --> DeciaPointsService
  CounterService --> AcervoService
  CounterService --> TaskStateMachine
  CounterService --> SealService : destaque (RF39)
  CounterService ..> ModelOffer
  CounterService ..> Remix
  CounterService ..> Notification
  CounterService ..> AuditLog

  note for ModelOffer "tabela model_offers · pricePoints 0 = grátis · isHandover = repasse (preço 0) · nenhum campo de moeda real"
  note for DeciaPointsLedgerEntry "tabela decia_points_ledger · débito e crédito na mesma transação com o mesmo correlationId · idempotencyKey única"
  note for TaskItem "tabela tasks · +45 campos · offeredInCounter mantém o estado de trabalho (etiqueta OFERECIDA)"
  note for OfferStatus "nomes OfferStatus, Shelf, OfferVisibility e OfferTargetType a confirmar · TAXONOMIA só lista valores"
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  classDef err fill:#FFE3E3,stroke:#C0392B,color:#5B1A12
  classDef store fill:#EEF6FF,stroke:#4A4852,color:#1F2937

  subgraph L_owner["Ator humano · EMPREGADO autor"]
    O1["Em tarefa, projeto ou kit meu: Oferecer como modelo"]
    O2["Define preço em DP (0 = grátis), licença, descrição de uso, visibilidade, período"]
    O3["Arquiva uma tarefa → sistema oferece: repassar ao Balcão?"]
    O4["Perfil › Meus modelos oferecidos: visualizações, remixes, DP recebidos · Retirar oferta"]
  end

  subgraph L_buyer["Ator humano · EMPREGADO comprador · EMPRESA/CHEFE"]
    B1["Abre o Balcão: prateleiras Chancelados × Comunidade, filtros e ordenação"]
    B2{"Ação no modelo?"}
    B3["Remixar (copiar para o meu acervo)"]
    B4["Levar ao projeto como referência"]
    B5["EMPRESA/CHEFE: Destacar modelo da comunidade"]
    B6["Atalho: ganhar pontos no DECIA"]
  end

  subgraph L_web["Web/BFF · Next.js /models · /store · perfil"]
    W1["POST /model-offers (targetType, targetId, pricePoints, license, usageDescription, visibility, período, isHandover)"]
    W2["GET /model-offers?shelf=&category=&type=&department=&license=&price=&sort=remixes|reactions|recent"]
    W3["POST /model-offers/id/remix (Idempotency-Key)"]
    W4["POST /model-offers/id/take-to-project (projectId, phase)"]
    W5["DELETE /model-offers/id"]
    W6["POST /model-offers/id/highlight"]
    W7["GET /me/model-offers"]
  end

  subgraph L_app["ws-application · CounterService · DeciaPointsService · AcervoService · TaskStateMachine"]
    S1{"Ator é dono do alvo e alvo não é RASCUNHO?"}
    S2{"availableUntil maior que availableFrom e pricePoints maior ou igual a 0?"}
    S3["Cria ModelOffer ATIVA · shelf COMUNIDADE (CHANCELADO se SealBond APROVADA) · offeredInCounter true · TaskStateMachine.markOffered (etiqueta OFERECIDA, estado de trabalho preservado) · task_state_log"]
    S4["Repasse: ModelOffer isHandover true, pricePoints 0, etiqueta repasse"]
    S5["browse: filtra por visibilidade do comprador (DEPARTAMENTO, EMPRESA, PUBLICO) · OpenSearch + contadores"]
    S6{"Oferta ATIVA, dentro do período e visível ao comprador?"}
    S7{"idempotencyKey já processada?"}
    S8{"pricePoints maior que 0?"}
    S9{"Saldo do comprador maior ou igual ao preço?"}
    S10["DeciaPointsService.transfer: débito COMPRA_LOJA no comprador + crédito VENDA_BALCAO no autor, mesma transação, mesmo correlationId, counterpartyUserId"]
    S11["Modelo grátis: só reuseCount do alvo (RF23) · sem lançamento"]
    S12{"Licença?"}
    S13["COPIA_LIVRE: AcervoService.copy* editável · originalTaskId para crédito"]
    S14["ATRIBUICAO: cópia com originalTaskId imutável e crédito visível"]
    S15["SOMENTE_LEITURA: sem cópia · só ProjectTask referência não editável (Levar ao projeto)"]
    S16["Remix registrado · remixCount+1 · pointsEarned · Notification ao autor · audit_log"]
    S17["withdraw: ModelOffer RETIRADA · offeredInCounter false · unmarkOffered · cópias já feitas permanecem"]
    S18{"Ator é EMPRESA ou CHEFE?"}
    S19["highlightedBy · SealService.nominate (basis INDICACAO) → fluxo RF39 · crédito do autor preservado"]
    E1["403 ACESSO_NEGADO"]
    E2["422 VALIDACAO"]
    E3["409 OFERTA_INDISPONIVEL"]
    E4["409 SALDO_INSUFICIENTE (mensagem clara + atalho para o DECIA)"]
    E5["409 LICENCA_NAO_PERMITE"]
  end

  subgraph L_db["Persistência"]
    D1["MySQL model_offers · tasks.offeredInCounter · task_state_log"]
    D2["OpenSearch índice de ofertas (filtros, ordenação) · Redis cache de contadores"]
    D3["MySQL decia_points_ledger (2 linhas, mesmo correlationId) · Redis saldo:userId"]
    D4["MySQL tasks/project_schemes/process_kits cópia · project_tasks referência · remixes"]
    D5["MySQL seal_bonds (INDICACAO) · audit_log · DomainEventOutbox → notifications"]
  end

  O1 --> O2 --> W1 --> S1
  O3 -- "sim" --> W1
  S1 -- "não" --> E1
  S1 -- "sim" --> S2
  S2 -- "não" --> E2
  S2 -- "sim" --> S3 --> D1
  W1 -- "isHandover" --> S4 --> S3
  S3 --> D2

  B1 --> W2 --> S5 --> D2
  S5 --> B2
  B2 -- "remixar" --> B3 --> W3 --> S6
  B2 -- "levar ao projeto" --> B4 --> W4 --> S6
  B2 -- "destacar" --> B5 --> W6 --> S18
  S6 -- "não" --> E3
  S6 -- "sim" --> S7
  S7 -- "sim" --> X1(["Retorna o Remix existente (idempotente)"])
  S7 -- "não" --> S8
  S8 -- "sim" --> S9
  S8 -- "não" --> S11 --> S12
  S9 -- "não" --> E4 --> B6
  S9 -- "sim" --> S10 --> D3
  S10 --> S12
  S12 -- "COPIA_LIVRE" --> S13 --> S16
  S12 -- "ATRIBUICAO" --> S14 --> S16
  S12 -- "SOMENTE_LEITURA e ação remixar" --> E5
  S12 -- "SOMENTE_LEITURA e ação levar ao projeto" --> S15 --> S16
  S16 --> D4
  S16 --> D5

  O4 --> W7 --> S5
  O4 -- "retirar" --> W5 --> S17 --> D1
  S18 -- "não" --> E1
  S18 -- "sim" --> S19 --> D5

  class E1,E2,E3,E4,E5 err
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
  participant DB as Repository/MySQL
  participant OS as OpenSearch
  participant R as Redis
  participant EV as DomainEvents (AFTER_COMMIT)

  Note over U,EV: Oferecer como modelo
  U->>N: Oferecer tarefa T como modelo (20 DP, ATRIBUICAO, EMPRESA)
  N->>C: POST /model-offers
  C->>S: CounterService.offer(owner, TASK, taskId, form)
  alt não é dono ou tarefa RASCUNHO
    S-->>N: 403 ACESSO_NEGADO
  else ok
    S->>DB: INSERT model_offers (ATIVA, shelf COMUNIDADE) · UPDATE tasks offeredInCounter=true · INSERT task_state_log (etiqueta OFERECIDA)
    S->>EV: ModelOffered(offerId)
    EV-->>OS: index model_offers (categoria, tipo, departamento, licença, preço, remixes, reações)
    S-->>N: 201 ModelOffer
  end

  Note over U,EV: Navegar no Balcão
  U->>N: Prateleira Comunidade, filtro Licitação, ordenar por remixes
  N->>C: GET /model-offers?shelf=COMUNIDADE&process=LICITACAO&sort=remixes
  C->>S: browse(shelf, filters, sort, page)
  S->>OS: query com filtro de visibilidade do comprador
  OS-->>S: ids ordenados
  S->>DB: SELECT model_offers + snapshot dos alvos
  S-->>N: 200 página (20)

  Note over U,EV: Remixar (débito e crédito na mesma transação)
  U->>N: Remixar modelo T
  N->>C: POST /model-offers/id/remix (Idempotency-Key k)
  C->>S: CounterService.remix(offerId, buyer, k)
  S->>R: SET NX remix:k (lock)
  S->>DB: SELECT model_offers FOR UPDATE (ATIVA, período, visibilidade)
  alt oferta RETIRADA ou fora do período
    S-->>N: 409 OFERTA_INDISPONIVEL
  else licença SOMENTE_LEITURA
    S-->>N: 409 LICENCA_NAO_PERMITE (use Levar ao projeto)
  else pricePoints maior que 0
    S->>DB: SELECT saldo do comprador (SUM delta CONFIRMADO) FOR UPDATE
    alt saldo menor que preço
      S-->>N: 409 SALDO_INSUFICIENTE (mensagem clara + atalho para ganhar pontos no DECIA)
    else saldo ok
      S->>DB: INSERT decia_points_ledger débito comprador (COMPRA_LOJA, −20, idempotencyKey k:debit, counterpartyUserId autor, correlationId c)
      S->>DB: INSERT decia_points_ledger crédito autor (VENDA_BALCAO, +20, idempotencyKey k:credit, counterpartyUserId comprador, correlationId c)
      S->>DB: INSERT tasks cópia (originalTaskId, sourceKind REMIX, crédito imutável por ATRIBUICAO) · UPDATE tasks.reuseCount+1
      S->>DB: INSERT remixes (ledgerEntryId) · UPDATE model_offers remixCount+1, pointsEarned+20
      S->>R: INCRBY saldo:comprador −20 · INCRBY saldo:autor +20 · DEL lock
      S->>EV: ModelRemixed(remixId)
      EV-->>DB: notifications (autor: seu modelo foi reutilizado, +20 DP) · audit_log (correlationId c)
      S-->>N: 201 Remix (cópia no acervo do comprador)
    end
  end

  Note over U,EV: Retirar oferta
  U->>N: Retirar oferta
  N->>C: DELETE /model-offers/id
  C->>S: withdraw(offerId, owner)
  S->>DB: UPDATE model_offers RETIRADA · tasks.offeredInCounter=false · task_state_log
  S->>EV: ModelWithdrawn(offerId)
  EV-->>OS: remove do índice
  S-->>N: 200 (cópias já feitas permanecem)
```

## 4. Máquina de estados

Entidade central: `ModelOffer.status`. A região inferior mostra o efeito sobre `TaskItem` (`offeredInCounter` + etiqueta `OFERECIDA`, estado de trabalho preservado) e o encaminhamento para chancela (RF39) quando EMPRESA/CHEFE destaca o modelo.

```mermaid
stateDiagram-v2
  direction LR

  state "ModelOffer.status" as Offer {
    [*] --> ATIVA : POST /model-offers (preço, licença, visibilidade, período) · ou repasse ao arquivar (isHandover, preço 0)
    ATIVA --> ATIVA : remix (remixCount+1, pointsEarned) · visualização (viewsCount)
    ATIVA --> RETIRADA : dono retira (cópias já feitas permanecem)
    ATIVA --> ESGOTADA : availableUntil atingido · repasse levado por alguém
    ATIVA --> ATIVA : EMPRESA/CHEFE destaca (highlightedBy) → SealBond INDICACAO (RF39)
    ATIVA --> ATIVA : SealBond APROVADA → shelf CHANCELADO (modelo oficial)
    RETIRADA --> [*]
    ESGOTADA --> [*]
  }

  state "TaskItem alvo (RF41)" as Target {
    [*] --> EstadoDeTrabalho : DISPONIVEL, EM_USO, CONCLUIDA ou MODELO_PUBLICO
    EstadoDeTrabalho --> Oferecida : offeredInCounter = true (etiqueta OFERECIDA)
    Oferecida --> EstadoDeTrabalho : oferta RETIRADA ou ESGOTADA
    EstadoDeTrabalho --> Arquivada : arquivar → pergunta repassar ao Balcão?
    Arquivada --> Oferecida : repasse aceito (isHandover)
  }

  Offer --> Target : sincroniza offeredInCounter

  note right of Offer
    Nenhum campo de moeda real e nenhum gateway (RF40.CA08):
    toda transação é lançamento no ledger de DECIA Points
    com audit_log e correlationId.
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FE["Frontend Next.js"]
    FE1["app/models (Balcão: prateleiras, filtros, ordenação) · app/store (atalho) · app/profile (Meus modelos oferecidos) · ação Oferecer como modelo em tasks, projects, kits"]
    FE2["components/ui · ModelCard (preço em ficha DP, licença, etiqueta repasse, estrela chancelado) · OfferDialog · LicenseBadge · BalanceHint (atalho para o DECIA)"]
  end

  subgraph WEB["ws-web"]
    C1["ModelOfferController"]
  end

  subgraph APP["ws-application"]
    S1["CounterService"]
    S2["DeciaPointsService (RF42) · transfer idempotente"]
    S3["AcervoService (RF41) · cópia por licença"]
    S4["TaskStateMachine (RF41)"]
    S5["SealService (RF39) · nominate"]
  end

  subgraph DOM["ws-domain · br.gov.pr.secid.workstation"]
    D1["ModelOffer · Remix"]
    D2["DeciaPointsLedgerEntry"]
    D3["TaskItem · ProjectScheme · ProcessKit · KitItem · ProjectTask · TaskStateLog"]
    D4["SealBond · StoreItem"]
  end

  subgraph INFRA["ws-infrastructure/*"]
    I1["persistence-mysql · model_offers, remixes, decia_points_ledger, tasks, project_schemes, process_kits"]
    I2["search-opensearch · índice de ofertas (filtros e ordenação)"]
    I3["cache-redis · saldo por usuário · lock de idempotência · contadores"]
    I4["platform · DomainEventOutbox · AuditLog · i18n"]
  end

  FE1 --> C1
  FE2 -.-> FE1
  C1 --> S1
  S1 --> S2
  S1 --> S3
  S1 --> S4
  S1 --> S5
  S1 --> D1
  S2 --> D2
  S3 --> D3
  S4 --> D3
  S5 --> D4
  D1 --> I1
  D2 --> I1
  D3 --> I1
  D4 --> I1
  S1 --> I2
  S1 --> I3
  S2 --> I3
  S1 --> I4
```

## 6. Rastreabilidade

| CA | Elemento do diagrama (classe / passo / mensagem / transição / componente) |
|---|---|
| RF40.CA01 | Classes `ModelOffer` (pricePoints, license, usageDescription, visibility, availableFrom/Until, targetType TASK/PROJECT/KIT), `TaskItem.offeredInCounter`, `TaskState.OFERECIDA`, `TaskStateMachine.markOffered`, `CounterService.offer`; atividades O1, O2, W1, S1 (403), S2 (422), S3; sequência msgs 1–8; transições `[*] → ATIVA` e `EstadoDeTrabalho → Oferecida` (estado de trabalho preservado); componentes `OfferDialog`, `ModelOfferController`. |
| RF40.CA02 | Classes `ModelOffer.shelf` (COMUNIDADE, CHANCELADO), enum `Shelf`, `CounterService.browse`; atividades B1, W2 (filtros categoria, tipo, departamento, licença, preço; ordenação remixes/reações/recentes), S5; sequência msgs 9–15 (OpenSearch); componentes `app/models`, `search-opensearch`, `ModelCard`. |
| RF40.CA03 | Classes `DeciaPointsService.transfer`, `DeciaPointsLedgerEntry` (counterpartyUserId, idempotencyKey, correlationId, eventCode COMPRA_LOJA/VENDA_BALCAO), `Remix.ledgerEntryId`, `TaskItem.reuseCount`; atividades S7 (idempotência), S8, S9 → E4 (409 SALDO_INSUFICIENTE + atalho B6), S10, S11 (grátis: só reuseCount); sequência msgs 16–20, 23–31 (SELECT saldo FOR UPDATE, 409 SALDO_INSUFICIENTE, 2 lançamentos com mesmo correlationId); componentes `DeciaPointsService`, `cache-redis · saldo e lock`, `BalanceHint`. |
| RF40.CA04 | Enum `ModelLicense`, `AcervoService.copyTask/copyProject/copyKit`, `CounterService.takeToProject`, `TaskItem.originalTaskId` (crédito imutável), `ProjectTask.snapshotJson`; atividades S12 → S13 (COPIA_LIVRE), S14 (ATRIBUICAO), S15 (SOMENTE_LEITURA só Levar ao projeto), E5 (409 LICENCA_NAO_PERMITE); sequência msgs 22 e 27 (cópia com crédito imutável por ATRIBUICAO); componente `LicenseBadge`. |
| RF40.CA05 | Classes `ModelOffer.isHandover`, `CounterService.offerHandover`; atividades O3, S4 (preço 0, etiqueta repasse); transições `EstadoDeTrabalho → Arquivada → Oferecida` (repasse aceito) e `ATIVA → ESGOTADA` (repasse levado); componente `ModelCard` (etiqueta repasse). |
| RF40.CA06 | Classes `ModelOffer.viewsCount/remixCount/pointsEarned/status`, `CounterService.myOffers/withdraw`, `OfferStatus`; atividades O4, W7, W5, S17 (cópias permanecem); sequência msgs 32–38; transição `ATIVA → RETIRADA`; componentes `app/profile (Meus modelos oferecidos)`, `GET me_model_offers`. |
| RF40.CA07 | Classes `ModelOffer.highlightedBy`, `CounterService.highlight`, `SealService.nominate`, `SealBond.basis` INDICACAO; atividades B5, W6, S18 (403 para não EMPRESA/CHEFE), S19 (crédito do autor preservado); transições `ATIVA → ATIVA` (destaque → INDICACAO; APROVADA → shelf CHANCELADO); componente `SealService (RF39)`. |
| RF40.CA08 | Nota da classe `ModelOffer` (nenhum campo de moeda real), `DeciaPointsLedgerEntry.correlationId`, `AuditLog`; atividade S10 e D3/D5 (ledger + audit_log); sequência msg 30 (audit_log correlationId); nota da máquina de estados (nenhum gateway); componentes `platform · AuditLog` — não há componente de pagamento no diagrama. |


Tela/aba: `/models` (esqueleto em `app/(shell)/models/page.tsx`) · `/profile` (esqueleto em `app/(shell)/profile/page.tsx`) · `/store` (esqueleto em `app/(shell)/store/page.tsx`)
