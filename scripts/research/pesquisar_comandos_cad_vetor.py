"""Pesquisa comandos adicionais nas documentações públicas oficiais."""
from fontes_web import executar, ROOT
sources=[
 ('Adobe — atalhos Illustrator','https://helpx.adobe.com/illustrator/using/default-keyboard-shortcuts.html',['Join','Smooth','Scissors','Perspective','Shape Builder','Live Paint','Reflect','Blend','Eyedropper','Artboard']),
 ('Adobe — selecionar objetos','https://helpx.adobe.com/illustrator/using/selecting-objects.html',['Lasso','Magic Wand','isolation','similar']),
 ('Adobe — combinar objetos','https://helpx.adobe.com/illustrator/using/combining-objects.html',['Pathfinder','compound','Divide','Exclude','Merge','Trim']),
 ('Adobe — editar caminhos','https://helpx.adobe.com/illustrator/using/editing-paths.html',['Simplify','Join','Average','anchor','Smooth']),
 ('Autodesk — comandos AutoCAD','https://www.autodesk.com/shortcuts/autocad',['OFFSET','TRIM','EXTEND','FILLET','CHAMFER','ARRAY','MIRROR','PEDIT','OVERKILL','PURGE','OSNAP','DIST','AREA','MATCHPROP','ALIGN','ISOLATEOBJECTS'])]
records=executar(sources,ROOT/'docs/auditoria/2026-10-15/pesquisa-comandos/fontes-comandos.json')
# A shortlist is engineering curation, not a claim that each website confirms every behavior.
groups=[('Precisão e saneamento','OSNAP; ORTHO; POLAR; SNAP; GRID; OVERKILL; PURGE; AUDIT','Alta','Evitar duplicações, degenerações e imprecisão antes de operações destrutivas.'),('Edição topológica','TRIM; EXTEND; OFFSET; JOIN/PEDIT; BREAK; REVERSE; Simplify; Smooth','Alta','Perfis fechados, contornos paralelos e continuidade verificável.'),('Transformação e repetição','MIRROR/Reflect; ARRAY; ALIGN; MATCHPROP; Blend','Alta','Repetir componentes preservando espaçamento e rastreabilidade.'),('Medição','DIST; AREA; MEASUREGEOM; DIM; unidades e tolerâncias','Alta','Mensurar geometria real; registrar escala, sistema e tolerância.'),('Organização','ISOLATEOBJECTS; HIDEOBJECTS; LOCK; Artboards; Symbols','Média','Isolar visualização sem confundir visibilidade com autorização.'),('Pintura e contornos','Live Paint; Shape Builder; Compound Path; clipping masks','Alta','Representar furos e contornos compostos sem perder topologia.')]
p=ROOT/'docs/auditoria/2026-10-15/pesquisa-comandos/COMANDOS_ADICIONAIS.md'
lines=['# Comandos adicionais pesquisados','', 'Lista curada para planejamento; nenhum item abaixo passa a ser implementado apenas por aparecer nesta pesquisa. Fontes efetivamente consultadas e trechos literais: [JSON](fontes-comandos.json).','', '| Grupo | Candidatos | Prioridade | Aplicação |','| --- | --- | --- | --- |']
lines += [f'| {a} | {b} | {c} | {d} |' for a,b,c,d in groups]
lines+=['','## Cobertura das fontes','']+[f'- [{r["nome"]}]({r["url"]}): {r["resultado"]}; {len(r.get("trechos",[]))} termos encontrados.' for r in records]
lines+=['','Não copiar atalhos cegamente: L e A têm sentidos conflitantes entre CAD e vetor; perfis de comandos precisam resolver o conflito. EXPLODE, desagrupar, expandir aparência e separar corpos são operações distintas. Descrições fornecidas pelo usuário são requisitos de produto, não validação técnica da semântica dos programas.','']
p.write_text('\n'.join(lines))
