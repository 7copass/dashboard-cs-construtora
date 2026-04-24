"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Download, Loader2 } from "lucide-react"

export function CustomExport() {
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [tipoDado, setTipoDado] = useState("ambos")
  const [formato, setFormato] = useState("excel")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const params = new URLSearchParams()
      if (dateFrom) params.set("dateFrom", dateFrom)
      if (dateTo) params.set("dateTo", dateTo)
      if (tipoDado !== "ambos") params.set("tipoDado", tipoDado)
      params.set("formato", formato)

      const response = await fetch(`/api/reports/custom?${params.toString()}`)

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        const message = (errorData as Record<string, string> | null)?.error ?? "Erro ao gerar relatório"
        alert(message)
        return
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url

      const disposition = response.headers.get("Content-Disposition")
      const filenameMatch = disposition?.match(/filename="(.+)"/)
      a.download = filenameMatch?.[1] ?? `relatorio-custom.${formato === "csv" ? "csv" : "xlsx"}`

      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch {
      alert("Erro ao gerar relatório. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  const inputClasses =
    "w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
  const labelClasses = "block text-sm font-medium text-[var(--text-secondary)] mb-1.5"

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-6">
        Exportação Customizada
      </h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {/* Date From */}
        <div>
          <label htmlFor="dateFrom" className={labelClasses}>
            Data Início
          </label>
          <input
            id="dateFrom"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className={inputClasses}
          />
        </div>

        {/* Date To */}
        <div>
          <label htmlFor="dateTo" className={labelClasses}>
            Data Fim
          </label>
          <input
            id="dateTo"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className={inputClasses}
          />
        </div>

        {/* Obras Multi-select (placeholder) */}
        <div>
          <label htmlFor="obras" className={labelClasses}>
            Obras
          </label>
          <select id="obras" disabled className={cn(inputClasses, "opacity-50 cursor-not-allowed")}>
            <option>Todas as obras</option>
          </select>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">Em breve</p>
        </div>

        {/* Categorias Multi-select (placeholder) */}
        <div>
          <label htmlFor="categorias" className={labelClasses}>
            Categorias
          </label>
          <select id="categorias" disabled className={cn(inputClasses, "opacity-50 cursor-not-allowed")}>
            <option>Todas as categorias</option>
          </select>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">Em breve</p>
        </div>

        {/* Tipo de Dado */}
        <div>
          <label htmlFor="tipoDado" className={labelClasses}>
            Tipo de Dado
          </label>
          <select
            id="tipoDado"
            value={tipoDado}
            onChange={(e) => setTipoDado(e.target.value)}
            className={inputClasses}
          >
            <option value="ambos">Entradas e Saídas</option>
            <option value="entradas">Somente Entradas</option>
            <option value="saidas">Somente Saídas</option>
          </select>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        {/* Formato */}
        <div>
          <label htmlFor="formato" className={labelClasses}>
            Formato
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFormato("excel")}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                formato === "excel"
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-[var(--muted)] text-[var(--text-secondary)] hover:bg-[var(--muted)]/80"
              )}
            >
              Excel
            </button>
            <button
              type="button"
              onClick={() => setFormato("csv")}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                formato === "csv"
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                  : "bg-[var(--muted)] text-[var(--text-secondary)] hover:bg-[var(--muted)]/80"
              )}
            >
              CSV
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className={cn(
            "flex items-center justify-center gap-2 rounded-lg px-6 py-2.5 text-sm font-medium transition-colors",
            "bg-[var(--accent)] text-white hover:bg-[var(--accent)]/90",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Gerando...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Gerar Relatório
            </>
          )}
        </button>
      </div>
    </form>
  )
}
