"use client";
import type { ReactNode } from "react";
import { cn } from "./cn";

/** Item de menu (role menuitem/menuitemradio) para Popovers do shell: estado em texto (✓) além da cor. */
export interface MenuOptionProps {
  on?: boolean;
  onClick: () => void;
  children: ReactNode;
  lang?: string;
  role?: "menuitem" | "menuitemradio";
  className?: string;
}

export function MenuOption({ on = false, onClick, children, lang, role = "menuitemradio", className }: MenuOptionProps) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={role === "menuitemradio" ? on : undefined}
      lang={lang}
      onClick={onClick}
      className={cn(
        "flex w-full cursor-pointer items-center gap-2 rounded-[var(--ws-radius-md)] px-3 py-2 text-left text-[length:var(--ws-text-body-sm)] text-ws-text hover:bg-ws-surface-2 focus-visible:outline-none focus-visible:[box-shadow:var(--ws-focus-ring)]",
        on && "bg-ws-accent-soft font-semibold text-ws-accent-ink",
        className,
      )}
    >
      {role === "menuitemradio" ? <span className="w-4 text-center" aria-hidden>{on ? "✓" : ""}</span> : null}
      {children}
    </button>
  );
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return <p className="px-3 pt-2 font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-label)] uppercase tracking-[var(--ws-text-label--tracking)] text-ws-text-muted">{children}</p>;
}
