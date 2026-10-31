"use client";
/**
 * Configurações › Conta — especialidades e "quem vê meu perfil público" (RF3; auditoria Onda 1, 31/10/2026). Lê e grava por
 * `GET/PUT /api/me/publication`. Até 10 especialidades curtas: o campo acrescenta com Enter ou "Adicionar", repetidas (sem caixa nem
 * acento) são ignoradas e cada etiqueta tem "Remover" acessível. A escolha de visibilidade vale no servidor para perfil, foto, tarefas e
 * seguir — quem não pode ver recebe o mesmo "perfil não encontrado" de uma conta inexistente.
 */
import { useEffect, useState, type FormEvent, type KeyboardEvent } from "react";
import { Button, Card, ErrorState, Field, Input, LoadingState, RadioCards, Tag, useToast } from "@/components/ui";
import { ApiError, describeError } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/useI18n";
import {
  addSpecialty, cleanSpecialty, publicationApi, SPECIALTIES_MAX, SPECIALTY_MAX_LENGTH, SPECIALTY_MIN_LENGTH,
  type ProfileVisibility, type PublicationView,
} from "@/lib/account/publication";

export function PublicationCard({ locked }: { locked: boolean }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [loaded, setLoaded] = useState<PublicationView | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [items, setItems] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<ProfileVisibility>("AUTENTICADOS");
  const [draft, setDraft] = useState("");
  const [draftError, setDraftError] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoadError(null);
    publicationApi.get(ctrl.signal).then(
      (v) => {
        if (ctrl.signal.aborted) return;
        setLoaded(v);
        setItems(v.specialties ?? []);
        setVisibility(v.profileVisibility === "EMPRESA" ? "EMPRESA" : "AUTENTICADOS");
      },
      (e: unknown) => { if (!ctrl.signal.aborted) setLoadError(describeError(e)); },
    );
    return () => ctrl.abort();
  }, [attempt]);

  const add = () => {
    const v = cleanSpecialty(draft);
    if (!v) return;
    const length = [...v].length;
    if (length < SPECIALTY_MIN_LENGTH || length > SPECIALTY_MAX_LENGTH) {
      setDraftError(t("account.publication.lengthError", { min: SPECIALTY_MIN_LENGTH, max: SPECIALTY_MAX_LENGTH }));
      return;
    }
    if (items.length >= SPECIALTIES_MAX) {
      setDraftError(t("account.publication.maxError", { max: SPECIALTIES_MAX }));
      return;
    }
    const next = addSpecialty(items, v);
    setItems(next.list);
    setDraft("");
    setDraftError(next.added ? null : t("account.publication.duplicate", { label: v }));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      add();
    }
  };

  const save = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const v = await publicationApi.update({ specialties: items, profileVisibility: visibility });
      setLoaded(v);
      setItems(v.specialties ?? []);
      setVisibility(v.profileVisibility === "EMPRESA" ? "EMPRESA" : "AUTENTICADOS");
      toast({ title: t("account.publication.saved"), tone: "sucesso" });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const body = () => {
    if (loadError) return <ErrorState title={t("account.publication.loadError")} description={loadError} onRetry={() => setAttempt((n) => n + 1)} />;
    if (!loaded) return <LoadingState />;
    const fields = error instanceof ApiError ? error.fields : {};
    return (
      <form onSubmit={save} className="grid gap-[var(--ws-space-3)]" noValidate>
        <Field
          label={t("account.publication.specialties")}
          hint={t("account.publication.specialtiesHint", { max: SPECIALTIES_MAX, min: SPECIALTY_MIN_LENGTH, maxLength: SPECIALTY_MAX_LENGTH })}
          error={draftError ?? fields.specialties}
        >
          {({ id, describedBy, invalid }) => (
            <div className="flex flex-wrap gap-2">
              <Input
                id={id}
                className="min-w-0 flex-1 basis-48"
                value={draft}
                maxLength={SPECIALTY_MAX_LENGTH + 10}
                onChange={(e) => { setDraft(e.target.value); setDraftError(null); }}
                onKeyDown={onKeyDown}
                disabled={locked || items.length >= SPECIALTIES_MAX}
                aria-describedby={describedBy}
                invalid={invalid}
                data-testid="specialty-input"
              />
              <Button type="button" onClick={add} disabled={locked || !draft.trim() || items.length >= SPECIALTIES_MAX} data-testid="specialty-add">
                {t("account.publication.add")}
              </Button>
            </div>
          )}
        </Field>
        {items.length ? (
          <ul aria-label={t("account.publication.current", { n: items.length, max: SPECIALTIES_MAX })} className="flex flex-wrap gap-1.5" data-testid="specialty-list">
            {items.map((s) => (
              <li key={s} className="inline-flex items-center gap-1">
                <Tag>{s}</Tag>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  aria-label={t("account.publication.remove", { label: s })}
                  disabled={locked}
                  onClick={() => setItems((list) => list.filter((x) => x !== s))}
                >
                  <span aria-hidden>×</span>
                </Button>
              </li>
            ))}
          </ul>
        ) : <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("account.publication.none")}</p>}
        <fieldset className="grid gap-2" disabled={locked}>
          <legend className="text-[length:var(--ws-text-body-sm)] font-semibold text-ws-text">{t("account.publication.visibility")}</legend>
          <RadioCards
            label={t("account.publication.visibility")}
            value={visibility}
            onValueChange={(v) => setVisibility(v === "EMPRESA" ? "EMPRESA" : "AUTENTICADOS")}
            columns={2}
            options={[
              { value: "AUTENTICADOS", label: t("account.publication.visibility.AUTENTICADOS"), hint: t("account.publication.visibility.AUTENTICADOSHint"), disabled: locked },
              { value: "EMPRESA", label: t("account.publication.visibility.EMPRESA"), hint: t("account.publication.visibility.EMPRESAHint"), disabled: locked },
            ]}
          />
          {fields.profileVisibility ? <p role="alert" className="text-[length:var(--ws-text-caption)] font-medium text-ws-danger-ink">{fields.profileVisibility}</p> : null}
        </fieldset>
        {error && !Object.keys(fields).length ? <ErrorState title={t("error.title")} description={describeError(error)} className="p-[var(--ws-space-3)]" /> : null}
        <Button type="submit" variant="primary" className="justify-self-start" busy={busy} disabled={locked} data-testid="publication-save">{t("account.publication.save")}</Button>
      </form>
    );
  };

  return (
    <Card title={t("account.publication.title")} eyebrow="RF3" data-testid="account-publication">
      {body()}
    </Card>
  );
}
