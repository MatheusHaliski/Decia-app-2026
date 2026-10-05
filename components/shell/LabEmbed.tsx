"use client";
import { Badge, Button, Card } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";

/**
 * Incorpora um wireframe estático de docs/lab (cópia em public/lab-static, só tokens v1 + components.css) numa moldura.
 * A CSP do app (script-src com nonce) bloqueia os scripts inline do wireframe: os controles (perfil/tema) não funcionam
 * dentro da moldura — o botão "abrir" mostra o arquivo em outra aba, e o conteúdo real vive nas rotas do shell.
 */
export function LabEmbed({ file, title, source }: { file: string; title: string; source: string }) {
  const { t } = useI18n();
  const src = `/lab-static/${file}`;
  return (
    <Card padding="none" className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ws-border p-3">
        <div className="flex items-center gap-2 text-[length:var(--ws-text-body-sm)]">
          <Badge tone="spark">{t("common.lab")}</Badge>
          <span className="font-semibold">{title}</span>
          <code className="font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-caption)] text-ws-text-muted">{source}</code>
        </div>
        <div className="flex gap-2">
          <Button size="sm" href={src} target="_blank" rel="noopener noreferrer">{t("lab.openStatic")}</Button>
          <Button size="sm" variant="ghost" href={`https://github.com/MatheusHaliski/Decia-app-2026/blob/main/${source}`}>{t("lab.openSource")}</Button>
        </div>
      </div>
      <p className="border-b border-ws-border bg-ws-surface-2 px-3 py-2 text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("lab.embedNote")}</p>
      <iframe src={src} title={title} loading="lazy" sandbox="allow-same-origin" className="block h-[70dvh] w-full bg-ws-surface-1" />
    </Card>
  );
}
