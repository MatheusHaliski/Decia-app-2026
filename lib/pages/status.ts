/**
 * Estado de cada rota do registro (lib/pages/registry.ts) para o modo produto (auditoria "Informação e guia da interface"):
 *
 * - `live`     — funciona com a API real quando há sessão (no laboratório usa os exemplos).
 * - `demo`     — funciona, mas os dados vivem num repositório DEMO em memória: ficam só nesta aba e somem ao recarregar. O AppShell
 *                mostra a faixa de modo demonstração.
 * - `preview`  — a área já está desenhada (sub-abas descritas), mas nada funciona ainda.
 * - `skeleton` — só a casca (título, sub-abas, CAs no laboratório); o conteúdo chega com o RF.
 *
 * Fora do laboratório, `preview` e `skeleton` aparecem no menu com o selo "Em breve" e a página mostra um vazio orientado
 * (`SOON_GUIDE`). **Ao implementar uma rota, troque o status aqui** — senão o conteúdo novo fica escondido atrás do "Em breve" para
 * quem usa o produto. Rota nova sem linha aqui faz `lib/pages/status.test.ts` falhar (o padrão em tempo de execução é `live`, para
 * nunca esconder conteúdo por engano).
 */
import type { ViewerUser } from "@/lib/viewer/profiles";

export const PAGE_STATUSES = ["live", "demo", "preview", "skeleton"] as const;
export type PageStatus = (typeof PAGE_STATUSES)[number];

/** Classificação das rotas pelo código de 27/11/2026 (o que a página monta e de onde vêm os dados). */
export const ROUTE_STATUS: Readonly<Record<string, PageStatus>> = {
  // Descobrir
  "/mural": "demo", // rede social em memória (lib/social/repository.ts)
  "/search": "live", // Pessoas pela API; as demais sub-abas ainda vazias
  "/memory": "demo", // índice local do corpus de exemplo
  "/companies": "skeleton",
  "/companies/[slug]": "live", // CompanyPageReal com sessão
  "/departments/[slug]": "live", // DepartmentPageReal com sessão
  "/models": "demo", // Balcão de Modelos em memória
  "/messages": "live", // API de mensagens com sessão (RF46)
  "/messages/[conversationId]": "live",
  "/find": "preview", // AreaPreview das ferramentas do RF47
  // Meu trabalho
  "/today": "live", // Tarefa do Dia pela API + primeiros passos nas preferências
  "/profile": "live", // OwnProfile com sessão
  "/u/[username]": "live", // PublicProfile com sessão
  "/tasks": "live", // Acervo (GET /api/tasks)
  "/tasks/[id]": "live",
  "/tasks/[id]/edit": "live",
  "/tasks/extrair": "live", // extração local sobre anexos da API
  "/tasks/[id]/extrair": "live",
  "/attachments": "live",
  "/desk": "demo", // Mesa: projetos DEMO (lib/projects/repository.ts)
  "/projects/[id]": "demo",
  "/projects/[id]/edit": "demo",
  "/projects/[id]/simulate": "demo",
  "/projects/[id]/mirror": "demo",
  "/agents": "preview", // AreaPreview do dossiê (RF48)
  // Criar
  "/tasks/new": "live", // POST /api/tasks
  "/projects/new": "demo",
  "/plans": "skeleton",
  "/autopilot": "demo",
  "/decia": "demo", // repositório DEMO do DECIA
  "/decia/decisoes/[decisionId]": "demo",
  "/decia/[sessionId]": "demo",
  "/insights": "skeleton",
  "/letters": "demo",
  "/letters/[pieceId]": "demo",
  "/drawings": "demo",
  // Jogar e ganhar
  "/goals": "demo", // pactos em memória
  "/points": "demo", // razão de DECIA Points em memória
  "/store": "demo",
  "/highlights": "skeleton",
  "/benefits": "demo",
  "/recognitions": "skeleton",
  // Gestão
  "/issuer/dashboard": "skeleton",
  "/companies/[slug]/manage/departments": "skeleton",
  "/departments/[slug]/team": "skeleton",
  "/seals/review": "demo",
  "/decia/review": "demo",
  "/seals": "demo",
  "/handoffs": "demo",
  "/curation": "skeleton",
  "/admin": "demo", // só a aba "IA do sistema" (política DEMO); as demais ainda vazias
  // Globais
  "/settings": "live",
  "/notifications": "live",
  // Auth e textos legais
  "/login": "live",
  "/register": "live",
  "/password-reset": "live",
  "/verify-email": "live",
  "/termos": "live",
  "/privacidade": "live",
  // Laboratório (páginas de referência estáticas)
  "/lab/design-system": "live",
  "/lab/anatomias": "live",
  "/lab/perfis": "live",
  "/lab/decia": "live",
};

export const statusOfRoute = (route: string): PageStatus => ROUTE_STATUS[route] ?? "live";
export const hasExplicitStatus = (route: string) => Object.prototype.hasOwnProperty.call(ROUTE_STATUS, route);
/** Rota ainda sem conteúdo funcional (selo "Em breve" fora do laboratório). */
export const isComingSoon = (status: PageStatus) => status === "skeleton" || status === "preview";

/**
 * Vazio orientado das rotas "Em breve" (fora do laboratório): o que vem (`guide.soon.<id>.what`), o que fazer enquanto isso
 * (`guide.soon.<id>.meanwhile`) e um link útil (`guide.soon.<id>.cta` → `href`). Rota sem linha aqui usa `guide.soon.generic.*`.
 */
export interface SoonGuide { id: string; href: string | ((user: ViewerUser) => string) }
const companyOf = (u: ViewerUser) => `/companies/${u.companySlug ?? "secretaria-exemplo"}`;

export const SOON_GUIDE: Readonly<Record<string, SoonGuide>> = {
  "/companies": { id: "companies", href: companyOf },
  "/plans": { id: "plans", href: "/tasks" },
  "/insights": { id: "insights", href: "/points" },
  "/highlights": { id: "highlights", href: "/mural" },
  "/recognitions": { id: "recognitions", href: "/profile?tab=reconhecimentos" },
  "/issuer/dashboard": { id: "issuerDashboard", href: "/seals/review" },
  "/companies/[slug]/manage/departments": { id: "manageDepartments", href: companyOf },
  "/departments/[slug]/team": { id: "team", href: "/desk?tab=equipe" },
  "/curation": { id: "curation", href: "/seals/review" },
  "/find": { id: "find", href: "/search" },
  "/agents": { id: "agents", href: "/tasks" },
};
export const GENERIC_SOON: SoonGuide = { id: "generic", href: "/today" };
export const soonGuideOf = (route: string): SoonGuide => SOON_GUIDE[route] ?? GENERIC_SOON;
