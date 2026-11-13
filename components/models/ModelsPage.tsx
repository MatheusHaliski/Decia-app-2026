"use client";
/**
 * Balcão de Modelos (`/models`, RF40): prateleiras Chancelados · Comunidade, busca e filtros (tipo tarefa/projeto/kit, área,
 * departamento de origem, preço) e ordenação; card com autor, departamento, licença, preço e reutilizações; detalhe com prévia e
 * "Usar este modelo"; "Oferecer como modelo" para EMPREGADO, CHEFE e EMPRESA; "Meus modelos oferecidos" com contadores e retirada
 * (RF40.CA06). Cada reutilização paga credita o autor no razão de DECIA Points (RF42.CA05). Dados DEMO desta aba.
 */
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { DemoBadge, DemoNote, Dp, formatNumber, useMounted } from "@/components/points/shared";
import { RfPage } from "@/components/shell/RfPage";
import { Button, Card, EmptyState, Field, Input, LoadingState, Select, Tag } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import { browseModels, departmentsOf, EMPTY_FILTERS, MODEL_SORTS, myOffers, PRICE_FILTERS, type ModelFilters, type ModelSort } from "@/lib/models/browse";
import { canOfferModel, type OfferAuthor } from "@/lib/models/offer";
import { MODEL_KINDS, type ModelOffer, type Shelf } from "@/lib/models/types";
import { demoModelsRepository, useModelOffers } from "@/lib/models/useModels";
import type { PageEntry } from "@/lib/pages/registry";
import { pointsHolderOf } from "@/lib/points/identity";
import { usePointsBalance } from "@/lib/points/usePoints";
import { WORK_AREAS, type WorkArea } from "@/lib/tasks/client";
import { useViewer } from "@/lib/viewer/ViewerProvider";
import { ModelDetail, type ModelViewer } from "./ModelDetail";
import { OfferDialog } from "./OfferDialog";

const SHELF_OF: Record<string, Shelf> = { chancelados: "CHANCELADO", comunidade: "COMUNIDADE" };

function ModelCard({ offer, onOpen }: { offer: ModelOffer; onOpen: (id: string) => void }) {
  const { t } = useI18n();
  return (
    <Card as="li" padding="sm" className="grid content-between gap-3" data-testid={`model-card-${offer.id}`}>
      <div className="grid gap-1.5">
        <div className="flex flex-wrap gap-1.5">
          <Tag>{t(`models.kind.${offer.kind}`)}</Tag>
          <Tag tone="blue">{t(`tasks.area.${offer.area}`)}</Tag>
          {offer.shelf === "CHANCELADO" ? <Tag tone="accent" filled>{t("models.shelf.CHANCELADO")}</Tag> : null}
        </div>
        <h3 className="font-semibold leading-snug">{offer.title}</h3>
        {offer.sealName ? <p className="text-[length:var(--ws-text-caption)]"><span className="font-semibold">{t("models.detail.seal")}:</span> {offer.sealName}</p> : null}
        <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("models.byAuthor", { author: offer.authorName, department: offer.department ?? t("models.detail.institutional") })}</p>
      </div>
      <div className="grid gap-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[length:var(--ws-text-caption)]">
          {offer.pricePoints > 0 ? <Dp value={offer.pricePoints} /> : <Tag tone="success">{t("models.free")}</Tag>}
          <span>{t(`models.license.${offer.license}`)}</span>
          <span className="text-ws-text-muted">{t("models.reusesShort", { n: offer.reuseCount })}</span>
        </div>
        <Button size="sm" onClick={() => onOpen(offer.id)} aria-label={t("models.openFor", { title: offer.title })}>{t("models.open")}</Button>
      </div>
    </Card>
  );
}

function Filters({ filters, setFilters, sort, setSort, departments }: { filters: ModelFilters; setFilters: (f: ModelFilters) => void; sort: ModelSort; setSort: (s: ModelSort) => void; departments: string[] }) {
  const { t } = useI18n();
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6" role="search" aria-label={t("models.filters.label")}>
      <Field label={t("models.filters.search")} className="sm:col-span-2">
        {({ id }) => <Input id={id} type="search" leading="buscar" value={filters.q} placeholder={t("models.filters.searchPlaceholder")} onChange={(e) => setFilters({ ...filters, q: e.target.value })} data-testid="models-search" />}
      </Field>
      <Field label={t("models.filters.kind")}>
        {({ id }) => <Select id={id} value={filters.kind} onChange={(e) => setFilters({ ...filters, kind: e.target.value as ModelFilters["kind"] })} options={[{ value: "TODOS", label: t("models.filters.all") }, ...MODEL_KINDS.map((k) => ({ value: k, label: t(`models.kind.${k}`) }))]} data-testid="models-kind" />}
      </Field>
      <Field label={t("models.filters.area")}>
        {({ id }) => <Select id={id} value={filters.area} onChange={(e) => setFilters({ ...filters, area: e.target.value as WorkArea | "TODAS" })} options={[{ value: "TODAS", label: t("models.filters.allAreas") }, ...WORK_AREAS.map((a) => ({ value: a, label: t(`tasks.area.${a}`) }))]} />}
      </Field>
      <Field label={t("models.filters.department")}>
        {({ id }) => <Select id={id} value={filters.department} onChange={(e) => setFilters({ ...filters, department: e.target.value })} options={[{ value: "TODOS", label: t("models.filters.allDepartments") }, ...departments.map((d) => ({ value: d, label: d }))]} data-testid="models-department" />}
      </Field>
      <Field label={t("models.filters.price")}>
        {({ id }) => <Select id={id} value={filters.price} onChange={(e) => setFilters({ ...filters, price: e.target.value as ModelFilters["price"] })} options={PRICE_FILTERS.map((p) => ({ value: p, label: t(`models.filters.priceOption.${p}`) }))} />}
      </Field>
      <Field label={t("models.filters.sort")} className="lg:col-start-6">
        {({ id }) => <Select id={id} value={sort} onChange={(e) => setSort(e.target.value as ModelSort)} options={MODEL_SORTS.map((s) => ({ value: s, label: t(`models.sort.${s}`) }))} />}
      </Field>
    </div>
  );
}

function MyOffers({ authorId, onOpen }: { authorId: string; onOpen: (id: string) => void }) {
  const { t, intl } = useI18n();
  const offers = myOffers(useModelOffers(), authorId);
  if (!offers.length) return null;
  return (
    <Card title={t("models.mine.title")} eyebrow="RF40 · CA06" data-testid="models-mine">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] text-left text-[length:var(--ws-text-body-sm)]">
          <caption className="sr-only">{t("models.mine.caption")}</caption>
          <thead className="text-[length:var(--ws-text-caption)] text-ws-text-muted">
            <tr>
              <th scope="col" className="py-2 pr-3 font-semibold">{t("models.mine.colModel")}</th>
              <th scope="col" className="py-2 pr-3 font-semibold">{t("models.mine.colStatus")}</th>
              <th scope="col" className="py-2 pr-3 text-right font-semibold">{t("models.mine.colViews")}</th>
              <th scope="col" className="py-2 pr-3 text-right font-semibold">{t("models.mine.colReuses")}</th>
              <th scope="col" className="py-2 pr-3 text-right font-semibold">{t("models.mine.colPoints")}</th>
              <th scope="col" className="py-2"><span className="sr-only">{t("models.mine.colActions")}</span></th>
            </tr>
          </thead>
          <tbody>
            {offers.map((o) => (
              <tr key={o.id} className="border-t border-ws-border">
                <th scope="row" className="py-2 pr-3 font-semibold">{o.title}</th>
                <td className="py-2 pr-3"><Tag tone={o.status === "ATIVA" ? "success" : "neutral"}>{t(`models.status.${o.status}`)}</Tag></td>
                <td className="py-2 pr-3 text-right tabular-nums">{formatNumber(o.viewsCount, intl)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{formatNumber(o.reuseCount, intl)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{formatNumber(o.pointsEarned, intl)}</td>
                <td className="py-2 text-right"><Button size="sm" variant="ghost" onClick={() => onOpen(o.id)}>{t("models.open")}</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function ModelsContent({ page }: { page: PageEntry }) {
  const { t } = useI18n();
  const { user, profile } = useViewer();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const mounted = useMounted();
  const repo = demoModelsRepository();
  const offers = useModelOffers(repo);
  const holder = pointsHolderOf(user);
  const balance = usePointsBalance(holder) ?? 0;
  const [filters, setFilters] = useState<ModelFilters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<ModelSort>("reutilizacoes");
  const [offering, setOffering] = useState(false);
  const canUse = page.access[profile] === "E";
  const actorId = holder ?? user.username;
  const viewer: ModelViewer = { holder, actorId, canUse, balance };
  const author: OfferAuthor = { id: actorId, name: user.name || t(user.nameKey), department: user.profile === "EMPRESA" ? null : user.departmentAcronym, profile, canEarnPoints: holder !== null };
  const openId = search.get("modelo");
  const open = openId ? repo.get(openId) : undefined;

  const setOpen = (id: string | null) => {
    const next = new URLSearchParams(search.toString());
    if (id) {
      next.set("modelo", id);
      repo.view(id, actorId);
    } else next.delete("modelo");
    const q = next.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  };

  const shelfList = (slug: string) => {
    const list = browseModels(offers, SHELF_OF[slug] ?? "COMUNIDADE", filters, sort);
    return (
      <div className="grid gap-3">
        <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t(`models.shelfHint.${SHELF_OF[slug] ?? "COMUNIDADE"}`)}</p>
        <p className="sr-only" aria-live="polite">{t("models.results", { n: list.length })}</p>
        {list.length ? (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" data-testid="models-grid">
            {list.map((o) => <ModelCard key={o.id} offer={o} onOpen={setOpen} />)}
          </ul>
        ) : (
          <EmptyState compact title={t("models.empty")} description={t("models.emptyHint")} action={<Button size="sm" variant="ghost" onClick={() => setFilters(EMPTY_FILTERS)}>{t("models.filters.clear")}</Button>} />
        )}
      </div>
    );
  };

  return (
    <>
      <RfPage
        page={page}
        actions={
          <>
            <DemoBadge hintKey="models.demoHint" />
            {canUse && canOfferModel(profile) ? <Button variant="primary" size="sm" icon="balcao" onClick={() => setOffering(true)} data-testid="offer-open">{t("models.offer.cta")}</Button> : null}
          </>
        }
        renderTab={(slug) => (mounted ? shelfList(slug) : <LoadingState />)}
      >
        {mounted ? (
          <div className="grid gap-[var(--ws-space-4)]">
            <DemoNote hintKey="models.demoHint" />
            <Filters filters={filters} setFilters={setFilters} sort={sort} setSort={setSort} departments={departmentsOf(offers)} />
            <MyOffers authorId={actorId} onOpen={setOpen} />
          </div>
        ) : null}
      </RfPage>
      {mounted && open ? <ModelDetail key={open.id} offer={open} viewer={viewer} repo={repo} onClose={() => setOpen(null)} /> : null}
      {mounted ? <OfferDialog open={offering} onOpenChange={setOffering} author={author} repo={repo} onOffered={(o) => { setOffering(false); setOpen(o.id); }} /> : null}
    </>
  );
}

export function ModelsPage({ page }: { page: PageEntry }) {
  return (
    <Suspense fallback={<LoadingState />}>
      <ModelsContent page={page} />
    </Suspense>
  );
}
