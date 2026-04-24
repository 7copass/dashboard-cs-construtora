"use client"

import {
  FileSpreadsheet,
  FileText,
  AlertTriangle,
  BarChart3,
  Calculator,
  Building2,
  List,
  TrendingUp,
  type LucideIcon,
} from "lucide-react"
import { ReportCard } from "./report-card"
import { CustomExport } from "./custom-export"

interface ReportDef {
  title: string
  description: string
  icon: LucideIcon
  destinatario: string
  formats: ("Excel" | "CSV" | "PDF")[]
  type: string
}

const REPORTS: ReportDef[] = [
  {
    title: "Fluxo de Caixa por Período",
    description: "Entradas, saídas e saldo diário por período selecionado",
    icon: FileSpreadsheet,
    destinatario: "Gestor / Financeiro",
    formats: ["Excel", "CSV"],
    type: "fluxo-caixa",
  },
  {
    title: "Demonstrativo por Obra",
    description: "Comparativo de orçado vs realizado por obra com desvio",
    icon: FileText,
    destinatario: "Gestor / Sócios",
    formats: ["Excel"],
    type: "demonstrativo-obra",
  },
  {
    title: "Relatório de Inadimplência",
    description: "Clientes inadimplentes com aging e faixas de atraso",
    icon: AlertTriangle,
    destinatario: "Financeiro",
    formats: ["Excel", "CSV"],
    type: "inadimplencia",
  },
  {
    title: "Mapa de Gastos por Categoria",
    description: "Gastos agrupados por categoria e centro de custo",
    icon: BarChart3,
    destinatario: "Contabilidade",
    formats: ["Excel"],
    type: "gastos-categoria",
  },
  {
    title: "Balancete Simplificado",
    description: "Receitas, despesas e resultado por período",
    icon: Calculator,
    destinatario: "Contabilidade",
    formats: ["Excel"],
    type: "balancete",
  },
  {
    title: "Relatório de Obras",
    description: "Status geral de todas as obras com progresso e prazos",
    icon: Building2,
    destinatario: "Gestor",
    formats: ["Excel"],
    type: "status-obras",
  },
  {
    title: "Extrato por Obra",
    description: "Todos os lançamentos detalhados de uma obra específica",
    icon: List,
    destinatario: "Financeiro",
    formats: ["Excel", "CSV"],
    type: "extrato-obra",
  },
  {
    title: "Proposta vs Resultado",
    description: "Comparativo de proposto, faturado e custo por obra",
    icon: TrendingUp,
    destinatario: "Sócios",
    formats: ["Excel"],
    type: "proposta-resultado",
  },
]

export default function RelatoriosPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Relatórios e Exportação
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Gere relatórios predefinidos ou exporte dados customizados
        </p>
      </div>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
          Relatórios Predefinidos
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {REPORTS.map((report) => (
            <ReportCard
              key={report.type}
              title={report.title}
              description={report.description}
              icon={report.icon}
              destinatario={report.destinatario}
              formats={report.formats}
              type={report.type}
            />
          ))}
        </div>
      </section>

      <section>
        <CustomExport />
      </section>
    </div>
  )
}
