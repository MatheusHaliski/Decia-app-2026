import { LoginForm } from "@/components/auth/AuthForms";

// RF2 — Autenticar usuário (BFF /bff/auth/login; cookie ws_rt HttpOnly; access token em memória).
export default function LoginPage() {
  return <LoginForm />;
}
