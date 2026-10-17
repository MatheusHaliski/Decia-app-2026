# Referência de comandos (Illustrator e AutoCAD) fornecida em 17/10/2026

Material de referência entregue pelo responsável do produto durante a auditoria, para orientar o catálogo de comandos do Drawings (RF57–RF62, RF68, RF69). **Serve de inspiração semântica, não de promessa de paridade**: a interface do Work Station nomeia os próprios comandos, descreve o que cada um faz de fato e não declara equivalência com comandos comerciais cujas semânticas não foram implementadas (regra dos documentos de 15/10 e 16/10).

## 1. Decompor e desmembrar objetos

| Programa | Comando | Semântica | Equivalente proposto no Drawings |
|---|---|---|---|
| Illustrator | Ungroup (Shift+Ctrl+G) | Separa grupo sem alterar geometria | `DESAGRUPAR` |
| Illustrator | Release Clipping Mask (Alt+Ctrl+7) | Libera objetos presos numa máscara | `LIBERAR_MASCARA` (quando houver máscara) |
| Illustrator | Release Compound Path (Alt+Shift+Ctrl+8) | Separa caminhos compostos (furo do "O") | `SEPARAR_CAMINHO_COMPOSTO` (ver caminhos-compostos, 15/10) |
| Illustrator | Expand / Expand Appearance | Converte traço/efeito em formas simples | `EXPANDIR` (traço → contorno) |
| Illustrator | Pathfinder › Divide | Corta formas nas interseções | `DIVIDIR` (booleano) |
| Illustrator | Shape Builder (Shift+M) | Une/subtrai/divide regiões sobrepostas | `CONSTRUTOR_DE_FORMAS` (fase posterior) |
| Illustrator | Scissors (C) | Corta traçado no ponto | `CORTAR_NO_PONTO` |
| AutoCAD | EXPLODE (X) | Bloco/polilinha/malha → elementos básicos | `EXPLODIR` (grupo/polilinha → segmentos) |
| AutoCAD | BURST | Explode bloco preservando atributos de texto | `EXPLODIR` preserva rótulos |
| AutoCAD | SOLIDEDIT › Body › Separate | Separa sólido disjunto sem perder volume | `SEPARAR_DISJUNTOS` (3D, futuro) |
| AutoCAD | SUBTRACT / INTERSECT / UNION | Booleanos | `SUBTRAIR` / `INTERSECTAR` / `UNIR` |
| AutoCAD | SLICE | Fatia sólido por plano | 3D, futuro |
| AutoCAD | CONVTOSURFACE / CONVTOSOLID / BREP / FLATTEN | Conversões 3D ↔ superfície, achatar | 3D, futuro (RF60/RF61) |
| AutoCAD | XOPEN | Abre referência externa | não aplicável |

Aviso registrado pelo usuário: explodir um sólido 3D destrói o volume (vira superfícies); para separar corpos disjuntos usa-se *Separate*. O Drawings deve preservar a intenção ao desmembrar (RF61): desmembrar nunca descarta propriedades sem avisar.

## 2. Alternar vistas 2D/3D

| Programa | Comando | Função | Proposta |
|---|---|---|---|
| AutoCAD | PLAN / VPOINT / VIEW | Vista superior; ponto de vista; vistas salvas | `VISTA` (superior, frontal, lateral, isométrica; vistas salvas) — RF62 |
| AutoCAD | 3DORBIT / Shift+scroll | Órbita | 3D, futuro |
| AutoCAD | VISUALSTYLES | Wireframe/sombreado | `ESTILO_VISUAL` (wireframe × preenchido — já há `lib/pieces/wireframe.ts`) |
| AutoCAD | UCS / UCSICON | Sistema de coordenadas | `ORIGEM` e `GRADE` (2D) |
| Illustrator | Perspective Grid (Shift+Ctrl+I, Shift+P) | Grade de perspectiva 1/2/3 pontos | `GRADE_PERSPECTIVA` (fase posterior) |

## 3. Salvar e retroceder

| Programa | Comando | Função | Proposta |
|---|---|---|---|
| AutoCAD | QSAVE / SAVEAS / SAVETIME / AUTOSAVE | Salvar, salvar como, intervalo e recuperação automática | `SALVAR` (versão no servidor), `SALVAR_COMO`, checkpoint periódico e recuperação (RF69) |
| AutoCAD | UNDO / REDO / OOPS / LAYERP | Desfazer, refazer, restaurar último apagado, estado anterior das camadas | `DESFAZER`, `REFAZER`, `RESTAURAR_APAGADO`, `CAMADAS_ANTERIOR` |
| AutoCAD | RECOVER / DRAWINGRECOVERY | Recuperar arquivo corrompido | recuperação de rascunho após falha (RF69) |
| Illustrator | Revert (F12) / History panel | Voltar ao último salvo; navegar no histórico | `REVERTER_AO_SALVO`, painel de histórico |

## 4. Seleção

| Método | Illustrator | AutoCAD | Proposta |
|---|---|---|---|
| Janela | Só o totalmente contido | Esquerda→direita: contido | `selectInBounds(…, "contained")` — já em `lib/studio/selection.ts` |
| Cruzamento | Seleção direta de nós | Direita→esquerda: toca ou contém | `selectInBounds(…, "crossing")` — já existe; direção do arraste decide o modo |
| Laço | Q | SELECT › Lasso | `selectInPolygon` — já existe |
| Por atributo | Varinha mágica (Y), Selecionar › Semelhante | QSELECT / FILTER | `SELECIONAR_SEMELHANTES` (cor, traço, camada, tipo) |
| Polígono | — | WP / CP | `selectInPolygon` com modo contido/cruzamento |
| Tudo | Ctrl+A | Ctrl+A | `SELECIONAR_TUDO` (só camadas visíveis e destravadas) |

## 5. Comandos de desenho

Illustrator 2D: V, A, P (caneta Bézier), Shift+W, N (lápis), Shift+B, M, L, Shift+M, Shift+E. 3D: extrusão, inflar, revolução, rotação, grade de perspectiva.

AutoCAD 2D: LINE, PLINE, CIRCLE, ARC, RECTANG, POLYGON, ELLIPSE, SPLINE, HATCH, XLINE, POINT. 3D: EXTRUDE, PRESSPULL, REVOLVE, LOFT, SWEEP, primitivas, booleanos, FILLETEDGE/CHAMFEREDGE, 3DROTATE/3DMOVE/3DSCALE.

Núcleo 2D do Drawings (primeira entrega): `LINHA`, `POLILINHA`, `RETANGULO`, `ELIPSE`, `POLIGONO`, `CAMINHO` (Bézier, ver paineis-bezier de 16/10), `TEXTO`; transformações `MOVER`, `REDIMENSIONAR`, `GIRAR` com entrada numérica e teclado (WCAG 2.5.7); 3D fica para fase posterior com capacidade declarada por operação (RF60/RF61).
