import fs from "node:fs";
import path from "node:path";
import { parseLegal, type LegalDoc } from "./markdown";

/** Lê um texto de docs/legal no servidor (build ou requisição). Só os dois arquivos conhecidos — nada vem da URL. */
const FILES = { TERMOS: "TERMOS_DE_USO.md", PRIVACIDADE: "POLITICA_DE_PRIVACIDADE.md" } as const;

export function loadLegal(kind: keyof typeof FILES): LegalDoc {
  return parseLegal(fs.readFileSync(path.join(process.cwd(), "docs", "legal", FILES[kind]), "utf8"));
}
