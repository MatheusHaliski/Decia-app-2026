# Studio — assets reais, camadas e Completar

Capturas do editor em 14/10/2026, com login na API local e geração paramétrica determinística. Nenhuma proposta remota de IA foi solicitada nesta captura. Os exemplos são estudos de geometria, não projetos executivos ou anatomia certificada.

| Etapa | Evidência |
| --- | --- |
| Sofá com partes reconhecíveis em projeção isométrica | [01 — wireframe](01-sofa-wireframe-isometrico.png) |
| Mesmo sofá com preenchimento, em câmera frontal | [02 — colorido](02-sofa-colorido-frontal.png) |
| Entrar na estrutura da cabeça e inserir olhos, lábios e nariz | [03 — detalhes internos](03-cabeca-detalhes-internos.png) |
| Composição com natureza no fundo e pessoa à frente; região maior travada | [04 — camadas](04-composicao-camadas-regiao.png) |
| Alternar a camada ativa sem apagar as demais | [05 — fundo ativo](05-camada-fundo-ativa.png) |
| Letters básico propõe ortografia sem modificar concordância | [06 — revisão local](06-letters-ortografia-proposta-local.png) |
| Letters permite escolher alcance da continuação | [07 — Completar](07-letters-completar-alcances.png) |

Downloads: [PDF de todas as etapas](STUDIO_CAMADAS_COMPLETAR.pdf) e [pacote desta etapa](PACOTE_STUDIO_CAMADAS.zip).

Arquivos: [PNG exportado](COMPOSICAO.png), [projeto editável](COMPOSICAO.ws-asset.json), [modelo GLB](COMPOSICAO.glb), [validação Khronos](VALIDACAO_GLB.json), [registro de captura](EVIDENCIAS.json). O GLB passou pelo validador com zero erros, avisos ou informações. Ocultar uma camada é uma preferência de visualização; o GLB exporta as partes marcadas como visíveis no modelo, inclusive camadas apenas ocultas na interface.

A biblioteca possui 42 tipos paramétricos, seis câmeras e detalhes internos por função. As capturas mostram somente exemplos. Transparência das outras camadas indica contexto não editável. A geometria continua ajustável por posição, dimensões, rotação e materiais. A prévia de camadas não é uma simulação de colaboração entre usuários.

Veja [arquitetura da edição coletiva](../../../produto/DRAWINGS_CAMADAS_COLABORACAO_DECIA.md), [previsibilidade e conclusão](../../../produto/COMPLETAR_E_PREVISIBILIDADE.md) e [estrutura do português](../../../produto/LETTERS_LINGUA_PORTUGUESA.md). As reservas simultâneas têm um núcleo testado, ainda sem ligação à mesa DECIA ou persistência distribuída.
