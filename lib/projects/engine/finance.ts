/**
 * Business case — métodos de benefício (financeiros) da seleção de projetos (aula "Processos de iniciação" §2.1 e §2.4):
 *   VPL (valor presente líquido): Σ FCₜ / (1 + i)ᵗ — maior é melhor; VPL > 0 ⇒ viável
 *   TIR (taxa interna de retorno): taxa que zera o VPL — viável se > taxa mínima de atratividade
 *   Payback: tempo até o fluxo acumulado ficar ≥ 0 — menor é melhor (simples e descontado)
 *   ROI = (benefício − custo) / custo
 * `cashflows[0]` é o instante zero (normalmente o investimento, negativo).
 */
const r2 = (x: number) => Math.round(x * 100) / 100;
const r4 = (x: number) => Math.round(x * 1e4) / 1e4;

export function npv(rate: number, cashflows: readonly number[]): number {
  return r2(cashflows.reduce((s, cf, t) => s + cf / (1 + rate) ** t, 0));
}

/** TIR por bisseção em (−99 %, 1000 %); `null` quando não há troca de sinal (nenhuma TIR única no intervalo). */
export function irr(cashflows: readonly number[]): number | null {
  const f = (r: number) => cashflows.reduce((s, cf, t) => s + cf / (1 + r) ** t, 0);
  let lo = -0.99;
  let hi = 10;
  let flo = f(lo);
  const fhi = f(hi);
  if (!Number.isFinite(flo) || !Number.isFinite(fhi) || flo * fhi > 0) return null;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fm = f(mid);
    if (Math.abs(fm) < 1e-9) return r4(mid);
    if (flo * fm < 0) hi = mid;
    else {
      lo = mid;
      flo = fm;
    }
  }
  return r4((lo + hi) / 2);
}

/** Payback simples (em períodos, com interpolação linear dentro do período em que vira positivo); `null` se não paga. */
export function payback(cashflows: readonly number[]): number | null {
  let acc = 0;
  for (let t = 0; t < cashflows.length; t++) {
    const prev = acc;
    acc += cashflows[t]!;
    if (t > 0 && prev < 0 && acc >= 0) return r2(t - 1 + -prev / cashflows[t]!);
    if (t === 0 && acc >= 0) return 0;
  }
  return null;
}

export function discountedPayback(rate: number, cashflows: readonly number[]): number | null {
  return payback(cashflows.map((cf, t) => cf / (1 + rate) ** t));
}

/** ROI sobre o total investido (fluxos negativos) e o total recebido (positivos). */
export function roi(cashflows: readonly number[]): number | null {
  const cost = -cashflows.filter((c) => c < 0).reduce((s, c) => s + c, 0);
  const benefit = cashflows.filter((c) => c > 0).reduce((s, c) => s + c, 0);
  return cost > 0 ? r4((benefit - cost) / cost) : null;
}

export interface BusinessCaseResult { npv: number; irr: number | null; payback: number | null; discountedPayback: number | null; roi: number | null; viable: boolean }

export function businessCase(rate: number, cashflows: readonly number[]): BusinessCaseResult {
  const v = npv(rate, cashflows);
  const i = irr(cashflows);
  return { npv: v, irr: i, payback: payback(cashflows), discountedPayback: discountedPayback(rate, cashflows), roi: roi(cashflows), viable: v > 0 };
}
