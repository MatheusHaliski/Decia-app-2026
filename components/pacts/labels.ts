/** Rótulos dos pactos (chaves i18n montadas a partir dos enums; textos no fragmento `memoriapactos`). */
import type { Tone } from "@/components/ui";
import { departmentOf, personName, type OrgDirectory } from "@/lib/pacts/org";
import type { PactParty, PactStatus } from "@/lib/pacts/types";

type T = (key: string, vars?: Record<string, string | number>) => string;

export const STATUS_TONE: Record<PactStatus, Tone> = {
  SOLICITADO: "info",
  EM_NEGOCIACAO: "warning",
  COMPROMETIDO: "accent",
  ENTREGUE: "spark",
  VALIDADO: "success",
  RECUSADO: "danger",
  CANCELADO: "neutral",
};

export const deptAcronym = (org: OrgDirectory, id: string) => departmentOf(org, id)?.acronym ?? id;

/** "Ana Exemplo (SECID-UTS)", "Equipe da CPOE", "Chefia da CPOE", "GOF (departamento)". */
export function partyLabel(t: T, org: OrgDirectory, party: PactParty): string {
  const dept = deptAcronym(org, party.departmentId);
  if (party.kind === "PESSOA") return t("pacts.party.PESSOA", { name: personName(org, party.userId), dept });
  return t(`pacts.party.${party.kind}`, { dept });
}

export const formatDay = (iso: string, intl: string) => new Intl.DateTimeFormat(intl, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso.slice(0, 10)}T12:00:00Z`));
export const formatWhen = (iso: string, intl: string) => new Intl.DateTimeFormat(intl, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
export const formatDays = (n: number, intl: string) => new Intl.NumberFormat(intl, { maximumFractionDigits: 1 }).format(n);
export const formatPercent = (n: number, intl: string) => new Intl.NumberFormat(intl, { style: "percent", maximumFractionDigits: 0 }).format(n);
