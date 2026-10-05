#!/usr/bin/env node
// Verificação dos catálogos de tradução (ARQUITETURA §4): paridade de chaves pt-BR/en/es, variáveis {x} iguais entre
// idiomas, chaves vazias, JSON válido e textos iguais ao pt-BR (possivelmente não traduzidos). Roda no `prebuild`,
// no `npm run i18n:check` e no CI. Quando o backend ganhar messages*.properties (Bloco 3), este script passa a
// conferir os {n} de MessageFormat também.
// Uso: node scripts/i18n/check.js [--fail] [--json saida.json]
//   --fail : sai com código 1 se houver erro (chave faltando, órfã, vazia, variáveis diferentes, JSON inválido)
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const FE = path.join(ROOT, "lib/i18n/messages");
const SOURCE = "pt-BR";
const TARGETS = ["en", "es"];
const args = process.argv.slice(2);
const fail = args.includes("--fail");
const jsonOut = args.includes("--json") ? args[args.indexOf("--json") + 1] : null;

const errors = [];
const warnings = [];

function readCatalog(locale) {
  const file = path.join(FE, `${locale}.json`);
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      errors.push(`${locale}: o catálogo precisa ser um objeto chave → texto`);
      return {};
    }
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v !== "string") errors.push(`${locale}: valor de ${k} não é texto`);
      else if (!v.trim()) errors.push(`${locale}: ${k} está vazia`);
    }
    return parsed;
  } catch (e) {
    errors.push(`${locale}: não foi possível ler ${path.relative(ROOT, file)} (${e.message})`);
    return {};
  }
}

/** Nomes das variáveis `{nome}` de uma mensagem, ordenados. */
const varsOf = (msg) => [...new Set([...String(msg).matchAll(/\{\s*([A-Za-z0-9_]+)\s*\}/g)].map((m) => m[1]))].sort().join(",");
const looksPortuguese = (s) => /[ãõç]|\b(você|voce|não|nao|senha|cadastr|também|olá|então|tarefa|projeto)\b/i.test(s);

const cat = { [SOURCE]: readCatalog(SOURCE) };
for (const l of TARGETS) cat[l] = readCatalog(l);
const pt = cat[SOURCE];
let sameAsSource = 0;

for (const l of TARGETS) {
  for (const k of Object.keys(pt)) if (!(k in cat[l])) errors.push(`${l}: falta ${k}`);
  for (const k of Object.keys(cat[l])) if (!(k in pt)) errors.push(`${l}: órfã ${k} (não existe em ${SOURCE})`);
  for (const k of Object.keys(pt)) {
    const v = cat[l][k];
    if (v === undefined) continue;
    if (varsOf(v) !== varsOf(pt[k])) errors.push(`${l}: variáveis diferentes em ${k}: ${SOURCE} {${varsOf(pt[k])}} × ${l} {${varsOf(v)}}`);
    if (v === pt[k] && /[A-Za-zÀ-ÿ]{4,}/.test(v) && looksPortuguese(v)) {
      warnings.push(`${l}: igual ao ${SOURCE} (não traduzido?) ${k} = ${v.slice(0, 60)}`);
      sameAsSource++;
    }
  }
}

// chaves do frontend sem referência direta no código (informativo; chaves montadas dinamicamente contam pelo prefixo)
const used = new Set();
const prefixes = new Set();
function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      if (!/node_modules|\.next|messages/.test(f)) walk(p);
    } else if (/\.(tsx?|jsx?)$/.test(f) && !/\.test\./.test(f)) {
      const s = fs.readFileSync(p, "utf8");
      for (const m of s.matchAll(/["'`]([a-zA-Z0-9]+(?:\.[a-zA-Z0-9_-]+)+)["'`]/g)) used.add(m[1]);
      for (const m of s.matchAll(/`([a-zA-Z0-9]+(?:\.[a-zA-Z0-9_-]+)*\.)\$\{/g)) prefixes.add(m[1]);
    }
  }
}
for (const d of ["app", "components", "lib"]) walk(path.join(ROOT, d));
const unused = Object.keys(pt).filter((k) => !used.has(k) && ![...prefixes].some((p) => k.startsWith(p)));

const summary = {
  locales: [SOURCE, ...TARGETS],
  keys: Object.keys(pt).length,
  sameAsSource,
  unusedCandidates: unused,
  errors,
  warnings,
};
console.log(`i18n: ${summary.keys} chaves em ${summary.locales.join("/")}`);
console.log(`erros: ${errors.length} · avisos: ${warnings.length} · chaves sem referência direta: ${unused.length}`);
for (const e of errors.slice(0, 50)) console.log("ERRO", e);
for (const w of warnings.slice(0, 20)) console.log("aviso", w);
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(summary, null, 2));
if (fail && errors.length) process.exit(1);
