# RF80 — Feed da rede Work Station: projetos e tarefas publicados por todas as pessoas, com filtros por todos os campos públicos
**HU:** HU80 · **Aba/rota:** Mural, sub-aba Rede (`/mural?tab=rede`, ao lado de Mural da empresa · Vitrine · Seguindo; filtros e ordenação na URL, ex.: `/mural?tab=rede&sort=trending&category=ETP&area=ENGENHARIA&cursor=…`), filtros salvos (`/mural/filtros`), preferências do feed (`/settings?tab=privacidade`) · **Página-esqueleto:** a registrar; jornada ainda não implementada.
**Critérios de aceite cobertos:** RF80.CA01 … RF80.CA16 — requisito da auditoria de 02/11/2026 ([`ABAS_POR_PROFISSAO.md`](../../auditoria/2026-11-02/ABAS_POR_PROFISSAO.md) §8 e [`fontes/feed-global.md`](../../auditoria/2026-11-02/fontes/feed-global.md) §2–§5, onde os CAs aparecem com o número provisório RF76); numeração confirmada pela D-149; "hype" no feed = item em alta (D-150); visitante anônimo e itens EMPRESA na mesma lista seguem como propostos, em aberto na Q-246. Todos planejados. Já existem no código: `Visibility`, `TaskCategory`, `TaskType`, `NatureTag`, `ProcessTag`, `WorkArea`, os contadores em `TaskItem`/`ProjectScheme`, `Reaction` com `ignoredReason`, `Remix`, `Follow`, `Seal*`, `CuratorAppointment`, as regras puras de `lib/social/rules.ts` (`canView`, `countersOf`, `remixPermission`, `muralFeed` só DEMO) e a flag `ws.opensearch.enabled` com fallback MySQL.

**Trello:** card a criar no board **Work Station**.

**História de usuário:** COMO pessoa autenticada no Work Station QUERO explorar, na aba "Rede" do Mural, um feed de todos os projetos e tarefas que outras pessoas publicaram como públicos (ou para a minha empresa), filtrando por categoria, área profissional, editor de origem, selo, remixável, idioma, região e os demais campos públicos do item, ordenando por recente, em alta ("hype"), mais curtidos, mais remixados, mais validados ou mais úteis, salvando filtros e seguindo categorias ou áreas PARA descobrir trabalhos úteis, aprender com produções publicadas e reutilizá-las com crédito — sem que nenhum dado privado de perfil, carreira ou Hype de terceiros seja exposto.

**Experiência central:** a aba Rede abre em "recente" com uma lista de cards (título, capa, autor, categoria, área, editor, selos, contadores); o painel de filtros mostra cada faceta com a contagem de itens que a pessoa pode ver; o chip "em alta" (o "hype" do item, D-150) troca a ordenação para o `trendingScore` com decaimento; "Salvar filtro" guarda a combinação em `/mural/filtros`; cada card tem "ver menos disto", "ocultar" e "denunciar".

**Elegibilidade:** entra só a **versão publicada por ação explícita** (publicar ≠ salvar, `REDE_PROFISSIONAL_VISIBILIDADE.md`) com visibilidade PUBLICA e classificação PUBLICO/INTERNO, em estado elegível (tarefa `DISPONIVEL`, `CONCLUIDA`, `MODELO_PUBLICO`; projeto `PUBLICADO`, `EM_DECISAO`, `APROVADO`, `EM_EXECUCAO`, `CONCLUIDO`); itens EMPRESA só para quem é da mesma empresa, rotulados "sua empresa" (Q-246); DEPARTAMENTO, PRIVADA, RESTRITO e SIGILOSO nunca (D-93, D-137, D-139). **Fora, sempre:** perfil de carreira, profissão preferida sem opt-in (RF75.CA19, RF81.CA03), Hype de terceiros salvo PUBLICO (RF45.CA06), HSE, DECIA Points, sinal de busca de emprego (D-147).

## Critérios de aceite

| CA | Dado / quando / então |
|---|---|
| RF80.CA01 | Dado um item (tarefa ou projeto), quando o autor o publica por ação explícita com visibilidade PUBLICA e classificação PUBLICO/INTERNO, em estado elegível (tarefa DISPONIVEL/CONCLUIDA/MODELO_PUBLICO; projeto PUBLICADO/EM_DECISAO/APROVADO/EM_EXECUCAO/CONCLUIDO), então em até 30 s ele aparece no feed "Rede" para qualquer pessoa autenticada, com a **versão publicada** (não o rascunho), e um item EMPRESA aparece só para pessoas da mesma empresa com o rótulo "sua empresa" (lista única proposta; Q-246). |
| RF80.CA02 | Dado um item presente no feed, quando sua visibilidade muda para PRIVADA/DEPARTAMENTO, sua classificação para RESTRITO/SIGILOSO, seu estado para RASCUNHO/ARQUIVADO/BLOQUEADA/DEVOLVIDO, ou ele é despublicado ou excluído, então ele some do feed, das contagens de faceta e do cache em até 5 s para quem perdeu acesso; a leitura reconfirma `canView` por id antes de responder; abrir o item por URL responde `404 NAO_ENCONTRADO` (D-141). Teste automatizado "mudança de visibilidade remove do índice". |
| RF80.CA03 | Dado o feed, quando a pessoa aplica filtros, então estão disponíveis as facetas públicas do item: tipo (tarefa/projeto), categoria documental e subcategoria, tipo da tarefa, natureza, processo, área profissional/família de ocupação do item, editor de origem (Letters/Drawings/outro), autor, empresa/órgão (só em publicação institucional), identidade de publicação, intervalo de datas, exercício, estado/fase, competências declaradas, selo validado (emissor, nível, excelência), validado no DECIA, remixável, é remix, gerado com IA, idioma do conteúdo, região (UF/município), formato, classificação, contadores mínimos e **em alta** ("hype" do item: `trendingScore` na janela escolhida, D-150); filtros combinam por AND entre facetas e OR dentro da faceta; cada faceta mostra a contagem de itens elegíveis **para o viewer**. |
| RF80.CA04 | Dado qualquer filtro ou ordenação, quando calculado, então usa somente atributos **do item** publicado ou campos descobríveis do autor (nome profissional, `verified`, vínculo institucional se a publicação é institucional); nunca usa perfil de carreira, `preferredOccupation` sem opt-in, HSE, DECIA Points, Hype do autor, sinal de emprego ou pretensão salarial (RF75.CA14, D-147, D-150); um teste de contrato falha se o DTO `FeedItemView` contiver qualquer desses campos. |
| RF80.CA05 | Dado o feed, quando a pessoa escolhe a ordenação, então existem: **recente** (padrão, `publishedAt desc`), **em alta** — o filtro/ordenação "hype" do feed (D-150): `trendingScore` do item com decaimento temporal sobre reações válidas, salvos, remixes, comentários e visualizações; janelas 24 h / 7 d / 30 d; recalculado por job; o Hype do autor (RF45) nunca é filtro nem ordenação —, **mais curtidos**, **mais remixados** (atores distintos), **mais validados** (selo/decisão validada, nível, excelência) e **mais úteis** (ÚTIL + BEM_FUNDAMENTADO + CONFORME), todas com período (7 d / 30 d / 1 ano / sempre) e desempate por id. |
| RF80.CA06 | Dado o cálculo de "em alta", curtidas e úteis, quando há reações com `ignoredReason` (AUTO_INTERACAO, NAO_VERIFICADO, ANTIFRAUDE) ou repetidas da mesma pessoa, então elas não pontuam; uma página de "em alta" tem no máximo 2 itens do mesmo autor; o Hype do autor nunca entra no cálculo. |
| RF80.CA07 | Dado o card de um item no feed, quando exibido, então mostra título, resumo, capa/miniatura, tipo e categoria, autor (com `verified`; "autor não disponível" se o perfil não é visível ao viewer), empresa/órgão quando institucional, data de publicação, estado, área, editor de origem, idioma, região, selos, "remix de…" com crédito à origem, badge remixável, gerado com IA, contadores (curtidas, úteis, comentários, salvos, remixes) e o Hype do autor **apenas** se `hypeVisibility = PUBLICO` (D-150); as ações do RF26 (curtir, reagir, salvar, compartilhar, remixar, comentar) respeitam `canInteract`. |
| RF80.CA08 | Dado a busca textual, quando a pessoa digita de 2 a 200 caracteres, então o servidor busca em título, resumo, descrição, tags, subcategoria e competências, com analisador pt-BR e sinônimos; fora da faixa responde `422 VALIDACAO`; o trecho destacado nunca vem de item inelegível. |
| RF80.CA09 | Dado o feed, quando a pessoa salva o conjunto atual de filtros e ordenação, então cria um `SavedFilter` (≤ 20 por pessoa, nome obrigatório, privado) acessível em `/mural/filtros`, com opção de digest por e-mail ou notificação, diário ou semanal; filtros salvos não são visíveis a terceiros. |
| RF80.CA10 | Dado uma categoria, área profissional ou família de ocupação, quando a pessoa escolhe "seguir", então novos itens dessa faceta passam a alimentar a aba "Seguindo" e o filtro rápido "o que eu sigo"; seguir tópico não notifica por item (só digest), não concede acesso e é reversível. |
| RF80.CA11 | Dado um item ou autor no feed, quando a pessoa escolhe "ver menos disto", "ocultar item", "ocultar autor no feed" ou define palavras silenciadas, então o ajuste vale só para ela, é persistido no servidor, não altera ACL, não notifica o autor e é reversível em `/settings?tab=privacidade`. |
| RF80.CA12 | Dado um item no feed, quando a pessoa denuncia (motivos: impróprio, dados pessoais, direito autoral, spam, outro; texto ≤ 500), então um `ContentReport` é criado (uma denúncia por pessoa e item; repetida responde `409 JA_DENUNCIADO`), o curador ou o chefe do departamento do item decide com trilha (`AuditLog`); com ≥ 3 denúncias de pessoas distintas o item sai de "em alta" até a análise; denúncia procedente remove o item do índice e notifica o autor com o motivo; improcedente restaura. |
| RF80.CA13 | Dado o feed, quando a pessoa rola ou aciona "Carregar mais", então a paginação é por **cursor opaco e assinado** (sem offset), páginas de 20 (máx. 50), cursor válido por 5 min, profundidade máxima de 50 páginas; a URL reflete filtros e ordenação e o botão voltar restaura o estado; estados de carregamento, vazio e erro são reais. |
| RF80.CA14 | Dado `ws.opensearch.enabled = true`, quando o feed consulta, então usa o índice `ws-feed` com PIT + `search_after`, `aggs` por faceta e o filtro `(PUBLICA) OR (EMPRESA AND companyId = viewer)`; com a flag desligada usa `feed_items` materializada no MySQL com keyset pagination e FULLTEXT, mantendo as facetas principais; falha do índice mostra o estado vazio "índice indisponível", nunca 500, e nunca bloqueia publicar. |
| RF80.CA15 | Dado o `GET /api/feed`, quando chamado, então exige autenticação (`401 NAO_AUTENTICADO`; o visitante anônimo vê só o convite para entrar — proposta, Q-246), aplica rate limit de 60 req/min por pessoa (`429` com `Retry-After`), `viewsCount` incrementa no máximo 1× por pessoa e dia, as respostas têm `Cache-Control: private` e o feed não é indexável por buscadores. |
| RF80.CA16 | Dado a aba "Rede", quando avaliada por acessibilidade, então tem lista semântica com `aria-label`, filtros em `fieldset/legend`, chips removíveis nomeados, `aria-live` ao carregar, foco preservado após a paginação, operação completa por teclado, contraste ≥ 4,5:1 e respeito a `prefers-reduced-motion`; teste axe sem violações críticas. |

## 0. Diagrama de casos de uso

```mermaid
flowchart LR
  classDef ator fill:#fde7d3,stroke:#b4531a,color:#1b1b1b
  classDef atorSis fill:#f1ecf9,stroke:#6a4bb3,color:#1b1b1b
  classDef uc fill:#ffffff,stroke:#3557a6,color:#1b1b1b
  classDef ucPlan fill:#ffffff,stroke:#8a8a8a,stroke-dasharray:4 3,color:#555555
  classDef ucDemo fill:#fff8e6,stroke:#b26a00,stroke-dasharray:2 2,color:#1b1b1b
  visitante["«ator» Visitante"]:::ator
  autenticado["«ator» Pessoa autenticada"]:::ator
  curador["«ator» Curador"]:::ator
  chefe["«ator» Chefe de departamento"]:::ator
  subgraph SIS["Work Station — RF80 Feed da rede"]
    direction TB
    UC1(["UC1 Publicar item para a rede"]):::ucPlan
    UC2(["UC2 Explorar o feed Rede"]):::ucPlan
    UC3(["UC3 Filtrar por campos públicos"]):::ucPlan
    UC4(["UC4 Ordenar por recente, em alta e outros"]):::ucPlan
    UC5(["UC5 Buscar por texto"]):::ucPlan
    UC6(["UC6 Salvar filtro e receber digest"]):::ucPlan
    UC7(["UC7 Seguir categoria, área ou família"]):::ucPlan
    UC8(["UC8 Ajustar o que vejo (ocultar, ver menos)"]):::ucPlan
    UC9(["UC9 Denunciar item"]):::ucPlan
    UC10(["UC10 Decidir denúncia"]):::ucPlan
    UC11(["UC11 Indexar e recalcular em alta"]):::ucPlan
  end
  agendador["«ator» Agendador de trabalhos"]:::atorSis
  email["«ator» Serviço de e-mail"]:::atorSis
  visitante --- UC2
  autenticado --- UC1
  autenticado --- UC2
  autenticado --- UC6
  autenticado --- UC7
  autenticado --- UC8
  autenticado --- UC9
  curador --- UC10
  chefe --- UC10
  UC3 -. "«extend»" .-> UC2
  UC4 -. "«extend»" .-> UC2
  UC5 -. "«extend»" .-> UC2
  UC6 -. "«include»" .-> UC3
  UC10 -. "«include»" .-> UC9
  UC1 -. "«include»" .-> UC11
  UC11 --- agendador
  UC6 --- email
```

| Caso de uso | Ator(es) | CAs | Situação |
|---|---|---|---|
| UC1 Publicar item para a rede | Pessoa autenticada | RF80.CA01, RF80.CA02 | planejado (publicar e `Visibility` reais; metadados de publicação e índice a criar) |
| UC2 Explorar o feed Rede | Pessoa autenticada, Visitante (só convite para entrar, Q-246) | RF80.CA01, RF80.CA07, RF80.CA13, RF80.CA15, RF80.CA16 | planejado (`muralFeed` só DEMO para as outras abas) |
| UC3 Filtrar por campos públicos | Pessoa autenticada | RF80.CA03, RF80.CA04, RF80.CA14 | planejado |
| UC4 Ordenar por recente, em alta e outros | Pessoa autenticada | RF80.CA05, RF80.CA06 | planejado |
| UC5 Buscar por texto | Pessoa autenticada | RF80.CA08 | planejado |
| UC6 Salvar filtro e receber digest | Pessoa autenticada, Serviço de e-mail | RF80.CA09 | planejado |
| UC7 Seguir categoria, área ou família | Pessoa autenticada | RF80.CA10 | planejado |
| UC8 Ajustar o que vejo (ocultar, ver menos) | Pessoa autenticada | RF80.CA11 | planejado |
| UC9 Denunciar item | Pessoa autenticada | RF80.CA12 | planejado |
| UC10 Decidir denúncia | Curador, Chefe de departamento | RF80.CA12 | planejado |
| UC11 Indexar e recalcular em alta | Agendador de trabalhos | RF80.CA01, RF80.CA02, RF80.CA05, RF80.CA06, RF80.CA14 | planejado |

## 1. Diagrama de classes

```mermaid
classDiagram
  class TaskItem {
    <<entity>>
    +UUID id
    +TaskCategory category
    +TaskState state
    +Visibility visibility
    +AccessClass accessClass
    +int likesCount
    +int remixesCount
  }
  class ProjectScheme {
    <<entity>>
    +UUID id
    +ProjectStatus status
    +Visibility visibility
    +UUID companyId
    +int likesCount
    +int remixesCount
  }
  class Visibility {
    <<enum>>
    PRIVADA
    DEPARTAMENTO
    EMPRESA
    PUBLICA
  }
  class PublicationMetadata {
    <<entity>>
    +EditorKind editorKind
    +String contentLanguage
    +String regionCode
    +String occupationFamilyCode
    +List~String~ competencies
    +PublishIdentity publishIdentity
    +boolean remixAllowed
    +Instant publishedAt
  }
  class FeedItem {
    <<entity>>
    +String id
    +String targetType
    +UUID targetId
    +UUID versionId
    +Visibility visibility
    +UUID companyId
    +String workArea
    +boolean remixable
    +boolean sealed
    +Map counters
    +Map trendingScore
    +Instant publishedAt
  }
  class FeedQuery {
    <<entity>>
    +String q
    +List~String~ category
    +List~String~ area
    +List~String~ editor
    +FeedSort sort
    +String period
    +String cursor
    +int size
  }
  class FeedSort {
    <<enum>>
    recent
    trending
    top_likes
    top_remixed
    top_validated
    top_useful
  }
  class SavedFilter {
    <<entity>>
    +UUID id
    +UUID userId
    +String name
    +String queryJson
    +DigestFrequency digest
  }
  class TopicFollow {
    <<entity>>
    +UUID followerId
    +String topicType
    +String topicCode
  }
  class FeedPreference {
    <<entity>>
    +UUID userId
    +List hiddenTargets
    +List hiddenAuthors
    +List mutedTerms
    +Map topicWeights
  }
  class ContentReport {
    <<entity>>
    +UUID id
    +UUID reporterId
    +UUID targetId
    +ReportReason reason
    +ReportStatus status
    +UUID decidedBy
  }
  class Reaction {
    <<entity>>
    +ReactionType reactionType
    +String ignoredReason
  }
  class TrendingSnapshot {
    <<entity>>
    +UUID targetId
    +String window
    +double score
    +Instant computedAt
  }
  class FeedService {
    <<service>>
    +page(viewer, query)
    +facets(viewer, query)
    +item(viewer, type, id)
  }
  class FeedIndexingService {
    <<service>>
    +onPublicationChanged(event)
    +recomputeTrending(window)
  }
  class FeedPreferenceService {
    <<service>>
    +saveFilter(actor, cmd)
    +followTopic(actor, cmd)
    +updatePreferences(actor, cmd)
  }
  class ContentReportService {
    <<service>>
    +report(actor, cmd)
    +decide(curator, id, cmd)
  }
  class SearchIndexPort {
    <<port>>
    +upsert(feedItem)
    +remove(id)
    +query(filter, sort, cursor)
  }
  class VisibilityFilter {
    <<service>>
    +allowedFor(viewer)
    +canView(viewer, item)
  }
  class OpenSearchFeedAdapter {
    <<adapter>>
  }
  class MysqlFeedAdapter {
    <<adapter>>
  }
  class FeedController {
    <<controller>>
  }
  TaskItem --> Visibility
  ProjectScheme --> Visibility
  TaskItem --> PublicationMetadata : versão publicada
  ProjectScheme --> PublicationMetadata : versão publicada
  FeedItem ..> PublicationMetadata : desnormaliza
  FeedItem ..> Reaction : contadores válidos
  TrendingSnapshot ..> FeedItem : explica em alta
  FeedQuery --> FeedSort
  SavedFilter ..> FeedQuery : queryJson
  FeedController --> FeedService
  FeedController --> FeedPreferenceService
  FeedController --> ContentReportService
  FeedService --> SearchIndexPort
  FeedService --> VisibilityFilter
  FeedService ..> FeedPreference : aplica
  FeedIndexingService --> SearchIndexPort
  FeedIndexingService --> TrendingSnapshot
  ContentReportService --> FeedIndexingService
  SearchIndexPort <|.. OpenSearchFeedAdapter
  SearchIndexPort <|.. MysqlFeedAdapter
```

## 2. Diagrama de atividades

Da publicação explícita ao item filtrado no feed, com a remoção quando o item perde a elegibilidade e a denúncia.

```mermaid
flowchart TD
  subgraph H["Pessoa"]
    A1["A1 Publica tarefa ou projeto (Publicar com consciência)"]
    A2["A2 Abre /mural?tab=rede"]
    A3["A3 Escolhe filtros, ordenação e período"]
    A4["A4 Digita busca (opcional)"]
    A5["A5 Rola ou aciona Carregar mais"]
    A6["A6 Salva filtro, segue tópico ou oculta"]
    A7["A7 Denuncia um item"]
    A8["A8 Muda a visibilidade ou despublica"]
  end
  subgraph W["Web/BFF"]
    F1["F1 Serializa FeedQuery na URL"]
    F2["F2 Renderiza cards, facetas com contagem e estados reais"]
    F3["F3 Estado vazio: índice indisponível"]
  end
  subgraph S["ws-application"]
    P1{"P1 Elegível? PUBLICA ou EMPRESA, PUBLICO ou INTERNO, estado elegível"}
    P2["P2 Evento AFTER_COMMIT gera PipelineJob INDEXAR_FEED"]
    P3{"P3 Autenticado e dentro do rate limit?"}
    P4{"P4 FeedQuery válida? q 2–200, size até 50, cursor assinado"}
    P5["P5 Filtro de visibilidade do viewer + facetas + ordenação (em alta = trendingScore, D-150)"]
    P6["P6 Reconfirma canView por id e aplica FeedPreference"]
    P7["P7 Job recalcula trendingScore só com reações válidas, até 2 por autor"]
    P8["P8 ContentReport: 3 ou mais tira de em alta, curador decide"]
    P9{"P9 Índice OpenSearch disponível?"}
  end
  subgraph D["Persistência"]
    D1[("tasks, projects, versões publicadas")]
    D2[("ws-feed (OpenSearch) ou feed_items (MySQL)")]
    D3[("saved_filters, topic_follows, feed_preferences")]
    D4[("content_reports, audit_logs")]
    D5[("Redis: cache por escopo, TTL 60 s a 5 min")]
  end
  A1 --> P1
  P1 -- "não: fica fora do feed" --> D1
  P1 -- sim --> D1 --> P2 --> D2
  A8 --> P2
  P2 -- "remoção prioritária em até 5 s" --> D2
  P2 --> D5
  A2 --> A3 --> F1 --> P3
  A4 --> F1
  A5 --> F1
  P3 -- "não: 401 NAO_AUTENTICADO ou 429" --> F2
  P3 -- sim --> P4
  P4 -- "não: 422 VALIDACAO" --> F2
  P4 -- sim --> P9
  P9 -- sim --> P5
  P9 -- "não: fallback SQL" --> P5
  P9 -- "nenhum disponível" --> F3
  P5 --> D2
  P5 --> D5
  P5 --> P6 --> F2
  P7 --> D2
  A6 --> D3
  A7 --> P8 --> D4
  P8 -- "procedente: remove do índice" --> P2
```

## 3. Diagrama de sequência

```mermaid
sequenceDiagram
  autonumber
  actor U as Usuário
  participant N as Next.js (App Router)
  participant C as Controller (ws-web)
  participant S as Service (ws-application)
  participant R as Repository/MySQL
  participant O as OpenSearch
  participant K as Redis
  participant E as DomainEvents (AFTER_COMMIT)
  U->>N: publica tarefa com visibilidade PUBLICA
  N->>C: POST /api/tasks/{id}/publish com PublicationMetadata
  C->>S: TaskService.publish
  S->>R: grava versão publicada e metadados
  S->>E: PublicationChanged
  E->>S: FeedIndexingService.onPublicationChanged
  S->>O: upsert FeedItem em ws-feed
  U->>N: abre /mural?tab=rede&sort=trending&category=ETP
  N->>C: GET /api/feed?sort=trending&period=7d&category=ETP
  alt sem sessão
    C-->>N: 401 NAO_AUTENTICADO
    N-->>U: convite para entrar (Q-246)
  else q fora de 2 a 200 ou cursor expirado
    C-->>N: 422 VALIDACAO
    N-->>U: mensagem no campo e filtros preservados
  else consulta válida
    C->>S: FeedService.page(viewer, query)
    S->>K: busca cache por escopo e queryHash
    K-->>S: ausente
    S->>O: query com filtro de visibilidade, aggs e search_after
    O-->>S: ids, facetas e sortValues
    S->>R: reconfirma canView por id e lê FeedPreference
    S->>K: grava página no cache com TTL de 5 min
    S-->>C: itens, facetas e nextCursor assinado
    C-->>N: 200 FeedItemView sem campos de carreira nem Hype não público
    N-->>U: cards em alta com contagens por faceta
  end
  U->>N: muda a visibilidade do item para PRIVADA
  N->>C: PUT /api/tasks/{id}/visibility
  C->>S: TaskService.changeVisibility
  S->>E: PublicationChanged
  E->>S: FeedIndexingService remove o FeedItem
  S->>O: remove FeedItem
  S->>K: purga chaves que contêm o item
```

## 4. Máquina de estados

Ciclo do `FeedItem` no índice `ws-feed` (ou na tabela `feed_items`). O `FeedItem` é derivado e reconstruível: os estados descrevem a presença do item no feed, não o estado da tarefa ou do projeto (`TaskState`, `ProjectStatus`).

```mermaid
stateDiagram-v2
  [*] --> PENDENTE : publicação explícita elegível (CA01)
  PENDENTE --> INDEXADO : job INDEXAR_FEED ok, visível em até 30 s
  PENDENTE --> FALHA : índice indisponível (CA14)
  FALHA --> PENDENTE : reprocessar
  INDEXADO --> PENDENTE : nova versão publicada ou contadores recalculados
  INDEXADO --> FORA_DE_EM_ALTA : 3 ou mais denúncias distintas (CA12)
  FORA_DE_EM_ALTA --> INDEXADO : denúncia improcedente
  FORA_DE_EM_ALTA --> REMOVIDO : denúncia procedente
  INDEXADO --> REMOVIDO : perde visibilidade, classificação ou estado, despublicado ou excluído (CA02)
  FORA_DE_EM_ALTA --> REMOVIDO : perde elegibilidade (CA02)
  REMOVIDO --> PENDENTE : republicado por ação explícita
  REMOVIDO --> [*]
  note right of REMOVIDO
    Sai do feed, das contagens de faceta e do cache
    em até 5 s; a URL direta responde 404 (D-141)
  end note
  note right of FORA_DE_EM_ALTA
    Continua em recente e nas demais ordenações,
    mas não pontua em alta até a análise
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph WEB["Next.js (app, components, lib)"]
    MUR["app/(shell)/mural (sub-aba Rede)"]
    FIL["app/(shell)/mural/filtros"]
    FEED["components/social/MuralFeed + FeedFilters + FeedCard"]
    PUB["diálogo Publicar com consciência"]
    RUL["lib/social/rules (canView, countersOf, remixPermission, feedEligibility, trendingScore)"]
  end
  subgraph DATA["contracts/career (dado versionado)"]
    PKS["occupation-packs (rótulos de profissão e competências)"]
  end
  subgraph WSWEB["ws-web"]
    FC["FeedController (/api/feed/**)"]
    CC["CurationController (/api/curation/reports)"]
    RL["RateLimitFilter (60 req/min)"]
  end
  subgraph APP["ws-application"]
    FS["FeedService"]
    FIS["FeedIndexingService"]
    FPS["FeedPreferenceService"]
    CRS["ContentReportService"]
    VF["VisibilityFilter (RF27, RF33)"]
  end
  subgraph DOM["ws-domain"]
    FI["FeedItem · FeedQuery · PublicationMetadata"]
    SOC["Reaction · Remix · Follow · Seal (real)"]
    REP["SavedFilter · TopicFollow · FeedPreference · ContentReport"]
  end
  subgraph INFRA["ws-infrastructure"]
    OS["search-opensearch (ws-feed, SearchIndexPort)"]
    MY["persistence-mysql (feed_items, saved_filters, content_reports)"]
    RD["cache-redis (cache por escopo)"]
    PL["platform (PipelineJob INDEXAR_FEED, agendador)"]
    S3["storage-s3 (miniaturas com URL assinada)"]
  end
  PKS --> PUB
  MUR --> FEED --> FC
  FIL --> FC
  PUB --> FC
  FEED --> RUL
  RL --> FC
  FC --> FS --> VF
  FC --> FPS --> REP
  FC --> CRS --> REP
  CC --> CRS --> FIS
  FS --> FI
  FIS --> FI
  FIS --> SOC
  FS --> OS
  FS --> MY
  FS --> RD
  FIS --> OS
  FIS --> MY
  PL --> FIS
  FEED --> S3
```

## 6. Rastreabilidade

Mensagens = números do `autonumber` da §3. Passos = nós da §2. Componentes = nós da §5. Estados = §4.

| CA | Classe | Passo | Mensagem | Transição | Componente |
|---|---|---|---|---|---|
| RF80.CA01 | `PublicationMetadata`, `FeedItem`, `FeedIndexingService` | A1 → P1 → P2 | 1–7 | `[*] → PENDENTE → INDEXADO` | `PUB`, `FIS`, `OS`, `PL` |
| RF80.CA02 | `FeedIndexingService`, `VisibilityFilter.canView` | A8 → P2 · P6 | 19, 24–30 | `INDEXADO → REMOVIDO` | `FIS`, `VF`, `RD` |
| RF80.CA03 | `FeedQuery`, `FeedItem` | A3 → F1 → P5 → F2 | 8–9, 14–23 | — | `FEED`, `FC`, `FS`, `OS` |
| RF80.CA04 | `FeedItem` (sem campos de carreira), `FeedService` | P5 → P6 | 22 | — | `FS`, `RUL` |
| RF80.CA05 | `FeedSort`, `TrendingSnapshot` | A3 → P5 · P7 | 9, 17 | — | `FS`, `FIS` |
| RF80.CA06 | `Reaction.ignoredReason`, `TrendingSnapshot` | P7 | — | — | `FIS`, `SOC`, `PL` |
| RF80.CA07 | `FeedItem` (contadores, selos, remix) | F2 | 22–23 | — | `FEED`, `RUL`, `S3` |
| RF80.CA08 | `FeedQuery.q` | A4 → P4 | 12–13 | — | `FS`, `OS` |
| RF80.CA09 | `SavedFilter`, `FeedPreferenceService` | A6 | — | — | `FIL`, `FPS`, `MY` |
| RF80.CA10 | `TopicFollow` | A6 | — | — | `FPS`, `REP` |
| RF80.CA11 | `FeedPreference` | A6 · P6 | 19 | — | `FPS`, `FS` |
| RF80.CA12 | `ContentReport`, `ContentReportService` | A7 → P8 → P2 | — | `INDEXADO → FORA_DE_EM_ALTA → REMOVIDO` | `CRS`, `CC`, `FIS` |
| RF80.CA13 | `FeedQuery.cursor` | A5 → F1 → P4 | 9, 21 | — | `FEED`, `FC`, `FS` |
| RF80.CA14 | `SearchIndexPort`, `OpenSearchFeedAdapter`, `MysqlFeedAdapter` | P9 → P5 · F3 | 17 | `PENDENTE → FALHA` | `OS`, `MY` |
| RF80.CA15 | `FeedController` | P3 | 10–11 | — | `RL`, `FC` |
| RF80.CA16 | — (interface) | F2 | 23 | — | `MUR`, `FEED` |
