# Problemas reproduzíveis e gravidade

16/10/2026. P0: integridade/privacidade/controle; P1: jornada essencial; P2: clareza e acessibilidade; P3: refinamento. Os passos usam conta sintética autorizada. Ausência de adapter não foi confundida com falha de credencial.

| ID | Gravidade / RF | Reprodução | Resultado inicial | Situação após a rodada |
|---|---|---|---|---|
| A01 | P0 · RF51/RF68 | Gerar proposta Drawings, revisar, mudar nível para passivo ou alterar instrução/classificação, tentar aplicar | Proposta permanecia elegível porque essas mudanças não integravam a assinatura | Corrigido localmente; três testes impedem aplicar e preservam original |
| A02 | P0 · RF16–19/RF27 | No modelo social, acessar tarefa SIGILOSA como colega do mesmo departamento, sem vínculo explícito | Política DEMO concedia leitura por departamento, divergindo da decisão de segurança da sessão | Corrigido no modelo social; backend já possui política própria. Testes passaram a exigir recusa |
| A03 | P0 · RF7/RF17 | Montar card de projeto público com tarefa privada/sigilosa e observar view model/mosaico/contagem | Títulos/IDs e composição podiam incluir tarefa inacessível | Corrigido: filtra por permissão antes de mosaico, lista e contagem; teste negativo verifica título/ID |
| A04 | P0 · RF18/RF19 | Salvar tarefa, perder acesso, abrir lista de salvos com leitor de tela | Título indisponível podia continuar em conteúdo `sr-only` | Texto oculto removido; conteúdo inacessível não é alternativa acessível |
| A05 | P0 · RF52/RF69/RF71 | Editar peça no estúdio local e recarregar sem exportar | Documento local não é salvo automaticamente como peça da tarefa | **Pendente**: persistência/recuperação de documento; aviso e exportação não equivalem a recuperação confiável |
| A06 | P1 · RF4/RF12 | Abrir Criar Tarefa e procurar tipo, categoria, especialidade e formato | UI criava texto manual sem expor metadados profissionais previstos no contrato | Corrigido parcialmente: campos adicionados, seis áreas verificadas; referências/anexos/dependências estruturadas continuam pendentes |
| A07 | P1 · RF5/RF20/RF22 | Abrir Criar Projeto e tentar compor fases e tarefas, salvar e reabrir | Página estrutural, sem construtor persistente operacional | **Pendente**: agregado Projeto e jornada real |
| A08 | P1 · RF6/RF16 | Entrar com conta real e abrir Meu perfil | Exibia Pessoa Exemplo, trabalho e contagens fictícias | Corrigido para visão privada da conta real e tarefas da API; perfil público e contadores sociais continuam pendentes |
| A09 | P1 · RF16/RF27 | Criar tarefa real e procurar publicação na carreira/feed de terceiros | Mural usa memória DEMO, não produção real | **Pendente**: publicações explícitas e feed persistente com privacidade |
| A10 | P1 · RF18/RF19 | Curtir/comentar/seguir em demonstração e recarregar | Estado social reinicia; não representa interação persistente de contas reais | **Pendente**: API idempotente, moderação e duas contas |
| A11 | P1 · RF29/RF43/RF46 | Abrir DECIA, tentar trabalhar em sessão real e solicitar análise | Decisões em memória, chat/sessões sem fluxo completo; ações de IA podem informar indisponível | **Pendente**: backend deliberativo, chat, fontes e encaminhamentos |
| A12 | P1 · RF56 | Em Letters, procurar convite, permissão de comentário e edição simultânea | Não há documento Letters colaborativo | **Pendente**: ACL por ação, concorrência, comentários e reconexão |
| A13 | P1 · RF51 | Selecionar nível 4 esperando execução autônoma com plano e stop | Rótulo sugeria agente, mas execução era proposta revisada | Rótulo/aviso corrigidos; agente real com plano, limites e interrupção continua pendente |
| A14 | P1 · RF23/RF34/RF70 | Criar tarefa e procurar importação Google/Microsoft ou abrir DWG para quantitativo | Enums e documentos não correspondem a adapters/fluxos reais | **Pendente**; inventário diferencia aplicativo, provedor, formato e integração |
| A15 | P2 · RF38/RF73 | Rodar Axe em perfil/mural; inspecionar filtro sem painel e etiqueta pulsante | `aria-controls` inválido e contraste variável por opacidade | Corrigido: filtros são botões quando não têm painel; apenas indicador decorativo pulsa; texto/card preserva contraste |
| A21 | P2 · RF38 | Rodar Axe WCAG 2.2 no mural com link de autor compacto | Alvo de 18 px e espaçamento insuficiente | Link passou a ter mínimo de 24 × 24 px; nova verificação registrada |
| A16 | P2 · RF7/RF38 | Inspecionar card de projeto buscando objetivo e tarefas concretas | Mosaico e total comunicavam pouco a composição | Card DEMO agora exibe objetivo e até três tarefas autorizadas com link/estado; backend de projeto permanece pendente |
| A17 | P2 · RF51–RF74/RF72 | Consultar catálogo de RF da aplicação | Catálogo local só incluía RF1–RF50 | Gerador passou a ler especificações Studio; catálogo/registro de superfície cobrem RF1–RF74 sem alegar aceite |
| A18 | P2 · RF58/RF63/RF73 | Editar desenho em viewport móvel e procurar propriedade contextual | Muitos controles e rolagem extensa; canvas compete com ferramentas | **Pendente**: reorganização contextual e teste de eficiência com usuários |
| A19 | P1 · RF53/RF54/RF55 | Solicitar análise acadêmica completa da língua e precisão por profissão | Regras locais limitadas e LLM sem campanha de qualidade nesta rodada | **Não verificado** para qualidade real; planejar corpus, gabarito e revisão especializada |
| A20 | P1 · RF74 | Capturar PNG e esperar retorno de imagem gerada pela IA | Ghost é renderização local de vetores, não PNG multimodal de backend | **Pendente**: contrato multimodal e teste externo limitado por orçamento |

## Divergências de especificação

RF4 ainda possui trechos históricos que dizem que nenhuma classe existe; TaskEditor/TaskInventory já implementam um subconjunto. RF12 descreve PATCH/If-Match, enquanto a API local usa PUT com versão no corpo. A existência de uma alternativa técnica não elimina o conflito documental: reconciliar os contratos por CA antes do aceite, conservando IDs e a história da renumeração.

RF6 cita perfil empresarial, mas parte do produto e da documentação usa o requisito para perfil/acervo pessoal. A correção de identidade pessoal desta rodada não conclui gestão empresarial. RF29 cobre a ponte projeto/DECIA; testar cálculos de decisões DEMO não conclui essa ponte. Marcas de formato/IA não comprovam compatibilidade ou autoria técnica.

Não foi confirmada funcionalidade de produto órfã que justificasse novo RF. Os utilitários de auditoria e catálogo são transversais a RF72; a captura/ghost está em RF74; os comandos se distribuem entre RF57–RF70. Lacunas foram vinculadas aos identificadores existentes.
