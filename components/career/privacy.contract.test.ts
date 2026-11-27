/**
 * Contrato de privacidade da profissão preferida (D-147): é dado só do dono. Nenhum componente ou módulo PÚBLICO — perfil de
 * terceiros, busca de pessoas, mural/feed, página de empresa, ranking — lê a profissão (nem as preferências, nem os componentes de
 * carreira), e `preferredOccupation` só aparece nos arquivos que servem à própria pessoa. Teste estático sobre o código-fonte: quebra
 * quando alguém passar a ler a profissão numa tela pública.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PROFILE_TABS } from "@/lib/pages/registry";
import { CAREER_TAB } from "./CareerTab";

const ROOT = path.resolve(__dirname, "..", "..");

function walk(dir: string, out: string[] = []): string[] {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return out;
  for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) walk(rel, out);
    else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) && !/\.gen\.ts$/.test(e.name)) out.push(rel.split(path.sep).join("/"));
  }
  return out;
}

/** Telas e módulos públicos ou vistos por terceiros. */
const PUBLIC_DIRS = [
  "components/people", "components/social", "components/institutional", "components/seals", "components/points",
  "lib/people", "lib/social", "lib/institutional", "lib/points",
  "app/(shell)/u", "app/(shell)/search", "app/(shell)/find", "app/(shell)/mural", "app/(shell)/companies", "app/(shell)/highlights",
];

/** O que denuncia leitura da profissão (direta ou por um componente de carreira). */
const READS_OCCUPATION = /preferredOccupation|usePreferences|useOptionalPreferences|OccupationCombobox|OccupationSettingsCard|DevelopmentPlan|CareerTab|occupationArea|components\/career/;

/** Únicos arquivos (fora de testes) que podem citar `preferredOccupation`: todos servem só ao dono. */
const OWNER_ONLY = new Set([
  "lib/preferences/types.ts", "lib/preferences/storage.ts", "lib/preferences/PreferencesProvider.tsx",
  "lib/career/occupationPack.ts",
  "components/career/OccupationSettingsCard.tsx", "components/career/CareerTab.tsx",
  "components/tasks/TaskForm.tsx", "components/auth/AuthForms.tsx",
  "components/projects/desk/CreateProject.tsx", "components/models/ModelsPage.tsx",
  // primeiros passos da própria pessoa ("escolha sua profissão" feito ou não)
  "components/onboarding/steps.ts",
  // Melhorias de um card: a lente é a profissão de QUEM VÊ, mostrada só para essa pessoa (nunca a do autor)
  "components/cardviewer/windows/ImprovementsWindow.tsx",
]);

describe("D-147: a profissão preferida nunca chega a uma tela pública", () => {
  it("componentes públicos (perfil de terceiros, busca, mural, empresa, ranking) não leem a profissão", () => {
    const files = PUBLIC_DIRS.flatMap((d) => walk(d));
    expect(files.length).toBeGreaterThan(10);
    const offenders = files.filter((f) => READS_OCCUPATION.test(fs.readFileSync(path.join(ROOT, f), "utf8")));
    expect(offenders).toEqual([]);
  });

  it("`preferredOccupation` só aparece em arquivos do próprio dono", () => {
    const files = ["app", "components", "lib"].flatMap((d) => walk(d));
    const users = files.filter((f) => fs.readFileSync(path.join(ROOT, f), "utf8").includes("preferredOccupation"));
    expect(users.filter((f) => !OWNER_ONLY.has(f))).toEqual([]);
  });

  it("a profissão só vai ao servidor por /api/me/preferences (dado do dono), nunca por outro endpoint", () => {
    const storage = fs.readFileSync(path.join(ROOT, "lib/preferences/storage.ts"), "utf8");
    const endpoints = [...storage.matchAll(/api\.(?:get|put|post|patch)<?[^(]*\(\s*"([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(endpoints)).toEqual(new Set(["/api/me/preferences"]));
    const auth = fs.readFileSync(path.join(ROOT, "components/auth/AuthForms.tsx"), "utf8");
    // o cadastro grava nas preferências, não no corpo de auth.register
    expect(/auth\.register\(\{[^}]*occupation/i.test(auth)).toBe(false);
  });

  it("a aba Carreira não é sub-aba de terceiros: fica fora da matriz B (que alimenta o perfil público)", () => {
    expect(PROFILE_TABS.some((t) => t.slug === CAREER_TAB.slug)).toBe(false);
    const view = fs.readFileSync(path.join(ROOT, "components/social/ProfileView.tsx"), "utf8");
    expect(view.includes("CareerTab")).toBe(false);
  });
});
