"use client";
/**
 * Escopo da rede social: qual repositório (DEMO em memória por padrão), quem está olhando (perfil de visualização do
 * lab → pessoa DEMO, lib/social/fixtures VIEWER_DEMO_USER) e o "agora". Testes e o lab passam um repositório próprio.
 * `run` aplica um comando puro de lib/social/rules.ts e mostra o erro (mesmo código da API) num toast traduzido.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useToast } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import { VIEWER_DEMO_USER } from "@/lib/social/fixtures";
import { demoSocialRepository, useSocialState, type SocialRepository } from "@/lib/social/repository";
import type { Permission, Result, SocialErrorCode } from "@/lib/social/rules";
import type { SocialState, ViewerId } from "@/lib/social/types";
import { useViewer } from "@/lib/viewer/ViewerProvider";

interface ScopeValue { repo: SocialRepository; viewerId?: ViewerId; now?: Date }
const Ctx = createContext<ScopeValue | null>(null);

export function SocialScope({ repo, viewerId, now, children }: ScopeValue & { children: ReactNode }) {
  const value = useMemo(() => ({ repo, viewerId, now }), [repo, viewerId, now]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export interface SocialApi {
  state: SocialState;
  viewerId: ViewerId;
  now: Date;
  repo: SocialRepository;
  /** aplica o comando; em erro mostra o motivo; devolve o resultado */
  run: <T extends object>(command: (s: SocialState, viewer: ViewerId, now: Date) => Result<T>, successKey?: string, vars?: Record<string, string | number>) => Result<T>;
  /** texto do motivo de uma permissão negada (ou "") */
  reason: (p: Permission | SocialErrorCode) => string;
}

export function useSocial(): SocialApi {
  const scope = useContext(Ctx);
  const repo = scope?.repo ?? demoSocialRepository();
  const state = useSocialState(repo);
  const { profile } = useViewer();
  const { t } = useI18n();
  const { toast } = useToast();
  const [clock, setClock] = useState(() => new Date());
  useEffect(() => {
    if (scope?.now) return;
    const id = window.setInterval(() => setClock(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, [scope?.now]);
  const viewerId = scope && scope.viewerId !== undefined ? scope.viewerId : VIEWER_DEMO_USER[profile];
  const now = scope?.now ?? clock;
  const reason = useCallback((p: Permission | SocialErrorCode) => {
    if (typeof p === "string") return t(`social.error.${p}`);
    return p.ok ? "" : t(`social.error.${p.reason}`);
  }, [t]);
  const run = useCallback<SocialApi["run"]>((command, successKey, vars) => {
    const at = scope?.now ?? new Date();
    const r = repo.run((s) => command(s, viewerId, at));
    if (!r.ok) toast({ title: t(`social.error.${r.error}`), tone: "erro" });
    else if (successKey) toast({ title: t(successKey, vars), tone: "sucesso" });
    return r;
  }, [repo, viewerId, scope?.now, toast, t]);
  return { state, viewerId, now, repo, run, reason };
}

/** O conteúdo DEMO é montado só no cliente (datas relativas ao agora): evita divergência de hidratação. */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
