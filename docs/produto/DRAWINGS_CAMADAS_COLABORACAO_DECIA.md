# Drawings — camadas, regiões e edição coletiva no DECIA

## Composição em profundidade

Um desenho mantém quatro eixos independentes: camada, região espacial, objeto e detalhe. Camadas expressam organização autoral, não classificação de acesso. Céu e campos podem ocupar Fundo; árvores, Meio; pessoas e mobiliário, Frente. A ordem é explícita e pode diferir da profundidade física de uma cena 3D. A análise não deve deduzir automaticamente que toda árvore fica atrás de toda pessoa.

Contrato de interação: o painel permite selecionar uma camada para edição e mostrar/ocultar as outras como referência. Ocultar não apaga objetos nem altera quem pode acessar o arquivo. Ao travar uma região, o alcance passa a ser a interseção entre camada ativa e região; entrar num objeto restringe ainda mais às suas partes. Em Visualizar composição, nenhum objeto é editável. Uma alteração não pode modificar, remover ou substituir objetos de outra camada.

Esse comportamento não deve ser confundido com persistência ou colaboração. O campo `layer` dos assets pode ser exportado e reaberto; camadas vazias, preferências de visibilidade e ordem independente precisam de metadados persistentes. Uma trava local limita edição no cliente, mas não reserva região para outra pessoa.

## Fluxo coletivo proposto

1. O responsável associa uma peça editável à mesa DECIA e concede colaboração explicitamente. A autorização de SIGILOSO nunca decorre do papel ADMIN.
2. Colegas abrem a mesma revisão e veem presença, seleção e reservas: “Ana edita Frente / B2 — reserva até …”. Cor é acompanhada de nome e texto.
3. Cada pessoa solicita uma reserva de edição. O servidor verifica acesso à peça, participação na sessão e conflitos em uma operação atômica.
4. Ana reserva Frente/B2. Bruno pode reservar Fundo/B2 ou Frente/C3. Ele não pode reservar Frente/B2, seu descendente nem a região ancestral que a contém. Uma reserva de todas as camadas conflita com qualquer camada sobreposta.
5. Objetos que atravessam fronteiras usam suas caixas completas, incluindo filhos. A reserva por centro da prévia local não é suficiente para exclusão colaborativa. Mover um objeto exige que origem e destino estejam dentro da reserva, ou ampliar a reserva atomicamente.
6. Alterações são patches identificados por objeto, revisão esperada, reserva e token de geração. Comparar revisões e validar autorização novamente faz parte da mesma transação que grava o patch.
7. Renovações mantêm a reserva por 15–120 segundos. Desconexão deixa expirar; a interface fica somente leitura e guarda o rascunho local. Reconectar exige nova reserva. Expirar uma reserva não apaga desenho.
8. Eventos após o commit atualizam os colegas via SSE/WebSocket. Se houver lacuna de sequência, o cliente carrega novo snapshot. Desfazer é um patch inverso próprio; não restaura cegamente uma revisão que apagaria o trabalho de outra pessoa.
9. IA é uma participante propositiva: o pedido referencia escopo, camada e revisão. A resposta não ganha acesso adicional. Aplicar exige reserva ainda válida e revisão humana; nenhuma proposta deve sobrepor o trabalho concorrente.

“Não consegue acessá-la” deve ser explicitado na interface: reserva impede edição concorrente; visualização depende das permissões do arquivo. Se houver necessidade de ocultar conteúdo de colaboradores, isso requer política de acesso separada, nunca apenas uma camada oculta.

## Contrato de servidor e persistência

Proposta de endpoints, ainda não publicados:

- `POST /api/decia/sessions/{sessionId}/drawings/{drawingId}/leases`: reservar escopo.
- `PATCH .../leases/{leaseId}`: renovar com token vigente.
- `DELETE .../leases/{leaseId}`: liberar a própria reserva.
- `POST .../patches`: aplicar operações com revisão esperada, token e chave idempotente.
- `GET .../events`: presença, reservas e patches autorizados.

Persistir desenho, camadas, objetos, revisões, colaboradores, reservas e eventos. A reserva deve usar relógio de banco, bloqueio transacional por desenho para aquisições e um token monotônico para invalidar clientes antigos. O commit deve bloquear/verificar a reserva e os objetos antes de gravar. Redis pode transmitir presença; não deve substituir o controle transacional da peça. Revisão por objeto permite commits simultâneos em regiões disjuntas; revisão global ordena eventos.

Movimentar camada, reordenar camadas, alterar câmera global, dimensões globais ou importar o documento exige reserva de escopo correspondente. Limitar número de reservas por pessoa, expiração e tentativas; não permitir apropriação administrativa silenciosa. Uma intervenção do responsável, se prevista, deve ser explícita e auditada.

## Código e estado real

`lib/studio/selection.ts` implementa primitivas puras de seleção local: hit-test de retângulo, círculo, segmento, polígono e path poligonal; seleção por caixa ou polígono; resolução de descendentes de grupos; filtros por camada visível/travada, nó ancestral travado e região local travada. `snapPoint` aplica snap a uma grade somente quando explicitamente habilitado. Testes em `lib/studio/selection.test.ts` cobrem esses comportamentos.

Esse motor ainda não está conectado a um canvas/estado de editor nesta árvore do repositório. Não há componente Drawings ativo nem store de desenho localizado, portanto o motor não constitui uma experiência de UI completa: controles para alternar modos, desenhar a caixa/laço, escolher camada ou travar/destravar escopo ainda precisam ser integrados. A resolução espacial de path usa seus pontos/segmentos; curvas Bézier e transformações de câmera não fazem parte deste modelo. A seleção de caixa/laço é geométrica aproximada por segmentos e pontos da geometria.

`DrawingLeaseRegistry` é especificação pretendida, não implementação localizada neste checkout. O código atual não oferece reserva de processo único, renovação ou token de lease.

O motor de seleção não é exposto como API nem usado pela mesa DECIA. Não resolve múltiplas instâncias, autorização de peça ou persistência. A integração deverá cumprir os contratos acima antes de apresentar edição colaborativa como disponível. A interface atual não oferece um editor Drawings integrado neste checkout.
