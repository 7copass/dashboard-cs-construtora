import { createClient } from '@/lib/supabase/server'

interface Filters {
  dateFrom: string
  dateTo: string
  obras?: string[]
  categorias?: string[]
}

interface KPIResult {
  value: number
  delta: number
  sparkline: number[]
}

interface MainKPIs {
  receita: KPIResult
  despesa: KPIResult
  lucro: KPIResult & { margin: number }
  saldo: KPIResult & { projection30d: number }
}

interface SecondaryKPIs {
  totalReceber: number
  totalPagar: number
  obrasAtivas: number
  margemOperacional: number
}

/**
 * Compute the previous period of the same length for delta calculation.
 * E.g. if dateFrom=2026-03-01, dateTo=2026-03-31 (31 days),
 * prevFrom=2026-01-29, prevTo=2026-02-28
 */
function getPreviousPeriod(dateFrom: string, dateTo: string) {
  const from = new Date(dateFrom)
  const to = new Date(dateTo)
  const diffMs = to.getTime() - from.getTime()
  const prevTo = new Date(from.getTime() - 1) // day before dateFrom
  const prevFrom = new Date(prevTo.getTime() - diffMs)
  return {
    prevFrom: prevFrom.toISOString().slice(0, 10),
    prevTo: prevTo.toISOString().slice(0, 10),
  }
}

function calcDelta(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100
  return ((current - previous) / Math.abs(previous)) * 100
}

/**
 * Build last 7 sparkline data points from raw daily records.
 * Groups by date and sums values, returning only the last 7 days.
 */
function buildSparkline(
  rows: Array<{ date: string | null; value: number | null }>,
  dateTo: string
): number[] {
  const map = new Map<string, number>()
  for (const r of rows) {
    if (!r.date) continue
    const d = r.date.slice(0, 10)
    map.set(d, (map.get(d) ?? 0) + (r.value ?? 0))
  }

  // Generate last 7 days up to dateTo
  const end = new Date(dateTo)
  const points: number[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(end)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    points.push(map.get(key) ?? 0)
  }
  return points
}

export async function getMainKPIs(filters: Filters): Promise<MainKPIs> {
  const supabase = await createClient()
  const { prevFrom, prevTo } = getPreviousPeriod(filters.dateFrom, filters.dateTo)

  try {
    // --- Receita (current period) ---
    let receitaQuery = supabase
      .from('recebimentos')
      .select('valor_recebido, data_recebimento')
      .gte('data_recebimento', filters.dateFrom)
      .lte('data_recebimento', filters.dateTo)
    if (filters.obras?.length) receitaQuery = receitaQuery.in('id_obra', filters.obras.map(Number))
    const { data: recebCurrent } = await receitaQuery.limit(10000)

    const receitaValue = (recebCurrent ?? []).reduce((s, r) => s + (r.valor_recebido ?? 0), 0)

    // --- Receita (previous period) ---
    let receitaPrevQuery = supabase
      .from('recebimentos')
      .select('valor_recebido')
      .gte('data_recebimento', prevFrom)
      .lte('data_recebimento', prevTo)
    if (filters.obras?.length) receitaPrevQuery = receitaPrevQuery.in('id_obra', filters.obras.map(Number))
    const { data: recebPrev } = await receitaPrevQuery.limit(10000)

    const receitaPrevValue = (recebPrev ?? []).reduce((s, r) => s + (r.valor_recebido ?? 0), 0)

    // --- Receita sparkline ---
    let receitaSparkQuery = supabase
      .from('recebimentos')
      .select('data_recebimento, valor_recebido')
    if (filters.obras?.length) receitaSparkQuery = receitaSparkQuery.in('id_obra', filters.obras.map(Number))
    // Get last 7 days ending at dateTo
    const spark7daysAgo = new Date(filters.dateTo)
    spark7daysAgo.setDate(spark7daysAgo.getDate() - 6)
    receitaSparkQuery = receitaSparkQuery
      .gte('data_recebimento', spark7daysAgo.toISOString().slice(0, 10))
      .lte('data_recebimento', filters.dateTo)
    const { data: receitaSparkData } = await receitaSparkQuery.limit(10000)

    const receitaSparkline = buildSparkline(
      (receitaSparkData ?? []).map(r => ({ date: r.data_recebimento, value: r.valor_recebido })),
      filters.dateTo
    )

    // --- Despesa (current period) ---
    let despesaQuery = supabase
      .from('pagamentos')
      .select('valor_pago, data_pagamento')
      .gte('data_pagamento', filters.dateFrom)
      .lte('data_pagamento', filters.dateTo)
    if (filters.obras?.length) despesaQuery = despesaQuery.in('id_obra', filters.obras.map(Number))
    if (filters.categorias?.length) despesaQuery = despesaQuery.in('categoria', filters.categorias)
    const { data: pagCurrent } = await despesaQuery.limit(10000)

    const despesaValue = (pagCurrent ?? []).reduce((s, r) => s + (r.valor_pago ?? 0), 0)

    // --- Despesa (previous period) ---
    let despesaPrevQuery = supabase
      .from('pagamentos')
      .select('valor_pago')
      .gte('data_pagamento', prevFrom)
      .lte('data_pagamento', prevTo)
    if (filters.obras?.length) despesaPrevQuery = despesaPrevQuery.in('id_obra', filters.obras.map(Number))
    if (filters.categorias?.length) despesaPrevQuery = despesaPrevQuery.in('categoria', filters.categorias)
    const { data: pagPrev } = await despesaPrevQuery.limit(10000)

    const despesaPrevValue = (pagPrev ?? []).reduce((s, r) => s + (r.valor_pago ?? 0), 0)

    // --- Despesa sparkline ---
    let despesaSparkQuery = supabase
      .from('pagamentos')
      .select('data_pagamento, valor_pago')
    if (filters.obras?.length) despesaSparkQuery = despesaSparkQuery.in('id_obra', filters.obras.map(Number))
    despesaSparkQuery = despesaSparkQuery
      .gte('data_pagamento', spark7daysAgo.toISOString().slice(0, 10))
      .lte('data_pagamento', filters.dateTo)
    const { data: despesaSparkData } = await despesaSparkQuery.limit(10000)

    const despesaSparkline = buildSparkline(
      (despesaSparkData ?? []).map(r => ({ date: r.data_pagamento, value: r.valor_pago })),
      filters.dateTo
    )

    // --- Lucro ---
    const lucroValue = receitaValue - despesaValue
    const lucroPrevValue = receitaPrevValue - despesaPrevValue
    const margin = receitaValue === 0 ? 0 : (lucroValue / receitaValue) * 100
    const lucroSparkline = receitaSparkline.map((r, i) => r - despesaSparkline[i])

    // --- Saldo (cumulative all time up to dateTo) ---
    let saldoRecQuery = supabase
      .from('recebimentos')
      .select('valor_recebido')
      .lte('data_recebimento', filters.dateTo)
    if (filters.obras?.length) saldoRecQuery = saldoRecQuery.in('id_obra', filters.obras.map(Number))
    const { data: saldoRecData } = await saldoRecQuery.limit(10000)

    const totalReceitaAllTime = (saldoRecData ?? []).reduce((s, r) => s + (r.valor_recebido ?? 0), 0)

    let saldoPagQuery = supabase
      .from('pagamentos')
      .select('valor_pago')
      .lte('data_pagamento', filters.dateTo)
    if (filters.obras?.length) saldoPagQuery = saldoPagQuery.in('id_obra', filters.obras.map(Number))
    const { data: saldoPagData } = await saldoPagQuery.limit(10000)

    const totalDespesaAllTime = (saldoPagData ?? []).reduce((s, r) => s + (r.valor_pago ?? 0), 0)

    const saldoValue = totalReceitaAllTime - totalDespesaAllTime

    // Simple 30-day projection based on current period daily avg
    const periodDays = Math.max(1, Math.ceil(
      (new Date(filters.dateTo).getTime() - new Date(filters.dateFrom).getTime()) / (1000 * 60 * 60 * 24)
    ) + 1)
    const dailyNet = (receitaValue - despesaValue) / periodDays
    const projection30d = saldoValue + dailyNet * 30

    // Saldo sparkline: running sum over last 7 days
    const saldoSparkline = receitaSparkline.map((r, i) => r - despesaSparkline[i])
    let runningSum = 0
    const saldoCumulativeSparkline = saldoSparkline.map(v => {
      runningSum += v
      return runningSum
    })

    // Saldo delta: compare saldo now vs saldo at start of previous period
    let saldoPrevRecQuery = supabase
      .from('recebimentos')
      .select('valor_recebido')
      .lte('data_recebimento', prevTo)
    if (filters.obras?.length) saldoPrevRecQuery = saldoPrevRecQuery.in('id_obra', filters.obras.map(Number))
    const { data: saldoPrevRecData } = await saldoPrevRecQuery.limit(10000)

    let saldoPrevPagQuery = supabase
      .from('pagamentos')
      .select('valor_pago')
      .lte('data_pagamento', prevTo)
    if (filters.obras?.length) saldoPrevPagQuery = saldoPrevPagQuery.in('id_obra', filters.obras.map(Number))
    const { data: saldoPrevPagData } = await saldoPrevPagQuery.limit(10000)

    const saldoPrevValue =
      (saldoPrevRecData ?? []).reduce((s, r) => s + (r.valor_recebido ?? 0), 0) -
      (saldoPrevPagData ?? []).reduce((s, r) => s + (r.valor_pago ?? 0), 0)

    return {
      receita: {
        value: receitaValue,
        delta: calcDelta(receitaValue, receitaPrevValue),
        sparkline: receitaSparkline,
      },
      despesa: {
        value: despesaValue,
        delta: calcDelta(despesaValue, despesaPrevValue),
        sparkline: despesaSparkline,
      },
      lucro: {
        value: lucroValue,
        delta: calcDelta(lucroValue, lucroPrevValue),
        margin,
        sparkline: lucroSparkline,
      },
      saldo: {
        value: saldoValue,
        delta: calcDelta(saldoValue, saldoPrevValue),
        projection30d,
        sparkline: saldoCumulativeSparkline,
      },
    }
  } catch (error) {
    console.error('Error fetching main KPIs:', error)
    const emptySparkline = [0, 0, 0, 0, 0, 0, 0]
    return {
      receita: { value: 0, delta: 0, sparkline: emptySparkline },
      despesa: { value: 0, delta: 0, sparkline: emptySparkline },
      lucro: { value: 0, delta: 0, margin: 0, sparkline: emptySparkline },
      saldo: { value: 0, delta: 0, projection30d: 0, sparkline: emptySparkline },
    }
  }
}

export async function getSecondaryKPIs(filters: Filters): Promise<SecondaryKPIs> {
  const supabase = await createClient()

  try {
    // --- Total a Receber: faturado - recebido (for non-completed) ---
    let fatQuery = supabase
      .from('faturamentos')
      .select('valor_parcela')
    if (filters.obras?.length) fatQuery = fatQuery.in('id_obra', filters.obras.map(Number))
    const { data: fatData } = await fatQuery.limit(10000)

    const totalFaturado = (fatData ?? []).reduce((s, r) => s + (r.valor_parcela ?? 0), 0)

    let recAllQuery = supabase
      .from('recebimentos')
      .select('valor_recebido')
    if (filters.obras?.length) recAllQuery = recAllQuery.in('id_obra', filters.obras.map(Number))
    const { data: recAllData } = await recAllQuery.limit(10000)

    const totalRecebido = (recAllData ?? []).reduce((s, r) => s + (r.valor_recebido ?? 0), 0)
    const totalReceber = Math.max(0, totalFaturado - totalRecebido)

    // --- Total a Pagar: lancamentos(saida, !pago) - pagamentos already paid ---
    let lancQuery = supabase
      .from('lancamentos')
      .select('valor_parcela')
    if (filters.obras?.length) lancQuery = lancQuery.in('id_obra', filters.obras.map(Number))
    const { data: lancData } = await lancQuery.limit(10000)

    const totalLancamentos = (lancData ?? []).reduce((s, r) => s + (r.valor_parcela ?? 0), 0)

    let pagAllQuery = supabase
      .from('pagamentos')
      .select('valor_pago')
    if (filters.obras?.length) pagAllQuery = pagAllQuery.in('id_obra', filters.obras.map(Number))
    const { data: pagAllData } = await pagAllQuery.limit(10000)

    const totalPago = (pagAllData ?? []).reduce((s, r) => s + (r.valor_pago ?? 0), 0)
    const totalPagar = Math.max(0, totalLancamentos - totalPago)

    // --- Obras ativas ---
    const obrasQuery = supabase
      .from('obras')
      .select('id, status_obra')
    const { data: obrasData } = await obrasQuery

    const obrasAtivas = (obrasData ?? []).filter(o => {
      const s = (o.status_obra ?? '').toLowerCase()
      return s.includes('ativ') || s.includes('andamento') || s.includes('execu')
    }).length

    // --- Margem operacional ---
    // Use same period receita/despesa
    let recPeriodQuery = supabase
      .from('recebimentos')
      .select('valor_recebido')
      .gte('data_recebimento', filters.dateFrom)
      .lte('data_recebimento', filters.dateTo)
    if (filters.obras?.length) recPeriodQuery = recPeriodQuery.in('id_obra', filters.obras.map(Number))
    const { data: recPeriodData } = await recPeriodQuery.limit(10000)

    const receitaPeriod = (recPeriodData ?? []).reduce((s, r) => s + (r.valor_recebido ?? 0), 0)

    let pagPeriodQuery = supabase
      .from('pagamentos')
      .select('valor_pago')
      .gte('data_pagamento', filters.dateFrom)
      .lte('data_pagamento', filters.dateTo)
    if (filters.obras?.length) pagPeriodQuery = pagPeriodQuery.in('id_obra', filters.obras.map(Number))
    const { data: pagPeriodData } = await pagPeriodQuery.limit(10000)

    const despesaPeriod = (pagPeriodData ?? []).reduce((s, r) => s + (r.valor_pago ?? 0), 0)
    const margemOperacional = receitaPeriod === 0 ? 0 : ((receitaPeriod - despesaPeriod) / receitaPeriod) * 100

    return { totalReceber, totalPagar, obrasAtivas, margemOperacional }
  } catch (error) {
    console.error('Error fetching secondary KPIs:', error)
    return { totalReceber: 0, totalPagar: 0, obrasAtivas: 0, margemOperacional: 0 }
  }
}
