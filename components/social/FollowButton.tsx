"use client";
/**
 * Seguir pessoa, departamento ou empresa (RF14.CA04, RF15.CA05, RF16.CA01): `Follow` único e reativável (ATIVO ⇄
 * REMOVIDO). `aria-pressed` + texto "Seguir"/"Seguindo"; visitante vê o motivo ("entre para seguir").
 */
import { Button, useToast } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import { followersCount, isFollowing, personById, toggleFollow } from "@/lib/social/rules";
import type { FollowTargetType } from "@/lib/social/types";
import { useSocial } from "./context";

export function FollowButton({ targetType, targetId, name }: { targetType: FollowTargetType; targetId: string; name: string }) {
  const { t } = useI18n();
  const { state, viewerId, run, reason } = useSocial();
  const { toast } = useToast();
  const following = isFollowing(state, viewerId, targetType, targetId);
  const self = targetType === "USER" && viewerId === targetId;
  if (self) return null;
  const anonymous = !viewerId || !personById(state, viewerId);
  const label = following ? t("social.follow.following") : t("social.follow.follow");
  const count = followersCount(state, targetType, targetId);
  return (
    <Button
      size="sm"
      variant={following ? "default" : "primary"}
      aria-pressed={following}
      aria-disabled={anonymous || undefined}
      title={anonymous ? reason("NAO_AUTENTICADO") : t(following ? "social.follow.unfollowHint" : "social.follow.followHint", { name })}
      data-testid="follow-button"
      onClick={() => {
        if (anonymous) { toast({ title: reason("NAO_AUTENTICADO"), tone: "aviso" }); return; }
        run((s, v, now) => toggleFollow(s, v, targetType, targetId, now), following ? "social.toast.unfollowed" : "social.toast.followed", { name });
      }}
    >
      <span aria-hidden>{following ? "✓" : "+"}</span>
      {label}
      <span className="sr-only">{` ${name} — ${t("social.follow.followers", { n: count })}`}</span>
    </Button>
  );
}
