"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge, Button, Card, Field, Input, Link, LoadingState } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import { LETTERS_DEMO_USER } from "@/lib/letters/fixtures";
import { demoLettersRepository, useLetterPieces, type LettersRepository } from "@/lib/letters/repository";
import { EXPECTED_SECTIONS } from "@/lib/letters/coherence";
import { TEMPLATE_TYPES, type TemplateType } from "@/lib/letters/templates";
import { wordCount } from "@/lib/letters/text";
import { usePreferences } from "@/lib/preferences/PreferencesProvider";
import { useMounted } from "./useMounted";

const OFICIO_ELEMENTS = ["identificacao", "data", "assunto", "vocativo", "fecho"] as const;

/** /letters: minhas peças (DEMO) e criação a partir de modelo (relatório técnico, parecer, ofício/memorando, ADR). */
export function LettersHome({ repo = demoLettersRepository() }: { repo?: LettersRepository }) {
  const mounted = useMounted();
  if (!mounted) return <LoadingState />;
  return <Home repo={repo} />;
}

function Home({ repo }: { repo: LettersRepository }) {
  const { t, intl } = useI18n();
  const { prefs } = usePreferences();
  const router = useRouter();
  const pieces = useLetterPieces(repo);
  const [title, setTitle] = useState("");
  const fmt = new Intl.DateTimeFormat(intl, { dateStyle: "medium", timeStyle: "short" });

  const create = (template: TemplateType) => {
    const piece = repo.createFromTemplate({ template, title: title.trim() || t(`letters.template.${template}.defaultTitle`), ownerId: LETTERS_DEMO_USER, mode: prefs.aiAutonomyDefault });
    setTitle("");
    router.push(`/letters/${piece.id}`);
  };

  return (
    <div className="grid gap-[var(--ws-space-5)]">
      <section aria-labelledby="letters-mine" className="grid gap-[var(--ws-space-3)]">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="letters-mine" className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h2)] font-semibold">{t("letters.home.mine")}</h2>
          <Badge tone="warning" title={t("letters.demoHint")}>{t("letters.demo")}</Badge>
        </div>
        <p className="max-w-prose text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("letters.home.intro")}</p>
        <ul className="grid gap-[var(--ws-space-3)] md:grid-cols-2" aria-label={t("letters.home.mine")}>
          {pieces.map((p) => {
            const words = p.blocks.reduce((s, b) => s + wordCount(b.text), 0);
            return (
              <Card as="li" key={p.id} padding="md" className="grid gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="neutral" className="normal-case tracking-normal">{t(`letters.docType.${p.docType}`)}</Badge>
                  <Badge tone="info" className="normal-case tracking-normal">{t(`letters.genre.${p.genre}`)}</Badge>
                </div>
                <h3 className="text-[length:var(--ws-text-body)] font-semibold">
                  <Link href={`/letters/${p.id}`}>{p.title}</Link>
                </h3>
                <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">
                  {t("letters.home.meta", { revision: p.revision, words, date: fmt.format(new Date(p.updatedAt)), mode: t(`aiAutonomy.${p.policy.mode}`) })}
                </p>
                <div>
                  <Button href={`/letters/${p.id}`} size="sm" variant="primary" aria-label={t("letters.home.openNamed", { title: p.title })}>{t("letters.home.open")}</Button>
                </div>
              </Card>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="letters-new" className="grid gap-[var(--ws-space-3)]">
        <h2 id="letters-new" className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h2)] font-semibold">{t("letters.home.new")}</h2>
        <Field label={t("letters.home.newTitle")} hint={t("letters.home.newTitleHint")} className="max-w-xl">
          {({ id, describedBy }) => <Input id={id} aria-describedby={describedBy} value={title} maxLength={160} onChange={(e) => setTitle(e.target.value)} />}
        </Field>
        <ul className="grid gap-[var(--ws-space-3)] sm:grid-cols-2 xl:grid-cols-4" aria-label={t("letters.home.templates")}>
          {TEMPLATE_TYPES.map((type) => {
            const sections = type === "OFICIO" ? OFICIO_ELEMENTS.map((k) => t(`letters.oficio.${k}`)) : EXPECTED_SECTIONS[type].map((s) => t(`letters.section.${s.key}`));
            return (
              <Card as="li" key={type} padding="md" className="grid content-between gap-2">
                <div className="grid gap-1">
                  <h3 className="text-[length:var(--ws-text-body)] font-semibold">{t(`letters.docType.${type}`)}</h3>
                  <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t(`letters.template.${type}.description`)}</p>
                  {sections.length ? <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("letters.home.sections", { list: sections.join(" · ") })}</p> : null}
                </div>
                <div>
                  <Button size="sm" variant="default" icon="criar-tarefa" onClick={() => create(type)}>{t("letters.home.create", { template: t(`letters.docType.${type}`) })}</Button>
                </div>
              </Card>
            );
          })}
        </ul>
        <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("letters.home.modeNote", { mode: t(`aiAutonomy.${prefs.aiAutonomyDefault}`) })}</p>
      </section>
    </div>
  );
}
