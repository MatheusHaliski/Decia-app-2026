// Conventional Commits (ARQUITETURA §3.4): `tipo(escopo): assunto`. O escopo é opcional, mas quando o commit entrega
// um requisito usa o RF em minúsculas (`feat(rf20): …`); escopos transversais: skeleton, ci, sec, arch, ds, i18n, docs, deps.
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [2, "always", ["feat", "fix", "docs", "chore", "refactor", "test", "perf", "build", "ci", "style", "revert"]],
    "scope-case": [2, "always", "lower-case"],
    "scope-enum": [
      1,
      "always",
      ["skeleton", "ci", "sec", "arch", "ds", "i18n", "docs", "deps", "db", "api", "web", "infra", "release",
        // RF1–RF48 (board Work Station)
        ...Array.from({ length: 48 }, (_, i) => `rf${i + 1}`)],
    ],
    "subject-case": [0],          // português com acentos e maiúsculas em siglas (RF, CA, API)
    "header-max-length": [2, "always", 120],
    "body-max-line-length": [1, "always", 160],
    "footer-max-line-length": [0],  // Co-Authored-By / Claude-Session podem passar de 100
  },
};
