# DECIA — Sessão deliberativa e Mesa do DECIA (pesquisa de produto)

**Produto:** Work Station (centro: DECIA). **Escopo:** fluxo da sessão (RF4–RF17, RF29, RF37), anatomia do "Esquema de Sessão", Mesa do DECIA, coedição (Minuta Coletiva), papéis/ritmo/DECIA Points, mudanças propostas no board.
**Documentos irmãos:** [`../arquitetura/TAXONOMIA.md`](../arquitetura/TAXONOMIA.md) §5 · [`../arquitetura/ARQUITETURA.md`](../arquitetura/ARQUITETURA.md) §5.2 · [`../diagramas/RF4..RF17, RF22, RF29, RF37`](../diagramas/) · [`../design-system/DESIGN_SYSTEM.md`](../design-system/DESIGN_SYSTEM.md) · [`../DECISOES.md`](../DECISOES.md) · `COEDICAO_TECNICA.md` (prova de conceito de coedição, documento do outro agente) · wireframes `/lab/decia` (outro agente).
**Diagramas deste documento (PlantUML + PNG):** [`decia/sessao-estados.puml`](decia/sessao-estados.puml) → `DECIA_Sessao_Estados.png` · [`decia/sessao-sequencia.puml`](decia/sessao-sequencia.puml) → `DECIA_Sessao_Sequencia.png` · [`decia/sessao-classes.puml`](decia/sessao-classes.puml) → `DECIA_Sessao_Classes.png` (renderizados com PlantUML 1.2025.4, layout smetana — sem Graphviz na máquina).

**Convenções de citação.** `board <card> (dump l.n)` = card do Trello Work Station no dump lido em 2026-10-03 (`scratchpad/board.md`, linha n). `TAX §x` = TAXONOMIA.md. `FAI <arquivo:linha>` = repositório `tcc-2026-fashion-ai-backend`. `[REF]` = referência externa listada no Anexo R. Tudo que não tem fonte citada está marcado **(proposta)** e precisa de validação do dono do produto. Numeração dos RFs: a do corpo dos cards/CAs (antiga, RF4–RF17 = sessão), conforme `diagramas/RENUMERACAO.md` e Q-44 — ver pergunta QS-01.

---

## 0. Resumo executivo (recomendações principais)

1. **Enum `SessionStatus` nova** com 12 valores (§A.1): `RASCUNHO · AGENDADA · ABERTA · CONVERGINDO · DECISAO_PROPOSTA · EM_REVISAO · VALIDADA · DEVOLVIDA · REABERTA · ENCERRADA · ARQUIVADA · CANCELADA`, mantendo cada estado da TAXONOMIA por renomeação e acrescentando 4 (AGENDADA, VALIDADA, DEVOLVIDA, CANCELADA). As **fases de deliberação** ficam num atributo separado (`phase: DeliberationPhase`) dentro de ABERTA/REABERTA, com modo `GUIADO` (padrão), `LIVRE` e `ESTRITO` — fases guiam, não bloqueiam, exceto CONTEXTO (automática) e DECIDIR (gatilho do resumo).
2. **Tela da sessão = uma casca fixa + visões intercambiáveis** (§B.4): Faixa de Objetivo com PercentBar "rumo à decisão" sempre no topo; visões `Chat · Mesa · Mapa · Resumo · Minuta` como abas (desktop: chat + painel lateral; celular: abas inferiores). O **Chat classificado com painel lateral** é a visão padrão (é o que o FAI já tem e o que escala de 3 a 30 pessoas); a **Mesa** é a visão de convergência; o **Mapa IBIS/Toulmin** é gerado pela IA e usado em leitura; o **Resumo vivo** é o RF11 em versão contínua.
3. **Mesa do DECIA organizada por opção em discussão** como padrão (colunas = opções; cartões = argumentos/evidências/riscos classificados pelo RF7), com visões alternativas **matriz opções × critérios** (fase CONVERGIR) e **linha do tempo**; "por fase do projeto" só quando há `linkedProjectId`; canvas livre só como **estacionamento** (§C.2).
4. **Minuta Coletiva** como esquema colaborativo dedicado (§D), somente leitura quando a decisão é VALIDADA, com IA bloqueada para RESTRITO/SIGILOSO, toda edição no rastro, ≤ 10 editores simultâneos e latência alvo ≤ 300 ms. Comparativo técnico: **Yjs + Hocuspocus** (ou servidor Yjs próprio atrás do Spring) é a recomendação de base; o PoC do outro agente decide.
5. **DECIA Points na sessão nunca por volume** (§E.3): só eventos confirmados pela IA e já previstos no RF42; propostas de **limite de DP por sessão e por pessoa**, bônus por **relator** e por **"mudei de ideia com evidência"** (sinal deliberativo do objetivo 2), e Hype da sessão derivado de métricas determinísticas (D-12).
6. **Board:** 23 mudanças propostas (§F.1) — principalmente recriar os cards RF4–RF17 da sessão (hoje sem card, RENUMERACAO.md), escrever CAs para fases/Mesa/Minuta/papéis, e ajustes em RF22, RF29, RF37, RF42. 14 perguntas (§F.2).

---

## A. Fluxo da sessão

### A.1 Máquina de estados e reconciliação com `SessionStatus`

Fonte atual: `TAX §5.1` — `PROPOSTA · ATIVA · EM_RESUMO · EM_DECISAO · EM_REVISAO · REABERTA · ENCERRADA · ARQUIVADA`; diagramas em `diagramas/RF4, RF5, RF12, RF14, RF15, RF17` (§4 de cada) e `ARQUITETURA.md §5.2`. Lacunas encontradas nos diagramas atuais: (i) não há estado para "aceita, mas ainda não começou" (convites, pauta, contexto preparado pela IA); (ii) a votação de reabertura (RF14) acontece "dentro" de EM_REVISAO, misturando revisão com votação; (iii) VALIDADA/DEVOLVIDA só existem em `FinalDecision.status`, então o card da sessão não consegue mostrar o carimbo sem consultar a decisão; (iv) Q-26 pergunta onde cai a recusa da proposta.

**Enum proposta (proposta):**

| Novo valor | Equivale a (TAX §5.1) | Por quê |
|---|---|---|
| `RASCUNHO` | `PROPOSTA` | HU5: o grupo propõe; RF4: admin define tema/acesso. "Rascunho" diz melhor que tema/objetivo ainda mudam (RF4.CA03 derivado). |
| `AGENDADA` | — (novo) | Sessão aceita pelo admin com `scheduledAt`; convites, lembretes, IA prepara contexto (tarefas do projeto RF29.CA01, precedentes RF33.CA03). Opcional: RASCUNHO → ABERTA direto. |
| `ABERTA` | `ATIVA` | Nome do brief; "EM_DELIBERAÇÃO" fica como rótulo de UI da etiqueta ("Aberta · em deliberação · fase Divergir"). |
| `CONVERGINDO` | `EM_RESUMO` | A IA gera o resumo (RF11); chat em leitura; admin publica ou devolve. |
| `DECISAO_PROPOSTA` | `EM_DECISAO` | `FinalDecision` PROPOSTA (RF12.CA01) sendo editada pelo admin. |
| `EM_REVISAO` | `EM_REVISAO` | Revisor humano (RF15). |
| `VALIDADA` | — (novo, curto) | Carimbo VALIDADO (RF38.CA06); gera ATA_REGISTRO (RF29.CA05), artefatos (RF13), DP (RF42). Vai sozinha a ENCERRADA. |
| `DEVOLVIDA` | — (novo) | Carimbo DEVOLVIDO + motivo; `ReopenRequest` PENDENTE com votação (RF14). Separa votação de revisão. |
| `REABERTA` | `REABERTA` | Comporta-se como ABERTA, `reopenCount++`, fase volta a ESCLARECER com o motivo fixado (RF14.CA05 derivado). |
| `ENCERRADA` | `ENCERRADA` | RF17. |
| `ARQUIVADA` | `ARQUIVADA` | RF17.CA03 derivado, RF33.CA01. |
| `CANCELADA` | — (novo) | Recusa da proposta (Q-26) e cancelamento de AGENDADA, com motivo. Terminal; não vai à Memória. |

Guarda de compatibilidade: `SessionStatusMachine` (ARQUITETURA §3 "State Machine explícita") com tabela de transições testada; os diagramas Mermaid de RF4/RF5/RF12/RF14/RF15/RF17 §4 passam a citar os nomes novos (mudança F.1-3).

### A.2 Estados: quem age, o que aparece, eventos e tempo-limite

Legenda: **E** EMPREGADO (participante) · **C** CHEFE (admin da sessão, `adminUserId`, TAX §5.1 — Q-03/Q-17) · **M** EMPRESA · **U** CURADOR (papel contextual, D-09) · **IA** participante IA (TAX §5.2 `ParticipantRole.IA`). "Rastro" = nós/arestas do `DecisionTrace` (TAX §5.15). DP = DECIA Points (board RF42, dump l.779–790).

| Estado | Quem age | O que aparece (card e tela) | Eventos gerados | Tempo-limite (proposta) |
|---|---|---|---|---|
| **RASCUNHO** | **E** propõe (HU5) ou dono do projeto clica "Abrir sessão DECIA" (RF29.CA01); **C** edita tema, objetivo (1 frase), acesso, `aiMode` (RF4) e aceita/recusa (RF5). **IA** sugere tema/objetivo a partir do projeto e lista precedentes (RF33). | Card com etiqueta tracejada "Rascunho" (RF38.CA05, estilo RASCUNHO do card de identidade §6, dump l.173); tela: formulário de tema/objetivo/acesso + lista de convidados + "aguardando o administrador". | Notification `SESSAO_PROPOSTA` ao admin; rastro: nó PROJETO → ANEXOU → SESSAO quando nasce de projeto (ARQUITETURA §5.1). Sem DP. | 7 dias sem resposta do admin → lembrete; 30 dias → CANCELADA automática com aviso (proposta). |
| **AGENDADA** | **C** marca `scheduledAt` e confirma convidados; **E** aceita/recusa convite, lê pauta; **IA** prepara contexto (anexa tarefas do projeto, cita precedentes, propõe pauta e critérios iniciais — faísca ✦, RF38.CA04). **M** vê na agenda do departamento (RF28). | Card: data/hora, contagem regressiva, convidados confirmados/pendentes; tela: pauta ✦ editável, anexos, critérios sugeridos, botão "Iniciar" (só admin). | Notifications convite + lembretes 24 h/1 h; rastro: nó SESSAO "agendada". Sem DP. | `scheduledAt` + 30 min sem início → avisa admin; 7 dias → CANCELADA (proposta). Início automático em `scheduledAt` se ≥ 2 humanos presentes e admin optou (proposta). |
| **ABERTA** | **E** envia mensagens com anexos (RF6, RF29.CA03), responde divergências habilitadas (RF10) e perguntas (RF16), move itens na Mesa, edita a Minuta; **C** modera (fases, turnos, fixar, estacionar, silenciar — §E.2), adiciona/remove participantes (RF9), aciona "Gerar resumo"; **IA** abre a sessão com contexto, classifica (RF7), detecta divergências (RF8), formula perguntas (RF16), alerta fuga do tema, sugere avanço de fase, mantém o Resumo vivo; **M/U** só observam se convidados como OBSERVADOR. | Card: etiqueta "Aberta · fase X" com pulso suave (`--dur-pulse`), participantes online, PercentBar; tela: Faixa de Objetivo + visão ativa (§B). | SSE/WebSocket por mensagem; Notifications de divergência (RF8.CA02 derivado), pergunta (RF16.CA02), menção; DP: +5 argumento com evidência (teto 10/dia/sessão), +3 consenso confirmado, +8 divergência resolvida, +4 pergunta respondida com evidência, +6 artefato usado (RF42); rastro: MENSAGEM → CLASSIFICOU → …, DIVERGENCIA, PERGUNTA, TAREFA (RF29.CA04). | Inatividade 7 dias → IA sugere CONVERGIR ou encerrar; 30 dias → admin notificado para encerrar (RF17.CA02 derivado). Tempo por fase opcional (§E.2). |
| **CONVERGINDO** | **IA** gera `AnalyticalSummary` RASCUNHO (RF11.CA01–CA03 derivados: ≥ 2 cenários, critérios, citações, tarefas afetadas RF29.CA08); **C** revisa, edita, publica ou devolve ao grupo; **E** lê, pode comentar na Minuta (sem chat). | Card: etiqueta "Convergindo" com faísca animada (`--dur-spark`); tela: resumo lado a lado com a Mesa (opção × critério), chat em leitura. | Notification "resumo em preparação/publicado"; rastro: RESUMO → RESUMIU; DP: `usedInDecision` dos anexos (Q-20). | p95 60 s de geração; falha total → volta a ABERTA (RF17 §4 "IA indisponível"). Admin tem 3 dias úteis para publicar ou devolver (proposta). |
| **DECISAO_PROPOSTA** | **IA** propõe `FinalDecision` (RF12.CA01); **C** edita texto/justificativa/cenário ou pede nova proposta (RF12.CA03/CA04); **E** lê a proposta e pode registrar objeção na Minuta (proposta, rodada de consentimento final); **U** pode ser consultado pelo chefe (sem ação no sistema). | Card: "Decisão proposta ✦"; tela: DecisionProposalCard + ScenarioPicker + CitationChip (diagramas RF12 §5) + Mesa com a opção escolhida destacada. | Notification ao grupo e ao admin; rastro: DECISAO → DECIDIU. | 3 dias úteis para encaminhar (lembrete); 10 dias → escalonamento à EMPRESA (proposta). |
| **EM_REVISAO** | **C** (revisor = `adminUserId`; ADMIN global, Q-17) valida ou devolve com motivo (RF15.CA02/CA03); **IA** entrega o fio de decisão e um "checklist de revisão" (conformidade RF32, fontes RF33, projeto vinculado — métrica do objetivo 3); **E** só leitura. | Card: "Em revisão" com cadeado; tela: ReviewPanel + DecisionThread (RF15 §5), chat em leitura (`409 SESSAO_NAO_ATIVA`). | Notification ao revisor; fila "Decisões pendentes" (RF28.CA06); rastro: REVISAO → REVISOU. | 5 dias úteis; lembrete no 3º; 10 dias → EMPRESA notificada (proposta). |
| **VALIDADA** | Sistema (AFTER_COMMIT): tarefa ATA_REGISTRO em APROVAÇÃO (RF29.CA05), projeto → APROVADO (RF15 §4), artefatos RELATÓRIO/ATA/CHECKLIST (RF13.CA01), Minuta somente leitura (§D.3); **E/C** veem o carimbo. | Card: **carimbo VALIDADO** com data e nome do chefe (RF38.CA06; identidade §4, dump l.168); confete discreto (RF38.CA10). | Notifications agrupadas (RF13.CA03); DP +15 × qualidade a cada contribuinte (RF42); MuralEntry; rastro: ARTEFATO, TAREFA. | Automático: → ENCERRADA quando os 3 artefatos existem (ou 24 h, o que vier antes) (proposta). |
| **DEVOLVIDA** | **IA** cria `ReopenRequest` com justificativa (RF14.CA01); **E** vota ACEITAR/RECUSAR (RF14.CA02); **C** decide ou deixa a maioria decidir no prazo (Q-05/Q-16). | Card: **carimbo DEVOLVIDO** com motivo; banner ReopenBanner + VoteButtons (RF14 §5). | Notification com motivo (RF15.CA03) e convite a votar; rastro: REVISAO (DEVOLVIDA). | `votingDeadlineAt` = 48 h (TAX §5.13 provisório). Sem quórum → admin decide; admin omisso 5 dias → ENCERRADA com motivo automático (proposta). |
| **REABERTA** | Igual a ABERTA, com o motivo da devolução fixado no topo e a fase em ESCLARECER (proposta). **IA** reabre a Mesa só com os itens ligados ao motivo. | Card: "Reaberta (2º ciclo)"; tela: banner do motivo. | Notification; rastro: SESSAO reaberta; decisão DEVOLVIDA → SUBSTITUIDA ao nascer a nova (RF14 §4). | Mesmos da ABERTA; `reopenCount` ≥ 3 → IA sugere encerrar sem decisão ou dividir o tema (proposta). |
| **ENCERRADA** | **C** encerra (automático pós-VALIDADA ou manual com motivo, RF17.CA01/CA02); **E** lê, exporta, "Transformar em tarefa" continua disponível (RF29.CA04); **M** vê indicadores (RF18). | Card: carimbo verde "Encerrada" ou cinza "Encerrada sem decisão"; tela em leitura com fio de decisão completo. | Notification; DP +2 presença (RF42); rastro: SESSAO fechada; Minuta → ATA/RELATÓRIO (proposta). | — |
| **ARQUIVADA** | Sistema: export JSON+PDF → S3, `SessionArchive`, indexação na Memória (RF17.CA03, RF33.CA01); **E/C/M** consultam via Memória Institucional (RF33.CA02). | Card esmaecido (estilo ARQUIVADA do card de identidade §6). | `INDEXAR_MEMORIA`, `MetricSnapshot` (RF18). | Mensagens após TTL do Cassandra só pelo arquivo (RF29.CA06). |
| **CANCELADA** | **C** recusa (RF5.CA04 derivado) ou cancela AGENDADA, com motivo. | Card esmaecido "Cancelada". | Notification ao proponente. Não indexa na Memória. | — |

### A.3 Fases de deliberação dentro de ABERTA

Modelo: `Double Diamond` (divergir → convergir, duas vezes) [REF-DD], `Grupo Nominal` (rodada silenciosa → rodada de todos → esclarecimento → votação) [REF-NGT], `Delphi` (rodadas com feedback controlado da IA) [REF-DELPHI], `consentimento sociocrático` (objeções, "bom o suficiente por ora, seguro o bastante para tentar") [REF-SOC], `Loomio` (proposta com posições e prazo) [REF-LOOMIO]. A IA **conduz** (abre fase, convida quem falta, resume), o chefe **modera** (avança, volta, fixa, estaciona — §E.2). Fonte das capacidades da IA: HU7, HU8, HU11, HU12, HU16 (dump l.1157–1216).

| Fase | Obrigatória / sugerida / livre | O que a IA faz (✦) | O que o chefe faz | O que o grupo faz | Critério de saída (sugerido pela IA) |
|---|---|---|---|---|---|
| **Contexto** | **Obrigatória e automática**: toda sessão nasce aqui; dura até a 1ª contribuição humana. | Mensagem de abertura: objetivo em 1 frase, anexos do projeto (RF29.CA01), precedentes "quem já resolveu isso" (RF33.CA03), critérios iniciais (eixo do plano RF24, checklist RF32), pauta se AGENDADA. | Confirma/edita objetivo e critérios; fixa a mensagem de abertura. | Lê; pode pedir esclarecimento do escopo. | Objetivo confirmado pelo chefe (ou 1ª mensagem do grupo em modo LIVRE). |
| **Divergir** | **Sugerida** (padrão GUIADO; pulável em LIVRE; obrigatória em ESTRITO). | Convida nominalmente quem ainda não se manifestou (indicador §C.3); classifica (RF7); ainda **não** abre divergências formais (evita convergência prematura — [REF-NGT] rodada sem debate); agrupa propostas em **opções** na Mesa. | Opcional: turnos/mão levantada, tempo por fase. | Cada um registra posição/proposta e evidências (anexos do acervo). | ≥ 70 % dos MEMBROS se manifestaram **ou** chefe avança (proposta). |
| **Esclarecer** | **Condicional**: entra automaticamente quando há `Divergence` ABERTA ou `AiQuestion` ABERTA (RF8, RF16); em ESTRITO não se sai dela com pergunta PONTO_CRITICO aberta. | Detecta divergências e sintetiza posições (RF8.CA01), formula perguntas com citações (RF16.CA01), pede evidência quando falta (RF16.CA03), alerta fuga do tema. | Habilita quem responde divergência (RF10.CA01); pode ignorar pergunta com motivo. | Responde divergências (RF10.CA02) e perguntas com evidência (+4 DP). | Nenhuma divergência ABERTA/EM_RESPOSTA e nenhuma pergunta ABERTA (SEM_CONSENSO e IGNORADA contam como tratadas). |
| **Convergir** | **Sugerida** (GUIADO/ESTRITO); em LIVRE o chefe pode ir direto a Decidir. | Monta a **matriz opções × critérios** (§C.1) com notas e evidências; abre **rodada de consentimento** por opção (APOIO / ABSTENÇÃO / OBJEÇÃO com motivo) [REF-SOC, REF-LOOMIO]; mostra indicador de consenso por opção. | Pode encerrar rodada, retirar opção, pedir "e se…" ao Simulador (RF31.CA04). | Posiciona-se; objeções viram divergências (volta a Esclarecer). | Pelo menos 1 opção sem OBJEÇÃO aberta **ou** chefe avança com registro "sem consenso". |
| **Decidir** | **Obrigatória** (é o gatilho de CONVERGINDO). | Prepara o resumo (RF11) a partir da Mesa; sugere o cenário. | Aciona "Gerar resumo". | — | Transição de estado. |

Avaliação: tornar todas obrigatórias (gates) reproduz o problema do Loomio/Decidim em grupos pequenos (cerimônia > valor) e esbarra em sessões de 3 pessoas que decidem em 20 minutos; deixar tudo livre perde o efeito "grupo nominal" que evita a ancoragem no primeiro que fala. Por isso **(proposta)** `phaseMode` na sessão: `GUIADO` (padrão: IA sugere, chefe decide), `LIVRE` (fases viram só etiquetas; sessões rápidas), `ESTRITO` (política da EMPRESA para temas RESTRITO/SIGILOSO ou valor envolvido acima de um teto; exige Divergir e Esclarecer completos). Toda mudança de fase gera `SessionPhaseLog` (quem, por quê) e um nó no rastro — a fase passa a ser auditável (objetivo 1).

### A.4 Jornada por perfil

- **EMPREGADO** (board "Perfis", dump l.84): recebe convite (AGENDADA) → lê contexto ✦ → em Divergir registra posição com anexo do acervo (RF41.CA07 "Compartilhar na sessão DECIA") → responde divergência/pergunta com evidência → posiciona-se na rodada de consentimento → coedita a Minuta (seção atribuída) → lê decisão proposta e vota reabertura se DEVOLVIDA → vê carimbo e DP no perfil deliberativo (RF19 sub-aba 15, RF42.CA08) → "Transformar em tarefa" leva o decidido ao seu projeto (RF29.CA04).
- **CHEFE DE DEPARTAMENTO** (dump l.86 "administra sessões DECIA do departamento, revisa decisões"): aceita proposta e define tema/acesso (RF4/RF5) → agenda → inicia → modera fases e ritmo (§E.2) → gere participantes (RF9) → habilita respostas a divergências (RF10) → gera e publica resumo (RF11) → edita e encaminha decisão (RF12) → revisa (RF15) → encerra (RF17) → acompanha Insights da Equipe (RF43 §4) e fila de revisão (RF28.CA06). Conflito de papéis: moderador **e** revisor na mesma pessoa (Q-03/Q-17) — ver QS-03.
- **EMPRESA** (dump l.85): define política (phaseMode ESTRITO, prazos, tetos de DP, IA externa permitida por classificação) → vê dashboard (RF18, RF42.CA08) → é escalada quando prazos de revisão estouram (proposta) → cria metas coletivas ligadas a decisões com rastro (RF35.CA01).
- **CURADOR** (D-09, RF28.CA03): sem papel próprio na sessão; pode entrar como OBSERVADOR ou MEMBRO; opera a chancela da decisão/projeto depois (RF39 `basis DECISÃO_MATCH`, dump l.223). (proposta) Curador pode ser **RELATOR** da Minuta por delegação do chefe.
- **IA** (TAX §5.2 participante `IA`): conduz as fases, classifica, detecta, pergunta, resume, propõe decisão, gera artefatos e cita fontes — **nunca decide nem fecha fase sozinha** (RF43 §1 "Autoridade humana"; objetivo 1).

### A.5 O que foi aproveitado de cada referência (fluxo)

IBIS [REF-IBIS]: a tríade questão → posição → argumento (pró/contra) vira `AiQuestion` → `DecisionOption` → mensagens ARGUMENTO/DIVERGENCIA ligadas à opção. Toulmin [REF-TOULMIN]: papéis alegação/dado/garantia/apoio/qualificador/refutação como `toulminRole` opcional da classificação (§C.1, Mapa). Kialo [REF-KIALO]: árvore pró/contra com "impacto" votado → indicador de consenso por opção. Loomio [REF-LOOMIO]: proposta com prazo e posições (concordo/abstenho/discordo/bloqueio) → rodada de consentimento com `votingDeadlineAt`. Sociocracia [REF-SOC]: objeção argumentada em vez de voto majoritário; "bom o suficiente por ora". Delphi [REF-DELPHI]: rodadas anônimas opcionais na fase Divergir (QS-06). Grupo nominal [REF-NGT]: silêncio antes do debate (Divergir sem divergências formais). Double Diamond [REF-DD]: Divergir/Convergir duplo (tema → opções → decisão). Liberating Structures [REF-LS]: 1-2-4-Todos como ritmo opcional em sessões ≥ 10 (§E.2), "Min Specs" para critérios. DACI/RAPID [REF-DACI, REF-RAPID]: papéis Driver/Approver/Contributor/Informed = moderador/revisor/membro/observador; "Decide" único = revisor humano (RF15).

---

## B. Anatomia do "Esquema de Sessão"

### B.1 Card da sessão (lista `/decia`, Mural, perfil › Decisões, projeto › painel DECIA)

Equivalente FAI: card de look (`FAI components/scheme-card.tsx`) e anatomia dos cards v17–v19 (`FAI docs/anatomias/anatomias_card_v19.html`); Work Station: card de projeto (identidade visual §8, dump l.182; `ANATOMIA_CARDS.md`). Componentes do design system citados por nome (`DESIGN_SYSTEM.md §3`).

| Zona | Conteúdo | Componente / token | Fonte |
|---|---|---|---|
| Borda | cor do departamento | `--dept-*` (RF38.CA09) | identidade §10 |
| Cabeçalho | ícone "sessão" + **tema** (título, `--font-editorial`) + emoji opcional | TypeChip-like `abrir-decia` | RF4; identidade §13 |
| Objetivo | **1 frase** (`DeciaSession.objective`, proposta) em `--font-ui`, 2 linhas máx. | — | RF21 ficha "Objetivo (1 frase)" (dump l.427) reaproveitada |
| Estado/fase | etiqueta de protocolo "Aberta · Divergir" com nome em texto; pulso em ABERTA; faísca em CONVERGINDO/DECISAO_PROPOSTA; cadeado em EM_REVISAO | Tag (`status`, `pulse`) | RF38.CA05 |
| Participantes | até 5 avatares/monogramas + "+n"; ponto verde = online (presença Redis, §D.4); IA sempre como faísca ✦ | Avatar/Monogram, Spark | TAX §5.2 |
| Projeto vinculado | capa-mosaico mini + título (`linkedProjectId`) | Mosaic (mini) | RF29.CA01, RF38.CA03 |
| Progresso | **PercentBar "rumo à decisão"** 0–100 % com 5 marcas de fase | PercentBar (novo componente, proposta) | §B.5 |
| Prazo | `scheduledAt` (AGENDADA) ou prazo da fase/revisão; âmbar ≤ 3 dias, vermelho vencido | Due | RF38.CA05 |
| Chancela | lacre se a decisão/projeto chancelado (`basis DECISÃO_MATCH`) | Seal | RF39 |
| Carimbo | VALIDADO (verde) / DEVOLVIDO (vermelho) com data e revisor; mini | Stamp `mini` | RF38.CA06 |
| Rodapé | "n mensagens · n divergências (k resolvidas) · n perguntas abertas" + contadores sociais da decisão | Counters | RF26 |

Variantes: `compact` (lista lateral do chat, só tema + etiqueta + progresso), `list` (fila do chefe: + prazo de revisão), `mural` (decisão validada: + carimbo grande), `postit` (na Mesa de Trabalho RF22, painel "fio de decisão", RF22.CA05).

### B.2 Casca fixa da tela da sessão (comum a todos os layouts)

1. **Faixa de Objetivo** (sticky sob a TopBar, `--z-sticky`): tema · objetivo em 1 frase · etiqueta de estado/fase · **PercentBar** · prazo · botão de fase (chefe) · menu "Visões". Nunca sai da tela (regra §C.3-1); em celular colapsa para 1 linha (objetivo em marquee **não**: trunca com tooltip/expansão por toque).
2. **Abas de visão**: `Chat` · `Mesa` · `Mapa` · `Resumo` · `Minuta` · `Artefatos` (as 3 últimas só existem a partir de CONVERGINDO/VALIDADA, mas "Resumo vivo" aparece em ABERTA, RF11 contínuo). Desktop: abas no topo da área central; celular: bottom-nav (SidebarNav já prevê bottom-nav, DESIGN_SYSTEM §3).
3. **Painel lateral direito** (desktop ≥ 1280 px; tablet como Sheet; celular como aba "Pessoas"): participantes com presença/mão levantada/"falta se manifestar", perguntas fixadas (RF16.CA02), divergências abertas, pedido de reabertura (RF14 §5 ReopenBanner), estacionamento.
4. **Compositor** (rodapé do Chat): texto Markdown restrito (RF6.CA01 derivado), anexos do acervo por busca rápida/arrastar (≤ 5, RF29.CA03), "Responder a", seletor de classificação sugerida (a IA classifica; o autor pode corrigir — Q-28), prompts sugeridos como chips (padrão do Copilot FAI `app/(site)/(app)/copilot/page.tsx:147`).

### B.3 Layouts comparados

Base FAI: Copilot = `grid lg:grid-cols-[220px_minmax(0,1fr)]` com sidebar de looks + chat `role="log" aria-live="polite"` (`FAI copilot/page.tsx:108,128`); Criar Look = `grid lg:grid-cols-[1fr_300px]` com pré-visualização sticky (`FAI components/scheme-builder.tsx:177,255`); Meu Quarto = canvas 3D com fallback "2.5D e lista" sem WebGL e "reduzir movimento" (`FAI docs/meu-quarto/05-elementos-do-quarto.md:71-73`); Ilha central do Atelier "comparar 2 ou 3 looks lado a lado" (`:52`) — origem da ideia de comparar opções lado a lado na Mesa.

| | **L1 — Chat classificado + painel lateral** (padrão) | **L2 — Mesa do DECIA** (quadro por opção) | **L3 — Mapa da Discussão** (IBIS/Toulmin, gerado pela IA) | **L4 — Fio de decisão + Resumo vivo** | **L5 — Minuta Coletiva** (coedição) |
|---|---|---|---|---|---|
| Descrição | Chat cronológico; cada mensagem com etiqueta de classe (cor + nome), anexos inline (TaskCard `attachment`), "responde à opção X" (chip), threads por mensagem; painel lateral §B.2-3. | Colunas = opções (ou critérios/fases, §C.1); cartões = mensagens/anexos/perguntas; chat vira gaveta à direita (Sheet). | Árvore: Questão → Opções → argumentos pró/contra → evidências/refutações; nós coloridos pela classe RF7; clique abre a mensagem no chat. | Esquerda: DecisionThread vertical (RF38.CA07); direita: `AnalyticalSummary` em modo vivo (argumentos, consensos, divergências, riscos, recomendações) atualizando a cada N mensagens. | Documento com seções atribuídas, cursores coloridos, comentários ancorados; chat como gaveta. |
| Desktop (≥ 1280) | 3 colunas: lista de sessões 264 px (`--control-sidebar`) · chat · painel 320 px. | Quadro full-width, gaveta de chat 400 px retrátil; zoom/pan. | Mapa central com minimapa; painel de nó à direita. | 2 colunas 40/60. | Documento 720 px centrado + trilho de comentários 280 px. |
| Tablet (768–1279) | 2 colunas: chat · painel como Sheet lateral. | Quadro com scroll horizontal por coluna (snap); gaveta como Sheet. | Mapa com pan; nó em Sheet inferior. | Abas Fio / Resumo. | Documento + comentários em Sheet. |
| Celular (< 768) | 1 coluna, bottom-nav (Chat · Mesa · Pessoas · Resumo); compositor fixo; Faixa de Objetivo em 1 linha. | **Lista por opção** (acordeão) em vez de quadro; mover item = menu "Mover para…". | **Lista indentada** (outline) com expandir/recolher; sem canvas. | Lista única: fio com cartões de resumo intercalados. | Leitura + comentários; edição permitida mas sem seções paralelas. |
| Densidade | Alta (uma linha por mensagem em `compact`; expandida ao tocar). Densidade ajustável (confortável/compacta) como no `/lab/design-system`. | Média; cartão = título 2 linhas + classe + autor. | Baixa–média; precisa de poda pela IA (só nós com ≥ 1 evidência expandidos). | Média. | Baixa (texto corrido). |
| Acessibilidade | `role="log"` + `aria-live="polite"` (herdado do Copilot FAI); classe com **nome em texto** (RF38.CA05); navegação por teclado entre mensagens (j/k, Enter abre thread); skip-link "ir ao compositor"; contraste já verificado nos tokens de classe (DESIGN_SYSTEM §2.9). | Quadro é o pior caso para leitor de tela: exige **vista alternativa em lista/tabela** (`role="grid"` opções × itens) e mover por menu, não só arrastar (WCAG 2.5.7 Dragging Movements). | Árvore = `role="tree"` nativa, boa para leitor de tela se renderizada como outline; cores com rótulo textual. | Lista semântica; carimbo com texto. | Editor com `contenteditable` acessível (ProseMirror/Tiptap têm suporte); cursores de outros usuários anunciados via live region discreta; comentários como lista. |
| 3 participantes | Ótimo: tudo cabe num scroll curto. | Exagero; Mesa útil só na fase Convergir. | Pouco valor (árvore rasa). | Resumo vivo redundante. | Útil (ata curta). |
| 10 participantes | Bom: painel "quem falta se manifestar" começa a valer; threads evitam intercalação. | Bom: 2–4 opções, 20–40 cartões. | Bom: 3–5 opções, poda necessária. | Bom. | Bom com seções atribuídas (≤ 10 editores, §D.3). |
| 30 participantes | Chat vira ruído (~300 msgs/h): precisam **turnos/mão levantada** (§E.2), resumo vivo e "ver só argumentos/evidências" (filtro por classe). | **Melhor visão**: cartões agregam; indicador de consenso por opção substitui ler tudo. | Bom para leitura após a sessão; durante, pesado. | Resumo vivo é o que salva; fio longo demais → agrupar por fase. | Precisa de RELATOR; editores limitados, demais em comentários/sugestões. |
| Risco | "Chat infinito" sem estrutura (o motivo de existir a Mesa). | Pessoas parando de conversar para "arrumar cartões". | IA errar a árvore → desconfiança; precisa "corrigir classificação" (Q-28). | Resumo vivo custa IA (RF43.CA06 cota) → gerar a cada N mensagens/K min. | Conflito de edição, texto sem dono. |

### B.4 Recomendação

**L1 como padrão com a casca fixa (§B.2) e as demais como visões**: a visão muda, a Faixa de Objetivo e a PercentBar não. Regras de troca automática (proposta, sempre com botão "ficar aqui"): ao entrar em **Convergir** a IA sugere a **Mesa** (L2); em **CONVERGINDO/DECISAO_PROPOSTA** abre o **Resumo** (L4); em EM_REVISAO o revisor abre no **Fio** (L4 esquerda); em ENCERRADA/ARQUIVADA abre no **Mapa** (L3, melhor leitura a posteriori e para a Memória). O **Mapa** é somente leitura gerado pela IA (com "corrigir classe/opção" por mensagem); nunca é editado como canvas. Em celular: L1 + lista da Mesa + lista do Mapa; a Mesa como quadro arrastável só ≥ 768 px (igual ao fallback "2.5D e lista" do Meu Quarto FAI).

### B.5 PercentBar "rumo à decisão" (proposta — serviço determinístico, D-12)

`progressPct` = soma de pesos de marcos verificáveis, nunca inferido pela IA: Contexto confirmado 10 · % de MEMBROS que se manifestaram × 15 · divergências tratadas / abertas × 15 · perguntas tratadas / abertas × 10 · opção sem objeção 10 · resumo PUBLICADO 10 · decisão EM_REVISAO 10 · VALIDADA 20 (DEVOLVIDA volta a 70 e mostra "2º ciclo"). Exibe sempre o **próximo marco em texto** ("faltam 2 pessoas se manifestar") — a barra sozinha não explica (acessibilidade e objetivo 2). A fórmula vai para `METRICAS_GESTAO.md` (RF43.CA13).

---

## C. Mesa do DECIA

Nome e metáfora: "Mesa de Trabalho" já é a RF22 (quadro/linha do tempo/canvas do **projeto**); a **Mesa do DECIA** é a mesma família visual (skins papel/cortiça/blueprint, PostIt, BackgroundArt — DESIGN_SYSTEM §2.8/§3) aplicada à **sessão**. Equivalente FAI: Ilha central (comparar looks lado a lado) e Smart Mirror (montar arrastando) do Meu Quarto (`FAI docs/meu-quarto/05-elementos-do-quarto.md:34,52`).

### C.1 Organizações comparadas

| Organização | Estrutura | Melhor para | Fraquezas | Referência |
|---|---|---|---|---|
| **Por opção em discussão** | colunas = `DecisionOption` (+ coluna "Sem opção/estacionamento"); dentro de cada coluna, grupos por classe: Argumentos a favor · Contra/Divergências · Riscos · Evidências/anexos · Perguntas; cabeçalho da coluna = indicador de consenso + quem apoia/objeta. | Convergir; sessões de 10–30; "decidir entre A, B, C" (a maioria das decisões de obra/convênio/licitação). | Temas sem opções claras (sessão exploratória) ficam com tudo no estacionamento até a IA propor opções. | IBIS (posições sob a questão) [REF-IBIS]; Kialo (pró/contra por tese) [REF-KIALO]; Miro/FigJam "frames por opção" [REF-MIRO, REF-FIGJAM]. |
| **Por fase do projeto** | colunas = 7 fases (DEMANDA…ENCERRAMENTO, RF21); cartões = tarefas anexadas, encaminhamentos e decisões por fase. | Sessão aberta **a partir de um projeto** (RF29.CA01) em que se decide "o que falta/o que muda em cada fase"; ponte direta para o Quadro da RF22. | Argumentos não têm fase; mistura deliberação com execução. | RF21 slots por fase (dump l.425); RF22 Quadro (dump l.451). |
| **Por critério de decisão (matriz opções × critérios)** | linhas = opções; colunas = `DecisionCriterion` (peso); célula = nota 1–5 ✦ + evidências; última coluna = total ponderado; linha "objeções". | Convergir/Decidir; justificar "critérios de avaliação utilizados pela IA" (RF11, `evaluationCriteriaJson`); relatório para auditoria (objetivo 3). | Falsa precisão numérica; pesos viram briga. Mitigação: pesos vêm do plano anual/checklist (RF24/RF32) e a célula sempre mostra as evidências. | Matriz de decisão ponderada / Pugh; RF11.CA02 derivado (`criteriaScoresJson`); RAPID "Input" [REF-RAPID]. |
| **Canvas livre** | post-its com x/y/escala/rotação (como RF22 Mesa `PostIt`), conectores. | Brainstorm inicial em grupos pequenos; workshop presencial com Ata Viva (RF37). | Sem estrutura → sem rastro semântico; inacessível por teclado/leitor de tela sem vista em lista; não escala a 30. | FigJam/Miro [REF-FIGJAM, REF-MIRO]; RF22.CA03. |
| **Linha do tempo** | eixo = tempo/fase; marcos = perguntas, divergências, resumo, decisão, revisão; = DecisionThread horizontal. | Revisão (EM_REVISAO), auditoria, Memória; entender "como chegamos aqui". | Não ajuda a decidir; é leitura. | Fio de decisão (identidade §4, dump l.168); RF38.CA07. |

### C.2 Recomendação

**Padrão: por opção**, com alternância para **matriz opções × critérios** (mesmos dados, outra projeção: o cartão "nota" é a célula) e **linha do tempo** (leitura). **Por fase do projeto** aparece como visão extra apenas quando `linkedProjectId` existe. **Canvas livre** não é uma visão: é o **estacionamento** (área à direita/abaixo da Mesa onde cai o que não responde a nenhuma opção/critério) — mantém a liberdade sem perder a regra "cada item mostra a que responde". Dados: `DecisionOption`, `DecisionCriterion`, `OptionCriterionScore`, `SessionBoardItem` (diagrama de classes, pacote "Mesa do DECIA"). A IA cria as opções/critérios iniciais (✦) a partir das mensagens classificadas; pessoas criam/renomeiam/retiram; tudo com nó no rastro (`TRANSFORMOU_EM`, `ANEXOU`).

### C.3 Regras visuais de clareza do objetivo (todas proposta, salvo citação)

1. **Objetivo nunca sai da tela** — Faixa de Objetivo sticky (§B.2) em todas as visões, inclusive na gaveta de chat sobre a Mesa; ao abrir a sessão o foco de teclado começa no objetivo.
2. **Cada item mostra a que responde** — chip "→ Opção B · critério Prazo" no cartão e na mensagem (vem de `MessageClassification.optionId/criterionId`, atribuído pela IA e corrigível pelo autor/chefe); item sem relação exibe chip cinza "sem opção".
3. **Itens sem relação esmaecidos / estacionamento** — opacidade reduzida (`--muted`, respeitando contraste mínimo 3:1 do glifo) e agrupados no estacionamento; o chefe pode "trazer para a opção X" ou "arquivar"; a IA sugere a cada 10 itens estacionados abrir uma nova opção ou uma nova sessão (tema dividiu).
4. **IA alerta fuga do tema** — classificação RUIDO/fora do tema (RF42 "não geram pontos") com similaridade baixa ao objetivo gera aviso **privado ao autor** primeiro ("isto parece fora do objetivo; quer estacionar?"), e **ao chefe** se recorrente; nunca aviso público automático (evita constrangimento, segurança psicológica RF43 §8-D).
5. **Indicador de consenso por opção** — cabeçalho da coluna com 3 segmentos (apoio/abstenção/objeção) em cores com nome em texto + "n de m membros posicionados"; objeção aberta = borda `--class-divergencia`.
6. **Quem falta se manifestar** — no painel lateral e no cabeçalho da fase: lista de MEMBROS sem mensagem/posição na fase; a IA convida nominalmente (mensagem IA, não notificação push, para não parecer cobrança — tom do Meu Quarto FAI "nenhum elemento cobra o usuário", `05-elementos-do-quarto.md:75`); OBSERVADORES não contam.
7. **Evidência visível** — cartão com anexo mostra o TaskCard `attachment` e o selo "usado na decisão" quando `usedInDecision` (RF42 +6 DP).
8. **Faísca em tudo que a IA fez** — opções/critérios/notas criados pela IA carregam ✦ e tooltip "gerado por IA em … revisado por …" (RF38.CA04).

### C.4 Integração com Criador de Projetos (RF21) e Acervo (RF41)

- **Arrastar do Acervo para a Mesa**: a gaveta "Acervo" (mesma grade filtrável do Criador de Projetos, RF21 "Esquerda — Acervo filtrável", dump l.424) abre dentro da sessão; arrastar uma tarefa para uma coluna cria mensagem com anexo (RF29.CA03) já ligada à opção; ação rápida "Compartilhar na sessão DECIA" do card (RF41.CA07) faz o mesmo.
- **Transformar Mesa em projeto** = RF29.CA02 enriquecido: ao "Criar projeto a partir desta sessão", as tarefas anexadas à **opção escolhida** viram ProjectTasks nas fases sugeridas pela IA, os encaminhamentos da decisão viram tarefas (RF29.CA04/CA05) e as opções descartadas entram no snapshot como "alternativas consideradas" (aparece no painel "Por que isto existe?", RF29.CA06).
- **Projeto reflete o decidido**: além da ATA_REGISTRO em APROVAÇÃO (RF29.CA05), (proposta) o projeto vinculado recebe diff sugerido no Quadro da RF22 ("a decisão adiciona 2 tarefas em EXECUÇÃO e remove 1") que o dono aceita, gerando `ProjectVersion` (RF22.CA02) com autor "decisão DECIA #id". O painel lateral da Mesa de Trabalho (RF22.CA05) mostra o fio.
- **Simulador**: um cenário do RF31 compartilhado na sessão (RF31.CA04) vira uma **opção** da Mesa com `projectScenarioId`; a matriz usa o relatório de impacto como evidência.
- **Ata Viva** (RF37.CA04): a ata publicada na sessão distribui seus trechos classificados nas colunas correspondentes.

---

## D. Coedição — "Minuta Coletiva" (Documento da Sessão)

### D.1 Por que um esquema colaborativo dedicado

O board já prevê três textos coletivos sem dizer como são escritos a muitas mãos: a **ata** (RF13 artefato ATA; RF37 Ata Viva "participantes recebem notificação para ratificar ou contestar em 48 h", dump l.690), o **resumo analítico** editado pelo admin (RF11) e a **decisão final** editada antes do encaminhamento (RF12.CA03). Hoje a edição colaborativa só existe na Mesa de Trabalho com "último-vence com aviso" em até 3 s (RF22.CA04, dump l.459), o que não serve para texto. **(proposta)** Um único esquema, a **Minuta Coletiva** (`SessionDocument`, kind MINUTA · ATA · CHECKLIST), nasce com a sessão (seções pré-criadas pela IA a partir do objetivo), acompanha as fases e, ao final, **é** o conteúdo da ATA/RELATÓRIO (RF13) e da tarefa ATA_REGISTRO (RF29.CA05). Nome na UI: "Minuta" (jargão da repartição: texto ainda não oficial); vira "Ata" no carimbo.

### D.2 Anatomia

| Elemento | Comportamento | Referência aproveitada |
|---|---|---|
| **Presença** | cursores e seleções com a cor de cada pessoa; avatares no topo; lista "editando agora / lendo"; a **cor vem da paleta de nós do logo** (tokens `--node-1..n`, a definir quando o PNG do logo estiver no repo — Q-45; fallback `--dept-*`), nunca de cor aleatória; o nome acompanha o cursor (daltonismo, identidade §11). | Google Docs, Figma multiplayer [REF-GDOCS, REF-FIGMA]; Yjs awareness [REF-YJS]. |
| **Seções atribuídas** | cada `DocumentSection` tem responsável (RELATOR atribui, §E.1), status ABERTA → EM_REDAÇÃO → REVISÃO → FECHADA; seção fechada só reabre pelo relator/chefe. Modelo padrão: Contexto · Opções consideradas · Argumentos e evidências · Divergências e como foram tratadas · Riscos · Decisão proposta · Encaminhamentos (o quê/quem/quando). | Notion blocks com dono [REF-NOTION]; RF37.CA02 estrutura da ata. |
| **Comentários ancorados** | âncora por posição relativa CRDT (sobrevive a edições); comentário pode "ecoar no chat" (cria `SessionMessage` com `replyTo`) para entrar na classificação RF7; resolver = status RESOLVIDO. | Google Docs comments; Yjs `RelativePosition` [REF-YJS]. |
| **Sugestões** | modo "sugerir" (inserção/remoção marcadas) para OBSERVADORES e para qualquer um em seção que não é sua; aceitar/rejeitar = relator ou dono da seção; sugestão aceita gera nó EDITOU no rastro com autor original. | Google Docs suggesting mode [REF-GDOCS]; Loop [REF-LOOP]. |
| **Versões** | `DocumentSnapshot` a cada mudança de fase, a cada publicação de resumo/decisão, manual ("nomear versão") e periódica (5 min com mudanças); diff legível entre versões; restaurar = nova versão (nunca apaga). | Google Docs named versions; RF22.CA02 versões com diff. |
| **Bloqueio de trechos** | seção FECHADA ou "citação de decisão" = somente leitura (`lockedSectionsJson`); tentativa de editar mostra motivo. | Loop/Word "restrict editing". |
| **IA com faísca ✦** | ações por seção: "resumir esta seção", "listar evidências citadas no chat", "redigir a partir da Mesa (opção X)", "verificar conformidade (RF32)"; o texto da IA entra **como sugestão**, nunca como edição direta; tooltip "gerado por IA em…" (RF38.CA04). | FigJam Jambot, Notion AI, Loop Copilot [REF-FIGJAM, REF-NOTION, REF-LOOP]; RF43 §1 autoridade humana. |
| **Ligação com o chat/Mesa** | arrastar mensagem/cartão para a Minuta cria citação com link ao original (nó `ANEXOU`); a Minuta mostra à margem a classe da mensagem citada. | Slack canvas "add from message" [REF-SLACK]. |

### D.3 Regras (proposta)

1. **Decisão VALIDADA ⇒ Minuta somente leitura** (`readOnly = true`); correções posteriores só por **errata** (nova `SessionArtifact` ATA com referência), nunca editando o texto carimbado (coerente com rastro imutável RF29.CA07 e com "tarefas vinculadas a decisões validadas não podem ser excluídas", RF41.CA05).
2. **Classificação de acesso** (`accessClass`, herdada da tarefa mais restrita anexada ou definida pelo chefe — RF20 PÚBLICO/INTERNO/RESTRITO/SIGILOSO): RESTRITO/SIGILOSO **limita a entrada** (só participantes nomeados, sem link externo, sem OBSERVADOR de outro departamento) e **bloqueia IA externa** (`externalAiAllowed = false` → só motor local, RF43.CA02; as ações ✦ da Minuta ficam desabilitadas com aviso); transcrição de reunião (RF37) nessas sessões só por transcrição colada.
3. **Toda edição no rastro e auditoria**: o CRDT guarda autoria por operação; a cada snapshot grava-se `DecisionTraceNode` tipo ARTEFATO (relação `EDITOU`, nova) com `authorsJson` e diff; `audit_log` com `correlationId` em mudanças de status de seção, bloqueio, restauração e aceite de sugestão (ARQUITETURA §3.3).
4. **Limite de editores e latência**: `maxEditors` = 10 simultâneos (os demais entram em modo sugestão/comentário; sessões ≥ 10 pessoas usam RELATOR + seções atribuídas); **latência alvo ≤ 300 ms** entre a edição e a sua exibição nos outros clientes (p95, mesma região), medida em `ws_doc_latency` e exposta no painel RF43.CA12; acima de 1 s por 30 s o cliente mostra "sincronizando" e bloqueia novas sessões de edição.
5. **Offline/ reconexão**: edições locais ficam em IndexedDB e mesclam ao reconectar (CRDT garante convergência); se a Minuta ficou `readOnly` nesse meio-tempo, as edições pendentes viram **sugestões**.
6. **Google/Microsoft vinculados** (RF20 fontes; RF41.CA03 versões): a Minuta pode ser **exportada** como Docs/Word (tarefa DOCUMENTO vinculada) ao fechar; **importar/ligar** um Docs/Word existente é somente leitura espelhada (sem coedição bidirecional na v1 — ver §D.4 e QS-12).

### D.4 Resumo do comparativo técnico (detalhe e PoC em `COEDICAO_TECNICA.md`, do outro agente)

| Tema | Opções | Leitura resumida | Recomendação de base (a validar no PoC) |
|---|---|---|---|
| **Modelo de consistência** | **Yjs** (CRDT, Y.Text/Y.Map/Y.Array, awareness, `RelativePosition`, bindings ProseMirror/Tiptap, y-indexeddb) · **Automerge** (CRDT JSON, núcleo Rust/WASM, `automerge-repo`, histórico completo por mudança) · **OT** (ShareDB/Google Docs: servidor central transforma operações, exige ordem total) [REF-YJS, REF-AUTOMERGE, REF-OT] | OT é maduro para texto, mas precisa de servidor autoritativo e é frágil em offline/multi-servidor; Yjs é o mais usado em editores web (Tiptap, BlockNote, Notion-likes), com awareness pronto e footprint pequeno; Automerge tem histórico por operação mais explícito (bom para auditoria), binários maiores e ecossistema de editores menor. | **Yjs** para a Minuta (texto rico + comentários + awareness); a auditoria "por edição" vem dos snapshots + `UndoManager`/`Y.Snapshot` com `gc=false` nas sessões RESTRITO/SIGILOSO. Automerge fica como alternativa se o PoC mostrar que a auditoria por operação é obrigatória para o TCE. |
| **Transporte / servidor** | **WebSocket/STOMP no Spring** (mesmo processo `ws-web`, `spring-messaging`, broker relay Redis) · **Hocuspocus** (servidor Yjs em Node, extensões de auth/persistência/Redis, webhooks) · **y-websocket** próprio em Node · SSE já previsto para o chat (Q-27) | STOMP no Spring mantém um só backend, mas obriga a reimplementar o protocolo de sync do Yjs em Java (existe `y-crdt` em Rust com bindings, não Java); Hocuspocus resolve sync/awareness/persistência/escala horizontal (Redis) com pouco código, ao custo de um serviço Node a mais (já há Next.js no stack). | **Hocuspocus** como serviço `ws-collab` (Node) atrás do BFF, autenticado por JWT curto emitido pelo `ws-web`, com webhook `onStoreDocument` → `ws-web` grava `DocumentSnapshot`; chat continua em SSE/Redis pub/sub. Se a equipe quiser 100 % Java: STOMP + `y-crdt` via JNI/WASM é a opção B. |
| **Presença** | Yjs awareness (efêmero, não persiste) sobre Redis pub/sub (Hocuspocus Redis extension) ou chave `presence:{sessionId}` com TTL 30 s | Awareness já resolve cursor/seleção/nome/cor; a presença do **chat/card** ("online") precisa de Redis com TTL para funcionar sem o editor aberto. | Awareness para o editor; `presence:{sessionId}:{userId}` TTL 30 s em Redis para card/painel (heartbeat 10 s). |
| **Snapshots e persistência** | estado Yjs binário em **S3** (`stateMediaId`) + metadados em **MySQL** (`document_snapshots`) + updates incrementais em **Cassandra** (`doc_updates_by_document`, TTL até o próximo snapshot) | Segue a persistência poliglota do ARQUITETURA §3.2: MySQL fonte de verdade, Cassandra append-only volumoso, S3 binários. | Snapshot a cada 5 min com mudanças/fase/decisão; compactar updates no snapshot; exportar Markdown (`contentMd`) junto para busca (OpenSearch) e Memória (RF33). |
| **Offline** | y-indexeddb (cliente) + fila de updates; reconexão com sync protocol | Simples com Yjs; precisa de regra para `readOnly` mudado durante o offline (§D.3-5). | Habilitar y-indexeddb só para participantes MEMBRO/RELATOR; OBSERVADOR não armazena localmente (dados RESTRITO). |
| **Google/Microsoft vinculados** | Docs/Word como **origem somente leitura** (espelho por versão, RF41.CA03) ou **exportação** ao fechar; coedição real dentro do Docs/Word exigiria usar as APIs de colaboração deles (não há CRDT compartilhado) | Coedição bidirecional é inviável na v1 (conflito de modelos). | Exportar ao fechar; "abrir no Docs" como link; ver QS-12. |
| **Escala e custo** | 1 documento por sessão, ≤ 10 editores, dezenas de leitores | Hocuspocus com Redis escala horizontalmente; para a SECID (centenas de usuários) um pod basta. | Começar com 1 instância + Redis; medir `ws_doc_latency`. |

---

## E. Papéis, ritmo e moeda

### E.1 Papéis por estado

`ParticipantRole` hoje: ADMIN · MEMBRO · OBSERVADOR · IA (TAX §5.2). (proposta) acrescentar **RELATOR** (quem conduz a Minuta; o chefe pode delegar a um MEMBRO ou CURADOR); "moderador" = ADMIN da sessão. Mapeamento DACI/RAPID [REF-DACI, REF-RAPID]: Driver = moderador · Approver/Decide = revisor (RF15) · Contributors/Input = membros · Informed = observadores + Mural · Recommend = IA + relator.

| Estado | Moderador (ADMIN) | Relator | Participante (MEMBRO) | Observador | IA facilitadora |
|---|---|---|---|---|---|
| RASCUNHO / AGENDADA | define tema/objetivo/acesso, convida, agenda, recusa | nomeado pelo moderador; prepara seções da Minuta | aceita convite, lê pauta | — | sugere tema, pauta, precedentes, critérios |
| ABERTA / REABERTA | avança/volta fase, turnos, mão levantada, silenciar, fixar, estacionar, add/remove (RF9), habilita resposta a divergência (RF10) | atribui seções, aceita sugestões, fecha seções, pede "redigir a partir da Mesa" | mensagens, anexos, posições, responde divergência/pergunta, edita sua seção, levanta a mão | lê, comenta/sugere na Minuta, **não** envia mensagem (RF6.CA02 derivado), não conta para consenso | abre fases, classifica, detecta divergências, pergunta, convida quem falta, alerta fuga do tema, mantém Resumo vivo, propõe opções/critérios/notas |
| CONVERGINDO | revisa e publica/devolve resumo | consolida Minuta com o resumo | lê; comenta na Minuta | lê | gera resumo (RF11) |
| DECISAO_PROPOSTA | edita/encaminha decisão (RF12) | fecha seção "Decisão proposta" | objeção final (rodada de consentimento) | — | propõe decisão (RF12) e verifica citações |
| EM_REVISAO | (se também revisor) valida/devolve — ver QS-03 | — | lê | lê | entrega fio + checklist de revisão |
| VALIDADA / DEVOLVIDA | encerra / decide reabertura | errata (VALIDADA) ou reabre seções (DEVOLVIDA) | vota reabertura | — | cria ReopenRequest justificado (RF14), gera artefatos (RF13) |
| ENCERRADA / ARQUIVADA | exporta | — | "Transformar em tarefa", lê | lê | indexa na Memória (RF33) |

### E.2 Ritmo e moderação (proposta; inspirações: Slack huddles "raise hand", FigJam/Miro timer e voting, Liberating Structures, Loomio prazos [REF-SLACK, REF-FIGJAM, REF-MIRO, REF-LS, REF-LOOMIO])

- **Turnos**: modo "em turnos" ativado pelo moderador (sugerido pela IA quando ≥ 10 participantes ou ≥ 60 msgs/10 min): só quem está "com a palavra" envia mensagem; os demais usam **mão levantada** (`handRaisedAt`, fila visível no painel); a IA sugere a ordem (quem ainda não falou primeiro). Mensagens fora do turno viram rascunho para enviar depois (não se perdem).
- **Tempo por fase** (`SessionTimer kind FASE`): opcional, visível na Faixa de Objetivo; ao vencer, a IA resume e sugere avançar — nunca avança sozinha.
- **Silenciar** (`mutedUntil`): apenas o moderador, com motivo registrado e visível ao silenciado; máximo 30 min; auditado (segurança psicológica e abuso — RF42.CA07 antifraude usa o mesmo registro).
- **Fixar** (`pinned`): até 5 mensagens fixadas (objetivo, critérios, pergunta crítica, decisão proposta); fixadas aparecem na Faixa como chips.
- **Estacionamento**: itens fora do tema; a IA propõe "virar nova sessão" quando ≥ 10 itens ou quando o chefe pede; itens estacionados não pontuam DP (RF42 "fora do tema").
- **Rodadas** (≥ 10 pessoas): 1-2-4-Todos [REF-LS] como sugestão da IA em Divergir (sub-grupos como threads por opção, 5 min cada, depois síntese ✦); **Delphi anônimo** opcional em temas sensíveis (autor oculto até o fim da rodada; o rastro guarda a autoria — QS-06).
- **Reunião síncrona** (RF37 Ata Viva): botão "Nova reunião" na Faixa; a transcrição classificada entra como mensagens IA/SISTEMA atribuídas aos falantes com consentimento (RF37.CA05).

### E.3 DECIA Points e Hype na sessão — sem incentivar volume

Fontes: tabela do RF42 (dump l.779–790; só eventos confirmados pela IA; "não geram pontos: ruído, fora do tema, repetidas > 90 %"); RF43.CA05 "volume bruto de mensagens nunca é critério"; RF42.CA07 antifraude; objetivo 2 (clareza, evidências, consistência).

Mantido como está: +5 argumento com evidência (teto 10/dia/sessão) · +3 consenso confirmado · +8 divergência resolvida · +4 pergunta respondida com evidência · +6 artefato usado · +15 × qualidade decisão validada · +2 presença em sessão encerrada.

Propostas (todas via `decia_points_rules` versionada, RF42.CA02):
1. **Teto por sessão e por pessoa** (ex.: 40 DP antes da decisão) — impede farming por repetição de argumentos levemente diferentes; o multiplicador da decisão validada continua ilimitado porque depende do resultado.
2. **+5 "mudei de posição com evidência"**: quando a IA confirma que uma pessoa trocou a posição numa opção **citando evidência** (consistência ≠ teimosia; é o sinal mais raro e valioso de deliberação) — marcado só pela IA, auditável.
3. **+6 relator** por Minuta fechada com todas as seções FECHADAS e ≥ 1 sugestão aceita de outra pessoa.
4. **+3 "esclarecimento aceito"**: resposta a pergunta de outro participante marcada como "me ajudou" pelo autor da pergunta (1 por pergunta).
5. **Nada por**: levantar a mão, enviar mensagem, reagir, estar online, número de edições na Minuta, cartões movidos na Mesa.
6. **Hype da sessão** (indicador do card, derivado — D-12): % de membros manifestados, divergências resolvidas ÷ abertas (Lencioni proxy, RF43 §8-D), % de mensagens com evidência, tempo até a decisão vs. mediana do departamento, rastro completo. Mostrado como texto + mini-barras; **nunca** como ranking de pessoas dentro da sessão. Alimenta o Hype Score do Perfil (RF45) só pela dimensão "DECIA" com os mesmos eventos pontuados.
7. **Antifraude específico**: mensagens com similaridade > 90 % entre si ou com o Resumo vivo não pontuam (já no RF42); reações cruzadas entre 2 pessoas em < 1 min repetidas ficam suspensas (RF42.CA07); DP da sessão só se consolida em ENCERRADA (lançamentos ficam "pendentes" no extrato até lá — evita pontuar sessão abandonada, ver QS-10).

---

## F. Mudanças propostas no board e perguntas ao dono

### F.1 Mudanças propostas (numeradas)

1. **Recriar os cards RF4–RF17 da sessão** (hoje sem card RF, só nas listas Sprint 1–3 — `RENUMERACAO.md`, Q-44) com os CAs derivados em `docs/diagramas/RF4..RF17` como ponto de partida.
2. **RF4 (tema/acesso)**: acrescentar CA "objetivo em 1 frase obrigatório (≤ 200 caracteres), exibido na Faixa de Objetivo em todas as telas da sessão"; CA "classificação de acesso da sessão (PÚBLICO…SIGILOSO) herda a mais restrita dos anexos e limita IA externa (RF43.CA02)"; CA "`phaseMode` GUIADO/LIVRE/ESTRITO, padrão GUIADO; ESTRITO imposto pela política da EMPRESA".
3. **RF5 (iniciar)**: novo estado **AGENDADA** com `scheduledAt`, convites, lembretes 24 h/1 h, pauta ✦; CA "recusa → CANCELADA com motivo" (resolve Q-26); atualizar os `stateDiagram` de RF4/RF5/RF12/RF14/RF15/RF17 §4 e ARQUITETURA §5.2 para a enum nova (§A.1).
4. **RF6 (mensagens)**: CA "mensagem carrega `phase`, pode ser fixada (≤ 5) e marcada fora do tema (estacionamento)"; CA "modo em turnos/mão levantada quando ativado pelo admin"; CA "latência de entrega p95 ≤ 300 ms na mesma região".
5. **RF7 (classificar)**: acrescentar classes **EVIDENCIA** e **PROPOSTA** (opção) ao `MessageClass`; CA "classificação liga a mensagem a `optionId`/`criterionId` da Mesa e aceita papel Toulmin opcional"; CA "autor ou admin corrige a classe (Q-28) e a correção treina a próxima".
6. **RF8/RF16 (divergências e perguntas)**: CA "pergunta PONTO_CRITICO aberta impede sair de ESCLARECER em modo ESTRITO; em GUIADO só avisa"; CA "aviso de fuga do tema é privado ao autor antes de qualquer sinal público".
7. **RF9 (participantes)**: papel **RELATOR**; `handRaisedAt`, `mutedUntil` (máx. 30 min, motivo, auditado); OBSERVADOR não conta para consenso nem para "quem falta se manifestar".
8. **RF10 (responder divergência)**: CA "objeção na rodada de consentimento cria `Divergence` ligada à opção".
9. **RF11 (resumo)**: CA "Resumo vivo: versão RASCUNHO regenerada a cada N mensagens ou K minutos em ABERTA (custo em modo ECONOMIA), publicada só pelo admin"; CA "critérios e notas do resumo vêm da matriz opções × critérios da Mesa quando existir".
10. **RF12 (decisão)**: `chosenOptionId`; CA "rodada de consentimento final (objeção registrada) antes de encaminhar"; prazo de 3 dias úteis com lembrete.
11. **RF13 (artefatos)**: CA "ATA/RELATÓRIO são gerados a partir da Minuta Coletiva quando ela existe; a IA só preenche seções vazias".
12. **RF14 (reabertura)**: estado de sessão **DEVOLVIDA** com votação de 48 h; REABERTA volta à fase ESCLARECER com motivo fixado; `reopenCount ≥ 3` → IA sugere encerrar/dividir.
13. **RF15 (revisão)**: estado **VALIDADA** (curto) com encerramento automático após artefatos; prazo de revisão 5 dias úteis, lembrete no 3º, escalonamento à EMPRESA no 10º; checklist de revisão ✦ (conformidade, fontes, projeto vinculado).
14. **RF17 (encerrar)**: CA "Minuta vira somente leitura; DP pendentes da sessão consolidam"; CA "CANCELADA não vai à Memória".
15. **Novo RF — Fases de deliberação**: `DeliberationPhase` (Contexto · Divergir · Esclarecer · Convergir · Decidir), `SessionPhaseLog`, critérios de saída sugeridos pela IA, PercentBar determinística (§B.5) em `METRICAS_GESTAO.md`.
16. **Novo RF — Mesa do DECIA**: `DecisionOption`, `DecisionCriterion`, `OptionCriterionScore`, `SessionBoardItem`; visões por opção (padrão), matriz, linha do tempo, por fase (se projeto); estacionamento; indicador de consenso; vista em lista acessível obrigatória (WCAG 2.5.7).
17. **Novo RF — Minuta Coletiva (coedição)**: `SessionDocument`, `DocumentSection`, `DocumentSnapshot`, `DocumentComment`; regras §D.3; latência ≤ 300 ms; ≤ 10 editores; IA só como sugestão.
18. **RF22 (Mesa de Trabalho)**: CA04 "último-vence em 3 s" passa a valer só para posição/estrutura; texto de comentários e descrições usa o mesmo mecanismo CRDT da Minuta (ou fica explícito que não é coedição de texto); CA novo "diff sugerido pela decisão validada → `ProjectVersion`".
19. **RF29 (ponte)**: CA02 ampliado (opção escolhida → tarefas; opções descartadas → "alternativas consideradas" no snapshot); CA novo "arrastar do Acervo para a Mesa cria mensagem com anexo ligada à opção"; relação `EDITOU` no `DecisionTrace`.
20. **RF37 (Ata Viva)**: CA "trechos da ata distribuídos nas colunas da Mesa e nas seções da Minuta"; sessões RESTRITO/SIGILOSO só aceitam transcrição colada.
21. **RF42 (DECIA Points)**: linhas novas da tabela (§E.3: teto por sessão, +5 mudança de posição com evidência, +6 relator, +3 esclarecimento aceito) e regra "DP da sessão consolidam em ENCERRADA".
22. **RF38 (identidade)**: componentes **PercentBar**, **ObjectiveBand**, **SessionCard**, **BoardColumn/ConsensusMeter**, **PresenceCursor** (cores de nó do logo); etiquetas de estado para os 12 valores da enum.
23. **TAXONOMIA §5**: aplicar o diagrama de classes `decia/sessao-classes.puml` (campos marcados `<<proposta>>`), renomear `SessionStatus` e registrar D-nn correspondente em `DECISOES.md`.

### F.2 Perguntas ao dono (QS = sessão; sugerido incorporar a `DECISOES.md` após Q-47)

1. **QS-01** Numeração: os RFs da sessão voltam a ter cards (RF4–RF17 antigos) ou ganham números novos? Este documento usa os ids dos CAs (Q-44).
2. **QS-02** A enum nova (`RASCUNHO … CANCELADA`, 12 valores) é aceita, ou preferem manter os 8 nomes da TAXONOMIA e tratar AGENDADA/VALIDADA/DEVOLVIDA como flags?
3. **QS-03** Moderador e revisor são a mesma pessoa (chefe do departamento)? Se sim, aceitam a regra "quem moderou **e** redigiu a decisão não pode ser o único revisor" (segunda assinatura da EMPRESA ou outro chefe) para temas RESTRITO/valor alto? (Q-03/Q-17)
4. **QS-04** Fases: `phaseMode` GUIADO como padrão e ESTRITO só por política da EMPRESA — ok? Quais temas exigem ESTRITO (classificação, valor envolvido, processo Licitação)?
5. **QS-05** Prazos propostos (revisão 5 dias úteis, encaminhamento 3, votação 48 h, inatividade 7/30 dias, AGENDADA 7 dias) — confirmar ou parametrizar por EMPRESA?
6. **QS-06** Rodada **anônima** (Delphi) é desejável no setor público? O rastro guardaria a autoria (auditável), só a UI ocultaria até o fim da rodada.
7. **QS-07** Mesa por opção como padrão e matriz opções × critérios na fase Convergir — aceitam notas 1–5 geradas pela IA (✦, editáveis) ou a nota deve ser sempre humana?
8. **QS-08** Quem define os critérios de decisão: só o chefe, o grupo (com peso) ou derivados do plano anual/checklist (RF24/RF32) por padrão?
9. **QS-09** Minuta Coletiva: aceitam um serviço Node (`ws-collab`/Hocuspocus) ao lado do Spring, ou a coedição precisa ser 100 % Java? (decide a opção A/B do §D.4; depende do PoC em `COEDICAO_TECNICA.md`)
10. **QS-10** DP da sessão consolidam só em ENCERRADA (pendentes no extrato até lá) — ok? E o teto por sessão (40 DP antes da decisão)?
11. **QS-11** Observador: pode comentar/sugerir na Minuta mas não enviar mensagem — confirmam? Curador pode ser RELATOR?
12. **QS-12** Documentos Google/Microsoft: só exportar ao fechar e espelhar como leitura (v1) — ou é requisito coeditar dentro do Docs/Word?
13. **QS-13** Cores de presença "de nó do logo": precisamos do PNG oficial do logo (Q-45) para derivar os tokens `--node-*`; até lá usar `--dept-*`?
14. **QS-14** Encerramento automático após VALIDADA (quando os 3 artefatos existem ou 24 h) — ou o chefe deve encerrar manualmente sempre (HU17 "administrador encerra")?

---

## Anexo R — Referências externas e o que foi aproveitado

| Id | Referência | Aproveitado em |
|---|---|---|
| REF-IBIS | Kunz & Rittel, *Issues as Elements of Information Systems* (1970); Conklin, gIBIS/Compendium (questão → posição → argumento) | A.5, C.1 (por opção), Mapa L3 |
| REF-TOULMIN | Toulmin, *The Uses of Argument* (1958): alegação, dado, garantia, apoio, qualificador, refutação | `toulminRole` (classes), Mapa L3, F.1-5 |
| REF-KIALO | Kialo: árvore pró/contra por tese com votos de impacto | indicador de consenso por opção, Mapa L3 |
| REF-LOOMIO | Loomio: proposta com prazo, posições concordo/abstenho/discordo/bloqueio, resultado registrado | rodada de consentimento, `votingDeadlineAt`, DEVOLVIDA |
| REF-SOC | Sociocracia / consentimento (objeção argumentada; "bom o suficiente por ora, seguro o bastante para tentar") | fase Convergir, objeção → divergência |
| REF-DELPHI | Método Delphi (RAND, anos 1950): rodadas anônimas com feedback controlado | rodada anônima opcional (QS-06), IA como "feedback controlado" |
| REF-NGT | Técnica de Grupo Nominal (Delbecq & Van de Ven, 1971): geração silenciosa → rodada → esclarecimento → votação | fase Divergir sem divergências formais, Esclarecer, consentimento |
| REF-DD | Double Diamond (Design Council, 2005): descobrir/definir/desenvolver/entregar | Divergir/Convergir, PercentBar por marcos |
| REF-LS | Liberating Structures (Lipmanowicz & McCandless): 1-2-4-Todos, Min Specs, TRIZ | rodadas ≥ 10 pessoas, critérios mínimos |
| REF-DACI | DACI (Intuit/Atlassian): Driver, Approver, Contributors, Informed | papéis E.1 |
| REF-RAPID | RAPID (Bain): Recommend, Agree, Perform, Input, Decide | revisor único = Decide; IA/relator = Recommend |
| REF-GDOCS | Google Docs: modo sugestão, comentários ancorados, histórico de versões nomeadas, OT | D.2 sugestões/versões/comentários; D.4 OT |
| REF-NOTION | Notion: blocos com dono, visões board/tabela/linha do tempo do mesmo banco, IA por bloco | seções atribuídas, Mesa como projeções dos mesmos dados |
| REF-FIGMA / REF-FIGJAM | Figma multiplayer (cursores nomeados), FigJam (timer, votação, carimbos, seções, Jambot) | presença, timer de fase, votação por opção, IA por seção |
| REF-MIRO | Miro: frames, votação, timer, estacionamento ("parking lot") | estacionamento, frames = colunas por opção |
| REF-SLACK | Slack: huddles (mão levantada), canvas (adicionar a partir de mensagem), threads, fixar | mão levantada, citação chat → Minuta, threads por opção, fixar |
| REF-LOOP | Microsoft Loop: componentes portáveis, páginas coeditadas, Copilot em página | Minuta como componente que vira ATA/tarefa; IA como sugestão |
| REF-YJS | Yjs (Kleppmann et al. / Jahns): CRDT, awareness, RelativePosition, y-websocket, y-indexeddb; Hocuspocus (Tiptap) | D.4 modelo, transporte, presença, offline |
| REF-AUTOMERGE | Automerge (Kleppmann): CRDT JSON, automerge-repo, histórico por mudança | D.4 alternativa para auditoria por operação |
| REF-OT | Operational Transformation (Ellis & Gibbs 1989; Google Docs/ShareDB) | D.4 por que não OT |
