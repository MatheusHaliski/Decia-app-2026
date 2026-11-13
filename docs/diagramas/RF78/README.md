# RF78 — Memória da Profissão: história, grandes projetos e vitrine da profissão preferida
**HU:** HU78 · **Aba/rota:** Minha profissão › Memória (`/profile?tab=profissao&sec=memoria`, sub-abas História · Grandes projetos · No Work Station); atalhos no Guia de Carreira (RF75) e em Conta ao lado da profissão preferida (RF81); laboratório do curador em `/lab/memoria-profissao` · **Página-esqueleto:** a registrar; jornada ainda não implementada.
**Critérios de aceite cobertos:** RF78.CA01 … RF78.CA12 — requisito proposto na pesquisa [`historia-e-grandes-projetos.md`](../../auditoria/2026-11-02/fontes/historia-e-grandes-projetos.md) §5 (lá numerado RF76) e resumido em [`ABAS_POR_PROFISSAO.md`](../../auditoria/2026-11-02/ABAS_POR_PROFISSAO.md) §6; numerado RF78 pela D-149 (09/11/2026); todos planejados. Depende do `OccupationPack` do RF75.CA19 e da profissão preferida do RF81 (D-148). Já existem no repositório: o esquema e os pacotes (`contracts/career/occupation-pack.schema.json`, `contracts/career/occupation-packs/`), o validador (`npm run career:validate`) e a Vitrine do Mural (RF27, `MuralEntry.kind = DESTAQUE`).

**Trello:** card a criar no board **Work Station**.

**História de usuário:** COMO pessoa que escolheu uma profissão preferida (ou está decidindo qual) QUERO uma aba que conte, com fontes, a história dessa profissão no mundo e no Brasil, mostre os projetos de referência e as peças públicas que pessoas da mesma profissão fizeram no Work Station PARA entender onde estou entrando, me inspirar em trabalhos reais e remixá-los com crédito — sem que isso me compare, ranqueie ou exponha a mim ou a outras pessoas.

**Experiência central:** "Sou um bom engenheiro de software" → a aba Minha profissão abre a seção **Memória** com três sub-abas: **História** (marcos no mundo e no Brasil, regulamentação, figuras de referência com diversidade, evolução das ferramentas, "o que isso significa para quem entra hoje"), **Grandes projetos** (cards com ficha: período, lugar, autores, critérios atendidos, por que importa, números com fonte e data — ex.: Pix, Pampulha, Brasília, Itaipu) e **No Work Station** (peças, tarefas e projetos públicos que pessoas da profissão escolheram destacar, validados por curador, prontos para abrir, salvar, remixar com crédito ou revisar). Todo fato tem fonte; o que diverge aparece como "fontes divergem".

**Conteúdo como dado versionado:** `history` e `landmarkProjects` são seções **opcionais** novas do `OccupationPack` (obrigatórias em pacote `ativo` com `fields.length > 0`; `generico.json` fica isento), com `$defs` novos `i18nText`, `citedSource` (licença por fonte), `verification` (`conferido` · `nao-conferido` · `divergente`), `milestone`, `referencePerson`, `toolsEra`, `landmarkProject` e `review`. Pipeline: IA (serviço `MEMORIA_PROFISSAO` no `AiGateway`, RF43) propõe com uma fonte por afirmação → validador → curador aceita item a item → seed só `ativo` → revisão anual com rebaixamento automático do pacote vencido.

**Regras herdadas:** a vitrine não é ranking de pessoas nem sinal de busca de emprego (D-147); popularidade ≠ qualidade e publicar é opt-in (`REDE_PROFISSIONAL_VISIBILIDADE.md`); validação é humana, a IA só pré-checa e sugere (RF75.CA07, CA10); sem identificadores internos na tela (RF75.CA18).

**Em aberto (Q-251):** a sub-aba No Work Station é a Vitrine do RF27 filtrada por profissão (**recomendado**, modelado aqui: `GET /api/mural?tab=vitrine&occupation=`) ou um feed próprio? A tag de profissão do item pode diferir da profissão preferida (para quem não quer revelá-la)? Os diagramas tratam `ShowcaseEntry.occupationCode` como gravado no opt-in, vindo da profissão preferida ou de uma tag escolhida no diálogo de publicação.

## Critérios de aceite

| CA | Dado / quando / então |
|---|---|
| RF78.CA01 | Dado `User.preferredOccupation` preenchido com um ramo servido por pacote `ativo`, quando a pessoa abre `/profile?tab=profissao&sec=memoria`, então vê as sub-abas História, Grandes projetos e No Work Station com o conteúdo de `history` e `landmarkProjects` desse pacote, no idioma da interface (pt-BR sempre; en/es quando existirem no pacote, senão pt-BR com aviso discreto). |
| RF78.CA02 | Dado que a pessoa não tem profissão preferida ou o pacote não está `ativo`, quando abre a aba, então vê um convite para escolher a profissão (ou o teste de interesses do RF75) e uma prévia do pacote genérico; nenhum erro técnico nem identificador interno aparece (RF75.CA18). |
| RF78.CA03 | Dado qualquer marco, pessoa de referência, projeto ou número exibido, quando renderizado, então mostra "fonte" com título, publicador, data de acesso e licença, abre em nova aba, e itens `verification = divergente` exibem "fontes divergem" com a nota; nenhum item `nao-conferido` chega à tela de produção. |
| RF78.CA04 | Dado o texto da aba, quando lido, então é autoral do Work Station (gerado por IA e revisado), não reproduz trechos de fontes sob CC BY-SA ou "todos os direitos reservados", e imagens só aparecem com `license` permitida e `credit` visível. |
| RF78.CA05 | Dado o pacote da profissão, quando `review.nextReviewDue` passa, então o pacote deixa de ser semeado como `ativo`, a aba mostra "conteúdo em revisão (última revisão em DD/MM/AAAA)" e um item entra na fila do curador; nada é editado automaticamente em produção. |
| RF78.CA06 | Dado o curador no laboratório, quando pede "propor atualização", então a IA (RF43, serviço `MEMORIA_PROFISSAO`) devolve um diff com fontes por item e marcação `conferido`/`nao-conferido`; o curador aceita item a item; a versão do pacote incrementa e o `changelog` registra; sem aceite humano nada muda. |
| RF78.CA07 | Dado uma peça, tarefa ou projeto da pessoa, quando ela publica ou edita a publicação, então existe a opção "destacar na vitrine da minha profissão" (padrão desligado), com "quem verá?", "o que muda?" e "vale para itens antigos?"; a opção só fica ativa se o item é `PUBLICA`, tem versão publicada e créditos preenchidos; coautores precisam concordar. |
| RF78.CA08 | Dado a sub-aba No Work Station, quando carregada, então lista só itens elegíveis por `canView` no servidor, ordenados por "validados" e depois por data, sem curtidas, visualizações, posição, Hype Score ou pontos; contadores só contam itens elegíveis; nenhum card mostra momento de carreira, tipo de conta, cidade ou campo do `CareerProfile` (D-147). |
| RF78.CA09 | Dado um item na vitrine, quando o curador o avalia com a rubrica do pacote, então ele recebe `DESTAQUE` com motivo curto visível ou permanece sem destaque sem notificação pública; o destaque nunca é calculado por popularidade e pode ser contestado pelo autor. |
| RF78.CA10 | Dado um item em destaque que permite remix, quando a pessoa clica "remixar", então nasce um rascunho derivado com autor e versão de origem (D10) e crédito automático; "revisar" abre L10 com a rubrica; itens que não permitem remix não mostram o botão nem são copiados pela IA ou pela exportação. |
| RF78.CA11 | Dado que a pessoa desliga o opt-in, despublica, troca de profissão ou bloqueia alguém, quando a vitrine é lida de novo, então o item sai (ou deixa de aparecer para a pessoa bloqueada); a troca de profissão não move itens antigos sem confirmação; não se promete remoção de cópias já exportadas. |
| RF78.CA12 | Dado qualquer tela do RF78, quando renderizada, então funciona por teclado e leitor de tela, a linha do tempo tem alternativa em lista, imagens têm `alt`, e a interface distingue fato conferido, divergência e conteúdo do próprio Work Station; nenhuma sugestão da IA publica, destaca, segue ou envia mensagem sem confirmação (RF75.CA10). |

## 0. Diagrama de casos de uso

```mermaid
flowchart LR
  classDef ator fill:#fde7d3,stroke:#b4531a,color:#1b1b1b
  classDef atorSis fill:#f1ecf9,stroke:#6a4bb3,color:#1b1b1b
  classDef uc fill:#ffffff,stroke:#3557a6,color:#1b1b1b
  classDef ucPlan fill:#ffffff,stroke:#8a8a8a,stroke-dasharray:4 3,color:#555555
  classDef ucDemo fill:#fff8e6,stroke:#b26a00,stroke-dasharray:2 2,color:#1b1b1b
  autenticado["«ator» Pessoa autenticada"]:::ator
  dono["«ator» Dono do recurso"]:::ator
  colaborador["«ator» Colaborador explícito"]:::ator
  curador["«ator» Curador"]:::ator
  subgraph SIS["Work Station — RF78 Memória da Profissão"]
    direction TB
    UC1(["UC1 Ver a história da profissão"]):::ucPlan
    UC2(["UC2 Ver os grandes projetos"]):::ucPlan
    UC3(["UC3 Consultar fonte e licença"]):::ucPlan
    UC4(["UC4 Ver a vitrine No Work Station"]):::ucPlan
    UC5(["UC5 Remixar ou revisar item da vitrine"]):::ucPlan
    UC6(["UC6 Destacar item na vitrine da profissão"]):::ucPlan
    UC7(["UC7 Consentir com o destaque como coautor"]):::ucPlan
    UC8(["UC8 Retirar item da vitrine"]):::ucPlan
    UC9(["UC9 Avaliar item com a rubrica do pacote"]):::ucPlan
    UC10(["UC10 Contestar avaliação do destaque"]):::ucPlan
    UC11(["UC11 Propor e aceitar atualização do conteúdo"]):::ucPlan
    UC12(["UC12 Rebaixar pacote com revisão vencida"]):::ucPlan
  end
  ia["«ator» IA"]:::atorSis
  agendador["«ator» Agendador de trabalhos"]:::atorSis
  dono -- "é um" --> autenticado
  autenticado --- UC1
  autenticado --- UC2
  autenticado --- UC4
  autenticado --- UC5
  dono --- UC6
  dono --- UC8
  dono --- UC10
  colaborador --- UC7
  curador --- UC9
  curador --- UC11
  UC1 -. "«include»" .-> UC3
  UC2 -. "«include»" .-> UC3
  UC5 -. "«extend»" .-> UC4
  UC6 -. "«include»" .-> UC7
  UC10 -. "«extend»" .-> UC9
  UC12 -. "«extend»" .-> UC11
  UC6 --- ia
  UC11 --- ia
  UC12 --- agendador
```

| Caso de uso | Ator(es) | CAs | Situação |
|---|---|---|---|
| UC1 Ver a história da profissão | Pessoa autenticada | RF78.CA01, RF78.CA02, RF78.CA04, RF78.CA12 | planejado |
| UC2 Ver os grandes projetos | Pessoa autenticada | RF78.CA01, RF78.CA04, RF78.CA12 | planejado |
| UC3 Consultar fonte e licença | Pessoa autenticada | RF78.CA03, RF78.CA04 | planejado |
| UC4 Ver a vitrine No Work Station | Pessoa autenticada | RF78.CA08, RF78.CA11 | planejado (Vitrine do RF27 filtrada, Q-251) |
| UC5 Remixar ou revisar item da vitrine | Pessoa autenticada | RF78.CA10 | planejado |
| UC6 Destacar item na vitrine da profissão | Dono do recurso, IA (só sugere) | RF78.CA07, RF78.CA12 | planejado |
| UC7 Consentir com o destaque como coautor | Colaborador explícito | RF78.CA07 | planejado |
| UC8 Retirar item da vitrine | Dono do recurso | RF78.CA11 | planejado |
| UC9 Avaliar item com a rubrica do pacote | Curador | RF78.CA09 | planejado |
| UC10 Contestar avaliação do destaque | Dono do recurso | RF78.CA09 | planejado |
| UC11 Propor e aceitar atualização do conteúdo | Curador, IA | RF78.CA06 | planejado |
| UC12 Rebaixar pacote com revisão vencida | Agendador de trabalhos | RF78.CA05 | planejado |

## 1. Diagrama de classes

```mermaid
classDiagram
  class User {
    <<entity>>
    +UUID id
    +String preferredOccupationCode
    +OccupationVisibility preferredOccupationVisibility
  }
  class OccupationPack {
    <<entity>>
    +String code
    +String version
    +PackStatus status
    +History history
    +LandmarkProjects landmarkProjects
  }
  class ProfessionHistoryEntry {
    <<entity>>
    +int year
    +String where
    +String category
    +LocalizedLabel title
    +I18nText why
    +String wikidataId
    +Verification verification
  }
  class LandmarkProject {
    <<entity>>
    +String id
    +LocalizedLabel title
    +String kind
    +String scope
    +Period period
    +Place place
    +List authors
    +List criteria
    +I18nText summary
    +I18nText whyItMatters
    +List figures
    +Image image
    +List relatedCompetencies
    +Verification verification
  }
  class CitedSource {
    <<entity>>
    +String title
    +String url
    +String publisher
    +LocalDate accessedAt
    +SourceLicense license
    +String kind
    +String usedFor
  }
  class ContentReview {
    <<entity>>
    +String generatedBy
    +String model
    +LocalDate generatedAt
    +String reviewedBy
    +LocalDate reviewedAt
    +LocalDate nextReviewDue
    +ReviewStatus status
    +List changelog
  }
  class ShowcaseEntry {
    <<entity>>
    +UUID id
    +ShowcaseTargetType targetType
    +UUID targetId
    +String publishedVersion
    +String occupationCode
    +UUID ownerId
    +List coauthorConsents
    +Instant optInAt
    +ShowcaseCuration curation
    +String curationReason
    +UUID curatedBy
    +Instant removedAt
  }
  class ShowcaseSuggestion {
    <<entity>>
    +UUID id
    +String packCode
    +UUID authorId
    +String proposal
    +CitedSource source
  }
  class MuralEntry {
    <<entity>>
    +UUID id
    +MuralKind kind
    +String targetType
    +UUID targetId
  }
  class Verification {
    <<enum>>
    CONFERIDO
    NAO_CONFERIDO
    DIVERGENTE
  }
  class ReviewStatus {
    <<enum>>
    PESQUISA
    REVISADO
    ATIVO
    VENCIDO
  }
  class ShowcaseCuration {
    <<enum>>
    NAO_AVALIADO
    DESTAQUE
    SEM_DESTAQUE
  }
  class ShowcaseTargetType {
    <<enum>>
    LETTER
    DRAWING
    TASK
    PROJECT
  }
  class ProfessionMemoryService {
    <<service>>
    +memory(actor, lang)
  }
  class PackReviewService {
    <<service>>
    +propose(curator, packCode)
    +accept(curator, proposalId, items)
    +expireDue(now)
  }
  class ShowcaseService {
    <<service>>
    +list(actor, occupation, cursor)
    +optIn(actor, target, idempotencyKey)
    +consent(coauthor, entryId)
    +curate(curator, entryId, result, reason)
    +contest(owner, entryId, text)
    +remove(actor, entryId)
  }
  class OccupationCatalogPort {
    <<port>>
    +packFor(code)
  }
  class AiGateway {
    <<port>>
    +memoriaProfissao(pack, sources)
    +suggestShowcase(item)
  }
  class MuralController {
    <<controller>>
    +vitrine(occupation, cursor)
  }
  User ..> OccupationPack : preferredOccupationCode
  OccupationPack "1" --> "*" ProfessionHistoryEntry : history
  OccupationPack "1" --> "*" LandmarkProject : landmarkProjects
  OccupationPack --> ContentReview : review
  ProfessionHistoryEntry --> CitedSource
  LandmarkProject --> CitedSource
  ProfessionHistoryEntry --> Verification
  LandmarkProject --> Verification
  ContentReview --> ReviewStatus
  ShowcaseEntry --> ShowcaseCuration
  ShowcaseEntry --> ShowcaseTargetType
  ShowcaseEntry ..> MuralEntry : DESTAQUE filtrado por profissão
  ShowcaseSuggestion ..> OccupationPack : fila do curador
  ProfessionMemoryService --> OccupationCatalogPort
  PackReviewService --> OccupationCatalogPort
  PackReviewService --> AiGateway
  PackReviewService --> ContentReview
  ShowcaseService --> ShowcaseEntry
  ShowcaseService --> AiGateway
  MuralController --> ShowcaseService
```

## 2. Diagrama de atividades

Da leitura da memória da profissão ao destaque de uma peça na vitrine, com a curadoria do conteúdo e a revisão anual.

```mermaid
flowchart TD
  subgraph H["Pessoa / Dono / Coautor / Curador"]
    A1["A1 Abre Minha profissão › Memória"]
    A2["A2 Lê História e Grandes projetos e abre uma fonte"]
    A3["A3 Abre No Work Station"]
    A4["A4 Remixa ou revisa um item"]
    A5["A5 No diálogo de publicação liga destacar na vitrine da minha profissão"]
    A6["A6 Coautor concorda"]
    A7["A7 Desliga o opt-in, despublica, troca a profissão ou bloqueia alguém"]
    K1["K1 Curador avalia o item com a rubrica do pacote"]
    K2["K2 Curador pede propor atualização no laboratório"]
    K3["K3 Curador aceita ou recusa item a item"]
    A8["A8 Autor contesta a avaliação"]
  end
  subgraph W["Web/BFF"]
    F1{"F1 Tem profissão preferida com pacote ativo?"}
    F2["F2 Convite para escolher a profissão ou teste de interesses + prévia do genérico"]
    F3["F3 Linha do tempo (com alternativa em lista) e cards com fonte, licença e fontes divergem"]
    F4["F4 Cards Em destaque · Recentes · Para remixar, sem curtidas, views nem posição"]
    F5["F5 Explica quem verá, o que muda, vale para itens antigos"]
  end
  subgraph S["ws-application"]
    P1["P1 ProfessionMemoryService filtra itens nao-conferido e escolhe o idioma"]
    P2["P2 ShowcaseService.list: elegíveis por canView, validados e depois data"]
    P3{"P3 Item PUBLICA, versão publicada e créditos?"}
    P4{"P4 Todos os coautores consentiram?"}
    P5["P5 Grava ShowcaseEntry NAO_AVALIADO com occupationCode do momento"]
    P6["P6 Grava DESTAQUE com motivo ou SEM_DESTAQUE sem aviso público"]
    P7["P7 Marca removedAt e tira da leitura seguinte"]
    P8["P8 PackReviewService grava diff pendente"]
    P9["P9 Validador: esquema + checagens cruzadas"]
    P10["P10 Incrementa versão AAAA.MM.N e changelog, status ativo"]
    P11["P11 Agendador: nextReviewDue vencido rebaixa a revisado e abre item na fila"]
    P12{"P12 Remix permitido?"}
    P13["P13 Cria rascunho derivado com autor e versão de origem"]
  end
  subgraph I["IA (AiEngine)"]
    I1["I1 MEMORIA_PROFISSAO: diff com CitedSource por afirmação e verification"]
    I2["I2 Sugere à pessoa: esta peça atende aos critérios, quer destacar?"]
  end
  subgraph D["Persistência"]
    D1[("occupation_packs: history_json, landmark_projects_json")]
    D2[("pack_reviews")]
    D3[("showcase_entries")]
    D4[("mural_entries kind DESTAQUE")]
  end
  A1 --> F1
  F1 -- não --> F2
  F1 -- sim --> P1 --> D1
  P1 --> F3 --> A2
  A2 --> A3 --> P2 --> D3
  P2 --> D4
  P2 --> F4 --> A4 --> P12
  P12 -- sim --> P13
  P12 -- "não: botão oculto, sem cópia" --> F4
  I2 -.-> A5
  A5 --> F5 --> P3
  P3 -- "não: 422 VALIDACAO showcaseOptIn" --> A5
  P3 -- sim --> P4
  P4 -- "não: 409 COAUTORES_PENDENTES" --> A6 --> P4
  P4 -- sim --> P5 --> D3
  P5 --> K1 --> P6 --> D3
  P6 --> A8 --> K1
  A7 --> P7 --> D3
  K2 --> I1 --> P9 --> P8 --> D2
  P8 --> K3 --> P10 --> D1
  P11 --> D1
  P11 --> K2
```

## 3. Diagrama de sequência

```mermaid
sequenceDiagram
  autonumber
  actor U as Usuário
  participant N as Next.js (App Router)
  participant C as Controller (ws-web)
  participant S as Service (ws-application)
  participant A as AiEngine
  participant R as Repository/MySQL
  participant E as DomainEvents (AFTER_COMMIT)
  U->>N: abre /profile?tab=profissao&sec=memoria
  N->>C: GET /api/me/occupation/memory?lang=pt-BR
  C->>S: ProfessionMemoryService.memory(actor, lang)
  S->>R: select occupation_packs do ramo com status ativo
  S-->>C: história e grandes projetos só conferidos ou divergentes, com fontes e licença
  C-->>N: 200 ProfessionMemoryView
  N-->>U: História e Grandes projetos com fonte e fontes divergem
  U->>N: abre No Work Station
  N->>C: GET /api/mural?tab=vitrine&occupation=arquitetura-e-urbanismo
  C->>S: ShowcaseService.list(actor, occupation)
  S->>R: select showcase_entries elegíveis com canView por item
  S-->>C: Em destaque, Recentes, Para remixar (sem curtidas nem posição)
  C-->>N: 200 cards sem campos de carreira
  U->>N: no diálogo de publicação liga destacar na vitrine da minha profissão
  N->>C: POST /api/showcase/entries (Idempotency-Key)
  C->>S: ShowcaseService.optIn
  alt item não é PUBLICA, sem versão publicada ou sem créditos
    S-->>C: 422 VALIDACAO fields.showcaseOptIn
    C-->>N: 422
    N-->>U: Publique o item e preencha os créditos para destacar
  else coautor ainda não concordou
    S-->>C: 409 COAUTORES_PENDENTES
    C-->>N: 409
    N-->>U: Aguardando a concordância dos coautores
  else elegível
    S->>R: insert showcase_entries NAO_AVALIADO com occupationCode do momento
    S->>E: ShowcaseOptedIn (fila do curador)
    S-->>C: 201 ShowcaseEntry
    C-->>N: 201
  end
  U->>N: curador em /lab/memoria-profissao pede propor atualização
  N->>C: POST /api/lab/memoria-profissao/arquitetura-e-urbanismo/proposals
  C->>S: PackReviewService.propose
  S->>A: MEMORIA_PROFISSAO (pacote e fontes atuais)
  A-->>S: diff com CitedSource por item e verification
  S->>R: insert pack_reviews pendente após o validador
  S-->>C: 201 diff
  C-->>N: 201
  U->>N: curador aceita item a item
  N->>C: POST /api/lab/memoria-profissao/proposals/accept
  C->>S: PackReviewService.accept
  S->>R: update occupation_packs com nova versão e changelog
  S-->>C: 200 nova versão
  C-->>N: 200
```

## 4. Máquina de estados

`ShowcaseEntry` (curadoria do item na vitrine da profissão), entidade central da sub-aba No Work Station.

```mermaid
stateDiagram-v2
  [*] --> AGUARDANDO_COAUTORES : opt-in do dono com coautores (CA07)
  [*] --> NAO_AVALIADO : opt-in do dono, item elegível (CA07)
  AGUARDANDO_COAUTORES --> NAO_AVALIADO : todos os coautores concordam
  NAO_AVALIADO --> DESTAQUE : curador aplica a rubrica, motivo visível (CA09)
  NAO_AVALIADO --> SEM_DESTAQUE : curador não destaca, sem aviso público (CA09)
  SEM_DESTAQUE --> NAO_AVALIADO : autor contesta (CA09)
  DESTAQUE --> NAO_AVALIADO : nova versão publicada
  AGUARDANDO_COAUTORES --> REMOVIDO : dono desiste
  NAO_AVALIADO --> REMOVIDO : desliga opt-in, despublica ou troca de profissão confirmada (CA11)
  DESTAQUE --> REMOVIDO : desliga opt-in ou despublica (CA11)
  SEM_DESTAQUE --> REMOVIDO : desliga opt-in ou despublica (CA11)
  REMOVIDO --> [*]
  note right of DESTAQUE
    Nunca por curtidas, views, Hype ou pontos (CA08).
    Bloqueio oculta o item só para a pessoa bloqueada.
  end note
```

`ContentReview.status` do conteúdo `history`/`landmarkProjects` de um pacote (ciclo de curadoria e revisão anual).

```mermaid
stateDiagram-v2
  [*] --> PESQUISA : IA propõe com fontes (CA06)
  PESQUISA --> REVISADO : validador ok e curador revisa fato a fato
  REVISADO --> ATIVO : nenhum item nao-conferido, en e es revisados
  ATIVO --> VENCIDO : nextReviewDue passou (CA05)
  VENCIDO --> REVISADO : agendador rebaixa e abre item na fila
  ATIVO --> PESQUISA : curador pede propor atualização (diff)
  REVISADO --> PESQUISA : curador recusa itens
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph WEB["Next.js (app, components, lib)"]
    MEM["components/career/ProfessionMemory (História, Grandes projetos)"]
    SHW["components/career/ProfessionShowcase (No Work Station)"]
    PUB["components/publish/PublishDialog (destacar na vitrine)"]
    LAB["app/(shell)/lab/memoria-profissao (diff do curador)"]
    LIB["lib/career/occupationPack (tipos) · lib/i18n/messages"]
    REG["lib/pages/registry (sec=memoria)"]
  end
  subgraph DATA["contracts/career (dado versionado)"]
    SCH["occupation-pack.schema.json (history, landmarkProjects, citedSource, review)"]
    PKS["occupation-packs/*.json"]
    VAL["scripts/career/validar-pacotes.mjs"]
  end
  subgraph WSWEB["ws-web"]
    OC["OccupationController (/api/me/occupation/memory)"]
    MC["MuralController (?tab=vitrine&occupation=)"]
    SC["ShowcaseController (/api/showcase/entries)"]
    LC["LabController (/api/lab/memoria-profissao)"]
  end
  subgraph APP["ws-application"]
    PMS["ProfessionMemoryService"]
    SS["ShowcaseService"]
    PRS["PackReviewService"]
    PS["PublicationService (extensão)"]
  end
  subgraph DOM["ws-domain"]
    OP["OccupationPack · ProfessionHistoryEntry · LandmarkProject · CitedSource · ContentReview"]
    SE["ShowcaseEntry · ShowcaseCuration"]
  end
  subgraph INFRA["ws-infrastructure"]
    MYSQL["persistence-mysql (V65 occupation_packs, V67 pack_reviews, V68 showcase_entries)"]
    AIG["ai-providers / AiGateway (RF43): MEMORIA_PROFISSAO"]
    JOB["platform: agendador de vencimento"]
  end
  SCH --> VAL --> PKS --> MYSQL
  SCH --> LIB
  MEM --> LIB
  MEM --> OC --> PMS --> OP
  SHW --> MC --> SS --> SE
  PUB --> SC --> SS
  PS --> SS
  LAB --> LC --> PRS --> OP
  PRS --> AIG
  SS --> AIG
  JOB --> PRS
  PMS --> MYSQL
  SS --> MYSQL
  PRS --> MYSQL
  REG --> MEM
```

## 6. Rastreabilidade

Mensagens = números do `autonumber` da §3 (contando as do `alt`: 17–19 = 422, 20–22 = 409, 23–26 = elegível). Passos = nós da §2. Transições = §4 (`ShowcaseEntry` e `ContentReview`). Componentes = nós da §5.

| CA | Classe | Passo | Mensagem | Transição | Componente |
|---|---|---|---|---|---|
| RF78.CA01 | `OccupationPack.history`, `LandmarkProject`, `ProfessionMemoryService` | A1 → F1 → P1 → F3 → A2 | 1–7 | — | `MEM`, `OC`, `PMS`, `MYSQL` |
| RF78.CA02 | `User.preferredOccupationCode`, `OccupationPack` (genérico) | F1 → F2 | 1–3 | — | `MEM`, `LIB` |
| RF78.CA03 | `CitedSource`, `Verification` | P1 → F3 → A2 | 4–7 | `REVISADO → ATIVO` | `MEM`, `VAL` |
| RF78.CA04 | `CitedSource.license`, `LandmarkProject.image` | P9 → F3 | 5, 31 | `PESQUISA → REVISADO` | `SCH`, `VAL`, `MEM` |
| RF78.CA05 | `ContentReview.nextReviewDue`, `PackReviewService.expireDue` | P11 → K2 | — | `ATIVO → VENCIDO → REVISADO` | `JOB`, `PRS` |
| RF78.CA06 | `ContentReview`, `AiGateway.memoriaProfissao`, `PackReviewService` | K2 → I1 → P9 → P8 → K3 → P10 | 27–40 | `[*] → PESQUISA`, `ATIVO → PESQUISA` | `LAB`, `LC`, `PRS`, `AIG` |
| RF78.CA07 | `ShowcaseEntry.coauthorConsents`, `ShowcaseService.optIn` | A5 → F5 → P3 → P4 → A6 → P5 | 14–26 | `[*] → AGUARDANDO_COAUTORES → NAO_AVALIADO` | `PUB`, `SC`, `SS`, `PS` |
| RF78.CA08 | `ShowcaseService.list`, `MuralEntry` | A3 → P2 → F4 | 8–13 | — | `SHW`, `MC`, `SS` |
| RF78.CA09 | `ShowcaseCuration`, `ShowcaseService.curate`, `contest` | K1 → P6 → A8 | 24 | `NAO_AVALIADO → DESTAQUE`, `NAO_AVALIADO → SEM_DESTAQUE`, `SEM_DESTAQUE → NAO_AVALIADO` | `SS` |
| RF78.CA10 | `ShowcaseEntry`, remix (D10), revisão (L10) | A4 → P12 → P13 | — | — | `SHW`, `SS` |
| RF78.CA11 | `ShowcaseEntry.removedAt`, `ShowcaseService.remove` | A7 → P7 | — | `* → REMOVIDO` | `SHW`, `SS` |
| RF78.CA12 | todas as telas, `AiGateway.suggestShowcase` | F3 · I2 → A5 | 7, 14 | — | `MEM`, `SHW`, `PUB`, `LIB` |
