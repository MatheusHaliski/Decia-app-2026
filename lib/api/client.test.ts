import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setCurrentLocale } from "@/lib/i18n/state";
import { ApiError, api, auth, checkPath, describeError, qs, tokenStore } from "./client";

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });

describe("cliente da API (contrato Bloco 3: {code, message, details, correlationId})", () => {
  const fetchMock = vi.fn<typeof fetch>();
  beforeEach(() => { vi.stubGlobal("fetch", fetchMock); fetchMock.mockReset(); tokenStore.clear(); setCurrentLocale("pt-BR"); });
  afterEach(() => vi.unstubAllGlobals());

  it("GET monta URL na API, manda Accept-Language e Bearer quando há token", async () => {
    tokenStore.set("tok");
    fetchMock.mockResolvedValueOnce(json(200, { ok: true }));
    await expect(api.get("/api/me")).resolves.toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toMatch(/\/api\/me$/);
    const h = init!.headers as Record<string, string>;
    expect(h.Authorization).toBe("Bearer tok");
    expect(h["Accept-Language"]).toBe("pt-BR");
  });

  it("erro vira ApiError com code/details/correlationId/Retry-After e mensagens i18n por status", async () => {
    fetchMock.mockResolvedValueOnce(json(429, { status: 429, code: "MUITAS_TENTATIVAS", message: "x", correlationId: "c-9" }, { "Retry-After": "30" }));
    const err = await api.post("/api/auth/login", {}, { anonymous: true }).catch((e) => e as ApiError);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe("MUITAS_TENTATIVAS");
    expect(err.correlationId).toBe("c-9");
    expect(err.retryAfterSeconds).toBe(30);
    expect(describeError(err)).toContain("30");
    expect(describeError(new ApiError(503, "SERVICO_INDISPONIVEL", "x"))).toBe("A API está indisponível no momento. Tente de novo em instantes.");
    expect(describeError(new ApiError(401, "CREDENCIAIS_INVALIDAS", "x"))).toContain("credenciais");
    const v = new ApiError(422, "VALIDACAO", "x", { fields: { email: "inválido" } });
    expect(v.fields).toEqual({ email: "inválido" });
    setCurrentLocale("en");
    expect(describeError(new ApiError(0, "OFFLINE", "x"))).toBe("No connection to the API. Check the network and try again.");
  });

  it("401 com sessão restaurável tenta /bff/auth/refresh e repete; sem sucesso limpa o token", async () => {
    tokenStore.set("velho");
    fetchMock
      .mockResolvedValueOnce(json(401, { code: "TOKEN_EXPIRADO" }))
      .mockResolvedValueOnce(json(200, { accessToken: "novo" }))
      .mockResolvedValueOnce(json(200, { me: 1 }));
    await expect(api.get("/api/me")).resolves.toEqual({ me: 1 });
    expect(String(fetchMock.mock.calls[1]![0])).toBe("/bff/auth/refresh");
    expect(tokenStore.access).toBe("novo");
    fetchMock.mockResolvedValueOnce(json(401, { code: "TOKEN_EXPIRADO" })).mockResolvedValueOnce(json(401, { code: "SEM_SESSAO" }));
    await expect(api.get("/api/me")).rejects.toBeInstanceOf(ApiError);
    expect(tokenStore.access).toBeNull();
  });

  it("rede fora vira OFFLINE (status 0) e caminhos suspeitos são barrados", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("fail"));
    const err = await api.get("/api/x").catch((e) => e as ApiError);
    expect(err.status).toBe(0);
    expect(err.code).toBe("OFFLINE");
    expect(() => checkPath("/api/../admin")).toThrow(ApiError);
    expect(() => checkPath("/api/a%2Fb")).toThrow(ApiError);
    expect(() => checkPath("api/sem-barra")).toThrow(ApiError);
    expect(() => checkPath("/api/ok?x=1")).not.toThrow();
  });

  it("auth: login guarda o access token em memória (BFF), register devolve o Receipt sem sessão, reset usa /password-reset/request", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { accessToken: "a1", tokenType: "Bearer", expiresIn: 900, user: { id: "u", username: "x" } }));
    const s = await auth.login({ identifier: "x", password: "y", rememberMe: true });
    expect(s.accessToken).toBe("a1");
    expect(tokenStore.access).toBe("a1");
    expect(String(fetchMock.mock.calls[0]![0])).toBe("/bff/auth/login");
    expect(JSON.parse(String(fetchMock.mock.calls[0]![1]!.body))).toMatchObject({ rememberMe: true });
    fetchMock.mockResolvedValueOnce(json(202, { status: "PENDING_EMAIL_VERIFICATION", maskedEmail: "p***@x.gov.br", nextStep: "VERIFY_EMAIL" }));
    const r = await auth.register({ profileType: "EMPREGADO", fullName: "P", username: "p", email: "p@x", password: "123456789012", confirmPassword: "123456789012", acceptTerms: true });
    expect(r.maskedEmail).toBe("p***@x.gov.br");
    fetchMock.mockResolvedValueOnce(json(202, { status: "SENT" }));
    await auth.passwordReset({ email: "p@x" });
    expect(String(fetchMock.mock.calls[2]![0])).toMatch(/\/api\/auth\/password-reset\/request$/);
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await auth.logout();
    expect(tokenStore.access).toBeNull();
  });

  it("qs ignora vazios e repete arrays", () => {
    expect(qs({ a: 1, b: "", c: null, d: ["x", "y"], e: undefined })).toBe("?a=1&d=x&d=y");
    expect(qs({})).toBe("");
  });
});
