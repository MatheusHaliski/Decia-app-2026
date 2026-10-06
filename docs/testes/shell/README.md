# Capturas do shell (etapa (b))

Geradas por `node scripts/shell/capturas.mjs` (Playwright + Chromium em `/opt/pw-browsers/chromium`; app em `next build && next start`), perfil de visualização do lab (D-35) e tema gravados antes da primeira pintura. Para uma aba nova, acrescente uma entrada em `CAPTURAS` e rode o script de novo.

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

Capturas do smoke E2E (`npx playwright test`, `e2e/shell.spec.ts`) ficam em [`e2e/`](e2e/).
