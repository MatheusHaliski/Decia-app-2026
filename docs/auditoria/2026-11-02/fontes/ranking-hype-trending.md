# Aba da Profissão — ranking, hype, status e tarefas em alta por profissão

**Frente:** ranking, hype, status e "tarefas em alta" por profissão · **Data:** 2026-11-02 · **Status:** pesquisa para decisão do dono · **Repositório lido, nada modificado.**

Convenções: o que vem marcado **[proposta]** é meu; o resto cita `arquivo:linha` ou URL com data de acesso. **"não conferido"** marca o que não foi confirmado na fonte primária (vários sites — `stackoverflow.com`, `kaggle.com`, `lichess.org`, `codeforces.com`, `imsglobal.org`, `support.strava.com`, `news.ycombinator.com` — não resolvem na rede desta sessão; usei resumos de busca e fontes secundárias). Abreviações: **WS** = Work Station; **DP** = DECIA Points; **PET** = Pontuação de Evidências da Temporada (nome **[proposta]**).

**Ideia em uma frase:** a pessoa que escolheu "Desenvolvimento de software" como profissão preferida (RF75.CA19) ganha uma aba **"Minha profissão"** com (a) um **ranking sazonal, opt-in, pseudonimizável, calculado só sobre evidências validadas por humanos**, (b) **níveis e selos** da profissão exportáveis como Open Badge 3.0, e (c) **"em alta na profissão"**: tarefas-guia, modelos do Balcão e peças públicas com mais aceites, conclusões, remixes com crédito e validações numa janela com decaimento — tudo com "por que está aqui" e com o aviso fixo **"isto não mede empregabilidade"**.

---

## 1. Benchmark (13 referências)

| # | Referência | Como pontua | Visibilidade | Decaimento / sazonalidade | Antifraude | Efeitos negativos conhecidos → mitigação | Fonte (acesso 2026-11-02) |
|---|---|---|---|---|---|---|---|
| 1 | **Stack Overflow** (reputação, badges) | Voto positivo em pergunta/resposta +10; resposta aceita +15; aceitar própria resposta +2; **teto diário de 200** por votos (aceites e recompensas fora do teto); reputação destrava privilégios; badges bronze/prata/ouro por ações | Pública, nominal, sem opt-out | Sem decaimento: reputação é vitalícia (houve recálculo único em 2010) | Reversão de votos em fraude devolve a reputação; detecção de "serial voting" (não conferido na página pública atual) | Corrida por volume, "fastest gun" (resposta rápida ganha mais), hostilidade com novatos; mitigação: teto diário, aceite fora do teto, badges por comportamento (ex.: editar, revisar) | [stackoverflowteams.com/help/whats-reputation](https://stackoverflowteams.com/help/whats-reputation); [support.stackenterprise.co … reputation-and-voting](https://support.stackenterprise.co/support/solutions/articles/22000294430-reputation-and-voting); [blog 2008 teto diário](https://stackoverflow.blog/2008/12/31/daily-dose-of-daily-reputation-ca/) |
| 2 | **Kaggle** (tiers, medalhas) | 5 tiers (Novice → Contributor → Expert → Master → Grandmaster) **por categoria separada** (Competições, Datasets, Notebooks, Discussões); medalhas bronze/prata/ouro por posição em competição ou por votos; ex.: Grandmaster em Competições = 5 ouros incl. 1 solo; Discussões: Expert 50 bronzes, Master 50 pratas + 200, Grandmaster 50 ouros + 500 (números de fontes secundárias) | Pública, nominal | Sem decaimento do tier; medalhas de competição vitalícias | Regras de votos de Novices não contarem e de auto-voto: **não conferido** (página oficial inacessível) | "Farm" de upvotes em notebooks copiados, times de conveniência; mitigação: tier por categoria (não mistura competência com popularidade), exigência de ouro **solo** | [Wikipedia — Kaggle](https://en.wikipedia.org/wiki/Kaggle); [pin.com — find data science talent](https://www.pin.com/blog/find-data-science-talent-kaggle); [ds-econ — It's exclusive at the top](https://ds-econ.netlify.app/2020/02/10/grandmaster) |
| 3 | **Duolingo** (ligas semanais) | XP da semana numa **coorte aleatória de ~30 pessoas**; top sobe de liga, fundo cai (nº exato varia por liga; "24º ou pior cai" **não conferido**); ~10 ligas Bronze → Diamante (nomes variam nas fontes) | Pública dentro da coorte, nome e avatar; não há opt-out total (só ocultar perfil) | **Reinício semanal** (segunda 00:00 UTC, não conferido); rebaixamento ativo | Sem detalhes públicos | Ansiedade de rebaixamento, "XP farming" em lições fáceis, streak como pressão; mitigação observada: coortes pequenas (top alcançável), zona neutra entre promoção e rebaixamento | [themarysue — Duolingo leagues explained](https://themarysue.com/all-duolingo-leagues-explained); [deconstructoroffun — leagues](https://duolingo.deconstructoroffun.com/mechanics/leagues); [Substack — When a demotion is helpful](https://melisalw.substack.com/p/when-a-demotion-is-helpful) |
| 4 | **GitHub** (trending, stars, contribuições) | Trending por **velocidade de estrelas** no período (dia/semana/mês), por linguagem; grafo de contribuições (commits/PRs/issues por dia) no perfil | Pública; contribuições privadas podem ser **ocultadas ou contadas anonimamente** (opt-in do usuário) | Janela deslizante (1/7/30 dias) — pura sazonalidade, sem acumular | Fórmula oficial **não publicada**; sem API oficial de trending | "Star farming", repositórios de lista (awesome-*) dominam; mitigação: filtro por linguagem e período curto | [apify — GitHub trending scraper (descreve períodos)](https://apify.com/samwise.agency/github-trending); [trendshift.io](https://trendshift.io/repositories/3207) |
| 5 | **Behance / Dribbble** (destaques, curadoria) | **Curadoria humana**: equipe revisa todo projeto publicado e escolhe os da aba Discover; critério declarado = qualidade, inovação, contribuição ao campo; badge no projeto destacado; sem rubrica pública | Pública; qualquer plano pode ser destacado | Sem decaimento; galerias curadas por categoria | Curadores não re-revisam edições (publique pronto) | Opacidade ("por que não fui destacado?"), favorecimento de estilos; mitigação: dicas públicas, créditos obrigatórios a colaboradores | [help.behance.net — Discover](https://help.behance.net/hc/en-us/articles/204484044-Guide-Discover-Creative-Work-on-Behance); [Behance blog — curation philosophy](https://medium.com/behance-blog/behance-curation-philosophy-and-approach-6e0ae9ab350f); [blog — how to get featured](https://www.behance.net/blog/how-to-get-featured-on-behance) |
| 6 | **Strava** (segmentos, clubes) | Ranking por tempo em segmento (KOM/QOM), filtros hoje/semana/seguindo/clube/idade/peso; **Local Legend** = quem mais completou o segmento em **90 dias rolantes**, independente de velocidade | Só aparece quem deixa a atividade "visível a todos"; **zonas de privacidade** excluem do ranking; opt-out de Local Legends em Privacidade; leaderboards completos só para assinantes (desde 2020) | Janela 90 d (Local Legend); filtros temporais | Sinalização ("flag") de atividade suspeita retira do ranking | Risco à segurança (rotas de casa), "KOM hunting", trapaça com veículo; mitigação: zonas de privacidade, flag comunitário, ranking por esforço (Local Legend) | [support.strava.com — Local Legends](https://support.strava.com/hc/articles/360043099552-Local-Legends); [DC Rainmaker — Legends](https://dcrainmaker.com/2020/06/strava-legends-feature.html); [laka — privacy zones](https://laka.co/gb/blog/all/strava-privacy-zones-everything-you-need-to-know); [triathlete — leaderboards na assinatura](https://www.triathlete.com/gear/tech-wearables/strava-moves-segment-leaderboards-route-builder-to-subscription/) |
| 7 | **Lichess / Chess.com** (Elo por modalidade) | Glicko-2 (Lichess, implementação parcial): rating + **desvio (RD)**; começa 1500 com RD 350; **"?" provisório** enquanto RD ≥ 110; **rating separado por variante e controle de tempo** | Pública, nominal; Lichess permite fechar perfil | RD cresce com inatividade (no Glicko-2 pleno; no Lichess "RDs não envelhecem" segundo fórum — não conferido) | Detecção de engine, boosting e sandbagging (Chess.com: **não conferido**) | Obsessão pelo número, medo de jogar partidas valendo rating; mitigação: partidas casuais sem rating, incerteza explícita (RD) | [lichess forum — rating deviation](https://lichess.org/forum/general-chess-discussion/how-is-the-rating-deviation-calculated); [lichess forum — "?" após rating](https://lichess.org/forum/general-chess-discussion/what-does-a-question-mark-after-a-rating-mean); [blog — Lichess ratings are not Glicko-2](https://lichess.org/@/Toadofsky/blog/lichess-ratings-are-not-glicko-2/x1bpwn38) |
| 8 | **LeetCode contests** | Rating por contest (2020: pareamento 1×1 Elo-like inspirado no Codeforces; a literatura lista o LeetCode como adotante do **Elo-MMR** bayesiano — fontes conflitam, não conferido); só quem submete tem rating atualizado; ausência penaliza (ex. ×0,97) | Pública, nominal; badges anuais | Sem reinício; ranking global contínuo | Plágio em contests → anulação (não conferido) | Trapaça por soluções copiadas, "rating anxiety" que inibe participar; mitigação: só atualiza quem participa, badges por participação | [leetcode discuss — New Contest Rating Algorithm](https://leetcode.com/discuss/general-discussion/468851/New-Contest-Rating-Algorithm-It's-HERE!/); [arXiv 2101.00400 — Elo-MMR](https://pdf.arxiv.org/pdf/2101.00400); [CodeChef adota Elo-MMR](https://discuss.codechef.com/t/elo-mmr-ratings-go-live-on-codechef/102184) |
| 9 | **Codeforces ratings** | Generalização do Elo a N participantes: calcula o **seed** (colocação esperada = Σ probabilidades 1/(1+10^((r_o−r)/400))) e move o rating pela diferença colocação real × seed; expectativa de variação zero para quem está "justo"; cores/títulos por faixa; novatos têm rating exibido ajustado nos 6 primeiros contests | Pública, nominal | Sem decaimento | Contas múltiplas e trapaça → anulação (regras do site; não conferido) | Pressão por cor, "smurfing"; mitigação: divisões por faixa (Div. 1/2/3/4) | [codeforces — Open Codeforces Rating System (2015)](https://codeforces.com/blog/entry/20762); [codeforces — rating system](https://codeforces.com/blog/entry/102); [codeforces — revolução de cores](https://codeforces.com/blog/entry/68288) |
| 10 | **Product Hunt** (ranking diário) | Ranking do dia por upvotes, tempo desde o envio, comentários "e outros fatores"; votos de usuários com histórico pesam mais (não conferido); **janela aleatória de 2 h** no início do dia em que a ordem é embaralhada antes de os votos "travarem" | Pública | Reinício **diário**; "produto do dia/semana/mês" | Fórmula propositalmente não publicada "para não ser jogada" | Mobilização artificial de votos, viés para quem tem audiência; mitigação: randomização inicial, peso por reputação do votante | [producthunt — randomized leaderboard day](https://www.producthunt.com/p/producthunt/introducing-randomized-leaderboard-day-on-product-hunt?page=2); [changelog abr/2023](https://www.producthunt.com/p/general/changelog-april-20-2023-release-notes-extended-leaderboard-randomization); [discussão sobre o algoritmo](https://www.producthunt.com/p/general/how-does-the-ph-homepage-algorithm-actually-balance-the-sheer-volume-of-daily-launches) |
| 11 | **Reddit / Hacker News** (hot) | Reddit (código aberto até 2014): `hot = log10(max(|ups−downs|,1)) + sign·(t − 1134028003)/45000` — log amortece votos (os 10 primeiros valem como os 100 seguintes) e cada 12,5 h de idade equivale a ×10 votos; HN: `pontos/(idade+2)^gravidade` com penalidades e flags (página de FAQ inacessível — não conferido nesta sessão) | Pública; votos individuais não visíveis | Decaimento temporal embutido; nada fica "em alta" para sempre | HN: detecção de "voting rings"; Reddit: vote fuzzing | Mob, brigading, viés de horário de publicação; mitigação: log de votos, penalidades por flag, pesos por idade da conta | [evanmiller — Deriving the Reddit formula](https://www.evanmiller.org/deriving-the-reddit-formula.html); [coderwall — Reddit hot](https://coderwall.com/p/cacyhw); [socialboostdigital — Reddit ranking 2026](https://socialboostdigital.com/blog/reddit-ranking-algorithm-2026) |
| 12 | **Steam / Xbox** (conquistas) | Xbox: cada conquista tem Gamerscore fixo definido pelo desenvolvedor (1.000 G por jogo + 1.000 a cada 6 meses); **nunca reseta**; Steam: conquistas com **% de jogadores que desbloquearam** (raridade: Comum → Ultra Raro) | Pública ou privada por configuração do perfil | Sem decaimento; raridade muda com a base | — | "Achievement hunting" com jogos de 1.000 G fáceis; mitigação: raridade relativa (Steam) mostra o que é difícil de verdade | [learn.microsoft — title-managed achievements](https://learn.microsoft.com/en-us/gaming/xbox-live/achievements-2017/achievements); [digitaltrends — Xbox achievements](https://digitaltrends.com/gaming/xbox-achievements-everything-you-need-to-know); [exophase — raridade Steam](https://www.exophase.com/game/thief-steam/achievements/kr/) |
| 13 | **Credly / Open Badges** | Badge = credencial verificável emitida por **instituição**, com critérios e evidências; aceitação é passo separado do titular; expiração definida pelo emissor (ex.: PayrollOrg expira com a certificação; SHSMD não expira); renovação estende validade; metadados embutidos na imagem; compatível com Open Badges (1EdTech) | Titular escolhe aceitar, publicar e onde exibir | Expiração por política do emissor; revogação | Verificação na plataforma do emissor; **Open Badges 3.0** = W3C Verifiable Credentials (`AchievementCredential`, `Achievement.criteria`, `evidence`, `issuer`, `credentialStatus` para revogação; compartilha modelo com CLR 2.0) — **não conferido** nesta sessão na especificação | Badges "de participação" sem valor; mitigação: critérios e evidências públicos no badge | [cdrnet — digital credential FAQ](https://www.cdrnet.org/digitalcredentialfaq); [SHSMD — badge FAQ](https://www.shsmd.org/education/digital-badge-faq); [PayrollOrg — digital badges](https://www.payroll.org/certification/digital-badges); [1EdTech — OB 3.0 spec](https://www.imsglobal.org/spec/ob/v3p0) |

**Pesquisa sobre efeitos negativos de leaderboards** (acesso 2026-11-02): revisão de Toda et al. aponta leaderboards como o elemento mais associado a efeitos negativos em gamificação educacional ([Springer — The dark side of gamification](https://www.springerprofessional.de/en/the-dark-side-of-gamification-an-overview-of-negative-effects-of/16000882)); estudo de 2024 com leaderboard infinito em jogo de matemática: pessoas com ansiedade matemática gostaram menos do leaderboard **mesmo controlando a posição** ([GaLA Conf 2020 — leaderboard](https://trepo.tuni.fi/bitstream/10024/130150/1/GaLA_Conf_2020_paper_leaderboard.pdf); [Galway — player traits and leaderboard](https://research.universityofgalway.ie/en/publications/exploring-the-impact-of-player-traits-on-the-leaderboard-experien/)); MDPI 2021 registra a lacuna de estudos sobre leaderboards e estresse percebido ([mdpi.com/2071-1050/13/12/6608](https://mdpi.com/2071-1050/13/12/6608)). Tamanhos de efeito **não conferidos**.

### 1.1 O que levo do benchmark para o WS **[proposta]**

1. **Separar dimensões** (Kaggle por categoria, Lichess por variante): o ranking da profissão não mistura competência validada com popularidade; cada profissão tem seu próprio quadro e cada competência do pacote é uma "modalidade".
2. **Teto diário e fatos verificáveis** (Stack Overflow): só conta o que um humano validou; teto por período evita corrida de volume (coerente com RF43.CA05 "nunca volume bruto").
3. **Coortes pequenas e temporadas** (Duolingo, Product Hunt): grupos de ≤ 30 pessoas de nível parecido tornam o topo alcançável; a temporada reinicia e ninguém "fica para trás para sempre". **Sem rebaixamento punitivo**: ligas são por nível validado, não por XP semanal.
4. **Incerteza explícita** (Glicko-2 "?"): posição com poucas evidências aparece como provisória, com `minSamples` (RF43.CA15).
5. **Opt-in, zonas de privacidade e flag** (Strava, GitHub contribuições privadas): aparecer é escolha; "zona de privacidade" do WS = **minha empresa nunca me vê no ranking**.
6. **Curadoria humana sobre algoritmo transparente** (Behance + RF35.CA03): pessoas e peças em destaque passam por curador; o algoritmo só propõe.
7. **Decaimento temporal** (Reddit/HN) para "em alta", **raridade** (Steam) para selos ("3 % das pessoas da profissão têm este selo").
8. **Credencial portátil** (Open Badges 3.0): o status pertence à pessoa, sai do WS com ela e não depende da empresa.

---

## 2. O que o Work Station já tem e as regras que limitam

### 2.1 Inventário (lido no repositório)

| Peça | Onde | O que já define | Como entra na aba da profissão |
|---|---|---|---|
| **Profissão preferida** | `docs/diagramas/RF75/README.md:37` (CA19); `contracts/career/README.md`; `contracts/career/occupation-packs/generico.json` (único pacote no repo; `status: revisado`) | `User.preferredOccupation{Code,Label,Visible}`: código CBO/ESCO + rótulo, **opcional, privado por padrão**; `OccupationPack` com competências, tarefas-guia L1–L10/D1–D10 parametrizadas, rubrica, vizinhos; "nunca aparece a terceiros sem opt-in e nunca é sinal de busca (D-147)". Pacotes previstos (E4): Arquitetura, Eng. Civil, Direito, Administração, Dev. de Software, Design, Contabilidade, genérico | Escopo da aba. Entrar no ranking com nome real **revela a profissão** aos demais participantes → o opt-in tem de dizer isso (ver §2.3) |
| **Selo de competência** | `RF75/README.md:25` (CA07), `:97` (UC7), `:126` (E5); `GUIA_DE_CARREIRA.md` §7 e §3.7–3.8 | `Evidence` (URL da peça, versão, critérios, autoria, sem dado confidencial) → **selo só com validação humana** (par, mentor ou curador) → exportável como **Open Badge 3.0**; rubrica aproxima/atende/supera; IA pré-checa só critérios objetivos | **Unidade básica do ranking**: só evidências com selo validado pontuam |
| **Chancelas** | `RF39/README.md:1` | EMPRESA/CHEFE chancelam tarefa/projeto/plano (`SealBond` APROVADA / APROVADA_PRIVADA / REVOGADA); CURADOR opera a fila | Conta como evidência validada **só se a pessoa publicar a peça** e com peso menor que o selo de competência (chancela é contexto de empregador) |
| **Selo de conformidade** | `RF32/README.md:5` | `ProjectScheme.conformityPercent` — selo % no card | Não entra (é do projeto, não da pessoa) |
| **Reconhecimentos / Destaques** | `RF35/README.md:1-2,527-529` | `Recognition` (medalha, critério, validade), `Highlight.algorithmScoreJson/curatedBy/position` — "Destaques do mês" **propostos por algoritmo transparente e curados** por EMPRESA/CHEFE/CURADOR; medalhas em `/profile?tab=reconhecimentos` | Padrão a reutilizar para "pessoas em destaque" e "peças em destaque" por profissão (curadoria sobre proposta algorítmica) |
| **DECIA Points** | `docs/produto/DECIA_POINTS.md` §2.3, §6, §7.1; `RF42/README.md` | Moeda única; ledger idempotente; 3 origens (objetivo/chancela/DECIA); `AntiFraudService` com escada ignorar → SUSPENSO → estorno; P-19 pergunta se o ranking `DECIA_POINTS` deve excluir origem DECIA | **DP não entra no ranking da profissão** (moeda compra status = pay-to-win; e 60 % da renda de DP vem de contexto de empregador). Reuso: `AntiFraudService`, escada de resposta, `audit_log` |
| **Ranking de usuários** | `RF43/README.md:5,62-64,151-154,269-333,757` | `RankingService.compute(scope, scopeId, period)`, `RankingEntry(scope, periodKey, dimension, value, position, explanationJson)`, `RankingDimension` {QUALIDADE_DELIBERATIVA, DECIA_POINTS, REUTILIZACAO, RASTRO_CONFORMIDADE, PONTUALIDADE_SPI, HSE_MEDIO, HYPE_PERFIL}, `RankingWeights` públicos com vigência, `User.rankingOptOut` (**existe no main**), "Explique minha posição", página "Como o ranking é calculado"; **CA05: nunca volume bruto de mensagens**; "nada vira ranking oficial sem confirmação humana" | Infraestrutura a estender: novo `scope = PROFISSAO`, nova dimensão `EVIDENCIAS_VALIDADAS`; **opt-out não basta → exige opt-in** |
| **Hype Score de Eficiência (HSE)** | `RF44/README.md:5` | 0–100 previsto × realizado da Tarefa do Dia, pesos por EMPRESA | **Não entra**: mede eficiência no contexto do empregador (prazo, SPI); levaria dados do chefe ao ranking |
| **Hype Score do Perfil** | `RF45/README.md:1,5,534-547` | 0–1000, 5 blocos (25 % reconhecimento social), bayesiano, meia-vida 180 d, PageRank de quem reage, `HypeVisibility` PUBLICO/EMPRESA/**SO_EU (padrão, existe no main)**; CA08: ranking `HYPE_PERFIL` nunca expõe SO_EU; CA10: dashboard só histograma anonimizado; política LGPD "não instrumento disciplinar" | **Não entra** no ranking da profissão (RF50.CA12 proíbe Hype/pontos/popularidade como medida de potencial profissional). Reuso: ideia de banda, meia-vida, antifraude compartilhado, `HypeIgnoredEvent` |
| **Balcão de Modelos** | `RF40/README.md:48-54,533-537` | Prateleiras Chancelados · Comunidade; ordenação por remixes/reações/recentes; `ModelOffer.viewsCount/remixCount/pointsEarned`; `Remix` com crédito imutável (licença ATRIBUICAO); CA07: chefe destaca modelo para chancela | Fonte dos "modelos em alta" por profissão |
| **Interações sociais** | `RF19/README.md:7,18-19,307,366` | `Reaction` CURTIR + 4 reações qualitativas (BEM_FUNDAMENTADO, CONFORME…), `Remix` com `originalId` e crédito, contadores | Só **remix com crédito** e **reação qualitativa de perfil verificado** entram no trending; curtida pura **não** |
| **Mural** | `RF27/README.md:1`; `ABAS_POR_PERFIL.md:32` | Vitrine de projetos; a "passarela" do FAI com Top 100/Em alta foi mapeada para a Vitrine sem 3D | A aba da profissão é uma visão da Vitrine filtrada pelo pacote |
| **Insights › Ranking** | `ABAS_POR_PERFIL.md:104,217`; `MATRIZ_PAGINAS_ABAS.md:73` | Sub-aba `ranking` em `/insights` (RF43), opt-out + "Explique minha posição" | Ponto de entrada alternativo; a aba principal fica no perfil (`/profile?tab=profissao`) **[proposta]** |

**Correção de referência:** o pedido cita "RF24/RF25/RF40" como RFs de selos (e `RF75/README.md:111` repete essa referência). No repositório, **RF24** é "metas & objetivos da equipe", **RF25** é "Programas, Exercícios e Gestões" e **RF40** é o Balcão. Os RFs que tratam de selos são **RF75.CA07** (selo de competência, Open Badge 3.0), **RF39** (chancelas), **RF35** (Reconhecimentos/medalhas) e **RF32** (selo de conformidade do projeto); RF51 usa "selo" em outro sentido (heurística × IA real). Sugiro corrigir a linha 111 do RF75.

### 2.2 Regras que delimitam (não negociáveis nesta proposta)

| Regra | Fonte | Consequência para a aba |
|---|---|---|
| Popularidade ≠ qualidade; não fundamenta recomendação de carreira, avaliação de desempenho ou prioridade institucional | `REDE_PROFISSIONAL_VISIBILIDADE.md` "O que a rede deve promover"; última linha: "entregar o contrato de seguir/publicar/interagir/remixar **antes** de usar essas ações como sinal de recomendação ou recompensa" | Curtidas e seguidores fora do ranking; trending social só com remix creditado, validação humana e reação qualitativa verificada — e **só depois** de o contrato social (RF19/RF27) estar real |
| Sem score de empregabilidade; progresso por evidência ("3 de 5 critérios") | `GUIA_DE_CARREIRA.md` §3.7; `contracts/career/README.md` "Progresso por evidência, nunca score" | O ranking não é "nota da pessoa": é **contagem ponderada de evidências validadas na temporada**, sempre decomposta; aviso fixo em toda tela |
| Sem Hype, pontos ou popularidade como medida de potencial profissional; sem classificação automática de empregabilidade | `RF50/README.md:36,42` (CA06, CA12) | PET não usa Hype, DP, HSE nem curtidas; a Análise de Perfil (RF50) **não lê** a posição no ranking |
| Sem sinal de busca de emprego; profissão preferida privada; Em transição aparece como pessoa comum; empresa nunca recebe sinal | D-147 (`RF75/README.md:13`; `GUIA_DE_CARREIRA.md:27,60`) | Participar não revela tipo de conta nem momento; ranking **invisível para contas EMPRESA e para chefe/colegas da mesma empresa** (zona de privacidade), sem filtro "disponível" |
| Ranking: dimensões separadas, pesos públicos, opt-out, "Explique minha posição", nunca volume bruto; nada vira ranking oficial sem confirmação humana | RF43.CA05 (`RF43/README.md:5,757`) | Reuso do `RankingService`; o ranking da profissão é "não oficial" por definição: sem efeito em avaliação, chancela ou DP |
| Hype SO_EU nunca exposto; dashboards só com histograma anonimizado, nunca lista nominal | RF45.CA06/CA08/CA10 | Mesmo padrão: painéis de EMPRESA/ADMIN sobre a aba da profissão mostram só agregados anonimizados |
| LGPD art. 20 (revisão de decisão automatizada), art. 5º II / art. 11 (dados sensíveis), Lei 9.029/1995 | `GUIA_DE_CARREIRA.md` §3.6–3.7; `generico.json › scope.regulation` | "Contestar" em toda posição/selo; nenhuma segmentação por idade, sexo, etc.; `DataSubjectRequest` target novo `RANKING_PROFISSAO` |
| IA só interpreta números calculados pelo sistema (D-12) | `RF43/README.md:5` | PET, trending e níveis são **serviços determinísticos** com `MetricDefinition`; a IA só redige "por que está em alta" ✦ |

### 2.3 Como o ranking por profissão pode existir sem violar isso **[proposta]**

1. **Opt-in explícito por temporada**, nunca herdado de `rankingOptOut=false`. O diálogo diz: "Ao entrar, as outras pessoas desta profissão que também participam verão seu nome (ou pseudônimo) e suas evidências públicas. Sua empresa, seu chefe e contas EMPRESA não veem este ranking. Isto não mede empregabilidade." Três perguntas-padrão da `REDE_PROFISSIONAL_VISIBILIDADE.md` ("quem verá?", "o que muda?", "vale para itens antigos?") respondidas.
2. **Pseudônimo opcional** (`LeaderboardParticipation.displayMode` NOME · PSEUDONIMO · SO_EU). Pseudônimo é escolhido pela pessoa, estável na temporada, sem avatar real; a peça vinculada à posição só abre se a própria peça for pública **e** a pessoa marcar "ligar peças ao pseudônimo" (senão só título do critério e nível). `SO_EU` = calcula e mostra só para a pessoa ("você estaria em 12º de 48").
3. **Zona de privacidade institucional** (Strava): a API **omite** as entradas de quem tem vínculo vigente na mesma empresa do espectador, exceto se a pessoa optar por "colegas podem me ver" (padrão desligado). Contas EMPRESA: `403`/omissão, como RF45.CA06. CHEFE vê a aba só como pessoa (sua profissão), com a mesma omissão. Nunca há endpoint de lista nominal para dashboards (RF45.CA10).
4. **Sazonal**: temporadas de **12 semanas** (`ProfessionSeason`), reinício do PET a cada temporada; o que fica entre temporadas são **selos** (vitalícios, revogáveis) e **níveis** (§4). Nada "cai": sem rebaixamento; a liga é por nível validado.
5. **Só evidência validada por humano**: selo de competência (RF75.CA07) com rubrica; revisão crítica (L10) **recebida e aceita**; remix creditado **validado** pelo autor remixado ("esta derivação melhorou a peça"); chancela de peça **pública**. Nada de curtidas, seguidores, DP, Hype, HSE, mensagens.
6. **Teto por período e `minSamples`**: no máximo **3 evidências/semana** contam (o resto fica, mas não pontua na temporada — tipo teto diário do Stack Overflow); menos de **3 evidências** na temporada = posição "provisória" (`?`, Glicko) e fora do top 10.
7. **"Não mede empregabilidade"** fixo em toda tela, em linguagem simples (RF75.CA18): "Este quadro conta evidências validadas nesta temporada. Não é nota, não prevê contratação e nenhuma empresa o vê."
8. **Direito de sair e de apagar**: sair a qualquer momento apaga as entradas da temporada corrente e o histórico de posições (`LeaderboardEntry` da pessoa são excluídas, não anonimizadas — posições não são evidência de nada); os **selos** permanecem no perfil privado de carreira (são da pessoa) e podem ser apagados separadamente; `DataSubjectRequest` cobre exportação e exclusão (RF3).
9. **Explicabilidade e contestação**: "Explique minha posição" decompõe por evidência (RF43.CA05); "Contestar" abre revisão humana (LGPD art. 20); pesos públicos e versionados (`RankingWeights`).
10. **Ranking "não oficial" por construção**: não alimenta DP, chancela, avaliação, Análise de Perfil (RF50), pessoas semelhantes nem recomendação de vaga; `MetricDefinition` da PET leva `proxyNote` "não representa competência global".

---

## 3. "Tarefas em alta" por profissão

### 3.1 O que é "um item" e quais sinais contam **[proposta]**

Itens de três tipos, todos filtrados pelo `OccupationPack` da pessoa (`templateCodes`, competências, `fields`):

| Tipo | Origem | Sinais que contam (janela) | Sinais que **não** contam |
|---|---|---|---|
| **Tarefa-guia** L1–L10 / D1–D10 parametrizada pelo pacote (ex.: Dev → L4 relatório técnico, D4 diagrama, D9 wireframe) | `guided_task_templates` (RF75 E4) | **aceites** (pessoa iniciou a tarefa-guia: peso 1), **conclusões com evidência** (peso 3), **validações humanas** do selo (peso 5), **revisões L10 recebidas** (peso 2) | dispensas ("não serve para mim"), visualizações |
| **Modelo do Balcão** (RF40) | `ModelOffer` com tag de profissão/pacote | **remixes com crédito** (peso 3), remix validado pelo autor original (peso 2 extra), chancela recebida por derivado (peso 4), reação qualitativa BEM_FUNDAMENTADO/CONFORME de perfil verificado (peso 1, teto 10/dia/item — RF42 #18) | curtidas, `viewsCount`, `pointsEarned` (DP) |
| **Peça pública** (Letter/Drawing publicada, RF19/RF27) | publicação opt-in (f5) | remix com crédito (3), revisão crítica L10 (2), validação/selo (5), reação qualitativa verificada (1) | curtidas, salvos, compartilhamentos, seguidores do autor |

Pesos são `RankingWeights`-like públicos (`TrendingWeights`, versionados, editáveis por ADMIN; EMPRESA **não** edita — é escopo de profissão, não de empresa).

### 3.2 Fórmula **[proposta]** (determinística, `MetricDefinition TRENDING_PROFISSAO`)

Estilo Hacker News (há só sinais positivos; o log do Reddit serve para amortecer):

```
hot(item, t) = Σ_eventos  w(evento) · f_autor(evento)          ← soma ponderada na janela
               -----------------------------------------------
                           (idade_horas(item) + 2) ^ g

com:  janela = 7 dias (aba "esta semana") ou 30 dias (aba "este mês")
      g      = 1,5 (7 d) · 1,2 (30 d)         ← meia-vida ≈ 2,5 d / 6 d no 7 d / 30 d
      idade  = horas desde a publicação/oferta do item (não desde o primeiro evento)
      f_autor = 1 / (1 + log2(1 + N_itens_do_autor_na_janela))   ← penaliza quem publica muito (viés de volume)
      amortecimento: cada classe de evento entra como log2(1 + contagem) antes do peso   ← 10 remixes ≠ 10× 1 remix
```

Regras complementares:
- **Mínimo de amostra**: item entra em "em alta" só com ≥ 3 eventos de ≥ 3 pessoas distintas (RF43.CA15 `minSamples`); abaixo, aparece em "novidades" (ordem cronológica, como `new`).
- **Taxa de conclusão com limite inferior de Wilson** (95 %) para tarefas-guia: evita que uma tarefa com 2 conclusões em 2 aceites supere outra com 40 em 60.
- **Teto por autor no top N**: no máximo **2 itens do mesmo autor** no top 10 (Product Hunt/HN penalizam concentração); o excedente aparece em "mais deste autor".
- **Novatos**: bônus ×1,2 para itens de autor com ≤ 3 itens publicados **na vida** (não na janela), visível na explicação ("primeira publicação do autor") — combate viés de quem já tem audiência.
- **Diversidade de competências**: o top 10 reserva ao menos 1 vaga por competência núcleo do pacote com itens elegíveis (round-robin após o ranking bruto) para não virar "só wireframe".
- **Reinício**: janelas deslizantes; nada é "trending" por mais de 30 dias — as listas "mais remixados de todos os tempos" ficam em outra aba, explícita.

### 3.3 O que mostrar (aba **Em alta na profissão**) **[proposta]**

1. **Tarefas-guia em alta** (cards com: nome parametrizado pelo pacote, competência, tempo estimado, "N pessoas concluíram esta semana · M validadas", botão "aceitar para minha semana" — vai para o plano do RF75/RF44 — e "por que está em alta ✦" redigido pela IA a partir dos números).
2. **Modelos do Balcão mais usados** nesta profissão (prateleiras Chancelados · Comunidade de RF40, ordenação por `hot`; preço em DP visível, mas o preço **não** afeta o ranking).
3. **Peças públicas em destaque**: duas listas — **algorítmica** ("em alta", `hot`) e **curada** ("destaques da profissão", proposta pelo algoritmo e publicada por CURADOR com escopo PROFISSAO, padrão RF35.CA03 e Behance); o card curado leva badge e o nome do curador.
4. **Rodapé fixo**: "Em alta = mais aceites, conclusões, remixes com crédito e validações nos últimos 7 dias. Curtidas não contam. Isto não mede empregabilidade." + link "Como calculamos".

### 3.4 Evitar manipulação e viés **[proposta]**

| Vetor | Detecção | Resposta |
|---|---|---|
| Autor aceita/conclui a própria tarefa-guia em contas múltiplas | `testAccount`, mesmo dispositivo/IP (RF42.CA07), eventos de conta não verificada (`User.verified`, RF45.CA03) | evento ignorado com motivo (`TrendingIgnoredEvent`, análogo a `HypeIgnoredEvent`) |
| Anel de remixes/validações (A valida B, B valida A) | grafo validador→autor em 90 d: reciprocidade ≥ 60 % e ≥ 5 eventos (mesma regra do §6 do `DECIA_POINTS.md`) | SUSPENSO → revisão do CURADOR; 2ª vez: par perde direito de validar um ao outro por 180 d |
| Validação pelo colega da mesma empresa / chefe | vínculo vigente comum | validação **não conta** para PET nem trending (continua valendo como selo? **não** — selo exige validador sem vínculo com a pessoa; ver §4) |
| Publicar em massa | `f_autor` e teto de 2 no top 10; > 10 itens/semana ⇒ alerta | itens continuam visíveis em "novidades", só não sobem |
| Reação qualitativa em massa | teto 10/dia/item; só perfis verificados; `actorHypeAtTime` **não** usado (evitaria PageRank de popularidade) | ignorado |
| Remix vazio (cópia sem melhoria) para dar crédito | remix conta ×1 só se o derivado tiver **≥ 1 versão própria** após a cópia; "validado pelo autor" só com declaração de melhorias (D10: "2 melhorias declaradas") | remix sem versão própria = 0 |
| Horário de publicação (viés HN) | idade conta a partir da publicação; janelas de 7/30 d suavizam | — |

---

## 4. Status e conquistas por profissão

### 4.1 Onde já há selos (grep "selo") e o que reaproveito

- **RF75.CA07** selo de competência (validação humana; Open Badge 3.0) — **base**.
- **RF39** chancela (empregador) — vira evidência só se a peça for pública; peso menor.
- **RF35.CA04** `Recognition` (medalha com `criterion`, `validUntil`, `RecognitionSource`) — reaproveitar com nova fonte `TEMPORADA`/`NIVEL_PROFISSAO` para registrar conquistas da profissão no perfil (`/profile?tab=reconhecimentos`).
- **RF32** selo de conformidade — não se aplica a pessoas.
- **RF45 `HypeBand`** (Iniciante · Contribuinte · Referência · Líder de prática · Lenda) — **não reutilizar os nomes** para não confundir reputação social com nível por evidência.

### 4.2 Níveis por profissão **[proposta]** (`ProfessionLevel`, determinístico, nunca por DP/Hype)

| Nível | Critério (todos sobre **selos validados** do pacote da profissão) | Exemplo Dev. de Software | Exemplo Direito | Exemplo Enfermagem* |
|---|---|---|---|---|
| **Iniciante** | profissão escolhida; 0 selo | — | — | — |
| **Praticante** | ≥ 2 selos em ≥ 2 competências distintas | L4 relatório técnico + D9 wireframe validados | L3 estudo de caso (STAR jurídico) + L7 POP de rotina de cartório/escritório | L7 POP de procedimento (ex.: higienização das mãos) + D4 fluxo de triagem |
| **Consolidado** | ≥ 5 selos, ≥ 3 competências, ≥ 1 com rubrica "supera" | + D4 diagrama de arquitetura "supera" + L8 resposta a briefing | + L4 parecer (relatório técnico-jurídico) "supera" + L8 proposta de honorários/escopo | + L3 estudo de caso clínico **anonimizado** "supera" + D7 infográfico de indicadores de unidade |
| **Referência** | ≥ 10 selos, ≥ 5 competências, ≥ 3 "supera", ≥ 3 revisões L10 **dadas** e aceitas | revisou 3 peças de colegas com rubrica | revisou 3 pareceres | revisou 3 POPs |
| **Mentor** | Referência + ≥ 10 validações feitas como validador sem nenhuma suspensa + ≥ 1 temporada completa como participante | validador da fila da profissão | idem | idem |

\*Enfermagem **não está** nos 8 pacotes iniciais (`GUIA_DE_CARREIRA.md:146`); o pacote precisaria nascer com regra reforçada de **dados sensíveis de saúde** (LGPD art. 11): estudo de caso só com anonimização declarada e pré-checagem automática de identificadores (nome, prontuário, CPF, datas completas), e validação por par da área (COREN como fonte em `scope.regulation`).

Propriedades: níveis **nunca caem por inatividade**; caem só por **revogação** de selo (fraude), com recálculo e notificação. **Raridade** (Steam): cada selo mostra "X % das pessoas desta profissão têm este selo". Exibição do nível: privada por padrão; opt-in para o perfil público (`ProfessionStatusVisibility` SO_EU · PARTICIPANTES · PUBLICO), **nunca** PUBLICO para contas EMPRESA da mesma empresa (zona de privacidade mantida).

### 4.3 Open Badges 3.0 **[proposta]** (modelo conforme meu conhecimento da especificação 1EdTech; **não conferido** nesta sessão)

- Cada selo de competência vira `AchievementCredential` (W3C VC): `issuer` = Work Station (perfil do emissor); `credentialSubject.achievement` = `Achievement` com `criteria` (critérios da rubrica do pacote), `alignment` para ESCO/CBO (código da competência do `OccupationPack`); `evidence[]` = URL da peça pública **só se a pessoa marcar** (senão `evidence` descreve sem URL); `credentialStatus` para revogação; assinatura do WS.
- O **nível** é outro `AchievementCredential` (tipo "nível de profissão") com `resultDescription` dos critérios do §4.2; temporadas geram `Recognition` interno, **não** badge (resultado de ranking não é competência).
- Exportação em JSON-LD e imagem com metadados ("bake"), no perfil privado de carreira; nada é publicado automaticamente.

### 4.4 Ligas por profissão **[proposta]**

- Liga = (profissão, nível, temporada). Dentro da liga, **coortes de até 30 pessoas** sorteadas (Duolingo) para que o top 3 seja alcançável; a coorte é fixa na temporada.
- **Sem rebaixamento**; promoção de liga só por mudança de nível (selos), não por posição.
- Quadro da coorte mostra: posição, nome/pseudônimo, PET decomposta ("3 selos · 1 revisão aceita · 1 remix validado"), nível, "?" quando provisória. Nunca mostra empresa, tipo de conta, cidade ou momento de carreira.
- Fim de temporada: `Recognition` TOP_COORTE (1º–3º) e PARTICIPOU (todos com ≥ 3 evidências) — ambos privados por padrão.

### 4.5 "Pessoas em destaque" **[proposta]**

Proposta algorítmica (maior PET com ≥ 5 evidências, diversidade de competências, sem suspensões) → **curadoria humana** por CURADOR da profissão (escopo novo `PROFISSAO`, análogo a `PREMIACAO` do RF35.CA03) → **consentimento específico da pessoa** antes de publicar ("Quer aparecer como pessoa em destaque de Direito nesta temporada? Mostraremos: nome/pseudônimo, nível, 3 peças que você escolher"). Sem resposta = não publica. Publicação só para participantes da aba (não no mural geral) salvo opt-in adicional "também no Mural › Descobrir".

---

## 5. Proposta de requisito

**Nome (número sugerido):** **RF76 — Aba "Minha profissão": ranking sazonal por evidências validadas (opt-in, pseudonimizável, invisível à empresa), níveis e selos da profissão (Open Badges 3.0) e "em alta na profissão" (tarefas-guia, modelos do Balcão e peças com decaimento temporal)** — numeração a confirmar em `docs/diagramas/RENUMERACAO.md`.

**HU76** — COMO pessoa que escolheu uma profissão preferida (RF75.CA19) POSSO abrir a aba "Minha profissão" e, se eu quiser, entrar no ranking da temporada com nome ou pseudônimo, ver quem são as pessoas mais bem avaliadas por evidências validadas na minha profissão, acompanhar meu nível e meus selos e descobrir que tarefas, modelos e peças estão em alta na minha área PARA me orientar pelo que a comunidade da profissão está produzindo e validando, sem que minha empresa, meu chefe ou recrutadores vejam, e sem que isso vire nota de empregabilidade.

**Aba/rota (proposta):** `/profile?tab=profissao` (sub-abas **Em alta** · **Ranking da temporada** · **Meu nível e selos** · **Pessoas em destaque**); atalho em `/insights?tab=ranking` (filtro "minha profissão"); página pública **"Como o ranking da profissão é calculado"** (`/profissao/como-e-calculado`); controles em `/settings?tab=privacidade` (participação, pseudônimo, colegas podem ver, sair e apagar).

### 5.1 Critérios de aceite

| CA | Dado / quando / então |
|---|---|
| **RF76.CA01** | Dado uma pessoa sem profissão preferida, quando abre a aba, então vê só o convite do RF75 ("escolha sua profissão ou faça o teste de interesses") e nenhum ranking, trending ou nível; com profissão preferida, a aba carrega o pacote correspondente (`OccupationPack` `ativo`); sem pacote ativo, mostra "em alta" genérico e explica que o ranking abre quando o pacote estiver ativo. |
| **RF76.CA02** | Dado a sub-aba Ranking, quando a pessoa ainda não participa, então o quadro aparece **anonimizado** (posições e PET sem nomes) com o diálogo de opt-in que responde "quem verá?", "o que muda?" e "vale para itens antigos?", afirma que **empresa, chefe e recrutadores não veem** e que **não mede empregabilidade**; só após confirmar nasce `LeaderboardParticipation(seasonId, userId, displayMode, allowSameCompany=false, linkPieces=false)`; `rankingOptOut=false` **não** é interpretado como opt-in. |
| **RF76.CA03** | Dado uma participação, quando a pessoa escolhe `displayMode` PSEUDONIMO, então o quadro mostra o pseudônimo (único na temporada, sem avatar real), nenhum link para o perfil e, se `linkPieces=false`, só os nomes dos critérios validados; trocar para NOME exige nova confirmação; SO_EU mostra a posição só para a própria pessoa. |
| **RF76.CA04** | Dado um espectador, quando a API monta o quadro, então **omite** as entradas de pessoas com vínculo vigente na mesma empresa do espectador (salvo `allowSameCompany=true` da entrada), responde `403`/omissão a contas EMPRESA e não existe endpoint nominal para dashboards (só histograma anonimizado por profissão, RF45.CA10); a omissão não deixa lacunas numeradas ("você vê 46 de 48 participantes"). |
| **RF76.CA05** | Dado a temporada vigente (`ProfessionSeason` 12 semanas, datas públicas), quando o `ProfessionRankingService.compute` roda (job diário + AFTER_COMMIT de validação), então a PET de cada participante é a soma ponderada (`RankingWeights` escopo PROFISSAO, vigência, `criteriaPublicText`) **apenas** de: selos de competência validados (rubrica aproxima 1 · atende 2 · supera 3), revisões L10 recebidas e aceitas (1), remixes com crédito validados pelo autor original (1), chancela de peça pública (1); **nunca** DP, Hype, HSE, curtidas, seguidores, mensagens ou visualizações; teto de 3 evidências/semana; < 3 evidências na temporada ⇒ `provisional=true` ("?") e fora do top 10; grava `RankingEntry(scope=PROFISSAO, dimension=EVIDENCIAS_VALIDADAS, explanationJson)`. |
| **RF76.CA06** | Dado uma evidência, quando o validador tem vínculo vigente na mesma empresa da pessoa, é a própria pessoa, ou está em par recíproco suspeito (reciprocidade ≥ 60 % em 90 d e ≥ 5 validações), então a evidência **não conta** para PET nem para trending e nasce `SUSPENSO` para o CURADOR (`AntiFraudService`, escada ignorar → suspenso → estorno de PET → perda do direito de validar), auditada com `correlationId`; o selo em si segue a regra do RF75.CA07 (validador sem vínculo). |
| **RF76.CA07** | Dado "Explique minha posição", quando acionado, então a tela lista cada evidência contada (critério, data, validador anonimizado, peso), as ignoradas com motivo, a versão dos pesos e o botão **Contestar** que abre revisão humana (LGPD art. 20) com prazo exibido; a IA (`AiCapability RANKING_PROFISSAO`) só redige a explicação a partir desses números (D-12). |
| **RF76.CA08** | Dado a sub-aba Em alta, quando carregada, então mostra tarefas-guia, modelos do Balcão e peças públicas do pacote ordenados por `hot` (§3.2: janela 7/30 d, gravidade, amortecimento log, `f_autor`, Wilson para conclusão), com ≥ 3 eventos de ≥ 3 pessoas, no máximo 2 itens por autor no top 10, bônus de novato e vaga por competência; cada card traz "N aceites · M conclusões · K validações · R remixes com crédito" e "por que está em alta ✦"; curtidas, salvos, visualizações e DP **não** entram; rodapé fixo "Isto não mede empregabilidade" + "Como calculamos". |
| **RF76.CA09** | Dado um item em alta, quando a pessoa clica "aceitar para minha semana", então a tarefa-guia entra no plano do RF75/Tarefa do Dia (RF44) com os parâmetros do pacote; para modelo do Balcão, segue RF40.CA03/CA04 (preço em DP, licença, crédito); a aceitação gera evento de trending (peso 1) uma única vez por pessoa e item (idempotente). |
| **RF76.CA10** | Dado as evidências validadas da pessoa, quando recalculadas, então `ProfessionLevel` (Iniciante · Praticante · Consolidado · Referência · Mentor) é derivado só de selos (quantidade, competências distintas, "supera", revisões dadas, validações feitas), nunca de DP/Hype/posição; não cai por inatividade, só por revogação (com notificação e "contestar"); cada selo exibe raridade ("X % das pessoas desta profissão"); visibilidade do nível SO_EU por padrão. |
| **RF76.CA11** | Dado um selo ou nível, quando a pessoa pede exportar, então recebe um `AchievementCredential` Open Badges 3.0 (JSON-LD assinado + imagem com metadados) com `criteria` da rubrica, `alignment` ESCO/CBO da competência, `evidence` com URL só se autorizar e `credentialStatus` para revogação; nada é publicado em rede externa automaticamente. |
| **RF76.CA12** | Dado o fim da temporada, quando o job fecha a coorte (≤ 30 pessoas da mesma profissão e nível), então emite `Recognition` fonte TEMPORADA (TOP_COORTE 1º–3º; PARTICIPOU para ≥ 3 evidências), privados por padrão, sem DP; a PET zera para a nova temporada; o histórico de posições fica visível só para a própria pessoa; **não há rebaixamento**. |
| **RF76.CA13** | Dado "Pessoas em destaque", quando o algoritmo propõe candidatos (PET, diversidade, sem suspensões), então um CURADOR com escopo PROFISSAO seleciona e **cada pessoa consente** antes da publicação (nome/pseudônimo, nível, até 3 peças escolhidas por ela); sem consentimento não publica; exibido só a participantes, salvo opt-in "também no Mural › Descobrir"; nunca para contas EMPRESA da mesma empresa. |
| **RF76.CA14** | Dado a pessoa, quando aciona "Sair do ranking" ou "Apagar", então as `LeaderboardEntry`/`LeaderboardParticipation` dela (temporada atual e histórico) são excluídas em ≤ 24 h, a coorte é recomposta sem buracos numerados, os selos permanecem no perfil privado (exclusão separada), e `DataSubjectRequest` target `RANKING_PROFISSAO` cobre exportação/exclusão (RF3); a aba continua utilizável em modo anonimizado. |
| **RF76.CA15** | Dado a Análise de Perfil (RF50), o guia (RF75), pessoas semelhantes, chancelas (RF39), DP (RF42) e dashboards de empresa, quando executados, então **nenhum** lê posição, PET, coorte ou nível da profissão como entrada (teste automatizado de contrato); métricas de saúde (§5.4) ficam em `MetricDefinition` domínio PROFISSAO com histograma anonimizado para ADMIN. |

### 5.2 Entidades **[proposta]**

| Entidade | Campos principais | Observações |
|---|---|---|
| `ProfessionSeason` | `id`, `occupationPackCode`, `number`, `startsAt`, `endsAt`, `status` PLANEJADA · ATIVA · ENCERRADA, `weightsVersion`, `cohortSize` (30) | Uma por profissão e período; datas públicas |
| `LeaderboardParticipation` | `seasonId`, `userId`, `displayMode` NOME · PSEUDONIMO · SO_EU, `pseudonym`, `allowSameCompany` (false), `linkPieces` (false), `consentTextVersion`, `joinedAt`, `leftAt` | Opt-in explícito; apagável; `pseudonym` único por temporada |
| `Leaderboard` | `seasonId`, `levelCode`, `cohortNo`, `membersCount`, `computedAt` | Coorte sorteada; recomposta ao sair alguém |
| `LeaderboardEntry` | `leaderboardId`, `userId`, `pet` (BigDecimal), `position`, `provisional`, `componentsJson` {selos, revisoes, remixes, chancelas, ignorados[]}, `explanationJson`, `weightsVersion` | Especialização de `RankingEntry(scope=PROFISSAO, dimension=EVIDENCIAS_VALIDADAS)` do RF43 |
| `EvidenceCountable` (view) | `evidenceId`, `userId`, `kind` SELO · REVISAO_L10 · REMIX_VALIDADO · CHANCELA_PUBLICA, `rubricLevel`, `validatorId`, `validatedAt`, `countable` (bool), `ignoredReason` | Deriva de `CompetencyEvidence` (RF75 `V64`), `Remix` (RF19/RF40), `SealBond` (RF39) |
| `TrendingWindow` | `occupationPackCode`, `windowDays` 7 · 30, `gravity`, `weightsVersion`, `computedAt` | Uma por profissão × janela |
| `TrendingItemScore` | `windowId`, `itemType` TAREFA_GUIA · MODELO_BALCAO · PECA, `itemId`, `hot`, `eventsJson` {aceites, conclusoes, validacoes, remixes, reacoesQualitativas}, `distinctActors`, `authorPenalty`, `noviceBonus`, `competencyCode`, `position`, `explanationJson` | Reexecutável; `minSamples` ⇒ `eligible=false` |
| `TrendingIgnoredEvent` | `eventRef`, `reason` NAO_VERIFICADO · AUTO_INTERACAO · MESMA_EMPRESA · ANTIFRAUDE · TETO, `at` | Espelho de `HypeIgnoredEvent` (RF45.CA03) |
| `ProfessionLevel` | `userId`, `occupationPackCode`, `levelCode`, `sealsCount`, `distinctCompetencies`, `supersCount`, `reviewsGiven`, `validationsDone`, `computedAt`, `visibility` SO_EU · PARTICIPANTES · PUBLICO | Recalculado por evento de selo/revogação |
| `ProfessionBadgeExport` | `evidenceId` ou `levelId`, `credentialJsonLd`, `imageUrl`, `issuedAt`, `revokedAt`, `statusListIndex` | Open Badges 3.0 |
| `FeaturedPerson` | `seasonId`, `userId`, `proposedScoreJson`, `curatedBy`, `consentAt`, `piecesJson` (≤ 3), `scope` PARTICIPANTES · MURAL, `publishedAt` | Padrão `Highlight` do RF35 com consentimento extra |
| `ProfessionHealthSnapshot` | `occupationPackCode`, `seasonId`, `metricCode`, `value`, `histogramJson`, `computedAt` | §5.4; só agregados |

### 5.3 Integração com os RFs existentes

| RF | Integração |
|---|---|
| **RF75** (profissão preferida, tarefas-guia, selo) | Escopo da aba; `OccupationPack.templateCodes` filtra o trending; `CompetencyEvidence` é a unidade do ranking; o plano semanal recebe "aceitar para minha semana" (CA09). `User.preferredOccupation.visible` continua privado — participar com NOME é **outra** decisão (CA02) |
| **RF43** (RankingService) | Novo `scope=PROFISSAO`, `RankingDimension.EVIDENCIAS_VALIDADAS`, `RankingWeights` com `companyId=null` (escopo global por profissão, editável só por ADMIN); "Explique minha posição" e página "Como é calculado" reaproveitadas; **opt-in** além do `rankingOptOut`; `minSamples` (CA15) |
| **RF42** (DP) | Nenhum DP entra ou sai do ranking; reuso de `AntiFraudService`, `idempotencyKey`, escada de resposta; **resposta à P-19**: o ranking `DECIA_POINTS` do RF43 continua separado e nunca é mostrado na aba da profissão |
| **RF44** (HSE) | Excluído do PET (contexto de empregador); único ponto de contato: tarefa-guia aceita vira candidata à Tarefa do Dia |
| **RF45** (Hype) | Excluído do PET (RF50.CA12); reuso de `HypeIgnoredEvent` (→ `TrendingIgnoredEvent`), `HypeVisibility` como modelo de `displayMode`, histograma anonimizado (CA10) |
| **RF39** (chancelas) | Chancela de **peça pública** conta 1 (menos que selo); revogação ⇒ recálculo do PET da temporada corrente (sem "saldo negativo" — PET não é moeda) |
| **RF40** (Balcão) | Prateleiras filtradas por pacote, ordenadas por `hot`; `remixCount` deixa de ser único sinal — só remix com versão própria e validado pelo autor |
| **RF19/RF27** (social, Mural) | Só `Remix` com crédito e reação qualitativa verificada; **pré-requisito**: contrato social real (`REDE_PROFISSIONAL_VISIBILIDADE.md`, última linha) antes de qualquer sinal social virar trending |
| **RF35** (Destaques/Reconhecimentos) | `Recognition` fonte TEMPORADA; `Highlight` com escopo PROFISSAO; curador PROFISSAO |
| **RF50** (Análise de Perfil) | **Não lê** ranking/nível (CA15); pode citar selos como evidência (já previsto) |
| **RF3** (LGPD) | `DataSubjectRequest` target `RANKING_PROFISSAO`; consentimentos versionados |

### 5.4 Métricas de saúde (`MetricDefinition` domínio PROFISSAO; só agregados anonimizados; `minSamples` 20 participantes por profissão)

| Métrica | Fórmula | Alvo / alarme **[proposta]** |
|---|---|---|
| **Abandono pós-temporada** | % de participantes da temporada N que não produzem nenhuma evidência nas 4 semanas seguintes | alarme se > 40 % |
| **Saída do ranking** | % que aciona "Sair" durante a temporada; separado por quartil de posição | alarme se o quartil inferior sai > 2× o superior (sinal de desmotivação por posição) |
| **Ansiedade autorrelatada** | `SurveyService` (RF43.CA14, anônima, mínimo 5 respostas): 2 perguntas ao fim da temporada ("o ranking te motivou / te pressionou?", escala 1–5) | média "pressionou" ≥ 3,5 ⇒ ADMIN revisa pesos/coorte |
| **Denúncias e suspensões** | denúncias por 100 participantes; % de evidências SUSPENSO; % confirmadas em fraude | fraude confirmada > 2 % ⇒ aumenta rigor de validação (dois validadores) |
| **Concentração** | Gini da PET na coorte; % do top 10 ocupado pelos mesmos de temporadas anteriores | Gini > 0,6 ou repetição > 70 % ⇒ revisar bônus de novato e teto semanal |
| **Provisórios** | % de participantes com "?" ao fim da temporada | > 50 % ⇒ temporada longa demais ou tarefas-guia inviáveis |
| **Viés de volume no trending** | correlação entre nº de itens publicados pelo autor e posições no top 10 | correlação > 0,5 ⇒ ajustar `f_autor` |
| **Diversidade** | nº de competências distintas no top 10 do trending / competências do pacote | < 50 % ⇒ reforçar round-robin |

### 5.5 Três etapas de implementação **[proposta]**

| Etapa | Entrega | CAs | Pré-requisitos |
|---|---|---|---|
| **E1 Fundamentos (ranking por evidência)** | `ProfessionSeason`, `LeaderboardParticipation` com opt-in/pseudônimo/zona de privacidade, PET determinística sobre `CompetencyEvidence` existentes, `RankingEntry` scope PROFISSAO, "Explique minha posição" + Contestar, "Sair e apagar", textos fixos "não mede empregabilidade", página "Como é calculado", testes de contrato "RF50/RF39/RF42 não leem ranking" | CA01–CA07, CA14, CA15 | RF75 E4–E5 (pacotes `ativo`, selo com validação humana); ao menos 1 pacote além do genérico (hoje só `generico.json` existe no repo) |
| **E2 Em alta + Balcão + destaques curados** | `TrendingWindow`/`TrendingItemScore` com `hot`, Wilson, `f_autor`, teto por autor, bônus de novato, round-robin por competência; cards com explicação ✦; "aceitar para minha semana"; prateleiras do Balcão por pacote; `Highlight` escopo PROFISSAO com curador e consentimento; `TrendingIgnoredEvent` | CA08, CA09, CA13 | Contrato social real (RF19/RF27: remix com crédito, reação qualitativa verificada, publicação opt-in); RF40 fora de esqueleto |
| **E3 Níveis, ligas, badges e saúde** | `ProfessionLevel` com raridade; coortes ≤ 30 e `Recognition` TEMPORADA; Open Badges 3.0 (`ProfessionBadgeExport`); `ProfessionHealthSnapshot` + pesquisa anônima de fim de temporada; painel ADMIN com histogramas; ajuste de pesos com vigência | CA10–CA12, CA15 (métricas) | RF35 `Recognition`; `SurveyService` (RF43.CA14); decisão do dono sobre nomes dos níveis e duração da temporada |

### 5.6 Exemplos por profissão

**Engenharia de software** (pacote "Desenvolvimento de Software"): temporada 2026-T1; Ana (pseudônimo "compilador-azul") entra com `allowSameCompany=false`; evidências contadas: L4 relatório técnico "supera" (3), D4 diagrama de arquitetura "atende" (2), D9 wireframe "atende" (2), revisão L10 recebida e aceita (1), remix do seu modelo "checklist de code review" validado por ela (1) ⇒ PET 9, 4º de 27 na coorte Praticante. Em alta na semana: "D9 wireframe com 3 estados" (41 aceites, 18 conclusões, 7 validações) e o modelo do Balcão "POP de deploy com rollback" (12 remixes com versão própria). Sua chefe, também dev e participante, **não vê** a entrada da Ana.

**Direito**: Bruno (nome real) acumula L4 parecer "supera" (3), L3 estudo de caso STAR de um processo **sem dados do cliente** (2), L7 POP de protocolo eletrônico "atende" (2), 2 revisões L10 recebidas (2) ⇒ PET 9; um remix do seu POP por colega do mesmo escritório é **ignorado** (`MESMA_EMPRESA`) e aparece em "ignorados" com motivo. Em alta: "L8 resposta a briefing (proposta de honorários e escopo)" após mudança de tabela da OAB mencionada no `MarketClaim` do pacote (fonte e data obrigatórias, RF50.CA07). Pessoa em destaque: Carla, Referência, consentiu mostrar 3 pareceres públicos.

**Enfermagem** (pacote a criar): Dalva, Em transição (aparece como pessoa comum, D-147), entra em SO_EU: vê "você estaria em 6º de 22" sem aparecer a ninguém. Evidências: L7 POP de higienização "supera" (3), D4 fluxo de triagem Manchester "atende" (2), L3 estudo de caso clínico anonimizado — a pré-checagem automática barrou um número de prontuário antes da submissão (LGPD art. 11) — "atende" (2) ⇒ PET 7. Em alta: "D7 infográfico de indicadores de segurança do paciente" e o modelo "checklist de passagem de plantão (SBAR)". Nenhuma tela mostra "disponível para contratação", salário ou "em busca".

---

## 6. Perguntas para o dono

1. **Duração da temporada**: 12 semanas (proposto) ou alinhar a EXERCICIO/trimestre do RF25?
2. **Nomes dos níveis**: Iniciante · Praticante · Consolidado · Referência · Mentor — ou reaproveitar as `HypeBand` (desaconselho, confunde reputação social com evidência)?
3. **Chancela de peça pública conta?** Proposto peso 1 (menor que selo). Alternativa: zero — manter o ranking 100 % fora do contexto de empregador.
4. **`allowSameCompany`**: existir como opção (padrão desligado) ou nem existir (empresa nunca vê, ponto)?
5. **Pseudônimo**: padrão NOME ou padrão PSEUDONIMO no primeiro opt-in?
6. **Curtidas no trending**: proposto zero. Aceita, ou quer peso mínimo (0,25) só em peças públicas?
7. **DP por participar da temporada**: proposto nenhum; alternativa é `Recognition` apenas. Confirma "status não se compra nem rende moeda"?
8. **Enfermagem** entra nos próximos pacotes? Exige regra reforçada de dados de saúde.
9. **Numeração**: RF76 ou incorporar como CAs novos no RF75/RF43?

## 7. Limitações desta pesquisa

- Páginas primárias de Stack Overflow, Kaggle, Lichess, Codeforces, 1EdTech (Open Badges 3.0), Strava e Hacker News **não resolvem** na rede desta sessão; usei resumos de busca e fontes secundárias, marcando "não conferido". Chess.com não foi coberto por fonte alguma.
- Orçamento de busca encerrado após 15 consultas; recomendo conferir, quando a rede permitir: `stackoverflow.com/help/whats-reputation`, `kaggle.com/progression`, `lichess.org/faq#ratings`, `codeforces.com/blog/entry/20762`, `imsglobal.org/spec/ob/v3p0/`, `support.strava.com` (Segment Leaderboards), `news.ycombinator.com/newsfaq.html`.
- No repositório existe só o pacote `generico.json`; os pacotes de Direito e Desenvolvimento citados nos exemplos são os previstos em `GUIA_DE_CARREIRA.md:146`/RF75 E4, ainda não criados.
