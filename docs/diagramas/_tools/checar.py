#!/usr/bin/env python3
"""Checagem estrutural dos READMEs de docs/diagramas (CONVENCOES.md).

Uso: python3 docs/diagramas/_tools/checar.py docs/diagramas/RF1/README.md [...]

Para cada README confere:
  1. cabeçalho obrigatório (título `# RFnn — …`, linha `**HU:**`, linha `**Critérios de aceite cobertos:**`);
  2. as seis seções numeradas `## 0.` … `## 5.` na ordem da CONVENCOES e a `## 6. Rastreabilidade`;
  3. um bloco ```mermaid em cada uma das seções 0–5 com o tipo de diagrama esperado;
     na seção 0 (casos de uso): limite do sistema (`subgraph`), casos de uso em pílula e atores só do catálogo
     de docs/arquitetura/ATORES_E_ATRIBUTOS.md (classes `ator`/`atorSis`);
  4. todo CA citado no cabeçalho (RFnn.CAnn, RFnn.Ann ou RNnn.nn) aparece na tabela da seção 6;
  5. nenhum `;` dentro de mensagem de sequenceDiagram e nenhum `<br>` em classDiagram.
A renderização dos blocos Mermaid é feita por outro script (mmdc); este só olha a estrutura.
"""
import re
import sys
import pathlib

SECOES = [
    ("## 0. Diagrama de casos de uso", "flowchart"),
    ("## 1. Diagrama de classes", "classDiagram"),
    ("## 2. Diagrama de atividades", "flowchart"),
    ("## 3. Diagrama de sequência", "sequenceDiagram"),
    ("## 4. Máquina de estados", "stateDiagram-v2"),
    ("## 5. Diagrama de componentes", "flowchart"),
]
# ids de ator permitidos nos casos de uso (docs/arquitetura/ATORES_E_ATRIBUTOS.md §2)
ATORES = {"visitante", "autenticado", "empregado", "chefe", "empresa", "admin", "curador", "dono", "colaborador", "responsavel",
          "decisor", "participante_daci", "participante_sessao", "ia", "agendador", "oidc", "autenticador", "email", "conectores"}
ATOR_RE = re.compile(r"^\s*([A-Za-z0-9_]+)\s*\[[^\]]*\]\s*:::(ator|atorSis)\b", re.M)
CA_RE = re.compile(r"\b(RF\d+\.(?:CA|A)\d+|RN\d+\.\d+|CA\d{2})\b")


def expandir_cas(texto):
    """Expande intervalos como `RF1.CA01 … RF1.CA06` e `RF21.CA01–14`."""
    cas = set(CA_RE.findall(texto))
    for m in re.finditer(r"(RF\d+)\.CA(\d+)\s*(?:…|\.\.\.|–|-)\s*(?:RF\d+\.)?CA?(\d+)", texto):
        rf, a, b = m.group(1), int(m.group(2)), int(m.group(3))
        if b >= a and b - a < 60:
            for n in range(a, b + 1):
                cas.add(f"{rf}.CA{n:02d}")
    for m in re.finditer(r"(RF\d+\.CA\d+)((?:\s*·\s*CA\d+)+)", texto):
        rf = m.group(1).split(".")[0]
        for n in re.findall(r"CA(\d+)", m.group(2)):
            cas.add(f"{rf}.CA{int(n):02d}")
    return cas


def checar(path):
    falhas = []
    txt = pathlib.Path(path).read_text(encoding="utf-8")
    linhas = txt.splitlines()
    if not linhas or not re.match(r"^# (RF\d+|SEG) — ", linhas[0]):
        falhas.append("título fora do padrão `# RFnn — <título do card>`")
    if not any(l.startswith("**HU:**") for l in linhas[:6]):
        falhas.append("falta a linha `**HU:** … · **Sprint … · **Equivalente FAI:** … · **Aba/rota:**`")
    cab = next((l for l in linhas[:8] if l.startswith("**Critérios de aceite cobertos:**")), None)
    if cab is None:
        falhas.append("falta a linha `**Critérios de aceite cobertos:**`")

    pos = []
    for titulo, tipo in SECOES:
        idx = next((i for i, l in enumerate(linhas) if l.startswith(titulo)), None)
        if idx is None:
            falhas.append(f"seção ausente: `{titulo}`")
        pos.append(idx)
    idx6 = next((i for i, l in enumerate(linhas) if l.startswith("## 6. Rastreabilidade")), None)
    if idx6 is None:
        falhas.append("seção ausente: `## 6. Rastreabilidade`")
    ordem = [p for p in pos if p is not None] + ([idx6] if idx6 is not None else [])
    if ordem != sorted(ordem):
        falhas.append("seções fora de ordem")

    # um bloco mermaid do tipo certo em cada seção 1–5
    limites = pos + [idx6, len(linhas)]
    for k, (titulo, tipo) in enumerate(SECOES):
        ini = pos[k]
        if ini is None:
            continue
        fim = next((p for p in limites[k + 1:] if p is not None), len(linhas))
        trecho = "\n".join(linhas[ini:fim])
        blocos = re.findall(r"```mermaid\n(.*?)```", trecho, re.S)
        if not blocos:
            falhas.append(f"`{titulo}` sem bloco ```mermaid")
        elif not any(b.lstrip().startswith(tipo) for b in blocos):
            falhas.append(f"`{titulo}` sem diagrama `{tipo}`")
        if titulo.startswith("## 0.") and blocos:
            b = blocos[0]
            if "subgraph" not in b:
                falhas.append("`## 0.`: falta o limite do sistema (`subgraph`)")
            if not re.search(r"\(\[\s*\"?UC\d+", b):
                falhas.append("`## 0.`: nenhum caso de uso em pílula `UCn([\"UCn …\"])`")
            atores = ATOR_RE.findall(b)
            if not atores:
                falhas.append("`## 0.`: nenhum ator com classe `ator`/`atorSis`")
            fora = sorted({a for a, _ in atores if a not in ATORES})
            if fora:
                falhas.append("`## 0.`: atores fora do catálogo: " + ", ".join(fora))
        for b in blocos:
            if b.lstrip().startswith("classDiagram") and "<br" in b:
                falhas.append(f"`{titulo}`: `<br>` em classDiagram")
            if b.lstrip().startswith("sequenceDiagram"):
                for l in b.splitlines():
                    if re.match(r"^\s*[A-Za-z0-9_]+\s*-{1,2}[>x)]{1,2}\s*[A-Za-z0-9_]+\s*:.*;", l):
                        falhas.append(f"`{titulo}`: `;` dentro de mensagem de sequência: {l.strip()[:80]}")

    # rastreabilidade cobre todo CA do cabeçalho
    if cab is not None and idx6 is not None:
        # só a parte antes do primeiro " — " lista os CAs cobertos; depois vêm as fontes/observações
        cas_cab = expandir_cas(cab.split(" — ")[0])
        tabela = "\n".join(linhas[idx6:])
        faltam = sorted(c for c in cas_cab if c not in tabela)
        if faltam:
            falhas.append("CAs do cabeçalho ausentes na §6: " + ", ".join(faltam))
    return falhas


def main(argv):
    total = 0
    for p in argv:
        f = checar(p)
        total += len(f)
        print(f"{'OK  ' if not f else 'FAIL'} {p}")
        for x in f:
            print("     - " + x)
    return 1 if total else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
