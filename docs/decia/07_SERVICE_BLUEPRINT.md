# DECIA — Service blueprint (ação → frontend → domínio → IA → dados → notificação)

"(mock)" = o que roda hoje com o repositório em memória (`lib/decia/repository.ts`); a API real entra após os Blocos 4–5
de segurança.

| Etapa | Ação do usuário | Frontend | Domínio | IA | Dados | Notificação / acompanhamento |
|---|---|---|---|---|---|---|
| Criar | "+ Criar → Decisão" | fluxo Nova decisão (pergunta, complexidade sugerida, modelo) | `Decision` RASCUNHO; dono = criador | sugere complexidade e decisões parecidas (RF33) ✦ | `decisions`, `decision_events(CRIADA)` | — |
| Enquadrar | objetivo, restrições, prazo, participantes | Visão geral + trilha | → ENQUADRAMENTO; DACI | aponta lacunas ("falta objetivo") | `decisions`, `decision_participants` | convite aos participantes |
| Evidências | anexar/linkar, marcar natureza | Evidências | `DecisionEvidence`, `EvidenceLink`; força §6.5 | resume, sugere fonte contrária ✦ | `decision_evidence(_links)`, `media_objects` | — |
| Alternativas | A/B/C + não agir | Comparar | `DecisionAlternative` | "Encontre alternativas que faltam" ✦ | `decision_alternatives` | — |
| Critérios | escolher, pesar | Comparar | `DecisionCriterion`; validação de pesos | sugere critérios do modelo ✦ | `decision_criteria` | — |
| Comparar | avaliar 1–5 (rodada) | CriteriaMatrix, Sensitivity, TradeOff | `CriterionAssessment`; §6.1–6.4 | "Explique os trade-offs" ✦ | `criterion_assessments` | lembrete de rodada aberta |
| Desafiar | Desafiar / pré-mortem | Riscos e premissas | `DecisionRisk(PRE_MORTEM/RED_TEAM)`, `DecisionAssumption` | 5 modos de desafio ✦ | `decision_risks`, `decision_assumptions`, `ai_inference_log` | — |
| Recomendação | ver | Decisão | `DecisionRecommendation(MODELO)` determinística | `DecisionRecommendation(IA)` com 4 porquês ✦ | `decision_recommendations` | — |
| Decidir | escolher, motivo, confiança, gatilhos | Decisão + guarda (Dialog) | guarda §6.10 → DECIDIDA; `DecisionSnapshot` | nenhuma ação automática | `decision_snapshots`, `decision_triggers`, `audit_log` (impacto ≥ ALTO) | participantes informados; se sessão RF29 → revisor |
| Executar | gerar tarefas/marcos | Execução e revisão | `DecisionWorkLink`; → EM_EXECUCAO; checkpoints | sugere plano ✦ | `decision_work_links`, `tasks`, `decision_checkpoints` | checkpoint vencendo (7 dias) |
| Acompanhar | concluir checkpoint | idem | frescor §6.11; gatilho DISPARADO | aponta evidência nova ✦ | `decision_checkpoints`, `decision_triggers` | "decisão vencida" na caixa de entrada |
| Resultado | registrar | idem | `DecisionOutcome` → RESOLVIDA; previsões resolvidas | — | `decision_outcomes`, `decision_forecasts` | pedir retrospectiva |
| Revisar | retrospectiva | idem | `DecisionRetrospective` → REVISADA | resume o que mudou ✦ | `decision_retrospectives` | — |
| Aprender | marcar lição reutilizável | Revisões | indexa na memória | busca decisões parecidas (RF33) | OpenSearch memória | aparece em "decisões parecidas" |
