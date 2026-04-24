"use client";

import { usePathname } from "next/navigation";
import { Menu, Bell, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSyncStatus } from "@/hooks/use-sync-status";
import { cn } from "@/lib/utils";

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  "/":            { title: "Visão Geral",    subtitle: "Acompanhe seus indicadores financeiros" },
  "/fluxo-caixa": { title: "Fluxo de Caixa", subtitle: "Entradas, saídas e projeções" },
  "/obras":       { title: "Obras",          subtitle: "Gestão e acompanhamento de obras" },
  "/clientes":    { title: "Clientes",       subtitle: "Base de clientes cadastrados" },
  "/categorias":  { title: "Categorias",     subtitle: "Organização por categorias" },
  "/propostas":   { title: "Propostas",      subtitle: "Propostas comerciais" },
  "/contas":      { title: "Contas",         subtitle: "Controle de contas a pagar e receber" },
  "/relatorios":  { title: "Relatórios",     subtitle: "Exportação e análises" },
};

interface TopBarProps {
  onMenuClick?: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const pathname = usePathname();
  const { status } = useSyncStatus();

  const pageInfo = PAGE_TITLES[pathname] || { title: "Dashboard", subtitle: "" };

  return (
    <header className="sticky top-0 z-50 flex h-[60px] items-center justify-between border-b border-white/10 dark:border-white/5 bg-white/80 dark:bg-[#0b1120]/80 flup-glass px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
        >
          <Menu className="size-5" />
        </Button>
        <div className="flex flex-col">
          <h1 className="text-lg font-bold tracking-tight text-[var(--color-surface-900)] dark:text-white leading-tight">
            {pageInfo.title}
          </h1>
          {pageInfo.subtitle && (
            <p className="text-[12px] font-medium text-[var(--color-surface-400)] leading-tight hidden sm:block">
              {pageInfo.subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Search */}
        <button className="flex items-center justify-center size-9 rounded-xl text-[var(--color-surface-400)] hover:text-[var(--color-surface-600)] hover:bg-[var(--color-surface-100)] dark:hover:bg-[var(--color-surface-800)] transition-all duration-200">
          <Search className="size-[18px]" strokeWidth={1.8} />
        </button>

        {/* Notifications */}
        <button className="relative flex items-center justify-center size-9 rounded-xl text-[var(--color-surface-400)] hover:text-[var(--color-surface-600)] hover:bg-[var(--color-surface-100)] dark:hover:bg-[var(--color-surface-800)] transition-all duration-200">
          <Bell className="size-[18px]" strokeWidth={1.8} />
          <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-[var(--color-danger-500)] ring-2 ring-white dark:ring-[var(--color-surface-900)]" />
        </button>

        {/* Sync status */}
        <div className="flex items-center gap-2 text-[12px] text-[var(--color-surface-500)] bg-[var(--color-surface-50)] dark:bg-[var(--color-surface-800)] rounded-xl px-3 py-1.5 border border-[var(--color-surface-200)] dark:border-[var(--color-surface-700)] ml-1">
          <span
            className={cn(
              "size-2 rounded-full",
              status === "synced"
                ? "bg-[var(--color-success-500)]"
                : status === "syncing"
                ? "bg-[var(--color-warning-500)] animate-pulse"
                : "bg-[var(--color-danger-500)]"
            )}
          />
          <span className="hidden sm:inline font-semibold">
            {status === "synced"
              ? "Sincronizado"
              : status === "syncing"
              ? "Sincronizando..."
              : "Erro"}
          </span>
        </div>
      </div>
    </header>
  );
}
