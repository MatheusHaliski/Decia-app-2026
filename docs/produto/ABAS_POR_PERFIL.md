# Abas por perfil — Work Station / DECIA (pesquisa de produto, v1)

> **Objetivo.** Dizer, para cada aba e sub-aba do Work Station, o que cada perfil vê e edita, no próprio perfil e no perfil de terceiros, com o endpoint REST e o guard do backend que sustentam a regra. Base: o que o **Fashion AI (FAI)** já implementa (código citado por `arquivo:linha`), o board Trello **Work Station** (citado como `board › card`) e os documentos deste repositório (`docs/...`). Tudo o que não está em nenhuma dessas fontes vem marcado **(proposta)**.
>
> **Wireframe:** [`docs/lab/perfis.html`](../lab/perfis.html) (seletor de perfil, visão própria × terceiros e tema). Capturas em [`docs/lab/capturas/`](../lab/capturas/).
>
> **Legenda das células:** **V** visível · **E** visível e editável (ações de escrita) · **O** oculta (não aparece no menu/abas e a API responde 403 ou omite o campo) · **V\*** visível só sob condição descrita na linha · "—" não se aplica. Quando a célula tem duas partes, a primeira é **no próprio perfil** (*self*) e a segunda **no perfil de terceiros**.

---

## 0. O que herdamos do FAI (fatos, com fonte)

| Mecanismo no FAI | Onde está | O que vira no Work Station |
|---|---|---|
| Menu lateral em 4 grupos fixos (Descobrir · Meu guarda-roupa · Criar · Jogar e ganhar) e grupo **Gestão** montado em runtime **só para admin** (`isAdmin ? [/admin/dashboard] : []`) | `components/app-shell.tsx:17-46` (GROUPS) e `:64-68` (manage) | Grupos Descobrir · Meu trabalho · Criar · Jogar e ganhar · **Gestão** (`docs/design-system/DESIGN_SYSTEM.md:846`); **Gestão** passa a existir para EMPRESA, CHEFE e CURADOR, não só ADMIN (ver §2 e proposta P-15) |
| Itens com `auth: true` somem para visitante; o filtro é `g.items.filter(n => !n.auth || user)` | `app-shell.tsx:72` | Mesmo mecanismo, acrescido de um filtro por `profileType`/papel (proposta P-15) |
| Painel do emissor (marca/celebridade) **fica no próprio perfil**; o menu lateral só mostra o Dashboard da administração | comentário em `app-shell.tsx:65` | Mantemos a regra: a gestão da EMPRESA e do CHEFE vive **dentro da página institucional** (RF28); o menu Gestão só atalha para lá |
| Folha "+ Criar" com 4 destinos (peça, look, DNA, fotos) e barra inferior com 5 destinos (Feed, Buscar, +, Closet, Perfil) | `app-shell.tsx:182-187` e `:245-247` | "+ Criar" → Criar Tarefa, Criar Projeto, Plano Anual, Nova sessão DECIA; barra inferior → Mural, Buscar, +, Acervo, Perfil (proposta, §2.4) |
| Lookbook: abas **para todos** = Closet, Looks, Agrupamentos; abas **só do dono** (`ov.self`) = DNA, Looks salvos, Peças salvas, Look do Dia, Cápsula, Meus cupons | `components/lookbook-tabs.tsx:37-41` | RF19: sub-abas 1–5 públicas, 6–15 só o dono (`board › RF19`, `board2.md:497-516`; `docs/diagramas/RF19/README.md:9-26`) |
| Perfil privado devolve `visible=false` e a tela mostra "perfil privado — siga para ver" | `lookbook-tabs.tsx:34`; `LookbookService.java:105-116` | `Guard.canView` por `Visibility` (PUBLIC/FOLLOWERS/PRIVATE) continua; soma-se o nível **EMPRESA** (mesma empresa) do RF19.CA02 |
| Página institucional (marca/celebridade): abas públicas = Coleções/Eras, Esquemas em destaque, Peças em destaque, Looks consagrados, Catálogo, Selos, Promoções, Flair, Guarda-roupa 3D; abas **só do administrador** = Cupons, Esquemas salvos, Peças salvas, Revisão de vínculos, Métricas | `app/(site)/(app)/brands/[slug]/page.tsx:54-55` | Página da empresa / do departamento (RF28) com o mesmo padrão "público × administrador" (§4 e §5) |
| O backend **nega as abas do administrador** a quem não é o dono: `CADASTRAR_SELO, MEUS_SELOS, ESQUEMAS_SALVOS, PECAS_SALVAS, MEUS_ESQUEMAS, MINHAS_PECAS` → `guard.deny(...)` 403 | `InstitutionalService.java:282-284` | Mesma lista de abas "do administrador" por página (§4/§5), negada no serviço, não só escondida no front |
| Botões do administrador no cabeçalho: "Editar perfil" (`/settings`) e "Painel do emissor" (`/dashboard`); visitante vê "Seguir" | `brands/[slug]/page.tsx:79` | Igual: EMPRESA/CHEFE veem "Editar" + "Dashboard do emissor" (RF28.CA06); visitante vê "Seguir" (RF27.CA06) |
| Sub-abas dentro de uma aba: Eras = Buscar por era · Insights de eras · My Stage 3D; Coleções = Coleções · Collections insights; controles "Nova/Editar/Ligar" só se `admin` | `components/showcase/showcase-tabs.tsx:39-62` e `:105-110` | Programas & Agrupamentos (RF25) com sub-abas Buscar · Insights; controles de edição só para o dono |
| Aba "Meus cupons promocionais" só do dono, com 4 KPIs + sub-abas Emitidos · Todas as promoções; API `GET /api/me/coupons/admin` protegida por `requireApprovedInstitutional` | `components/coupons/brand-coupons-tab.tsx:23-27,31,63`; `CouponService.java:259` | Aba **Benefícios** do emissor (RF39.CA09) com KPIs emitidos/resgatados/pendentes/ativos |
| Métricas do emissor: `GET /api/me/issuer-metrics` → `SealService.issuerMetrics` → `requireIssuer` → `guard.requireApprovedInstitutional` (só MARCA/CELEBRIDADE aprovados e ACTIVE) | `SealController.java:184-188`; `SealService.java:1112-1133`; `Guard.java:56-65` | `GET /api/issuer/dashboard` (`docs/diagramas/RF28/README.md`, rastreabilidade CA06) guardado por `requireIssuer` = EMPRESA ou CHEFE aprovados (RF28.CA08) |
| Fila de revisão de vínculos: `GET /api/seal-bonds/review-queue` + `POST /api/seal-bonds/{id}/review`; `guard.requireOwner(user, b.getTargetOwner().getId(), ...)` | `brands/[slug]/page.tsx:134-142`; `SealController.java:125`; `SealService.java:703,737` | Fila de chancelas do CHEFE/EMPRESA, operável também pelo **CURADOR** nomeado (RF28.CA03) — exige um guard novo `requireIssuerOrCurator` (proposta, §1.2) |
| Perfis: `PESSOAL · MARCA · CELEBRIDADE · ADMIN` (ADMIN criado pela inicialização, nunca pelo cadastro) | `ProfileType.java:3-8` | `EMPREGADO · EMPRESA · CHEFE_DEPARTAMENTO` + `role USER/ADMIN` (`docs/arquitetura/TAXONOMIA.md:44-45`); CURADOR é contextual (`CuratorAppointment`, `TAXONOMIA.md:69-70`; `docs/DECISOES.md` D-09) |
| Guards disponíveis: `requireCanCreate` (login + e-mail confirmado + conta não suspensa), `requireApprovedInstitutional`, `requireApprovedProfile(type)`, `requireOwner` (dono **ou admin**), `requireAdmin`, `canView/requireView` (visibilidade + bloqueio), `deny` (403 auditado) | `Guard.java:35-131` | Reaproveitados 1:1; faltam `requireRole`, `requireIssuer`, `requireDeptHead`, `requireCurator`, `requireSameCompany` (§1.2) |
| Área admin no front: `RequireAuth admin` só renderiza depois que `/api/me` confirma o papel; senão 403 "Área restrita a administradores" | `app-shell.tsx:336-355` | Mesmo componente (`RoleGate`, `docs/diagramas/RF28/README.md` CA01/CA08) para EMPRESA/CHEFE/CURADOR/ADMIN |
| Admin REST: `/api/admin/dashboard`, `/api/admin/approvals[/{userId}]`, `/moderation`, `/users/{id}/status|role`, `/audit`, `/ai`, `/backups`, `/jobs/{job}`, `/hype/recalibration`; `guard.requireAdmin` nos serviços | `DashboardController.java:24`; `AdminController.java:33-136`; `DashboardService.java:81`; `AdminService.java:116-188` | Aba **Admin** (§6.9) |
| Passarela 3D do Explorar (rankings Top 100 global/regional/país, Seguindo, Em alta) | `components/showcase/runway-panel.tsx:29-35` | **Vitrine de projetos** (sub-aba 2 do Mural, RF27) — sem 3D no v1 (Avatar/3D "em avaliação", `board › Mapa §2`, `docs/DECISOES.md` D-10) |

---

## 1. Perfis e guards do Work Station

### 1.1 Perfis (fonte: `board › Mapa de equivalência §3`, `board2.md:80-84`; `TAXONOMIA.md:44-45,66-70`)

| Perfil WS | = FAI | Natureza da conta | Papel na gestão |
|---|---|---|---|
| **EMPREGADO** | PESSOAL | pessoa | cria tarefas/projetos, participa do DECIA, tem perfil deliberativo e Tarefa do Dia; **não emite chancela**; oferece modelos (RF40), indica e propõe chancelas (RF39.CA06), resgata benefícios, compra na Loja |
| **EMPRESA** | MARCA | **institucional** (ex.: Secretaria das Cidades) | possui departamentos; cria chancelas e benefícios; publica programas e plano anual oficial; define regras/tetos de DECIA Points e pesos de HSE/ranking/Hype; vê dashboard e insights da empresa |
| **CHEFE DE DEPARTAMENTO** | CELEBRIDADE | pessoa com cargo | administra sessões DECIA do departamento, revisa decisões (RF15), cria chancelas do departamento, opera a fila de revisão com curadores, emite reconhecimentos, vê Insights da Equipe (RF43) |
| **CURADOR** | — (sem equivalente) | papel **contextual** de um EMPREGADO (`CuratorAppointment.scope` FILA_REVISAO · PREMIACAO · AMBOS) | opera fila de revisão de chancelas e curadoria de premiação **em nome do emissor** (RF28.CA03; `DECISOES.md` D-09) |
| **ADMIN** | ADMIN | `role = ADMIN` sobre qualquer conta (`TAXONOMIA.md:45`) | gestão do sistema (RF18), aprova EMPRESA/CHEFE (RF28.CA01), painel IA do sistema (RF43.CA12) |

> **(proposta)** ADMIN não é um `ProfileType` no WS (ao contrário do FAI, `ProfileType.java:8`): é `User.role = ADMIN`. A conta de administração criada pelo bootstrap nasce como EMPREGADO + ADMIN. O menu dela é o do EMPREGADO mais o grupo **Gestão (admin)**.

### 1.2 Guards (existentes no FAI × a criar)

| Guard | Origem | Regra |
|---|---|---|
| `requireCanCreate(user)` | FAI `Guard.java:35-50` | logado, e-mail confirmado, conta não suspensa/agendada para exclusão |
| `requireOwner(user, ownerId, resource)` | FAI `Guard.java:78-85` | dono **ou admin**; demais → 403 auditado |
| `requireAdmin(user)` | FAI `Guard.java:87-91` | `role = ADMIN` |
| `canView / requireView(viewer, ownerId, visibility)` | FAI `Guard.java:93-124` | PUBLIC · FOLLOWERS · PRIVATE + bloqueio bidirecional; **(proposta)** acrescentar `Visibility.EMPRESA` e `Visibility.DEPARTAMENTO` (RF19.CA02, RF26.CA08) resolvidos por `User.companyId/departmentId` |
| `requireRole(user, ProfileType...)` | **(proposta)** = `requireApprovedProfile` do FAI (`Guard.java:67-76`) generalizado para N perfis | perfil na lista **e** `status = ACTIVE` (EMPRESA/CHEFE em `PENDING_VALIDATION` recebem 403 `PERFIL_EM_VALIDACAO`, RF28.CA01) |
| `requireIssuer(user)` | `docs/diagramas/RF28/README.md` (`AccessPolicy.requireIssuer`, CA08) = FAI `requireApprovedInstitutional` (`Guard.java:56-65`) | EMPRESA ou CHEFE aprovados e ACTIVE; EMPREGADO → 403 (RF28.CA08, RF39.CA01) |
| `requireDeptHead(user, departmentId)` | **(proposta)** | `Department.headUserId == user.id` (uma pessoa pode chefiar >1 departamento, RF28.CA07) ou EMPRESA dona da `Company` do departamento, ou ADMIN |
| `requireCurator(user, departmentId, scope)` | **(proposta)** | `CuratorAppointment` vigente (`revokedAt == null`) com `scope` compatível; usado em OR com `requireDeptHead` → `requireIssuerOrCurator` |
| `requireSameCompany(viewer, ownerId)` | **(proposta)** | `viewer.companyId == owner.companyId`; sustenta `Visibility.EMPRESA`, `HypeVisibility.EMPRESA` (RF45.CA06) e Insights › Equipe (RF43.CA14) |
| `requireSessionAdmin(user, sessionId)` | `docs/diagramas/RF9/README.md` (CA03) | administrador da sessão DECIA (`DeciaSession.adminUserId`; dúvida aberta Q-03 em `DECISOES.md`) |

---

## 2. Matriz A — Menu lateral (sidebar), barra inferior e "+ Criar"

Fonte dos itens: `board › Mapa de equivalência §2` (`board2.md:52-78`); rotas: `docs/arquitetura/ARQUITETURA.md:93`. Colunas: EMPREGADO · EMPRESA · CHEFE · CURADOR (= EMPREGADO nomeado) · ADMIN (= perfil-base + Gestão admin). Visitante não logado vê só o grupo Descobrir (mesma regra de `app-shell.tsx:72`).

### 2.1 Descobrir

| Item (rota) | RF | EMPREGADO | EMPRESA | CHEFE | CURADOR | ADMIN | Endpoint · guard |
|---|---|---|---|---|---|---|---|
| Mural (`/mural`) — sub-abas Mural da empresa · Vitrine · Seguindo | RF27 | V | V | V | V | V | `GET /api/mural?tab=&dept=&kind=` · `canView` por item (RF27.CA04) |
| Buscar (`/search`) — Projetos · Tarefas · Pessoas · Empresas · Chefes | RF27 | V | V | V | V | V | `GET /api/search?tab=` · `canView`; outra empresa só PÚBLICO (RF27.CA04) |
| Memória Institucional (`/memory`) | RF33 | V | V | V | V | V | `GET /api/memory/search` · `requireCanCreate` + `canView` |
| Empresas & Departamentos (`/companies`, `/companies/[slug]`, `/departments/[slug]`) | RF28 | V | V | V | V | V | `GET /api/companies`, `GET /api/companies/{slug}` (público, como `/api/institutional/**` em `SecurityConfig.java:47`) |
| Balcão de Modelos (`/models`) — prateleiras Chancelados · Comunidade | RF40 | **E** (oferecer, remixar) | **E** (destacar → chancelar, RF40.CA07) | **E** (destacar) | V (**proposta:** pré-selecionar para o chefe) | V | `GET /api/models`; `POST /api/models` (`requireOwner` do alvo); `POST /api/models/{id}/highlight` (`requireIssuer`) |
| Encontrar (`/find`) — Encontrar (A) · Ler com mapa (B) · Extrair termos e entidades (C) · Lista de termos; botão Testar esta contratação → Agentes (RF47.CA14) | RF47 | E | E | E | E | E | `GET /api/find?q=&scope=` · `ResourceAuthorizer` + `AccessPolicy.visible` como filtro **dentro** da consulta ao índice (RF47.CA02, Bloco 5); visitante **O** (D-128) |

### 2.2 Meu trabalho

| Item (rota) | RF | EMPREGADO | EMPRESA | CHEFE | CURADOR | ADMIN | Endpoint · guard |
|---|---|---|---|---|---|---|---|
| Meu perfil (`/profile`) | RF19 | E | E (vai para `/companies/[slug]` — **proposta**, como o FAI manda MARCA para `brands/[slug]`) | E (perfil pessoal + atalho ao departamento) | E | E | `GET /api/users/{id}/profile` · `canView` |
| Acervo de Tarefas (`/tasks`) | RF41 | E | E (acervo institucional: modelos oficiais, documentos) | E | E | E | `GET /api/me/tasks` · `requireCanCreate` |
| Anexos & Evidências (`/attachments`) | RF41.CA06 | E | E | E | E | E | `GET/POST /api/me/attachments` |
| Tarefa do Dia (widget no topo do Acervo e da Mesa) | RF44 | V/E | **O** (conta institucional não tem tarefa do dia — ver §7.d) | V/E | V/E | V/E | `GET /api/me/daily-task` · `requireRole(EMPREGADO, CHEFE)` (**proposta**) |
| Mesa de Trabalho (`/desk`) | RF22 | E | E | E | E | E | `GET /api/me/desk` |
| Espelho de Conformidade (`/projects/[id]/mirror`) | RF32 | E (projetos próprios ou onde é responsável) | E | E | E | E | `requireOwner` ou participante do projeto |
| Simulador de Cenários (`/projects/[id]/simulate`) | RF31 | E | E | E | E | E | idem |
| Agentes — Copilot de testes (`/agents`; "Testar esta contratação" no projeto) — modos Mesa de testes · Assistente · Carteira · Matriz (CA18); sub-abas Antes do início · Execução · Transversais · Encontrar · Ler com mapa · Extrair · Lista de termos no dossiê (CA17); Abrir no Encontrar (CA19) | RF48 | E (com acesso ao projeto) | E (define pesos do Score, RF48.CA07) | E (define pesos do Score) | E (com acesso ao projeto) | V | `GET /api/projects/{id}/agents`, `POST /api/projects/{id}/agents/runs` · `ResourceAuthorizer` do projeto (RF48.CA12); recomendados por papel: agente de contratação, gestor/fiscal, controle interno, chefe; visitante **O** (D-130) |

### 2.3 Criar

| Item (rota) | RF | EMPREGADO | EMPRESA | CHEFE | CURADOR | ADMIN | Endpoint · guard |
|---|---|---|---|---|---|---|---|
| Criar Tarefa (`/tasks/new`) | RF20 | E | E | E | E | E | `POST /api/tasks` · `requireCanCreate` |
| Criar Projeto (`/projects/new`) | RF21 | E | E | E | E | E | `POST /api/projects` · `requireCanCreate` |
| Plano Anual / Trilha (`/plans`) | RF24 | E (trilha pessoal **derivada**, RF24.CA04) | E (**plano oficial**, RF24.CA04) | E (plano do departamento derivado) | E (pessoal) | E | `POST /api/plans`; `POST /api/plans/{id}/derive`; oficial exige `requireRole(EMPRESA)` |
| Autopilot (`/autopilot`) | RF30, RF43 | E | E | E | E | E | `POST /api/autopilot/*` · cota (`AiQuota`) |
| DECIA (`/decia`, `/decia/[sessionId]`) | RF4–RF17, RF29 | E (participa; propõe sessão) | E (participa) | E (**administra** sessões do departamento, RF28 §3) | E | E | `POST /api/decia/sessions` · `requireCanCreate`; gestão de participantes `requireSessionAdmin` (RF9 diagrama) |
| Insights (`/insights`) — Acervo · Perfil · **Equipe** · Ranking · Projetos sugeridos | RF43 | V (Acervo, Perfil, Ranking, Sugeridos); **Equipe O** | V (Equipe = **toda a empresa**) | V (Equipe = **seu(s) departamento(s)**) | como EMPREGADO | V | `GET /api/insights/{acervo\|perfil\|ranking}` (`requireOwner`); `GET /api/insights/team?dept=` · `requireIssuer` + `requireDeptHead` (RF43.CA14) |

### 2.4 Jogar e ganhar

| Item (rota) | RF | EMPREGADO | EMPRESA | CHEFE | CURADOR | ADMIN | Endpoint · guard |
|---|---|---|---|---|---|---|---|
| Metas coletivas (`/goals`) | RF35 | V (participa) | **E** (cria, RF35.CA01) | **E** (cria) | V | V | `GET /api/goals`; `POST /api/goals` · `requireIssuer` |
| DECIA Points + Loja (`/points`, `/store`) | RF42 | V saldo/extrato · E compra | **V\*** só políticas e pontos por departamento (RF42.CA02/CA08) — conta não acumula (§7.d) | V/E | V/E | V/E + edita regras (RF42.CA02) | `GET /api/me/points`; `POST /api/store/{item}/buy`; `PUT /api/points/rules` · `requireRole(EMPRESA)` ou `requireAdmin` |
| Destaques (`/highlights`) | RF35.CA03 | V | V + **curadoria** | V + **curadoria** (seu departamento) | V + **curadoria** se `scope ⊇ PREMIACAO` | V | `GET /api/highlights?month=`; `POST /api/highlights/{id}/curate` · `requireIssuerOrCurator(PREMIACAO)` |
| Benefícios & Reconhecimentos (`/benefits`, `/recognitions`) | RF39, RF35 | V resgata (`409 CHANCELA_INVALIDA` se não tem a chancela, RF39.CA10) | **E** publica benefícios e emite reconhecimentos | **E** idem (departamento) | V | V | `POST /api/benefits` · `requireIssuer`; `POST /api/recognitions` · `requireIssuer` (RF28.CA05); `POST /api/benefits/{id}/redeem` · `requireCanCreate` |

### 2.5 Gestão (grupo condicional)

| Item (rota) | RF | EMPREGADO | EMPRESA | CHEFE | CURADOR | ADMIN | Endpoint · guard |
|---|---|---|---|---|---|---|---|
| Dashboard do emissor (`/issuer/dashboard`) | RF28.CA06 | O | V | V (filtrado ao(s) seu(s) departamento(s)) | O | V | `GET /api/issuer/dashboard?period=&dept=` · `requireIssuer` (403 para EMPREGADO, RF28.CA08) |
| Departamentos & chefes (`/companies/[slug]/manage/departments`) **(proposta, §7.c)** | RF28.CA02/CA07 | O | **E** | O | O | V | `POST/PUT /api/companies/{id}/departments`; `PUT .../departments/{id}/head` · `requireRole(EMPRESA)` + `requireOwner(company)` |
| Minha equipe (`/departments/[slug]/team`) **(proposta, §7.b)** | RF9, RF10, RF28.CA02/CA03, RF43.CA14, RF36 | O | V (todas as equipes) | **E** | V\* (só o que o escopo permite) | V | `GET /api/departments/{id}/team` · `requireDeptHead`; `POST/DELETE .../members` (RF9); `POST /api/projects/{id}/tasks/{taskId}/assign` (RF10) |
| Fila de chancelas (`/seals/review`) | RF39.CA04, RF28.CA03 | O | E | E | **E** (`scope ⊇ FILA_REVISAO`) | V | `GET /api/seal-bonds/review-queue`; `POST /api/seal-bonds/{id}/review` · `requireIssuerOrCurator(FILA_REVISAO)` |
| Decisões em revisão (`/decia/review`) | RF15 | O | V | **E** (revisor = admin da sessão) | O | V | `GET /api/decia/decisions?status=EM_REVISAO`; `POST .../review` · `requireSessionAdmin` |
| Chancelas & políticas (`/seals`) | RF39.CA01/CA02 | O (vê só "Minhas chancelas recebidas" no perfil) | **E** | **E** | O (ver §7.e e P-07) | V | `POST/PUT /api/seals` · `requireIssuer` |
| Políticas da empresa (pontos, HSE, ranking, Hype, gravação) **(proposta)** | RF42.CA02/CA09, RF44.CA08, RF43.CA05, RF45.CA07, RF37.CA05 | O | **E** | O | O | E | `PUT /api/companies/{id}/policies/{points\|hse\|ranking\|hype\|recording}` · `requireRole(EMPRESA)` + `requireOwner(company)` |
| Dossiês de transição (`/handoffs`) | RF36 | V (os seus, como sujeito ou sucessor) | **E** | **E** | O | V | `POST /api/handoffs` · `requireIssuer`; `GET /api/handoffs/{id}` · dono/sucessor/emissor |
| Curadoria (`/curation`) **(proposta, §7.e)** | RF28.CA03 | O | O | O | **E** | O | agrega fila + premiação + indicações para o curador |
| Admin (`/admin/*`) — Dashboard · Aprovações · Usuários · Moderação · IA do sistema · Auditoria · Sistema | RF18, RF28.CA01, RF43.CA12 | O | O | O | O | **E** | `/api/admin/**` · `requireAdmin` (FAI `AdminController.java:33-136`) |

### 2.6 Barra inferior (celular) e folha "+ Criar" **(proposta)**

- Barra inferior (5 destinos, como `app-shell.tsx:245-247` e `.ws-bottomnav` em `docs/design-system/components.css:242-243`): **Mural · Buscar · + · Acervo · Perfil**. Para EMPRESA o quinto destino é a **página da empresa**; para visitante: Mural · Buscar · Memória · Empresas.
- Folha "+ Criar" (como `CREATE`, `app-shell.tsx:182-187`): **Criar Tarefa** (RF20) · **Criar Projeto** (RF21) · **Plano Anual / Trilha** (RF24) · **Nova sessão DECIA** (RF4). EMPRESA e CHEFE ganham o quinto item **Nova chancela** (RF39.CA01; 403 para EMPREGADO).

---

## 3. Matriz B — Perfil pessoal (RF19): 15 sub-abas × perfil × própria/terceiros

Fonte: `board › RF19` (`board2.md:497-516`, CAs `:518-525`); `docs/diagramas/RF19/README.md:5-26`; equivalente FAI `lookbook-tabs.tsx:37-41`. Terceiros veem **só 1–5**, com itens PÚBLICOS ou EMPRESA (se mesma empresa) e o Hype só se o dono permitir (RF19.CA02, RF45.CA06). Endpoint-base: `GET /api/users/{id}/profile` (cabeçalho + lista de sub-abas, como `/api/users/{id}/lookbook` no FAI, `LookbookService.java:105-128`) e `GET /api/users/{id}/profile/tabs/{tab}?filtros&page&size` (RF19.CA03).

| # | Sub-aba | EMPREGADO (self · terceiros) | EMPRESA (self · terceiros) | CHEFE (self · terceiros) | CURADOR | ADMIN | Endpoint · guard |
|---|---|---|---|---|---|---|---|
| — | **Cabeçalho**: avatar, nome, cargo, empresa, departamento, contadores (tarefas, projetos, decisões, seguidores, DECIA Points), Hype se exibido | E · V (Hype V\* por `hypeVisibility`) | E · V — **sem cargo/departamento/Hype; contadores institucionais** (RF28.CA04: projetos publicados, modelos oficiais, decisões validadas) | E · V (cargo "Chefe de …", monograma do departamento) | = EMPREGADO + etiqueta "Curador de {sigla}" **(proposta)** | = perfil-base | `GET /api/users/{id}/profile` · `canView`; `GET /api/users/{id}/hype` · `HypeVisibility` (RF45.CA06; `docs/diagramas/RF45/README.md:223`) |
| 1 | Acervo de Tarefas | E · V (só itens visíveis; ação "Levar ao meu acervo", RF41.CA08) | E · V (modelos oficiais/chancelados) | E · V | E · V | E · V | `.../tabs/acervo?estado=&categoria=&tipo=` · `canView` por item (403 no resto, RF41.CA08) |
| 2 | Meus Projetos | E · V | E · V ("Projetos da empresa") | E · V | E · V | E · V | `.../tabs/projetos?fase=&estado=&exercicio=&dept=` · `canView` |
| 3 | Programas & Agrupamentos (sub-abas Buscar · Insights, como `showcase-tabs.tsx:52-62`) | E · V | E · V (Programas oficiais, RF25) | E · V | E · V | E · V | `GET /api/users/{id}/groupings`; `POST /api/groupings` · `requireOwner` |
| 4 | Decisões (fio de decisão, RF29) | V · V | V · V (decisões validadas da empresa) | V · V | V · V | V · V | `.../tabs/decisoes` · `canView` da sessão |
| 5 | Perfil deliberativo (resumo) — medalhas e indicadores públicos escolhidos pelo dono | E (escolhe o que publicar) · V | **O · O** (objetivo 2 é por pessoa) | E · V | E · V | E · V | `.../tabs/deliberativo` → `DeliberativeProfile.publicIndicatorsJson` |
| 6 | Meus Planos Anuais / Trilhas | E · O | E · **V** (plano oficial é público e aparece também na página da empresa, RF24.CA04 — **proposta:** mover para a aba pública "Plano Anual oficial") | E · O | E · O | E · O | `GET /api/me/plans` · `requireOwner` |
| 7 | Projetos salvos | E · O | E · O | E · O | E · O | E · O | `GET /api/me/saved?type=PROJECT` · `requireOwner` (FAI `/api/me/saved-looks`, `lookbook-tabs.tsx:105`) |
| 8 | Tarefas salvas | E · O | E · O | E · O | E · O | E · O | `GET /api/me/saved?type=TASK` · `requireOwner` |
| 9 | Tarefa do Dia (feedback CONCLUÍ/ADIEI/BLOQUEADA/DELEGUEI, HSE previsto × realizado, semana planejada) | E · O | **O · O** (§7.d) | E · O | E · O | E · O | `GET /api/me/daily-task`; `PUT /api/me/daily-tasks/{date}/feedback` (FAI `lookbook-tabs.tsx:131,136`) · `requireOwner` + `requireRole(EMPREGADO, CHEFE)` |
| 10 | Kits de Processo | E · O | E · O (kits oficiais ficam públicos via chancela/Balcão, RF40) | E · O | E · O | E · O | `GET /api/me/kits` · `requireOwner` |
| 11 | Meus modelos oferecidos (contadores: visualizações, remixes, DP recebidos; retirar oferta) | E · O | **renomeia para "Modelos oficiais"** · V (RF39.CA11) **(proposta)** | E · O | E · O | E · O | `GET /api/me/models`; `DELETE /api/models/{id}` · `requireOwner` (RF40.CA06) |
| 12 | Meus Reconhecimentos e Chancelas | E · O (medalhas públicas aparecem na sub-aba 5 e no Mural, RF35.CA04) | **vira "Emitidos"**: reconhecimentos e chancelas que a empresa concedeu · V (RF28.CA05) | E (recebidos) + "Emitidos" (departamento) · O | E · O (+ etiqueta de curador) | E · O | `GET /api/me/recognitions`, `GET /api/me/seal-bonds?status=`; emitidos: `GET /api/issuer/recognitions` · `requireIssuer` |
| 13 | DECIA Points — saldo, extrato, Loja | E · O | **O · O** (ver §7.d; EMPRESA vê pontos **por departamento** no dashboard, RF42.CA08) | E · O | E · O | E · O | `GET /api/me/points?page=` · `requireOwner` |
| 14 | Hype Score do Perfil — 0–1000, faixa, decomposição, histórico, controle PÚBLICO/EMPRESA/SÓ EU | E · O (o número aparece no cabeçalho de terceiros só conforme `hypeVisibility`) | **O · O** (índice "por pessoa", RF45) | E · O | E · O | E · O | `GET /api/me/profile/hype`; `PATCH /api/me/hype-visibility` (`docs/diagramas/RF45/README.md:220-228`) · `requireOwner` |
| 15 | Perfil deliberativo (completo) — clareza, evidências, consistência, completude, reutilização; gráfico mensal; insights da IA | E · O | **O · O** | E · O | E · O | E · O | `GET /api/me/deliberative-profile` · `requireOwner` (RF43.CA04: "só o dono") |
| + | **Sub-abas institucionais (RF19.CA06)** | — | → Matriz C (§4), todas dentro de `/companies/[slug]` | → atalho "Meu departamento" para a Matriz D (§5) **(proposta:** não duplicar as abas no perfil pessoal) | — | — | — |

Regras transversais da Matriz B:
- A API **omite** sub-abas 6–15 na lista devolvida a terceiros (como o FAI zera os contadores das abas do dono para `!self`, `LookbookService.java:121-123`) e responde 403 a chamadas diretas (RF19.CA02 "403 ACESSO_NEGADO", `docs/diagramas/RF19/README.md` CA02).
- **ADMIN não vê sub-abas 6–15 de outra pessoa.** `requireOwner` do FAI deixa o admin passar (`Guard.java:82`); **(proposta)** no WS as sub-abas 9, 13, 14 e 15 usam um `requireOwnerStrict` sem bypass de admin — são dados pessoais de desempenho (LGPD; RF45 §4 "não é instrumento disciplinar"). O admin acompanha pelo painel agregado (RF45.CA10).
- CHEFE no perfil de um **subordinado** vê exatamente o que qualquer colega da mesma empresa vê (1–5 + Hype se `EMPRESA`/`PÚBLICO`). O que o chefe precisa para gerir vem da **Minha equipe** (§7.b), nunca das sub-abas privadas do empregado.

---

## 4. Matriz C — Página da EMPRESA (`/companies/[slug]`, RF28)

Fonte: `board › RF28` (`board2.md:552-553`); `docs/diagramas/RF28/README.md:7`; equivalente FAI `brands/[slug]/page.tsx:54-55` (abas públicas × `admin`). "Dona" = conta EMPRESA proprietária (`Company.ownerUserId`, `TAXONOMIA.md:59`). Colunas: dona (EMPRESA self) · CHEFE da mesma empresa · EMPREGADO/CURADOR da mesma empresa · visitante de outra empresa ou anônimo · ADMIN.

| Sub-aba | Dona | CHEFE (mesma empresa) | EMPREGADO / CURADOR (mesma empresa) | Outra empresa / anônimo | ADMIN | Endpoint · guard |
|---|---|---|---|---|---|---|
| Sobre (logo, brasão, sobre, site, cor, métricas públicas) | E | V | V | V | V | `GET /api/companies/{slug}` (público); `PUT /api/companies/{id}` · `requireRole(EMPRESA)`+`requireOwner` |
| Departamentos (SECID-UTS, CPOE, …) | **E** (criar/editar, chefe responsável, RF28.CA02) | V (+ "Gerir" só no seu) | V | V | V | `GET .../departments`; `POST/PUT .../departments` · `requireRole(EMPRESA)`; troca de chefe `PUT .../departments/{id}/head` (RF28.CA07 → `HandoffService`) |
| Programas (RF25) | E | V | V | V | V | `GET /api/companies/{id}/groupings?type=PROGRAMA`; `POST /api/groupings` · `requireOwner` |
| Plano Anual oficial (RF24) | **E** (publica; único oficial, RF24.CA04) | V + **Derivar** para o departamento | V + **Derivar** trilha pessoal | V (se PÚBLICO) | V | `GET /api/plans?company=&official=true`; `POST /api/plans/{id}/derive` · `requireCanCreate` (422 `DERIVACAO_INVALIDA` se não PUBLICADO, `DECISOES.md` Q-32) |
| Chancelas e modelos oficiais (RF39) | **E** (criador de chancela, política, fila) | V (+ criador das **suas** chancelas de departamento fica na página do departamento) | V (+ "Propor chancela", RF39.CA06) | V | V | `GET /api/companies/{id}/seals`; `POST /api/seals` · `requireIssuer`; `POST /api/seal-proposals` · `requireRole(EMPREGADO)` |
| Benefícios (RF39.CA09) | **E** (publicar; KPIs emitidos/resgatados/pendentes como `brand-coupons-tab.tsx:57-62`) | V + resgatar | V + **resgatar** (409 `CHANCELA_INVALIDA`) | V | V | `GET /api/companies/{id}/benefits`; `POST /api/benefits` · `requireIssuer`; `POST /api/benefits/{id}/redeem` |
| Destaques (RF35.CA03) | **E** (curadoria final) | E (curadoria do seu departamento) | V (CURADOR com PREMIACAO: E) | V | V | `GET /api/highlights?company=`; `POST /api/highlights/{id}/curate` · `requireIssuerOrCurator(PREMIACAO)` |
| Pessoas | **E** (lotar/transferir, RF28.CA02) | V (+ RF9 no seu departamento) | V | V\* (só nomes/cargos públicos) | V | `GET /api/companies/{id}/people?dept=`; `POST /api/departments/{id}/members` · `requireRole(EMPRESA)` ou `requireDeptHead` |
| **Comunicados** **(proposta, §7.a)** | **E** (publica, fixa, arquiva) | **E** (publica com etiqueta do departamento) | V + reagir/comentar | V\* (só PÚBLICO) | V | `POST /api/companies/{id}/announcements` · `requireIssuer` + `requireSameCompany`; `GET` · `canView` |
| **Gestão** (só dona; **proposta, §7.c**): Políticas (pontos, HSE, ranking, Hype, gravação, limite de reconhecimentos/mês) · Dashboard do emissor · Insights da empresa · Dossiês · Aprovações internas | **E** | O (chefe tem o seu dashboard) | O | O | V | `PUT /api/companies/{id}/policies/*` · `requireRole(EMPRESA)`+`requireOwner`; `GET /api/issuer/dashboard` · `requireIssuer` |

> Como no FAI, as abas "do administrador" devem ser **negadas no serviço** para quem não é a dona (`InstitutionalService.java:282-284`), não só escondidas.

---

## 5. Matriz D — Página do DEPARTAMENTO / CHEFE (`/departments/[slug]`, RF28)

Fonte: `board › RF28` (`board2.md:555-556`); `docs/diagramas/RF28/README.md:7`. "Chefe" = `Department.headUserId` (`TAXONOMIA.md:64`). O perfil **pessoal** do chefe continua em `/u/[username]` (Matriz B); esta página é a institucional do departamento, e é o que o board chama de "perfil do chefe" nos novos cards RF14.

| Sub-aba | CHEFE (do dept.) | EMPRESA dona | CURADOR (do dept.) | Membro do dept. | Mesma empresa, outro dept. | Outra empresa / anônimo | Endpoint · guard |
|---|---|---|---|---|---|---|---|
| Sobre (sigla, cor, monograma, chefe, sobre, capa, seguir) | E | E | V | V | V | V | `GET /api/departments/{slug}`; `PUT` · `requireDeptHead` |
| Projetos do departamento | E | V | V | V (+ os seus) | V\* (visibilidade EMPRESA/PÚBLICO) | V\* (PÚBLICO) | `GET .../projects?fase=` · `canView` |
| Sessões DECIA (abertas / encerradas) | **E** (administra, RF28 §3) | V | V | V (as suas) | V\* (só PÚBLICAS/encerradas com resumo) | O | `GET .../sessions?status=` · participante ou `canView` |
| Chancelas do departamento e fila de revisão (RF39) | **E** | V | **E** (fila; premiação se escopo) | V (+ "Pedir chancela", "Indicar colega", "Propor chancela", RF39.CA06) | V (chancelas) · O (fila) | V (chancelas) · O (fila) | `GET .../seals`; `GET /api/seal-bonds/review-queue?dept=` · `requireIssuerOrCurator(FILA_REVISAO)` |
| Reconhecimentos emitidos (RF35.CA04) | **E** (emitir; limite/mês RF35.CA06) | V | V | V | V | V | `POST /api/recognitions` · `requireIssuer` (RF28.CA05) |
| Equipe (com curadores) — **modo público** | V | V | V | V | V | V\* (nomes e cargos) | `GET .../team` (público) |
| **Minha equipe — modo gestão (proposta, §7.b)** | **E** | V (leitura) | V\* (só fila/premiação) | **O** | O | O | `GET .../team/manage` · `requireDeptHead`; RF9 `POST/DELETE .../members`; RF10 `POST /api/projects/{id}/tasks/{tid}/assign`; nomear curador `POST .../curators` (RF28.CA03) |
| Dashboard do emissor (filtrado ao departamento) | V | V | O | O | O | O | `GET /api/issuer/dashboard?dept=` · `requireIssuer` + `requireDeptHead` |
| Insights da Equipe (RF43.CA14) | V | V | O | O | O | O | `GET /api/insights/team?dept=` · `requireIssuer` + `requireDeptHead`; pesquisas anônimas com ≥ 5 respondentes |

---

## 6. Matriz E — Páginas globais

| Página (rota) | RF | EMPREGADO | EMPRESA | CHEFE | CURADOR | ADMIN | Endpoint · guard |
|---|---|---|---|---|---|---|---|
| 6.1 Balcão de Modelos (`/models`) | RF40 | V navega · E oferece/remixa (409 `SALDO_INSUFICIENTE`) | V · E **destaca** (RF40.CA07) | V · E destaca | V (**proposta:** "sugerir ao chefe") | V | `GET /api/models?shelf=&cat=&dept=&license=&price=`; `POST /api/models/{id}/remix` · `requireCanCreate` (ledger transferência, RF42.CA05) |
| 6.2 Loja Work Station (`/store`) | RF42 | E compra (modelos, créditos IA, skins, impulso, kits, certificado, doação) | V catálogo · **E** cadastra itens da empresa (`StoreItem.companyId`, `TAXONOMIA.md:371`) **(proposta)** | E compra | E compra | E + gere catálogo | `GET /api/store`; `POST /api/store/{id}/buy` (409 `SALDO_INSUFICIENTE`/`ITEM_INDISPONIVEL`); `POST /api/store/items` · `requireRole(EMPRESA)` ou `requireAdmin` |
| 6.3 Metas coletivas (`/goals`) | RF35 | V · entra/participa | **E** cria (empresa toda) | **E** cria (departamento) | V | V | `POST /api/goals` · `requireIssuer` (anti-trivial `minEffortCheck`, RF35.CA06) |
| 6.4 Destaques (`/highlights`) | RF35.CA03 | V | E curadoria | E curadoria | E se PREMIACAO | V | `GET /api/highlights`; `POST .../curate` · `requireIssuerOrCurator(PREMIACAO)` |
| 6.5 Benefícios (`/benefits`) | RF39.CA09/CA10 | V · **resgata** | **E** publica | **E** publica | V | V | `POST /api/benefits` · `requireIssuer`; `POST /api/benefits/{id}/redeem` · `requireCanCreate` (idempotente) |
| 6.6 Reconhecimentos (`/recognitions`) | RF35.CA04 | V (recebidos) | **E** emite | **E** emite | V | V | `POST /api/recognitions` · `requireIssuer` |
| 6.7 Insights (`/insights`) | RF43 | Acervo E · Perfil E (só dono, CA04) · Equipe **O** · Ranking V (opt-out, "Explique minha posição", CA05) · Sugeridos E | Acervo E · Perfil **O** · Equipe **E (empresa)** · Ranking V + **edita pesos** (CA05) · Sugeridos E | Acervo E · Perfil E · Equipe **E (dept.)** · Ranking V · Sugeridos E | = EMPREGADO | tudo V + painel "IA do sistema" (CA12) | `GET /api/insights/team?dept=` · `requireIssuer`+`requireDeptHead`; `PUT /api/companies/{id}/ranking-weights` · `requireRole(EMPRESA)`; `GET /api/admin/ai` · `requireAdmin` |
| 6.8 DECIA Points (`/points`) | RF42 | V saldo/extrato/regras/gráfico (CA03) | **V\*** regras (edita, CA02) + pontos por departamento (CA08); **sem saldo próprio** (§7.d) | V/E + **revisa lançamentos suspensos** da equipe (CA07) | V | V + regras | `GET /api/me/points`; `GET /api/points/rules`; `PUT /api/points/rules` · `requireRole(EMPRESA)`/`requireAdmin`; `POST /api/points/{entryId}/review` · `requireDeptHead` (CA07) |
| 6.9 Admin (`/admin/*`) | RF18, RF28.CA01, RF43.CA12 | O | O | O | O | **E**: Dashboard · Aprovações (EMPRESA/CHEFE pendentes) · Usuários (status/papel) · Moderação · IA do sistema · Auditoria · Sistema (backups, jobs) | `/api/admin/**` · `requireAdmin` (FAI `AdminController.java:33-136`; `POST /api/admin/approvals/{userId}`, RF28.CA01) |

---

## 7. Perguntas específicas (opções e recomendação)

### 7.a Mural dentro do perfil de uma EMPRESA

**Fatos.** O board define o **Mural geral** (`/mural`) com três sub-abas: *Mural da empresa* (compartilhamentos, decisões validadas, projetos publicados e reconhecimentos **da minha empresa**, cronológico, filtros por departamento e tipo), *Vitrine de projetos* (chancelados e modelos públicos em destaque, "remixar") e *Seguindo* (`board › RF27`, `board2.md:531-534`). `MuralEntry` já carrega `companyId` e `departmentId` e os tipos COMPARTILHAMENTO · DECISAO_VALIDADA · PROJETO_PUBLICADO · RECONHECIMENTO · META · DESTAQUE · IMPULSO (`TAXONOMIA.md:385`). A página da empresa do RF28 **não tem** sub-aba Mural (`board2.md:553`). No FAI, a página da marca também não tem feed próprio; o Feed é global (`app-shell.tsx:19`; `brands/[slug]/page.tsx:54-55`). Ou seja: hoje o Mural geral **já é** o mural da empresa — a pergunta real é se a página da empresa precisa de um canal **editorial** próprio.

| Opção | O que é | Prós | Contras |
|---|---|---|---|
| **A. Nenhuma aba**; botão "Ver mural da empresa" → `/mural?empresa=slug` | zero duplicação | simples; coerente com o FAI | a Secretaria não tem lugar para **falar** — o Mural geral é 100 % automático (eventos) |
| **B. Comunicados oficiais** (canal editorial) | sub-aba na página da empresa onde **só EMPRESA e CHEFES publicam** textos/links/anexos (portarias, avisos, convocações); empregados **reagem e comentam**; itens podem ser **fixados** e têm visibilidade EMPRESA (padrão) ou PÚBLICO; cada comunicado também entra no Mural geral como `MuralEntry.kind = COMUNICADO` com etiqueta "Oficial" | dá voz institucional sem inventar outra rede social; reaproveita `Comment`/`Reaction` (RF26) e `MuralEntry`; diferencia-se da Vitrine (curadoria de projetos) e do Mural geral (eventos) | 1 entidade nova (`Announcement`) ou 1 `kind` novo + `TargetType.COMUNICADO`; moderação de comentários pelo chefe (RF26.CA03 já prevê) |
| **C. Mural filtrado embutido** (a sub-aba 1 do RF27 renderizada dentro da página da empresa) | mesma lista, outro lugar | sem modelo novo | duplica a aba do RF27; continua sem canal editorial |

**Recomendação: B.** Nome **"Comunicados"** (não "Mural", para não confundir com o RF27). Regras propostas:
- **Quem publica:** conta EMPRESA (`requireRole(EMPRESA)` + `requireOwner(company)`) e CHEFES da empresa (`requireDeptHead` de qualquer departamento da empresa) — o comunicado de chefe sai com o monograma do departamento (`Department.monogram/color`, `TAXONOMIA.md:64`). CURADOR **não** publica (escopo é chancela/premiação, RF28.CA03). EMPREGADO não publica (compartilha no Mural geral via RF26.CA05).
- **Quem comenta/reage:** qualquer usuário **da mesma empresa** (`requireSameCompany`), com `Reaction` CURTIR/ÚTIL e `Comment` em thread (RF26.CA01–CA03); a empresa pode **desligar comentários** por comunicado. Comentário de terceiros em comunicado PÚBLICO: não (evita moderação externa).
- **Visibilidade:** `EMPRESA` por padrão (interno); `PÚBLICO` opcional (aparece na página pública para anônimos e outras empresas, como as métricas públicas do RF28.CA04). Itens fixados ("pin") ficam no topo da página da empresa e aparecem como faixa no topo do Mural geral para os empregados.
- **Diferença para a Vitrine:** a Vitrine mostra **projetos/modelos** chancelados (RF27 sub-aba 2, RF39.CA11); Comunicados mostram **texto institucional**. Para o Mural geral: o Mural é cronológico e automático; Comunicados são editoriais e fixáveis, e aparecem no Mural com a etiqueta "Oficial" e filtro próprio.
- **Entidade (proposta):** `Announcement { id, companyId, departmentId?, authorId, title, bodyMd, attachmentsJson, visibility (EMPRESA·PUBLICO), pinned, commentsEnabled, publishedAt, archivedAt }` + `MuralEntry.kind = COMUNICADO` + `TargetType.COMUNICADO` (para `Reaction`/`Comment`).

### 7.b CHEFE: aba "Meus Funcionários"?

**Fatos.** O board já prevê na página do departamento a sub-aba **"Equipe (com curadores)"** (`board › RF28`, `board2.md:556`) e novos cards sem corpo: **RF9** "chefe adiciona/remove usuário da sua lista de empregados atuais" e **RF10** "chefe atribui tarefa ou projeto a um usuário" (`board2.md:305-309`). O chefe vê Insights da Equipe (RF43 §4 e CA14), opera a fila de chancelas (RF39.CA04), revisa decisões (RF15) e lançamentos suspensos (RF42.CA07), emite reconhecimentos (RF28.CA05) e gera dossiês (RF36.CA01). O dashboard do emissor (RF28.CA06) lista projetos por fase, prazos em risco, decisões pendentes e fila de chancelas.

**Nome.** Opções: *Meus Funcionários* (possessivo e privado-setorial; "funcionário" é termo da CLT), *Servidores* (correto no setor público, mas exclui comissionados, estagiários, terceirizados e consultores que compõem as equipes da SECID; soa hierárquico), *Minha Equipe* (neutro, abarca todos os vínculos, e **é o mesmo nome** que o board já usa para a visão pública — "Equipe"). **Recomendação:** uma única aba **"Equipe"** com dois modos: **público** (lista de pessoas com cargo, monograma e etiqueta "Curador") para todos, e **"Minha equipe" (gestão)**, que só o chefe (e a EMPRESA, em leitura) enxerga, com um seletor de modo no topo — exatamente como o FAI troca o rótulo da aba conforme `admin` ("Looks consagrados" → "Looks", `brands/[slug]/page.tsx:54`). No menu Gestão o atalho chama-se **Minha equipe**.

**Conteúdo do modo gestão (proposta, por bloco, com fonte):**

| Bloco | Conteúdo | Fonte / regra | Endpoint |
|---|---|---|---|
| 1. Lista e lotação | pessoas do departamento (`DepartmentMembership` vigente), cargo, data de entrada, curadores; ações **adicionar/remover/transferir** (RF9) e **nomear/revogar curador** (RF28.CA03, auditado) | `TAXONOMIA.md:66-70`; RF28.CA02 (1 departamento por vez, histórico) | `GET .../team/manage`; `POST/DELETE .../members`; `POST/DELETE .../curators` · `requireDeptHead` |
| 2. Carga e balanceamento | tarefas ativas (EM_USO) por pessoa × `wipLimit` pessoal (padrão 3, RF44.CA05), utilização ≤ 80 %, desvio-padrão da carga, **bus factor** (pessoa única em tarefa crítica); ação "redistribuir" (abre RF10) | RF43 §8-D e CA14; `UserPreferences.wipLimit` (`TAXONOMIA.md:50`) | `GET /api/insights/team?dept=&metric=load` |
| 3. Atribuir tarefa/projeto (RF10) | selecionar pessoa → tarefa ou projeto → prazo; cria `ProjectTask.responsibleUserId` / responsável da tarefa; notifica (`NotificationType` TAREFA_DO_DIA/SISTEMA); a pessoa pode **aceitar/recusar com motivo** **(proposta)**; a atribuição alimenta a Tarefa do Dia dela (RF44) e o DELEGUEI faz o caminho inverso | RF44 §3 DELEGUEI; RF46 (atribuir via chat) | `POST /api/projects/{id}/tasks/{tid}/assign`, `POST /api/tasks/{id}/assign` · `requireDeptHead` + membro do dept. |
| 4. Tarefa do Dia e HSE **agregados** | por dia: quantas pessoas registraram CONCLUÍ / ADIEI / BLOQUEADA / DELEGUEI; **HSE médio da equipe** e distribuição (histograma), streak médio; **sem HSE nominal** por padrão | RF44 (HSE realizado alimenta "insights de equipe (balanceamento de carga)"); RF45.CA10 (histograma anonimizado, "nunca lista nominal") | `GET /api/insights/team?dept=&metric=daily` |
| 5. Pendências e prazos em risco | tarefas BLOQUEADAS (com "por quem/o quê", RF44.CA04), prazos legais vencidos/≤ 3 dias (RF41.CA04), projetos com SPI < 0,9 (RF43.CA09), **nominal** (é dado operacional, não de desempenho) | RF28.CA06 | `GET /api/issuer/dashboard?dept=&panel=risks` |
| 6. Fila de chancelas e decisões em revisão | `SealBond` EM_REVISAO do departamento com relatório de critérios (RF39.CA04); `FinalDecision` EM_REVISAO das sessões que administra (RF15); lançamentos de pontos **suspensos** (RF42.CA07) | RF28.CA06 | `GET /api/seal-bonds/review-queue?dept=`; `GET /api/decia/decisions?status=EM_REVISAO`; `GET /api/points/suspended?dept=` |
| 7. Insights da Equipe (RF43.CA14) | segurança psicológica, Health Check, eNPS (anônimos, ≥ 5 respondentes), rede de colaboração, gargalos, recomendações acionáveis ("abrir sessão DECIA sobre o gargalo Z") | RF43 §4, §8-D, CA14 | `GET /api/insights/team?dept=` |
| 8. Reconhecimentos emitidos | lista, limite mensal restante (RF35.CA06), emitir novo (RF28.CA05) | RF35.CA04 | `GET/POST /api/recognitions?dept=` |
| 9. Dossiês de transição | gerar para saída/transferência (RF36.CA01), indicar sucessor (CA03), itens PRIVADOS só com consentimento (CA05) | RF36 | `POST /api/handoffs` · `requireIssuer` |

**O que o chefe NÃO vê (limites LGPD, com fonte):**
- **Hype Score do Perfil** de quem escolheu SÓ EU — nem no perfil, nem em lista: "a API nunca retorna o score a quem não tem permissão" (RF45.CA06); o dashboard mostra **histograma anonimizado** e "nunca a lista nominal de quem ocultou" (RF45.CA10); o ranking respeita opt-out e "nunca expõe o número de quem escolheu SÓ EU" (RF45.CA08). O Hype "não é instrumento disciplinar" (RF45 §4).
- **Perfil deliberativo completo** (sub-aba 15) e **Insights › Perfil**: "só o dono" (RF43.CA04); o chefe vê apenas o resumo público que a pessoa escolheu (sub-aba 5) e a comparação **anonimizada** com o departamento.
- **HSE nominal e histórico da Tarefa do Dia** (sub-aba 9, 30 dias): só o dono (RF19; RF44.CA07). **(proposta)** preferência `UserPreferences.shareHseWithHead` (padrão desligado) para quem quiser compartilhar o HSE nominal com o chefe; sem ela, só agregados.
- **Saldo e extrato de DECIA Points** individuais (sub-aba 13): só o dono; o chefe vê pontos **por departamento** (RF42.CA08) e os lançamentos **suspensos** que precisa revisar (RF42.CA07) — única exceção nominal, limitada ao lançamento em questão.
- **Itens PRIVADOS** do acervo/projetos do empregado: nunca, salvo consentimento no dossiê (RF36.CA05); `Visibility.DEPARTAMENTO` é o máximo que o chefe recebe automaticamente (RF26.CA08).
- **Dados pessoais sensíveis** (`email`, `phone` em AES-GCM, `TAXONOMIA.md:38-41`): nunca na API de equipe; só nome, username, cargo e lotação.
- **Respostas individuais** das pesquisas anônimas (RF43.CA14: anônimas, ≥ 5 respondentes).

### 7.c EMPRESA terá abas de gestão?

**Sim.** O board atribui à EMPRESA: criar departamentos e chefes (RF28.CA02, CA07), lotar pessoas (RF28.CA02), criar chancelas e políticas de concessão (RF39.CA01/CA02), publicar benefícios (RF39.CA09), plano anual oficial (RF24.CA04), programas (RF25), editar regras/tetos/expiração de DECIA Points (RF42.CA02/CA09), pesos de HSE (RF44.CA08), pesos e critérios do ranking (RF43.CA05), pesos/meia-vida/faixas do Hype (RF45.CA07), política de retenção de gravação (RF37.CA05, `Company.recordingRetentionPolicy`), limite de reconhecimentos/mês e esforço mínimo das metas (RF35.CA06, `Company.pointsPolicyJson`), dashboard do emissor (RF28.CA06) e insights da empresa (RF43.CA14). No FAI o equivalente são as abas `admin`-only da página da marca (Cupons · Esquemas salvos · Peças salvas · Revisão · Métricas, `brands/[slug]/page.tsx:54-55`) mais `/dashboard` (`DashboardController.java:34`).

| Opção | Prós | Contras |
|---|---|---|
| **A. Abas de gestão dentro da página da empresa**, visíveis só para a dona (padrão FAI) | 1 lugar, mesma URL pública e privada; a dona vê o que o público vê e o que só ela vê | a lista de abas fica longa (8 públicas + ~6 de gestão) |
| **B. Área separada** `/companies/[slug]/manage` com menu próprio | abas públicas limpas; gestão com layout de painel | duas páginas para a mesma entidade; o FAI não faz assim |
| **C. Híbrido (recomendado):** abas públicas + **uma** aba "Gestão" (só dona) que abre um sub-menu lateral: Departamentos & chefes · Pessoas & lotações · Chancelas & políticas de concessão · Benefícios · Plano Anual oficial · Programas · **Políticas** (DECIA Points, HSE, Ranking, Hype, Gravação, Reconhecimentos/mês) · Dashboard do emissor · Insights da empresa · Dossiês · Comunicados | mantém o padrão FAI (gestão no próprio perfil, `app-shell.tsx:65`) e evita 14 abas em linha | nada relevante |

Regra de backend igual à do FAI: toda aba de gestão é **negada no serviço** (`requireRole(EMPRESA)` + `requireOwner(company)`), não só escondida (`InstitutionalService.java:282-284`). A EMPRESA **não** aprova contas (isso é ADMIN, RF28.CA01), mas pode **convidar** e **lotar** (RF28.CA02).

### 7.d Quais abas do EMPREGADO somem/mudam para EMPRESA e CHEFE

**CHEFE é uma pessoa** (= CELEBRIDADE do FAI, que continua tendo lookbook e DailyLook): mantém as **15 sub-abas** pessoais (Tarefa do Dia, Hype, perfil deliberativo, DECIA Points) e ganha o **departamento** como página institucional separada (Matriz D) com atalho no perfil e no menu Gestão. Mudanças pontuais: a sub-aba 12 ganha a visão "Emitidos" (reconhecimentos/chancelas que ele concedeu, RF28.CA05); Insights ganha "Equipe" (RF43.CA14); Metas/Benefícios/Reconhecimentos ganham "criar/emitir".

**EMPRESA é uma conta institucional** (= MARCA do FAI, que no FAI não tem Look do Dia nem Hype pessoal — a página da marca não exibe essas abas, `brands/[slug]/page.tsx:54-55`). **(proposta)** somem ou mudam:

| Sub-aba do EMPREGADO | Na EMPRESA | Justificativa |
|---|---|---|
| 5 Perfil deliberativo (resumo) e 15 (completo) | **somem** | objetivo 2 é "a cada empregado" (`board2.md:12`); `DeliberativeProfile` é por `userId` pessoa |
| 9 Tarefa do Dia / widget | **some** | RF44.CA01 "dado um **empregado**"; a priorização usa WIP pessoal, reuniões da agenda, HSE — não faz sentido para a Secretaria como ente. Substituto: **painel "Hoje na empresa"** no Dashboard do emissor (prazos vencendo, decisões em revisão, fila de chancelas) **(proposta)** |
| 13 DECIA Points | **some** como saldo próprio; vira **"Pontos por departamento" + "Regras"** no Gestão | DP nascem "só de participar bem no chat DECIA" (RF42); a conta EMPRESA não é avaliada pelo perfil deliberativo (multiplicador 0,5–2,0, RF42 tabela) → **(proposta)** `User.earnsPoints = false` para EMPRESA (como `testAccount`, `TAXONOMIA.md:54`), e a conta não entra no ranking |
| 14 Hype Score do Perfil | **some** | "índice de reputação profissional **por pessoa**" (RF45); a reputação da empresa são as métricas públicas do RF28.CA04 |
| 11 Meus modelos oferecidos | vira **"Modelos oficiais"** (chancelados, prateleira Chancelados do Balcão) | RF39.CA11, RF40.CA02 |
| 12 Meus Reconhecimentos e Chancelas | vira **"Emitidos"** (reconhecimentos e chancelas concedidos) | RF28.CA05, RF39.CA11 métricas do emissor |
| 6 Meus Planos Anuais | vira a aba pública **Plano Anual oficial** | RF24.CA04 |
| 1–4, 7, 8, 10 | ficam (acervo institucional, projetos da empresa, programas, decisões, salvos, kits oficiais) | — |

Para o **CURADOR** nada some; ganha o grupo Gestão › Curadoria (§7.e) e a etiqueta no cabeçalho. Para o **ADMIN** nada some do seu perfil-base; ganha Gestão (admin).

### 7.e O que o CURADOR ganha além da fila de revisão

**Fatos.** RF28.CA03: curador nomeado pelo chefe, papel contextual, "opera a fila de revisão de chancelas e a curadoria de premiação (RF39) em nome do emissor", nomeação/revogação em `audit_log`; escopos FILA_REVISAO · PREMIACAO · AMBOS (`TAXONOMIA.md:69-70`). RF39.CA01 diz que "EMPRESA e CHEFE (**ou CURADOR nomeado por eles**, em nome do emissor) **criam/editam** chancelas" — isso **conflita** com RF28.CA03 (operar fila ≠ criar chancela). Ver proposta P-07.

**Ganhos propostos (todos "em nome do emissor", com `requireCurator(dept, scope)`):**
1. **Grupo Gestão › Curadoria** no menu, com badge de pendências (fila + indicações) — hoje o badge existe no CSS (`.ws-nav__badge`, `components.css:240`).
2. **Fila de revisão** (escopo FILA_REVISAO): aprovar/rejeitar vínculos EM_REVISAO com nota; o `SealBond.reviewedBy` registra o curador e a notificação ao autor diz "em nome de {emissor}" (RF39.CA12).
3. **Curadoria de premiação** (escopo PREMIACAO): triagem dos **Destaques do mês** (RF35.CA03) e das **indicações** (RF39.CA06, basis INDICAÇÃO) antes da decisão do chefe; concessão da **Chancela de Excelência** dentro do ciclo/limite (RF39.CA05: "curadoria (chefe/empresa/curador)").
4. **Triagem de propostas de chancela** (`SealProposal`, RF39.CA06): recomendar ao chefe "criar / recusar" — a criação continua do chefe **(proposta)**.
5. **Pré-seleção no Balcão**: marcar modelos da comunidade como "sugerido ao chefe" para destaque (RF40.CA07 continua exclusivo de EMPRESA/CHEFE) **(proposta)**.
6. **Métricas da curadoria**: itens revisados, tempo médio na fila, taxa de aprovação (recorte dos "métricas do emissor" de RF39.CA11) **(proposta)**.
7. **Etiqueta no perfil** "Curador · {sigla}" (`CuratorAppointment` vigente) e menção na aba Equipe (já prevista: "Equipe (com curadores)").

**O que não ganha:** criar/editar chancelas e políticas (P-07), publicar benefícios, emitir reconhecimentos, criar metas, acessar Dashboard do emissor e Insights › Equipe, gerir membros (RF9) ou atribuir tarefas (RF10). Curador que também é EMPREGADO continua indicando e propondo como qualquer um (RF39.CA06), mas **não pode revisar a própria indicação** (`requestedBy == user` → 409 `CONFLITO_DE_INTERESSE`, **proposta**).

---

## 8. Mudanças propostas no board (numeradas)

1. **P-01 · RF9 (novo card)** "chefe adiciona/remove usuário da sua lista de empregados atuais" — conflita com o RF9 já diagramado (gestão de participantes da **sessão DECIA**, HU9; `docs/diagramas/RF9/README.md:1-4`). Propor: manter RF9 = sessão (HU9) e mover "adicionar/remover empregado" para **RF28.CA02** (já diz "vincula empregados a um departamento") como **RF28.CA09**: "O CHEFE adiciona/remove empregados **do seu departamento** (`DepartmentMembership`), com histórico; remover gera aviso ao empregado e, se houver pendências, oferece o Dossiê (RF36)". Ou renumerar o card novo (ver `DECISOES.md` Q-44 sobre a renumeração).
2. **P-02 · RF10 (novo card)** "chefe atribui tarefa ou projeto a um usuário" — idem (RF10 diagramado = responder divergência). Propor CAs: (a) atribuição cria responsável em `ProjectTask`/`TaskItem` e notifica; (b) só para membros do departamento (`requireDeptHead`); (c) o atribuído aceita/recusa com motivo; (d) a atribuição entra no índice de prioridade da Tarefa do Dia (RF44 §1 "decisão DECIA pendente/chancela pedida" + "atribuída pelo chefe"); (e) DELEGUEI (RF44 §3) é o caminho inverso e exige aceite do chefe se for para fora do departamento.
3. **P-03 · RF14/RF15/RF16 (novos cards)** "visualizar perfil de chefe / empresa / empregado" — já cobertos por RF19.CA02 + RF28.CA04. Propor CAs que apontem para as matrizes: RF16 = Matriz B colunas "terceiros"; RF15 = Matriz C (colunas visitante); RF14 = Matriz D + perfil pessoal do chefe. Esclarecer que "perfil do chefe" = página do **departamento** (institucional) **+** perfil pessoal.
4. **P-04 · RF19.CA06** detalhar: "EMPRESA: somem sub-abas 5, 9, 13, 14, 15; 6→Plano oficial, 11→Modelos oficiais, 12→Emitidos; CHEFE: mantém 15 + atalho ao departamento" (§7.d).
5. **P-05 · RF19 (novo CA)** "Sub-abas 9, 13, 14 e 15 são negadas também ao ADMIN (`requireOwnerStrict`); o ADMIN acompanha pelo painel agregado (RF45.CA10)".
6. **P-06 · RF28 página da empresa** acrescentar sub-aba **Comunicados** (§7.a) com CA: "EMPRESA e CHEFES publicam comunicados (texto, anexos, fixar, visibilidade EMPRESA/PÚBLICO); colegas da empresa reagem e comentam; cada comunicado entra no Mural (RF27) como `COMUNICADO` com etiqueta Oficial".
7. **P-07 · RF39.CA01 × RF28.CA03** alinhar o papel do CURADOR: remover "ou CURADOR nomeado por eles" de "criam/editam chancelas" **ou** criar `CuratorScope.CRIACAO`. Recomendo remover (curador decide vínculos; a chancela é do emissor, D-09).
8. **P-08 · RF28 (novo CA)** "Equipe" com modo gestão **Minha equipe** (§7.b) e lista explícita do que o chefe **não** vê (Hype SÓ EU, perfil deliberativo completo, HSE nominal, saldo DP, itens PRIVADOS, dados sensíveis).
9. **P-09 · RF44 (novo CA)** "Tarefa do Dia só existe para contas pessoa (EMPREGADO, CHEFE); conta EMPRESA recebe `403 PERFIL_INSTITUCIONAL`" e **(opcional)** "HSE nominal visível ao chefe só com `shareHseWithHead` ligado; sem isso só agregados".
10. **P-10 · RF42 (novo CA)** "Conta EMPRESA não acumula DECIA Points nem entra no ranking (`earnsPoints=false`); vê regras e pontos por departamento".
11. **P-11 · RF35.CA05** corrige referência "RF19.CA12" (não existe; RF19 tem CA01–CA07) → "RF19 sub-aba 15".
12. **P-12 · RF24.CA06** "chancela (RF28)" → "chancela (RF39)".
13. **P-13 · RF24 título** "aba metas & objetivos de **minha equipe** com insights" não corresponde ao corpo (Plano Anual). Propor: título volta a "Plano Anual / Trilha Estratégica" e a visão "metas & objetivos da equipe" vira **RF24.CA08** ("CHEFE vê o plano do departamento com progresso por eixo e insights RF43") ou fica no RF35/RF43.
14. **P-14 · RF46 (novo card, sem corpo)** "chats de mensageria para comunicar-se e atribuir/receber tarefas e projetos". Propor CAs mínimos: (a) conversa 1:1 e em grupo **fora** da sessão DECIA (sem IA, sem pontos); (b) mensagem pode carregar tarefa/projeto como anexo (reuso de `MessageAttachment`); (c) ação "Atribuir" dentro do chat chama o RF10 e deixa rastro; (d) ícone na barra superior ao lado de Notificações (`app-shell.tsx:272`) e item **Mensagens** no grupo Descobrir; (e) só entre pessoas da mesma empresa por padrão; (f) retenção/LGPD. Esclarecer a relação com o DECIA (chat deliberativo) para não criar dois chats concorrentes.
15. **P-15 · Mapa de equivalência §2** linha "Gestão (admin)": trocar para "**Gestão** (EMPRESA, CHEFE, CURADOR, ADMIN — itens por papel)" e listar os itens da Matriz A §2.5; incluir **Mensagens** (RF46) e **Comunicados** (RF28) nas abas.
16. **P-16 · RF28.CA06** acrescentar "visão do CHEFE é filtrada ao(s) seu(s) departamento(s); HSE/Hype só agregados (RF45.CA10)".
17. **P-17 · RF43.CA14** acrescentar "CHEFE vê Insights › Equipe só do(s) departamento(s) que chefia; EMPRESA vê todos; CURADOR e EMPREGADO recebem 403".
18. **P-18 · RF45 §3** avaliar um quarto nível `HypeVisibility.CHEFE` (dono mostra só ao chefe direto) — ver pergunta 6.
19. **P-19 · RF40.CA07** acrescentar "CURADOR pode marcar modelo da comunidade como *sugerido ao chefe*; o destaque continua de EMPRESA/CHEFE".
20. **P-20 · RF39.CA06** acrescentar "quem indicou não revisa a própria indicação (409 CONFLITO_DE_INTERESSE)".

---

## 9. Perguntas para o dono do produto (numeradas)

1. **Comunicados** (§7.a): aceita a sub-aba "Comunicados" na página da empresa como canal editorial de EMPRESA + CHEFES, ou prefere só o atalho para o Mural filtrado? Comentários abertos a toda a empresa por padrão?
2. **Nome da aba do chefe** (§7.b): "Equipe" (público) + "Minha equipe" (gestão)? Ou prefere "Servidores" por aderência ao vocabulário da SECID?
3. **HSE nominal para o chefe**: nunca (só agregados), sempre, ou opt-in do empregado (`shareHseWithHead`)? Isso define RF44/RF19 e a política LGPD do RF45 §4.
4. **RF9/RF10 novos** colidem com RF9/RF10 já diagramados (sessão DECIA): renumeramos os novos (RF47/RF48) ou movemos para CAs do RF28 (P-01/P-02)?
5. **Conta EMPRESA e DECIA Points**: a Secretaria participa de sessões DECIA como conta? Se sim, ela ganha pontos? Minha proposta é não (P-10).
6. **Hype para o chefe**: além de PÚBLICO/EMPRESA/SÓ EU, faz sentido um nível "só meu chefe"? (P-18)
7. **Curador cria chancela?** RF39.CA01 diz sim, RF28.CA03 diz que só opera fila/premiação. Qual vale? (P-07)
8. **Plano Anual oficial**: fica como sub-aba pública da página da empresa (Matriz C) e sai do perfil "Meus Planos" da conta EMPRESA? Os 6 eixos são fixos (Q-08 em `DECISOES.md`)?
9. **ADMIN vê sub-abas privadas de terceiros?** No FAI `requireOwner` deixa o admin passar (`Guard.java:82`). Proponho bloquear 9/13/14/15 (P-05). Concorda?
10. **RF46 Mensagens**: é um chat separado do DECIA (sem IA, sem pontos) ou uma sessão DECIA "leve"? Onde entra no menu — Descobrir, Meu trabalho ou ícone na barra superior? (P-14)
11. **RF14/15/16 novos**: aceitam ser CAs de RF19/RF28 (P-03) em vez de RFs próprios?
12. **Dashboard do emissor** para o CHEFE de mais de um departamento (RF28.CA07): um seletor de departamento ou visão consolidada?

---

## 10. Como ler o wireframe

`docs/lab/perfis.html` é estático e usa só `docs/design-system/tokens.css` + `components.css` (classes `ws-*`). Controles no topo: **perfil** (Empregado · Empresa · Chefe · Curador · Admin), **visão** (próprio perfil × como terceiro) e **tema** (`data-theme` claro · escuro · contraste · blueprint). Cada combinação pode ser aberta por URL: `perfis.html?perfil=chefe&visao=terceiro&tema=escuro`. As abas marcadas com a etiqueta **oculta** aparecem apagadas na visão "terceiro" para mostrar o que a API omite; as marcadas **proposta** são as deste documento. Capturas (1440 px, tema claro, visão própria): `docs/lab/capturas/perfis-{empregado,empresa,chefe,curador,admin}.png`.


---

## 11. Implementado em (etapa (b) — shell e páginas-esqueleto)

Fonte: `lib/pages/registry.ts` (rota → arquivo → RFs → visibilidade por perfil) e `lib/nav/matrix.ts` (Matriz A). Cada página é um esqueleto (`components/shell/RfPage.tsx`): cabeçalho com chips dos RFs, sub-abas da matriz, bloco "O que esta aba vai fazer" com os CAs copiados dos READMEs (`lib/rf/catalog.gen.ts`) e `403 ACESSO_NEGADO` simulado quando a célula é **O** para o perfil de visualização (`lib/viewer`, D-35). Matrizes: A menu lateral · B perfil · C empresa · D departamento · E globais · auth · lab · global.

| Aba | Rota | Arquivo | RF(s) | Matriz |
|---|---|---|---|---|
| Mural | `/mural` | `app/(shell)/mural/page.tsx` | RF27 RF18 RF19 | A |
| Buscar | `/search` | `app/(shell)/search/page.tsx` | RF27 RF17 | A |
| Memória Institucional | `/memory` | `app/(shell)/memory/page.tsx` | RF33 | A |
| Empresas & Departamentos | `/companies` | `app/(shell)/companies/page.tsx` | RF28 | A |
| Página da empresa | `/companies/[slug]` | `app/(shell)/companies/[slug]/page.tsx` | RF15 RF28 RF25 RF39 RF24 | C |
| Página do departamento | `/departments/[slug]` | `app/(shell)/departments/[slug]/page.tsx` | RF14 RF28 RF9 | D |
| Balcão de Modelos | `/models` | `app/(shell)/models/page.tsx` | RF40 | A |
| Mensagens | `/messages` | `app/(shell)/messages/page.tsx` | RF46 RF10 | A |
| Conversa | `/messages/[conversationId]` | `app/(shell)/messages/[conversationId]/page.tsx` | RF46 RF13 | A |
| Encontrar | `/find` | `app/(shell)/find/page.tsx` | RF47 RF27 RF33 RF20 | A |
| Meu perfil | `/profile` | `app/(shell)/profile/page.tsx` | RF6 RF19 RF12 RF25 RF44 RF45 RF40 | B |
| Perfil | `/u/[username]` | `app/(shell)/u/[username]/page.tsx` | RF16 RF6 RF18 RF19 | B |
| Acervo de Tarefas | `/tasks` | `app/(shell)/tasks/page.tsx` | RF41 RF44 RF18 RF13 | A |
| Tarefa | `/tasks/[id]` | `app/(shell)/tasks/[id]/page.tsx` | RF41 RF19 RF18 RF7 RF34 RF13 RF10 | A |
| Editar tarefa | `/tasks/[id]/edit` | `app/(shell)/tasks/[id]/edit/page.tsx` | RF8 RF11 RF12 | A |
| Anexos & Evidências | `/attachments` | `app/(shell)/attachments/page.tsx` | RF41 | A |
| Mesa de Trabalho | `/desk` | `app/(shell)/desk/page.tsx` | RF21 RF22 RF44 | A |
| Projeto | `/projects/[id]` | `app/(shell)/projects/[id]/page.tsx` | RF7 RF29 RF13 RF10 | A |
| Editar projeto na Mesa | `/projects/[id]/edit` | `app/(shell)/projects/[id]/edit/page.tsx` | RF22 RF12 RF8 RF11 | A |
| Simulador de Cenários | `/projects/[id]/simulate` | `app/(shell)/projects/[id]/simulate/page.tsx` | RF31 | A |
| Espelho de Conformidade | `/projects/[id]/mirror` | `app/(shell)/projects/[id]/mirror/page.tsx` | RF32 | A |
| Agentes — Copilot de testes | `/agents` | `app/(shell)/agents/page.tsx` | RF48 RF47 RF29 RF43 | A |
| Criar Tarefa | `/tasks/new` | `app/(shell)/tasks/new/page.tsx` | RF4 RF23 RF34 | A |
| Criar Projeto | `/projects/new` | `app/(shell)/projects/new/page.tsx` | RF5 RF20 | A |
| Plano Anual / Trilha | `/plans` | `app/(shell)/plans/page.tsx` | RF24 | A |
| Autopilot | `/autopilot` | `app/(shell)/autopilot/page.tsx` | RF30 RF26 RF43 | A |
| DECIA | `/decia` | `app/(shell)/decia/page.tsx` | RF29 RF37 | A |
| Sessão DECIA | `/decia/[sessionId]` | `app/(shell)/decia/[sessionId]/page.tsx` | RF29 RF13 RF37 RF46 | A |
| Insights | `/insights` | `app/(shell)/insights/page.tsx` | RF43 RF20 RF26 | E |
| Letters (editor de documentos; esqueleto até a Onda 4) | `/letters` | `app/(shell)/letters/page.tsx` | RF52 RF53 RF54 RF55 RF56 RF51 RF69 RF70 RF71 RF72 | A |
| Drawings (editor vetorial 2D; esqueleto até a Onda 5) | `/drawings` | `app/(shell)/drawings/page.tsx` | RF57 RF58 RF59 RF60 RF61 RF62 RF63 RF64 RF65 RF66 RF67 RF68 RF73 RF74 RF51 RF69 RF70 RF71 RF72 | A |
| Metas coletivas | `/goals` | `app/(shell)/goals/page.tsx` | RF35 RF24 | E |
| DECIA Points | `/points` | `app/(shell)/points/page.tsx` | RF42 | E |
| Loja Work Station | `/store` | `app/(shell)/store/page.tsx` | RF42 RF40 | E |
| Destaques | `/highlights` | `app/(shell)/highlights/page.tsx` | RF35 | E |
| Benefícios | `/benefits` | `app/(shell)/benefits/page.tsx` | RF39 | E |
| Reconhecimentos | `/recognitions` | `app/(shell)/recognitions/page.tsx` | RF35 RF28 | E |
| Dashboard do emissor | `/issuer/dashboard` | `app/(shell)/issuer/dashboard/page.tsx` | RF28 | A |
| Departamentos & chefes | `/companies/[slug]/manage/departments` | `app/(shell)/companies/[slug]/manage/departments/page.tsx` | RF28 RF9 | A |
| Minha equipe | `/departments/[slug]/team` | `app/(shell)/departments/[slug]/team/page.tsx` | RF9 RF10 RF28 RF43 RF36 RF46 | D |
| Fila de chancelas | `/seals/review` | `app/(shell)/seals/review/page.tsx` | RF39 RF28 | A |
| Decisões em revisão | `/decia/review` | `app/(shell)/decia/review/page.tsx` | RF29 | A |
| Chancelas & políticas | `/seals` | `app/(shell)/seals/page.tsx` | RF39 | A |
| Dossiês de transição | `/handoffs` | `app/(shell)/handoffs/page.tsx` | RF36 | A |
| Curadoria | `/curation` | `app/(shell)/curation/page.tsx` | RF28 RF39 RF35 | A |
| Admin | `/admin` | `app/(shell)/admin/page.tsx` | RF18 RF28 RF43 | E |
| Preferências | `/settings` | `app/(shell)/settings/page.tsx` | RF3 RF38 | global |
| Notificações | `/notifications` | `app/(shell)/notifications/page.tsx` |  | global |
| Entrar | `/login` | `app/(auth)/login/page.tsx` | RF2 | auth |
| Criar conta | `/register` | `app/(auth)/register/page.tsx` | RF1 | auth |
| Recuperar senha | `/password-reset` | `app/(auth)/password-reset/page.tsx` | RF2 | auth |
| Confirmar e-mail | `/verify-email` | `app/(auth)/verify-email/page.tsx` | RF1 | auth |
| Termos de Uso (Velion) | `/termos` | `app/(legal)/termos/page.tsx` | RF1 | auth |
| Política de Privacidade (Velion) | `/privacidade` | `app/(legal)/privacidade/page.tsx` | RF1 | auth |
| Design system | `/lab/design-system` | `app/(shell)/lab/design-system/page.tsx` | RF38 | lab |
| Anatomias e Estúdio | `/lab/anatomias` | `app/(shell)/lab/anatomias/page.tsx` | RF38 RF11 | lab |
| Abas por perfil | `/lab/perfis` | `app/(shell)/lab/perfis/page.tsx` | RF14 RF15 RF16 | lab |
| Sessão DECIA e Mesa | `/lab/decia` | `app/(shell)/lab/decia/page.tsx` | RF29 RF37 | lab |

Itens ainda sem rota própria (ficam como sub-abas/ações): Tarefa do Dia (widget em `/tasks`, `/desk` e sub-aba 9 do perfil), Políticas da empresa (sub-aba Gestão de `/companies/[slug]`), Comunicados (sub-aba proposta), `/meetings/new` (RF37), `/groupings/[id]` (RF25), `/memory/explore` (RF33), `/plans/new|[id]|compare` (RF24) — ver Q-101…Q-106 em `docs/DECISOES.md`.
