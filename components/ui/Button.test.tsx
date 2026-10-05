// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button, buttonClassName } from "./Button";

describe("Button (design system)", () => {
  it("renderiza <button type=button> por padrão com as classes de token", () => {
    render(<Button variant="primary">Salvar</Button>);
    const btn = screen.getByRole("button", { name: "Salvar" });
    expect(btn.tagName).toBe("BUTTON");
    expect(btn).toHaveProperty("type", "button");
    expect(btn.className).toContain("bg-[var(--primary)]");
    expect(btn.className).toContain("text-[var(--on-primary)]");
  });

  it("vira link quando recebe href, com rel seguro em URL externa", () => {
    render(<Button href="https://example.org/docs">Docs</Button>);
    const link = screen.getByRole("link", { name: "Docs" });
    expect(link.getAttribute("href")).toBe("https://example.org/docs");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    render(<Button href="/interno">Interno</Button>);
    expect(screen.getByRole("link", { name: "Interno" }).getAttribute("rel")).toBeNull();
  });

  it("busy desabilita e marca aria-busy sem esconder o texto", () => {
    render(<Button busy>Enviando</Button>);
    const btn = screen.getByRole("button", { name: "Enviando" });
    expect(btn.hasAttribute("disabled")).toBe(true);
    expect(btn.getAttribute("aria-busy")).toBe("true");
  });

  it("nenhuma classe traz cor literal: só var(--token)", () => {
    for (const variant of ["default", "primary", "secondary", "ghost", "danger"] as const) {
      for (const size of ["sm", "md", "lg"] as const) {
        const cls = buttonClassName(variant, size);
        expect(cls).not.toMatch(/#[0-9a-f]{3,8}\b/i);
        expect(cls).not.toMatch(/\b(rgb|hsl)a?\(/i);
      }
    }
  });
});
