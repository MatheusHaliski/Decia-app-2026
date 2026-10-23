#!/usr/bin/env python3
"""Consult public bibliographic metadata; never downloads or claims to read books."""
import argparse
import datetime
import json
import urllib.parse
import urllib.request
from pathlib import Path

QUERIES = [
    ("Nova gramática do português contemporâneo", "Celso Cunha"),
    ("Moderna gramática portuguesa", "Evanildo Bechara"),
    ("Gramática de usos do português", "Maria Helena de Moura Neves"),
    ("Nova gramática do português brasileiro", "Ataliba de Castilho"),
    ("A coerência textual", "Ingedore Koch"),
    ("Produção textual análise de gêneros e compreensão", "Luiz Antônio Marcuschi"),
]

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="docs/produto/pesquisa/portugues-bibliografia.json")
    args = parser.parse_args()
    records = []
    for title, author in QUERIES:
        query = urllib.parse.urlencode({"title": title, "author": author, "limit": 3,
                                       "fields": "key,title,author_name,first_publish_year,edition_count"})
        url = "https://openlibrary.org/search.json?" + query
        record = {"query_title": title, "query_author": author, "source_url": url}
        try:
            request = urllib.request.Request(url, headers={"User-Agent": "WorkStationBibliography/1.0"})
            with urllib.request.urlopen(request, timeout=8) as response:
                payload = json.load(response)
            record.update(status="ok", matches=payload.get("docs", []))
        except Exception as error:
            record.update(status="unavailable", error_type=type(error).__name__, matches=[])
        records.append(record)
    output = {"queried_at_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
              "method": "Public catalog metadata; no full-text consultation, no edition inferred from first publication year",
              "records": records}
    path = Path(args.output)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"queries": len(records), "successful_requests": sum(r["status"] == "ok" for r in records),
                      "queries_with_matches": sum(bool(r["matches"]) for r in records)}))

if __name__ == "__main__":
    main()
