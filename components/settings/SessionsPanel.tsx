"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Card, Dialog, EmptyState, ErrorState, Glyph, LoadingState, useToast } from "@/components/ui";
import { ApiError, auth, describeError, sessions, type SessionInfo } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/useI18n";

/**
 * Configurações › Sessões (RF2.CA05, Bloco 4, D-62): dispositivos com sessão viva (a atual marcada), encerrar um, encerrar todos os
 * outros. Encerrar = revogar a família do refresh token na API (`DELETE /api/auth/sessions/{id}`): aquele navegador não renova mais
 * e o access token dele cai no próximo pedido. "Sair deste dispositivo" usa o logout do BFF (apaga os cookies e avisa as outras abas).
 */
type Load = { kind: "loading" } | { kind: "error"; error: unknown } | { kind: "ready"; items: SessionInfo[] };
type Confirm = { kind: "one"; session: SessionInfo } | { kind: "others"; count: number } | null;

export function SessionsPanel() {
  const { t, intl } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const [state, setState] = useState<Load>({ kind: "loading" });
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try { setState({ kind: "ready", items: await sessions.list() }); } catch (error) { setState({ kind: "error", error }); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const when = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "—" : new Intl.DateTimeFormat(intl, { dateStyle: "medium", timeStyle: "short" }).format(d);
  };

  const run = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      if (confirm.kind === "one") {
        await sessions.revoke(confirm.session.id);
        toast({ title: t("sessions.revoked"), description: confirm.session.deviceName ?? t("sessions.unknownDevice"), tone: "sucesso" });
      } else {
        const r = await sessions.revokeOthers();
        toast({ title: t("sessions.othersRevoked", { count: r?.sessionsEnded ?? confirm.count }), tone: "sucesso" });
      }
      setConfirm(null);
      await load();
    } catch (error) {
      toast({ title: t("error.title"), description: describeError(error), tone: "erro" });
    } finally {
      setBusy(false);
    }
  };

  const signOutHere = async () => {
    setBusy(true);
    try { await auth.logout(); } catch { /* o BFF apaga os cookies mesmo com a API fora do ar */ }
    setBusy(false);
    router.push("/login?reason=signed-out");
  };

  if (state.kind === "loading") return <LoadingState label={t("sessions.loading")} />;
  if (state.kind === "error") {
    const e = state.error instanceof ApiError ? state.error : null;
    return (
      <ErrorState
        title={e?.status === 0 || e?.status === 502 || e?.status === 503 ? t("auth.offlineTitle") : t("error.title")}
        description={describeError(state.error)}
        code={e ? `${e.status || "—"} ${e.code}` : undefined}
        correlationId={e?.correlationId}
        onRetry={() => void load()}
      />
    );
  }

  const others = state.items.filter((s) => !s.current);
  return (
    <div className="grid gap-[var(--ws-space-4)]" data-testid="sessions-panel">
      <Card
        title={t("sessions.title")}
        eyebrow="RF2.CA05"
        actions={
          <Button variant="danger" size="sm" disabled={others.length === 0} onClick={() => setConfirm({ kind: "others", count: others.length })} data-testid="sessions-revoke-others">
            {t("sessions.revokeOthers")}
          </Button>
        }
      >
        <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("sessions.intro")}</p>
      </Card>
      {state.items.length === 0 ? (
        <EmptyState moji="vazio" title={t("sessions.empty")} compact />
      ) : (
        <ul className="grid gap-[var(--ws-space-3)]" aria-label={t("sessions.title")}>
          {state.items.map((s) => (
            <Card as="li" key={s.id} padding="md" data-testid="session-item" data-current={s.current ? "true" : "false"}>
              <div className="flex flex-wrap items-center gap-[var(--ws-space-3)]">
                <Glyph name="perfil" size={28} decorative />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-semibold">
                    <span className="truncate">{s.deviceName || t("sessions.unknownDevice")}</span>
                    {s.current ? <Badge tone="success">{t("sessions.current")}</Badge> : null}
                    {s.persistent ? <Badge tone="neutral">{t("sessions.remembered")}</Badge> : null}
                  </p>
                  <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">
                    {t("sessions.lastActive", { when: when(s.lastActiveAt) })} · {t("sessions.expires", { when: when(s.expiresAt) })}
                  </p>
                </div>
                {s.current ? (
                  <Button variant="ghost" size="sm" busy={busy} onClick={() => void signOutHere()} data-testid="session-signout-here">{t("sessions.signOutHere")}</Button>
                ) : (
                  <Button variant="secondary" size="sm" onClick={() => setConfirm({ kind: "one", session: s })} data-testid="session-revoke">{t("sessions.revoke")}</Button>
                )}
              </div>
            </Card>
          ))}
        </ul>
      )}
      <Dialog
        open={confirm !== null}
        onOpenChange={(o) => { if (!o && !busy) setConfirm(null); }}
        title={confirm?.kind === "others" ? t("sessions.confirmOthersTitle") : t("sessions.confirmTitle")}
        description={confirm?.kind === "one" ? t("sessions.confirmBody", { device: confirm.session.deviceName ?? t("sessions.unknownDevice") }) : confirm ? t("sessions.confirmOthersBody", { count: confirm.count }) : undefined}
      >
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirm(null)} disabled={busy}>{t("sessions.cancel")}</Button>
          <Button variant="danger" busy={busy} onClick={() => void run()} data-testid="session-confirm">{confirm?.kind === "others" ? t("sessions.revokeOthers") : t("sessions.revoke")}</Button>
        </div>
      </Dialog>
    </div>
  );
}
