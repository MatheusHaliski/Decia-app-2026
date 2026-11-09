# Abas por profissão e feed da rede — pesquisa e proposta de requisitos (02/11/2026)

Pedido do dono do produto (02/11/2026), em cima da profissão preferida escolhida no cadastro (D-148, RF75.CA19) e dos pacotes de domínio (`contracts/career/`):

1. uma aba por profissão, no espírito **"Sou um bom engenheiro de software"**, que **teste habilidades**, faça **perguntas atualizadas e contextualizadas em nível acadêmico**, aplique **provas completas com feedback na hora**, mostre o **ranking dos maiores pontuadores** da profissão, a **história da profissão**, os **maiores projetos** feitos nela e **quais tarefas estão em alta** (trending social, hype e status) dentro do Work Station;
2. um **feed de projetos e tarefas da rede** com tudo o que os usuários publicaram, filtrável por categoria, profissão, hype, curtidas e **todos os campos necessários**;
3. dentro da aba, **desafios promovidos por empresas** para testar o nível da pessoa; concluir dá **destaque no perfil**, uma aba **"Desafios concluídos"** e **chancela de selo específico** do que foi realizado, com **nível bronze, prata e ouro** (dificuldade do desafio e/ou nível demonstrado).

Método: cinco pesquisas em paralelo (benchmark com URL e data de acesso, leitura do repositório, proposta de requisito com critérios "dado/quando/então", entidades, integrações e etapas), consolidadas aqui. Os relatórios integrais estão em [`fontes/`](fontes/) e valem como anexo. "Não conferido" marca o que não foi confirmado na fonte primária (vários hosts oficiais — INEP, CBO, OIT, ESCO, Kaggle, Stack Overflow — estão bloqueados pela política de rede do ambiente).

## 1. Resumo

| RF proposto | Nome curto | Onde | O que responde do pedido |
|---|---|---|---|
| **RF76** | Treino e Simulados por Profissão | `/profile?tab=profissao&sec=treino` | testar habilidades; perguntas acadêmicas atualizadas; provas completas com feedback na hora |
| **RF77** | Ranking da temporada, níveis e "Em alta na profissão" | `/profile?tab=profissao` (Em alta · Ranking · Meu nível e selos · Pessoas em destaque) | ranking dos maiores pontuadores; tarefas em alta, hype e status |
| **RF78** | Memória da Profissão | `/profile?tab=profissao` (História · Grandes projetos · No Work Station) | história da profissão; maiores projetos (mundo, Brasil, Work Station) |
| **RF79** | Desafios de Empresa com selo específico em níveis | `/profile?tab=profissao&sec=desafios`, `/challenges`, `/u/[username]?tab=desafios` | desafios promovidos por empresas; destaque no perfil; aba Desafios concluídos; selo bronze/prata/ouro |
| **RF80** | Feed da rede Work Station | `/mural?tab=rede`, `/mural/filtros` | feed global de projetos e tarefas com filtros por todos os campos públicos |

A aba **"Sou um bom <profissão>"** é uma só (`/profile?tab=profissao`, nome exibido com o rótulo da profissão preferida: "Sou um bom engenheiro de software", "Sou uma boa arquiteta"), com as sub-abas dos RF76–RF79. Sem profissão preferida ela mostra o convite do RF75 (escolher a profissão ou fazer o teste de interesses) e a prévia genérica. Numeração a confirmar em `docs/diagramas/RENUMERACAO.md` (RF75 é o último em uso; 76–80 estão livres).

Os cinco relatórios chegaram, independentemente, à mesma conclusão de desenho: **tudo que mede a pessoa fica privado e opt-in; tudo que é público mede a entrega (a peça, a tarefa, o desafio), nunca a pessoa**. É o que concilia o pedido com as regras já decididas (§2).

## 2. Regras que atravessam os cinco requisitos

O pedido usa as palavras "ranking", "pontuadores", "hype", "status" e "testar o nível de um usuário". O produto já decidiu limites para cada uma; a tabela diz como o pedido entra sem quebrá-los.

| Regra vigente | Fonte | Como o pedido entra |
|---|---|---|
| Sem score de empregabilidade; progresso por evidência ("3 de 5 critérios") | `GUIA_DE_CARREIRA.md` §3.7; RF75.CA08 | Provas dão "x de n" por eixo e nível nomeado para a própria pessoa, nunca percentil ou "chance"; o ranking conta **evidências validadas por humano na temporada**, decomposto item a item, com "não mede empregabilidade" fixo em toda tela |
| Hype e popularidade não medem potencial profissional; Hype do Perfil é "só eu" por padrão | RF50.CA06/CA12; RF45.CA06/CA08 | "Hype" no feed = **item em alta** (score do item com decaimento temporal), nunca Hype do autor como filtro; o Hype do autor aparece no card só se ele o tornou PUBLICO |
| Ranking: dimensões separadas, pesos públicos, opt-out, "explique minha posição", nunca volume bruto | RF43.CA05 | Reuso do `RankingService` com escopo PROFISSAO; **opt-in** por temporada (não herdado de `rankingOptOut=false`), pseudônimo, coortes ≤ 30, sem rebaixamento |
| Sem sinal de busca de emprego; profissão preferida privada; Em transição aparece como pessoa comum | D-147, D-148 | Empresa, chefe e colegas da mesma empresa **não veem** ranking, níveis, notas nem participação em desafios; nenhum RF cria canal de contratação |
| Recrutamento e avaliação de candidatos por IA = alto risco; discriminação no acesso ao trabalho | AI Act Anexo III 4(a); Lei 9.029/1995; LGPD art. 20 | Desafios de empresa são **públicos e abertos**, com júri humano identificado que avalia submissões **pseudonimizadas**; a empresa recebe só agregados (`minSamples ≥ 10`); termos fixos "não é processo seletivo"; a pessoa escolhe se compartilha a própria submissão |
| IA só interpreta números calculados pelo sistema (D-12); só pré-checa critérios objetivos; selo exige validação humana | RF43; RF75.CA06/CA07 | Pontuação de provas, PET do ranking, trending e nível do selo são **determinísticos**; a IA gera itens e explicações com revisão humana obrigatória, redige "por que está em alta" e pré-checa rubricas |
| Publicar é ação explícita; nada vira público por mudança de padrão; remix com crédito | `REDE_PROFISSIONAL_VISIBILIDADE.md` | Feed e vitrines mostram só a **versão publicada** como PUBLICA (ou EMPRESA para a própria empresa); mudança de visibilidade remove do índice em segundos, com teste automatizado |
| Sem dados sensíveis nem proxies; acessibilidade como preferência de interface | RF75.CA12; Lei 9.029 | Bancos de itens e enunciados de desafio passam por validador e curador; tempo estendido nas provas é preferência, sem justificativa |

## 3. A aba "Sou um bom <profissão>"

```
/profile?tab=profissao   ← rótulo: "Sou um bom(boa) <profissão preferida>"
├─ Treino            (RF76) Pergunta do dia · Simulado completo · Exercício prático · Revisar erros
├─ Em alta           (RF77) tarefas-guia, modelos do Balcão e peças em alta na profissão ("por que está em alta")
├─ Ranking           (RF77) quadro da temporada (opt-in, pseudônimo, coorte) · Meu nível e selos · Pessoas em destaque
├─ Memória           (RF78) História · Grandes projetos · No Work Station (vitrine da profissão)
└─ Desafios          (RF79) desafios abertos de empresas · minhas participações · Desafios concluídos
Perfil público /u/[username]
└─ Desafios concluídos (RF79) — só se houver ao menos um selo que a pessoa tornou visível
Mural /mural?tab=rede (RF80) — feed global filtrável; "Minha trilha" (RF75) continua separada
```

Tudo lê o `OccupationPack` da profissão preferida (`packForField`): o banco de itens, o catálogo de tarefas-guia em alta, a história e os grandes projetos, as rubricas dos desafios e os rótulos das facetas do feed. Trocar a profissão troca a aba inteira; o que a pessoa já produziu fica rotulado com o pacote de origem.

## 4. RF76 — Treino e Simulados por Profissão

**HU:** como pessoa que escolheu uma profissão preferida, quero responder perguntas atualizadas e de nível acadêmico sobre a minha área, fazer simulados completos com tempo no formato da prova de referência e exercícios práticos corrigidos por rubrica, recebendo na hora explicação e fonte de cada resposta e um mapa do que domino, para saber se sou bom na minha profissão **para mim** — sem nota pública, ranking ou sinal para empregadores.

**Como mantém as perguntas atualizadas e acadêmicas.** Banco de itens **versionado por pacote** (`contracts/career/item-banks/<code>.json`, esquema próprio, mesmo validador): cada item traz enunciado, alternativas com justificativa, explicação, **fontes obrigatórias** (título, URL, data; versão da norma) e **validade** (`normRefs`, `reviewBy`); o *blueprint* da prova segue a matriz da referência da profissão (ENADE, edital do conselho — OAB/FGV, exame de suficiência do CFC, Revalida). Geração assistida por IA (`AiCapability TREINO_HABILIDADES`) **só com revisão humana** antes de ir ao ar; pré-teste cego não pontuado; calibração em linguagem simples (p-valor 0,30–0,85, correlação item-total ≥ 0,15, Rasch a partir de 50 respostas); monitor de normas revogadas tira itens de rotação; repetição espaçada 1 → 3 → 7 → 14 → 30 dias.

**Formatos:** pergunta do dia; simulado completo (formato, quantidade e tempo da referência; embaralhamento por pessoa; pausa; tempo +25 %/+50 %/sem tempo como preferência); exercício prático = tarefa-guia L1–L10/D1–D10 em "modo prova" no Letters/Drawings, com pré-checagem objetiva e parecer da IA sobre o subjetivo marcado "proposta — não pontua"; revisar erros; trilha de reforço no plano semanal.

**Integridade e limites:** sem proctoring; banco grande, variações paramétricas, "discordo do gabarito" e "reportar"; texto fixo "isto não é certificação"; `Attempt`/`Score` privados, fora de Hype, ranking, busca, pessoas semelhantes e de qualquer tela de empresa, chefe, admin ou curador (`404` para terceiros); "como foi calculado" e "contestar" (LGPD art. 20); apagar e exportar.

**Entidades:** `ItemBank`, `BlueprintCell`, `Item`, `ItemVariant`, `Attempt`, `Response`, `Score`, `Explanation`, `ReviewSchedule`, `ReinforcementTrack`, `ItemReport`, `ItemCalibration` (anônima), `Contestation`. **Etapas:** E1 banco e dado (esquema, validador, 3 bancos iniciais com ≥ 60 itens revisados: engenharia de software, direito, arquitetura e urbanismo) → E2 pergunta do dia e simulado → E3 exercício prático, reforço e calibração. 14 CAs em [`fontes/avaliacao-e-provas.md`](fontes/avaliacao-e-provas.md) §5.

## 5. RF77 — Ranking da temporada, níveis e "Em alta na profissão"

**HU:** como pessoa com profissão preferida, posso entrar, se quiser, no ranking da temporada com nome ou pseudônimo, ver as pessoas mais bem avaliadas **por evidências validadas** na minha profissão, acompanhar meu nível e meus selos e descobrir que tarefas, modelos e peças estão em alta na área — sem que minha empresa, meu chefe ou recrutadores vejam, e sem que isso vire nota de empregabilidade.

**Ranking que respeita as regras.** A pontuação é a **PET — Pontuação de Evidências da Temporada**: soma ponderada só de selos de competência validados (rubrica aproxima 1 · atende 2 · supera 3), revisões L10 recebidas e aceitas, remixes com crédito validados pelo autor original e chancelas de peça pública; **nunca** DECIA Points, Hype, HSE, curtidas, seguidores ou visualizações. Opt-in explícito por temporada de 12 semanas, pseudônimo opcional, "só eu" possível ("você estaria em 12º de 48"), **zona de privacidade institucional** (a API omite quem é da mesma empresa do espectador; contas EMPRESA recebem 403), coortes de até 30 por nível, posição provisória "?" com menos de 3 evidências, teto de 3 evidências por semana, sem rebaixamento, "explique minha posição" e "contestar", sair e apagar a qualquer momento. Antifraude reaproveita o `AntiFraudService` do RF42 (validador da mesma empresa, reciprocidade suspeita → evidência não conta e vai ao curador).

**"Em alta na profissão".** Score determinístico tipo Hacker News por item (tarefa-guia, modelo do Balcão, peça pública): `Σ w·log2(1+n) / (idade+2)^g`, janelas de 7 e 30 dias, sinais = aceites, conclusões com evidência, validações, remixes com crédito e versão própria, reações qualitativas verificadas; penalidade a autor prolífico, no máximo 2 itens por autor no top 10, bônus de novato, uma vaga por competência; cada card traz os números e "por que está em alta"; "aceitar para minha semana" leva ao plano do RF75.

**Status.** Níveis Iniciante · Praticante · Consolidado · Referência · Mentor derivados só de selos (quantidade, competências distintas, "supera", revisões dadas, validações feitas), nunca caem por inatividade; raridade por selo; exportação Open Badges 3.0; "pessoas em destaque" escolhidas por curador com consentimento individual. Métricas de saúde (abandono pós-temporada, saída por quartil, ansiedade autorrelatada, concentração, viés de volume) com alarmes.

**Correção registrada pela pesquisa:** o RF75 cita "RF24/RF25/RF40" como RFs de selos; no repositório RF24 é metas da equipe, RF25 agrupamentos e RF40 o Balcão — os RFs de selos são RF75.CA07, RF39 (chancelas), RF35 (medalhas/reconhecimentos) e RF32 (selo de conformidade). Ajustar na próxima revisão do RF75.

**Entidades:** `ProfessionSeason`, `LeaderboardParticipation`, `Leaderboard`, `LeaderboardEntry` (especialização de `RankingEntry`), `EvidenceCountable` (view), `TrendingWindow`, `TrendingItemScore`, `TrendingIgnoredEvent`, `ProfessionLevel`, `ProfessionBadgeExport`, `FeaturedPerson`, `ProfessionHealthSnapshot`. **Etapas:** E1 ranking por evidência → E2 em alta, Balcão e destaques → E3 níveis, ligas, badges e saúde. Pré-requisitos: RF75 E4–E5 (pacotes ativos e selo com validação humana) e o contrato social real do RF19/RF27. 15 CAs em [`fontes/ranking-hype-trending.md`](fontes/ranking-hype-trending.md) §5.

## 6. RF78 — Memória da Profissão: história, grandes projetos e vitrine

**HU:** como pessoa que escolheu uma profissão preferida (ou está decidindo), quero uma aba que conte, com fontes, a história dessa profissão no mundo e no Brasil, mostre os projetos de referência e as peças públicas que pessoas da mesma profissão fizeram no Work Station, para entender onde estou entrando e me inspirar — sem que isso me compare ou exponha.

**Conteúdo como dado versionado.** Extensão do `OccupationPack` com `history` (marcos, regulamentação no Brasil, figuras de referência, evolução das ferramentas) e `landmarkProjects` (critérios públicos: impacto, inovação, reconhecimento, diversidade regional, lição aprendida), cada item com `CitedSource` (título, URL, publicador, data, **licença**) e `verification` (conferido · não conferido · divergente — a tela mostra "fontes divergem" em vez de escolher em silêncio); `review` com revisor humano, `nextReviewDue` e `changelog`. Texto autoral do Work Station (não copiar Wikipedia, CC BY-SA); imagens só com licença permitida e crédito. Pipeline: IA (serviço `MEMORIA_PROFISSAO`) propõe com fontes → validador → curador aceita item a item → seed só `ativo` → revisão anual com rebaixamento automático do pacote vencido. Exemplos já conferidos na pesquisa: Pix (BCB), Pampulha (UNESCO 2016), Brasília (UNESCO 1987), SESC Pompeia, Itaipu, ponte Rio–Niterói, PNI/Zé Gotinha, CAU (Lei 12.378/2010); Linux, Nubank, Butantan, Fiocruz, CF/88, CDC, Marco Civil e LGPD ficaram "não conferidos".

**"Maiores projetos dentro do Work Station".** Sub-aba "No Work Station" = Vitrine do RF27 filtrada por profissão: entra só peça/tarefa/projeto **PUBLICA** cujo autor ligou "destacar na vitrine da minha profissão" (padrão desligado; coautores consentem), ordenada por validações e data, **sem curtidas, visualizações, posição ou Hype**; destaque só por curador com motivo visível e contestável; remix com crédito (D10) e revisão (L10) a partir do card; nenhum campo de carreira no card (D-147).

**Entidades:** `ProfessionHistoryEntry`, `LandmarkProject`, `CitedSource` (também útil ao `MarketClaim` do RF50.CA07), `ContentReview`, `ShowcaseEntry`, `ShowcaseSuggestion`. **Etapas:** M1 dado e leitura (esquema, validador, 3 pacotes preenchidos) → M2 curadoria por IA e revisão anual → M3 vitrine da profissão. 12 CAs em [`fontes/historia-e-grandes-projetos.md`](fontes/historia-e-grandes-projetos.md) §5.

## 7. RF79 — Desafios de Empresa com selo específico em níveis

**HU (pessoa):** quero participar de desafios públicos propostos por empresas validadas, fazendo a peça no Letters ou no Drawings com critérios e rubrica conhecidos de antemão, e ao concluir receber um selo que diga **exatamente o que entreguei**, com nível bronze/prata/ouro, chancelado por pessoas identificadas, que eu decido se mostro no perfil — sem que a empresa saiba quem participou, sem ranking e sem que vire processo seletivo. **HU (empresa):** quero propor um desafio com enunciado, rubrica e júri públicos e patrocinar o prêmio em DECIA Points, recebendo só métricas agregadas.

**Por que o desenho é assim.** Uma empresa medindo o nível de pessoas e vendo quem foi bem é recrutamento (AI Act Anexo III 4(a), Lei 9.029/1995, LGPD art. 20) — e a proteção não pode ser só "a IA não decide": **a empresa não pode receber os dados que a tornariam decisora**. Doze regras invariantes (R1–R12 em [`fontes/desafios-de-empresas.md`](fontes/desafios-de-empresas.md) §2.3): desafio público e aberto; enunciado, rubrica, júri e prêmio públicos antes de abrir; pré-checagem objetiva pela IA + **júri humano identificado** (≥ 2) para o subjetivo; júri avalia submissões **pseudonimizadas**; nenhum ranking de pessoas (resultado por critério; "destaques" sem ordem); destaque no perfil controlado pela pessoa (padrão oculto); direito de apagar; **PI permanece com a pessoa** (licença de exibição apenas, cláusula fixa); proibido usar como etapa de seleção não declarada (termos fixos, denúncia, suspensão da empresa — RF28); termos aprovados por curador/ADMIN; sem dados sensíveis; participar não é sinal de busca (D-147).

**Ciclo:** RASCUNHO (EMPRESA) → EM_REVISAO (curador) → PUBLICADO → "Participar" cria uma tarefa-guia no painel Guia do editor → "Enviar para avaliação" congela a versão e roda a pré-checagem → júri (aproxima/atende/supera por critério, justificativa obrigatória, maioria, empate → curador) → resultado privado à pessoa → `Evidence` + `CompetencyEvidence` (RF75.CA07) + `ChallengeBadge` + `SealBond basis = DESAFIO` (RF39) → prêmio idempotente em DECIA Points igual para todos os concluintes (RF42) → agregados públicos ("124 submissões, 61 concluíram"). Limites: 3 desafios publicados ou 12 por ano por empresa; prazo 14–90 dias.

**O selo.** Título = **verbo + objeto + condição** ("Implementou API REST com testes automatizados e OpenAPI"; "Projetou fachada ventilada em prancha A1 conforme NBR 15575"; "Elaborou parecer jurídico fundamentado sobre caso de responsabilidade civil"), nunca adjetivo de pessoa; o curador recusa selo genérico (`SELO_GENERICO`). Carrega competência ESCO/CBO, entregável, critérios atendidos e não atendidos, versões da rubrica e do desafio, nível do desafio, `endorsedBy` (nomes, papéis, organização), data e resumo da pré-checagem; exportável como Open Badges 3.0 (`criteria`, `alignment`, `evidence`, `result[]` por critério, `endorsement`, `credentialStatus`). **Nível bronze/prata/ouro** sai de uma **matriz pública versionada dificuldade × rubrica**: iniciante → bronze (atende) / prata (supera); pleno → prata / ouro; avançado → ouro para todo concluinte; "supera" = ≥ 2/3 dos critérios subjetivos obrigatórios; o metal descreve **a entrega**, não a pessoa — não existe soma, contagem, filtro, ordenação ou sugestão de pessoas por metal; a pessoa pode mostrar o selo sem o nível (`showTier=false`); a empresa só recebe contagem por metal com `minSamples ≥ 10`; o metal não decai. Equivalência de vocabulário com Kaggle, não de método (lá o metal é posição relativa).

**Perfil.** Sub-aba "Desafios concluídos" em `/u/[username]` só existe se há ao menos um selo visível ao viewer (`404` caso contrário); cada card mostra selo com nível (ocultável), título específico, empresa e curador, data, "critérios atendidos: 7/8", nível do desafio, enunciado e rubrica arquivados, link da peça só se pública, "Verificar" (OB 3.0); "compartilhar com a empresa promotora" é ação explícita e revogável da pessoa.

**Entidades:** `Challenge`, `ChallengeTerms`, `ChallengeRubric`, `JuryMember`, `ChallengeReview`, `Submission` (pseudônimo), `JuryReview`, `ChallengeOutcome`, `TierMatrix`, `ChallengeBadge`, `ChallengeAppeal`, `SubmissionShare`, `ChallengeReport`; enums novos `TaskOrigin.DESAFIO`, `SealBondBasis.DESAFIO`, `PointsEvent.DESAFIO_CONCLUIDO`, `AiCapability.PRECHECK_DESAFIO`, `CuratorScope.DESAFIOS`. **Etapas:** E1 desafio público e participação (sem júri) → E2 júri pseudonimizado, resultado, selo com nível e aba → E3 portabilidade (OB 3.0), contestação, exclusão, compartilhamento e denúncia. 17 CAs em [`fontes/desafios-de-empresas.md`](fontes/desafios-de-empresas.md) §5.

## 8. RF80 — Feed da rede Work Station

**HU:** como pessoa autenticada, posso explorar, na aba "Rede" do Mural, um feed de todos os projetos e tarefas que outras pessoas publicaram como públicos (ou para a minha empresa), filtrando por categoria, área profissional, editor de origem, selo, remixável, idioma, região e demais campos públicos do item, ordenando por recente, em alta, mais curtidos, mais remixados ou mais validados, salvando filtros e seguindo categorias ou áreas — sem que nenhum dado privado de perfil, carreira ou Hype de terceiros seja exposto.

**O que já existe no código** (lido na pesquisa): `Visibility` PRIVADA/DEPARTAMENTO/EMPRESA/PUBLICA, `TaskCategory` (15 valores), `TaskType`, `NatureTag`, `ProcessTag`, `WorkArea` (9), contadores reais em `TaskItem`/`ProjectScheme` (curtidas, comentários, salvos, compartilhamentos, remixes, visualizações, `sealIdsJson`), `Reaction` com `ignoredReason`, `Remix`, `Follow`, `Seal*`, `CuratorAppointment`, `UiLanguage`, regras puras em `lib/social/rules.ts` (`canView`, `countersOf`, `remixPermission`), `ws.opensearch.enabled` com fallback MySQL. **Não existe:** hype de peça (só Hype do Perfil, SO_EU), idioma e região do item, editor de origem, profissão/competências do item, seguir categoria/profissão, denúncia, filtros salvos, índice de feed, cursor geral.

**Elegibilidade:** só a versão publicada por ação explícita, PUBLICA com classificação PUBLICO/INTERNO (EMPRESA só para a própria empresa, rotulado "sua empresa"); estados elegíveis de tarefa e projeto; mudança de visibilidade remove do feed, das facetas e do cache em até 5 s, com teste automatizado "mudança de visibilidade remove do índice". Fora, sempre: perfil de carreira, profissão preferida sem opt-in, Hype de terceiros (salvo PUBLICO), HSE, DECIA Points, sinal de emprego — e um teste de contrato falha se o DTO `FeedItemView` carregar qualquer desses campos.

**Facetas (28, todas do item ou de campos descobríveis do autor):** tipo (tarefa/projeto), categoria e subcategoria, tipo da tarefa, natureza, processo, área profissional / família de ocupação **do item** (declarada ao publicar; pré-sugerida pela profissão preferida só com opt-in), editor de origem (Letters/Drawings/outro), autor (respeitando `profileVisibility`), empresa/órgão (só em publicação institucional), identidade de publicação (pessoal/institucional), datas, exercício, estado/fase, competências declaradas, selo validado (emissor, nível, excelência), validado no DECIA, remixável, é remix, gerado com IA, idioma, região (UF/município), formato, classificação, contadores. **Ordenações:** recente (padrão), **em alta** (score com decaimento, janelas 24 h/7 d/30 d, reações com `ignoredReason` não contam, ≤ 2 itens por autor por página), mais curtidos, mais remixados (atores distintos), mais validados, mais úteis — cada uma com período. Busca textual pt-BR, filtros salvos (≤ 20, com digest), seguir categoria/área/família, "ver menos disto"/ocultar/palavras silenciadas, denúncia com fila do curador (≥ 3 denúncias tiram de "em alta"), cursor opaco assinado, 60 req/min, não indexável.

**Infraestrutura:** índice `ws-feed` no mesmo cluster/porta/pipeline do RF33 (`PipelineJob INDEXAR_FEED`, PIT + `search_after`, `aggs`), fallback `feed_items` materializada no MySQL com keyset pagination. **Entidades:** `FeedItem` (derivado, reconstruível), `PublicationMetadata` (editorKind, contentLanguage, regionCode, occupationFamilyCode, competencies, publishIdentity), `FeedQuery`, `SavedFilter`, `TopicFollow`, `FeedPreference`, `ContentReport`, `TrendingSnapshot`. **API:** `GET /api/feed` com todos os parâmetros, `/api/feed/facets`, `/api/feed/saved-filters`, `/api/feed/topics/follow`, `/api/feed/preferences`, `/api/feed/reports`. **Etapas:** E1 feed real mínimo em SQL com a aba e os testes de visibilidade e de lista negra → E2 em alta, controles do usuário e moderação → E3 OpenSearch, busca, competências/ocupação. 16 CAs em [`fontes/feed-global.md`](fontes/feed-global.md) §5.

## 9. Efeitos no dado versionado (`contracts/career/`)

Tudo acima é alimentado pelo `OccupationPack`; as extensões abaixo se fazem **juntas** no esquema e em `lib/career/occupationPack.ts` (o teste `lib/career/career.test.ts` falha se divergirem):

| Extensão | RF | Onde |
|---|---|---|
| `history[]`, `landmarkProjects[]`, `$defs` `citedSource`, `milestone`, `referencePerson`, `toolsEra`, `landmarkProject`, `review`, `verification` (opcionais; obrigatórios para pacote `ativo` com `fields`) | RF78 | `occupation-pack.schema.json`; 8 checagens novas no validador (sem `nao-conferido` em `ativo`, licença por imagem, revisão em dia) |
| `item-bank.schema.json` + `item-banks/<code>.json` (blueprint, itens com fontes, validade, estatísticas anônimas, revisão) | RF76 | arquivo separado por pacote, mesma `version`; validador estendido |
| `serviceId` novos: `GERAR_ITENS`, `EXPLICAR_RESPOSTA`, `CORRIGIR_RUBRICA`, `MEMORIA_PROFISSAO`, `EXPLICAR_EM_ALTA` | RF76–RF78 | enum fechado do esquema + `AI_SERVICES` |
| `AiCapability` novas no RF43: `TREINO_HABILIDADES`, `RANKING_PROFISSAO`, `PRECHECK_DESAFIO` | RF76, RF77, RF79 | `AI_CAPABILITIES`, `AiGateway` |
| Rubrica do pacote reaproveitada como `ChallengeRubric` padrão e `checkStrategy` em `lib/career/checks/*` | RF79 | `rubric.objective[]` já existe |
| Rótulos e vocabulário das facetas "profissão/área" e "competências" do feed | RF80 | `label`, `competencies.core` |

## 10. Ordem sugerida entre os requisitos

Pré-requisito de todos: **RF75 E1–E2** (profissão preferida no cadastro, perfil de carreira) e **E4–E5** (pacotes `ativo`, tarefas-guia, `CompetencyEvidence` com validação humana). Depois:

1. **RF80 E1** (feed SQL mínimo) e **RF78 M1** (história e grandes projetos só leitura) — só dependem de publicação e de dado versionado; dão conteúdo visível cedo.
2. **RF76 E1–E2** (banco de itens, pergunta do dia, simulado) — privado, sem dependência social.
3. **RF79 E1–E2** (desafios e selo com nível) — precisa do painel Guia e da `CompetencyEvidence` (RF75 E5) e de curadores com escopo DESAFIOS (RF28).
4. **RF77 E1** (ranking por evidência) — só quando houver evidências validadas em volume e o contrato social do RF19/RF27 estiver real; **RF77 E2** (em alta) depende de reações qualitativas verificadas e remix com crédito reais.
5. **RF78 M3**, **RF80 E2–E3**, **RF76 E3**, **RF77 E3**, **RF79 E3**.

Cada etapa fecha com contrato OpenAPI regenerado, catálogo de RFs (`node scripts/rf/gerar-catalogo.mjs`), `npm run career:validate`, `verify` do backend, bateria do front e e2e em duas contas (nada vaza para a outra). Nenhuma chamada paga de IA é necessária até a geração de itens e a curadoria da memória; o motor simulado basta para os testes.

## 11. Decisões para o dono do produto

Registradas como dúvidas Q-244 a Q-252 em [`docs/DECISOES.md`](../../DECISOES.md). **Respondidas em 09/11/2026:** numeração RF76–RF80 (D-149), "hype" = item em alta (D-150), matriz do selo (D-151) e temporada de 12 semanas (D-152). Resumo original:

1. **Numeração:** RF76–RF80 como acima, ou incorporar como CAs novos no RF75/RF43?
2. **"Hype" no feed** = item em alta (proposto) ou Hype do autor como filtro (conflita com RF45.CA08 e o guia §3)?
3. **Visitante anônimo** vê o feed "Rede" ou só pessoas autenticadas (recomendado: autenticadas, por rate limit e anti-scraping)?
4. **Itens EMPRESA no feed:** na mesma lista rotulados "sua empresa" ou em filtro "Minha rede" separado?
5. **Temporada do ranking:** 12 semanas (proposto) ou alinhar ao exercício do RF25? Nomes dos níveis (Iniciante · Praticante · Consolidado · Referência · Mentor)? Pseudônimo como padrão? `allowSameCompany` existe como opção ou nunca? Chancela de peça pública conta (peso 1) ou zero? Curtidas no trending: zero (proposto)?
6. **Matriz do selo de desafio:** iniciante → bronze/prata, pleno → prata/ouro, avançado → ouro; "supera" = ≥ 2/3 dos subjetivos obrigatórios; "destaques" do júri (até 5, sem ordem, opt-in do autor) ou nenhum?
7. **Emissor do Open Badge** dos desafios: Work Station com endosso da empresa (recomendado) ou a empresa?
8. **Teto de DECIA Points** por nível de desafio e bônus de destaque; curadores (quem são e se recebem pontos).
9. **Vitrine da profissão** = Vitrine do RF27 filtrada (recomendado) ou feed próprio; a tag de profissão do item pode diferir da profissão preferida?
10. **Revisão jurídica** da cláusula fixa de PI e do texto "não é processo seletivo" nos Termos de Uso; confirmar AI Act (Omnibus 2026/1744) e LGPD art. 20 em fonte primária (não conferidos).

## 12. Fontes

Relatórios integrais, com URLs, datas de acesso (02/11/2026) e itens "não conferido":

- [`fontes/avaliacao-e-provas.md`](fontes/avaliacao-e-provas.md) — HackerRank, Exercism, LeetCode, Codility, Khan Academy, Duolingo English Test, ENADE/INEP, OAB/FGV, Revalida, CFC, CFA, Coursera/edX, Brilliant, Anki/FSRS, Kaggle Learn; ECD, IRT/Rasch; LGPD art. 20.
- [`fontes/ranking-hype-trending.md`](fontes/ranking-hype-trending.md) — Stack Overflow, Kaggle, Duolingo, GitHub, Behance, Strava, Lichess/Chess.com, LeetCode, Codeforces, Product Hunt, Reddit/HN, Steam/Xbox, Credly/Open Badges; estudos sobre leaderboards e ansiedade; inventário RF42–RF45, RF35, RF39.
- [`fontes/historia-e-grandes-projetos.md`](fontes/historia-e-grandes-projetos.md) — Wikipedia/Wikidata (licenças), Google Arts & Culture, ArchDaily, Behance, awesome lists, Computer History Museum, Museu da Pessoa, IEEE/ETHW, ACM Turing, CAU/CFM, Itaú Cultural/Brasiliana; extensão do esquema com exemplo (Pampulha).
- [`fontes/feed-global.md`](fontes/feed-global.md) — Behance, Dribbble, GitHub Trending, Dev.to, Product Hunt, Pinterest, ArchDaily, Kaggle, Figma Community, Notion, LinkedIn, Mastodon/Bluesky; fórmula HN; PIT + `search_after`; inventário do modelo social do repositório.
- [`fontes/desafios-de-empresas.md`](fontes/desafios-de-empresas.md) — Kaggle Competitions, HackerRank/HackerEarth, Topcoder, Codeforces, Frontend Mentor, Behance/Adobe briefs, 99designs e crítica ao *spec work* (AIGA), hackathons brasileiros, Gupy/Vagas, Devpost, Google Code Jam, Open Badges 3.0; AI Act Anexo III, Lei 9.029/1995, LGPD art. 20.
