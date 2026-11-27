"use client";
import { useState } from "react";
import { Button, Link, Popover } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import type { HelpEntry } from "@/lib/nav/help";

/** Ajuda contextual "?" do PageHeader: um parágrafo sobre a tela e o próximo passo sugerido (lib/nav/help.ts). */
export function HelpButton({ help }: { help: HelpEntry }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const title = t("guide.help.title");
  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      label={title}
      align="start"
      width="w-[min(92vw,24rem)]"
      trigger={(
        <Button variant="ghost" size="sm" aria-label={t("guide.help.button")} data-testid="page-help" className="min-w-[var(--ws-control-sm)] rounded-[var(--ws-radius-pill)] border border-ws-border font-semibold">
          ?
        </Button>
      )}
    >
      <div className="grid gap-2 p-[var(--ws-space-2)] text-[length:var(--ws-text-body-sm)]">
        <p className="font-semibold">{title}</p>
        <p className="text-ws-text-muted">{t(`guide.help.${help.id}.text`)}</p>
        <p>
          <span className="font-semibold">{t("guide.help.nextStep")}</span>{" "}
          <Link href={help.next} onClick={() => setOpen(false)}>{t(`guide.help.${help.id}.next`)}</Link>
        </p>
      </div>
    </Popover>
  );
}
