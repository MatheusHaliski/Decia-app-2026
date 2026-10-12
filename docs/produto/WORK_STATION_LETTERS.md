# Super Editor de Peças e Work Station Letters

Proposta de produto — 12/10/2026. Nome indicado pelo usuário: **Work Station Letters**, ou **Letters**. Estado: desenho funcional, implementação pendente.

## Uma tarefa passa a conter peças editáveis

Uma tarefa não é apenas um título e um anexo. Ela pode reunir um documento, uma planilha, um desenho, um formulário, uma lista de verificações e suas evidências. Cada peça tem tipo, conteúdo, versão, autor, classificação e vínculo com a finalidade da tarefa. O usuário abre o editor adequado sem perder o contexto de responsável, prazo, dependências e decisão que originou o trabalho.

O **Super Editor de Peças** oferece três espaços sincronizados: a peça no centro; seu mapa de estrutura à esquerda; um inspetor técnico e operacional à direita. As opções são progressivas, adequadas ao tipo de peça, em vez de expor todos os campos simultaneamente. O modo de foco reduz os painéis durante a produção.

| Camada | O que pode ser editado |
|---|---|
| Conteúdo | Texto, tabelas, campos, listas, referências, imagens e objetos suportados pelo editor daquela peça |
| Técnica | Unidades, fórmulas, tipos e validação de campos, numeração, referências cruzadas, estilos e esquema do documento |
| Operação | Etapas, responsáveis, insumos, dependências, prazos, instruções de execução e critérios de aceite |
| Evidência | Origem, versão da fonte, decisão vinculada, justificativas, comentários e comprovação da entrega |
| Publicação | Formato de saída, revisão, versão aprovada, destinatários e anexos autorizados |

Os detalhes operacionais podem permanecer em uma camada interna e entrar no documento publicado somente quando o usuário escolhe incluí-los. Alterar responsável, prazo ou dependência apresenta o efeito na tarefa para confirmação; editar o texto não modifica essas propriedades silenciosamente.

“Máximos detalhes” significa profundidade nos formatos efetivamente suportados. Não significa prometer edição nativa de qualquer arquivo. PDF, DOCX, XLSX e desenhos técnicos têm capacidades distintas: o produto informa se está editando uma peça estruturada, anotando o original ou convertendo para um formato editável. Mantém o original e mostra perdas de fidelidade antes da conversão.

## Letters: a oficina de documentos do Work Station

O **Letters** é o editor de documentos de texto integrado ao trabalho. Pode começar vazio, a partir de um modelo institucional ou de um artefato produzido no DECIA. Serve para ofícios, relatórios, atas, pareceres, notas técnicas, instruções de trabalho e documentos livres. Documentos independentes podem ser vinculados a uma tarefa posteriormente, com confirmação das permissões.

A experiência combina edição de texto e estrutura de documento: estilos, títulos, sumário, tabelas, cabeçalho/rodapé, numeração de páginas, notas, referências cruzadas, comentários e revisão de alterações. Modelos oficiais podem ter campos obrigatórios e seções protegidas; o usuário vê o motivo e quem pode alterá-las. Não confundir proteger um campo de modelo com conceder acesso ao documento.

A proposta mais própria do Work Station é o **documento ligado à execução**: uma cláusula pode referenciar uma decisão do DECIA; uma linha de tabela pode apontar a tarefa que produz aquela entrega; uma seção pode mostrar o critério que permitirá aprová-la. Esses vínculos indicam a versão de origem. Se a fonte mudar, o Letters sinaliza divergência e pede revisão, sem reescrever o documento automaticamente.

### Jornada de exemplo

1. O usuário abre um ofício no Letters e escolhe o modelo autorizado da instituição.
2. Preenche objeto, destinatário e contexto. O inspetor mostra lacunas documentais e operacionais.
3. Seleciona um trecho e pede à IA uma redação mais clara, preservando os fatos e as referências disponíveis.
4. A IA apresenta uma proposta em revisão de alterações. O usuário aceita parte dela, rejeita outra e continua escrevendo.
5. Vincula os encaminhamentos a tarefas existentes ou propõe novas tarefas. Confirma os campos e os destinatários antes da criação.
6. Um revisor comenta e aprova uma versão definida. Alteração posterior exige nova revisão para manter o status de aprovado.
7. Exporta uma cópia de entrega em PDF ou DOCX, com conferência de layout e identificação da versão.

## IA durante a edição: assistência contínua sob controle

“Em tempo real” descreve uma interação dentro do editor, sem alternar de ferramenta. A resposta pode aparecer progressivamente, mas o produto não promete latência instantânea nem manda cada tecla para um provedor externo.

- Ações sobre seleção: melhorar clareza, resumir, adequar linguagem, transformar em lista/tabela e propor continuação.
- Ações sobre estrutura: detectar campos incompletos, referências quebradas e inconsistências entre seções; regras simples são verificadas localmente.
- Ações sobre conteúdo técnico: confrontar com fontes autorizadas, separar fatos de hipóteses e pedir evidência para afirmações sem sustentação. Citações jurídicas ou técnicas precisam de fonte verificável; a IA não certifica correção.
- Ações sobre execução: sugerir critérios de aceite e encaminhamentos; criação ou alteração de tarefas exige revisão e confirmação.

O modo padrão usa comandos explícitos e envia apenas a seleção e o contexto necessário. Um modo opcional de sugestões durante a escrita exige ativação, espera uma pausa, limita frequência e orçamento e permite suspender com um clique. A interface mostra consumo e limite; falta de saldo interrompe a assistência, preservando a edição manual.

Cada proposta é vinculada à versão e ao trecho que a originou. Se o usuário editar esse trecho enquanto a IA responde, a sugestão fica desatualizada e não pode sobrescrever a mudança. Aceitar, rejeitar e desfazer são ações distintas, com autoria e histórico. Conteúdo gerado por IA não ganha aprovação humana automaticamente.

Permissões são relidas antes de montar o contexto e aplicar a sugestão. Conteúdo RESTRITO/SIGILOSO não vai à API externa na política atual; o Letters manual permanece utilizável. Sugestões não ampliam acesso a anexos, decisões ou tarefas vinculadas. Nenhuma chamada paga de IA é necessária para elaborar ou revisar esta proposta.

## Colaboração e confiabilidade

Comentários por trecho, sugestões de revisão, atribuição de revisão e edição simultânea são capacidades planejadas. A sessão mostra quem está editando sem expor dados de documentos não autorizados. Revogação remove acesso à sessão e às atualizações futuras. Conflitos preservam os trabalhos envolvidos; indicação “salvo” só aparece depois da confirmação do servidor.

Recuperação de rascunho local é opcional e respeita a classificação. O aplicativo informa o que está apenas neste dispositivo, o que está sincronizado e o que falhou. Encerrar sessão não permite que outra conta recupere conteúdo privado da anterior. Toda operação persistente usa versionamento e autorização do servidor.

A versão publicada é um retrato preservado do documento, separado do rascunho. Exportações não carregam comentários internos, metadados operacionais ou anexos ocultos por padrão. Importações e exportações exigem limites de tamanho, sanitização e testes de fidelidade; macros e conteúdo ativo não são executados pelo editor.

## Rastreabilidade e escopo dos RF

RF4 e RF8/RF12 já tratam da criação e edição de tarefas; a profundidade do Super Editor deve ser especificada como evolução desses RF. RF13 gera artefatos e pode entregar uma peça ao Letters, preservando origem e versão. RF29 liga o documento às decisões; RF33 fornece fontes autorizadas; RF37 utiliza o editor para atas; RF43 governa a IA. A continuidade de edição documental, revisão, publicação e exportação justifica um requisito dedicado ao Letters, a numerar após conferência do board. Não criar uma segunda entidade de tarefa ou um fluxo paralelo de permissões.

## Plano de entrega proposto

1. **Fundação:** peças tipadas, conteúdo estruturado versionado, ACL, histórico, recuperação e editor manual de texto/tabelas. Reutilizar identidade, inventário e revisões existentes; não armazenar HTML arbitrário como fonte confiável.
2. **Letters documental:** estilos, modelos, comentários/revisão, numeração, sumário e exportações testadas. Validar com dois documentos institucionais representativos.
3. **IA assistiva:** propostas sobre seleção, resposta progressiva, revisão por diferenças, conflitos, orçamento e citações autorizadas. Testes simulados por padrão; teste pago curto somente quando necessário.
4. **Super Editor operacional:** referências a tarefas/decisões, critérios e efeitos confirmados no planejamento.
5. **Colaboração:** sessões simultâneas, revisão institucional e publicação; piloto com autoria, revisores e chefias.
6. **Outros formatos:** expandir por editor especializado após demonstrar fidelidade e utilidade. Planilhas e desenhos técnicos não são tratados como simples texto.

## Critérios mínimos de aceite da proposta

- Produzir, salvar, fechar e reabrir um documento mantendo conteúdo, estrutura e versão.
- Registrar histórico e restaurar uma versão sem perder a trilha de autoria.
- Preservar alterações locais em conflito de versão; mostrar o problema e oferecer comparação.
- Apresentar propostas da IA separadas do texto confirmado, com aceitar/rejeitar/desfazer.
- Rejeitar aplicação de proposta em trecho modificado e preservar o conteúdo atual.
- Impedir leitura, edição, colaboração, exportação e uso em contexto de IA por pessoas sem concessão.
- Respeitar limites de custo sem bloquear escrita manual; não enviar cada tecla por padrão.
- Revisar uma versão específica; invalidar a aprovação do rascunho quando seu conteúdo mudar.
- Exportar PDF/DOCX com conferência de layout, sem comentários internos ou metadados ocultos por padrão.
- Navegar por teclado, expor estrutura semântica às tecnologias assistivas e oferecer modo de foco e zoom.

A proposta foi desenhada a partir da ideia do usuário e dos RF/documentos existentes. Não houve implementação do Letters, teste de fidelidade de formatos ou pesquisa de campo nesta etapa. Não se atribuem ganhos de produtividade comprovados antes do piloto.
