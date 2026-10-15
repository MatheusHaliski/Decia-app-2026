# Comandos adicionais pesquisados

Lista curada para planejamento; nenhum item abaixo passa a ser implementado apenas por aparecer nesta pesquisa. Fontes efetivamente consultadas e trechos literais: [JSON](fontes-comandos.json).

| Grupo | Candidatos | Prioridade | Aplicação |
| --- | --- | --- | --- |
| Precisão e saneamento | OSNAP; ORTHO; POLAR; SNAP; GRID; OVERKILL; PURGE; AUDIT | Alta | Evitar duplicações, degenerações e imprecisão antes de operações destrutivas. |
| Edição topológica | TRIM; EXTEND; OFFSET; JOIN/PEDIT; BREAK; REVERSE; Simplify; Smooth | Alta | Perfis fechados, contornos paralelos e continuidade verificável. |
| Transformação e repetição | MIRROR/Reflect; ARRAY; ALIGN; MATCHPROP; Blend | Alta | Repetir componentes preservando espaçamento e rastreabilidade. |
| Medição | DIST; AREA; MEASUREGEOM; DIM; unidades e tolerâncias | Alta | Mensurar geometria real; registrar escala, sistema e tolerância. |
| Organização | ISOLATEOBJECTS; HIDEOBJECTS; LOCK; Artboards; Symbols | Média | Isolar visualização sem confundir visibilidade com autorização. |
| Pintura e contornos | Live Paint; Shape Builder; Compound Path; clipping masks | Alta | Representar furos e contornos compostos sem perder topologia. |

## Cobertura das fontes

- [Adobe — atalhos Illustrator](https://helpx.adobe.com/illustrator/using/default-keyboard-shortcuts.html): texto_obtido; 10 termos encontrados.
- [Adobe — selecionar objetos](https://helpx.adobe.com/illustrator/using/selecting-objects.html): texto_obtido; 3 termos encontrados.
- [Adobe — combinar objetos](https://helpx.adobe.com/illustrator/using/combining-objects.html): texto_obtido; 6 termos encontrados.
- [Adobe — editar caminhos](https://helpx.adobe.com/illustrator/using/editing-paths.html): texto_obtido; 5 termos encontrados.
- [Autodesk — comandos AutoCAD](https://www.autodesk.com/shortcuts/autocad): texto_obtido; 15 termos encontrados.

Não copiar atalhos cegamente: L e A têm sentidos conflitantes entre CAD e vetor; perfis de comandos precisam resolver o conflito. EXPLODE, desagrupar, expandir aparência e separar corpos são operações distintas. Descrições fornecidas pelo usuário são requisitos de produto, não validação técnica da semântica dos programas.
