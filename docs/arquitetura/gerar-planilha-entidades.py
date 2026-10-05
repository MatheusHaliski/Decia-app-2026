#!/usr/bin/env python3
"""Gera RF_ENTIDADES_ATRIBUTOS.xlsx a partir de catalogo-entidades.json.
Uso: python3 docs/arquitetura/gerar-planilha-entidades.py docs/arquitetura/catalogo-entidades.json docs/arquitetura/RF_ENTIDADES_ATRIBUTOS.xlsx  (requer openpyxl)
Abas: Atributos (1 linha por atributo), Entidades, RF x Entidade, Bancos (contagens por fórmula), Legenda."""
import json, sys
from collections import OrderedDict
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.table import Table, TableStyleInfo

src, out = sys.argv[1], sys.argv[2]
cat = json.load(open(src, encoding="utf-8"))
ents = cat["entities"] if isinstance(cat, dict) and "entities" in cat else cat

FONT = "Arial"
HDR_FILL = PatternFill("solid", fgColor="242525")
HDR_FONT = Font(name=FONT, bold=True, color="F1DEC0")
BODY = Font(name=FONT, size=10)
thin = Side(style="thin", color="D9D9D9")
BORDER = Border(bottom=thin)

def sheet(wb, title, headers, rows, widths, table_name):
    ws = wb.create_sheet(title)
    ws.append(headers)
    for c in range(1, len(headers) + 1):
        cell = ws.cell(row=1, column=c); cell.font = HDR_FONT; cell.fill = HDR_FILL
        cell.alignment = Alignment(vertical="center", wrap_text=True)
    for r in rows:
        ws.append(r)
    for row in ws.iter_rows(min_row=2):
        for cell in row:
            cell.font = BODY; cell.alignment = Alignment(vertical="top", wrap_text=True); cell.border = BORDER
    for i, w in enumerate(widths, 1):
        ws.column_dimensions[get_column_letter(i)].width = w
    ws.freeze_panes = "A2"
    if rows:
        ref = f"A1:{get_column_letter(len(headers))}{len(rows) + 1}"
        t = Table(displayName=table_name, ref=ref)
        t.tableStyleInfo = TableStyleInfo(name="TableStyleLight9", showRowStripes=True)
        ws.add_table(t)
    return ws

wb = Workbook(); wb.remove(wb.active)

# --- Atributos
def restr(a):
    parts=[]
    if a.get("pk"): parts.append("PK")
    if a.get("constraint"): parts.append(str(a["constraint"]))
    if a.get("enumValues"): parts.append("enum: " + ", ".join(map(str,a["enumValues"])))
    if a.get("ref"): parts.append("FK → " + str(a["ref"]) + (f" ON DELETE {a['onDelete']}" if a.get("onDelete") else ""))
    if a.get("default") not in (None, ""): parts.append(f"default {a['default']}")
    if a.get("encrypted"): parts.append("cifrado (AES-GCM)")
    return " · ".join(parts)
attr_rows = []
for e in ents:
    rfs = ", ".join(e.get("rfs", []))
    for a in e.get("attributes", []):
        attr_rows.append([rfs, e.get("context", ""), e["entity"], e.get("table", ""), a["name"], a.get("column", ""),
                          a.get("type", ""), a.get("sqlType", ""), "sim" if a.get("nullable") else "não", restr(a),
                          e.get("store", ""), e.get("migration", ""), a.get("description", "")])
sheet(wb, "Atributos",
      ["RF", "Contexto", "Entidade", "Tabela", "Atributo", "Coluna", "Tipo (domínio)", "Tipo SQL", "Nulo?",
       "Restrição / enum / FK", "Banco de produção", "Migration", "Descrição"],
      attr_rows, [14, 20, 26, 26, 24, 24, 16, 16, 7, 40, 18, 12, 60], "Atributos")

# --- Entidades (contagem de atributos por fórmula)
ent_rows = []
for i, e in enumerate(ents, start=2):
    ent_rows.append([", ".join(e.get("rfs", [])), e.get("context", ""), e["entity"], e.get("table", ""),
                     e.get("store", ""), e.get("migration", ""), f'=COUNTIF(Atributos!C:C,C{i})', e.get("doc", "")])
sheet(wb, "Entidades", ["RF", "Contexto", "Entidade", "Tabela", "Banco de produção", "Migration", "Nº atributos", "Descrição"],
      ent_rows, [16, 22, 28, 28, 20, 12, 12, 70], "Entidades")

# --- RF x Entidade (uma linha por par)
rf_rows = []
def rfkey(s):
    try: return int(s.replace("RF", "").split(".")[0])
    except ValueError: return 999
pairs = sorted({(rf, e["entity"], e.get("table", ""), e.get("store", ""), e.get("context", ""))
                for e in ents for rf in e.get("rfs", [])}, key=lambda p: (rfkey(p[0]), p[1]))
for p in pairs:
    rf_rows.append(list(p))
sheet(wb, "RF x Entidade", ["RF", "Entidade", "Tabela", "Banco de produção", "Contexto"], rf_rows,
      [10, 30, 30, 22, 24], "RFxEntidade")

# --- Bancos (contagens por fórmula sobre as abas anteriores)
stores = sorted({e.get("store", "") for e in ents})
banco_rows = [[s, f'=COUNTIF(Entidades!E:E,A{i})', f'=COUNTIF(Atributos!K:K,A{i})'] for i, s in enumerate(stores, start=2)]
ws = sheet(wb, "Bancos", ["Banco de produção", "Nº entidades", "Nº atributos"], banco_rows, [28, 14, 14], "Bancos")
n = len(stores) + 1
ws.cell(row=n + 1, column=1, value="Total").font = Font(name=FONT, bold=True)
ws.cell(row=n + 1, column=2, value=f"=SUM(B2:B{n})").font = Font(name=FONT, bold=True)
ws.cell(row=n + 1, column=3, value=f"=SUM(C2:C{n})").font = Font(name=FONT, bold=True)

# --- Legenda
lg = wb.create_sheet("Legenda")
lines = [
    "Fonte: docs/arquitetura/catalogo-entidades.json — gerado das classes @DomainEntity de ws-domain (EntityCatalogTest) e conferido contra as migrations Flyway (CatalogSchemaConsistencyTest). Regenerar: python3 docs/arquitetura/gerar-planilha-entidades.py.",
    "Banco de produção \"code\" = valor fixo em código (sem tabela). Migration = arquivo Flyway que cria a tabela (V2/V3 baseline e autenticação; V10–V21 por contexto).",
    "RF: requisitos funcionais do board Trello Work Station (RF1–RF46); numeração atual do board.",
    "Banco de produção: mysql (fonte de verdade, Flyway) · cassandra (séries temporais, mensagens) · opensearch (busca, embeddings) · redis (sessão, contadores) · s3 (mídia). Combinações = espelho/índice.",
    "Nulo? = coluna aceita NULL. Restrição / enum = CHECK, UNIQUE, FK (ON DELETE) ou valores do enum.",
    "As contagens em Entidades e Bancos são fórmulas sobre a aba Atributos; filtre as tabelas para recortar por RF, contexto ou banco.",
]
for i, l in enumerate(lines, 1):
    c = lg.cell(row=i, column=1, value=l); c.font = BODY; c.alignment = Alignment(wrap_text=True)
lg.column_dimensions["A"].width = 120
from openpyxl.workbook.properties import CalcProperties
wb.calculation = CalcProperties(fullCalcOnLoad=True)
wb.save(out)
print("ok", out, "entidades:", len(ents), "atributos:", len(attr_rows))
