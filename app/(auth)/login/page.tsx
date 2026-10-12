import { LoginForm } from "@/components/auth/AuthForms";
import { oidcConfig } from "@/app/bff/auth/oidc/oidc";

// RF2 — Autenticar usuário (BFF /bff/auth/login; cookie ws_rt HttpOnly; access token em memória). `?next=` vem do middleware
// (rota protegida, D-60) e é saneado no formulário; `?reason=` explica por que a pessoa caiu aqui (logout em outra aba, OIDC).
export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = await searchParams;
  const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : null);
  return <LoginForm next={one(q.next)} reason={one(q.reason)} oidcEnabled={oidcConfig() !== null} />;
}
