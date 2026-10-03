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
