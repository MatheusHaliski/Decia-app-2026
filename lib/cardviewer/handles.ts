/**
 * Pasta local ligada a uma tarefa/projeto ("Este computador"): o handle da File System Access API fica no IndexedDB DESTE navegador,
 * por conta e por card (`<conta>:<tipo>:<id>`). Nada vai ao servidor. Guardar o handle não dá acesso: ao voltar, a tela só pede
 * permissão de novo com um gesto da pessoa (`requestPermission`), e nunca lê a pasta sem isso.
 */
const DB = "ws-cardviewer";
const STORE = "dirs";

export const handleKey = (account: string, kind: string, id: string) => `${account || "anon"}:${kind}:${id}`;

/** O navegador oferece o seletor de pasta (Chrome/Edge no computador; Safari e Firefox ainda não). */
export const supportsDirectoryPicker = () => typeof window !== "undefined" && typeof (window as unknown as { showDirectoryPicker?: unknown }).showDirectoryPicker === "function";

function open(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") return resolve(null);
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | undefined> {
  const db = await open();
  if (!db) return undefined;
  return new Promise((resolve) => {
    try {
      const r = run(db.transaction(STORE, mode).objectStore(STORE));
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => resolve(undefined);
    } catch {
      resolve(undefined);
    }
  });
}

export const saveDirHandle = (key: string, handle: unknown) => tx("readwrite", (s) => s.put(handle, key)).then(() => undefined);
export const loadDirHandle = <T>(key: string) => tx<T>("readonly", (s) => s.get(key) as IDBRequest<T>);
export const forgetDirHandle = (key: string) => tx("readwrite", (s) => s.delete(key)).then(() => undefined);
