"use client";
import { createContext, useContext } from "react";
import type { PageEntry } from "@/lib/pages/registry";

/**
 * Entrada do registro da rota atual, fornecida pelo AppShell (lib/nav/currentPage.ts). O PageHeader lê daqui a ajuda "?" da tela;
 * fora do AppShell (testes de componente, auth) é `undefined` e nada muda.
 */
const CurrentPageCtx = createContext<PageEntry | undefined>(undefined);
export const CurrentPageProvider = CurrentPageCtx.Provider;
export const useCurrentPage = () => useContext(CurrentPageCtx);
