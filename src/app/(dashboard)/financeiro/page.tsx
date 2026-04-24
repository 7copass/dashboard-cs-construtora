import { getFinanceiroKpis } from "@/lib/queries/financeiro";
import { FinanceiroContent } from "./financeiro-content";

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;

  const today = new Date();
  const defaultStart = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const defaultEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    .toISOString()
    .split("T")[0];

  const filters = {
    dateFrom: params.dateFrom ?? defaultStart,
    dateTo: params.dateTo ?? defaultEnd,
    obras: params.obras ? params.obras.split(",") : [],
  };

  const finFilters = {
    tab: (params.fin_tab as "entradas" | "saidas" | "consolidado") ?? "entradas",
    natureza: params.fin_natureza ?? "",
    forma: params.fin_forma ?? "",
    categoria: params.fin_categoria ?? "",
    status: params.fin_status ?? "",
  };

  const kpis = await getFinanceiroKpis(filters);

  return (
    <div className="space-y-6">
      <FinanceiroContent
        kpis={kpis}
        filters={filters}
        finFilters={finFilters}
      />
    </div>
  );
}
