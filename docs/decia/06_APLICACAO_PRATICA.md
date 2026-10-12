# DECIA — Aplicação prática: cinco decisões ponta a ponta

Dados fictícios (pessoas e números de demonstração). Os mesmos casos estão em `lib/decia/fixtures.ts` e nas capturas.
O caso 1 usa exatamente o vetor `arquitetura-ponderada` de `contracts/decia/vetores.json`.

## 1. Arquitetura técnica (modelo "Arquitetura", PROFUNDA)

| Estágio | Conteúdo |
|---|---|
| Problema | "Qual infraestrutura devemos usar para suportar o crescimento previsto do produto pelos próximos 12 meses?" · dono: Ana (APROVADORA) · prazo 30/10 · impacto ALTO · urgência MÉDIA |
| Contexto | objetivo: suportar 2× usuários sem degradar p95; restrições: orçamento anual, equipe de 3 pessoas, dados classificados INTERNO |
| Evidências | teste de carga (EVIDÊNCIA, alta, SUSTENTA B); tabela de preços (FATO, alta, SUSTENTA A); SLA (FATO, média); opinião de especialista (OPINIÃO, contradiz B) |
| Alternativas | A Railway · B AWS · C Azure híbrida · D Adiar (não agir; DESCARTADA com motivo "contrato atual vence em 3 meses") |
| Critérios (peso) | Segurança 30 · Escalabilidade 25 · Custo 20 · Tempo 15 · Manutenção 10 |
| Análise | A 3,8 · B 3,75 · C 3,55 → **empate quase técnico; A lidera por 0,05**. Divergência ALTA em B×Segurança (notas 5, 2, 5). Sensibilidade: **Custo 20 → 17 % faz B liderar** → recomendação **sensível** |
| Riscos/premissas | premissa "volume dobra em 12 meses" (70 %, NÃO VALIDADA, CRÍTICA); risco "limite de região" (PROVÁVEL × ALTO = ALTO) em A |
| Desafio | IA ✦ "Busque evidência contrária": aponta custo de egress não medido para A; "Premissas sem suporte": a premissa de crescimento |
| Decisão | B escolhida após nova medição de egress; motivo; confiança 65 % (MÉDIA); gatilho "rever se custo mensal > orçamento + 15 %"; snapshot v1 |
| Execução | tarefas: migração de staging, runbook, alarme de custo (ligadas, não copiadas); checkpoint em 90 dias |
| Resultado | PARCIAL: escalou, custo 12 % acima |
| Revisão | processo ADEQUADO; premissa de crescimento confirmada; custo de egress subestimado → lição reutilizável "medir egress antes" |
| Exportação | ADR (Contexto · Decisão · Alternativas · Consequências) — DESIGN PROPOSAL |

## 2. Priorização de produto (modelo "Priorização", PADRAO)

| Estágio | Conteúdo |
|---|---|
| Problema | "Qual funcionalidade entra na Sprint 5?" · dono: Bruno · prazo: planejamento da sprint |
| Alternativas | A exportar relatório · B notificações agrupadas · C filtro salvo · D não incluir nada novo (reduzir dívida) |
| Critérios | Valor para o usuário · Valor para o negócio · Esforço (5 = menor) · Evidência de demanda · Risco |
| Evidências | 41 pedidos de suporte (MÉTRICA, SUSTENTA B); entrevista com 5 usuários (PESQUISA, SUSTENTA A) |
| Análise | rodada independente de 4 pessoas → divergência MODERADA em Valor×A; B lidera sem pesos |
| Decisão | B; confiança 75 %; previsão "≥ 30 % dos usuários ativam em 30 dias" (70 %) |
| Execução/Resultado | história + tarefas; resultado SUCESSO; previsão OCORREU (entra na calibração) |
| Revisão | processo ADEQUADO; lição: "pedidos de suporte foram bom preditor" |

## 3. Escolha de fornecedor (modelo "Fornecedor", PROFUNDA)

> Em contratações públicas, as regras legais e institucionais (licitação, impessoalidade, pareceres) **prevalecem** sobre o
> modelo. O DECIA organiza a análise técnica; a decisão jurídica é de pessoas (Lei 14.133/2021 não consta da bibliografia
> e não foi interpretada aqui).

| Estágio | Conteúdo |
|---|---|
| Problema | "Qual fornecedor de suporte devemos contratar?" · dono: Carla · visibilidade DEPARTAMENTO, RESTRITO |
| Alternativas | Fornecedor A · B · C · manter equipe interna |
| Critérios (peso) | Conformidade técnica 35 · Preço 25 · Risco 20 · Prazo de entrega 10 · Suporte 10 |
| Evidências | propostas (DOCUMENTO), atestados (FONTE EXTERNA, SECUNDÁRIA), prova de conceito (TESTE TÉCNICO, PRIMÁRIA) |
| Decisão | A; DECIDIDA com snapshot; confiança 70 %; checkpoint aos 6 meses ("SLA cumprido? premissas mudaram?") |
| Execução | tarefa de contratação (rito institucional), plano de transição |
| Estado na demo | DECIDIDA → EM_EXECUCAO, frescor FRESCA |

## 4. Go / No-Go de projeto (modelo "Go/No-Go", PADRAO)

| Estágio | Conteúdo |
|---|---|
| Problema | "Adiar o lançamento ou reduzir o escopo?" · dono: Diego · urgência ALTA · impacto ALTO |
| Evidências | defeitos abertos (MÉTRICA), velocidade das 3 últimas sprints (MÉTRICA), compromissos com usuários (FATO) |
| Alternativas | Adiar 2 semanas · Reduzir escopo · Aumentar capacidade |
| Cenários | melhor/base/pior para "reduzir escopo" com premissas e probabilidade |
| Decisão | reduzir escopo; previsão "lançamento sem incidente crítico em 14 dias" (80 %) |
| Resultado | PARCIAL (um incidente médio); previsão OCORREU |
| Revisão | **processo ADEQUADO × resultado PARCIAL** → "boa decisão, resultado parcial": o card mostra os dois separadamente (G8) |

## 5. Decisão de design / UX (modelo "UX", PADRAO — em enquadramento)

| Estágio | Conteúdo |
|---|---|
| Problema | "Qual arquitetura de navegação devemos usar?" · dono: Eva · estado ENQUADRAMENTO |
| Critérios previstos | conclusão de tarefa · descoberta · acessibilidade · escalabilidade · consistência |
| Evidências previstas | testes de usabilidade, analytics, avaliação heurística |
| Estado na demo | vazio de propósito → mostra os estados vazios com próxima ação (05 §5) e prontidão NÃO PRONTA |

## Modelos (não substituem o pensamento)

| Modelo | Critérios sugeridos (editáveis) | Base |
|---|---|---|
| Arquitetura | segurança, escalabilidade, custo (TCO), tempo, manutenção, dependência de fornecedor | board RF43 (ITIL, DORA, TCO) |
| Priorização de produto | valor ao usuário, valor ao negócio, esforço, evidência, risco | board RF44 (WSJF, MoSCoW) |
| Fornecedor | conformidade técnica, preço, risco, entrega, suporte | — (DESIGN PROPOSAL) |
| Risco | probabilidade, impacto, custo de mitigação, reversibilidade | board RF43 (matriz de risco) |
| Go / No-Go | prontidão, risco, compromissos, custo do atraso | board RF43 (Stage-Gate), RF44 (custo do atraso) |
| UX | conclusão de tarefa, descoberta, acessibilidade, escalabilidade, consistência | DESIGN PROPOSAL |
| Investimento | retorno, risco, alinhamento estratégico, prazo de retorno | board RF43 (ROI), Kaplan & Norton |
