/** Junta classes ignorando falsy (sem dependência externa). */
export const cn = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");
