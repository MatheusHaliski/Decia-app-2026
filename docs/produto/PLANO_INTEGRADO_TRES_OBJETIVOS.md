# Plano integrado do Work Station: três objetivos, uma jornada verificável

Fonte: [objetivos atualizados no Trello](https://trello.com/c/4yAncRyq), relidos nesta revisão, e instruções do usuário. Escopo: todos os 50 RF ativos, páginas, abas/sub-abas, criadores, editores, cards, configurações e colaboração no DECIA. Este é um plano de reestruturação e execução, não declaração de implementação integral.

## Objetivos que governam o plano

1. Integrar IA ao ambiente de trabalho pela criação, edição e compartilhamento de tarefas/projetos, apoiando resultados, direcionamento de mercado e crescimento pessoal/profissional.
2. Criar com auxílio de IA tarefas/projetos de vários campos profissionais, registráveis, compartilháveis e visíveis no perfil escolhido pelo usuário.
3. Trabalhar em equipe no DECIA, com chat integrado a IA e serviços de terceiros, para elaborar soluções melhores para problemas de tarefas/projetos.

## Jornada central e evidência de conclusão

| Etapa | Entrada | Saída real | Ação seguinte | Prova necessária |
|---|---|---|---|---|
| 1. Conhecer a pessoa | Perfil e portfólio autorizados, interesses, competências e objetivo escolhido | Análise revisável, fontes e lacunas | Pedir direcionamento | Corrigir perfil muda a próxima análise; dados privados não aparecem a terceiros |
| 2. Direcionar | Análise confirmada, disponibilidade, área e finalidade | Propostas de tarefas/projetos, pessoas semelhantes e caminhos possíveis | Revisar e escolher proposta | Justificativa cita dados; hipótese não vira fato; sem promessas de emprego |
| 3. Produzir tarefas | Proposta aceita ou criação manual | Tarefa persistente com peças, critério de aceite e proveniência | Editar, executar ou publicar | Aceitar cria uma vez; reabrir mantém conteúdo e histórico |
| 4. Construir portfólio e rede | Versão escolhida, público e permissão de reutilização | Perfil/mural com trabalhos autorizados; seguir, comentar, curtir, compartilhar e remixar reais | Colaborar ou compor projeto | Duas contas testam publicação, acesso, interação, crédito e revogação |
| 5. Compor e executar projetos | Tarefas selecionadas e demanda | Projeto com fases, dependências, responsáveis e versões | Trabalhar na Mesa ou levar problema ao DECIA | Reabrir projeto mantém composição; mudar tarefa sinaliza diferença de versão |
| 6. Resolver em equipe no DECIA | Problema explícito, recursos/versões e participantes autorizados | Argumentos, evidências, alternativas, decisão humana, encaminhamentos e aprendizado | Atualizar execução e portfólio quando permitido | Dois participantes colaboram; decisão/encaminhamento persistem após reinício |

**Regra central:** resultado da etapa anterior é entrada verificável da seguinte. Nenhum “aceitar”, “publicar”, “convidar” ou “decidir” pode funcionar apenas em memória/localStorage no ambiente real. A IA não publica, atribui, segue pessoas ou fecha decisão por conta própria.

## Arquitetura de experiência

Navegação principal orientada ao trabalho: **Meu perfil · Copilot · Acervo · Projetos · Mesa · Rede · DECIA**. Gestão institucional e administração aparecem por autorização; serviços especializados ficam no contexto e na busca de ações. A jornada pessoal não exige vínculo com empresa: pessoa iniciante, profissional autônomo e empregado podem produzir seu portfólio, enquanto lotação/chefia governa somente ações institucionais.

O perfil distingue “meus trabalhos publicados” de “meu espaço privado”. O Copilot possui atalhos “analisar meu perfil”, “sugerir o que trabalhar”, “criar a partir de uma ideia” e “encontrar colaboradores”. Sempre informa quais dados usa e entrega propostas editáveis. O acervo recebe os rascunhos aceitos. O projeto compõe tarefas existentes, sem duplicar autoria nem adulterar versões. O DECIA recebe um problema e referências com ACL, não um despejo de todo o acervo.

**Cards:** título, tipo/área, finalidade, estado, autoria, acesso e próxima ação. Expandir para detalhes técnicos, esforço, critério de aceite, origem e evidências. Não chamar visual de “aprovado”, “chancelado” ou “gerado por IA” sem estado/proveniência persistente. Miniatura e contadores respeitam ACL. Referências a versões antigas são visíveis.

**Criador de tarefa:** demanda → tipo/peças → conteúdo → operacional → revisar. Usuário pode pular assistência e produzir manualmente. A IA propõe campos e mostra o que alterou. Publicar é uma ação posterior distinta de salvar.

**Editor de peças:** Letters para texto; Drawer com motores 2D/3D/CAD e capacidades verdadeiras; editores especializados para tabela/formulário/link e formatos restantes. Uma seleção de peça não perde contexto da tarefa. Efeitos operacionais e publicação exigem confirmação. Ver [Letters](WORK_STATION_LETTERS.md) e [Drawer](DRAWER_EDITOR_DE_PECAS.md).

**Construtor de projeto:** objetivo, tarefas elegíveis, fases, dependências, distribuição de responsabilidade, critérios e cronograma. IA utiliza tarefas autorizadas ou propõe novas, sempre distinguindo seleção de existente e criação pendente. Validar ciclos, unidades, estimativas, autorizações e dependências antes de salvar.

**Rede profissional:** seguir não concede acesso; compartilhar não é publicar nem remixar; análise pessoal não é reputação pública. Contrato completo em [Rede e visibilidade](REDE_PROFISSIONAL_VISIBILIDADE.md).

## DECIA didático e objetivo

Cada sessão começa por “Qual problema precisamos resolver?” e “Qual resultado permitirá encerrar?”. Mostra participantes, papéis, recursos autorizados e etapas: contexto → evidências → alternativas → critérios → comparação → decisão → execução/revisão. Mensagens e contribuições têm autoria; distinguir fato, evidência, opinião e proposta da IA.

Modais respondem: **o que esta ação faz**, **o que preencher**, **quem terá acesso**, **o que será confirmado** e **o que fazer depois**. Evitar jargão desnecessário; informação técnica aprofundada fica disponível separadamente. Erros preservam a edição e explicam como corrigir. Não confundir explicação da interface com prova de integração real.

A IA pode resumir divergências, identificar evidência ausente, comparar alternativas com critérios e sugerir encaminhamentos. Deve citar fontes autorizadas ou informar falta de fonte. O grupo decide; o responsável confirma. Uma versão da decisão preserva o que era conhecido, os dissensos e a justificativa. Criar tarefa a partir da decisão é operação revisável, idempotente e rastreável. Reuniões e serviços de terceiros entram por integrações explícitas, com escopo e autenticação próprios.

## Abrangência profissional e fundamento acadêmico

Adotar um núcleo comum — finalidade, resultado, insumos, restrições, método, critérios, evidências, responsável e revisão — e pacotes de área opcionais, versionados. Não impor modelo de licitação a todo trabalho nem apresentar um único modelo de engenharia como universal.

Pacotes de área trazem termos, exemplos, tipos de peças, unidades, métodos, perguntas e fontes adequadas. Exemplos de validação: tecnologia (requisitos/testes); engenharia/arquitetura (unidades, desenhos e revisão profissional); educação (objetivos/evidências de aprendizagem); gestão/finanças (premissas e indicadores); pesquisa (método e fontes); comunicação/design (público, mensagem e direitos); serviços/setor público (fluxos e obrigações identificadas). Conteúdo regulado exige escopo e revisão competente; IA não substitui habilitação ou parecer profissional.

**Contrato de fonte:** título, autor/entidade, tipo (norma, manual, artigo, estudo, dado institucional), edição/data, URL/identificador, trecho/página quando disponível, área e limitações. Separar referência bibliográfica encontrada de texto efetivamente consultado. Citação precisa sustentar a afirmação; não basta anexar uma lista de livros ao resultado. Normas e dados de mercado mostram vigência/data; ausência de fonte aparece explicitamente.

Usar a [bibliografia existente](BIBLIOGRAFIA.md) como mapa inicial, preservando sua advertência de obras não verificadas integralmente. Antes de adotar regra acadêmica/profissional como implementação, revisar a fonte, registrar seu alcance e criar exemplos/vetores determinísticos. A UI ensina em camadas: dica curta → exemplo → explicação do método → referência verificável. Métricas de decisão/projeto são calculadas por serviço determinístico; a IA explica, não inventa números.

## Configurações e governança

| Aba | Responsabilidade na jornada |
|---|---|
| Aparência | Temas, contraste, densidade, zoom, animação reduzida e modo de foco |
| Notificações | Eventos profissionais, agrupamento, lembretes, silenciar e preferências persistentes |
| Trabalho | Área, unidades, disponibilidade, objetivos, preferências de planejamento e limites de trabalho simultâneo |
| Conta | Identidade, acesso e informações confirmadas, separadas das inferências do perfil |
| Privacidade | Descoberta, campos visíveis, público padrão, bloqueios e compartilhamento; sem republicação retroativa implícita |
| Dados | Exportação, retenção e exclusão das análises, documentos e dados do titular |
| Sessões | Sessões autenticadas e revogação; respostas pendentes não atravessam contas |
| Termos | Versões aceitas e explicação de finalidade/compartilhamento |
| IA (controle transversal a inserir) | Contexto permitido, consentimento, limite de gastos, fornecedor e histórico de uso; saldo insuficiente preserva trabalho manual |

## Plano intensivo por fatias verticais

| Onda | Entrega concreta | Aceite para avançar |
|---|---|---|
| A — Coerência e segurança | Rastrear RF/telas, rever linguagem, separar DEMO/API, definir públicos/fontes e corrigir lacunas de autorização | Matriz completa; nenhuma tela real afirma operação simulada; provas negativas de acesso |
| B — Perfil → tarefa | RF50/Copilot, propostas estruturadas, revisão/aceite e criação persistente com origem | Pessoa real analisa, escolhe, cria, fecha/reabre e edita; sem acesso cruzado |
| C — Peças e produção | Letters manual, base de peças, versões; Drawer 2D/PNG antes de CAD/3D avançado | Documento/desenho salva e reabre; exportação verdadeira; conflito e recuperação testados |
| D — Portfólio e rede | Perfil selecionável, publicação, seguir, reação, comentário, compartilhar e remix com proveniência | Duas contas executam todos os verbos, incluindo desfazer/revogar e restrições |
| E — Tarefa → projeto | Projeto persistente, fases, dependências, Mesa, responsáveis e vínculos institucionais | Composição e versão sobrevivem reinício; ciclos e recursos invisíveis são rejeitados |
| F — Projeto → DECIA → execução | Sessões, participantes, mensagens, fontes, modais didáticos, comparação e decisão/encaminhamentos | Dois participantes resolvem um problema e retornam tarefas à execução com rastro |
| G — Aprendizado e expansão | Memória, modelos, metas, reconhecimento, pactos e editores especializados | Benefícios comprovados em piloto; custo, qualidade e acessibilidade reavaliados |

As ondas são ordenadas por dependência, não estimativas de prazo. Corrigir impedimentos da jornada central precede detalhes decorativos ou pontuação. RF avançado mantém seu aceite específico; a fatia básica não o torna “completo”. Não paralelizar alterações de contratos compartilhados sem integração e validação.

## Engenharia e testes

Reutilizar módulos e entidades existentes; APIs específicas por operação, validação no servidor, controle de versão, transações e eventos auditáveis. Perfil, projeto, publicação, peça e sessão não compartilham autorização por simples associação. Persistir propostas e revisão, autoria, versão de origem e contexto selecionado; não registrar dados sensíveis em logs.

Testes unitários para regras/métricas, banco real para consistência/reinício e navegador sem interceptação para a jornada. IA simulada para volume de testes; chamadas pagas curtas apenas quando indispensáveis, sem repetição automática. Integrações de terceiros precisam de testes próprios; não atribuir sucesso de mock a entrega real.

Três roteiros principais: pessoa iniciante sem empresa cria e publica portfólio; empregado compõe projeto e coopera com colega; chefe e participantes resolvem problema no DECIA e verificam encaminhamentos. Repetir em áreas distintas, conta sem consentimento, saldo insuficiente, conteúdo SIGILOSO, revogação, conflito, celular e navegação por teclado.

## Critério de conclusão

A jornada de seis etapas demonstrada ponta a ponta com persistência e duas contas; todos os RF com aceites próprios, positivos/negativos; contratos/telas e todas as abas rastreados; referências e limitações verificáveis; provas de privacidade, custo, acessibilidade e desempenho. Reavaliar as dimensões da auditoria com evidências para buscar notas acima de 8, sem alterar artificialmente a linha de base. PRs de correções seguem a condição de conclusão/validação; PRs de especificação são identificados como planejamento.

Estado atual: há entregas reais de identidade, tarefas/histórico, colaboração explícita, sugestões de texto via OpenAI, notificações e implementação incremental de equipe. Análise de perfil completa, rede social persistente, projetos, editores avançados e DECIA colaborativo persistente continuam exigindo implementação/aceite. O plano não representa esses recursos como entregues.

Anexos: [50 RF e ações de reestruturação](MATRIZ_REESTRUTURACAO_RF.md) · [Páginas e abas](MATRIZ_PAGINAS_ABAS.md).
