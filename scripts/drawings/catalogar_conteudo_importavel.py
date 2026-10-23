#!/usr/bin/env python3
"""Lista os tipos de conteúdo importáveis para o editor, a fim de oferecer sugestões ao usuário.

Cada tipo declara o MIME, a origem (`IMPORT` no log de autoria) e se o conteúdo pode virar camada.
Saída: docs/auditoria/2026-10-15/catalogo-conteudo-importavel.json
"""
from _common import write

CONTENT = [
    {"id": "svg", "mime": "image/svg+xml", "kind": "vetor", "layerable": True, "sanitize": True},
    {"id": "png", "mime": "image/png", "kind": "raster", "layerable": True, "sanitize": False},
    {"id": "jpeg", "mime": "image/jpeg", "kind": "raster", "layerable": True, "sanitize": False},
    {"id": "webp", "mime": "image/webp", "kind": "raster", "layerable": True, "sanitize": False},
    {"id": "pdf", "mime": "application/pdf", "kind": "documento", "layerable": False, "sanitize": True},
    {"id": "dxf", "mime": "image/vnd.dxf", "kind": "cad", "layerable": True, "sanitize": True},
    {"id": "paleta", "mime": "application/json", "kind": "cores", "layerable": False, "sanitize": False},
    {"id": "fonte", "mime": "font/woff2", "kind": "tipografia", "layerable": False, "sanitize": False},
    {"id": "referencia", "mime": "image/*", "kind": "referencia", "layerable": False, "sanitize": False},
    {"id": "texto", "mime": "text/plain", "kind": "letters", "layerable": False, "sanitize": False},
    {"id": "ws-studio", "mime": "application/json", "kind": "peça", "layerable": True, "sanitize": True},
]


def main():
    write("catalogo-conteudo-importavel.json", {"tipos": CONTENT, "origemAutoria": "IMPORT",
                                                "observacao": "Importado entra como IMPORTED até haver log completo."})


if __name__ == "__main__":
    main()
