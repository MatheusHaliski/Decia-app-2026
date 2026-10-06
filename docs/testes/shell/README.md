# Capturas do shell (etapa (b))

Geradas por `node scripts/shell/capturas.mjs` (Playwright + Chromium em `/opt/pw-browsers/chromium`; app em `next build && next start`), perfil de visualização do lab (D-35) e tema gravados antes da primeira pintura; perfis logados recebem a sessão simulada (cookies `ws_rt_h`/`ws_rt` fictícios, Bloco 4) e as capturas da aba Sessões usam a API simulada do próprio script. Para uma aba nova, acrescente uma entrada em `CAPTURAS` e rode o script de novo.

| Captura | Rota | Perfil | Tema | Viewport | O que mostra |
|---|---|---|---|---|---|
| [`01-shell-mural-desktop.png`](01-shell-mural-desktop.png) | `/mural` | EMPREGADO | claro | 1440×900 | Shell completo: sidebar expandida, top bar e conteúdo do Mural |
| [`02-shell-mobile.png`](02-shell-mobile.png) | `/mural` | EMPREGADO | claro | 390×844 | Celular: barra inferior (Mural · Buscar · + · Acervo · Perfil) |
| [`03-sidebar-rail.png`](03-sidebar-rail.png) | `/mural` | EMPREGADO | claro | 1440×900 | Sidebar recolhida (rail 72 px com tooltips) |
| [`04-criar-sheet.png`](04-criar-sheet.png) | `/mural` | EMPREGADO | claro | 390×844 | Folha “+ Criar” aberta (Tarefa · Projeto · Plano · Sessão DECIA) |
| [`05-login.png`](05-login.png) | `/login` | VISITANTE | claro | 1440×900 | RF2 — entrar (BFF /bff/auth/login) |
| [`06-cadastro.png`](06-cadastro.png) | `/register` | VISITANTE | claro | 1440×900 | RF1 — cadastro com tipo de perfil, campos e aceite dos termos |
| [`07-rf23-preferencias.png`](07-rf23-preferencias.png) | `/settings?tab=aparencia` | EMPREGADO | claro | 1440×900 | RF3/RF23 — tema, idioma, densidade, fonte, movimento, skin da Mesa e as 6 artes de fundo |
| [`08-notificacoes-popover.png`](08-notificacoes-popover.png) | `/mural` | EMPREGADO | claro | 1440×900 | Sino aberto com os itens mock (D-36) |
| [`09-notificacoes-pagina.png`](09-notificacoes-pagina.png) | `/notifications` | EMPREGADO | claro | 1440×900 | Lista completa de notificações com simulação de estados |
| [`10-central-perfil.png`](10-central-perfil.png) | `/mural` | EMPREGADO | claro | 1440×900 | Central de Perfil aberta (avatar, perfil, empresa/departamento, links, seletor do lab) |
| [`11-tema-escuro.png`](11-tema-escuro.png) | `/mural` | EMPREGADO | escuro | 1440×900 | Shell no tema escuro |
| [`12-tema-terminal.png`](12-tema-terminal.png) | `/mural` | EMPREGADO | terminal | 1440×900 | Shell no tema terminal (corpo em mono) |
| [`13-lab-design-system.png`](13-lab-design-system.png) | `/lab/design-system` | EMPREGADO | claro | 1440×900 | /lab/design-system — tokens, glifos e componentes reais |
| [`14-login-next-protegida.png`](14-login-next-protegida.png) | `/settings?tab=sessoes` | VISITANTE | claro | 1440×900 | Bloco 4 — rota protegida sem sessão: o middleware leva a /login?next=%2Fsettings%3Ftab%3Dsessoes (next saneado, sem open redirect) |
| [`15-sessoes-lista.png`](15-sessoes-lista.png) | `/settings?tab=sessoes` | EMPREGADO | claro | 1440×900 | RF2.CA05 — Configurações › Sessões: dispositivos com sessão viva, a atual marcada, encerrar um ou todos os outros (API simulada) |
| [`16-sessoes-confirmar.png`](16-sessoes-confirmar.png) | `/settings?tab=sessoes` | EMPREGADO | claro | 1440×900 | RF2.CA05 — confirmação antes de encerrar a sessão do celular (revoga a família do refresh token) |
| [`17-saiu-em-todas-as-abas.png`](17-saiu-em-todas-as-abas.png) | `/login?next=%2Fsettings%3Ftab%3Dsessoes&reason=signed-out` | VISITANTE | claro | 1440×900 | Bloco 4 — logout em uma aba: as outras caem aqui com o aviso “saiu em todas as abas” e o caminho de volta |
| [`18-sessoes-mobile.png`](18-sessoes-mobile.png) | `/settings?tab=sessoes` | EMPREGADO | claro | 390×844 | Celular: aba Sessões sem rolagem horizontal |
| [`20-decia-precisa-de-atencao.png`](20-decia-precisa-de-atencao.png) | `/decia` | EMPREGADO | claro | 1440×900 | DECIA › Precisa de atenção: card HERO (aguardando sua decisão) e grupos da caixa de entrada |
| [`21-decia-decisoes-grade.png`](21-decia-decisoes-grade.png) | `/decia?tab=decisoes` | EMPREGADO | claro | 1440×900 | DECIA › Decisões em grade (cards STANDARD) com filtros |
| [`22-decia-decisoes-lista.png`](22-decia-decisoes-lista.png) | `/decia?tab=decisoes` | EMPREGADO | claro | 1440×900 | DECIA › Decisões em lista (cards COMPACT) |
| [`23-decia-card-detail-frente.png`](23-decia-card-detail-frente.png) | `/decia/decisoes/d-arquitetura` | EMPREGADO | claro | 1440×900 | Workspace › Visão geral: card DETAIL (frente) da decisão de arquitetura, prontidão e saúde |
| [`24-decia-card-detail-verso.png`](24-decia-card-detail-verso.png) | `/decia/decisoes/d-arquitetura` | EMPREGADO | claro | 1440×900 | Card DETAIL virado pelo teclado (F): verso “Por que esta opção?” com evidência, premissa, trade-off, risco, rejeitada e sensibilidade |
| [`25-decia-workspace-comparar.png`](25-decia-workspace-comparar.png) | `/decia/decisoes/d-arquitetura?secao=comparar` | EMPREGADO | claro | 1440×900 | Workspace › Comparar: matriz ponderada (A 3,8 · B 3,75 · C 3,55), contribuições, divergência e sensibilidade |
| [`26-decia-workspace-decisao-guarda.png`](26-decia-workspace-decisao-guarda.png) | `/decia/decisoes/d-arquitetura?secao=decisao` | EMPREGADO | claro | 1440×900 | Workspace › Decisão: diálogo Decidir com a guarda pré-decisão (avisos exigem confirmação) |
| [`27-decia-workspace-decisao-snapshot.png`](27-decia-workspace-decisao-snapshot.png) | `/decia/decisoes/d-fornecedor-suporte?secao=decisao` | EMPREGADO | claro | 1440×900 | Workspace › Decisão (fornecedor, DECIDIDA): “No momento da decisão” com SHA-256, separado do estado atual |
| [`28-decia-workspace-execucao-revisao.png`](28-decia-workspace-execucao-revisao.png) | `/decia/decisoes/d-lancamento?secao=execucao` | EMPREGADO | claro | 1440×900 | Workspace › Execução e revisão (lançamento, REVISADA): resultado PARCIAL, processo ADEQUADO, previsões e Brier |
| [`29-decia-decisoes-mobile.png`](29-decia-decisoes-mobile.png) | `/decia?tab=decisoes` | EMPREGADO | claro | 390×844 | Celular: lista COMPACT de decisões (tocar abre o workspace) |
| [`30-decia-decisao-vazia-ux.png`](30-decia-decisao-vazia-ux.png) | `/decia/decisoes/d-navegacao?secao=comparar` | EMPREGADO | claro | 1440×900 | Decisão de UX em ENQUADRAMENTO: estados vazios com a próxima ação (alternativas, critérios) |
| [`40-perfil-proprio.png`](40-perfil-proprio.png) | `/profile` | EMPREGADO | claro | 1440×900 | RF6 — meu perfil: cabeçalho com contadores reais, Delegadas a mim, notificações e Acervo Digital em grade |
| [`41-perfil-terceiros.png`](41-perfil-terceiros.png) | `/u/ana.exemplo` | EMPREGADO | claro | 1440×900 | RF16 — perfil de terceiros: sub-abas 1–5, Seguir, Hype público, itens filtrados pela visibilidade e barra social inline |
| [`42-perfil-chefe.png`](42-perfil-chefe.png) | `/departments/cpoe?tab=projetos` | EMPREGADO | claro | 1440×900 | RF14 — página do departamento (perfil do chefe): chefe com link ao perfil pessoal, contadores, Seguir e projetos publicados |
| [`43-perfil-empresa.png`](43-perfil-empresa.png) | `/companies/secretaria-exemplo` | EMPREGADO | claro | 1440×900 | RF15 — página da empresa: contadores institucionais (sem cargo/Hype/DP), Seguir e projetos publicados |
| [`44-tarefa-expandida-social.png`](44-tarefa-expandida-social.png) | `/tasks/t-ana-etp` | EMPREGADO | claro | 1440×900 | RF19/RF41 — esquema de tarefa no layout ampliado com a barra social completa (curtir, reagir, comentar, salvar, compartilhar, remixar, delegar, retornar) |
| [`45-comentarios.png`](45-comentarios.png) | `/tasks/t-ana-etp` | EMPREGADO | claro | 1440×900 | RF26.CA03 — comentários com resposta de 1 nível, @menção, editar/excluir os próprios e contador de caracteres |
| [`46-compartilhar.png`](46-compartilhar.png) | `/tasks/t-ana-etp` | EMPREGADO | claro | 1440×900 | RF26.CA05 — folha Compartilhar: Mural, sessão DECIA e link externo com validade (canais do ShareChannel) |
| [`47-remixar.png`](47-remixar.png) | `/u/ana.exemplo` | EMPREGADO | claro | 1440×900 | RF26.CA06 — Remixar: original, crédito e o que será copiado × o que fica no original |
| [`48-mural.png`](48-mural.png) | `/mural` | EMPREGADO | claro | 1440×900 | RF27 — Mural da empresa: compartilhamentos e projetos publicados com a barra social inline (só o que o viewer pode ver) |
| [`49-perfil-mobile.png`](49-perfil-mobile.png) | `/u/ana.exemplo` | EMPREGADO | claro | 390×844 | Celular: perfil de terceiros sem rolagem horizontal (cards em coluna, barra social compacta) |
| [`50-delegar-dialogo.png`](50-delegar-dialogo.png) | `/tasks/t-pessoa-cronograma` | EMPREGADO | claro | 1440×900 | RF18.CA03 — Delegar: busca de pessoas da empresa (motivo para quem não pode receber), mensagem e prazo |
| [`51-delegadas-a-mim.png`](51-delegadas-a-mim.png) | `/profile` | EMPREGADO | claro | 1440×900 | RF18.CA04/CA05 — Delegadas a mim: Aceitar/Recusar a proposta, Devolver a aceita (motivo ≥ 20) e Delegadas por mim |
| [`60-rf47-encontrar.png`](60-rf47-encontrar.png) | `/find` | EMPREGADO | claro | 1440×900 | RF47 — Encontrar (esqueleto): sub-abas Encontrar (A) · Ler com mapa (B) · Extrair (C) · Lista de termos, botão Testar esta contratação (CA14) e os CA01–CA14 do card |
| [`61-rf48-agentes.png`](61-rf48-agentes.png) | `/agents?tab=encontrar-no-dossie` | EMPREGADO | claro | 1440×900 | RF48 — Agentes — Copilot de testes (esqueleto): modos Mesa de testes · Assistente · Carteira · Matriz (CA18), Abrir no Encontrar (CA19), fases + ferramentas do dossiê em abas (CA17) e os CA01–CA19 do card |
| [`62-rf47-extrair.png`](62-rf47-extrair.png) | `/find?tab=extrair` | EMPREGADO | claro | 1440×900 | RF47.CA12 — sub-aba Extrair termos e entidades = Opção C (Termos e frases-chave · Valores · Datas e prazos · Artigos de lei · Órgãos, empresas e processos) |
| [`63-rf48-extrair-do-dossie.png`](63-rf48-extrair-do-dossie.png) | `/agents?tab=extrair-do-dossie` | EMPREGADO | claro | 1440×900 | RF48.CA14 — Extrair do dossiê: a Opção C do RF47 com escopo do dossiê, entrada dos agentes determinísticos |

Capturas do smoke E2E (`npx playwright test`, `e2e/shell.spec.ts`) ficam em [`e2e/`](e2e/).
