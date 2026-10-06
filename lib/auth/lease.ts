/**
 * Trava entre abas para a renovação quando o navegador não tem Web Locks (Bloco 4, D-61; Codex no PR #39): duas abas
 * renovando ao mesmo tempo com o mesmo cookie de refresh fariam o backend ver reuso do token girado e revogar a família
 * inteira — reabrir duas abas derrubaria a sessão em todas. Arrendamento no `localStorage` por escrita-e-conferência:
 * grava `{dono, até}`, espera um instante para as escritas concorrentes assentarem e só segue quem ainda é o dono.
 * O arrendamento expira sozinho (aba que fechou no meio não trava as outras) e tem teto de espera.
 */
export const LEASE_KEY = "ws.auth.refresh-lease";

interface Lease { owner: string; until: number }

export interface LeaseDeps {
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null;
  now: () => number;
  sleep: (ms: number) => Promise<void>;
  random: () => number;
}

const defaultStorage = (): LeaseDeps["storage"] => {
  try { return typeof localStorage !== "undefined" ? localStorage : null; } catch { return null; }
};

const defaults = (): LeaseDeps => ({
  storage: defaultStorage(),
  now: () => Date.now(),
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
  random: Math.random,
});

const read = (s: NonNullable<LeaseDeps["storage"]>): Lease | null => {
  try {
    const v = JSON.parse(s.getItem(LEASE_KEY) ?? "null") as Partial<Lease> | null;
    return v && typeof v.owner === "string" && typeof v.until === "number" ? (v as Lease) : null;
  } catch {
    return null;
  }
};

/** Roda `fn` com exclusão mútua entre abas; sem `localStorage` (bloqueado, modo privado antigo) roda direto. */
export async function withStorageLease<T>(fn: () => Promise<T>, deps: Partial<LeaseDeps> = {}, holdMs = 10_000, maxWaitMs = 15_000): Promise<T> {
  const d = { ...defaults(), ...deps };
  const s = d.storage;
  if (!s) return fn();
  const me = `${d.now()}-${d.random().toString(36).slice(2)}`;
  const giveUpAt = d.now() + maxWaitMs;
  for (;;) {
    const cur = read(s);
    if (!cur || cur.until <= d.now()) {
      try { s.setItem(LEASE_KEY, JSON.stringify({ owner: me, until: d.now() + holdMs })); } catch { return fn(); }
      await d.sleep(30 + Math.floor(d.random() * 40));   // deixa escritas concorrentes de outras abas assentarem
      if (read(s)?.owner === me) {
        try {
          return await fn();
        } finally {
          try { if (read(s)?.owner === me) s.removeItem(LEASE_KEY); } catch { /* armazenamento sumiu: expira sozinho */ }
        }
      }
    }
    if (d.now() >= giveUpAt) return fn();                 // teto: melhor tentar do que travar a aba para sempre
    await d.sleep(80 + Math.floor(d.random() * 80));
  }
}
