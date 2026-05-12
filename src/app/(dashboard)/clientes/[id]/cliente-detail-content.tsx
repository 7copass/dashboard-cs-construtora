"use client"

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  DollarSign,
  CreditCard,
  TrendingDown,
  Building2,
  Clock,
  ChevronRight,
  ChevronDown,
  Home,
  Filter,
} from 'lucide-react'
import { KpiCardSmall } from '@/components/cards/kpi-card-small'
import { formatCurrency } from '@/lib/utils/format'
import { ClienteParcelasTable } from './cliente-parcelas-table'
import type { ClienteDetail } from '@/lib/queries/clientes'
import type { ParcelaRow } from './cliente-parcelas-table'

interface ClienteDetailContentProps {
  detail: ClienteDetail
}

// ── Forma pill styles ─────────────────────────────────────────────────────────
const FORMA_COLORS: Record<string, string> = {
  'Boleto':                'bg-blue-100 text-blue-700 ring-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:ring-blue-700',
  'Pix':                   'bg-violet-100 text-violet-700 ring-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:ring-violet-700',
  'Permuta':               'bg-amber-100 text-amber-700 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-700',
  'Dinheiro':              'bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-700',
  'Transferência Bancária':'bg-cyan-100 text-cyan-700 ring-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:ring-cyan-700',
}
const FORMA_DEFAULT = 'bg-[var(--color-surface-100)] text-[var(--text-secondary)] ring-[var(--border)]'

function formaColor(forma: string) {
  return FORMA_COLORS[forma] ?? FORMA_DEFAULT
}

// ── UnidadeCard ───────────────────────────────────────────────────────────────
function UnidadeCard({
  unidade,
  defaultOpen,
  filteredParcelas,
}: {
  unidade: ClienteDetail['unidades'][number]
  defaultOpen: boolean
  filteredParcelas: ParcelaRow[]
}) {
  const [open, setOpen] = useState(defaultOpen)

  // Stats based on the filtered set
  const totalFat = filteredParcelas.reduce((s, p) => s + p.valor_parcela, 0)
  const totalRec = filteredParcelas.reduce((s, p) => s + p.valor_recebido, 0)
  const pct = totalFat > 0 ? Math.round((totalRec / totalFat) * 100) : 0
  const recebidas = filteredParcelas.filter(p => p.status === 'Recebido').length
  const pendentes = filteredParcelas.filter(p => p.status === 'Pendente').length
  const parciais  = filteredParcelas.filter(p => p.status === 'Parcial').length
  const total     = filteredParcelas.length

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-[var(--color-surface-50)] dark:hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-[var(--color-primary-100)] dark:bg-[var(--color-primary-900)]/40">
            <Home className="size-4 text-[var(--color-primary-600)] dark:text-[var(--color-primary-400)]" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-[var(--text-primary)]">{unidade.nome}</p>
            {unidade.empreendimento && (
              <p className="text-[11px] font-semibold text-[var(--color-primary-500)] dark:text-[var(--color-primary-400)] uppercase tracking-wide leading-tight">
                {unidade.empreendimento}
              </p>
            )}
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              {total} parcela{total !== 1 ? 's' : ''} · {recebidas} recebida{recebidas !== 1 ? 's' : ''}
              {pendentes > 0 && ` · ${pendentes} pendente${pendentes !== 1 ? 's' : ''}`}
              {parciais > 0 && ` · ${parciais} parcial${parciais !== 1 ? 'is' : ''}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden sm:flex items-center gap-5">
            <div className="text-right">
              <p className="text-[11px] text-[var(--text-secondary)] uppercase tracking-wide">Faturado</p>
              <p className="text-sm font-semibold text-[var(--text-primary)]">{formatCurrency(totalFat)}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-[var(--text-secondary)] uppercase tracking-wide">Recebido</p>
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(totalRec)}</p>
            </div>
            {totalFat - totalRec > 0 && (
              <div className="text-right">
                <p className="text-[11px] text-[var(--text-secondary)] uppercase tracking-wide">Pendente</p>
                <p className="text-sm font-semibold text-rose-500">{formatCurrency(totalFat - totalRec)}</p>
              </div>
            )}
            <div className="hidden lg:block w-24">
              <p className="text-[10px] text-[var(--text-secondary)] mb-1">{pct}% recebido</p>
              <div className="h-1.5 w-full rounded-full bg-[var(--color-surface-200)] dark:bg-[var(--color-surface-700)] overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, pct)}%` }}
                />
              </div>
            </div>
          </div>
          <ChevronDown
            className={`size-4 text-[var(--text-secondary)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {open && (
        <div className="border-t border-[var(--border)] px-5 py-4 space-y-0">
          <ClienteParcelasTable data={filteredParcelas} />

          {/* Totals footer */}
          <div className="mt-1 flex items-center justify-end gap-6 rounded-lg border border-[var(--border)] bg-[var(--color-surface-50)] dark:bg-[var(--color-surface-800)]/60 px-4 py-2.5">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)] mr-auto">
              Total ({filteredParcelas.length} parcelas)
            </div>
            <div className="text-right">
              <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wide">Valor</p>
              <p className="text-sm font-bold text-[var(--text-primary)] tabular-nums">
                {formatCurrency(filteredParcelas.reduce((s, p) => s + p.valor_parcela, 0))}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wide">Recebido</p>
              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {formatCurrency(filteredParcelas.reduce((s, p) => s + p.valor_recebido, 0))}
              </p>
            </div>
            {filteredParcelas.some(p => p.juros > 0) && (
              <div className="text-right">
                <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wide">Juros/Multa</p>
                <p className="text-sm font-bold text-rose-400 tabular-nums">
                  {formatCurrency(filteredParcelas.reduce((s, p) => s + p.juros, 0))}
                </p>
              </div>
            )}
            <div className="text-right">
              <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wide">Pendente</p>
              <p className={`text-sm font-bold tabular-nums ${
                filteredParcelas.reduce((s, p) => s + Math.max(0, p.valor_parcela - p.valor_recebido), 0) > 0
                  ? 'text-rose-500'
                  : 'text-[var(--text-secondary)]'
              }`}>
                {formatCurrency(filteredParcelas.reduce((s, p) => s + Math.max(0, p.valor_parcela - p.valor_recebido), 0))}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function ClienteDetailContent({ detail }: ClienteDetailContentProps) {
  const multiUnidade = detail.unidades.length > 1

  // Collect all distinct formas across all parcelas (only those that have a value)
  const formasDisponiveis = useMemo(() => {
    const set = new Set<string>()
    for (const u of detail.unidades) {
      for (const p of u.parcelas) {
        if (p.forma_recebimento) set.add(p.forma_recebimento)
      }
    }
    return [...set].sort()
  }, [detail.unidades])

  const [selectedForma, setSelectedForma] = useState<string | null>(null)

  // Apply filter to each unit's parcelas
  const unidadesFiltradas = useMemo(() => {
    if (!selectedForma) return detail.unidades.map(u => ({ unidade: u, parcelas: u.parcelas }))
    return detail.unidades.map(u => ({
      unidade: u,
      parcelas: u.parcelas.filter(p => p.forma_recebimento === selectedForma),
    }))
  }, [detail.unidades, selectedForma])

  // KPI totals based on current filter
  const totalFaturadoFiltrado = useMemo(
    () => unidadesFiltradas.reduce((s, { parcelas }) => s + parcelas.reduce((ss, p) => ss + p.valor_parcela, 0), 0),
    [unidadesFiltradas]
  )
  const totalRecebidoFiltrado = useMemo(
    () => unidadesFiltradas.reduce((s, { parcelas }) => s + parcelas.reduce((ss, p) => ss + p.valor_recebido, 0), 0),
    [unidadesFiltradas]
  )

  const kpiFaturado = selectedForma ? totalFaturadoFiltrado : detail.totalFaturado
  const kpiRecebido = selectedForma ? totalRecebidoFiltrado : detail.totalRecebido
  const kpiSaldo    = Math.max(0, kpiFaturado - kpiRecebido)

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-[var(--text-secondary)]">
        <Link href="/clientes" className="hover:text-[var(--accent-blue)] transition-colors">
          Clientes
        </Link>
        <ChevronRight className="size-4" />
        <span className="text-[var(--text-primary)] font-medium">{detail.nome}</span>
      </nav>

      {/* Top KPI Cards */}
      <section>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <KpiCardSmall
            icon={DollarSign}
            title="Total Faturado"
            value={formatCurrency(kpiFaturado)}
            subtitle={selectedForma ? `via ${selectedForma}` : 'todas as unidades'}
          />
          <KpiCardSmall
            icon={CreditCard}
            title="Total Recebido"
            value={formatCurrency(kpiRecebido)}
            subtitle={selectedForma ? `via ${selectedForma}` : 'todas as unidades'}
          />
          <KpiCardSmall
            icon={TrendingDown}
            title="Saldo Devedor"
            value={formatCurrency(kpiSaldo)}
            subtitle="faturado − recebido"
          />
          <KpiCardSmall
            icon={Building2}
            title="Unidades"
            value={String(detail.numUnidades)}
            subtitle={detail.numUnidades === 1 ? 'unidade' : 'unidades compradas'}
          />
          <KpiCardSmall
            icon={Clock}
            title="Tempo Médio Pgto"
            value={`${detail.tempoMedioPagamento} dias`}
            subtitle="em relação ao vencimento"
          />
        </div>
      </section>

      {/* Per-unit sections */}
      <section className="space-y-3">
        {/* Header row: title + forma filter pills */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {multiUnidade && (
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Parcelas por Unidade
            </h2>
          )}

          {/* Forma filter — only shown if there are multiple formas */}
          {formasDisponiveis.length > 1 && (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                <Filter className="size-3.5" />
                <span>Forma:</span>
              </div>

              {/* "Todas" pill */}
              <button
                onClick={() => setSelectedForma(null)}
                className={`px-3 py-1 rounded-full text-xs font-semibold ring-1 transition-all ${
                  !selectedForma
                    ? 'bg-[var(--color-primary-500)] text-white ring-[var(--color-primary-500)]'
                    : 'bg-[var(--color-surface-100)] text-[var(--text-secondary)] ring-[var(--border)] hover:bg-[var(--color-surface-200)]'
                }`}
              >
                Todas
              </button>

              {formasDisponiveis.map(forma => (
                <button
                  key={forma}
                  onClick={() => setSelectedForma(f => f === forma ? null : forma)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold ring-1 transition-all ${
                    selectedForma === forma
                      ? formaColor(forma) + ' ring-2'
                      : 'bg-[var(--color-surface-100)] text-[var(--text-secondary)] ring-[var(--border)] hover:bg-[var(--color-surface-200)]'
                  }`}
                >
                  {forma}
                </button>
              ))}
            </div>
          )}
        </div>

        {detail.unidades.length === 0 ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] flex items-center justify-center h-[200px] text-[var(--text-secondary)]">
            Nenhum faturamento encontrado para este cliente.
          </div>
        ) : (
          unidadesFiltradas
            .filter(({ parcelas }) => parcelas.length > 0)
            .map(({ unidade, parcelas }, idx) => (
              <UnidadeCard
                key={unidade.nome}
                unidade={unidade}
                defaultOpen={idx === 0}
                filteredParcelas={parcelas}
              />
            ))
        )}

        {/* Empty state when filter has no results */}
        {selectedForma && unidadesFiltradas.every(({ parcelas }) => parcelas.length === 0) && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] flex flex-col items-center justify-center h-[140px] gap-2">
            <p className="text-[var(--text-secondary)] text-sm">
              Nenhuma parcela com forma &ldquo;{selectedForma}&rdquo;
            </p>
            <button
              onClick={() => setSelectedForma(null)}
              className="text-xs text-[var(--color-primary-500)] hover:underline"
            >
              Limpar filtro
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
