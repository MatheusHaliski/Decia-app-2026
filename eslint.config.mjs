// ESLint (flat config) do frontend Work Station. Além do recomendado do TypeScript e do Next, aplica as regras do design
// system (D-11, D-30, ARQUITETURA §4):
//  1. nenhum elemento interativo/nativo solto nas telas — <button>, <input>, <select>, <dialog>, <progress> e <a> só podem
//     aparecer dentro de components/ui/** (fora dali use Button, Input, Select, Dialog, PercentBar e Link do design system);
//  2. nenhuma cor literal em JSX: `style={{ color: "#fff" }}` / `rgb()` / `hsl()` e classes Tailwind de cor fixa
//     (`bg-red-500`, `text-white`, `border-slate-200`…) são proibidas — cor só por token (`bg-ws-accent`, `var(--ws-*)`).
// As regras são testadas em scripts/lint-fixtures/*.lint.test.ts.
import nextPlugin from "@next/eslint-plugin-next";
import tseslint from "typescript-eslint";

/** Elemento JSX proibido fora do design system → mensagem apontando o componente certo. */
const FORBIDDEN_ELEMENTS = [
  ["button", "Button"],
  ["input", "Input"],
  ["select", "Select"],
  ["dialog", "Dialog"],
  ["progress", "PercentBar"],
  ["a", "Link"],
];

export const designSystemRestrictions = FORBIDDEN_ELEMENTS.map(([tag, component]) => ({
  selector: `JSXOpeningElement[name.name='${tag}']`,
  message: `<${tag}> solto é proibido fora de components/ui/** (design system, D-11). Use <${component}> de "@/components/ui".`,
}));

const COLOR_LITERAL = "/(#[0-9a-fA-F]{3,8}\\b|\\b(rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch)\\()/";
const TAILWIND_COLOR_CLASS =
  "/(^|\\s|:)(bg|text|border|ring|fill|stroke|from|via|to|outline|decoration|shadow|accent|caret|divide|placeholder)-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone|black|white)(-\\d{2,3})?(\\/\\d+)?(\\s|$)/";

/** Cor literal em style={{…}} e classe Tailwind de cor fixa — valem em TODO .tsx, inclusive components/ui (tokens sempre). */
export const colorRestrictions = [
  {
    selector: `JSXAttribute[name.name='style'] Literal[value=${COLOR_LITERAL}]`,
    message: "Cor literal em style={{…}} é proibida (D-11): use var(--ws-…) de styles/tokens-ws.css.",
  },
  {
    selector: `JSXAttribute[name.name='style'] TemplateElement[value.raw=${COLOR_LITERAL}]`,
    message: "Cor literal em style={{…}} é proibida (D-11): use var(--ws-…) de styles/tokens-ws.css.",
  },
  {
    selector: `JSXAttribute[name.name='className'] Literal[value=${TAILWIND_COLOR_CLASS}]`,
    message: "Classe Tailwind de cor fixa (bg-red-500, text-white…) é proibida (D-11): use as classes de token bg-ws-*/text-ws-*/border-ws-*.",
  },
  {
    selector: `JSXAttribute[name.name='className'] TemplateElement[value.raw=${TAILWIND_COLOR_CLASS}]`,
    message: "Classe Tailwind de cor fixa (bg-red-500, text-white…) é proibida (D-11): use as classes de token bg-ws-*/text-ws-*/border-ws-*.",
  },
  {
    selector: `CallExpression[callee.name='cn'] Literal[value=${TAILWIND_COLOR_CLASS}]`,
    message: "Classe Tailwind de cor fixa em cn(...) é proibida (D-11): use as classes de token bg-ws-*/text-ws-*/border-ws-*.",
  },
];

export default tseslint.config(
  {
    ignores: [
      "node_modules/**", ".next/**", "out/**", "coverage/**", "next-env.d.ts", "playwright-report/**", "test-results/**",
      "ws-*/**", "target/**", "config/**", "docs/**", "public/**", ".claude/**",
    ],
  },
  ...tseslint.configs.recommended,
  {
    plugins: { "@next/next": nextPlugin },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
    },
  },
  {
    // telas e bibliotecas: só componentes do design system (testes podem usar elementos nativos como harness)
    files: ["**/*.tsx"],
    ignores: ["components/ui/**", "**/*.test.tsx"],
    rules: {
      "no-restricted-syntax": ["error", ...designSystemRestrictions, ...colorRestrictions],
    },
  },
  {
    // o próprio design system pode usar os elementos nativos, mas nunca cor literal
    files: ["components/ui/**/*.tsx"],
    rules: {
      "no-restricted-syntax": ["error", ...colorRestrictions],
    },
  },
  {
    // scripts Node em CommonJS (check de i18n)
    files: ["scripts/**/*.js"],
    languageOptions: { sourceType: "commonjs" },
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
);
