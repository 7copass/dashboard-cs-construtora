"use client";

import { useState, Suspense } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { FilterBar } from "@/components/layout/filter-bar";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-surface-50)] dark:bg-[#0b1120]">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[260px] p-0">
          <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
          <Sidebar className="w-full border-r-0" />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar onMenuClick={() => setMobileOpen(true)} />
        <Suspense fallback={null}>
          <FilterBar />
        </Suspense>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 xl:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
