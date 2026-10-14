# Letters & Drawings — arquitetura de engenharia

Especificação derivada do prompt `docs/gemini-code-1791945047446.md` e dos dois exemplos em `docs/exemplo_drawings_letters`, lidos no commit `a4b5483` de `origin/main`. Data: 14/10/2026. Drawings é o nome atual do módulo anteriormente chamado Drawer. Estado: fundação executável e prévia local; suíte completa ainda não entregue.

## 1. Produto e contratos de responsabilidade

A suíte edita peças vinculáveis a tarefas e projetos, preservando identidade, ACL, classificação e versão. Letters trabalha com estrutura textual; Drawings com cena geométrica. Os dois compartilham histórico, referência de fonte, propostas, revisão, orçamento e autonomia. Documento e geometria são fontes editáveis; PDF, DOCX, PNG, GLB e DWG são formatos de intercâmbio com capacidades próprias.

A imagem e os TSX enviados são referências de interação. Sugestões pré-carregadas, temporizadores e valores aleatórios daqueles exemplos não constituem motores de IA, análise linguística, precisão dimensional ou conformidade normativa. O produto não transforma opiniões em fatos ou retira personagens de uma história sem verificar narrador, flashback, sonho, citação e versão das fontes.

## 2. Autonomia compartilhada

| Nível | Poder do motor | Escopo e limites | Experiência |
|---|---|---|---|
| 1 Advisory | Diagnóstico somente | Nenhuma mutação por IA | Aviso ancorado, confiança, evidência e explicação |
| 2 Collaborative | Produzir proposta | Aplicação somente após aceite | Comparação, aceitar, rejeitar, explicar |
| 3 Aggressive | Aplicar operação autorizada a bloco/grupo | Escopo escolhido, limites e autorização explícita para a execução; rollback | Prévia de alcance, execução, relatório e desfazer |
| 4 Autonomous Agent | Planejar e executar transformação do documento/cena | Somente rascunho autorizado, checkpoint antes da execução; não publicar, convidar ou alterar permissões | Plano global, orçamento máximo, interrupção, checkpoint e diferenças |

Mudar o seletor não executa trabalho nem transmite conteúdo. A pessoa inicia uma execução ou habilita uma sessão limitada de assistência. Sessão define escopo, duração, teto de tokens/custo e operações permitidas. Alterar classificação, usuário, permissão ou versão invalida a autorização pendente. Níveis 3/4 podem transformar rascunhos automaticamente dentro dessa sessão, mas nunca alteram versões publicadas nem produzem aprovação humana. Edição manual permanece disponível em todos os níveis.

## 3. Modelo canônico

- `WorkPiece`: id, taskId opcional, ownerId, kind LETTERS/DRAWINGS, title, accessClass, schemaVersion, version e state.
- `PieceRevision`: conteúdo cifrado imutável, hash, versão-base, autor, timestamp, commandId, origem manual/IA/importação, inferenceId opcional e checkpoint.
- `TextDocument`: blocos com IDs estáveis, nós de texto e marcas permitidas, títulos, tabelas, notas, referências e âncoras. Nenhum HTML arbitrário é fonte confiável.
- `DrawingScene`: unidades, dimensões, origem, transformações, camadas, objetos, geometria, estilo, constraints, câmera e descrições acessíveis. Unidades de tela não se tornam metros por inferência.
- `PieceProposal`: versão-base, hashes das âncoras, contexto autorizado, plano/patch tipado, justificativa, fontes, fornecedor/modelo, validade, consumo e resultado.
- `SourceLink`: recurso, versão/hash, finalidade, status de acesso e divergência. Um vínculo não concede acesso.
- `AgencySession`: usuário, peça, nível, escopo, operações permitidas, custo máximo, validade e revogação.

A prévia implementa um subconjunto `ws-studio` v1: blocos de título/parágrafo, retângulos com camadas, coordenadas e restrições direcionais. Importação reconstrói campos permitidos e limita tamanho/quantidade/geometria. JSON editável é distinto do PNG exportado. O modelo definitivo precisa migrar esse subconjunto sem perder IDs.

## 4. Letters: pipeline linguístico

1. Normalização Unicode sem perder offsets do original; segmentação de parágrafos, frases e tokens. Índices de UI e servidor devem declarar UTF-16/code points e converter explicitamente.
2. Analisador português versionado para POS, lemas, traços morfológicos e dependências. Avaliar um modelo local de português e suas licenças, corpus e precisão; nenhuma biblioteca é declarada instalada nesta entrega.
3. Regras contextualizadas para concordância, regência, crase, sujeitos/predicados, modo/tempo e tratamento. Resultado inclui span, regra, severidade, evidência e confiança; ambiguidade vira aviso, não correção obrigatória.
4. Tipologia definida pela pessoa: notícia, relato, técnico, argumentativo etc. Primeira pessoa pode ser legítima em citação/opinião; preservar atribuição e modalidade.
5. Narratologia: ledger de entidades/eventos com tempo da história, tempo da narração, focalização, afirmação/negação, fonte e confiabilidade. Contradição exige duas evidências ancoradas. Reaparecimento após morte pode ser flashback ou hipótese; motor pergunta antes de reescrever.
6. LLM recebe somente seleção/contexto consentido e produz estrutura validada, sem ferramentas de publicação. Prompt e conteúdo são separados; instruções dentro de documentos são dados, nunca autorização.

Debounce local de 400–800 ms; cancelamento e identificação por versão. Assistência remota é explícita por padrão, não por tecla. Orçamento e consentimento governam qualquer modo contínuo. Streaming apresenta proposta progressivamente, mas só um resultado completo/validado pode ser aplicado.

Notas por parágrafo devem indicar dimensão, escala, rubrica, versão e incerteza. Sem conjunto de avaliação/calibração, apresentar contagens de avisos e “não avaliado”, nunca inventar 8,7 ou 9,8. Diffs por token são complementados por leitura integral, informações textuais e marcações sem depender apenas de vermelho/verde.

## 5. Drawings: matriz, geometria e propagação

Canvas em coordenadas do documento; zoom/pan são transformações da vista. A matriz M×N calcula célula pelo bounding box, incluindo todos os quadrantes atravessados. IDs são permanentes; badges #1…#n são rótulos da vista, nunca chaves de persistência. Índice espacial inicial usa grade uniforme; avaliar R-tree/quadtree conforme densidade e benchmark.

Operações tipadas: translate, resize, rotate, editPath, setStyle, changeLayer, insertScaffold, addConstraint. Toda operação declara unidades e escopo. Não executar código retornado por modelo.

O motor inicial propaga restrições direcionais x/y em DAG, por ordenação topológica. Referências ausentes, ciclos, offsets não finitos ou dois controladores do mesmo eixo são recusados antes do commit; a aplicação é atômica. Uma constraint indica `posição(to)=posição(from)+offset`. Um solver CAD geral, com equações simultâneas e graus de liberdade, é outra capacidade e não está implementado.

Invalidar caches somente para bounding boxes afetadas e células relacionadas. Recalcular indicadores globais sobre o estado resultante, não somar percentuais arbitrários. Desenhos densos usam Web Worker e tarefas canceláveis; limites de complexidade precisam ser medidos antes de prometer latência.

## 6. Score global e cor

`S_global = wc·S_cor + wh·S_hierarquia + we·S_equilíbrio + wt·S_rigor`, com notas em [0,10], pesos não negativos e soma 1. Registrar rubricas/pesos versionados, finalidade artística/técnica e dimensões não avaliadas. Se um componente obrigatório estiver ausente, S_global fica indisponível; não preencher com uma nota padrão. Δ compara os mesmos pesos/rubricas e a mesma finalidade. Piora sugere compensação; não altera a cena automaticamente fora do escopo autorizado.

A prévia mede somente duas proxies: centro de massa ponderado pela área dos retângulos e proporção de elementos dentro do canvas. Ambas têm fórmula explícita; não avaliam estética, segurança estrutural ou normas. Cor e hierarquia ficam não avaliadas, portanto não existe nota global completa.

Munsell não equivale a HSL. Uma implementação correta exige tabela/dados de renotação, iluminante e observador definidos, conversão via espaço colorimétrico e tratamento de gamut. RGB/CMYK exige perfis ICC e política de prova de impressão. Harmonias de Itten são recomendações compositivas; não certificam legibilidade. Verificar contraste separadamente para conteúdo acessível. Preservar perfil e cores originais na importação.

## 7. Normas e fundamentos

Wucius Wong (Princípios de forma e desenho), Donis A. Dondis (Sintaxe da linguagem visual), Munsell e Johannes Itten fundamentam vocabulário e rubricas; não são algoritmos que produzem automaticamente uma nota objetiva.

As referências NBR 10067, NBR 10126 e NBR 12298 foram indicadas pelo prompt. Situação vigente, substituições, edição e aplicabilidade devem ser verificadas no catálogo oficial ABNT antes de implementar presets normativos. A especificação não afirma que essas edições estão vigentes nem reproduz texto licenciado. Cada preset deve registrar norma/edição, área de aplicação e testes com revisão profissional. Linha tracejada ou hachura a 45° isoladas não tornam um desenho “ABNT”. Cotagem requer unidade, escala, tolerância, origem dimensional e convenção aplicável.

## 8. Intenção e andaimes

A intenção é hipótese revisável: finalidade, público, entregável, restrições e recursos. Quando faltarem escala, dimensões, tema ou orçamento, perguntar antes de gerar um artefato técnico. Andaimes têm objetos editáveis, proveniência, unidades e limitações, separados de referência visual.

- Campanha: composição e espaços de produto/preço/chamada; IA não inventa ofertas nem credenciais sanitárias.
- Guerreiro: proporções escolhidas e esqueleto orientativo; manequim de oito cabeças é uma convenção, não regra anatômica universal.
- Sala: variantes de mobiliário e circulação com medidas confirmadas; não afirmar conformidade ou acessibilidade sem verificação dimensional/normativa.

Na prévia, os três modelos são templates locais escolhidos pelo usuário, não inferência de IA nem ilustrações acabadas. Nível 4 substitui o escopo com checkpoint de desfazer; outros níveis acrescentam o modelo.

## 9. Interface e seis abas

Oficina: alternância Letters/Drawings, seletor global de autonomia, ferramentas, documento/canvas, inspetor e estado de salvamento. Layout responsivo coloca o inspetor abaixo do editor em telas estreitas. Navegação por teclado e lista de objetos complementam seleção no canvas. Importar/exportar têm comandos separados; estado “salvo” depende de ACK do servidor.

| Aba Drawings | Contrato |
|---|---|
| Contexto | Finalidade, unidade, escala, revisão da intenção e andaime |
| Melhoria geral | Plano comparável de enriquecimento, custos e limites |
| Blocos/nós | Seleção por objeto/célula, propriedades e alcance da propagação |
| Análise final | Rubricas, indicadores, fórmula, valores ausentes e diferenças |
| Gestão cromática | Harmonia, contraste, gamut, perfis e prova |
| Estilo/perspectiva | Renderer/capacidade, vista, iluminação e perdas de exportação |

As seis abas existem na prévia, mas capacidades não implementadas mostram seu estado em vez de simular sucesso. WYSIWYG estruturado, highlighting POS completo, volumetria e aquarela continuam pendentes. A prévia textual é edição por blocos, não um Word completo.

## 10. Arquitetura de serviços e API planejada

Reutilizar aplicações/infra Java, autorização do inventário, armazenamento cifrado, mídia, histórico e AiGateway. Não criar outra identidade ou ACL independente. Contratos abaixo são propostos, não endpoints disponíveis:

- `POST /api/tasks/{taskId}/pieces`: criar após autorização de edição da tarefa.
- `GET /api/pieces/{id}`: conteúdo autorizado com versão/ETag.
- `POST /api/pieces/{id}/commands`: commandId idempotente, expectedVersion, patch tipado; 409 preserva rascunho.
- `GET /api/pieces/{id}/revisions`, `POST .../restore`: restauração cria nova revisão, não apaga trilha.
- `POST /api/pieces/{id}/analyses`: seleção, versão, rubrica, consentimento e orçamento.
- `POST /api/pieces/{id}/proposals/{proposalId}/apply`: versão/âncoras atuais e autorização reavaliada.
- `POST /api/pieces/{id}/exports`: formato/capacidades, job limitado e artefato com expiração.

Transação de comando inclui revisão e outbox. Jobs de análise/exportação ficam fora da transação longa; reler permissão/classificação antes de execução e persistência. 404 uniforme para recurso não autorizado. Política SIGILOSO: proprietário e colaboradores concedidos explicitamente; ADMIN sem concessão não acessa. Original importado nunca é sobrescrito pela conversão. Não incluir conteúdo sensível em logs, telemetria ou URLs.

Colaboração futura usa operações/CRDT sobre IDs estáveis, ACL por sessão, revogação e limites de presença. CRDT não substitui validação de comandos, constraints ou revisão de versões publicadas. Conteúdo RESTRITO/SIGILOSO não é enviado ao provedor externo. Sem saldo, manter editor manual e retornar erro recuperável.

## 11. Formatos, distribuição e aceites

Atual: JSON v1 editável, TXT e PNG rasterizado verdadeiro. PNG de prévia é monocromático, sem overlays; não representa gestão de cor de produção. Pendente: PDF/DOCX com fidelidade, GLB com cena/unidades/material, DWG por motor licenciado e versões verificadas. Não renomear JSON/PNG. Macros, links externos, SVG ativo e cargas excessivas devem ser rejeitados ou isolados.

A aplicação integrada usa módulos React/TypeScript e Tailwind do repositório em `/studio`. Um arquivo de distribuição autocontido requer empacotamento dos módulos, dependências e licenças, política CSP e testes offline. Esse artefato standalone ainda não foi gerado; não confundir um TSX com aplicação independente pronta.

Aceites da fundação: conflito de proposta; propagação em cadeia; ciclos/controle duplicado; round-trip; geometria adversa; edição/undo/redo; importação; exportação PNG válido; navegação responsiva. Aceites de produção adicionais: salvar/reabrir após reinício, duas contas e revogação, concorrência, recuperação, quatro níveis de execução real, análise portuguesa em corpus revisado, narratologia com evidências, benchmarks, orçamento, acessibilidade e fidelidade dos formatos.

Ordem: fundação canônica → persistência/ACL de peças → editor documental e geometria → diagnóstico local validado → propostas LLM → autonomia limitada → colaboração/exportação avançada → CAD/3D/cores. Cada avanço exige provas próprias; esta fundação não encerra RF4/RF8/RF12/RF43 nem o conjunto dos RF.

## Incremento de 14/10 — jornada Drawings com IA real

A interface agora tem objetivo final, instrução, consentimento por solicitação, proposta com proveniência e versão-base, revisão e rejeição, trilha local e confirmação de entrega. Cenas suportam retângulos, elipses, texto, segmentos, cores sRGB, gradientes de dois stops, hachuras orientáveis, opacidade e traçados. Unidade/fator de conversão e cotas conceituais podem ser informados; JSON e PNG preservam estilos. Endpoint `POST /api/me/drawing-proposals` usa conta autenticada e AiGateway, sem ler peças/anexos por identificadores do cliente. O serviço valida formato, limites e geometria; classificação se refere aos dados fornecidos pela própria pessoa. Não é persistência de peças nem liberação para enviar recursos protegidos do servidor.

O estudo técnico atualizado está em `DRAWINGS_ESTUDO_TECNICO_ACADEMICO.md`. A primeira tentativa real retornou uma cena recusada pelo validador; o esquema remoto foi alinhado aos limites do editor antes de novo teste. Não ocultar essa tentativa nos custos ou representá-la como proposta aplicada.
