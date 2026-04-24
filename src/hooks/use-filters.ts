"use client";

import { useCallback, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  startOfMonth,
  endOfMonth,
  startOfDay,
  endOfDay,
  subDays,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  format,
} from "date-fns";

export interface Filters {
  dateFrom: string;
  dateTo: string;
  obras: string[];
  categorias: string[];
  clientes: string[];
}

function formatDateParam(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function useFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filters: Filters = useMemo(() => {
    const now = new Date();
    return {
      dateFrom:
        searchParams.get("dateFrom") || formatDateParam(startOfMonth(now)),
      dateTo: searchParams.get("dateTo") || formatDateParam(endOfMonth(now)),
      obras: searchParams.get("obras")?.split(",").filter(Boolean) || [],
      categorias:
        searchParams.get("categorias")?.split(",").filter(Boolean) || [],
      clientes:
        searchParams.get("clientes")?.split(",").filter(Boolean) || [],
    };
  }, [searchParams]);

  const setFilter = useCallback(
    (key: keyof Filters, value: string | string[]) => {
      const params = new URLSearchParams(searchParams.toString());
      if (Array.isArray(value)) {
        if (value.length > 0) {
          params.set(key, value.join(","));
        } else {
          params.delete(key);
        }
      } else {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [searchParams, router, pathname]
  );

  const resetFilters = useCallback(() => {
    router.push(pathname);
  }, [router, pathname]);

  const setDateRange = useCallback(
    (from: Date, to: Date) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("dateFrom", formatDateParam(from));
      params.set("dateTo", formatDateParam(to));
      router.push(`${pathname}?${params.toString()}`);
    },
    [searchParams, router, pathname]
  );

  const presets = useMemo(
    () => ({
      setToday: () => {
        const now = new Date();
        setDateRange(startOfDay(now), endOfDay(now));
      },
      set7d: () => {
        const now = new Date();
        setDateRange(subDays(now, 6), now);
      },
      set30d: () => {
        const now = new Date();
        setDateRange(subDays(now, 29), now);
      },
      setMonth: () => {
        const now = new Date();
        setDateRange(startOfMonth(now), endOfMonth(now));
      },
      setQuarter: () => {
        const now = new Date();
        setDateRange(startOfQuarter(now), endOfQuarter(now));
      },
      setYear: () => {
        const now = new Date();
        setDateRange(startOfYear(now), endOfYear(now));
      },
    }),
    [setDateRange]
  );

  return { filters, setFilter, resetFilters, presets };
}
