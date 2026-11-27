/**
 * Ajuda contextual "?" do PageHeader (auditoria "Informação e guia da interface", plano "Ajuda ? por tela"): para as rotas
 * principais, um parágrafo em linguagem de usuário (`guide.help.<id>.text`) e o próximo passo sugerido (`guide.help.<id>.next` →
 * `next`). Rota sem linha aqui não mostra o "?".
 */
export interface HelpEntry { id: string; next: string }

export const HELP: Readonly<Record<string, HelpEntry>> = {
  "/today": { id: "today", next: "/tasks/new" },
  "/tasks": { id: "tasks", next: "/tasks/new" },
  "/tasks/new": { id: "tasksNew", next: "/tasks" },
  "/decia": { id: "decia", next: "/decia?acao=nova" },
  "/desk": { id: "desk", next: "/projects/new" },
  "/profile": { id: "profile", next: "/settings?tab=trabalho" },
  "/settings": { id: "settings", next: "/profile" },
  "/mural": { id: "mural", next: "/search" },
  "/models": { id: "models", next: "/tasks/new" },
};

export const helpOf = (route: string | undefined): HelpEntry | undefined => (route ? HELP[route] : undefined);
