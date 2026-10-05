/**
 * Preferências do usuário (RF3.CA03; TAXONOMIA §1.2 `UserPreferences`). Valores no vocabulário do design system v2
 * (tokens-ws.css: claro · escuro · contraste · terminal). Mapa para o enum do servidor em `toServer/fromServer`
 * (ThemeMode AUTO·CLARO·ESCURO·ALTO_CONTRASTE·BLUEPRINT — "terminal" × BLUEPRINT em aberto, Q-100).
 */
import { DEFAULT_LOCALE, fromServerLanguage, isLocale, toServerLanguage, type Locale } from "@/lib/i18n/state";

export const THEMES = ["auto", "claro", "escuro", "contraste", "terminal"] as const;
export type Theme = (typeof THEMES)[number];
export const DENSITIES = ["compacta", "normal", "confortavel"] as const;
export type Density = (typeof DENSITIES)[number];
export const FONT_SCALES = [90, 100, 112, 125] as const;
export type FontScale = (typeof FONT_SCALES)[number];
export const DESK_SKINS = ["papel", "cortica", "blueprint", "papel-timbrado"] as const;
export type DeskSkin = (typeof DESK_SKINS)[number];
export const AI_MODES = ["economia", "avancado"] as const;
export type AiMode = (typeof AI_MODES)[number];

export interface NotificationPrefs {
  /** horário da Tarefa do Dia (RF44.CA10), HH:mm */
  dailyTaskAt: string;
  email: boolean;
  push: boolean;
  mentions: boolean;
  decia: boolean;
  seals: boolean;
  points: boolean;
  weeklyDigest: boolean;
}

export interface UserPreferences {
  theme: Theme;
  language: Locale;
  density: Density;
  fontScale: FontScale;
  reduceMotion: boolean;
  deskSkin: DeskSkin;
  /** arte de fundo do shell (docs/design-system/backgrounds) */
  backgroundId: string;
  notificationPrefs: NotificationPrefs;
  timezone: string;
  /** limite WIP pessoal, 1–20 (RF44.CA05; Q-79) */
  wipLimit: number;
  aiModeDefault: AiMode;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: "auto",
  language: DEFAULT_LOCALE,
  density: "normal",
  fontScale: 100,
  reduceMotion: false,
  deskSkin: "papel",
  backgroundId: "sem-arte",
  notificationPrefs: { dailyTaskAt: "08:00", email: true, push: false, mentions: true, decia: true, seals: true, points: true, weeklyDigest: true },
  timezone: "America/Sao_Paulo",
  wipLimit: 3,
  aiModeDefault: "economia",
};

const inList = <T extends readonly unknown[]>(list: T, v: unknown): v is T[number] => list.includes(v);

/** Normaliza um objeto desconhecido (localStorage, API) para `UserPreferences`, descartando valores inválidos. */
export function sanitizePreferences(raw: unknown): UserPreferences {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const n = (r.notificationPrefs && typeof r.notificationPrefs === "object" ? r.notificationPrefs : {}) as Record<string, unknown>;
  const bool = (v: unknown, d: boolean) => (typeof v === "boolean" ? v : d);
  const wip = Number(r.wipLimit);
  return {
    theme: inList(THEMES, r.theme) ? r.theme : DEFAULT_PREFERENCES.theme,
    language: isLocale(r.language) ? r.language : DEFAULT_PREFERENCES.language,
    density: inList(DENSITIES, r.density) ? r.density : DEFAULT_PREFERENCES.density,
    fontScale: inList(FONT_SCALES, Number(r.fontScale)) ? (Number(r.fontScale) as FontScale) : DEFAULT_PREFERENCES.fontScale,
    reduceMotion: bool(r.reduceMotion, DEFAULT_PREFERENCES.reduceMotion),
    deskSkin: inList(DESK_SKINS, r.deskSkin) ? r.deskSkin : DEFAULT_PREFERENCES.deskSkin,
    backgroundId: typeof r.backgroundId === "string" && /^[a-z0-9-]{1,40}$/.test(r.backgroundId) ? r.backgroundId : DEFAULT_PREFERENCES.backgroundId,
    notificationPrefs: {
      dailyTaskAt: typeof n.dailyTaskAt === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(n.dailyTaskAt) ? n.dailyTaskAt : DEFAULT_PREFERENCES.notificationPrefs.dailyTaskAt,
      email: bool(n.email, true), push: bool(n.push, false), mentions: bool(n.mentions, true), decia: bool(n.decia, true),
      seals: bool(n.seals, true), points: bool(n.points, true), weeklyDigest: bool(n.weeklyDigest, true),
    },
    timezone: typeof r.timezone === "string" && /^[A-Za-z_]+\/[A-Za-z_]+(\/[A-Za-z_]+)?$/.test(r.timezone) ? r.timezone : DEFAULT_PREFERENCES.timezone,
    wipLimit: Number.isInteger(wip) && wip >= 1 && wip <= 20 ? wip : DEFAULT_PREFERENCES.wipLimit,
    aiModeDefault: inList(AI_MODES, r.aiModeDefault) ? r.aiModeDefault : DEFAULT_PREFERENCES.aiModeDefault,
  };
}

/** Corpo de `PUT /api/me/preferences` (enum do servidor, TAXONOMIA §1.2). */
export function toServer(p: UserPreferences) {
  const theme = ({ auto: "AUTO", claro: "CLARO", escuro: "ESCURO", contraste: "ALTO_CONTRASTE", terminal: "TERMINAL" } as const)[p.theme];
  return {
    theme,
    language: toServerLanguage(p.language),
    density: p.density.toUpperCase(),
    fontScale: p.fontScale,
    reduceMotion: p.reduceMotion,
    deskSkin: p.deskSkin.toUpperCase().replace("-", "_"),
    backgroundId: p.backgroundId,
    notificationPrefsJson: p.notificationPrefs,
    timezone: p.timezone,
    wipLimit: p.wipLimit,
    aiModeDefault: p.aiModeDefault.toUpperCase(),
  };
}

/** Resposta de `GET /api/me/preferences` → preferências do cliente (campos desconhecidos caem no padrão). */
export function fromServer(raw: unknown): UserPreferences {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const theme = ({ AUTO: "auto", CLARO: "claro", ESCURO: "escuro", ALTO_CONTRASTE: "contraste", TERMINAL: "terminal", BLUEPRINT: "escuro" } as Record<string, Theme>)[String(r.theme)];
  return sanitizePreferences({
    ...r,
    theme,
    language: fromServerLanguage(typeof r.language === "string" ? r.language : null) ?? undefined,
    density: typeof r.density === "string" ? r.density.toLowerCase() : undefined,
    deskSkin: typeof r.deskSkin === "string" ? r.deskSkin.toLowerCase().replace("_", "-") : undefined,
    notificationPrefs: r.notificationPrefsJson ?? r.notificationPrefs,
    aiModeDefault: typeof r.aiModeDefault === "string" ? r.aiModeDefault.toLowerCase() : undefined,
  });
}
