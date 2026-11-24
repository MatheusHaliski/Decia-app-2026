import { describe, expect, it } from "vitest";
import { MAX_BLOCK_CHARS } from "../pieces";
import { exportHtml, escapeHtml } from "./html";
import { importFile } from "./import";
import { IMPORT_LIMITS } from "./model";
import { samplePiece, TEST_LABELS } from "./testkit";

const enc = new TextEncoder();
const imp = (name: string, text: string | Uint8Array) => importFile({ name, bytes: typeof text === "string" ? enc.encode(text) : text });
const lossOf = (r: Awaited<ReturnType<typeof imp>>) => (r.ok ? Object.fromEntries(r.doc.losses.map((l) => [l.code, l.count])) : {});

describe("HTML exportado é escapado — sem script, com metadados e referências", () => {
  it("texto do usuário nunca vira marcação", () => {
    const piece = { ...samplePiece(), title: '<script>alert("x")</script>' };
    piece.blocks = [...piece.blocks, { id: "bx", kind: "PARAGRAFO", text: '<img src=x onerror="alert(1)"> & "aspas" \'simples\'' }];
    const html = exportHtml(piece, { ...TEST_LABELS, docTypeValue: "<b>tipo</b>" });
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/<img/i);
    expect(html).toContain("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
    expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; &quot;aspas&quot; &#39;simples&#39;");
    expect(html).toContain("&lt;b&gt;tipo&lt;/b&gt;");
    expect(html).toContain('<meta name="letters:doctype" content="RELATORIO_TECNICO">');
    expect(html).toContain('<section class="letters-references" data-letters="REFERENCIAS"');
    expect(html).toContain("<li>SILVA, João. Gestão documental. São Paulo: Atlas, 2020.</li>");
    expect(html).toContain("<dt>Revisão</dt><dd>1</dd>");
  });
  it("escapeHtml cobre os cinco caracteres", () => {
    expect(escapeHtml(`<a href="x" title='y'>&</a>`)).toBe("&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;");
  });
});

describe("importar HTML de fora — RF52.CA04/CA07", () => {
  it("descarta script, estilo, iframe e handlers com aviso; mantém o texto; tabela e link viram texto", async () => {
    const r = await imp("pagina.html", `<!doctype html><html lang="pt-BR"><head><title>Página &amp; teste</title><style>p{}</style><script>alert(1)</script></head>
      <body onload="steal()"><h1>Título</h1><p style="color:red">Olá <b>mundo</b> <a href="https://ex.com/a">link</a> <a href="javascript:alert(1)">mau</a>.</p>
      <script>document.cookie</script><iframe src="https://x"></iframe><img src="a.png" alt="foto">
      <ol><li>um</li><li>dois<ul><li>sub</li></ul></li></ol><blockquote><p>cit 1</p><p>cit 2</p></blockquote>
      <table><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>2</td></tr></table><h5>Nível 5</h5><form><input name="x"><p>no form</p></form></body></html>`);
    if (!r.ok) throw new Error(r.reason);
    expect(r.doc.meta).toMatchObject({ title: "Página & teste", language: "pt-BR" });
    expect(r.doc.blocks).toEqual([
      { kind: "TITULO", level: 1, text: "Título" },
      { kind: "PARAGRAFO", text: "Olá mundo link (https://ex.com/a) mau." },
      { kind: "LISTA", text: "um\ndois" },
      { kind: "LISTA", text: "sub" },
      { kind: "CITACAO", text: "cit 1\ncit 2" },
      { kind: "PARAGRAFO", text: "A | B" },
      { kind: "PARAGRAFO", text: "1 | 2" },
      { kind: "TITULO", level: 3, text: "Nível 5" },
    ]);
    expect(lossOf(r)).toMatchObject({ SCRIPT: 3, MIDIA_EMBUTIDA: 1, IMAGEM: 1, TABELA: 1, LINK: 2, LISTA_NUMERADA: 1, LISTA_ANINHADA: 1, TITULO_NIVEL: 2, FORMULARIO: 1, FORMATACAO_CARACTERE: 1, FORMATACAO_PARAGRAFO: 1 });
    expect(JSON.stringify(r.doc.blocks)).not.toMatch(/alert|cookie|steal/);
  });
});

describe("importar Markdown e texto — RF52.CA04", () => {
  it("Markdown: marcação em linha, imagem, código, tabela e front matter desconhecido entram no relatório", async () => {
    const r = await imp("nota.md", "---\ntitle: Nota técnica\nautor: Fulano\n---\n# Nota técnica\n\nTexto **forte**, *ênfase*, `código` e [site](https://ex.com).\n![figura](f.png)\n\n```js\nconsole.log(1)\n```\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n1. primeiro\n2. segundo\n\n> citação\n> continua\n\n---\n\n#### Fundo\n\nSubtítulo\n---------\n");
    if (!r.ok) throw new Error(r.reason);
    expect(r.doc.meta.title).toBe("Nota técnica");
    expect(r.doc.blocks).toEqual([
      { kind: "TITULO", level: 1, text: "Nota técnica" },
      { kind: "PARAGRAFO", text: "Texto forte, ênfase, código e site (https://ex.com)." },
      { kind: "PARAGRAFO", text: "console.log(1)" },
      { kind: "PARAGRAFO", text: "a | b\n1 | 2" },
      { kind: "LISTA", text: "primeiro\nsegundo" },
      { kind: "CITACAO", text: "citação\ncontinua" },
      { kind: "TITULO", level: 3, text: "Fundo" },
      { kind: "TITULO", level: 2, text: "Subtítulo" },
    ]);
    expect(lossOf(r)).toMatchObject({ METADADO: 1, FORMATACAO_CARACTERE: 3, LINK: 1, IMAGEM: 1, CODIGO: 1, TABELA: 1, LISTA_NUMERADA: 2, QUEBRA: 1, TITULO_NIVEL: 1 });
  });

  it("texto: parágrafos por linha em branco, títulos sublinhados, listas e referências depois de 'Referências'", async () => {
    const r = await imp("rascunho.txt", "Introdução\n==========\n\nParágrafo um\ncom duas linhas.\n\n- item a\n- item b\n\nReferências\n-----------\nSILVA, J. 2020.\nSOUZA, M. 2021.\n");
    if (!r.ok) throw new Error(r.reason);
    expect(r.doc.blocks).toEqual([
      { kind: "TITULO", level: 1, text: "Introdução" },
      { kind: "PARAGRAFO", text: "Parágrafo um\ncom duas linhas." },
      { kind: "LISTA", text: "item a\nitem b" },
      { kind: "TITULO", level: 2, text: "Referências" },
      { kind: "REFERENCIAS", text: "SILVA, J. 2020.\nSOUZA, M. 2021." },
    ]);
    expect(r.doc.losses).toEqual([]);
    expect(r.doc.encoding).toBe("utf-8");
  });

  it("texto em Windows-1252 (Latin-1) é lido com acentos", async () => {
    const r = await imp("antigo.txt", new Uint8Array([0x41, 0xe7, 0xe3, 0x6f])); // "Ação"
    expect(r.ok && r.doc.blocks[0]!.text).toBe("Ação");
    expect(r.ok && r.doc.encoding).toBe("windows-1252");
  });

  it("bloco maior que o teto do editor é partido (aproximado), sem perder texto", async () => {
    const long = Array.from({ length: 4000 }, (_, i) => `palavra${i}`).join(" ");
    const r = await imp("longo.txt", long);
    if (!r.ok) throw new Error(r.reason);
    expect(r.doc.blocks.length).toBeGreaterThan(1);
    expect(r.doc.blocks.every((b) => b.text.length <= MAX_BLOCK_CHARS)).toBe(true);
    expect(r.doc.blocks.map((b) => b.text).join(" ")).toBe(long);
    expect(lossOf(r)).toEqual({ BLOCO_LONGO: 1 });
  });
});

describe("recusas com motivo — RF52.CA07", () => {
  it("vazio, grande demais, formato desconhecido ou não suportado", async () => {
    expect(await imp("a.txt", "")).toMatchObject({ ok: false, reason: "VAZIO" });
    expect(await importFile({ name: "a.txt", bytes: new Uint8Array(IMPORT_LIMITS.maxBytes + 1) })).toMatchObject({ ok: false, reason: "GRANDE_DEMAIS" });
    expect(await imp("a.pdf", "%PDF-1.7")).toMatchObject({ ok: false, reason: "FORMATO_NAO_SUPORTADO", detail: "pdf" });
    expect(await imp("a.odt", "x")).toMatchObject({ ok: false, reason: "FORMATO_NAO_SUPORTADO" });
    expect(await imp("sem-extensao", "x")).toMatchObject({ ok: false, reason: "FORMATO_NAO_SUPORTADO" });
  });
  it("tipo real divergente da extensão e binário", async () => {
    expect(await imp("a.txt", "%PDF-1.7 ...")).toMatchObject({ ok: false, reason: "TIPO_DIVERGENTE" });
    expect(await imp("a.md", new Uint8Array([0x50, 0x4b, 3, 4, 0]))).toMatchObject({ ok: false, reason: "TIPO_DIVERGENTE" });
    expect(await imp("a.txt", new Uint8Array([0x61, 0, 0x62]))).toMatchObject({ ok: false, reason: "BINARIO" });
  });
  it("só espaços ou só script não tem conteúdo; blocos demais é conteúdo excessivo", async () => {
    expect(await imp("a.txt", "   \n\n  ")).toMatchObject({ ok: false, reason: "SEM_CONTEUDO" });
    expect(await imp("a.html", "<script>alert(1)</script>")).toMatchObject({ ok: false, reason: "SEM_CONTEUDO" });
    expect(await imp("a.txt", Array.from({ length: IMPORT_LIMITS.maxBlocks + 1 }, (_, i) => `p${i}`).join("\n\n"))).toMatchObject({ ok: false, reason: "CONTEUDO_EXCESSIVO" });
  });
});
