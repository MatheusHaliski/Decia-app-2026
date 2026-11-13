# RF81 — Cadastrar-se com a profissão preferida para criar tarefas e projetos únicos da própria área
**HU:** HU81 · **Aba/rota:** Cadastro (`/register`), Conta (`/settings?tab=conta`), criador de tarefas e projetos com modelos da profissão (`/tasks/new?modelo=`, `/projects/new?modelo=`) · **Página-esqueleto:** a registrar; jornada ainda não implementada.
**Critérios de aceite cobertos:** RF81.CA01 … RF81.CA10 — requisito novo pedido pelo usuário em 09/11/2026; todos planejados. Concretiza a decisão D-148 (profissão preferida já no cadastro) e o campo `User.preferredOccupation` do RF75.CA19. Já existem no repositório: o catálogo de 79 ramos (`contracts/career/academic-fields.json`), um pacote de domínio por ramo mais o genérico (`contracts/career/occupation-packs/`), o validador (`npm run career:validate`) e os helpers de busca e de pacote (`lib/career/`).

**Trello:** card a criar no board **Work Station** (esta sessão não tem acesso ao Trello; o texto do card está em [`TRELLO_CARD.md`](TRELLO_CARD.md)).

**História de usuário:** COMO usuário QUERO me cadastrar no Work Station com a minha profissão preferida PARA criar tarefas e projetos únicos de minha área de estudo ou trabalho, a fim de agregar em minha formação acadêmica e profissional.

**Experiência central:** no cadastro, depois dos dados da conta, a pergunta opcional "Qual profissão você quer desenvolver?" com autocompletar sobre os 79 ramos (sem caixa nem acento; "advogada" encontra Direito) e a opção "ainda não sei". Ao entrar, o criador de tarefas e projetos oferece **modelos da profissão** (as tarefas-guia do pacote, já parametrizadas: planta 1:50 com NBR 6492 para Arquitetura, parecer sobre caso fictício para Direito, relatório técnico e diagrama para Engenharia de Software), cada um gerado com dados próprios para a pessoa — a peça é dela, única, e vira evidência para a formação quando concluída.

**Regras herdadas:** a profissão preferida é privada por padrão e **não é sinal de busca de emprego** (D-147); dados sensíveis não são perguntados nem inferidos (RF75.CA12); a IA só pré-checa critérios objetivos e nunca produz peça assinável (RF75.CA06, pacotes `ai.guardrails`).

## Estado da implementação (frontend · novembro de 2026)

Já existe no criador de tarefas (`/tasks/new`, `components/tasks/TaskAssist.tsx`) a parte do RF81 que não depende do cadastro:
o **campo de estudo como lente da tarefa** (os 79 ramos, cada um com a área de trabalho padrão e o pacote de domínio carregado sob
demanda — `lib/tasks/fieldIndex.gen.ts`, gerado por `npm run career:index`), os **modelos iniciais** da área (51 modelos para as 9
`WorkArea`, `lib/tasks/areaTemplates.ts`) e do campo (tarefas-guia e próprias do pacote, `packTemplates`), abertos também por
`/tasks/new?modelo=<id>`, e o **feedback de qualidade** determinístico (`lib/tasks/quality.ts`): essencial (objetivo tangível,
entregas como substantivos, critérios verificáveis, prazo, privacidade), regras da área (ex.: Jurídico — número CNJ, base legal e
prazo; Pesquisa — pergunta, método, amostra e consentimento; Engenharia — norma e ART) e do campo (rubrica, entregas típicas, fontes
e dados sensíveis do pacote), cada achado com a correção aplicável em um clique. A tarefa grava o campo usado em
`extensions.studyField`. Ainda planejado: a pergunta no cadastro e em Conta (`User.preferredOccupation`), a origem `PROFISSAO`
(CA05) e os modelos no criador de projetos.

## Critérios de aceite

| CA | Dado / quando / então |
|---|---|
| RF81.CA01 | Dado o formulário de cadastro, quando a pessoa chega ao passo de perfil, então vê a pergunta opcional "Qual profissão você quer desenvolver?" com "por que pergunto" ("para sugerir tarefas e projetos da sua área"), autocompletar a partir de 2 caracteres sobre rótulo e aliases do catálogo (sem caixa nem acento, até 8 sugestões, ordem: rótulo igual, rótulo começa, alias igual, alias começa, contém) e a opção "ainda não sei"; pular não bloqueia o cadastro. |
| RF81.CA02 | Dado o envio do cadastro com `preferredOccupationCode`, quando o servidor valida, então o código precisa existir no catálogo versionado; o rótulo gravado vem do catálogo (nunca do cliente); código desconhecido responde `422 VALIDACAO` com `details.fields.preferredOccupationCode` e nada é criado; a conta nasce com `preferredOccupationVisibility = SO_EU`. |
| RF81.CA03 | Dado a profissão preferida gravada, quando terceiros (outra pessoa, chefe, empresa, administrador, curador) consultam perfil, busca, pessoas semelhantes ou painéis, então o campo não aparece enquanto a pessoa não marcar "mostrar no meu perfil" em Conta; mesmo visível, nunca é filtro de busca de pessoas nem sinal de disponibilidade para emprego (D-147). |
| RF81.CA04 | Dado o primeiro acesso com profissão preferida, quando a pessoa abre "Nova tarefa" ou "Novo projeto", então o criador mostra a seção "Modelos da sua área" com as tarefas-guia do `OccupationPack` do ramo na ordem de `guidedTasks.priority`, sem as excluídas e, no celular, sem as que exigem computador (D3, D8); cada modelo diz competência, entregável, tempo, critérios e "por que este modelo". |
| RF81.CA05 | Dado um modelo escolhido, quando a pessoa confirma "Criar a partir do modelo", então nasce uma `TaskItem` real (RF4) com origem `PROFISSAO`, título, categoria, critérios e parâmetros do pacote, e o caso, os dados e o contexto do enunciado são **gerados para essa pessoa** (variação paramétrica com semente própria; a IA via `AiGateway` só quando o modo de autonomia permitir, senão a variação determinística do pacote), de modo que duas pessoas não recebam o mesmo enunciado; a tarefa abre no Letters ou no Drawings com o painel Guia; a mesma confirmação repetida com a mesma `Idempotency-Key` não duplica (`200` com a tarefa existente). |
| RF81.CA06 | Dado um projeto criado a partir de modelos da área, quando a pessoa agrupa duas ou mais tarefas da profissão, então o projeto (RF21) recebe fases sugeridas pelo pacote (ex.: levantamento → projeto → detalhamento → apresentação) que a pessoa pode editar; nada é publicado sem ação explícita (`REDE_PROFISSIONAL_VISIBILIDADE.md`). |
| RF81.CA07 | Dado "ainda não sei" ou cadastro sem profissão, quando a pessoa entra, então vale o pacote genérico (competências transversais), o criador mostra "Modelos para começar" e o guia oferece o teste de interesses (RF75.CA03); a qualquer momento a pessoa escolhe a profissão em Conta. |
| RF81.CA08 | Dado a troca da profissão preferida em Conta, quando salva, então os modelos e sugestões passam a vir do novo pacote, tarefas, projetos e evidências já criados permanecem e ficam rotulados com o pacote de origem, e o `AuditLog PROFILE_UPDATED` registra só o nome do campo (sem valores). |
| RF81.CA09 | Dado uma tarefa da profissão concluída, quando a pessoa declara autoria e ausência de dado confidencial, então a pré-checagem objetiva do pacote roda (`rubric.objective` com `auto = true`), a tarefa gera `Evidence` e, com validação humana, `CompetencyEvidence` exportável (Open Badges 3.0) — o registro que "agrega à formação"; a IA nunca dá a validação. |
| RF81.CA10 | Dado o campo e as telas do RF, quando renderizados ou exportados, então funcionam por teclado e leitor de tela (combobox com `aria-activedescendant`), têm textos pt-BR/en/es sem identificadores internos, entram na exportação de dados da conta (LGPD art. 18) e a anonimização da conta zera código, rótulo e visibilidade. |

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
  subgraph SIS["Work Station — RF81 Cadastro com profissão preferida"]
    direction TB
    UC1(["UC1 Cadastrar-se informando a profissão preferida"]):::ucPlan
    UC2(["UC2 Buscar profissão no catálogo"]):::ucPlan
    UC3(["UC3 Criar tarefa a partir de modelo da área"]):::ucPlan
    UC4(["UC4 Montar projeto com tarefas da área"]):::ucPlan
    UC5(["UC5 Trocar a profissão em Conta"]):::ucPlan
    UC6(["UC6 Concluir tarefa e gerar evidência"]):::ucPlan
    UC7(["UC7 Validar evidência"]):::ucPlan
  end
  ia["«ator» IA"]:::atorSis
  visitante --- UC1
  autenticado --- UC3
  autenticado --- UC4
  autenticado --- UC5
  autenticado --- UC6
  curador --- UC7
  UC1 -. "«include»" .-> UC2
  UC5 -. "«include»" .-> UC2
  UC4 -. "«include»" .-> UC3
  UC6 -. "«extend»" .-> UC3
  UC7 -. "«extend»" .-> UC6
  UC3 --- ia
  UC6 --- ia
```

| Caso de uso | Ator(es) | CAs | Situação |
|---|---|---|---|
| UC1 Cadastrar-se informando a profissão preferida | Visitante | RF81.CA01, RF81.CA02, RF81.CA07 | planejado |
| UC2 Buscar profissão no catálogo | Visitante, Pessoa autenticada | RF81.CA01, RF81.CA10 | planejado (busca pura já em `lib/career/academicFields.ts`) |
| UC3 Criar tarefa a partir de modelo da área | Pessoa autenticada, IA | RF81.CA04, RF81.CA05 | planejado |
| UC4 Montar projeto com tarefas da área | Pessoa autenticada | RF81.CA06 | planejado |
| UC5 Trocar a profissão em Conta | Pessoa autenticada | RF81.CA03, RF81.CA08 | planejado |
| UC6 Concluir tarefa e gerar evidência | Pessoa autenticada, IA | RF81.CA09 | planejado |
| UC7 Validar evidência | Curador | RF81.CA09 | planejado |

## 1. Diagrama de classes

```mermaid
classDiagram
  class User {
    <<entity>>
    +UUID id
    +String preferredOccupationCode
    +String preferredOccupationLabel
    +OccupationVisibility preferredOccupationVisibility
  }
  class OccupationVisibility {
    <<enum>>
    SO_EU
    PERFIL
  }
  class AcademicField {
    <<entity>>
    +String code
    +LocalizedLabel label
    +List aliases
    +List cbo
    +List neighbors
  }
  class OccupationPack {
    <<entity>>
    +String code
    +String version
    +List fields
    +GuidedTasks guidedTasks
    +Rubric rubric
    +AiConfig ai
  }
  class GuidedTaskTemplate {
    <<entity>>
    +String code
    +String editor
    +List criteria
    +String time
  }
  class TaskItem {
    <<entity>>
    +UUID id
    +TaskOrigin origin
    +String packCode
    +String packVersion
    +long variantSeed
  }
  class Evidence {
    <<entity>>
    +String url
    +String version
  }
  class CompetencyEvidence {
    <<entity>>
    +String competency
    +UUID validatedBy
  }
  class RegistrationService {
    <<service>>
    +register(cmd, ctx)
  }
  class OccupationService {
    <<service>>
    +search(q)
    +mine(actor)
    +update(actor, cmd, ctx)
  }
  class OccupationTemplateService {
    <<service>>
    +templates(actor, device)
    +instantiate(actor, templateCode, idempotencyKey)
  }
  class OccupationCatalogPort {
    <<port>>
    +field(code)
    +packFor(code)
  }
  class AiGateway {
    <<port>>
    +vary(pack, template, seed)
  }
  User --> OccupationVisibility
  User ..> AcademicField : preferredOccupationCode
  AcademicField --> OccupationPack : servido por
  OccupationPack --> GuidedTaskTemplate : priority
  TaskItem ..> GuidedTaskTemplate : criada a partir de
  TaskItem --> Evidence
  Evidence --> CompetencyEvidence
  RegistrationService --> OccupationCatalogPort
  OccupationService --> OccupationCatalogPort
  OccupationTemplateService --> OccupationCatalogPort
  OccupationTemplateService --> AiGateway
  OccupationTemplateService --> TaskItem
```

## 2. Diagrama de atividades

Do cadastro com a profissão preferida até a tarefa única da área concluída como evidência da formação. Versão em imagem (para o card do Trello): [`atividades.png`](atividades.png).

```mermaid
flowchart TD
  subgraph H["Pessoa"]
    A0["A0 Preenche nome, e-mail, senha e tipo de conta"]
    A1["A1 Digita a profissão (2+ letras)"]
    A2{"A2 Achou a profissão?"}
    A3["A3 Escolhe um ramo da lista"]
    A4["A4 Marca ainda não sei ou pula"]
    A5["A5 Confirma e-mail e entra"]
    A6["A6 Abre Nova tarefa ou Novo projeto"]
    A7["A7 Escolhe um modelo da sua área"]
    A8["A8 Faz a peça no Letters ou no Drawings"]
    A9["A9 Declara autoria e sem dado confidencial"]
    A10["A10 Troca a profissão em Conta (opcional)"]
  end
  subgraph W["Web/BFF"]
    F1["F1 Autocompletar: searchAcademicFields sem caixa nem acento"]
    F2["F2 Envia cadastro com preferredOccupationCode"]
    F3["F3 Criador mostra Modelos da sua área ou Modelos para começar"]
    F4["F4 Painel Guia: critérios, tempo, por que este modelo"]
  end
  subgraph S["ws-application"]
    P1{"P1 Código existe no catálogo?"}
    P2["P2 RegistrationService grava rótulo do catálogo e visibilidade SO_EU"]
    P3["P3 OccupationTemplateService: pacote do ramo ou genérico, prioridade, exclusões, aparelho"]
    P4{"P4 Mesma Idempotency-Key?"}
    P5["P5 Cria TaskItem origem PROFISSAO com semente própria"]
    P6["P6 Pré-checagem objetiva do pacote"]
    P7["P7 Gera Evidence e envia à validação humana"]
    P8["P8 OccupationService.update: novo pacote, itens antigos preservados, AuditLog só com o nome do campo"]
  end
  subgraph I["IA (AiEngine)"]
    I1["I1 Gera caso e dados únicos do enunciado (se a autonomia permitir)"]
    I2["I2 Explica por que este modelo com os campos usados"]
  end
  subgraph D["Persistência"]
    D1[("users: preferred_occupation_code, label, visibility")]
    D2[("occupation_packs, guided_task_templates")]
    D3[("tasks, projects")]
    D4[("evidences, competency_evidences")]
  end
  A0 --> A1 --> F1 --> A2
  A2 -- sim --> A3 --> F2
  A2 -- não --> A4 --> F2
  F2 --> P1
  P1 -- "não: 422 VALIDACAO preferredOccupationCode" --> A1
  P1 -- "sim ou vazio" --> P2 --> D1
  P2 --> A5 --> A6 --> P3
  P3 --> D2
  P3 --> I2 --> F3 --> A7 --> P4
  P4 -- "sim: 200 tarefa existente" --> F4
  P4 -- não --> I1 --> P5 --> D3
  P5 --> F4 --> A8 --> A9 --> P6
  P6 -- "422 CRITERIO_OBJETIVO_PENDENTE" --> A8
  P6 -- ok --> P7 --> D4
  A10 --> F1
  A10 --> P8 --> D1
  P8 --> P3
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
  U->>N: digita "arquit" no campo profissão
  N->>N: searchAcademicFields (catálogo versionado no bundle)
  N-->>U: Arquitetura e Urbanismo, Design de Interiores
  U->>N: envia cadastro com preferredOccupationCode = arquitetura-e-urbanismo
  N->>C: POST /api/auth/register
  C->>S: RegistrationService.register
  alt código fora do catálogo
    S-->>C: 422 VALIDACAO fields.preferredOccupationCode
    C-->>N: 422
    N-->>U: Escolha uma profissão da lista ou marque ainda não sei
  else código válido
    S->>R: insert users com label do catálogo e visibilidade SO_EU
    S-->>C: 201 conta criada
    C-->>N: 201
  end
  U->>N: abre Nova tarefa
  N->>C: GET /api/me/occupation/templates?device=computador
  C->>S: OccupationTemplateService.templates
  S->>R: select occupation_packs e guided_task_templates do ramo
  S-->>C: D1 planta 1:50, D6 detalhe, D2 prancha, L4 memorial
  C-->>N: 200 modelos com por que este modelo
  U->>N: Criar a partir do modelo D1
  N->>C: POST /api/me/occupation/templates/D1/instantiate (Idempotency-Key)
  C->>S: instantiate
  S->>A: vary(pack, D1, semente da pessoa)
  A-->>S: programa de necessidades e terreno fictícios próprios
  S->>R: insert tasks origem PROFISSAO com packVersion e semente
  S-->>C: 201 tarefa
  C-->>N: 201
  N-->>U: abre o Drawings com o painel Guia
```

## 4. Máquina de estados

`TaskState` da tarefa criada a partir de modelo da profissão (RF4), com as transições que este RF acrescenta.

```mermaid
stateDiagram-v2
  [*] --> RASCUNHO : criada a partir do modelo da área (CA05)
  RASCUNHO --> EM_ANDAMENTO : pessoa abre a peça no editor
  EM_ANDAMENTO --> EM_ANDAMENTO : salva versões
  EM_ANDAMENTO --> AGUARDANDO_VALIDACAO : conclui, declara autoria, pré-checagem ok (CA09)
  AGUARDANDO_VALIDACAO --> EM_ANDAMENTO : critério objetivo pendente ou ajuste pedido
  AGUARDANDO_VALIDACAO --> CONCLUIDA : validação humana gera CompetencyEvidence
  EM_ANDAMENTO --> ARQUIVADA : pessoa desiste
  CONCLUIDA --> [*]
  ARQUIVADA --> [*]
  note right of CONCLUIDA
    Trocar a profissão não move nem apaga a tarefa:
    ela fica rotulada com o pacote de origem (CA08)
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph WEB["Next.js (app, components, lib)"]
    REG["components/auth/AuthForms (campo profissão)"]
    ACC["components/account/OccupationCard (Conta)"]
    NEW["app/(shell)/tasks/new e projects/new (Modelos da sua área)"]
    GUI["components/letters/GuidePanel · components/drawings3d/GuidePanel"]
    LIB["lib/career/academicFields · lib/career/occupationPack"]
  end
  subgraph DATA["contracts/career (dado versionado)"]
    CAT["academic-fields.json (79 ramos)"]
    PKS["occupation-packs/*.json (79 + genérico)"]
  end
  subgraph WSWEB["ws-web"]
    AC["AuthController (register)"]
    OC["OccupationController (/api/me/occupation/**)"]
  end
  subgraph APP["ws-application"]
    RS["RegistrationService (real)"]
    OS["OccupationService"]
    OTS["OccupationTemplateService → TaskService (real)"]
    EVS["EvidenceService (RF75)"]
  end
  subgraph DOM["ws-domain"]
    U["User.preferredOccupation · OccupationVisibility"]
    T["TaskItem + TaskOrigin.PROFISSAO"]
  end
  subgraph INFRA["ws-infrastructure"]
    MYSQL["persistence-mysql (V62 colunas em users, V65 occupation_packs)"]
    AIG["AiGateway (RF43): vary, explain"]
  end
  CAT --> LIB
  PKS --> MYSQL
  REG --> LIB
  REG --> AC --> RS --> U
  ACC --> OC --> OS --> U
  NEW --> OC --> OTS --> T
  OTS --> AIG
  GUI --> EVS --> MYSQL
  RS --> MYSQL
  OTS --> MYSQL
```

## 6. Rastreabilidade

Mensagens = números do `autonumber` da §3. Passos = nós da §2. Componentes = nós da §5.

| CA | Classe | Passo | Mensagem | Transição | Componente |
|---|---|---|---|---|---|
| RF81.CA01 | `AcademicField` | A1 → F1 → A2 → A3 · A4 | 1–3 | — | `REG`, `LIB`, `CAT` |
| RF81.CA02 | `User.preferredOccupation*`, `RegistrationService` | F2 → P1 → P2 | 4–10 | — | `AC`, `RS`, `MYSQL` |
| RF81.CA03 | `OccupationVisibility` | P2 | 8 | — | `OS`, `ACC` |
| RF81.CA04 | `OccupationPack`, `GuidedTaskTemplate`, `OccupationTemplateService` | A6 → P3 → I2 → F3 | 11–16 | — | `NEW`, `OC`, `OTS` |
| RF81.CA05 | `TaskItem` (origin, packVersion, variantSeed), `AiGateway.vary` | A7 → P4 → I1 → P5 → F4 | 17–24 | `[*] → RASCUNHO` | `OTS`, `AIG`, `T` |
| RF81.CA06 | `TaskItem`, projeto (RF21) | A6 → P3 | — | — | `NEW` |
| RF81.CA07 | pacote genérico | A4 → F2 → P2 → P3 | 4–10 | — | `LIB`, `PKS` |
| RF81.CA08 | `OccupationService.update` | A10 → P8 → P3 | — | — | `ACC`, `OS` |
| RF81.CA09 | `Evidence`, `CompetencyEvidence` | A8 → A9 → P6 → P7 | — | `EM_ANDAMENTO → AGUARDANDO_VALIDACAO → CONCLUIDA` | `GUI`, `EVS` |
| RF81.CA10 | `User` (exportação, anonimização) | A1 | — | — | `REG`, `ACC` |

## Estado da implementação (12/11/2026)

- **Profissão preferida nas preferências:** `preferredOccupation` em `lib/preferences/types.ts`, validada contra os 79 ramos do índice
  gerado do catálogo (`lib/tasks/fieldIndex.gen.ts`), viaja dentro de `notificationPrefsJson` (sem backend novo, como
  `aiAutonomyDefault`). Privada (D-147): nunca vai para o `ws.prefs` do `localStorage` (sem sessão, fica só no `sessionStorage` da aba) e
  é esquecida ao sair da conta.
- **Conta/Configurações › Trabalho (CA01 e CA10, parcial):** campo "Qual profissão você quer desenvolver?" com combobox acessível
  (`aria-activedescendant`, ↓ ↑ Enter Esc), autocompletar a partir de 2 letras por rótulo e aliases sem caixa nem acento (até 8
  sugestões, também pelo rótulo em en/es), lista agrupada pelas categorias do criador (TI = "Desenvolvimento de software", Engenharia,
  Design, Pesquisa, Administração e depois Marketing, Planejamento, Jurídico — `lib/career/categories.ts`, sem vocabulário novo), "ainda
  não sei" e o aviso "só você vê; não aparece no seu perfil nem para a empresa". A pergunta no cadastro (`/register`) ainda não existe.
- **Criador de tarefas (CA04 e CA07, parcial):** só no criador e só para o dono, o campo de estudo vem pré-selecionado pela profissão,
  marcado "a partir da sua profissão — só você vê" e trocável; com ele a área, os modelos, as extensões e a checagem da profissão se
  adaptam. A lente sugerida só é gravada na tarefa (`extensions.studyField`) se a pessoa confirmar ou usar um modelo do campo. Edição de
  tarefa existente e visitante não recebem a sugestão.
- **Plano de desenvolvimento:** as tarefas-guia da profissão na ordem de `guidedTasks.priority` (sem as excluídas; as próprias do campo no
  fim), cada uma com "criar esta tarefa" e o progresso pelas tarefas da pessoa com `extensions.guidedTask` ("k de n", sem percentual).
  Fica no criador de tarefas porque a aba Carreira do perfil (RF75, n.16) não está no registro (Matriz B tem 15 sub-abas);
  `components/career/DevelopmentPlan.tsx` está pronto para ser montado nela.
- **D-153:** `packFor(code, minStatus)` em `lib/career/packs.ts`; o Acervo usa `pesquisa` como mínimo para lente, modelos e plano e mostra
  "em revisão por especialistas" no lugar de "(pesquisa)", sem status, versão nem códigos L/D/X.
- **Rascunho de outras telas:** `/tasks/new?rascunho=<id>` preenche o formulário, mostra a origem, permite descartar e apaga o rascunho
  depois de salvar.
- **Ainda planejado:** validação no servidor (CA02), visibilidade `PERFIL` por opt-in (CA03), origem `PROFISSAO` com `Idempotency-Key`
  e variação paramétrica (CA05), modelos no criador de projetos (CA06), `AuditLog` da troca (CA08), evidência (CA09), exportação e
  anonimização da conta (CA10).
- **Testes:** `lib/preferences/occupation.test.tsx`, `lib/career/packs.test.ts`, `components/career/career.test.tsx` e
  `components/tasks/assist.test.tsx`.
