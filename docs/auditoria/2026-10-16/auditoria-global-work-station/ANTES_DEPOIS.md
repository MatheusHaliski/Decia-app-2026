# Alterações aplicadas e limites

16/10/2026. Código da aplicação alterado **localmente**, sem publicação de PR parcial de produto. O PR da auditoria contém documentação, artefatos e scripts de reprodução. O manifesto permite identificar o código observado.

| Área | Antes | Depois | Arquivos locais principais | Evidência |
|---|---|---|---|---|
| Política de IA Drawings | Nível/instrução/classificação não invalidavam proposta | Alterações tornam proposta obsoleta; nível passivo impede aplicação | `components/studio/DrawingJourney.tsx`, teste correspondente | 3 cenários de regressão na suíte frontend |
| Comunicação de autonomia | Nível 4 chamado agente | Interface informa proposta de escopo amplo, sem agente automático | `components/studio/Studio.tsx` | Captura final Studio e código |
| Sigilo no social DEMO | Departamento podia conceder leitura | Vínculo explícito necessário; testes de permissão atualizados para a política autorizada pelo usuário | `lib/social/rules.ts`, testes | Testes negativos; não substitui autorização do backend |
| Composição de projeto | Mosaico/contagem podiam incluir tarefa inacessível | Apenas tarefas permitidas, sem expor ID/título/total oculto; objetivo e lista de tarefas com links | `lib/social/view-model.ts`, `components/social/ProjectCard.tsx` | Teste de privacidade da composição |
| Salvos indisponíveis | Título oculto ainda disponível ao leitor de tela | Título inacessível removido inclusive de `sr-only` | `components/social/ProfileView.tsx` | Revisão de fonte e suíte social |
| Criador profissional | Tipo/categoria/especialidade/formato não expostos | Campos ligados ao contrato persistente e limite explícito de formato | `components/tasks/TaskEditor.tsx`, teste correspondente, i18n pt/en/es | 6 jornadas UI→API→reload→edição |
| Conta cadastrada | Perfil e contadores de Pessoa Exemplo | Identidade real e atividade privada paginada de tarefas reais; campos sociais não disponíveis marcados com — | `components/social/RegisteredProfile.tsx`, teste; `ProfileView.tsx` | Capturas antes/depois, 3 testes e navegação real |
| Clareza do card real | Resumo ausente sem finalidade aparente | Usa resumo ou trecho de descrição, tipo, estado, especialidade, prazo e data | `RegisteredProfile.tsx` | Captura final do perfil |
| Filtro sem painel | Papel tab com aria-controls inexistente | Grupo de botões pressionados; tabs reais apontam para painel existente | `components/ui/Tabs.tsx`, `ui.test.tsx` | 2 testes e Axe delimitado |
| Contraste de estados/cards | Opacidade de pulso/card podia tornar texto ilegível | Texto estável; indicador decorativo pulsa; arquivo não reduz opacidade do texto | `components/ui/Badge.tsx`, cards de tarefa/projeto | Axe antes/depois |
| Perfil sem sub-abas disponíveis | Invólucro podia mostrar abas vazias após conteúdo real | `tabs=[]` e RfPage sem painel vazio quando lista de abas é vazia | `RegisteredProfile.tsx`, `components/shell/RfPage.tsx` | Teste assegura ausência de tablist vazio |
| Área de toque do autor | Link podia medir 18 px de altura | Alvo mínimo de 24 × 24 px no link de autor | `components/social/Primitives.tsx` | Axe WCAG 2.2 no mural |
| Catálogo de requisitos | 50 RF no catálogo da aplicação | Gerador inclui os 24 RF Studio existentes; registro associa superfície, sem aprovação automática | `scripts/rf/gerar-catalogo.mjs`, `lib/rf/catalog.gen.ts`, teste, `lib/pages/registry.ts` | Catálogo validado com RF1–RF74 |

Notas por RF e as seis subnotas antes/depois estão em `MATRIZ_RF.md` e `MATRIZ_RF.json`. A melhora de um componente não conclui todo o RF que o utiliza. Os critérios que não foram demonstrados continuam pendentes.

Os estados de domínio foram preservados. Não foi criada uma falsa integração Google/Facebook/GitHub/Word/Excel por meio de ícones, nem apresentado mock como avaliação real da IA. Nenhuma chamada paga foi executada.
