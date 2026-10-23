"use client";
/**
 * Conta logada no front (P19, RF2/RF3): restaura a sessão pelo cookie HttpOnly e lê `/api/me`. Sem sessão — aba anônima, navegador
 * novo, depois do logout — o estado é `anonymous` e a barra mostra VISITANTE com "Entrar". Entrar ou sair em qualquer aba troca o
 * estado na hora (`onSessionChange`, canal entre abas do Bloco 4).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { hasSession, onSessionChange, restoreSession } from "@/lib/api/client";
import { accountApi, type Me } from "@/lib/account/client";

export type SessionStatus = "loading" | "anonymous" | "authenticated";

interface CurrentUserValue {
  status: SessionStatus;
  me: Me | null;
  /** Relê `/api/me` (depois de editar o perfil, ligar o 2FA, pedir ou cancelar a exclusão). */
  reload: () => Promise<void>;
}

const Ctx = createContext<CurrentUserValue | null>(null);

export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>("loading");
  const [me, setMe] = useState<Me | null>(null);

  const load = useCallback(async () => {
    try {
      const u = await accountApi.me();
      setMe(u);
      setStatus("authenticated");
    } catch {
      setMe(null);
      setStatus("anonymous");
    }
  }, []);

  useEffect(() => {
    let alive = true;
    const off = onSessionChange((signedIn) => {
      if (!alive) return;
      if (signedIn) void load();
      else { setMe(null); setStatus("anonymous"); }
    });
    (async () => {
      if (!hasSession() || !(await restoreSession())) {
        if (alive) setStatus("anonymous");
        return;
      }
      if (alive) await load();
    })();
    return () => { alive = false; off(); };
  }, [load]);

  const value = useMemo(() => ({ status, me, reload: load }), [status, me, load]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** `null` fora do provider (testes e o laboratório isolado). */
export function useOptionalCurrentUser(): CurrentUserValue | null {
  return useContext(Ctx);
}

export function useCurrentUser(): CurrentUserValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCurrentUser fora do CurrentUserProvider");
  return ctx;
}
