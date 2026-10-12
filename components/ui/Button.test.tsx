// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithProviders } from "@/test-utils/render";
import { Button, IconButton, buttonClassName } from "./Button";

describe("Button (design system v2)", () => {
  it("renderiza <button type=button> por padrão com as classes de token --ws-*", () => {
    render(<Button variant="primary">Salvar</Button>);
    const btn = screen.getByRole("button", { name: "Salvar" });
    expect(btn.tagName).toBe("BUTTON");
    expect(btn).toHaveProperty("type", "button");
    expect(btn.className).toContain("bg-ws-accent");
    expect(btn.className).toContain("text-ws-on-accent");
  });

  it("vira link: interno via next/link, externo com rel seguro", () => {
    render(<Button href="https://example.org/docs">Docs</Button>);
    const link = screen.getByRole("link", { name: "Docs" });
    expect(link.getAttribute("href")).toBe("https://example.org/docs");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    render(<Button href="/interno">Interno</Button>);
    const internal = screen.getByRole("link", { name: "Interno" });
    expect(internal.getAttribute("href")).toBe("/interno");
    expect(internal.getAttribute("rel")).toBeNull();
  });

  it("busy desabilita e marca aria-busy sem esconder o texto", () => {
    render(<Button busy>Enviando</Button>);
    const btn = screen.getByRole("button", { name: "Enviando" });
    expect(btn.hasAttribute("disabled")).toBe(true);
    expect(btn.getAttribute("aria-busy")).toBe("true");
  });

  it("link ocupado não navega: sem href, fora do tab e com clique anulado", () => {
    render(<Button href="/relatorio" busy>Gerando</Button>);
    const link = screen.getByRole("link", { name: "Gerando" });
    expect(link.hasAttribute("href")).toBe(false);
    expect(link.getAttribute("tabindex")).toBe("-1");
    const click = new MouseEvent("click", { bubbles: true, cancelable: true });
    link.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
  });

  it("icon e size=icon: glifo decorativo + rótulo acessível obrigatório no IconButton", () => {
    renderWithProviders(<><Button icon="criar-tarefa" size="sm">Nova</Button><IconButton icon="buscar" label="Buscar" /></>);
    expect(screen.getByRole("button", { name: "Nova" }).querySelector("svg[aria-hidden='true']")).not.toBeNull();
    const ib = screen.getByRole("button", { name: "Buscar" });
    expect(ib.className).toContain("size-[var(--ws-control-md)]");
  });

  it("nenhuma classe traz cor literal: só token (classes bg-ws-*/var(--ws-*))", () => {
    for (const variant of ["default", "primary", "gradient", "secondary", "ghost", "danger", "spark"] as const) {
      for (const size of ["sm", "md", "lg", "icon"] as const) {
        const cls = buttonClassName(variant, size);
        expect(cls).not.toMatch(/#[0-9a-f]{3,8}\b/i);
        expect(cls).not.toMatch(/\b(rgb|hsl)a?\(/i);
        expect(cls).not.toMatch(/\b(bg|text|border)-(red|blue|green|gray|slate|white|black)\b/);
      }
    }
  });
});
