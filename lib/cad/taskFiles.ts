/**
 * Anexos de uma tarefa persistida que a bancada sabe ler (.dxf, .ifc, .glb, .dwg): lista pela API de anexos da tarefa e
 * baixa os bytes do PRÓPRIO servidor do Work Station para ler no navegador — o arquivo não vai a nenhum outro lugar. Sem a API
 * (ou sem permissão), a lista fica vazia e a pessoa escolhe o arquivo no computador.
 */
import { api } from "@/lib/api/client";
import { ACCEPTED_EXTENSIONS, extensionOf } from "./read";

export interface TaskFile {
  id: string;
  name: string;
  sizeBytes: number | null;
}

interface AttachmentLite {
  id?: string;
  fileName?: string;
  sizeBytes?: number;
  available?: boolean;
  scanStatus?: string;
}

const path = (taskId: string) => `/api/tasks/${encodeURIComponent(taskId)}/attachments`;

/** Anexos legíveis (extensão aceita, disponível, sem vírus detectado). Falha da API = lista vazia. */
export async function readableTaskFiles(taskId: string): Promise<TaskFile[]> {
  try {
    const list = await api.get<AttachmentLite[]>(path(taskId));
    if (!Array.isArray(list)) return [];
    return list
      .filter((a) => a.id && a.fileName && a.available !== false && a.scanStatus !== "INFECTADO")
      .filter((a) => (ACCEPTED_EXTENSIONS as readonly string[]).includes(extensionOf(a.fileName!)))
      .map((a) => ({ id: a.id!, name: a.fileName!, sizeBytes: typeof a.sizeBytes === "number" ? a.sizeBytes : null }));
  } catch {
    return [];
  }
}

/** Bytes do anexo (com a sessão) — só depois de conferir o teto de tamanho pelo `sizeBytes`. */
export function taskFileContent(taskId: string, fileId: string): Promise<Blob> {
  return api.get<Blob>(`${path(taskId)}/${encodeURIComponent(fileId)}/content`, { headers: { Accept: "*/*" } });
}
