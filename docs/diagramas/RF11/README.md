# RF11 — Utilizar o editor de arte de fundo para personalizar esquemas de tarefas e projetos
**HU:** HU11 · **Sprint (board Work Station):** lista *Requisitos Funcionais* sem sprint atribuída (card renumerado; o card "SPRINT 2" cita "RF11 Resumo analítico", escopo antigo — `RENUMERACAO.md`; origem `_anterior/RF38` Estúdio de Arte do Card) · **Equivalente FAI:** RF11 Background Studio (`PUT /api/pieces/{id}/background`, `backgroundConfigJson`, `resolveCardArt`, `CARD_SKINS`, `containerColorOf`, `inkOn`) + editor da arte do card da peça · **Aba/rota:** Estúdio do card dentro de `/tasks/[id]/edit` (etapa 5 "Arte do card" do criador, RF4) e `/projects/[id]/edit`; API `PUT /api/tasks/{id}/card-art`, `PUT /api/projects/{id}/card-art`, `POST /api/card-art/ai` (arte com IA), `POST /api/card-art/upload`
**Critérios de aceite cobertos:** RF11.CA01 · RF11.CA02 · RF11.CA03 · RF11.CA04 · RF11.CA05 · RF11.CA06 — corpo do card vazio: CAs derivados do título + HU11 + RF38.CA02/CA04/CA08/CA10 + `docs/design-system/ANATOMIAS_E_ESTUDIO.md` §6 (Estúdio de Arte do card), marcados **(CA a confirmar)**. Todas as classes do RF são **(planejado)**; reais: `UserPreferences.defaultCardSkin/reduceMotion` (Bloco 3), `Guard.ownerOrAdmin`, `AiProvidersConfig`, `S3StorageConfig`, `RedisAdaptersConfig`.

> **HU11** — COMO usuário criando um esquema de tarefa ou projeto POSSO utilizar o editor de arte de fundo PARA personalizar background de esquemas de tarefas ou projetos.

O **Estúdio de Arte do card** grava `cardArtJson` (`CardArtConfig`, **proposta**: `v`, `layout`, `fundo`, `container`, `destaques`) na `TaskItem` (`coverMode`, `cardSkin`, `coverUrl`) ou no `ProjectScheme` (`coverMode` MOSAICO/FOTO/IA, `coverUrl`, `mosaicJson`). A renderização é determinística (`CardArtResolver.resolveCardArt`) e a mesma em feed, Mural, Vitrine, Balcão e Mesa. A **arte com IA** usa o `AiEngine` capability `CAPA_IA` sob a governança de `accessClass` e `AiQuota`.

## Critérios de aceite derivados da HU11 (todos "CA a confirmar")

| CA | Enunciado (Dado / Quando / Então) |
|---|---|
| **RF11.CA01** (CA a confirmar) | Dado o dono de uma tarefa ou projeto (`ownerId`), quando abre o Estúdio do card, então vê os segmentos **Fundo · Layout · Container · Destaques** com prévia ao vivo (card do feed + ampliado); o rascunho é local (Cancelar não grava; Restaurar padrão só no rascunho); **Aplicar** envia `PUT /api/tasks/{id}/card-art` ou `PUT /api/projects/{id}/card-art` com `CardArtConfig` + `baseRev`; quem não é dono → `403 ACESSO_NEGADO`; `rev` divergente → `409 REVISAO_DESATUALIZADA`; JSON fora do schema → `422 VALIDACAO`. |
| **RF11.CA02** (CA a confirmar) | Dado o segmento **Fundo**, então o usuário escolhe cor sólida (8 cores de departamento + 6 neutras), gradiente (`marca`, `dept`, `spark`), textura (`papel`, `cortica`, `blueprint`, `timbrado`), terminal, monograma, malha de nós (`argumento`, `consenso`, `misto` + densidade 1–3), mosaico automático, imagem enviada ou arte com IA; `resolveCardArt` aplica a precedência (base `color → gradient → texture/terminal/monograma`; imagem `ai/upload → mesh → mosaic`); layouts com `ownArt` (GRADE, PRANCHA, LINHA_TEMPO) desligam o Fundo com explicação; layouts sem dado ficam desabilitados com motivo (`effectiveLayout`). |
| **RF11.CA03** (CA a confirmar) | Dado o segmento **Container**, então o usuário escolhe a skin (`timbrado` padrão, `protocolo`, `carimbo`, `blueprint`, `noturno`; `contraste` forçado pelo tema) e a cor do container (nativa, 5 amostras ou livre); a tinta vem de `inkOn(hex)` por luminância (0,299 R + 0,587 G + 0,114 B > 140 → `#1A1714`, senão `#F5F2EC`), garantindo ≥ 4,5:1; skin premium sem `UserSkin` → `403 SKIN_NAO_ADQUIRIDA` com atalho para a Loja (RF42); `UserPreferences.defaultCardSkin` é o valor inicial. |
| **RF11.CA04** (CA a confirmar) | Dado "Arte com IA" (prompt ≤ 300), então o serviço verifica `AiQuota` (créditos antes da cota mensal; sem saldo → `409 COTA_ESGOTADA` + Loja), `accessClass` RESTRITO/SIGILOSO → `LocalEngine` (monograma/paleta, `result BLOQUEADO_SIGILO` para externo), senão `AiEngine CAPA_IA` com tema mascarado; a imagem vai ao S3 (`MediaObject`) e `fundo.aiArt {url, prompt, generatedAt, inferenceId}` é gravado com `AiInferenceLog`; faísca ✦ obrigatória (RF38.CA04); resposta ≤ 30 s ou estado "gerando" com `motion spark`; **imagem enviada** passa por MIME real, tamanho e `PipelineJob ANTIVIRUS` → `422 VALIDACAO` se inválida. |
| **RF11.CA05** (CA a confirmar) | Dado o segmento **Destaques**, então o usuário configura lacre (lugar reservado), tooltip da faísca (curto/completo), barra de fases (projeto), carimbo de estado/decisão (canto/centro/oculto), Hype do autor (respeita `HypeVisibility`) e **movimento** (`none`, `pulse`, `thread`); no máximo **2 destaques decorativos** → `422 LIMITE_DESTAQUES`; o movimento só roda no card ampliado e é desligado por `prefers-reduced-motion` ou `UserPreferences.reduceMotion` (RF38.CA10). |
| **RF11.CA06** (CA a confirmar) | Dado `cardArtJson` gravado, então a API entrega `cardArt` no view da tarefa/projeto, a leitura é tolerante (config sem `v` lê como v1 com padrões PAGINA/MOSAICO + `timbrado`; valor desconhecido → padrão; `color` inválido → null); o mesmo `resolveCardArt` renderiza feed, Mural, Vitrine, Balcão e Mesa; o cache Redis do card é invalidado (`DEL card:task:{id}` / `card:project:{id}`) e `CardArtChanged` (AFTER_COMMIT) dispara `CardArtService.rebuildMosaic` nos projetos que contêm a tarefa (RF38.CA03). |

## 1. Diagrama de classes

```mermaid
classDiagram
  direction LR

  class CardArtController {
    <<controller>>
    +applyTask(id, CardArtRequest, CurrentUser, ctx) CardArtView
    +applyProject(id, CardArtRequest, CurrentUser, ctx) CardArtView
    +generateAi(AiArtRequest, CurrentUser, ctx) AiArtResult
    +upload(MultipartFile, CurrentUser) UploadReceipt
  }
  class CardArtService {
    <<service>>
    +apply(targetType, id, CardArtConfig, baseRev, actor, ctx) CardArtView
    +generateAi(targetType, id, prompt, actor, ctx) AiArtResult
    +rebuildMosaic(projectId) void
    -validate(CardArtConfig) void
    -requireSkin(actor, skinKey) void
  }
  class CardArtResolver {
    <<service>>
    +resolveCardArt(CardArtConfig, target, theme) ResolvedArt
    +effectiveLayout(CardArtConfig, target) CardLayout
    +inkOn(hex) String
    +containerColorOf(skin, color) String
  }
  class CardArtConfig {
    <<value>>
    +int v
    +CardLayout layout
    +ArtKind fundoKind
    +String color
    +String gradient
    +String texture
    +String meshKind
    +int meshDensity
    +JSON aiArt
    +UUID uploadMediaId
    +CardSkin containerSkin
    +String containerColor
    +JSON destaques
    +CardMotion motion
    +int rev
  }
  class AiEngine {
    <<service>>
    +run(AiRequest) AiResponse
    capability CAPA_IA
  }
  class UploadService {
    <<service>>
    +store(file, ownerId) MediaObject
  }
  class Guard {
    <<service>>
    +ownerOrAdmin(CurrentUser, ownerId) void
  }
  class TaskRepositoryPort {
    <<port>>
    +findById(id) Optional
    +save(TaskItem) TaskItem
  }
  class ProjectRepositoryPort {
    <<port>>
    +findById(id) Optional
    +findContaining(taskId) List
    +save(ProjectScheme) ProjectScheme
  }
  class UserSkinRepositoryPort {
    <<port>>
    +owns(userId, skinKind, skinKey) boolean
  }
  class MediaStoragePort {
    <<port>>
    +put(key, bytes, mime) MediaObject
  }
  class QuotaPort {
    <<port>>
    +tryConsume(scope, id, cost) boolean
  }
  class CardCachePort {
    <<port>>
    +evict(key) void
  }
  class PipelineJobPort {
    <<port>>
    +enqueue(type, targetType, targetId) PipelineJob
  }

  class TaskItem {
    <<entity>>
    +UUID id
    +UUID ownerId
    +AccessClassification accessClass
    +CoverMode coverMode
    +String coverUrl
    +String thumbnailUrl
    +String cardSkin
    +JSON cardArtJson
    +long version
  }
  class ProjectScheme {
    <<entity>>
    +UUID id
    +UUID ownerId
    +CoverMode coverMode
    +String coverUrl
    +JSON mosaicJson
    +JSON cardArtJson
    +long version
  }
  class UserPreferences {
    <<entity>>
    +String defaultCardSkin
    +boolean reduceMotion
    +String theme
  }
  class UserSkin {
    <<entity>>
    +UUID userId
    +String skinKind
    +String skinKey
    +String acquiredVia
  }
  class MediaObject {
    <<entity>>
    +String objectKey
    +String mimeType
    +String accessClass
  }
  class AiInferenceLog {
    <<entity>>
    +AiCapability capability
    +AiProvider provider
    +InferenceResult result
    +String quotaSource
  }
  class AiQuota {
    <<entity>>
    +String scope
    +String monthKey
    +int monthlyLimit
    +int consumed
    +int purchasedCredits
  }
  class ArtKind {
    <<enum>>
    COR
    GRADIENTE
    TEXTURA
    TERMINAL
    MONOGRAMA
    MALHA
    MOSAICO
    IMAGEM
    IA
  }
  class CardLayout {
    <<enum>>
    PAGINA
    MOSAICO
    GRADE
    PRANCHA
    LINHA_TEMPO
    POSTIT
  }
  class CardSkin {
    <<enum>>
    TIMBRADO
    PROTOCOLO
    CARIMBO
    BLUEPRINT
    NOTURNO
    CONTRASTE
  }
  class CardMotion {
    <<enum>>
    NONE
    PULSE
    THREAD
  }
  class CoverMode {
    <<enum>>
    AUTO
    MANUAL
    IA
    MOSAICO
    FOTO
  }

  CardArtController --> CardArtService
  CardArtController --> UploadService
  CardArtService --> CardArtResolver
  CardArtService --> Guard
  CardArtService --> AiEngine
  CardArtService --> TaskRepositoryPort
  CardArtService --> ProjectRepositoryPort
  CardArtService --> UserSkinRepositoryPort
  CardArtService --> MediaStoragePort
  CardArtService --> QuotaPort
  CardArtService --> CardCachePort
  CardArtService --> PipelineJobPort
  CardArtService ..> CardArtConfig
  TaskItem ..> CardArtConfig : cardArtJson
  ProjectScheme ..> CardArtConfig : cardArtJson
  CardArtConfig --> ArtKind
  CardArtConfig --> CardLayout
  CardArtConfig --> CardSkin
  CardArtConfig --> CardMotion
  TaskItem --> CoverMode
  ProjectScheme --> CoverMode
  UserPreferences ..> CardSkin : defaultCardSkin
  UserSkin "0..*" --> "1" UserPreferences : skins compradas (RF42)
  CardArtConfig ..> MediaObject : uploadMediaId / aiArt.url
  CardArtService ..> AiInferenceLog
  QuotaPort ..> AiQuota
  note for CardArtConfig "Proposta (ANATOMIAS_E_ESTUDIO §6): esquema versionado por v; leitura tolerante (sem v = v1 com PAGINA/MOSAICO + timbrado). CoverMode: unificação AUTO/MANUAL/IA × MOSAICO/FOTO/IA em aberto (Q-41)."
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph ATOR["Dono da tarefa ou do projeto"]
    A1["Abre o Estúdio do card em /tasks/{id}/edit ou /projects/{id}/edit (etapa 5 no criador)"]
    A2["Ajusta Fundo · Layout · Container · Destaques com prévia ao vivo (rascunho local)"]
    A3["Opcional: Arte com IA (prompt ≤ 300) ou enviar imagem"]
    A4["Aplicar (ou Cancelar / Restaurar padrão)"]
  end
  subgraph FE["Next.js (App Router) · BFF"]
    F1["Carrega cardArt atual + UserPreferences (defaultCardSkin, reduceMotion, theme) + UserSkins"]
    F2["CardArtResolver (cliente) renderiza prévia: card do feed + ampliado · effectiveLayout desabilita opções com motivo"]
    F3["POST /api/card-art/ai {targetType, id, prompt} · POST /api/card-art/upload"]
    F4["PUT /api/tasks/{id}/card-art ou PUT /api/projects/{id}/card-art {CardArtConfig, baseRev}"]
  end
  subgraph WEB["ws-web"]
    W1["JWT + SessionActiveFilter + CurrentUserArgumentResolver"]
    W2["CardArtController"]
    E403["403 ACESSO_NEGADO (não é dono)"]
    E403S["403 SKIN_NAO_ADQUIRIDA (atalho Loja)"]
    E409R["409 REVISAO_DESATUALIZADA (rev)"]
    E409Q["409 COTA_ESGOTADA (atalho Loja)"]
    E422["422 VALIDACAO (schema) · 422 LIMITE_DESTAQUES · 422 imagem inválida"]
  end
  subgraph APP["ws-application · CardArtService"]
    S1["Guard.ownerOrAdmin(actor, target.ownerId)"]
    S2["validate: schema v, layout × ownArt, ≤ 2 destaques decorativos, color válido"]
    S3{"válido?"}
    S4{"baseRev == rev atual?"}
    S5["requireSkin: skin premium exige UserSkin (ou PADRAO)"]
    S6{"skin liberada?"}
    S7["save cardArtJson (rev+1) · coverMode/coverUrl/cardSkin derivados · AuditLog CARD_ART_APPLIED"]
    AI1["generateAi: QuotaPort.tryConsume (créditos antes da cota mensal)"]
    AI2{"saldo?"}
    AI3{"accessClass RESTRITO/SIGILOSO?"}
    AI4["LocalEngine: monograma/paleta · AiInferenceLog BLOQUEADO_SIGILO"]
    AI5["AiEngine CAPA_IA com tema mascarado (≤ 30 s, senão estado 'gerando' + motion spark) · AiInferenceLog"]
    AI6["MediaObject no S3 · fundo.aiArt {url, prompt, generatedAt, inferenceId} · faísca ✦ obrigatória"]
    UP1["UploadService: MIME real · tamanho · PipelineJob ANTIVIRUS"]
    EV["AFTER_COMMIT: CardArtChanged → CardCachePort.evict(card:task|project:{id}) · rebuildMosaic nos projetos que contêm a tarefa (RF38.CA03) · reindexa thumbnail"]
  end
  subgraph PERS["Persistência"]
    P1[("MySQL: tasks/project_schemes (card_art_json, cover_mode, cover_url, card_skin), user_skins, user_preferences, media_objects, ai_inference_log, pipeline_jobs, audit_log")]
    P2[("Redis: card:task:{id} · card:project:{id} · AiQuota")]
    P3[("S3: imagens enviadas e geradas · thumbnails · mosaicos")]
  end

  A1 --> F1 --> F2 --> A2 --> A4 --> F4 --> W1 --> W2 --> S1
  S1 -->|"não"| E403
  S1 --> S2 --> S3
  S3 -->|"não"| E422
  S3 -->|"sim"| S4
  S4 -->|"não"| E409R
  S4 -->|"sim"| S5 --> S6
  S6 -->|"não"| E403S
  S6 -->|"sim"| S7 --> P1
  S7 --> EV --> P2
  EV --> P3
  A3 -->|"IA"| F3 --> W2 --> AI1 --> AI2
  AI1 --> P2
  AI2 -->|"não"| E409Q
  AI2 -->|"sim"| AI3
  AI3 -->|"sim"| AI4 --> AI6
  AI3 -->|"não"| AI5 --> AI6 --> P3
  AI6 --> F2
  A3 -->|"imagem"| F3 --> UP1
  UP1 -->|"inválida"| E422
  UP1 --> P3
  UP1 --> F2
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
  participant RD as Redis
  participant S3 as S3
  participant EV as DomainEvents (AFTER_COMMIT)

  U->>N: abre o Estúdio do card (tarefa)
  N->>C: GET /api/tasks/{id} (cardArt, rev) + GET /api/me/preferences + GET /api/me/skins
  C-->>N: 200 (defaultCardSkin, reduceMotion, skins adquiridas)
  N->>N: prévia ao vivo com resolveCardArt (feed + ampliado), effectiveLayout

  U->>N: "Arte com IA" com prompt
  N->>C: POST /api/card-art/ai {TASK, id, prompt}
  C->>S: CardArtService.generateAi(TASK, id, prompt, actor, ctx)
  S->>R: findById + Guard.ownerOrAdmin
  S->>RD: QuotaPort.tryConsume(userId, CAPA_IA)
  alt sem créditos nem cota
    S-->>C: 409 COTA_ESGOTADA
    C-->>N: 409 (atalho para a Loja, RF42)
  else accessClass RESTRITO ou SIGILOSO
    S->>AI: run(CAPA_IA, modo local)
    AI->>AI: LocalEngine monograma/paleta
    AI->>R: insert ai_inference_log (LOCAL, BLOQUEADO_SIGILO para externo)
    AI-->>S: arte local
  else externo
    S->>AI: run(CAPA_IA, tema mascarado)
    AI->>AI: Claude → Gemini → LocalEngine (≤ 30 s)
    AI->>R: insert ai_inference_log (provider, custo, quotaSource)
    AI-->>S: imagem
  end
  S->>S3: put(cards/{id}/ai-{inferenceId}.webp)
  S->>R: insert media_objects
  S-->>C: AiArtResult {url, prompt, generatedAt, inferenceId}
  C-->>N: 200 (prévia atualizada, faísca ✦ obrigatória)

  U->>N: Aplicar
  N->>C: PUT /api/tasks/{id}/card-art {CardArtConfig, baseRev}
  C->>S: CardArtService.apply(TASK, id, config, baseRev, actor, ctx)
  S->>R: findById(task)
  alt não é dono
    S-->>C: 403 ACESSO_NEGADO
    C-->>N: 403
  else schema inválido ou mais de 2 destaques
    S-->>C: 422 VALIDACAO | 422 LIMITE_DESTAQUES
    C-->>N: 422
  else baseRev divergente (outra janela aplicou)
    S-->>C: 409 REVISAO_DESATUALIZADA {rev atual}
    C-->>N: 409 (recarrega a prévia)
  else skin premium sem UserSkin
    S->>R: user_skins.owns(userId, CARD, skinKey) = false
    S-->>C: 403 SKIN_NAO_ADQUIRIDA
    C-->>N: 403 (atalho para a Loja)
  else ok
    S->>R: update tasks.card_art_json (rev+1), cover_mode, cover_url, card_skin
    S->>R: insert audit_log CARD_ART_APPLIED
    S-->>C: CardArtView
    C-->>N: 200
    EV->>RD: DEL card:task:{id}
    EV->>R: projetos que contêm a tarefa → CardArtService.rebuildMosaic
    EV->>S3: mosaico/thumbnail recalculados
  end
```

## 4. Máquina de estados

Entidade central: a **arte do card** não tem enum de status na TAXONOMIA; os estados abaixo são **derivados** de `coverMode` + `cardArtJson.rev` da `TaskItem`/`ProjectScheme` e do ciclo de uma geração com IA (`AiInferenceLog.result`). A tarefa/projeto em si seguem `TaskState`/`ProjectStatus` (RF4/RF5 §4).

```mermaid
stateDiagram-v2
  direction LR
  state "PADRAO (sem cardArtJson · coverMode AUTO/MOSAICO · skin defaultCardSkin)" as PAD
  state "RASCUNHO_LOCAL (prévia no cliente, nada gravado)" as RL
  state "GERANDO_IA (motion spark)" as GER
  state "APLICADA (cardArtJson v, rev n)" as APL
  state "DESATUALIZADA (prévia com baseRev < rev)" as DES

  [*] --> PAD : tarefa/projeto criado (RF4/RF5) · thumbnail automático (RF38.CA02)
  PAD --> RL : abre o Estúdio (CA01)
  APL --> RL : abre o Estúdio de novo
  RL --> RL : ajusta Fundo/Layout/Container/Destaques · Restaurar padrão (só no rascunho)
  RL --> PAD : Cancelar (nada gravado)
  RL --> APL : Aplicar válido [dono, schema ok, ≤ 2 destaques, skin liberada, baseRev == rev] · rev+1 · CARD_ART_APPLIED · CardArtChanged
  RL --> GER : Arte com IA [cota ok] · AiEngine CAPA_IA (local se RESTRITO/SIGILOSO)
  GER --> RL : imagem pronta (≤ 30 s) · aiArt gravado no rascunho · faísca ✦
  GER --> RL : falha ou timeout → aviso, rascunho mantido
  RL --> DES : outra janela aplicou (rev avançou)
  DES --> RL : recarrega prévia com o rev atual (409 REVISAO_DESATUALIZADA)
  APL --> APL : CardArtChanged → evict cache · rebuildMosaic nos projetos (CA06)
  APL --> PAD : "Restaurar padrão" aplicado (cardArtJson removido)
  note right of APL
    Leitura tolerante: sem v → v1 com PAGINA/MOSAICO + timbrado.
    Mesmo resolveCardArt em feed, Mural, Vitrine, Balcão e Mesa.
  end note
  note right of GER
    409 COTA_ESGOTADA antes de entrar.
    reduceMotion / prefers-reduced-motion desligam o movimento (RF38.CA10).
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FE["Frontend · Next.js 15 App Router"]
    PG["Estúdio do card: app/(shell)/tasks/[id]/edit e projects/[id]/edit (segmentos Fundo · Layout · Container · Destaques)"]
    UI["packages/ui: TaskCard/ProjectCard (prévia feed + ampliado), BackgroundArt, Seal (lugar reservado), Spark ✦, Stamp, PhaseBar, Mosaic, Tabs, Button, Toast"]
    RES["lib/card-art: resolveCardArt · effectiveLayout · inkOn · containerColorOf (mesmo algoritmo do backend)"]
    BFF["app/bff/card-art/*"]
    PG --> UI
    PG --> RES
    PG --> BFF
  end
  subgraph WSWEB["ws-web"]
    SEC["SecurityConfig · SessionActiveFilter · CurrentUserArgumentResolver"]
    CC["CardArtController"]
    GEH["GlobalExceptionHandler (403, 409, 422)"]
  end
  subgraph WSAPP["ws-application"]
    CAS["design: CardArtService · CardArtResolver (fonte do algoritmo) · CardArtConfig"]
    AIE["ai: AiEngine CAPA_IA · AiQuota (créditos antes da cota)"]
    UP["acervo: UploadService"]
    GD["security.Guard.ownerOrAdmin (real)"]
    PORTS["ports: TaskRepositoryPort · ProjectRepositoryPort · UserSkinRepositoryPort · MediaStoragePort · QuotaPort · CardCachePort · PipelineJobPort · AuditLogPort"]
    EVT["events: CardArtChanged (AFTER_COMMIT) → rebuildMosaic · evict"]
    CAS --> GD
    CAS --> AIE
    CAS --> UP
    CAS --> PORTS
    CAS --> EVT
  end
  subgraph WSDOM["ws-domain"]
    DOM["acervo: TaskItem (cardArtJson, coverMode, cardSkin) · projects: ProjectScheme (mosaicJson) · identity: UserPreferences (real) · platform: UserSkin · MediaObject · AiInferenceLog · enums ArtKind/CardLayout/CardSkin/CardMotion/CoverMode"]
  end
  subgraph INFRA["ws-infrastructure"]
    MY["persistence-mysql: Jpa*Repository · user_skins"]
    RDS["cache-redis: card:task|project:{id} · AiQuota"]
    S3["storage-s3: imagens enviadas/geradas · mosaicos · thumbnails"]
    AIP["ai-providers: Claude → Gemini → LocalEngine (monograma/paleta)"]
    PLT["platform: AntivirusAdapter · workers THUMBNAIL/ANTIVIRUS"]
  end

  BFF -->|"REST JSON"| SEC --> CC --> CAS
  CC --> GEH
  MY -.implementa.-> PORTS
  RDS -.implementa.-> PORTS
  S3 -.implementa.-> PORTS
  PLT -.implementa.-> PORTS
  AIP -.implementa.-> AIE
  CAS --> DOM
  MY --> DB[("MySQL 8.4")]
  RDS --> RD[("Redis 7")]
  S3 --> MINIO[("S3 / MinIO")]
  AIP --> CL["Claude · Gemini"]
```

## 6. Rastreabilidade

| CA | Classe (§1) | Passo da atividade (§2) | Mensagem da sequência (§3) | Transição de estado (§4) | Componente (§5) | Situação |
|---|---|---|---|---|---|---|
| RF11.CA01 | `CardArtController.applyTask/applyProject`, `CardArtService.apply/validate`, `CardArtConfig.rev`, `Guard.ownerOrAdmin` | `A1`→`A2`→`A4`→`F4`→`S1`→`S4`, `E403`, `E409R`, `E422` | 1–4, 26–37, 42–47 | `PAD`→`RL`→`APL`, `RL`→`PAD`, `RL`→`DES` | `PG`, `CC`, `CAS`, `GD` | planejado |
| RF11.CA02 | `CardArtResolver.resolveCardArt/effectiveLayout`, `ArtKind`, `CardLayout` | `F2`, `S2` | 4 | `RL`→`RL` | `RES`, `CAS`, `UI` (`BackgroundArt`, `Mosaic`) | planejado |
| RF11.CA03 | `CardArtResolver.inkOn/containerColorOf`, `CardSkin`, `UserSkinRepositoryPort.owns`, `UserPreferences.defaultCardSkin` | `S5`→`S6`→`E403S` | 2–3, 38–41 | guarda de `RL`→`APL` | `RES`, `MY` (`user_skins`) | planejado (`UserPreferences` real) |
| RF11.CA04 | `CardArtService.generateAi`, `AiEngine` (CAPA_IA), `QuotaPort`/`AiQuota`, `AiInferenceLog`, `UploadService`, `MediaObject` | `A3`→`F3`→`AI1`→`AI6`, `UP1`, `E409Q`, `E422` | 5–25 | `RL`→`GER`→`RL` | `AIE`, `AIP`, `S3`, `PLT`, `RDS` | planejado |
| RF11.CA05 | `CardArtConfig.destaques/motion`, `CardMotion`, `UserPreferences.reduceMotion`, `CardArtService.validate` (≤ 2) | `S2`→`S3`→`E422` | 32–33 | nota de `GER` | `UI` (`Seal`, `Stamp`, `PhaseBar`, `Spark`) | planejado (RF38.CA10) |
| RF11.CA06 | `CardArtResolver` (leitura tolerante), `CardCachePort.evict`, evento `CardArtChanged`, `CardArtService.rebuildMosaic` | `S7`→`EV` | 42–47 | `APL`→`APL` | `EVT`, `RDS`, `S3`, `RES` | planejado (RF38.CA03) |
