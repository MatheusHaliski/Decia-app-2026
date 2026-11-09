# Pesquisa: tarefas que viram evidência, interação humano–IA e regulação (fontes)

Pesquisa web feita em 31/10/2026 para `../GUIA_DE_CARREIRA.md`. "Não conferido" indica que a fonte primária não foi encontrada.

## 1. Plataformas que transformam tarefas em portfólio

| Plataforma | Mecânica | Como vira evidência |
|---|---|---|
| **Frontend Mentor** | Desafios "design → código" com arquivos de design (Figma no plano Pro). | Solução publicada vira peça de portfólio com revisão da comunidade; no plano gratuito só se vê as soluções alheias depois de enviar a própria. Feedback por IA como recurso pago (não conferido). |
| **Exercism** | Trilhas por linguagem com mentoria; analyzers automáticos; representers normalizam soluções para que o feedback de um supermentor sirva a várias. | Solução iterada e comentada fica pública. Na trilha Clojure, 7 abordagens cobriram ~75% das submissões. Feedback automático só entra após revisão humana. |
| **Kaggle** | Cinco níveis (Novice → Grandmaster) em quatro categorias. | Medalhas por resultado e por votos; o perfil mostra o nível. Limiares exatos: não conferidos. |
| **GitHub** | README de perfil (repositório com o nome do usuário) e gráfico de contribuições. | O artefato é o código, com histórico de commits auditável. |
| **Coursera Guided Projects** | < 2 h, tela dividida com desktop na nuvem, só em computador. | "Shareable certificate" varia por projeto. |
| **Codecademy Career Paths** | Projeto de portfólio ao fim de cada seção, somando as anteriores. | Projetos "prontos para recrutador" e certificado do path. |
| **HackerRank Skills Certification** | Testes por habilidade (Basic/Intermediate). | Certificado "Verified", link compartilhável e botão para o LinkedIn. |
| **Duolingo** | Missões diárias, Friends Quests semanais, Streak Freeze. | Sem evidência profissional; referência de hábito. Críticas: lição mais curta só para salvar a sequência, ansiedade. |
| **Behance / Dribbble** | Behance "Daily Creative Challenge" com arquivo inicial; Dribbble "Weekly Warm-up" com prompts. | Peças com tag no feed; sem verificação de autoria (Dribbble conferido parcialmente). |
| **Autodesk** | Certified User/Professional com prova supervisionada e verificação de identidade; alguns exigem 400–1.200 h de uso. | Badge no Credly com URL pública; alguns expiram em ~3 anos. |
| **Sketchfab** | Visualizador 3D e embeds continuam; loja migrou para o Fab (Epic) em 2025. | Modelo 3D incorporável como peça de portfólio. |

Padrão: enunciado padronizado + artefato público e versionado + avaliação externa (prova, mentor ou pares) + URL verificável.

## 2. Como desenhar tarefas que comprovem competência

- **Evidence-centered design** (Mislevy, Steinberg e Almond, ETS): competency model (o que afirmar), evidence model (observações e regras de pontuação), task model (situação que provoca as observações). Regra para o WS: nenhuma tarefa sugerida sem dizer antes qual competência comprova e qual evidência produz.
- **Open Badges 3.0** (1EdTech, versão final 1.4.5 de 29/06/2026, alinhada a W3C Verifiable Credentials 2.0): Achievement (Criteria, Alignment), Evidence ("por exemplo, URL de um artefato produzido pelo aprendiz"), Result/ResultDescription com rubricas approaches/meets/exceeds. Campos exatos de Evidence: não conferidos. Sugestão: um AchievementCredential por tarefa validada.
- **Rubricas e critérios**: 3–5 critérios binários ou observáveis; a IA pré-checa os objetivos; o selo só sai com revisão humana (pares, mentor ou autodeclaração de autoria), como no Exercism.
- **Progressão**: níveis explícitos (HackerRank), projetos cumulativos (Codecademy), "remix com crédito" como degrau entre copiar e criar.
- **Feedback de pares**: acesso às soluções alheias só depois de enviar a própria (Frontend Mentor); comentário guiado pela rubrica.

## 3. Interação humano–IA e regulação

**Microsoft, Amershi et al., CHI 2019** (18 diretrizes). Mais pertinentes: G1/G2 (o que o sistema faz e com que qualidade); G3/G4 (momento certo, informação relevante ao contexto); G6 (mitigar vieses); G8/G9 (dispensar e corrigir); G10 (reduzir escopo na dúvida, perguntar em vez de adivinhar); G11 (explicar por quê); G15–G18 (feedback granular, consequências, controles globais, aviso de mudanças). G1, G2, G8 e G10 conferidos no HAX Toolkit; G14–G18 de resumo da Microsoft (post original no Medium retornou 403); demais conforme o paper (DOI 10.1145/3290605.3300233).

**Google PAIR Guidebook** (2019; atualizado 2021 e 2023 para IA generativa): "Set the right expectations", "Explain for understanding".

**EU AI Act**: Anexo III 4(a) recrutamento e seleção = alto risco; 4(b) decisões sobre a relação de trabalho. Rascunho de diretrizes da Comissão (2026): continua alto risco se influenciar materialmente a decisão mesmo com humano final. Regulamento (UE) 2026/1744 (Digital Omnibus, JO 24/07/2026) adiou Anexo III para 02/12/2027 (fonte secundária; JO não conferido). Art. 50: informar que é IA, no máximo na primeira interação, desde 02/08/2026 (fontes divergem). Art. 5: proíbe reconhecimento de emoções no trabalho e na educação desde fev/2025. Leitura: coach que serve à própria pessoa fica fora do 4(a); vira alto risco se oferecer ranking, triagem ou score a empregadores.

**LGPD art. 20**: revisão de decisões unicamente automatizadas, inclusive de "perfil… profissional"; §1º informação clara sobre critérios. Veto de 2019 retirou a exigência de revisão humana. Regulamentação da ANPD: não conferido. Texto primário bloqueado; conteúdo por fontes secundárias.

**PL 2338/2023**: aprovado no Senado em 10/12/2024; na Câmara desde março de 2025; em outubro de 2026 sem parecer do relator. Art. 14 do texto do Senado incluiria recrutamento, triagem, avaliação de desempenho e desligamento como alto risco (redação literal não conferida).

**ISO/IEC 42001:2023**: sistema de gestão de IA; útil como governança, não obrigatória.

**Implicações para o Copilot do WS**: perguntar em vez de inferir; explicar cada pergunta; nunca dados sensíveis nem análise de emoção; "por que esta tarefa" com "isso não me serve"; aviso fixo "Sou uma IA. Sugestões não garantem entrevista, emprego nem salário"; sem faixa salarial como promessa; sem score de empregabilidade (progresso por evidência); três consentimentos separados (usar conteúdo para sugerir, publicar evidência, permitir remix); em nenhum modo a IA publica, segue ou se candidata sem confirmação; todo rótulo inferido tem "como foi calculado" e "contestar"; selos dependem de validação humana; Manual e Sob solicitação sem nudges; Agente para antes de publicar, enviar ou compartilhar.

## 4. Avisos, nudges e gamificação ética

- NN/g (mensagens de erro): linguagem humana, problema preciso, conselho construtivo, sem culpa, perto do ponto de ação.
- Confirmshaming é dark pattern (artigo da NN/g e autoria não conferidos; URL deu 404). FTC 2022 "Bringing Dark Patterns to Light".
- DSA art. 25(1): interfaces não podem enganar, manipular ou distorcer decisões livres e informadas.
- Frequência: Smashing Magazine (07/2025) recomenda níveis "calmo/regular/intenso"; revisão sistemática de 17 estudos: mais notificações = mais engajamento, mas percepção de disrupção. Sugestão: 1 nudge proativo/dia, nada fora do horário definido, pausa após 2 dispensas.
- Just-in-time: sugerir no contexto do editor em vez de push genérico.
- Gamificação ética: progresso por competências e evidências; sequência, se houver, semanal e com pausa sem custo; sem rankings entre pessoas, contagem regressiva falsa ou perda de progresso.

## 5. Tarefas-exemplo

Integradas à §7 de `../GUIA_DE_CARREIRA.md` (L1–L10, D1–D10).

## Fontes (acessadas em 31/10/2026)

- AI Act Service Desk, Anexo III: https://ai-act-service-desk.ec.europa.eu/en/node/464
- DLA Piper, diretrizes alto risco no emprego (2026): https://knowledge.dlapiper.com/dlapiperknowledge/globalemploymentlatestdevelopments/2026/eu-commission-publishes-draft-guidelines-on-high-risk-ai-in-employment
- NatLawReview, Digital Omnibus: https://natlawreview.com/article/eu-digital-omnibus-ai-enters-force ; usd.de: https://www.usd.de/en/?p=68017
- Art. 50 / Art. 5: https://www.lumenova.ai/blog/eu-ai-act-article-50-article-5/ ; https://artificialintelligenceact.eu/transparency-rules-article-50/
- DSA Art. 25: https://www.eu-digital-services-act.com/Digital_Services_Act_Article_25.html
- FTC 2022: https://www.ftc.gov/system/files/ftc_gov/pdf/P214800%20Dark%20Patterns%20Report%209.14.2022%20-%20FINAL.pdf
- LGPD art. 20 (secundárias): https://confidata.com.br/blog/decisoes-automatizadas-lgpd-direitos-obrigacoes ; https://serpro.gov.br/lgpd/noticias/2019/congresso-aprecia-veto-ao-artigo-20-da-lgpd
- PL 2338/2023: https://www25.senado.leg.br/web/atividade/materias/-/materia/157233 ; https://www.globalsuitesolutions.com/pt/?p=117764 ; https://teletime.com.br/16/12/2025/pl-de-inteligencia-artificial-fica-para-fevereiro-de-2026/
- Microsoft Guidelines / HAX: https://www.microsoft.com/en-us/research/project/guidelines-for-human-ai-interaction/ ; https://www.microsoft.com/en-us/haxtoolkit/guideline/scope-services-when-in-doubt/
- Google PAIR: https://pair.withgoogle.com/guidebook ; https://medium.com/people-ai-research/updating-the-people-ai-guidebook-in-the-age-of-generative-ai-cace6c846db4
- ISO/IEC 42001: https://evs.ee/en/iso-iec-42001-2023
- Open Badges 3.0: https://www.imsglobal.org/spec/ob/v3p0
- ECD: https://myweb.fsu.edu/vshute/ECD.pdf ; https://padi.sri.com/downloads/TR9_ECD.pdf
- NN/g mensagens de erro: https://www.nngroup.com/articles/error-message-guidelines/
- Confirmshaming (secundária): https://builtin.com/design-ux/confirmshaming
- Smashing, notificações (07/2025): https://smashingmagazine.com/2025/07/design-guidelines-better-notifications-ux/
- Revisão sobre push: https://online-journals.org/index.php/i-jim/article/view/14563
- Frontend Mentor: https://www.frontendmentor.io/guides/welcome-to-frontend-mentor
- Exercism: https://exercism.org/docs/building/product/representers ; https://exercism.org/blog/introducing-representers
- Kaggle: https://en.wikipedia.org/wiki/Kaggle
- GitHub README de perfil: https://docs.github.com/en/account-and-profile/how-tos/profile-customization/managing-your-profile-readme
- Coursera Guided Project (exemplo): https://www.coursera.org/learn/interactive-dashboards-streamlit-python
- Codecademy: https://codecademy.com/resources/blog/portfolio-projects-in-career-paths/
- HackerRank: https://www.hackerrank.com/skills-verification ; https://hackerrank-community-knowledge-base.help.usepylon.com/articles/2077861863-download-certificate
- Duolingo: https://blog.duolingo.com/how-duolingo-streak-builds-habit ; https://uxdesign.cc/the-good-the-bad-and-the-ugly-of-duolingo-gamification-3a12f0e80dc7
- Behance Challenge: https://www.behance.net/challenge/photoshop ; Dribbble Warm-up: https://dribbble.com/tags/dribbble-warm-up
- Autodesk / Credly: https://www.credly.com/org/autodesk/badge/revit-architecture-certified-professional ; https://www.autodesk.com/certification/all-certifications/design-manufacturing-professional
- Sketchfab / Fab: https://sketchfab.com/blogs/community/sketchfab-update-what-you-need-to-know-now-that-fabs-live/ ; https://dev.epicgames.com/documentation/fab/migrating-assets-to-fab

Não conferido: artigo da NN/g sobre confirmshaming; art. 14 do PL 2338 literal; Regulamento 2026/1744 no JO; campos de Evidence/Criteria no OB 3.0; limiares do Kaggle; ArchDaily (não pesquisado).
