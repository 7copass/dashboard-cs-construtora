import { createClient } from '@/lib/supabase/server'

interface Filters {
  dateFrom?: string
  dateTo?: string
  obras?: string[]
}

export interface ContaResumo {
  conta: string
  totalEntradas: number
  totalSaidas: number
  saldo: number
  nEntradas: number
  nSaidas: number
}

export interface Movimentacao {
  id: string
  tipo: 'entrada' | 'saida'
  conta: string
  data: string
  descricao: string
  contraparte: string   // cliente (entrada) or fornecedor (saída)
  forma: string | null
  valor: number
  id_obra: number | null
}

export interface ContasBancariasData {
  resumo: ContaResumo[]
  movimentacoes: Movimentacao[]
  totais: {
    totalEntradas: number
    totalSaidas: number
    saldo: number
  }
}

export async function getContasBancariasData(filters?: Filters): Promise<ContasBancariasData> {
  const supabase = await createClient()

  // ── Entradas (recebimentos) ───────────────────────────────────────────────
  let entQuery = supabase
    .from('recebimentos')
    .select('id, conta_bancaria, data_recebimento, descricao, cliente, forma_recebimento, valor_recebido, id_obra')
    .not('conta_bancaria', 'is', null)
    .not('data_recebimento', 'is', null)
    .gt('valor_recebido', 0)

  if (filters?.obras?.length)  entQuery = entQuery.in('id_obra', filters.obras.map(Number))
  if (filters?.dateFrom)       entQuery = entQuery.gte('data_recebimento', filters.dateFrom)
  if (filters?.dateTo)         entQuery = entQuery.lte('data_recebimento', filters.dateTo)

  const { data: entData } = await entQuery.order('data_recebimento', { ascending: false }).limit(5000)

  // ── Saídas (pagamentos) ───────────────────────────────────────────────────
  let saiQuery = supabase
    .from('pagamentos')
    .select('id_lancamento, numero_parcela, conta_bancaria, data_pagamento, descricao, fornecedor, forma_pagamento, valor_pago, id_obra')
    .not('conta_bancaria', 'is', null)
    .not('data_pagamento', 'is', null)
    .gt('valor_pago', 0)

  if (filters?.obras?.length)  saiQuery = saiQuery.in('id_obra', filters.obras.map(Number))
  if (filters?.dateFrom)       saiQuery = saiQuery.gte('data_pagamento', filters.dateFrom)
  if (filters?.dateTo)         saiQuery = saiQuery.lte('data_pagamento', filters.dateTo)

  const { data: saiData } = await saiQuery.order('data_pagamento', { ascending: false }).limit(5000)

  // ── Build movimentações ───────────────────────────────────────────────────
  const movimentacoes: Movimentacao[] = []

  for (const r of entData ?? []) {
    movimentacoes.push({
      id:          `ent-${r.id}`,
      tipo:        'entrada',
      conta:       r.conta_bancaria ?? '',
      data:        r.data_recebimento ?? '',
      descricao:   r.descricao ?? '',
      contraparte: r.cliente ?? '',
      forma:       r.forma_recebimento ?? null,
      valor:       Number(r.valor_recebido) || 0,
      id_obra:     r.id_obra ?? null,
    })
  }

  for (const p of saiData ?? []) {
    movimentacoes.push({
      id:          `sai-${p.id_lancamento}-${p.numero_parcela}`,
      tipo:        'saida',
      conta:       p.conta_bancaria ?? '',
      data:        p.data_pagamento ?? '',
      descricao:   p.descricao ?? '',
      contraparte: p.fornecedor ?? '',
      forma:       p.forma_pagamento ?? null,
      valor:       Number(p.valor_pago) || 0,
      id_obra:     p.id_obra ?? null,
    })
  }

  // Sort all by date DESC
  movimentacoes.sort((a, b) => b.data.localeCompare(a.data))

  // ── Build resumo por conta ────────────────────────────────────────────────
  const contaMap = new Map<string, ContaResumo>()

  const ensureConta = (conta: string) => {
    if (!contaMap.has(conta)) {
      contaMap.set(conta, { conta, totalEntradas: 0, totalSaidas: 0, saldo: 0, nEntradas: 0, nSaidas: 0 })
    }
    return contaMap.get(conta)!
  }

  for (const m of movimentacoes) {
    const c = ensureConta(m.conta)
    if (m.tipo === 'entrada') {
      c.totalEntradas += m.valor
      c.nEntradas++
    } else {
      c.totalSaidas += m.valor
      c.nSaidas++
    }
  }

  for (const c of contaMap.values()) {
    c.saldo = c.totalEntradas - c.totalSaidas
  }

  // Sort resumo by total movimentado DESC
  const resumo = [...contaMap.values()].sort(
    (a, b) => (b.totalEntradas + b.totalSaidas) - (a.totalEntradas + a.totalSaidas)
  )

  const totalEntradas = resumo.reduce((s, c) => s + c.totalEntradas, 0)
  const totalSaidas   = resumo.reduce((s, c) => s + c.totalSaidas, 0)

  return {
    resumo,
    movimentacoes,
    totais: { totalEntradas, totalSaidas, saldo: totalEntradas - totalSaidas },
  }
}
