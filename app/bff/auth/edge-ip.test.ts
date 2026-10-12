import { describe, expect, it } from "vitest";
import { clientIp, edgeIpHeader } from "./edge-ip";

const req = (h: Record<string, string>) => ({ headers: new Headers(h) });

/** D-14: só o cabeçalho sobrescrito pela borda é assinado; X-Forwarded-For é do cliente e nunca vale. */
describe("clientIp (BFF)", () => {
  it("X-Forwarded-For NUNCA é lido, mesmo sem X-Real-IP (o atacante escolheria o IP assinado)", () => {
    expect(clientIp(req({ "x-forwarded-for": "203.0.113.9" }), {})).toBeNull();
    expect(clientIp(req({ "x-forwarded-for": "203.0.113.9, 10.0.0.1" }), {})).toBeNull();
    expect(clientIp(req({ forwarded: "for=203.0.113.9" }), {})).toBeNull();
  });

  it("X-Real-IP (padrão) vale só como IP literal único", () => {
    expect(clientIp(req({ "x-real-ip": " 203.0.113.9 " }), {})).toBe("203.0.113.9");
    expect(clientIp(req({ "x-real-ip": "2001:db8::1" }), {})).toBe("2001:db8::1");
    expect(clientIp(req({ "x-real-ip": "203.0.113.9, 10.0.0.1" }), {})).toBeNull();
    expect(clientIp(req({ "x-real-ip": "evil;drop" }), {})).toBeNull();
    expect(clientIp(req({ "x-real-ip": "203.0.113.9", "x-forwarded-for": "198.51.100.1" }), {})).toBe("203.0.113.9");
  });

  it("WS_EDGE_IP_HEADER troca o nome do cabeçalho; vazio ou X-Forwarded-For desligam a assinatura", () => {
    expect(edgeIpHeader({})).toBe("x-real-ip");
    expect(edgeIpHeader({ WS_EDGE_IP_HEADER: "CF-Connecting-IP" })).toBe("cf-connecting-ip");
    expect(clientIp(req({ "cf-connecting-ip": "203.0.113.9", "x-real-ip": "198.51.100.1" }), { WS_EDGE_IP_HEADER: "CF-Connecting-IP" })).toBe("203.0.113.9");
    expect(edgeIpHeader({ WS_EDGE_IP_HEADER: "" })).toBeNull();
    expect(edgeIpHeader({ WS_EDGE_IP_HEADER: "X-Forwarded-For" })).toBeNull();
    expect(edgeIpHeader({ WS_EDGE_IP_HEADER: "Forwarded" })).toBeNull();
    expect(edgeIpHeader({ WS_EDGE_IP_HEADER: "bad header" })).toBeNull();
    expect(clientIp(req({ "x-real-ip": "203.0.113.9" }), { WS_EDGE_IP_HEADER: "" })).toBeNull();
  });
});
