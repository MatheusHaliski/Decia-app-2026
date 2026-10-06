// stylelint do Work Station: cor só por token (D-11, D-33). Hex, rgb(), rgba(), hsl(), hsla(), oklch() etc. são proibidos
// em qualquer CSS exceto styles/tokens-ws.css (cópia gerada de docs/design-system/tokens-ws.css) — quem precisa de uma cor
// nova cria o token (e passa pela tabela de contraste de TOKENS.md) em vez de escrever o valor na tela. Além disso, toda
// propriedade de cor só aceita var(--ws-…), currentColor, transparent, inherit ou palavras-chave estruturais (none, auto).
const COLOR_PROPS = "/^(color|background|background-color|background-image|border|border-color|border-top-color|border-right-color|border-bottom-color|border-left-color|outline|outline-color|fill|stroke|box-shadow|text-decoration-color|caret-color|accent-color|column-rule-color)$/";
const TOKEN_ONLY = ["/var\\(--ws-/", "/^(currentColor|transparent|inherit|initial|unset|none|auto)$/", "/^(linear|radial|repeating-linear|repeating-radial)-gradient\\((?:(?!#|rgb|hsl|oklch|lab|lch|hwb|color\\().)*\\)$/", "/^url\\(/", "/^[0-9.]+(px|rem|em|%)?( [0-9.]+(px|rem|em|%)?)*( (solid|dashed|dotted|double))?( var\\(--ws-[a-z0-9-]+\\))?$/", "/^(solid|dashed|dotted|double)( var\\(--ws-[a-z0-9-]+\\))?$/", "/^blur\\(/", "/^image-set\\(/"];

export default {
  rules: {
    "color-no-hex": true,
    "function-disallowed-list": ["rgb", "rgba", "hsl", "hsla", "hwb", "lab", "lch", "oklab", "oklch", "color"],
    "color-named": "never",
    "declaration-property-value-allowed-list": { [COLOR_PROPS]: TOKEN_ONLY },
  },
  overrides: [
    {
      files: ["styles/tokens-ws.css"],
      rules: {
        "color-no-hex": null,
        "function-disallowed-list": null,
        "color-named": null,
        "declaration-property-value-allowed-list": null,
      },
    },
  ],
};
