#!/usr/bin/env python3
"""Validate published audit structure and weighted ratings without services or AI."""
from pathlib import Path
import csv
import json

root = Path(__file__).resolve().parents[1]
data = json.loads((root / 'MATRIZ_RF.json').read_text())
rows = data['requisitos']
assert [r['n'] for r in rows] == list(range(1, 75)), 'RF ausente ou duplicado'
assert abs(sum(data['pesos'].values()) - 1) < 1e-9
for row in rows:
    for dimensions, field in [('subnotasIniciais', 'notaInicial'), ('subnotasApos', 'notaApos')]:
        values = row[dimensions]
        assert set(values) == set(data['pesos'])
        assert all(isinstance(v, (int, float)) and 0 <= v <= 10 for v in values.values())
        score = round(sum(values[key] * weight for key, weight in data['pesos'].items()) + 1e-10, 2)
        assert score == row[field], (row['rf'], field)
    assert row['principalErro'] and row['melhoria'] and row['evidencias']
    assert row['aceiteIntegral'] is False
with (root / 'MATRIZ_RF.csv').open() as handle:
    assert len(list(csv.DictReader(handle))) == 74
criteria = json.loads((root / 'CRITERIOS_ACEITE.json').read_text())
assert len(criteria['criterios']) == criteria['criteriosUnicos']
assert len({c['id'] for c in criteria['criterios']}) == criteria['criteriosUnicos']
assert all(c['fontes'] for c in criteria['criterios'])
for file in ['RELATORIO.md', 'PLANO_CORRECAO.md', 'PROBLEMAS.md', 'ANTES_DEPOIS.md', 'CONECTORES.md']:
    assert (root / file).is_file()
print(f"74 RF, {criteria['criteriosUnicos']} identificadores CA, notas e pesos consistentes. Nenhuma chamada de IA.")
