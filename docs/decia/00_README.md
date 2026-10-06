# DECIA — Pacote de auditoria e refatoração (v1, 2026-10-06)

DECIA = **Decisão com Inteligência Artificial** (significado oficial preservado). O objetivo deste pacote é fazer o
DECIA responder **"Como esta decisão foi construída?"** — não só "qual opção a IA recomenda?".

| Arquivo | Conteúdo |
|---|---|
| [01_AUDITORIA.md](01_AUDITORIA.md) | arquitetura atual → problemas → redundâncias → arquitetura proposta; notas 0–5; matriz de auditoria (P0–P4); revisão heurística |
| [02_MATRIZ_BIBLIOGRAFICA.md](02_MATRIZ_BIBLIOGRAFICA.md) | referência → conceito → aplicação → UI/UX → regra implementável; o que é PRODUCT HYPOTHESIS / DESIGN PROPOSAL |
| [03_MODELO_FUNCIONAL.md](03_MODELO_FUNCIONAL.md) | definição, modelo mental (9 estágios), regras de ouro, domínio (contexto 5b, V22), ciclo de vida, indicadores, **regras de cálculo**, IA, permissões, analytics, conflitos com o board (Q-152…Q-156) |
| [04_DECISION_CARD.md](04_DECISION_CARD.md) | auditoria dos cards, frente/verso, wireframes, estados, modos, flip, acessibilidade, tokens, componentes, testes |
| [05_WORKSPACE_E_NAVEGACAO.md](05_WORKSPACE_E_NAVEGACAO.md) | navegação, workspace (6 seções + trilha), jornada, usabilidade, vazios/erros, mobile, colaboração |
| [06_APLICACAO_PRATICA.md](06_APLICACAO_PRATICA.md) | 5 decisões ponta a ponta + modelos |
| [07_SERVICE_BLUEPRINT.md](07_SERVICE_BLUEPRINT.md) | ação → frontend → domínio → IA → dados → notificação |
| [08_BACKLOG_E_PLANO.md](08_BACKLOG_E_PLANO.md) | fases, backlog P0–P4 por trilha, roteiro de testes de usabilidade |
| [09_ARQUITETURA_MENSAGENS.md](09_ARQUITETURA_MENSAGENS.md) | arquitetura de mensagens e eventos (Hohpe & Woolf): envelope, canais, comando × evento, pub-sub, roteamento, tradutores, correlação, splitter/aggregator, outbox, idempotência, retry/dead letter, projeção do card, observabilidade, critério de aceite |
| [`contracts/decia/vetores.json`](../../contracts/decia/vetores.json) | vetores de teste das regras (gerados por `gerar_vetores.py`), usados por Java e TypeScript |

## Critério final de aceite — rastreio

| Critério | Onde é atendido | Estado |
|---|---|---|
| Problema claramente definido | `Decision.question` obrigatória; prontidão §6.7 | domínio + UI (PRs fase 2 e 3) |
| Evidências separadas de hipóteses | `EvidenceNature`, `DecisionAssumption`, `StatementNatureChip` | domínio + UI |
| Alternativas comparáveis | `DecisionAlternative` (inclui "não agir"), `CriteriaMatrix` | domínio + UI |
| Critérios explícitos | `DecisionCriterion` + pesos validados | domínio + UI |
| Trade-offs visíveis | `TradeOffView`, contribuições por critério, sensibilidade | UI |
| Riscos identificados | `DecisionRisk` + matriz §6.6 | domínio + UI |
| Incerteza expressável | confiança (passo 5), previsões, cenários | domínio + UI |
| IA pode desafiar a decisão | §7 modos de desafio | UI com IA marcada como não conectada; serviço na fase 10 |
| Responsável humano | `ownerUserId` + guarda | domínio + UI |
| Estado no momento da decisão preservado | `DecisionSnapshot` + SHA-256 | domínio (persistência) + UI (mock) |
| Execução acompanhável | `DecisionWorkLink`, checkpoints, frescor | domínio + UI (mock); notificações na fase 8 |
| Resultado registrável | `DecisionOutcome` | domínio + UI (mock) |
| Revisão pós-decisão | `DecisionRetrospective` | domínio + UI (mock) |
| Aprendizado volta para decisões futuras | lições → memória (RF33), calibração | spec; implementação nas fases 9 e 11 |
| Cards com leitura rápida | Decision Card ≤ 5 sinais, 4 modos | UI |
| Workspace com profundidade | 6 seções + trilha de 9 estágios | UI |
| Experiência acessível | flip por teclado, `inert`, reduced-motion, cor + texto + ícone | UI + testes |
| Rastreabilidade | `DecisionEvent` append-only + `audit_log` | domínio; API na fase 7 |

**Ainda não está pronto de ponta a ponta:** sem API (depende dos Blocos 4–5 de segurança), sem serviço de IA (RF43),
sem notificações. A UI roda sobre dados de demonstração claramente rotulados.
