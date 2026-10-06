# DECIA — Backlog e plano de implementação

## 1. Plano por fases (adaptado ao projeto real)

| Fase | Entrega | PR | Estado |
|---|---|---|---|
| 1 | Auditoria + matriz bibliográfica + modelo funcional + specs de card/workspace + vetores | `claude/decia-fase1-auditoria` | este pacote |
| 2 | Domínio da decisão (contexto 5b, V22, JPA) + regras puras Java + testes com vetores | `claude/decia-dominio-decisao` | em andamento |
| 3–6 | Decision Cards (4 modos, flip), workspace (6 seções), evidências/alternativas/critérios, matriz + trade-offs + sensibilidade, snapshot (mock) | `claude/decia-cards-workspace` | em andamento |
| 7 | Serviços de aplicação + API (após Blocos 4–5 de segurança: BOLA/BFLA), cliente TS gerado do OpenAPI | — | depende do Bloco 4/5 e da tarefa OpenAPI→TS |
| 8 | Execução + checkpoints + notificações (outbox `domain_events`) | — | após 7 |
| 9 | Resultado + retrospectiva + memória (RF33) | — | após 7 |
| 10 | IA: desafio, recomendação com 4 porquês, proveniência (`ai_inference_log`), modos ECONOMIA/AVANCADO | — | após cliente de IA (RF43) |
| 11 | Calibração e insights (n ≥ 10, privados) | — | após 9 |
| 12 | Acessibilidade, performance e QA (axe, regressão visual) | contínuo | — |

## 2. Backlog priorizado

| Sev. | Trilha | Item |
|---|---|---|
| P0 | foundation | Snapshot imutável com SHA-256 + teste de adulteração (fase 2) |
| P0 | foundation | FK RESTRICT em snapshots/eventos (fase 2) |
| P1 | foundation | Entidades do contexto 5b + V22 + JPA (fase 2) |
| P1 | foundation | Regras puras com vetores compartilhados Java/TS (fases 2–3) |
| P1 | core workflow | Decision Card 4 modos + flip acessível (fase 3) |
| P1 | core workflow | Workspace 6 seções + trilha de estágios (fase 3) |
| P1 | core workflow | Guarda pré-decisão proporcional (fases 2–3) |
| P1 | core workflow | Serviços + API de decisão com BOLA/BFLA (fase 7) |
| P1 | foundation | Tornar `decisions` a fonte canônica; nó de rastro e ATA como projeções (fase 7) |
| P2 | core workflow | Matriz, trade-offs, dominância, sensibilidade (fase 3) |
| P2 | collaboration | Rodada independente + painel de divergência (fase 3 mock; fase 7 real) |
| P2 | intelligence | Recomendação IA com 4 porquês + modos de desafio (fase 10) |
| P2 | polish | Trocar ✦ por `--ws-info` onde significa "proposta" (Tabs, Sidebar, PageHeader, LabEmbed) |
| P2 | polish | Estados só por cor → cor + texto + ícone (`/lab/decia`, ponto de não lida) |
| P2 | learning | Resultado + retrospectiva (processo × resultado) (fase 9) |
| P2 | governança | Q-152 (pontos), Q-153 (perfil deliberativo) — decisão do dono |
| P3 | polish | Dicas em `title` → Tooltip; `?acao=nova` funcional; 404 de sessão |
| P3 | collaboration | Comentários/menções em decisão (`TargetType.DECISION` — nova migration) |
| P3 | foundation | Unificar vocabulários de visibilidade (migração futura) |
| P4 | learning | Calibração (Brier) privada com n ≥ 10 |
| P4 | learning | "Decisões parecidas" com diferenças de contexto (RF33) |
| P4 | intelligence | Padrões observados (excesso de confiança, otimismo de prazo) — só comportamento, opt-in |
| P4 | polish | Exportar ADR; coedição (Yjs) do workspace |

## 3. Testes de usabilidade (roteiro, 5–8 servidores por rodada)

| Cenário | Pergunta de sucesso | Medida |
|---|---|---|
| Ler o quadro | "Qual decisão está atrasada e qual o estado da do fornecedor?" | acerto em ≤ 10 s |
| Próxima ação | "O que falta para decidir a de arquitetura?" | aponta o checklist |
| Entender a recomendação | "Por que A lidera e o que mudaria isso?" | cita contribuições e sensibilidade |
| Achar evidência | "Que evidência contradiz B?" | encontra sem ajuda |
| Comparar | "Qual alternativa é dominada?" | correto |
| Premissas | "Qual premissa é crítica e não validada?" | correto |
| Finalizar | decidir com motivo e confiança | sem erro; entende avisos |
| Revisar | registrar resultado e retrospectiva | separa processo de resultado |
