// Artes de fundo do Work Station — catálogo. Destino na etapa (b): packages/ui/src/backgrounds/backgrounds.ts.
// As artes finais são fornecidas pelo dono do produto; até lá `placeholder: true` aponta para os SVGs gerados só com
// tokens em placeholders/. Fluxo para adicionar arte: ver README.md (arquivo + `npm run backgrounds:thumbs` + 1 entrada
// aqui + 3 traduções em i18n/backgrounds.{pt-BR,en,es}.json).

export type BackgroundTone = 'light' | 'dark';
export type WsThemeId = 'claro' | 'escuro' | 'contraste' | 'terminal';

export interface WsBackground {
  /** id estável (kebab-case) — também é a chave em user_preferences.background_id e o nome dos arquivos */
  id: string;
  /** chave i18n do nome exibido no seletor (pt-BR/en/es) */
  labelKey: string;
  /** arte final (svg/png/webp), relativa a public/backgrounds/ */
  file: string;
  /** miniatura 320×180 PNG gerada por backgrounds-thumbs.mjs, relativa a public/backgrounds/thumbs/ */
  thumb: string;
  /** tom predominante: decide o scrim e a cor do texto sobre a arte */
  tone: BackgroundTone;
  /** tema em que a arte foi desenhada para brilhar (o seletor sugere; o usuário pode combinar como quiser) */
  recommendedTheme: WsThemeId;
  /** true enquanto a arte final não foi entregue — o app mostra o placeholder gerado com tokens */
  placeholder: boolean;
}

export const WS_BACKGROUNDS: readonly WsBackground[] = [
  { id: 'sem-arte', labelKey: 'background.sem-arte', file: '', thumb: 'sem-arte.png', tone: 'light', recommendedTheme: 'claro', placeholder: false },
  { id: 'malha-laranja', labelKey: 'background.malha-laranja', file: 'malha-laranja.svg', thumb: 'malha-laranja.png', tone: 'dark', recommendedTheme: 'escuro', placeholder: true },
  { id: 'nos-multicolor', labelKey: 'background.nos-multicolor', file: 'nos-multicolor.svg', thumb: 'nos-multicolor.png', tone: 'light', recommendedTheme: 'claro', placeholder: true },
  { id: 'terminal-noturno', labelKey: 'background.terminal-noturno', file: 'terminal-noturno.svg', thumb: 'terminal-noturno.png', tone: 'dark', recommendedTheme: 'terminal', placeholder: true },
  { id: 'disco-creme', labelKey: 'background.disco-creme', file: 'disco-creme.svg', thumb: 'disco-creme.png', tone: 'light', recommendedTheme: 'claro', placeholder: true },
  { id: 'blueprint-de-rede', labelKey: 'background.blueprint-de-rede', file: 'blueprint-de-rede.svg', thumb: 'blueprint-de-rede.png', tone: 'dark', recommendedTheme: 'escuro', placeholder: true },
  { id: 'grade-minima', labelKey: 'background.grade-minima', file: 'grade-minima.svg', thumb: 'grade-minima.png', tone: 'light', recommendedTheme: 'contraste', placeholder: true },
] as const;

export type WsBackgroundId = (typeof WS_BACKGROUNDS)[number]['id'];

/** Resolve a URL pública da arte (placeholder enquanto `placeholder: true`). */
export function backgroundUrl(bg: WsBackground): string | null {
  if (bg.id === 'sem-arte') return null;
  return bg.placeholder ? `/backgrounds/placeholders/${bg.id}.svg` : `/backgrounds/${bg.file}`;
}

/** Scrim recomendado sobre a arte (tokens --ws-scrim-*): o tom escuro pede tinta mais forte para manter o texto ≥ 4,5:1. */
export function backgroundScrim(bg: WsBackground): { tint: string; blur: string } {
  return bg.tone === 'dark'
    ? { tint: 'var(--ws-scrim-tint)', blur: 'var(--ws-blur-scrim)' }
    : { tint: 'color-mix(in srgb, var(--ws-surface-0) 72%, transparent)', blur: 'var(--ws-blur-scrim)' };
}
