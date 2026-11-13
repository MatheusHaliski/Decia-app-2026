"use client";
/**
 * Simulador de Perfis e Governança (D-35) — `/lab/perfis`. Troca o perfil de visualização do app (Empregado, Empresa, Chefe,
 * Curador, Admin, Visitante) e mostra, lado a lado com um segundo perfil, o que cada um edita, vê ou não vê em cada página, com o
 * porquê (papel, regra/guard, decisão) — tudo lido da MESMA matriz do registro (`lib/pages/registry.ts`). Cenários guiados levam à
 * página certa já no perfil escolhido; o resumo diz o que muda entre os dois perfis.
 */
import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, Field, Link, Select, Switch, Tag, cn, type Tone } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import { NAV_GROUPS } from "@/lib/nav/matrix";
import { PAGES, type PageEntry } from "@/lib/pages/registry";
import { VIEWER_PROFILES, type Access, type ViewerProfile } from "@/lib/viewer/profiles";
import { useViewer } from "@/lib/viewer/ViewerProvider";
import { SCENARIOS, compareProfiles, concreteHref, explainAccess, navGroupOf, scenarioOutcome, type DiffKind } from "./simulator";

const CELL_TONE: Record<Access, Tone> = { E: "success", V: "info", O: "neutral" };
const CELL_MARK: Record<Access, string> = { E: "✎", V: "👁", O: "⊘" };
const DIFF_TONE: Record<DiffKind, Tone> = { SO_A: "accent", SO_B: "warning", A_EDITA: "accent", B_EDITA: "warning" };

/** Grupos da tabela: os do menu lateral e, por fim, as páginas internas, globais, de entrada e do Lab. */
const GROUPS: readonly { id: string; labelKey: string }[] = [...NAV_GROUPS.map((g) => ({ id: g.id, labelKey: g.labelKey })), { id: "outras", labelKey: "labSim.group.outras" }];
const groupOfPage = (p: PageEntry) => navGroupOf(p.route) ?? "outras";

export function CellTag({ cell }: { cell: Access }) {
  const { t } = useI18n();
  return <Tag tone={CELL_TONE[cell]}><span aria-hidden>{CELL_MARK[cell]}</span>{t(`labSim.cell.${cell}`)}</Tag>;
}

function Why({ page, profile }: { page: PageEntry; profile: ViewerProfile }) {
  const { t } = useI18n();
  const x = explainAccess(page, profile);
  return (
    <div className="grid gap-1" data-why={profile}>
      <p className="font-semibold">{t(`profile.${profile}`)}: <CellTag cell={x.cell} /></p>
      <p><span className="font-semibold">{t("labSim.why.role")}:</span> {t(`labSim.role.${profile}`)}</p>
      <p><span className="font-semibold">{t("labSim.why.rule")}:</span> {t(`labSim.rule.${x.rule}`)}{x.guard ? <code className="ml-1 font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-caption)]">{x.guard}</code> : null}</p>
      {x.notes.map((n) => <p key={n} className="text-ws-text-muted">{t(`labSim.note.${n}`)}</p>)}
      {x.decisions.length ? (
        <p className="flex flex-wrap items-center gap-1"><span className="font-semibold">{t("labSim.why.decisions")}:</span>{x.decisions.map((d) => <Badge key={d} tone="neutral">{d}</Badge>)}</p>
      ) : null}
    </div>
  );
}

export function ProfileSimulator() {
  const { t } = useI18n();
  const router = useRouter();
  const { profile, setProfile, canSwitch } = useViewer();
  const [other, setOther] = useState<ViewerProfile>(() => (profile === "VISITANTE" ? "EMPREGADO" : "VISITANTE"));
  const [onlyDiffs, setOnlyDiffs] = useState(true);
  const b = other === profile ? (VIEWER_PROFILES.find((p) => p !== profile) ?? "VISITANTE") : other;
  const cmp = useMemo(() => compareProfiles(profile, b), [profile, b]);
  const diffOf = useMemo(() => new Map(cmp.diffs.map((d) => [d.page.route, d.kind])), [cmp]);
  const rows = PAGES.filter((p) => !onlyDiffs || diffOf.has(p.route));
  const profileOptions = VIEWER_PROFILES.map((p) => ({ value: p, label: t(`profile.${p}`) }));
  const name = (p: ViewerProfile) => t(`profile.${p}`);

  const go = (target: ViewerProfile, href: string) => {
    if (canSwitch) setProfile(target);
    router.push(href);
  };

  return (
    <div className="grid gap-[var(--ws-space-5)]" data-testid="profile-simulator">
      <Card title={t("labSim.title")} eyebrow={t("labSim.eyebrow")}>
        <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("labSim.intro")}</p>
        {!canSwitch ? <p className="mt-2 rounded-[var(--ws-radius-md)] bg-ws-warning-soft px-3 py-2 text-[length:var(--ws-text-body-sm)]" data-testid="sim-locked">{t("labSim.locked")}</p> : null}
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label={t("labSim.profileA")} hint={t("labSim.profileAHint")}>
            {({ id, describedBy }) => <Select id={id} aria-describedby={describedBy} value={profile} disabled={!canSwitch} onChange={(e) => setProfile(e.target.value as ViewerProfile)} options={profileOptions} data-testid="sim-profile-a" />}
          </Field>
          <Field label={t("labSim.profileB")} hint={t("labSim.profileBHint")}>
            {({ id, describedBy }) => <Select id={id} aria-describedby={describedBy} value={b} onChange={(e) => setOther(e.target.value as ViewerProfile)} options={profileOptions.filter((o) => o.value !== profile)} data-testid="sim-profile-b" />}
          </Field>
        </div>
        <div className="mt-3 grid gap-1 rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-2 p-3 text-[length:var(--ws-text-body-sm)]" aria-live="polite" data-testid="sim-summary">
          <p className="font-semibold">{t("labSim.summary.title", { a: name(profile), b: name(b) })}</p>
          <ul className="grid list-disc gap-0.5 pl-5">
            <li>{t("labSim.summary.onlyA", { n: cmp.counts.onlyA, a: name(profile), b: name(b) })}</li>
            <li>{t("labSim.summary.onlyB", { n: cmp.counts.onlyB, a: name(profile), b: name(b) })}</li>
            <li>{t("labSim.summary.editA", { n: cmp.counts.editA, a: name(profile), b: name(b) })}</li>
            <li>{t("labSim.summary.editB", { n: cmp.counts.editB, a: name(profile), b: name(b) })}</li>
            <li>{t("labSim.summary.tabs", { n: cmp.tabDiffs.length })}</li>
            <li>{t("labSim.summary.same", { n: cmp.counts.same, total: cmp.counts.total })}</li>
          </ul>
          <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("labSim.summary.source")}</p>
        </div>
      </Card>

      <Card title={t("labSim.table.title", { a: name(profile), b: name(b) })} eyebrow="lib/pages/registry.ts" padding="sm">
        <Switch checked={onlyDiffs} onCheckedChange={setOnlyDiffs} label={t("labSim.table.onlyDiffs")} hint={t("labSim.table.onlyDiffsHint", { n: cmp.diffs.length })} />
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[length:var(--ws-text-caption)]" data-testid="sim-table">
            <caption className="sr-only">{t("labSim.table.caption", { a: name(profile), b: name(b) })}</caption>
            <thead>
              <tr className="text-left">
                <th scope="col" className="p-2">{t("labSim.table.page")}</th>
                <th scope="col" className="p-2">{name(profile)}</th>
                <th scope="col" className="p-2">{name(b)}</th>
                <th scope="col" className="p-2">{t("labSim.table.why")}</th>
              </tr>
            </thead>
            <tbody>
              {GROUPS.map((g) => {
                const inGroup = rows.filter((p) => groupOfPage(p) === g.id);
                if (!inGroup.length) return null;
                return (
                  <Fragment key={g.id}>
                    <tr><th scope="colgroup" colSpan={4} className="p-2 pt-3 text-left font-[family-name:var(--ws-font-mono)] uppercase tracking-[var(--ws-text-label--tracking)] text-ws-text-muted">{t(g.labelKey)}</th></tr>
                    {inGroup.map((p) => {
                      const kind = diffOf.get(p.route);
                      return (
                        <tr key={p.route} className={cn("border-t border-ws-border align-top", kind && "bg-ws-accent-soft")} data-route={p.route} data-diff={kind ?? ""}>
                          <th scope="row" className="p-2 text-left font-normal">
                            <Link href={concreteHref(p.route)} variant="plain" className="font-semibold hover:underline">{t(p.titleKey)}</Link>
                            <span className="block font-[family-name:var(--ws-font-mono)] text-ws-text-muted">{p.route}</span>
                            {kind ? <Tag tone={DIFF_TONE[kind]}>{t(`labSim.diff.${kind}`, { a: name(profile), b: name(b) })}</Tag> : null}
                          </th>
                          <td className="p-2"><CellTag cell={p.access[profile]} /></td>
                          <td className="p-2"><CellTag cell={p.access[b]} /></td>
                          <td className="p-2">
                            <details>
                              <summary className="cursor-pointer select-none">{t("labSim.table.whyOpen")}</summary>
                              <div className="mt-1 grid gap-2 sm:grid-cols-2"><Why page={p} profile={profile} /><Why page={p} profile={b} /></div>
                            </details>
                          </td>
                        </tr>
                      );
                    })}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        {cmp.tabDiffs.length ? (
          <div className="mt-3 grid gap-1" data-testid="sim-tab-diffs">
            <p className="font-semibold text-[length:var(--ws-text-body-sm)]">{t("labSim.tabs.title")}</p>
            <ul className="grid gap-1 text-[length:var(--ws-text-caption)]">
              {cmp.tabDiffs.map((d) => (
                <li key={`${d.page.route}:${d.tab}`}>
                  {t(d.page.titleKey)} › {t(d.labelKey)} — {t("labSim.tabs.visibleFor", { profile: name(d.visibleFor === "A" ? profile : b) })}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Card>

      <Card title={t("labSim.scenarios.title")} eyebrow={t("labSim.scenarios.eyebrow")}>
        <p className="mb-3 text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("labSim.scenarios.intro")}</p>
        <ul className="grid gap-2 md:grid-cols-2" data-testid="sim-scenarios">
          {SCENARIOS.map((s) => {
            const out = scenarioOutcome(s);
            return (
              <li key={s.id} className="grid gap-2 rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-1 p-3" data-scenario={s.id} data-expect={s.expect}>
                <p className="font-semibold">{t(`labSim.scenario.${s.id}.title`)}</p>
                <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t(`labSim.scenario.${s.id}.steps`)}</p>
                <p className="flex flex-wrap items-center gap-1.5 text-[length:var(--ws-text-caption)]">
                  <span>{t("labSim.scenarios.expected")}</span>
                  {out.cell ? <CellTag cell={out.cell} /> : null}
                  {out.cell === "O" ? <Badge tone="danger">403 ACESSO_NEGADO</Badge> : null}
                </p>
                <div>
                  <Button size="sm" variant="secondary" onClick={() => go(s.profile, out.href)} data-testid={`sim-go-${s.id}`}>
                    {t("labSim.scenarios.go", { profile: name(s.profile) })}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
