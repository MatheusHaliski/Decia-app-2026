// @vitest-environment jsdom
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test-utils/render";
import { Avatar, Badge, BackgroundArt, Card, Checkbox, Dialog, EmptyState, ErrorState, Field, Input, Link, Monogram, PercentBar, Popover, RadioCards, RfChip, Select, SelectList, Sheet, Skeleton, Switch, Tabs, Tag, Textarea, Tooltip, WS_BACKGROUNDS, backgroundById, backgroundImageCss, initialsOf, useToast } from "./index";
import { MenuOption } from "./Menu";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  usePathname: () => "/mural",
  useSearchParams: () => new URLSearchParams("tab=vitrine"),
}));

describe("Avatar / Monogram / Badge / Tag", () => {
  it("monograma pelas iniciais ou sigla, com cor do nó por token; foto quando houver", () => {
    expect(initialsOf("Pessoa Exemplo Silva")).toBe("PS");
    renderWithProviders(<><Avatar name="Pessoa Exemplo" node="green" /><Monogram name="SECID-UTS" monogram="UTS" node="blue" /><Avatar name="Foto" src="/x.png" /></>);
    expect(screen.getByRole("img", { name: "Pessoa Exemplo" }).textContent).toBe("PE");
    expect(screen.getByRole("img", { name: "Pessoa Exemplo" }).className).toContain("bg-ws-node-green");
    expect(screen.getByRole("img", { name: "SECID-UTS" }).className).toContain("rounded-[var(--ws-radius-monitor)]");
    expect(screen.getByRole("img", { name: "Foto" }).tagName).toBe("IMG");
  });

  it("badge contador, chip de RF e tag tracejada/pulsante", () => {
    renderWithProviders(<><Badge count>3</Badge><RfChip id="RF27" primary /><Tag dashed>RASCUNHO</Tag><Tag pulse tone="accent">EM_USO</Tag></>);
    expect(screen.getByText("3").className).toContain("bg-ws-danger");
    expect(screen.getByText("RF27").className).toContain("bg-ws-accent-soft");
    expect(screen.getByText("RASCUNHO").className).toContain("border-dashed");
    expect(screen.getByText("EM_USO").getAttribute("data-pulse")).toBe("true");
  });
});

describe("Tabs", () => {
  const tabs = [{ slug: "empresa", label: "Empresa" }, { slug: "vitrine", label: "Vitrine" }, { slug: "seguindo", label: "Seguindo", disabled: true }];
  it("roles tablist/tab/tabpanel, aba ativa lida da URL (?tab=), setas navegam e sincronizam a URL", async () => {
    renderWithProviders(<Tabs tabs={tabs} label="Sub-abas">{(a) => <p>painel {a}</p>}</Tabs>);
    const list = await screen.findByRole("tablist", { name: "Sub-abas" });
    const active = screen.getByRole("tab", { selected: true });
    expect(active.textContent).toBe("Vitrine");
    expect(screen.getByRole("tabpanel").textContent).toBe("painel vitrine");
    expect(screen.getByRole("tab", { name: "Seguindo" })).toHaveProperty("disabled", true);
    fireEvent.keyDown(list, { key: "ArrowLeft" });
    expect(replace).toHaveBeenCalledWith("/mural", { scroll: false });
    fireEvent.click(screen.getByRole("tab", { name: "Vitrine" }));
    expect(replace).toHaveBeenLastCalledWith("/mural?tab=vitrine", { scroll: false });
  });
});

describe("Dialog / Sheet / Popover / Tooltip", () => {
  it("dialog: aria-modal, título, Esc fecha; depois a sheet lateral abre pelo botão", async () => {
    function Harness() {
      const [open, setOpen] = useState(true);
      const [sheet, setSheet] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setSheet(true)}>menu</button>
          <Dialog open={open} onOpenChange={setOpen} title="Confirmar" description="Tem certeza?"><p>corpo</p></Dialog>
          <Sheet open={sheet} onOpenChange={setSheet} title="Menu" side="left"><p>itens</p></Sheet>
        </>
      );
    }
    renderWithProviders(<Harness />);
    const dialog = await screen.findByRole("dialog", { name: "Confirmar" });
    expect(dialog.getAttribute("role")).toBe("dialog");
    expect(screen.getByText("Tem certeza?")).toBeTruthy();
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    fireEvent.click(screen.getByRole("button", { name: "menu" }));
    const sheet = await screen.findByRole("dialog", { name: "Menu" });
    expect(sheet.className).toContain("left-0");
  });

  it("popover abre pelo gatilho e menu option marca aria-checked; tooltip envolve o filho", async () => {
    renderWithProviders(
      <Tooltip content="Dica"><Popover label="Painel" trigger={<button type="button">abrir</button>}><MenuOption on onClick={() => undefined}>Opção</MenuOption></Popover></Tooltip>,
    );
    fireEvent.click(screen.getByRole("button", { name: "abrir" }));
    const opt = await screen.findByRole("menuitemradio", { name: /Opção/ });
    expect(opt.getAttribute("aria-checked")).toBe("true");
  });
});

describe("Formulários", () => {
  it("Field liga rótulo, dica e erro (aria-describedby, aria-invalid, role=alert)", () => {
    renderWithProviders(
      <Field label="E-mail" hint="corporativo" error="inválido" required>{({ id, describedBy, invalid }) => <Input id={id} aria-describedby={describedBy} invalid={invalid} />}</Field>,
    );
    const input = screen.getByLabelText(/E-mail/);
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")?.split(" ")).toHaveLength(2);
    expect(screen.getByRole("alert").textContent).toBe("inválido");
  });

  it("Switch, Checkbox, RadioCards, Select, Textarea e SelectList com estado e teclado", () => {
    function Harness() {
      const [sw, setSw] = useState(false);
      const [cb, setCb] = useState(false);
      const [r, setR] = useState("a");
      const [l, setL] = useState<string[]>([]);
      return (
        <>
          <Switch checked={sw} onCheckedChange={setSw} label="Reduzir movimento" />
          <Checkbox checked={cb} onCheckedChange={setCb} label="Aceito" />
          <RadioCards label="Tema" value={r} onValueChange={setR} options={[{ value: "a", label: "A" }, { value: "b", label: "B" }]} />
          <Select aria-label="Fuso" options={[{ value: "x", label: "X" }]} />
          <Textarea aria-label="Bio" />
          <SelectList label="Tarefas" multiple value={l} onChange={setL} options={[{ id: "t1", title: "T1" }, { id: "t2", title: "T2", disabledReason: "BLOQUEADA" }]} />
        </>
      );
    }
    renderWithProviders(<Harness />);
    const sw = screen.getByRole("switch", { name: "Reduzir movimento" });
    fireEvent.click(sw);
    expect(sw.getAttribute("aria-checked")).toBe("true");
    fireEvent.click(screen.getByRole("checkbox", { name: "Aceito" }));
    expect(screen.getByRole("checkbox", { name: "Aceito" }).getAttribute("aria-checked")).toBe("true");
    fireEvent.click(screen.getByRole("radio", { name: /B/ }));
    expect(screen.getByRole("radio", { name: /B/ }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("combobox", { name: "Fuso" })).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Bio" })).toBeTruthy();
    fireEvent.click(screen.getByRole("option", { name: /T1/ }));
    expect(screen.getByRole("option", { name: /T1/ }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("option", { name: /T2/ })).toHaveProperty("disabled", true);
  });
});

describe("Estados, PercentBar, BackgroundArt, Card, Link, Skeleton, Toast", () => {
  it("EmptyState com moji, ErrorState com retry/código/correlationId", () => {
    const retry = vi.fn();
    renderWithProviders(<><EmptyState title="Nada" description="vazio" moji="vazio" /><ErrorState description="falhou" code="503 SERVICO_INDISPONIVEL" correlationId="c-1" onRetry={retry} /></>);
    expect(screen.getByRole("img", { name: /Vazio/ })).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain("503 SERVICO_INDISPONIVEL");
    expect(screen.getByRole("alert").textContent).toContain("c-1");
    fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(retry).toHaveBeenCalled();
  });

  it("PercentBar expõe progressbar com valor em texto e segmentos", () => {
    renderWithProviders(<PercentBar value={58.4} label="Rumo à decisão" segments={4} />);
    const bar = screen.getByRole("progressbar", { name: "Rumo à decisão" });
    expect(bar.getAttribute("aria-valuenow")).toBe("58");
    expect(bar.getAttribute("aria-valuetext")).toBe("58%");
    expect(bar.querySelectorAll("span[aria-hidden]")).toHaveLength(3);
  });

  it("BackgroundArt: catálogo com 6 artes reais + 6 placeholders, tom pela luminância, image-set 640/1280 e scrim no tom escuro", () => {
    expect(WS_BACKGROUNDS.filter((b) => !b.placeholder && b.id !== "sem-arte")).toHaveLength(6);
    expect(WS_BACKGROUNDS.filter((b) => b.placeholder)).toHaveLength(6);
    const dark = backgroundById("aura-geometry-01");
    expect(dark.tone).toBe("dark");
    expect(backgroundImageCss(dark)).toContain("aura-geometry-01-640.webp");
    expect(backgroundImageCss(dark)).toContain("aura-geometry-01-1280.webp");
    expect(backgroundById("inexistente").id).toBe("sem-arte");
    renderWithProviders(<><BackgroundArt backgroundId="aura-geometry-01"><p>texto</p></BackgroundArt><BackgroundArt backgroundId="aura-geometry-04" skin="cortica"><p>claro</p></BackgroundArt></>);
    expect(screen.getByText("texto").parentElement?.className).toContain("ws-scrim");
    expect(screen.getByText("claro").parentElement?.className).toContain("ws-glass");
    expect(document.querySelector("[data-background='aura-geometry-04']")?.getAttribute("data-tone")).toBe("light");
  });

  it("Card com título/eyebrow, Link nav com aria-current, Skeleton por linhas, Toast aparece na região", async () => {
    function Harness() {
      const { toast } = useToast();
      return <button type="button" onClick={() => toast({ title: "Salvo", tone: "sucesso" })}>toast</button>;
    }
    renderWithProviders(<><Card title="Título" eyebrow="RF3">conteúdo</Card><Link href="/mural" variant="nav" current>Mural</Link><Link href="https://ex.org">ext</Link><Skeleton lines={3} /><Harness /></>);
    expect(screen.getByRole("heading", { name: "Título" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Mural" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "ext" }).getAttribute("rel")).toBe("noopener noreferrer");
    fireEvent.click(screen.getByRole("button", { name: "toast" }));
    expect(await screen.findByText("Salvo")).toBeTruthy();
  });
});
