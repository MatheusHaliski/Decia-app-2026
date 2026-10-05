import { describe, expect, it } from "vitest";
import { csp } from "./middleware";

describe("CSP do middleware", () => {
  it("usa nonce, bloqueia iframe e não libera script inline nem origem externa", () => {
    const policy = csp("n0nce==");
    expect(policy).toContain("script-src 'self' 'nonce-n0nce==' 'strict-dynamic'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("base-uri 'self'");
    expect(policy).toContain("form-action 'self'");
    expect(policy).not.toContain("'unsafe-inline' 'nonce");       // script nunca com unsafe-inline
    expect(policy).not.toMatch(/script-src[^;]*\*/);              // nenhum curinga em script-src
    expect(policy).toMatch(/connect-src 'self' https?:\/\/[^ ;]+/);
  });
});
