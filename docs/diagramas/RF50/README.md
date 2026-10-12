# RF50 — Analisar o perfil no Copilot e recomendar tarefas, projetos, pessoas da rede e caminhos profissionais

**Trello:** [Análise de Perfil — RF50](https://trello.com/c/5c7pGk9p/205-rf50-analisar-o-perfil-da-pessoa-no-copilot-e-sugerir-tarefas-projetos-e-caminhos-profissionais).

**Estado:** requisito especificado; implementação pendente. **Nome de produto:** Análise de Perfil. **Origem:** solicitação do usuário em 12/10/2026.

**História de usuário:** Como pessoa usuária do Work Station, quero fornecer meus dados de perfil a um Copilot para compreender minhas competências e receber sugestões de tarefas, projetos, pessoas com perfil semelhante na rede e possíveis caminhos de carreira no mercado de trabalho, com justificativas e próximos passos que eu possa revisar.

## Dados e experiência

O Copilot recebe competências declaradas, experiências, formação, certificações, interesses, objetivos, disponibilidade e portfólio que a própria pessoa seleciona. Pode utilizar tarefas/projetos do Work Station somente quando a pessoa possui acesso e opta por incluí-los. Currículo importado gera uma ficha editável para confirmação; o documento não é aceito como comando de sistema. Dados ausentes aparecem como não informados e geram perguntas, sem fatos inventados.

A análise distingue **o que a pessoa informou**, **o que o portfólio evidencia**, **o que a IA está inferindo** e **o que precisa de confirmação**. Ela pode identificar forças, lacunas e oportunidades, mas não concede qualificações nem certifica aptidão profissional. Cada recomendação informa os dados que a sustentam e suas limitações.

O Copilot oferece quatro saídas relacionadas:

1. **Tarefas:** exercícios e entregas concretas para aprender, demonstrar ou aplicar uma competência, com objetivo, esforço estimado, critério de aceite e evidência esperada.
2. **Projetos:** propostas coerentes com objetivos e disponibilidade, com resultado esperado, fases, tarefas sugeridas, pré-requisitos e riscos. Podem ser projetos do trabalho ou projetos pessoais de portfólio, conforme escopo escolhido.
3. **Caminhos profissionais:** possibilidades de funções/áreas, competências já demonstradas, requisitos a desenvolver e próximos passos. São alternativas para exploração; não prometem emprego, salário, promoção ou sucesso.

4. **Pessoas na rede:** perfis semelhantes por competências, interesses, experiências e objetivos declarados, com explicação da afinidade e possibilidades concretas de colaboração, como trocar conhecimento ou participar de um projeto. Contato ou convite depende da iniciativa e da autorização dos envolvidos.

A pessoa pode perguntar “Que projeto demonstra essa habilidade?”, “Como desenvolver essa lacuna?” ou “Que caminhos combinam com meus interesses?”. A resposta vira proposta editável. Aceitar uma sugestão cria um rascunho de tarefa/projeto após confirmação, mantendo origem, análise e versão do perfil utilizada. Alterações na carreira, candidaturas, contatos ou compartilhamentos não são executados automaticamente.

## Critérios de aceite

| CA | Dado / quando / então |
|---|---|
| RF50.CA01 | Dado o usuário autenticado, quando inicia Análise de Perfil, então escolhe objetivo da análise, escopo profissional/pessoal e dados que deseja utilizar. O servidor deriva identidade da sessão; a pessoa pode editar e excluir campos antes de confirmar. |
| RF50.CA02 | Dado currículo, portfólio ou conteúdo selecionado, quando importado, então valida tamanho/formato, sanitiza conteúdo e apresenta dados extraídos para confirmação. Não executa macros, instruções embutidas ou URLs fornecidas como comandos. Recurso inacessível não integra o contexto. |
| RF50.CA03 | Dado o perfil confirmado, quando analisado, então gera síntese com competências declaradas/evidenciadas, interesses, objetivos, lacunas e incertezas. Cada afirmação referencia campo ou evidência autorizada; informações insuficientes geram perguntas. Inferências ficam identificadas e podem ser corrigidas pelo usuário. |
| RF50.CA04 | Dado competências e objetivos selecionados, quando pede sugestões de tarefas, então recebe propostas com título, finalidade, competência trabalhada, esforço estimado, pré-requisitos e critério verificável de aceite. Estimativa é identificada como tal; não cria tarefas automaticamente. |
| RF50.CA05 | Dado disponibilidade e objetivo, quando pede sugestões de projetos, então recebe propostas com escopo, resultado, fases, tarefas, riscos e dependências, distinguindo trabalho institucional de projeto pessoal. Não atribui colegas nem compromete recursos da empresa sem autorização e confirmação nos fluxos correspondentes. |
| RF50.CA06 | Dado interesses, experiência e competências, quando pede caminhos de carreira, então apresenta alternativas com justificativa, requisitos, lacunas e ações de desenvolvimento. A pessoa compara, discorda, refina e escolhe alternativas; não há classificação automática de empregabilidade, aptidão definitiva ou promessa de contratação. |
| RF50.CA07 | Dado uma afirmação sobre vagas, demanda de mercado, remuneração ou requisito atual, quando apresentada, então cita fonte, data e abrangência geográfica verificáveis. Sem fonte atual disponível, informa a limitação e não apresenta conhecimento geral do modelo como pesquisa atual de mercado. Faixas e projeções são explicitamente estimativas. |
| RF50.CA08 | Dado uma proposta, quando a pessoa aceita, então revisa campos e confirma a criação de rascunho, com proveniência da análise, versão do perfil e inferência utilizada. Aceitar novamente a mesma proposta é idempotente. Sugestão baseada em perfil alterado exige atualização ou confirmação explícita da divergência. |
| RF50.CA09 | Dado dados de perfil e recomendações pessoais, quando armazenados ou consultados, então permanecem privados por padrão. Chefes, empresa e administradores não recebem acesso automático. Compartilhar uma saída exige seleção explícita de destinatário e conteúdo; não amplia acesso às fontes. |
| RF50.CA10 | Dado uso de provedor externo, quando uma análise é solicitada, então pede consentimento contextual, mostra quais categorias de dados serão enviadas, aplica minimização, política de classificação e limites de custo. Conteúdo RESTRITO/SIGILOSO não vai ao provedor externo na política atual. Edição do perfil permanece disponível sem saldo ou com IA indisponível. |
| RF50.CA11 | Dado dados sensíveis ou características protegidas, quando presentes no material, então não os usa para inferir aptidão ou restringir possibilidades de carreira. O Copilot não infere saúde, religião, orientação sexual ou outras características sensíveis. Necessidades de acessibilidade podem orientar preferências informadas, sem reduzir oportunidades por presunção de incapacidade. |
| RF50.CA12 | Dado resposta da IA, quando exibida, então apresenta propostas separadas de fatos confirmados, fontes, limitações e controles para corrigir, rejeitar ou pedir explicação. Não utiliza Hype Score, pontos ou popularidade como medida de potencial profissional. Não transforma a análise em avaliação de desempenho ou decisão de contratação. |
| RF50.CA13 | Dado conta trocada, sessão encerrada ou concessão revogada, quando há resposta pendente, então descarta atualizações da sessão anterior e relê autorização antes de persistir ou aplicar propostas. Eventos guardam autoria e referência de inferência sem copiar currículo ou texto sensível para logs. |
| RF50.CA14 | Dado o usuário, quando deseja excluir análise ou revogar uso futuro dos dados, então consegue fazê-lo nas regras de retenção documentadas. Exportação informa os dados fornecidos e as recomendações produzidas. Histórico e propostas não ficam disponíveis a outra conta no mesmo dispositivo. |
| RF50.CA15 | Dado análise incompleta, falha de provedor ou limite de uso, quando ocorre, então preserva o perfil, informa o estado e oferece nova tentativa explícita, sem repetir automaticamente chamadas cobradas. A interface funciona por teclado, tem estrutura semântica e distingue visualmente informação, hipótese e proposta. |

## Pessoas com perfil semelhante: critérios adicionais

| CA | Dado / quando / então |
|---|---|
| RF50.CA16 | Dado um perfil confirmado, quando solicita pessoas semelhantes, então recomenda somente usuários descobríveis na rede autorizada, não bloqueados e que permitem uso dos campos exibidos para descoberta. Usa competências, interesses, objetivos e experiências compartilhados para esse fim; análise privada de carreira, currículo privado, Hype Score e características sensíveis não entram no pareamento. Não revela nomes, contagens ou evidências de perfis inacessíveis. |
| RF50.CA17 | Dado uma pessoa recomendada, quando a sugestão aparece, então explica a afinidade com campos visíveis — por exemplo “ambos trabalham com orçamento e têm interesse em BIM” — e pode propor atividade colaborativa concreta. Similaridade é afinidade por critérios declarados, não percentual de personalidade, aptidão ou valor profissional. A pessoa filtra critérios, descarta sugestão e pode explorar perfis complementares para não limitar a descoberta a um grupo homogêneo. |
| RF50.CA18 | Dado uma recomendação de pessoa, quando o usuário decide interagir, então pode abrir o perfil autorizado, salvar a sugestão ou enviar convite pelos mecanismos de rede/mensageria com confirmação. Não cria vínculo, segue, atribui trabalho, envia mensagem ou compartilha sua análise automaticamente. Revogação da descoberta, alteração de visibilidade, bloqueio ou perda de acesso remove elegibilidade e invalida recomendações pendentes no servidor. |

O MVP utiliza pareamento explicável sobre campos autorizados, sem precisar enviar os perfis de terceiros ao provedor de IA. A ajuda textual do Copilot pode orientar critérios de busca, mas a lista final deve ser filtrada pelo servidor. Sugerir uma pessoa não concede acesso às tarefas, projetos ou documentos dela.

## Integração com o Work Station

- RF3 fornece dados de perfil editáveis; RF41 e RF21/RF22 fornecem evidências e rascunhos autorizados.
- RF26/RF43 fornecem a experiência de Copilot e a infraestrutura de IA, consentimento, cotas e logs de inferência.
- RF44 pode utilizar tarefas de desenvolvimento que o usuário tenha aceitado, sem transformar recomendações de carreira em prioridade institucional obrigatória.
- RF33 pode fornecer referências institucionais autorizadas. Pesquisa atual de mercado exige fonte ou integração adicional identificada; não está presumida como disponível.
- O RF50 concentra avaliação pessoal revisável e caminhos de carreira, ampliando a finalidade dos insights gerais de perfil já descritos no RF43. Reutiliza esses serviços e não cria outro cadastro de usuário.

## Modelo e plano propostos

`ProfileAnalysis` preserva proprietário, finalidade, seleção/versão de dados, estado e referência de inferência. `ProfileEvidence` referencia a origem autorizada. `CareerPathSuggestion` guarda alternativa e justificativa; `DevelopmentProposal` guarda tarefa/projeto sugerido, revisão e rascunho resultante. Classificação, retenção e controles de acesso são comuns ao restante da aplicação.

Entrega incremental: ficha revisável e consentimento → análise estruturada com dados simulados em testes → propostas de tarefas/projetos com aceite → caminhos de carreira e fontes identificadas → importação de currículo → piloto. O MVP de carreira pode funcionar com possibilidades gerais, declarando ausência de pesquisa atual de mercado; sugestões de vagas específicas dependem da integração correspondente.

Validar com perfis iniciantes, experientes, em transição e com dados incompletos. Medir utilidade percebida, correções de inferências, propostas aceitas e desenvolvimento efetivamente concluído, sem tratar esses números como comprovação de empregabilidade. Testar isolamento entre contas, consentimento, fontes, custos, vieses, revogação, idempotência e acessibilidade.

A criação deste requisito não comprova implementação, integração com plataformas de emprego, pesquisa atual de vagas ou eficácia das recomendações. Nenhuma chamada paga de IA é necessária para redigir a especificação.
