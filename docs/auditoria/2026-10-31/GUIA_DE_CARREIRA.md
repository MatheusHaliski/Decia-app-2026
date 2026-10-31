# Auditoria: o Work Station como guia de carreira para quem busca recolocação — 31/10/2026

Persona: pessoa comum, sem emprego há alguns meses, que entra no Work Station (WS) para se recolocar e quer um guia virtual que a direcione no mercado. Pergunta da auditoria: **como o sistema deve informar essa pessoa por meio de perguntas que definem o perfil, sugerem tarefas, ajustam a IA e regulam a rede social?**

Método: leitura do código e dos requisitos (RF1–RF3, RF6, RF18, RF19, RF26, RF43, RF50, RF51; `REDE_PROFISSIONAL_VISIBILIDADE.md`; `DADOS_DE_PERFIL_POR_TIPO.md`), percurso real no build de produção com capturas de tela, e três pesquisas externas (plataformas de emprego e frameworks de orientação; plataformas de portfólio por tarefa e regulação de IA; interação humano–IA e avisos). Fontes e datas em `fontes/` ao final. "Não conferido" marca o que não foi confirmado na fonte primária.

## 1. Resumo

- **Hoje o WS não reconhece a persona.** O cadastro oferece três tipos de conta — Empregado, Empresa e Chefe de departamento (`ws-domain/.../identity/ProfileType.java`, `components/auth/AuthForms.tsx:136`). Quem está sem emprego precisa se declarar "Empregado" ("Pessoa que trabalha em uma empresa ou órgão"), o que já começa com uma mentira constrangedora.
- **Não há onboarding.** Depois do cadastro a pessoa cai no Mural sem nenhuma pergunta sobre objetivo, área, prazo ou disponibilidade. O perfil (`/profile`) tem nome, cargo, biografia, foto e até 10 especialidades; nada de objetivo, situação ou competências com evidência.
- **A IA está configurada, mas não conversa.** Os cinco modos de autonomia (RF51, `lib/ai/autonomy.ts`) e o modo econômico/avançado existem em Configurações › Trabalho, com textos técnicos ("ponto de restauração", "limite de passos/tokens") que a persona não entende. Nenhum motor de IA está registrado; `/insights` (RF43, RF50) é página-esqueleto.
- **A rede social tem regras, mas sem painel.** Visibilidade do perfil existe no backend (`profileVisibility`), seguir e mural funcionam em demonstração, mas a aba Configurações › Privacidade é esqueleto. A pessoa não consegue responder "quem vê que estou procurando emprego?".
- **A especificação já aponta o caminho.** O RF50 (Análise de Perfil) tem 18 critérios que cobrem objetivo da análise, escopo, dados usados, caminhos de carreira com fonte, pessoas semelhantes e privacidade por padrão. O que falta é a camada de **perguntas** que alimenta esse RF e as **tarefas-guia** no Letters e no Drawings que transformam respostas em evidências.

Notas por dimensão (0–10, estado atual): perfil **2,5**; sugestão de tarefas **1,0**; ajuste da IA **4,0**; regulação da rede **2,0**. Detalhe na §2. O requisito que responde à auditoria é o **RF75 Work Station Career Guidance** (§5).

## 2. O que a persona encontra hoje

Percurso no build de produção (`next start`, modo laboratório, sem backend), como visitante e com sessão simulada. Capturas em `capturas/`.

### 2.1 Perfil — nota 2,5

- **Cadastro:** a única pergunta de perfil é o tipo de conta (`components/auth/AuthForms.tsx:115-136`); "Empregado" é descrito como "Pessoa que trabalha em uma empresa ou órgão" (`pt-BR.json:1733`). A tela mostra os selos internos "RF1" e "política do RF1.CA01" (`capturas/g-register.png`); o login mostra "RF2" e "(Q-30)" (`capturas/g-login.png`).
- **Depois do cadastro:** a confirmação de e-mail e o login levam ao `/mural` (`components/auth/VerifyEmailForm.tsx:26`, `lib/auth/next.ts:6`). Não há primeiro acesso, checklist nem "complete seu perfil".
- **Perfil:** nome, nome de exibição, cargo, "Sobre você" e até 10 especialidades livres, visíveis a qualquer conta autenticada por padrão (`components/account/AccountPanel.tsx`, `lib/account/publication.ts:9-16`). Nada de objetivo, situação, experiência, formação, disponibilidade, localização ou currículo (lacunas 1, 11, 17–20, 39–41 de `DADOS_DE_PERFIL_POR_TIPO.md` §12).
- **Vocabulário:** "Acervo de Tarefas", "Perfil deliberativo", "DP", "Hype", "Plano Anual", "chancelas" — tudo institucional; o catálogo de textos pt-BR não contém "carreira", "emprego" nem "vaga".
- **Conflito de produto:** a especificação proíbe o sinal "procurando emprego" e a pretensão salarial (`DADOS_DE_PERFIL_POR_TIPO.md` §4 e §10.7). A persona contraria a regra atual — resolvido pela decisão D-147 no RF75.

### 2.2 Sugestão de tarefas — nota 1,0

- `/tasks/new` é real (RF4), mas a pessoa preenche tudo; nada é sugerido (`capturas/u-tasks-new.png`).
- `/insights` (Acervo, Perfil, Ranking, Projetos sugeridos), `/plans` e `/goals` são esqueleto `RfPage` com o bloco "O que esta aba vai fazer" cheio de jargão ("AiRequest(capability…)", "Resilience4j", "EVM/CPM/PERT") (`capturas/u-insights.png`).
- "Horário da Tarefa do Dia" existe em Notificações, mas a sub-aba Tarefa do Dia não tem conteúdo.
- Risco: a sub-aba "Ranking" planejada tende a ser lida como avaliação de empregabilidade, o que o RF50.CA06/CA12 proíbe.

### 2.3 Ajuste da IA — nota 4,0 (o ponto mais maduro)

- Cinco modos de autonomia com efeito verificável (`lib/ai/autonomy.ts`), padrão "Sob solicitação", textos claros; "Motor e custo": Economia ou Avançado (`capturas/u-settings-trabalho.png`).
- Mas: vale só para Letters, Drawings e DECIA; não há consentimento contextual de dados de perfil (`ConsentPurpose.RESUMO_PROFISSIONAL_IA` existe no domínio e não aparece em tela); no modo Avançado a tela não diz quais dados saem (RF50.CA10); o botão Salvar grava só no navegador ("Sincronizam com a conta quando a API… entrar (Bloco 3)"); "Limite WIP", "ferramentas determinísticas" e "tokens" confundem.

### 2.4 Regulação da rede — nota 2,0

- Existem: visibilidade do perfil com duas opções, seguir pela API real, busca de pessoas limitada à própria empresa, 7 interruptores de notificação, regras puras de visibilidade (`lib/social/rules.ts`).
- Faltam: a aba Privacidade é esqueleto ("Bloco 3 / LGPD C", `capturas/u-settings-privacidade.png`); não há descoberta, quem pode seguir, mencionar ou enviar mensagem, bloquear, silenciar, público padrão nem "quem verá?".
- Confunde: sem empresa, "Mural da empresa" e "Buscar pessoas da sua empresa" não fazem sentido; as ações do Mural são ícones sem rótulo (`capturas/u-mural.png`).
- Risco: o Hype aparece no perfil de terceiros (`capturas/u-ana.png`), contra o padrão "só eu" e o RF50.CA12.

### 2.5 Lacunas priorizadas

- **P0:** decisão de produto sobre o sinal "em busca" (D-147); primeiro acesso e questionário inexistentes; RF50 não implementado; Privacidade esqueleto e especialidades visíveis por padrão; jargão interno nas telas.
- **P1:** autonomia da IA não cobre carreira e o modo Avançado não lista os dados enviados; preferências só no navegador; Hype visível a terceiros e "Ranking" planejado; busca e Mural presos à empresa; campos estruturados ausentes.
- **P2:** ícones sociais sem rótulo; Tarefa do Dia sem conteúdo; Drawings 3D e Letters no menu sem uso para a persona; bloquear, silenciar e "quem pode me contatar".

## 3. Princípios que organizam as perguntas

Vêm das plataformas e dos frameworks pesquisados (fontes na §9):

1. **Objetivo antes de dados pessoais.** LinkedIn Open to Work, Indeed, Catho e Duolingo perguntam primeiro "o que você quer" e só depois quem você é.
2. **Progressivo, nunca um formulário gigante.** Cadastro com uma pergunta a mais; primeiro acesso com até 7 perguntas (5 minutos); o resto nos momentos em que a resposta faz diferença, sem repetir o que já foi respondido (perfilamento progressivo).
3. **Privado por padrão, visibilidade em níveis.** Status de busca "só eu / recrutadores verificados / toda a rede" (modelo LinkedIn). Salário, lista de "não quero", pausa na carreira e check-ins de prontidão nunca aparecem a terceiros.
4. **Perguntar em vez de inferir** (Amershi et al., G10). A IA não deduz área, senioridade nem situação a partir de textos ou desenhos; pergunta e deixa corrigir.
5. **Cada pergunta diz por que existe e o que muda.** "Pergunto sua área-alvo para sugerir tarefas que provem competências dessa área." Sem isso, a persona pula ou mente.
6. **Nada de dados sensíveis nem proxies.** LGPD art. 5º II e art. 11; Lei 9.029/1995 art. 1º (sexo, origem, raça, cor, estado civil, situação familiar, deficiência, idade); CLT art. 373-A. Acessibilidade entra como "o que deixa o WS mais fácil para você", nunca como diagnóstico.
7. **Sem score de empregabilidade.** Progresso é por evidência ("3 de 5 critérios atendidos"), nunca "72% de chance". Decisões automatizadas sobre perfil profissional dão direito a explicação e revisão (LGPD art. 20); recrutamento por IA é alto risco no AI Act (Anexo III, 4(a)) — o WS fica fora enquanto a IA servir à própria pessoa e não a empregadores.
8. **A tarefa é o meio de construir o perfil.** Plataformas que geram evidência confiável (Exercism, Frontend Mentor, HackerRank, Open Badges 3.0) juntam enunciado padronizado, artefato versionado com URL, critério de aceite e validação externa. No WS o artefato é uma Letter ou um Drawing.

## 4. Banco de perguntas (quatro dimensões)

Onde: **C** cadastro · **P** primeiro acesso (até 5 min, pode pular) · **X** momento contextual · **S** Configurações. Obrigatória só quando sem ela o sistema não funciona.

### 4.1 Perfil: situação, objetivo, competências

| # | Pergunta | Tipo | Obrig. | Onde | Por quê → o que o sistema faz |
|---|---|---|---|---|---|
| a1 | **"O que descreve seu momento?"** Trabalho e quero mudar · Estou sem emprego · Busco o primeiro emprego · Volto depois de uma pausa · Mudo de área · Trabalho por conta própria · Só explorando | Escolha única | Sim | C | Cria o tipo de conta **Em transição** (RF75) e escolhe a trilha inicial. |
| a2 | Há quanto tempo está buscando? (<1, 1–3, 3–6, 6–12, >12 meses) | Faixas | Não | P | Calibra ritmo e tom; acima de 6 meses sugere a tarefa "atualizar o currículo e o plano 30-60-90". |
| a3 | A mudança foi planejada ou inesperada? | Escolha | Não | P | Eixo "situação" do modelo 4S (Schlossberg); ajusta o tom do Copilot. Privada. |
| a4 | Último cargo ou área (autocompletar CBO) | CBO | Não* | P | Ponto de partida das lacunas. *Dispensada no primeiro emprego. |
| a5 | Quer registrar uma pausa na carreira? (cuidado de familiar, estudos, corte de vaga, mudança, outro) | Escolha + texto | Não | X (ao montar o perfil) | Categoria neutra, como o LinkedIn Career Break. Privada por padrão. |
| a6 | Precisa de sigilo em relação ao empregador atual? | Sim/Não | Sim se "trabalho e quero mudar" | P | Liga "só recrutadores" e bloqueia a empresa atual na descoberta (f2). |
| b1 | **Cargo(s) ou área(s) alvo (até 5)** | CBO/ESCO + "não sei" | Sim | P | Base de todas as sugestões: tarefas, pessoas, caminhos. |
| b2 | Teste de interesses (30 itens, Mini-IP RIASEC) | Questionário | Não | X (se "não sei") | Sugere 3–5 famílias de ocupação com justificativa. |
| b3 | Em quanto tempo quer estar trabalhando? | Faixas | Sim | P | Define cadência e prazo das tarefas. |
| b4 | Regime (CLT, PJ, estágio, temporário, freela, concurso) | Múltipla | Não | P | Filtra sugestões (ex.: edital de concurso vira tarefa). |
| b5 | Modelo (presencial, híbrido, remoto) | Múltipla | Não | P | Filtro. |
| b6 | Cidade, raio ou tempo de deslocamento; aceita mudar? | Local + escala | Não | P | Filtro. Só cidade, nunca endereço. |
| b7 | Salário mínimo aceitável | Faixa | Não | X (ao ver oportunidades) | Filtro privado, nunca exibido. Explica o uso antes de pedir. |
| b8 | O que você **não** quer (cargos, setores, tarefas) | Lista | Não | X | Só filtra; nunca é exibido (modelo Indeed "não tenho interesse"). |
| b9 | Nível pretendido (primeiro emprego, júnior, pleno, sênior, gestão) | Escolha | Não | P | Ajusta senioridade das tarefas e das pessoas sugeridas. |
| c1 | Importar currículo (PDF/DOCX) ou preencher à mão? | Upload | Não | P | Extrai experiências e competências em **ficha editável**; a pessoa confirma item a item (RF50.CA02). |
| c2 | Três coisas que você faz bem | Competências ESCO | Recomendada | P | Mapa de competências declaradas. |
| c3 | Tem prova disso? (projeto, certificado, Letter, Drawing, indicação) | Anexo/link | Não | X (por competência) | Sem prova → cria a tarefa "documentar evidência" (§7). |
| c4 | Formação, cursos e idiomas | Estruturado | Não | P/X | Lacunas em relação ao cargo-alvo. |
| c5 | Que competência quer desenvolver? | ESCO | Não | X | Sugere trilha e tarefas progressivas. |
| c6 | Check-in semanal: preocupação com o futuro, controle, curiosidade, confiança (1–5) | Escala | Não | X (semanal) | Adaptabilidade de carreira (CAAS-SF). Ajusta tom e tipo de tarefa. Privado; nunca vira score. |

### 4.2 Tarefas: disponibilidade e formato

| # | Pergunta | Tipo | Obrig. | Onde | Por quê → o que o sistema faz |
|---|---|---|---|---|---|
| d1 | Quantas horas por semana pode dedicar? | Faixas | Recomendada | P | Dimensiona o plano semanal (ex.: 4 h → 2 tarefas curtas). |
| d2 | Dias e horários para lembretes | Grade | Não | P/S | Agenda a Tarefa do Dia; nada fora desse horário. |
| d3 | Quando poderia começar? | Imediato / aviso prévio / data | Não | P | Equivale ao "Ready to work"; aparece só nos níveis de visibilidade escolhidos. |
| d4 | Como você acessa o WS? (celular, computador) | Escolha | Não | P | Tarefas de Drawings 3D só com computador; textos curtos no celular. |
| d5 | O que deixa o WS mais fácil para você? (fonte, contraste, leitor de tela, menos animação, legendas) | Interruptores | Não | P/S | Só ajusta a interface (já existe em Aparência). Nunca entra no perfil nem vai a recrutadores. |
| d6 | "Esta tarefa serve para você?" (sim / agora não / nunca este tipo) | Escolha | — | X (em cada sugestão) | Feedback granular (G15); "nunca" alimenta b8; duas dispensas seguidas pausam sugestões por 7 dias. |

### 4.3 IA: autonomia, dados, provedor, tom

| # | Pergunta | Tipo | Obrig. | Onde | Por quê → o que o sistema faz |
|---|---|---|---|---|---|
| e1 | **Quanto o guia pode fazer sozinho?** Só sugerir · Rascunhar para eu aprovar · Executar rotinas avisando | Escolha | Sim (padrão: sugerir) | P/S | Mapeia para SUGESTOES / ASSISTIDO / AGENTE (RF51). Manual e Sob solicitação ficam em "Mais opções". Em nenhum modo a IA publica, segue, envia mensagem ou se candidata sem confirmação. |
| e2 | **Que dados o guia pode ler?** Perfil · Currículo · Minhas Letters · Meus Drawings · Mensagens | Caixas | Sim (padrão: perfil + currículo) | P/S | Escopo de leitura (RF50.CA01). Mensagens e itens SIGILOSO nunca vão a provedor externo (RF50.CA10). |
| e3 | Onde a IA roda? Padrão do WS (local, sem custo) · Provedor externo (mais capaz; pede consentimento e mostra categorias enviadas) · Desligar | Escolha | Não (padrão: local) | X/S | Hoje "Economia/Avançado"; renomear e explicar custo e dados enviados. |
| e4 | Tom e frequência do guia: direto ou acolhedor; diário ou semanal | Escolha | Não | P | Personaliza mensagens; frequência máxima 1 nudge proativo por dia. |
| e5 | Permite usar seus dados para melhorar modelos? | Opt-in | Não (padrão: não) | X/S | Consentimento separado e revogável (`/api/me/consents`). |
| e6 | "Por que recebi esta sugestão?" / "Discordo" | Botões | — | X (em cada saída da IA) | Explicação com os campos usados (RF50.CA12) e contestação (LGPD art. 20). |

### 4.4 Rede: descoberta, contato, publicação

| # | Pergunta | Tipo | Obrig. | Onde | Por quê → o que o sistema faz |
|---|---|---|---|---|---|
| f1 | **Quem vê que você está em busca?** Só eu · Recrutadores verificados · Toda a rede | Escolha | Sim (padrão: só eu) | P/S | Status "Em busca" com três níveis; "recrutadores verificados" exige conta EMPRESA validada (RF28). |
| f2 | Ocultar seu perfil de empresas específicas | Lista | Não | P (se a6) | Bloqueio de descoberta; aviso honesto: "não garantimos sigilo total". |
| f3 | Quem pode te mandar mensagem? Conexões · Conexões e recrutadores · Todos | Escolha | Sim (padrão: conexões e recrutadores) | P/S | Permissão de contato (RF46). |
| f4 | Aparecer em buscas e em "pessoas semelhantes"? Mostrar atividade (tarefas concluídas, selos)? | Interruptores | Não (padrão: desligado) | X/S | Descoberta (RF50.CA16) e feed; ligar não republica o acervo antigo. |
| f5 | Público padrão das novas produções: Privado · Rede · Público | Escolha | Não (padrão: privado) | X (na 1ª publicação) | Publicar é sempre ação explícita; rascunho salvo nunca vira post. |
| f6 | Quer mentoria ou um grupo de pessoas na mesma situação? | Sim/Não + tema | Não | X | Eixo "apoio" do 4S; sugere grupos e pessoas (RF50.CA17), sem seguir automaticamente. |
| f7 | Cada peça publicada: comentários? remix com crédito? | Interruptores por item | — | X (ao publicar) | Controles por item (REDE_PROFISSIONAL_VISIBILIDADE §Publicações). |

### 4.5 Ordem

- **Cadastro:** a1 + dados de conta atuais. Nada mais.
- **Primeiro acesso (tela "Vamos montar seu guia", pulável, retomável):** b1, b3, a6 (se couber), d1, e1, e2, f1, f3. Mostra o ganho de cada resposta ("com isso já posso sugerir sua primeira tarefa").
- **Contextuais:** b2 ao responder "não sei"; b7/b8 ao ver oportunidades; c3 por competência; d6 e e6 em cada sugestão; f5/f7 na primeira publicação; c6 semanal; a5 ao montar o perfil.
- **Configurações:** tudo revisável em Carreira, IA e Privacidade (§6).

## 5. Requisito funcional: RF75 Work Station Career Guidance

A pedido do usuário (31/10/2026), as seis frentes abaixo viraram **um único requisito**, o **RF75 — Work Station Career Guidance (Guia de Carreira do Work Station)**, com 18 critérios de aceite, seis diagramas e plano de implementação em sete etapas: [`docs/diagramas/RF75/README.md`](../../diagramas/RF75/README.md) · [card 241 no Trello](https://trello.com/c/IbMkAppV/241-rf75-work-station-career-guidance-guia-de-carreira-do-work-station-guiar-a-pessoa-em-transi%C3%A7%C3%A3o-de-carreira-com-perguntas-tarefas). As linhas da tabela correspondem às etapas E1–E6 do plano; ficam aqui como leitura por frente.

| Frente | Nome | Resumo | Depende de |
|---|---|---|---|
| **E1** | Tipo de conta "Em transição" e momento de carreira | Novo `ProfileType.EM_TRANSICAO` sem validação; pergunta a1 no cadastro; migração `V60`; a conta pode mudar para EMPREGADO sem perder dados; textos do cadastro revisados ("Pessoa que trabalha…" deixa de ser a única opção para pessoa física). | RF1, RF3 |
| **E2** | Guia inicial de carreira (onboarding progressivo) | Tela pós-cadastro com as perguntas P da §4.5, pulável e retomável; respostas em `career_profile` (privado); banner "Seu guia está 3/8" até concluir; nunca bloqueia o uso. | E1, RF3 |
| **E4** | Plano de recolocação e Tarefa do Dia guiada | A partir do perfil de carreira gera um plano semanal com tarefas do catálogo (§7), cada uma com competência, critério de aceite, evidência e "por que esta tarefa"; d6 em cada item; progresso por evidência; sem streak punitivo (pausa gratuita). Dá conteúdo à sub-aba "Tarefa do Dia" (perfil n.9). | E2, RF4, RF26, RF50 |
| **E5** | Evidência de competência e selo validado | Concluir uma tarefa gera `Evidence` (URL da Letter/Drawing, versão, critérios atendidos, quem validou); selo por validação de par/mentor/curador, nunca só pela IA; exportável como Open Badge 3.0; "como foi calculado" e "contestar" em todo rótulo inferido. | E4, RF24, RF25, RF40 |
| **E3** | Status "Em busca" com visibilidade em níveis e bloqueio de empresas | f1, f2, d3; três níveis; recrutador verificado = EMPRESA validada; aviso de sigilo não garantido; nunca usado para ranquear. | E1, RF28, RF16 |
| **E3/E6** | Painel de IA e dados para a pessoa (consentimentos, escopo, provedor, histórico) | e1–e6 numa aba única; histórico de análises com "excluir" e "exportar" (RF50.CA14); consentimento externo contextual (RF50.CA10); log do que a IA leu. | RF51, RF50, RF3 |

O RF50 (Análise de Perfil) permanece como está: o RF75 fornece o **perfil de carreira** que o CA01 dele pede e consome as saídas 1–4 (tarefas, projetos, caminhos, pessoas).

## 6. Abas, sub-abas e pontos de entrada

Convenção: `lib/nav/matrix.ts` e `lib/pages/registry.ts`, visibilidade por perfil na Matriz de `ABAS_POR_PERFIL.md`. **Novo** = não existe; **reaproveitar** = esqueleto que ganha conteúdo.

| Onde | Sub-aba | Estado | Conteúdo | Perfis |
|---|---|---|---|---|
| `/profile` | **Carreira** (nova, n.16) | novo | Momento, objetivo, competências com evidência, pausa, plano; só o dono vê; "o que os outros veem" com prévia por nível. | EMPREGADO, EM_TRANSICAO |
| `/profile` | Tarefa do Dia (n.9) | reaproveitar | A tarefa guiada de hoje (RF75.CA05) com "por que", critério, abrir no Letters/Drawings, "serve para você?". | idem |
| `/insights` | Perfil | reaproveitar | Análise de Perfil (RF50): síntese, lacunas, caminhos com fonte e data, pessoas semelhantes. | EMPREGADO, EM_TRANSICAO, CHEFE |
| `/insights` | Projetos sugeridos | reaproveitar | Projetos pessoais de portfólio (RF50 saída 2). | idem |
| `/insights` | **Caminhos** (nova) | novo | Alternativas de ocupação (CBO/ESCO) com requisitos, lacunas e próximos passos; comparar e descartar. | idem |
| `/settings` | **Carreira** (nova) | novo | Revisão de a1–d4, status "Em busca" (f1, f2, d3), lista "não quero". | EMPREGADO, EM_TRANSICAO |
| `/settings` | Trabalho → renomear **IA e dados** | reaproveitar | e1–e6 em linguagem simples; "Mais opções" guarda os cinco modos técnicos. | todos logados |
| `/settings` | Privacidade | reaproveitar (esqueleto) | f1–f7 com "quem verá? o que muda? vale para itens antigos?" em cada opção. | todos logados |
| `/mural` | **Minha trilha** (nova) | novo | Feed só das tarefas, evidências e conquistas da própria pessoa e do grupo de apoio (f6). | EM_TRANSICAO, EMPREGADO |
| `/letters`, `/drawings` | Painel lateral **Guia** | novo | Dentro do editor: a tarefa aberta, os critérios com pré-checagem da IA, "concluir e gerar evidência". | idem |
| Barra superior | Banner de guia | novo | "Seu guia está 3/8 — continuar" até concluir o primeiro acesso; some ao concluir ou ao dispensar 2×. | EM_TRANSICAO |

Menu lateral (grupo "Meu trabalho"): item **Guia de carreira** → `/profile?tab=carreira`, visível para EMPREGADO e EM_TRANSICAO, oculto para EMPRESA.

## 7. Catálogo de tarefas-guia no Letters e no Drawings

Formato: competência · critério de aceite verificável · evidência · tempo · pergunta da IA que a desencadeia. Regras comuns: a IA pré-checa só critérios objetivos; a pessoa declara autoria e ausência de dados confidenciais; selo exige validação humana (RF75.CA07); publicar é opt-in (f5).

### 7.1 Letters

| # | Tarefa | Competência | Critério de aceite | Evidência | Tempo | Pergunta-gatilho |
|---|---|---|---|---|---|---|
| L1 | Currículo direcionado | Síntese e comunicação escrita | 1 página; 3 conquistas com número; palavras-chave do cargo-alvo presentes (checagem automática) | PDF versionado | 45 min | "Qual cargo você quer mirar primeiro?" (b1) |
| L2 | Carta de apresentação para a oportunidade X | Persuasão e pesquisa | ≤ 300 palavras; cita 2 requisitos e liga cada um a uma evidência do perfil | Carta com links | 30 min | "Quer que eu destaque o que essa oportunidade pede?" |
| L3 | Estudo de caso STAR | Resolução de problemas | Situação, tarefa, ação, resultado explícitos; resultado mensurável; sem dado confidencial (declarado) | Documento | 60 min | "Conte um problema que você resolveu no último trabalho." (c3) |
| L4 | Relatório técnico curto | Análise técnica | Objetivo, método, resultados, limitações, referências; ≤ 4 páginas | Relatório | 2 h | "Há um projeto técnico seu que mereça registro?" |
| L5 | Post no mural sobre um aprendizado | Comunicação pública | 150–250 palavras; 1 lição concreta; créditos | Post | 20 min | "Quer compartilhar algo que aprendeu esta semana?" |
| L6 | Resumo de perfil (bio) | Posicionamento | ≤ 600 caracteres; área-alvo, 3 competências, 1 prova com link | Bio no perfil | 15 min | "Como você se apresentaria em 3 frases?" |
| L7 | Procedimento operacional (POP) | Padronização | Passos numerados, responsáveis, critério de conclusão por passo | Modelo | 60 min | "Que processo você domina e poderia ensinar?" |
| L8 | Resposta a um briefing simulado | Escopo e atendimento | Escopo, prazos, premissas, o que fica fora | Proposta | 45 min | "Quer treinar com um briefing da sua área?" |
| L9 | Plano 30-60-90 para o cargo-alvo | Planejamento | 3 metas mensuráveis por fase | Plano | 45 min | "Já pensou no que faria nos primeiros 90 dias?" |
| L10 | Revisão crítica de uma peça remixada | Análise e feedback | Usa a rubrica; 2 pontos fortes, 2 melhorias; credita o autor | Comentário estruturado | 20 min | "Quer dar feedback numa peça da sua área?" |

### 7.2 Drawings

| # | Tarefa | Competência | Critério de aceite | Evidência | Tempo | Pergunta-gatilho |
|---|---|---|---|---|---|---|
| D1 | Planta 2D de um ambiente | Desenho técnico | Escala, cotas que fecham, legenda, carimbo | Prancha PDF/SVG | 2 h | "Você trabalha com espaços ou layout?" |
| D2 | Prancha de portfólio A3 com 3 trabalhos | Curadoria visual | Grade consistente, legendas, créditos | Prancha publicada | 90 min | "Quais 3 trabalhos melhor representam você?" |
| D3 | Modelo 3D de produto com render realista | Modelagem 3D | Dimensões reais, materiais aplicados, 3 vistas renderizadas (modo Fotorrealista) | Modelo GLB + renders PNG | 3 h | "Que peça mostraria sua competência em 3D?" |
| D4 | Diagrama de processo (BPMN simplificado) | Análise de processos | Início e fim, raias por responsável, nenhuma tarefa órfã | Diagrama vetorial | 45 min | "Que fluxo de trabalho você melhorou?" |
| D5 | Redesenho "antes e depois" | Melhoria contínua | Duas versões lado a lado; 3 mudanças anotadas com justificativa | Prancha comparativa | 60 min | "Quer mostrar uma melhoria que propôs?" |
| D6 | Detalhe construtivo ou de montagem | Conhecimento técnico | Escala de detalhe, materiais especificados, cotas | Prancha de detalhe | 90 min | "Há uma solução técnica sua que mereça detalhe?" |
| D7 | Infográfico de resultados | Visualização de dados | Fonte citada, eixos rotulados, 1 mensagem principal | Imagem + PDF | 60 min | "Tem números de um projeto que possa mostrar?" |
| D8 | Vista explodida 3D de um conjunto | Montagem e manufatura | ≥ 5 componentes, numeração, lista de peças | Modelo + prancha | 2 h | "Você trabalha com montagem ou manutenção?" |
| D9 | Wireframe de uma tela | UX/UI | 3 estados (vazio, erro, sucesso); anotações de interação | Prancha | 90 min | "Quer demonstrar raciocínio de interface?" |
| D10 | Remix com crédito de uma peça pública | Colaboração e iteração | Crédito automático, 2 melhorias declaradas, licença respeitada | Remix vinculado | 60 min | "Encontrei uma peça na sua área. Quer evoluí-la?" |

### 7.3 Progressão

Nível 1 (semana 1): L6, L1, D2. Nível 2: L3, L2, D1/D4/D9 conforme a área. Nível 3: L4, D3/D6/D8. Transversal: L5, L10, D10 (rede). O plano respeita d1 (horas) e d4 (celular não recebe D3/D8).

## 8. Mensagens de aviso e nudges

Regras: linguagem humana, perto do ponto de ação, sem culpa, sem "confirmshaming" (DSA art. 25; FTC 2022); 1 nudge proativo por dia no máximo; nada fora do horário de d2; pausa de 7 dias após 2 dispensas; Manual e Sob solicitação não geram nudges.

| Momento | Mensagem (pt-BR) | Tipo |
|---|---|---|
| Primeira interação com o guia | "Sou uma IA. Minhas sugestões ajudam você a se preparar, mas não garantem entrevista, emprego nem salário." | Fixa (AI Act art. 50) |
| Antes de cada pergunta do onboarding | "Pergunto isso para [ganho concreto]. Você pode pular." | Inline |
| Salário (b7) | "Fica só com você e serve para filtrar oportunidades. Nunca aparece no seu perfil." | Inline |
| Visibilidade (f1) | "Com 'Só eu', ninguém vê que você está em busca. Com 'Recrutadores verificados', só contas de empresa validadas veem. Não conseguimos garantir sigilo total do seu empregador atual." | Inline |
| Sugestão de tarefa | "Por que esta tarefa: comprova [competência], que [cargo-alvo] pede. Evidência: [tipo]. Leva cerca de [tempo]." | Card |
| Dispensa de sugestão | "Entendi. Quer que eu pare de sugerir [tipo]?" (sim / só por agora) | Inline, sem culpa |
| Caminhos de carreira | "Estas são alternativas para explorar, não previsões. Dados de mercado: [fonte, data, região] ou 'sem fonte atual; estimativa'." | Fixa (RF50.CA06–07) |
| Provedor externo (e3) | "Para esta análise enviaríamos: perfil, currículo. Não enviamos: mensagens, itens sigilosos. Custo: [x]. Continuar?" | Diálogo (RF50.CA10) |
| Rótulo inferido pela IA no perfil | "Inferido a partir de [campos]. Como foi calculado · Contestar" | Inline (LGPD art. 20) |
| Conclusão de tarefa | "Critérios objetivos: 3 de 4 atendidos (pré-checagem automática). O selo depende de uma revisão humana." | Card |
| Publicação | "Quem verá: [público]. Comentários: [on/off]. Remix com crédito: [on/off]. Rascunhos salvos não são publicados." | Diálogo |
| Semana sem atividade | "Sem pressão. Quando quiser retomar, a tarefa curta de 15 min está aqui." (1×, sem contagem perdida) | Nudge |
| Falha da IA / sem saldo | "A análise não terminou. Seu perfil está salvo. Tentar de novo quando quiser." | Estado (RF50.CA15) |

Microcopy a retirar do estado atual: "ponto de restauração", "limite de passos/tokens", "ferramentas determinísticas do editor" (ficam em "Mais opções"); "Pessoa que trabalha em uma empresa ou órgão" como única opção de pessoa física.

## 9. Fontes

Relatórios de pesquisa integrais (com URLs e datas de acesso, todos em 31/10/2026) em `fontes/`:
- `perguntas-e-frameworks.md`: LinkedIn, Indeed, Gupy, Catho, Vagas.com, InfoJobs, SINE/Emprega Brasil, O*NET Interest Profiler, ESCO v1.2, CBO, Schlossberg 4S, CAAS, perfilamento progressivo, LGPD, Lei 9.029/1995, CLT 373-A.
- `tarefas-evidencia-e-ia.md`: Frontend Mentor, Exercism, Kaggle, GitHub, Coursera, Codecademy, HackerRank, Duolingo, Behance/Dribbble, Autodesk/Credly, Sketchfab; evidence-centered design; Open Badges 3.0; Amershi et al. 2019; Google PAIR; AI Act (Anexo III, art. 5, art. 50, Omnibus 2026/1744); LGPD art. 20; PL 2338/2023; ISO/IEC 42001; NN/g; FTC 2022; DSA art. 25.

Itens marcados "não conferido" nos relatórios: texto literal da LGPD (Planalto bloqueou), art. 14 do PL 2338, Regulamento 2026/1744 no Jornal Oficial, campos de Evidence no OB 3.0, fluxo de primeiro cadastro do LinkedIn, limiares do Kaggle.
