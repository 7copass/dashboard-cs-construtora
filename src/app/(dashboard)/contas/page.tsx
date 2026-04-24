import {
  getAgingReceber,
  getAgingPagar,
  getCalendarioVencimentos,
  getPontualidade,
} from "@/lib/queries/contas";
import { AgingBar } from "@/components/charts/aging-bar";
import { GaugeChart } from "@/components/charts/gauge-chart";
import { AgingReceberTable } from "./aging-receber-table";
import { AgingPagarTable } from "./aging-pagar-table";
import { CalendarioWrapper } from "./calendario-wrapper";

export default async function ContasPage() {
  const today = new Date();

  // Fetch all data in parallel
  const [agingReceber, agingPagar, calendario, pontualidade] =
    await Promise.all([
      getAgingReceber(),
      getAgingPagar(),
      getCalendarioVencimentos(),
      getPontualidade(),
    ]);

  return (
    <div className="space-y-6">
      {/* Section A — Aging de Contas a Receber */}
      <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 lg:p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
          Contas a Receber — Aging
        </h2>
        <AgingBar faixas={agingReceber.faixas} />
        <div className="mt-6">
          <AgingReceberTable data={agingReceber.detalhes} />
        </div>
      </section>

      {/* Section B — Aging de Contas a Pagar */}
      <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 lg:p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
          Contas a Pagar — Aging
        </h2>
        <AgingBar faixas={agingPagar.faixas} />
        <div className="mt-6">
          <AgingPagarTable data={agingPagar.detalhes} />
        </div>
      </section>

      {/* Section C — Calendario de Vencimentos */}
      <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 lg:p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
          Calendario de Vencimentos
        </h2>
        <CalendarioWrapper
          data={calendario}
          initialMonth={today.getMonth()}
          initialYear={today.getFullYear()}
        />
      </section>

      {/* Section D — Indices de Pontualidade */}
      <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 lg:p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
          Indices de Pontualidade
        </h2>
        <div className="flex flex-wrap items-center justify-center gap-8">
          <GaugeChart
            value={pontualidade.pagamento}
            label="Pontualidade de Pagamento"
          />
          <GaugeChart
            value={pontualidade.recebimento}
            label="Pontualidade de Recebimento"
          />
        </div>
      </section>
    </div>
  );
}
