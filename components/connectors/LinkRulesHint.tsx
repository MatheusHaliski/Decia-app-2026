"use client";
import { cn } from "@/components/ui";
import { LINK_RULES, linkRulePattern, linkRulesByEcosystem, sourceKindEntry, type Ecosystem } from "@/lib/connectors/catalog";
import { useConnectorLabels } from "./labels";

/** Dica da importação por link: os endereços aceitos (regras do contrato) e o que cada um vira — aplicativo e tipo de tarefa. */
export function LinkRulesHint({ ecosystem, className }: { ecosystem?: Ecosystem; className?: string }) {
  const L = useConnectorLabels();
  const rules = ecosystem ? linkRulesByEcosystem(ecosystem) : LINK_RULES;
  return (
    <ul className={cn("grid grid-cols-1 gap-1 text-[length:var(--ws-text-caption)]", className)} aria-label={L.t("connectors.link.acceptedList")} data-testid="link-rules">
      {rules.map((r) => {
        const entry = sourceKindEntry(r.sourceKind);
        return (
          <li key={linkRulePattern(r)} className="flex flex-wrap items-baseline gap-x-1.5 [overflow-wrap:anywhere]">
            <code className="font-[family-name:var(--ws-font-mono)] text-ws-text">{linkRulePattern(r)}</code>
            <span aria-hidden className="text-ws-text-muted">→</span>
            <span className="sr-only">{L.t("connectors.link.becomesSr")}</span>
            <span className="text-ws-text-muted">{L.kind(r.sourceKind)}{entry ? ` · ${L.type(entry.defaultTaskType)}` : ""}</span>
          </li>
        );
      })}
    </ul>
  );
}
