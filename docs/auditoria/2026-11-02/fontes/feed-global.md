# Feed global filtrável de projetos e tarefas da rede Work Station — pesquisa de requisito

Frente: **feed global filtrável** (aba "Feed de projetos e tarefas da rede Work Station"). Data: 02/11/2026. Repositório lido: `/home/user/Decia-app-2026` (nenhum arquivo do repositório foi modificado). Convenção: **real** = existe no código; **planejado** = só em docs/diagramas; **não conferido** = afirmação de fonte secundária (scrapers, blogs) que não foi validada na documentação oficial.

---

## 1. Benchmark (12 referências)

Data de acesso de todas as fontes: 02/11/2026. As buscas devolveram, em vários casos, documentação de terceiros (listagens de scrapers no Apify, blogs); o que não veio de página oficial está marcado **não conferido**.

| # | Produto | Facetas de filtro | Ordenação | Controle do usuário | Moderação / denúncia | Performance (paginação, cache) | Fonte |
|---|---|---|---|---|---|---|---|
| 1 | **Behance** | Campo criativo, ferramentas, escola, localização; "Additional Filters": cor, escola, ferramenta (uma por vez em tutorial antigo). País como faceta: **não conferido** (só em app de terceiro). Busca de imagem filtra câmera/lente. | Padrão "Recommended" (critérios + atividade prévia); "Most Recent". "Most Appreciated": **não conferido**. | Seguir pessoas; "Recommended" aprende com atividade. | Curadoria editorial (galerias "curated" existem, mas não como filtro de busca: **não conferido**). | Grade infinita; não documentado. | [help.behance.net – Search & Filter Creative Work](https://help.behance.net/hc/en-us/articles/204483864-Guide-Search-Filter-Creative-Work); [Behance blog – How do I find a great designer](https://medium.com/behance-blog/how-do-i-find-a-great-designer-on-behance-15da48c75c67) |
| 2 | **Dribbble** | Tag, cor (picker de swatches; cores dominantes do shot linkam para busca por cor), downloads gratuitos, "Made With" (Figma, Sketch…), categoria. | "Popular", "New & Noteworthy", timeframe (semana/mês/ano) para populares; "recent"/"views" em APIs de terceiros (**não conferido**). | Seguir designers; Pro filtra. | Diretrizes de shot; denúncia por item (**não conferido**). | Páginas numeradas (`?page=`). | [dribbble.com/stories – Fresh from Dribbble 2019](https://dribbble.com/stories/2019/05/28/fresh-from-dribbble); [dribbble.com/stories – Color coding 2011](https://dribbble.com/stories/2011/05/26/color-coding); [help.dribbble.com – Optimizing for search](https://help.dribbble.com/en/articles/11062453-optimizing-your-shots-for-dribbble-s-search-engine) |
| 3 | **GitHub Explore / Trending** | Linguagem de programação (segmento de path `/trending/python`), idioma falado do README (`spoken_language_code`, ISO 639-1), tipo (repos/developers). | Período `since=daily|weekly|monthly` (estrelas ganhas no período). Máx. 25 por página. | Explore personalizável por tópicos e estrelas; `topics` seguíveis. | Denúncia de repositório/abuso pelo fluxo GitHub padrão. | Lista pequena, sem paginação profunda; códigos inválidos são ignorados silenciosamente. | Documentação oficial não retornada; parâmetros confirmados só em fontes secundárias: **não conferido** ([apify – github-trending-scraper](https://apify.com/junipr/github-trending-scraper); [browse.sh skill](https://browse.sh/skills/github.com/trending-repos-search-gbjpu7)) |
| 4 | **Dev.to (Forem)** | Tags (`/t/<tag>`), tags seguidas vs. ocultas, "anti-follow weightings" por tag. | "Relevant" (seleciona relevantes, limita, depois ordena por data), "Latest", "Top" (dia/semana/mês/ano/infinity — janelas confirmadas em fonte secundária: **não conferido**). Ordenar exige login. | Seguir tag/pessoa; **ocultar** tag (sai do Relevant); pesos por tag. Sem "mute" (pedido em fórum). | Flag/report por post e comentário; moderadores de tag (Forem). | Paginação por página; feed server-side. | [dev.to/help – Customizing your feed](https://dev.to/help/customizing-your-feed); [dev.to/devteam – Feature update: feed](https://dev.to/devteam/feature-update-feed-3go5); [dev.to – anti-follow weightings](https://dev.to/grahamthedev/quick-tips-make-your-dev-to-home-feed-better-with-anti-follow-weightings-3kpi) |
| 5 | **Product Hunt** | Tópico (slug), data (boards históricos desde 2013). | Leaderboard diário/semanal/mensal/anual por upvotes; ~20 itens por board. | Seguir tópicos/makers; coleções. | Regras de lançamento; denúncia de voto fraudulento (**não conferido**). | Boards pequenos e cacheáveis por período. | Só fontes secundárias: **não conferido** ([apify – product-hunt-leaderboard](https://apify.com/muzafferkadir/product-hunt-leaderboard); [apify – sian.agency/product-hunt-scraper](https://apify.com/sian.agency/product-hunt-scraper.md)) |
| 6 | **Pinterest** | Busca visual (Lens: câmera ou imagem da galeria → pins visualmente semelhantes e ideias relacionadas); filtro pós-busca por tipo de conteúdo (Pins, Boards, Perfis, Vídeos, Produtos). | Relevância visual/semântica; sem "top por período" exposto. | Salvar em boards; "Ver menos disso". | Denúncia por pin; políticas de conteúdo. | Lens indisponível no desktop (fonte secundária: **não conferido**). | [help.pinterest.com – Search for ideas](https://help.pinterest.com/en/article/search-for-ideas-on-pinterest); [Pinterest Engineering – Visual discovery](https://medium.com/@Pinterest_Engineering/introducing-the-future-of-visual-discovery-on-pinterest-48fb469b0d67) |
| 7 | **ArchDaily** | Categorias de projeto (Houses, Buildings, Sustainability, Other Structures…), "Topics" (Materials, Technology), seletor de país por edição. Filtros de ano/material em busca de projetos: **não conferido** (não documentado nas páginas retornadas). | Mais recentes por categoria; destaques editoriais. | "My ArchDaily" salva/organiza (**não conferido**). | Editorial (curadoria de redação). | Páginas numeradas (`/category/houses/page/98`). | [archdaily.com/category/houses](https://www.archdaily.com/category/houses); [archdaily.com/category/sustainability](https://www.archdaily.com/category/sustainability?sa=u) |
| 8 | **Kaggle** | Datasets: tipo de arquivo (CSV, SQLite, JSON, BigQuery), família de licença (CC, GPL, ODbL, outros), usabilidade mínima, tamanho, tags, dono. Notebooks: linguagem, tipo de saída, dataset vinculado. | Datasets: "Hottest" (padrão), votos, atualizados, mais ativos (nº de notebooks), publicados recentemente. Notebooks: hotness, votos, comentários, views, score, data. | Seguir pessoas; "Hotness" pondera atividade recente. | Report por item; regras de licença explícitas. | Páginas de 20 itens; licença fina não filtrável server-side. | Só fontes secundárias: **não conferido** ([apify – parseforge/kaggle-scraper](https://apify.com/parseforge/kaggle-scraper); [apify – crawlerbros/kaggle-scraper](https://apify.com/crawlerbros/kaggle-scraper.md)) |
| 9 | **Figma Community** | Tipo de recurso (Files, Plugins, Widgets, FigJam), categoria (slug), preço (Free/Paid). | Relevância, Trending (janela ~30 dias), Popular (all-time), Recent, preço asc/desc. Abas "Trending / Most popular / Free" em destaque. Filtros de trending/popular sumiram e voltaram em 2024 (fórum). | Curtir, duplicar, seguir criador. | Denúncia de recurso; revisão de plugins pela Figma. | Paginação por scroll. | [forum.figma.com – bring back the plugin filtering](https://forum.figma.com/suggest-a-feature-11/bring-back-the-plugin-filtering-in-the-community-6193); demais detalhes em scrapers: **não conferido** ([apify – figma-community-scraper](https://apify.com/automation-lab/figma-community-scraper.md)) |
| 10 | **Notion Templates** | 250+ categorias e subcategorias, criadores, busca textual; free/paid (filtro dedicado: **não conferido**). | "Popular templates" = mais usados na última semana; "Featured" a critério da Notion (preço é um dos critérios). | Seguir criador; duplicar template. | Curadoria editorial; diretrizes para criadores. | Catálogo paginado. | [notion.com/help – Getting featured in the template gallery](https://Notion.com/help/getting-featured-in-the-template-gallery); [notion.com/help/guides – Ultimate guide to templates](https://www.notion.com/he/help/guides/the-ultimate-guide-to-notion-templates) |
| 11 | **LinkedIn feed** | Sem facetas de busca no feed; controle por pessoas/empresas seguidas. | "Most relevant first" (padrão) vs. "Most recent first" (por sessão; preferência permanente no Learning Center, só pessoas seguidas). | Ocultar post (X + motivo opcional), "Not interested", unfollow, mute (pouco documentado: **não conferido**), silenciar palavras só via extensões. | Denunciar post; política de conteúdo. | Infinite scroll; ranking server-side. | [linkedin.com/help – a1339724 (sort feed)](https://linkedin.com/help/linkedin/answer/a1339724); [linkedin.com/help – 62570 (customize feed)](https://www.linkedin.com/help/linkedin/answer/62570); [blog.linkedin.com 2021 – control your feed](https://blog.linkedin.com/2021/february/guide-features-to-help-you-control-your-feed-and-conversations) |
| 12 | **Mastodon / Bluesky** | Mastodon: timelines local/federada, hashtags seguidas, trends (posts, tags, links) com **aprovação do admin**; filtros pessoais por palavra/tag (ocultar ou aviso, retroativos, com validade). Bluesky: feeds customizados (feed generators) assináveis e fixáveis; listas de usuários; labelers comunitários; palavras silenciadas ("text & tags" ou "tags only", com duração). | Cronológico por padrão; "trending" por tração no servidor (CW excluídos; mínimo de contas distintas: **não conferido**). | Fixar feeds, listas de mute/block (públicas), labelers opcionais. | Trends exigem aprovação (Mastodon); labels não removem, respeitam preferências (Bluesky); denúncia nativa. | Cursor em API (`max_id`/`cursor`); cache por timeline. | [docs.joinmastodon.org – Tag](https://docs.joinmastodon.org/entities/Tag/); [fedi.tips – moderate trends](https://fedi.tips/?p=6037); [fedi.tips – filters](https://fedi.tips/?p=1150); [EFF – How to clean your Bluesky feed (2024)](https://www.eff.org/deeplinks/2024/06/how-clean-your-bluesky-feed); Bluesky docs oficiais (`docs.bsky.app/docs/tutorials/custom-feeds`) listadas mas não lidas: **não conferido** |

Referências técnicas usadas na proposta (acesso 02/11/2026):

- **Decaimento temporal (Hacker News):** `score = (P − 1) / (T + 2)^G`, com P = votos, T = horas desde publicação, G ≈ 1,8; penalidades (controvérsia, sem URL etc.) sobre a fórmula base; re-ranking só periódico, não a cada view. [righto.com – How Hacker News ranking really works (2013)](https://www.righto.com/2013/11/how-hacker-news-ranking-really-works.html); [righto.com – news.yc ranking (2009)](https://www.righto.com/2009/06/how-does-newsyc-ranking-work.html). Variante com `log` do score e offset para negativos: [join-lemmy.org – ranking algo](https://join-lemmy.org/docs/contributors/07-ranking-algo.html).
- **Paginação em OpenSearch:** `from/size` limitado a 10.000 e caro em profundidade; `search_after` sem PIT pode ficar inconsistente com indexação concorrente; **PIT + `search_after`** é o método recomendado para paginação profunda, com tiebreaker único (`_id`) e `keep_alive` curto; PIT se perde em falha de nó. [docs.opensearch.org – Point in Time](https://docs.opensearch.org/docs/search-plugins/searching-data/point-in-time); [opensearch.org/blog – Paginate with Point in Time](https://opensearch.org/blog/point-in-time/); [docs.opensearch.org 2.4 – Paginate](https://docs.opensearch.org/2.4/opensearch/search/paginate).

**Padrões convergentes do benchmark**
1. Três ordenações mínimas em quase todos: **recente**, **em alta** (janela curta com decaimento) e **top por período** (dia/semana/mês/ano/sempre).
2. Facetas são sempre atributos **públicos do item** (categoria, ferramenta, linguagem, licença, preço, país), nunca atributos privados do autor.
3. Controle do usuário em duas camadas: **seguir** (tag/pessoa) e **reduzir ruído** (ocultar tag, "não me interessa", palavras silenciadas, listas). Dev.to e Bluesky deixam explícito que ocultar/silenciar é diferente de denunciar.
4. Trends/destaques com **curadoria humana** (Mastodon exige aprovação; Behance/Notion/ArchDaily curam) — evita manipulação do "em alta".
5. Paginação por **cursor** e listas pequenas; "em alta" é recalculado periodicamente e cacheado, não por requisição.

---

## 2. O que o repositório já tem e as regras que o feed herda

### 2.1 Regras de produto (docs)

- `docs/produto/REDE_PROFISSIONAL_VISIBILIDADE.md`: quatro controles distintos (descoberta do perfil, **público do recurso**, **publicação como ação explícita**, colaboração). "Rascunho privado não vira postagem por ser salvo"; despublicar remove descoberta em perfil/mural/busca; mural separado em "Rede que acompanho / Minha empresa / Descobrir", **filtrado no servidor**; "não expor existência de itens privados por título, miniatura, busca, contagem ou cache"; curtir é uma reação idempotente por pessoa/alvo e **não aprova nem chancela**; remix cria rascunho derivado com crédito (autor + versão de origem) e nunca torna público conteúdo protegido; CA9 exige **feed paginado com estados reais, navegação por teclado, contraste**; popularidade "não equivale a qualidade técnica nem fundamenta recomendação de carreira".
- `docs/diagramas/RF33/README.md`: índice OpenSearch **`ws-memory`** (`InstitutionalMemoryDocument`: `sourceType` SESSAO/ARTEFATO/DECISAO/PROJETO/TAREFA/DOCUMENTO, metadados empresa/departamento/categoria/exercício/autor/data, `visibility`, `accessClass`, `embedding`). Indexação assíncrona por `PipelineJob INDEXAR_MEMORIA` AFTER_COMMIT quando algo é **encerrado/publicado** (projeto CONCLUIDO, tarefa MODELO_PUBLICO…); máquina de estados prevê `OK → PENDENTE` quando "fonte reeditada ou **visibilidade alterada** → reindexação"; toda consulta passa por `VisibilityFilter.allowedFor(viewer)`; flag `opensearch.enabled` (no código: `ws.opensearch.enabled`, `ws-infrastructure/search-opensearch/.../OpenSearchAdaptersConfig.java`, com fallback MySQL FULLTEXT). Tudo planejado; `/memory` é esqueleto.
- `docs/diagramas/RF45/README.md` (Hype do Perfil): `ProfileHypeScore` 0–1000 por pessoa/dia, `HypeVisibility` PUBLICO/EMPRESA/**SO_EU (padrão)**; CA06 omite o campo para quem não pode ver; CA08 ranking "nunca expõe SO_EU", `User.rankingOptOut`; CA03 antifraude (`IgnoredReason` NAO_VERIFICADO/AUTO_INTERACAO/ANTIFRAUDE); CA04 peso do ator `Reaction.actorHypeAtTime`. `docs/diagramas/RF44/README.md` (HSE, Hype de eficiência): índice **pessoal** previsto × realizado, só na sub-aba Tarefa do Dia do dono. **Conclusão:** Hype é atributo de **pessoa**, não de peça; só pode aparecer no feed como atributo do autor se `hypeVisibility = PUBLICO` e nunca como filtro/ordenação de pessoas.
- `docs/diagramas/RF75/README.md` CA19: `User.preferredOccupation{Code,Label,Visible}` ligado a `contracts/career/academic-fields.json` e pacotes `contracts/career/occupation-packs/*.json` (famílias CBO/ESCO); **privado por padrão**, "nunca aparece a terceiros sem opt-in e nunca é tratado como sinal de busca de emprego (D-147)". CA14: nada de carreira em ranking, ordenação ou sugestão. `docs/auditoria/2026-10-31/GUIA_DE_CARREIRA.md` §3: privado por padrão, sem score de empregabilidade, sem ranking de pessoas; §6: aba **"Minha trilha"** em `/mural` (feed só da própria pessoa e grupo de apoio) — é o oposto do feed global e não deve se misturar. `docs/DECISOES.md` D-147: sem sinal de busca de emprego.

### 2.2 Código real

| Onde | O que existe | Relevância para o feed |
|---|---|---|
| `ws-domain/.../common/Visibility.java` | `PRIVADA, DEPARTAMENTO, EMPRESA, PUBLICA` | Não existe valor "REDE". "Rede" só pode ser derivado (PUBLICA para autenticados + EMPRESA para quem é da mesma empresa). |
| `ws-domain/.../acervo/TaskCategory.java` | 15 categorias documentais (OFICIO_MEMORANDO … FORMULARIO, OUTRO) | Faceta "categoria" pronta. |
| `ws-domain/.../acervo/TaskItem.java` | `title, summary, type (TaskType), category, subcategory, processTags (≤2), natureTags (≤2: TECNICA, JURIDICA, FINANCEIRA, ADMINISTRATIVA, AMBIENTAL, SOCIAL), accessClass, format, effortSize, origin, orgEntityId (órgão/fornecedor), state (TaskState: … MODELO_PUBLICO, OFERECIDA), visibility, aiGenerated, thumbnailUrl/coverUrl, tags (livres), originalTaskId (remix), reuseCount, projectUsageCount, likesCount, commentsCount, savesCount, sharesCount, remixesCount, viewsCount, sealIdsJson` | **Curtidas e contadores já existem como colunas-cache da tarefa** (`likesCount` etc.). Órgão via `orgEntityId`. Chancelas via `sealIdsJson`. |
| `ws-domain/.../acervo/TaskBrief.java` | `WorkArea area` (SOFTWARE, ADMINISTRACAO, DESIGN, PESQUISA, MARKETING, PLANEJAMENTO, ENGENHARIA, JURIDICO, OUTRA) | Faceta "área profissional" do item (não da pessoa) — candidata a "profissão" pública. |
| `ws-domain/.../projetos/ProjectScheme.java` | `title, objective, processTags, natureTags, origin (SchemeOrigin, inclui REMIX), originalProjectId, status (ProjectStatus: PUBLICADO, CONCLUIDO…), currentPhase, visibility, exerciseYear, companyId, departmentId, coverUrl/mosaicJson, conformityPercent, aiGenerated, likesCount, commentsCount, savesCount, sharesCount, remixesCount, viewsCount, sealIdsJson` | Mesmos contadores no projeto; sem `accessClass` (tratado como INTERNO em `lib/social/rules.ts:72`). |
| `ws-domain/.../social/Reaction.java`, `ReactionType.java` | `CURTIR, UTIL, BEM_FUNDAMENTADO, INOVADOR, CONFORME`; único `(actor, target, reaction_type)`; `actorHypeAtTime`, `ignoredReason` | "Curtidas" = `CURTIR`; reações qualitativas podem virar facetas/ordenação ("mais úteis", "mais bem fundamentadas"). |
| `ws-domain/.../social/Remix.java`, `Follow.java` (`FollowTargetType` USER/DEPARTMENT/COMPANY), `MuralEntry.java` (`MuralKind`, `companyId`, `boostUntil`), `TimelineEvent.java` (Cassandra, por usuário) | Mural é **institucional por empresa**; `TimelineEvent` é fan-out pessoal | Nenhum deles é um índice global de itens públicos. Seguir só aceita USER/DEPARTMENT/COMPANY — **não existe seguir categoria/profissão**. |
| `ws-domain/.../identity/User.java`, `HypeVisibility.java` | `specialties` (≤10 rótulos, RF3), `verified`, `hypeVisibility = SO_EU`, `rankingOptOut` | Especialidades são do perfil, com `profileVisibility` AUTENTICADOS/EMPRESA (`lib/account/publication.ts`). `preferredOccupation` ainda **não existe** no código. |
| `ws-domain/.../common/UiLanguage.java` | `PT_BR, EN, ES` (idioma da UI) | Não há idioma **do conteúdo** em TaskItem/ProjectScheme. |
| `ws-domain/.../chancelas/Seal*.java` | `Seal` (emissor EMPRESA/CHEFE, `tier`, `excellence`), `SealBond`, `SealProposal` | Base do "selo validado" (chancela aprovada no item). Também `FinalDecision VALIDADA` no DECIA (RF33). |
| `ws-domain/.../institutional/CuratorAppointment.java` (RF28.CA03) | curador por departamento, escopo | Único papel de moderação existente. **Não há entidade de denúncia/report** (grep por `denunci|report|moderac` no domínio: vazio; só menção em `REDE_PROFISSIONAL_VISIBILIDADE.md`). |
| `lib/social/types.ts` | espelha enums Java; `SocialTask` traz `category, type, accessClass, visibility, state, seals, originalTaskId, reuseCount, aiGenerated, authorship`; `SocialProject` traz `status, origin, originalProjectId, visibility, seals`; `Reaction`, `Remix`, `Follow`, `MuralEntry` | Tipos prontos para um `FeedItem` derivado. |
| `lib/social/rules.ts` | `canView` (PUBLICA → todos inclusive visitante; EMPRESA → mesma empresa; RESTRITO/SIGILOSO só restringem — D-93/D-137), `isDraft`, `countersOf` (likes/comments/saves), `remixedByCount`, `remixPermission` (só PUBLICA/EMPRESA e PUBLICO/INTERNO), `muralFeed(tab: "empresa" | "vitrine" | "seguindo")` ordenado por `at` desc, sem paginação, filtrado por `canView` | Regras puras reaproveitáveis; o feed atual é por **evento de mural**, não por item, e só DEMO (fixtures). |
| `components/social/MuralFeed.tsx`, `app/(shell)/mural/page.tsx` | `<ol aria-label>` , `EmptyState`, `LoadingState`; 3 abas | Sem filtros, sem cursor, sem "carregar mais". |
| `ws-web/.../support/AuthRateLimitFilter.java`; `ConversationService` (cursor `before=Instant`) | rate limit só em auth; cursor só em mensagens | Padrão de cursor já existe para copiar. |
| `docs/diagramas/RF27/README.md` | Mural RF27.CA01 `TimelinePort.page` (20 por página), CA03 `SearchService.search` via `SearchIndexPort` com contadores por aba, CA04 `VisibilityFilter.allowedFor` em toda leitura | Busca `/search` planejada no mesmo `SearchIndexPort` — o feed deve compartilhar esse port. |

### 2.3 "Hype" e "curtidas": o que pode ser filtro hoje e o que falta

`grep -ri "hype\|curtida\|like" lib/social ws-domain/src/main/java`:

- **Curtidas (CURTIR):** existem como `Reaction` (fato) e como cache `TaskItem.likesCount` / `ProjectScheme.likesCount` (colunas reais). `lib/social/rules.ts:189 hasLiked`, `221 countersOf`. **Pode ser ordenação/filtro hoje** (contagem mínima, "mais curtidas"), desde que a contagem exclua reações com `ignoredReason` (AUTO_INTERACAO, ANTIFRAUDE) — o cache atual não distingue; precisa de regra de recomputação.
- **Reações qualitativas (UTIL, BEM_FUNDAMENTADO, INOVADOR, CONFORME):** existem como `Reaction`, **sem** coluna-cache no item. Podem virar faceta ("reação predominante") e ordenação após criar agregados.
- **Hype:** só existe como **Hype do Perfil** (`ProfileHypeScore`, pessoa/dia) e HSE (RF44, pessoal), ambos planejados, com `User.hypeVisibility` real (padrão SO_EU) e `canSeeHype` em `lib/social/rules.ts:704`. **Não existe "hype de peça/tarefa/projeto".** Para o pedido do dono ("filtrar por hype"), há duas leituras:
  1. *Hype do autor* como faceta → **só** quando `hypeVisibility = PUBLICO` (RF45.CA06/CA08) e nunca como ordenação de pessoas; recomendado **não** oferecer como filtro (viola "sem ranking de pessoas", GUIA §3 e REDE_PROFISSIONAL "popularidade não fundamenta recomendação").
  2. *Hype do item* ("em alta") → **precisa ser criado**: um `trendingScore` do item, derivado de reações/salvos/remixes/comentários/visualizações válidos com decaimento temporal (§3.2). É isso que o benchmark chama de "hot/trending" e é a interpretação proposta aqui.
- **Remixes:** `remixesCount` (cache) + `Remix` + `reuseCount` — prontos para "mais remixados" e faceta "remixável" (= `remixPermission` ok: PUBLICA/EMPRESA e PUBLICO/INTERNO, não rascunho).
- **Selo validado:** `sealIdsJson` (chancelas aprovadas) existe; "validado pelo DECIA" (`FinalDecision VALIDADA`) só planejado.
- **Precisa ser criado (não existe no modelo):** idioma do conteúdo, região/UF do item, editor de origem (Letters/Drawings — hoje só inferível por `TaskType` DESENHO_TECNICO ≈ Drawings, textuais ≈ Letters; `lib/pieces/*` não guarda tipo de editor), competência/profissão **do item** (hoje só `WorkArea` no `TaskBrief` e `specialties` no perfil), `preferredOccupation` (RF75.CA19 planejado), seguir categoria/profissão, denúncia, filtros salvos, índice de feed, cursor.

---

## 3. Proposta de facetas, ordenação e infraestrutura

### 3.1 Elegibilidade (o que entra no feed)

Entra **somente** o que foi **publicado por ação explícita** (REDE_PROFISSIONAL: publicar ≠ salvar) e está em visibilidade:
- **PUBLICA** (`Visibility.PUBLICA`) **e** `accessClass` PUBLICO ou INTERNO → visível a qualquer autenticado (visitante anônimo: decisão de produto; `canView` hoje permite; recomendado exigir login no feed global para rate limit e anti-scraping, mantendo PUBLICA legível na página do item);
- **EMPRESA** → aparece só para viewers da mesma empresa, rotulado "sua empresa" (é o "REDE para quem está na rede"); DEPARTAMENTO e PRIVADA **nunca**; RESTRITO/SIGILOSO **nunca** (D-93/D-137/D-139);
- estados: tarefa `MODELO_PUBLICO`, `DISPONIVEL`, `CONCLUIDA` (não RASCUNHO/ARQUIVADA/BLOQUEADA); projeto `PUBLICADO`, `EM_DECISAO`, `APROVADO`, `EM_EXECUCAO`, `CONCLUIDO` (não RASCUNHO/ARQUIVADO/DEVOLVIDO);
- a **versão** indexada é a versão publicada (`TaskVersion`/`ProjectVersion`), não o rascunho em edição.

Fora do feed, sempre: perfil de carreira, `preferredOccupation` sem opt-in, Hype de terceiros (salvo `PUBLICO`), HSE, DECIA Points, sinal de emprego (D-147), salvos, custos de IA.

### 3.2 Facetas (campos de filtro)

| Faceta | Tipo | Origem no modelo | Público? | Situação |
|---|---|---|---|---|
| Tipo de item | enum `TASK` / `PROJECT` | `TargetType` | sim | real |
| Categoria documental | multi-enum `TaskCategory` (15) + `subcategory` texto | `TaskItem.category/subcategory` | sim | real (só tarefa) |
| Tipo da tarefa | multi-enum `TaskType` (15) | `TaskItem.type` | sim | real |
| Natureza | multi-enum `NatureTag` (6) | `TaskItem/ProjectScheme.natureTags` | sim | real |
| Processo | multi-enum `ProcessTag` | `processTags` | sim | real |
| Área profissional / profissão | multi-enum `WorkArea` (9) **ou** família CBO/ESCO do `OccupationPack` | `TaskBrief.area` hoje; proposto `FeedItem.occupationFamilyCode` preenchido **pelo autor no diálogo de publicar** (sugestão pré-marcada com `preferredOccupation` só se `Visible = true`, RF75.CA19) | sim (é do item, não da pessoa) | WorkArea real; família CBO/ESCO a criar |
| Editor de origem | enum `LETTERS` / `DRAWINGS` / `OUTRO` | novo `editorKind` na peça/versão publicada; fallback por `TaskType` (DESENHO_TECNICO→DRAWINGS; TEXTO_*/DOCUMENTO/ATA_REGISTRO/EMAIL/PROTOCOLO→LETTERS) | sim | a criar |
| Autor | id + nome profissional + `verified` | `User` (campos descobríveis) | sim, respeitando `profileVisibility` (AUTENTICADOS/EMPRESA); se o perfil não é visível ao viewer, mostrar "autor não disponível" sem link | real parcial |
| Empresa / órgão | id, nome, tipo (empresa publicadora vs. `orgEntityId` órgão/fornecedor) | `ProjectScheme.companyId`, `TaskItem.orgEntityId` (`OrgEntity`) | sim, se a publicação foi **institucional**; publicação pessoal não exibe vínculo (REDE_PROFISSIONAL: "vínculo não significa endosso") | real parcial |
| Identidade de publicação | enum `PESSOAL` / `INSTITUCIONAL` | diálogo de publicar (planejado) | sim | a criar |
| Data | intervalo (`publishedAt`, `updatedAt`) | `TaskVersion/ProjectVersion` + Audit | sim | real parcial |
| Exercício | ano | `ProjectScheme.exerciseYear` | sim | real (projeto) |
| Status | multi-enum `TaskState` / `ProjectStatus` (só os elegíveis) | `state/status` | sim | real |
| Fase | enum `ProjectPhase` | `currentPhase` | sim | real |
| Competências | lista de rótulos (≤10) | novo `FeedItem.competencies` (do pacote de ocupação ou livres), declaradas **pelo autor por item**; **não** derivar de `User.specialties` sem opt-in | sim | a criar |
| Selo validado | booleano + emissor (`EMPRESA`/`CHEFE`) + `tier`/`excellence` | `sealIdsJson` → `Seal` | sim | real (cache) |
| Validado no DECIA | booleano | `FinalDecision VALIDADA` ligada ao item | sim | planejado (RF33) |
| Remixável | booleano | `remixPermission` (PUBLICA/EMPRESA + PUBLICO/INTERNO + permissão de remix do item) | sim | real parcial (flag por item planejada) |
| Origem | enum `SchemeOrigin` / `TaskOrigin`; "é remix" (`originalTaskId/originalProjectId != null`) | real | sim | real |
| Gerado com IA | booleano | `aiGenerated` | sim | real |
| Idioma do conteúdo | ISO 639-1 (`pt-BR`, `en`, `es`…) | novo `contentLanguage` (detectado no Letters com confirmação do autor; padrão pt-BR) | sim | a criar |
| Região | UF / município (IBGE) | novo `regionCode` do **item** (opcional, declarado ao publicar; nunca inferido da pessoa) | sim | a criar |
| Formato | texto curto | `TaskItem.format` | sim | real |
| Classificação | enum (só PUBLICO/INTERNO aparecem) | `accessClass` | sim | real |
| Contadores | inteiros: curtidas, úteis, bem fundamentadas, inovadoras, conformes, comentários, salvos, remixes, visualizações | caches em `TaskItem/ProjectScheme` + agregados de `Reaction` | sim (contagens agregadas) | real parcial |
| Hype do autor | 0–1000 | `ProfileHypeScore` | **só** se `hypeVisibility = PUBLICO`; exibido no card, **não** oferecido como filtro/ordenação | planejado |

Facetas mostradas com contagem por valor (como Kaggle/Figma) quando o motor for OpenSearch (`aggs`); em SQL, contagens só para as 3–4 facetas principais.

### 3.3 Ordenações

| Chave | Fórmula / regra | Observação |
|---|---|---|
| `recent` (padrão) | `publishedAt desc, id desc` | cursor estável |
| `trending` ("em alta") | `trendingScore = (w1·curtidas + w2·qualitativas + w3·salvos + w4·remixes + w5·comentários + w6·log(1+views) − penalidades) / (horasDesdePublicação + 2)^1,8` (padrão HN; `G` configurável), **só reações válidas** (`ignoredReason = null`), uma reação por pessoa; recalculado por job a cada 15–60 min; janelas `24h / 7d / 30d` | nunca usa Hype do autor nem sinais de carreira (RF75.CA14) |
| `top_likes` | `likesCount desc` em período (`7d / 30d / 365d / all`) | contagem válida |
| `top_remixed` | `remixesCount` (atores distintos, `remixedByCount`) desc em período | sinal de utilidade real |
| `top_validated` | itens com selo/decisão validada primeiro, depois por `tier/excellence` e data | "validado" é curadoria institucional, não popularidade |
| `top_useful` | reações `UTIL` + `BEM_FUNDAMENTADO` + `CONFORME` | separa "gostei" de "serve" |

Todas as ordenações exigem **tiebreaker** (`id`) e cursor opaco (`base64(sortValue, id)`).

### 3.4 Busca textual

- Campos: `title^3, summary^2, descriptionMd, tags, subcategory, competencies`; operador `AND` por padrão, sinônimos pt-BR (ETP ↔ estudo técnico preliminar); `OpenSearch` com analisador `brazilian`; fallback MySQL FULLTEXT quando `ws.opensearch.enabled=false` (já previsto em `OpenSearchAdaptersConfig`).
- Mínimo 2 caracteres, máximo 200 (422 VALIDACAO como RF33 faz com 500).
- Não indexar texto de itens não elegíveis (evita vazamento por trecho/highlight).

### 3.5 Filtros salvos, seguir e ruído

- **`SavedFilter`** (por usuário, ≤ 20): nome, `queryJson`, `notify` (digest diário/semanal opcional). Equivale a feed customizado do Bluesky/"Top categories" do Notion.
- **Seguir categoria / área / profissão:** estender `FollowTargetType` com `TASK_CATEGORY`, `WORK_AREA`, `OCCUPATION_FAMILY` (ou nova entidade `TopicFollow`), alimentando a aba "Seguindo" do mural e um filtro rápido "o que eu sigo". Seguir tópico não cria notificação por item (só digest).
- **Controles de ruído** (Dev.to/Bluesky): "ver menos desta categoria/área" (peso negativo pessoal), **ocultar item** (`HiddenItem`), **ocultar autor no feed** (diferente de bloquear), silenciar palavras (`MutedTerm`, aplicado no cliente e no servidor). Nenhum deles altera ACL nem notifica o autor.
- **Diversidade do autor:** no `trending`, no máximo 2 itens do mesmo autor por página (atenua viés de quem publica muito, §4).

### 3.6 Índice e consulta

**Recomendação: OpenSearch (índice próprio `ws-feed`) reaproveitando `SearchIndexPort` e o pipeline do RF33, com fallback SQL.**

- Por que não só o `ws-memory`: ele é vetorial (`dense_vector`, embeddings, kNN) e mistura sessões/decisões/documentos internos; o feed precisa de **facetas (`aggs`), ordenação por score materializado, filtro exato de visibilidade e nenhum embedding externo**. Mesmo cluster, mesmo `PipelineJob` (novo tipo `INDEXAR_FEED`), mesmo `VisibilityFilter.allowedFor(viewer)` em toda consulta.
- Documento `FeedItem` (desnormalizado): `id, targetType, targetId, versionId, title, summary, coverUrl, authorId, authorDisplay, authorVerified, publishIdentity, companyId, companyDisplay, orgEntityId, departmentId, visibility, accessClass, state, category, subcategory, type, natureTags, processTags, workArea, occupationFamilyCode, competencies[], editorKind, contentLanguage, regionCode, exerciseYear, aiGenerated, isRemix, remixable, sealed, sealTier, excellence, deciaValidated, counters{likes, useful, wellFounded, innovative, compliant, comments, saves, remixes, views}, trendingScore{24h,7d,30d}, publishedAt, updatedAt, indexedAt`.
- Consulta: `bool.filter` = elegibilidade + `(visibility = PUBLICA) OR (visibility = EMPRESA AND companyId = viewer.companyId)` + facetas; `must` = texto; `sort` = chave + `id`. Paginação **PIT + `search_after`** (docs OpenSearch), cursor opaco com validade ≤ 5 min; profundidade máxima 50 páginas × 20 itens.
- Fallback SQL (MySQL 8) para instalações sem OpenSearch: view/tabela `feed_items` materializada pelo mesmo job, índices compostos `(visibility, company_id, published_at, id)`, `(visibility, category, published_at)`, `(visibility, trending_7d desc, id)`; FULLTEXT em `title, summary`; keyset pagination (`WHERE (sort, id) < (?, ?)`), sem `OFFSET`.
- Consistência: **mudança de visibilidade/estado/despublicar → remoção/atualização síncrona-prioritária** (job `INDEXAR_FEED` com prioridade alta, e **filtro de segunda camada** na leitura: a API reconfirma `canView` dos ids retornados antes de responder — "belt and suspenders", porque o índice pode estar atrasado).

### 3.7 Cache e limites

- Cache de resposta por `(viewerScope = PUBLICO | companyId, queryHash, cursor)` em Redis, TTL 60 s para `recent` e 5 min para `trending/top`; invalidação por evento de despublicação (purga por `targetId` → chaves que contêm o item ficam marcadas, ou TTL curto). Nunca cachear por usuário algo que dependa só do escopo.
- Rate limit por usuário (`AuthRateLimitFilter` → generalizar): 60 req/min no `GET /api/feed`, 10 req/min com `q` longo; `page_size` ≤ 50; cursor assinado (HMAC) e com validade; sem `offset`.
- Anti-scraping: exigir autenticação; `viewsCount` só incrementa 1×/usuário/dia; `robots: noindex` no feed (itens PUBLICA individuais podem ser indexáveis por decisão do autor); headers `Cache-Control: private`; auditoria de padrões (mesmo usuário > N páginas/minuto → captcha/bloqueio temporário); nenhuma exportação em massa.

---

## 4. Riscos e mitigação

| Risco | Mitigação | Prova |
|---|---|---|
| **Exposição indevida**: item despublicado, voltou a PRIVADA/DEPARTAMENTO, virou RESTRITO/SIGILOSO ou RASCUNHO continua no índice/cache | Evento de domínio AFTER_COMMIT em qualquer mudança de `visibility`, `accessClass`, `state/status`, despublicação e exclusão → job prioritário remove/atualiza o `FeedItem`; **segunda camada** `canView` na leitura; cache TTL curto + purga por item; miniaturas servidas por URL assinada com validade; contadores agregados de faceta só sobre itens elegíveis (não revelar existência por contagem) | Teste **"mudança de visibilidade remove do índice"**: publicar PUBLICA → aparece no feed de conta de outra empresa; mudar para EMPRESA → some para essa conta em ≤ 5 s e continua para a mesma empresa; mudar para PRIVADA → some para todos, inclusive contagens de faceta e cache; despublicar → idem; consulta por `id` direto responde 404 (D-141) |
| **Vazamento de dados de carreira / Hype / emprego** | `FeedItem` não tem campo de carreira; Hype do autor só com `PUBLICO`; `preferredOccupation` nunca sai sem `Visible`; teste de contrato (`lib/social/types.test.ts` lê os `.java`) garante que campos proibidos não entram no DTO | Teste de snapshot do DTO `FeedItemView` contra lista negra (`hype` sem PUBLICO, `careerMoment`, `salary`, `openToWork`, `preferredOccupation` sem opt-in) |
| **Viés para quem publica muito** | Limite de 2 itens/autor/página no `trending`; decaimento temporal; ordenação `recent` como padrão; destaque para `top_validated` e `top_useful` (qualidade institucional) | Fixture com um autor publicando 50 itens: página de `trending` tem ≤ 2 dele |
| **Manipulação de curtidas** | Uma reação por pessoa/alvo (índice único real); ignorar `AUTO_INTERACAO`, contas não verificadas (`NAO_VERIFICADO`) e `ANTIFRAUDE` (RF45.CA03) no `trendingScore`; peso por idade/verificação da conta, não por Hype; detecção de rajadas (N curtidas da mesma origem em T min); recomputar caches a partir de `Reaction` válidas, não incrementar cegamente | Teste: 20 curtidas de contas não verificadas não alteram `trendingScore`; curtida do dono não conta |
| **Conteúdo impróprio / direitos autorais / LGPD** | Nova entidade `ContentReport` (alvo, motivo enum: IMPROPRIO, DADOS_PESSOAIS, DIREITO_AUTORAL, SPAM, OUTRO; relator; estado ABERTA/EM_ANALISE/PROCEDENTE/IMPROCEDENTE; decisão com trilha); curador (RF28.CA03) ou chefe do departamento do item decide; item com ≥ 3 denúncias distintas sai do `trending` até análise (não some do feed `recent`); remoção por LGPD/direito autoral oculta do índice imediatamente e registra `AuditLog`; publicar exige confirmar que anexos de terceiros têm reutilização permitida (REDE_PROFISSIONAL) | Teste: denúncia procedente remove do índice e notifica autor com motivo; improcedente restaura |
| **Acessibilidade do feed** (REDE_PROFISSIONAL CA9) | Lista `<ol>` com `aria-label` (já em `MuralFeed.tsx`), cards com cabeçalho semântico, filtros como `fieldset/legend`, chips removíveis com nome acessível, `aria-live="polite"` ao carregar mais, botão "Carregar mais" além do scroll infinito, foco preservado após paginação, contraste ≥ 4,5:1, ordenação e filtros refletidos na URL (compartilhável, voltar funciona), `prefers-reduced-motion` | Teste axe + navegação só por teclado em `/mural?tab=rede` |
| **Custo/latência OpenSearch indisponível** | Flag `ws.opensearch.enabled`; fallback SQL com mesmas facetas principais; `EmptyState "índice indisponível"` e não erro 500 | Teste com flag off |
| **Scraping em massa** | Login obrigatório, rate limit, cursor assinado, sem offset, `noindex` | Teste de limite: 61ª requisição/min → 429 |

---

## 5. Proposta de requisito

**Nome:** **RF76 — Explorar o Feed da rede Work Station: projetos e tarefas publicados por todas as pessoas, com filtros por categoria, profissão/área, editor, selo, remix, idioma e região, e ordenação por recente, em alta, mais curtidos, mais remixados e mais validados** (numeração sugerida: próximo após RF75; confirmar em `docs/diagramas/CONVENCOES.md`).

**HU76:** *Como pessoa autenticada no Work Station, posso explorar, em uma aba do Mural chamada "Rede", um feed de todos os projetos e tarefas que outras pessoas publicaram como públicos (ou para a minha empresa), filtrando por categoria, área profissional, editor de origem, selo, remixável, idioma, região e outros campos públicos do item, ordenando por recente, em alta, mais curtidos, mais remixados ou mais validados, salvando filtros e seguindo categorias ou áreas, para descobrir trabalhos úteis, aprender com produções publicadas e reutilizar com crédito — sem que nenhum dado privado de perfil, carreira ou Hype de terceiros seja exposto.*

**Aba/rota:** `/mural?tab=rede` (quarta sub-aba ao lado de Mural da empresa · Vitrine · Seguindo; "Minha trilha" do RF75 fica separada); filtros na URL (`/mural?tab=rede&sort=trending&category=ETP&area=ENGENHARIA&cursor=…`); `/mural/filtros` (filtros salvos). Perfis: todos os logados (EMPREGADO, CHEFE, EMPRESA, EM_TRANSICAO); visitante anônimo recebe só o CTA de login (decisão de produto a confirmar).

### 5.1 Critérios de aceite

| CA | Dado / quando / então |
|---|---|
| RF76.CA01 | **Dado** um item (tarefa ou projeto) **quando** o autor o publica por ação explícita com visibilidade PUBLICA e classificação PUBLICO/INTERNO, em estado elegível (tarefa DISPONIVEL/CONCLUIDA/MODELO_PUBLICO; projeto PUBLICADO/EM_DECISAO/APROVADO/EM_EXECUCAO/CONCLUIDO), **então** em até 30 s ele aparece no feed "Rede" para qualquer pessoa autenticada, com a **versão publicada** (não o rascunho), e um item EMPRESA aparece só para pessoas da mesma empresa com o rótulo "sua empresa". |
| RF76.CA02 | **Dado** um item presente no feed **quando** sua visibilidade muda para PRIVADA/DEPARTAMENTO, sua classificação para RESTRITO/SIGILOSO, seu estado para RASCUNHO/ARQUIVADO/BLOQUEADA/DEVOLVIDO, ou ele é despublicado/excluído, **então** ele some do feed, das contagens de faceta e do cache em até 5 s para quem perdeu acesso; a leitura reconfirma `canView` por id antes de responder; abrir o item por URL responde 404 (D-141). Teste automatizado "mudança de visibilidade remove do índice". |
| RF76.CA03 | **Dado** o feed **quando** a pessoa aplica filtros, **então** estão disponíveis: tipo (tarefa/projeto), categoria documental e subcategoria, tipo da tarefa, natureza, processo, área profissional/família de ocupação do item, editor de origem (Letters/Drawings/outro), autor, empresa/órgão (só em publicação institucional), identidade de publicação, intervalo de datas, exercício, estado/fase, competências declaradas, selo validado (emissor, nível, excelência), validado no DECIA, remixável, é remix, gerado com IA, idioma do conteúdo, região (UF/município), formato e classificação; filtros combinam por AND entre facetas e OR dentro da faceta; cada faceta mostra a contagem de itens elegíveis **para o viewer**. |
| RF76.CA04 | **Dado** qualquer filtro ou ordenação **quando** calculado, **então** usa somente atributos **do item** publicado ou campos descobríveis do autor (nome profissional, `verified`, vínculo institucional se publicação institucional); nunca usa perfil de carreira, `preferredOccupation` sem opt-in, HSE, DECIA Points, Hype de terceiros, sinal de emprego ou pretensão salarial (RF75.CA14, D-147); um teste de contrato falha se o DTO `FeedItemView` contiver qualquer desses campos. |
| RF76.CA05 | **Dado** o feed **quando** a pessoa escolhe a ordenação, **então** existem: **recente** (padrão, `publishedAt desc`), **em alta** (score com decaimento temporal sobre reações válidas, salvos, remixes, comentários e visualizações; janelas 24 h / 7 d / 30 d; recalculado por job), **mais curtidos**, **mais remixados** (atores distintos), **mais validados** (selo/decisão validada, nível, excelência) e **mais úteis** (ÚTIL + BEM_FUNDAMENTADO + CONFORME), todas com período (7 d / 30 d / 1 ano / sempre) e tiebreaker por id. |
| RF76.CA06 | **Dado** o cálculo de "em alta", curtidas e úteis **quando** há reações com `ignoredReason` (AUTO_INTERACAO, NAO_VERIFICADO, ANTIFRAUDE) ou repetidas da mesma pessoa, **então** elas não pontuam; uma página de "em alta" tem no máximo 2 itens do mesmo autor; o Hype do autor nunca entra no cálculo. |
| RF76.CA07 | **Dado** o card de um item no feed **quando** exibido, **então** mostra: título, resumo, capa/miniatura, tipo e categoria, autor (com `verified`; "autor não disponível" se o perfil não é visível ao viewer), empresa/órgão quando institucional, data de publicação, estado, área, editor de origem, idioma, região, selos, "remix de…" com crédito à origem, badge remixável, gerado com IA, contadores (curtidas, úteis, comentários, salvos, remixes) e o Hype do autor **apenas** se `hypeVisibility = PUBLICO`; ações do RF26 (curtir, reagir, salvar, compartilhar, remixar, comentar) respeitando `canInteract`. |
| RF76.CA08 | **Dado** a busca textual **quando** a pessoa digita de 2 a 200 caracteres, **então** o servidor busca em título, resumo, descrição, tags, subcategoria e competências, com analisador pt-BR e sinônimos; fora da faixa responde 422 VALIDACAO; o trecho destacado nunca vem de item inelegível. |
| RF76.CA09 | **Dado** o feed **quando** a pessoa salva o conjunto atual de filtros e ordenação, **então** cria um `SavedFilter` (≤ 20 por pessoa, nome obrigatório, privado) acessível em `/mural/filtros`, com opção de digest por e-mail/notificação diário ou semanal; filtros salvos não são visíveis a terceiros. |
| RF76.CA10 | **Dado** uma categoria, área profissional ou família de ocupação **quando** a pessoa escolhe "seguir", **então** novos itens dessa faceta passam a alimentar a aba "Seguindo" e o filtro rápido "o que eu sigo"; seguir tópico não notifica por item (só digest), não concede acesso e é reversível. |
| RF76.CA11 | **Dado** um item ou autor no feed **quando** a pessoa escolhe "ver menos disto", "ocultar item", "ocultar autor no feed" ou define palavras silenciadas, **então** o ajuste vale só para ela, é persistido no servidor, não altera ACL, não notifica o autor e é reversível em `/settings?tab=privacidade`. |
| RF76.CA12 | **Dado** um item no feed **quando** a pessoa denuncia (motivos: impróprio, dados pessoais, direito autoral, spam, outro; texto ≤ 500), **então** um `ContentReport` é criado (uma denúncia por pessoa/item), o curador ou chefe do departamento do item decide com trilha (`AuditLog`); com ≥ 3 denúncias de pessoas distintas o item sai de "em alta" até a análise; denúncia procedente remove o item do índice e notifica o autor com o motivo; improcedente restaura. |
| RF76.CA13 | **Dado** o feed **quando** a pessoa rola ou aciona "Carregar mais", **então** a paginação é por **cursor opaco e assinado** (sem offset), páginas de 20 (máx. 50), cursor válido por 5 min, profundidade máxima 50 páginas; a URL reflete filtros/ordenação e o botão voltar restaura o estado; estados de carregamento, vazio e erro são reais. |
| RF76.CA14 | **Dado** `ws.opensearch.enabled = true` **quando** o feed consulta, **então** usa o índice `ws-feed` com PIT + `search_after`, `aggs` por faceta e filtro `(PUBLICA) OR (EMPRESA AND companyId = viewer)`; com a flag desligada usa `feed_items` materializada no MySQL com keyset pagination e FULLTEXT, mantendo as facetas principais; falha do índice mostra EmptyState "índice indisponível", nunca 500, e nunca bloqueia publicar. |
| RF76.CA15 | **Dado** o `GET /api/feed` **quando** chamado, **então** exige autenticação, aplica rate limit de 60 req/min por pessoa (429 com `Retry-After`), `viewsCount` incrementa no máximo 1× por pessoa/dia, respostas têm `Cache-Control: private` e o feed não é indexável por buscadores. |
| RF76.CA16 | **Dado** a aba "Rede" **quando** avaliada por acessibilidade, **então** lista semântica com `aria-label`, filtros em `fieldset/legend`, chips removíveis nomeados, `aria-live` ao carregar, foco preservado após paginação, operação completa por teclado, contraste ≥ 4,5:1 e respeito a `prefers-reduced-motion`; teste axe sem violações críticas. |

### 5.2 Entidades

| Entidade | Natureza | Campos principais | Observação |
|---|---|---|---|
| `FeedItem` | documento do índice `ws-feed` (OpenSearch) / tabela `feed_items` (MySQL fallback), **derivado**, reconstruível | ver §3.6 (`targetType, targetId, versionId, visibility, accessClass, companyId, state, category, subcategory, type, natureTags, processTags, workArea, occupationFamilyCode, competencies, editorKind, contentLanguage, regionCode, publishIdentity, authorId, orgEntityId, exerciseYear, aiGenerated, isRemix, remixable, sealed, sealTier, excellence, deciaValidated, counters, trendingScore{24h,7d,30d}, publishedAt, updatedAt, indexedAt`) | nunca é fonte de verdade; `PipelineJob INDEXAR_FEED` (novo `PipelineJobType`) |
| `PublicationMetadata` (ou campos em `TaskVersion`/`ProjectVersion`) | domínio | `editorKind` (LETTERS/DRAWINGS/OUTRO), `contentLanguage`, `regionCode`, `occupationFamilyCode`, `competencies[]`, `publishIdentity` (PESSOAL/INSTITUCIONAL), `remixAllowed`, `commentsAllowed`, `publishedAt`, `publishedBy` | preenchido no diálogo "Publicar com consciência" (REDE_PROFISSIONAL) |
| `FeedQuery` | value object (API) | `q, type[], category[], subcategory[], taskType[], nature[], process[], area[], occupation[], editor[], authorId, companyId, orgEntityId, identity, from, to, exerciseYear, state[], phase[], competency[], sealed, sealIssuer, sealTier, excellence, deciaValidated, remixable, isRemix, aiGenerated, lang[], region[], format[], sort, period, cursor, size` | validado (422) e serializável na URL |
| `SavedFilter` | domínio, tabela `saved_filters` | `id, userId, name (≤60), queryJson, digest (NENHUM/DIARIO/SEMANAL), createdAt, lastUsedAt` | privado; ≤ 20 por pessoa; CASCADE no usuário |
| `TopicFollow` (ou extensão de `FollowTargetType`) | domínio | `followerId, topicType (TASK_CATEGORY/WORK_AREA/OCCUPATION_FAMILY), topicCode, status, at` | único por `(follower, topicType, topicCode)` |
| `FeedPreference` | domínio | `userId, hiddenTargets[], hiddenAuthors[], mutedTerms[], topicWeights{code: -1..+1}` | só do dono; sem efeito em ACL |
| `ContentReport` | domínio, `content_reports` | `id, reporterId, targetType, targetId, reason (enum), details (≤500), status (ABERTA/EM_ANALISE/PROCEDENTE/IMPROCEDENTE), decidedBy, decidedAt, decisionNote, auditLogId` | único por `(reporter, target)`; decisão gera `AuditLog` |
| `Reaction` (existente) | domínio | — | fonte das contagens; `ignoredReason` exclui do score |
| `TrendingSnapshot` (opcional) | tabela/índice | `targetType, targetId, window, score, computedAt` | permite auditar "por que está em alta" |

### 5.3 API

```
GET /api/feed
  ?q=&type=TASK,PROJECT&category=ETP,PARECER_TECNICO&subcategory=&taskType=&nature=TECNICA&process=
  &area=ENGENHARIA&occupation=arquitetura-urbanismo&editor=LETTERS,DRAWINGS
  &authorId=&companyId=&orgEntityId=&identity=INSTITUCIONAL
  &from=2026-01-01&to=2026-12-31&exerciseYear=2026&state=MODELO_PUBLICO&phase=
  &competency=orcamento&sealed=true&sealIssuer=EMPRESA&sealTier=&excellence=&deciaValidated=
  &remixable=true&isRemix=&aiGenerated=&lang=pt-BR&region=PR,PR-4106902&format=
  &sort=recent|trending|top_likes|top_remixed|top_validated|top_useful
  &period=24h|7d|30d|1y|all&cursor=<opaco>&size=20
→ 200 { items: FeedItemView[], facets: { category: [{value, count}], area: [...], ... }, nextCursor, appliedFilters, sort, period }
→ 401 NAO_AUTENTICADO · 422 VALIDACAO (q fora de 2–200, size > 50, cursor inválido/expirado, enum desconhecido) · 429 (Retry-After) · 503 INDICE_INDISPONIVEL (com fallback SQL antes)

GET  /api/feed/facets?<mesmos filtros>          → só contagens (para o painel de filtros)
GET  /api/feed/items/{targetType}/{targetId}     → FeedItemView (404 se não elegível para o viewer, D-141)
GET  /api/feed/saved-filters · POST · PUT /{id} · DELETE /{id}
POST /api/feed/topics/follow {topicType, topicCode} · DELETE /api/feed/topics/follow/{topicType}/{topicCode}
GET  /api/feed/preferences · PUT (hiddenTargets, hiddenAuthors, mutedTerms, topicWeights)
POST /api/feed/reports {targetType, targetId, reason, details} → 201 · 409 JA_DENUNCIADO
GET  /api/curation/reports?status= · POST /api/curation/reports/{id}/decide {status, note}   (curador/chefe)
```

`FeedItemView` (DTO): `id, targetType, targetId, title, summary, coverUrl, author{ id|null, displayName, verified, hype|null (só PUBLICO) }, company{ id, name }|null, orgEntity|null, publishIdentity, visibility ("PUBLICA"|"EMPRESA"), state, category, subcategory, type, natureTags, processTags, area, occupationFamily{code,label}|null, editorKind, contentLanguage, region, exerciseYear, aiGenerated, remix{ originalId, originalTitle, originalAuthorDisplay }|null, remixable, seals[{issuer, label, tier, excellence}], deciaValidated, counters{likes, useful, wellFounded, innovative, compliant, comments, saves, remixes}, viewer{ liked, qualitative, saved, following }, publishedAt, updatedAt`. Lista negra testada: `hypeVisibility != PUBLICO → hype null`, nunca `careerProfile`, `preferredOccupation`, `openToWork`, `salary`, `hse`, `points`.

### 5.4 Integrações

| RF | Integração |
|---|---|
| **RF33** (Memória, `ws-memory`) | Mesmo cluster OpenSearch, mesmo `SearchIndexPort`, mesmo `PipelineJob`/`DomainEvents` AFTER_COMMIT; novo índice `ws-feed` sem embeddings; "projetos parecidos" (RF27.CA05/RF33.CA04) pode ser oferecido no card via `MemoryService.similar` só para itens elegíveis; evento de mudança de visibilidade reindexa os dois índices. |
| **RF45 / RF44** (Hype do Perfil / HSE) | Hype do autor no card **somente** se `hypeVisibility = PUBLICO` (RF45.CA06), nunca como filtro/ordenação (RF45.CA08, GUIA §3 "sem ranking de pessoas"); HSE nunca sai da sub-aba do dono. Reações do feed alimentam o Hype do dono do item (RF45.CA04) como já previsto; "em alta" do item é conceito separado (`trendingScore`). |
| **RF16 / RF26 / RF27** (perfil de terceiros, reações, mural) | Card reutiliza `TaskCard/ProjectCard` + barra social do RF26 (`canInteract`); clique no autor leva a `/u/[username]` respeitando `profileVisibility` (`PeopleService.byUsername` real); aba "Rede" entra em `/mural` ao lado das três de RF27; `SearchService`/`SearchIndexPort` de RF27.CA03 compartilhados. |
| **RF46** (mensageria/atribuição) | Ação "Atribuir" só aparece quando `delegatePermission` permite (mesma empresa); itens de outra empresa oferecem só "Propor colaboração"/"Remixar". |
| **RF75** (profissão preferida, CA19) | No diálogo de publicar, a família de ocupação do **item** vem pré-sugerida de `preferredOccupation` **apenas** quando `Visible = true`; a faceta "profissão/área" do feed é do item, nunca do perfil; "Minha trilha" (GUIA §6) é feed separado; nenhum sinal de carreira entra em `FeedItem` (CA14, D-147). Pacotes `contracts/career/occupation-packs/*.json` fornecem rótulos e vocabulário das facetas. |
| **RF28** (curadores) | `CuratorAppointment`/`CuratorScope` é o papel que decide `ContentReport`. |
| **RF40** (Balcão) | `OFERECIDA` e `offeredInCounter` viram badge "no Balcão" (sem filtro próprio na v1). |
| **RF3 / Privacidade** | Preferências do feed e filtros salvos em `/settings?tab=privacidade` com "quem verá? o que muda? vale para itens antigos?" (RF75.CA15). |

### 5.5 Etapas de implementação

| Etapa | Entrega | Provas |
|---|---|---|
| **E1 — Feed real mínimo (SQL)** | `PublicationMetadata` (editorKind, lang, region, identity, remixAllowed) no diálogo de publicar; tabela materializada `feed_items` + `PipelineJob INDEXAR_FEED` com eventos de publicar/despublicar/mudar visibilidade; `GET /api/feed` com facetas categoria/tipo/natureza/área/editor/selo/remixável/idioma/região, ordenações `recent`, `top_likes`, `top_remixed`, `top_validated`, keyset pagination, rate limit, teste "mudança de visibilidade remove do índice", teste de lista negra do DTO; aba `/mural?tab=rede` com filtros na URL, estados reais, a11y (CA16). | duas contas de empresas diferentes + uma anônima; axe; testes `lib/social` estendidos (`feedEligibility`, `trendingScore` puro em TS espelhando o Java determinístico, D-12) |
| **E2 — Em alta, controle do usuário e moderação** | `trendingScore` com decaimento e reações válidas (job 15 min), limite 2/autor/página, `top_useful`; `SavedFilter` + digest; `TopicFollow` (categoria/área/família) na aba Seguindo; `FeedPreference` (ocultar, ver menos, palavras); `ContentReport` + fila do curador + `AuditLog`; `viewsCount` 1×/dia. | testes antifraude (CA06), denúncia (CA12), filtros salvos (CA09), seguir tópico (CA10) |
| **E3 — OpenSearch, busca e competências/ocupação** | Índice `ws-feed` com `aggs`, PIT + `search_after`, analisador pt-BR e sinônimos, fallback SQL por flag; `occupationFamilyCode` e `competencies` do item ligados a `contracts/career` (RF75.CA19) com pré-sugestão só com opt-in; "parecidos" via RF33; cache Redis por escopo; painel de curadoria com métricas (denúncias por motivo, tempo de decisão). | teste de paridade SQL × OpenSearch (mesmos ids para a mesma `FeedQuery`), teste de falha do índice (CA14), carga (p95 < 300 ms em 100 k itens) |

### 5.6 Perguntas em aberto para o dono do produto

1. Visitante anônimo vê a aba "Rede" (PUBLICA é legível por `canView`) ou só pessoas autenticadas (recomendado, por rate limit e anti-scraping)?
2. "Filtro por hype" significa **item em alta** (proposto) ou **Hype do autor**? A segunda leitura conflita com RF45.CA08/GUIA §3 e é desaconselhada.
3. Região e idioma são do **item** (declarados ao publicar) — confirmar que nunca serão inferidos do perfil.
4. Numeração RF76 e criação de `docs/diagramas/RF76/README.md` seguindo `CONVENCOES.md`.
5. Itens EMPRESA no feed global: rotulados "sua empresa" na mesma lista ou em filtro "Minha rede" separado (REDE_PROFISSIONAL sugere separar "Minha empresa" de "Descobrir")?
