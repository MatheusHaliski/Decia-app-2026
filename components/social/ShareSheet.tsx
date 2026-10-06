"use client";
/**
 * Compartilhar (RF26.CA05): os três canais de `ShareChannel` — Mural da empresa (RF27), dentro de uma sessão DECIA (RF29)
 * e link externo com validade. Cada canal mostra o motivo quando não cabe (classificação RESTRITO/SIGILOSO, item não
 * público…). Chat/Mensagens (RF46) não é canal de `Share` no domínio: fica a orientação de usar Delegar (Q-194).
 */
import { useState } from "react";
import { Button, Field, Input, Select, Sheet } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import { LINK_DEFAULT_DAYS, share, type Permission } from "@/lib/social/rules";
import type { ShareChannel } from "@/lib/social/types";
import type { CardViewModel } from "@/lib/social/view-model";
import { useSocial } from "./context";
import { ACTION_SYMBOL } from "./meta";

function ChannelBlock({ channel, perm, children }: { channel: ShareChannel; perm: Permission; children: React.ReactNode }) {
  const { t } = useI18n();
  const { reason } = useSocial();
  return (
    <section aria-labelledby={`share-${channel}`} className="grid gap-2 rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-1 p-3" data-testid={`share-channel-${channel}`}>
      <div className="min-w-0">
        <h3 id={`share-${channel}`} className="text-[length:var(--ws-text-body)] font-semibold">{t(`social.share.channel.${channel}`)}</h3>
        <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t(`social.share.channelHint.${channel}`)}</p>
      </div>
      {perm.ok ? children : <p className="text-[length:var(--ws-text-caption)] font-medium text-ws-danger-ink" data-testid={`share-reason-${channel}`}><span aria-hidden>⛔ </span>{reason(perm)}</p>}
    </section>
  );
}

export function ShareSheet({ open, onOpenChange, vm }: { open: boolean; onOpenChange: (o: boolean) => void; vm: CardViewModel }) {
  const { t } = useI18n();
  const { state, run } = useSocial();
  const [sessionId, setSessionId] = useState(state.sessions[0]?.id ?? "");
  const [days, setDays] = useState(String(LINK_DEFAULT_DAYS));
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const p = vm.perms.shareChannels;

  const copy = async () => {
    if (!link) return;
    const url = typeof window !== "undefined" ? `${window.location.origin}${link}` : link;
    try { await navigator.clipboard.writeText(url); } catch { /* sem permissão de área de transferência: o campo continua selecionável */ }
    setCopied(true);
  };

  return (
    <Sheet open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) { setLink(null); setCopied(false); } }} title={<><span aria-hidden>{ACTION_SYMBOL.share} </span>{t("social.share.title")}</>} description={t("social.share.description", { title: vm.title })} side="bottom" className="mx-auto max-w-2xl">
      <div className="grid gap-3 pb-2 sm:grid-cols-[minmax(0,1fr)]">
        <ChannelBlock channel="MURAL" perm={p.MURAL}>
          <Button variant="primary" size="sm" className="justify-self-start" data-testid="share-mural" onClick={() => { const r = run((s, v, now) => share(s, v, vm.ref, "MURAL", now), "social.toast.sharedMural"); if (r.ok) onOpenChange(false); }}>
            {t("social.share.toMural")}
          </Button>
        </ChannelBlock>
        <ChannelBlock channel="SESSAO_DECIA" perm={p.SESSAO_DECIA}>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <Field label={t("social.share.session")}>
              {({ id }) => <Select id={id} value={sessionId} onChange={(e) => setSessionId(e.target.value)} options={state.sessions.map((x) => ({ value: x.id, label: x.title }))} />}
            </Field>
            <Button size="sm" data-testid="share-session" onClick={() => { const r = run((s, v, now) => share(s, v, vm.ref, "SESSAO_DECIA", now, { sessionId }), "social.toast.sharedSession"); if (r.ok) onOpenChange(false); }}>
              {t("social.share.toSession")}
            </Button>
          </div>
        </ChannelBlock>
        <ChannelBlock channel="LINK_EXTERNO" perm={p.LINK_EXTERNO}>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <Field label={t("social.share.expires")}>
              {({ id }) => <Select id={id} value={days} onChange={(e) => setDays(e.target.value)} options={["1", "7", "30"].map((d) => ({ value: d, label: t("social.share.days", { n: d }) }))} />}
            </Field>
            <Button size="sm" data-testid="share-link" onClick={() => { const r = run((s, v, now) => share(s, v, vm.ref, "LINK_EXTERNO", now, { expiresInDays: Number(days) })); if (r.ok) { setLink(r.link); setCopied(false); } }}>
              {t("social.share.makeLink")}
            </Button>
          </div>
          {link ? (
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <Field label={t("social.share.link")} hint={t("social.share.linkHint")}>
                {({ id, describedBy }) => <Input id={id} aria-describedby={describedBy} readOnly value={link} onFocus={(e) => e.currentTarget.select()} data-testid="share-link-value" />}
              </Field>
              <Button size="sm" variant="secondary" onClick={copy} data-testid="share-copy">{copied ? t("social.share.copied") : t("social.share.copy")}</Button>
            </div>
          ) : null}
        </ChannelBlock>
        <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("social.share.chatNote")}</p>
      </div>
    </Sheet>
  );
}
