/**
 * Pactos de Desbloqueio — diretório institucional DEMO (lotações e chefias). Base: o diretório da rede social DEMO
 * (`lib/social/fixtures.ts`: Secretaria Exemplo, SECID-UTS, CPOE, Prefeitura Exemplo) — somente leitura — acrescido de duas
 * unidades e quatro pessoas fictícias usadas só nos pactos (Assessoria Jurídica e Gerência de Orçamento) e da Elisa, que já
 * existe no DECIA DEMO. As regras SEMPRE releem este diretório na hora da ação (RF49.CA09): quem perdeu a chefia ou a lotação
 * deixa de poder agir, sem cache de permissão no pacto.
 */
import { buildDemoSocial, VIEWER_DEMO_USER } from "@/lib/social/fixtures";
import type { ViewerProfile } from "@/lib/viewer/profiles";

export interface OrgPerson {
  id: string;
  name: string;
  departmentId: string | null;
  companyId: string | null;
}
export interface OrgDepartment {
  id: string;
  acronym: string;
  name: string;
  companyId: string;
  headUserId: string | null;
  active: boolean;
}
export interface OrgCompany {
  id: string;
  name: string;
  ownerUserId: string;
}
export interface OrgDirectory {
  people: readonly OrgPerson[];
  departments: readonly OrgDepartment[];
  companies: readonly OrgCompany[];
}

const EXTRA_DEPARTMENTS: OrgDepartment[] = [
  { id: "d-ajur", acronym: "AJUR", name: "Assessoria Jurídica (demo)", companyId: "c-secretaria", headUserId: "u-juridico", active: true },
  { id: "d-gof", acronym: "GOF", name: "Gerência de Orçamento e Finanças (demo)", companyId: "c-secretaria", headUserId: "u-orcamento", active: true },
];
const EXTRA_PEOPLE: OrgPerson[] = [
  { id: "u-juridico", name: "Joana Exemplo", departmentId: "d-ajur", companyId: "c-secretaria" },
  { id: "u-rita", name: "Rita Exemplo", departmentId: "d-ajur", companyId: "c-secretaria" },
  { id: "u-orcamento", name: "Otávio Exemplo", departmentId: "d-gof", companyId: "c-secretaria" },
  { id: "u-rui", name: "Rui Exemplo", departmentId: "d-gof", companyId: "c-secretaria" },
  { id: "u-elisa", name: "Elisa Exemplo", departmentId: "d-uts", companyId: "c-secretaria" },
];

let cached: OrgDirectory | null = null;
/** Diretório DEMO (estático: só lotações e chefias, sem datas). */
export function demoOrg(): OrgDirectory {
  if (cached) return cached;
  const social = buildDemoSocial(new Date("2026-01-01T00:00:00Z"));
  cached = {
    companies: social.companies.map((c) => ({ id: c.id, name: c.legalName, ownerUserId: c.ownerUserId })),
    departments: [
      ...social.departments.map((d) => ({ id: d.id, acronym: d.acronym, name: d.name, companyId: d.companyId, headUserId: d.headUserId, active: true })),
      ...EXTRA_DEPARTMENTS,
    ],
    people: [
      // ADMIN administra o sistema e não integra unidade nos pactos (não lê conteúdo de pacto, RF49.CA09)
      ...social.people.map((p) => ({ id: p.id, name: p.fullName, departmentId: p.id === "u-admin" ? null : p.departmentId, companyId: p.companyId })),
      ...EXTRA_PEOPLE,
    ],
  };
  return cached;
}

/** Pessoa DEMO de cada perfil de visualização do laboratório (D-35); VISITANTE = ninguém. */
export const pactUserOf = (profile: ViewerProfile): string | null => VIEWER_DEMO_USER[profile];

export const personOf = (org: OrgDirectory, id: string | null | undefined) => (id ? org.people.find((p) => p.id === id) : undefined);
export const departmentOf = (org: OrgDirectory, id: string | null | undefined) => (id ? org.departments.find((d) => d.id === id) : undefined);
export const personName = (org: OrgDirectory, id: string | null | undefined) => personOf(org, id)?.name ?? id ?? "";
/** Chefia ATUAL da unidade (relida a cada chamada). */
export const headOf = (org: OrgDirectory, departmentId: string) => departmentOf(org, departmentId)?.headUserId ?? null;
export const membersOf = (org: OrgDirectory, departmentId: string) => org.people.filter((p) => p.departmentId === departmentId).map((p) => p.id);
export const companyOfDepartment = (org: OrgDirectory, departmentId: string) => departmentOf(org, departmentId)?.companyId ?? null;
export const companyOwnerOf = (org: OrgDirectory, companyId: string | null) => org.companies.find((c) => c.id === companyId)?.ownerUserId ?? null;
/** Unidades ativas da empresa (destinos possíveis de um pacto: o escopo inicial é a mesma empresa). */
export const activeDepartmentsOf = (org: OrgDirectory, companyId: string | null) => org.departments.filter((d) => d.companyId === companyId && d.active);
