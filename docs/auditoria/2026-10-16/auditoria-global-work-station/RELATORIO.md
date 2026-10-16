# Auditoria funcional, UX e IHC — Work Station

16/10/2026 · America/Sao_Paulo · revisão técnica do ambiente local, incluindo alterações ainda não publicadas da aplicação.

O Work Station **ainda não entrega a jornada profissional integrada de ponta a ponta**. A criação manual de tarefas e uma parte da edição e colaboração 2D são operacionais. Projetos, portfólio social persistente, coedição Letters, decisão em grupo com IA e agente automático não estão completos. As correções desta rodada resolvem problemas reais, mas não autorizam dar nota superior a 8 a todos os RF.

O inventário abrange os **74 RF ativos**, consultados no Trello. A matriz atribui notas técnicas provisórias e mostra subnotas, falha principal, proposta, prioridade, componentes, API e evidências para cada RF. **Nenhum RF recebeu aceite integral.** Há 22 jornadas operacionais comprovadamente ausentes no recorte examinado; as demais são parciais. A média aritmética das notas dos RF após a rodada é 3,34/10, sem ponderação por criticidade: é um resumo do inventário, não uma escala validada de qualidade do produto ou satisfação.

## Escopo e limites das evidências

Foram examinados documentação, modelos, controllers, serviços, repositórios, componentes, contratos e a aplicação em execução. `MANIFESTO_FONTES.json` registra o baseline Git e os hashes dos arquivos examinados. O checkout está alterado: a documentação publicada no PR **não publica o código local da aplicação** nem torna a reprodução possível em um checkout que ainda não contenha essas implementações.

O inventário de critérios reúne **634 identificadores distintos**, em 650 ocorrências de documentos locais e itens identificados nas 35 checklists consultadas (213 itens no total). Enunciados, referências históricas e linhas de rastreabilidade não foram confundidos com critérios aprovados. `CRITERIOS_ACEITE.json` conserva as fontes e mantém os critérios pendentes de verificação integral individual. O RF4 referencia RF20.CAxx por renumeração histórica: esses IDs foram preservados; não foram inventados substitutos.

A auditoria é completa quanto ao inventário dos 74 RF e ao diagnóstico técnico registrado. **Não é uma execução integral dos 634 critérios**, uma certificação de acessibilidade, uma avaliação com usuários finais ou uma validação de todas as profissões. Não há SUS, satisfação, participantes fictícios ou estimativa de precisão de IA inventada.

Testes automatizados com navegador exercitam as ações de uma conta sintética previamente cadastrada e ativa; não validam entrega de e-mail. Os tempos medidos são tempos da automação, incluindo rede e navegação, e não tempos de aprendizagem de pessoas. Respostas reais de IA paga e conectores externos não foram acionados nesta rodada. Não se atribuiu nota zero a um provedor apenas por falta de execução: a qualidade técnica de suas respostas permanece **não verificada**.

## Método e rubrica

| Dimensão | Peso | Verificação concreta |
|---|---:|---|
| Completude e correção funcional | 30% | Objetivo concluído, resultado correto, persistência e cobertura dos CA |
| Eficiência e clareza | 20% | Descoberta da ação, quantidade de etapas, contexto e esforço evitável |
| Consistência e hierarquia visual | 15% | Identidade do recurso, legibilidade, organização e distinção de estados |
| Prevenção e recuperação | 15% | Validação, escopo, conflitos, desfazer, rejeição e preservação do trabalho |
| Acessibilidade | 10% | Teclado, foco, nomes, contraste, reflow e alternativas ao arraste |
| Feedback e visibilidade | 10% | Estado real de salvamento, processamento, origem, permissões e resultado |

`Nota = 0,30F + 0,20E + 0,15V + 0,15R + 0,10A + 0,10B`. Subnotas de 0 a 10 e resultado com duas casas. A rubrica é específica deste projeto; não é uma escala oficial de Nielsen, WCAG ou Amershi.

Zero foi usado quando a jornada está ausente/inutilizável no código e na superfície examinados, mesmo que haja página estrutural. 1–3 indica impedimento grave; 4–5, parcial com dificuldades relevantes; 6–7, utilizável com limites; 8–9, consistente nas condições verificadas. Dez exige todos os critérios definidos atendidos nas condições testadas. Falta de evidência é registrada como não verificada, sem transformá-la em aprovação.

| Referência | Aplicação na auditoria |
|---|---|
| [Nielsen: 10 heurísticas](https://www.nngroup.com/articles/ten-usability-heuristics/) | Visibilidade do salvamento; correspondência com trabalho profissional; desfazer/rejeitar; consistência dos estados; prevenção de perda e troca de identidade; reconhecimento de ações; hierarquia e recuperação de erro |
| [WCAG 2.2](https://www.w3.org/TR/WCAG22/) | 1.4.3 contraste; 1.4.10 reflow; 2.1.1 teclado; 2.4.3 ordem de foco; 2.4.7 foco visível; 2.4.11 foco não obscurecido; 2.5.7 alternativas a arraste; 2.5.8 tamanho de alvo; 3.3.1 erros; 4.1.2 nomes/papéis/valores; 4.1.3 mensagens de status |
| [Amershi et al., Guidelines for Human-AI Interaction, CHI 2019](https://www.microsoft.com/en-us/research/publication/guidelines-for-human-ai-interaction/) | G1/G2 deixar capacidade e qualidade claras; G4 informação contextual; G7 acionar com eficiência; G8 dispensar; G9 corrigir; G10 restringir quando incerto; G11 explicar; G15 granularidade de feedback; G17 controle global; G18 comunicar mudanças |

As URLs oficiais foram consultadas nesta rodada; resultado em `REFERENCIAS_CONSULTADAS.json`. Axe é uma verificação automatizada delimitada ao `main`; não comprova todos os critérios WCAG nem substitui leitor de tela, teclado manual, ampliação e testes assistivos.

## Criação de tarefas profissionais

Seis casos foram executados por interface com API e banco reais: software, administração, design, pesquisa, marketing e planejamento. Todos salvaram, recarregaram e reabriram para edição com título, descrição, tipo, categoria, especialidade, formato, prazo e prioridade preservados. Os scripts usam dados sintéticos e nenhuma IA paga.

O criador antes mantinha o tipo implicitamente em texto manual e não expunha categoria/especialidade/formato. Agora permite selecionar os tipos do domínio, uma categoria opcional e uma especialidade livre. Isso evita obrigar um pesquisador ou designer a usar vocabulário exclusivo de software. `OUTRO` e especialidade livre continuam necessários: o catálogo atual ainda favorece administração pública e precisa de expansão editorial por área.

O formato é metadado descritivo. Digitar `dwg`, `docx` ou `svg` **não importa, converte ou habilita edição nativa desses formatos**. A interface agora informa esse limite.

| Necessidade | Situação verificada |
|---|---|
| Objetivo e descrição | Texto livre persistente; objetivo, critérios e entregáveis podem ser registrados na descrição |
| Prazo, prioridade, horas e valor | Campos existentes; prazo e prioridade exercitados nos seis casos |
| Responsável, entregáveis e critérios estruturados | Não há fluxo completo de seleção de responsável e gestão estruturada desses itens no criador |
| Referências, anexos e dependências | Não integram o fluxo completo testado; texto na descrição não equivale a vínculo ou anexo |
| Projeto associado | Criador/detalhe de projeto ainda estruturais; não há vínculo operacional completo |
| Edição e histórico | Tarefa tem versão, histórico e conflito; testes de componente/serviço verificam recuperação; o navegador desta rodada verificou recarga e reabertura |
| Letters e Drawings da tarefa | Estúdio local separado; desenho compartilhado 2D vincula-se à tarefa, mas não representa uma peça unificada nos dois editores |

## Letters: precisão, colaboração e autoria

Letters é atualmente um **editor de blocos de texto simples**, com título/parágrafos, e não um Word completo. Não há evidência de formatação rica abrangente, tabelas, referências bibliográficas gerenciadas e edição DOCX com fidelidade. É possível escrever conteúdo profissional e exportar TXT/JSON, mas não prometer precisão editorial máxima em todos os domínios.

No navegador, foi corrigido um padrão ortográfico local, aplicado após revisão, desfeito, refeito e exportado como arquivo editável. O teste foi local, sem LLM. O motor ortográfico cobre quatro padrões; outras regras de concordância/gênero são heurísticas pequenas, não análise completa da língua portuguesa.

As propostas remotas têm revisão/diff, limites de escopo, versão-base e origem de inferência. A qualidade real da revisão técnica, correção factual, bibliografia e preservação de intenção em diversas profissões **não foi avaliada com chamadas reais nesta rodada**. Exibir provedor/modelo/inferência é proveniência operacional, não prova de autoria técnica, fundamentação ou competência profissional.

O documento Letters local não tem sessão compartilhada com permissões de visualizar/comentar/editar, comentários resolvíveis, convergência entre participantes ou reconexão. A tarefa textual editada por colaboradores via API não equivale a coedição simultânea do documento Letters. RF56 permanece ausente como jornada operacional.

## Drawings: precisão e composição gráfica

Drawings combina **canvas SVG vetorial 2D** e um ambiente separado de **assets/malhas 3D locais**. Não é um editor raster completo nem um substituto integral de AutoCAD/Illustrator. O overlay PNG não transforma o modelo em editor raster e não comprova geração multimodal.

Há seleção, geometria, Bézier, agrupamento e caminhos compostos locais, estilos de preenchimento/traço, regiões, camadas, câmeras de assets e exportações. A suíte inclui testes de seleção, topologia, cores, transformação, cotas e histórico. Nesta rodada, uma luminária com quatro objetos foi construída por comandos e preservada após exportação/importação do JSON. Isso verifica um caso simples de continuidade do modelo, não conformidade ABNT ou precisão de engenharia.

Unidades, escala, tolerâncias, cotagem associativa, intercâmbio CAD e topologia de casos extremos precisam de validação específica. Munsell/Itten inspiram controles e documentação; HSL/RGB não são Munsell calibrado. Informar cores RGB ou material não comprova conversão CMYK/ICC.

A edição numérica permite precisão de posição/tamanho de alguns objetos e alças. Ainda faltam alternativas acessíveis e testes completos para todas as operações de arraste, câmera, seleção complexa e edição 3D. O painel oferece muitos controles em sequência e exige rolagem longa; deve evoluir para ferramentas contextuais e espaço de canvas maior, medidos por tarefas reais.

A revisão encontrou uma proposta que não era invalidada ao mudar nível, instrução ou classificação. A assinatura do contexto foi ampliada e o nível passivo agora também bloqueia a aplicação. Três testes de regressão verificam essas mudanças. Não há agente livre para executar ações automaticamente.

## Colaboração e sessões

Com duas contas reais e MySQL, a API de desenho vinculado à tarefa comprovou: sem concessão explícita o colega recebe 404; reserva sobreposta na mesma região/camada recebe 409; outra camada pode ser reservada; patches independentes preservam ambas as alterações; revogação volta a bloquear leitura. Os patches foram enviados em sequência a partir de versões independentes: isso não é uma prova de corrida temporal estrita.

As reservas duram 60 segundos e têm renovação explícita. Assets 3D, vínculos/cotas avançados, grupos e caminhos compostos não possuem toda a equivalência no modelo compartilhado. O usuário deve compreender a separação entre rascunho local e desenho salvo no servidor.

A associação a uma sessão DECIA passa por verificação de participante no servidor, mas o fluxo criar sessão→convidar→coeditar→deliberar→gerar tarefa não foi concluído nesta rodada. Não confundir esta colaboração parcial 2D com chat DECIA persistente e coedição Letters.

## Influência, autonomia e qualidade da IA

| Modo esperado | Estado atual | Gate para aceite |
|---|---|---|
| Manual | Comandos diretos locais não solicitam IA remota; captura PNG exige opção local explícita | Garantir ausência de requisições e mutações de IA em todas as superfícies |
| Sob solicitação | Pedidos remotos partem de ação e consentimento | Permitir cancelamento, informar escopo/provedor/custo e preservar rascunho em falhas |
| Sugestões | Diff/preview e aceite/rejeição existem nos editores | Cobrir qualidade real, referências e persistência da trilha |
| Assistido | Propostas podem alterar bloco/objeto/área após revisão; há histórico local | Unificar versão, reserva, autorização e rollback persistente |
| Agente automático | **Não implementado como agente completo**; nível 4 amplia proposta, sem loop autônomo | Plano, ferramentas autorizadas, limites, orçamento, interrupção, log, checkpoints e política compartilhada |

Os quatro níveis existentes são sobretudo escopo/tipo de revisão. Não são um percentual mensurável de influência. A interface passou a explicar que os níveis 2–4 geram propostas revisáveis e que o nível 4 não representa um agente automático.

A política ainda não é persistida e acordada por sessão colaborativa com papéis, versão e comunicação aos participantes. Compartilhar desenho não concede acesso a credenciais privadas de conectores. Esse princípio deve ser imposto no futuro orquestrador; não há acesso coletivo implícito a provedores pessoais implementado.

O gateway possui classificação, orçamento e trilha; o adapter OpenAI está implementado. Os prompts pedem para não inventar fatos/fontes, mas isso não prova que o modelo obedece. Drawings recebe até 20 elementos por solicitação; cenas maiores não têm estratégia completa de seleção/segmentação para IA. Letters limita o contexto e a saída. O cenário complexo de uma profissão pode ultrapassar esses limites.

A avaliação de qualidade real deve usar casos com gabarito, restrições e fontes por módulo: correção, pertinência, preservação da intenção, factualidade, citação verificável, reconhecimento de lacunas e utilidade. O plano prevê uma campanha pequena e limitada por orçamento. Nesta auditoria essas métricas permanecem **não verificadas**, com zero consumo pago.

## DECIA e decisão em grupo

A definição e o fluxo foram lidos em `docs/decia/01_AUDITORIA.md`, `02_MATRIZ_BIBLIOGRAFICA.md`, `03_MODELO_FUNCIONAL.md`, nos documentos de navegação e no modelo `lib/decia`. O workspace organiza problema, contexto, evidências, alternativas, critérios, análise, decisão, execução e aprendizado em seis seções.

O modelo de IHC é promissor: separa evidência de opinião, recomendação de escolha humana, divergência, premissas e justificativa. Há cálculos determinísticos de pontuação, prontidão, divergência, sensibilidade e registro de decisão; os testes de `lib/decia` foram executados na suíte frontend. Esses cálculos devem permanecer determinísticos e auditáveis, sem delegar aritmética ao LLM.

A lacuna é operacional: `demoRepository()` guarda decisões em memória e usa pessoas de exemplo. Os botões de sugestão/pré-mortem/red team podem mostrar IA indisponível; recomendações de fixtures não são respostas reais. Não há comprovação de IA organizando argumentos de uma sessão real, sustentando fontes autorizadas e registrando uma decisão de grupo persistida. Alterar critérios em testes puros verifica o cálculo, não um consenso real.

A solução deve persistir problema, participantes/papéis, alternativas, critérios e versões, evidências, posições individuais, dissensos, decisão humana e encaminhamentos. IA, opinião, voto e decisão precisam de registros distintos. Não anunciar consenso por média de notas; critério alterado exige nova revisão da comparação e comunicação ao grupo.

## Perfil profissional e trajetória

Antes, `/profile` mostrava “Pessoa Exemplo” e contagens DEMO mesmo para uma conta cadastrada. A correção usa identidade real e acervo próprio via API, com total real de tarefas e atividade ordenada pela última atualização. O conteúdo é explicitamente privado: não publica cada salvamento na rede. O card agora mostra finalidade/descrição resumida, tipo, estado, especialidade, prazo e data da atualização.

Projetos, seguidores e seguindo aparecem como indisponíveis, nunca como zero inventado. Foto não integrada é sinalizada e usa iniciais. A correção evita identidade fictícia, mas não entrega a página social completa desejada. Perfis de terceiros reais ainda precisam de API; não foram substituídos por um perfil DEMO. Não foi avaliado um portfólio público funcional com foto, seguidores e projetos reais, porque ele ainda não existe como jornada completa.

Um feed de carreira precisa registrar marcos escolhidos: entrega concluída, projeto publicado, participação validada e aprendizado, com autor/papel, fonte, versão, contexto e visibilidade. Ordenar tarefas por atualização é útil como atividade privada, mas **não comunica sozinho uma trajetória profissional pública**. O próximo incremento exige publicação explícita, contribuições e revisão de privacidade para dono, colega e visitante.

## Cards, estados e estética

Os cards demonstrativos distinguem tarefa e projeto por tipo, mosaico, fase, autoria e estado. Há identidade visual própria, porém capas com símbolos genéricos e muitos ícones próximos ao mesmo motivo visual prejudicam reconhecimento rápido. Miniatura real ou representação fiel da peça deve ser usada com controle de acesso, sem prometer integração externa por um logo.

O card de projeto ganhou objetivo e até três tarefas autorizadas com links e estados. Mosaico e contagem passaram a filtrar tarefas inacessíveis; antes podiam expor metadados. Isso melhora o componente DEMO, mas não cria o projeto real persistente que falta no RF5.

Os estados atuais de tarefas misturam disponibilidade, execução e publicação (`DISPONIVEL`, `EM_USO`, `MODELO_PUBLICO`, `OFERECIDA`). Não é seguro renomeá-los silenciosamente para “A realizar/Em andamento/Concluído”: disponibilidade e execução têm significados diferentes. O plano separa estado de execução de visibilidade/publicação, preserva os enums durante migração e mantém transições no backend. Aprovação do projeto não significa conclusão. Nenhum percentual decorativo de progresso foi acrescentado.

A correção de contraste mantém texto estável nas etiquetas pulsantes e remove opacidade global de cards arquivados. Filtros sem painel passaram a ser botões pressionados, sem apontar `aria-controls` para elementos inexistentes. Os problemas automatizados encontrados em perfil/mural na amostra inicial foram removidos na verificação intermediária; o relatório final de navegador registra o escopo e resultados exatos.

## Conectores

O inventário detalhado está em `CONECTORES.md`. Google Workspace, Microsoft 365, e-mail/protocolo de importação, Facebook e GitHub não possuem fluxo de conector de produto comprovado. Word/Excel são aplicativos/formatos, não conectores por aparecerem como `.docx`/`.xlsx`. O acesso GitHub do ambiente de desenvolvimento não é integração GitHub do Work Station.

O adapter OpenAI é uma integração de serviço, com testes controlados. Nenhuma resposta paga foi gerada nesta rodada. JSON/SVG/PNG/GLB são capacidades de arquivo locais com limites; DWG/DXF/IFC/PDF não possuem a cadeia completa de leitura técnica→quantitativo→projeto. Não foram inseridos logos que sugerissem integrações inexistentes.

## Correções e continuidade

`ANTES_DEPOIS.md` lista as correções aplicadas, arquivos e testes. `PROBLEMAS.md` fornece gravidade e reprodução. `PLANO_CORRECAO.md` organiza P0–P3, dependências e gates até nota 10. A matriz individual está em `MATRIZ_RF.md`, com versões JSON e CSV para ferramenta.

O plano exige completar as jornadas reais e testar cada CA antes de promover notas. A evidência atual autoriza melhorias locais e específicas; não autoriza declarar Work Station pronto para todas as profissões, todos os conectores ou decisão autônoma de grupo.
