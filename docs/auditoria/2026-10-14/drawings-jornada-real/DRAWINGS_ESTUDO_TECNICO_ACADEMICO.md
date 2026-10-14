# Drawings — estudo técnico, fundamentos e limites de aplicação

Revisão: 14/10/2026. Este estudo orienta a implementação; não é laudo de engenharia nem demonstra vigência das normas indicadas no prompt.

## Representação geométrica e intenção

Ponto é uma posição; linha é um conjunto de posições orientado; plano é uma região; volume exige geometria tridimensional e câmera. Retângulos 2D com sombras não são modelos volumétricos. Objetos devem ter coordenadas, unidade, transformação, camada e significado. Uma planta de estudo precisa separar contorno, mobiliário, circulação, textos e cotas.

Para um segmento, comprimento = √((x₂−x₁)²+(y₂−y₁)²). Para uma Bézier cúbica, B(t)=(1−t)³P₀+3(1−t)²tP₁+3(1−t)t²P₂+t³P₃, t∈[0,1]. Comprimento de curva exige integração numérica ou aproximação com erro controlado. Bounding box de curva exige considerar extremos das derivadas, não apenas pontos de controle. A implementação atual suporta retângulos, elipses, texto e segmentos; Bézier e volumes continuam pendentes.

Matriz homogênea 2D compõe translação, rotação e escala. Coordenadas de mouse devem ser convertidas pela inversa da transformação da vista. Zoom modifica a vista, nunca a dimensão da peça. Guardar escala de trabalho, unidades físicas e escala de impressão separadamente. A relação escolhida no estudo de sala é 1 unidade de tela = 10 mm: largura de 400 representa 4000 mm. Isso é uma convenção fornecida ao modelo, não uma medição inferida de imagem.

## Traçado técnico

Hierarquia visual distingue limites, detalhes, elementos ocultos, eixos e linhas auxiliares. Em representação técnica, espessura, padrão, terminadores, junções, escala e tolerância de impressão precisam ser especificados conjuntamente. Uma linha tracejada não significa automaticamente elemento oculto; sua função vem da camada/legenda e da convenção aplicada.

O editor agora oferece contínuo, tracejado e traço-ponto; espessura em unidades de tela, cor e opacidade. SVG implementa esses padrões com `stroke-dasharray`. Uma distribuição de traços definida em pixels não é uma série normativa de penas em milímetros. Para um preset de desenho técnico, a transformação para saída física deve ser testada com DPI, tamanho de folha e escala de impressão conhecidos.

`stroke-linecap` e `stroke-linejoin` influenciam limites e aparência; junção em mitra deve respeitar `stroke-miterlimit`. Traços muito finos podem desaparecer na redução ou impressão. O próximo incremento deve explicitar esses parâmetros e presets versionados; a interface atual usa os padrões do renderer SVG.

## Cotagem e tolerâncias

Uma cota é uma afirmação dimensional ligada à geometria e à versão da peça. Precisa de origem, unidade, precisão de apresentação e, quando aplicável, tolerância. Não editar apenas o texto da cota para simular alteração geométrica. Cotas redundantes ou em cadeia podem acumular tolerâncias; critérios de cotagem dependem da finalidade mecânica, arquitetônica ou de comunicação.

A prévia deriva largura/altura do objeto na camada Limites/Dimensões e do fator de unidade informado. Linhas de dimensão e de extensão aparecem na saída. Esta representação ainda não inclui sistema completo de terminadores, tolerâncias, ajustes, cotas angulares, cortes ou projeções múltiplas. Não é uma implementação certificada da NBR 10126.

As NBR 10067, 10126 e 12298 vieram do prompt. Edição, vigência, substituições e aplicabilidade devem ser verificadas no catálogo ABNT antes de oferecer um preset normativo. Não foi possível confirmar essas informações por catálogo oficial nesta etapa. Nenhum selo “ABNT aprovado” será atribuído.

## Preenchimento e hachura

Preenchimento sólido informa regiões; transparência altera percepção e depende do fundo. Hachura distingue cortes/materiais por padrão e legenda, não somente cor. O ângulo inicial de 45° é um recurso gráfico orientável; aço, concreto e vidro precisam de convenções específicas e revisão da norma aplicável. Espaçamento, escala, direção, contraste e continuidade são parte do projeto do padrão. A hachura atual não identifica materiais automaticamente.

Gradiente linear é um paint server SVG com stops, vetor, sistema de coordenadas e transformação. A interface atual usa dois stops em sRGB e orientação ajustável. Para desenhos técnicos destinados a impressão monocromática, gradiente decorativo pode dificultar leitura; oferecer uma variante técnica com preenchimentos discretos e traços legíveis, preservando a versão de apresentação.

## Cor, percepção e composição

Munsell descreve Hue, Value e Chroma; Value não é simplesmente o canal de luminância ou brilho de um seletor HSL. Conversão entre Munsell e RGB exige dados de renotação, condições de observação, iluminante e gamut. O laboratório Munsell da RIT é referência de ciência da cor; esta entrega não implementa um conversor Munsell nem atribui rótulos Munsell a sliders sRGB.

Itten orienta relações compositivas como complementaridade, claro/escuro e quente/frio. Wong e Dondis oferecem vocabulário para equilíbrio, direção, tensão e espaço. Esses conceitos precisam de rubricas com finalidade declarada; não constituem, isoladamente, uma nota objetiva de qualidade.

sRGB é adequado à prévia de tela e ao PNG produzido pelo navegador. CMYK depende de perfil ICC, substrato, processo de impressão e intenção de renderização. Não converter por uma simples fórmula RGB→CMYK e declarar fidelidade de impressão. Preservar uma versão de apresentação colorida e uma técnica adequada ao meio de saída.

WCAG avalia legibilidade de interfaces e conteúdo textual, não segurança do projeto técnico. Para sRGB, linearizar canais antes de calcular luminância relativa; contraste depende das duas cores efetivamente compostas, opacidade e fundo. Em gradientes, verificar região sob o texto, não somente a cor média. A revisão humana também considera tamanho, sobreposição, densidade e redução da imagem.

## Avaliação e validação

Equilíbrio geométrico por centro de massa é uma proxy. Área de um retângulo não é peso perceptivo suficiente quando há texto, transparência, oclusão ou figuras complexas. Uma cena pode ser assimétrica intencionalmente e atingir seu objetivo. Rigor geométrico (elementos dentro do canvas) não é rigor técnico normativo.

O score global só deve ser apresentado quando suas quatro dimensões forem avaliadas por rubricas versionadas, pesos normalizados e contexto consistente. Dados ausentes aparecem como não avaliados. Testar com especialistas e corpus de desenhos; publicar critérios e incerteza antes de atribuir pontuação acadêmica.

Aceite do cenário demonstrado: objetivo fictício explícito → geração real de proposta vetorial pela OpenAI → revisão humana → edição manual de cor/gradiente/traçado → refinamento real pela IA → cotagem com unidade informada → revisão final → JSON editável e PNG válidos. Essa prova não certifica circulação, ergonomia, acessibilidade arquitetônica, resistência, fabricação ou conformidade normativa.

## Fontes consultadas online

Páginas abaixo acessadas em 14/10/2026, com resposta HTTP 200 registrada. São referências técnicas públicas; o acesso não equivale a revisão integral de cada obra ou norma.

- W3C SVG 2, [Painting: Filling, Stroking and Marker Symbols](https://www.w3.org/TR/SVG2/painting.html): pintura, traços, padrões e marcadores.
- W3C SVG 2, [Paint Servers](https://www.w3.org/TR/SVG2/pservers.html): gradientes, patterns e sistemas de coordenadas.
- W3C SVG 2, [Coordinates, Transformations and Units](https://www.w3.org/TR/SVG2/coords.html): viewBox, unidades e transformações.
- W3C, [CSS Color Module Level 4](https://www.w3.org/TR/css-color-4/): espaços de cor, conversões e gamut; consultar status da especificação para compatibilidade.
- RIT, [Munsell Color Science Laboratory](https://www.rit.edu/science/munsell-color-lab): contexto acadêmico da ciência da cor.
- BIPM, [SI Brochure](https://www.bipm.org/en/publications/si-brochure): referência de unidades e grandezas.
- W3C, [WCAG 2.2](https://www.w3.org/TR/WCAG22/): contraste e acessibilidade de conteúdo/interface.

Bibliografia indicada pelo prompt: Wong, *Princípios de forma e desenho*; Dondis, *Sintaxe da linguagem visual*; Itten, *A arte da cor*. Edição/páginas e acesso integral ainda não foram verificados; não atribuir citações literais ou resultados experimentais a essas obras nesta entrega.
