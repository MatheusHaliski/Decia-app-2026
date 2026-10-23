"use client";
import type { ReactNode } from "react";
import { Badge, Card, Link } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import type { Block, Inline, LegalDoc } from "@/lib/legal/markdown";

function Inlines({ v }: { v: Inline[] }): ReactNode {
  return v.map((n, i) => {
    switch (n.t) {
      case "text": return <span key={i}>{n.v}</span>;
      case "strong": return <strong key={i}><Inlines v={n.v} /></strong>;
      case "em": return <em key={i}><Inlines v={n.v} /></em>;
      case "code": return <code key={i} className="rounded bg-ws-surface-2 px-1 font-mono text-[0.92em]">{n.v}</code>;
      case "url": return <Link key={i} href={n.v}>{n.v}</Link>;
      case "tag": return <mark key={i} className="rounded bg-ws-warning-soft px-1 font-mono text-[0.85em] text-ws-warning-ink" data-legal-tag={n.v}>{`{{${n.v}}}`}</mark>;
    }
  });
}

const H: Record<number, string> = {
  1: "font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h1)] font-semibold",
  2: "mt-[var(--ws-space-6)] font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h2)] font-semibold",
  3: "mt-[var(--ws-space-4)] text-[length:var(--ws-text-h3)] font-semibold",
  4: "mt-[var(--ws-space-3)] font-semibold",
};

function BlockView({ b }: { b: Block }) {
  if (b.t === "h") {
    const Tag = `h${b.level}` as "h1" | "h2" | "h3" | "h4";
    return <Tag id={b.id} className={H[b.level]}><Inlines v={b.v} /></Tag>;
  }
  if (b.t === "p") return <p className="leading-relaxed"><Inlines v={b.v} /></p>;
  if (b.t === "hr") return <hr className="border-ws-border" />;
  if (b.t === "ul" || b.t === "ol") {
    const List = b.t;
    return <List className={`grid gap-1 pl-6 ${b.t === "ul" ? "list-disc" : "list-decimal"}`}>{b.items.map((it, i) => <li key={i}><Inlines v={it} /></li>)}</List>;
  }
  if (b.t !== "table") return null;
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[length:var(--ws-text-body-sm)]">
        <thead><tr>{b.head.map((c, i) => <th key={i} scope="col" className="border-b border-ws-border p-2 text-left align-bottom"><Inlines v={c} /></th>)}</tr></thead>
        <tbody>{b.rows.map((r, i) => <tr key={i} className="border-b border-ws-border">{r.map((c, j) => <td key={j} className="p-2 align-top"><Inlines v={c} /></td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

/** Página pública de um texto legal da Velion (D-143): aviso de rascunho, campos a preencher e o texto. */
export function LegalDocument({ doc, otherHref, otherLabelKey }: { doc: LegalDoc; otherHref: string; otherLabelKey: string }) {
  const { t } = useI18n();
  const draft = (doc.meta.status ?? "") !== "vigente";
  return (
    <article className="grid gap-[var(--ws-space-3)] text-[length:var(--ws-text-body)]" data-testid="legal-document">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={draft ? "warning" : "success"}>{draft ? t("legal.draft") : t("legal.inForce")}</Badge>
        <Badge tone="neutral">{t("legal.version", { version: doc.meta.version ?? "—" })}</Badge>
        <Link href={otherHref} className="ml-auto text-[length:var(--ws-text-body-sm)]">{t(otherLabelKey)}</Link>
      </div>
      {draft ? (
        <Card tone="soft" className="border border-ws-warning" data-testid="legal-draft-note">
          <p className="text-[length:var(--ws-text-body-sm)]">{t("legal.draftNote")}</p>
          {doc.pendingTags.length ? <p className="mt-1 text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("legal.pendingTags", { n: String(doc.pendingTags.length) })}</p> : null}
        </Card>
      ) : null}
      {doc.blocks.map((b, i) => <BlockView key={i} b={b} />)}
    </article>
  );
}
