#!/usr/bin/env python3
"""Render the audit PDF and package existing evidence. No network or AI calls."""
from pathlib import Path
import hashlib
import html
import json
import os
import re
import zipfile
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
from pypdf import PdfReader

root = Path(__file__).resolve().parents[1]
font_path = Path('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf')
font = 'Helvetica'
if font_path.exists():
    pdfmetrics.registerFont(TTFont('AuditSans', str(font_path)))
    font = 'AuditSans'
styles = getSampleStyleSheet()
for name in ['BodyText', 'Heading1', 'Heading2', 'Heading3']:
    styles[name].fontName = font
styles['BodyText'].fontSize = 8.5
styles['BodyText'].leading = 12
styles['BodyText'].spaceAfter = 6
styles['Heading1'].fontSize = 17
styles['Heading1'].leading = 22
styles['Heading2'].fontSize = 12
styles['Heading2'].leading = 17
styles['Heading3'].fontSize = 10
styles['Heading3'].leading = 14
styles.add(ParagraphStyle('Meta', parent=styles['BodyText'], fontSize=7.5, leading=10, textColor=colors.HexColor('#454545')))

def plain(text):
    text = re.sub(r'\[([^]]+)\]\([^)]*\)', r'\1', text)
    return text.replace('**', '').replace('`', '')

def para(text, style='BodyText'):
    return Paragraph(html.escape(plain(text)), styles[style])

story = []
html_parts = []
for document in ['RELATORIO.md', 'RESUMO_MODULOS.md', 'ANTES_DEPOIS.md', 'PROBLEMAS.md', 'CONECTORES.md', 'PLANO_CORRECAO.md']:
    if story:
        story.append(PageBreak())
    text = (root / document).read_text()
    html_parts.append('<section>')
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith('```'):
            continue
        if re.fullmatch(r'[|:\- ]+', line):
            continue
        style = 'BodyText'
        if line.startswith('# '):
            line, style = line[2:], 'Heading1'
        elif line.startswith('## '):
            line, style = line[3:], 'Heading2'
        elif line.startswith('### '):
            line, style = line[4:], 'Heading3'
        elif line.startswith('|'):
            line = ' · '.join(c.strip() for c in line.strip('|').split('|'))
        story.append(para(line, style))
        tag = {'Heading1':'h1','Heading2':'h2','Heading3':'h3'}.get(style, 'p')
        html_parts.append(f'<{tag}>{html.escape(plain(line))}</{tag}>')
    html_parts.append('</section>')

story.append(PageBreak())
story.append(para('Matriz completa dos 74 requisitos funcionais', 'Heading1'))
data = json.loads((root / 'MATRIZ_RF.json').read_text())
story.append(para('Notas técnicas provisórias; F funcionalidade, E eficiência, V visual, R recuperação, A acessibilidade, B feedback. Pesos 30/20/15/15/10/10. Nenhum aceite integral.'))
for row in data['requisitos']:
    story.append(para(f"{row['rf']} — {row['objetivo']}", 'Heading2'))
    story.append(para(f"Estado: {row['estado']}. Inicial {row['notaInicial']:.2f} → após {row['notaApos']:.2f}. {row['prioridade']}.", 'Meta'))
    for label, values in [('Subnotas iniciais', row['subnotasIniciais']), ('Subnotas após', row['subnotasApos'])]:
        story.append(para(label + ' F/E/V/R/A/B: ' + ' / '.join(f'{v:g}' for v in values.values()), 'Meta'))
    story.append(para('Erro principal: ' + row['principalErro']))
    story.append(para('Melhoria: ' + row['melhoria']))
    story.append(para('Nesta rodada: ' + row['correcaoNestaRodada']))
    story.append(para('Tela/fluxo: ' + row['telaFluxo'], 'Meta'))
    story.append(para('API: ' + row['api'], 'Meta'))
    story.append(para('Componentes: ' + '; '.join(row['componentes']), 'Meta'))
    story.append(para('Evidências: ' + '; '.join(row['evidencias']), 'Meta'))
    story.append(Spacer(1, 8))

validation = json.loads((root / 'VALIDACAO.json').read_text())
story.append(PageBreak())
story.append(para('Validação executada e limites', 'Heading1'))
story.append(para(json.dumps(validation, ensure_ascii=False, indent=2)))
story.append(para('As capturas desktop/celular, JSON editáveis e resultados do navegador estão disponíveis no README e no pacote. O código da aplicação permanece local e parcial. Não houve chamadas pagas de IA.'))

def footer(canvas, doc):
    canvas.saveState()
    canvas.setFont(font, 8)
    canvas.drawString(36, 20, 'Work Station · Auditoria técnica · 16/10/2026 · não certifica aceite integral')
    canvas.drawRightString(A4[0]-36, 20, str(doc.page))
    canvas.restoreState()

pdf = root / 'AUDITORIA_WORK_STATION.pdf'
SimpleDocTemplate(str(pdf), pagesize=A4, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=38, title='Auditoria Work Station — 74 requisitos funcionais', author='Work Station — auditoria técnica').build(story, onFirstPage=footer, onLaterPages=footer)
reader = PdfReader(str(pdf))
assert len(reader.pages) > 10
assert any('RF74' in (p.extract_text() or '') for p in reader.pages)
html_content = '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Auditoria Work Station</title><style>body{max-width:1000px;margin:auto;padding:24px;font:16px/1.6 system-ui;color:#202020;background:#fff}section{margin-bottom:48px}p{overflow-wrap:anywhere}h1,h2,h3{line-height:1.3}</style><body>' + ''.join(html_parts) + '<p>A matriz detalhada está em MATRIZ_RF.md/CSV/JSON e no PDF.</p></body></html>'
(root / 'AUDITORIA_WORK_STATION.html').write_text(html_content)
archive = root / 'PACOTE_AUDITORIA_WORK_STATION.zip'
manifest = root / 'MANIFESTO_ARTEFATOS.json'
files = sorted(p for p in root.rglob('*') if p.is_file() and p not in [archive, manifest] and not p.name.endswith('.tmp') and '__pycache__' not in p.parts)
manifest.write_text(json.dumps({'pdfPages':len(reader.pages), 'excludes':'Manifesto e ZIP excluídos de seus próprios hashes; conteúdo da aplicação não incluído.', 'files':[{'path':str(p.relative_to(root)), 'bytes':p.stat().st_size, 'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in files]}, ensure_ascii=False, indent=2)+'\n')
files.append(manifest)
temporary = archive.with_suffix('.zip.tmp')
with zipfile.ZipFile(temporary, 'w', zipfile.ZIP_DEFLATED) as package:
    for file in files:
        package.write(file, file.relative_to(root))
with zipfile.ZipFile(temporary) as package:
    assert package.testzip() is None
    assert 'MATRIZ_RF.csv' in package.namelist()
    assert 'AUDITORIA_WORK_STATION.pdf' in package.namelist()
    entries = len(package.namelist())
os.replace(temporary, archive)
print(json.dumps({'pdfPages':len(reader.pages), 'zipEntries':entries, 'zipBytes':archive.stat().st_size, 'integrity':'OK', 'paidCalls':0}))
