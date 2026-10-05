// stylelint do Work Station: cor só por token (D-11). Hex, rgb(), rgba(), hsl(), hsla(), oklch() etc. são proibidos
// em qualquer CSS exceto styles/tokens.css — quem precisa de uma cor nova cria o token (e passa pela tabela de
// contraste do DESIGN_SYSTEM.md §2.9) em vez de escrever o valor na tela.
export default {
  rules: {
    "color-no-hex": true,
    "function-disallowed-list": ["rgb", "rgba", "hsl", "hsla", "hwb", "lab", "lch", "oklab", "oklch", "color"],
    "color-named": "never",
  },
  overrides: [
    {
      files: ["styles/tokens.css"],
      rules: {
        "color-no-hex": null,
        "function-disallowed-list": null,
        "color-named": null,
      },
    },
  ],
};
