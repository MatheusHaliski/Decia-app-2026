/**
 * Livro de auditoria somente-acréscimo (DEMO, em memória). O contrato `AuditLog` não tem update nem delete: `append` grava um
 * registro congelado (Object.freeze) encadeado ao anterior por hash; `verify` refaz a cadeia e acusa qualquer adulteração. O
 * cliente HTTP real implementará o mesmo contrato sobre a tabela append-only do servidor.
 */
import { canonicalJson, sha256Hex } from "@/lib/decia/rules";
import type { AuditInput, AuditRecord } from "./types";

export const GENESIS_HASH = "0".repeat(64);

export interface AuditLog {
  readonly source: "DEMO" | "API";
  append(input: AuditInput): AuditRecord;
  list(): readonly AuditRecord[];
  verify(): { ok: true } | { ok: false; brokenAt: number };
  subscribe(listener: () => void): () => void;
  snapshot(): number;
}

/** Conteúdo que entra no hash: tudo do registro, menos o próprio hash. */
export function recordHash(input: AuditInput, meta: { id: string; seq: number; prevHash: string }): string {
  return sha256Hex(canonicalJson({ ...input, id: meta.id, seq: meta.seq, prevHash: meta.prevHash }) + meta.prevHash);
}

const strip = (r: AuditRecord): AuditInput => ({
  at: r.at, actorId: r.actorId, action: r.action, source: r.source, sessionId: r.sessionId, decisionId: r.decisionId, contextTitle: r.contextTitle,
  target: r.target, policy: r.policy, reason: r.reason, before: r.before, proposed: r.proposed, after: r.after,
});

/** Refaz a cadeia: cada registro tem de apontar o hash do anterior e o próprio hash tem de bater com o conteúdo. */
export function verifyChain(records: readonly AuditRecord[]): { ok: true } | { ok: false; brokenAt: number } {
  let prev = GENESIS_HASH;
  for (let i = 0; i < records.length; i++) {
    const r = records[i]!;
    if (r.prevHash !== prev || r.seq !== i + 1 || recordHash(strip(r), { id: r.id, seq: r.seq, prevHash: r.prevHash }) !== r.hash) return { ok: false, brokenAt: i + 1 };
    prev = r.hash;
  }
  return { ok: true };
}

const deepFreeze = <T extends object>(o: T): T => {
  for (const v of Object.values(o)) if (v && typeof v === "object" && !Object.isFrozen(v)) deepFreeze(v as object);
  return Object.freeze(o);
};

export function createAuditLog(seed: readonly AuditInput[] = []): AuditLog {
  // lista imutável trocada a cada acréscimo (referência estável entre acréscimos, para `useSyncExternalStore`)
  let records: readonly AuditRecord[] = Object.freeze([]);
  const listeners = new Set<() => void>();
  let tick = 0;
  const push = (input: AuditInput): AuditRecord => {
    const seq = records.length + 1;
    const prevHash = records.at(-1)?.hash ?? GENESIS_HASH;
    const id = `aud-${seq.toString().padStart(5, "0")}`;
    // cópia profunda: quem chamou não consegue mudar o registro depois por referência
    const copy = JSON.parse(JSON.stringify(input)) as AuditInput;
    const record = deepFreeze({ ...copy, id, seq, prevHash, hash: recordHash(copy, { id, seq, prevHash }), chained: true });
    records = Object.freeze([...records, record]);
    return record;
  };
  for (const s of seed) push(s);
  return {
    source: "DEMO",
    append(input) {
      const r = push(input);
      tick++;
      listeners.forEach((l) => l());
      return r;
    },
    list: () => records,
    verify: () => verifyChain(records),
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    snapshot: () => tick,
  };
}
