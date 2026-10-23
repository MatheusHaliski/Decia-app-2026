/**
 * Perfil de VISUALIZAÇÃO do lab (D-35): só no front, para testar a visibilidade das abas por perfil
 * (docs/produto/ABAS_POR_PERFIL.md §1.1). Não é autenticação — a sessão real chega no Bloco 3 (RF1/RF2) e passará a
 * alimentar o mesmo contexto. EMPREGADO · EMPRESA · CHEFE · CURADOR · ADMIN · VISITANTE (não logado).
 */
export const VIEWER_PROFILES = ["EMPREGADO", "EMPRESA", "CHEFE", "CURADOR", "ADMIN", "VISITANTE"] as const;
export type ViewerProfile = (typeof VIEWER_PROFILES)[number];

/** Célula da matriz: V visível · E visível e editável · O oculta (403 no backend). */
export type Access = "V" | "E" | "O";
export type AccessMatrix = Record<ViewerProfile, Access>;

/** Dados exibidos no shell para o perfil de visualização (fictícios; o backend substitui no Bloco 3). */
export interface ViewerUser {
  profile: ViewerProfile;
  /** chave i18n do nome exibido (os nomes são fictícios e traduzíveis: "Pessoa exemplo") */
  nameKey: string;
  username: string;
  /** chave i18n do cargo */
  roleKey: string;
  companySlug: string | null;
  companyNameKey: string | null;
  departmentSlug: string | null;
  departmentAcronym: string | null;
  /** nó da malha usado no monograma do departamento (TAXONOMIA §1.5 Department.color) */
  departmentNode: "red" | "yellow" | "green" | "blue" | "brown" | "orange" | null;
  /** saldo fictício da ficha DP (RF42); null = conta sem saldo próprio (EMPRESA, §7.d) */
  points: number | null;
  /** Conta real (P19): nome e cargo vêm de `/api/me` e não passam pela tradução */
  name?: string;
  roleLabel?: string;
}

const COMPANY = { companySlug: "secretaria-exemplo", companyNameKey: "viewer.company.exemplo" } as const;

export const VIEWER_USERS: Record<ViewerProfile, ViewerUser> = {
  EMPREGADO: { profile: "EMPREGADO", nameKey: "viewer.name.empregado", username: "pessoa.exemplo", roleKey: "viewer.role.empregado", ...COMPANY, departmentSlug: "secid-uts", departmentAcronym: "SECID-UTS", departmentNode: "blue", points: 1240 },
  EMPRESA: { profile: "EMPRESA", nameKey: "viewer.company.exemplo", username: "secretaria.exemplo", roleKey: "viewer.role.empresa", ...COMPANY, departmentSlug: null, departmentAcronym: null, departmentNode: null, points: null },
  CHEFE: { profile: "CHEFE", nameKey: "viewer.name.chefe", username: "chefe.exemplo", roleKey: "viewer.role.chefe", ...COMPANY, departmentSlug: "cpoe", departmentAcronym: "CPOE", departmentNode: "orange", points: 2310 },
  CURADOR: { profile: "CURADOR", nameKey: "viewer.name.curador", username: "curadoria.exemplo", roleKey: "viewer.role.curador", ...COMPANY, departmentSlug: "cpoe", departmentAcronym: "CPOE", departmentNode: "orange", points: 980 },
  ADMIN: { profile: "ADMIN", nameKey: "viewer.name.admin", username: "admin.exemplo", roleKey: "viewer.role.admin", ...COMPANY, departmentSlug: "secid-uts", departmentAcronym: "SECID-UTS", departmentNode: "blue", points: 0 },
  VISITANTE: { profile: "VISITANTE", nameKey: "viewer.name.visitante", username: "", roleKey: "viewer.role.visitante", companySlug: null, companyNameKey: null, departmentSlug: null, departmentAcronym: null, departmentNode: null, points: null },
};

export const isViewerProfile = (v: unknown): v is ViewerProfile => typeof v === "string" && (VIEWER_PROFILES as readonly string[]).includes(v);

/** Atalho para montar a matriz: `access({ EMPREGADO: "E", EMPRESA: "V" }, "O")` preenche os demais com o padrão. */
export function access(partial: Partial<AccessMatrix>, fallback: Access = "O"): AccessMatrix {
  const out = {} as AccessMatrix;
  for (const p of VIEWER_PROFILES) out[p] = partial[p] ?? fallback;
  return out;
}
/** Todos os perfis logados com o mesmo acesso; visitante oculto salvo indicação. */
export const logged = (a: Access, visitante: Access = "O"): AccessMatrix => access({ EMPREGADO: a, EMPRESA: a, CHEFE: a, CURADOR: a, ADMIN: a, VISITANTE: visitante });
export const everyone = (a: Access = "V"): AccessMatrix => logged(a, a);

export function monogramOf(user: ViewerUser): string {
  if (user.departmentAcronym) return user.departmentAcronym.replace(/^SECID-/, "").slice(0, 3);
  return user.username.split(".").map((p) => p[0]?.toUpperCase() ?? "").join("").slice(0, 2) || "WS";
}

/** Perfil de visualização de uma conta real: ADMIN pelo papel; senão pelo tipo escolhido no cadastro. */
export function viewerProfileOf(me: { role?: string | null; profileType?: string | null }): ViewerProfile {
  if (me.role === "ADMIN") return "ADMIN";
  if (me.profileType === "EMPRESA") return "EMPRESA";
  if (me.profileType === "CHEFE_DEPARTAMENTO") return "CHEFE";
  return "EMPREGADO";
}

/** Usuário da barra a partir de `/api/me`: sem empresa, departamento nem pontos de demonstração. */
export function viewerUserOf(me: { username?: string | null; fullName?: string | null; displayName?: string | null; jobTitle?: string | null; role?: string | null; profileType?: string | null }): ViewerUser {
  const profile = viewerProfileOf(me);
  return {
    profile,
    nameKey: `profile.${profile}`,
    name: me.displayName?.trim() || me.fullName?.trim() || me.username || "",
    username: me.username ?? "",
    roleKey: `profile.${profile}`,
    roleLabel: me.jobTitle?.trim() || undefined,
    companySlug: null,
    companyNameKey: null,
    departmentSlug: null,
    departmentAcronym: null,
    departmentNode: null,
    points: null,
  };
}
