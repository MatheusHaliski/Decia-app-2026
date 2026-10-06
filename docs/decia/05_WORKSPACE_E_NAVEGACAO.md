# DECIA — Workspace, navegação e jornada (v1)

## 1. Auditoria da navegação atual (`lib/nav/matrix.ts`, `lib/pages/registry.ts`)

- Sidebar "Criar" → **DECIA** (`/decia`, abas Abertas · Minhas · Encerradas); `/decia/[sessionId]` (Conversa · Minuta ·
  Artefatos · Decisão · Participantes); "Gestão" → `/decia/review`. Barra inferior: sem DECIA.
- Tudo é esqueleto `RfPage`; `?acao=nova` do "+ Criar" é ignorado; não há 404 de sessão.
- A unidade de navegação é a **sessão (chat)**, não a **decisão** — a pergunta "o que está esperando por mim?" não tem
  resposta em lugar nenhum.

## 2. Arquitetura proposta (adaptada, não aplicada às cegas)

O Work Station já tem Mural, Acervo, Mesa, Insights e Notificações; criar novas seções globais "Work/Insights" duplicaria
o que existe. Proposta mínima (**DESIGN PROPOSAL**):

```
DECIA (/decia)
├── Precisa de atenção   (padrão)  ← aguardando evidência, aguardando minha decisão/aprovação, revisões e checkpoints
│                                    devidos, decisões vencidas, tarefas bloqueadas de decisões em execução
├── Decisões             ← grade (STANDARD) ou lista (COMPACT/tabela) com filtros
├── Sessões              ← as abas atuais (abertas · minhas · encerradas) — deliberação em grupo
└── Revisões             ← resultados a registrar e retrospectivas (aprendizado)
/decia/decisoes/[id]     ← Decision Workspace
/decia/[sessionId]       ← sessão (inalterada)
```

Filtros de Decisões: estado · responsável · projeto · risco · impacto · prazo · tipo. Grade quando a leitura visual é o
principal; **lista/tabela** quando a comparação densa é o principal (alternância salva por usuário).

## 3. Decision Workspace (não é modal)

```
CABEÇALHO: pergunta · estado · responsável · prazo · prontidão · [Desafiar] [Decidir] · "salvo há 3 s"
TRILHA DE ESTÁGIOS: Problema → Contexto → Evidências → Alternativas → Critérios → Análise → Decisão → Execução → Aprendizado
                    (cada estágio com ✓ / ! / vazio — onde estou e o que falta)
SEÇÕES (rail à esquerda no desktop; drill-down no mobile):
  Visão geral      pergunta, objetivo, escopo, restrições, stakeholders, participantes, resumo, linha do tempo
  Evidências       lista com natureza (FATO/EVIDÊNCIA/OPINIÃO), fonte, data, qualidade, relevância, confiabilidade;
                   ligações SUSTENTA/CONTRADIZ por alternativa/critério/premissa; evidência contrária nunca escondida
  Comparar         alternativas (com "não agir"), critérios + pesos, matriz, trade-offs, dominância, sensibilidade,
                   cenários (melhor/base/pior), divergência entre participantes (rodada independente)
  Riscos e premissas  registro de premissas (confiança, validação), riscos (matriz), pré-mortem, red team
  Decisão          recomendação (modelo ✓ / IA ✦ com os 4 porquês), escolha, motivo, confiança, "o que mudaria esta
                   decisão" (gatilhos), guarda pré-decisão, snapshot "no momento da decisão"
  Execução e revisão  plano → tarefas/marcos ligados, checkpoints, frescor, resultado, retrospectiva, lições
```

Seis seções em vez de nove abas: menos navegação, mesmos nove estágios na trilha.

## 4. Jornada

```
Criar decisão → Enquadrar problema → Coletar evidências → Definir alternativas → Definir critérios → Comparar →
Desafiar → Decidir → Executar → Revisar → Aprender
```

| Passo | O usuário faz | O sistema mostra | Estágio |
|---|---|---|---|
| Criar | "+ Criar → Decisão": pergunta, complexidade sugerida (RAPIDA/PADRAO/PROFUNDA), modelo opcional, "Encontrar decisões parecidas" | diferenças de contexto antes de reaproveitar | 1 |
| Enquadrar | objetivo, restrições, escopo, prazo, stakeholders | checklist de prontidão começa | 2 |
| Evidências | anexa/linka documentos, métricas, testes; marca natureza e confiabilidade | força da evidência por alternativa | 3 |
| Alternativas | A, B, C + "não agir"; IA pode sugerir (✦, aceitar/descartar) | | 4 |
| Critérios | escolhe de modelo/recentes; pesos opcionais | validação da soma | 5 |
| Comparar | avalia 1–5 (rodada independente em grupo) | matriz, contribuições, trade-offs, dominância, sensibilidade, divergência | 6 |
| Desafiar | "Desafiar a decisão" (5 modos) / pré-mortem | contra-evidência, premissas frágeis, riscos | 6 |
| Decidir | escolhe, escreve motivo, declara confiança, gatilhos | guarda pré-decisão; snapshot com hash | 7 |
| Executar | gera tarefas/marcos (sem duplicar), agenda checkpoints | frescor, progresso | 8 |
| Revisar | registra resultado; retrospectiva (processo × resultado) | premissas que falharam | 9 |
| Aprender | marca lição reutilizável → Memória Institucional (RF33) | calibração (n ≥ 10), padrões observados | 9 → 1 |

## 5. Usabilidade (como cada princípio vira regra)

| Princípio | Regra no DECIA |
|---|---|
| Visibilidade do estado | trilha de estágios + "salvo há Xs" + estado da IA ("analisando…", cancelável) |
| Linguagem do mundo real | Alternativas, Evidências, Riscos, Premissas, Decisão, Resultado — nunca nomes de tabela |
| Controle | desfazer (10 s) em edições; editar até DECIDIDA; reabrir com motivo; comparar snapshots; arquivar; a IA nunca decide |
| Consistência | só componentes do DS; status com cor + texto + ícone |
| Prevenção de erro | guarda pré-decisão (§6.10) proporcional à complexidade |
| Reconhecimento | autocomplete de critérios recentes/modelos; responsável por busca de pessoas; sem IDs |
| Flexibilidade | atalhos (N nova, F flip, / buscar, G D ir para Decisões); orientação progressiva para novatos |
| Minimalismo | frente do card com ≤ 5 sinais; seções vazias recolhidas |
| Recuperação de erro | mensagens específicas (abaixo) |
| Ajuda contextual | ⓘ ao lado de cada indicador: "Confiança 70 % — quão provável você acredita que este resultado seja?" |

Base: **PRODUCT HYPOTHESIS** para a lista de 10 heurísticas (Nielsen não está na bibliografia — Q-156); awareness
[REF-DOURISH]; diretrizes humano-IA [REF-AMERSHI].

### Estados vazios (sempre com a próxima ação)

| Vazio | Texto | Ação |
|---|---|---|
| Sem evidência | "Nenhuma evidência ainda. Evidência separa fato de opinião." | Adicionar evidência |
| Sem alternativas | "Uma decisão real compara opções — inclusive não agir." | Adicionar alternativa · Sugerir com IA ✦ |
| Sem critérios | "Que critérios importam para esta pergunta?" | Escolher de um modelo |
| Sem resultado | "O resultado ainda não pode ser observado. Checkpoint em 15 jan." | Registrar resultado |
| Caixa de entrada vazia | "Nada esperando por você." | Nova decisão |

### Estados de erro (específicos)

"Não foi possível carregar as evidências" (tentar de novo) · "Análise de IA indisponível — a matriz continua
funcionando" · "Esta decisão foi atualizada por outra pessoa — ver mudanças" (lock otimista `version`) · "Pesos somam
105 % — ajuste para 100 %".

## 6. Mobile

Prioriza pergunta · estado · opção · próxima ação. Lista COMPACT; workspace em drill-down (seção por tela); matriz vira
lista por alternativa com notas por critério; detalhes em bottom sheet. Nada de desktop espremido.

## 7. Colaboração

Comentar, mencionar, sugerir evidência, contestar premissa, avaliar alternativa, aprovar/devolver — conforme papéis DACI
(§8 do modelo). Rodada independente antes do consenso (G5) e painel "quem contribuiu / revisou / aprovou". Divergência
alta destacada; a IA facilitadora descreve a estrutura, não escolhe.
