import Link from 'next/link'
import { Users, ArrowRight } from 'lucide-react'
import { getClienteRanking } from '@/lib/queries/clientes'
import { formatCurrency } from '@/lib/utils/format'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ dateFrom?: string; dateTo?: string; obras?: string }>
}

export default async function ClientesPage({ searchParams }: PageProps) {
  const params = await searchParams
  const obras = params.obras ? params.obras.split(',') : undefined

  const ranking = await getClienteRanking({
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    obras,
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="size-5 text-[var(--color-primary-500)]" />
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Clientes</h1>
        {ranking.length > 0 && (
          <span className="rounded-full bg-[var(--color-primary-500)]/10 px-2.5 py-0.5 text-xs font-semibold text-[var(--color-primary-600)] dark:text-[var(--color-primary-400)]">
            {ranking.length}
          </span>
        )}
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] divide-y divide-[var(--border)]">
        {ranking.length > 0 ? (
          ranking.map((c) => (
            <Link
              key={c.cliente}
              href={`/clientes/${encodeURIComponent(c.cliente)}`}
              className="flex items-center justify-between px-5 py-3.5 hover:bg-[var(--color-surface-50)] dark:hover:bg-white/5 transition-colors group"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-100)] dark:bg-[var(--color-primary-900)]/40 text-sm font-bold text-[var(--color-primary-600)] dark:text-[var(--color-primary-400)]">
                  {c.cliente.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  {/* Name + empreendimento chips on the same line */}
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      {c.cliente}
                    </p>
                    {c.empreendimentos.map(emp => (
                      <span
                        key={emp}
                        className="inline-flex shrink-0 items-center rounded-md bg-[var(--color-primary-100)] dark:bg-[var(--color-primary-900)]/40 px-2 py-0.5 text-[10px] font-semibold text-[var(--color-primary-700)] dark:text-[var(--color-primary-300)] uppercase tracking-wide"
                      >
                        {emp}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Faturado: {formatCurrency(c.faturado)}
                    {c.pendente > 0 && (
                      <span className="ml-2 text-rose-500">Pendente: {formatCurrency(c.pendente)}</span>
                    )}
                  </p>
                </div>
              </div>
              <ArrowRight className="size-4 text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-3" />
            </Link>
          ))
        ) : (
          <div className="flex items-center justify-center h-[120px] text-[var(--text-secondary)] text-sm">
            Nenhum cliente encontrado.
          </div>
        )}
      </div>
    </div>
  )
}
