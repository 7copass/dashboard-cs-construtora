"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  DollarSign,
  Wallet,
  Receipt,
  CreditCard,
  Banknote,
  Percent,
  TrendingUp,
  Activity,
  Flame,
  Timer,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Download,
  Search,
  MapPin,
  Calendar,
  ArrowLeft,
} from "lucide-react"
import { KpiCard } from "@/components/cards/kpi-card"
import { KpiCardSmall } from "@/components/cards/kpi-card-small"
import { DonutChart } from "@/components/charts/donut-chart"

import { formatCompactCurrency, formatPercent, formatCurrency, formatDate } from "@/lib/utils/format"
import { EtapasBarChart } from "./etapas-bar-chart"
import { PagamentosTable } from "./pagamentos-table"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

// ─── Types ────────────────────────────────────────────────────────

interface EntradaRow {
  id_faturamento: number
  numero_parcela: number
  id_obra: number
  centro_de_custo: string
  cliente: string
  descricao: string
  natureza: string
  valor_parcela: number
  valor_recebido: number
  data_vencimento: string
  data_recebimento: string | null
  forma_recebimento: string | null
  status: "Recebido" | "Parcial" | "Pendente"
}

interface SaidaRow {
  id_lancamento: number
  numero_parcela: number
  id_obra: number
  centro_de_custo: string
  fornecedor: string
  descricao: string
  categoria: string
  valor_parcela: number
  valor_pago: number
  data_vencimento: string
  data_pagamento: string | null
  forma_pagamento: string | null
  status: "Pago" | "Parcial" | "Pendente"
}

interface ClienteGroup {
  cliente: string
  numParcelas: number
  totalFaturado: number
  totalRecebido: number
  pendente: number
  pctRecebido: number
}

// ─── Constants ────────────────────────────────────────────────────

const PAGE_SIZE = 50

// ─── CSV Export ───────────────────────────────────────────────────

function exportCSV(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const csv = [
    headers.join(";"),
    ...rows.map((r) =>
      headers.map((h) => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(";")
    ),
  ].join("\n")
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" })
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(blob),
    download: filename,
  })
  a.click()
}

// ─── StatusBadge ──────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    Recebido: "bg-emerald-500/10 text-emerald-400",
    Pago:     "bg-emerald-500/10 text-emerald-400",
    Parcial:  "bg-amber-500/10 text-amber-400",
    Pendente: "bg-zinc-500/10 text-zinc-400",
  }
  const cls = variants[status] ?? "bg-zinc-500/10 text-zinc-400"
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${cls}`}>
      {status}
    </span>
  )
}

// ─── CategoryBadge ────────────────────────────────────────────────

function CategoryBadge({ label }: { label: string }) {
  if (!label) return <span className="text-zinc-500 text-xs">—</span>
  return (
    <span
      title={label}
      className="block truncate rounded bg-[var(--accent-gold-dim)] text-[var(--accent-gold)] px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide leading-tight"
    >
      {label}
    </span>
  )
}

// ─── Pagination ───────────────────────────────────────────────────

function Pagination({
  page, totalPages, total, pageSize, onPrev, onNext,
}: {
  page: number; totalPages: number; total: number; pageSize: number
  onPrev: () => void; onNext: () => void
}) {
  if (totalPages <= 1) return null
  const from = page * pageSize + 1
  const to = Math.min((page + 1) * pageSize, total)
  return (
    <div className="flex items-center justify-between pt-3">
      <span className="text-xs text-[var(--text-secondary)]">
        <span className="font-medium text-[var(--text-primary)]">{from}–{to}</span> de{" "}
        <span className="font-medium text-[var(--text-primary)]">{total}</span>
      </span>
      <div className="flex items-center gap-1">
        <button onClick={onPrev} disabled={page === 0}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-[var(--border)] text-xs text-[var(--text-secondary)] hover:text-[var(--accent-gold)] hover:border-[var(--accent-gold)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          <ChevronLeft className="size-3.5" /> Anterior
        </button>
        <span className="px-2 text-xs text-[var(--text-secondary)] tabular-nums">{page + 1} / {totalPages}</span>
        <button onClick={onNext} disabled={page >= totalPages - 1}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-[var(--border)] text-xs text-[var(--text-secondary)] hover:text-[var(--accent-gold)] hover:border-[var(--accent-gold)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          Próximo <ChevronRight className="size-3.5" />
        </button>
      </div>
    </div>
  )
}

// ─── SummaryBar ───────────────────────────────────────────────────

function SummaryBar({ items }: { items: { label: string; value: string; color?: string }[] }) {
  return (
    <div className="grid rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-transparent dark:border-[var(--border)] bg-[var(--bg-card)] overflow-hidden"
      style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
      {items.map((item, i) => (
        <div key={item.label} className={`px-5 py-4 ${i > 0 ? "border-l border-[var(--border)]" : ""}`}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1">{item.label}</p>
          <p className="text-lg font-bold tabular-nums tracking-tight" style={{ color: item.color ?? "var(--text-primary)" }}>
            {item.value}
          </p>
        </div>
      ))}
    </div>
  )
}

// ─── FilterRow ────────────────────────────────────────────────────

interface SelectConfig {
  value: string; onChange: (v: string) => void; placeholder: string
  options: { label: string; value: string }[]
}

function FilterRow({ search, onSearch, selects, onExport, count }: {
  search: string; onSearch: (v: string) => void; selects: SelectConfig[]
  onExport: () => void; count: number
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[150px] max-w-[280px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-[var(--text-secondary)] pointer-events-none" />
        <input type="text" value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Buscar..."
          className="w-full pl-8 pr-3 py-[7px] text-sm rounded-lg border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-gold)] focus:border-[var(--accent-gold)]" />
      </div>
      {selects.map((s, i) => (
        <select key={i} value={s.value} onChange={(e) => s.onChange(e.target.value)}
          className="text-sm rounded-lg border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] px-3 py-[7px] focus:outline-none focus:ring-1 focus:ring-[var(--accent-gold)] focus:border-[var(--accent-gold)]">
          <option value="">{s.placeholder}</option>
          {s.options.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
        </select>
      ))}
      <button onClick={onExport}
        className="flex items-center gap-1.5 text-sm rounded-lg border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-secondary)] px-3 py-[7px] hover:text-[var(--accent-gold)] hover:border-[var(--accent-gold)] transition-colors whitespace-nowrap">
        <Download className="size-3.5" /> Exportar
      </button>
      <span className="ml-auto text-sm text-[var(--text-secondary)]">
        <span className="font-semibold text-[var(--text-primary)] tabular-nums">{count}</span>{" "}
        <span className="text-xs">registro{count !== 1 ? "s" : ""}</span>
      </span>
    </div>
  )
}

// ─── Th ───────────────────────────────────────────────────────────

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" | "center" }) {
  return (
    <th className={`px-3 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)] text-${align} whitespace-nowrap`}>
      {children}
    </th>
  )
}

// ─── EntradasTab ──────────────────────────────────────────────────

function EntradasTab({ obraId }: { obraId: string }) {
  const [rows, setRows] = useState<EntradaRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [naturezaFilter, setNaturezaFilter] = useState("")
  const [page, setPage] = useState(0)
  
  const searchParams = useSearchParams()
  const dateFrom = searchParams.get("dateFrom") || "2020-01-01"
  const dateTo = searchParams.get("dateTo") || "2099-12-31"

  useEffect(() => {
    setLoading(true)
    fetch(`/api/financeiro/entradas?obras=${obraId}&dateFrom=${dateFrom}&dateTo=${dateTo}`)
      .then((r) => r.json())
      .then((data: EntradaRow[]) => { setRows(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [obraId, dateFrom, dateTo])

  useEffect(() => { setPage(0) }, [search, statusFilter, naturezaFilter])

  const naturezas = useMemo(() => Array.from(new Set(rows.map((r) => r.natureza).filter(Boolean))).sort(), [rows])

  const filtered = useMemo(() => {
    let r = rows
    if (search) { const q = search.toLowerCase(); r = r.filter((x) => x.cliente.toLowerCase().includes(q) || x.descricao.toLowerCase().includes(q)) }
    if (statusFilter) r = r.filter((x) => x.status === statusFilter)
    if (naturezaFilter) r = r.filter((x) => x.natureza === naturezaFilter)
    return r
  }, [rows, search, statusFilter, naturezaFilter])

  const paginated = useMemo(() => filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [filtered, page])
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const totalFaturado = useMemo(() => filtered.reduce((s, r) => s + r.valor_parcela, 0), [filtered])
  const totalRecebido = useMemo(() => filtered.reduce((s, r) => s + r.valor_recebido, 0), [filtered])

  if (loading) {
    return (<div className="flex items-center justify-center h-40 text-[var(--text-secondary)]"><Loader2 className="size-5 animate-spin mr-2" /> Carregando entradas...</div>)
  }

  return (
    <div className="space-y-4">
      <SummaryBar items={[
        { label: "Total Faturado", value: formatCurrency(totalFaturado) },
        { label: "Total Recebido", value: formatCurrency(totalRecebido), color: "var(--accent-green)" },
        { label: "Pendente", value: formatCurrency(Math.max(0, totalFaturado - totalRecebido)), color: "var(--accent-amber)" },
      ]} />
      <FilterRow search={search} onSearch={setSearch}
        selects={[
          { value: naturezaFilter, onChange: setNaturezaFilter, placeholder: "Natureza", options: naturezas.map((n) => ({ label: n, value: n })) },
          { value: statusFilter, onChange: setStatusFilter, placeholder: "Status", options: [{ label: "Recebido", value: "Recebido" }, { label: "Parcial", value: "Parcial" }, { label: "Pendente", value: "Pendente" }] },
        ]}
        onExport={() => exportCSV(`entradas-obra-${obraId}.csv`, filtered.map((r) => ({ "Data Recebimento": r.data_recebimento ?? "", Cliente: r.cliente, Descrição: r.descricao, Natureza: r.natureza, Parcela: r.numero_parcela, "Valor Parcela": r.valor_parcela, "Valor Recebido": r.valor_recebido, Forma: r.forma_recebimento ?? "", Status: r.status })))}
        count={filtered.length} />
      <div className="rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-transparent dark:border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
        <table className="w-full text-sm table-fixed">
          <colgroup>
            <col style={{ width: "96px" }} /><col /><col style={{ width: "100px" }} />
            <col style={{ width: "46px" }} /><col style={{ width: "120px" }} />
            <col style={{ width: "120px" }} /><col style={{ width: "122px" }} />
          </colgroup>
          <thead className="bg-[var(--bg-card)] border-b border-[var(--border)]">
            <tr><Th>Data Rec.</Th><Th>Cliente / Descrição</Th><Th>Natureza</Th><Th align="right">Parc.</Th><Th align="right">Faturado</Th><Th align="right">Recebido</Th><Th>Forma / Status</Th></tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-[var(--text-secondary)] text-sm">Nenhuma entrada encontrada.</td></tr>
            ) : paginated.map((r, i) => (
              <tr key={`${r.id_faturamento}-${r.numero_parcela}-${i}`} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-card-hover)] transition-colors">
                <td className="px-3 py-3 text-xs text-[var(--text-secondary)] whitespace-nowrap tabular-nums">{r.data_recebimento ? formatDate(r.data_recebimento) : <span className="text-zinc-600">—</span>}</td>
                <td className="px-3 py-3 min-w-0"><p className="text-sm font-medium text-[var(--text-primary)] truncate leading-snug">{r.cliente || "—"}</p>{r.descricao && <p className="text-xs text-[var(--text-secondary)] truncate mt-0.5">{r.descricao}</p>}</td>
                <td className="px-3 py-3 min-w-0"><CategoryBadge label={r.natureza} /></td>
                <td className="px-3 py-3 text-right text-xs text-[var(--text-secondary)] tabular-nums">{r.numero_parcela}</td>
                <td className="px-3 py-3 text-right text-sm font-medium text-[var(--text-primary)] whitespace-nowrap tabular-nums">{formatCurrency(r.valor_parcela)}</td>
                <td className="px-3 py-3 text-right text-sm font-semibold whitespace-nowrap tabular-nums" style={{ color: "var(--accent-green)" }}>{formatCurrency(r.valor_recebido)}</td>
                <td className="px-3 py-3 min-w-0"><StatusBadge status={r.status} />{r.forma_recebimento && <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 truncate">{r.forma_recebimento}</p>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} total={filtered.length} pageSize={PAGE_SIZE}
        onPrev={() => setPage((p) => Math.max(0, p - 1))} onNext={() => setPage((p) => Math.min(totalPages - 1, p + 1))} />
    </div>
  )
}

// ─── SaidasTab ────────────────────────────────────────────────────

function SaidasTab({ obraId }: { obraId: string }) {
  const [rows, setRows] = useState<SaidaRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [categoriaFilter, setCategoriaFilter] = useState("")
  const [page, setPage] = useState(0)

  const searchParams = useSearchParams()
  const dateFrom = searchParams.get("dateFrom") || "2020-01-01"
  const dateTo = searchParams.get("dateTo") || "2099-12-31"

  useEffect(() => {
    setLoading(true)
    fetch(`/api/financeiro/saidas?obras=${obraId}&dateFrom=${dateFrom}&dateTo=${dateTo}`)
      .then((r) => r.json())
      .then((data: SaidaRow[]) => { setRows(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [obraId, dateFrom, dateTo])

  useEffect(() => { setPage(0) }, [search, statusFilter, categoriaFilter])
  const categorias = useMemo(() => Array.from(new Set(rows.map((r) => r.categoria).filter(Boolean))).sort(), [rows])
  const filtered = useMemo(() => {
    let r = rows
    if (search) { const q = search.toLowerCase(); r = r.filter((x) => x.fornecedor.toLowerCase().includes(q) || x.descricao.toLowerCase().includes(q)) }
    if (statusFilter) r = r.filter((x) => x.status === statusFilter)
    if (categoriaFilter) r = r.filter((x) => x.categoria === categoriaFilter)
    return r
  }, [rows, search, statusFilter, categoriaFilter])

  const paginated = useMemo(() => filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [filtered, page])
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const totalLancado = useMemo(() => filtered.reduce((s, r) => s + r.valor_parcela, 0), [filtered])
  const totalPago = useMemo(() => filtered.reduce((s, r) => s + r.valor_pago, 0), [filtered])

  if (loading) {
    return (<div className="flex items-center justify-center h-40 text-[var(--text-secondary)]"><Loader2 className="size-5 animate-spin mr-2" /> Carregando saídas...</div>)
  }

  return (
    <div className="space-y-4">
      <SummaryBar items={[
        { label: "Total Lançado", value: formatCurrency(totalLancado) },
        { label: "Total Pago", value: formatCurrency(totalPago), color: "var(--accent-red)" },
        { label: "A Pagar", value: formatCurrency(Math.max(0, totalLancado - totalPago)), color: "var(--accent-amber)" },
      ]} />
      <FilterRow search={search} onSearch={setSearch}
        selects={[
          { value: categoriaFilter, onChange: setCategoriaFilter, placeholder: "Categoria", options: categorias.map((c) => ({ label: c, value: c })) },
          { value: statusFilter, onChange: setStatusFilter, placeholder: "Status", options: [{ label: "Pago", value: "Pago" }, { label: "Parcial", value: "Parcial" }, { label: "Pendente", value: "Pendente" }] },
        ]}
        onExport={() => exportCSV(`saidas-obra-${obraId}.csv`, filtered.map((r) => ({ "Data Pagamento": r.data_pagamento ?? "", Fornecedor: r.fornecedor, Descrição: r.descricao, Categoria: r.categoria, Parcela: r.numero_parcela, "Valor Parcela": r.valor_parcela, "Valor Pago": r.valor_pago, Forma: r.forma_pagamento ?? "", Status: r.status })))}
        count={filtered.length} />
      <div className="rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-transparent dark:border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
        <table className="w-full text-sm table-fixed">
          <colgroup>
            <col style={{ width: "96px" }} /><col /><col style={{ width: "140px" }} />
            <col style={{ width: "46px" }} /><col style={{ width: "120px" }} />
            <col style={{ width: "120px" }} /><col style={{ width: "122px" }} />
          </colgroup>
          <thead className="bg-[var(--bg-card)] border-b border-[var(--border)]">
            <tr><Th>Data Pag.</Th><Th>Fornecedor / Descrição</Th><Th>Categoria</Th><Th align="right">Parc.</Th><Th align="right">Lançado</Th><Th align="right">Pago</Th><Th>Forma / Status</Th></tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-[var(--text-secondary)] text-sm">Nenhuma saída encontrada.</td></tr>
            ) : paginated.map((r, i) => (
              <tr key={`${r.id_lancamento}-${r.numero_parcela}-${i}`} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-card-hover)] transition-colors">
                <td className="px-3 py-3 text-xs text-[var(--text-secondary)] whitespace-nowrap tabular-nums">{r.data_pagamento ? formatDate(r.data_pagamento) : <span className="text-zinc-600">—</span>}</td>
                <td className="px-3 py-3 min-w-0"><p className="text-sm font-medium text-[var(--text-primary)] truncate leading-snug">{r.fornecedor || "—"}</p>{r.descricao && <p className="text-xs text-[var(--text-secondary)] truncate mt-0.5">{r.descricao}</p>}</td>
                <td className="px-3 py-3 min-w-0"><CategoryBadge label={r.categoria} /></td>
                <td className="px-3 py-3 text-right text-xs text-[var(--text-secondary)] tabular-nums">{r.numero_parcela}</td>
                <td className="px-3 py-3 text-right text-sm font-medium text-[var(--text-primary)] whitespace-nowrap tabular-nums">{formatCurrency(r.valor_parcela)}</td>
                <td className="px-3 py-3 text-right text-sm font-semibold whitespace-nowrap tabular-nums" style={{ color: "var(--accent-red)" }}>{formatCurrency(r.valor_pago)}</td>
                <td className="px-3 py-3 min-w-0"><StatusBadge status={r.status} />{r.forma_pagamento && <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 truncate">{r.forma_pagamento}</p>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} total={filtered.length} pageSize={PAGE_SIZE}
        onPrev={() => setPage((p) => Math.max(0, p - 1))} onNext={() => setPage((p) => Math.min(totalPages - 1, p + 1))} />
    </div>
  )
}

// ─── ClientesTab ──────────────────────────────────────────────────

function ClientesTab({ obraId }: { obraId: string }) {
  const [rows, setRows] = useState<EntradaRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  const searchParams = useSearchParams()
  const dateFrom = searchParams.get("dateFrom") || "2020-01-01"
  const dateTo = searchParams.get("dateTo") || "2099-12-31"

  useEffect(() => {
    setLoading(true)
    fetch(`/api/financeiro/entradas?obras=${obraId}&dateFrom=${dateFrom}&dateTo=${dateTo}`)
      .then((r) => r.json())
      .then((data: EntradaRow[]) => { setRows(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [obraId, dateFrom, dateTo])

  const grouped: ClienteGroup[] = useMemo(() => {
    const map = new Map<string, ClienteGroup>()
    for (const r of rows) {
      const key = r.cliente || "Sem nome"
      const e = map.get(key)
      if (!e) {
        map.set(key, { cliente: key, numParcelas: 1, totalFaturado: r.valor_parcela, totalRecebido: r.valor_recebido, pendente: Math.max(0, r.valor_parcela - r.valor_recebido), pctRecebido: r.valor_parcela > 0 ? (r.valor_recebido / r.valor_parcela) * 100 : 0 })
      } else {
        const fat = e.totalFaturado + r.valor_parcela
        const rec = e.totalRecebido + r.valor_recebido
        map.set(key, { ...e, numParcelas: e.numParcelas + 1, totalFaturado: fat, totalRecebido: rec, pendente: Math.max(0, fat - rec), pctRecebido: fat > 0 ? (rec / fat) * 100 : 0 })
      }
    }
    return Array.from(map.values()).sort((a, b) => b.totalFaturado - a.totalFaturado)
  }, [rows])

  const filtered = useMemo(() => {
    if (!search) return grouped
    const q = search.toLowerCase()
    return grouped.filter((g) => g.cliente.toLowerCase().includes(q))
  }, [grouped, search])

  const totalFaturado = useMemo(() => filtered.reduce((s, g) => s + g.totalFaturado, 0), [filtered])
  const totalRecebido = useMemo(() => filtered.reduce((s, g) => s + g.totalRecebido, 0), [filtered])

  if (loading) {
    return (<div className="flex items-center justify-center h-40 text-[var(--text-secondary)]"><Loader2 className="size-5 animate-spin mr-2" /> Carregando clientes...</div>)
  }

  return (
    <div className="space-y-4">
      <SummaryBar items={[
        { label: "Clientes", value: String(filtered.length) },
        { label: "Total Faturado", value: formatCurrency(totalFaturado) },
        { label: "Total Recebido", value: formatCurrency(totalRecebido), color: "var(--accent-green)" },
      ]} />
      <div className="flex items-center gap-2">
        <div className="relative min-w-[200px] max-w-[320px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-[var(--text-secondary)] pointer-events-none" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar cliente..."
            className="w-full pl-8 pr-3 py-[7px] text-sm rounded-lg border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-gold)] focus:border-[var(--accent-gold)]" />
        </div>
        <span className="text-sm text-[var(--text-secondary)] ml-auto">
          <span className="font-semibold text-[var(--text-primary)] tabular-nums">{filtered.length}</span>{" "}
          <span className="text-xs">cliente{filtered.length !== 1 ? "s" : ""}</span>
        </span>
      </div>
      <div className="rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-transparent dark:border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
        <table className="w-full text-sm table-fixed">
          <colgroup>
            <col /><col style={{ width: "74px" }} /><col style={{ width: "148px" }} />
            <col style={{ width: "148px" }} /><col style={{ width: "148px" }} /><col style={{ width: "180px" }} />
          </colgroup>
          <thead className="bg-[var(--bg-card)] border-b border-[var(--border)]">
            <tr><Th>Cliente</Th><Th align="right">Parcelas</Th><Th align="right">Faturado</Th><Th align="right">Recebido</Th><Th align="right">Pendente</Th><Th>% Recebido</Th></tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-[var(--text-secondary)] text-sm">Nenhum cliente encontrado.</td></tr>
            ) : filtered.map((g) => (
              <tr key={g.cliente} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-card-hover)] transition-colors">
                <td className="px-3 py-3 text-sm font-medium text-[var(--text-primary)] truncate">{g.cliente}</td>
                <td className="px-3 py-3 text-right text-xs text-[var(--text-secondary)] tabular-nums">{g.numParcelas}</td>
                <td className="px-3 py-3 text-right text-sm font-medium text-[var(--text-primary)] whitespace-nowrap tabular-nums">{formatCurrency(g.totalFaturado)}</td>
                <td className="px-3 py-3 text-right text-sm font-semibold whitespace-nowrap tabular-nums" style={{ color: "var(--accent-green)" }}>{formatCurrency(g.totalRecebido)}</td>
                <td className="px-3 py-3 text-right text-sm font-medium whitespace-nowrap tabular-nums" style={{ color: "var(--accent-amber)" }}>{formatCurrency(g.pendente)}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, g.pctRecebido).toFixed(1)}%`, background: "var(--accent-gold)" }} />
                    </div>
                    <span className="text-xs text-[var(--text-secondary)] w-10 text-right shrink-0 tabular-nums">{formatPercent(g.pctRecebido)}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── ObraDetailContent ────────────────────────────────────────────

interface ObraDetailContentProps {
  obraId: string
  info: {
    nome: string
    cliente: string | null
    status: string | null
    data_inicio: string | null
    data_previsao_termino: string | null
    endereco: string | null
  }
  kpis: {
    orcamentoTotal: number
    custoRealizado: number
    saldoDisponivel: number
    faturamento: number
    recebido: number
  }
  kpisAvancados: {
    margemBruta: number
    cpi: number
    spi: number
    burnRate: number
    runway: number
  }
  etapas: { etapa: string; orcado: number; realizado: number }[]
  cronograma: {
    etapa: string
    previstoInicio: string | null
    previstoFim: string | null
    realInicio?: string | null
    realFim?: string | null
    percentual: number
  }[]
  gastosPorCategoria: { name: string; value: number }[]
  pagamentosDetalhados: {
    id: string
    fornecedor: string | null
    descricao: string | null
    categoria: string | null
    data_pagamento: string | null
    valor_pago: number
  }[]
}

export function ObraDetailContent({
  obraId,
  info,
  kpis,
  kpisAvancados,
  etapas,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  cronograma: _cronograma,
  gastosPorCategoria,
  pagamentosDetalhados,
}: ObraDetailContentProps) {
  const orcDelta =
    kpis.orcamentoTotal > 0
      ? ((kpis.custoRealizado - kpis.orcamentoTotal) / kpis.orcamentoTotal) * 100
      : 0

  const budgetPct = kpis.orcamentoTotal > 0 ? (kpis.custoRealizado / kpis.orcamentoTotal) * 100 : 0
  const budgetColor = budgetPct > 100 ? "var(--accent-red)" : budgetPct >= 80 ? "var(--accent-amber)" : "var(--accent-green)"

  const statusCls = (() => {
    const s = (info.status ?? "").toLowerCase()
    if (s.includes("ativa") || s.includes("andamento")) return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
    if (s.includes("conclu")) return "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20"
    if (s.includes("paus")) return "bg-amber-500/10 text-amber-400 border border-amber-500/20"
    return "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20"
  })()

  return (
    <div className="space-y-5">
      {/* ── Hero header with integrated KPIs ── */}
      <div className="rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] bg-[var(--bg-card)] border border-transparent dark:border-[var(--border)] overflow-hidden">
        {/* Top color stripe */}
        <div className="h-[3px]" style={{ background: budgetColor }} />

        <div className="p-5">
          {/* Back + title row */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="min-w-0 flex-1">
              <Link href="/obras" className="inline-flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:text-[var(--accent-gold)] transition-colors mb-2">
                <ArrowLeft className="size-3" /> Obras
              </Link>
              <h1 className="text-xl font-bold text-[var(--text-primary)] leading-tight">{info.nome}</h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
                {info.endereco && (
                  <span className="inline-flex items-center gap-1 text-xs text-[var(--text-secondary)] opacity-70">
                    <MapPin className="size-3" /> {info.endereco}
                  </span>
                )}
                {(info.data_inicio || info.data_previsao_termino) && (
                  <span className="inline-flex items-center gap-1 text-xs text-[var(--text-secondary)] opacity-70">
                    <Calendar className="size-3" />
                    {info.data_inicio ? formatDate(info.data_inicio) : "—"} → {info.data_previsao_termino ? formatDate(info.data_previsao_termino) : "—"}
                  </span>
                )}
              </div>
            </div>
            {info.status && (
              <span className={`rounded-md px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${statusCls}`}>
                {info.status}
              </span>
            )}
          </div>

          {/* Inline budget progress */}
          <div className="flex items-center gap-3 pt-3 border-t border-[var(--border)]">
            <span className="text-xs font-medium text-[var(--text-secondary)]">Execução orçamentária</span>
            <div className="flex-1 h-2 rounded-full bg-[var(--border)] overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(budgetPct, 100)}%`, background: budgetColor }} />
            </div>
            <span className="text-xs font-bold tabular-nums" style={{ color: budgetColor }}>
              {formatPercent(budgetPct, 0)}
            </span>
            <span className="text-xs text-[var(--text-secondary)]">
              {formatCompactCurrency(kpis.custoRealizado)} / {formatCompactCurrency(kpis.orcamentoTotal)}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="resumo">
        <div className="border-b border-[var(--border)]">
          <TabsList variant="line" className="bg-transparent gap-0 h-auto rounded-none w-auto px-0">
            {[
              { value: "resumo", label: "Resumo" },
              { value: "entradas", label: "Entradas" },
              { value: "saidas", label: "Saídas" },
              { value: "clientes", label: "Clientes" },
            ].map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}
                className="px-5 py-3 text-sm font-medium data-active:text-[var(--accent-gold)] after:bg-[var(--accent-gold)] transition-colors">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* ── Resumo ── */}
        <TabsContent value="resumo">
          <div className="space-y-5 pt-5">
            {/* Main KPIs — 3 columns */}
            <div className="grid grid-cols-3 gap-4">
              <KpiCard icon={DollarSign} title="Orçamento Total" value={formatCompactCurrency(kpis.orcamentoTotal)} delta={0} deltaColor="blue" subtitle="valor orçado" />
              <KpiCard icon={Wallet} title="Custo Realizado" value={formatCompactCurrency(kpis.custoRealizado)} delta={orcDelta} deltaColor={orcDelta <= 0 ? "green" : "red"} subtitle="vs. orçamento" />
              <KpiCard icon={Receipt} title="Saldo Disponível" value={formatCompactCurrency(kpis.saldoDisponivel)} delta={0} deltaColor={kpis.saldoDisponivel >= 0 ? "green" : "red"} subtitle="orçado − realizado" />
            </div>

            {/* Secondary KPIs — 2 columns */}
            <div className="grid grid-cols-2 gap-4">
              <KpiCard icon={CreditCard} title="Faturamento" value={formatCompactCurrency(kpis.faturamento)} delta={0} deltaColor="blue" subtitle="total faturado" />
              <KpiCard icon={Banknote} title="Recebido" value={formatCompactCurrency(kpis.recebido)} delta={kpis.faturamento > 0 ? (kpis.recebido / kpis.faturamento) * 100 - 100 : 0} deltaColor="green" subtitle="total recebido" />
            </div>

            {/* Advanced metrics — horizontal bar */}
            <div className="grid grid-cols-5 gap-4">
              <KpiCardSmall icon={Percent} title="Margem Bruta" value={formatPercent(kpisAvancados.margemBruta)} subtitle="fat. − custo / fat." />
              <KpiCardSmall icon={TrendingUp} title="CPI" value={kpisAvancados.cpi.toFixed(2)} subtitle={kpisAvancados.cpi >= 1 ? "dentro do orçamento" : "acima do orçamento"} />
              <KpiCardSmall icon={Activity} title="SPI" value={kpisAvancados.spi.toFixed(2)} subtitle={kpisAvancados.spi >= 1 ? "adiantado" : "atrasado"} />
              <KpiCardSmall icon={Flame} title="Burn Rate" value={formatCompactCurrency(kpisAvancados.burnRate)} subtitle="média diária (30d)" />
              <KpiCardSmall icon={Timer} title="Runway" value={kpisAvancados.runway > 0 ? `${Math.round(kpisAvancados.runway)}d` : "N/A"} subtitle="saldo / burn rate" />
            </div>

            {/* Charts */}
            <section className="rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] bg-[var(--bg-card)] border border-transparent dark:border-[var(--border)] p-5">
              <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Orçado vs Realizado por Etapa</h2>
              {etapas.length > 0 ? <EtapasBarChart data={etapas} /> : <div className="flex items-center justify-center h-[200px] text-[var(--text-secondary)] text-sm">Nenhum dado.</div>}
            </section>



            <section className="grid grid-cols-1 gap-5">
              <div className="rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] bg-[var(--bg-card)] border border-transparent dark:border-[var(--border)] p-5">
                <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Gastos por Categoria</h2>
                {gastosPorCategoria.length > 0 ? <DonutChart data={gastosPorCategoria} /> : <div className="flex items-center justify-center h-[280px] text-[var(--text-secondary)] text-sm">Nenhum dado.</div>}
              </div>
              <div className="rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] bg-[var(--bg-card)] border border-transparent dark:border-[var(--border)] p-5">
                <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Pagamentos Detalhados</h2>
                {pagamentosDetalhados.length > 0 ? <PagamentosTable data={pagamentosDetalhados} /> : <div className="flex items-center justify-center h-[280px] text-[var(--text-secondary)] text-sm">Nenhum pagamento.</div>}
              </div>
            </section>
          </div>
        </TabsContent>

        <TabsContent value="entradas">
          <div className="pt-5"><EntradasTab obraId={obraId} /></div>
        </TabsContent>

        <TabsContent value="saidas">
          <div className="pt-5"><SaidasTab obraId={obraId} /></div>
        </TabsContent>

        <TabsContent value="clientes">
          <div className="pt-5"><ClientesTab obraId={obraId} /></div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
