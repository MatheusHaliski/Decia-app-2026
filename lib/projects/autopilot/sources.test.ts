import { describe, expect, it } from "vitest";
import { decodeHeaderWords, emlToText, htmlToText, parseEml } from "./eml";
import { extractDemand } from "./extract";
import { AUTOPILOT_LIMITS, decodeText, markdownToText, readDemandBytes, sourceKindOf } from "./sources";

const utf8 = (s: string) => new TextEncoder().encode(s);
const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64");

const EML = [
  "From: =?UTF-8?Q?Fulana_de_Tal?= <fulana@exemplo.gov.br>",
  "To: Coordenação de Pessoas <cp@exemplo.gov.br>",
  `Subject: =?UTF-8?B?${b64("Pedido de capacitação")}?=`,
  "Date: Tue, 10 Nov 2026 14:00:00 -0300",
  "MIME-Version: 1.0",
  'Content-Type: multipart/alternative; boundary="b1"',
  "",
  "--b1",
  "Content-Type: text/plain; charset=utf-8",
  "Content-Transfer-Encoding: quoted-printable",
  "",
  "Prezados,",
  "Solicitamos a capacita=C3=A7=C3=A3o dos servidores no uso do novo sistema em 4=",
  "5 dias.",
  "--b1",
  "Content-Type: text/html; charset=utf-8",
  "",
  "<p>versão html ignorada</p>",
  "--b1--",
  "",
].join("\r\n");

describe("e-mail (.eml)", () => {
  it("cabeçalhos com palavras codificadas (RFC 2047), data, parte text/plain em quoted-printable", () => {
    const msg = parseEml(utf8(EML));
    expect(msg).toEqual({
      from: "Fulana de Tal <fulana@exemplo.gov.br>",
      to: "Coordenação de Pessoas <cp@exemplo.gov.br>",
      subject: "Pedido de capacitação",
      date: "2026-11-10",
      body: "Prezados,\nSolicitamos a capacitação dos servidores no uso do novo sistema em 45 dias.",
    });
  });

  it("vira texto com cabeçalho De/Para/Assunto/Data que o extrator entende (prazo contado da data da mensagem)", () => {
    const text = emlToText(parseEml(utf8(EML)));
    expect(text.startsWith("De: Fulana de Tal <fulana@exemplo.gov.br>\nPara: Coordenação de Pessoas")).toBe(true);
    const f = extractDemand(text, { now: new Date("2026-11-12T12:00:00") });
    expect(f.subject?.value).toBe("Pedido de capacitação");
    expect(f.referenceDate.value).toBe("2026-11-10");
    expect(f.deadline).toMatchObject({ date: "2026-12-25", kind: "DIAS_CORRIDOS", amount: 45 });
    expect(f.sender?.value).toBe("Fulana de Tal");
    expect(f.kind.value).toBe("CAPACITACAO");
  });

  it("só HTML em base64 (latin-1) vira texto com listas; palavras codificadas adjacentes se juntam", () => {
    const html = "<html><body><p>Of&iacute;cio n&ordm; 7</p><ul><li>elaborar o plano</li><li>treinar a equipe</li></ul></body></html>";
    const eml = ["Subject: x", "Content-Type: text/html; charset=iso-8859-1", "Content-Transfer-Encoding: base64", "", Buffer.from(html, "latin1").toString("base64")].join("\n");
    expect(parseEml(utf8(eml)).body).toBe("Ofício nº 7\n\n• elaborar o plano\n• treinar a equipe");
    expect(decodeHeaderWords("=?UTF-8?Q?Of=C3=ADcio?= =?UTF-8?Q?_n=C2=BA_7?=")).toBe("Ofício nº 7");
    expect(htmlToText("a<br>b &amp; c")).toBe("a\nb & c");
  });
});

describe("porta de entrada dos arquivos", () => {
  it("tipo pelo nome ou pelo MIME; formato não aceito é recusado", async () => {
    expect(sourceKindOf("Oficio.PDF")).toBe("PDF");
    expect(sourceKindOf("mensagem.eml")).toBe("EML");
    expect(sourceKindOf("notas.md")).toBe("MD");
    expect(sourceKindOf("x", "text/plain")).toBe("TXT");
    expect(sourceKindOf("planilha.xlsx")).toBeNull();
    expect(await readDemandBytes("planilha.xlsx", utf8("x"))).toEqual({ ok: false, reason: "FORMATO" });
    expect(await readDemandBytes("vazio.txt", new Uint8Array(0))).toEqual({ ok: false, reason: "VAZIO" });
  });

  it(".txt em UTF-8 ou em Windows-1252 (documento antigo) e .md sem marcação; texto longo é cortado no limite", async () => {
    expect(decodeText(Uint8Array.from([0x4f, 0x66, 0xed, 0x63, 0x69, 0x6f]))).toBe("Ofício");
    expect(await readDemandBytes("a.txt", utf8("﻿Prazo até 30/11/2026"))).toMatchObject({ ok: true, kind: "TXT", text: "Prazo até 30/11/2026", truncated: false });
    expect(markdownToText("# Pedido\n**Urgente**: [ver](http://x) `código`\n- elaborar o ETP")).toBe("Pedido\nUrgente: ver código\n- elaborar o ETP");
    const long = await readDemandBytes("longo.txt", utf8("a".repeat(AUTOPILOT_LIMITS.textChars + 10)));
    expect(long).toMatchObject({ ok: true, truncated: true });
    expect(long.ok && long.text.length).toBe(AUTOPILOT_LIMITS.textChars);
    expect(await readDemandBytes("m.eml", utf8(EML))).toMatchObject({ ok: true, kind: "EML" });
  });
});
