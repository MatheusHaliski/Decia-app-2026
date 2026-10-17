/**
 * Laboratório (D-146): o repositório DEMO e o seletor de perfis só valem com `NEXT_PUBLIC_WS_LAB=on`. Módulo sem "use client" para o
 * servidor também poder perguntar (ex.: `/u/[username]` só recusa nomes fora das fixtures no laboratório).
 */
export const labMode = () => (process.env.NEXT_PUBLIC_WS_LAB ?? "").trim().toLowerCase() === "on";
