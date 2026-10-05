import { Button } from "@/components/ui/Button";
import { tr } from "@/lib/i18n/core";

/**
 * Página inicial provisória do Bloco 1: prova o pipeline (tokens → componente do design system → i18n → CSP).
 * As telas reais nascem na etapa (b) com o design system completo (RF38) e o shell do app.
 */
const API = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080").replace(/\/+$/, "");

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-start justify-center gap-[var(--space-5)] px-[var(--space-5)]">
      <p className="font-[var(--font-data)] text-[length:var(--text-label)] uppercase tracking-[var(--text-label--tracking)] text-[var(--muted)]">
        {tr("home.eyebrow")}
      </p>
      <h1 className="font-[var(--font-editorial)] text-[length:var(--text-display)] font-semibold leading-[var(--text-display--lh)] text-[var(--ink)]">
        {tr("home.title")}
      </h1>
      <p className="max-w-prose text-[length:var(--text-body-lg)] text-[var(--muted)]">{tr("home.subtitle")}</p>
      <div className="flex flex-wrap gap-[var(--space-3)]">
        <Button variant="primary" href={`${API}/actuator/health`}>
          {tr("home.cta.health")}
        </Button>
        <Button variant="ghost" href="https://github.com/MatheusHaliski/Decia-app-2026/tree/main/docs">
          {tr("home.cta.docs")}
        </Button>
      </div>
    </main>
  );
}
