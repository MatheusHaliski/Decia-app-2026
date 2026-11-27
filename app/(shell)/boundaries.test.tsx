// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Providers, renderWithProviders } from "@/test-utils/render";
import ShellError from "./error";
import ShellLoading from "./loading";
import GlobalError from "../global-error";

describe("fronteiras de rota do shell", () => {
  it("error.tsx: linguagem de usuário, tentar de novo (retry) e o código da API para o suporte", () => {
    const retry = vi.fn();
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    renderWithProviders(<ShellError error={Object.assign(new Error("TypeError: x is undefined"), { correlationId: "corr-42" })} retry={retry} />);
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("Não foi possível abrir esta tela");
    expect(alert.textContent).toContain("corr-42");
    expect(alert.textContent).not.toContain("TypeError"); // a mensagem técnica nunca vai para a tela
    fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(retry).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("link", { name: "Voltar ao início" }).getAttribute("href")).toBe("/today");
    spy.mockRestore();
  });

  it("error.tsx: valor lançado que não é Error (Next 16 repassa como está) ainda mostra a tela, sem código", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    renderWithProviders(<ShellError error="falhou" retry={() => {}} />, { prefs: { language: "en" } });
    expect(screen.getByRole("alert").textContent).toContain("We couldn't open this screen");
    expect(screen.queryByText(/code/)).toBeNull();
    spy.mockRestore();
  });

  it("loading.tsx: esqueleto com aria-busy, nunca tela em branco", () => {
    render(<Providers><ShellLoading /></Providers>);
    expect(screen.getByTestId("route-loading").querySelector("[aria-busy='true']")).toBeTruthy();
  });

  it("global-error.tsx: funciona sem os provedores do app e mostra o digest do servidor", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const retry = vi.fn();
    // o componente traz o próprio <html>/<body>; no teste ele é montado dentro de um container (aviso de aninhamento esperado)
    render(<GlobalError error={Object.assign(new Error("boom"), { digest: "dg-7" })} retry={retry} />);
    expect(screen.getByRole("alert").textContent).toContain("O Work Station encontrou um problema");
    expect(screen.getByRole("alert").textContent).toContain("dg-7");
    fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(retry).toHaveBeenCalled();
    spy.mockRestore();
  });
});
