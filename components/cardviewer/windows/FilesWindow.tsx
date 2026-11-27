"use client";
/**
 * Janela "Arquivos e diretórios" da tarefa/projeto, em duas fontes:
 *  • Rede DECIA (nuvem): anexos e evidências REAIS da API em pastas virtuais (tipo, evidências, vínculos externos por provedor), com
 *    tamanho, data, abrir (imagem) e baixar pelo conteúdo autenticado. Sem API (laboratório/projetos): estrutura DEMO marcada.
 *  • Este computador: a pessoa escolhe uma pasta pela File System Access API — só com o gesto dela e a permissão do navegador. O
 *    handle fica no IndexedDB deste navegador (por conta e por card); ao voltar, a pasta só é lida de novo depois de um clique que
 *    pede a permissão. A árvore é listada aqui e nada vai ao servidor; "enviar este arquivo para a tarefa" usa o upload real de
 *    anexos, com confirmação. Navegador sem a API: explicação e a alternativa (enviar arquivo).
 */
import { useEffect, useMemo, useState } from "react";
import { Badge, Button, EmptyState, ErrorState, Input, Link, LoadingState, useToast } from "@/components/ui";
import { describeError } from "@/lib/api/client";
import { buildCloudTree, formatOfFile, readLocalTree, treeTotals, type FileNode, type LocalDirHandle } from "@/lib/cardviewer/files";
import { forgetDirHandle, handleKey, loadDirHandle, saveDirHandle, supportsDirectoryPicker } from "@/lib/cardviewer/handles";
import { demoCandidates } from "@/lib/cardviewer/demo";
import { wbsTree, type WbsTreeNode } from "@/lib/projects/derive";
import { useI18n } from "@/lib/i18n/useI18n";
import { attachmentsApi } from "@/lib/tasks/client";
import { formatBytes, formatDateTime, isBlob, openOrDownload } from "@/lib/tasks/files";
import { FileTypeIcon } from "@/components/fileicons/FileTypeIcon";
import { useViewerData } from "../context";

type Source = "nuvem" | "local";

/** Handle de pasta com os métodos de permissão (Chromium). */
type PermissionedDir = LocalDirHandle & {
  queryPermission?: (o: { mode: "read" }) => Promise<PermissionState>;
  requestPermission?: (o: { mode: "read" }) => Promise<PermissionState>;
};

export function FilesWindow() {
  const { t } = useI18n();
  const [source, setSource] = useState<Source>("nuvem");
  return (
    <div className="grid gap-3" data-testid="window-arquivos">
      <div role="group" aria-label={t("cardviewer.files.source")} className="flex flex-wrap gap-1">
        {(["nuvem", "local"] as const).map((s) => (
          <Button key={s} size="sm" variant={source === s ? "default" : "ghost"} aria-pressed={source === s} onClick={() => setSource(s)}>{t(`cardviewer.files.${s}`)}</Button>
        ))}
      </div>
      {source === "nuvem" ? <CloudFiles /> : <LocalFiles />}
    </div>
  );
}

/* ── árvore ──────────────────────────────────────────────────────────────────────────────────────────────── */

function TreeView({ nodes, label, actions }: { nodes: readonly FileNode[]; label: string; actions?: (n: FileNode) => React.ReactNode }) {
  return <ul aria-label={label} className="grid gap-0.5 text-[length:var(--ws-text-body-sm)]" data-testid="file-tree">{nodes.map((n) => <TreeItem key={n.id} node={n} actions={actions} />)}</ul>;
}

function TreeItem({ node, actions }: { node: FileNode; actions?: (n: FileNode) => React.ReactNode }) {
  const { t, intl } = useI18n();
  const name = node.labelKey ? t(node.labelKey) : node.name;
  if (node.kind === "folder") {
    const totals = treeTotals(node.children ?? []);
    return (
      <li data-node={node.id}>
        <details open>
          <summary className="flex cursor-pointer flex-wrap items-center gap-1.5 rounded-[var(--ws-radius-sm)] px-1 py-0.5 hover:bg-ws-surface-2">
            <span aria-hidden>▸ </span><span className="font-semibold">{name}</span>
            <span className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("cardviewer.files.folderCount", { n: totals.files })}</span>
          </summary>
          <ul className="ml-3 grid gap-0.5 border-l border-ws-border pl-2">{(node.children ?? []).map((c) => <TreeItem key={c.id} node={c} actions={actions} />)}</ul>
        </details>
      </li>
    );
  }
  return (
    <li className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 px-1 py-0.5" data-node={node.id}>
      {node.kind === "link" ? <span aria-hidden>↗</span> : <FileTypeIcon name={node.name} mime={node.mime} size={18} />}
      {node.kind === "link" && node.url ? <Link href={node.url}>{name}</Link> : <span className="min-w-0 [overflow-wrap:anywhere]">{name}</span>}
      {node.format ? (
        <span className="text-[length:var(--ws-text-caption)] text-ws-text-muted" data-format={`${node.format.family}/${node.format.variant}`} data-estimated={node.format.estimated}>
          {node.format.variant ? t("cardviewer.fmt.label", { family: t(`cardviewer.fmt.family.${node.format.family}`), variant: node.format.variant }) : t(`cardviewer.fmt.family.${node.format.family}`)}
          {node.format.estimated ? ` (${t("taskForm.fmt.estimated")})` : null}
        </span>
      ) : null}
      {node.size !== undefined ? <span className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{formatBytes(node.size, intl)}</span> : null}
      {node.date ? <span className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{formatDateTime(node.date, intl)}</span> : null}
      {node.evidenceCaption ? <span className="w-full pl-4 text-[length:var(--ws-text-caption)] text-ws-text-muted">“{node.evidenceCaption}”</span> : null}
      {node.unavailable ? <Badge tone="warning">{t("cardviewer.files.scanning")}</Badge> : null}
      {node.mime && node.kind === "link" ? <span className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t(`cardviewer.linkMode.${node.mime}`)}</span> : null}
      {actions ? <span className="ml-auto flex gap-1">{actions(node)}</span> : null}
    </li>
  );
}

/* ── nuvem ───────────────────────────────────────────────────────────────────────────────────────────────── */

function wbsNodes(tree: WbsTreeNode | null, tasks: readonly { wbsId?: string; code: string; title: string }[]): FileNode[] {
  if (!tree) return [];
  const conv = (n: WbsTreeNode): FileNode => {
    const items: FileNode[] = tasks.filter((x) => x.wbsId === n.node.id).map((x) => ({ id: `eap/${n.node.id}/${x.code}`, kind: "file", name: `${x.code} · ${x.title}` }));
    return { id: `eap/${n.node.id}`, kind: "folder", name: `${n.code} ${n.node.title}`, children: [...n.children.map(conv), ...items] };
  };
  return tree.children.length ? tree.children.map(conv) : [conv(tree)];
}

function CloudFiles() {
  const { t, intl } = useI18n();
  const { toast } = useToast();
  const { task, project } = useViewerData();

  const open = async (n: FileNode) => {
    if (!task || !n.attachmentId) return;
    try {
      const blob = await attachmentsApi.content(task.subject.id, n.attachmentId);
      if (isBlob(blob)) openOrDownload(blob, n.name, (n.mime ?? "").startsWith("image/") && n.mime !== "image/svg+xml");
    } catch (e) {
      toast({ title: t("cardviewer.files.openError"), description: describeError(e), tone: "erro" });
    }
  };

  if (task?.view) {
    const f = task.files;
    if (f.status === "loading") return <LoadingState label={t("cardviewer.files.loading")} />;
    if (f.status === "error") return <ErrorState title={t("cardviewer.files.loadError")} description={f.error} onRetry={f.reload} />;
    const s = task.subject;
    const tree = buildCloudTree(f.attachments, f.evidences, { sourceKind: s.sourceKind, sourceRef: s.sourceRef, linkMode: s.linkMode, references: s.references });
    const totals = treeTotals(tree);
    return (
      <section className="grid gap-2" aria-label={t("cardviewer.files.nuvem")}>
        <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted" aria-live="polite" data-testid="cloud-totals">{t("cardviewer.files.totals", { n: totals.files, size: formatBytes(totals.bytes, intl) })}</p>
        {tree.length ? (
          <TreeView nodes={tree} label={t("cardviewer.files.nuvem")} actions={(n) => n.attachmentId && !n.unavailable ? (
            <Button size="sm" variant="ghost" aria-label={t("cardviewer.files.openNamed", { name: n.name })} onClick={() => open(n)}>{(n.mime ?? "").startsWith("image/") && n.mime !== "image/svg+xml" ? t("cardviewer.files.open") : t("cardviewer.files.download")}</Button>
          ) : null} />
        ) : <EmptyState compact title={t("cardviewer.files.empty")} description={t("cardviewer.files.emptyHint")} />}
      </section>
    );
  }

  // sem API de arquivos: estrutura DEMO, marcada
  let nodes: FileNode[] = [];
  if (task) nodes = [{ id: "demo", kind: "folder", name: "demo", labelKey: "cardviewer.files.demoFolder", children: demoCandidates(task.subject.title).map((c) => ({ id: `demo/${c.id}`, kind: "file", name: c.name, mime: c.mime, format: formatOfFile(c.name, c.mime) })) }];
  else if (project?.subject.variant === "MESA") nodes = wbsNodes(wbsTree(project.subject.model.wbs), project.subject.model.tasks);
  else if (project?.subject.variant === "MURAL") {
    const st = project.subject.state;
    nodes = [{ id: "tarefas", kind: "folder", name: "tarefas", labelKey: "cardviewer.files.projectTasks", children: project.subject.project.taskIds.map((id) => ({ id: `t/${id}`, kind: "file" as const, name: st.tasks.find((x) => x.id === id)?.title ?? id })) }];
  }
  return (
    <section className="grid gap-2" aria-label={t("cardviewer.files.nuvem")}>
      <p className="flex flex-wrap items-center gap-1.5 text-[length:var(--ws-text-caption)] text-ws-text-muted">
        <Badge tone="warning">DEMO</Badge>{project ? t("cardviewer.files.projectDemo") : t("cardviewer.files.taskDemo")}
      </p>
      {nodes.length ? <TreeView nodes={nodes} label={t("cardviewer.files.nuvem")} /> : <EmptyState compact title={t("cardviewer.files.empty")} />}
    </section>
  );
}

/* ── este computador ─────────────────────────────────────────────────────────────────────────────────────── */

function LocalFiles() {
  const { t, intl } = useI18n();
  const { toast } = useToast();
  const { task, project, account, target } = useViewerData();
  const key = handleKey(account, target.kind, target.id);
  const supported = useMemo(() => supportsDirectoryPicker(), []);
  const [remembered, setRemembered] = useState<PermissionedDir | null>(null);
  const [tree, setTree] = useState<{ name: string; nodes: FileNode[]; truncated: boolean; count: number } | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<{ name: string; size?: number; file: () => Promise<File> } | null>(null);
  const canUpload = !!task?.view && task.subject.editable;

  // só lê o handle guardado (o NOME da pasta); a pasta em si não é lida sem um clique
  useEffect(() => {
    if (!supported) return;
    let alive = true;
    loadDirHandle<PermissionedDir>(key).then((h) => { if (alive && h && typeof h === "object" && "name" in h) setRemembered(h); });
    return () => { alive = false; };
  }, [key, supported]);

  const list = async (dir: PermissionedDir) => {
    setBusy(true);
    try {
      const r = await readLocalTree(dir);
      setTree({ name: dir.name, ...r });
      setStatus(t(r.truncated ? "cardviewer.local.listedTruncated" : "cardviewer.local.listed", { n: r.count, name: dir.name }));
    } catch (e) {
      setStatus(t("cardviewer.local.readError", { reason: describeError(e) }));
    } finally {
      setBusy(false);
    }
  };

  const choose = async () => {
    const picker = (window as unknown as { showDirectoryPicker?: (o: { mode: "read" }) => Promise<PermissionedDir> }).showDirectoryPicker;
    if (!picker) return;
    try {
      const dir = await picker({ mode: "read" });
      await saveDirHandle(key, dir);
      setRemembered(dir);
      await list(dir);
    } catch (e) {
      if ((e as { name?: string })?.name === "AbortError") setStatus(t("cardviewer.local.cancelled"));
      else setStatus(t("cardviewer.local.readError", { reason: describeError(e) }));
    }
  };

  const reopen = async () => {
    if (!remembered) return;
    const state = remembered.requestPermission ? await remembered.requestPermission({ mode: "read" }).catch(() => "denied" as PermissionState) : "granted";
    if (state !== "granted") {
      setStatus(t("cardviewer.local.denied"));
      return;
    }
    await list(remembered);
  };

  const forget = async () => {
    await forgetDirHandle(key);
    setRemembered(null);
    setTree(null);
    setStatus(t("cardviewer.local.forgotten"));
  };

  const upload = async () => {
    if (!confirm || !task) return;
    setBusy(true);
    try {
      const file = await confirm.file();
      await attachmentsApi.upload(task.subject.id, file, confirm.name);
      toast({ title: t("cardviewer.local.uploaded", { name: confirm.name }), tone: "sucesso" });
      setStatus(t("cardviewer.local.uploaded", { name: confirm.name }));
      task.files.reload();
    } catch (e) {
      toast({ title: t("cardviewer.local.uploadError"), description: describeError(e), tone: "erro" });
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  const uploadNote = canUpload ? null : <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t(project ? "cardviewer.local.noUploadProject" : task?.view ? "cardviewer.local.noUploadReadOnly" : "cardviewer.local.noUploadDemo")}</p>;

  return (
    <section className="grid gap-2" aria-label={t("cardviewer.files.local")} data-testid="local-files">
      <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("cardviewer.local.privacy")}</p>
      {!supported ? (
        <div className="grid gap-2 rounded-[var(--ws-radius-md)] bg-ws-info-soft p-2 text-[length:var(--ws-text-body-sm)]" data-testid="local-unsupported">
          <p>{t("cardviewer.local.unsupported")}</p>
          {canUpload ? (
            <label className="grid gap-1">
              <span className="font-semibold">{t("cardviewer.local.fallback")}</span>
              <Input type="file" onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setConfirm({ name: f.name, size: f.size, file: async () => f });
              }} />
            </label>
          ) : uploadNote}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="primary" onClick={choose} busy={busy}>{t(tree ? "cardviewer.local.chooseOther" : "cardviewer.local.choose")}</Button>
            {remembered && !tree ? <Button size="sm" onClick={reopen} busy={busy}>{t("cardviewer.local.reopen", { name: remembered.name })}</Button> : null}
            {remembered ? <Button size="sm" variant="ghost" onClick={forget}>{t("cardviewer.local.forget")}</Button> : null}
          </div>
          {uploadNote}
          {tree ? (
            tree.nodes.length ? (
              <TreeView nodes={tree.nodes} label={t("cardviewer.local.treeLabel", { name: tree.name })} actions={(n) => n.kind === "file" && n.file && canUpload ? (
                <Button size="sm" variant="ghost" aria-label={t("cardviewer.local.sendNamed", { name: n.name })} onClick={() => setConfirm({ name: n.name, size: n.size, file: n.file! })}>{t("cardviewer.local.send")}</Button>
              ) : null} />
            ) : <EmptyState compact title={t("cardviewer.local.emptyFolder")} />
          ) : null}
        </>
      )}
      {confirm ? (
        <div role="alertdialog" aria-labelledby="cv-upload-q" className="grid gap-2 rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-2 p-2" data-testid="upload-confirm">
          <p id="cv-upload-q" className="text-[length:var(--ws-text-body-sm)]">{t("cardviewer.local.confirm", { name: confirm.name, size: formatBytes(confirm.size, intl), title: task?.subject.title ?? "" })}</p>
          <div className="flex gap-2">
            <Button size="sm" variant="primary" onClick={upload} busy={busy}>{t("cardviewer.local.confirmSend")}</Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirm(null)}>{t("common.cancel")}</Button>
          </div>
        </div>
      ) : null}
      <p aria-live="polite" className="text-[length:var(--ws-text-caption)] text-ws-text-muted" data-testid="local-status">{status}</p>
    </section>
  );
}
