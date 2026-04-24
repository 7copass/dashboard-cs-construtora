import {
  getCashflowRealized,
  getCashflowProjected,
  getCashflowByObra,
  getMovimentacoes,
  getCashGapProjection,
} from "@/lib/queries/fluxo-caixa";
import { CashflowProjected } from "@/components/charts/cashflow-projected";
import { CashflowGap } from "@/components/charts/cashflow-gap";
import { FluxoPorObraChart } from "./fluxo-por-obra-chart";
import { MovimentacoesTable } from "./movimentacoes-table";

interface PageProps {
  searchParams: Promise<{
    dateFrom?: string;
    dateTo?: string;
    obras?: string;
  }>;
}

export default async function FluxoDeCaixaPage({ searchParams }: PageProps) {
  const params = await searchParams;

  // Default date range: last 90 days to next 90 days
  const today = new Date();
  const defaultFrom = new Date(today);
  defaultFrom.setDate(defaultFrom.getDate() - 90);
  const defaultTo = new Date(today);
  defaultTo.setDate(defaultTo.getDate() + 90);

  const dateFrom =
    params.dateFrom ?? defaultFrom.toISOString().split("T")[0];
  const dateTo =
    params.dateTo ?? defaultTo.toISOString().split("T")[0];
  const obras = params.obras ? params.obras.split(",") : undefined;

  const filters = { dateFrom, dateTo, obras };

  // Fetch all data in parallel
  const [realized, projected, byObra, movimentacoes, cashGap] =
    await Promise.all([
      getCashflowRealized(filters),
      getCashflowProjected(filters),
      getCashflowByObra(filters),
      getMovimentacoes(filters),
      getCashGapProjection(),
    ]);

  return (
    <div className="space-y-6">
      {/* Section A — Fluxo Realizado vs Projetado */}
      <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 lg:p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
          Fluxo de Caixa — Realizado vs Projetado
        </h2>
        <CashflowProjected realized={realized} projected={projected} />
      </section>

      {/* Section B — Fluxo por Obra */}
      <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 lg:p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
          Fluxo por Obra
        </h2>
        <FluxoPorObraChart data={byObra} />
      </section>

      {/* Section C — Movimentacoes Detalhadas */}
      <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 lg:p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
          Movimentacoes
        </h2>
        <MovimentacoesTable data={movimentacoes} />
      </section>

      {/* Section D — Gap de Caixa */}
      <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 lg:p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
          Projecao de Caixa — Proximos 90 dias
        </h2>
        <CashflowGap
          data={cashGap.data}
          gapDate={cashGap.gapDate}
          maxDeficit={cashGap.maxDeficit}
        />
      </section>
    </div>
  );
}
