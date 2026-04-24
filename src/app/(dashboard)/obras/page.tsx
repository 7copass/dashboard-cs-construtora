import { getObrasGrid } from "@/lib/queries/obras";
import { ObraRow } from "@/components/cards/obra-card";
import { ObrasControls } from "./obras-controls";
import { ObrasSummary } from "@/components/cards/obras-summary";
import { Inbox } from "lucide-react";

interface PageProps {
  searchParams: {
    status?: string;
    sortBy?: string;
    dateFrom?: string;
    dateTo?: string;
    obras?: string;
    categorias?: string;
  };
}

function getDefaultDates() {
  const now = new Date();
  const dateFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const dateTo = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  return { dateFrom, dateTo };
}

export default async function ObrasPage({ searchParams }: PageProps) {
  const defaults = getDefaultDates();

  const filters = {
    status: searchParams.status ?? undefined,
    sortBy: (searchParams.sortBy as "nome" | "gasto" | "margem" | "desvio") ?? "nome",
    dateFrom: searchParams.dateFrom ?? defaults.dateFrom,
    dateTo: searchParams.dateTo ?? defaults.dateTo,
    obras: searchParams.obras ? searchParams.obras.split(",") : undefined,
    categorias: searchParams.categorias ? searchParams.categorias.split(",") : undefined,
  };

  const obras = await getObrasGrid(filters);

  const emAndamento = obras.filter((o) => (o.status ?? "").toLowerCase().includes("andamento") || (o.status ?? "").toLowerCase().includes("ativa")).length;
  const estouradas  = obras.filter((o) => o.progressoOrcamentario > 100).length;
  const margemMedia = obras.length > 0 ? obras.reduce((s, o) => s + o.margem, 0) / obras.length : 0;

  return (
    <div className="space-y-5">
      {/* ── Page header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-surface-900)] dark:text-white tracking-tight">Obras</h1>
          <p className="text-[13px] font-medium text-[var(--color-surface-400)] mt-0.5">
            Acompanhe o orçamento, cronograma e margem de cada obra
          </p>
        </div>
        <ObrasControls
          currentStatus={filters.status ?? "todas"}
          currentSort={filters.sortBy ?? "nome"}
          total={obras.length}
        />
      </div>

      {/* ── Summary cards (client component to avoid hydration) ── */}
      {obras.length > 0 && (
        <ObrasSummary
          total={obras.length}
          emAndamento={emAndamento}
          estouradas={estouradas}
          margemMedia={margemMedia}
        />
      )}

      {/* ── Table ── */}
      {obras.length > 0 ? (
        <div className="rounded-2xl bg-white dark:bg-[var(--bg-card)] border border-[#e2e8f0]/40 dark:border-[#334155]/40 shadow-[var(--shadow-sm)] overflow-hidden flup-fade-up" style={{ animationDelay: '300ms' }}>
          {/* Table header */}
          <div className="grid grid-cols-[1fr_100px_100px_100px_80px_120px_100px_24px] items-center gap-2 px-5 py-3 bg-[var(--color-surface-50)] dark:bg-[#1e293b]/50 border-b border-[#e2e8f0]/60 dark:border-[#334155]/40">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--color-surface-400)]">Obra</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--color-surface-400)] text-right">Orçado</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--color-surface-400)] text-right">Realizado</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--color-surface-400)] text-right">Desvio</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--color-surface-400)] text-right">Margem</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--color-surface-400)]">Orçamentário</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--color-surface-400)]">Status</span>
            <span></span>
          </div>

          {/* Table rows */}
          <div className="divide-y divide-[var(--color-surface-100)] dark:divide-[#334155]/40">
            {obras.map((obra) => (
              <ObraRow
                key={obra.id}
                id={obra.id}
                nome={obra.nome}
                cliente={obra.cliente}
                status={obra.status}
                progressoOrcamentario={obra.progressoOrcamentario}
                valorOrcado={obra.valorOrcado}
                valorRealizado={obra.valorRealizado}
                desvio={obra.desvio}
                progressoCronograma={obra.progressoCronograma}
                margem={obra.margem}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 h-[300px] rounded-2xl bg-white dark:bg-[var(--bg-card)] border border-dashed border-[var(--color-surface-200)] dark:border-[#334155]/50">
          <div className="flex items-center justify-center size-14 rounded-2xl bg-[var(--color-surface-100)] dark:bg-[var(--color-surface-800)]">
            <Inbox className="size-6 text-[var(--color-surface-400)]" strokeWidth={1.5} />
          </div>
          <p className="text-sm font-medium text-[var(--color-surface-400)]">Nenhuma obra encontrada com esses filtros.</p>
        </div>
      )}
    </div>
  );
}
