"use client";
/**
 * Configurações › Conta › Foto de perfil (RF3.CA05): envio por `POST /api/me/avatar` (multipart) e remoção por
 * `DELETE /api/me/avatar`. O navegador confere tipo e tamanho antes de enviar; o servidor confere o conteúdo, recorta ao centro
 * e grava JPEG sem EXIF/GPS. Depois de enviar ou remover, `reload()` da conta atualiza a barra e o perfil. A foto nunca vai
 * por `PATCH /api/me` (nada de URL externa).
 */
import { useEffect, useId, useRef, useState, type ChangeEvent } from "react";
import { Button, Dialog, Input } from "@/components/ui";
import { AVATAR_ACCEPT, AvatarFileError, accountApi, checkAvatarFile, type Me } from "@/lib/account/client";
import { ApiError, describeError } from "@/lib/api/client";
import type { Vars } from "@/lib/i18n/core";
import { useI18n } from "@/lib/i18n/useI18n";
import { ProfileAvatar } from "./ProfileAvatar";

type Translate = (key: string, vars?: Vars) => string;

const SERVER_CODES = ["ARQUIVO_GRANDE_DEMAIS", "TIPO_NAO_PERMITIDO", "TIPO_DIVERGENTE", "IMAGEM_INVALIDA", "IMAGEM_GRANDE_DEMAIS", "ARQUIVO_VAZIO", "ARQUIVO_INFECTADO"];

/** Mensagem clara para cada recusa: do navegador (nome e tamanho do arquivo) ou do servidor (pelo `code`; 413/415 sem código). */
export function avatarErrorMessage(e: unknown, t: Translate, intl = "pt-BR"): string {
  if (e instanceof AvatarFileError) {
    if (e.code === "TIPO_NAO_PERMITIDO") return t("account.avatar.error.localType", { name: e.fileName });
    if (e.code === "ARQUIVO_GRANDE_DEMAIS") {
      // arredonda para cima: 5 MB + 1 byte aparece como 5,1 MB, nunca "5 MB e o limite é 5 MB"
      const size = new Intl.NumberFormat(intl, { maximumFractionDigits: 1 }).format(Math.ceil((e.size / (1024 * 1024)) * 10) / 10);
      return t("account.avatar.error.localSize", { name: e.fileName, size });
    }
    return t("account.avatar.error.ARQUIVO_VAZIO");
  }
  if (e instanceof ApiError) {
    if (SERVER_CODES.includes(e.code)) return t(`account.avatar.error.${e.code}`);
    if (e.status === 413) return t("account.avatar.error.ARQUIVO_GRANDE_DEMAIS");
    if (e.status === 415) return t("account.avatar.error.TIPO_NAO_PERMITIDO");
  }
  return describeError(e);
}

export function AvatarSection({ me, name, locked, reload }: { me: Me; name: string; locked: boolean; reload: () => Promise<void> }) {
  const { t, intl } = useI18n();
  const headingId = useId();
  const helpId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<"upload" | "remove" | null>(null);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);
  const [status, setStatus] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [focusUpload, setFocusUpload] = useState(0);
  const hasPhoto = !!me.avatarUrl?.trim();

  // Ao concluir, o foco volta ao "Enviar foto" (o "Remover foto" some quando não há mais foto). O atraso deixa o diálogo
  // devolver o foco antes, para não ser sobrescrito.
  useEffect(() => {
    if (!focusUpload) return;
    const id = setTimeout(() => actionsRef.current?.querySelector<HTMLButtonElement>("[data-avatar-upload]")?.focus(), 0);
    return () => clearTimeout(id);
  }, [focusUpload]);

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite escolher o mesmo arquivo de novo
    if (!file) return;
    setStatus("");
    const problem = checkAvatarFile(file);
    if (problem) {
      setError({ title: t("account.avatar.uploadFailed"), message: avatarErrorMessage(new AvatarFileError(problem, file), t, intl) });
      return;
    }
    setError(null);
    setBusy("upload");
    setStatus(t("account.avatar.uploading"));
    try {
      await accountApi.uploadAvatar(file);
      await reload();
      setStatus(t("account.avatar.uploaded"));
      setFocusUpload((n) => n + 1);
    } catch (err) {
      setStatus("");
      setError({ title: t("account.avatar.uploadFailed"), message: avatarErrorMessage(err, t, intl) });
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    setError(null);
    setBusy("remove");
    setStatus(t("account.avatar.removing"));
    try {
      await accountApi.removeAvatar();
      await reload();
      setStatus(t("account.avatar.removed"));
      setConfirmOpen(false);
      setFocusUpload((n) => n + 1);
    } catch (err) {
      setStatus("");
      setConfirmOpen(false);
      setError({ title: t("account.avatar.removeFailed"), message: describeError(err) });
    } finally {
      setBusy(null);
    }
  };

  return (
    <section aria-labelledby={headingId} className="relative mb-[var(--ws-space-3)] grid gap-[var(--ws-space-2)] border-b border-ws-border pb-[var(--ws-space-3)]" data-testid="avatar-section">
      <h3 id={headingId} className="text-[length:var(--ws-text-body)] font-semibold">{t("account.avatar.title")}</h3>
      <div className="flex flex-wrap items-center gap-[var(--ws-space-3)]">
        <ProfileAvatar name={name} src={me.avatarUrl} size={72} />
        <div ref={actionsRef} className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="secondary" icon="perfil" data-avatar-upload="" data-testid="avatar-upload"
            busy={busy === "upload"} disabled={locked || busy !== null} aria-describedby={helpId}
            onClick={() => inputRef.current?.click()}>
            {t("account.avatar.upload")}
          </Button>
          {hasPhoto ? (
            <Button type="button" size="sm" variant="ghost" data-testid="avatar-remove" busy={busy === "remove"} disabled={locked || busy !== null}
              onClick={() => { setError(null); setConfirmOpen(true); }}>
              {t("account.avatar.remove")}
            </Button>
          ) : null}
        </div>
        <Input ref={inputRef} type="file" accept={AVATAR_ACCEPT} className="sr-only" tabIndex={-1} aria-label={t("account.avatar.inputLabel")}
          aria-describedby={helpId} disabled={locked || busy !== null} onChange={onFile} data-testid="avatar-input" />
      </div>
      <p id={helpId} className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("account.avatar.help")}</p>
      {error ? (
        <p role="alert" className="text-[length:var(--ws-text-body-sm)] font-medium text-ws-danger-ink" data-testid="avatar-error">
          <span className="font-semibold">{error.title}.</span> {error.message}
        </p>
      ) : null}
      <p role="status" aria-live="polite" className="sr-only" data-testid="avatar-status">{status}</p>

      <Dialog open={confirmOpen} onOpenChange={(o) => { if (!busy) setConfirmOpen(o); }} title={t("account.avatar.removeTitle")} description={t("account.avatar.removeDescription")}>
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" onClick={() => setConfirmOpen(false)} disabled={busy !== null}>{t("common.cancel")}</Button>
          <Button type="button" variant="danger" busy={busy === "remove"} onClick={remove} data-testid="avatar-remove-confirm">{t("account.avatar.removeConfirm")}</Button>
        </div>
      </Dialog>
    </section>
  );
}
