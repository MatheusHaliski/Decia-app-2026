/**
 * Especialidades e controle de publicação do perfil público (RF3; auditoria Onda 1, 31/10/2026): `GET/PUT /api/me/publication`. O
 * servidor normaliza (espaços, sem repetir ignorando caixa e acento), aceita até 10 rótulos de 2 a 40 caracteres e aplica "quem vê meu
 * perfil" em perfil, foto, tarefas e seguir (quem não pode ver recebe o mesmo 404 de uma conta inexistente).
 */
import { api } from "@/lib/api/client";

// Espelha o DTO PublicationService.PublicationView; trocar pelo tipo gerado (lib/api/schema.d.ts) quando o contrato for regenerado.
export type ProfileVisibility = "AUTENTICADOS" | "EMPRESA";
export interface PublicationView { specialties: string[]; profileVisibility: ProfileVisibility }
export interface PublicationUpdate { specialties?: string[]; profileVisibility?: ProfileVisibility }

export const SPECIALTIES_MAX = 10;
export const SPECIALTY_MIN_LENGTH = 2;
export const SPECIALTY_MAX_LENGTH = 40;
export const PROFILE_VISIBILITIES: readonly ProfileVisibility[] = ["AUTENTICADOS", "EMPRESA"];

const key = (label: string) => label.normalize("NFD").replace(/\p{M}+/gu, "").toLowerCase();

/** Mesma limpeza do servidor (para a prévia): espaços colapsados, vazios e repetidos (sem caixa nem acento) fora. */
export function cleanSpecialty(raw: string): string {
  return raw.normalize("NFC").replace(/\s+/g, " ").trim();
}

/** Acrescenta um rótulo se ainda não existir (mesma chave do servidor); devolve a lista nova e se mudou. */
export function addSpecialty(list: readonly string[], raw: string): { list: string[]; added: boolean } {
  const v = cleanSpecialty(raw);
  if (!v || list.some((x) => key(x) === key(v))) return { list: [...list], added: false };
  return { list: [...list, v], added: true };
}

export const publicationApi = {
  get: (signal?: AbortSignal) => api.get<PublicationView>("/api/me/publication", { signal }),
  update: (body: PublicationUpdate) => api.put<PublicationView>("/api/me/publication", body),
};
