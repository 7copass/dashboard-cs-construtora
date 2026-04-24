"use client"

import { useMemo, useRef, useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpCircle,
  ArrowDownCircle,
  Scale,
  CalendarDays,
  X,
  SlidersHorizontal,
} from 'lucide-react'
import { DataTable } from '@/components/tables/data-table'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import type { ContasBancariasData, Movimentacao } from '@/lib/queries/contas-bancarias'

// ── Conta colors ──────────────────────────────────────────────────────────────
const CONTA_COLORS: Record<string, string> = {
  'CAIXA CS':             'bg-blue-100   text-blue-700   dark:bg-blue-900/30   dark:text-blue-300',
  'BRADESCO CS':          'bg-red-100    text-red-700    dark:bg-red-900/30    dark:text-red-300',
  'INTER CS':             'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  'PERMUTAS (ACERTOS)':   'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  'ESPECIE':              'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  'BRADESCO (MOTO SHOW)': 'bg-pink-100   text-pink-700   dark:bg-pink-900/30   dark:text-pink-300',
  'BANPARÁ CS':           'bg-cyan-100   text-cyan-700   dark:bg-cyan-900/30   dark:text-cyan-300',
  'VERIFICAR':            'bg-gray-100   text-gray-500   dark:bg-gray-900/30   dark:text-gray-400',
}
const CONTA_DEFAULT = 'bg-[var(--color-surface-100)] text-[var(--text-secondary)]'
function contaColor(conta: string) { return CONTA_COLORS[conta] ?? CONTA_DEFAULT }

// ── Forma colors ──────────────────────────────────────────────────────────────
const FORMA_COLORS: Record<string, string> = {
  'Boleto':                 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  'Pix':                    'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  'Permuta':                'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  'Dinheiro':               'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  'Transferência Bancária': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
}
function formaColor(forma: string) { return FORMA_COLORS[forma] ?? CONTA_DEFAULT }

// ── Table columns ─────────────────────────────────────────────────────────────
const columns: ColumnDef<Movimentacao>[] = [
  {
    accessorKey: 'data',
    header: 'Data',
    cell: ({ row }) => {
      try { return formatDate(row.getValue('data') as string) } catch { return row.getValue('data') }
    },
  },
  {
    accessorKey: 'tipo',
    header: 'Tipo',
    cell: ({ row }) => {
      const tipo = row.getValue('tipo') as string
      return tipo === 'entrada'
        ? (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
            <ArrowUpCircle className="size-3" /> Entrada
          </span>
        )
        : (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
            <ArrowDownCircle className="size-3" /> Saída
          </span>
        )
    },
  },
  {
    accessorKey: 'conta',
    header: 'Conta',
    cell: ({ row }) => {
      const conta = row.getValue('conta') as string
      return (
        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${contaColor(conta)}`}>
          {conta}
        </span>
      )
    },
  },
  {
    accessorKey: 'contraparte',
    header: 'Cliente / Fornecedor',
    cell: ({ row }) => (
      <span className="text-sm font-medium text-[var(--text-primary)] truncate max-w-[200px] block">
        {row.getValue('contraparte') || '—'}
      </span>
    ),
  },
  {
    accessorKey: 'descricao',
    header: 'Descrição',
    cell: ({ row }) => (
      <span className="text-sm text-[var(--text-secondary)] truncate max-w-[180px] block">
        {row.getValue('descricao') || '—'}
      </span>
    ),
  },
  {
    accessorKey: 'forma',
    header: 'Forma',
    cell: ({ row }) => {
      const forma = (row.getValue('forma') as string | null) ?? null
      return forma
        ? <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${formaColor(forma)}`}>{forma}</span>
        : <span className="text-[var(--text-secondary)] text-sm">—</span>
    },
  },
  {
    accessorKey: 'valor',
    header: 'Valor',
    cell: ({ row }) => {
      const tipo  = row.original.tipo
      const valor = row.getValue('valor') as number
      return (
        <span className={`font-semibold tabular-nums ${tipo === 'entrada' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
          {tipo === 'entrada' ? '+' : '−'}{formatCurrency(valor)}
        </span>
      )
    },
  },
]

type Tab = 'todas' | 'entradas' | 'saidas'

interface ContasBancariasContentProps {
  data: ContasBancariasData
}

export function ContasBancariasContent({ data }: ContasBancariasContentProps) {
  const { resumo, movimentacoes } = data

  // ── Filter state ──────────────────────────────────────────────────────────
  const [selectedConta, setSelectedConta] = useState<string | null>(null)
  const [selectedDate,  setSelectedDate]  = useState<string>('')
  const [selectedForma, setSelectedForma] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('todas')
  const dateRef = useRef<HTMLInputElement>(null)

  // Distinct formas available in current conta selection
  const formasDisponiveis = useMemo(() => {
    const src = selectedConta ? movimentacoes.filter(m => m.conta === selectedConta) : movimentacoes
    const set = new Set<string>()
    for (const m of src) { if (m.forma) set.add(m.forma) }
    return [...set].sort()
  }, [movimentacoes, selectedConta])

  // ── Filtered + sorted movimentações ──────────────────────────────────────
  const filtered = useMemo(() => {
    let list = movimentacoes

    if (selectedConta) list = list.filter(m => m.conta === selectedConta)
    if (selectedDate)  list = list.filter(m => m.data === selectedDate)
    if (selectedForma) list = list.filter(m => m.forma === selectedForma)
    if (tab === 'entradas') list = list.filter(m => m.tipo === 'entrada')
    if (tab === 'saidas')   list = list.filter(m => m.tipo === 'saida')

    // When a specific date is chosen: group entradas before saídas, then by contraparte
    if (selectedDate) {
      list = [...list].sort((a, b) => {
        if (a.tipo !== b.tipo) return a.tipo === 'entrada' ? -1 : 1
        return a.contraparte.localeCompare(b.contraparte)
      })
    }

    return list
  }, [movimentacoes, selectedConta, selectedDate, selectedForma, tab])

  // KPIs react to selectedConta + selectedDate + selectedForma
  const kpiEntradas = filtered.filter(m => m.tipo === 'entrada').reduce((s, m) => s + m.valor, 0)
  const kpiSaidas   = filtered.filter(m => m.tipo === 'saida').reduce((s, m) => s + m.valor, 0)
  const kpiSaldo    = kpiEntradas - kpiSaidas

  const hasFilters = !!(selectedConta || selectedDate || selectedForma || tab !== 'todas')

  function clearAll() {
    setSelectedConta(null)
    setSelectedDate('')
    setSelectedForma(null)
    setTab('todas')
    if (dateRef.current) dateRef.current.value = ''
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'todas',    label: 'Todas' },
    { key: 'entradas', label: 'Entradas' },
    { key: 'saidas',   label: 'Saídas' },
  ]

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Wallet className="size-5 text-[var(--color-primary-500)]" />
            Contas Bancárias
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Entradas e saídas por conta no período selecionado
          </p>
        </div>

        {/* Active filter summary + clear */}
        {hasFilters && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--color-surface-100)] transition-colors"
          >
            <X className="size-3.5" />
            Limpar filtros
          </button>
        )}
      </div>

      {/* KPI row — always shows filtered totals */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-[var(--text-secondary)]">Total Entradas</p>
            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <TrendingUp className="size-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
            {formatCurrency(kpiEntradas)}
          </p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            {filtered.filter(m => m.tipo === 'entrada').length} movimentações
          </p>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-[var(--text-secondary)]">Total Saídas</p>
            <div className="flex size-8 items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-900/30">
              <TrendingDown className="size-4 text-rose-500" />
            </div>
          </div>
          <p className="text-2xl font-bold text-rose-500 tabular-nums">
            {formatCurrency(kpiSaidas)}
          </p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            {filtered.filter(m => m.tipo === 'saida').length} movimentações
          </p>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-[var(--text-secondary)]">Saldo do Período</p>
            <div className={`flex size-8 items-center justify-center rounded-lg ${kpiSaldo >= 0 ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-rose-100 dark:bg-rose-900/30'}`}>
              <Scale className={`size-4 ${kpiSaldo >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-rose-500'}`} />
            </div>
          </div>
          <p className={`text-2xl font-bold tabular-nums ${kpiSaldo >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-rose-500'}`}>
            {kpiSaldo >= 0 ? '+' : ''}{formatCurrency(kpiSaldo)}
          </p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">entradas − saídas</p>
        </div>
      </div>

      {/* Per-conta cards — clickable to select */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {resumo.map(c => {
          const isSelected = selectedConta === c.conta
          const saldo = c.totalEntradas - c.totalSaidas
          const pct = c.totalEntradas > 0 ? Math.min(100, Math.round((c.totalSaidas / c.totalEntradas) * 100)) : 0

          return (
            <button
              key={c.conta}
              onClick={() => setSelectedConta(isSelected ? null : c.conta)}
              className={`text-left rounded-xl border p-4 transition-all duration-200 ${
                isSelected
                  ? 'border-[var(--color-primary-400)] ring-2 ring-[var(--color-primary-300)] bg-[var(--color-primary-50)] dark:bg-[var(--color-primary-900)]/10'
                  : 'border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--color-primary-300)] hover:shadow-md'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${contaColor(c.conta)}`}>
                  {c.conta}
                </span>
                <span className={`text-xs font-semibold ${saldo >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                  {saldo >= 0 ? '+' : ''}{formatCurrency(saldo)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1 mb-3">
                <div>
                  <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wide">Entradas</p>
                  <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">{formatCurrency(c.totalEntradas)}</p>
                  <p className="text-[10px] text-[var(--text-secondary)]">{c.nEntradas} mov.</p>
                </div>
                <div>
                  <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wide">Saídas</p>
                  <p className="text-sm font-semibold text-rose-500 tabular-nums">{formatCurrency(c.totalSaidas)}</p>
                  <p className="text-[10px] text-[var(--text-secondary)]">{c.nSaidas} mov.</p>
                </div>
              </div>
              {c.totalEntradas > 0 && (
                <div>
                  <div className="h-1 w-full rounded-full bg-[var(--color-surface-200)] dark:bg-[var(--color-surface-700)] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${pct > 100 ? 'bg-rose-500' : 'bg-[var(--color-primary-500)]'}`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">{pct}% das entradas consumido em saídas</p>
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Filter bar + Table ──────────────────────────────────────────────── */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-4 px-5 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)]">
            <SlidersHorizontal className="size-3.5" />
            Filtros
          </div>

          {/* Data específica */}
          <div className="flex items-center gap-2">
            <CalendarDays className="size-3.5 text-[var(--text-secondary)]" />
            <span className="text-xs text-[var(--text-secondary)]">Data:</span>
            <div className="relative">
              <input
                ref={dateRef}
                type="date"
                defaultValue={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="h-8 rounded-lg border border-[var(--border)] bg-white dark:bg-[var(--color-surface-800)] text-[12px] font-medium text-[var(--text-primary)] px-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]/20 focus:border-[var(--color-primary-500)] transition-all"
              />
              {selectedDate && (
                <button
                  onClick={() => { setSelectedDate(''); if (dateRef.current) dateRef.current.value = '' }}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>
          </div>

          {/* Forma pills */}
          {formasDisponiveis.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-[var(--text-secondary)]">Forma:</span>
              {formasDisponiveis.map(forma => (
                <button
                  key={forma}
                  onClick={() => setSelectedForma(f => f === forma ? null : forma)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ring-1 transition-all ${
                    selectedForma === forma
                      ? formaColor(forma) + ' ring-current'
                      : 'bg-[var(--color-surface-100)] text-[var(--text-secondary)] ring-[var(--border)] hover:bg-[var(--color-surface-200)]'
                  }`}
                >
                  {forma}
                </button>
              ))}
            </div>
          )}

          {/* Spacer + tabs */}
          <div className="ml-auto flex items-center gap-1 rounded-xl bg-[var(--color-surface-50)] dark:bg-[var(--color-surface-800)] p-1 border border-[var(--border)]">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-3 py-1 rounded-lg text-[12px] font-semibold transition-all duration-200 ${
                  tab === t.key
                    ? 'bg-[var(--color-primary-500)] text-white shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white dark:hover:bg-[var(--color-surface-700)]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table header: active filters summary */}
        <div className="flex flex-wrap items-center gap-2 px-5 py-3 border-b border-[var(--border)] bg-[var(--color-surface-50)] dark:bg-[var(--color-surface-900)]/30">
          <span className="text-xs text-[var(--text-secondary)]">
            Mostrando <span className="font-semibold text-[var(--text-primary)]">{filtered.length}</span> movimentações
          </span>

          {selectedConta && (
            <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${contaColor(selectedConta)}`}>
              {selectedConta}
              <button onClick={() => setSelectedConta(null)}><X className="size-2.5" /></button>
            </span>
          )}
          {selectedDate && (
            <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium bg-[var(--color-surface-200)] text-[var(--text-primary)]">
              {formatDate(selectedDate)}
              <button onClick={() => { setSelectedDate(''); if (dateRef.current) dateRef.current.value = '' }}>
                <X className="size-2.5" />
              </button>
            </span>
          )}
          {selectedForma && (
            <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${formaColor(selectedForma)}`}>
              {selectedForma}
              <button onClick={() => setSelectedForma(null)}><X className="size-2.5" /></button>
            </span>
          )}
          {selectedDate && tab === 'todas' && (
            <span className="ml-auto text-[11px] text-[var(--text-secondary)]">
              ↑ entradas · ↓ saídas
            </span>
          )}
        </div>

        {/* Table */}
        <div className="p-5">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[140px] gap-2">
              <p className="text-[var(--text-secondary)] text-sm">Nenhuma movimentação encontrada</p>
              {hasFilters && (
                <button onClick={clearAll} className="text-xs text-[var(--color-primary-500)] hover:underline">
                  Limpar filtros
                </button>
              )}
            </div>
          ) : (
            <DataTable columns={columns} data={filtered} searchKey="contraparte" />
          )}
        </div>
      </div>
    </div>
  )
}
