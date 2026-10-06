# DECIA — Matriz bibliográfica (referência → conceito → regra → UX → funcionalidade)

Fontes auditadas (nenhuma referência foi adicionada por nós):
`docs/produto/BIBLIOGRAFIA.md` (§1–§8, ABNT simplificada, ★ = núcleo; o próprio arquivo avisa que nenhuma entrada foi
verificada contra o texto integral), Anexo R de `docs/produto/DECIA_SESSAO_E_MESA.md` (REF-*), métodos citados nos
cartões do board (RF43/RF44) e normas em `docs/legal/`.

Regras de leitura:
- Cada linha termina numa **regra implementável** com o identificador usado no código/specs (G1…G12 = regras de ouro do
  `03_MODELO_FUNCIONAL.md` §3; §6.x = regras de cálculo).
- Quando a ideia **não** é sustentada pelas fontes, o pacote marca **PRODUCT HYPOTHESIS** ou **DESIGN PROPOSAL** (§4).
- "Aplicação indireta" = a referência não muda o modelo de decisão em si, mas fixa uma regra de interface, métrica ou
  governança no DECIA. Nenhuma referência ficou sem aplicação.

## 1. Núcleo — deliberação e decisão (BIBLIOGRAFIA §6 + Anexo R)

| Referência | Conceito | Aplicação no DECIA | Elemento UI/UX | Regra implementável |
|---|---|---|---|---|
| ★ Janis (1982) *Groupthink* [REF-JANIS] | pensamento de grupo; advogado do diabo | contestar a escolha antes de decidir | botão **Desafiar a decisão**; papel "red team" | G5, G6; §7 modos de desafio; aviso pré-decisão quando divergência alta foi "resolvida" sem registro |
| Stasser & Titus (1985) [REF-STASSER] | perfil oculto: informação não compartilhada some na discussão | coletar evidência **individual** antes da discussão | evidência atribuída ao autor; "quem ainda não contribuiu" | G5: cada participante pode anexar evidência antes da rodada; contagem de contribuidores por critério na saúde |
| ★ Sunstein & Hastie (2015) *Wiser* [REF-SUNSTEIN] | grupos amplificam erros; papéis e anonimato melhoram | divergência como sinal; papéis DACI | painel de divergência; papéis | G6; §6.2 divergência ≥ 3 destacada; rodada independente |
| Kahneman (2011) *Rápido e devagar* | sistema 1 × sistema 2 | decisões triviais rápidas; decisões de alto impacto lentas e estruturadas | seletor **RAPIDA/PADRAO/PROFUNDA** | §4.4 complexidade sugerida por impacto |
| Kahneman, Sibony & Sunstein (2021) *Ruído* [REF-NOISE] | higiene de decisão; julgamentos independentes; escala comum | avaliações 1–5 independentes antes de ver a média | modo "rodada independente"; "revelar notas" | G5; `independentScoring`; mediana como consenso (§6.1) |
| Surowiecki (2004) *Wisdom of Crowds* | independência + diversidade + agregação | agregar por mediana, não por quem fala primeiro | notas individuais visíveis após a rodada | §6.1 mediana; §6.2 amplitude |
| Argyris & Schön (1978) [REF-ARGYRIS] | aprendizagem de laço simples × duplo | retrospectiva questiona premissas, não só a ação | seção **Execução e revisão**: "quais premissas falharam?" | G8; `DecisionRetrospective.failedAssumptionIdsJson`; lições → memória |
| Habermas (1981) | ação comunicativa: decisões legitimadas por razões explícitas | motivo obrigatório ao decidir | campo **Motivo** | §6.10 guarda: motivo ≥ 10 caracteres |
| Fishkin (2009) | deliberação informada e equilibrada | mostrar evidência contrária lado a lado | coluna "contradiz" sempre visível | `EvidenceLink.stance = CONTRADIZ` nunca filtrado por padrão |
| ★ Conklin (2005) *Dialogue Mapping* [REF-IBIS] | IBIS: questão → posição → argumento | pergunta decisória → alternativas → evidências pró/contra | verso do card = mapa lógico; trilha de estágios | §2 modelo mental; `Decision.question` obrigatória |
| Kunz & Rittel (1970) [REF-IBIS] | issues como elementos de informação | a pergunta é o nó raiz do registro | pergunta é o maior elemento do card | §6.7: pergunta ≥ 15 caracteres e com "?" |
| Rittel & Webber (1973) | problemas perversos (*wicked*) | enquadramento iterativo; reabrir é normal | estado ENQUADRAMENTO ↔ PESQUISA; REABERTA | §4.3 transições de volta; reabertura gera novo snapshot |
| M. Klein (2012) Deliberatorium | métricas de mediação de atenção | priorizar o que precisa de atenção | aba **Precisa de atenção** | 05 §2: fila por prontidão/frescor/checkpoints |
| Small et al. (2021) Polis | mapear agrupamentos de opinião | mostrar onde o grupo discorda | heatmap de divergência por critério | §6.2 por (alternativa, critério) |
| Buckingham Shum et al. (2006) gIBIS e **QOC** | *Questions–Options–Criteria* (design rationale) | matriz alternativas × critérios | **CriteriaMatrix** | §6.1 (a matriz é QOC; a soma ponderada é PRODUCT HYPOTHESIS) |
| ★ Amershi et al. (2019) *Guidelines for Human-AI Interaction* [REF-AMERSHI] | G1 deixe claro o que a IA faz; G2 quão bem; G8/G9 dispensar/corrigir fácil; G11 explicar o porquê | IA sugere, humano aceita; limitações visíveis | **AiSuggestion** ✦ aceitar/descartar; "limitações" | G2, G10; §7 quatro porquês obrigatórios |
| ★ Shneiderman (2022) *Human-Centered AI* | alto controle humano + alta automação | automação de organização, nunca da escolha | botão Decidir só humano | G1; §8 só o responsável decide |
| Parasuraman, Sheridan & Wickens (2000) | níveis de automação por estágio (informação → decisão → ação) | IA nos estágios de informação/análise; decisão nível baixo de automação | IA nunca aparece como responsável | G1; domínio rejeita `owner` ausente; `DecisionEvent.actor` nulo = IA só para sugestões |
| Tessler et al. (2024) | LLM mediando posições divergentes | IA facilitadora descreve divergências | mensagens "Há forte divergência em Segurança" | §7 facilitador estrutural |
| Argyle et al. (2023) | IA melhora qualidade do discurso por sugestões | reescrita com diff e aceite | diff antes de aplicar | §8 "texto humano nunca sobrescrito" |
| Mittelstadt et al. (2016) | opacidade, viés e responsabilidade de algoritmos | modelo transparente primeiro; proveniência | contribuições por critério; ✦ | G3; `aiInferenceId` em todo conteúdo IA |
| Doshi-Velez & Kim (2017) | interpretabilidade rigorosa | explicação não é prova causal | rótulo "explicação gerada" | §7: explicações nunca apresentadas como causalidade |
| Lei 13.709/2018 (LGPD) art. 20 | revisão de decisões automatizadas | reconstruir o que se sabia; humano decide | "No momento da decisão" | G7 snapshot com hash; G1 |
| Regulamento (UE) 2024/1689 (AI Act) | supervisão humana; classificação de risco | decisões de alto impacto com mais controle | PROFUNDA para impacto ALTO/CRÍTICO | §4.4; trilha + `audit_log` para impacto ≥ ALTO |
| Toulmin (1958) [REF-TOULMIN] | alegação, dados, garantia, qualificador, refutação | separar fato/evidência/opinião/premissa/previsão | **StatementNatureChip** | G4, G10; `EvidenceNature`; confiança = qualificador ≠ dados |
| Kialo [REF-KIALO] | pró/contra por tese; consenso por opção | trade-offs por alternativa | **TradeOffView** | prós/contras por alternativa; divergência por opção |
| Loomio [REF-LOOMIO] | rodada de consentimento com prazo | aprovação com prazo; DEVOLVIDA | prazo de aprovação | FinalDecision EM_REVISAO → DEVOLVIDA volta a COMPARACAO (§4.3) |
| Sociocracia / consentimento [REF-SOC] | "nenhuma objeção grave" em vez de unanimidade | aprovador registra objeções | objeção como risco | objeção → `DecisionRisk(source=RED_TEAM)` |
| Delphi (RAND) [REF-DELPHI] | rodadas anônimas com retorno | rodada independente opcional | "revelar notas" | G5 |
| NGT — Delbecq & Van de Ven (1971) [REF-NGT] | geração silenciosa → votação | alternativas propostas individualmente | lista de alternativas por autor | G5; alternativas antes da discussão |
| Double Diamond (2005) [REF-DD] | divergir → convergir | estágios 1–4 abrem, 5–7 fecham | trilha de estágios | §2 |
| Liberating Structures [REF-LS] | estruturas para grupos grandes | ≥ 10 participantes → PROFUNDA + rodada independente | sugestão automática | §4.4 (participantes ≥ 5 sugere PROFUNDA) |
| DACI (Intuit/Atlassian) [REF-DACI] | Driver, Approver, Contributor, Informed | papéis da decisão | painel de participantes | `DecisionRole` {CONDUTOR, APROVADOR, CONTRIBUIDOR, INFORMADO} |
| RAPID (Bain) [REF-RAPID] | Recommend ≠ Decide | IA no máximo "Recommend" | recomendação separada da escolha | G2; `DecisionRecommendation` ≠ `selectedAlternativeId` |

## 2. Colaboração, mensageria e memória (BIBLIOGRAFIA §2, §3, §7)

| Referência | Conceito | Aplicação no DECIA | Elemento UI/UX | Regra implementável |
|---|---|---|---|---|
| ★ Ellis, Gibbs & Rein (1991) | groupware: espaço compartilhado | workspace único por decisão (não modal) | Decision Workspace | 05 §3 |
| ★ Grudin (1994) CSCW / ★ Grudin (1994) groupware falha | quem registra ≠ quem se beneficia → abandono | reduzir o custo de registrar | Decisão rápida; divulgação progressiva | §4.4 RAPIDA com 5 campos |
| Schmidt & Bannon (1992) | trabalho de articulação | dependências e responsáveis explícitos | campo dependências; checkpoints | `Decision.dependenciesMd`; `DecisionCheckpoint` |
| Johansen (1988) | matriz tempo × espaço | rodadas assíncronas e sessões síncronas | sessão (síncrona) × workspace (assíncrono) | §1 origens da decisão |
| Malone & Crowston (1994) | coordenação = gestão de dependências | decisão → trabalho ligado | "Gerar tarefas" | `DecisionWorkLink` (sem copiar tarefa) |
| Dourish & Bellotti (1992) [REF-DOURISH] | awareness | ver estado, quem contribuiu, o que falta | trilha de estágios; "salvo há Xs"; contribuidores | 05 §5 visibilidade |
| Olson & Olson (2000) | distância importa; contexto compartilhado | registro autoexplicativo para quem não esteve | verso do card resume a lógica | 04 §4.2 |
| ★ Pimentel & Fuks (2011); ★ Fuks et al. (2005) 3C | comunicação, coordenação, cooperação | sessão = comunicação; papéis/checkpoints = coordenação; matriz = cooperação | seções do workspace | 05 §3 |
| Gerosa et al. (2006) | awareness em 3C | sinais de estado no card | chips do card | 04 §4.1 (≤ 5 sinais) |
| Anais do SBSC | pesquisa nacional em sistemas colaborativos | fonte para testes de usabilidade locais | — | backlog P4: estudo com servidores |
| ★ DeSanctis & Gallupe (1987) GDSS | GDSS níveis 1–3 (comunicação → modelos → regras) | DECIA cobre nível 2 (modelos: matriz, cenários) | Comparar | §6 |
| Nunamaker et al. (1991) EMS | entrada paralela e anônima | rodada independente | — | G5 |
| Briggs et al. (2003) ThinkLets | padrões reutilizáveis de facilitação | modelos de decisão por tipo | **Modelos** (arquitetura, fornecedor, go/no-go…) | `templateKey`; 06 §modelos |
| Dennis et al. (2001) meta-análise GSS | efeito depende do ajuste tarefa-tecnologia | complexidade proporcional | seletor de complexidade | §4.4 |
| ★ Daft & Lengel (1986) riqueza de mídia | problemas equívocos pedem mídia rica | decisão profunda pode abrir sessão DECIA | "Discutir em sessão" | `decisions.session_id` |
| ★ Dennis, Fuller & Valacich (2008) sincronicidade | transmitir (assíncrono) × convergir (síncrono) | evidência assíncrona; convergência síncrona | workspace × sessão | §1 |
| Sproull & Kiesler (1991) | comunicação mediada reduz pistas de status | rodada independente diminui efeito hierárquico | notas ocultas até revelar | G5 |
| Walther (1996) | comunicação hiperpessoal | avaliações com justificativa curta | campo "por quê" na nota | `CriterionAssessment.rationale` |
| Treem & Leonardi (2012) | visibilidade, persistência, editabilidade | persistência e editabilidade com trilha | linha do tempo | `DecisionEvent` |
| ★ Leonardi, Huysman & Steinfield (2013) | mídias sociais corporativas | menções e comentários na decisão | comentários | backlog colaboração |
| ★ Handel & Herbsleb (2002); Nardi et al. (2000); Lin et al. (2016); Stray et al. (2019) | chat no trabalho: interrupção e perda de contexto | decisões saem do chat para um registro | "Transformar em decisão" na sessão | §1; RF29 rastro |
| Newport (2021) *A World Without Email* | fluxo hiperativo de mensagens | checkpoints em lote, sem pings | resumo diário de "precisa de atenção" | notificações agrupadas |
| Microsoft *Work Trend Index* | sobrecarga de reuniões | decisão assíncrona quando possível | Decisão rápida | §4.4 |
| ★ Hohpe & Woolf (2003); Kleppmann (2017) | mensageria e dados consistentes | eventos de decisão para notificações/analytics | — | `DecisionEvent` → outbox |
| Evans (2003) DDD; Vernon (2013) | agregados e contextos | `Decision` como agregado; card = view model | — | 04 §3; contexto 5b |
| Richardson (2018) outbox | publicação confiável de eventos | eventos de decisão via `domain_events` | — | backlog P1 aplicação |
| Fowler (2005) Event Sourcing [REF-FOWLER-ES] | estado reconstruível por eventos | snapshot + eventos append-only | "No momento da decisão"; linha do tempo | G7; snapshot/evento RESTRICT |
| ★ Nonaka & Takeuchi (1995) | externalização do tácito | motivo e lições explícitos | campos Motivo e Lições | §6.10; `lessonsMd` |
| Walsh & Ungson (1991) [REF-WALSH] | memória organizacional (repositórios de retenção) | decisão → resultado → revisão → lição reutilizável | "Lição reutilizável" → Memória (RF33) | `shareAsLesson` |
| Ackerman & Halverson (2000) | memória precisa de recontextualização | mostrar diferenças de contexto antes de reaproveitar | "Encontrar decisões parecidas" | 05 §4 criar |
| Davenport & Prusak (1998) | conhecimento ligado à fonte | evidência com fonte e data | campos fonte/data | `sourceLabel`, `observedAt`, `retrievedAt` |
| Wenger (1998) comunidades de prática | aprendizagem compartilhada | lições visíveis no departamento | revisões compartilhadas | visibilidade DEPARTAMENTO |
| Choo (1998) | organização do conhecimento: sentido → conhecimento → decisão | estágios 1–3 antes de 4–7 | trilha | §2 |
| Batista (2012, IPEA) | gestão do conhecimento no setor público | memória institucional de decisões | aba Revisões | RF33 |

## 3. Equipes, metas, gamificação, setor público (BIBLIOGRAFIA §1, §4, §5, §8) — aplicação indireta

| Referência | Conceito | Aplicação no DECIA | Elemento UI/UX | Regra implementável |
|---|---|---|---|---|
| ★ Edmondson (1999, 2018) [REF-EDMONDSON] | segurança psicológica | contestar premissas é norma, não ataque | "Contestar premissa" neutro; sem ranking de quem errou | G12; padrões só privados |
| Duhigg (2016) / Projeto Aristotle | segurança psicológica em equipes | idem | — | G12 |
| Lencioni (2002) | medo de conflito | divergência como sinal | painel de divergência | G6 |
| Tuckman (1965); Marks et al. (2001); Salas et al. (2005); Kozlowski & Ilgen (2006); Mathieu et al. (2008); ★ Katzenbach & Smith (1993); ★ Hackman (2002) | processos e eficácia de equipes | papéis claros e responsabilidade | DACI | `DecisionRole`; G1 |
| Pentland (2012) | padrões de comunicação | contribuição equilibrada | contribuidores por critério | saúde `stakeholderAlignment` |
| ★ Locke & Latham (2002, 1990); Drucker (1954); Doerr (2018) | metas específicas e mensuráveis | objetivo explícito e resultado verificável | campos Objetivo e Resultado | `objective`; `DecisionOutcome.metricsJson`; previsões binárias |
| Kaplan & Norton (1992) | BSC | critérios estratégicos em modelo "Investimento" | modelo | `templateKey = INVESTIMENTO` |
| Forsgren et al. (2018) DORA | métricas de entrega | critérios técnicos no modelo "Arquitetura" | modelo | `templateKey = ARQUITETURA` |
| Skelton & Pais (2019) | topologias de equipe | dependências entre times | campo dependências | `dependenciesMd` |
| Schwaber & Sutherland (2020) | Scrum | decisão de backlog (sprint) | modelo "Priorização de produto" | 06 §2 |
| ★ Hertel et al. (2005); Jarvenpaa & Leidner (1999); Cramton (2001); Gibson & Cohen (2003); Hinds & Kiesler (2002); Lipnack & Stamps (1997); Bloom et al. (2015); Yang et al. (2022); Gratton (2021) | equipes remotas/híbridas: contexto e confiança | registro autoexplicativo e assíncrono | verso do card; workspace | 04 §4.2 |
| Chiavenato (2014); Dutra (2016); Bergamini (2008); Fleury & Fleury (2001) | gestão de pessoas/competências | modelo "Pessoas" com cautela; nada de avaliar pessoas pela decisão | tipo PESSOAS | `DecisionKind.PESSOAS`; G12 |
| ★ Ryan & Deci (2000); Deci & Ryan (1985) | autodeterminação: autonomia | usuário escolhe complexidade e critérios | seletores | §4.4; critérios não universais |
| ★ Deci, Koestner & Ryan (1999) [REF-DECI-CROWDING]; Frey & Jegen (2001) | recompensa extrínseca desloca motivação | sem XP por quantidade | — | G9; Q-152 |
| Herzberg (1968); Vroom (1964); Hackman & Oldham (1976); Kahn (1990); Bakker & Demerouti (2007); Pink (2009) | motivação e engajamento | valor percebido do registro (aprender) > pontos | aba Revisões com lições | G9 |
| Adams (1965) | equidade percebida | regras transparentes de qualquer indicador | ⓘ explicando cada cálculo | §5; ajuda contextual |
| ★ Brun & Dugas (2008); Luthans & Stajkovic (1999, 2003); Gallup | reconhecimento | reconhecer revisões concluídas, não volume | — | Q-152 |
| ★ Deterding et al. (2011); ★ Hamari et al. (2014); Koivisto & Hamari (2019); Robson et al. (2015); Cardador et al. (2017); Landers et al. (2017); Nicholson (2015); Werbach & Hunter (2012); Chou (2015); Zichermann & Cunningham (2011); Burke (2014) | gamificação: efeitos dependem do contexto | DECIA não é gamificado no núcleo | sem pontos no card | G9; card não mostra DP |
| Mollick & Rothbard (2014) | jogos obrigatórios no trabalho reduzem afeto | indicadores pessoais opt-in | "Calibração das minhas previsões" privada | G12; §6.9 |
| ★ Resnick et al. (2000); Dellarocas (2003); Antin & Churchill (2011); Gibson et al. (2015) | reputação e badges | nada de reputação por decisão no card | — | G9 |
| 1EdTech Open Badges | credenciais verificáveis | fora do núcleo (selos RF39 continuam separados) | — | sem ligação automática decisão → selo além de RF39 |
| Festinger (1954) | comparação social | sem ranking de decisores | — | G12 |
| ★ Kerr (1975) [REF-KERR]; Goodhart (1975)/Strathern (1997) [REF-GOODHART]; Campbell (1979); Muller (2018) | métrica vira alvo e é corrompida | métricas de produto não viram metas individuais | — | §9; G9 |
| Ajunwa et al. (2017) [REF-AJUNWA]; Ball (2010); Zuboff (2019) [REF-ZUBOFF] | vigilância no trabalho | padrões de decisão privados ao usuário | — | G12 |
| ★ Perry & Wise (1990); Perry (1996); Weibel et al. (2010); Frey (1997) | motivação do serviço público | foco em decisões melhores para o cidadão, não pontos | — | G9 |
| ★ Dery et al. (2017); Köffer (2015); Williams & Schubert (2018); Attaran et al. (2019); Deloitte (2014); Drucker (1999) | local de trabalho digital | DECIA integrado ao Work Station (tarefas/projetos) | Decisão → trabalho | `DecisionWorkLink` |
| ★ Bellotti et al. (2004); González & Mark (2004); Czerwinski et al. (2004); Mark et al. (2008); Whittaker & Sidner (1996); Allen (2001) | fragmentação e retomada de tarefas | retomar uma decisão rapidamente | "Próxima ação" no card; "onde parei" | view model `nextAction` |
| Anderson (2010) *Kanban* | WIP | execução da decisão vira tarefas no fluxo existente | tarefas ligadas | respeita WIP do RF44 |
| Newport (2016); Csikszentmihalyi (1990) | trabalho profundo / fluxo | não interromper: checkpoints agendados | — | notificações agrupadas |
| ★ Bergue (2019, 2014); Bresser-Pereira (1996); Abrucio (2007); ENAP; OCDE (2010) | gestão pública e governança | trilha de auditoria; responsabilidade | — | §8 trilha; `audit_log` impacto ≥ ALTO |
| Decreto 11.072/2022 (PGD); IN 24/2023; Decreto 9.991/2019; Leis 13.467/2017 e 14.442/2022; Filardi et al. (2020); Rocha & Amador (2018) | teletrabalho e programa de gestão | decisões assíncronas e rastreáveis para equipes distribuídas | workspace | 05 §3 |
| Lei 12.527/2011 (LAI); Lei 14.129/2021; Guia ANPD (2022); LGPD | transparência × sigilo | visibilidade + classificação de acesso; IA externa só se permitido | seletor de visibilidade | §8; `AccessClassification.allowsExternalAi()` |

## 4. Ferramentas e métodos do Anexo R e do board

| Referência | Conceito | Aplicação no DECIA | Elemento UI/UX | Regra implementável |
|---|---|---|---|---|
| Google Docs [REF-GDOCS] | sugestões com aceite | IA e colegas sugerem; dono aceita | diff de sugestão | §8 |
| Notion [REF-NOTION] | seções com responsáveis | seções do workspace com responsável opcional | avatar por seção | backlog P3 |
| Figma/FigJam [REF-FIGMA] | presença, votação | rodada de avaliação com prazo | "rodada aberta até…" | G5 |
| Miro [REF-MIRO] | estacionamento | itens fora do escopo registrados | campo Escopo/"fora do escopo" | `scope` |
| Slack [REF-SLACK] | citar mensagem | citar mensagem da sessão como evidência | "Usar como evidência" | `DecisionEvidence` com origem sessão |
| Microsoft Loop [REF-LOOP] | componente vivo | card de decisão embutível em outros lugares | modo COMPACT | 04 §6 |
| Yjs / Automerge / OT [REF-YJS, REF-AUTOMERGE, REF-OT] | coedição | coedição do workspace fica para depois; lock otimista agora | "atualizada por outra pessoa" | `version` + erro específico |
| Board RF43: EVM, PERT, CPM, Monte Carlo, PMBOK, PRINCE2 | estimativa sob incerteza | cenários melhor/base/pior; previsão de prazo | **Cenários** | `DecisionScenario`; previsões |
| Board RF43: Stage-Gate (Cooper), TRL | portões go/no-go | modelo **Go / No-Go** | modelo | `templateKey = GO_NO_GO` |
| Board RF43: Lean Startup, OKR, Lean/Business Canvas | hipóteses de negócio | premissas com validação | registro de premissas | `DecisionAssumption` |
| Board RF43: ITIL 4, DORA, COBIT, TCO | operação e custo total | critérios do modelo Arquitetura | modelo | critérios TCO, operação |
| Board RF43: "matriz de risco" | probabilidade × impacto | severidade calculada | **RiskBadge** | §6.6 |
| Board RF44: Eisenhower (urgente × importante) | urgência ≠ importância | **impacto, urgência e risco separados** | três chips distintos | §5; `impact`, `urgency` |
| Board RF44: WSJF / custo do atraso (Reinertsen) | atrasar tem custo | prazo e contagem regressiva | HERO com contagem | `targetDate` |
| Board RF44: Pareto (80/20), MoSCoW | priorização | modelo "Priorização de produto" | modelo | `templateKey = PRIORIZACAO` (Pareto 80/20 ≠ dominância de Pareto, que é DESIGN PROPOSAL §6.3) |
| Board RF44: Deming PDCA, ISO 9001, Lean | ciclo planejar-fazer-verificar-agir | executar → checkpoint → revisar → aprender | trilha 8–9 | `DecisionCheckpoint`; retrospectiva |
| Board RF44: Goldratt (TOC), Little's Law | gargalos e fluxo | dependências críticas da execução | — | `dependenciesMd` |
| Board RF45: média bayesiana, meia-vida | robustez estatística | calibração só com n ≥ 10 | — | §6.9 |

## 5. O que NÃO está sustentado pelas fontes (marcado no pacote)

| Ideia | Marcação | Onde | Referência que faltaria (não adicionada; Q-156) |
|---|---|---|---|
| Soma ponderada / MCDA, pesos normalizados | PRODUCT HYPOTHESIS | §6.1 | Keeney & Raiffa; Saaty (AHP) |
| Dominância de Pareto e análise de sensibilidade de pesos | DESIGN PROPOSAL | §6.3, §6.4 | literatura de MCDA |
| Calibração, Brier score | PRODUCT HYPOTHESIS | §6.9 | Brier (1950); Tetlock & Gardner (2015) |
| Pré-mortem | PRODUCT HYPOTHESIS | 05 §3 | G. Klein (2007) — a "Klein" da bibliografia é **Mark** Klein (Deliberatorium) |
| Boa decisão × mau resultado | PRODUCT HYPOTHESIS | G8 | literatura de qualidade de decisão |
| 10 heurísticas de usabilidade | PRODUCT HYPOTHESIS | 05 §5 | Nielsen (1994) |
| Limiares numéricos (divergência ≥ 3, força FORTE ≥ 6, sensível ≤ 10 pp, faixas de confiança) | DESIGN PROPOSAL | §6 | — (calibrar com uso real) |
| Valores das células da matriz de risco | DESIGN PROPOSAL | §6.6 | (o board só cita "matriz de risco") |
| ADR (Architecture Decision Records) | DESIGN PROPOSAL | 06 §1 exportação | Nygard (2011) |
| Lei de licitações para o exemplo de fornecedor | fora do escopo jurídico | 06 §3 | Lei 14.133/2021 não está na bibliografia; "Pessoas cuidam do jurídico" |
