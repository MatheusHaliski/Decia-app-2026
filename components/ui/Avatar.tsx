"use client";
import { cn } from "./cn";

/**
 * Avatar / Monogram (DESIGN_SYSTEM.md §3, RF38.CA09): foto quando houver; senão o monograma (iniciais ou sigla do
 * departamento) sobre a cor do nó da malha (`Department.color`, TAXONOMIA §1.5). Cor sempre por token --ws-node-*.
 */
export type NodeColor = "red" | "yellow" | "green" | "blue" | "brown" | "orange";

export interface AvatarProps {
  /** nome completo para o alt/aria-label */
  name: string;
  src?: string | null;
  /** iniciais ou sigla (≤ 3 caracteres); calculado do nome se ausente */
  monogram?: string;
  node?: NodeColor | null;
  size?: number;
  /** forma: círculo (pessoa) ou "monitor" (instituição/departamento) */
  shape?: "circle" | "monitor";
  className?: string;
}

const NODE_BG: Record<NodeColor, string> = {
  red: "bg-ws-node-red text-ws-text", yellow: "bg-ws-node-yellow text-ws-text", green: "bg-ws-node-green text-ws-text",
  blue: "bg-ws-node-blue text-ws-text", brown: "bg-ws-node-brown text-ws-cream", orange: "bg-ws-node-orange text-ws-text",
};

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (first + last).toUpperCase() || "WS";
}

export function Avatar({ name, src, monogram, node, size = 32, shape = "circle", className }: AvatarProps) {
  const radius = shape === "circle" ? "rounded-full" : "rounded-[var(--ws-radius-monitor)]";
  const style = { width: size, height: size, fontSize: Math.max(10, Math.round(size * (monogram && monogram.length > 2 ? 0.3 : 0.4))) };
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element -- avatar vem da API/MinIO; next/image exigiria domínio fixo
    return <img src={src} alt={name} width={size} height={size} className={cn("shrink-0 object-cover", radius, className)} style={style} />;
  }
  const text = (monogram ?? initialsOf(name)).slice(0, 3);
  return (
    <span
      role="img"
      aria-label={name}
      className={cn("inline-flex shrink-0 items-center justify-center font-[family-name:var(--ws-font-mono)] font-bold leading-none tracking-tight select-none", radius, node ? NODE_BG[node] : "bg-ws-ink text-ws-cream", className)}
      style={style}
    >
      {text}
    </span>
  );
}

/** Monograma do departamento: mesma peça, forma de monitor, sigla em mono (RF38.CA09). */
export function Monogram(props: Omit<AvatarProps, "shape" | "src">) {
  return <Avatar {...props} shape="monitor" />;
}
