import { createClient } from '@/lib/supabase/server'

interface Filters {
  dateFrom: string
  dateTo: string
  obras?: string[]
  categorias?: string[]
}

interface ObraGasto {
  name: string
  value: number
  id: string
}

// ─── Grid filters ────────────────────────────────────────────
export interface ObrasGridFilters {
  status?: string
  sortBy?: 'nome' | 'gasto' | 'margem' | 'desvio'
  dateFrom?: string
  dateTo?: string
  obras?: string[]
  categorias?: string[]
}

export interface ObraCardData {
  id: number
  nome: string
  cliente: string | null
  status: string | null
  progressoOrcamentario: number
  valorOrcado: number
  valorRealizado: number
  desvio: number
  progressoCronograma: number
  margem: number
}

export interface ObraDetailData {
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
  etapas: Array<{ etapa: string; orcado: number; realizado: number }>
  cronograma: Array<{
    etapa: string
    previstoInicio: string | null
    previstoFim: string | null
    realInicio: string | null
    realFim: string | null
    percentual: number
  }>
  gastosPorCategoria: Array<{ name: string; value: number }>
  pagamentosDetalhados: Array<{
    id: string
    fornecedor: string | null
    descricao: string | null
    categoria: string | null
    data_pagamento: string | null
    valor_pago: number
  }>
}

// ─── Helper: calculate cronograma progress from dates ────────
function calcCronogramaPercentual(item: { data_inicio_realizado?: string | null; data_fim_realizado?: string | null }): number {
  if (item.data_fim_realizado) return 100
  if (item.data_inicio_realizado) return 50
  return 0
}

// ─── getObrasGrid ────────────────────────────────────────────
export async function getObrasGrid(
  filters?: ObrasGridFilters
): Promise<ObraCardData[]> {
  const supabase = await createClient()

  try {
    // 1. Fetch all obras
    let obrasQuery = supabase.from('obras').select('id, nome, status_obra, cliente')
    if (filters?.status && filters.status !== 'todas') {
      obrasQuery = obrasQuery.ilike('status_obra', `%${filters.status}%`)
    }
    if (filters?.obras && filters.obras.length > 0) {
      obrasQuery = obrasQuery.in('id', filters.obras.map(Number))
    }
    const { data: obras } = await obrasQuery
    if (!obras || obras.length === 0) return []

    const obraIds = obras.map((o) => o.id)

    // Build dynamic queries for parallel fetching
    let pagQuery = supabase.from('pagamentos').select('id_obra, valor_pago').in('id_obra', obraIds).limit(10000)
    if (filters?.dateFrom) pagQuery = pagQuery.gte('data_pagamento', filters.dateFrom)
    if (filters?.dateTo) pagQuery = pagQuery.lte('data_pagamento', filters.dateTo)
    if (filters?.categorias?.length) pagQuery = pagQuery.in('categoria', filters.categorias)

    let fatQuery = supabase.from('faturamentos').select('id_obra, valor_parcela, cliente').in('id_obra', obraIds).limit(10000)
    if (filters?.dateFrom) fatQuery = fatQuery.gte('data_competencia', filters.dateFrom)
    if (filters?.dateTo) fatQuery = fatQuery.lte('data_competencia', filters.dateTo)

    let recQuery = supabase.from('recebimentos').select('id_obra, cliente').in('id_obra', obraIds).limit(10000)
    if (filters?.dateFrom) recQuery = recQuery.gte('data_recebimento', filters.dateFrom)
    if (filters?.dateTo) recQuery = recQuery.lte('data_recebimento', filters.dateTo)

    // 2. Fetch aggregation data in parallel
    const [
      { data: pagData },
      { data: orcData },
      { data: fatData },
      { data: cronData },
      { data: recData },
    ] = await Promise.all([
      pagQuery,
      supabase.from('items_orcamentos').select('id_obra, preco_total_item').in('id_obra', obraIds),
      fatQuery,
      supabase.from('cronogramas').select('id_obra, data_fim_planejado, data_fim_realizado, data_inicio_realizado').in('id_obra', obraIds),
      recQuery,
    ])

    // 3. Group by id_obra
    const pagMap = new Map<number, number>()
    for (const p of pagData ?? []) {
      if (p.id_obra == null) continue
      pagMap.set(p.id_obra, (pagMap.get(p.id_obra) ?? 0) + (p.valor_pago ?? 0))
    }

    const orcMap = new Map<number, number>()
    for (const o of orcData ?? []) {
      if (o.id_obra == null) continue
      orcMap.set(o.id_obra, (orcMap.get(o.id_obra) ?? 0) + (o.preco_total_item ?? 0))
    }

    const fatMap = new Map<number, number>()
    const clienteMap = new Map<number, string | null>()
    for (const f of fatData ?? []) {
      if (f.id_obra == null) continue
      fatMap.set(f.id_obra, (fatMap.get(f.id_obra) ?? 0) + (f.valor_parcela ?? 0))
      if (!clienteMap.has(f.id_obra) && f.cliente) {
        clienteMap.set(f.id_obra, f.cliente)
      }
    }

    // fallback cliente from recebimentos
    for (const r of recData ?? []) {
      if (r.id_obra == null) continue
      if (!clienteMap.has(r.id_obra) && r.cliente) {
        clienteMap.set(r.id_obra, r.cliente)
      }
    }

    // Also use cliente from obras table directly
    for (const obra of obras) {
      if (!clienteMap.has(obra.id) && obra.cliente) {
        clienteMap.set(obra.id, obra.cliente)
      }
    }

    const cronMap = new Map<number, number[]>()
    for (const c of cronData ?? []) {
      if (c.id_obra == null) continue
      const arr = cronMap.get(c.id_obra) ?? []
      arr.push(calcCronogramaPercentual(c))
      cronMap.set(c.id_obra, arr)
    }

    // 4. Build result
    const result: ObraCardData[] = obras.map((obra) => {
      const valorRealizado = pagMap.get(obra.id) ?? 0
      const valorOrcado = orcMap.get(obra.id) ?? 0
      const faturamento = fatMap.get(obra.id) ?? 0
      const desvio = valorRealizado - valorOrcado
      const progressoOrcamentario = valorOrcado > 0 ? (valorRealizado / valorOrcado) * 100 : 0
      const cronArr = cronMap.get(obra.id)
      const progressoCronograma = cronArr && cronArr.length > 0
        ? cronArr.reduce((a, b) => a + b, 0) / cronArr.length
        : 0
      const margem = faturamento > 0 ? ((faturamento - valorRealizado) / faturamento) * 100 : 0

      return {
        id: obra.id,
        nome: obra.nome,
        cliente: clienteMap.get(obra.id) ?? obra.cliente ?? null,
        status: obra.status_obra,
        progressoOrcamentario,
        valorOrcado,
        valorRealizado,
        desvio,
        progressoCronograma,
        margem,
      }
    })

    // 5. Sort
    const sortBy = filters?.sortBy ?? 'nome'
    switch (sortBy) {
      case 'gasto':
        result.sort((a, b) => b.valorRealizado - a.valorRealizado)
        break
      case 'margem':
        result.sort((a, b) => b.margem - a.margem)
        break
      case 'desvio':
        result.sort((a, b) => a.desvio - b.desvio) // economy first
        break
      default:
        result.sort((a, b) => a.nome.localeCompare(b.nome))
    }

    return result
  } catch (error) {
    console.error('Error fetching obras grid:', error)
    return []
  }
}

// ─── getObraDetail ───────────────────────────────────────────
export async function getObraDetail(obraId: string, filters?: Filters): Promise<ObraDetailData | null> {
  const supabase = await createClient()
  const id = Number(obraId)

  try {
    // 1. Obra info
    const { data: obra } = await supabase
      .from('obras')
      .select('*')
      .eq('id', id)
      .single()

    if (!obra) return null

    // Build dynamic queries for parallel fetching.
    // NOTE: faturamentos and recebimentos are NOT date-filtered — we always show the
    // full contract picture regardless of the UI date range. The date filter only
    // applies to pagamentos (cash outflows) so the expense KPIs respect the period.
    let pagQuery = supabase.from('pagamentos').select('*').eq('id_obra', id).limit(10000)
    if (filters?.dateFrom) pagQuery = pagQuery.gte('data_pagamento', filters.dateFrom)
    if (filters?.dateTo) pagQuery = pagQuery.lte('data_pagamento', filters.dateTo)
    if (filters?.categorias?.length) pagQuery = pagQuery.in('categoria', filters.categorias)

    const fatQuery = supabase.from('faturamentos').select('*').eq('id_obra', id).limit(10000)
    const recQuery = supabase.from('recebimentos').select('*').eq('id_obra', id).limit(10000)

    // 2. Fetch all related data in parallel
    const [
      { data: pagData },
      { data: orcData },
      { data: fatData },
      { data: recData },
      { data: cronData },
    ] = await Promise.all([
      pagQuery,
      supabase.from('items_orcamentos').select('*').eq('id_obra', id),
      fatQuery,
      recQuery,
      supabase.from('cronogramas').select('*').eq('id_obra', id),
    ])

    const pagamentos = pagData ?? []
    const orcamentos = orcData ?? []
    const faturamentos = fatData ?? []
    const recebimentos = recData ?? []
    const cronogramas = cronData ?? []

    // 3. KPIs
    const orcamentoTotal = orcamentos.reduce((s, o) => s + (o.preco_total_item ?? 0), 0)
    const custoRealizado = pagamentos.reduce((s, p) => s + (p.valor_pago ?? 0), 0)
    const saldoDisponivel = orcamentoTotal - custoRealizado
    const faturamento = faturamentos.reduce((s, f) => s + (f.valor_parcela ?? 0), 0)
    const recebido = recebimentos.reduce((s, r) => s + (r.valor_recebido ?? 0), 0)

    // 4. KPIs avancados
    const margemBruta = faturamento > 0 ? ((faturamento - custoRealizado) / faturamento) * 100 : 0

    // CPI = BCWP / ACWP; SPI = based on cronograma
    // Calculate progress from dates instead of percentual_realizado/percentual_previsto
    const avgRealizado = cronogramas.length > 0
      ? cronogramas.reduce((s, c) => s + calcCronogramaPercentual(c), 0) / cronogramas.length
      : 0
    // For previsto, calculate based on whether data_fim_planejado has passed
    const now = new Date().toISOString().slice(0, 10)
    const avgPrevisto = cronogramas.length > 0
      ? cronogramas.reduce((s, c) => {
          if (c.data_fim_planejado && c.data_fim_planejado <= now) return s + 100
          if (c.data_inicio_planejado && c.data_inicio_planejado <= now) return s + 50
          return s
        }, 0) / cronogramas.length
      : 0

    const bcwp = orcamentoTotal * (avgRealizado / 100)
    const acwp = custoRealizado
    const cpi = acwp > 0 ? bcwp / acwp : 0
    const spi = avgPrevisto > 0 ? avgRealizado / avgPrevisto : 0

    // Burn rate: last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const thirtyDaysStr = thirtyDaysAgo.toISOString().slice(0, 10)
    const recentPagamentos = pagamentos.filter(
      (p) => p.data_pagamento && p.data_pagamento >= thirtyDaysStr
    )
    const gastoLast30 = recentPagamentos.reduce((s, p) => s + (p.valor_pago ?? 0), 0)
    const burnRate = gastoLast30 / 30
    const runway = burnRate > 0 ? saldoDisponivel / burnRate : 0

    // 5. Etapas (orcado vs realizado by etapa_item)
    const etapaOrcMap = new Map<string, number>()
    for (const o of orcamentos) {
      const key = o.etapa_item ?? 'Sem categoria'
      etapaOrcMap.set(key, (etapaOrcMap.get(key) ?? 0) + (o.preco_total_item ?? 0))
    }
    const etapaPagMap = new Map<string, number>()
    for (const p of pagamentos) {
      const key = p.categoria ?? 'Sem categoria'
      etapaPagMap.set(key, (etapaPagMap.get(key) ?? 0) + (p.valor_pago ?? 0))
    }
    const allEtapas = new Set([...etapaOrcMap.keys(), ...etapaPagMap.keys()])
    const etapas = [...allEtapas].map((etapa) => ({
      etapa,
      orcado: etapaOrcMap.get(etapa) ?? 0,
      realizado: etapaPagMap.get(etapa) ?? 0,
    }))

    // 6. Cronograma for Gantt
    const cronograma = cronogramas.map((c) => ({
      etapa: c.etapa_item ?? c.descricao ?? 'Etapa',
      previstoInicio: c.data_inicio_planejado,
      previstoFim: c.data_fim_planejado,
      realInicio: c.data_inicio_realizado,
      realFim: c.data_fim_realizado,
      percentual: calcCronogramaPercentual(c),
    }))

    // 7. Gastos por categoria
    const catMap = new Map<string, number>()
    for (const p of pagamentos) {
      const key = p.categoria ?? 'Sem categoria'
      catMap.set(key, (catMap.get(key) ?? 0) + (p.valor_pago ?? 0))
    }
    const gastosPorCategoria = [...catMap.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)

    // 8. Pagamentos detalhados
    const pagamentosDetalhados = pagamentos.map((p) => ({
      id: p.id_lancamento,
      fornecedor: p.fornecedor,
      descricao: p.descricao,
      categoria: p.categoria,
      data_pagamento: p.data_pagamento,
      valor_pago: p.valor_pago ?? 0,
    }))

    // Cliente from obra, faturamentos or recebimentos
    const cliente = obra.cliente
      ?? faturamentos.find((f) => f.cliente)?.cliente
      ?? recebimentos.find((r) => r.cliente)?.cliente
      ?? null

    return {
      info: {
        nome: obra.nome,
        cliente,
        status: obra.status_obra,
        data_inicio: null,
        data_previsao_termino: null,
        endereco: null,
      },
      kpis: { orcamentoTotal, custoRealizado, saldoDisponivel, faturamento, recebido },
      kpisAvancados: { margemBruta, cpi, spi, burnRate, runway },
      etapas,
      cronograma,
      gastosPorCategoria,
      pagamentosDetalhados,
    }
  } catch (error) {
    console.error('Error fetching obra detail:', error)
    return null
  }
}

export async function getObrasForFilter(): Promise<{ id: number; nome: string }[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("obras")
    .select("id, nome")
    .order("nome", { ascending: true });
  if (error) return [];
  return (data ?? []).map((o) => ({ id: Number(o.id), nome: o.nome ?? "" }));
}

export async function getTopObrasByGasto(
  filters: Filters,
  limit: number = 5
): Promise<ObraGasto[]> {
  const supabase = await createClient()

  try {
    // Fetch pagamentos in period
    let pagQuery = supabase
      .from('pagamentos')
      .select('id_obra, valor_pago')
      .gte('data_pagamento', filters.dateFrom)
      .lte('data_pagamento', filters.dateTo)
      .not('id_obra', 'is', null)
    if (filters.obras?.length) pagQuery = pagQuery.in('id_obra', filters.obras.map(Number))
    if (filters.categorias?.length) pagQuery = pagQuery.in('categoria', filters.categorias)
    const { data: pagData } = await pagQuery.limit(10000)

    // Group by id_obra
    const obraMap = new Map<number, number>()
    for (const p of pagData ?? []) {
      if (p.id_obra == null) continue
      obraMap.set(p.id_obra, (obraMap.get(p.id_obra) ?? 0) + (p.valor_pago ?? 0))
    }

    if (obraMap.size === 0) return []

    // Fetch obra names
    const obraIds = [...obraMap.keys()]
    const { data: obrasData } = await supabase
      .from('obras')
      .select('id, nome')
      .in('id', obraIds)

    const obraNames = new Map<number, string>()
    for (const o of obrasData ?? []) {
      obraNames.set(o.id, o.nome)
    }

    // Build result sorted by value desc, limited
    const result: ObraGasto[] = [...obraMap.entries()]
      .map(([obraId, value]) => ({
        name: obraNames.get(obraId) ?? `Obra ${obraId}`,
        value,
        id: String(obraId),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, limit)

    return result
  } catch (error) {
    console.error('Error fetching top obras by gasto:', error)
    return []
  }
}
