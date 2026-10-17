#!/usr/bin/env python3
"""Gera MATRIZ_RF.{md,json,csv} e RESUMO_MODULOS.md da auditoria de 17/10/2026.

Notas técnicas provisórias, reavaliadas contra o repositório (base e8ba2a8 → branch da auditoria). Rubrica do projeto
(não é escala oficial de Nielsen/WCAG/Amershi): funcionalidade 30 %, eficiência 20 %, visual 15 %, recuperação 15 %,
acessibilidade 10 %, feedback 10 %. "n/v" = dimensão não verificada nesta rodada: fica fora da média ponderada (os pesos
restantes são renormalizados) e a nota é marcada como parcial. Zero só quando a jornada está comprovadamente ausente.
Uso: python3 docs/auditoria/2026-10-17/scripts/gerar-matriz.py
"""
import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PREV = ROOT.parent / "2026-10-16" / "auditoria-global-work-station" / "MATRIZ_RF.json"
W = {"funcionalidade": .30, "eficiencia": .20, "visual": .15, "recuperacao": .15, "acessibilidade": .10, "feedback": .10}
DIMS = list(W)
NV = None

# Perfis de subnota (F, E, V, R, A, Fb). Ajustes por RF ficam na tabela abaixo.
AUSENTE = (0, 0, 0, 0, 0, 0)          # rota-esqueleto (RfPage) ou nada: a jornada não existe
LOGICA = (1, 0, 0, 0, 0, 0)           # só biblioteca pura testada, sem interface nem API
DEMO = (3, 6, 7, 2, 6, 5)             # fluxo navegável com dados DEMO em memória (some no reload)

# rf: (estado_antes, sub_antes, estado_depois, sub_depois, tela, componentes/API, principal erro, melhoria, evidência, prioridade)
R = {}
def rf(n, ea, sa, ed, sd, tela, comp, erro, melhoria, ev, prio):
    R[n] = dict(ea=ea, sa=sa, ed=ed, sd=sd, tela=tela, comp=comp, erro=erro, melhoria=melhoria, ev=ev, prio=prio)

E, L, D = "AUSENTE", "LÓGICA SEM INTERFACE", "DEMO EM MEMÓRIA"
API = "API REAL PARCIAL"
rf(1, API, (6, 7, 7, 6, NV, 6), API, (6, 7, 7, 6, NV, 6), "/register → /verify-email", "AuthForms.tsx · RegistrationController (POST /api/auth/register, confirm, resend)",
   "Entrega de e-mail não verificada; em dev o log mascara o código apesar do comentário 'echo-body' (logback).", "Teste com SMTP controlado (Mailpit) e corrigir a máscara só em dev.", "Cadastro real via API nesta rodada; LoggingMailAdapter.java:22", "P1")
rf(2, API, (1, 5, 7, 2, NV, 4), API, (6, 7, 7, 5, NV, 6), "/login · /settings?tab=sessoes", "AuthForms.tsx · AuthController · WsSecurityProperties · lib/api/client.ts",
   "Chaves JWT nunca ligadas (record com 2 construtores): login 503 em todo ambiente; navegar durante a renovação revoga a família (REFRESH_REUSO).",
   "Corrigido o binding e a renovação antes da 1ª chamada; falta janela de tolerância ao reuso no servidor (decisão de segurança).", "b47945c, 772257d; WsSecurityPropertiesBindingTest; client.restore.test.ts; log REFRESH_REUSO", "P0")
rf(3, API, (7, 7, 7, 7, NV, 7), API, (7, 7, 7, 7, NV, 7), "/settings", "settings/page.tsx · GET/PUT /api/me/preferences", "Foto, biografia e especialidades sem UI.", "Expor PATCH /api/me (bio, avatar) no perfil.", "lib/preferences; MeController", "P2")
rf(4, E, AUSENTE, API, (7, 7, 7, 8, NV, 8), "/tasks/new", "TaskForm.tsx · TaskController POST /api/tasks · TaskService · V36 task_briefs",
   "Antes: página-esqueleto, sem formulário nem API. Agora: falta anexo, dependência estruturada, escolha de outro responsável (sem busca de pessoas) e criação com IA.",
   "Anexos (MediaUploadService), dependências, busca de pessoas, modo IA conforme autonomia.", "Jornada: 6 áreas criadas pela UI (evidencias/JORNADA.json); TaskServiceTest; TaskPersistenceIT", "P0")
rf(5, E, AUSENTE, E, AUSENTE, "/projects/new", "RfPage (esqueleto); ProjectScheme/V12 sem serviço", "Criador de projetos inexistente: só tabelas.", "Agregado Projeto com API (fases, tarefas, dependências).", "app/(shell)/projects/new/page.tsx", "P1")
rf(6, D, (2, 6, 7, 2, 6, 5), D, (2, 6, 7, 2, 6, 6), "/profile", "ProfileView.tsx · lib/social (DEMO)", "Conta real logada vê 'Pessoa Exemplo' e acervo de demonstração; contadores fictícios.",
   "Perfil a partir de /api/me + /api/tasks; seguidores reais. (Seguindo e Decisões ocultas corrigidos.)", "evidencias/18-perfil-contadores-desktop.png; b602d34", "P1")
rf(7, D, (1, 4, 6, 1, 6, 4), D, (1, 4, 6, 1, 6, 4), "/projects/[id] ← card de projeto", "ProjectCard.tsx · view-model.ts", "Card leva a /projects/[id] esqueleto; mosaico expunha títulos de tarefas ocultas (corrigido).",
   "Página de projeto real com lista de tarefas autorizadas.", "b602d34; view-model.test.ts", "P1")
rf(8, E, AUSENTE, E, AUSENTE, "/tasks/[id]/edit (peças)", "Sem editor de peças no app", "Editar arquivos (peças Letters/Drawings) não existe.", "Integrar peças versionadas à tarefa (RF71).", "Sem rota /studio", "P1")
rf(9, E, AUSENTE, E, AUSENTE, "/companies/[slug]/manage/departments", "RfPage; department_memberships sem API", "Chefe não consegue adicionar/remover pessoas.", "API de lotação com aprovação.", "registry.ts", "P2")
rf(10, D, DEMO, D, DEMO, "/tasks/[id] → Delegar", "DelegateDialog.tsx · rules.ts (DEMO)", "Delegação só em memória.", "Assignments (V20) com API.", "social.test.tsx", "P2")
rf(11, API, (4, 6, 7, 6, NV, 6), API, (4, 6, 7, 6, NV, 6), "/settings?tab=aparencia", "BackgroundArt · prefs", "Arte de fundo do shell, não do esquema de tarefa/projeto.", "Arte por esquema (cardSkin) na edição da tarefa.", "settings/page.tsx", "P3")
rf(12, E, AUSENTE, API, (7, 7, 7, 8, NV, 8), "/tasks/[id]/edit", "TaskForm.tsx · PUT /api/tasks/{id} (versão) · 409 EDICAO_CONCORRENTE",
   "Antes: esqueleto. Agora: doc pede PATCH/If-Match e a API usa PUT com versão no corpo (divergência).", "Reconciliar contrato no RF12.", "Jornada: editar e conflito entre abas; TaskControllerWebTest", "P1")
rf(13, E, AUSENTE, E, AUSENTE, "esquemas/chats", "Botão 'Sugerir com IA' mostra 'indisponível'", "Gerar artefato não existe (sem motor de IA registrado).", "Depende de AiGateway com motor e RF51.", "decia.test.tsx (ai-unavailable)", "P2")
for n, tela in [(14, "/departments/[slug]"), (15, "/companies/[slug]")]:
    rf(n, D, DEMO, D, DEMO, tela, "InstitutionalHeader · lib/social (DEMO)", "Dados de exemplo; sem API.", "API social/institucional.", "capturas 42/43 (docs/testes/shell)", "P2")
rf(16, D, (2, 6, 7, 2, 6, 5), D, (3, 6, 7, 2, 6, 5), "/u/[username]", "ProfileView · rules.canView", "SIGILOSO legível por todo o departamento (divergia do backend AccessPolicy).", "Corrigido; falta API real.", "b602d34; rules.test.ts", "P0")
rf(17, D, (2, 6, 7, 2, 6, 5), D, (3, 6, 7, 2, 6, 5), "/search · /mural", "rules · view-model", "Composição de projeto vazava títulos/contagem de tarefas ocultas.", "Corrigido no modelo; falta API.", "b602d34", "P0")
rf(18, D, DEMO, D, DEMO, "/mural · cards", "SocialBar · rules (DEMO)", "Curtir/comentar/salvar somem no reload.", "API idempotente (V16).", "social.test.tsx", "P1")
rf(19, D, DEMO, D, DEMO, "/tasks/t-*", "SocialBar · RemixDialog (DEMO)", "Interações não persistem.", "API social.", "social.test.tsx", "P1")
for n in (20, 21, 22):
    rf(n, E, AUSENTE, E, AUSENTE, "/projects/new · /desk", "RfPage", "Construtor/mesa de projetos inexistentes.", "Agregado Projeto (RF5).", "registry.ts", "P1")
for n in (23, 34, 70):
    rf(n, E, AUSENTE, E, AUSENTE, "/tasks/new (importar) · peças", "Nenhum adapter", "Nenhum conector ou importador.", "Ver CONECTORES.md: um adapter por vez, com estados e testes negativos.", "CONECTORES.md", "P1")
for n in (24, 25, 30, 31, 32, 33, 35, 36, 37, 39, 40, 42, 44, 46, 47, 48, 49, 50):
    rf(n, E, AUSENTE, E, AUSENTE, "página-esqueleto", "RfPage (texto do RF + estado vazio)", "Jornada não implementada.", "Implementar na onda correspondente do PLANO_EXECUCAO.", "lib/pages/registry.ts", "P2")
rf(26, L, LOGICA, L, LOGICA, "/autopilot · /insights", "AiGateway (sem chamador; AiProvidersConfig vazio)", "Copilot sem motor nem chamada.", "Registrar motor e expor endpoint com autonomia (RF51).", "AiGatewayTest", "P1")
rf(27, D, DEMO, D, DEMO, "/mural", "MuralFeed (DEMO)", "Feed de exemplo; não comunica trabalho real.", "Publicações explícitas (não cada salvamento).", "captura 48", "P1")
rf(28, D, (2, 5, 7, 2, 6, 4), D, (2, 5, 7, 2, 6, 4), "/companies · /departments", "DEMO + esqueletos de gestão", "Gestão institucional não operacional.", "API institucional (V10).", "registry.ts", "P2")
rf(29, D, (3, 6, 7, 2, 6, 4), D, (4, 6, 7, 3, 6, 6), "/decia/decisoes/[id]", "DecisionWorkspace · lib/decia (DEMO)",
   "IA aceitável após decidir; versão regredia; critérios mudavam sem aparecer; sem votação nem decisão de grupo.", "Corrigidos os 3 primeiros; falta API e deliberação de grupo.", "5866bca; commands.test.ts; captura 17", "P1")
rf(38, D, (5, 6, 7, 5, 6, 6), D, (5, 6, 7, 5, 6, 6), "cards e glifos", "components/ui · social cards", "Identidade aplicada a dados DEMO.", "Aplicar a dados reais (card de tarefa persistida criado).", "PersistedTaskCard", "P2")
rf(41, D, (3, 6, 7, 2, 6, 5), API, (6, 7, 7, 6, NV, 7), "/tasks", "MyTasks · GET /api/tasks · lib/tasks/status",
   "Antes: acervo só DEMO no perfil; estados mistos. Agora: sub-filtros, prazos legais, anexos e favoritos ausentes.", "Sub-filtros e busca no acervo real.", "Jornada: lista e filtro; tasks.test.tsx", "P1")
rf(43, API, (2, 6, 7, 5, 6, 6), API, (2, 7, 7, 5, 6, 6), "/settings (Motor e custo da IA)", "AI_MODES economia/avançado", "Rótulo 'Modo de IA' confundia custo com autonomia; nenhum insight real.", "Renomeado; falta motor.", "c51cb0e", "P2")
rf(45, D, (1, 5, 6, 2, 6, 4), D, (1, 5, 6, 2, 6, 4), "/profile (Hype)", "fixture", "Hype é número de exemplo.", "Cálculo real com transparência.", "fixtures.ts", "P3")
rf(51, E, AUSENTE, API, (5, 7, 7, 6, NV, 7), "/settings?tab=trabalho · DECIA", "lib/ai/autonomy.ts · settings · WorkspaceSections",
   "Antes: nenhum controle de autonomia. Agora: política com 5 modos e efeito no DECIA; sem editor de peças nem executor de agente.", "Aplicar a política no servidor e nos editores.", "c51cb0e; autonomy.test.ts; capturas 11/14/15/16", "P1")
for n in (52, 53, 54, 55, 56):
    rf(n, E, AUSENTE, E, AUSENTE, "sem rota (não há /studio)", "Nenhum código de Letters no app (protótipo em docs/exemplo_drawings_letters)", "Letters não existe no app.", "Editor estruturado com blocos, versões e sugestões revisáveis.", "find app components lib", "P1")
for n, comp in [(57, "lib/studio/selection.ts"), (65, "lib/pieces/layers.ts"), (66, "lib/pieces/collab.ts · lib/pieces/patch.ts"), (64, "lib/pieces/wireframe.ts"), (67, "lib/pieces/wireframe.ts")]:
    rf(n, L, LOGICA, L, LOGICA, "sem rota (não há /studio)", comp,
       "Só biblioteca testada; seleção incluía ocultos e patch ignorava reservas (corrigidos na lógica)." if n in (57, 65, 66) else "Só biblioteca.", "Editor de Drawings que use authorizePatch.", "4c6d05e, 72f5636", "P1")
for n in (58, 59, 60, 61, 62, 63, 68, 69, 71, 73, 74):
    rf(n, E, AUSENTE, E, AUSENTE, "sem rota (não há /studio)", "Nenhum código", "Funcionalidade inexistente no app.", "Ver plano Drawings/Letters.", "find app components lib", "P1")
rf(72, L, LOGICA, L, (2, 0, 0, 0, 0, 0), "CI", ".github/workflows/ci.yml", "CI de main vermelha (npm ci, vitest .tsx); teste de lease instável (~1/5).", "Restaurada; estabilizar lease.test.ts.", "4c6d05e; execuções locais", "P0")


def score(sub):
    pairs = [(W[d], v) for d, v in zip(DIMS, sub) if v is not None]
    tot = sum(w for w, _ in pairs)
    return round(sum(w * v for w, v in pairs) / tot, 2) if tot else None


prev = {x["rf"]: x for x in json.loads(PREV.read_text(encoding="utf-8"))["requisitos"]}
rows = []
for n in range(1, 75):
    p = prev[f"RF{n}"]
    r = R[n]
    nv = [d for d, v in zip(DIMS, r["sd"]) if v is None]
    rows.append({
        "rf": f"RF{n}", "objetivo": p["objetivo"], "modulo": p["modulo"], "telaFluxo": r["tela"], "componentesApi": r["comp"],
        "estadoInicial": r["ea"], "estadoAtual": r["ed"],
        "subnotasIniciais": dict(zip(DIMS, r["sa"])), "notaInicial": score(r["sa"]),
        "subnotasApos": dict(zip(DIMS, r["sd"])), "notaApos": score(r["sd"]),
        "naoVerificado": nv, "principalErro": r["erro"], "melhoria": r["melhoria"], "evidencia": r["ev"], "prioridade": r["prio"],
        "notaAuditoria20261016": p["notaInicial"], "tipoNota": "TÉCNICA PROVISÓRIA; não validada com usuários",
    })

fmt = lambda v: "—" if v is None else f"{v:.2f}"
out = {"data": "2026-10-17", "pesos": W, "regraNV": "dimensão n/v excluída e pesos renormalizados; nota marcada (parcial)", "requisitos": rows}
(ROOT / "MATRIZ_RF.json").write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
with open(ROOT / "MATRIZ_RF.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["RF", "Objetivo", "Tela/fluxo", "Componentes e API", "Estado inicial", "Estado atual", "Nota inicial", "Nota após", "n/v",
                "Principal erro", "Melhoria", "Evidência", "Prioridade", "Nota 16/10"])
    for x in rows:
        w.writerow([x["rf"], x["objetivo"], x["telaFluxo"], x["componentesApi"], x["estadoInicial"], x["estadoAtual"], fmt(x["notaInicial"]),
                    fmt(x["notaApos"]), ";".join(x["naoVerificado"]), x["principalErro"], x["melhoria"], x["evidencia"], x["prioridade"],
                    x["notaAuditoria20261016"]])

md = ["# Matriz dos 74 RF — reavaliada contra o repositório", "",
      "17/10/2026. Notas **técnicas provisórias** (não são testes com usuários), na rubrica do projeto: funcionalidade 30 %, eficiência 20 %, "
      "visual 15 %, recuperação 15 %, acessibilidade 10 %, feedback 10 %. Zero = jornada comprovadamente ausente (página-esqueleto ou nada). "
      "**n/v** = dimensão não verificada nesta rodada, fora da média; a nota fica marcada com \\*. A coluna *16/10* mostra a nota da auditoria "
      "anterior, que se apoiava em código não publicado (ver P02) e por isso não é comparável.", "",
      "| RF | Objetivo | Tela/fluxo | Componentes e API | Estado | Inicial | Principal erro | Melhoria | Evidência | Prior. | Após | 16/10 |",
      "|---|---|---|---|---|---:|---|---|---|---|---:|---:|"]
for x in rows:
    star = "\\*" if x["naoVerificado"] else ""
    est = x["estadoInicial"] if x["estadoInicial"] == x["estadoAtual"] else f"{x['estadoInicial']} → **{x['estadoAtual']}**"
    md.append(f"| {x['rf']} | {x['objetivo']} | {x['telaFluxo']} | {x['componentesApi']} | {est} | {fmt(x['notaInicial'])} | {x['principalErro']} | "
              f"{x['melhoria']} | {x['evidencia']} | {x['prioridade']} | **{fmt(x['notaApos'])}**{star} | {x['notaAuditoria20261016']} |")
md += ["", "## Subnotas (inicial → após)", "", "| RF | Func. | Efic. | Visual | Recup. | Acess. | Feedb. |", "|---|---|---|---|---|---|---|"]
for x in rows:
    cells = []
    for d in DIMS:
        a, b = x["subnotasIniciais"][d], x["subnotasApos"][d]
        a = "n/v" if a is None else a
        b = "n/v" if b is None else b
        cells.append(str(a) if a == b else f"{a} → {b}")
    md.append(f"| {x['rf']} | " + " | ".join(cells) + " |")
(ROOT / "MATRIZ_RF.md").write_text("\n".join(md) + "\n", encoding="utf-8")

mods = {}
for x in rows:
    mods.setdefault(x["modulo"], []).append(x)
avg = lambda xs, k: round(sum(v[k] or 0 for v in xs) / len(xs), 2)
res = ["# Resumo por módulo", "", "17/10/2026. Média simples das notas dos RF de cada módulo (n/v não vira zero; RF com nota parcial entram pela nota parcial). "
       "Não é benchmark de UX nem medida de precisão de IA.", "", "| Módulo | RF | Inicial | Após | Ausentes após |", "|---|---|---:|---:|---:|"]
for m, xs in sorted(mods.items()):
    res.append(f"| {m} | {', '.join(v['rf'] for v in xs)} | {avg(xs, 'notaInicial'):.2f} | {avg(xs, 'notaApos'):.2f} | {sum(1 for v in xs if v['estadoAtual'] == 'AUSENTE')} |")
ini = avg(rows, "notaInicial")
aft = avg(rows, "notaApos")
cnt = lambda k, s: sum(1 for v in rows if v[k] == s)
res += ["", f"**Geral (74 RF):** inicial {ini:.2f} → após {aft:.2f}.", "",
        f"Estados após a rodada: {cnt('estadoAtual', 'AUSENTE')} ausentes, {cnt('estadoAtual', 'LÓGICA SEM INTERFACE')} só lógica, "
        f"{cnt('estadoAtual', 'DEMO EM MEMÓRIA')} DEMO em memória, {cnt('estadoAtual', 'API REAL PARCIAL')} com API real parcial. Nenhum com aceite integral."]
(ROOT / "RESUMO_MODULOS.md").write_text("\n".join(res) + "\n", encoding="utf-8")
print(f"74 RF · inicial {ini} · após {aft}")
