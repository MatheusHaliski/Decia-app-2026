"use client";
/** Desenho SVG de uma forma 2D (traço por token da camada). Serve à prancheta, à prévia fantasma e às miniaturas. */
import { cn } from "@/components/ui";
import { cotaLine, measureMeters, type Shape2D } from "@/lib/drawings2d/model";

export interface ShapeSvgProps {
  shape: Shape2D;
  strokeClass: string;
  textClass: string;
  width: number;
  metersPerUnit: number;
  formatMeters: (m: number) => string;
  dash?: string;
  dx?: number;
  dy?: number;
}

export function ShapeSvg({ shape, strokeClass, textClass, width, metersPerUnit, formatMeters, dash, dx = 0, dy = 0 }: ShapeSvgProps) {
  const g = shape.geom;
  const common = { className: cn("fill-none", strokeClass), strokeWidth: width, strokeDasharray: dash, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, vectorEffect: "non-scaling-stroke" as const };
  const body = (() => {
    switch (g.kind) {
      case "linha":
        return <line x1={g.a.x} y1={g.a.y} x2={g.b.x} y2={g.b.y} {...common} />;
      case "polilinha": {
        const points = g.points.map((p) => `${p.x},${p.y}`).join(" ");
        return g.closed ? <polygon points={points} {...common} /> : <polyline points={points} {...common} />;
      }
      case "retangulo":
        return <rect x={g.x} y={g.y} width={g.w} height={g.h} {...common} />;
      case "circulo":
        return <circle cx={g.cx} cy={g.cy} r={g.r} {...common} />;
      case "texto":
        return <text x={g.x} y={g.y} fontSize={g.size} className={cn("select-none", textClass)}>{g.text}</text>;
      case "cota": {
        const { a2, b2, mid } = cotaLine(g);
        const vertical = Math.abs(g.b.y - g.a.y) > Math.abs(g.b.x - g.a.x);
        const thin = { ...common, strokeWidth: 1 };
        const tick = (p: { x: number; y: number }) => <line x1={p.x - 4} y1={p.y + 4} x2={p.x + 4} y2={p.y - 4} {...common} />;
        return (
          <g>
            <line x1={g.a.x} y1={g.a.y} x2={a2.x} y2={a2.y} {...thin} />
            <line x1={g.b.x} y1={g.b.y} x2={b2.x} y2={b2.y} {...thin} />
            <line x1={a2.x} y1={a2.y} x2={b2.x} y2={b2.y} {...common} />
            {tick(a2)}
            {tick(b2)}
            <text x={mid.x} y={mid.y - 6} fontSize={13} textAnchor="middle" transform={vertical ? `rotate(-90 ${mid.x} ${mid.y})` : undefined} className={cn("select-none", textClass)}>
              {formatMeters(measureMeters(g, metersPerUnit))}
            </text>
          </g>
        );
      }
    }
  })();
  return dx || dy ? <g transform={`translate(${dx} ${dy})`}>{body}</g> : body;
}
