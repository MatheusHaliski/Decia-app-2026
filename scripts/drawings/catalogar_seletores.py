#!/usr/bin/env python3
"""Inventaria os seletores de sugestão da IA (cores, gradientes, objetos, pessoas, traços, geometrias…).

Cobre listas <select> e grades de opções (grid) nos protótipos, mais os vocabulários de lib/pieces e lib/drawings.
Saída: docs/auditoria/2026-10-15/catalogo-seletores.json
"""
import re
from _common import ROOT, rel, source_files, write

# Seletores que o editor deve oferecer (formulário de sugestão da IA); `wireframe` aplica-se a objetos e pessoas.
REQUIRED = {
    "cor": "grade", "gradiente": "grade", "objeto": "grade", "pessoa": "grade", "traco-de-linha": "select",
    "geometria": "grade", "estilo-de-desenho": "grade", "camada": "select", "modo-de-renderizacao": "select",
}


def main():
    found = []
    for p in source_files((".tsx",)):
        text = p.read_text(encoding="utf-8")
        for kind, pat in (("select", r"<select\b"), ("grade", r"grid-cols-\d+")):
            n = len(re.findall(pat, text))
            if n:
                found.append({"arquivo": rel(p), "tipo": kind, "ocorrencias": n})
    vocab = {}
    cls = (ROOT / "lib" / "pieces" / "classification.ts").read_text(encoding="utf-8")
    block = re.search(r"VOCABULARIES = \{(.*?)\} as const", cls, re.S)
    for m in re.finditer(r"(\w+): \[(.*?)\]", block.group(1) if block else ""):
        vocab[m.group(1)] = re.findall(r'"([A-Z0-9_]+)"', m.group(2))
    write("catalogo-seletores.json", {"necessarios": REQUIRED, "encontradosNosPrototipos": found, "vocabularios": vocab})


if __name__ == "__main__":
    main()
