"use client";
import { Badge, cn } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import { PARTS_OF_SPEECH, type PartOfSpeech, type TaggedToken, type VerbFeatures } from "@/lib/letters/types";
import { AMBIGUOUS_CLASS, POS_CLASS, pct } from "./shared";

const isWordish = (t: TaggedToken) => t.kind === "PALAVRA" || t.kind === "SIGLA" || t.kind === "NUMERO";

/** Descrição dos traços verbais afirmados (tempo/modo só quando a análise afirma; senão as alternativas). */
export function useVerbText() {
  const { t } = useI18n();
  return (v: VerbFeatures | undefined): string => {
    if (!v) return "";
    const parts: string[] = [];
    if (v.lemma) parts.push(t("letters.verb.lemma", { lemma: v.lemma.replace("|", " / ") }));
    if (v.forma) parts.push(t(`letters.forma.${v.forma}`));
    if (v.tempo) parts.push(t(`letters.tempo.${v.tempo}`));
    else if (v.tempos.length > 1) parts.push(t("letters.verb.tempos", { list: v.tempos.map((x) => t(`letters.tempo.${x}`)).join(" / ") }));
    if (v.modo) parts.push(t(`letters.modo.${v.modo}`));
    if (v.pessoa && v.numero) parts.push(t(v.numero === "SG" ? "letters.verb.personSg" : "letters.verb.personPl", { n: v.pessoa }));
    return parts.join(" · ");
  };
}

/** Subtipo do etiquetador → texto traduzido ("contração (de + o)" mantém as palavras do texto analisado). */
export function useSubText() {
  const { t } = useI18n();
  return (sub: string | undefined): string => {
    if (!sub) return "";
    const contraction = sub.match(/^contração \((.+)\)$/);
    if (contraction) return t("letters.sub.contracao", { parts: contraction[1]! });
    const slug = sub.normalize("NFD").replace(/\p{M}+/gu, "").toLowerCase().replace(/[^a-z]+/g, "_");
    return t(`letters.sub.${slug}`);
  };
}

/** Texto com cada palavra marcada pela classe (cor por token + abreviatura em texto). */
export function TokenGloss({ tokens, label }: { tokens: readonly TaggedToken[]; label: string }) {
  const { t } = useI18n();
  return (
    <p className="flex flex-wrap items-end gap-x-1 gap-y-1.5 leading-tight" aria-label={label} data-testid="letters-gloss">
      {tokens.map((tok) => {
        if (!isWordish(tok)) return <span key={tok.i} className="self-start text-ws-text-muted">{tok.text}</span>;
        const pos = tok.pos;
        const name = pos ? t(`letters.pos.${pos}`) : t("letters.pos.AMBIGUO");
        return (
          <span key={tok.i} className="inline-flex flex-col items-center">
            <span className={cn("rounded-[var(--ws-radius-sm)] px-1", pos ? POS_CLASS[pos] : AMBIGUOUS_CLASS)}>{tok.text}</span>
            <abbr title={name} className="text-[length:var(--ws-text-label)] text-ws-text-muted no-underline">{pos ? t(`letters.posAbbr.${pos}`) : "?"}</abbr>
          </span>
        );
      })}
    </p>
  );
}

/** Legenda: cor + nome + abreviatura + contagem (o nome está sempre em texto). */
export function PosLegend({ counts, ambiguous }: { counts: Record<PartOfSpeech, number>; ambiguous: number }) {
  const { t } = useI18n();
  return (
    <ul className="grid grid-cols-2 gap-1.5 text-[length:var(--ws-text-caption)]" aria-label={t("letters.morph.legend")}>
      {PARTS_OF_SPEECH.map((p) => (
        <li key={p} className="flex items-center gap-2">
          <span className={cn("rounded-[var(--ws-radius-sm)] px-1.5 font-semibold", POS_CLASS[p])} aria-hidden>{t(`letters.posAbbr.${p}`)}</span>
          <span className="min-w-0 flex-1">{t(`letters.pos.${p}`)}</span>
          <span className="tabular-nums text-ws-text-muted">{counts[p]}</span>
        </li>
      ))}
      <li className="flex items-center gap-2">
        <span className={cn("rounded-[var(--ws-radius-sm)] px-1.5 font-semibold", AMBIGUOUS_CLASS)} aria-hidden>?</span>
        <span className="min-w-0 flex-1">{t("letters.pos.AMBIGUO")}</span>
        <span className="tabular-nums text-ws-text-muted">{ambiguous}</span>
      </li>
    </ul>
  );
}

/** Tabela acessível dos tokens de um bloco: posição, classe, confiança e traços (ou hipóteses, se ambíguo). */
export function TokenTable({ tokens, caption }: { tokens: readonly TaggedToken[]; caption: string }) {
  const { t, intl } = useI18n();
  const verbText = useVerbText();
  const subText = useSubText();
  const words = tokens.filter(isWordish);
  return (
    <div className="max-h-80 overflow-auto rounded-[var(--ws-radius-md)] border border-ws-border">
      <table className="w-full text-left text-[length:var(--ws-text-caption)]">
        <caption className="sr-only">{caption}</caption>
        <thead className="sticky top-0 bg-ws-surface-2">
          <tr>
            <th scope="col" className="px-2 py-1">{t("letters.morph.colWord")}</th>
            <th scope="col" className="px-2 py-1">{t("letters.morph.colPosition")}</th>
            <th scope="col" className="px-2 py-1">{t("letters.morph.colClass")}</th>
            <th scope="col" className="px-2 py-1">{t("letters.morph.colConfidence")}</th>
            <th scope="col" className="px-2 py-1">{t("letters.morph.colDetail")}</th>
          </tr>
        </thead>
        <tbody>
          {words.map((tok) => (
            <tr key={tok.i} className="border-t border-ws-border align-top">
              <th scope="row" className="px-2 py-1 font-semibold">{tok.text}</th>
              <td className="px-2 py-1 font-[family-name:var(--ws-font-mono)] tabular-nums">{tok.start}–{tok.end}</td>
              <td className="px-2 py-1">
                {tok.pos ? (
                  <span className={cn("rounded-[var(--ws-radius-sm)] px-1", POS_CLASS[tok.pos])}>{t(`letters.pos.${tok.pos}`)}</span>
                ) : (
                  <Badge tone="neutral" className="normal-case tracking-normal">{t("letters.pos.AMBIGUO")}</Badge>
                )}
              </td>
              <td className="px-2 py-1 tabular-nums">{pct(tok.confidence, intl)}</td>
              <td className="px-2 py-1 text-ws-text-muted">
                {tok.ambiguous
                  ? t("letters.morph.hypotheses", { list: tok.candidates.map((c) => `${t(`letters.pos.${c.pos}`)} ${pct(c.p, intl)}`).join(" · ") })
                  : [tok.locution ? t("letters.morph.locution", { text: tok.locution }) : subText(tok.sub), verbText(tok.verb)].filter(Boolean).join(" · ")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
