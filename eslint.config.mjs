// ESLint (flat config) do frontend Work Station. Além do recomendado do TypeScript e do Next, aplica a regra do design
// system (D-11, ARQUITETURA §4): nenhum elemento interativo/nativo solto nas telas — <button>, <input>, <select>,
// <dialog>, <progress> e <a> só podem aparecer dentro de components/ui/**. Fora dali use Button, Input, Select, Dialog,
// Progress e Link do design system. A regra é testada em scripts/lint-fixtures/forbidden-elements.lint.test.ts.
import nextPlugin from "@next/eslint-plugin-next";
import tseslint from "typescript-eslint";

/** Elemento JSX proibido fora do design system → mensagem apontando o componente certo. */
const FORBIDDEN_ELEMENTS = [
  ["button", "Button"],
  ["input", "Input"],
  ["select", "Select"],
  ["dialog", "Dialog"],
  ["progress", "Progress"],
  ["a", "Link"],
];

export const designSystemRestrictions = FORBIDDEN_ELEMENTS.map(([tag, component]) => ({
  selector: `JSXOpeningElement[name.name='${tag}']`,
  message: `<${tag}> solto é proibido fora de components/ui/** (design system, D-11). Use <${component}> de "@/components/ui".`,
}));

export default tseslint.config(
  {
    ignores: [
      "node_modules/**", ".next/**", "out/**", "coverage/**", "next-env.d.ts",
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
    // telas e bibliotecas: só componentes do design system
    files: ["**/*.tsx"],
    ignores: ["components/ui/**"],
    rules: {
      "no-restricted-syntax": ["error", ...designSystemRestrictions],
    },
  },
  {
    // scripts Node em CommonJS (check de i18n)
    files: ["scripts/**/*.js"],
    languageOptions: { sourceType: "commonjs" },
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
);
