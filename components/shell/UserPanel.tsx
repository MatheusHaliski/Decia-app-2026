"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar, Badge, Button, Glyph, Link, Monogram, Popover, Select, cn } from "@/components/ui";
import { auth } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/useI18n";
import { VIEWER_PROFILES, monogramOf, type ViewerProfile } from "@/lib/viewer/profiles";
import { useViewer } from "@/lib/viewer/ViewerProvider";

/**
 * Central de Perfil (painel do usuário na barra superior): avatar + monograma do departamento, nome, perfil,
 * empresa/departamento, links Meu perfil · Preferências · Sair e, para o lab (D-35), o seletor do perfil de
 * VISUALIZAÇÃO (EMPREGADO · EMPRESA · CHEFE · CURADOR · ADMIN · VISITANTE) — só no front, para testar a visibilidade.
 */
export function ViewerProfileSelect({ className }: { className?: string }) {
  const { t } = useI18n();
  const { profile, setProfile } = useViewer();
  return (
    <Select
      aria-label={t("viewer.switchLabel")}
      value={profile}
      onChange={(e) => setProfile(e.target.value as ViewerProfile)}
      options={VIEWER_PROFILES.map((p) => ({ value: p, label: t(`profile.${p}`) }))}
      className={cn("min-h-[var(--ws-control-sm)] text-[length:var(--ws-text-body-sm)]", className)}
      data-testid="viewer-select"
    />
  );
}

export function UserPanel() {
  const { t } = useI18n();
  const { user, profile } = useViewer();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const name = t(user.nameKey);
  const visitor = profile === "VISITANTE";

  const signOut = async () => {
    setLeaving(true);
    try { await auth.logout(); } catch { /* sem backend ainda: limpa só o estado local */ }
    setLeaving(false);
    setOpen(false);
    router.push("/login");
  };

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      label={t("userPanel.title")}
      width="w-[min(92vw,20rem)]"
      trigger={
        <Button variant="ghost" size="sm" className="gap-2 px-1.5" aria-haspopup="dialog" aria-expanded={open} aria-label={t("userPanel.open", { name })} data-testid="user-panel">
          <Avatar name={name} node={user.departmentNode} monogram={visitor ? "?" : undefined} size={30} />
          <span className="hidden max-w-[9rem] truncate text-[length:var(--ws-text-body-sm)] font-medium md:inline">{visitor ? t("profile.VISITANTE") : `@${user.username}`}</span>
        </Button>
      }
    >
      <div className="grid gap-[var(--ws-space-3)] p-1">
        <div className="flex items-center gap-3">
          <Avatar name={name} node={user.departmentNode} size={44} monogram={visitor ? "?" : undefined} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{name}</p>
            <p className="truncate text-[length:var(--ws-text-caption)] text-ws-text-muted">{visitor ? t("viewer.notLogged") : `@${user.username} · ${t(user.roleKey)}`}</p>
          </div>
          <Badge tone="accent">{t(`profile.${profile}`)}</Badge>
        </div>
        {user.companyNameKey ? (
          <div className="flex items-center gap-2 rounded-[var(--ws-radius-md)] bg-ws-surface-2 p-2 text-[length:var(--ws-text-body-sm)]">
            {user.departmentAcronym ? <Monogram name={user.departmentAcronym} monogram={monogramOf(user)} node={user.departmentNode} size={28} /> : <Glyph name="perfil" size={22} decorative />}
            <span className="min-w-0 flex-1 truncate">
              <Link href={`/companies/${user.companySlug}`} variant="plain" className="font-medium hover:underline" onClick={() => setOpen(false)}>{t(user.companyNameKey)}</Link>
              {user.departmentAcronym ? (
                <>
                  <span className="text-ws-text-muted"> · </span>
                  <Link href={`/departments/${user.departmentSlug}`} variant="plain" className="hover:underline" onClick={() => setOpen(false)}>{user.departmentAcronym}</Link>
                </>
              ) : null}
            </span>
          </div>
        ) : null}
        {!visitor ? (
          <nav aria-label={t("userPanel.title")} className="grid">
            <Link href="/profile" variant="nav" onClick={() => setOpen(false)}><Glyph name="perfil" size={20} decorative />{t("nav.profile")}</Link>
            <Link href="/settings" variant="nav" onClick={() => setOpen(false)}><Glyph name="configuracoes" size={20} decorative />{t("nav.settings")}</Link>
            <Button variant="ghost" className="justify-start rounded-[var(--ws-radius-md)] px-[var(--ws-space-3)] font-normal" icon="sair" busy={leaving} onClick={signOut}>{t("nav.logout")}</Button>
          </nav>
        ) : (
          <div className="flex gap-2">
            <Button variant="primary" size="sm" href="/login" className="flex-1" onClick={() => setOpen(false)}>{t("nav.login")}</Button>
            <Button size="sm" href="/register" className="flex-1" onClick={() => setOpen(false)}>{t("nav.register")}</Button>
          </div>
        )}
        <div className="grid gap-1 border-t border-ws-border pt-2">
          <p className="flex items-center gap-1 text-[length:var(--ws-text-caption)] text-ws-text-muted">
            <Badge tone="spark">{t("common.lab")}</Badge>
            {t("viewer.switchHint")}
          </p>
          <ViewerProfileSelect />
        </div>
      </div>
    </Popover>
  );
}
