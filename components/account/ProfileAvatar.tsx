"use client";
/**
 * Foto de pessoa (RF3.CA05): o `Avatar` do design system com a imagem resolvida por `useApiImage` — `/api/people/{id}/avatar?v=…`
 * é baixada com o token e cacheada; `https://` antiga passa direto; carregando, sem foto ou em erro, mostra as iniciais.
 */
import { Avatar, type AvatarProps } from "@/components/ui";
import { useApiImage } from "@/lib/api/useApiImage";

export function ProfileAvatar({ src, ...props }: AvatarProps) {
  const image = useApiImage(src);
  return <Avatar {...props} src={image.src} />;
}
