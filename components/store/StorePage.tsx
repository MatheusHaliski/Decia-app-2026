"use client";
/**
 * Loja Work AI (`/store`, RF42.CA04–CA06, CA10): skins da Mesa, créditos de IA, impulso no Mural, modelos e kits do Balcão (RF40),
 * com preço em DECIA Points, disponibilidade e estoque. Comprar abre a confirmação (saldo antes e depois); a compra debita o razão
 * (`deciaPoints.spend`), entrega na hora (skin desbloqueada nas preferências, créditos no saldo de IA, impulso com validade,
 * licença do modelo com crédito ao autor) e entra no histórico. Sem saldo, a tela explica quanto falta e de onde vêm os pontos.
 * Sem dinheiro real nem gateway. Dados DEMO desta aba.
 */
import { Suspense, useMemo, useState } from "react";
import { DemoBadge, DemoNote, Dp, formatDate, formatDateTime, formatNumber, newActionKey, useMounted } from "@/components/points/shared";
import { RfPage } from "@/components/shell/RfPage";
import { BackgroundArt, Badge, Button, Card, Dialog, EmptyState, Field, Link, LoadingState, Select, Tag, useToast } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import { modelHref } from "@/lib/models/use";
import { demoModelsRepository, useModelsTick } from "@/lib/models/useModels";
import type { ModelOffer } from "@/lib/models/types";
import type { PageEntry } from "@/lib/pages/registry";
import { pointsHolderOf } from "@/lib/points/identity";
import { usePointsBalance } from "@/lib/points/usePoints";
import { demoBoostTargets } from "@/lib/store/boost";
import type { Availability, StoreItem, StoreKind } from "@/lib/store/catalog";
import type { PurchaseError } from "@/lib/store/repository";
import { demoStoreRepository, useStoreTick } from "@/lib/store/useStore";
import { useViewer } from "@/lib/viewer/ViewerProvider";

type Buyable = { kind: "OWN"; item: StoreItem } | { kind: "MODEL"; offer: ModelOffer };
type Outcome =
  | { ok: true; message: string; link?: { href: string; label: string } }
  | { ok: false; reason: PurchaseError | "SEM_SALDO_PROPRIO"; message: string };

const SECTIONS: readonly StoreKind[] = ["SKIN_MESA", "CREDITOS_IA", "IMPULSO_MURAL", "MODELO_BALCAO", "KIT_CHANCELADO"];

function useAvailabilityText() {
  const { t, intl } = useI18n();
  return (item: StoreItem, av: Availability) => {
    if (av.ok) return t("store.availability.DISPONIVEL");
    if (av.reason === "AINDA_NAO" && item.availableFrom) return t("store.availability.AINDA_NAO", { date: formatDate(`${item.availableFrom}T12:00:00Z`, intl) });
    return t(`store.availability.${av.reason}`);
  };
}

function OwnItemCard({ item, holder, onBuy }: { item: StoreItem; holder: string | null; onBuy: (b: Buyable) => void }) {
  const { t, intl } = useI18n();
  const store = demoStoreRepository();
  const av = store.availability(item.id, holder);
  const availabilityText = useAvailabilityText();
  const title = t(`store.item.${item.id}.title`);
  const left = store.stockLeft(item.id);
  return (
    <Card as="li" padding="sm" className="grid content-between gap-3" data-testid={`store-item-${item.id}`}>
      <div className="grid gap-2">
        {item.delivery.type === "SKIN" ? <BackgroundArt skin={item.delivery.skin} minHeight="3.5rem" className="rounded-[var(--ws-radius-md)]" /> : null}
        <h3 className="font-semibold">{title}</h3>
        <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t(`store.item.${item.id}.description`)}</p>
      </div>
      <div className="grid gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Dp value={item.pricePoints} />
          <Tag tone={av.ok ? "success" : av.reason === "JA_ADQUIRIDO" ? "info" : "neutral"}>{availabilityText(item, av)}</Tag>
          {left !== null ? <span className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("store.stockLeft", { n: left })}</span> : null}
          {item.availableUntil ? <span className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("store.until", { date: formatDate(`${item.availableUntil}T12:00:00Z`, intl) })}</span> : null}
        </div>
        <Button size="sm" variant={av.ok ? "primary" : "default"} disabled={!holder || !av.ok} onClick={() => onBuy({ kind: "OWN", item })} aria-label={t("store.buyItem", { item: title })}>{t("store.buy")}</Button>
      </div>
    </Card>
  );
}

function ModelItemCard({ offer, holder, onBuy }: { offer: ModelOffer; holder: string | null; onBuy: (b: Buyable) => void }) {
  const { t } = useI18n();
  const models = demoModelsRepository();
  const own = holder !== null && offer.authorId === holder;
  const licensed = holder !== null && models.hasLicense(offer.id, holder);
  return (
    <Card as="li" padding="sm" className="grid content-between gap-3" data-testid={`store-model-${offer.id}`}>
      <div className="grid gap-1.5">
        <div className="flex flex-wrap gap-1.5">
          <Tag tone={offer.shelf === "CHANCELADO" ? "accent" : "neutral"}>{t(`models.shelf.${offer.shelf}`)}</Tag>
          <Tag>{t(`models.license.${offer.license}`)}</Tag>
        </div>
        <h3 className="font-semibold">{offer.title}</h3>
        <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("models.byAuthor", { author: offer.authorName, department: offer.department ?? "—" })}</p>
      </div>
      <div className="grid gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Dp value={offer.pricePoints} />
          {own ? <Tag tone="info">{t("store.model.own")}</Tag> : licensed ? <Tag tone="success">{t("store.model.licensed")}</Tag> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {!own && !licensed ? <Button size="sm" variant="primary" disabled={!holder} onClick={() => onBuy({ kind: "MODEL", offer })} aria-label={t("store.buyItem", { item: offer.title })}>{t("store.model.buy")}</Button> : null}
          <Button size="sm" variant="ghost" href={modelHref(offer.id)}>{t("store.model.see")}</Button>
        </div>
      </div>
    </Card>
  );
}

function PurchaseDialog({ buying, holder, balance, onClose }: { buying: Buyable | null; holder: string | null; balance: number; onClose: () => void }) {
  const { t, intl } = useI18n();
  const { toast } = useToast();
  const store = demoStoreRepository();
  const models = demoModelsRepository();
  const key = useMemo(() => (buying ? newActionKey("compra") : ""), [buying]);
  const [targetId, setTargetId] = useState("");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const targets = demoBoostTargets();
  if (!buying) return null;
  const title = buying.kind === "OWN" ? t(`store.item.${buying.item.id}.title`) : buying.offer.title;
  const price = buying.kind === "OWN" ? buying.item.pricePoints : buying.offer.pricePoints;
  const isBoost = buying.kind === "OWN" && buying.item.delivery.type === "IMPULSO";
  const done = outcome?.ok === true;

  const close = () => {
    setOutcome(null);
    setTargetId("");
    onClose();
  };

  const confirm = () => {
    if (!holder) return;
    const now = new Date();
    if (buying.kind === "MODEL") {
      const r = models.acquireLicense(buying.offer.id, holder, now);
      if (!r.ok) {
        setOutcome({ ok: false, reason: r.reason === "SALDO_INSUFICIENTE" ? "SALDO_INSUFICIENTE" : r.reason === "SEM_SALDO_PROPRIO" ? "SEM_SALDO_PROPRIO" : "ITEM_INDISPONIVEL", message: r.reason === "SALDO_INSUFICIENTE" ? t("store.error.SALDO_INSUFICIENTE", { price, balance: r.balance ?? balance, missing: price - (r.balance ?? balance) }) : t(`store.error.${r.reason}`) });
        return;
      }
      const message = t("store.delivered.license", { title: buying.offer.title, author: buying.offer.authorName });
      setOutcome({ ok: true, message, link: { href: modelHref(buying.offer.id), label: t("store.delivered.useModel") } });
      toast({ title: t("store.done", { item: title }), description: message, tone: "sucesso" });
      return;
    }
    const target = targets.find((x) => x.id === targetId) ?? null;
    const r = store.purchase({ buyerId: holder, itemId: buying.item.id, idempotencyKey: key, boostTarget: target }, now);
    if (!r.ok) {
      const message = r.reason === "SALDO_INSUFICIENTE"
        ? t("store.error.SALDO_INSUFICIENTE", { price, balance: r.balance ?? balance, missing: price - (r.balance ?? balance) })
        : r.reason === "ITEM_INDISPONIVEL" && r.detail ? t(`store.availability.${r.detail}`, { date: buying.item.availableFrom ? formatDate(`${buying.item.availableFrom}T12:00:00Z`, intl) : "" }) : t(`store.error.${r.reason}`);
      setOutcome({ ok: false, reason: r.reason, message });
      return;
    }
    const d = r.purchase.delivery;
    let outcomeOk: Outcome;
    if (d.type === "SKIN") outcomeOk = { ok: true, message: t("store.delivered.skin", { skin: t(`deskSkin.${d.skin}`) }), link: { href: "/settings?tab=aparencia", label: t("store.delivered.applySkin") } };
    else if (d.type === "CREDITOS_IA") outcomeOk = { ok: true, message: t("store.delivered.credits", { n: d.credits, total: store.aiCredits(holder) }) };
    else outcomeOk = { ok: true, message: t("store.delivered.boost", { title: r.purchase.boost?.target.title ?? "", until: formatDateTime(r.purchase.boost?.until ?? now.toISOString(), intl) }) };
    setOutcome(outcomeOk);
    toast({ title: t("store.done", { item: title }), description: outcomeOk.message, tone: "sucesso" });
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) close(); }} title={t("store.confirm.title")} description={t("store.confirm.description")}>
      <div className="grid gap-3" data-testid="purchase-dialog">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[length:var(--ws-text-body-sm)]">
          <dt className="text-ws-text-muted">{t("store.confirm.item")}</dt>
          <dd className="font-semibold">{title}</dd>
          <dt className="text-ws-text-muted">{t("store.confirm.price")}</dt>
          <dd><Dp value={price} /></dd>
          {!done ? (
            <>
              <dt className="text-ws-text-muted">{t("store.confirm.balance")}</dt>
              <dd className="tabular-nums">{formatNumber(balance, intl)} DP</dd>
              <dt className="text-ws-text-muted">{t("store.confirm.after")}</dt>
              <dd className="tabular-nums">{balance >= price ? `${formatNumber(balance - price, intl)} DP` : t("store.confirm.notEnough")}</dd>
            </>
          ) : null}
        </dl>
        {buying.kind === "MODEL" ? <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("store.confirm.modelNote", { author: buying.offer.authorName })}</p> : null}
        {isBoost && !done ? (
          <Field label={t("store.boost.target")} hint={t("store.boost.targetHint")}>
            {({ id, describedBy }) => <Select id={id} aria-describedby={describedBy} value={targetId} onChange={(e) => setTargetId(e.target.value)} options={[{ value: "", label: t("store.boost.choose") }, ...targets.map((x) => ({ value: x.id, label: `${t(`store.boost.type.${x.type}`)} · ${x.title}` }))]} />}
          </Field>
        ) : null}
        <div aria-live="polite" data-testid="purchase-outcome">
          {outcome ? (
            outcome.ok ? (
              <div className="grid gap-2 rounded-[var(--ws-radius-md)] bg-ws-success-soft p-3 text-[length:var(--ws-text-body-sm)]">
                <p className="font-semibold">{t("store.done", { item: title })}</p>
                <p>{outcome.message}</p>
                {outcome.link ? <Link href={outcome.link.href}>{outcome.link.label}</Link> : null}
              </div>
            ) : (
              <div role="alert" className="grid gap-1 rounded-[var(--ws-radius-md)] bg-ws-danger-soft p-3 text-[length:var(--ws-text-body-sm)]">
                <p className="font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-caption)] font-semibold">{outcome.reason}</p>
                <p>{outcome.message}</p>
                {outcome.reason === "SALDO_INSUFICIENTE" ? <p>{t("store.error.earnHint")} <Link href="/decia">{t("store.error.goDecia")}</Link></p> : null}
              </div>
            )
          ) : null}
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={close}>{done ? t("common.close") : t("common.cancel")}</Button>
          {!done ? <Button variant="primary" onClick={confirm} disabled={!holder || (isBoost && !targetId)} data-testid="purchase-confirm">{t("store.confirm.submit", { price })}</Button> : null}
        </div>
      </div>
    </Dialog>
  );
}

function Wallet({ holder, balance }: { holder: string; balance: number }) {
  const { t, intl } = useI18n();
  const store = demoStoreRepository();
  const skins = store.ownedSkins(holder);
  const boosts = store.boosts(holder);
  return (
    <Card title={t("store.wallet.title")} eyebrow="RF42 · CA04 · CA06" data-testid="store-wallet">
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="grid gap-1">
          <dt className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("store.wallet.balance")}</dt>
          <dd className="text-[length:var(--ws-text-h3)] font-semibold" data-testid="store-balance" aria-live="polite">{formatNumber(balance, intl)} DP</dd>
          <dd><Link href="/points?tab=extrato">{t("store.wallet.statement")}</Link></dd>
        </div>
        <div className="grid gap-1">
          <dt className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("store.wallet.aiCredits")}</dt>
          <dd className="text-[length:var(--ws-text-h3)] font-semibold" data-testid="store-ai-credits">{formatNumber(store.aiCredits(holder), intl)}</dd>
          <dd className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("store.wallet.aiCreditsHint")}</dd>
        </div>
        <div className="grid gap-1">
          <dt className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("store.wallet.skins")}</dt>
          <dd className="font-semibold">{skins.length ? skins.map((s) => t(`deskSkin.${s}`)).join(", ") : t("store.wallet.none")}</dd>
          <dd><Link href="/settings?tab=aparencia">{t("store.wallet.skinsLink")}</Link></dd>
        </div>
        <div className="grid gap-1">
          <dt className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("store.wallet.boosts")}</dt>
          <dd className="font-semibold">{boosts.length ? boosts.map((b) => t("store.wallet.boostItem", { title: b.target.title, until: formatDateTime(b.until, intl) })).join(" · ") : t("store.wallet.none")}</dd>
        </div>
      </dl>
    </Card>
  );
}

function History({ holder }: { holder: string }) {
  const { t, intl } = useI18n();
  const store = demoStoreRepository();
  const models = demoModelsRepository();
  const rows = [
    ...store.purchases(holder).map((p) => ({
      id: p.id, at: p.at, item: t(`store.item.${p.itemId}.title`), price: p.pricePaid,
      delivery: p.delivery.type === "SKIN" ? t("store.history.skin", { skin: t(`deskSkin.${p.delivery.skin}`) })
        : p.delivery.type === "CREDITOS_IA" ? t("store.history.credits", { n: p.delivery.credits })
          : t("store.history.boost", { title: p.boost?.target.title ?? "", until: formatDateTime(p.boost?.until ?? p.at, intl) }),
    })),
    ...models.licenses(holder).filter((g) => g.pricePaid > 0).map((g) => {
      const offer = models.get(g.offerId);
      return { id: `lic-${g.offerId}`, at: g.at, item: offer?.title ?? g.offerId, price: g.pricePaid, delivery: t("store.history.license", { author: offer?.authorName ?? "" }) };
    }),
  ].sort((a, b) => (a.at < b.at ? 1 : -1));
  return (
    <Card title={t("store.history.title")} eyebrow="RF42 · CA04">
      {rows.length === 0 ? (
        <EmptyState compact title={t("store.history.empty")} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] text-left text-[length:var(--ws-text-body-sm)]" data-testid="store-history">
            <caption className="sr-only">{t("store.history.caption")}</caption>
            <thead className="text-[length:var(--ws-text-caption)] text-ws-text-muted">
              <tr>
                <th scope="col" className="py-2 pr-3 font-semibold">{t("store.history.colDate")}</th>
                <th scope="col" className="py-2 pr-3 font-semibold">{t("store.history.colItem")}</th>
                <th scope="col" className="py-2 pr-3 text-right font-semibold">{t("store.history.colPrice")}</th>
                <th scope="col" className="py-2 font-semibold">{t("store.history.colDelivery")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-ws-border">
                  <td className="whitespace-nowrap py-2 pr-3">{formatDate(r.at, intl)}</td>
                  <th scope="row" className="py-2 pr-3 font-normal">{r.item}</th>
                  <td className="py-2 pr-3 text-right tabular-nums">−{formatNumber(r.price, intl)}</td>
                  <td className="py-2 text-ws-text-muted">{r.delivery}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function StoreContent({ page }: { page: PageEntry }) {
  const { t } = useI18n();
  const { user } = useViewer();
  const mounted = useMounted();
  const holder = pointsHolderOf(user);
  const store = demoStoreRepository();
  const models = demoModelsRepository();
  useStoreTick(store);
  useModelsTick(models);
  const balance = usePointsBalance(holder) ?? 0;
  const [buying, setBuying] = useState<Buyable | null>(null);
  const paidOffers = models.list().filter((o) => o.status === "ATIVA" && o.pricePoints > 0).sort((a, b) => b.reuseCount - a.reuseCount);

  const section = (kind: StoreKind) => {
    const own = store.catalog().filter((i) => i.kind === kind);
    const offers = kind === "MODELO_BALCAO" ? paidOffers.filter((o) => o.kind !== "KIT") : kind === "KIT_CHANCELADO" ? paidOffers.filter((o) => o.kind === "KIT") : [];
    if (!own.length && !offers.length) return null;
    return (
      <section key={kind} aria-labelledby={`store-${kind}`} className="grid gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id={`store-${kind}`} className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h3)] font-semibold">{t(`store.section.${kind}`)}</h2>
          {kind === "MODELO_BALCAO" || kind === "KIT_CHANCELADO" ? <Link href="/models">{t("store.section.seeCounter")}</Link> : null}
        </div>
        <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t(`store.sectionHint.${kind}`)}</p>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {own.map((item) => <OwnItemCard key={item.id} item={item} holder={holder} onBuy={setBuying} />)}
          {offers.map((offer) => <ModelItemCard key={offer.id} offer={offer} holder={holder} onBuy={setBuying} />)}
        </ul>
      </section>
    );
  };

  return (
    <RfPage page={page} noEmpty actions={<DemoBadge hintKey="store.demoHint" />}>
      {!mounted ? <LoadingState /> : (
        <div className="grid gap-[var(--ws-space-5)]">
          <DemoNote hintKey="store.demoHint" />
          {holder ? <Wallet holder={holder} balance={balance} /> : (
            <Card tone="soft" data-testid="store-no-balance"><p className="text-[length:var(--ws-text-body-sm)]">{t("store.noBalance")}</p></Card>
          )}
          <p className="flex flex-wrap items-center gap-2 text-[length:var(--ws-text-body-sm)]"><Badge tone="info">{t("store.noMoneyBadge")}</Badge>{t("store.noMoney")}</p>
          {SECTIONS.map(section)}
          {holder ? <History holder={holder} /> : null}
          <PurchaseDialog key={buying ? (buying.kind === "OWN" ? buying.item.id : buying.offer.id) : "none"} buying={buying} holder={holder} balance={balance} onClose={() => setBuying(null)} />
        </div>
      )}
    </RfPage>
  );
}

export function StorePage({ page }: { page: PageEntry }) {
  return (
    <Suspense fallback={<LoadingState />}>
      <StoreContent page={page} />
    </Suspense>
  );
}
