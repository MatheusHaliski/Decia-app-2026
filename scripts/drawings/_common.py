"""Utilitários comuns dos scripts de auditoria de Drawings/Letters (somente biblioteca padrão)."""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCES = [ROOT / "docs" / "exemplo_drawings_letters", ROOT / "lib" / "drawings", ROOT / "lib" / "pieces"]
OUT = ROOT / "docs" / "auditoria" / "2026-10-15"


def source_files(exts=(".tsx", ".ts")):
    for base in SOURCES:
        if base.exists():
            for p in sorted(base.rglob("*")):
                if p.suffix in exts and not p.name.endswith(".test.ts"):
                    yield p


def rel(p):
    return str(p.relative_to(ROOT))


def write(name, data):
    OUT.mkdir(parents=True, exist_ok=True)
    target = OUT / name
    target.write_text(json.dumps(data, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(f"{rel(target)} escrito", file=sys.stderr)


def literals(text, pattern):
    return sorted({m.group(1) for m in re.finditer(pattern, text)})
