import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: { unoptimized: true },
  // o repositório pode ser aberto por worktree (lockfile duplicado): a raiz de rastreamento é sempre o próprio app
  outputFileTracingRoot: process.cwd(),
  // Desempenho: importar só os módulos usados dos pacotes com barril (index que reexporta dezenas de arquivos). Os Radix são
  // pacotes por componente (ganho pequeno, mas sem custo); three-mesh-bvh e three-gpu-pathtracer reexportam src/** inteiro.
  // `three` não entra: o build dele é um único módulo (three.module.js → three.core.js), sem barril a podar.
  experimental: {
    optimizePackageImports: [
      "@radix-ui/react-checkbox",
      "@radix-ui/react-dialog",
      "@radix-ui/react-popover",
      "@radix-ui/react-radio-group",
      "@radix-ui/react-switch",
      "@radix-ui/react-tabs",
      "@radix-ui/react-toast",
      "@radix-ui/react-tooltip",
      "three-mesh-bvh",
      "three-gpu-pathtracer",
    ],
  },
  // OWASP A05 — cabeçalhos em todas as respostas; a CSP com nonce por requisição vem do middleware.ts
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=(), payment=(), usb=(), interest-cohort=()" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
    ];
  },
};

export default nextConfig;
