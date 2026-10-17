# Anatomia dos cards — todos os cards do Work Station (v2)

> Catálogo completo de tipos, **variações** (favorita, atribuída, chancelada, modelo, remix, importada, destaque, conformidade…), visões de edição e contextos em [`ANATOMIAS_E_ESTUDIO.md`](ANATOMIAS_E_ESTUDIO.md) (v3); este documento guarda camadas, dimensões, zonas e famílias de arte e não repete o catálogo. Equivalente ao `docs/anatomias/anatomias_card_v19.html` do FAI (card da peça = **card de tarefa**; card do look = **card de projeto**). Pranchas em [`anatomias/svg/`](anatomias/svg/) (50 variações × 4 temas — 28 de layout/estilo/estado + 22 de variações, visões e esquemas compostos —, geradas por [`anatomias/gerar.mjs`](anatomias/gerar.mjs) a partir de [`anatomias/lib/cards.mjs`](anatomias/lib/cards.mjs)); galeria em [`anatomias/index.html`](anatomias/index.html). As pranchas são **diagramas**, não capturas do produto; cada número é uma camada, cada letra um elemento de conteúdo.

> **v2 (17/10/2026):** o documento passa a cobrir **todos** os cards de conteúdo do produto, não só o esquema de tarefa e o de projeto. As seções 1–8 continuam valendo como estavam (são a anatomia v1 do `TaskSchemeCard` e do `ProjectCard`); as seções 9–19 descrevem os demais cards. As 25 pranchas novas (× 4 temas = 100 SVGs) saem de [`anatomias/lib/cards-extra.mjs`](anatomias/lib/cards-extra.mjs), chamado pelo mesmo [`anatomias/gerar.mjs`](anatomias/gerar.mjs), e aparecem na seção 7 da galeria. Nelas os **números** (calha à esquerda) são camadas, as **letras** (calha à direita) são elementos de conteúdo, e cada chamada liga ao alvo por uma linha-guia. Card **planejado** (sem código) é desenhado com a borda tracejada.
>
> **Situação:** *real* = lê a API de verdade · *DEMO* = repositório em memória da aba (`lib/social/repository.ts`, `lib/decia/repository.ts`), contrato pronto para o cliente HTTP · *MOCK* = dados tipados fixos (D-36) · *planejado* = só especificado. **Categoria** = categoria de atributo de [`ATORES_E_ATRIBUTOS.md`](../arquitetura/ATORES_E_ATRIBUTOS.md) §5.1 (Identificação · Contato · Profissional · Institucional · Conteúdo autoral · Classificação e visibilidade · Segurança · Preferências · Estado e ciclo de vida · Proveniência e auditoria · Métricas e reputação · Integração); "derivado" = calculado na tela ou no view model a partir dessas categorias.

## 0. Índice de todos os cards

O wrapper genérico [`components/ui/Card.tsx`](../../components/ui/Card.tsx) (superfície, raio, padding, eyebrow, título e ações) não entra no índice: ele é a casca de vários cards abaixo. Inventário feito em `components/` e `app/` em 17/10/2026.

| # | Card | Arquivo (componente) | Entidade | Situação | Prancha(s) | Seção |
|---|---|---|---|---|---|---|
| 1 | Card de tarefa (esquema) | `components/social/TaskSchemeCard.tsx` (`TaskSchemeCard`, layouts compact · list · expanded · attachment · mini) | `TaskItem` (`TaskCardViewModel`) | DEMO | `tarefa-*` (28 pranchas) | §1–§4, §6–§8 |
| 2 | Card de projeto (esquema) | `components/social/ProjectCard.tsx` (`ProjectCard`, layouts mosaic · mural) | `ProjectScheme` (`ProjectCardViewModel`) | DEMO (hero, postit, visões e esquemas compostos: planejado) | `projeto-*` (22 pranchas, com visões e esquemas compostos) | §5–§8 |
| 3 | Card da tarefa real | `components/tasks/PersistedTasks.tsx` (`PersistedTaskCard`) → `TaskSchemeCard` compacto **sem a barra social** (adaptador `lib/tasks/card.ts`, `toTaskCardViewModelFromApi`) | `TaskView` de `/api/tasks` (`PlainTaskCardViewModel`, `social: false`) | **real** | `tarefa-compacto` (anatomia); `tarefa-real-a-realizar` · `tarefa-real-concluida` · `tarefa-real-bloqueada` mostram o desenho anterior (não regeneradas) | §9 |
| 4 | Decision Card (frente · verso · compacto) | `components/decia/DecisionCard.tsx` (`DecisionCard`, `DecisionCardFront`, `DecisionCardBack`) | `Decision` (`DecisionCardViewModel`) | DEMO | `decisao-frente` · `decisao-verso` · `decisao-compacta` | §10 |
| 5 | Card de evidência | `components/decia/WorkspaceSections.tsx` (`EvidenceSection`) | `Evidence` + `EvidenceLink` | DEMO | `evidencia-decia` | §11 |
| 6 | Sugestão da IA | `components/decia/AiSuggestion.tsx` (`AiSuggestion`) | sugestão da IA (sem entidade própria) | DEMO (sem motor de IA) | `sugestao-ia` | §11 |
| 7 | Entrada do Mural | `components/social/MuralFeed.tsx` (item de `MuralFeed`) | `MuralEntry` + alvo | DEMO | `mural-entrada` (+ `tarefa-lista`, `projeto-linha-mural`) | §12 |
| 8 | Item salvo indisponível | `components/social/ProfileView.tsx` (`SavedTab`) | `SavedItem` | DEMO | `salvo-indisponivel` | §12 |
| 9 | Atribuição | `components/social/AssignmentInbox.tsx` (`AssignmentRow`) | `Assignment` | DEMO | `atribuicao-recebida` · `atribuicao-enviada-recusada` | §13 |
| 10 | Notificação | `components/shell/NotificationsBell.tsx` (`NotificationRow`); variação social em `AssignmentInbox.tsx` (`SocialNotifications`) | `AppNotification` (`lib/notifications/mock.ts`); `Notification` social | MOCK (sino) · DEMO (social) | `notificacao-item` | §14 |
| 11 | Cabeçalho do perfil | `components/social/ProfileHeader.tsx` (`SocialProfileHeader`), envolvido por `components/shell/ProfileHeader.tsx` | `User` (`ProfileHeaderViewModel`) | DEMO (laboratório e `/u/[username]`); o dono em `/profile` usa a versão real abaixo | `perfil-cabecalho` | §15 |
| 11b | Cabeçalho do meu perfil (real) | `components/account/OwnProfile.tsx` (`OwnProfileHeader`, `data-testid="own-profile-header"`) | `UserView` (`/api/me`) + `TaskView[]` (`/api/tasks`) | **real** (P19, 17/10/2026) | — (mesma anatomia de `perfil-cabecalho`; contadores só Tarefas · Em andamento · Concluídas, selos de tipo, verificação e 2FA, biografia, "Editar perfil") | §15 |
| 12 | Cabeçalho institucional | `components/social/InstitutionalHeader.tsx` (`DepartmentHeader`, `CompanyHeader`) | `Department` · `Company` | DEMO | `instituicao-cabecalho` | §15 |
| 13 | Card de pessoa (busca) | — (`/search` é `RfPage`-esqueleto; RF17 aba PESSOAS e CHEFES) | `PublicProfileView` | planejado | `pessoa-resultado` · `pessoa-resultado-restrito` | §16 |
| 14 | Card da sessão DECIA | — (`note: "sessionCards"` em `lib/pages/registry.ts` para `/decia/[sessionId]` e `/decia/review`; spec em `docs/produto/DECIA_SESSAO_E_MESA.md` §B.1) | `DeciaSession` | planejado (Q-44, Q-103) | `sessao-decia-card` | §17 |
| 15 | Verificação em duas etapas | `components/account/TwoFactorCard.tsx` (`TwoFactorCard`) | `TwoFactorStatus` | **real** | `conta-2fa-desativada` · `conta-2fa-ativa` | §18.1 |
| 16 | Excluir conta | `components/account/DataPanel.tsx` (card `delete-account-card`) | `User.status`, `deletionScheduledAt` | **real** | `conta-exclusao` · `conta-exclusao-agendada` | §18.2 |
| 17 | Aviso de exclusão | `components/account/DeletionBanner.tsx` (`DeletionBanner`) | `User.status`, `deletionScheduledAt` | **real** | `conta-aviso-exclusao` | §18.3 |
| 18 | Sessão por dispositivo | `components/settings/SessionsPanel.tsx` (item `session-item`) | `SessionInfo` (`RefreshRecord`) | **real** | `conta-sessao-dispositivo` | §18.4 |
| 19 | Bloco de RF/CA | `components/shell/RfPage.tsx` (`RfBlock`) | `RfEntry` (`lib/rf/catalog.gen.ts`) | **real** (catálogo gerado) | `rf-bloco` | §19 |

**Sem prancha própria (e por quê):** o detalhe `/tasks/[id]` (`components/social/TaskDetail.tsx`) é o card de tarefa no layout ampliado (`tarefa-ampliado`); o card "Decisões" do perfil (`DecisionsTab` em `ProfileView.tsx`) e os cards "Gestão"/"Minha equipe" de empresa e departamento (`app/(shell)/companies/[slug]`, `departments/[slug]`) são painéis de atalho (título, texto, botão) sem dado de entidade; os painéis de Configurações (`app/(shell)/settings/page.tsx`: tema, idioma, densidade, fonte, movimento, skin, fundo, notificações, fuso, WIP, autonomia e modo da IA) e o card de perfil da conta (`components/account/AccountPanel.tsx`) são formulários sobre o wrapper `Card`; os cards de `/lab/*` são vitrines do design system; fio de comentários, checklist de prontidão, matriz de critérios e estados vazio/erro/carregando são partes de tela, não cards.

**Achados do inventário:** (1) a tarefa tinha **dois desenhos**: o `TaskSchemeCard` (identidade visual completa, dados DEMO) e o `PersistedTaskCard` (dados reais, só o wrapper `Card`, sem borda do departamento, mídia, arte nem barra social). **Resolvido (17/10/2026, decisão do dono do produto):** o card real passa a usar a anatomia do `TaskSchemeCard` (compacto) **sem a barra social** — a API não tem curtidas, comentários, remixes, selos, chancelas nem crédito, e o card não mostra contadores zerados nem ações que não funcionam; ver §9. (2) O `PersistedTaskCard` mostrava "Bloqueado", mas o **motivo do bloqueio** só aparecia no detalhe. **Resolvido:** o motivo aparece no próprio card (⊘ + texto, `data-testid="block-reason"`). (3) O card de pessoa da busca e o card da sessão DECIA **não existem no código**. (4) "Perfil privado" não existe no domínio (D-90: seguir é imediato; invisível = inexistente); a prancha `pessoa-resultado-restrito` fica como proposta. (5) As notificações do sino ainda são MOCK (D-36).

## 1. Camadas, empilhamento e recorte (iguais nos dois cards)
| # | Camada | Classe | Regra |
|---|---|---|---|
| 1 | **Superfície externa** | `article.ws-card` / `article.ws-project` | borda `--card-dept-border` (2 px) na **cor do departamento** (RF38.CA09), raio `--card-r-out`, `overflow:hidden` recorta tudo o que é decorativo. RASCUNHO = borda tracejada. `container-type: inline-size` (os `cqi` resolvem no próprio card). |
| 2 | **Área artística** | `.ws-card__art` (z 0) | família de arte (§4) só visível nas **quatro faixas** entre a borda e o container; `aria-hidden`, `pointer-events:none`, `contain:paint`. No card de projeto a arte é a própria capa (não há faixas). |
| 3 | **Container de conteúdo** | `.ws-card__frame > .ws-card__content` (z 1) | fundo `--surface`, raio `--card-r-in` (70 % do externo, mín. 4 px), relevo `--shadow-1`; tudo o que é interativo mora aqui. |
| 4 | **Área da mídia** | `.ws-card__media` / `.ws-project__cover` | tarefa: thumbnail automático 3:2 (`--card-media-ratio`) com selo da extensão; projeto: **mosaico 2×3** dos thumbnails + anel de progresso por fase. Nada da arte passa por cima. |
| 5 | **Efeitos** | `--shadow-aura`, pulso, confete | aura em hover/foco, pulso em EM_USO/EM_DECISAO, confete na decisão validada; nenhum recebe clique ou foco. |

**Decorativo × interativo:** arte, aura, partículas → sem clique, sem foco. Thumbnail → abre o detalhe mas fora da ordem de Tab (o título é o link). Título, @usuário, departamento → links. Curtir/comentar/salvar/compartilhar/remixar → botões com contagem no nome acessível e `aria-pressed`. Lacre, faísca, prazo → `aria-label` com tooltip.

## 2. Dimensões, tokens e zona segura
| Token | Compacto (grade) | Ampliado (detalhe) |
|---|---|---|
| `--card-x` laterais | `clamp(10px, 5cqi, 16px)` | `--card-x-lg` = `clamp(16px, 3cqi, 28px)` |
| `--card-top` / `--card-bottom` | `--card-x × 1,3` cada; soma constante **2,6 × --card-x** → cards da mesma linha têm a mesma altura; famílias com ênfase mudam a divisão (pasta 22/10, blueprint 10/22) mantendo a soma | idem |
| Raio | `--card-r-out` = `--radius-md` 10 px; `--card-r-in` = 70 % | mín. 14 px |
| Padding do container | `--card-pad` 10 px | `--card-pad-lg` 16 px |
| Mídia | 3:2, largura do container; thumb mini 32 px, thumb lista 64 px | 3:2, toque amplia (lightbox) |
| Mosaico (projeto) | 2×3, `--card-mosaic-gap` 2 px, anel `--card-ring-size` 36 px / `--card-ring-w` 4 px | hero 16:9 |
| Avatar / lacre / faísca / etiqueta | 20 px / 36 px (22 sm) / 14 px / 22 px | 24 / 36 / 14 / 22 |
| Barra de fases | `--card-phasebar-h` 6 px, gap 2 px | idem + nome da fase em texto |
| Fio de decisão | `--card-thread-w` 2 px, nó 10 px (14 no destaque) | idem |
| Carimbo | borda `--card-stamp-border` 2,5 px, rotação −8° | idem |

**Zona segura** = todo o container: a arte ocupa apenas as faixas. Consequência: a mídia tem a mesma escala em qualquer família, e cards vizinhos alinham.

## 3. Card de tarefa — elementos (a…i) e variações de layout
Elementos (card "Identidade visual" §7): **a** ícone do tipo (glifo próprio + cor da família, chip) · **b** categoria/origem (label mono: `TaskCategory` · departamento · formato) · **c** título (serif, 2 linhas, link) · **d** etiqueta de estado (`TaskState`, nome em texto) · **e** prazo (relógio; ⚖ se prazo legal; âmbar/vermelho) · **f** responsável (avatar iniciais + nome) · **g** contadores sociais (curtir · comentar · salvar · remixar) · **h** faísca ✦ se `aiGenerated` · **i** lacre de chancela se `SealBond` APROVADA. Extras por estado: EM_USO mostra "em uso em: projeto"; BLOQUEADA mostra "por quem/o quê"; OFERECIDA mostra ficha DP com preço e licença.

| Variação | Arquivo | Onde | O que muda |
|---|---|---|---|
| **Compacto** | `tarefa-compacto` | grade do Acervo (RF41), Balcão (RF40), busca (RF27) | 240 px, mídia 3:2, todos os elementos a–i |
| **Lista** (linha) | `tarefa-lista` | listas densas, Meu trabalho, fila de revisão, Dossiê | thumb 64 px à esquerda, título + categoria + estado + prazo + responsável numa linha, ações à direita |
| **Ampliado** (detalhe) | `tarefa-ampliado` | modal ou `/tasks/[id]` (RF41.CA03) | cabeçalho do dono/origem/protocolo, transparência da IA ("gerado por IA em … revisado por …"), resumo 3 linhas, metadados agrupados (prazo, prazo legal com base, acesso, situação, esforço, origem), **ação principal única** ("Adicionar ao projeto" / "Transformar em tarefa"), linha de interações completa (RF26) |
| **Anexo de mensagem** | `tarefa-anexo` | inline no chat do DECIA (`MessageAttachment`, RF29.CA03) | 66×44 thumb, título, categoria, estado; borda na cor da classificação da mensagem; "abrir" se tiver permissão |
| **Mini** | `tarefa-mini` | `SelectList` por fase (RF21.CA03), slot da PhaseBar, ficha na Mesa | 32 px thumb + ícone + título 1 linha + estado·categoria; desabilitada com motivo em itálico |

### 3.1 Estados (etiquetas de protocolo, RF38.CA05)
| Estado | Prancha | Estilo |
|---|---|---|
| RASCUNHO | `tarefa-estado-rascunho` | borda tracejada, título esmaecido, contadores zerados |
| DISPONÍVEL | (padrão) | etiqueta sólida primária |
| EM_USO | `tarefa-estado-em-uso` | pulso suave + "em uso em: projeto" |
| BLOQUEADA | `tarefa-estado-bloqueada` | cadeado + motivo/quem bloqueia |
| CONCLUÍDA | `tarefa-estado-concluida` | carimbo verde sobre a mídia |
| ARQUIVADA | `tarefa-estado-arquivada` | `--opacity-arquivado` .62 + `--saturate-arquivado` .35 (1 no alto contraste) |
| MODELO_PÚBLICO | `tarefa-estado-modelo-publico` | estrela + lacre (modelo oficial) |
| OFERECIDA | `tarefa-estado-oferecida` | ficha DP com preço e licença (Balcão) |
| Prazo legal vencido | `tarefa-prazo-vencido` | prazo vermelho + ⚖ |

## 4. Famílias de arte do card de tarefa (camada 2)
| Família | Prancha | Composição | Uso sugerido |
|---|---|---|---|
| **Protocolo** (padrão) | `tarefa-compacto` | papel pautado + picote no topo, "PROTOCOLO Nº …" em mono | qualquer tipo |
| **Carimbo** | `tarefa-familia-carimbo` | carimbo circular vermelho institucional rotacionado no canto | ATA_REGISTRO, decisões, portarias |
| **Pasta suspensa** | `tarefa-familia-pasta` | aba de pasta marrom no topo (faixa 22/10) | PASTA (zip), dossiês, kits |
| **Blueprint** | `tarefa-familia-blueprint` | papel azul-engenharia com grade e cantoneiras, legenda na base (faixa 10/22) | DESENHO_TECNICO, projeto básico/executivo |
| **Monograma** | `tarefa-familia-monograma` | iniciais do título em serif gigante sobre a cor da categoria | TEXTO_MANUAL / TEXTO_IA, ofícios, minutas |

O usuário pode trocar a família (skin do card) e a capa (thumbnail automático · imagem manual · capa pela IA, RF38.CA02); a escolha fica em `TaskItem.cardSkin` / `coverMode`.

## 5. Card de projeto — elementos (a…h) e variações
Elementos (card "Identidade visual" §8): **a** título (serif, 2 linhas) · **b** departamento (monograma + sigla na cor) · **c** etiqueta de status (`ProjectStatus`) · **d** **barra de 7 fases** DEMANDA→ENCERRAMENTO com a atual destacada e nome em texto · **e** próximo marco/prazo · **f** "n tarefas · n pessoas" · **g** último evento DECIA ("decisão validada há 2 dias", cor da classe) · **h** contadores sociais. Capa (camada 4): mosaico 2×3 + anel de progresso + borda na cor do departamento; faísca ✦ se `aiGenerated`; lacres se chancelado.

| Variação | Arquivo | Onde | O que muda |
|---|---|---|---|
| **Mosaico 2×3 padrão** | `projeto-mosaico` | grade de projetos, Criar projeto (pré-visualização, RF21), Balcão | capa-mosaico 3:2 + anel; a–h |
| **Hero da Vitrine** | `projeto-hero-vitrine` | destaque do mês (RF35), topo da Vitrine (RF27) | capa 16:9 grande, título h2, objetivo, barra de fases larga, "remixar" em destaque |
| **Linha do Mural** | `projeto-linha-mural` | feed social (`MuralEntry`, RF27) | avatar do ator + verbo ("publicou", "decisão validada"), capa 64 px, ações do RF26 inline |
| **Post-it da Mesa** | `projeto-postit-mesa` | Mesa de Trabalho (RF22) | papel colorido, pino, rotação ±3°, sobre skin papel/cortiça/blueprint |
| **Capa IA** | `projeto-capa-ia` | `coverMode = IA` | ilustração flat do tema no lugar do mosaico; faísca ✦ e tooltip de transparência |

### 5.1 Estados
| Status | Prancha | Estilo |
|---|---|---|
| RASCUNHO | `projeto-estado-rascunho` | tracejado, capa "pasta em branco", fase 0 |
| PUBLICADO | (padrão) | sólido |
| EM_DECISÃO | `projeto-estado-em-decisao` | pulso roxo (classe pergunta), último evento da sessão |
| APROVADO | `projeto-estado-aprovado` | **carimbo VALIDADO** com data e revisor sobre a capa |
| DEVOLVIDO | `projeto-estado-devolvido` | carimbo vermelho DEVOLVIDO + motivo |
| ARQUIVADO | `projeto-estado-arquivado` | esmaecido |
| Chancelado | `projeto-chancelado` | lacre dourado (empresa) e azul-marinho (chefe) na zona do selo; vira modelo oficial |

## 6. Acessibilidade e regras compartilhadas
- Nome do estado, da fase, da classificação e da cor sempre em **texto** (nunca só cor/ícone).
- Thumbnail/capa `alt` = título; arte `aria-hidden`.
- Cards da mesma linha: mesma altura (soma topo+base constante); títulos limitados a 2 linhas com reticências.
- Lacre e faísca têm `aria-label` e tooltip (emissor/critério; "gerado por IA em … revisado por …").
- Hover/foco: aura + elevação `--shadow-2`; arrastar para a fase: "encaixe" com `--ease-snap` (desligado em reduced-motion).
- Contadores em tempo quase real (RF26.CA07) via `CounterStorePort` (Redis) sem relayout.

## 7. Contrato visual compartilhado (frontend ↔ backend)
O card lê exatamente estes campos da API (ver TAXONOMIA.md): tarefa → `type, category, state, visibility, dueAt, legalDueAt, responsible{initials,name}, department{acronym,color,monogram}, aiGenerated, aiInferenceId, thumbnailUrl, coverMode, cardSkin, sealIdsJson, counters{likes,comments,saves,shares,remixes}, offeredInCounter, blockReason, projectUsage[]`; projeto → `title, emoji, department, status, currentPhase, mosaicJson, coverUrl, coverMode, nextMilestoneAt, tasksCount, peopleCount, lastDeciaEventLabel/At, aiGenerated, sealIdsJson, counters, conformityPercent, hasBlockingPending`.

## 8. Variações, visões e esquemas compostos (referência)
As variações não são famílias nem estados: são aparências condicionais disparadas por um atributo/entidade e **coexistem** no mesmo card. O catálogo (gatilho, dado de origem, mudança por layout, ações, contadores, matrizes) está em [`ANATOMIAS_E_ESTUDIO.md`](ANATOMIAS_E_ESTUDIO.md) §2 (tarefa), §4 (projeto), §3.5 (visões Quadro · Linha do tempo · Mesa), §3.7 (Kit · Agrupamento · Plano) e §7.2 (`TaskCardVariant`, `ProjectCardVariant`, `SchemeView`, D-50). Pranchas correspondentes em `anatomias/svg/`:

| Grupo | Pranchas |
|---|---|
| Tarefa · variações | `tarefa-var-favorita` · `tarefa-var-atribuida` · `tarefa-var-tarefa-do-dia` · `tarefa-var-chancelada` · `tarefa-var-modelo-balcao` · `tarefa-var-remix` · `tarefa-var-importada` · `tarefa-var-prazo-legal` · `tarefa-var-em-decisao` · `tarefa-var-em-kit-evidencia` · `tarefa-var-duplicada-ia` |
| Projeto · variações | `projeto-var-destaque` · `projeto-var-favorito` · `projeto-var-modelo-balcao` · `projeto-var-atribuido-conformidade` · `projeto-var-cenario-eixo` · `projeto-var-autopilot-privado` |
| Projeto · visões (RF22) | `projeto-visao-linha-do-tempo` · `projeto-visao-quadro-por-fase` (a Mesa é `projeto-postit-mesa`, §5) |
| Esquemas compostos | `projeto-composto-kit` · `projeto-composto-agrupamento` · `projeto-composto-plano` |

Regra de empilhamento: cada variação ativa acrescenta no máximo **uma linha** ao bloco de metadados (glifo próprio + texto) ou **um marcador** em zona fixa (⭐ no cabeçalho, lacre na zona do selo, carimbo sobre a mídia, faixa de destaque sobre a capa, selo de conformidade no canto da capa); a mídia e a altura das linhas de tarefa nunca mudam, e a soma topo+base das faixas continua constante (§2).

## 9. Card da tarefa real — `PersistedTaskCard`

![Card de tarefa — compacto (anatomia que o card real usa)](anatomias/svg/tarefa-compacto--claro.svg)

Arquivo `components/tasks/PersistedTasks.tsx` · lista "Minhas tarefas" (`MyTasks`, `/tasks` e Acervo Digital de `/profile`) em `CardGrid` (mín. 240 px, 1 coluna no celular) · dados **reais** de `GET /api/tasks` (`tasksApi.mine`). É o card de reconhecimento rápido: diz o que é, em que pé está e qual o próximo passo; o trabalho (transições, bloqueio com motivo, critérios) acontece no detalhe `PersistedTaskDetail`.

**Unificado com o card de esquema (17/10/2026):** o `PersistedTaskCard` renderiza o `TaskSchemeCard` no layout **compacto** (§1–§4) a partir do adaptador puro `toTaskCardViewModelFromApi(task, { viewerId, now })` (`lib/tasks/card.ts`), que reaproveita `TASK_TYPE_META`, `TASK_STATE_TONE` e `dueKindOf` do DEMO. O view model é `PlainTaskCardViewModel` (`social: false`, em `lib/social/view-model.ts`): **sem a barra social** e sem contadores — a API não tem curtidas, comentários, remixes, selos, chancelas, crédito nem delegação, e o card não mostra zeros nem ações que não funcionam. A raiz é o `article` do esquema com `data-testid="persisted-task-card"` e `data-social="off"`. As pranchas `tarefa-real-*` mostram o desenho anterior (wrapper `Card`) e não foram regeneradas.

**Camadas:** as do §1 — **1** superfície com borda de 2 px (`--ws-border`, porque a API só traz `departmentId`, sem nome nem cor: `department: null`), RASCUNHO tracejado, ARQUIVADA esmaecida; **2** arte da família do tipo; **3** container; **4** mídia 3:2 com o glifo do tipo e carimbo "Concluída". Efeitos: pulso em EM_USO.

| Letra | Elemento | Atributo de origem | Categoria |
|---|---|---|---|
| a | Tipo (chip com glifo e tom) | `TaskView.type` → `TASK_TYPE_META` | Conteúdo autoral |
| b | Estado de execução | `workStatusOf(TaskView.state)` → "A realizar · Em andamento · Bloqueado · Concluído · Arquivado" (+ "· Rascunho"); publicação (`MODELO_PUBLICO`/`OFERECIDA`) com o rótulo do domínio; tom de `TASK_STATE_TONE` | Estado e ciclo de vida |
| c | Classificação (só RESTRITO/SIGILOSO, ⛨) | `TaskView.accessClass` | Classificação e visibilidade |
| d | Categoria (rótulo mono) | `TaskView.category` | Conteúdo autoral |
| e | Título (h3, link `/tasks/[id]`) | `TaskView.title` | Identificação |
| f | Objetivo (2 linhas, `showSummary`) | `TaskView.objective`; vazio = omitido | Conteúdo autoral |
| g | Prazo (◷, em dia · vence em breve · atrasado) | `TaskView.dueAt` + `dueKindOf` | Conteúdo autoral |
| h | Motivo do bloqueio (só BLOQUEADA, ⊘) | `TaskView.blockReason` | Estado e ciclo de vida |
| i | Rodapé de trabalho (na zona da barra social): progresso pelos critérios | `criteriaProgress(acceptanceCriteria)` → barra `role="progressbar"` + "n de N critérios atendidos" | derivado de Conteúdo autoral |
| j | Rodapé: próxima ação · prioridade (só ≠ MÉDIA) | `nextActionOf(state)`; `TaskView.priority` | derivado de Estado e ciclo de vida |

**Fica de fora (a API não tem):** autor e responsável por nome (só ids: `author`/`responsible` nulos, o card não mostra), departamento, faísca de IA, selos/chancelas, crédito de remix, delegação, favorita e toda a barra social. A área profissional (`TaskView.area`) aparece só no detalhe.

**Estados e variações:** A realizar (`DISPONIVEL`, accent) · Em andamento (`EM_USO`, info, pulso) · **Bloqueado** (`BLOQUEADA`, danger, motivo no card, próxima ação "Retomar (desbloquear)") · **Concluído** (`CONCLUIDA`, success, carimbo na mídia, sem próxima ação) · Arquivado (esmaecido) · Rascunho (borda e etiqueta tracejadas, "A realizar · Rascunho", próxima ação "Revisar e publicar no acervo") · Publicado como modelo / Oferecida (sem progresso inventado). `data-variant` traz o estado e ATRIBUIDA quando a tarefa de outra pessoa está sob a responsabilidade de quem olha (com `viewerId`). Sem critérios: "Sem critérios de conclusão: sem percentual". Lista: carregando (`LoadingState`), erro com motivo e caminho (sem sessão: "entre para ver"), vazio com "Criar tarefa".

**Ações:** o título é o único link (abre o detalhe); o card não tem botões. Filtros por estado acima da grade (botões com `aria-pressed` e contagem).

**Acessibilidade:** estado sempre em texto (nunca só cor); `aria-label` do `article` com título, tipo e estado; progresso com `aria-valuenow`/`aria-valuemin`/`aria-valuemax` e rótulo "Progresso pelos critérios: n de N"; glifos `aria-hidden`. **Celular:** grade de uma coluna a 390 px, `min-w-0` e quebra de palavras longas no título, objetivo, motivo e rodapé (sem rolagem horizontal).

## 10. Decision Card — `DecisionCard` (frente · verso · compacto)

| Frente (DETAIL) | Verso (DETAIL virado) |
|---|---|
| ![Decision Card — frente](anatomias/svg/decisao-frente--claro.svg) | ![Decision Card — verso](anatomias/svg/decisao-verso--claro.svg) |

![Decision Card — compacto](anatomias/svg/decisao-compacta--claro.svg)

Arquivo `components/decia/DecisionCard.tsx` (spec `docs/decia/04_DECISION_CARD.md`) · **DEMO** (`lib/decia/repository.ts`; a API de decisões não existe). Quatro modos: **COMPACT** (linha de lista), **STANDARD** (grade, sem flip; "Por quê?" abre a folha DETAIL), **DETAIL** (workspace › Visão geral e folha; vira), **HERO** (Atenção: frente + bloco "Próxima ação · Stakeholders · Recomendação do modelo"; vira).

**Camadas:** **1** superfície `article` (borda 1 px, tracejada em RASCUNHO; ARQUIVADA = opacity .8; DETAIL/HERO com `tabIndex=0`, `aria-keyshortcuts="F"`) · **2** faixa de estado no topo (`--ws-decision-status-bar`, cor do estado; vermelha com risco crítico; `aria-hidden`) · **3** faces sobrepostas frente/verso de altura fixa (a oculta com `inert` + `aria-hidden`; giro 3D de 320 ms só sem redução de movimento) · **4** rodapé de ações fora das faces · **5** região `aria-live="polite"` (sr-only) que anuncia a face nova.

**Frente:**

| Letra | Elemento | Atributo de origem | Categoria |
|---|---|---|---|
| a | Estado | `Decision.status` → `DecisionStatusBadge` (ícone + texto) | Estado e ciclo de vida |
| b | Confiança (+ % em DETAIL/HERO, ajuda "?") | `Decision.confidence` declarada pelo responsável | Conteúdo autoral |
| c | Pergunta (serif, 3 linhas; link esticado em STANDARD) | `Decision.question` | Conteúdo autoral |
| d | Opção | `selectedAlternative` ("Escolhida") ou `leadingAlternative` + nota ("Lidera no modelo"); empate técnico | Conteúdo autoral + derivado |
| e | Responsável · prazo | `owner.name` · `deadline`/`daysToDeadline` | Identificação · Estado e ciclo de vida |
| f | Sinais (máx. 5) | risco, impacto, força da evidência, frescor, resultado | Métricas e reputação (derivados) · Conteúdo autoral (impacto) |
| g | Estados transversais | `criticalRisk`, `overdue`, frescor VENCIDA, `overconfident` | derivado (Estado e ciclo de vida) |
| h | Prontidão (só antes da decisão) | `readiness` → nível em texto + nº de alertas/faltas | derivado |
| i | Virar | botão "Por quê? ↻" (`aria-pressed`, `aria-controls`) | — |

**Verso** ("Por que esta opção?", mapa de lógica): **a** título do verso (h3 que recebe o foco) · **b** fio vertical decorativo · **c** 8 nós em ordem fixa — evidência, premissa, critérios, trade-off, risco, rejeitada, sensível, checkpoint — cor por tipo (`--ws-decision-node-*`) + rótulo em texto · **d** valores de `CardBack` (`topEvidence` com posição e confiabilidade, `topAssumptions` com %, `keyCriteria` com peso, `principalRisk` probabilidade × impacto, `rejectedAlternative` "dominada por", `sensitivity`, `nextCheckpoint`; "—" quando vazio — Conteúdo autoral + Métricas derivadas) · **e** trade-off (+ verde / − vermelho, sinal em texto) · **f** checkpoint (Estado e ciclo de vida) · **g** "Abrir workspace →" (ghost, só com `href`) · **h** "Frente ↻" (`aria-pressed=true`).

**Compacto:** **1** `article data-mode="COMPACT"` (grade 11rem · 1fr · auto; sem faixa, sem flip) · **a** estado em coluna fixa · **b** pergunta em 1 linha (truncate + `title`) · **c** opção em 1 linha · **d** alertas que mudam a fila (risco crítico preenchido, atrasada) · **e** responsável · prazo.

**Estados:** RASCUNHO (tracejado) · ENQUADRAMENTO · PESQUISA · COMPARAÇÃO · AGUARDANDO_DECISAO · DECIDIDA · EM_EXECUÇÃO · RESOLVIDA · REVISADA · REABERTA · ARQUIVADA (esmaecida) — ícone, tom e cor da faixa em `components/decia/meta.ts`. **Ações:** abrir o workspace (link esticado/botão), virar (botão, Enter/Espaço, tecla F com o card focado), "Por quê?" em STANDARD abre a folha DETAIL. **Acessibilidade:** nunca só hover; nunca só cor (todo estado com ícone + texto); foco vai ao título da face nova; anúncio `aria-live`; altura fixa evita salto de layout; redução de movimento troca o giro por corte seco.

## 11. Workspace DECIA — card de evidência e sugestão da IA

| Evidência | Sugestão da IA |
|---|---|
| ![Card de evidência](anatomias/svg/evidencia-decia--claro.svg) | ![Sugestão da IA](anatomias/svg/sugestao-ia--claro.svg) |

**Card de evidência** (`EvidenceSection` em `components/decia/WorkspaceSections.tsx`, DEMO). Camada **1** `ui/Card` padding md em `ul[aria-label="Evidências"]`; substituída (`supersededAt`) = 70 % de opacidade + Tag "Substituída".

| Letra | Elemento | Atributo de origem | Categoria |
|---|---|---|---|
| a | Natureza | `Evidence.nature` → `StatementNatureChip` (fato ≠ premissa ≠ opinião ≠ previsão ≠ evidência) | Conteúdo autoral |
| b | Origem IA | `Evidence.origin = IA` → Badge spark | Proveniência e auditoria |
| c | Título | `Evidence.title` (h3) | Conteúdo autoral |
| d | Resumo | `Evidence.summary` | Conteúdo autoral |
| e | Metadados | `sourceLabel` · `authorLabel` · `observedAt` · `retrievedAt` · `sourceQuality` · `relevance` · `reliability` | Proveniência e auditoria |
| f | Vínculos | `EvidenceLink.stance` + alvo (alternativa, critério, premissa, risco) | Conteúdo autoral |

**Sugestão da IA** (`components/decia/AiSuggestion.tsx`, DEMO, nenhum motor registrado). Camada **1** `div data-origin="IA"` com borda e fundo `--ws-ai-spark*` (exclusivos da IA, RF38.CA04). Elementos: **a** faísca ✦ decorativa · **b** Badge "Sugestão da IA" → "Aceita"/"Descartada" (Proveniência e auditoria) · **c** título da proposta (vira Conteúdo autoral só com aceite humano) · **d** justificativa · **e** Aceitar (spark) / Descartar (ghost), `disabled` sem serviço · **f** regra "A IA sugere; quem decide é uma pessoa." sempre visível. Estados: SUGERIDA · ACEITA · DESCARTADA (70 %). Acessibilidade: a origem é dita em texto (Badge), não pela cor âmbar.

## 12. Mural e itens salvos

| Entrada do Mural | Item salvo indisponível |
|---|---|
| ![Entrada do Mural](anatomias/svg/mural-entrada--claro.svg) | ![Item salvo indisponível](anatomias/svg/salvo-indisponivel--claro.svg) |

**Entrada do Mural** (`components/social/MuralFeed.tsx`, DEMO). Camadas: **1** `li` em `ol[aria-label = aba]` (ordem cronológica, `data-kind`), sem superfície própria · **2** card do alvo — `TaskSchemeCard layout="list"` (prancha `tarefa-lista`) ou `ProjectCard layout="mural"` (`projeto-linha-mural`) · **3** miniatura 64 px.

| Letra | Elemento | Atributo de origem | Categoria |
|---|---|---|---|
| a | Ator | `MuralEntry.actorId` → `PersonLink` (avatar 24 + nome) | Identificação |
| b | Verbo | `MuralEntry.kind` (compartilhou · validou uma decisão · publicou o projeto · recebeu um reconhecimento · é destaque · impulsionou · publicou um comunicado) | Proveniência e auditoria |
| c | Quando | `MuralEntry.at` (tempo relativo) | Proveniência e auditoria |
| d | Título e meta do alvo | ver §3 (`tarefa-lista`) e §5 | — |
| e | Barra social inline | `SocialBar` (curtir · comentar · salvar · compartilhar · remixar) | Métricas e reputação |

Variações: alvo tarefa × alvo projeto; abas "Para você" · "Seguindo" (vazio próprio para visitante). Regra de visibilidade: só entra o que o viewer pode ver (outra empresa: só PUBLICA). Acessibilidade: lista ordenada com rótulo; contagens no nome acessível dos botões; `aria-pressed` em curtir/salvar.

**Item salvo indisponível** (`SavedTab` em `components/social/ProfileView.tsx`, DEMO): ocupa a célula da grade de Tarefas/Projetos salvos quando o alvo sumiu ou ficou invisível. **1** `ui/Card tone="soft"` (`saved-unavailable`) · **a** Badge "Indisponível" (`available = false`, Classificação e visibilidade) · **b** explicação sem revelar o item (invisível = inexistente, D-65/D-141) · **c** título só em `sr-only` e só se o item ainda existe para o viewer · **d** "Remover dos salvos" (`toggleSave`, toast).

## 13. Atribuição — `AssignmentRow`

| Recebida, aguardando resposta | Enviada e recusada |
|---|---|
| ![Atribuição recebida](anatomias/svg/atribuicao-recebida--claro.svg) | ![Atribuição enviada recusada](anatomias/svg/atribuicao-enviada-recusada--claro.svg) |

Arquivo `components/social/AssignmentInbox.tsx` · perfil › "Delegadas a mim" e "Delegadas por mim" (RF18.CA04/CA05, RF10, RF46.CA04) · DEMO. Camada **1** `li` com borda 1 px, raio md, `data-status`.

| Letra | Elemento | Atributo de origem | Categoria |
|---|---|---|---|
| a | Estado | `Assignment.status` (PROPOSTA "Aguardando resposta" · ACEITA · RECUSADA · DEVOLVIDA) | Estado e ciclo de vida |
| b | Origem | `Assignment.origin` (Minha equipe · botão Delegar · chat · chat DECIA) | Proveniência e auditoria |
| c | Quando | `Assignment.createdAt` (relativo) | Proveniência e auditoria |
| d | Alvo (link) | título da tarefa/projeto (`titleOf`) | Identificação |
| e | Contraparte · prazo | `fromUserId`/`toUserId` → avatar + "de/para {nome}" · `dueAt` | Identificação · Estado e ciclo de vida |
| f | Mensagem | `Assignment.message` (≤ 500) | Conteúdo autoral |
| g | Ações (recebida) | PROPOSTA: Aceitar · Recusar (motivo obrigatório); ACEITA: Abrir · Devolver (motivo ≥ 20) | — |
| h | Motivo | `Assignment.reason` (RECUSADA/DEVOLVIDA, tinta de perigo) | Conteúdo autoral |

**Acessibilidade:** estado em texto; recusar/devolver abrem `ReasonDialog` com contador e mínimo; enviadas não têm botões (só leitura). O cabeçalho da caixa mostra a contagem de pendentes em Badge.

## 14. Notificação — `NotificationRow`

![Notificação — não lida × lida](anatomias/svg/notificacao-item--claro.svg)

Arquivo `components/shell/NotificationsBell.tsx` (Popover do sino, 5 itens, e `/notifications`) · **MOCK** tipado (`lib/notifications/mock.ts`, D-36; estados vazio/erro/carregando simuláveis no lab). Camadas: **1** `li > Link variant="card"` (a linha inteira é o alvo; marca como lida ao abrir) · **2** fundo accent-soft só enquanto não lida.

| Letra | Elemento | Atributo de origem | Categoria |
|---|---|---|---|
| a | Glifo do tipo | `NotificationKind` → `KIND_GLYPH` (menção, decisão, chancela, DECIA Points, Tarefa do Dia, atribuição, sistema) | Proveniência e auditoria |
| b | Título | `titleKey` + `vars` (i18n), negrito se não lida | derivado do evento |
| c | Quando | `minutesAgo` → `Intl.RelativeTimeFormat` | Proveniência e auditoria |
| d | Ponto de não lida | `read = false`, `aria-label="não lida"` | Estado e ciclo de vida |
| e | Linha lida | mesma linha sem fundo, sem negrito, sem ponto | — |

**Variação social** (`SocialNotifications` em `AssignmentInbox.tsx`, DEMO, RF26.CA09): ponto à esquerda, agrupamento por hora ("e mais n"), "· não lida" em texto e "Marcar como lidas". **Acessibilidade:** a não lida nunca depende só da cor (negrito + ponto rotulado); o sino anuncia a contagem no nome do botão ("Notificações (n não lidas)").

## 15. Cabeçalhos de perfil e de instituição

![Cabeçalho do perfil](anatomias/svg/perfil-cabecalho--claro.svg)

**Cabeçalho do perfil** (`SocialProfileHeader` em `components/social/ProfileHeader.tsx`; `components/shell/ProfileHeader.tsx` é o envoltório com Skeleton) · `/profile` e `/u/[username]` · DEMO (fonte real em curso: `GET /api/people/by-username`). Funciona como card: **1** `ui/Card tone="clay"`, grade 1fr · auto (empilha no celular).

| Letra | Elemento | Atributo de origem | Categoria |
|---|---|---|---|
| a | Avatar (EMPRESA = Monogram) | `User` avatar/iniciais, cor do nó | Identificação |
| b | Nome | `fullName` / `displayName` | Identificação |
| c | @username · cargo | `username` · `jobTitle` (EMPRESA: "Conta institucional") | Identificação · Profissional |
| d | Departamento (link RF14) | `departmentId` → Monogram + sigla | Institucional |
| e | Empresa (link RF15) | `companyId` → nome | Institucional |
| f | Etiqueta institucional | `DeptRole.CHEFE` → "Chefe de {sigla}"; `ProfileType.EMPRESA` | Institucional |
| g | Visão de terceiros | viewer ≠ dono | derivado do viewer |
| h | Ações | Seguir (`FollowButton`, `aria-pressed`) só para terceiros + atalho institucional | — |
| i | Contadores | tarefas, projetos, decisões, seguidores, seguindo, DP (só o dono), Hype (`hypeVisibility`) | Métricas e reputação (ocultação: Classificação e visibilidade) |

Variações: próprio × terceiros; pessoa × EMPRESA × chefe. Acessibilidade: contadores em `dl` (dt/dd); contador oculto = "—" + `sr-only` "oculto para você".

![Cabeçalho institucional](anatomias/svg/instituicao-cabecalho--claro.svg)

**Cabeçalho institucional** (`DepartmentHeader` e `CompanyHeader` em `components/social/InstitutionalHeader.tsx`, DEMO) · `/departments/[slug]` (RF14.CA01) e `/companies/[slug]` (RF15.CA01). **1** `ui/Card tone="clay"` · **a** monograma (cor do departamento; empresa = laranja) — Identificação · **b** sigla / razão social — Identificação · **c** nome + empresa (link) ou "/companies/{slug} · métricas públicas" — Institucional · **d** chefe com link para o perfil pessoal (RF16) — Institucional · **e** Seguir (`targetType` DEPARTMENT/COMPANY) · **f** "Abrir modo gestão" só para o chefe / "Ver conta institucional" na empresa · **g** contadores (departamento: pessoas, projetos visíveis, decisões, seguidores; empresa: departamentos, pessoas, projetos, seguidores — sem cargo, Hype ou DP) — Métricas e reputação. Abaixo, `PublishedProjects` lista `ProjectCard` visíveis ao viewer. Slug desconhecido: card "clay" de exemplo com monograma do slug.

## 16. Card de pessoa na busca (planejado)

| Resultado visível | Perfil restrito (proposta) |
|---|---|
| ![Card de pessoa — visível](anatomias/svg/pessoa-resultado--claro.svg) | ![Card de pessoa — restrito](anatomias/svg/pessoa-resultado-restrito--claro.svg) |

**Não existe no código:** `/search` é `RfPage`-esqueleto; o RF17 prevê as abas PESSOAS e CHEFES DE DEPARTAMENTO com "Avatar (pessoas) / Monogram (chefes)". Fonte de dados prevista: `PublicProfileView` (`GET /api/people/by-username`, em curso) e o índice `ws-people`. **1** `article` em grade, borda 1 px, raio lg; o card inteiro leva a `/u/[username]` (link esticado no nome).

| Letra | Elemento | Atributo de origem | Categoria |
|---|---|---|---|
| a | Avatar | foto/iniciais + anel na cor do departamento (restrito: só iniciais em cinza) | Identificação |
| b | Nome | `fullName` / `displayName` | Identificação |
| c | @username · cargo | `username` · `jobTitle` (restrito: só @username) | Identificação · Profissional |
| d | Lotação | departamento (monograma + sigla) · empresa | Institucional |
| e | Trecho que casou | campo do termo (nome, cargo, competência), termo sublinhado + negrito | derivado da busca |
| f | Contadores | tarefas e projetos visíveis ao viewer (`AccessPolicy.visibilityFilter`, RF17.CA03), seguidores; restrito = "—" + sr-only | Métricas e reputação |
| g | Aviso de restrição | cadeado + "Perfil restrito — siga para ver as produções" | Classificação e visibilidade |
| h | Ações | Seguir (`aria-pressed`) · Ver perfil (ghost; some no restrito) | — |

**Ressalva:** o domínio hoje **não tem perfil privado** (D-90: seguir é imediato, sem pendência) e um recurso invisível responde 404 como se não existisse (D-65, D-141) — então a busca nem devolveria a pessoa. A variação restrita só vale se a visibilidade de perfil for criada (lacunas "descoberta do perfil" e "visibilidade por campo" em `ATORES_E_ATRIBUTOS.md` §5.3); até lá, é proposta.

## 17. Card da sessão DECIA (planejado)

![Card da sessão DECIA](anatomias/svg/sessao-decia-card--claro.svg)

**Não existe no código:** `/decia/[sessionId]` e `/decia/review` são `RfPage` com `note: "sessionCards"` ("Os cards da sessão DECIA … ainda serão recriados no board", Q-44, Q-103). A prancha segue a especificação de `docs/produto/DECIA_SESSAO_E_MESA.md` §B.1 (lista `/decia`, Mural, perfil › Decisões, painel do projeto). **1** borda 2 px na cor do departamento, raio md (mesma família do card de projeto).

| Letra | Elemento | Atributo de origem | Categoria |
|---|---|---|---|
| a | Ícone da sessão | glifo `abrir-decia` | decorativo |
| b | Tema (serif, 2 linhas) | `DeciaSession.topic` (RF4) | Identificação |
| c | Objetivo (1 frase) | `DeciaSession.objective` (proposta) | Conteúdo autoral |
| d | Estado · fase | `SessionStatus` + fase de deliberação ("Aberta · Divergir") | Estado e ciclo de vida |
| e | Participantes | até 5 avatares + "+n", ponto verde = online (presença Redis), IA = ✦ | Identificação · Estado |
| f | Projeto vinculado | `linkedProjectId` → mosaico mini + título (RF29.CA01) | Identificação |
| g | Rumo à decisão | PercentBar 0–100 % com 5 marcas (serviço determinístico, §B.5) | Métricas (derivado) |
| h | Prazo | `scheduledAt` ou prazo da fase/revisão (âmbar ≤ 3 dias, vermelho vencido) | Estado e ciclo de vida |
| i | Rodapé | "n mensagens · n divergências (k resolvidas) · n perguntas abertas" + contadores da decisão | Métricas e reputação |
| j | Lacre / carimbo | chancela da decisão/projeto (RF39); carimbo mini VALIDADO/DEVOLVIDO | Estado e ciclo de vida |

**Estados:** RASCUNHO (tracejado) · PROPOSTA · ABERTA (pulso) · CONVERGINDO/DECISÃO_PROPOSTA (faísca) · EM_REVISÃO (cadeado) · VALIDADA/DEVOLVIDA (carimbo) · ENCERRADA · ARQUIVADA (esmaecido). **Variantes previstas:** compact (lista lateral do chat), list (fila do chefe), mural (decisão validada + carimbo grande), postit (Mesa, RF22.CA05). **Acessibilidade (proposta):** fase e estado em texto; % da barra em texto; presença com rótulo ("online"), nunca só o ponto verde; ✦ com tooltip de transparência.

## 18. Cards da conta e da segurança (todos reais)

### 18.1 Verificação em duas etapas — `TwoFactorCard`

| Desativada | Ativa |
|---|---|
| ![2FA desativada](anatomias/svg/conta-2fa-desativada--claro.svg) | ![2FA ativa](anatomias/svg/conta-2fa-ativa--claro.svg) |

`components/account/TwoFactorCard.tsx` · Configurações › Conta · `GET /api/me/2fa` e `/api/me/2fa/*` (RF2.CA02, D-144). **1** `ui/Card` com eyebrow, título e actions (`two-factor-card`). **a** eyebrow "RF2.CA02" (rastreabilidade) · **b** título · **c** estado Badge "Ativa"/"Desativada" ← `TwoFactorStatus.enabled` (Segurança) · **d** explicação (`onIntro`/`offIntro`) · **e** resumo "Ativa desde {data}. Códigos de recuperação restantes: n" ← `enabledAt`, `recoveryCodesLeft` (Segurança) · **f** Ativar (primary) ou Gerar novos códigos · **g** Desativar (danger). Estados extras: carregando (`LoadingState`), erro com "Tentar de novo". **Ações:** Dialogs em passos (senha → segredo + link `otpauth` → primeiro código → códigos de recuperação mostrados **uma vez**, com copiar/baixar); desativar e regenerar pedem senha + código. **Acessibilidade:** campos com `autocomplete="current-password"`/`"one-time-code"` e `inputMode="numeric"`; erros com código (`status code`); o segredo nunca é guardado no navegador.

### 18.2 Excluir conta — card de `DataPanel`

| Padrão | Exclusão agendada |
|---|---|
| ![Excluir conta](anatomias/svg/conta-exclusao--claro.svg) | ![Exclusão agendada](anatomias/svg/conta-exclusao-agendada--claro.svg) |

`components/account/DataPanel.tsx` · Configurações › Dados · `POST/DELETE /api/me/deletion` (RF3.CA19/CA20, D-18, D-145). **1** `ui/Card` (`delete-account-card`) · **a** eyebrow + título "Excluir minha conta" · **b** Badge "Exclusão agendada" ← `User.status = DELETION_SCHEDULED` (Estado e ciclo de vida) · **c** consequências (prazo de 30 dias, anonimização) ou data e dias restantes ← `deletionScheduledAt`, `daysLeft` (Estado e ciclo de vida) · **d** "Excluir conta…" (danger) → `DeleteAccountDialog` (consequências, senha atual, motivo opcional, "entendi", palavra **EXCLUIR**; o botão final só habilita com tudo preenchido) ou "Reativar conta" (primary, `useReactivate`). **Acessibilidade:** reticências no rótulo avisam que abre diálogo; erros de campo ligados por `aria-describedby`.

### 18.3 Aviso de exclusão — `DeletionBanner`

![Aviso de exclusão](anatomias/svg/conta-aviso-exclusao--claro.svg)

`components/account/DeletionBanner.tsx` · topo de **todas** as páginas do shell enquanto a exclusão está agendada. **1** `ui/Card tone="soft"` com borda `--ws-warning`, `role="status"` (`deletion-banner`) · **a** Badge "Exclusão agendada" (Estado e ciclo de vida) · **b** "Sua conta será excluída em {data} (faltam n dias). Até lá, você pode reativá-la." ← `deletionScheduledAt` (sem data: texto genérico) · **c** "Reativar conta" (primary sm, `busy` durante a chamada). Some quando a conta volta a ACTIVE.

### 18.4 Sessão por dispositivo — item de `SessionsPanel`

![Sessão por dispositivo](anatomias/svg/conta-sessao-dispositivo--claro.svg)

`components/settings/SessionsPanel.tsx` · Configurações › Sessões (`GET /api/auth/sessions`, RF2.CA05, D-62). Camadas: **1** sessão atual (`Card as="li"`, `data-current="true"`) · **2** outra sessão. **a** glifo "perfil" (decorativo) · **b** dispositivo ← `SessionInfo.deviceName` ("Dispositivo sem nome" se vazio; Segurança) · **c** Badges "Esta sessão" (`current`) e "Lembrar-me" (`persistent`) (Segurança) · **d** última atividade e expiração ← `lastActiveAt`, `expiresAt` (Proveniência e auditoria) · **e** "Sair deste dispositivo" (ghost; logout do BFF) · **f** "Encerrar sessão" (secondary → confirmação → `DELETE /api/auth/sessions/{id}`). Acima da lista, um card de cabeçalho com "Sair de todos os outros" (danger, desabilitado sem outras sessões). Estados: carregando, erro (offline/502/503 com título próprio e `correlationId`), vazio.

## 19. Bloco de RF/CA — `RfBlock` (RfPage)

![Bloco de RF/CA](anatomias/svg/rf-bloco--claro.svg)

`components/shell/RfPage.tsx` · seção "O que esta aba vai fazer" no rodapé de toda página-esqueleto (e de páginas funcionais que não escondem os CAs) · texto **real** do catálogo gerado `lib/rf/catalog.gen.ts` (cópia dos READMEs `docs/diagramas/RFnn`). Camadas: **1** `details/summary` nativo (borda 1 px, raio md; o primeiro RF da página abre aberto; foco com `--ws-focus-ring`) · **2** corpo com borda superior.

| Letra | Elemento | Atributo de origem | Categoria |
|---|---|---|---|
| a | Chip do RF | `RfEntry.id` (Badge accent) | Identificação |
| b | Título | `RfEntry.title` | Conteúdo autoral (documentação) |
| c | Chevron | ⌄ decorativo, gira 180° aberto | decorativo |
| d | História | `RfEntry.hu` (ou `summary`) | Conteúdo autoral (documentação) |
| e | Rota · cobertura | `RfEntry.route`, `RfEntry.coverage` | Conteúdo autoral (documentação) |
| f | Tipo do CA | Badge info = enunciado · neutro = rastreabilidade (`title` explica) | derivado |
| g | Texto do CA | `ca.text` + `ca.note` | Conteúdo autoral (documentação) |
| h | Fonte | link para `docs/diagramas/RFnn/README.md` | Proveniência e auditoria |

Variações: fechado × aberto; perfil sem acesso (célula **O** da matriz) mostra o `ErrorState` 403 simulado antes do bloco. Abaixo do bloco, o card soft "matrixNote" diz matriz, rota e arquivo da página. **Acessibilidade:** `details/summary` dá teclado e estado expandido de graça; CAs em `ol[aria-label="Critérios de aceite"]`; quebra com `overflow-wrap:anywhere` para ids longos.
