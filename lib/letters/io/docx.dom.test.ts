// @vitest-environment jsdom
/** Conferência independente do XML do DOCX: o DOMParser do jsdom (outro analisador) aceita todas as partes. */
import { describe, expect, it } from "vitest";
import { docxParts } from "./docx";
import { samplePiece } from "./testkit";

describe("DOCX exportado — XML bem formado por um analisador independente", () => {
  it("nenhuma parte gera parsererror", () => {
    const piece = { ...samplePiece(), title: 'T & <x> "y"' };
    for (const part of docxParts(piece)) {
      const doc = new DOMParser().parseFromString(part.data, "application/xml");
      expect(doc.getElementsByTagName("parsererror"), part.name).toHaveLength(0);
      expect(doc.documentElement.namespaceURI, part.name).toMatch(/^http:\/\/schemas\.openxmlformats\.org\//);
    }
  });
});
