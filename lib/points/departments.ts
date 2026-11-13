/**
 * Pontos por departamento (RF42.CA08, visão da EMPRESA, do CHEFE e do ADMIN): agregados com privacidade (D-147) — departamento com
 * menos de 5 pessoas não aparece (k ≥ 5 para equipe) e o total da empresa só aparece com 10 pessoas ou mais (k ≥ 10) e quando a
 * diferença entre o total e os departamentos visíveis não revela um grupo menor que 5. Ninguém é listado nem ordenado por pessoa.
 * Os números de entrada são DEMO até a API de pontos existir.
 */
export const DEPARTMENT_MIN_PEOPLE = 5;
export const COMPANY_MIN_PEOPLE = 10;

export interface DepartmentPoints {
  department: string;
  people: number;
  /** DP ganhos no mês */
  earned: number;
  /** DP gastos no mês */
  spent: number;
}

export interface DepartmentRow extends DepartmentPoints {
  hidden: boolean;
  /** média por pessoa (arredondada) */
  perPerson: number;
}

export interface CompanyTotal {
  people: number;
  earned: number;
  spent: number;
  perPerson: number;
}

export function aggregateDepartments(raw: readonly DepartmentPoints[], k = DEPARTMENT_MIN_PEOPLE, kCompany = COMPANY_MIN_PEOPLE): { rows: DepartmentRow[]; company: CompanyTotal | null } {
  const rows = raw
    .map((d) => {
      const hidden = d.people < k;
      return hidden
        ? { department: d.department, people: 0, earned: 0, spent: 0, perPerson: 0, hidden }
        : { ...d, hidden, perPerson: d.people ? Math.round(d.earned / d.people) : 0 };
    })
    .sort((a, b) => a.department.localeCompare(b.department, "pt-BR"));
  const people = raw.reduce((s, d) => s + d.people, 0);
  const hiddenPeople = raw.filter((d) => d.people < k).reduce((s, d) => s + d.people, 0);
  const safe = people >= kCompany && (hiddenPeople === 0 || hiddenPeople >= k);
  const earned = raw.reduce((s, d) => s + d.earned, 0);
  const spent = raw.reduce((s, d) => s + d.spent, 0);
  return { rows, company: safe ? { people, earned, spent, perPerson: Math.round(earned / people) } : null };
}

/** Números DEMO do mês (fictícios). */
export const DEMO_DEPARTMENT_POINTS: readonly DepartmentPoints[] = [
  { department: "SECID-UTS", people: 12, earned: 3140, spent: 1980 },
  { department: "CPOE", people: 7, earned: 2210, spent: 1350 },
  { department: "ASJUR", people: 6, earned: 980, spent: 410 },
  { department: "ASCOM", people: 4, earned: 620, spent: 300 },
  { department: "OUVIDORIA", people: 3, earned: 240, spent: 90 },
];

export const departmentRows = () => aggregateDepartments(DEMO_DEPARTMENT_POINTS);
