/**
 * Conta da própria pessoa (RF2, RF3; D-144, D-145): perfil (`/api/me`), foto de perfil (`/api/me/avatar`, RF3.CA05), verificação em duas etapas (`/api/me/2fa/*`) e exclusão
 * com 30 dias para reativar (`/api/me/deletion`). Os tipos vêm do contrato gerado (`lib/api/schema.d.ts`).
 */
import { api } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";

export type Me = components["schemas"]["UserView"];
export type TwoFactorStatus = components["schemas"]["Status"];
export type TwoFactorSetup = components["schemas"]["Setup"];
export type RecoveryCodes = components["schemas"]["RecoveryCodes"];
export type DeletionReceipt = components["schemas"]["DeletionReceipt"];

/** Campos editáveis por `PATCH /api/me`. A foto NÃO passa por aqui: só por upload (`uploadAvatar`/`removeAvatar`). */
export interface ProfilePatch { fullName?: string; displayName?: string; jobTitle?: string; bio?: string }

export const DELETION_GRACE_DAYS = 30;

/** Foto de perfil (RF3.CA05): o servidor confere o conteúdo, recorta ao centro, reduz e grava JPEG sem EXIF/GPS. */
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
export const AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export const AVATAR_ACCEPT = AVATAR_TYPES.join(",");

export type AvatarFileProblem = "TIPO_NAO_PERMITIDO" | "ARQUIVO_GRANDE_DEMAIS" | "ARQUIVO_VAZIO";

/** Arquivo recusado no navegador, antes de enviar (o servidor continua sendo a fonte da verdade). */
export class AvatarFileError extends Error {
  code: AvatarFileProblem;
  fileName: string;
  size: number;
  constructor(code: AvatarFileProblem, file: Pick<File, "name" | "size">) {
    super(code);
    this.name = "AvatarFileError";
    this.code = code;
    this.fileName = file.name;
    this.size = file.size;
  }
}

/** Confere tipo (pelo `file.type`) e tamanho; `null` quando pode enviar. */
export function checkAvatarFile(file: Pick<File, "type" | "size">): AvatarFileProblem | null {
  if (!(AVATAR_TYPES as readonly string[]).includes(file.type)) return "TIPO_NAO_PERMITIDO";
  if (file.size <= 0) return "ARQUIVO_VAZIO";
  if (file.size > AVATAR_MAX_BYTES) return "ARQUIVO_GRANDE_DEMAIS";
  return null;
}

export const accountApi = {
  me: () => api.get<Me>("/api/me"),
  updateProfile: (body: ProfilePatch) => api.patch<Me>("/api/me", body),
  /** `POST /api/me/avatar` (multipart, campo `file`): devolve o `UserView` com `avatarUrl` = `/api/people/{id}/avatar?v=…`. */
  uploadAvatar: (file: File) => {
    const problem = checkAvatarFile(file);
    if (problem) return Promise.reject(new AvatarFileError(problem, file));
    const form = new FormData();
    form.append("file", file, file.name);
    return api.post<Me>("/api/me/avatar", form);
  },
  /** `DELETE /api/me/avatar`: volta às iniciais. */
  removeAvatar: () => api.delete<Me>("/api/me/avatar"),
  requestDeletion: (body: { currentPassword: string; reason?: string }) => api.post<DeletionReceipt>("/api/me/deletion", body),
  cancelDeletion: () => api.delete<DeletionReceipt>("/api/me/deletion"),
  twoFactor: {
    status: () => api.get<TwoFactorStatus>("/api/me/2fa"),
    setup: (currentPassword: string) => api.post<TwoFactorSetup>("/api/me/2fa/setup", { currentPassword }),
    enable: (code: string) => api.post<RecoveryCodes>("/api/me/2fa/enable", { code }),
    disable: (currentPassword: string, code: string) => api.post<TwoFactorStatus>("/api/me/2fa/disable", { currentPassword, code }),
    regenerate: (currentPassword: string, code: string) => api.post<RecoveryCodes>("/api/me/2fa/recovery-codes", { currentPassword, code }),
  },
};

/** Dias inteiros que faltam para o fim do prazo de reativação (0 no último dia). */
export function daysLeft(scheduledAt: string | null | undefined, now = Date.now()): number | null {
  if (!scheduledAt) return null;
  const ms = Date.parse(scheduledAt) - now;
  return Number.isNaN(ms) ? null : Math.max(0, Math.ceil(ms / 86_400_000));
}

/** Segredo Base32 em grupos de 4 para digitar no aplicativo sem errar. */
export const groupSecret = (secret: string) => secret.replace(/\s/g, "").replace(/(.{4})/g, "$1 ").trim();
