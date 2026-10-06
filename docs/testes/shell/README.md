# Capturas do shell (etapa (b))

Geradas por `node scripts/shell/capturas.mjs` (Playwright + Chromium em `/opt/pw-browsers/chromium`; app em `next build && next start`), perfil de visualização do lab (D-35) e tema gravados antes da primeira pintura. Para uma aba nova, acrescente uma entrada em `CAPTURAS` e rode o script de novo.

| Captura | Rota | Perfil | Tema | Viewport | O que mostra |
|---|---|---|---|---|---|
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
