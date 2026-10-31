import { expect, test } from "@playwright/test";

/**
 * Modelo 3D do Drawings (RF60–RF63): a interface do editor (adicionar, selecionar pela lista, inspetor, material, desfazer,
 * excluir pelo teclado, rascunho local) funciona com ou sem WebGL 2; com WebGL, a viewport desenha a cena (não fica lisa).
 */
test("editor 3D: adicionar, editar, desfazer, excluir e manter o rascunho", async ({ page }) => {
  await page.goto("/drawings");
  const editor = page.getByTestId("editor-3d");
  await expect(editor).toBeVisible({ timeout: 30_000 });
  const rows = page.getByTestId("d3-outliner").getByRole("button");
  await expect(rows).toHaveCount(7);

  await page.getByTestId("d3-add").selectOption("no");
  await expect(rows).toHaveCount(8);
  const added = rows.filter({ hasText: "Nó toroidal" });
  await expect(added).toHaveAttribute("aria-pressed", "true");

  const inspector = page.getByTestId("d3-inspector");
  await inspector.getByLabel("Nome").fill("Escultura");
  await inspector.getByLabel("Nome").press("Enter");
  await expect(rows.filter({ hasText: "Escultura" })).toHaveCount(1);
  await inspector.getByTestId("d3-material").selectOption("cromo");
  await inspector.getByLabel("Posição (m) Y").fill("1,5");
  await inspector.getByLabel("Posição (m) Y").press("Enter");
  await expect(inspector.getByLabel("Posição (m) Y")).toHaveValue("1.5");

  // desfazer volta posição, material e nome, um por vez
  await expect(page.getByTestId("d3-undo")).toHaveAttribute("title", "Desfazer: mover/girar/escalar");
  await page.getByTestId("d3-undo").click();
  await page.getByTestId("d3-undo").click();
  await expect(inspector.getByTestId("d3-material")).toHaveValue("cobre");
  await page.getByTestId("d3-redo").click();
  await expect(inspector.getByTestId("d3-material")).toHaveValue("cromo");

  // excluir pelo teclado com o foco na lista
  await rows.filter({ hasText: "Escultura" }).focus();
  await page.keyboard.press("Delete");
  await expect(rows).toHaveCount(7);

  // o rascunho sobrevive ao recarregar
  await page.getByTestId("d3-add").selectOption("cone");
  await expect(rows).toHaveCount(8);
  await page.waitForTimeout(600);
  await page.reload();
  await expect(page.getByTestId("d3-outliner").getByRole("button")).toHaveCount(8, { timeout: 30_000 });
});

test("viewport 3D desenha a cena quando há WebGL 2", async ({ page }) => {
  await page.goto("/drawings");
  await expect(page.getByTestId("editor-3d")).toBeVisible({ timeout: 30_000 });
  const hasWebgl = await page.evaluate(() => !!document.createElement("canvas").getContext("webgl2"));
  test.skip(!hasWebgl, "navegador sem WebGL 2: o editor mostra o aviso no lugar da viewport");
  const canvas = page.getByTestId("viewport-3d");
  await expect(canvas).toBeVisible();
  await page.waitForTimeout(1500);
  // imagem e modelo saem como arquivos
  const [image] = await Promise.all([page.waitForEvent("download"), page.getByTestId("d3-capture").click()]);
  expect(image.suggestedFilename()).toBe("drawings-3d.png");
  const [glb] = await Promise.all([page.waitForEvent("download"), page.getByTestId("d3-export").click()]);
  expect(glb.suggestedFilename()).toBe("drawings-3d.glb");
  const head = await (await import("node:fs/promises")).readFile((await glb.path())!);
  expect(head.subarray(0, 4).toString("ascii")).toBe("glTF");
  const png = (await canvas.screenshot()).toString("base64");
  // cena renderizada tem contraste e muitas cores; canvas vazio, preto ou só com o fundo é praticamente uniforme
  const { stddev, colors } = await page.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let sum = 0, sq = 0, n = 0;
    const seen = new Set<number>();
    for (let i = 0; i < d.length; i += 4 * 7) {
      const l = 0.2126 * d[i]! + 0.7152 * d[i + 1]! + 0.0722 * d[i + 2]!;
      sum += l;
      sq += l * l;
      n += 1;
      seen.add(((d[i]! >> 3) << 10) | ((d[i + 1]! >> 3) << 5) | (d[i + 2]! >> 3));
    }
    return { stddev: Math.sqrt(sq / n - (sum / n) ** 2), colors: seen.size };
  }, png);
  expect(stddev).toBeGreaterThan(12);
  expect(colors).toBeGreaterThan(150);
});
