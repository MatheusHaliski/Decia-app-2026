/**
 * Arquivos de tarefa no navegador (RF41.CA06). O conteúdo vem da API com o token (`attachmentsApi.content`), nunca por `<img src>` direto.
 * Só imagem é aberta numa aba; o resto (PDF, Office, ZIP, CAD) é baixado com o nome saneado pelo servidor — conteúdo enviado por outra
 * pessoa não é renderizado como página na origem do app.
 */

/** Tamanho legível no idioma da tela (B, kB, MB). */
export function formatBytes(bytes: number | undefined | null, intl: string): string {
  const n = Math.max(0, bytes ?? 0);
  if (n < 1024) return new Intl.NumberFormat(intl, { style: "unit", unit: "byte", unitDisplay: "short" }).format(n);
  if (n < 1024 * 1024) return new Intl.NumberFormat(intl, { style: "unit", unit: "kilobyte", unitDisplay: "short", maximumFractionDigits: 0 }).format(n / 1024);
  return new Intl.NumberFormat(intl, { style: "unit", unit: "megabyte", unitDisplay: "short", maximumFractionDigits: 1 }).format(n / (1024 * 1024));
}

/** Data e hora curtas no idioma da tela. */
export const formatDateTime = (iso: string | null | undefined, intl: string) =>
  iso ? new Intl.DateTimeFormat(intl, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso)) : "—";

export const isBlob = (x: unknown): x is Blob => !!x && typeof x === "object" && typeof (x as Blob).size === "number" && typeof (x as Blob).type === "string";

/** Abre (imagem) ou baixa (demais tipos) um Blob; o object URL é revogado depois. */
export function openOrDownload(blob: Blob, name: string, inline: boolean) {
  if (typeof URL.createObjectURL !== "function") return;
  const url = URL.createObjectURL(blob);
  if (inline) {
    window.open(url, "_blank", "noopener,noreferrer");
  } else {
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Valor de `<input type="datetime-local">` (hora local) → ISO-8601 com fuso, como a API pede; vazio → indefinido. */
export function localDateTimeToIso(value: string): string | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}
