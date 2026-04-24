import { createClient } from '@/lib/supabase/server'

interface Filters {
  dateFrom?: string
  dateTo?: string
  obras?: string[]
}

interface PipelineStage {
  count: number
  valor: number
}

interface PipelineResult {
  pendente: PipelineStage
  aprovada: PipelineStage
  obraIniciada: PipelineStage
  taxaConversao12: number
  taxaConversao23: number
}

interface ConversaoMensal {
  month: string
  taxa: number
}

interface PropostasKPIs {
  taxaMediaConversao: number
  valorMedioAprovadas: number
  valorMedioRecusadas: number
  ticketMedioGeral: number
}

interface PropostaListItem {
  id: string
  data: string | null
  cliente: string | null
  valor: number | null
  status: string | null
  obraVinculada: string | null
  obraId: number | null
}

export async function getPropostasPipeline(filters?: Filters): Promise<PipelineResult> {
  const supabase = await createClient()

  try {
    // Fetch all propostas
    let query = supabase.from('propostas').select('id_obra, cod_orcamento, status_proposta, preco_total_com_desconto, data_criacao')
    if (filters?.dateFrom) query = query.gte('data_criacao', filters.dateFrom)
    if (filters?.dateTo) query = query.lte('data_criacao', filters.dateTo)
    if (filters?.obras?.length) query = query.in('id_obra', filters.obras.map(Number))

    const { data: propostas } = await query

    // Fetch all obras ids for stage 3 matching
    const { data: obrasData } = await supabase.from('obras').select('id')
    const obraIds = new Set((obrasData ?? []).map((o) => o.id))

    const pendente: PipelineStage = { count: 0, valor: 0 }
    const aprovada: PipelineStage = { count: 0, valor: 0 }
    const obraIniciada: PipelineStage = { count: 0, valor: 0 }

    for (const p of propostas ?? []) {
      const status = (p.status_proposta ?? '').toLowerCase().trim()
      const valor = p.preco_total_com_desconto ?? 0

      // Stage 1: pendente or em elaboração
      if (status === 'pendente' || status === 'em elaboração') {
        pendente.count++
        pendente.valor += valor
      }
      // Stage 2: aprovada
      else if (status === 'aprovada') {
        aprovada.count++
        aprovada.valor += valor
        // Stage 3: aprovada AND linked to an existing obra
        if (p.id_obra && obraIds.has(p.id_obra)) {
          obraIniciada.count++
          obraIniciada.valor += valor
        }
      }
      // Stage 3 also: any proposta linked to existing obra regardless of status
      else if (p.id_obra && obraIds.has(p.id_obra)) {
        // Count proposals linked to obras that aren't already counted
        obraIniciada.count++
        obraIniciada.valor += valor
      }
    }

    // If all data is "Em Elaboração", ensure pipeline still makes sense
    // Stage 1 → Stage 2 conversion
    const taxaConversao12 = pendente.count > 0
      ? (aprovada.count / pendente.count) * 100
      : 0
    // Stage 2 → Stage 3 conversion
    const taxaConversao23 = aprovada.count > 0
      ? (obraIniciada.count / aprovada.count) * 100
      : 0

    return { pendente, aprovada, obraIniciada, taxaConversao12, taxaConversao23 }
  } catch (error) {
    console.error('Error fetching propostas pipeline:', error)
    return {
      pendente: { count: 0, valor: 0 },
      aprovada: { count: 0, valor: 0 },
      obraIniciada: { count: 0, valor: 0 },
      taxaConversao12: 0,
      taxaConversao23: 0,
    }
  }
}

export async function getConversaoMensal(filters?: Filters): Promise<ConversaoMensal[]> {
  const supabase = await createClient()

  try {
    let query = supabase.from('propostas').select('data_criacao, status_proposta')
    if (filters?.dateFrom) query = query.gte('data_criacao', filters.dateFrom)
    if (filters?.dateTo) query = query.lte('data_criacao', filters.dateTo)
    if (filters?.obras?.length) query = query.in('id_obra', filters.obras.map(Number))

    const { data: propostas } = await query

    // Group by month
    const monthMap = new Map<string, { total: number; aprovadas: number }>()

    for (const p of propostas ?? []) {
      if (!p.data_criacao) continue
      const month = p.data_criacao.substring(0, 7) // YYYY-MM
      const entry = monthMap.get(month) ?? { total: 0, aprovadas: 0 }
      entry.total++
      const status = (p.status_proposta ?? '').toLowerCase().trim()
      if (status === 'aprovada') {
        entry.aprovadas++
      }
      monthMap.set(month, entry)
    }

    // Sort by month and calculate rates
    const result: ConversaoMensal[] = [...monthMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, { total, aprovadas }]) => ({
        month,
        taxa: total > 0 ? (aprovadas / total) * 100 : 0,
      }))

    return result
  } catch (error) {
    console.error('Error fetching conversao mensal:', error)
    return []
  }
}

export async function getPropostasKPIs(filters?: Filters): Promise<PropostasKPIs> {
  const supabase = await createClient()

  try {
    let query = supabase.from('propostas').select('status_proposta, preco_total_com_desconto')
    if (filters?.dateFrom) query = query.gte('data_criacao', filters.dateFrom)
    if (filters?.dateTo) query = query.lte('data_criacao', filters.dateTo)
    if (filters?.obras?.length) query = query.in('id_obra', filters.obras.map(Number))

    const { data: propostas } = await query

    let totalCount = 0
    let aprovadasCount = 0
    let aprovadasValor = 0
    let recusadasCount = 0
    let recusadasValor = 0
    let totalValor = 0

    for (const p of propostas ?? []) {
      const status = (p.status_proposta ?? '').toLowerCase().trim()
      const valor = p.preco_total_com_desconto ?? 0
      totalCount++
      totalValor += valor

      if (status === 'aprovada') {
        aprovadasCount++
        aprovadasValor += valor
      } else if (status === 'recusada') {
        recusadasCount++
        recusadasValor += valor
      }
    }

    return {
      taxaMediaConversao: totalCount > 0 ? (aprovadasCount / totalCount) * 100 : 0,
      valorMedioAprovadas: aprovadasCount > 0 ? aprovadasValor / aprovadasCount : 0,
      valorMedioRecusadas: recusadasCount > 0 ? recusadasValor / recusadasCount : 0,
      ticketMedioGeral: totalCount > 0 ? totalValor / totalCount : 0,
    }
  } catch (error) {
    console.error('Error fetching propostas KPIs:', error)
    return {
      taxaMediaConversao: 0,
      valorMedioAprovadas: 0,
      valorMedioRecusadas: 0,
      ticketMedioGeral: 0,
    }
  }
}

export async function getPropostasList(filters?: Filters): Promise<PropostaListItem[]> {
  const supabase = await createClient()

  try {
    let query = supabase
      .from('propostas')
      .select('id_obra, cod_orcamento, data_criacao, cliente, preco_total_com_desconto, status_proposta, obra')
      .order('data_criacao', { ascending: false })

    if (filters?.dateFrom) query = query.gte('data_criacao', filters.dateFrom)
    if (filters?.dateTo) query = query.lte('data_criacao', filters.dateTo)
    if (filters?.obras?.length) query = query.in('id_obra', filters.obras.map(Number))

    const { data: propostas } = await query

    return (propostas ?? []).map((p) => ({
      id: `${p.id_obra}-${p.cod_orcamento}`,
      data: p.data_criacao,
      cliente: p.cliente,
      valor: p.preco_total_com_desconto,
      status: p.status_proposta,
      obraVinculada: p.obra ?? null,
      obraId: p.id_obra,
    }))
  } catch (error) {
    console.error('Error fetching propostas list:', error)
    return []
  }
}
