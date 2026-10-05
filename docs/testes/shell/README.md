# Capturas do shell (etapa (b))

Geradas por `node scripts/shell/capturas.mjs` (Playwright + Chromium em `/opt/pw-browsers/chromium`; app em `next build && next start`), perfil de visualização do lab (D-32) e tema gravados antes da primeira pintura. Para uma aba nova, acrescente uma entrada em `CAPTURAS` e rode o script de novo.

| Captura | Rota | Perfil | Tema | Viewport | O que mostra |
|---|---|---|---|---|---|
| [`01-shell-mural-desktop.png`](01-shell-mural-desktop.png) | `/mural` | EMPREGADO | claro | 1440×900 | Shell completo: sidebar expandida, top bar e conteúdo do Mural |
| [`02-shell-mobile.png`](02-shell-mobile.png) | `/mural` | EMPREGADO | claro | 390×844 | Celular: barra inferior (Mural · Buscar · + · Acervo · Perfil) |
| [`03-sidebar-rail.png`](03-sidebar-rail.png) | `/mural` | EMPREGADO | claro | 1440×900 | Sidebar recolhida (rail 72 px com tooltips) |
| [`04-criar-sheet.png`](04-criar-sheet.png) | `/mural` | EMPREGADO | claro | 390×844 | Folha “+ Criar” aberta (Tarefa · Projeto · Plano · Sessão DECIA) |
| [`05-login.png`](05-login.png) | `/login` | VISITANTE | claro | 1440×900 | RF2 — entrar (BFF /bff/auth/login) |
| [`06-cadastro.png`](06-cadastro.png) | `/register` | VISITANTE | claro | 1440×900 | RF1 — cadastro com tipo de perfil, campos e aceite dos termos |
| [`07-rf23-preferencias.png`](07-rf23-preferencias.png) | `/settings?tab=aparencia` | EMPREGADO | claro | 1440×900 | RF3/RF23 — tema, idioma, densidade, fonte, movimento, skin da Mesa e as 6 artes de fundo |
| [`08-notificacoes-popover.png`](08-notificacoes-popover.png) | `/mural` | EMPREGADO | claro | 1440×900 | Sino aberto com os itens mock (D-33) |
| [`09-notificacoes-pagina.png`](09-notificacoes-pagina.png) | `/notifications` | EMPREGADO | claro | 1440×900 | Lista completa de notificações com simulação de estados |
| [`10-central-perfil.png`](10-central-perfil.png) | `/mural` | EMPREGADO | claro | 1440×900 | Central de Perfil aberta (avatar, perfil, empresa/departamento, links, seletor do lab) |
| [`11-tema-escuro.png`](11-tema-escuro.png) | `/mural` | EMPREGADO | escuro | 1440×900 | Shell no tema escuro |
| [`12-tema-terminal.png`](12-tema-terminal.png) | `/mural` | EMPREGADO | terminal | 1440×900 | Shell no tema terminal (corpo em mono) |
| [`13-lab-design-system.png`](13-lab-design-system.png) | `/lab/design-system` | EMPREGADO | claro | 1440×900 | /lab/design-system — tokens, glifos e componentes reais |

Capturas do smoke E2E (`npx playwright test`, `e2e/shell.spec.ts`) ficam em [`e2e/`](e2e/).
