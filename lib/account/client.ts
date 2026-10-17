/**
 * Conta da própria pessoa (RF2, RF3; D-144, D-145): perfil (`/api/me`), verificação em duas etapas (`/api/me/2fa/*`) e exclusão
 * com 30 dias para reativar (`/api/me/deletion`). Os tipos vêm do contrato gerado (`lib/api/schema.d.ts`).
 */
import { api } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";

export type Me = components["schemas"]["UserView"];
export type TwoFactorStatus = components["schemas"]["Status"];
export type TwoFactorSetup = components["schemas"]["Setup"];
export type RecoveryCodes = components["schemas"]["RecoveryCodes"];
export type DeletionReceipt = components["schemas"]["DeletionReceipt"];

export interface ProfilePatch { fullName?: string; displayName?: string; jobTitle?: string; bio?: string }

export const DELETION_GRACE_DAYS = 30;

export const accountApi = {
  me: () => api.get<Me>("/api/me"),
  updateProfile: (body: ProfilePatch) => api.patch<Me>("/api/me", body),
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
