#!/usr/bin/env node
// Valida o dado versionado do Guia de Carreira (RF75.CA19): o catálogo de ramos acadêmicos
// (contracts/career/academic-fields.json) e os pacotes de ocupação (contracts/career/occupation-packs/*.json) contra os
// JSON Schemas de contracts/career/*.schema.json, mais as checagens cruzadas que um esquema não expressa (códigos e rótulos
// únicos, vizinhos e caminhos que existem, prioridade sem tarefa excluída, serviços externos declarados, um pacote por
// ramo, pacote genérico presente). Sem dependências: o subconjunto de JSON Schema usado pelos esquemas está implementado
// aqui. Roda em `npm run career:validate`, no teste lib/career/career.test.ts e à mão pelos agentes de pesquisa.
// Uso: node scripts/career/validar-pacotes.mjs [--ramos <arquivo>]... [--pacote <arquivo|pasta>]... [--json]
//   sem argumentos: valida o catálogo e todos os pacotes do repositório.
//   --ramos aceita o catálogo consolidado (com schemaVersion) ou um arquivo de grupo da pesquisa ({group, fields, ...}).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const CAREER_DIR = path.join(ROOT, "contracts/career");
export const FIELDS_FILE = path.join(CAREER_DIR, "academic-fields.json");
export const PACKS_DIR = path.join(CAREER_DIR, "occupation-packs");
export const GENERIC_CODE = "generico";

export function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

const FIELD_SCHEMA = readJson(path.join(CAREER_DIR, "academic-field.schema.json"));
const PACK_SCHEMA = readJson(path.join(CAREER_DIR, "occupation-pack.schema.json"));

/** Arquivo de grupo produzido na pesquisa (fase 1): um por grande área CINE, sem schemaVersion. */
const GROUP_SCHEMA = {
  type: "object",
  required: ["group", "generatedAt", "fields", "sources", "naoConferido"],
  additionalProperties: false,
  properties: {
    group: { type: "string", minLength: 2, maxLength: 80 },
    generatedAt: { $ref: "#/$defs/date" },
    fields: { type: "array", minItems: 1, items: { $ref: "#/$defs/field" } },
    sources: { type: "array", items: { $ref: "#/$defs/source" } },
    naoConferido: { type: "array", items: { type: "string", minLength: 2, maxLength: 300 } },
  },
};

const typeOf = (v) => (v === null ? "null" : Array.isArray(v) ? "array" : typeof v);
const matchesType = (t, v) => (t === "integer" ? Number.isInteger(v) : t === "number" ? typeof v === "number" && Number.isFinite(v) : typeOf(v) === t);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const length = (s) => [...s].length;

function resolveRef(root, ref) {
  if (!ref.startsWith("#/")) throw new Error(`$ref não suportado: ${ref}`);
  return ref.slice(2).split("/").reduce((o, k) => o[k.replace(/~1/g, "/").replace(/~0/g, "~")], root);
}

/**
 * Validador do subconjunto de JSON Schema 2020-12 usado em contracts/career: $ref local, type (um ou vários), const, enum,
 * anyOf, pattern, minLength/maxLength, minimum/maximum, required, properties, patternProperties, additionalProperties,
 * minProperties, items, minItems/maxItems, uniqueItems. Devolve a lista de erros ("$.caminho: mensagem").
 */
export function validateSchema(schema, data, root = schema, at = "$", errors = []) {
  if (schema.$ref) return validateSchema(resolveRef(root, schema.$ref), data, root, at, errors);
  const fail = (msg) => {
    errors.push(`${at}: ${msg}`);
    return errors;
  };
  if ("const" in schema && !same(schema.const, data)) return fail(`esperado ${JSON.stringify(schema.const)}, veio ${JSON.stringify(data)}`);
  if (schema.enum && !schema.enum.some((v) => same(v, data))) {
    return fail(`${JSON.stringify(data)} fora de ${schema.enum.map((v) => JSON.stringify(v)).join(" | ")}`);
  }
  if (schema.anyOf) {
    const ok = schema.anyOf.some((alt) => validateSchema(alt, data, root, at, []).length === 0);
    if (!ok) return fail(`não casa com nenhuma das alternativas (anyOf)`);
  }
  if (schema.type) {
    const types = [].concat(schema.type);
    if (!types.some((t) => matchesType(t, data))) return fail(`tipo ${typeOf(data)}, esperado ${types.join(" | ")}`);
  }
  if (typeof data === "string") {
    if (schema.minLength !== undefined && length(data) < schema.minLength) fail(`${length(data)} caracteres, mínimo ${schema.minLength}`);
    if (schema.maxLength !== undefined && length(data) > schema.maxLength) fail(`${length(data)} caracteres, máximo ${schema.maxLength}`);
    if (schema.pattern && !new RegExp(schema.pattern, "u").test(data)) fail(`${JSON.stringify(data)} não casa com /${schema.pattern}/`);
  } else if (typeof data === "number") {
    if (schema.minimum !== undefined && data < schema.minimum) fail(`${data} abaixo do mínimo ${schema.minimum}`);
    if (schema.maximum !== undefined && data > schema.maximum) fail(`${data} acima do máximo ${schema.maximum}`);
  } else if (Array.isArray(data)) {
    if (schema.minItems !== undefined && data.length < schema.minItems) fail(`${data.length} itens, mínimo ${schema.minItems}`);
    if (schema.maxItems !== undefined && data.length > schema.maxItems) fail(`${data.length} itens, máximo ${schema.maxItems}`);
    if (schema.uniqueItems) {
      const seen = new Set();
      data.forEach((v, i) => {
        const k = JSON.stringify(v);
        if (seen.has(k)) fail(`item ${i} repetido (${k})`);
        seen.add(k);
      });
    }
    if (schema.items) data.forEach((v, i) => validateSchema(schema.items, v, root, `${at}[${i}]`, errors));
  } else if (data && typeof data === "object") {
    const keys = Object.keys(data);
    for (const k of schema.required ?? []) if (!(k in data)) fail(`falta "${k}"`);
    if (schema.minProperties !== undefined && keys.length < schema.minProperties) fail(`${keys.length} chaves, mínimo ${schema.minProperties}`);
    for (const k of keys) {
      const sub = schema.properties?.[k];
      const patterns = Object.entries(schema.patternProperties ?? {}).filter(([p]) => new RegExp(p, "u").test(k));
      if (sub) validateSchema(sub, data[k], root, `${at}.${k}`, errors);
      for (const [, ps] of patterns) validateSchema(ps, data[k], root, `${at}.${k}`, errors);
      if (!sub && patterns.length === 0) {
        if (schema.additionalProperties === false) fail(`campo "${k}" não previsto`);
        else if (typeof schema.additionalProperties === "object") validateSchema(schema.additionalProperties, data[k], root, `${at}.${k}`, errors);
      }
    }
  }
  return errors;
}

/** Catálogo de ramos (consolidado) ou arquivo de grupo da pesquisa. Vizinho inexistente é erro no consolidado e aviso no grupo. */
export function validarRamos(doc, { consolidado = doc != null && typeof doc === "object" && "schemaVersion" in doc } = {}) {
  const errors = [];
  const warnings = [];
  validateSchema(consolidado ? FIELD_SCHEMA : GROUP_SCHEMA, doc, FIELD_SCHEMA, "$", errors);
  const fields = Array.isArray(doc?.fields) ? doc.fields.filter((f) => f && typeof f === "object") : [];
  const codes = new Set();
  const labels = new Set();
  fields.forEach((f, i) => {
    const at = `$.fields[${i}](${f.code ?? "?"})`;
    if (codes.has(f.code)) errors.push(`${at}: code repetido`);
    codes.add(f.code);
    const label = f.label?.["pt-BR"];
    if (label) {
      const k = label.toLowerCase();
      if (labels.has(k)) errors.push(`${at}: rótulo pt-BR repetido "${label}"`);
      labels.add(k);
      if (Array.isArray(f.aliases) && !f.aliases.some((a) => typeof a === "string" && a.toLowerCase() === k)) {
        warnings.push(`${at}: o rótulo pt-BR não está entre os aliases`);
      }
    }
    if (!(f.cbo?.length || f.isco08?.length)) errors.push(`${at}: sem família CBO nem ISCO-08`);
    if (f.code === GENERIC_CODE) errors.push(`${at}: "${GENERIC_CODE}" é reservado ao pacote genérico`);
  });
  fields.forEach((f, i) => {
    for (const n of f.neighbors ?? []) {
      if (n === f.code) errors.push(`$.fields[${i}].neighbors: vizinho de si mesmo`);
      else if (!codes.has(n)) (consolidado ? errors : warnings).push(`$.fields[${i}].neighbors: "${n}" não existe no catálogo`);
    }
  });
  return { errors, warnings, codes: [...codes] };
}

/** Um pacote de ocupação; com o catálogo, confere que `fields` e `paths.to` existem. */
export function validarPacote(doc, catalogo = null) {
  const errors = [];
  const warnings = [];
  validateSchema(PACK_SCHEMA, doc, PACK_SCHEMA, "$", errors);
  if (!doc || typeof doc !== "object") return { errors, warnings };
  const codes = catalogo ? new Set((catalogo.fields ?? []).map((f) => f.code)) : null;
  const generic = doc.code === GENERIC_CODE;
  const fields = Array.isArray(doc.fields) ? doc.fields : [];
  if (generic && fields.length) errors.push("$.fields: o pacote genérico não serve a ramos específicos");
  if (!generic) {
    if (!fields.length) errors.push("$.fields: um pacote de profissão serve a ao menos um ramo do catálogo");
    if ((doc.paths?.length ?? 0) < 2) errors.push("$.paths: um pacote de profissão traz ao menos 2 caminhos vizinhos");
    if (!(doc.family?.cbo?.length || doc.family?.isco08?.length)) errors.push("$.family: sem família CBO nem ISCO-08");
  }
  if (codes) {
    fields.forEach((c, i) => { if (!codes.has(c)) errors.push(`$.fields[${i}]: ramo "${c}" não existe no catálogo`); });
    (doc.paths ?? []).forEach((p, i) => { if (p?.to && !codes.has(p.to)) warnings.push(`$.paths[${i}].to: "${p.to}" não existe no catálogo`); });
  }
  const gt = doc.guidedTasks ?? {};
  const excluded = new Set((gt.excluded ?? []).map((e) => e?.code));
  const priority = Array.isArray(gt.priority) ? gt.priority : [];
  priority.forEach((c, i) => { if (excluded.has(c)) errors.push(`$.guidedTasks.priority[${i}]: "${c}" também está em excluded`); });
  priority.slice(0, 3).forEach((c) => { if (!gt.parameters?.[c]) errors.push(`$.guidedTasks.parameters: falta "${c}" (uma das 3 primeiras prioridades)`); });
  Object.keys(gt.parameters ?? {}).forEach((c) => { if (excluded.has(c)) errors.push(`$.guidedTasks.parameters.${c}: tarefa excluída com parâmetros`); });
  const customIds = new Set((gt.custom ?? []).map((t) => t?.id));
  (doc.rubric?.objective ?? []).forEach((c, i) => {
    for (const t of c?.appliesTo ?? []) {
      if (/^X/.test(t) && !customIds.has(t)) errors.push(`$.rubric.objective[${i}].appliesTo: tarefa personalizada "${t}" não existe em guidedTasks.custom`);
      if (excluded.has(t)) warnings.push(`$.rubric.objective[${i}].appliesTo: "${t}" está em excluded`);
    }
  });
  const serviceIds = (doc.ai?.services ?? []).map((s) => s?.service);
  const services = new Set(serviceIds);
  const repeated = [...new Set(serviceIds.filter((s, i) => serviceIds.indexOf(s) !== i))];
  if (repeated.length) errors.push(`$.ai.services: serviço repetido ${repeated.join(", ")}`);
  (doc.ai?.provider?.externalAllowedFor ?? []).forEach((s, i) => {
    if (!services.has(s)) errors.push(`$.ai.provider.externalAllowedFor[${i}]: "${s}" não está em ai.services`);
  });
  return { errors, warnings };
}

const rel = (file) => path.relative(ROOT, file).split(path.sep).join("/");

/** Catálogo + todos os pacotes do repositório (ou dos caminhos dados). */
export function validarTudo({ fieldsFile = FIELDS_FILE, packsDir = PACKS_DIR } = {}) {
  const report = { errors: [], warnings: [], files: 0 };
  const push = (file, r) => {
    report.files += 1;
    r.errors.forEach((e) => report.errors.push(`${rel(file)}: ${e}`));
    r.warnings.forEach((w) => report.warnings.push(`${rel(file)}: ${w}`));
  };
  let catalogo = null;
  if (fs.existsSync(fieldsFile)) {
    try {
      catalogo = readJson(fieldsFile);
      push(fieldsFile, validarRamos(catalogo, { consolidado: true }));
    } catch (e) {
      report.errors.push(`${rel(fieldsFile)}: JSON inválido — ${e.message}`);
    }
  } else {
    report.warnings.push(`${rel(fieldsFile)}: catálogo ausente`);
  }
  const packFiles = fs.existsSync(packsDir)
    ? fs.readdirSync(packsDir).filter((f) => f.endsWith(".json")).sort().map((f) => path.join(packsDir, f))
    : [];
  const served = new Map();
  let hasGeneric = false;
  for (const file of packFiles) {
    let doc;
    try {
      doc = readJson(file);
    } catch (e) {
      report.errors.push(`${rel(file)}: JSON inválido — ${e.message}`);
      continue;
    }
    push(file, validarPacote(doc, catalogo));
    if (doc?.code !== path.basename(file, ".json")) report.errors.push(`${rel(file)}: code "${doc?.code}" difere do nome do arquivo`);
    if (doc?.code === GENERIC_CODE) hasGeneric = true;
    for (const c of doc?.fields ?? []) {
      if (served.has(c)) report.errors.push(`${rel(file)}: ramo "${c}" já é servido por ${served.get(c)}`);
      served.set(c, rel(file));
    }
  }
  if (packFiles.length && !hasGeneric) report.errors.push(`${rel(packsDir)}: falta o pacote genérico (${GENERIC_CODE}.json)`);
  if (catalogo?.fields) {
    for (const f of catalogo.fields) if (!served.has(f.code)) report.warnings.push(`${rel(fieldsFile)}: ramo "${f.code}" ainda sem pacote (usa o genérico)`);
  }
  return report;
}

function main(argv) {
  const json = argv.includes("--json");
  const ramos = [];
  const pacotes = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--ramos" && argv[i + 1]) ramos.push(argv[++i]);
    else if (argv[i] === "--pacote" && argv[i + 1]) pacotes.push(argv[++i]);
  }
  let report;
  if (!ramos.length && !pacotes.length) {
    report = validarTudo();
  } else {
    report = { errors: [], warnings: [], files: 0 };
    const catalogo = fs.existsSync(FIELDS_FILE) ? readJson(FIELDS_FILE) : null;
    const run = (file, fn) => {
      report.files += 1;
      try {
        const r = fn(readJson(file));
        r.errors.forEach((e) => report.errors.push(`${file}: ${e}`));
        r.warnings.forEach((w) => report.warnings.push(`${file}: ${w}`));
      } catch (e) {
        report.errors.push(`${file}: JSON inválido — ${e.message}`);
      }
    };
    for (const f of ramos) run(f, (doc) => validarRamos(doc));
    for (const p of pacotes) {
      const files = fs.statSync(p).isDirectory() ? fs.readdirSync(p).filter((f) => f.endsWith(".json")).sort().map((f) => path.join(p, f)) : [p];
      for (const f of files) run(f, (doc) => validarPacote(doc, catalogo));
    }
  }
  if (json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    for (const w of report.warnings) process.stdout.write(`aviso  ${w}\n`);
    for (const e of report.errors) process.stdout.write(`ERRO   ${e}\n`);
    process.stdout.write(`${report.files} arquivo(s): ${report.errors.length} erro(s), ${report.warnings.length} aviso(s)\n`);
  }
  process.exitCode = report.errors.length ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
