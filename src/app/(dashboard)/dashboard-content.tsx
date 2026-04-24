"use client"

import Link from 'next/link'
import {
  DollarSign,
  TrendingDown,
  TrendingUp,
  Wallet,
  CreditCard,
  Building2,
  BarChart3,
  Percent,
  ArrowRight,
  BarChart2,
  PieChart as PieChartIcon,
  AlertTriangle,
  Inbox,
  Activity,
} from 'lucide-react'
import { KpiCard } from '@/components/cards/kpi-card'
import { KpiCardSmall } from '@/components/cards/kpi-card-small'
import { AlertCard } from '@/components/cards/alert-card'
import { CashflowChart } from '@/components/charts/cashflow-chart'
import { DonutChart } from '@/components/charts/donut-chart'
import { BarHorizontal } from '@/components/charts/bar-horizontal'
import { formatCompactCurrency, formatPercent } from '@/lib/utils/format'
import { cn } from '@/lib/utils'

interface MainKPIs {
  receita: { value: number; delta: number; sparkline: number[] }
  despesa: { value: number; delta: number; sparkline: number[] }
  lucro: { value: number; delta: number; margin: number; sparkline: number[] }
  saldo: { value: number; delta: number; projection30d: number; sparkline: number[] }
}

interface SecondaryKPIs {
  totalReceber: number
  totalPagar: number
  obrasAtivas: number
  margemOperacional: number
}

interface Alert {
  severity: 'critical' | 'warning'
  message: string
  obra: string
  value: string
}

interface DashboardContentProps {
  mainKPIs: MainKPIs
  secondaryKPIs: SecondaryKPIs
  cashflow: { date: string; entradas: number; saidas: number; saldo: number }[]
  topObras: { name: string; value: number; id?: string }[]
  categories: { name: string; value: number }[]
  alerts: Alert[]
}

/* ── Flup: Empty State Component ── */
function EmptyState({ message = "Nenhum dado disponível" }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-[200px] rounded-xl bg-[var(--color-surface-50)]/80 dark:bg-[var(--color-surface-800)]/30 border border-dashed border-[var(--color-surface-200)] dark:border-[var(--color-surface-700)]/50">
      <div className="flex items-center justify-center size-12 rounded-2xl bg-[var(--color-surface-100)] dark:bg-[var(--color-surface-800)] mb-3">
        <Inbox className="size-5 text-[var(--color-surface-400)]" strokeWidth={1.5} />
      </div>
      <p className="text-sm font-medium text-[var(--color-surface-400)]">
        {message}
      </p>
    </div>
  )
}

/* ── Flup: Section Card (wrapper for chart areas) ── */
function SectionCard({
  icon: Icon,
  title,
  action,
  children,
  className,
}: {
  icon: React.ElementType;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(
      "relative rounded-2xl bg-white dark:bg-[var(--bg-card)] overflow-hidden",
      "border border-[var(--color-surface-200)]/40 dark:border-[var(--color-surface-700)]/40",
      "shadow-[var(--shadow-sm)] transition-shadow duration-300 hover:shadow-[var(--shadow-md)]",
      className
    )}>
      {/* Decorative gradient blob */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-[var(--color-primary-50)] via-[var(--color-primary-50)]/30 to-transparent rounded-bl-[120px] opacity-60 pointer-events-none dark:from-[var(--color-primary-500)]/5 dark:via-transparent dark:opacity-30" />

      <div className="relative p-5 sm:p-6">
        {/* Header da seção */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center size-8 rounded-lg bg-[var(--color-primary-50)] dark:bg-[var(--color-primary-500)]/10">
              <Icon className="size-[16px] text-[var(--color-primary-500)]" strokeWidth={2} />
            </div>
            <h2 className="text-[15px] font-bold text-[var(--color-surface-900)] dark:text-white tracking-tight">
              {title}
            </h2>
          </div>
          {action}
        </div>

        {children}
      </div>
    </div>
  )
}

export function DashboardContent({
  mainKPIs,
  secondaryKPIs,
  cashflow,
  topObras,
  categories,
  alerts,
}: DashboardContentProps) {
  const lucroColor = mainKPIs.lucro.value >= 0 ? 'green' : 'red'

  return (
    <div className="space-y-6">
      {/* Section A: Main KPIs — staggered animation */}
      <section>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="flup-fade-up flup-stagger-1">
            <KpiCard
              icon={DollarSign}
              title="Receita"
              value={formatCompactCurrency(mainKPIs.receita.value)}
              delta={mainKPIs.receita.delta}
              deltaColor="green"
              subtitle="vs. periodo anterior"
              sparklineData={mainKPIs.receita.sparkline}
              color="var(--color-success-500)"
            />
          </div>
          <div className="flup-fade-up flup-stagger-2">
            <KpiCard
              icon={TrendingDown}
              title="Despesa"
              value={formatCompactCurrency(mainKPIs.despesa.value)}
              delta={mainKPIs.despesa.delta}
              deltaColor="red"
              subtitle="vs. periodo anterior"
              sparklineData={mainKPIs.despesa.sparkline}
              color="var(--color-danger-500)"
            />
          </div>
          <div className="flup-fade-up flup-stagger-3">
            <KpiCard
              icon={TrendingUp}
              title="Lucro"
              value={formatCompactCurrency(mainKPIs.lucro.value)}
              delta={mainKPIs.lucro.delta}
              deltaColor={lucroColor as 'green' | 'red'}
              subtitle={`Margem ${formatPercent(mainKPIs.lucro.margin)}`}
              sparklineData={mainKPIs.lucro.sparkline}
              color={lucroColor === 'green' ? 'var(--color-success-500)' : 'var(--color-danger-500)'}
            />
          </div>
          <div className="flup-fade-up flup-stagger-4">
            <KpiCard
              icon={Wallet}
              title="Saldo"
              value={formatCompactCurrency(mainKPIs.saldo.value)}
              delta={mainKPIs.saldo.delta}
              deltaColor="blue"
              subtitle={`Proj. 30d: ${formatCompactCurrency(mainKPIs.saldo.projection30d)}`}
              sparklineData={mainKPIs.saldo.sparkline}
              color="var(--color-info-500)"
            />
          </div>
        </div>
      </section>

      {/* Section A2: Secondary KPIs */}
      <section>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="flup-fade-up flup-stagger-5">
            <KpiCardSmall icon={CreditCard} title="Total a Receber" value={formatCompactCurrency(secondaryKPIs.totalReceber)} subtitle="faturado - recebido" />
          </div>
          <div className="flup-fade-up flup-stagger-6">
            <KpiCardSmall icon={BarChart3} title="Total a Pagar" value={formatCompactCurrency(secondaryKPIs.totalPagar)} subtitle="lancado - pago" />
          </div>
          <div className="flup-fade-up flup-stagger-7">
            <KpiCardSmall icon={Building2} title="Obras Ativas" value={String(secondaryKPIs.obrasAtivas)} subtitle="em andamento" />
          </div>
          <div className="flup-fade-up flup-stagger-8">
            <KpiCardSmall icon={Percent} title="Margem Operacional" value={formatPercent(secondaryKPIs.margemOperacional)} subtitle="lucro / receita" />
          </div>
        </div>
      </section>

      {/* Section B: Cashflow Summary */}
      <section className="flup-fade-up" style={{ animationDelay: '350ms' }}>
        <SectionCard
          icon={Activity}
          title="Fluxo de Caixa"
          action={
            <Link
              href="/fluxo-caixa"
              className="flex items-center gap-1.5 text-[12px] font-semibold text-[var(--color-primary-500)] hover:text-[var(--color-primary-600)] bg-[var(--color-primary-50)] dark:bg-[var(--color-primary-500)]/10 rounded-lg px-3 py-1.5 transition-all duration-200 hover:shadow-sm"
            >
              Ver completo <ArrowRight className="size-3.5" />
            </Link>
          }
        >
          {cashflow.length > 0 ? (
            <CashflowChart data={cashflow} />
          ) : (
            <EmptyState message="Sem dados de fluxo de caixa para o período" />
          )}
        </SectionCard>
      </section>

      {/* Section C: Two columns */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flup-fade-up" style={{ animationDelay: '400ms' }}>
          <SectionCard icon={BarChart2} title="Top 5 Obras por Gasto" className="h-full">
            {topObras.length > 0 ? (
              <BarHorizontal data={topObras} onClick={(id) => id && window.location.assign(`/obras/${id}`)} />
            ) : (
              <EmptyState message="Sem dados de obras" />
            )}
          </SectionCard>
        </div>

        <div className="flup-fade-up" style={{ animationDelay: '450ms' }}>
          <SectionCard icon={PieChartIcon} title="Distribuição por Categoria" className="h-full">
            {categories.length > 0 ? (
              <DonutChart data={categories} />
            ) : (
              <EmptyState message="Sem dados de categorias" />
            )}
          </SectionCard>
        </div>
      </section>

      {/* Section D: Alerts */}
      <section className="flup-fade-up" style={{ animationDelay: '500ms' }}>
        <SectionCard icon={AlertTriangle} title="Alertas">
          {alerts.length > 0 ? (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {alerts.slice(0, 8).map((alert, i) => (
                <AlertCard key={i} {...alert} />
              ))}
            </div>
          ) : (
            <EmptyState message="Nenhum alerta no momento" />
          )}
        </SectionCard>
      </section>
    </div>
  )
}
