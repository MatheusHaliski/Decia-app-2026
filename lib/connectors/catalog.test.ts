import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { MESSAGES } from "@/lib/i18n/core";
import { TASK_TYPE_NAMES } from "@/lib/tasks/client";
import {
  ALL_SOURCE_KINDS, ALL_TASK_TYPES, BASE_TASK_TYPES, CONNECTOR_TASK_TYPES, ECOSYSTEMS, ECOSYSTEM_PROVIDER, EXCLUDED_SOURCE_KINDS, LEGACY_SOURCE_KINDS,
  LINK_RULES, SOURCE_CATALOG, SOURCE_ITEMS, SOURCE_KINDS, SOURCE_KIND_MAX, ecosystemInfo, filterItems, inferLinkSource, itemsByEcosystem,
  itemsBySourceKind, linkRulePattern, sourceKindEntry,
} from "./catalog";

const PREFIX = { google: "GOOGLE_", microsoft: "MS_", apple: "APPLE_" } as const;
const ENUM_VALUE = /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/;

/** Guarda de `contracts/connectors/sources.json` (pesquisa consolidada de 09/11/2026, sem contatos). */
describe("catálogo de fontes externas (contracts/connectors/sources.json)", () => {
  it("três ecossistemas com a pesquisa inteira menos os contatos (Google 25, Microsoft 26, Apple 15)", () => {
    expect(SOURCE_CATALOG.schemaVersion).toBe(1);
    expect(SOURCE_CATALOG.ecosystems.map((e) => e.id)).toEqual([...ECOSYSTEMS]);
    expect(ECOSYSTEMS.map((e) => itemsByEcosystem(e).length)).toEqual([25, 26, 15]);
    for (const eco of ECOSYSTEMS) {
      const info = ecosystemInfo(eco)!;
      expect(info.provider).toBe(ECOSYSTEM_PROVIDER[eco]);
      expect(info.items, eco).toBe(itemsByEcosystem(eco).length);
      expect(info.researchItems - info.items, `${eco}: só o item de contatos sai`).toBe(1);
      expect(info.sources.length, eco).toBeGreaterThan(0);
      for (const s of info.sources) expect(s.url, s.title).toMatch(/^https:\/\//);
    }
    expect(SOURCE_ITEMS).toHaveLength(66);
  });

  it("todo item tem os campos obrigatórios e valores do contrato", () => {
    const ids = new Set<string>();
    for (const it of SOURCE_ITEMS) {
      for (const f of ["id", "app", "artifact", "api", "notes", "linkableHow"] as const) expect(it[f].trim(), `${it.id}.${f}`).not.toBe("");
      for (const f of ["nativeMime", "extensions", "exportFormats", "formats", "scopes", "via"] as const) {
        expect(Array.isArray(it[f]), `${it.id}.${f}`).toBe(true);
        for (const v of it[f]) expect(typeof v === "string" && v.trim().length > 0, `${it.id}.${f}`).toBe(true);
      }
      expect(it.id).toBe(`${it.sourceKind}.${it.taskType}`);
      expect(ids.has(it.id), `id repetido: ${it.id}`).toBe(false);
      ids.add(it.id);
      expect(it.provider).toBe(ECOSYSTEM_PROVIDER[it.ecosystem]);
      expect(["SIM", "PARCIAL", "NAO"]).toContain(it.linkable);
      for (const v of it.via) expect(["CONTA", "LINK"]).toContain(v);
      for (const f of it.formats) expect(f).toMatch(/^[A-Z0-9]{2,8}$/);
      // Apple não tem API pública (sem escopo); Google e Microsoft dizem o escopo mínimo de leitura
      if (it.ecosystem === "apple") expect(it.scopes, it.id).toEqual([]);
      else expect(it.scopes.length, it.id).toBeGreaterThan(0);
      // "CONTA" só para o que os escopos mínimos do conector alcançam (Drive / Files.Read); a Apple nunca
      if (it.via.includes("CONTA")) expect(it.ecosystem, it.id).not.toBe("apple");
    }
  });

  it("sourceKind: MAIÚSCULAS, ≤ 20 caracteres (VARCHAR(20)), um por aplicativo, sem repetir os 17 de antes nem os contatos", () => {
    const kinds = SOURCE_KINDS.map((k) => k.sourceKind);
    expect(new Set(kinds).size, "sourceKind repetido na tabela").toBe(kinds.length);
    expect(new Set(ALL_SOURCE_KINDS).size, "colide com um SourceKind de antes").toBe(ALL_SOURCE_KINDS.length);
    expect(LEGACY_SOURCE_KINDS).toHaveLength(17);
    for (const kind of ALL_SOURCE_KINDS) {
      expect(kind, kind).toMatch(ENUM_VALUE);
      expect(kind.length, kind).toBeLessThanOrEqual(SOURCE_KIND_MAX);
    }
    for (const entry of SOURCE_KINDS) {
      expect(entry.sourceKind.startsWith(PREFIX[entry.ecosystem]), entry.sourceKind).toBe(true);
      expect(entry.provider).toBe(ECOSYSTEM_PROVIDER[entry.ecosystem]);
      const items = itemsBySourceKind(entry.sourceKind);
      expect(items.length, `${entry.sourceKind} sem item`).toBeGreaterThan(0);
      expect(items.every((i) => i.ecosystem === entry.ecosystem), entry.sourceKind).toBe(true);
      expect(items.map((i) => i.taskType), `${entry.sourceKind}: taskType padrão`).toContain(entry.defaultTaskType);
    }
    for (const it of SOURCE_ITEMS) expect(sourceKindEntry(it.sourceKind), it.id).toBeTruthy();
    for (const excluded of EXCLUDED_SOURCE_KINDS) {
      expect(kinds).not.toContain(excluded);
      expect(SOURCE_ITEMS.some((i) => i.sourceKind === excluded)).toBe(false);
    }
    expect(kinds).toHaveLength(58);
  });

  it("taskType: os 15 de antes ou os 16 do contrato; taskTypeIsNew coerente e todos os 16 novos usados", () => {
    expect(BASE_TASK_TYPES).toHaveLength(15);
    expect(CONNECTOR_TASK_TYPES).toHaveLength(16);
    expect(new Set(ALL_TASK_TYPES).size).toBe(31);
    for (const v of ALL_TASK_TYPES) {
      expect(v).toMatch(ENUM_VALUE);
      expect(v.length, v).toBeLessThanOrEqual(30);
    }
    for (const it of SOURCE_ITEMS) {
      expect(ALL_TASK_TYPES as readonly string[], it.id).toContain(it.taskType);
      expect(it.taskTypeIsNew, it.id).toBe((CONNECTOR_TASK_TYPES as readonly string[]).includes(it.taskType));
    }
    expect(new Set(SOURCE_ITEMS.filter((i) => i.taskTypeIsNew).map((i) => i.taskType))).toEqual(new Set(CONNECTOR_TASK_TYPES));
    // a lista que o criador de tarefas oferece (espelho do enum, mantida pelo backend) não tem valor fora do catálogo
    for (const v of TASK_TYPE_NAMES) expect(ALL_TASK_TYPES as readonly string[], v).toContain(v);
  });

  it("rótulos em pt-BR, en e es para todo sourceKind (sourceKind.*) e todo taskType (social.taskType.*)", () => {
    for (const locale of ["pt-BR", "en", "es"] as const) {
      const cat = MESSAGES[locale];
      for (const kind of ALL_SOURCE_KINDS) expect(cat[`sourceKind.${kind}`], `${locale}: sourceKind.${kind}`).toBeTruthy();
      for (const v of ALL_TASK_TYPES) expect(cat[`social.taskType.${v}`], `${locale}: social.taskType.${v}`).toBeTruthy();
    }
  });

  it("todo motivo que o callback e a confirmação do backend devolvem (contrato OpenAPI) tem explicação em pt-BR, en e es", () => {
    const spec = JSON.parse(readFileSync(fileURLToPath(new URL("../../contracts/openapi/openapi.json", import.meta.url)), "utf8")) as {
      paths: Record<string, { get?: { summary?: string }; post?: { summary?: string } }>;
    };
    const callback = spec.paths["/api/connectors/oauth/callback"]?.get?.summary ?? "";
    const confirm = spec.paths["/api/connectors/oauth/confirm"]?.post?.summary ?? "";
    const fromCallback = /motivo=([A-Z_|]+)/.exec(callback)?.[1]?.split("|") ?? [];
    const fromConfirm = /reason=([A-Z_|]+)/.exec(confirm)?.[1]?.split("|") ?? [];
    expect(callback, "o callback devolve o segredo para concluir na sessão").toContain("conector=confirmar&pedido=");
    expect(fromCallback, "o resumo do callback lista os motivos (motivo=A|B|…)").toEqual(expect.arrayContaining(["ESTADO_INVALIDO", "ACESSO_NEGADO", "ERRO_INTERNO"]));
    expect(fromConfirm, "o resumo da confirmação lista os motivos (reason=A|B|…)").toEqual(expect.arrayContaining(["OUTRA_CONTA", "ESCOPO_INSUFICIENTE"]));
    for (const locale of ["pt-BR", "en", "es"] as const) {
      for (const code of new Set([...fromCallback, ...fromConfirm])) {
        expect(MESSAGES[locale][`connectors.return.reason.${code}`], `${locale}: connectors.return.reason.${code}`).toBeTruthy();
      }
    }
  });

  it("busca sem acento e sem caixa, por app, sourceKind, formato e rótulo da tela", () => {
    expect(filterItems(SOURCE_ITEMS, "keynote").map((i) => i.sourceKind)).toEqual(["APPLE_KEYNOTE"]);
    expect(filterItems(SOURCE_ITEMS, "  ").length).toBe(SOURCE_ITEMS.length);
    expect(filterItems(SOURCE_ITEMS, "ms_teams").length).toBe(4);
    expect(filterItems(itemsByEcosystem("microsoft"), "vsdx").map((i) => i.sourceKind)).toEqual(["MS_VISIO"]);
    // "Gravação de reunião" sem acento acha o tipo nos dois ecossistemas e o Gravador da Apple (o artefato fala de reunião)
    expect(filterItems(SOURCE_ITEMS, "GRAVACAO reuniao").map((i) => i.id)).toEqual(["GOOGLE_MEET.GRAVACAO_REUNIAO", "MS_TEAMS.GRAVACAO_REUNIAO", "APPLE_VOICE_MEMOS.AUDIO"]);
    // o rótulo traduzido que a tela passa também entra na busca
    expect(filterItems(SOURCE_ITEMS, "zzrotulo", (i) => (i.sourceKind === "APPLE_NOTES" ? ["Zzrótulo da tela"] : [])).map((i) => i.id)).toEqual(["APPLE_NOTES.NOTA"]);
  });
});

describe("importação por link (regras do contrato)", () => {
  const cases: [string, string][] = [
    ["https://docs.google.com/document/d/1AbC/edit", "GOOGLE_DOCS"],
    ["https://docs.google.com/spreadsheets/d/1AbC/edit#gid=0", "GOOGLE_SHEETS"],
    ["https://docs.google.com/presentation/d/1AbC/edit", "GOOGLE_SLIDES"],
    ["https://docs.google.com/forms/d/e/1AbC/viewform", "GOOGLE_FORMS"],
    ["https://docs.google.com/drawings/d/1AbC/edit", "GOOGLE_DRAWINGS"],
    ["https://drive.google.com/file/d/1AbC/view?usp=sharing", "GOOGLE_DRIVE"],
    ["https://sites.google.com/view/obra-escola", "GOOGLE_SITES"],
    ["https://onedrive.live.com/?cid=ABC&id=ABC!123", "MS_ONEDRIVE"],
    ["https://1drv.ms/w/s!AbC", "MS_ONEDRIVE"],
    ["https://secid.sharepoint.com/sites/obras/SitePages/Inicio.aspx", "MS_SHAREPOINT_PAGE"],
    ["https://secid.sharepoint.com/:w:/s/obras/EaBc?e=x1", "MS_ONEDRIVE"],
    ["https://www.icloud.com/pages/0aBcD#Relatorio", "APPLE_PAGES"],
    ["https://www.icloud.com/numbers/0aBcD#Planilha", "APPLE_NUMBERS"],
    ["https://www.icloud.com/keynote/0aBcD#Apresentacao", "APPLE_KEYNOTE"],
    ["https://www.icloud.com/iclouddrive/0aBcD#arquivo", "APPLE_ICLOUD_DRIVE"],
    ["https://www.icloud.com/freeform/0aBcD#Quadro", "APPLE_FREEFORM"],
    ["https://www.icloud.com/notes/0aBcD#Nota", "APPLE_NOTES"],
  ];

  it.each(cases)("%s → %s, vinculado, com o taskType da tabela", (url, kind) => {
    const m = inferLinkSource(url);
    expect(m?.sourceKind).toBe(kind);
    expect(m?.linkMode).toBe("VINCULADO");
    expect(m?.taskType).toBe(sourceKindEntry(kind)!.defaultTaskType);
  });

  it("o resto é recusado: http, outro host, caminho fora da lista, credenciais no link, texto que não é URL", () => {
    for (const url of [
      "http://docs.google.com/document/d/1/edit", "https://example.com/document/d/1", "https://docs.google.com/unknown/1",
      "https://docs.google.com/documents/d/1", "https://www.icloud.com/photos/#0aB", "https://icloud.com.evil.example/pages/1",
      "https://sharepoint.com/sites/x", "https://user:pw@drive.google.com/file/d/1", "javascript:alert(1)", "drive.google.com/file/d/1", "",
    ]) expect(inferLinkSource(url), url).toBeNull();
  });

  it("taskType por sourceKind: Docs → Documento, Slides → Apresentação, Freeform → Quadro branco, página do SharePoint → Página web", () => {
    expect(inferLinkSource("https://docs.google.com/presentation/d/1/edit")?.taskType).toBe("APRESENTACAO");
    expect(inferLinkSource("https://www.icloud.com/freeform/1#q")?.taskType).toBe("QUADRO_BRANCO");
    expect(inferLinkSource("https://x.sharepoint.com/sites/a/sitepages/b.aspx")?.taskType).toBe("PAGINA_WEB");
    expect(inferLinkSource("https://drive.google.com/drive/folders/1")?.taskType).toBe("DOCUMENTO");
  });

  it("toda regra aponta para um sourceKind do catálogo e a dica mostra o padrão", () => {
    for (const r of LINK_RULES) {
      expect(sourceKindEntry(r.sourceKind), r.sourceKind).toBeTruthy();
      expect(inferLinkSource(r.example.replaceAll("…", "x")), r.example).not.toBeNull();
    }
    expect(LINK_RULES.map(linkRulePattern)).toContain("*.sharepoint.com/…/SitePages/");
    expect(LINK_RULES.map(linkRulePattern)).toContain("docs.google.com/document");
  });
});
