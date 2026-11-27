import { afterEach, describe, expect, it } from "vitest";
import { DEMO_CURRENT_USER_ID } from "./fixtures";
import { resetHttpRepository } from "./http";
import { pickDecisionSource } from "./useDecisionRepository";

afterEach(() => resetHttpRepository());

describe("pickDecisionSource", () => {
  it("com sessão autenticada usa a API e a pessoa logada", () => {
    const s = pickDecisionSource({ status: "authenticated", me: { id: "u-1", displayName: "Ana" }, reload: async () => {} });
    expect(s.repo.source).toBe("API");
    expect(s.currentUserId).toBe("u-1");
    expect(s.people["u-1"]).toEqual({ name: "Ana" });
    expect(pickDecisionSource({ status: "authenticated", me: { id: "u-1" }, reload: async () => {} }).repo).toBe(s.repo);
  });

  it("sem sessão (laboratório) ou fora do provider continua no DEMO", () => {
    expect(pickDecisionSource(null).repo.source).toBe("DEMO");
    const anon = pickDecisionSource({ status: "anonymous", me: null, reload: async () => {} });
    expect(anon.repo.source).toBe("DEMO");
    expect(anon.currentUserId).toBe(DEMO_CURRENT_USER_ID);
    expect(pickDecisionSource({ status: "loading", me: null, reload: async () => {} }).pending).toBe(true);
  });
});
