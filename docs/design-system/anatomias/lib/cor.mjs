// Utilidades de cor — WCAG 2.x (luminância relativa, razão de contraste), HSL e mistura em sRGB.
// Sem dependências. Usado por tokens.mjs (derivação dos tons) e por gerar.mjs (relatório de contraste).

export const hexToRgb = (hex) => {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
export const rgbToHex = ([r, g, b]) =>
  '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('').toUpperCase();

const lin = (v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
export const luminance = (hex) => { const [r, g, b] = hexToRgb(hex); return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b); };
export const contrast = (a, b) => {
  const la = luminance(a), lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
};
export const fmt = (r) => (Math.round(r * 100) / 100).toFixed(2);

/** mistura a com b; t = peso de b (0..1) */
export const mix = (a, b, t) => { const A = hexToRgb(a), B = hexToRgb(b); return rgbToHex(A.map((v, i) => v * (1 - t) + B[i] * t)); };

export function rgbToHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return [h, s, l];
}
export function hslToRgb([h, s, l]) {
  if (s === 0) { const v = l * 255; return [v, v, v]; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (t) => { t = (t + 1) % 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p; };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}
export const lighten = (hex, d) => { const [h, s, l] = rgbToHsl(hexToRgb(hex)); return rgbToHex(hslToRgb([h, s, Math.max(0, Math.min(1, l + d))])); };

/**
 * Ajusta a luminosidade (HSL) de `hex` no sentido `dir` ('darker' | 'lighter') em passos de 0,5 %
 * até que o contraste com TODOS os fundos de `bgs` seja ≥ `min`. Devolve o hex ajustado.
 */
export function ensure(hex, bgs, min, dir) {
  let out = hex, i = 0;
  const [h, s] = rgbToHsl(hexToRgb(hex)); let l = rgbToHsl(hexToRgb(hex))[2];
  while (i < 400 && !bgs.every((bg) => contrast(out, bg) >= min)) {
    l += dir === 'darker' ? -0.005 : 0.005;
    l = Math.max(0, Math.min(1, l));
    out = rgbToHex(hslToRgb([h, s, l]));
    i++;
    if (l === 0 || l === 1) break;
  }
  return out;
}
