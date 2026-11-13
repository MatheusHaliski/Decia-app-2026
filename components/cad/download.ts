/**
 * Entrega um texto (CSV) como arquivo para a pessoa salvar, sem passar por servidor: Blob local + link temporário criado por
 * código (o `<a>` do JSX é reservado ao design system). Devolve false quando o navegador não oferece `URL.createObjectURL`.
 */
export function downloadText(fileName: string, text: string, mime = "text/csv;charset=utf-8"): boolean {
  if (typeof document === "undefined" || typeof URL === "undefined" || typeof URL.createObjectURL !== "function") return false;
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

/** Nome do arquivo exportado: base do arquivo lido + sufixo, só com caracteres seguros. */
export function exportName(source: string, suffix: string): string {
  const base = source.replace(/\.[^.]+$/, "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "desenho";
  return `${base}-${suffix}.csv`;
}
