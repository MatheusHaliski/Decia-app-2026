# RF11 — Utilizar o editor de arte de fundo para personalizar esquemas de tarefas e projetos
**HU:** HU11 · **Sprint (board Work Station):** lista *Requisitos Funcionais* (card renumerado, sem sprint atribuída — a confirmar) · **Equivalente FAI:** **RF11 Background Studio** (`PUT /api/pieces/{id}/background`, `backgroundConfigJson`, `resolveCardArt`, `CARD_SKINS`, `containerColorOf`, `inkOn`) + editor da arte do card da peça (v2 `PieceArt`) · **Aba/rota:** Estúdio do card dentro de `/tasks/[id]/edit` (Etapa 5 "Arte do card" do criador de tarefas, RF4/RF20) e `/projects/[id]/edit`; API `PUT /api/tasks/{id}/card-art` e `PUT /api/projects/{id}/card-art`
**Critérios de aceite cobertos:** RF11.CA01 · RF11.CA02 · RF11.CA03 · RF11.CA04 · RF11.CA05 · RF11.CA06 — corpo do card vazio: CAs derivados do título + HU11 + RF38.CA02/CA04/CA08/CA10 + `docs/design-system/ANATOMIAS_E_ESTUDIO.md` §5, marcados **(CA a confirmar)**

> **HU11** — COMO usuário criando um esquema de tarefa ou projeto POSSO utilizar o editor de arte de fundo PARA personalizar background de esquemas de tarefas ou projetos.

Na UI o editor chama-se **Estúdio do card** ("arte de fundo" é o rótulo do segmento *Fundo*, P-17 de `ANATOMIAS_E_ESTUDIO.md`). Quatro segmentos — **Fundo · Layout · Container · Destaques** — gravam um único JSON `CardArtConfig` v1 na coluna **`cardArtJson` (proposta)** de `tasks` e `project_schemes`, com colunas planas `cardSkin` (já na TAXONOMIA §2.1) e **`cardLayout` (proposta)**. A arte ocupa só as quatro faixas (passe-partout) entre a borda e o container; o container fica sempre legível (tinta por `inkOn`); a mídia nunca recebe arte. O RF reaproveita do RF38 o `CardArtService`, a capa por IA (`AiEngine CAPA_IA`, faísca ✦) e `UserSkin` (403 `SKIN_NAO_ADQUIRIDA`).

| CA | Enunciado (CA a confirmar) |
|---|---|
| **RF11.CA01** | Dado o dono de uma tarefa ou projeto (`ownerId`), quando abre o Estúdio do card, então vê os segmentos Fundo · Layout · Container · Destaques com prévia ao vivo (card do feed + ampliado); o rascunho é local (Cancelar não grava, Restaurar padrão só no rascunho); **Aplicar** envia `PUT /api/tasks/{id}/card-art` ou `PUT /api/projects/{id}/card-art` com `CardArtConfig` + `baseRev`; quem não é dono → `403 ACESSO_NEGADO`; `rev` divergente (outra janela aplicou antes) → `409 REVISAO_DESATUALIZADA`; JSON fora do schema → `422 VALIDACAO`. |
| **RF11.CA02** | Dado o segmento **Fundo**, então o usuário escolhe cor sólida (catálogo 8 cores de departamento + 6 neutras), gradiente (`marca`, `dept`, `spark`), textura (`papel`, `cortica`, `blueprint`, `timbrado`), terminal, monograma, malha de nós (`argumento`, `consenso`, `misto` + densidade 1–3), mosaico automático, imagem enviada ou arte com IA; `resolveCardArt` aplica a precedência (base `color → gradient → texture/terminal/monograma`; imagem `ai/upload → mesh → mosaic`); layouts com `ownArt` (GRADE, PRANCHA, LINHA_TEMPO) desligam o segmento Fundo com a explicação; layouts da seção B ficam desabilitados com motivo quando falta o dado (`effectiveLayout`). |
| **RF11.CA03** | Dado o segmento **Container**, então o usuário escolhe a skin (`timbrado` padrão, `protocolo`, `carimbo`, `blueprint`, `noturno`; `contraste` é forçado pelo tema) e a cor do container (nativa da skin, 5 amostras ou livre); a tinta vem de `inkOn(hex)` por luminância (0,299 R + 0,587 G + 0,114 B > 140 → `#1A1714`, senão `#F5F2EC`) garantindo ≥ 4,5:1; skin premium sem `UserSkin` (e não PADRAO) → `403 SKIN_NAO_ADQUIRIDA` com atalho para a Loja; `UserPreferences.defaultCardSkin` é o valor inicial. |
| **RF11.CA04** | Dado "Arte com IA" (prompt ≤ 300) no Fundo, então o serviço verifica `AiQuota` (créditos comprados antes da cota mensal; sem saldo → `409 COTA_ESGOTADA` + Loja), `accessClass` RESTRITO/SIGILOSO → motor local (monograma/paleta, `result = BLOQUEADO_SIGILO` para externo), senão `AiEngine CAPA_IA` com tema mascarado; a imagem vai ao S3 (`MediaObject`) e `fundo.aiArt {url, prompt, generatedAt, inferenceId}` é gravado com `AiInferenceLog`; a faísca ✦ é obrigatória (só o tooltip estendido pode ser ocultado, RF38.CA04); resposta ≤ 30 s ou estado "gerando" com `motion spark`; **imagem enviada** passa por validação (mime real, tamanho, antivírus `PipelineJob ANTIVIRUS`) → `422 VALIDACAO` se inválida. |
| **RF11.CA05** | Dado o segmento **Destaques**, então o usuário configura lacre (lugar reservado; zona vem do layout), tooltip da faísca (curto/completo), barra de fases (projeto), carimbo de estado/decisão (canto/centro/oculto), Hype do autor (respeita `HypeVisibility`) e **movimento** (`none`, `pulse`, `thread`); no máximo **2 destaques decorativos** (carimbo e movimento contam) → `422 LIMITE_DESTAQUES`; o movimento só roda no card ampliado e é desligado por `prefers-reduced-motion` ou `UserPreferences.reduceMotion` (RF38.CA10). |
| **RF11.CA06** | Dado `cardArtJson` gravado, então a API entrega `cardArt` no view da tarefa/projeto (campos planos mesclados), a leitura é tolerante (config sem `v` lê como v1 com padrões PAGINA/MOSAICO + `timbrado`; valores desconhecidos caem no padrão; `color` inválido → null); o mesmo `resolveCardArt` renderiza feed, Mural, Vitrine, Balcão e Mesa; o cache Redis do card é invalidado (`DEL card:task:{id}` / `card:project:{id}`) e o evento `CardArtChanged` dispara `CardArtService.rebuildMosaic` nos projetos que contêm a tarefa (RF38.CA03). |

## 1. Diagrama de classes

```mermaid
classDiagram
  direction LR

  class TaskItem {
    <<entity>>
    +UUID id
    +UUID ownerId
    +TaskType type
    +String protocolNumber
    +AccessClassification accessClass
    +String thumbnailUrl
    +String coverUrl
    +CoverMode coverMode
    +String cardSkin
    +String cardLayout
    +String cardArtJson
    +boolean aiGenerated
    +UUID aiInferenceId
    +long version
  }
  class ProjectScheme {
    <<entity>>
    +UUID id
    +UUID ownerId
    +UUID departmentId
    +ProjectCoverMode coverMode
    +String coverUrl
    +String mosaicJson
    +String cardSkin
    +String cardLayout
    +String cardArtJson
    +String evmJson
    +boolean aiGenerated
    +long version
  }
  class CardArtConfig {
    <<entity>>
    +int v
    +int rev
    +String layout
    +String compositionEmphasis
    +String fundoColor
    +String fundoGradientPresetId
    +String fundoTexture
    +String fundoTerminalTheme
    +boolean fundoMonogram
    +String fundoMeshPresetId
    +int fundoMeshDensity
    +boolean fundoMosaic
    +String fundoAiArtUrl
    +String fundoAiArtPrompt
    +UUID fundoAiArtInferenceId
    +String fundoUploadUrl
    +String containerSkin
    +String containerColor
    +String containerStyle
    +boolean destaquesSealPlaceholder
    +String destaquesSparkTooltip
    +String destaquesPhaseBar
    +String destaquesStamp
    +boolean destaquesAuthorHype
    +String motion
  }
  class UserPreferences {
    <<entity>>
    +UUID userId
    +ThemeMode theme
    +String defaultCardSkin
    +boolean reduceMotion
    +AiMode aiModeDefault
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
    +UUID id
    +String bucket
    +String key
    +String mimeType
    +String sha256
    +AccessClassification accessClass
  }
  class AiInferenceLog {
    <<entity>>
    +UUID id
    +AiCapability capability
    +String hostRf
    +String provider
    +String model
    +String result
    +String quotaSource
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
  class PipelineJob {
    <<entity>>
    +UUID id
    +String type
    +UUID targetId
    +PipelineJobStatus status
  }
  class ArtKind {
    <<enum>>
    none
    color
    gradient
    texture
    terminal
    monograma
    mesh
    mosaic
    ai
    upload
  }
  class CardLayout {
    <<enum>>
    PAGINA
    GRADE
    PRANCHA
    MENSAGEM
    FICHA
    LINHA
    MOSAICO
    LINHA_TEMPO
    KANBAN_MINI
    PAINEL_METRICAS
    CAPA_FOTO
    COMPACTO
  }
  class CardSkin {
    <<enum>>
    timbrado
    protocolo
    carimbo
    blueprint
    noturno
    contraste
  }
  class CardMotion {
    <<enum>>
    none
    pulse
    thread
  }
  class CoverMode {
    <<enum>>
    AUTO
    MANUAL
    IA
  }

  class CardArtController {
    <<controller>>
    +GET_api_tasks_id_card_art() 200
    +PUT_api_tasks_id_card_art(config, baseRev) 200
    +PUT_api_projects_id_card_art(config, baseRev) 200
    +POST_api_tasks_id_card_art_ai(prompt) 200 ou 202
    +POST_api_projects_id_card_art_ai(prompt) 200 ou 202
    +POST_api_tasks_id_card_art_upload(multipart) 201
    +GET_api_card_art_suggestion(type, category, tags) 200
  }
  class CardArtService {
    <<service>>
    +load(viewer, target) CardArtView
    +save(actor, target, config, baseRev) CardArtConfig
    +validate(config, target, viewer) List~Violation~
    +requestAiArt(actor, target, prompt) CardArtConfig
    +attachUpload(actor, target, media) CardArtConfig
    +suggest(target) CardArtConfig
    +rebuildMosaic(projectId) ProjectScheme
  }
  class CardArtResolver {
    <<service>>
    +resolveCardArt(cfg, ctx) CardArt
    +effectiveLayout(card, context) String
    +containerColorOf(skin, manual) String
    +inkOn(hex) String
    +readCardArt(json) CardArtConfig
  }
  class AiEngine {
    <<service>>
    +run(capability, input, accessClass) AiResult
  }
  class PreferencesService {
    <<service>>
    +availableSkins(userId) List~UserSkin~
    +ownsSkin(userId, skinKey) boolean
  }
  class AiEnginePort {
    <<port>>
    +generateCoverArt(prompt, accessClass) ArtResult
  }
  class MediaStoragePort {
    <<port>>
    +put(bucket, key, bytes) MediaObject
    +presignedUrl(mediaId) URL
  }
  class QuotaPort {
    <<port>>
    +tryConsume(userId, capability) QuotaSource
  }
  class CardCachePort {
    <<port>>
    +evict(targetType, targetId)
  }
  class TaskItemRepository {
    <<adapter>>
    MySQL tasks.card_art_json
  }
  class S3MediaAdapter {
    <<adapter>>
    bucket ws-card-art
  }
  class RedisQuotaAdapter {
    <<adapter>>
    quota scope id month
  }

  TaskItem ..> CardArtConfig : cardArtJson
  ProjectScheme ..> CardArtConfig : cardArtJson
  CardArtConfig --> CardLayout : layout
  CardArtConfig --> CardSkin : containerSkin
  CardArtConfig --> CardMotion : motion
  CardArtConfig ..> ArtKind : resolvido por CardArtResolver
  CardArtConfig ..> MediaObject : aiArt url e uploadUrl
  CardArtConfig ..> AiInferenceLog : aiArt inferenceId
  TaskItem --> CoverMode
  UserPreferences "1" --> "*" UserSkin
  UserPreferences ..> CardSkin : defaultCardSkin
  PipelineJob ..> MediaObject : ANTIVIRUS do upload
  AiQuota ..> AiInferenceLog : quotaSource

  CardArtController --> CardArtService
  CardArtService --> CardArtResolver : validate e effectiveLayout
  CardArtService --> PreferencesService : ownsSkin
  CardArtService --> AiEnginePort
  CardArtService --> MediaStoragePort
  CardArtService --> QuotaPort
  CardArtService --> CardCachePort
  CardArtService --> TaskItemRepository
  AiEnginePort <|.. AiEngine
  MediaStoragePort <|.. S3MediaAdapter
  QuotaPort <|.. RedisQuotaAdapter

  note for CardArtConfig "PROPOSTA — valor embutido (JSON Schema CardArtConfig v1, ANATOMIAS_E_ESTUDIO §5.7) gravado em tasks.card_art_json e project_schemes.card_art_json. Campos listados achatados (fundo.*, container.*, destaques.*). rev faz a concorrencia otimista (baseRev para 409)"
  note for TaskItem "tabela tasks · cardSkin ja existe (TAXONOMIA §2.1) · cardLayout e cardArtJson sao PROPOSTA · .. +45 campos .."
  note for CardArtResolver "lib compartilhada front (TypeScript) e back (Java) · precedencia base color gradient texture terminal monograma · imagem ai upload mesh mosaic · tema contraste devolve color preto e branco"
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  classDef err fill:#ffe3e3,stroke:#c0392b,color:#5a1a12
  classDef ai fill:#fff3d6,stroke:#d68910,color:#5c3b00
  classDef store fill:#eef6ff,stroke:#4a4852,color:#1f2937

  subgraph L1["Ator humano · dono da tarefa ou projeto"]
    U1["Abre o Estúdio do card (Etapa 5 Arte do card ou editar projeto)"]
    U2{"Segmento?"}
    U3["Fundo: cor, gradiente, textura, terminal, monograma, malha, mosaico, enviar imagem, arte com IA, sem arte"]
    U4["Layout: escolhe tile (seção A sempre, seção B se há dado) e skin"]
    U5["Container: cor nativa, 5 amostras ou livre · sólido/vidro"]
    U6["Destaques: lacre, tooltip da faísca, barra de fases, carimbo, Hype do autor, movimento"]
    U7{"Aplicar, Cancelar ou Restaurar padrão?"}
    U8(["Fim"])
  end

  subgraph L2["Web/BFF (Next.js App Router) · components/ui/CardArtStudio"]
    W1["Carrega view com cardArt (leitura tolerante readCardArt) e UserPreferences.defaultCardSkin"]
    W2["Prévia ao vivo: card do feed + ampliado via resolveCardArt e effectiveLayout no rascunho local"]
    W3["Layout com ownArt → segmento Fundo desabilitado com explicação · seção B sem dado → tile aria-disabled com motivo"]
    W4["Container: containerColorOf + inkOn definem --ink e --on-dark · skin premium não possuída → cadeado + Loja"]
    W5["aria-live: N de 2 destaques · movimento só na prévia ampliada · prefers-reduced-motion desliga"]
    W6["PUT /api/tasks/{id}/card-art ou /api/projects/{id}/card-art {config, baseRev}"]
    W7["POST .../card-art/ai {prompt} · estado gerando (motion spark)"]
    W8["POST .../card-art/upload (multipart)"]
    W9["Exibe 403 ACESSO_NEGADO ou 403 SKIN_NAO_ADQUIRIDA"]
    W10["Exibe 409 REVISAO_DESATUALIZADA (recarregar) ou 409 COTA_ESGOTADA (Loja)"]
    W11["Exibe 422 VALIDACAO ou 422 LIMITE_DESTAQUES"]
  end

  subgraph L3["ws-application · CardArtService"]
    S1{"actor == ownerId?"}
    S2{"baseRev == rev atual?"}
    S3["validate: schema v1, layout do kind certo, destaques decorativos ≤ 2, color hex, skin do catálogo"]
    S4{"Skin premium e PreferencesService.ownsSkin falso?"}
    S5["UPDATE card_art_json (rev + 1), card_skin, card_layout · version + 1"]
    S6["CardCachePort.evict · evento CardArtChanged (AFTER_COMMIT) → rebuildMosaic nos projetos da tarefa"]
    S7{"QuotaPort.tryConsume CAPA_IA ok?"}
    S8{"accessClass RESTRITO ou SIGILOSO?"}
    S9["MediaStoragePort.put (ws-card-art) · fundo.aiArt {url, prompt, generatedAt, inferenceId} · aiGenerated true"]
    S10{"Upload: mime real, tamanho, proporção ok?"}
    S11["PipelineJob ANTIVIRUS → LIMPO → fundo.uploadUrl"]
    S12["suggest: regra por type, category, processTags, natureTags (layout + estilo) ✦ se vier da IA"]
  end

  subgraph L4["IA (AiEngine) · CAPA_IA"]
    A1["Gera ilustração flat do tema (prompt mascarado, sem PII) ≤ 30 s"]
    A2["Motor local: monograma e paleta determinística · result BLOQUEADO_SIGILO para externo"]
    A3["AiInferenceLog (capability CAPA_IA, hostRf RF11, provider, quotaSource) → tooltip da faísca ✦"]
  end

  subgraph L5["Persistência"]
    D1[("MySQL tasks.card_art_json · card_skin · card_layout · project_schemes.card_art_json")]
    D2[("S3 ws-card-art + MySQL media_objects")]
    D3[("Redis quota:USER:id:mes · cache card:task:id / card:project:id")]
    D4[("MySQL ai_inference_log · pipeline_jobs (ANTIVIRUS)")]
    D5[("MySQL user_skins · user_preferences")]
  end

  U1 --> W1 --> W2 --> U2
  W1 --> D5
  U2 -->|"Fundo"| U3 --> W3 --> W2
  U2 -->|"Layout"| U4 --> W3
  U2 -->|"Container"| U5 --> W4 --> W2
  U2 -->|"Destaques"| U6 --> W5 --> W2
  U3 -->|"arte com IA"| W7 --> S7
  S7 -->|"não"| W10 --> U8
  S7 -->|"sim"| S8
  S8 -->|"sim"| A2 --> S9
  S8 -->|"não"| A1 --> A3 --> D4
  A1 --> S9 --> D2
  S9 --> W2
  U3 -->|"enviar imagem"| W8 --> S10
  S10 -->|"não"| W11
  S10 -->|"sim"| S11 --> D4
  S11 --> D2
  S11 --> W2
  W1 -. "Aplicar sugerida" .-> S12 --> W2
  W2 --> U7
  U7 -->|"Cancelar"| U8
  U7 -->|"Restaurar padrão"| W2
  U7 -->|"Aplicar"| W6 --> S1
  S1 -->|"não"| W9 --> U8
  S1 -->|"sim"| S2
  S2 -->|"não"| W10
  S2 -->|"sim"| S3
  S3 -->|"inválido"| W11 --> U8
  S3 -->|"ok"| S4
  S4 -->|"sim"| W9
  S4 -->|"não"| S5 --> D1
  S5 --> S6 --> D3
  S6 --> U8

  class W9,W10,W11 err
  class A1,A2,A3,S12 ai
  class D1,D2,D3,D4,D5 store
```

## 3. Diagrama de sequência

```mermaid
sequenceDiagram
  autonumber
  actor U as Usuário (dono)
  participant FE as Next.js (App Router)
  participant C as Controller (ws-web)
  participant S as Service (ws-application)
  participant AI as AiEngine
  participant DB as Repository/MySQL
  participant R as Redis
  participant S3 as S3
  participant EV as DomainEvents (AFTER_COMMIT)

  rect rgb(245, 242, 239)
    Note over U,EV: Caminho feliz — abre o Estúdio, pede arte com IA, escolhe skin e aplica com baseRev
    U->>FE: Abre Estúdio do card em /tasks/T1/edit (Etapa 5)
    FE->>C: GET /api/tasks/T1/card-art
    C->>S: CardArtService.load(viewer, TASK T1)
    S->>DB: SELECT tasks (card_art_json, card_skin, card_layout, type, protocolNumber, accessClass, version) · user_preferences.defaultCardSkin · user_skins
    S-->>C: 200 CardArtView {cardArt (readCardArt tolerante), rev 3, ownedSkins, layoutsDisponiveis com motivo}
    C-->>FE: 200
    FE-->>U: Segmentos Fundo · Layout · Container · Destaques com prévia (resolveCardArt no rascunho local)
    U->>FE: Fundo › Arte com IA, prompt "pavimentação urbana"
    FE->>C: POST /api/tasks/T1/card-art/ai {prompt}
    C->>S: CardArtService.requestAiArt(actor, TASK T1, prompt)
    S->>R: GET quota:USER:id:mes (créditos comprados antes da cota mensal)
    R-->>S: saldo ok (quotaSource CREDITO)
    S->>AI: run(CAPA_IA, prompt mascarado, accessClass INTERNO)
    AI-->>S: imagem flat + confiança + provider/model
    S->>S3: PUT ws-card-art/T1/{inferenceId}.png
    S3-->>S: etag, sha256
    S->>DB: INSERT media_objects · INSERT ai_inference_log (CAPA_IA, hostRf RF11)
    S->>R: DECR quota (ou créditos)
    S-->>C: 200 {fundo.aiArt {url, prompt, generatedAt, inferenceId}} (rascunho, ainda não aplicado)
    C-->>FE: 200
    FE-->>U: Prévia com a arte e faísca ✦ obrigatória (motion spark encerrado)
    U->>FE: Container › skin blueprint, cor livre #0F3260 · Destaques › carimbo canto + pulse
    FE->>FE: containerColorOf + inkOn(#0F3260) → tinta clara #F5F2EC · 2 de 2 destaques (aria-live)
    U->>FE: Aplicar
    FE->>C: PUT /api/tasks/T1/card-art {config v1, baseRev 3}
    C->>S: CardArtService.save(actor, TASK T1, config, baseRev 3)
    S->>DB: SELECT tasks T1 (ownerId, card_art_json.rev) · user_skins WHERE skinKey = blueprint
    S->>S: validate(schema, effectiveLayout, destaques ≤ 2, hex, skin possuída ou PADRAO)
    S->>DB: UPDATE tasks SET card_art_json (rev 4), card_skin = blueprint, card_layout = PAGINA, aiGenerated = true, aiInferenceId, version + 1
    S-)EV: CardArtChanged(TASK T1)
    EV->>R: DEL card:task:T1
    EV->>S: CardArtService.rebuildMosaic(projectId) para cada projeto que contém T1
    EV->>DB: UPDATE project_schemes SET mosaicJson
    S-->>C: 200 CardArtConfig {rev 4}
    C-->>FE: 200
    FE-->>U: Card do feed, Mural, Vitrine e Mesa renderizam a mesma arte (resolveCardArt)
  end

  alt RF11.CA01 — outra janela aplicou antes
    FE->>C: PUT /api/tasks/T1/card-art {baseRev 3}
    C->>S: save(...)
    S->>DB: SELECT card_art_json.rev → 4
    S-->>C: 409 REVISAO_DESATUALIZADA
    C-->>FE: 409 (recarregar o Estúdio)
  else RF11.CA03 — skin premium não adquirida
    S->>DB: SELECT user_skins WHERE userId AND skinKey = noturno → vazio
    S-->>C: 403 SKIN_NAO_ADQUIRIDA (atalho para a Loja)
    C-->>FE: 403
  else RF11.CA04 — sem cota e sem créditos
    S->>R: GET quota:USER:id:mes → 0 e purchasedCredits 0
    S-->>C: 409 COTA_ESGOTADA (atalho para a Loja Work Station)
    C-->>FE: 409
  else RF11.CA04 — accessClass SIGILOSO
    S->>AI: run(CAPA_IA, tema, accessClass SIGILOSO)
    AI-->>S: motor local (monograma e paleta) · result BLOQUEADO_SIGILO para externo
    S-->>C: 200 com aviso de motor local
  else RF11.CA05 — três destaques decorativos
    S->>S: validate → carimbo + pulse + relevo = 3 decorativos
    S-->>C: 422 LIMITE_DESTAQUES
    C-->>FE: 422
  end
```

## 4. Máquina de estados

O RF11 não tem entidade com estado próprio: `CardArtConfig` é um valor embutido. Usa-se o **rascunho do Estúdio** (estado do componente, com `rev` para concorrência) e o **`TaskItem.coverMode` / `ProjectScheme.coverMode`** que a arte com IA afeta (mesmos estados do RF38).

```mermaid
stateDiagram-v2
  direction LR

  state "Estúdio do card (rascunho local + rev)" as Studio {
    [*] --> Fechado
    Fechado --> Rascunho : abrir Estúdio — GET card-art (rev n)
    Rascunho --> Rascunho : muda Fundo, Layout, Container, Destaques — prévia via resolveCardArt
    Rascunho --> GerandoIA : Arte com IA — POST card-art ai (quota ok)
    GerandoIA --> Rascunho : aiArt recebida — faísca obrigatória
    GerandoIA --> Rascunho : 409 COTA_ESGOTADA ou falha — mantém fundo anterior
    Rascunho --> Fechado : Cancelar — nada gravado
    Rascunho --> Rascunho : Restaurar padrão — só no rascunho
    Rascunho --> Aplicando : Aplicar — PUT card-art com baseRev n
    Aplicando --> Aplicado : 200 — rev n+1, cache do card invalidado
    Aplicando --> Rascunho : 422 VALIDACAO, 422 LIMITE_DESTAQUES ou 403 SKIN_NAO_ADQUIRIDA
    Aplicando --> Conflito : 409 REVISAO_DESATUALIZADA
    Conflito --> Rascunho : recarrega rev atual e reaplica
    Aplicado --> [*]
  }

  state "TaskItem.coverMode / ProjectScheme.coverMode" as Cover {
    [*] --> AUTO : thumbnail do PipelineJob THUMBNAIL (RF38)
    AUTO --> IA : fundo.aiArt aplicado — aiGenerated true
    AUTO --> MANUAL : fundo.uploadUrl aplicado (upload validado)
    MANUAL --> IA : troca por arte com IA
    IA --> MANUAL : troca por imagem enviada
    IA --> AUTO : Sem arte ou Restaurar padrão aplicado
    MANUAL --> AUTO : Sem arte ou Restaurar padrão aplicado
  }

  Studio --> Cover : Aplicado publica CardArtChanged

  note right of Cover
    Qualquer transição dispara CardArtService.rebuildMosaic
    nos projetos que contêm a tarefa (RF38.CA03) e DEL card cache
    Em ProjectScheme os nomes sao MOSAICO FOTO IA (Q-41)
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FE["Frontend Next.js (App Router)"]
    FE1["app/tasks/[id]/edit (Etapa 5 Arte do card) · app/projects/[id]/edit"]
    FE2["components/ui/CardArtStudio: SegmentTabs (Fundo · Layout · Container · Destaques) · OptionStrip · LayoutTile + SealZoneDiagram · SkinPicker · ContainerColor · HighlightToggles · StudioPreview (feed + ampliado)"]
    FE3["lib/card-art: resolveCardArt · effectiveLayout · containerColorOf · inkOn · readCardArt (compartilhado com o render do feed, Mural, Vitrine, Balcão, Mesa)"]
    FE4["tokens: --ink · --on-dark · skins (timbrado, protocolo, carimbo, blueprint, noturno, contraste) · prefers-reduced-motion"]
  end

  subgraph WEB["ws-web"]
    C1["CardArtController (GET/PUT /api/tasks/{id}/card-art · /api/projects/{id}/card-art · POST .../card-art/ai · POST .../card-art/upload · GET /api/card-art/suggestion)"]
    C2["OwnerGuard (ownerId) · If-Match baseRev"]
  end

  subgraph APP["ws-application"]
    S1["CardArtService (load, save, validate, requestAiArt, attachUpload, suggest, rebuildMosaic)"]
    S2["CardArtResolver (validação server-side com o mesmo algoritmo)"]
    S3["PreferencesService (ownsSkin, defaultCardSkin)"]
    S4["AiEngine (RF43) · CAPA_IA"]
    P1["AiEnginePort"]
    P2["MediaStoragePort"]
    P3["QuotaPort"]
    P4["CardCachePort"]
    P5["PipelineJobScheduler (ANTIVIRUS)"]
  end

  subgraph DOM["ws-domain · br.gov.pr.secid.workstation"]
    D1["TaskItem (cardSkin, cardLayout*, cardArtJson*, coverMode, aiGenerated) · ProjectScheme (cardArtJson*, mosaicJson, coverMode)"]
    D2["CardArtConfig* (valor) · enums CardLayout* · CardSkin* · CardMotion* · ArtKind* · CoverMode"]
    D3["UserPreferences · UserSkin · MediaObject · AiInferenceLog · AiQuota · PipelineJob"]
  end

  subgraph INFRA["ws-infrastructure/*"]
    I1["persistence-mysql: TaskItemRepository · ProjectSchemeRepository · UserSkinRepository · MediaObjectRepository · AiInferenceLogRepository"]
    I2["storage-s3: S3MediaAdapter (bucket ws-card-art, URL assinada)"]
    I3["cache-redis: RedisQuotaAdapter (quota:scope:id:mes) · CardCacheAdapter (card:task:id, card:project:id)"]
    I4["ai-providers: ClaudeAdapter · GeminiAdapter · LocalEngine (monograma/paleta para RESTRITO/SIGILOSO)"]
    I5["platform: PipelineJob worker (ANTIVIRUS, THUMBNAIL) · OutboxRelay (CardArtChanged)"]
  end

  subgraph EXT["Serviços externos"]
    X1["Claude / Gemini (arte com IA)"]
  end

  MY[("MySQL 8")]
  RD[("Redis")]
  S3[("S3 / MinIO")]

  FE1 --> FE2 --> FE3
  FE4 -.-> FE2
  FE2 -->|"HTTPS/JSON"| C1 --> C2 --> S1
  S1 --> S2
  S1 --> S3
  S1 --> P1 --> S4
  S1 --> P2
  S1 --> P3
  S1 --> P4
  S1 --> P5
  S1 --> D1
  S2 --> D2
  S3 --> D3
  S4 -.-> I4 --> X1
  P2 -.-> I2 --> S3
  P3 -.-> I3 --> RD
  P4 -.-> I3
  P5 -.-> I5
  S1 --> I1 --> MY
  I5 -.-> S1
```

*Legenda: `*` = proposta (fora da TAXONOMIA v1).*

## 6. Rastreabilidade

| CA | Classe | Passo (atividades) | Mensagem (sequência) | Transição (estados) | Componente |
|---|---|---|---|---|---|
| RF11.CA01 | `CardArtController.GET/PUT_*_card_art`, `CardArtService.load/save/validate`, `CardArtConfig.rev` (proposta), `TaskItem.ownerId`, `ProjectScheme.ownerId` | U1, U7, W1, W2, W6, S1, S2, S3, S5, W9, W10, W11 | 1–7, 24–28, 33–35; `alt` 409 REVISAO_DESATUALIZADA | `Fechado → Rascunho → Aplicando → Aplicado / Conflito` | `CardArtStudio`, `StudioPreview`, `OwnerGuard · If-Match baseRev`, `TaskItemRepository` |
| RF11.CA02 | `CardArtConfig.fundo*`, enum `ArtKind` (10 valores), enum `CardLayout` (12), `CardArtResolver.resolveCardArt/effectiveLayout` | U3, U4, W3, S3 | 7 (prévia via resolveCardArt), 35 | `Rascunho → Rascunho` (muda Fundo/Layout) | `lib/card-art`, `OptionStrip`, `LayoutTile + SealZoneDiagram` |
| RF11.CA03 | `CardArtConfig.containerSkin/containerColor/containerStyle`, enum `CardSkin`, `CardArtResolver.containerColorOf/inkOn`, `UserSkin`, `UserPreferences.defaultCardSkin`, `PreferencesService.ownsSkin` | U5, W4, S4, W9 | 4, 22–23, 26; `alt` 403 SKIN_NAO_ADQUIRIDA | `Aplicando → Rascunho` (403) | `SkinPicker`, `ContainerColor`, `tokens --ink · --on-dark`, `UserSkinRepository` |
| RF11.CA04 | `CardArtService.requestAiArt/attachUpload`, `AiEnginePort`, `QuotaPort`, `AiQuota`, `AiInferenceLog` (CAPA_IA, hostRf RF11), `MediaObject`, `PipelineJob` ANTIVIRUS, `TaskItem.accessClass/aiGenerated/aiInferenceId` | W7, W8, S7–S11, A1–A3 | 8–20; `alt` 409 COTA_ESGOTADA; `alt` SIGILOSO (motor local) | `Rascunho → GerandoIA → Rascunho`; `AUTO → IA`, `AUTO → MANUAL` | `AiEngine CAPA_IA`, `ClaudeAdapter/GeminiAdapter/LocalEngine`, `S3MediaAdapter`, `RedisQuotaAdapter`, `PipelineJob worker ANTIVIRUS` |
| RF11.CA05 | `CardArtConfig.destaques*/motion`, enum `CardMotion`, `UserPreferences.reduceMotion`, `CardArtService.validate` (≤ 2 decorativos) | U6, W5, S3, W11 | 22, 26; `alt` 422 LIMITE_DESTAQUES | `Aplicando → Rascunho` (422) | `HighlightToggles`, `tokens prefers-reduced-motion`, `StudioPreview` (movimento só ampliado) |
| RF11.CA06 | `TaskItem.cardLayout/cardSkin` (planos), `CardArtResolver.readCardArt` (tolerante), `CardCachePort`, `CardArtService.rebuildMosaic`, evento `CardArtChanged` | W1, S5, S6, D1, D3 | 3–5, 27–32, 35 | `Aplicado` publica `CardArtChanged`; nota de `Cover` | `lib/card-art` compartilhada, `CardCacheAdapter`, `OutboxRelay`, `ProjectSchemeRepository` |

**Dúvidas para confirmar:** (a) aprovar `cardArtJson` + `cardLayout` como colunas novas em `tasks` e `project_schemes` (TAXONOMIA só tem `cardSkin`, `coverMode`, `coverUrl`, `mosaicJson`); (b) nome na UI: "Estúdio do card" × "editor de arte de fundo" (P-17); (c) limite de 2 destaques decorativos; (d) unificar `CoverMode` (AUTO·MANUAL·IA) e `ProjectCoverMode` (MOSAICO·FOTO·IA) — Q-41; (e) arte com IA debita a cota de IA do usuário (RF42.CA06) ou tem cota própria `CAPA_IA_LOTE` da Loja; (f) sprint do card.


Tela/aba: `/tasks/[id]/edit` (esqueleto em `app/(shell)/tasks/[id]/edit/page.tsx`) · `/projects/[id]/edit` (esqueleto em `app/(shell)/projects/[id]/edit/page.tsx`) · `/lab/anatomias` (esqueleto em `app/(shell)/lab/anatomias/page.tsx`)
