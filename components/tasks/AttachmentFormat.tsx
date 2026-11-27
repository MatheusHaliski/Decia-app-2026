"use client";
/**
 * Formato de um anexo/evidência: ícone do tipo + "Família · Variante · detalhes" (ex.: "Planilha · CSV · UTF-8, ponto e vírgula") e a
 * marca "estimado" quando o formato foi deduzido no navegador pela extensão/MIME (o servidor ainda não devolveu o tipo real). Com o
 * formato pedido na tarefa, avisa quando o anexo não corresponde (texto + marca, nunca só cor).
 */
import { FileTypeIcon } from "@/components/fileicons/FileTypeIcon";
import { useI18n } from "@/lib/i18n/useI18n";
import { attachmentFormat, fieldsFor, matchesFormat, type AttachmentFormatInput, type FormatChoice } from "@/lib/tasks/formats";

/** Texto "Família · Variante · detalhes" de um formato (detalhes de select traduzidos; booleano marcado = nome do campo). */
export function useFormatText() {
  const { t } = useI18n();
  return (f: FormatChoice) => {
    if (!f.family) return "";
    const details = fieldsFor(f.family, f.variant).flatMap((field) => {
      const v = f.details[field.key];
      if (!v) return [];
      if (field.kind === "bool") return v === "true" ? [t(`taskForm.fmt.field.${field.key}`)] : [];
      return [field.kind === "select" ? t(`taskForm.fmt.opt.${field.key}.${v}`) : v];
    });
    return [t(`taskForm.fmt.familyName.${f.family}`), f.variant ? t(`taskForm.fmt.variantName.${f.variant}`) : "", details.join(", ")].filter(Boolean).join(" · ");
  };
}

export function AttachmentFormat({ a, asked, iconSize = 22 }: { a: AttachmentFormatInput; asked?: FormatChoice; iconSize?: number }) {
  const { t } = useI18n();
  const text = useFormatText();
  const got = attachmentFormat(a);
  const ok = asked ? matchesFormat(asked, a) : null;
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-[length:var(--ws-text-caption)]" data-testid="attachment-format"
      data-family={got?.format.family ?? ""} data-variant={got?.format.variant ?? ""} data-estimated={got?.estimated ?? false} data-match={ok === null ? "na" : String(ok)}>
      <FileTypeIcon name={a.fileName} mime={a.mimeType} size={iconSize} />
      <span className="text-ws-text">{got ? text(got.format) : t("taskForm.fmt.unknown")}</span>
      {got?.estimated ? <span className="text-ws-text-muted">({t("taskForm.fmt.estimated")})</span> : null}
      {ok === false && asked ? (
        <span className="rounded-[var(--ws-radius-sm)] bg-ws-warning-soft px-1 text-ws-warning-ink" data-testid="format-mismatch">
          <span aria-hidden>! </span>{t("taskForm.fmt.mismatch", { asked: text(asked) })}
        </span>
      ) : null}
    </span>
  );
}
