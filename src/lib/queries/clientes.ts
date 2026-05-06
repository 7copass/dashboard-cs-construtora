import { createClient } from '@/lib/supabase/server'

interface Filters {
  dateFrom?: string
  dateTo?: string
  obras?: string[]
}

export interface ClienteRanking {
  cliente: string
  faturado: number
  recebido: number
  pendente: number
  empreendimentos: string[]
}

interface AgingBucket {
  cliente: string
  emDia: number
  ate30: number
  ate60: number
  ate90: number
  mais90: number
}

interface ConcentracaoResult {
  data: { name: string; value: number }[]
  riscoConcentracao: boolean
  mensagem?: string
}

interface ParcelaDetail {
  numero_parcela: number
  data_vencimento: string | null
  valor_parcela: number
  data_recebimento: string | null
  valor_recebido: number
  juros: number
  desconto: number
  forma_recebimento: string | null
  status: 'Recebido' | 'Parcial' | 'Pendente'
}

interface UnidadeDetail {
  nome: string
  totalFaturado: number
  totalRecebido: number
  saldoDevedor: number
  parcelas: ParcelaDetail[]
}

export interface ClienteDetail {
  nome: string
  totalFaturado: number
  totalRecebido: number
  saldoDevedor: number
  numUnidades: number
  tempoMedioPagamento: number
  unidades: UnidadeDetail[]
}

/**
 * Ranking of clients by faturado, recebido, and pendente.
 * Clients are derived from faturamentos.cliente and recebimentos.cliente fields.
 */
export async function getClienteRanking(filters?: Filters): Promise<ClienteRanking[]> {
  const supabase = await createClient()

  try {
    // Fetch faturamentos (include centro_de_custo for empreendimento names)
    let fatQuery = supabase
      .from('faturamentos')
      .select('cliente, valor_parcela, id_obra, centro_de_custo')
    if (filters?.obras?.length) fatQuery = fatQuery.in('id_obra', filters.obras.map(Number))
    if (filters?.dateFrom) fatQuery = fatQuery.gte('data_competencia', filters.dateFrom)
    if (filters?.dateTo) fatQuery = fatQuery.lte('data_competencia', filters.dateTo)
    const { data: fatData } = await fatQuery.limit(10000)

    // Fetch recebimentos
    let recQuery = supabase
      .from('recebimentos')
      .select('cliente, valor_recebido, id_obra')
    if (filters?.obras?.length) recQuery = recQuery.in('id_obra', filters.obras.map(Number))
    if (filters?.dateFrom) recQuery = recQuery.gte('data_recebimento', filters.dateFrom)
    if (filters?.dateTo) recQuery = recQuery.lte('data_recebimento', filters.dateTo)
    const { data: recData } = await recQuery.limit(10000)

    // Group faturado + empreendimentos by client
    const clienteMap = new Map<string, { faturado: number; recebido: number; empreendimentos: Set<string> }>()

    for (const f of fatData ?? []) {
      const nome = f.cliente?.trim() || 'Sem Cliente'
      const existing = clienteMap.get(nome) ?? { faturado: 0, recebido: 0, empreendimentos: new Set() }
      existing.faturado += Number(f.valor_parcela) || 0
      if (f.centro_de_custo?.trim()) existing.empreendimentos.add(f.centro_de_custo.trim())
      clienteMap.set(nome, existing)
    }

    for (const r of recData ?? []) {
      const nome = r.cliente?.trim() || 'Sem Cliente'
      const existing = clienteMap.get(nome) ?? { faturado: 0, recebido: 0, empreendimentos: new Set() }
      existing.recebido += Number(r.valor_recebido) || 0
      clienteMap.set(nome, existing)
    }

    const result: ClienteRanking[] = []
    for (const [cliente, { faturado, recebido, empreendimentos }] of clienteMap.entries()) {
      result.push({
        cliente,
        faturado,
        recebido,
        pendente: Math.max(0, faturado - recebido),
        empreendimentos: [...empreendimentos].sort(),
      })
    }

    // Sort by faturado DESC
    result.sort((a, b) => b.faturado - a.faturado)
    return result
  } catch (error) {
    console.error('Error fetching cliente ranking:', error)
    return []
  }
}

/**
 * Aging of receivables per client.
 * For each faturamento not fully received, calculates days overdue from data_vencimento.
 */
export async function getAgingByCliente(filters?: Filters): Promise<AgingBucket[]> {
  const supabase = await createClient()
  const today = new Date()

  try {
    // Fetch all faturamentos with vencimento
    let fatQuery = supabase
      .from('faturamentos')
      .select('cliente, valor_parcela, data_vencimento, id_faturamento, numero_parcela, id_obra')
      .not('data_vencimento', 'is', null)
    if (filters?.obras?.length) fatQuery = fatQuery.in('id_obra', filters.obras.map(Number))
    const { data: fatData } = await fatQuery.limit(10000)

    // Fetch all recebimentos to know what's been paid
    const recQuery = supabase
      .from('recebimentos')
      .select('id_faturamento, numero_parcela, valor_recebido')
    const { data: recData } = await recQuery.limit(10000)

    // Build map of received amounts by faturamento key
    const receivedMap = new Map<string, number>()
    for (const r of recData ?? []) {
      const key = `${r.id_faturamento}-${r.numero_parcela}`
      receivedMap.set(key, (receivedMap.get(key) ?? 0) + (Number(r.valor_recebido) || 0))
    }

    // Process each faturamento
    const clienteAging = new Map<string, AgingBucket>()

    for (const f of fatData ?? []) {
      const key = `${f.id_faturamento}-${f.numero_parcela}`
      const valorParcela = Number(f.valor_parcela) || 0
      const valorRecebido = receivedMap.get(key) ?? 0
      const pendente = valorParcela - valorRecebido

      if (pendente <= 0) continue

      const nome = f.cliente?.trim() || 'Sem Cliente'
      const vencimento = new Date(f.data_vencimento!)
      const diffMs = today.getTime() - vencimento.getTime()
      const diasAtraso = Math.floor(diffMs / (1000 * 60 * 60 * 24))

      const existing = clienteAging.get(nome) ?? {
        cliente: nome,
        emDia: 0,
        ate30: 0,
        ate60: 0,
        ate90: 0,
        mais90: 0,
      }

      if (diasAtraso <= 0) {
        existing.emDia += pendente
      } else if (diasAtraso <= 30) {
        existing.ate30 += pendente
      } else if (diasAtraso <= 60) {
        existing.ate60 += pendente
      } else if (diasAtraso <= 90) {
        existing.ate90 += pendente
      } else {
        existing.mais90 += pendente
      }

      clienteAging.set(nome, existing)
    }

    const result = Array.from(clienteAging.values())
    // Sort by total pendente DESC
    result.sort((a, b) => {
      const totalA = a.emDia + a.ate30 + a.ate60 + a.ate90 + a.mais90
      const totalB = b.emDia + b.ate30 + b.ate60 + b.ate90 + b.mais90
      return totalB - totalA
    })

    return result
  } catch (error) {
    console.error('Error fetching aging by cliente:', error)
    return []
  }
}

/**
 * Revenue concentration analysis.
 * Calculates % participation of each client and flags concentration risk.
 */
export async function getConcentracaoReceita(filters?: Filters): Promise<ConcentracaoResult> {
  const supabase = await createClient()

  try {
    let recQuery = supabase
      .from('recebimentos')
      .select('cliente, valor_recebido, id_obra')
    if (filters?.obras?.length) recQuery = recQuery.in('id_obra', filters.obras.map(Number))
    if (filters?.dateFrom) recQuery = recQuery.gte('data_recebimento', filters.dateFrom)
    if (filters?.dateTo) recQuery = recQuery.lte('data_recebimento', filters.dateTo)
    await recQuery.limit(10000)

    // Also check faturamentos for clients with no recebimentos yet
    let fatQuery = supabase
      .from('faturamentos')
      .select('cliente, valor_parcela, id_obra')
    if (filters?.obras?.length) fatQuery = fatQuery.in('id_obra', filters.obras.map(Number))
    if (filters?.dateFrom) fatQuery = fatQuery.gte('data_competencia', filters.dateFrom)
    if (filters?.dateTo) fatQuery = fatQuery.lte('data_competencia', filters.dateTo)
    const { data: fatData } = await fatQuery.limit(10000)

    // Use faturado as the base for concentration (broader view)
    const clienteMap = new Map<string, number>()
    for (const f of fatData ?? []) {
      const nome = f.cliente?.trim() || 'Sem Cliente'
      clienteMap.set(nome, (clienteMap.get(nome) ?? 0) + (Number(f.valor_parcela) || 0))
    }

    const total = Array.from(clienteMap.values()).reduce((s, v) => s + v, 0)
    if (total === 0) {
      return { data: [], riscoConcentracao: false }
    }

    const data = Array.from(clienteMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)

    // Check concentration risk
    const top1Pct = (data[0]?.value ?? 0) / total * 100
    const top3Pct = data.slice(0, 3).reduce((s, d) => s + d.value, 0) / total * 100

    let riscoConcentracao = false
    let mensagem: string | undefined

    if (top1Pct > 30) {
      riscoConcentracao = true
      mensagem = `${data[0].name} representa ${top1Pct.toFixed(1)}% da receita`
    } else if (top3Pct > 70) {
      riscoConcentracao = true
      mensagem = `Top 3 clientes representam ${top3Pct.toFixed(1)}% da receita`
    }

    return { data, riscoConcentracao, mensagem }
  } catch (error) {
    console.error('Error fetching concentracao receita:', error)
    return { data: [], riscoConcentracao: false }
  }
}

/**
 * Get detailed info for a specific client, grouped by unit (descricao field).
 * Each unit (e.g. "UNIDADE 68") contains its own parcelas with faturamento + recebimento joined.
 */
export async function getClienteDetail(clienteNome: string): Promise<ClienteDetail> {
  const supabase = await createClient()

  const empty: ClienteDetail = {
    nome: clienteNome,
    totalFaturado: 0,
    totalRecebido: 0,
    saldoDevedor: 0,
    numUnidades: 0,
    tempoMedioPagamento: 0,
    unidades: [],
  }

  try {
    // Faturamentos for this client — ordered by unit then parcela
    const { data: fatData } = await supabase
      .from('faturamentos')
      .select('id_faturamento, id_obra, valor_parcela, data_vencimento, data_faturamento, numero_parcela, descricao')
      .eq('cliente', clienteNome)
      .order('descricao', { ascending: true })
      .order('numero_parcela', { ascending: true })
      .limit(10000)

    if (!fatData?.length) return empty

    // Recebimentos for this client — keyed by (id_faturamento, numero_parcela)
    const { data: recData } = await supabase
      .from('recebimentos')
      .select('id_faturamento, numero_parcela, valor_recebido, data_recebimento, data_vencimento, forma_recebimento, valor_juros_e_multa, valor_desconto')
      .eq('cliente', clienteNome)
      .limit(10000)

    type RecRow = NonNullable<typeof recData>[number]
    const recMap = new Map<string, RecRow>()
    for (const r of recData ?? []) {
      const key = `${r.id_faturamento}-${r.numero_parcela}`
      recMap.set(key, r)
    }

    // Group faturamentos by descricao (unit name)
    const unidadeMap = new Map<string, typeof fatData>()
    for (const f of fatData) {
      const unidade = f.descricao?.trim() || 'Sem Unidade'
      if (!unidadeMap.has(unidade)) unidadeMap.set(unidade, [])
      unidadeMap.get(unidade)!.push(f)
    }

    let totalDias = 0
    let countDias = 0
    const unidades: UnidadeDetail[] = []

    for (const [unidadeNome, fatParcelas] of unidadeMap.entries()) {
      let totalFaturado = 0
      let totalRecebido = 0
      const parcelas: ParcelaDetail[] = []

      for (const f of fatParcelas) {
        const key = `${f.id_faturamento}-${f.numero_parcela}`
        const rec = recMap.get(key)

        const valorParcela = Number(f.valor_parcela) || 0
        const valorRecebido = Number(rec?.valor_recebido) || 0
        const juros = Number(rec?.valor_juros_e_multa) || 0
        const desconto = Number(rec?.valor_desconto) || 0

        totalFaturado += valorParcela
        totalRecebido += valorRecebido

        let status: 'Recebido' | 'Parcial' | 'Pendente'
        if (valorRecebido >= valorParcela && valorParcela > 0) status = 'Recebido'
        else if (valorRecebido > 0) status = 'Parcial'
        else status = 'Pendente'

        // Accumulate avg payment delay
        if (f.data_vencimento && rec?.data_recebimento) {
          const diff = Math.floor(
            (new Date(rec.data_recebimento).getTime() - new Date(f.data_vencimento).getTime()) /
            86_400_000
          )
          totalDias += diff
          countDias++
        }

        parcelas.push({
          numero_parcela: f.numero_parcela ?? 0,
          data_vencimento: f.data_vencimento ?? null,
          valor_parcela: valorParcela,
          data_recebimento: rec?.data_recebimento ?? null,
          valor_recebido: valorRecebido,
          juros,
          desconto,
          forma_recebimento: rec?.forma_recebimento ?? null,
          status,
        })
      }

      unidades.push({
        nome: unidadeNome,
        totalFaturado,
        totalRecebido,
        saldoDevedor: Math.max(0, totalFaturado - totalRecebido),
        parcelas,
      })
    }

    const totalFaturado = unidades.reduce((s, u) => s + u.totalFaturado, 0)
    const totalRecebido = unidades.reduce((s, u) => s + u.totalRecebido, 0)

    return {
      nome: clienteNome,
      totalFaturado,
      totalRecebido,
      saldoDevedor: Math.max(0, totalFaturado - totalRecebido),
      numUnidades: unidades.length,
      tempoMedioPagamento: countDias > 0 ? Math.round(totalDias / countDias) : 0,
      unidades,
    }
  } catch (error) {
    console.error('Error fetching cliente detail:', error)
    return empty
  }
}
