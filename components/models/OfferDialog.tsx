"use client";
/**
 * "Oferecer como modelo" (RF40.CA01): escolhe a origem — um modelo de tarefa do Acervo, o projeto de exemplo ou um kit de 2 a 5
 * modelos —, título, como usar, licença e preço em DECIA Points (0 = grátis; até 50; conta sem saldo próprio só grátis). Grava
 * pela função reutilizável `offerAsModel` (lib/models/offer.ts); a oferta entra na prateleira Comunidade.
 */
import { useMemo, useState, type FormEvent } from "react";
import { Button, Dialog, Field, Input, RadioCards, Select, SelectList, Textarea, useToast } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import { MODEL_DESCRIPTION_MAX, MODEL_MAX_PRICE, MODEL_TITLE_MAX, offerAsModel, type OfferAuthor, type OfferError, type OfferSourceInput } from "@/lib/models/offer";
import type { ModelsRepository } from "@/lib/models/repository";
import { MODEL_LICENSES, type ModelLicense, type ModelOffer } from "@/lib/models/types";
import { buildDemoProject } from "@/lib/projects/fixtures";
import { AREA_TEMPLATES } from "@/lib/tasks/areaTemplates";
import { WORK_AREAS, type WorkArea } from "@/lib/tasks/client";

type SourceType = OfferSourceInput["type"];
const MAX_KIT = 5;

const FIELD_OF: Record<OfferError, "source" | "title" | "description" | "price" | "license" | "form"> = {
  ACESSO_NEGADO: "form", TITULO_OBRIGATORIO: "title", TITULO_LONGO: "title", DESCRICAO_LONGA: "description", PRECO_INVALIDO: "price", PRECO_SEM_SALDO: "price",
  LICENCA_INVALIDA: "license", KIT_VAZIO: "source", OFERTA_DUPLICADA: "source",
};

export function OfferDialog({ open, onOpenChange, author, repo, onOffered }: { open: boolean; onOpenChange: (o: boolean) => void; author: OfferAuthor; repo: ModelsRepository; onOffered: (offer: ModelOffer) => void }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const project = useMemo(() => buildDemoProject(), []);
  const [type, setType] = useState<SourceType>("TASK_TEMPLATE");
  const [area, setArea] = useState<WorkArea>("ADMINISTRACAO");
  const [templateId, setTemplateId] = useState("");
  const [kitIds, setKitIds] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [license, setLicense] = useState<ModelLicense>("ATRIBUICAO");
  const [price, setPrice] = useState("0");
  const [error, setError] = useState<OfferError | null>(null);
  const areaTemplates = AREA_TEMPLATES.filter((x) => x.area === area);
  const template = AREA_TEMPLATES.find((x) => x.id === templateId);
  const defaultTitle = type === "TASK_TEMPLATE" ? template?.title ?? "" : type === "PROJECT" ? project.title : "";

  const source = (): OfferSourceInput | null => {
    if (type === "TASK_TEMPLATE") return template ? { type, template } : null;
    if (type === "PROJECT") return { type, project };
    const templates = kitIds.map((id) => AREA_TEMPLATES.find((x) => x.id === id)).filter((x): x is NonNullable<typeof x> => !!x);
    return { type: "KIT", templates };
  };

  const reset = () => {
    setTemplateId("");
    setKitIds([]);
    setTitle("");
    setDescription("");
    setPrice("0");
    setError(null);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const src = source();
    if (!src) {
      setError("KIT_VAZIO");
      return;
    }
    const kitTitle = type === "KIT" ? t("models.offer.kitTitle", { n: kitIds.length }) : undefined;
    const r = offerAsModel({ source: src, author, pricePoints: author.canEarnPoints ? Number(price) : 0, license, usageDescription: description, title: title.trim() || kitTitle || undefined }, repo, new Date());
    if (!r.ok) {
      setError(r.reason);
      return;
    }
    toast({ title: t("models.offer.done", { title: r.offer.title }), description: t("models.offer.doneHint"), tone: "sucesso" });
    reset();
    onOffered(r.offer);
  };

  const err = (field: (typeof FIELD_OF)[OfferError]) => (error && FIELD_OF[error] === field ? t(`models.offer.error.${error}`, { max: MODEL_MAX_PRICE }) : undefined);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }} title={t("models.offer.title")} description={t("models.offer.description")} className="w-[min(94vw,40rem)]">
      <form className="grid gap-4" onSubmit={submit} data-testid="offer-form">
        <RadioCards
          label={t("models.offer.sourceType")}
          value={type}
          onValueChange={(v) => { setType(v as SourceType); setError(null); }}
          columns={3}
          options={[
            { value: "TASK_TEMPLATE", label: t("models.kind.TAREFA"), hint: t("models.offer.sourceHint.TASK_TEMPLATE") },
            { value: "PROJECT", label: t("models.kind.PROJETO"), hint: t("models.offer.sourceHint.PROJECT") },
            { value: "KIT", label: t("models.kind.KIT"), hint: t("models.offer.sourceHint.KIT", { max: MAX_KIT }) },
          ]}
        />
        {type !== "PROJECT" ? (
          <Field label={t("models.offer.area")}>
            {({ id }) => <Select id={id} value={area} onChange={(e) => { setArea(e.target.value as WorkArea); setTemplateId(""); }} options={WORK_AREAS.map((a) => ({ value: a, label: t(`tasks.area.${a}`) }))} />}
          </Field>
        ) : null}
        {type === "TASK_TEMPLATE" ? (
          <Field label={t("models.offer.template")} error={err("source")}>
            {({ id, describedBy, invalid }) => <Select id={id} aria-describedby={describedBy} invalid={invalid} value={templateId} onChange={(e) => setTemplateId(e.target.value)} options={[{ value: "", label: t("models.offer.chooseTemplate") }, ...areaTemplates.map((x) => ({ value: x.id, label: x.title }))]} data-testid="offer-template" />}
          </Field>
        ) : null}
        {type === "PROJECT" ? <p className="rounded-[var(--ws-radius-md)] bg-ws-surface-2 p-3 text-[length:var(--ws-text-body-sm)]">{t("models.offer.projectSource", { title: project.title })}</p> : null}
        {type === "KIT" ? (
          <div className="grid gap-1.5">
            <SelectList
              label={t("models.offer.kitTemplates", { max: MAX_KIT })}
              multiple
              value={kitIds}
              onChange={(ids) => setKitIds(ids.slice(0, MAX_KIT))}
              options={areaTemplates.map((x) => ({ id: x.id, title: x.title, subtitle: t(`social.taskType.${x.type}`) }))}
            />
            <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted" aria-live="polite">{t("models.offer.kitCount", { n: kitIds.length, max: MAX_KIT })}</p>
            {err("source") ? <p role="alert" className="text-[length:var(--ws-text-caption)] font-medium text-ws-danger-ink">{err("source")}</p> : null}
          </div>
        ) : null}
        <Field label={t("models.offer.titleLabel")} hint={t("models.offer.titleHint", { max: MODEL_TITLE_MAX })} error={err("title")}>
          {({ id, describedBy, invalid }) => <Input id={id} aria-describedby={describedBy} invalid={invalid} value={title} placeholder={defaultTitle} maxLength={MODEL_TITLE_MAX} onChange={(e) => setTitle(e.target.value)} />}
        </Field>
        <Field label={t("models.offer.usage")} hint={t("models.offer.usageHint", { max: MODEL_DESCRIPTION_MAX })} error={err("description")}>
          {({ id, describedBy, invalid }) => <Textarea id={id} aria-describedby={describedBy} invalid={invalid} rows={3} maxLength={MODEL_DESCRIPTION_MAX} value={description} onChange={(e) => setDescription(e.target.value)} />}
        </Field>
        <RadioCards
          label={t("models.offer.license")}
          value={license}
          onValueChange={(v) => setLicense(v as ModelLicense)}
          columns={3}
          options={MODEL_LICENSES.map((l) => ({ value: l, label: t(`models.license.${l}`), hint: t(`models.licenseHint.${l}`) }))}
        />
        <Field label={t("models.offer.price")} hint={author.canEarnPoints ? t("models.offer.priceHint", { max: MODEL_MAX_PRICE }) : t("models.offer.priceNoBalance")} error={err("price")}>
          {({ id, describedBy, invalid }) => <Input id={id} aria-describedby={describedBy} invalid={invalid} type="number" min={0} max={MODEL_MAX_PRICE} step={1} value={author.canEarnPoints ? price : "0"} disabled={!author.canEarnPoints} onChange={(e) => setPrice(e.target.value)} className="max-w-32" data-testid="offer-price" />}
        </Field>
        {err("form") ? <p role="alert" className="text-[length:var(--ws-text-body-sm)] font-medium text-ws-danger-ink">{err("form")}</p> : null}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={() => { reset(); onOpenChange(false); }}>{t("common.cancel")}</Button>
          <Button type="submit" variant="primary" data-testid="offer-submit">{t("models.offer.submit")}</Button>
        </div>
      </form>
    </Dialog>
  );
}
