"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { onUnauthorized, restoreSession } from "@/lib/api/client";
import { requiresSession } from "@/lib/auth/guard";
import { loginUrl } from "@/lib/auth/next";

/**
 * Sessão no shell (Bloco 4, D-61): ao abrir, restaura a sessão pelo cookie HttpOnly (e agenda a renovação silenciosa); quando a
 * sessão acaba — logout em outra aba, sessão encerrada em Configurações › Sessões, refresh recusado — leva para
 * `/login?next=<aqui>&reason=signed-out` se a rota exige sessão, ou só recarrega os dados se a rota é pública.
 */
export function SessionWatcher() {
  const router = useRouter();
  useEffect(() => {
    const off = onUnauthorized(() => {
      const { pathname, search } = window.location;
      if (requiresSession(pathname)) router.replace(loginUrl(`${pathname}${search}`, "signed-out"));
      else router.refresh();
    });
    void restoreSession();
    return () => { off(); };
  }, [router]);
  return null;
}
