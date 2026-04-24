"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Download, Loader2, type LucideIcon } from "lucide-react"

interface ReportCardProps {
  title: string
  description: string
  icon: LucideIcon
  destinatario: string
  formats: ("Excel" | "CSV" | "PDF")[]
  type: string
}

export function ReportCard({
  title,
  description,
  icon: Icon,
  destinatario,
  formats,
  type,
}: ReportCardProps) {
  const [loading, setLoading] = useState(false)
  const [selectedFormat, setSelectedFormat] = useState<string>(
    formats.includes("Excel") ? "excel" : "csv"
  )

  async function handleDownload() {
    setLoading(true)
    try {
      const today = new Date()
      const dateFrom = new Date(today)
      dateFrom.setMonth(dateFrom.getMonth() - 3)

      const params = new URLSearchParams({
        formato: selectedFormat,
        dateFrom: dateFrom.toISOString().split("T")[0],
        dateTo: today.toISOString().split("T")[0],
      })

      const response = await fetch(`/api/reports/${type}?${params.toString()}`)

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
      a.download = filenameMatch?.[1] ?? `relatorio.${selectedFormat === "csv" ? "csv" : "xlsx"}`

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

  const formatMap: Record<string, string> = {
    Excel: "excel",
    CSV: "csv",
    PDF: "pdf",
  }

  const formatColors: Record<string, string> = {
    Excel: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    CSV: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    PDF: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  }

  return (
    <div className="group relative flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent)]/10">
          <Icon className="h-5 w-5 text-[var(--accent)]" />
        </div>
        <span className="rounded-full bg-[var(--muted)] px-2.5 py-0.5 text-xs font-medium text-[var(--text-secondary)]">
          {destinatario}
        </span>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
        <p className="mt-1 text-xs text-[var(--text-secondary)] line-clamp-1">{description}</p>
      </div>

      <div className="flex items-center gap-2">
        {formats.map((format) => (
          <button
            key={format}
            type="button"
            onClick={() => setSelectedFormat(formatMap[format])}
            className={cn(
              "rounded px-2 py-0.5 text-xs font-medium transition-all",
              formatMap[format] === selectedFormat
                ? formatColors[format]
                : "bg-[var(--muted)] text-[var(--text-secondary)] opacity-60 hover:opacity-100"
            )}
          >
            {format}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={handleDownload}
        disabled={loading}
        className={cn(
          "mt-auto flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
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
            Baixar Relatório
          </>
        )}
      </button>
    </div>
  )
}
