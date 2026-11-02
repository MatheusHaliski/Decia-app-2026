# Desafios de empresas na aba "Sou um bom <profissão>" — pesquisa e proposta de requisito

Data: 02/11/2026 · Frente: desafios promovidos por empresas (contas EMPRESA validadas pelo ADMIN, RF28) para que uma pessoa teste o próprio nível, ganhe destaque no perfil e uma aba "Desafios concluídos".

**Aviso de método.** Nesta sessão a busca web ficou indisponível (orçamento compartilhado esgotado) e o WebFetch falhou por DNS em todos os domínios tentados (kaggle.com, 99designs.com, aiga.org, help.devpost.com, imsglobal.org, artificialintelligenceact.eu, planalto.gov.br, frontendmentor.io, topcoder.com, codeforces.com, hackerearth.com, gupy.io, en.wikipedia.org, shellecomarathon.com, behance.net — todos em 02/11/2026). Por isso o benchmark da §1 está apoiado no conhecimento prévio do redator e nas fontes já conferidas em 31/10/2026 pela auditoria `docs/auditoria/2026-10-31/fontes/tarefas-evidencia-e-ia.md`. Tudo o que não foi confirmado em fonte primária está marcado **não conferido**. As citações ao repositório (§2 em diante) foram lidas diretamente nos arquivos e são confiáveis.

---

## 1. Benchmark: como o mercado faz desafios promovidos por empresas

Perguntas feitas a cada referência: quem define o problema · critério de avaliação (automático × júri) · visibilidade dos resultados · prêmio/destaque · propriedade do que foi produzido · prazos · fraude.

| # | Referência (URL · acesso) | Quem define o problema | Avaliação | Visibilidade dos resultados | Prêmio / destaque | Propriedade do produzido | Prazos | Fraude |
|---|---|---|---|---|---|---|---|---|
| 1 | **Kaggle Competitions** — https://www.kaggle.com/docs/competitions · tentativa 02/11/2026, DNS bloqueado; nível/medalhas conferidos via Wikipedia em 31/10/2026 (auditoria) | Empresa patrocinadora ("host") escreve a descrição, fornece dados e escolhe a métrica; Kaggle revisa e hospeda. | **Automática** por métrica declarada; leaderboard **público** (parcela dos dados de teste) e **privado** (restante, revelado só ao fim) para evitar overfitting ao placar. | Leaderboard público com nomes/equipes em tempo real; posição final pública; o host vê as submissões vencedoras. | Dinheiro, medalhas (ouro/prata/bronze por percentil) que alimentam os níveis Novice→Grandmaster no perfil; muitas competições "só por conhecimento" (sem dinheiro). | Regra típica: vencedores entregam código ao host com licença (muitas vezes exigência de open source, ex. Apache 2.0, ou cessão ao patrocinador) como condição do prêmio; não vencedores mantêm tudo. **Limiares e cláusulas exatas: não conferidos.** | Semanas a meses; limite diário de submissões (ex. 5/dia) e prazo de fusão de equipes. | Proibição de múltiplas contas, compartilhamento privado de código fora da equipe, uso de dados externos não autorizados; desqualificação e banimento. |
| 2 | **HackerRank / HackerEarth hackathons de empresa** — https://www.hackerearth.com/challenges/ ; https://www.hackerrank.com/skills-verification (este último conferido 31/10/2026) · tentativa 02/11/2026 bloqueada | A empresa patrocina um "hiring challenge" ou hackathon com problema próprio; a plataforma fornece a infraestrutura. | **Automática** em problemas algorítmicos (casos de teste ocultos); **júri** em hackathons de produto (rubrica inovação/execução/impacto). | Leaderboard público durante o evento; **em hiring challenges a empresa recebe a lista de candidatos com pontuação** — o desafio é explicitamente triagem. | Prêmios em dinheiro, brindes, **entrevista garantida** para os melhores. | Em geral a plataforma e o patrocinador recebem licença de uso; detalhes por evento. **Não conferido.** | Horas (SRM) a semanas (hackathon). | Detector de plágio entre submissões; proctoring (câmera, troca de aba) em testes de contratação. |
| 3 | **Topcoder** — https://www.topcoder.com/community/competitive-programming/how-to-compete · tentativa 02/11/2026 bloqueada | Topcoder ou cliente corporativo define o problema (SRM, Marathon Match, desafios de desenvolvimento/design). | SRM: testes de sistema automáticos + "challenge phase" em que concorrentes atacam soluções alheias; design/dev: **review board** com scorecard. | Rating público (cor por faixa), placar e histórico por membro. | Dinheiro por posição; o rating é o destaque no perfil. | Em desafios pagos por clientes, o vencedor **cede a propriedade intelectual** ao cliente como condição do pagamento; não vencedores mantêm. **Não conferido.** | 75 min (SRM) a semanas (Marathon). | Múltiplas contas e código compartilhado banidos; sistema de appeals do review. |
| 4 | **Codeforces rounds patrocinados** — https://codeforces.com/blog/entry/4088 · tentativa 02/11/2026 bloqueada | Empresa patrocina a rodada (ex. rounds "Div.1 + Div.2" com nome da empresa); os problemas são de autores da comunidade, revisados por coordenadores. | **Automática**: pretests durante a prova, "hacks" dos adversários, system tests finais. | Placar público em tempo real; rating público; soluções abertas após o fim. | Rating; camisetas/brindes do patrocinador para os primeiros N e sorteados; às vezes a empresa convida para entrevista — mas o convite é fora da plataforma. | Soluções publicadas na plataforma; sem cessão formal ao patrocinador. **Não conferido.** | 2–3 horas. | Detector de código similar pós-prova; "skipped" + aviso; reincidência zera o rating. |
| 5 | **Frontend Mentor** (desafios e hackathons patrocinados) — https://www.frontendmentor.io/guides/welcome-to-frontend-mentor (conferido 31/10/2026) · /challenges tentativa 02/11/2026 bloqueada | A própria plataforma cria os desafios ("design → código", níveis Newbie→Guru); hackathons ocasionais com patrocinador que paga prêmios. | Relatórios **automáticos** (acessibilidade, validação de HTML, comparação de screenshot) + **feedback da comunidade**; em hackathons, júri. | Solução publicada vira peça pública do portfólio; só se vê as alheias depois de enviar a própria. | Pontos de reputação, "badges", mentions; em hackathons, prêmios do patrocinador. | A pessoa mantém o código (GitHub próprio); a plataforma exibe. Feedback por IA é recurso pago **(não conferido)**. | Sem prazo nos desafios regulares; hackathons com janela fixa. | Pouca verificação de autoria; o valor está no repositório público auditável. |
| 6 | **Behance / Adobe briefs (Daily Creative Challenge, Adobe Live)** — https://www.behance.net/adobelive · tentativa 02/11/2026 bloqueada; "Daily Creative Challenge" referido na auditoria 31/10/2026 | Adobe (ou marca parceira) publica o brief e o arquivo inicial. | Curadoria editorial/júri; sem avaliação automática. | Peças públicas no feed com tag; vencedores em destaque editorial. | Visibilidade, licenças de software, brindes. | Autor mantém; concede exibição. **Não conferido.** | Diário/semanal. | Sem verificação de autoria. |
| 7 | **99designs (concursos de design) e a crítica da AIGA ao "spec work"** — https://99designs.com/legal/terms-of-use ; https://www.aiga.org/resources/aiga-position-spec-work · tentativas 02/11/2026 bloqueadas | O cliente escreve o brief e paga um prêmio; dezenas de designers produzem antes de qualquer contrato. | **Júri de um**: o cliente escolhe; rodadas de feedback e eliminação. | Entradas visíveis entre concorrentes (opção "blind" oculta). | Dinheiro só ao vencedor; concursos "garantidos" ×  "não garantidos" (reembolsáveis). | O vencedor **transfere integralmente a PI** ao cliente ("design transfer agreement"); perdedores ficam com o trabalho não pago. A **AIGA** condena trabalho especulativo: desvaloriza a profissão, risco de plágio, cliente sem relação profissional, PI incerta. **Textos não conferidos nesta sessão.** | 4–7 dias por padrão. | Plágio entre entradas é problema recorrente; moderação por denúncia. |
| 8 | **Desafio Sebrae / Shell Eco-marathon / hackathons públicos brasileiros** — https://www.shellecomarathon.com/about/rules.html · tentativa 02/11/2026 bloqueada; Desafio Sebrae e hackathons públicos: **não conferidos** | Organizador (Sebrae; Shell; órgão público/edital) publica regulamento e desafio; empresas patrocinam categorias. | Shell: medição objetiva (km/L) + inspeção técnica + **prêmios de júri** (comunicação, segurança, design); Sebrae: simulação de gestão com pontuação automática e banca final; hackathons públicos: banca com rubrica (impacto, viabilidade, pitch). | Ranking público por categoria. | Dinheiro, viagens, mentoria, aceleração; em editais públicos, às vezes contrato. | Shell/Sebrae: equipe mantém PI, concede direito de imagem e divulgação; editais públicos muitas vezes exigem licença ampla ou cessão ao órgão (controvérsia recorrente). **Não conferido.** | Meses (inscrição → regional → nacional). | Inspeção técnica; penalidades; regras de elegibilidade (estudante matriculado). |
| 9 | **Gupy / Vagas.com — testes de empresa em recrutamento (como é hoje)** — https://www.gupy.io/blog/testes-para-processo-seletivo · tentativa 02/11/2026 bloqueada; Gupy e Vagas conferidos parcialmente em 31/10/2026 (fontes secundárias) | A **empresa contratante** monta ou escolhe testes (técnico, lógica, fit cultural, redação, vídeo) dentro de uma vaga. | Automática (múltipla escolha, código) e/ou revisor da empresa; IA da Gupy ordena currículos por aderência (a Gupy diz que dados pessoais e de diversidade não entram — **não conferido na íntegra**). | **Só a empresa vê**; o candidato quase nunca recebe nota ou devolutiva; ranking de candidatos é interno ao recrutador. | Nenhum para o candidato além de seguir no processo. | Respostas pertencem/ficam com a empresa; sem portabilidade. | Dias; expira com a vaga. | Proctoring, limite de tempo, detecção de cópia. **Esta é exatamente a configuração que o Work Station deve evitar** (§2). |
| 10 | **Devpost (GitHub e outros hackathons)** — https://help.devpost.com/hc/en-us/articles/4402406737684-Hackathon-rules · tentativa 02/11/2026 bloqueada | Patrocinador publica regras oficiais, elegibilidade, categorias e critérios. | **Júri nomeado** (nomes públicos) com rubrica declarada (ex. qualidade técnica, design, impacto, uso da API do patrocinador); às vezes voto popular separado. | Galeria pública de submissões (vídeo, repositório, descrição); vencedores anunciados publicamente. | Dinheiro, créditos de nuvem, brindes, mentoria. | Regra padrão: **o participante mantém a PI**; concede ao patrocinador licença para exibir/promover a submissão; alguns pedem código aberto. **Não conferido.** | Semanas; data/hora limite e período de julgamento definidos. | Trabalho deve ser criado no período; declaração de autoria; desqualificação por código pré-existente não declarado. |
| 11 | **Google Code Jam / Foobar** — https://en.wikipedia.org/wiki/Google_Code_Jam · tentativa 02/11/2026 bloqueada | A própria empresa (Google) escreveu os problemas. | Automática (juiz de casos de teste); rounds classificatórios → final. Foobar: convite secreto via busca, problemas automáticos. | Placar público; Foobar privado. | Dinheiro ao top; para a maioria, **o ganho era visibilidade e recrutamento**: Code Jam e Foobar eram canais de contratação. Code Jam foi encerrado em 2023 **(não conferido)**. | Soluções enviadas ficavam com a Google para julgamento. | Horas por rodada. | Múltiplas contas proibidas. Lição: um desafio da própria empresa com dados individuais é, na prática, funil de contratação. |
| 12 | **Open Badges 3.0 emitidos por empresa** — https://www.imsglobal.org/spec/ob/v3p0 (versão final referida na auditoria de 31/10/2026; campos exatos de Evidence/Result **não conferidos**) | O emissor (`Profile`: empresa, escola, plataforma) define o `Achievement` com `criteria` (narrativa + URL) e opcional `alignment` a frameworks (ESCO, CBO). | A emissão representa uma avaliação já feita; o credential pode trazer `evidence[]` (URL de artefato, narrativa) e `results[]` ligados a `resultDescriptions` (rubrica: approaches/meets/exceeds, pontuação). | O **titular** (holder) guarda o credential em carteira e decide com quem compartilha; verificação criptográfica (W3C Verifiable Credentials 2.0). | Destaque: a credencial é portátil e verificável fora da plataforma emissora. | Não trata de PI do artefato; só referencia a evidência. | `validFrom`/`validUntil`, revogação via status list. | Assinatura do emissor impede falsificação; não impede "badge inflation" (rótulos genéricos). |

**Padrões que valem para o Work Station**

1. Problema definido pela empresa, mas **regras, rubrica e júri públicos** (Devpost, Kaggle) geram confiança; concurso de "júri de um" (99designs) e teste de recrutamento (Gupy) não.
2. Dois placares (Kaggle) e "soluções alheias só depois da sua" (Frontend Mentor) reduzem cópia sem vigilância invasiva.
3. **Quando a empresa vê resultados individuais, o desafio vira funil de contratação** (Code Jam/Foobar, hiring challenges). É o que a regra do produto proíbe.
4. **PI com a pessoa + licença de exibição** (Devpost, Frontend Mentor) é o padrão aceitável; cessão como condição do prêmio (99designs, Topcoder, parte do Kaggle) é "spec work" e deve ser vedada.
5. A credencial portátil (Open Badges 3.0) só tem valor se o `Achievement` for **específico** (critérios e evidência), nunca "nível avançado".

---

## 2. Conciliação com as regras do produto

### 2.1 O que o repositório já decidiu (lido e citado)

| Fonte | Regra | Consequência para desafios de empresa |
|---|---|---|
| `docs/auditoria/2026-10-31/GUIA_DE_CARREIRA.md` §3, princípio 3 | "Privado por padrão, sem sinal de busca. … o WS, por decisão de produto (D-147), **não** armazena nem exibe sinal de busca de emprego". | Participar de um desafio **não** pode ser tratado nem exibido como "disponível para contratação". |
| Idem, princípio 7 | "**Sem score de empregabilidade.** Progresso é por evidência ('3 de 5 critérios atendidos'), nunca '72% de chance'. … recrutamento por IA é alto risco no AI Act (Anexo III, 4(a)) — o WS fica fora enquanto a IA servir à própria pessoa e não a empregadores." | Nada de nota única, percentil ou ranking de pessoas; a IA do desafio serve à pessoa (pré-checagem), não à empresa. |
| Idem, princípio 8 | "A tarefa é o meio de construir o perfil … enunciado padronizado, artefato versionado com URL, critério de aceite e validação externa. No WS o artefato é uma Letter ou um Drawing." | O desafio é uma tarefa-guia especial: submissão = Letter/Drawing versionado. |
| `docs/diagramas/RF50/README.md` CA06 | "não há classificação automática de empregabilidade, aptidão definitiva ou promessa de contratação". | O desafio não concede "aptidão"; concede evidência de uma entrega específica. |
| RF50 CA09 | "permanecem privados por padrão. Chefes, empresa e administradores não recebem acesso automático. Compartilhar uma saída exige seleção explícita de destinatário e conteúdo". | A empresa promotora não vê submissões nem participantes; a pessoa compartilha se quiser. |
| RF50 CA12 | "Não utiliza Hype Score, pontos ou popularidade como medida de potencial profissional. Não transforma a análise em avaliação de desempenho ou decisão de contratação." | Sem voto popular como critério; DECIA Points são recompensa, não medida. |
| `docs/DECISOES.md` D-147 (31/10/2026) | "Sem sinal de busca de emprego (RF75) … a conta Em transição aparece a terceiros como pessoa comum … evita que o produto vire triagem para empregadores (AI Act Anexo III 4(a), RF50.CA06/CA12)". | Nenhuma lista de participantes, nenhuma notificação à empresa sobre quem concluiu. |
| D-148 (02/11/2026) | Profissão preferida no cadastro, privada por padrão; "O escopo da IA … para cada profissão é o `OccupationPack` correspondente … dado versionado, não código." | A aba "Sou um bom <profissão>" filtra desafios pelo `OccupationPack` da profissão preferida; o campo continua privado. |
| `docs/produto/REDE_PROFISSIONAL_VISIBILIDADE.md` | "O perfil é um portfólio escolhido pela pessoa … Popularidade não equivale a qualidade técnica nem fundamenta recomendação de carreira, avaliação de desempenho ou prioridade institucional." Quatro controles separados: descoberta, público do recurso, publicação, colaboração. "Compartilhar … Não amplia acesso da origem." | Destaque no perfil é publicação opt-in por item; a peça submetida tem seu próprio público; o selo não publica a peça. |
| `docs/diagramas/RF28/README.md` (cabeçalho e §7.1 CA09–CA17) | EMPRESA e CHEFE "nascem `PENDING_VALIDATION` e passam pelo ADMIN (`ApprovalRequest` + `VerificationPolicy`)"; papel contextual **CURADOR** (`CuratorAppointment`); UC9 "Emitir reconhecimento". | Só EMPRESA `verified = true` propõe desafio; a nomeação de curadores já existe como conceito para revisar. |
| `docs/diagramas/RF39/README.md` | Chancelas: `Seal` (emissor EMPRESA/CHEFE), `SealPolicy` AUTO/REVISAO, `SealBond` (item × emissor) com `basis` … PREMIACAO; UC5 "Consentir em exibir o lacre"; UC8 revogar/recertificar. | A chancela do desafio é um `SealBond` com `basis = DESAFIO` (novo valor), exibida só com consentimento do dono. |
| `docs/diagramas/RF40/README.md` | Balcão de Modelos em DECIA Points, "Nenhum campo de moeda real, nenhum gateway (CA08)"; prateleiras Chancelados · Comunidade. | Prêmios do desafio: pontos e itens do Balcão/Loja; a solução vencedora pode (opt-in) virar modelo chancelado. |
| `docs/diagramas/RF42/README.md` e `ABAS_POR_PERFIL.md` §7.d / P-10 | DECIA Points "são a única moeda (sem dinheiro real, sem gateway, CA10)"; "Conta EMPRESA não acumula DECIA Points nem entra no ranking (`earnsPoints=false`)". | A empresa **financia** o prêmio com `DeciaPointsRule` própria (vigência) — não com saldo (não tem); novo `PointsEvent DESAFIO_CONCLUIDO`. |
| `docs/diagramas/RF75/README.md` CA06/CA07 | Painel Guia nos editores; "a IA pré-checa só os critérios objetivos … e nunca os subjetivos"; "`Evidence` com URL da peça, versão, critérios atendidos, declaração de autoria … o selo de competência só é emitido com validação humana (par, mentor ou curador) e pode ser exportado como Open Badge 3.0; todo rótulo que a IA inferiu mostra 'como foi calculado' e 'contestar'". | O desafio reutiliza painel Guia, pré-checagem, `Evidence`/`CompetencyEvidence`, fila do curador e exportação OB 3.0. |
| RF75 CA08 | Progresso "sem score, percentual de empregabilidade, ranking entre pessoas". | Sem leaderboard de pessoas em nenhuma visão. |
| `docs/legal/TERMOS_DE_USO.md` §6.1–6.3 | "O conteúdo é seu"; licença à Velion "gratuita, não exclusiva e limitada para guardar, copiar, exibir"; §6.3 conteúdo produzido no trabalho segue o contrato de trabalho. | Os termos do desafio **não podem** exigir cessão de PI à empresa; a submissão não é "conteúdo produzido no trabalho" (não há vínculo). |
| Selos no repositório (`grep -ril "selo" docs/diagramas`): RF5, RF32, RF39, RF45, RF51, RF53, RF55, RF63, RF66, RF68 | RF24 e RF25, citados no pedido, **não tratam de selos** (RF24 = Plano Anual; RF25 = Programas/Exercícios/Gestões). O sistema de selos/chancelas está no **RF39** (`Seal`, `SealBond`) e o selo de competência no **RF75.CA07**. | Esta proposta se liga ao RF39 e ao RF75, não ao RF24/RF25. |

### 2.2 O problema central

Um desafio em que uma empresa mede o nível de pessoas e enxerga quem foi bem é, na prática, **recrutamento e seleção**: AI Act Anexo III 4(a) (sistemas de IA para recrutamento/seleção, filtragem de candidaturas e avaliação de candidatos — alto risco; conferido via AI Act Service Desk em 31/10/2026, item 37 das fontes da auditoria), Lei 9.029/1995 art. 1º (práticas discriminatórias na admissão — conferido no portal da Câmara em 31/10/2026) e LGPD art. 20 (direito à revisão de decisões unicamente automatizadas que afetem o perfil profissional; texto primário **não conferido**, Planalto bloqueado em ambas as sessões). Mesmo sem IA na decisão final, a Comissão Europeia sinaliza que o sistema continua alto risco se "influenciar materialmente" a decisão (rascunho de diretrizes de 2026, fonte secundária na auditoria). Portanto a proteção não pode ser só "a IA não decide": **a empresa não pode receber os dados que a tornariam decisora**.

### 2.3 Desenho que evita a triagem (regras invariantes)

| # | Regra | Como se materializa |
|---|---|---|
| R1 | **Desafio público e aberto.** Qualquer pessoa autenticada participa; sem convite, sem filtro por perfil, sem elegibilidade por vínculo. | `Challenge.visibility = PUBLICA` obrigatório; não há lista de convidados. |
| R2 | **Enunciado, rubrica, júri e prêmio públicos antes de abrir.** | `ChallengeRubric` publicada com o `Challenge`; `JuryMember` nomeados com nome e papel; alteração depois de aberto só por errata versionada. |
| R3 | **Avaliação em duas camadas:** pré-checagem objetiva pela IA (igual RF75.CA06: tamanho, campos, cotas, testes que passam, vistas renderizadas) e **júri humano identificado** para critérios subjetivos. A IA nunca decide aprovação. | `Submission.precheckJson` (critérios objetivos, resultado OK/FALHA/N-A) separado de `JuryReview` (por jurado, por critério, com justificativa). |
| R4 | **A empresa não vê quem participou nem resultados individuais.** O júri da empresa avalia submissões **pseudonimizadas** (código da submissão, peça sem nome, metadados de autoria removidos) e só as que a pessoa **enviou para avaliação**. Nome, perfil e contato só se a pessoa, depois do resultado, escolher compartilhar a submissão com a empresa (RF50.CA09). | `Submission.pseudonym` gerado por desafio; `JuryReview` referencia `submissionId`, nunca `userId`; endpoint do júri responde `404` para dados do autor; `SubmissionShare` explícito, revogável. |
| R5 | **Nenhum ranking de pessoas visível à empresa nem ao público.** O resultado de cada submissão é **por critério** ("atendeu 7 de 8; critérios X, Y não atendidos"; subjetivos em aproxima/atende/supera) e o nível bronze/prata/ouro do selo vem de uma matriz pública dificuldade × rubrica (§4.1.1), nunca de posição relativa e o desafio pode ter "destaques" (até N peças marcadas pelo júri) sem ordem. Contadores agregados (quantas submissões, quantas concluídas) só em número, sem lista. | Sem campo `rank`/`score`; `ChallengeOutcome.status` CONCLUIDO / NAO_CONCLUIDO / DESTAQUE; `GET /api/challenges/{id}/stats` só agregados com `minSamples` ≥ 10 (reuso de `MetricDefinition.minSamples`, RF43). |
| R6 | **Destaque no perfil controlado pela pessoa.** Cada selo tem mostrar/ocultar; padrão **oculto**; a aba "Desafios concluídos" aparece a terceiros só se tiver ao menos um item visível. | `ChallengeBadge.visibility` SO_EU (padrão) · EMPRESA · PUBLICA, independente do público da peça. |
| R7 | **Direito de apagar.** A pessoa exclui a submissão e o selo a qualquer momento; o júri perde acesso; agregados permanecem como número. Exportação junto com o histórico do guia (RF75.CA17). | `DELETE /api/me/challenges/submissions/{id}`; a `Evidence` segue regras de retenção do RF75. |
| R8 | **PI permanece com a pessoa; licença de exibição apenas.** Os termos do desafio não podem conter cessão, exclusividade, "trabalho por encomenda" ou obrigação de entregar fonte à empresa. A empresa recebe no máximo licença não exclusiva de **exibir** as submissões que a pessoa tornou públicas, com crédito. | `ChallengeTerms.ipClause` fixa (texto do produto, não editável); checklist do curador tem item "Sem cessão de PI". |
| R9 | **Proibido usar o desafio como etapa de seleção não declarada.** Termos obrigatórios: "Este desafio não é processo seletivo; a empresa não recebe dados individuais". Se a empresa pretende recrutar, deve fazê-lo fora do WS; dentro, não há canal. Denúncia e suspensão do emissor (RF28 `SUSPENDED`). | `ChallengeTerms.notRecruitmentDeclared = true` obrigatório; denúncia → fila do ADMIN; reincidência → `Company` perde `canPromoteChallenges`. |
| R10 | **Termos aprovados por curador/ADMIN antes de publicar.** Checklist versionado (como `VerificationPolicy` do RF28 §7): enunciado claro, rubrica objetiva/subjetiva separada, júri nomeado, prazo, prêmio em pontos dentro do teto, sem dado pessoal pedido, sem cessão, sem linguagem de vaga. | `ChallengeReview` (curador) com `criteriaJson` OK/FALHA/ANALISTA e decisões APROVAR/AJUSTES/RECUSAR, motivos padronizados (espelho de RF28.CA09–CA10). |
| R11 | **Sem dados sensíveis nem proxies** no enunciado, na submissão ou no júri (RF75.CA12; Lei 9.029 art. 1º). | Validação do enunciado pelo curador; `PersonalDataMasker` (real no `AiGateway`) na pré-checagem; pseudonimização no júri. |
| R12 | **Participar não é sinal de busca de emprego** (D-147). Nenhuma notificação, filtro ou sugestão de pessoas usa "participou do desafio da empresa X"; a empresa onde a pessoa trabalha não é avisada. | `Submission` fora dos campos de descoberta (RF50.CA16); evento sem `companyId` do empregador. |

---

## 3. Mecânica

### 3.1 Ciclo do desafio

```
RASCUNHO (EMPRESA) → EM_REVISAO (curador/ADMIN) → [AJUSTES ↔ EM_REVISAO] → APROVADO → PUBLICADO (aberto a submissões)
→ ENCERRADO_PARA_SUBMISSOES → EM_JULGAMENTO → RESULTADO_PUBLICADO → ARQUIVADO
                                  ↘ RECUSADO            ↘ SUSPENSO (denúncia procedente)
```

| Etapa | Quem | O que acontece | Regras |
|---|---|---|---|
| 1. Proposta | EMPRESA validada (`verified = true`, RF28) | Preenche título, profissão/`OccupationPack`, nível, enunciado, entregáveis (Letter e/ou Drawing + anexos permitidos), rubrica (objetiva + subjetiva), júri (≥ 2 pessoas nomeadas, ao menos 1 da empresa; opcional 1 curador do WS), prazo, prêmio em pontos/itens, termos (texto fixo do produto + campos livres). | Limite por empresa (§3.5); termos de PI e "não é seleção" são fixos. |
| 2. Revisão do curador | CURADOR (`CuratorAppointment` com escopo `DESAFIOS`) ou ADMIN | Checklist R10; pode pedir AJUSTES (motivos padronizados) ou RECUSAR. | Prazo de 3 dias úteis (espelho RF28.CA12, proposta); até 3 reenvios. |
| 3. Publicação | Sistema | Aparece em `/profile?tab=sou-bom&profissao=…` (aba por profissão), em `/challenges` e na página da empresa; sem notificação direcionada por perfil (R12). | A pessoa vê "por que vejo isto": "profissão preferida = Arquitetura" (campo privado; só ela vê a explicação). |
| 4. Participação | Pessoa autenticada | "Participar" cria uma **tarefa-guia** (`GuidedTask` com `templateCode = CHALLENGE:<id>`, `TaskItem.origin = DESAFIO`) em pasta própria; abre Letters/Drawings com o painel Guia (enunciado, critérios, rubrica, prazo). | Nada é visível à empresa; a pessoa pode desistir e apagar. |
| 5. Submissão | Pessoa | "Enviar para avaliação" congela a versão da peça (`artifactVersion`), roda a **pré-checagem objetiva** (IA/heurística, RF75.CA06) e mostra o resultado antes de confirmar; exige declaração de autoria e de ausência de dado confidencial/pessoal de terceiros. | Pré-checagem reprovada **não bloqueia** envio, só avisa (a decisão é do júri). Uma submissão por pessoa por desafio; reenvio substitui até o prazo. |
| 6. Júri | `JuryMember`s | Veem a submissão pseudonimizada e o relatório de pré-checagem; marcam cada critério subjetivo como ATENDIDO/NÃO ATENDIDO/PARCIAL com justificativa (mín. 140 caracteres por critério não atendido); podem marcar "destaque". Decisão por maioria; empate → curador. | O júri não vê nome, perfil, empresa, histórico nem outras submissões da mesma pessoa; conflito de interesse declarado (jurado não avalia quem conhece — mas como não vê nome, a declaração vale por "reconheci a peça"). |
| 7. Resultado | Sistema → pessoa | Cada pessoa recebe **privadamente**: critérios atendidos/não atendidos, justificativas do júri, nome dos jurados, "como foi avaliado" e botão "contestar" (§4.4). Desafio concluído se todos os critérios obrigatórios foram atendidos. | Nada vai à empresa além de agregados. |
| 8. Selo e destaque | Sistema → pessoa | Nasce `Evidence` + `CompetencyEvidence` (RF75.CA07) + `ChallengeBadge` (selo específico, §4.1) + `SealBond basis = DESAFIO` (RF39). Padrão oculto; a pessoa escolhe mostrar no perfil, exportar OB 3.0, compartilhar com a empresa ou oferecer a peça no Balcão. | Prêmio em pontos creditado no ledger (idempotente). |
| 9. Encerramento | EMPRESA/curador | Resultado agregado público ("124 submissões, 61 concluíram, 5 destaques"); peças públicas (opt-in dos autores) em galeria com crédito. | Desafio arquivado continua consultável (enunciado + rubrica) para dar contexto aos selos. |

### 3.2 Níveis

| Nível | Definição (por entrega, não por pessoa) | Exemplo engenharia de software | Exemplo arquitetura | Exemplo direito |
|---|---|---|---|---|
| Iniciante | Entrega única, critérios majoritariamente objetivos, 2–6 h, rubrica até 5 critérios. | Endpoint REST com validação e 5 testes passando. | Planta baixa cotada de um ambiente com legenda. | Resumo estruturado de um caso fictício com identificação das partes e pedidos. |
| Pleno | Entrega composta, mistura objetivo/subjetivo, 6–20 h, rubrica até 8 critérios. | API REST com testes automatizados, OpenAPI e README de decisão. | Estudo de fachada com cortes, especificação de materiais e justificativa térmica. | Parecer sobre caso fictício com fundamentação e jurisprudência indicada. |
| Avançado | Entrega com trade-offs explicitados, revisão de pares, 20–40 h, rubrica até 12 critérios. | API + observabilidade + plano de migração com riscos. | Fachada ventilada em prancha A1 conforme norma indicada no enunciado, com detalhamento. | Parecer + minuta de peça processual + análise de riscos para o cliente fictício. |

O nível descreve **o desafio**; a pessoa nunca é rotulada "pleno". O selo diz o que foi feito (§4.1).

### 3.3 Prêmios (sem dinheiro — RF40.CA08, RF42.CA10)

- **DECIA Points** por conclusão: `PointsEvent DESAFIO_CONCLUIDO`, valor fixado na `DeciaPointsRule` do desafio (teto global por nível, ex. 30/60/120 pontos — **valores a decidir pelo dono do produto**), igual para todos que concluem (sem "1º lugar vale mais", pois não há ranking); "destaque" do júri pode dar bônus único igual para os destacados.
- **Itens do Balcão/Loja** patrocinados: a empresa cadastra `StoreItem` (`StoreItemKind` crédito de IA, skin/capa, kit) com `companyId` e os concede como `BENEFICIO_BONUS` ao concluinte.
- **Modelo chancelado** (opt-in): a pessoa pode oferecer a peça no Balcão na prateleira Chancelados via RF39/RF40 (`SealBond` do desafio é a chancela).
- **Benefício resgatável** (RF39.CA09–CA10): a empresa pode publicar um `Benefit` ligado ao selo (ex. acesso a um curso); resgate pela pessoa, sem que a empresa receba identidade até o resgate — e o resgate avisa claramente "a empresa saberá que você concluiu este desafio".
- Vedado: dinheiro, vaga, entrevista, "fast track" ou qualquer promessa de emprego (R9).

### 3.4 Prazos

- Submissões: mínimo 14 dias, máximo 90 dias; julgamento: até 15 dias úteis após o fechamento (júri que não cumpre é avisado; curador pode completar).
- Contestação: 10 dias após o resultado; resposta em 10 dias úteis.
- Revisão do curador: 3 dias úteis; ajustes da empresa: 30 dias corridos.
- Prazo é exibido sem contagem regressiva ansiogênica (RF75.CA16): "até 30/11", não "faltam 3h12".

### 3.5 Limites por empresa

- Até 3 desafios PUBLICADOS simultâneos por `Company`; até 12 por ano; cada um com 1 a 3 níveis.
- Prêmio total em pontos por desafio limitado pela regra global (teto por participante × teto de participantes premiados ou valor fixo por conclusão).
- Uma empresa com denúncia procedente (uso como seleção, pedido de dado pessoal, cessão de PI) fica 180 dias sem propor.

### 3.6 Métricas (agregadas, `minSamples`)

| Para a empresa (painel do emissor, RF28.CA06) | Para a pessoa | Para o WS (ADMIN) |
|---|---|---|
| Visualizações do desafio, participações iniciadas, submissões, taxa de conclusão por critério ("critério 4 foi o menos atendido: 38 %"), tempo mediano, destaques. Nenhuma lista, nenhum perfil. | "Você atendeu 7 de 8", comparação **com a rubrica**, não com pessoas; opção de ver peças públicas de outros depois de enviar a sua. | Desafios por profissão, por nível, taxa de aprovação do curador, contestações e desfechos, denúncias, custo de IA da pré-checagem (`AiInferenceLog`). |

---

## 4. Destaque no perfil, aba "Desafios concluídos" e chancela de selo

### 4.1 Taxonomia do selo: específico, nunca genérico

O selo (acréscimo do dono do produto em 02/11/2026) representa **algo realizado**, não um atributo da pessoa. Regra de redação, validada pelo curador no checklist: o título do selo é uma frase no pretérito com **verbo de entrega + objeto + condição verificável**; o enunciado do desafio nomeia a norma/padrão quando houver.

| Campo (`ChallengeBadge`) | Conteúdo | Exemplo A (software) | Exemplo B (arquitetura) | Exemplo C (direito) |
|---|---|---|---|---|
| `title` (entrega) | O que foi realizado | "Implementou API REST com testes automatizados e OpenAPI" | "Projetou fachada ventilada em prancha A1 conforme NBR 15575" | "Elaborou parecer jurídico fundamentado sobre caso de responsabilidade civil" |
| `competency` | Competência ESCO/CBO do `OccupationPack` (código + rótulo) | "Desenvolver interfaces de aplicação (ESCO …)" | "Elaborar projetos de fachada" | "Redigir pareceres" |
| `deliverable` | Tipo e URL versionada da peça (`Evidence.artifactUrl`, `artifactVersion`) | Letter técnica + repositório/anexo | Drawing (GLB + PNG, prancha) | Letter |
| `criteriaMet[]` / `criteriaNotMet[]` | Critérios da rubrica, por id, com texto | "Testes cobrem casos de erro", "OpenAPI 3.1 válido"… | "Cotas fecham", "Detalhe de junta"… | "Cita dispositivos aplicáveis", "Conclusão responde às perguntas"… |
| `rubricVersion` | Versão da `ChallengeRubric` usada | v2 | v1 | v1 |
| `challengeVersion` | Versão do `Challenge` (enunciado + errata) | 1.1 | 1.0 | 1.0 |
| `level` | Nível **do desafio** (iniciante/pleno/avançado) — descreve a tarefa | pleno | avançado | pleno |
| `tier` | **Nível do selo: BRONZE · PRATA · OURO** (§4.1.1) — combina dificuldade declarada e validada do desafio com o resultado na rubrica (aproxima/atende/supera); é atributo **da entrega chancelada**, não da pessoa | PRATA (pleno, "atende") | OURO (avançado, "atende") | OURO (pleno, "supera" em ≥ 2/3 dos critérios) |
| `endorsedBy` | Quem chancelou: jurados (nome, papel, organização) e/ou curador; `SealBond.issuerId` | "Júri: M. Silva (Eng. de software, Empresa X), J. Souza (Curadora WS)" | … | … |
| `issuedAt` | Data da chancela | 2026-12-03 | … | … |
| `precheckSummary` | Resultado da pré-checagem objetiva da IA (informativo) | "6/6 verificações objetivas" | … | … |
| `howEvaluated` | Texto "como foi avaliado": camadas, jurados, critérios, contestação | … | … | … |
| `visibility` | SO_EU (padrão) · EMPRESA · PUBLICA | | | |

#### 4.1.1 Nível do selo: bronze, prata e ouro

Acréscimo do dono do produto (02/11/2026): além de nomear a entrega específica, o selo tem **nível** — bronze, prata, ouro — que representa a dificuldade do desafio e/ou o nível de habilidade demonstrado ao concluí-lo. Desenho proposto:

**Dois insumos, uma matriz pública.**

1. **Dificuldade declarada e validada** — a empresa declara `Challenge.level` (iniciante/pleno/avançado); o curador valida no checklist (`ChallengeReviewPolicy` item `NIVEL_COERENTE`: esforço estimado, número e natureza dos critérios, pré-requisitos, exemplos da §3.2) e pode exigir reclassificação (motivo `NIVEL_INCOERENTE`). Depois de publicado o nível não muda.
2. **Resultado na rubrica** — cada critério subjetivo é julgado em três graus, no vocabulário do Open Badges 3.0 e das rubricas educacionais: **aproxima** (approaches), **atende** (meets), **supera** (exceeds). A rubrica publicada descreve, critério a critério, o que é "atende" e o que é "supera" (ex.: "atende: testes cobrem os fluxos principais; supera: testes cobrem casos de erro e concorrência"). Critérios objetivos só têm atendido/não atendido e não contam para "supera". Resultado consolidado da submissão: **CONCLUIDO_ATENDE** (todos os obrigatórios ≥ atende) ou **CONCLUIDO_SUPERA** (todos os obrigatórios ≥ atende **e** ≥ 2/3 dos critérios subjetivos obrigatórios = supera, por maioria do júri). "Aproxima" em algum obrigatório = não concluído (sem selo; a pessoa vê o que faltou e pode reenviar dentro do prazo).

| Dificuldade do desafio ↓ / resultado → | CONCLUIDO_ATENDE | CONCLUIDO_SUPERA |
|---|---|---|
| Iniciante | **Bronze** | **Prata** |
| Pleno | **Prata** | **Ouro** |
| Avançado | **Ouro** | **Ouro** (+ marcação "supera" no credential) |

- **Um mesmo desafio pode gerar níveis diferentes para pessoas diferentes** (bronze ou prata num desafio iniciante; prata ou ouro num pleno), porque o nível resume *a entrega chancelada* ("fez a entrega X com resultado 'supera'"), não um atributo da pessoa. Num desafio avançado todo concluinte recebe ouro; "supera" fica registrado só no `result[]`.
- A empresa pode declarar `tierPolicy = FIXO` para que todos os concluintes recebam o mesmo nível (o da dificuldade): útil quando a rubrica não distingue "supera". O curador valida que a rubrica, se usa "supera", o define por critério.
- **O nível não é ranking e não é comparável entre desafios de empresas diferentes**: o texto "como foi avaliado" diz "Ouro = desafio pleno concluído com 'supera' em 5 de 6 critérios; definido pela matriz pública do Work Station, não por comparação com outras pessoas".

**Como evitar que vire ranking visível a empregadores (D-147, RF75.CA08, RF50.CA12).**

| Garantia | Mecanismo |
|---|---|
| O nível é da entrega, não da pessoa | Não existe "nível do usuário", soma de medalhas, contagem pública "3 ouros", percentil nem progressão Kaggle-style no perfil; a aba lista itens, não totais por metal. O título continua sendo a frase específica; o metal é um atributo do item. |
| Mostrar/ocultar por item | `ChallengeBadge.visibility` cobre o item inteiro; opção adicional **"mostrar sem o nível"** (`showTier = false`) exibe o selo específico sem bronze/prata/ouro. Padrão: oculto. |
| A empresa não vê níveis individuais | Agregados por nível (quantos bronze/prata/ouro) só com `minSamples ≥ 10`; nunca com identidade; `SubmissionShare` é a única via, por iniciativa da pessoa. |
| Sem ordenação, filtro ou busca por nível | `GET /api/people` e pessoas semelhantes (RF50.CA16) não leem `tier`; não há filtro "só ouro" em nenhuma listagem de pessoas; a busca de peças públicas pode filtrar por desafio, não por nível. |
| Sem decadência nem perda | Bronze não "vira" prata com o tempo nem expira por inatividade (RF75.CA08: sem perda de progresso); recertificação só se o `Seal` da empresa a exigir (RF39 UC8) e com aviso. |
| Linguagem | Telas dizem "Selo ouro: Implementou API REST…", nunca "Você é ouro", "nível ouro em Java" ou "melhor que n %". |

**Equivalência com referências externas.**

| Referência | Como define bronze/prata/ouro | Diferença no Work Station |
|---|---|---|
| **Kaggle** (medalhas de competição; conferido parcialmente em 31/10/2026 via Wikipedia, limiares **não conferidos**) | Por **posição relativa** no leaderboard privado: ouro ≈ top 10 (+ fração do tamanho), prata ≈ top 5 %, bronze ≈ top 10 %; as medalhas somam para o nível do perfil (Expert/Master/Grandmaster). | No WS o metal vem da **matriz dificuldade × rubrica**, nunca de posição relativa; não há soma para nível de perfil. É a equivalência de vocabulário (três metais), não de método. |
| **Open Badges 3.0** (`Result`/`ResultDescription`; campos **não conferidos**) | `ResultDescription.resultType` pode ser `RubricCriterionLevel` com `rubricCriterionLevel[]` (ex. approaches/meets/exceeds, cada um com `level`, `points`, `description`); `Result.achievedLevel` aponta para o nível alcançado; `Result.status` (Completed etc.). | Um `ResultDescription` por critério subjetivo com três `rubricCriterionLevel` (aproxima/atende/supera) + um `ResultDescription` "Nível do selo" (`resultType = RubricCriterionLevel`, níveis BRONZE/PRATA/OURO com `description` da matriz). O `achievedLevel` do selo é o metal. Alternativa: `Achievement` distinto por metal (ex. "… — Ouro"); recomenda-se **um `Achievement` por desafio** e o metal em `result`, para que a entrega específica continue sendo o que se verifica. |
| **Frontend Mentor / Exercism** | Dificuldade do desafio em níveis fixos (Newbie→Guru); sem metal por desempenho. | O eixo "dificuldade" do WS equivale; o eixo "supera" é acréscimo. |

**Proibido** no título ou em qualquer campo: adjetivos de pessoa ("bom", "excelente", "sênior"), rótulos de nível aplicados à pessoa ("nível avançado"), percentuais, posição ("top 10 %"), comparação com outros. O curador recusa o desafio se o selo proposto violar isso (motivo padronizado `SELO_GENERICO`).

**A chancela exige revisão humana identificada.** O selo só nasce quando `JuryReview`s de ao menos dois humanos identificados (júri da empresa e/ou curador) atestam os critérios subjetivos; a pré-checagem da IA é condição informativa, nunca suficiente. Um desafio só com critérios objetivos ainda exige a confirmação de um humano identificado (um jurado) para emitir selo — a IA não chancela (RF75.CA07, RF39.CA04 "a IA só justifica").

### 4.2 Alinhamento com Open Badges 3.0 e com `CompetencyEvidence` (RF75)

| OB 3.0 (`AchievementCredential`) | Work Station | RF75 `CompetencyEvidence` |
|---|---|---|
| `issuer` (Profile) | Work Station como emissor técnico; `endorsement`/`endorsedBy` com a empresa e o curador (quem chancelou). Alternativa: emissor = empresa, com endosso do WS — **decisão do dono do produto**; recomenda-se WS emissor para o selo não depender da sobrevivência da conta da empresa. | `validatedBy` |
| `credentialSubject.achievement` (Achievement) | Um `Achievement` **por desafio × nível** (`id` = URL pública do desafio arquivado), `name` = título específico, `description` = enunciado resumido, `achievementType` = "Competency" ou "Assessment" | `competency` |
| `achievement.criteria` (`narrative`, `id`) | Rubrica pública versionada (URL + texto) | `criteriaMet` (lista) |
| `achievement.alignment[]` | ESCO/CBO do `OccupationPack`; norma citada (ex. NBR) como `targetFramework` | — (acréscimo) |
| `credentialSubject.evidence[]` | URL da peça (se pública) ou URL opaca com acesso controlado; `narrative` com declaração de autoria | `artifactUrl`, `artifactVersion`, `authorshipDeclared` |
| `credentialSubject.result[]` + `achievement.resultDescription[]` | Um `ResultDescription` por critério da rubrica (`resultType` = "RubricCriterionLevel", níveis aproxima/atende/supera para subjetivos; "Status" atendido/não atendido para objetivos); `result.achievedLevel` por critério; mais um `ResultDescription` "Nível do selo" com `rubricCriterionLevel` BRONZE/PRATA/OURO e `achievedLevel` = metal (§4.1.1). Nenhum resultado numérico global nem posição. | `criteriaMet` (detalhado por critério) + `tier` (acréscimo) |
| `validFrom`, `validUntil` | Data da chancela; sem expiração por padrão (RF39 permite `recertifyEveryDays`, opcional) | — |
| `credentialStatus` | Revogação por contestação procedente contra, fraude ou pedido da pessoa | — |
| `badgeJson` | O credential assinado serializado | `badgeJson` |

Relação: `ChallengeBadge` **estende** `CompetencyEvidence` (um `ChallengeBadge` referencia exatamente uma `CompetencyEvidence`, que referencia uma `Evidence` da peça). Assim o selo do desafio aparece junto às demais evidências de competência do Guia de Carreira (RF75), com a diferença de ter `endorsedBy` com a empresa e `challengeId`. Campos exatos de Evidence/Result no OB 3.0: **não conferidos** (fonte primária bloqueada em 31/10 e 02/11).

### 4.3 O que aparece no perfil e na aba "Desafios concluídos"

**No perfil (`/profile`, dono) e em `/u/[username]` (terceiros, RF16)** — só itens com `visibility` compatível com o viewer:
- Faixa "Desafios concluídos (n)" no cabeçalho só se n > 0 **visíveis** ao viewer; nunca mostra contagem de itens ocultos (REDE_PROFISSIONAL_VISIBILIDADE: "Não mostrar … aba que vaze dados por contadores").
- Cada card: selo (arte do `Seal` da empresa, RF39.CA11, só com consentimento do dono — UC5) com o **nível bronze/prata/ouro** (ocultável por item, `showTier`), título específico, empresa promotora + curador, data, "critérios atendidos: 7/8" com lista, nível do desafio, link para o enunciado/rubrica arquivados, link da peça **só se a peça for pública** (controles separados), botão "Verificar" (OB 3.0).
- **Sem**: posição, comparação, "entre os melhores", contagem de participantes derrotados.

**Aba "Desafios concluídos" (dono)** — sub-aba de `/profile` dentro de "Sou um bom <profissão>", com estados: concluídos · em andamento · enviados aguardando júri · não concluídos (privado, só a pessoa) · contestações. Em cada item:
- Opt-in **por item**: mostrar no perfil (SO_EU/EMPRESA/PUBLICA), mostrar ou ocultar o nível do selo (`showTier`), mostrar a peça (público da peça, separado), exportar Open Badge 3.0 (JSON/PNG baked), compartilhar com a empresa promotora (`SubmissionShare`, revogável; aviso "a empresa passará a saber que foi você"), oferecer no Balcão.
- "Como foi avaliado": pré-checagem (o que a IA verificou, por item, "como foi calculado"), jurados (nomes, papéis), critério a critério com justificativa, data, versão da rubrica.
- "Contestar" (§4.4). "Apagar" (R7).

**Para terceiros (`/u/[username]?tab=desafios`)**: só se houver item visível; a sub-aba entra na lista do RF16.CA02 como nova sub-aba pública condicional; `GET /tabs/desafios` responde `404` quando não há nada visível (não enumera).

### 4.4 Contestação

- Prazo 10 dias; a pessoa marca o(s) critério(s) contestado(s) e escreve a razão (até 2.000 caracteres).
- Revisão por **curador que não participou do júri** (ou ADMIN), com acesso à submissão pseudonimizada e às justificativas; decisão: MANTIDO · REVISTO (critério passa a atendido; selo emitido/atualizado) · ANULADO (vício no desafio; vale para todos).
- Registro em `ChallengeAppeal` com `decidedBy`, `reason`; "como foi calculado" atualizado. Cumpre o espírito da LGPD art. 20 (revisão e explicação), mesmo a decisão já sendo humana.

---

## 5. Proposta de requisito

**Nome:** RF76 (número a confirmar na renumeração) — **Desafios de Empresa na aba "Sou um bom <profissão>": propor, curar, realizar nos editores, julgar por júri identificado e chancelar com selo específico, sem triagem de pessoas**. Nome de produto: **Desafios**.

**História de usuário:** Como pessoa que quer testar o que sei fazer na minha profissão, quero participar de desafios públicos propostos por empresas validadas, fazendo a peça no Letters ou no Drawings com critérios e rubrica conhecidos de antemão, e ao concluir receber um selo que diga exatamente o que entreguei, chancelado por pessoas identificadas, que eu decido se mostro no perfil — sem que a empresa saiba quem participou, sem ranking e sem que isso vire um processo seletivo.

**HU da empresa:** Como EMPRESA validada, quero propor um desafio com enunciado e rubrica públicos, nomear meu júri e patrocinar o prêmio em DECIA Points, para divulgar minha área e contribuir com a formação da comunidade, recebendo só métricas agregadas.

### 5.1 Critérios de aceite

| CA | Dado / quando / então |
|---|---|
| RF76.CA01 | Dado uma conta EMPRESA com `verified = true` (RF28) e `canPromoteChallenges` ativo, quando cria um desafio, então informa profissão (`OccupationPack`), nível (iniciante/pleno/avançado), enunciado, entregáveis (Letter e/ou Drawing), `ChallengeRubric` com critérios marcados como objetivos (pré-checáveis) ou subjetivos e obrigatórios/opcionais, ao menos 2 `JuryMember`s identificados por nome e papel, prazo de submissão (14–90 dias), prêmio em DECIA Points dentro do teto da regra global e o **título do selo** a ser emitido; os termos fixos do produto ("não é processo seletivo", "a PI permanece com a pessoa; licença de exibição apenas", "a empresa não recebe dados individuais") são exibidos e não editáveis; conta EMPREGADO/CHEFE recebe `403 ACESSO_NEGADO`; empresa com 3 desafios publicados ou 12 no ano recebe `409 LIMITE_DESAFIOS`. |
| RF76.CA02 | Dado um desafio em `EM_REVISAO`, quando o curador (`CuratorAppointment` escopo `DESAFIOS`) ou o ADMIN revisa, então vê o checklist versionado (`ChallengeReviewPolicy`: enunciado sem dado sensível nem linguagem de vaga, rubrica com critérios verificáveis, júri nomeado, prazo, prêmio no teto, selo específico — sem adjetivo de pessoa, nível ou percentual) e decide APROVAR, AJUSTES ou RECUSAR; AJUSTES/RECUSAR exigem ao menos um motivo padronizado (ex. `SELO_GENERICO`, `LINGUAGEM_DE_VAGA`, `PEDE_DADO_PESSOAL`, `CESSAO_PI`), senão `422 VALIDACAO`; APROVAR com item obrigatório pendente → `409 CRITERIOS_PENDENTES`; a empresa tem até 3 reenvios e 30 dias para ajustar. |
| RF76.CA03 | Dado um desafio `PUBLICADO`, quando qualquer pessoa autenticada abre a aba "Sou um bom <profissão>" ou `/challenges`, então vê enunciado, rubrica completa, nomes e papéis do júri, prazo, prêmio, termos e o título do selo, **antes** de participar; a lista é filtrada pela profissão preferida (D-148) com explicação "por que vejo isto" visível só à própria pessoa, e pode ser ampliada para outras profissões; não há convite, elegibilidade por vínculo nem lista de convidados. |
| RF76.CA04 | Dado "Participar", quando confirmado, então nasce um `GuidedTask` (`templateCode = CHALLENGE:<id>`) com `TaskItem.origin = DESAFIO` em pasta própria e a peça abre no Letters/Drawings com o painel Guia (RF75.CA06) mostrando enunciado, critérios, rubrica e prazo; a participação é privada: não aparece no mural, na página da empresa, em sugestões de pessoas (RF50.CA16) nem em qualquer notificação à empresa promotora ou à empresa empregadora (D-147); desistir apaga a tarefa e a peça se a pessoa quiser. |
| RF76.CA05 | Dado "Enviar para avaliação", quando acionado, então a versão da peça é congelada (`artifactVersion`), a IA executa **só** as checagens objetivas da rubrica (tamanho, campos, cotas, vistas, testes/formatos declarados) via `AiGateway` (`AiCapability.PRECHECK_DESAFIO`, com `PersonalDataMasker`) e exibe cada verificação com "como foi calculado"; a pessoa declara autoria e ausência de dado confidencial ou pessoal de terceiros; a pré-checagem reprovada não bloqueia o envio; IA indisponível (`503 IA_INDISPONIVEL`) permite enviar sem pré-checagem; reenviar dentro do prazo substitui a submissão (uma por pessoa por desafio). |
| RF76.CA06 | Dado uma `Submission`, quando persistida, então recebe um `pseudonym` único no desafio e a cópia para o júri remove nome, username, avatar, empresa, metadados de arquivo e assinaturas; qualquer rota do júri que tente acessar dados do autor responde `404 NAO_ENCONTRADO`; os `JuryReview`s referenciam só `submissionId`; a empresa promotora não tem rota para listar participantes nem submissões fora do júri. |
| RF76.CA07 | Dado o período `EM_JULGAMENTO`, quando um jurado avalia, então marca cada critério subjetivo como APROXIMA/ATENDE/SUPERA conforme os descritores publicados na rubrica (objetivos: atendido/não atendido), com justificativa obrigatória (≥ 140 caracteres quando "aproxima" e quando "supera"), vê o relatório de pré-checagem como informação, pode marcar "destaque" (sem ordem) e declara "reconheci a peça/autor" para se abster; a decisão por critério é por maioria de ao menos 2 jurados; empate → curador; não existe campo de nota, pontuação total, posição ou ranking em nenhuma entidade ou tela. |
| RF76.CA08 | Dado o resultado consolidado, quando publicado, então a pessoa recebe privadamente os critérios atendidos/não atendidos, justificativas, nomes dos jurados, versão da rubrica e "como foi avaliado"; o desafio é `CONCLUIDO` quando todos os critérios obrigatórios estão atendidos; a empresa recebe apenas agregados com `minSamples ≥ 10` (submissões, conclusões, taxa por critério, destaques em número); abaixo do mínimo recebe "amostra insuficiente". |
| RF76.CA09 | Dado um desafio `CONCLUIDO` por uma pessoa, quando confirmado, então nascem `Evidence` + `CompetencyEvidence` (RF75.CA07: URL, versão, critérios atendidos, autoria, `validatedBy` = jurados/curador) e um `ChallengeBadge` com título específico de entrega (verbo + objeto + condição), competência ESCO/CBO, entregável, critérios atendidos e não atendidos, `rubricVersion`, `challengeVersion`, nível do desafio, **nível do selo (bronze/prata/ouro, CA17)**, `endorsedBy` (nomes, papéis, organização), data e `precheckSummary`; o selo **nunca** é emitido só pela IA nem sem ao menos dois humanos identificados (ou um jurado + curador) registrados em `JuryReview`; um `SealBond` com `basis = DESAFIO` liga a peça ao `Seal` da empresa (RF39), exibido só com consentimento do dono (RF39 UC5). |
| RF76.CA10 | Dado um `ChallengeBadge`, quando criado, então `visibility = SO_EU`; a pessoa altera por item para EMPRESA ou PUBLICA, independentemente do público da peça (controles separados: mostrar selo ≠ publicar peça); a sub-aba "Desafios concluídos" em `/u/[username]` só existe se há ao menos um selo visível ao viewer e `GET /api/people/{id}/tabs/desafios` responde `404` caso contrário; contadores do cabeçalho contam só o visível. |
| RF76.CA11 | Dado um selo, quando a pessoa pede exportação, então recebe um `AchievementCredential` Open Badges 3.0 assinado pelo Work Station com `achievement` (id = URL do desafio arquivado, `name` = título específico, `criteria` = rubrica, `alignment` = ESCO/CBO e norma citada), `evidence[]` (URL da peça se pública, senão URL opaca de verificação), `result[]` por critério com `resultDescription` (atendido/parcial/não atendido), `endorsement` da empresa e do curador e `credentialStatus` para revogação; o mesmo JSON fica em `CompetencyEvidence.badgeJson`. |
| RF76.CA12 | Dado um resultado, quando a pessoa contesta em até 10 dias, então indica critérios e razão; um curador que não integrou o júri decide MANTIDO/REVISTO/ANULADO em 10 dias úteis com motivo; REVISTO atualiza critérios, selo e credential; ANULADO invalida o critério para todos; a trilha fica em `ChallengeAppeal` e em "como foi avaliado". |
| RF76.CA13 | Dado uma submissão ou selo, quando a pessoa apaga, então a submissão, a `Evidence`, o `CompetencyEvidence`, o `ChallengeBadge`, o `SealBond` e qualquer `SubmissionShare` são removidos nas regras de retenção, o credential é revogado via `credentialStatus`, o júri perde acesso e só o agregado numérico permanece; a exportação do histórico do guia (RF75.CA17) inclui submissões, resultados e selos. |
| RF76.CA14 | Dado o prêmio, quando o desafio é concluído pela pessoa, então o ledger recebe **um** `DeciaPointsLedgerEntry` (`PointsEvent DESAFIO_CONCLUIDO`, `idempotencyKey` = desafio + usuário, `ruleVersionId` da `DeciaPointsRule` do desafio) com valor igual para todos os concluintes; bônus de destaque é igual para todos os destacados; itens patrocinados (`StoreItem.companyId`) são entregues como `BENEFICIO_BONUS`; a conta EMPRESA não ganha pontos; nenhum campo de moeda real, vaga, entrevista ou contratação existe no desafio (RF40.CA08, RF42.CA10, R9). |
| RF76.CA15 | Dado "Compartilhar com a empresa promotora", quando a pessoa aciona após o resultado, então vê o aviso "a empresa passará a saber que você participou e verá sua peça e seu resultado" e confirma; cria `SubmissionShare` revogável, que dá à empresa leitura dessa submissão e identidade — e nada mais (não amplia acesso ao perfil, à análise de carreira ou a outras peças, RF50.CA09); revogar remove a leitura; a empresa não pode solicitar o compartilhamento nem contatar a pessoa pelo desafio. |
| RF76.CA17 | Dado um desafio com `level` validado pelo curador (item `NIVEL_COERENTE`; motivo `NIVEL_INCOERENTE` em AJUSTES) e uma rubrica cujos critérios subjetivos têm descritores publicados de "aproxima", "atende" e "supera", quando o júri consolida o resultado, então cada critério subjetivo recebe o grau da maioria, a submissão é `CONCLUIDO_ATENDE` (todos os obrigatórios ≥ atende), `CONCLUIDO_SUPERA` (idem e ≥ 2/3 dos subjetivos obrigatórios = supera) ou `NAO_CONCLUIDO`, e o `tier` do selo sai da matriz pública versionada (`TierMatrix`: iniciante→bronze/prata, pleno→prata/ouro, avançado→ouro/ouro; `tierPolicy = FIXO` dá a todos o metal da dificuldade); o nível descreve a entrega e **não** a pessoa: não existe campo, contagem, soma, filtro, ordenação, busca ou sugestão de pessoas por metal (`/api/people`, RF50.CA16), a aba lista itens sem totais por metal, a pessoa pode exibir o selo sem o nível (`showTier = false`) ou ocultar o item, a empresa só recebe contagem por metal com `minSamples ≥ 10` e sem identidade, e o texto "como foi avaliado" explica a matriz e diz que o metal não compara pessoas; o metal nunca decai nem expira por inatividade. |
| RF76.CA16 | Dado uma denúncia de uso do desafio como etapa de seleção, pedido de dado pessoal ou cessão de PI, quando o ADMIN a julga procedente, então o desafio passa a `SUSPENSO`, os selos já emitidos permanecem com a pessoa (o mérito é dela), a empresa perde `canPromoteChallenges` por 180 dias e o fato entra no `AuditLog`; os termos do desafio incluem o canal de denúncia. |

### 5.2 Entidades (todas planejadas)

| Entidade | Campos principais | Relações |
|---|---|---|
| `Challenge` | id, `companyId`, `occupationPackCode`, `level` (INICIANTE·PLENO·AVANCADO, validado pelo curador, imutável após publicação), title, statement (markdown sanitizado), deliverables[] (LETTER·DRAWING, formatos), `badgeTitle`, `competencyCode` (ESCO/CBO), `standardsCited[]`, `submissionsFrom/Until`, `judgingUntil`, `status` (RASCUNHO·EM_REVISAO·AJUSTES·APROVADO·PUBLICADO·ENCERRADO·EM_JULGAMENTO·RESULTADO_PUBLICADO·ARQUIVADO·RECUSADO·SUSPENSO), `version`, `errataJson`, `prizeRuleId`, `sealId`, `visibility = PUBLICA` (fixo) | → `Company` (RF28), → `Seal` (RF39), → `DeciaPointsRule` (RF42), → `OccupationPack` (RF75) |
| `ChallengeTerms` | challengeId, fixedClausesVersion (PI, não-seleção, dados), freeText (até 2.000), `notRecruitmentDeclared = true`, `ipClause = LICENCA_EXIBICAO` (único valor), reportChannel | 1:1 `Challenge` |
| `ChallengeRubric` | challengeId, version, criteria[] (`RubricCriterion`: id, texto, `kind` OBJETIVO·SUBJETIVO, `required`, descritores `approachesText/meetsText/exceedsText` para subjetivos, `checkStrategy` para objetivos — reuso de `lib/career/checks/*`), `tierPolicy` (MATRIZ·FIXO) | 1:n por versão |
| `JuryMember` | challengeId, userId, displayName, role, organization, `kind` EMPRESA·CURADOR, declaredConflicts[] | → `User` |
| `ChallengeReview` | challengeId, reviewerId (curador/ADMIN), `policyVersion`, criteriaJson (OK/FALHA/ANALISTA), decision (APROVAR·AJUSTES·RECUSAR), reasonsJson, note (≤ 500) | espelho de `ApprovalRequest` (RF28 §7) |
| `Submission` | id, challengeId, userId (privado), `pseudonym`, guidedTaskId, taskItemId, `artifactUrl`, `artifactVersion`, `precheckJson`, `authorshipDeclared`, `noConfidentialDeclared`, submittedAt, status (RASCUNHO·ENVIADA·EM_JULGAMENTO·CONCLUIDA·NAO_CONCLUIDA·DESTAQUE·RETIRADA) | → `GuidedTask`/`TaskItem` (RF75/RF4), → `Evidence` (RF41/RF75) |
| `JuryReview` | submissionId (nunca userId), juryMemberId, perCriterion[] (criterionId, verdict APROXIMA·ATENDE·SUPERA para subjetivos; ATENDIDO·NAO_ATENDIDO para objetivos, justification), highlight, abstained, reviewedAt | → `Submission`, → `JuryMember` |
| `ChallengeOutcome` | submissionId, criteriaMet[], criteriaNotMet[], perCriterionLevel[] (aproxima/atende/supera consolidado por maioria), status (CONCLUIDO_ATENDE·CONCLUIDO_SUPERA·NAO_CONCLUIDO·DESTAQUE), `tier` calculado pela matriz (`TierMatrix` versionada), consolidatedAt, consolidatedBy (sistema + desempate) | 1:1 `Submission` |
| `ChallengeBadge` | id, `competencyEvidenceId`, challengeId, challengeVersion, rubricVersion, title (específico), competencyCode, deliverable, criteriaMet[], criteriaNotMet[], level (do desafio), `tier` (BRONZE·PRATA·OURO, `tierMatrixVersion`), `showTier`, endorsedBy[] (nome, papel, org, userId), issuedAt, precheckSummary, howEvaluated, `visibility` (SO_EU·EMPRESA·PUBLICA), `sealBondId`, `credentialJson`, `credentialStatus` | → `CompetencyEvidence` (RF75), → `SealBond basis=DESAFIO` (RF39) |
| `ChallengeAppeal` | submissionId, criteria[], reason, filedAt, decidedBy (curador ≠ júri), decision (MANTIDO·REVISTO·ANULADO), decisionReason, decidedAt | → `Submission` |
| `SubmissionShare` | submissionId, companyId, sharedAt, revokedAt | → `Submission`, → `Company` |
| `ChallengeReport` | challengeId, reporterId, kind (SELECAO_NAO_DECLARADA·DADO_PESSOAL·CESSAO_PI·OUTRO), text, decision, decidedBy | → ADMIN |
| Novos valores de enum | `TaskOrigin.DESAFIO`; `SealBondBasis.DESAFIO`; `PointsEvent.DESAFIO_CONCLUIDO`; `AiCapability.PRECHECK_DESAFIO`; `CuratorScope.DESAFIOS`; `ConsentPurpose.PRECHECK_DESAFIO_IA` | |

### 5.3 API (proposta)

| Rota | Quem | Função |
|---|---|---|
| `POST /api/companies/{slug}/challenges` · `PATCH …/{id}` · `POST …/{id}/submit-for-review` | EMPRESA validada | CA01 |
| `GET /api/curation/challenges?status=EM_REVISAO` · `POST /api/curation/challenges/{id}/decision` | CURADOR/ADMIN | CA02 |
| `GET /api/challenges?occupation=&level=&status=PUBLICADO` · `GET /api/challenges/{id}` (enunciado, rubrica, júri, termos, selo) | autenticado | CA03 |
| `POST /api/challenges/{id}/participate` → cria `GuidedTask`; `DELETE /api/me/challenges/{id}/participation` | autenticado | CA04 |
| `POST /api/me/challenges/{id}/submission/precheck` · `PUT /api/me/challenges/{id}/submission` (congela versão, declarações) | autenticado | CA05 |
| `GET /api/jury/challenges/{id}/submissions` (pseudonimizadas) · `PUT /api/jury/submissions/{submissionId}/review` | `JuryMember` | CA06–CA07 |
| `GET /api/me/challenges/submissions/{id}/outcome` · `GET /api/companies/{slug}/challenges/{id}/stats` (agregados) | pessoa · EMPRESA | CA08 |
| `POST /api/me/challenges/submissions/{id}/conclude` → `Evidence` + `CompetencyEvidence` + `ChallengeBadge` + `SealBond` | pessoa | CA09 |
| `PATCH /api/me/challenge-badges/{id}` (visibility) · `GET /api/me/challenge-badges` · `GET /api/people/{id}/tabs/desafios` | pessoa · viewer | CA10 |
| `GET /api/me/challenge-badges/{id}/open-badge` (JSON-LD; `?format=png` baked) · `GET /api/verify/badges/{credentialId}` (público, status) | pessoa · público | CA11 |
| `POST /api/me/challenges/submissions/{id}/appeal` · `POST /api/curation/appeals/{id}/decision` | pessoa · curador | CA12 |
| `DELETE /api/me/challenges/submissions/{id}` · `DELETE /api/me/challenge-badges/{id}` | pessoa | CA13 |
| `POST /api/me/challenges/submissions/{id}/share` · `DELETE …/share` | pessoa | CA15 |
| `POST /api/challenges/{id}/report` · `POST /api/admin/challenge-reports/{id}/decision` | autenticado · ADMIN | CA16 |

Todas as rotas por pessoa passam por `ResourceAuthorizer` (real) com `404 NAO_ENCONTRADO` uniforme; `@AuthorizedBy` nas rotas do júri bloqueia qualquer join com `users`.

### 5.4 Integração com os RFs existentes

| RF | Ponto de integração |
|---|---|
| **RF75** (Guia de Carreira) | Desafio = `GuidedTask` especial (`templateCode = CHALLENGE:<id>`); painel Guia, `EvidenceService.precheck/conclude`, `CompetencyEvidence`, fila do curador e exportação OB 3.0 são **reutilizados**; `OccupationPack` filtra desafios e fornece critérios de rubrica por profissão (CA19). Diferenças: `endorsedBy` com empresa, `challengeId`, prazo externo. A aba "Sou um bom <profissão>" é a sub-aba de carreira por profissão preferida. |
| **RF43** (IA do sistema) | `AiCapability.PRECHECK_DESAFIO` no `AiGateway` com `PersonalDataMasker`, `AiBudget`, `AiInferenceLog`; critérios objetivos via estratégias determinísticas (`lib/career/checks/*`, `LocalEngine`) antes de qualquer LLM; D-12: a IA só interpreta verificações calculadas; nunca participa do veredito subjetivo. |
| **RF42** (DECIA Points) | `PointsEvent DESAFIO_CONCLUIDO` com `DeciaPointsRule` por desafio (criada pela EMPRESA, dentro de teto global do ADMIN); ledger idempotente; EMPRESA `earnsPoints=false`; antifraude (`LedgerStatus SUSPENSO`) para múltiplas contas. |
| **RF40** (Balcão) | Peça concluída pode ser oferecida como modelo (`ModelOffer`) com licença escolhida pela pessoa; `SealBond` do desafio a coloca na prateleira Chancelados; `StoreItem.companyId` para prêmios em itens. |
| **RF39** (Chancelas) | `SealBond basis = DESAFIO`, `Seal` criado pela empresa no Criador de Chancela, exibição só com consentimento do dono (UC5), revogação/recertificação (UC8), benefícios resgatáveis (CA09–CA10) com aviso de identificação. |
| **RF28** (Empresa validada) | Só `verified = true`; `CuratorAppointment` escopo `DESAFIOS`; painel do emissor mostra agregados do desafio; denúncia procedente → `SUSPENDED`/perda de `canPromoteChallenges`; `ChallengeReview` espelha `ApprovalRequest`/`VerificationPolicy`. |
| **RF16** (perfil de terceiros) | Nova sub-aba pública condicional "Desafios concluídos" (`/u/[username]?tab=desafios`), filtrada por `visibility` do selo; cabeçalho conta só o visível; `404` quando vazio. |
| **RF50** | CA06/CA09/CA12 respeitados; o Copilot pode **sugerir** um desafio como tarefa ("este desafio prova a competência X"), nunca inscrever; selos entram como evidência confirmada na síntese (CA03). |
| **RF41/RF71** | `Evidence` real e vínculo peça ↔ tarefa na pasta da tarefa. |
| **Termos de Uso §6** | Cláusula de PI do desafio referencia §6.1–6.2; o desafio **não** é §6.3 (sem vínculo empregatício). Revisão jurídica recomendada. |

### 5.5 Etapas de implementação

| Etapa | Entrega | CAs | Prova |
|---|---|---|---|
| **E1 — Desafio público e participação (sem júri)** | `Challenge`, `ChallengeTerms`, `ChallengeRubric`, `ChallengeReview`; telas da empresa (rascunho → revisão), fila do curador, listagem em `/challenges` e na aba "Sou um bom <profissão>"; "Participar" cria `GuidedTask`; painel Guia com rubrica; pré-checagem objetiva reutilizando `lib/career/checks/*`; submissão congelada com declarações. | CA01–CA05 | Testes: EMPREGADO recebe 403 ao criar; curador não aprova com item pendente; participação não aparece em `/api/people`, no mural nem na página da empresa; pré-checagem reprovada não bloqueia envio; IA indisponível permite envio. |
| **E2 — Júri pseudonimizado, resultado, selo específico com nível e aba** | `JuryMember`, `Submission.pseudonym`, `JuryReview` (aproxima/atende/supera), `ChallengeOutcome` + `TierMatrix`, `ChallengeBadge` (`tier`, `showTier`) + `CompetencyEvidence` + `SealBond DESAFIO`; aba "Desafios concluídos" (dono e terceiros condicional); visibilidade por item; "como foi avaliado"; prêmio em pontos idempotente; agregados com `minSamples`. | CA06–CA10, CA14, CA17 | Testes: rota do júri não devolve nenhum campo de `users` (teste de contrato); selo com título genérico é recusado pelo validador (`SELO_GENERICO`); selo não nasce com < 2 revisões humanas; matriz de nível: iniciante+supera → prata, pleno+atende → prata, avançado+atende → ouro; `/api/people` e pessoas semelhantes não leem `tier`; viewer sem selo visível recebe 404 na sub-aba; dois concluintes recebem pontos iguais; stats com 9 submissões respondem "amostra insuficiente". |
| **E3 — Portabilidade, contestação, exclusão, compartilhamento e denúncia** | Exportação Open Badges 3.0 assinada + verificação pública + revogação; `ChallengeAppeal` com curador independente; apagar em cascata; `SubmissionShare` com aviso e revogação; `ChallengeReport` e suspensão da empresa; métricas do ADMIN. | CA11–CA13, CA15–CA16 | Testes: credential valida assinatura e inclui `result[]` por critério sem total; apagar revoga `credentialStatus` e remove leitura do júri; share revogado → 404 para a empresa; denúncia procedente mantém selos da pessoa e bloqueia novos desafios da empresa por 180 dias. |

### 5.6 Exemplos completos de desafio

**A. Engenharia de software (pleno)** — Empresa X propõe: "Implemente uma API REST de reservas (criar, listar, cancelar) com testes automatizados e especificação OpenAPI". Entregável: Letter técnica (decisões, instruções) + anexo .zip/.link do repositório. Rubrica objetiva (IA): OpenAPI 3.x válido; testes presentes e relatório de execução anexado; README com instruções; sem segredo em texto. Subjetiva (júri: 1 eng. da empresa + 1 curador): modelagem de erros, cobertura de casos limite, clareza das decisões. Selo: **"Implementou API REST com testes automatizados e OpenAPI"** — prata para quem atende; ouro para quem supera em ≥ 4 dos 6 critérios subjetivos (ex. testes de concorrência e versionamento da API descritos como "supera" na rubrica). Prêmio: 60 pontos + 1 crédito de IA avançado (igual para prata e ouro).

**B. Arquitetura (avançado)** — Construtora Y propõe: "Estudo de fachada ventilada para edifício fictício de 8 pavimentos, prancha A1, atendendo aos requisitos de desempenho térmico da norma indicada no enunciado". Entregável: Drawing (3D + prancha PNG) + Letter de memorial. Objetiva: vistas renderizadas, cotas fechando, escala e legenda, memorial com seções exigidas. Subjetiva (júri: 2 arquitetos da empresa + 1 curador): coerência construtiva, detalhamento de juntas e fixações, justificativa térmica. Selo: **"Projetou fachada ventilada em prancha A1 conforme NBR 15575"** (a norma entra como `alignment`; a conformidade afirmada é a **da rubrica**, não uma certificação normativa — o texto "como foi avaliado" deixa isso explícito) — ouro para todo concluinte (desafio avançado); "supera" fica no `result[]`. Prêmio: 120 pontos + kit de materiais no Balcão.

**C. Direito (pleno)** — Escritório Z propõe: "Parecer sobre caso fictício de responsabilidade civil por falha em serviço digital" (fatos fornecidos, sem dado real). Entregável: Letter. Objetiva: estrutura (ementa, relatório, fundamentação, conclusão), extensão 1.500–4.000 palavras, dispositivos citados em formato padrão, ausência de dado pessoal real. Subjetiva (júri: 2 advogados + 1 curador): adequação da fundamentação, tratamento de teses contrárias, clareza da conclusão. Selo: **"Elaborou parecer jurídico fundamentado sobre caso de responsabilidade civil"** — prata (atende) ou ouro (supera em ≥ 2 dos 3 critérios subjetivos, ex. tratamento de teses contrárias com jurisprudência divergente). Prêmio: 60 pontos.

---

## 6. Riscos e perguntas ao dono do produto

1. **Emissor do Open Badge**: Work Station (recomendado, com endosso da empresa) ou a empresa? Afeta a sobrevivência do selo se a empresa sair.
2. **Teto de pontos por nível** e bônus de destaque: valores a fixar (`DeciaPointsRule`), compatíveis com a economia de `docs/produto/DECIA_POINTS.md`.
3. **"Destaque" do júri** é um ranking disfarçado? Proposta: até 5 por desafio, sem ordem, visível só com opt-in do autor, e nunca comunicado à empresa com identidade. Alternativa mais conservadora: sem destaques.
4. **Benefício resgatável** revela identidade à empresa no resgate; manter com aviso explícito ou retirar.
5. **Curadores**: quem são e como são remunerados (pontos?) para dar vazão à revisão e ao desempate; sem curadores o ciclo trava.
6. **Revisão jurídica** da cláusula fixa de PI e do texto "não é processo seletivo" nos Termos de Uso; confirmar leitura do AI Act (Omnibus 2026/1744, prazo do Anexo III) e do art. 20 da LGPD em fonte primária — ambas **não conferidas** nesta sessão.
7. **Nível do selo**: confirmar a matriz (iniciante → bronze/prata; pleno → prata/ouro; avançado → ouro) e o limiar de "supera" (≥ 2/3 dos subjetivos obrigatórios); decidir se "supera" em desafio avançado merece marca própria além de ouro (proposta: não — fica no `result[]`).
8. Confirmar na fonte primária os itens do benchmark marcados "não conferido" quando a rede permitir (todos os domínios da §1 precisam ser liberados nas configurações de rede da sessão).
