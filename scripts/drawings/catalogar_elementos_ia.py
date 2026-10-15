#!/usr/bin/env python3
"""Pesquisa as variações de elementos gráficos que a IA pode sugerir (inclusive como WIREFRAME).

Fontes: protótipos em docs/exemplo_drawings_letters e domínio em lib/drawings, lib/pieces.
Saída: docs/auditoria/2026-10-15/catalogo-elementos-ia.json
"""
import re
from _common import literals, rel, source_files, write

# Variações sugeríveis; cada uma pode ser proposta como PREENCHIDO ou WIREFRAME (somente traçado inicial).
RENDER_MODES = ["FILLED", "WIREFRAME"]
SUBJECT_KINDS = ["object", "person"]


def main():
    shapes, styles, files = set(), set(), []
    for p in source_files():
        text = p.read_text(encoding="utf-8")
        s = literals(text, r"type:\s*'(line|rect|circle|triangle|text|ellipse|polygon|path)'")
        st = literals(text, r"drawingStyle\s*===\s*'([a-z0-9_]+)'")
        if s or st:
            files.append(rel(p))
        shapes.update(s)
        styles.update(st)
    elements = sorted(shapes | {"person", "object"})
    catalog = {
        "renderModes": RENDER_MODES,
        "subjectKinds": SUBJECT_KINDS,
        "shapes": sorted(shapes),
        "drawingStyles": sorted(styles),
        "variations": [{"element": e, "mode": m} for e in elements for m in RENDER_MODES],
        "wireframeDefinition": "Versão esqueleto: só traçado inicial; preenchimento e detalhes ficam a cargo do usuário.",
        "sources": files,
    }
    write("catalogo-elementos-ia.json", catalog)


if __name__ == "__main__":
    main()
