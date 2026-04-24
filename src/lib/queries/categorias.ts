import { createClient } from '@/lib/supabase/server'

interface Filters {
  dateFrom: string
  dateTo: string
  obras?: string[]
  categorias?: string[]
}

interface CategoryData {
  name: string
  value: number
}

export async function getCategoryDistribution(filters: Filters): Promise<CategoryData[]> {
  const supabase = await createClient()

  try {
    let pagQuery = supabase
      .from('pagamentos')
      .select('categoria, valor_pago')
      .gte('data_pagamento', filters.dateFrom)
      .lte('data_pagamento', filters.dateTo)
    if (filters.obras?.length) pagQuery = pagQuery.in('id_obra', filters.obras.map(Number))
    if (filters.categorias?.length) pagQuery = pagQuery.in('categoria', filters.categorias)
    const { data: pagData } = await pagQuery.limit(10000)

    // Group by categoria
    const catMap = new Map<string, number>()
    for (const p of pagData ?? []) {
      const cat = p.categoria ?? 'Sem categoria'
      catMap.set(cat, (catMap.get(cat) ?? 0) + (p.valor_pago ?? 0))
    }

    if (catMap.size === 0) return []

    const total = [...catMap.values()].reduce((s, v) => s + v, 0)
    const threshold = total * 0.03

    // Split into significant categories and "Outros"
    let outrosValue = 0
    const significant: CategoryData[] = []

    for (const [name, value] of catMap.entries()) {
      if (value < threshold) {
        outrosValue += value
      } else {
        significant.push({ name, value })
      }
    }

    // Sort by value desc
    significant.sort((a, b) => b.value - a.value)

    if (outrosValue > 0) {
      significant.push({ name: 'Outros', value: outrosValue })
    }

    return significant
  } catch (error) {
    console.error('Error fetching category distribution:', error)
    return []
  }
}

// --- Category Evolution (monthly stacked) ---

interface CategoryEvolutionRow {
  month: string
  [categoria: string]: number | string
}

export async function getCategoryEvolution(filters: Filters): Promise<CategoryEvolutionRow[]> {
  const supabase = await createClient()

  try {
    let query = supabase
      .from('pagamentos')
      .select('categoria, valor_pago, data_pagamento')
      .not('data_pagamento', 'is', null)
      .gte('data_pagamento', filters.dateFrom)
      .lte('data_pagamento', filters.dateTo)
    if (filters.obras?.length) query = query.in('id_obra', filters.obras.map(Number))
    if (filters.categorias?.length) query = query.in('categoria', filters.categorias)
    const { data } = await query.limit(10000)

    if (!data?.length) return []

    // Aggregate by month + category
    const monthCatMap = new Map<string, Map<string, number>>()
    const catTotals = new Map<string, number>()

    for (const p of data) {
      const cat = p.categoria ?? 'Sem categoria'
      const month = (p.data_pagamento as string).slice(0, 7) // "YYYY-MM"
      if (!monthCatMap.has(month)) monthCatMap.set(month, new Map())
      const catMap = monthCatMap.get(month)!
      catMap.set(cat, (catMap.get(cat) ?? 0) + (p.valor_pago ?? 0))
      catTotals.set(cat, (catTotals.get(cat) ?? 0) + (p.valor_pago ?? 0))
    }

    // Top 8 categories by total, rest as "Outros"
    const sorted = [...catTotals.entries()].sort((a, b) => b[1] - a[1])
    const top8 = new Set(sorted.slice(0, 8).map(([name]) => name))

    const months = [...monthCatMap.keys()].sort()
    return months.map(month => {
      const catMap = monthCatMap.get(month)!
      const row: CategoryEvolutionRow = { month }
      let outros = 0
      for (const [cat, val] of catMap.entries()) {
        if (top8.has(cat)) {
          row[cat] = val
        } else {
          outros += val
        }
      }
      if (outros > 0) row['Outros'] = outros
      return row
    })
  } catch (error) {
    console.error('Error fetching category evolution:', error)
    return []
  }
}

// --- Gastos por Centro de Custo ---

interface CentroCustoGastos {
  centroCusto: string
  categorias: { nome: string; valor: number }[]
}

export async function getGastosPorCentroCusto(filters: Filters): Promise<CentroCustoGastos[]> {
  const supabase = await createClient()

  try {
    let query = supabase
      .from('pagamentos')
      .select('centro_de_custo, categoria, valor_pago')
      .not('data_pagamento', 'is', null)
      .gte('data_pagamento', filters.dateFrom)
      .lte('data_pagamento', filters.dateTo)
    if (filters.obras?.length) query = query.in('id_obra', filters.obras.map(Number))
    if (filters.categorias?.length) query = query.in('categoria', filters.categorias)
    const { data } = await query.limit(10000)

    if (!data?.length) return []

    // Group by centro_de_custo then categoria
    const ccMap = new Map<string, Map<string, number>>()
    for (const p of data) {
      const cc = p.centro_de_custo ?? 'Sem centro de custo'
      const cat = p.categoria ?? 'Sem categoria'
      if (!ccMap.has(cc)) ccMap.set(cc, new Map())
      const catMap = ccMap.get(cc)!
      catMap.set(cat, (catMap.get(cat) ?? 0) + (p.valor_pago ?? 0))
    }

    return [...ccMap.entries()]
      .map(([centroCusto, catMap]) => ({
        centroCusto,
        categorias: [...catMap.entries()]
          .map(([nome, valor]) => ({ nome, valor }))
          .sort((a, b) => b.valor - a.valor),
      }))
      .sort((a, b) => {
        const totalA = a.categorias.reduce((s, c) => s + c.valor, 0)
        const totalB = b.categorias.reduce((s, c) => s + c.valor, 0)
        return totalB - totalA
      })
  } catch (error) {
    console.error('Error fetching gastos por centro de custo:', error)
    return []
  }
}

// --- Rateio de Custos Indiretos ---

interface RateioRow {
  obra: string
  custoDireto: number
  custoIndiretoRateado: number
  custoTotal: number
  percentualTotal: number
  margemLiquidaReal: number
}

const isAdminCentroCusto = (centroDeCusto: string | null | undefined): boolean =>
  (centroDeCusto ?? '').toUpperCase().includes('CONSTRUTORA')

export async function getRateioCustosIndiretos(filters: Filters): Promise<RateioRow[]> {
  const supabase = await createClient()

  try {
    // Fetch all pagamentos in the period
    const pagQuery = supabase
      .from('pagamentos')
      .select('id_obra, centro_de_custo, valor_pago')
      .not('data_pagamento', 'is', null)
      .gte('data_pagamento', filters.dateFrom)
      .lte('data_pagamento', filters.dateTo)
    const { data: pagData } = await pagQuery.limit(10000)

    // Fetch faturamentos for margin calculation
    const fatQuery = supabase
      .from('faturamentos')
      .select('id_obra, valor_parcela')
      .not('data_competencia', 'is', null)
      .gte('data_competencia', filters.dateFrom)
      .lte('data_competencia', filters.dateTo)
    const { data: fatData } = await fatQuery.limit(10000)

    // Fetch obra names
    const { data: obrasData } = await supabase.from('obras').select('id, nome')
    const obraNames = new Map<number, string>()
    for (const o of obrasData ?? []) obraNames.set(o.id, o.nome)

    // Separate direct costs (per obra) and indirect costs (admin center)
    let totalCustosIndiretos = 0
    const custosDiretosPorObra = new Map<number, number>()

    for (const p of pagData ?? []) {
      const valor = p.valor_pago ?? 0
      if (isAdminCentroCusto(p.centro_de_custo)) {
        totalCustosIndiretos += valor
      } else if (p.id_obra != null) {
        custosDiretosPorObra.set(p.id_obra, (custosDiretosPorObra.get(p.id_obra) ?? 0) + valor)
      }
    }

    // Filter by selected obras if needed
    const obraIds = filters.obras?.length
      ? filters.obras.map(Number).filter(id => custosDiretosPorObra.has(id))
      : [...custosDiretosPorObra.keys()]

    if (obraIds.length === 0) return []

    const totalCustosDiretos = obraIds.reduce((s, id) => s + (custosDiretosPorObra.get(id) ?? 0), 0)

    // Faturamento per obra
    const fatPorObra = new Map<number, number>()
    for (const f of fatData ?? []) {
      if (f.id_obra != null) {
        fatPorObra.set(f.id_obra, (fatPorObra.get(f.id_obra) ?? 0) + (f.valor_parcela ?? 0))
      }
    }

    const rows: RateioRow[] = obraIds.map(obraId => {
      const custoDireto = custosDiretosPorObra.get(obraId) ?? 0
      const custoIndiretoRateado = totalCustosDiretos > 0
        ? (custoDireto / totalCustosDiretos) * totalCustosIndiretos
        : 0
      const custoTotal = custoDireto + custoIndiretoRateado
      const faturamento = fatPorObra.get(obraId) ?? 0
      const margemLiquidaReal = faturamento > 0
        ? ((faturamento - custoTotal) / faturamento) * 100
        : 0

      return {
        obra: obraNames.get(obraId) ?? `Obra ${obraId}`,
        custoDireto,
        custoIndiretoRateado,
        custoTotal,
        percentualTotal: 0, // calculated below
        margemLiquidaReal,
      }
    })

    const grandTotal = rows.reduce((s, r) => s + r.custoTotal, 0)
    for (const r of rows) {
      r.percentualTotal = grandTotal > 0 ? (r.custoTotal / grandTotal) * 100 : 0
    }

    return rows.sort((a, b) => b.custoTotal - a.custoTotal)
  } catch (error) {
    console.error('Error fetching rateio custos indiretos:', error)
    return []
  }
}

// --- Heatmap MoM ---

interface HeatmapData {
  categorias: string[]
  meses: string[]
  data: Record<string, Record<string, number>>
  deltas: Record<string, number>
}

export async function getHeatmapMoM(filters: Filters): Promise<HeatmapData> {
  const supabase = await createClient()
  const empty: HeatmapData = { categorias: [], meses: [], data: {}, deltas: {} }

  try {
    // Last 6 months from dateTo
    const endDate = new Date(filters.dateTo)
    const startDate = new Date(endDate)
    startDate.setMonth(startDate.getMonth() - 5)
    startDate.setDate(1)
    const dateFrom6m = startDate.toISOString().split('T')[0]

    let query = supabase
      .from('pagamentos')
      .select('categoria, valor_pago, data_pagamento')
      .not('data_pagamento', 'is', null)
      .gte('data_pagamento', dateFrom6m)
      .lte('data_pagamento', filters.dateTo)
    if (filters.obras?.length) query = query.in('id_obra', filters.obras.map(Number))
    if (filters.categorias?.length) query = query.in('categoria', filters.categorias)
    const { data } = await query.limit(10000)

    if (!data?.length) return empty

    // Aggregate by category and month
    const catMonthMap = new Map<string, Map<string, number>>()
    const catTotals = new Map<string, number>()

    for (const p of data) {
      const cat = p.categoria ?? 'Sem categoria'
      const month = (p.data_pagamento as string).slice(0, 7)
      if (!catMonthMap.has(cat)) catMonthMap.set(cat, new Map())
      catMonthMap.get(cat)!.set(month, (catMonthMap.get(cat)!.get(month) ?? 0) + (p.valor_pago ?? 0))
      catTotals.set(cat, (catTotals.get(cat) ?? 0) + (p.valor_pago ?? 0))
    }

    // Top 12 categories
    const topCats = [...catTotals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([name]) => name)

    // Build sorted months list
    const allMonths = new Set<string>()
    for (const monthMap of catMonthMap.values()) {
      for (const m of monthMap.keys()) allMonths.add(m)
    }
    const meses = [...allMonths].sort()

    // Build data matrix
    const dataMatrix: Record<string, Record<string, number>> = {}
    for (const cat of topCats) {
      dataMatrix[cat] = {}
      const monthMap = catMonthMap.get(cat)!
      for (const month of meses) {
        dataMatrix[cat][month] = monthMap.get(month) ?? 0
      }
    }

    // Calculate deltas (last month vs previous)
    const deltas: Record<string, number> = {}
    if (meses.length >= 2) {
      const lastMonth = meses[meses.length - 1]
      const prevMonth = meses[meses.length - 2]
      for (const cat of topCats) {
        const last = dataMatrix[cat][lastMonth] ?? 0
        const prev = dataMatrix[cat][prevMonth] ?? 0
        deltas[cat] = prev > 0 ? ((last - prev) / prev) * 100 : 0
      }
    }

    return { categorias: topCats, meses, data: dataMatrix, deltas }
  } catch (error) {
    console.error('Error fetching heatmap MoM:', error)
    return empty
  }
}
