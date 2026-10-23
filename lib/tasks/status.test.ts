import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { TASK_STATES } from "@/lib/social/types";
import { canTransitionTask, nextActionOf, publicationOf, TASK_TRANSITIONS, workStatusOf } from "./status";

const JAVA = fileURLToPath(new URL("../../ws-domain/src/main/java/br/gov/pr/secid/workstation/domain/acervo/TaskState.java", import.meta.url));

describe("estados de tarefa padronizados", () => {
  it("cada estado tem eixo de execução ou de publicação, nunca os dois", () => {
    for (const s of TASK_STATES) expect(workStatusOf(s) === null).toBe(publicationOf(s) !== null);
    expect(workStatusOf("EM_USO")).toBe("EM_ANDAMENTO");
    expect(workStatusOf("DISPONIVEL")).toBe("A_REALIZAR");
    expect(workStatusOf("CONCLUIDA")).toBe("CONCLUIDO");
  });
  it("transições espelham TaskState.java exatamente", () => {
    const src = fs.readFileSync(JAVA, "utf8");
    const parsed: Record<string, string[]> = {};
    for (const m of src.matchAll(/\.from\((\w+)\)\.to\(([^)]*)\)/g)) parsed[m[1]!] = m[2]!.split(",").map((x) => x.trim());
    expect(Object.keys(parsed).sort()).toEqual([...TASK_STATES].sort());
    for (const s of TASK_STATES) expect([...TASK_TRANSITIONS[s]].sort(), s).toEqual(parsed[s]!.sort());
  });
  it("bloquear exige causa; transição fora da tabela é recusada", () => {
    expect(canTransitionTask("EM_USO", "BLOQUEADA")).toEqual({ ok: false, reason: "TAREFA_BLOQUEIO_SEM_CAUSA" });
    expect(canTransitionTask("EM_USO", "BLOQUEADA", "Aguardando parecer jurídico")).toEqual({ ok: true });
    expect(canTransitionTask("RASCUNHO", "CONCLUIDA")).toEqual({ ok: false, reason: "TAREFA_TRANSICAO_INVALIDA" });
  });
  it("próxima ação por estado", () => {
    expect(nextActionOf("DISPONIVEL")).toBe("INICIAR");
    expect(nextActionOf("EM_USO")).toBe("CONCLUIR");
    expect(nextActionOf("BLOQUEADA")).toBe("DESBLOQUEAR");
    expect(nextActionOf("CONCLUIDA")).toBeNull();
  });
});
