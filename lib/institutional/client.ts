/**
 * Institucional (RF14, RF15, RF6; auditoria Onda 1, 31/10/2026): páginas públicas de departamento e empresa, seguir e a parte
 * institucional do próprio perfil. Regras do servidor: qualquer conta autenticada vê; departamento inexistente, inativo ou ambíguo e
 * empresa inexistente ou inativa respondem 404 (recusa uniforme); contadores só com fonte real (pessoas ativas com lotação vigente,
 * departamentos ativos, seguidores ativos); pessoas sem contato. O slug do departamento é único só dentro da empresa: `?company=`
 * desambigua.
 */
import { api, qs } from "@/lib/api/client";
import type { NodeColor } from "@/components/ui";
import type { FollowView } from "@/lib/people/client";

// Espelha os DTOs InstitutionPageService.* (PersonCard, CompanyRef, DepartmentPageView, DepartmentSummary, CompanyPageView,
// MyInstitutionView); trocar pelo tipo gerado (lib/api/schema.d.ts) quando o contrato OpenAPI for regenerado.
export interface PersonCard { id: string; username?: string | null; name?: string | null; jobTitle?: string | null; avatarUrl?: string | null; role?: string | null }
export interface CompanyRef { id: string; slug: string; name: string; accentColor?: string | null }
export interface DepartmentPageView {
  id: string; slug: string; acronym?: string | null; name: string; color?: string | null; monogram?: string | null; about?: string | null;
  coverUrl?: string | null; company: CompanyRef; head?: PersonCard | null; members: number; followers: number; member: boolean;
}
export interface DepartmentSummary {
  id: string; slug: string; companySlug: string; acronym?: string | null; name: string; color?: string | null; monogram?: string | null; members: number;
}
export interface CompanyPageView {
  id: string; slug: string; name: string; about?: string | null; websiteUrl?: string | null; accentColor?: string | null;
  account?: PersonCard | null; departments: number; people: number; followers: number; owner: boolean;
}
export interface MyInstitutionView {
  company?: CompanyRef | null; companyStatus?: string | null; owner: boolean; departments: DepartmentSummary[]; people?: number | null;
}

const NODE_COLORS: readonly NodeColor[] = ["red", "yellow", "green", "blue", "brown", "orange"];

/** Cor guardada como token (`Department.color`, `Company.accentColor`) → cor de nó do design system; fora da lista, nenhuma. */
export function nodeColor(token: string | null | undefined): NodeColor | null {
  const v = (token ?? "").trim().toLowerCase();
  return (NODE_COLORS as readonly string[]).includes(v) ? (v as NodeColor) : null;
}

/** Link da página do departamento, com a empresa quando conhecida (o slug só é único dentro dela). */
export function departmentHref(slug: string, companySlug?: string | null): string {
  return `/departments/${encodeURIComponent(slug)}${companySlug ? qs({ company: companySlug }) : ""}`;
}

export const companyHref = (slug: string) => `/companies/${encodeURIComponent(slug)}`;

const dep = (slug: string) => `/api/departments/${encodeURIComponent(slug)}`;
const com = (slug: string) => `/api/companies/${encodeURIComponent(slug)}`;
const companyQs = (company?: string | null) => (company ? qs({ company }) : "");

export const institutionApi = {
  department: (slug: string, company?: string | null, signal?: AbortSignal) => api.get<DepartmentPageView>(`${dep(slug)}${companyQs(company)}`, { signal }),
  members: (slug: string, company?: string | null, signal?: AbortSignal) => api.get<PersonCard[]>(`${dep(slug)}/members${companyQs(company)}`, { signal }),
  departmentFollow: (slug: string, company?: string | null, signal?: AbortSignal) => api.get<FollowView>(`${dep(slug)}/follow${companyQs(company)}`, { signal }),
  followDepartment: (slug: string, company?: string | null) => api.put<FollowView>(`${dep(slug)}/follow${companyQs(company)}`, {}),
  unfollowDepartment: (slug: string, company?: string | null) => api.delete<FollowView>(`${dep(slug)}/follow${companyQs(company)}`),
  company: (slug: string, signal?: AbortSignal) => api.get<CompanyPageView>(com(slug), { signal }),
  companyDepartments: (slug: string, signal?: AbortSignal) => api.get<DepartmentSummary[]>(`${com(slug)}/departments`, { signal }),
  companyFollow: (slug: string, signal?: AbortSignal) => api.get<FollowView>(`${com(slug)}/follow`, { signal }),
  followCompany: (slug: string) => api.put<FollowView>(`${com(slug)}/follow`, {}),
  unfollowCompany: (slug: string) => api.delete<FollowView>(`${com(slug)}/follow`),
  /** RF6: parte institucional do próprio perfil. */
  mine: (signal?: AbortSignal) => api.get<MyInstitutionView>("/api/me/institution", { signal }),
};
