// Status de implementação por RF, derivado do código (auditoria "Documentação e rastreabilidade"): cruza os endpoints do ws-web
// (@Tag "RFnn …" da classe, @Operation(summary = "RFnn.CAxx …") do método, @RequestMapping/@XxxMapping) com as rotas do
// front (lib/pages/registry.ts: rota → RFs citados, o primeiro é o principal) e o estado delas (lib/pages/status.ts).
//
// Regra (a mesma em docs/rf/STATUS.md):
//   api       — há endpoint que cita o RF E uma rota `live` que o cita (ponta a ponta: tela real sobre a API real);
//   parcial   — há endpoint mas nenhuma rota `live` o cita (API sem tela real), OU o RF é o principal de uma rota `live` sem
//               endpoint próprio (tela real apoiada em API de outro RF ou em processamento local);
//   demo      — sem endpoint e alguma rota `demo` o cita (dados em repositório DEMO em memória);
//   planejado — nada acima (só esqueleto/preview, ou citado de passagem numa rota de outro RF).
// Uso: importado por scripts/rf/gerar-catalogo.mjs (campo `status` do catálogo e docs/rf/STATUS.md).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const WEB = path.join(ROOT, "ws-web/src/main/java");
export const STATUS_MD = path.join(ROOT, "docs/rf/STATUS.md");
export const RF_STATUSES = ["api", "parcial", "demo", "planejado"];

function walk(dir, pred, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, pred, acc);
    else if (pred(p)) acc.push(p);
  }
  return acc.sort();
}

/** Conteúdo entre o `(` em `open` e o `)` que o fecha, respeitando strings Java. */
function parens(src, open) {
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    const ch = src[i];
    if (ch === '"') {
      for (i++; i < src.length && src[i] !== '"'; i++) if (src[i] === "\\") i++;
      continue;
    }
    if (ch === "(") depth++;
    else if (ch === ")" && --depth === 0) return src.slice(open + 1, i);
  }
  return "";
}

/** Concatena os literais de string Java de um trecho (`"a " + "b"` → `a b`). */
const strings = (s) => [...s.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1].replace(/\\"/g, '"')).join("");
const firstString = (s) => /"((?:[^"\\]|\\.)*)"/.exec(s)?.[1] ?? "";
export const rfIds = (s) => [...new Set([...s.matchAll(/\bRF(\d+)\b/g)].map((m) => `RF${Number(m[1])}`))];

const MAPPING = /@(Get|Post|Put|Patch|Delete|Request)Mapping\b/g;
const VERB = { Get: "GET", Post: "POST", Put: "PUT", Patch: "PATCH", Delete: "DELETE", Request: "ANY" };

/** Endpoints de um controller: `{ method, path, rfs, summary, file }`. */
export function parseController(src, file = "") {
  const classAt = src.search(/\bclass\s+\w+/);
  if (classAt < 0) return [];
  const header = src.slice(0, classAt);
  const tagAt = header.lastIndexOf("@Tag(");
  const tagRfs = tagAt >= 0 ? rfIds(strings(parens(header, tagAt + 4))) : [];
  const reqAt = header.lastIndexOf("@RequestMapping");
  const prefix = reqAt >= 0 && header[reqAt + 15] === "(" ? firstString(parens(header, reqAt + 15)) : "";
  const body = src.slice(classAt);
  const out = [];
  let last = 0;
  for (const m of body.matchAll(MAPPING)) {
    const at = m.index;
    const after = at + m[0].length;
    const args = body[after] === "(" ? parens(body, after) : "";
    const between = body.slice(last, at);
    last = after + args.length;
    const opAt = between.lastIndexOf("@Operation(");
    const summary = opAt >= 0 ? strings(parens(between, opAt + 10)).replace(/\s+/g, " ").trim() : "";
    const opRfs = rfIds(summary);
    out.push({ method: VERB[m[1]], path: (prefix + firstString(args)) || prefix || "/", rfs: opRfs.length ? opRfs : tagRfs, summary, file });
  }
  return out;
}

export function endpoints() {
  return walk(WEB, (p) => /Controller\.java$/.test(p)).flatMap((f) => parseController(fs.readFileSync(f, "utf8"), path.relative(ROOT, f)));
}

/** Rotas do registro: `{ route, rfs }` (lê o código-fonte; sem importar TS). */
export function parseRegistry(src) {
  return [...src.matchAll(/\bp\(\s*"([^"]+)",\s*"[^"]*",\s*"[^"]*",\s*\[([^\]]*)\]/g)].map((m) => ({ route: m[1], rfs: [...m[2].matchAll(/"(RF\d+)"/g)].map((x) => x[1]) }));
}

/** `ROUTE_STATUS` de lib/pages/status.ts. Rota sem linha conta como `live` (mesmo padrão de `statusOfRoute`). */
export function parseRouteStatus(src) {
  const block = /ROUTE_STATUS[^=]*=\s*\{([\s\S]*?)\n\};/.exec(src)?.[1] ?? "";
  return Object.fromEntries([...block.matchAll(/^\s*"([^"]+)":\s*"(live|demo|preview|skeleton)"/gm)].map((m) => [m[1], m[2]]));
}

export function routes() {
  const reg = parseRegistry(fs.readFileSync(path.join(ROOT, "lib/pages/registry.ts"), "utf8"));
  const st = parseRouteStatus(fs.readFileSync(path.join(ROOT, "lib/pages/status.ts"), "utf8"));
  return reg.map((r) => ({ ...r, status: st[r.route] ?? "live" }));
}

/** Classifica um RF a partir dos endpoints e rotas que o citam. */
export function classify(id, eps, rts) {
  const mine = eps.filter((e) => e.rfs.includes(id));
  const cited = rts.filter((r) => r.rfs.includes(id));
  const live = cited.filter((r) => r.status === "live");
  const primaryLive = live.filter((r) => r.rfs[0] === id);
  let status;
  if (mine.length && live.length) status = "api";
  else if (mine.length) status = "parcial";
  else if (primaryLive.length) status = "parcial";
  else if (cited.some((r) => r.status === "demo")) status = "demo";
  else status = "planejado";
  return {
    status,
    endpoints: mine.map((e) => `${e.method} ${e.path}`),
    routes: cited.map((r) => ({ route: r.route, status: r.status, primary: r.rfs[0] === id })),
  };
}

/** Mapa RF → { status, endpoints, routes } para os ids dados. */
export function mapaStatus(ids) {
  const eps = endpoints();
  const rts = routes();
  return Object.fromEntries(ids.map((id) => [id, classify(id, eps, rts)]));
}

const pct = (a, b) => (b ? `${((100 * a) / b).toFixed(1).replace(".", ",")}%` : "—");

/** docs/rf/STATUS.md a partir do catálogo (id, título) e do mapa. */
export function relatorio(items, mapa) {
  const total = items.length;
  const count = Object.fromEntries(RF_STATUSES.map((s) => [s, items.filter((r) => mapa[r.id].status === s).length]));
  const eps = endpoints();
  const semRf = eps.filter((e) => !e.rfs.length);
  const lines = [
    "# Status de implementação por RF",
    "",
    "<!-- GERADO por scripts/rf/gerar-catalogo.mjs (scripts/rf/status.mjs) — não editar à mão. Teste: lib/rf/catalog.test.ts. -->",
    "",
    "Derivado do código, não declarado: endpoints do `ws-web` (`@Tag`/`@Operation` com \"RFnn\" e `@…Mapping`) cruzados com as",
    "rotas de `lib/pages/registry.ts` (RFs citados; o primeiro é o principal) e o estado delas em `lib/pages/status.ts`.",
    "",
    "| Status | Regra | RFs | % |",
    "|---|---|---:|---:|",
    `| \`api\` | endpoint que cita o RF **e** rota \`live\` que o cita (ponta a ponta) | ${count.api} | ${pct(count.api, total)} |`,
    `| \`parcial\` | endpoint sem rota \`live\`, ou RF principal de rota \`live\` sem endpoint próprio | ${count.parcial} | ${pct(count.parcial, total)} |`,
    `| \`demo\` | sem endpoint; alguma rota \`demo\` (repositório em memória) o cita | ${count.demo} | ${pct(count.demo, total)} |`,
    `| \`planejado\` | nada acima (esqueleto, preview ou citação de passagem) | ${count.planejado} | ${pct(count.planejado, total)} |`,
    `| **total** | | **${total}** | |`,
    "",
    `**Ponta a ponta (\`api\`): ${count.api} de ${total} RFs = ${pct(count.api, total)}.** Com \`parcial\`: ${count.api + count.parcial} = ${pct(count.api + count.parcial, total)}.`,
    `Endpoints lidos: ${eps.length} (${semRf.length} sem RF no \`@Tag\` nem no \`@Operation\`).`,
    "",
    "Limites: a classificação é por citação. Um RF `api` pode ter CAs ainda não atendidos (ver o \"Estado da implementação\" de cada",
    "README e [CA_TESTES.md](CA_TESTES.md)); um RF citado de passagem numa rota `live` não ganha `api` sem endpoint próprio.",
    "",
    "| RF | Título | Status | Endpoints | Rotas (estado; * = principal) |",
    "|---|---|---|---:|---|",
  ];
  for (const r of items) {
    const m = mapa[r.id];
    const rotas = m.routes.map((x) => `\`${x.route}\` ${x.status}${x.primary ? "*" : ""}`).join(", ") || "—";
    lines.push(`| [${r.id}](../diagramas/${r.id}/README.md) | ${r.title.replace(/\|/g, "\\|")} | \`${m.status}\` | ${m.endpoints.length} | ${rotas} |`);
  }
  if (semRf.length) {
    lines.push("", "## Endpoints sem RF citado", "");
    for (const e of semRf) lines.push(`- \`${e.method} ${e.path}\` — ${e.file}`);
  }
  lines.push("");
  return lines.join("\n");
}
