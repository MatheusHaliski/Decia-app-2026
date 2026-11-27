#!/usr/bin/env node
// Curadoria reprodutível dos pacotes de profissão (contracts/career/occupation-packs/*.json), auditoria de 27/11/2026:
//  1. D-156 — `system.defaultAutonomy` é teto e nunca passa de SOB_SOLICITACAO (o pacote só restringe; D-136);
//  2. trilha "Carreira" — currículo, perfil profissional (bio/resumo) e plano 30-60-90 são modelos de CARREIRA, não tarefas de
//     trabalho: ganham `"track": "carreira"` e saem dos modelos de trabalho do criador (lib/tasks/templates.ts `packTemplates`);
//  3. tipo de tarefa — infográfico, fluxo, mapa, portfólio… não são DESENHO_TECNICO: cada tarefa de desenho (D1–D10 e as próprias
//     do campo no Drawings) e as próprias do campo com tipo próprio ganham `"taskType"` com um TaskType existente da API;
//  4. Ciências Contábeis — modelos próprios da área (conciliação, demonstrações, calendário de obrigações) no lugar dos genéricos.
// Edita o texto dos JSON sem reformatá-los (só as chaves tocadas mudam). Idempotente: rodar de novo não muda nada.
// Uso: node scripts/career/curar-pacotes.mjs [--check]   (--check: só confere; sai com 1 se algum pacote precisar de curadoria)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const PACKS_DIR = path.join(ROOT, "contracts/career/occupation-packs");

export const AUTONOMY_MODES = ["MANUAL", "SOB_SOLICITACAO", "SUGESTOES", "ASSISTIDO", "AGENTE"];
export const PACK_AUTONOMY_CEILING = "SOB_SOLICITACAO";
export const capAutonomy = (mode) =>
  AUTONOMY_MODES.indexOf(mode) > AUTONOMY_MODES.indexOf(PACK_AUTONOMY_CEILING) || !AUTONOMY_MODES.includes(mode) ? PACK_AUTONOMY_CEILING : mode;

/* ── regras ──────────────────────────────────────────────────────────────────────────────────────────────── */

const norm = (s) => String(s ?? "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/** Título de modelo de carreira (vale para a pessoa, não para o trabalho da equipe). */
export const CAREER_TITLE = /curriculo|\bcv\b|perfil profissional|resumo de perfil|\bbio\b|texto de artista|30-60-90|carta de apresentacao|linkedin/;

/** Trilha da tarefa-guia: L1 (currículo) e L6 (perfil/bio) são sempre carreira; as demais, pelo título (30-60-90 etc.). */
export function trackOf(code, title) {
  if (code === "L1" || code === "L6") return "carreira";
  return CAREER_TITLE.test(norm(title)) ? "carreira" : "trabalho";
}

/**
 * Tipo de tarefa (TaskType da API) pelo título, na ordem: diagrama, mapa, apresentação, imagem, desenho técnico. Só tarefas de
 * desenho (D1–D10 ou próprias no Drawings) chegam aqui; as de texto ficam DOCUMENTO salvo regra de texto abaixo.
 */
export function drawingTypeOf(title) {
  const t = norm(title);
  if (/unifilar|p&id|vista explodida|planta|detalhe|corte|modelo 3d|protese/.test(t)) return "DESENHO_TECNICO";
  if (/painel de indicadores|dashboard de indicadores/.test(t)) return "PAINEL_DADOS";
  if (/infografico|cartaz|folder|moodboard|painel conceitual|identidade visual|storyboard|decupagem|material didatico|material de educacao|linha do tempo|remix|arranjo|releitura|press kit/.test(t)) return "IMAGEM_EDITADA";
  if (/fluxo|fluxograma|bpmn|diagrama|ishikawa|canvas|matriz|mapa de (argumento|publicos|palco|fluxo)|rede socioassistencial|pipeline|arquitetura|logica de clp|wireframe|ihm|supervisorio|rider|antes e depois de (um|uma) (processo|atividade|melhoria)|redesenho de uma atividade/.test(t)) return "DIAGRAMA";
  if (/prancha de (portfolio|campanha)/.test(t)) return "APRESENTACAO";
  if (/mapa|croqui georreferenciado|uso do solo/.test(t)) return "MAPA";
  if (/antes e depois|redesenho/.test(t)) return "IMAGEM_EDITADA";
  return "DESENHO_TECNICO";
}

/** Tarefas de texto com tipo próprio (planilha, cronograma); o resto é DOCUMENTO (o padrão, sem `taskType`). */
export function letterTypeOf(title) {
  const t = norm(title);
  if (/conciliacao|fluxo de caixa projetado|curva abc|forecast/.test(t)) return "PLANILHA";
  if (/calendario de obrigacoes|cronograma/.test(t)) return "CRONOGRAMA";
  return "DOCUMENTO";
}

export const typeOf = (editor, title) => (editor === "drawings" ? drawingTypeOf(title) : letterTypeOf(title));
/** Tipo que `packTemplates` usaria sem `taskType` (o legado): desenho → DESENHO_TECNICO, texto → DOCUMENTO. */
export const legacyType = (editor) => (editor === "drawings" ? "DESENHO_TECNICO" : "DOCUMENTO");

/** Modelos próprios de Ciências Contábeis (custom ≤ 4 pelo esquema): rotinas reais da área, não ETP nem termo de referência. */
export const ACCOUNTING_CUSTOM = [
  {
    id: "X2", editor: "letters", title: "Conciliação bancária de um mês com pendências explicadas", competency: "Conciliação e fechamento contábil",
    criteria: ["saldo do extrato e do razão no início e no fim do mês", "cada diferença com data, valor e causa", "lançamentos de ajuste propostos com contas de débito e crédito", "sem dado de cliente real"],
    evidence: "planilha de conciliação com memória de cálculo", time: "60 min", trigger: "Quer mostrar que sabe fechar o caixa de um mês?", level: 1,
  },
  {
    id: "X3", editor: "letters", title: "Balanço patrimonial e DRE de empresa fictícia com notas explicativas", competency: "Elaboração de demonstrações contábeis (CPC 26)",
    criteria: ["balanço fecha (ativo = passivo + patrimônio líquido)", "DRE com receita líquida, custos, despesas e resultado", "ao menos três notas explicativas com a norma (CPC) citada", "premissas da empresa fictícia declaradas"],
    evidence: "demonstrações em PDF com planilha anexa", time: "2 h", trigger: "Quer mostrar como você monta as demonstrações de um exercício?", level: 2,
  },
  {
    id: "X4", editor: "letters", title: "Calendário de obrigações acessórias do mês de uma empresa fictícia", competency: "Rotina fiscal e cumprimento de prazos",
    criteria: ["regime tributário da empresa declarado", "cada obrigação com prazo legal e norma (SPED, EFD, eSocial, DCTFWeb)", "responsável e conferência por obrigação", "alerta para prazos que caem em feriado ou fim de semana"],
    evidence: "cronograma do mês com a fonte de cada prazo", time: "45 min", trigger: "Quer mostrar que você organiza os prazos fiscais de um cliente?", level: 1,
  },
];

/* ── edição de texto sem reformatar ──────────────────────────────────────────────────────────────────────── */

/** Índice do `}`/`]` que fecha o `{`/`[` em `open`, respeitando strings. */
function closeOf(text, open) {
  let depth = 0;
  let inStr = false;
  for (let i = open; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (c === "\\") i++;
      else if (c === "\"") inStr = false;
      continue;
    }
    if (c === "\"") inStr = true;
    else if (c === "{" || c === "[") depth++;
    else if (c === "}" || c === "]") {
      depth--;
      if (depth === 0) return i;
    }
  }
  throw new Error("JSON desbalanceado");
}

/** Posição, no nível 1 do objeto [open, close], do valor da chave (ou -1). */
function keyAt(text, open, close, key) {
  let depth = 0;
  let inStr = false;
  let strStart = -1;
  for (let i = open; i <= close; i++) {
    const c = text[i];
    if (inStr) {
      if (c === "\\") i++;
      else if (c === "\"") {
        inStr = false;
        if (depth === 1 && text.slice(strStart, i + 1) === JSON.stringify(key) && /^\s*:/.test(text.slice(i + 1, i + 4))) return i + 1 + text.slice(i + 1).indexOf(":") + 1;
      }
      continue;
    }
    if (c === "\"") { inStr = true; strStart = i; }
    else if (c === "{" || c === "[") depth++;
    else if (c === "}" || c === "]") depth--;
  }
  return -1;
}

/** Define (ou remove, com `value === undefined`) uma chave de valor string/escalar no objeto que abre em `open`. */
function setKey(text, open, key, value) {
  const close = closeOf(text, open);
  const at = keyAt(text, open, close, key);
  if (at >= 0) {
    const m = /^\s*("(?:[^"\\]|\\.)*"|-?\d+(?:\.\d+)?|true|false|null)/.exec(text.slice(at));
    const end = at + m[0].length;
    if (value === undefined) {
      // remove `, "key": valor` (ou `"key": valor,` se for a primeira)
      const keyStart = text.lastIndexOf(JSON.stringify(key), at);
      const before = text.slice(open, keyStart);
      const comma = before.search(/,\s*$/);
      if (comma >= 0) return text.slice(0, open + comma) + text.slice(end);
      const after = /^\s*,\s*/.exec(text.slice(end));
      return text.slice(0, keyStart) + text.slice(end + (after ? after[0].length : 0));
    }
    return `${text.slice(0, at)} ${JSON.stringify(value)}${text.slice(end)}`;
  }
  if (value === undefined) return text;
  const body = text.slice(open + 1, close);
  if (body.includes("\n")) {
    const lastLine = body.trimEnd().split("\n").pop();
    const indent = /^\s*/.exec(lastLine)[0];
    const insertAt = open + 1 + body.trimEnd().length;
    return `${text.slice(0, insertAt)},\n${indent}${JSON.stringify(key)}: ${JSON.stringify(value)}${text.slice(insertAt)}`;
  }
  const insertAt = open + 1 + body.trimEnd().length;
  return `${text.slice(0, insertAt)}, ${JSON.stringify(key)}: ${JSON.stringify(value)}${text.slice(insertAt)}`;
}

/** Abre-chave do objeto/array que é valor de `key` no objeto que abre em `open`. */
function childOpen(text, open, key) {
  const close = closeOf(text, open);
  const at = keyAt(text, open, close, key);
  if (at < 0) return -1;
  return at + text.slice(at).search(/[{[]/);
}

/** Abre-chaves dos elementos-objeto de um array. */
function arrayItems(text, open) {
  const close = closeOf(text, open);
  const out = [];
  for (let i = open + 1; i < close; i++) {
    if (text[i] === "{") {
      out.push(i);
      i = closeOf(text, i);
    }
  }
  return out;
}

function indentOf(text, idx) {
  const lineStart = text.lastIndexOf("\n", idx) + 1;
  return /^\s*/.exec(text.slice(lineStart))[0];
}

function customBlock(task, indent) {
  const i2 = `${indent}  `;
  const lines = Object.entries(task).map(([k, v]) => `${i2}${JSON.stringify(k)}: ${JSON.stringify(v).replace(/","/g, "\", \"")}`);
  return `{\n${lines.join(",\n")}\n${indent}}`;
}

/* ── curadoria de um pacote ──────────────────────────────────────────────────────────────────────────────── */

/** Aplica as regras ao texto de um pacote; devolve `{ text, changes }`. */
export function curarTexto(text) {
  const changes = [];
  let doc = JSON.parse(text);
  const root = text.indexOf("{");

  // 1. D-156
  const sys = childOpen(text, root, "system");
  const capped = capAutonomy(doc.system.defaultAutonomy);
  if (capped !== doc.system.defaultAutonomy) {
    text = setKey(text, sys, "defaultAutonomy", capped);
    changes.push(`system.defaultAutonomy ${doc.system.defaultAutonomy} → ${capped}`);
  }

  // 4. Contábeis: modelos próprios da área
  if (doc.code === "ciencias-contabeis") {
    const gt = childOpen(text, root, "guidedTasks");
    const customOpen = childOpen(text, gt, "custom");
    const have = new Set(doc.guidedTasks.custom.map((c) => c.id));
    for (const task of ACCOUNTING_CUSTOM) {
      if (have.has(task.id)) continue;
      const close = closeOf(text, customOpen);
      const items = arrayItems(text, customOpen);
      if (items.length) {
        const indent = indentOf(text, items[0]);
        const lastEnd = closeOf(text, items[items.length - 1]) + 1;
        text = `${text.slice(0, lastEnd)},\n${indent}${customBlock(task, indent)}${text.slice(lastEnd)}`;
      } else {
        const outer = indentOf(text, customOpen);
        text = `${text.slice(0, customOpen + 1)}\n${outer}  ${customBlock(task, `${outer}  `)}\n${outer}${text.slice(close)}`;
      }
      changes.push(`guidedTasks.custom + ${task.id} ${task.title}`);
    }
    doc = JSON.parse(text);
  }

  // 2 e 3. trilha e tipo das tarefas-guia
  const gt = childOpen(text, root, "guidedTasks");
  const paramsOpen = childOpen(text, gt, "parameters");
  for (const [code, p] of Object.entries(doc.guidedTasks.parameters)) {
    const editor = code.startsWith("D") ? "drawings" : "letters";
    const track = trackOf(code, p.title) === "carreira" ? "carreira" : undefined;
    const type = typeOf(editor, p.title);
    const taskType = type === legacyType(editor) && editor === "letters" ? undefined : type;
    const objOpen = () => childOpen(text, paramsOpen, code);
    if (p.track !== track) { text = setKey(text, objOpen(), "track", track); changes.push(`${code} track → ${track ?? "trabalho"}`); }
    if (p.taskType !== taskType) { text = setKey(text, objOpen(), "taskType", taskType); changes.push(`${code} taskType → ${taskType ?? "DOCUMENTO"}`); }
  }
  doc = JSON.parse(text);
  const customOpen = childOpen(text, childOpen(text, root, "guidedTasks"), "custom");
  doc.guidedTasks.custom.forEach((c, i) => {
    const track = trackOf(c.id, c.title) === "carreira" ? "carreira" : undefined;
    const type = typeOf(c.editor, c.title);
    const taskType = type === legacyType(c.editor) && c.editor === "letters" ? undefined : type;
    const itemOpen = () => arrayItems(text, customOpen)[i];
    if (c.track !== track) { text = setKey(text, itemOpen(), "track", track); changes.push(`${c.id} track → ${track ?? "trabalho"}`); }
    if (c.taskType !== taskType) { text = setKey(text, itemOpen(), "taskType", taskType); changes.push(`${c.id} taskType → ${taskType ?? "DOCUMENTO"}`); }
  });
  JSON.parse(text); // a edição de texto tem de continuar sendo JSON válido
  return { text, changes };
}

export function curarTudo({ write = true, dir = PACKS_DIR } = {}) {
  const report = [];
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json")).sort()) {
    const file = path.join(dir, f);
    const before = fs.readFileSync(file, "utf8");
    const { text, changes } = curarTexto(before);
    if (changes.length) {
      report.push({ file: f, changes });
      if (write) fs.writeFileSync(file, text);
    }
  }
  return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes("--check");
  const report = curarTudo({ write: !check });
  for (const r of report) process.stdout.write(`${check ? "PENDENTE" : "curado  "} ${r.file}: ${r.changes.length} mudança(s)\n${r.changes.map((c) => `  - ${c}`).join("\n")}\n`);
  process.stdout.write(`${report.length} pacote(s) ${check ? "precisam de curadoria" : "curados"}\n`);
  process.exitCode = check && report.length ? 1 : 0;
}
