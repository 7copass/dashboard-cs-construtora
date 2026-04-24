"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Settings,
  LogOut,
  Moon,
  Sparkles,
  Wallet,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTheme } from "next-themes";

interface NavItem {
  label: string;
  icon: LucideIcon;
  href: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "PRINCIPAL",
    items: [
      { label: "Obras",            icon: Building2, href: "/obras" },
      { label: "Clientes",         icon: Users,     href: "/clientes" },
      { label: "Contas Bancárias", icon: Wallet,    href: "/contas-bancarias" },
    ],
  },
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  useEffect(() => { setMounted(true); }, []);

  const isDark = mounted && theme === "dark";

  return (
    <aside
      className={cn(
        "flex h-screen flex-col transition-all duration-300 relative z-10",
        "bg-white border-r border-[var(--color-surface-200)]",
        "dark:bg-[var(--color-surface-900)] dark:border-[var(--color-surface-800)]",
        collapsed ? "w-[72px]" : "w-[260px]",
        className
      )}
    >
      {/* Logo */}
      <div className={cn(
        "flex h-[68px] items-center border-b border-[var(--color-surface-100)] dark:border-[var(--color-surface-800)]",
        collapsed ? "px-4 justify-center" : "px-5"
      )}>
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex items-center justify-center size-9 rounded-xl bg-gradient-to-br from-[var(--color-primary-500)] to-[var(--color-primary-700)] text-white shadow-[0_2px_10px_rgba(99,102,241,0.3)] group-hover:shadow-[0_4px_16px_rgba(99,102,241,0.4)] transition-shadow duration-300">
            <Sparkles className="size-[18px]" strokeWidth={2.5} />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-[15px] font-bold text-[var(--color-surface-900)] dark:text-white tracking-tight leading-tight">
                CS Construtora
              </span>
              <span className="text-[11px] font-medium text-[var(--color-surface-400)] leading-tight">
                Dashboard
              </span>
            </div>
          )}
        </Link>
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="ml-auto flex items-center justify-center size-7 rounded-lg text-[var(--color-surface-400)] hover:text-[var(--color-surface-600)] hover:bg-[var(--color-surface-100)] dark:hover:bg-[var(--color-surface-800)] transition-all duration-200"
          >
            <ChevronLeft className="size-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className={cn("flex-1 overflow-y-auto pt-4 pb-4 space-y-5", collapsed ? "px-2" : "px-3")}>
        {NAV_GROUPS.map((group, idx) => (
          <div key={idx}>
            {!collapsed && (
              <h3 className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--color-surface-400)]">
                {group.label}
              </h3>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group/link flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition-all duration-200 relative",
                      isActive
                        ? "bg-[var(--color-primary-50)] text-[var(--color-primary-600)] dark:bg-[var(--color-primary-500)]/10 dark:text-[var(--color-primary-400)]"
                        : "text-[var(--color-surface-600)] hover:bg-[var(--color-surface-100)] hover:text-[var(--color-surface-900)] dark:text-[var(--color-surface-400)] dark:hover:bg-[var(--color-surface-800)]",
                      collapsed && "justify-center px-0 py-2.5"
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[var(--color-primary-500)]" />
                    )}
                    <item.icon
                      className={cn(
                        "size-[18px] shrink-0 transition-colors duration-200",
                        isActive
                          ? "text-[var(--color-primary-500)]"
                          : "text-[var(--color-surface-400)] group-hover/link:text-[var(--color-surface-600)]"
                      )}
                      strokeWidth={isActive ? 2.2 : 1.8}
                    />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-[var(--color-surface-100)] dark:border-[var(--color-surface-800)] p-3">
        {!collapsed ? (
          <div className="space-y-1">
            <Link
              href="#"
              className="flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium text-[var(--color-surface-600)] hover:bg-[var(--color-surface-100)] hover:text-[var(--color-surface-900)] dark:text-[var(--color-surface-400)] dark:hover:bg-[var(--color-surface-800)] transition-all duration-200"
            >
              <Settings className="size-[18px] text-[var(--color-surface-400)]" strokeWidth={1.8} />
              <span>Configurações</span>
            </Link>

            {/* Dark mode toggle */}
            <div className="flex items-center justify-between px-3 py-2">
              <div className="flex items-center gap-3 text-[var(--color-surface-600)] dark:text-[var(--color-surface-400)] text-[13px] font-medium">
                <Moon className="size-[18px] text-[var(--color-surface-400)]" strokeWidth={1.8} />
                <span>Modo escuro</span>
              </div>
              <button
                type="button"
                onClick={() => setTheme(isDark ? "light" : "dark")}
                className={cn(
                  "relative w-10 h-[22px] rounded-full flex items-center px-[3px] transition-colors duration-300",
                  isDark ? "bg-[var(--color-primary-500)]" : "bg-[var(--color-surface-200)]"
                )}
              >
                <div className={cn(
                  "w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm",
                  isDark ? "translate-x-[18px]" : "translate-x-0"
                )} />
              </button>
            </div>

            {/* User section */}
            <div className="mt-2 pt-2 border-t border-[var(--color-surface-100)] dark:border-[var(--color-surface-800)]">
              <div className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[var(--color-surface-100)] dark:hover:bg-[var(--color-surface-800)] transition-colors cursor-pointer group">
                <div className="size-8 rounded-lg bg-gradient-to-br from-[var(--color-primary-400)] to-[var(--color-primary-600)] flex items-center justify-center text-white text-[12px] font-bold shadow-sm">
                  A
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-[13px] font-semibold text-[var(--color-surface-900)] dark:text-white leading-tight truncate">
                    Admin
                  </span>
                  <span className="text-[11px] text-[var(--color-surface-400)] leading-tight">
                    Administrador
                  </span>
                </div>
                <LogOut className="size-4 text-[var(--color-surface-400)] group-hover:text-[var(--color-surface-600)] transition-colors shrink-0" strokeWidth={1.8} />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <button
              onClick={() => setCollapsed(false)}
              className="flex w-full items-center justify-center rounded-xl p-2 text-[var(--color-surface-400)] hover:bg-[var(--color-surface-100)] dark:hover:bg-[var(--color-surface-800)] transition-colors"
            >
              <ChevronRight className="size-[18px]" />
            </button>
            <div className="flex w-full items-center justify-center pt-1">
              <div className="size-8 rounded-lg bg-gradient-to-br from-[var(--color-primary-400)] to-[var(--color-primary-600)] flex items-center justify-center text-white text-[12px] font-bold shadow-sm">
                A
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
