#!/usr/bin/env python3
"""Oráculo de referência das regras de cálculo do DECIA (docs/decia/03_MODELO_FUNCIONAL.md §6).

Gera contracts/decia/vetores.json, consumido pelos testes Java (ws-domain, pacote decisao) e TypeScript (lib/decia).
As duas implementações devem produzir exatamente as mesmas saídas. Uso: python3 contracts/decia/gerar_vetores.py
"""
import hashlib
import json
import math
from pathlib import Path

EPS = 1e-9


def r2(x):
    """Arredondamento meio-para-cima em 2 casas (regra §6.1)."""
    return math.floor(x * 100 + 0.5 + EPS) / 100


def median(xs):
    s = sorted(xs)
    n = len(s)
    return s[n // 2] if n % 2 else (s[n // 2 - 1] + s[n // 2]) / 2


def consensus(assessments, alts, crits):
    """{alt: {crit: mediana}} só para células com avaliação."""
    out = {a: {} for a in alts}
    for a in alts:
        for c in crits:
            vals = [x["score"] for x in assessments if x["alt"] == a and x["crit"] == c]
            if vals:
                out[a][c] = median(vals)
    return out


def score(inp, weights_override=None):
    crits = [c["key"] for c in inp["criteria"]]
    alts = [a["key"] for a in inp["alternatives"] if a.get("status", "ATIVA") == "ATIVA"]
    weighting = inp["weightingEnabled"]
    if not crits:
        return {"valid": False, "reason": "SEM_CRITERIOS", "weightSum": None, "ranking": [], "incomplete": [], "leader": None}
    if weighting:
        w = weights_override or {c["key"]: c.get("weightPct") for c in inp["criteria"]}
        if any(v is None or v < 0 or v > 100 for v in w.values()):
            return {"valid": False, "reason": "PESO_INVALIDO", "weightSum": None, "ranking": [], "incomplete": [], "leader": None}
        total = sum(w.values())
        if abs(total - 100) > 0.01:
            return {"valid": False, "reason": "PESOS_NAO_SOMAM_100", "weightSum": r2(total), "ranking": [], "incomplete": [], "leader": None}
    else:
        w = {c: 1 for c in crits}
    cons = consensus(inp["assessments"], alts, crits)
    sw = sum(w[c] for c in crits)
    ranking, incomplete = [], []
    for a in alts:
        if len(cons[a]) < len(crits):
            incomplete.append(a)
            continue
        contrib = {c: r2(cons[a][c] * w[c] / sw) for c in crits}
        total = r2(sum(cons[a][c] * w[c] for c in crits) / sw)
        ranking.append({"alt": a, "score": total, "contributions": contrib})
    ranking.sort(key=lambda r: (-r["score"], r["alt"]))
    leader = None
    if ranking and (len(ranking) == 1 or ranking[0]["score"] - ranking[1]["score"] >= 0.05 - EPS):
        leader = ranking[0]["alt"]
    return {"valid": True, "reason": None, "weightSum": 100 if weighting else None, "ranking": ranking, "incomplete": incomplete, "leader": leader}


def divergence(inp):
    out = []
    for a in [x["key"] for x in inp["alternatives"]]:
        for c in [x["key"] for x in inp["criteria"]]:
            vals = [x["score"] for x in inp["assessments"] if x["alt"] == a and x["crit"] == c]
            if len(vals) >= 2:
                amp = max(vals) - min(vals)
                lvl = "ALTA" if amp >= 3 else "MODERADA" if amp == 2 else "BAIXA"
                out.append({"alt": a, "crit": c, "range": amp, "level": lvl})
    return out


def dominance(inp):
    crits = [c["key"] for c in inp["criteria"]]
    alts = [a["key"] for a in inp["alternatives"] if a.get("status", "ATIVA") == "ATIVA"]
    cons = consensus(inp["assessments"], alts, crits)
    full = [a for a in alts if len(cons[a]) == len(crits)]
    out = []
    for a in full:
        for b in full:
            if a == b:
                continue
            if all(cons[a][c] >= cons[b][c] for c in crits) and any(cons[a][c] > cons[b][c] for c in crits):
                out.append({"dominant": a, "dominated": b, "betterOn": [c for c in crits if cons[a][c] > cons[b][c]]})
    return out


def sensitivity(inp):
    base = score(inp)
    if not inp["weightingEnabled"] or not base["valid"] or base["leader"] is None:
        return {"applicable": False, "flips": [], "robust": None}
    leader = base["leader"]
    weights = {c["key"]: c["weightPct"] for c in inp["criteria"]}
    challengers = [r["alt"] for r in base["ranking"] if r["alt"] != leader]
    flips = []
    for pos, c in enumerate([x["key"] for x in inp["criteria"]]):
        wc = weights[c]
        if wc >= 100:
            continue
        for x in challengers:
            found = None
            for d in range(1, 101):
                for cand in (wc - d, wc + d):
                    if cand < 0 or cand > 100 or (cand == wc):
                        continue
                    nw = {k: (cand if k == c else v * (100 - cand) / (100 - wc)) for k, v in weights.items()}
                    s = score(inp, nw)
                    if s["leader"] == x:
                        found = cand
                        break
                if found is not None:
                    break
            if found is not None:
                flips.append({"criterion": c, "fromPct": wc, "toPct": found, "delta": abs(found - wc), "newLeader": x, "_pos": pos})
    flips.sort(key=lambda f: (f["delta"], f["_pos"], f["newLeader"]))
    for f in flips:
        del f["_pos"]
    return {"applicable": True, "flips": flips, "robust": len(flips) == 0, "sensitive": any(f["delta"] <= 10 for f in flips)}


REL = {"ALTA": 3, "MEDIA": 2, "BAIXA": 1}


def evidence_strength(inp):
    alt = inp["alt"]
    sup, con, sources = 0.0, 0.0, set()
    for e in inp["evidence"]:
        if e.get("superseded"):
            continue
        for link in e["links"]:
            if link["alt"] != alt:
                continue
            wgt = REL[e["reliability"]] * (0.5 if e["nature"] == "OPINIAO" else 1)
            if link["stance"] == "SUSTENTA":
                sup += wgt
                sources.add(e["source"])
            elif link["stance"] == "CONTRADIZ":
                con += wgt
    if sup == 0 and con == 0:
        return {"level": "FRACA", "support": 0, "contra": 0, "reason": "SEM_EVIDENCIA"}
    if sup >= 6 and len(sources) >= 2 and con < sup / 2:
        lvl = "FORTE"
    elif sup >= 3 and con < sup:
        lvl = "MODERADA"
    else:
        lvl = "FRACA"
    return {"level": lvl, "support": sup, "contra": con, "reason": None}


LIK = ["RARA", "POSSIVEL", "PROVAVEL", "QUASE_CERTA"]
IMP = ["BAIXO", "MEDIO", "ALTO", "CRITICO"]
MATRIX = [
    ["BAIXO", "BAIXO", "MEDIO", "ALTO"],
    ["BAIXO", "MEDIO", "ALTO", "ALTO"],
    ["MEDIO", "ALTO", "ALTO", "CRITICO"],
    ["MEDIO", "ALTO", "CRITICO", "CRITICO"],
]


def severity(lik, imp):
    return MATRIX[LIK.index(lik)][IMP.index(imp)]


def decision_risk(inp):
    alt = inp["alt"]
    sevs = [severity(r["likelihood"], r["impact"]) for r in inp["risks"]
            if r["status"] == "ABERTO" and (r.get("alt") in (None, alt))]
    if any(a["importance"] == "CRITICO" and a["status"] == "INVALIDADA" for a in inp.get("assumptions", [])):
        sevs.append("ALTO")
    if not sevs:
        return "NAO_AVALIADO"
    return max(sevs, key=IMP.index)


def band(pct):
    return "BAIXA" if pct < 40 else "MEDIA" if pct < 70 else "ALTA"


def brier(forecasts):
    res = [f for f in forecasts if f["resolution"] in ("OCORREU", "NAO_OCORREU")]
    if not res:
        return {"n": 0, "brier": None}
    v = sum((f["probabilityPct"] / 100 - (1 if f["resolution"] == "OCORREU" else 0)) ** 2 for f in res) / len(res)
    return {"n": len(res), "brier": round(v, 4)}


def canonical(obj):
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def snapshot_hash(obj):
    return hashlib.sha256(canonical(obj).encode("utf-8")).hexdigest()


# ---------- casos ----------
ARQ = {  # Railway × AWS × Azure (exemplo de arquitetura, 06_APLICACAO_PRATICA §1)
    "weightingEnabled": True,
    "criteria": [
        {"key": "seguranca", "weightPct": 30}, {"key": "custo", "weightPct": 20},
        {"key": "escalabilidade", "weightPct": 25}, {"key": "tempo", "weightPct": 15}, {"key": "manutencao", "weightPct": 10},
    ],
    "alternatives": [{"key": "A"}, {"key": "B"}, {"key": "C"}, {"key": "D", "status": "DESCARTADA"}],
    "assessments": [
        *[{"alt": "A", "crit": c, "score": s, "by": "u1"} for c, s in [("seguranca", 3), ("custo", 5), ("escalabilidade", 3), ("tempo", 5), ("manutencao", 4)]],
        *[{"alt": "B", "crit": c, "score": s, "by": "u1"} for c, s in [("seguranca", 5), ("custo", 2), ("escalabilidade", 5), ("tempo", 2), ("manutencao", 3)]],
        *[{"alt": "C", "crit": c, "score": s, "by": "u1"} for c, s in [("seguranca", 4), ("custo", 3), ("escalabilidade", 4), ("tempo", 3), ("manutencao", 3)]],
        {"alt": "B", "crit": "seguranca", "score": 2, "by": "u2"},
        {"alt": "B", "crit": "seguranca", "score": 5, "by": "u3"},
    ],
}
IGUAL = {
    "weightingEnabled": False,
    "criteria": [{"key": "valor"}, {"key": "esforco"}],
    "alternatives": [{"key": "A"}, {"key": "B"}, {"key": "C"}],
    "assessments": [
        {"alt": "A", "crit": "valor", "score": 4, "by": "u1"}, {"alt": "A", "crit": "esforco", "score": 4, "by": "u1"},
        {"alt": "B", "crit": "valor", "score": 4, "by": "u1"}, {"alt": "B", "crit": "esforco", "score": 3, "by": "u1"},
        {"alt": "C", "crit": "valor", "score": 5, "by": "u1"},
    ],
}
EMPATE = {
    "weightingEnabled": False,
    "criteria": [{"key": "x"}, {"key": "y"}],
    "alternatives": [{"key": "A"}, {"key": "B"}],
    "assessments": [
        {"alt": "A", "crit": "x", "score": 5, "by": "u1"}, {"alt": "A", "crit": "y", "score": 3, "by": "u1"},
        {"alt": "B", "crit": "x", "score": 3, "by": "u1"}, {"alt": "B", "crit": "y", "score": 5, "by": "u1"},
    ],
}
SOMA_ERRADA = {**ARQ, "criteria": [{**c, "weightPct": (c["weightPct"] + 5 if c["key"] == "custo" else c["weightPct"])} for c in ARQ["criteria"]]}
SEM_CRITERIOS = {"weightingEnabled": False, "criteria": [], "alternatives": [{"key": "A"}], "assessments": []}
MEDIANA_PAR = {
    "weightingEnabled": False, "criteria": [{"key": "x"}], "alternatives": [{"key": "A"}],
    "assessments": [{"alt": "A", "crit": "x", "score": s, "by": f"u{i}"} for i, s in enumerate([2, 3, 4, 5])],
}

EVID = [
    {"name": "forte", "input": {"alt": "B", "evidence": [
        {"nature": "EVIDENCIA", "reliability": "ALTA", "source": "teste-carga", "links": [{"alt": "B", "stance": "SUSTENTA"}]},
        {"nature": "FATO", "reliability": "ALTA", "source": "sla-fornecedor", "links": [{"alt": "B", "stance": "SUSTENTA"}]},
        {"nature": "OPINIAO", "reliability": "MEDIA", "source": "especialista", "links": [{"alt": "B", "stance": "CONTRADIZ"}]},
    ]}},
    {"name": "moderada", "input": {"alt": "B", "evidence": [
        {"nature": "EVIDENCIA", "reliability": "ALTA", "source": "teste-carga", "links": [{"alt": "B", "stance": "SUSTENTA"}]},
        {"nature": "FATO", "reliability": "MEDIA", "source": "teste-carga", "links": [{"alt": "B", "stance": "SUSTENTA"}, {"alt": "A", "stance": "CONTRADIZ"}]},
        {"nature": "EVIDENCIA", "reliability": "ALTA", "source": "teste-carga", "links": [{"alt": "B", "stance": "SUSTENTA"}]},
    ]}},
    {"name": "fraca-contradita", "input": {"alt": "A", "evidence": [
        {"nature": "EVIDENCIA", "reliability": "ALTA", "source": "s1", "links": [{"alt": "A", "stance": "SUSTENTA"}]},
        {"nature": "EVIDENCIA", "reliability": "ALTA", "source": "s2", "links": [{"alt": "A", "stance": "CONTRADIZ"}]},
    ]}},
    {"name": "substituida-nao-conta", "input": {"alt": "A", "evidence": [
        {"nature": "EVIDENCIA", "reliability": "ALTA", "source": "s1", "superseded": True, "links": [{"alt": "A", "stance": "SUSTENTA"}]},
    ]}},
]

RISKS = [
    {"name": "critico", "input": {"alt": "B", "risks": [
        {"likelihood": "PROVAVEL", "impact": "CRITICO", "status": "ABERTO", "alt": "B"},
        {"likelihood": "RARA", "impact": "BAIXO", "status": "ABERTO"},
    ]}},
    {"name": "mitigado-ignorado", "input": {"alt": "B", "risks": [
        {"likelihood": "QUASE_CERTA", "impact": "CRITICO", "status": "MITIGADO", "alt": "B"},
        {"likelihood": "POSSIVEL", "impact": "MEDIO", "status": "ABERTO", "alt": "B"},
        {"likelihood": "QUASE_CERTA", "impact": "CRITICO", "status": "ABERTO", "alt": "A"},
    ]}},
    {"name": "premissa-critica-invalidada", "input": {"alt": "B", "risks": [
        {"likelihood": "RARA", "impact": "MEDIO", "status": "ABERTO", "alt": "B"}],
        "assumptions": [{"importance": "CRITICO", "status": "INVALIDADA"}]}},
    {"name": "nao-avaliado", "input": {"alt": "B", "risks": []}},
]

FORECASTS = [
    {"probabilityPct": 80, "resolution": "OCORREU"}, {"probabilityPct": 70, "resolution": "NAO_OCORREU"},
    {"probabilityPct": 30, "resolution": "NAO_OCORREU"}, {"probabilityPct": 90, "resolution": "OCORREU"},
    {"probabilityPct": 60, "resolution": "PENDENTE"}, {"probabilityPct": 50, "resolution": "ANULADA"},
]

SNAP = {"decisionId": "d-1", "selected": "B", "confidencePct": 70, "scores": [{"alt": "B", "score": 4.25}, {"alt": "A", "score": 3.8}],
        "rationale": "Escala e segurança pesam mais; custo inicial aceito.", "weights": {"custo": 20, "seguranca": 30}}

cases = {
    "version": "decia-scoring-v1",
    "scoring": [
        {"name": "arquitetura-ponderada", "input": ARQ, "expected": score(ARQ)},
        {"name": "pesos-iguais-incompleta", "input": IGUAL, "expected": score(IGUAL)},
        {"name": "empate-tecnico", "input": EMPATE, "expected": score(EMPATE)},
        {"name": "pesos-nao-somam-100", "input": SOMA_ERRADA, "expected": score(SOMA_ERRADA)},
        {"name": "mediana-par", "input": MEDIANA_PAR, "expected": score(MEDIANA_PAR)},
        {"name": "sem-criterios", "input": SEM_CRITERIOS, "expected": score(SEM_CRITERIOS)},
    ],
    "divergence": [{"name": "arquitetura", "input": ARQ, "expected": divergence(ARQ)}],
    "dominance": [{"name": "arquitetura", "input": ARQ, "expected": dominance(ARQ)},
                  {"name": "pesos-iguais", "input": IGUAL, "expected": dominance(IGUAL)}],
    "sensitivity": [{"name": "arquitetura", "input": ARQ, "expected": sensitivity(ARQ)},
                    {"name": "sem-criterios", "input": SEM_CRITERIOS, "expected": sensitivity(SEM_CRITERIOS)},
                    {"name": "sem-pesos", "input": IGUAL, "expected": sensitivity(IGUAL)}],
    "evidenceStrength": [{**e, "expected": evidence_strength(e["input"])} for e in EVID],
    "riskSeverityMatrix": [{"likelihood": l, "impact": i, "expected": severity(l, i)} for l in LIK for i in IMP],
    "decisionRisk": [{**r, "expected": decision_risk(r["input"])} for r in RISKS],
    "confidenceBand": [{"pct": p, "expected": band(p)} for p in (0, 35, 40, 65, 70, 100)],
    "brier": [{"name": "misto", "input": FORECASTS, "expected": brier(FORECASTS)}],
    "snapshotHash": [{"name": "canonico", "input": SNAP, "canonical": canonical(SNAP), "sha256": snapshot_hash(SNAP)}],
}
out = Path(__file__).with_name("vetores.json")
out.write_text(json.dumps(cases, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("ok", out)
