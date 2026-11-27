"use client";
/**
 * Ícone de tipo de arquivo desenhado em SVG (sem logotipo de marca): folha com o canto dobrado, a sigla do formato (PDF, DOCX, XLSX…)
 * e uma faixa na cor da convenção do tipo — cor só por token do DS (nós de cor `--ws-node-*`, faísca, informação, acento). A sigla é
 * desenhada com a versão `-ink` do tom (contraste garantido sobre a superfície nos temas claro, escuro e alto contraste).
 *
 * Acessibilidade: decorativo (`aria-hidden`) quando há texto ao lado — o padrão; com `standalone`, vira `role="img"` com o nome do tipo
 * ("Documento PDF"). O tipo nunca é indicado só pela cor: a sigla está no desenho e o nome, no rótulo.
 */
import { useI18n } from "@/lib/i18n/useI18n";
import { fileIconSpec, type FileIconSource, type FileTone } from "./kinds";

const BAND: Record<FileTone, string> = {
  red: "fill-ws-node-red", blue: "fill-ws-node-blue", green: "fill-ws-node-green", orange: "fill-ws-node-orange", yellow: "fill-ws-node-yellow",
  brown: "fill-ws-node-brown", spark: "fill-ws-ai-spark", info: "fill-ws-info", accent: "fill-ws-accent", neutral: "fill-ws-text-muted",
};
const INK: Record<FileTone, string> = {
  red: "fill-ws-node-red-ink", blue: "fill-ws-node-blue-ink", green: "fill-ws-node-green-ink", orange: "fill-ws-node-orange-ink",
  yellow: "fill-ws-node-yellow-ink", brown: "fill-ws-node-brown-ink", spark: "fill-ws-ai-spark-ink", info: "fill-ws-info-ink",
  accent: "fill-ws-accent-ink", neutral: "fill-ws-text",
};

export interface FileTypeIconProps extends FileIconSource {
  /** altura em px (a largura segue a proporção da folha, 4:5) */
  size?: number;
  /** aparece sozinho, sem texto ao lado: ganha `role="img"` e o nome do tipo */
  standalone?: boolean;
  className?: string;
}

export function FileTypeIcon({ size = 24, standalone = false, className, ...src }: FileTypeIconProps) {
  const { t } = useI18n();
  const s = fileIconSpec(src);
  const label = t(`fileIcon.kind.${s.kind}`);
  const a11y = standalone ? { role: "img", "aria-label": label } : { "aria-hidden": true as const, focusable: "false" as const };
  const fontSize = s.abbr.length >= 4 ? 7.2 : s.abbr.length === 3 ? 8.6 : 10;
  return (
    <svg
      viewBox="0 0 32 40" width={(size * 32) / 40} height={size} className={className} data-file-kind={s.kind} data-file-abbr={s.abbr}
      {...a11y}
    >
      {s.kind === "folder" ? (
        <>
          <path d="M2 9.5a2 2 0 0 1 2-2h8l3 3h13a2 2 0 0 1 2 2V34a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2Z" className="fill-ws-surface-1 stroke-ws-border-strong" strokeWidth={1.5} />
          <path d="M2 14h28v4H2Z" className={BAND[s.tone]} />
        </>
      ) : (
        <>
          <path d="M5.5 1.5h15l8 8v27a2 2 0 0 1-2 2h-21a2 2 0 0 1-2-2v-33a2 2 0 0 1 2-2Z" className="fill-ws-surface-1 stroke-ws-border-strong" strokeWidth={1.5} />
          <path d="M20.5 1.5v6a2 2 0 0 0 2 2h6Z" className="fill-ws-surface-3 stroke-ws-border-strong" strokeWidth={1.2} strokeLinejoin="round" />
          <rect x="4.2" y="31.5" width="23.6" height="5.6" rx="1" className={BAND[s.tone]} />
          {s.abbr ? (
            <text x="16" y="26" textAnchor="middle" fontSize={fontSize} fontWeight={700} className={`${INK[s.tone]} font-[family-name:var(--ws-font-mono)]`}>
              {s.abbr}
            </text>
          ) : (
            <path d="M9 15h14M9 19.5h14M9 24h9" className="stroke-ws-text-muted" strokeWidth={1.5} strokeLinecap="round" />
          )}
        </>
      )}
    </svg>
  );
}
