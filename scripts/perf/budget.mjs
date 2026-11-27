#!/usr/bin/env node
// Orçamento de bundle (auditoria "Desempenho"): lê a saída do `next build` e falha se o First Load JS (gzip) de uma rota passar
// do teto configurado em scripts/perf/budget.config.json.
//
// Fonte: o Next 16 grava `.next/diagnostics/route-bundle-stats.json` no fim do build (node_modules/next/dist/build/
// route-bundle-stats.js) com, por rota do App Router, `firstLoadChunkPaths` = JS de todos os segmentos (page + layouts) mais os
// `rootMainFiles` do build-manifest. O Next só soma bytes SEM compressão; aqui cada chunk é comprimido com gzip (nível 9, perto
// do que o servidor entrega) e somado — é o número que importa na rede.
//
// Uso:  node scripts/perf/budget.mjs [--dir .next] [--config scripts/perf/budget.config.json] [--json] [--top 15]
// Saída: tabela das maiores rotas, chunks compartilhados e violações; código 1 se alguma rota estourar o teto (ou sem build).
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

export function parseArgs(argv) {
  const out = { dir: ".next", config: path.join("scripts", "perf", "budget.config.json"), json: false, top: 15 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dir") out.dir = argv[++i];
    else if (a === "--config") out.config = argv[++i];
    else if (a === "--json") out.json = true;
    else if (a === "--top") out.top = Number(argv[++i]);
  }
  return out;
}

/** Converte "350 KB" / "350kb" / 358400 em bytes (KB = 1024). */
export function toBytes(v) {
  if (typeof v === "number") return v;
  const m = /^\s*([\d.]+)\s*(kb|mb|b)?\s*$/i.exec(String(v));
  if (!m) throw new Error(`teto inválido: ${v}`);
  const n = Number(m[1]);
  const unit = (m[2] ?? "b").toLowerCase();
  return Math.round(unit === "mb" ? n * 1024 * 1024 : unit === "kb" ? n * 1024 : n);
}

export const kb = (b) => `${(b / 1024).toFixed(1)} KB`;

/** Teto de uma rota: o primeiro `routes[padrão]` que casa (padrão exato ou prefixo terminado em `*`), senão `default`. */
export function limitFor(route, config) {
  for (const [pattern, limit] of Object.entries(config.routes ?? {})) {
    if (pattern === route || (pattern.endsWith("*") && route.startsWith(pattern.slice(0, -1)))) return toBytes(limit);
  }
  return toBytes(config.default);
}

/**
 * Mede as rotas: `rows` no formato do route-bundle-stats.json; `sizeOf(chunkPath)` devolve o tamanho gzip do chunk (injetável
 * para teste). Retorna as rotas ordenadas da maior para a menor, os chunks presentes em todas as rotas e as violações.
 */
export function measure(rows, config, sizeOf) {
  const ignore = (config.ignore ?? []).map((p) => new RegExp(p));
  const routes = rows
    .filter((r) => !ignore.some((re) => re.test(r.route)))
    .map((r) => {
      const chunks = [...new Set(r.firstLoadChunkPaths)].filter((f) => f.endsWith(".js"));
      const gzip = chunks.reduce((s, f) => s + sizeOf(f), 0);
      const raw = r.firstLoadUncompressedJsBytes ?? 0;
      const limit = limitFor(r.route, config);
      return { route: r.route, gzip, raw, limit, chunks: chunks.length, over: gzip > limit };
    })
    .sort((a, b) => b.gzip - a.gzip);
  const sets = rows.map((r) => new Set(r.firstLoadChunkPaths));
  const shared = sets.length ? [...sets[0]].filter((f) => f.endsWith(".js") && sets.every((s) => s.has(f))) : [];
  const sharedGzip = shared.reduce((s, f) => s + sizeOf(f), 0);
  return { routes, shared: { chunks: shared.length, gzip: sharedGzip }, violations: routes.filter((r) => r.over) };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const dist = path.resolve(ROOT, args.dir);
  const statsFile = path.join(dist, "diagnostics", "route-bundle-stats.json");
  if (!fs.existsSync(statsFile)) {
    console.error(`budget: ${path.relative(ROOT, statsFile)} não existe — rode \`next build\` antes (o arquivo é gravado no fim do build de produção).`);
    process.exit(1);
  }
  const config = JSON.parse(fs.readFileSync(path.resolve(ROOT, args.config), "utf8"));
  const rows = JSON.parse(fs.readFileSync(statsFile, "utf8"));
  const cache = new Map();
  // os caminhos do Next são relativos à raiz do projeto (ex.: .next/static/chunks/abc.js)
  const sizeOf = (rel) => {
    if (!cache.has(rel)) {
      const abs = path.resolve(ROOT, rel);
      cache.set(rel, fs.existsSync(abs) ? zlib.gzipSync(fs.readFileSync(abs), { level: 9 }).length : 0);
    }
    return cache.get(rel);
  };
  const result = measure(rows, config, sizeOf);

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    const top = result.routes.slice(0, args.top);
    const w = Math.max(5, ...top.map((r) => r.route.length));
    console.log(`First Load JS por rota (gzip) — ${result.routes.length} rotas, teto padrão ${kb(toBytes(config.default))}`);
    console.log(`${"rota".padEnd(w)}  ${"gzip".padStart(10)}  ${"bruto".padStart(11)}  ${"teto".padStart(10)}  chunks`);
    for (const r of top) {
      console.log(`${r.route.padEnd(w)}  ${kb(r.gzip).padStart(10)}  ${kb(r.raw).padStart(11)}  ${kb(r.limit).padStart(10)}  ${String(r.chunks).padStart(6)}${r.over ? "  ✗ ESTOUROU" : ""}`);
    }
    if (result.routes.length > top.length) console.log(`… e mais ${result.routes.length - top.length} rotas (--top N)`);
    const min = result.routes.at(-1);
    if (min) console.log(`menor: ${min.route} ${kb(min.gzip)} · compartilhado por todas as rotas: ${kb(result.shared.gzip)} em ${result.shared.chunks} chunks`);
  }
  if (result.violations.length) {
    console.error(`\nbudget: ${result.violations.length} rota(s) acima do teto:`);
    for (const v of result.violations) console.error(`  ${v.route}: ${kb(v.gzip)} > ${kb(v.limit)} (+${kb(v.gzip - v.limit)})`);
    process.exit(1);
  }
  if (!args.json) console.log("\nbudget: ok — nenhuma rota acima do teto.");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
