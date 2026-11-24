import { describe, expect, it } from "vitest";
import { deadlineText, toAppNotification, type NotificationView } from "./client";
import { KIND_GLYPH } from "./mock";

describe("avisos diários de prazo na central (RF41.CA04)", () => {
  const NOW = Date.parse("2026-11-24T12:00:00Z");
  const base = { id: "p", read: false, createdAt: "2026-11-24T11:00:00Z", resourceType: "task", resourceId: "t-9", category: "PRAZO" as const };

  it("PRAZO_PROXIMO e PRAZO_VENCIDO viram linhas com link para a tarefa e data formatável", () => {
    const soon = toAppNotification({ ...base, type: "PRAZO_PROXIMO", payload: { taskTitle: "Ofício 12", dueAt: "2026-11-27", days: "3", source: "TAREFA" } } as NotificationView, NOW);
    expect(soon).toMatchObject({ kind: "PRAZO", titleKey: "prazosdiarios.notif.soon", vars: { title: "Ofício 12", date: "2026-11-27", n: 3 }, href: "/tasks/t-9", dateVars: ["date"] });
    expect(soon.minutesAgo).toBe(60);
    expect(KIND_GLYPH[soon.kind]).toBeTruthy();
    const late = toAppNotification({ ...base, type: "PRAZO_VENCIDO", payload: { taskTitle: "Ofício 12", dueAt: "2026-11-23", days: "1", source: "LEGAL" } } as NotificationView, NOW);
    expect(late).toMatchObject({ kind: "PRAZO", titleKey: "prazosdiarios.notif.overdueLegal", href: "/tasks/t-9" });
  });

  it("escolhe a chave por dias e origem; payload estranho não quebra", () => {
    expect(deadlineText("PRAZO_PROXIMO", { days: "1", source: "LEGAL" }).titleKey).toBe("prazosdiarios.notif.soonOneLegal");
    expect(deadlineText("PRAZO_PROXIMO", { days: "0" }).titleKey).toBe("prazosdiarios.notif.today");
    expect(deadlineText("PRAZO_PROXIMO", { days: "x" })).toMatchObject({ titleKey: "prazosdiarios.notif.today", vars: { title: "", date: "", n: 0 } });
  });
});
