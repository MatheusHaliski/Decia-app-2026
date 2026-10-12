"use client";
/**
 * Barra de interações do card (RF18.CA01, RF19/RF26.CA01–CA07): curtir, reagir, comentar, salvar, compartilhar,
 * remixar, delegar (= "atribuir", RF18.CA03) e retornar (RF18.CA05). Cada ação tem símbolo + texto (ou aria-label com a
 * contagem), `aria-pressed` quando liga/desliga e, quando não é permitida, fica `aria-disabled` com o MOTIVO no nome
 * acessível e no title — clicar mostra o motivo (nunca some sem explicação, nunca só cor).
 */
import { useState, type ReactNode } from "react";
import { Button, Moji, Popover, cn } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import { react, toggleFavorite, toggleSave, type Permission } from "@/lib/social/rules";
import { QUALITATIVE_REACTIONS, type QualitativeReaction } from "@/lib/social/types";
import type { CardViewModel } from "@/lib/social/view-model";
import { useToast } from "@/components/ui";
import { useSocial } from "./context";
import { DelegateDialog, GiveBackDialog } from "./DelegateDialog";
import { ACTION_SYMBOL, REACTION_MOJI } from "./meta";
import { RemixDialog } from "./RemixDialog";
import { ShareSheet } from "./ShareSheet";

interface ActionProps {
  perm: Permission;
  label: string;
  symbol: string;
  count?: number;
  pressed?: boolean;
  showText: boolean;
  onClick?: () => void;
  href?: string;
  testId: string;
}

/** Botão de ação social: nome acessível = rótulo (+ contagem) (+ motivo quando indisponível). */
export function SocialAction({ perm, label, symbol, count, pressed, showText, onClick, href, testId }: ActionProps) {
  const { reason } = useSocial();
  const { toast } = useToast();
  const why = reason(perm);
  const name = `${label}${count !== undefined ? ` (${count})` : ""}`;
  const body: ReactNode = (
    <>
      <span aria-hidden className={cn("font-[family-name:var(--ws-font-mono)] text-[1.05em] leading-none", pressed && "text-ws-accent-ink")}>{symbol}</span>
      {showText ? <span aria-hidden>{label}</span> : null}
      {count !== undefined ? <span aria-hidden className="tabular-nums">{count}</span> : null}
      <span className="sr-only">{name}{why ? ` — ${why}` : ""}</span>
    </>
  );
  const cls = cn("min-h-[var(--ws-control-sm)] gap-1", showText ? "px-2" : "px-1", pressed && "border-ws-accent bg-ws-accent-soft text-ws-accent-ink");
  if (perm.ok && href) {
    return <Button href={href} size="sm" variant="ghost" className={cls} data-testid={testId}>{body}</Button>;
  }
  return (
    <Button
      size="sm"
      variant={pressed ? "default" : "ghost"}
      className={cls}
      aria-pressed={pressed === undefined ? undefined : pressed}
      aria-disabled={perm.ok ? undefined : true}
      title={why || name}
      data-testid={testId}
      onClick={() => (perm.ok ? onClick?.() : toast({ title: why, tone: "aviso" }))}
    >
      {body}
    </Button>
  );
}

/** Seletor de reações qualitativas (RF26.CA02): uma por pessoa e alvo; repetir a mesma remove (D-90). */
export function ReactionPicker({ vm, showText, inline = false }: { vm: CardViewModel; showText: boolean; inline?: boolean }) {
  const { t } = useI18n();
  const { run } = useSocial();
  const [open, setOpen] = useState(false);
  const current = vm.viewer.qualitative;
  const pick = (r: QualitativeReaction) => {
    run((s, v, now) => react(s, v, vm.ref, r, now));
    setOpen(false);
  };
  const total = QUALITATIVE_REACTIONS.reduce((n, r) => n + vm.counters.reactions[r], 0);
  if (!vm.perms.react.ok) return <SocialAction perm={vm.perms.react} label={t("social.action.react")} symbol={ACTION_SYMBOL.react} count={total} showText={showText} testId="action-react" />;
  const choices = (
    <div role="group" aria-label={t("social.action.reactPanel")} className="grid grid-cols-2 gap-1">
      {QUALITATIVE_REACTIONS.map((r) => (
        <Button key={r} size="sm" variant={current === r ? "default" : "ghost"} aria-pressed={current === r} onClick={() => pick(r)} className={cn("justify-start whitespace-normal text-left", current === r && "border-ws-accent bg-ws-accent-soft")} data-testid={`reaction-${r}`}>
          <Moji name={REACTION_MOJI[r]} size={24} decorative />
          <span className="min-w-0 flex-1">{t(`social.reaction.${r}`)}</span>
          <span className="tabular-nums text-ws-text-muted">{vm.counters.reactions[r]}</span>
        </Button>
      ))}
    </div>
  );
  if (inline) return <div className="grid gap-1"><p className="px-1 text-[length:var(--ws-text-caption)] font-semibold text-ws-text-muted">{t("social.action.reactPanel")}</p>{choices}</div>;
  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      align="start"
      label={t("social.action.reactPanel")}
      width="w-[min(92vw,18rem)]"
      trigger={
        <Button size="sm" variant={current ? "default" : "ghost"} className={cn("min-h-[var(--ws-control-sm)] gap-1 px-2", current && "border-ws-accent bg-ws-accent-soft text-ws-accent-ink")} data-testid="action-react" aria-haspopup="dialog">
          <span aria-hidden className="font-[family-name:var(--ws-font-mono)]">{ACTION_SYMBOL.react}</span>
          {showText ? <span aria-hidden>{current ? t(`social.reaction.${current}`) : t("social.action.react")}</span> : null}
          <span aria-hidden className="tabular-nums">{total}</span>
          <span className="sr-only">{t("social.action.react")} ({total}){current ? ` — ${t("social.reaction.current", { reaction: t(`social.reaction.${current}`) })}` : ""}</span>
        </Button>
      }
    >
      {choices}
      <p className="mt-2 px-1 text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("social.reaction.hint")}</p>
    </Popover>
  );
}

export interface SocialBarProps {
  vm: CardViewModel;
  /** compact = ícone + contagem (grade/lista), full = ícone + texto (detalhe) */
  variant?: "compact" | "full";
  /** comentar no detalhe (foca o campo); na grade o botão leva a `href#comentarios` */
  onComment?: () => void;
  className?: string;
}

export function SocialBar({ vm, variant = "compact", onComment, className }: SocialBarProps) {
  const { t } = useI18n();
  const { run } = useSocial();
  const [dialog, setDialogState] = useState<null | "share" | "remix" | "delegate" | "giveBack">(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const setDialog = (d: typeof dialog) => { setMoreOpen(false); setDialogState(d); };
  const full = variant === "full";
  const close = (o: boolean) => { if (!o) setDialog(null); };
  const like = () => run((s, v, now) => react(s, v, vm.ref, "CURTIR", now));
  const save = () => run((s, v, now) => toggleSave(s, v, vm.ref, now), vm.viewer.saved ? "social.toast.unsaved" : "social.toast.saved");
  const more = [
    <SocialAction key="d" perm={vm.perms.delegate} label={t("social.action.delegate")} symbol={ACTION_SYMBOL.delegate} showText onClick={() => setDialog("delegate")} testId="action-delegate" />,
    <SocialAction key="g" perm={vm.perms.giveBack} label={t("social.action.giveBack")} symbol={ACTION_SYMBOL.giveBack} showText onClick={() => setDialog("giveBack")} testId="action-giveback" />,
  ];
  return (
    <div className={cn(full ? "flex flex-wrap items-center gap-0.5" : "grid grid-cols-6 items-center gap-0.5 [&>*]:min-w-0", className)} role="group" aria-label={t("social.bar.label", { title: vm.title })} data-testid="social-bar">
      <SocialAction perm={vm.perms.react} label={t("social.action.like")} symbol={vm.viewer.liked ? ACTION_SYMBOL.liked : ACTION_SYMBOL.like} count={vm.counters.likes} pressed={vm.viewer.liked} showText={full} onClick={like} testId="action-like" />
      {full ? <ReactionPicker vm={vm} showText /> : null}
      <SocialAction perm={vm.perms.comment} label={t("social.action.comment")} symbol={ACTION_SYMBOL.comment} count={vm.counters.comments} showText={full} onClick={onComment} href={onComment ? undefined : `${vm.href}#comentarios`} testId="action-comment" />
      <SocialAction perm={vm.perms.save} label={t(vm.viewer.saved ? "social.action.saved" : "social.action.save")} symbol={vm.viewer.saved ? ACTION_SYMBOL.saved : ACTION_SYMBOL.save} count={vm.counters.saves} pressed={vm.viewer.saved} showText={full} onClick={save} testId="action-save" />
      {full && vm.viewer.saved ? (
        <SocialAction perm={vm.perms.save} label={t("social.action.favorite")} symbol={vm.viewer.favorite ? "★" : "☆"} pressed={vm.viewer.favorite} showText onClick={() => run((s, v, now) => toggleFavorite(s, v, vm.ref, now))} testId="action-favorite" />
      ) : null}
      <SocialAction perm={vm.perms.share} label={t("social.action.share")} symbol={ACTION_SYMBOL.share} count={vm.counters.shares} showText={full} onClick={() => setDialog("share")} testId="action-share" />
      <SocialAction perm={vm.perms.remix} label={t("social.action.remix")} symbol={ACTION_SYMBOL.remix} count={vm.counters.remixes} showText={full} onClick={() => setDialog("remix")} testId="action-remix" />
      {full ? more : (
        <Popover
          open={moreOpen}
          onOpenChange={setMoreOpen}
          align="end"
          label={t("social.action.more")}
          width="w-[min(92vw,16rem)]"
          trigger={
            <Button size="sm" variant="ghost" className="min-h-[var(--ws-control-sm)] px-1" aria-label={t("social.action.moreFor", { title: vm.title })} data-testid="action-more">
              <span aria-hidden>{ACTION_SYMBOL.more}</span>
            </Button>
          }
        >
          <div className="grid gap-1 [&>*]:justify-start">
            <ReactionPicker vm={vm} showText inline />
            {more}
          </div>
        </Popover>
      )}
      <ShareSheet open={dialog === "share"} onOpenChange={close} vm={vm} />
      <RemixDialog open={dialog === "remix"} onOpenChange={close} vm={vm} />
      <DelegateDialog open={dialog === "delegate"} onOpenChange={close} vm={vm} />
      <GiveBackDialog open={dialog === "giveBack"} onOpenChange={close} vm={vm} />
    </div>
  );
}
