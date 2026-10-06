"use client";
import { Avatar, Badge, Card, Monogram } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import { monogramOf } from "@/lib/viewer/profiles";
import { useViewer } from "@/lib/viewer/ViewerProvider";

/** Cabeçalho do perfil (Matriz B linha "Cabeçalho"): avatar, nome, cargo, empresa, departamento (monograma), contadores. */
export function ProfileHeader({ third = false, username }: { third?: boolean; username?: string }) {
  const { t } = useI18n();
  const { user, profile } = useViewer();
  const name = third && username ? username : t(user.nameKey);
  return (
    <Card tone="clay" className="flex flex-wrap items-center gap-[var(--ws-space-4)]">
      <Avatar name={name} node={third ? "green" : user.departmentNode} size={64} />
      <div className="min-w-0 flex-1">
        <p className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h2)] font-semibold">{name}</p>
        <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">@{third && username ? username : user.username || "—"} · {third ? t("viewer.role.empregado") : t(user.roleKey)}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {!third && user.departmentAcronym ? <Monogram name={user.departmentAcronym} monogram={monogramOf(user)} node={user.departmentNode} size={24} /> : null}
          {!third && user.companyNameKey ? <span className="text-[length:var(--ws-text-caption)]">{t(user.companyNameKey)}{user.departmentAcronym ? ` · ${user.departmentAcronym}` : ""}</span> : null}
          {!third && profile === "CURADOR" ? <Badge tone="orange">{t("profile.curatorTag", { dept: user.departmentAcronym ?? "" })}</Badge> : null}
          {third ? <Badge tone="info">{t("profile.thirdPartyView")}</Badge> : null}
        </div>
      </div>
      <dl className="grid grid-cols-3 gap-3 text-center sm:grid-cols-5">
        {(["tasks", "projects", "decisions", "followers", "points"] as const).map((k) => (
          <div key={k}>
            <dt className="text-[length:var(--ws-text-label)] uppercase tracking-[var(--ws-text-label--tracking)] text-ws-text-muted">{t(`profile.counter.${k}`)}</dt>
            <dd className="font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-h3)] font-semibold">{(k === "points" && (user.points === null || third)) ? "—" : "0"}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
