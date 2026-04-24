import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatPercent } from '@/lib/utils/format'

interface Filters {
  dateFrom: string
  dateTo: string
  obras?: string[]
  categorias?: string[]
}

interface Alert {
  severity: 'critical' | 'warning'
  message: string
  obra: string
  value: string
}

export async function getAlerts(filters: Filters): Promise<Alert[]> {
  const supabase = await createClient()
  const alerts: Alert[] = []
  const today = new Date().toISOString().slice(0, 10)

  try {
    // Fetch obras for name lookup
    const { data: obrasData } = await supabase
      .from('obras')
      .select('id, nome, status_obra')
    const obrasMap = new Map<number, { nome: string; status: string | null }>()
    for (const o of obrasData ?? []) {
      obrasMap.set(o.id, { nome: o.nome, status: o.status_obra })
    }

    const obraIds = filters.obras?.length
      ? filters.obras.map(Number)
      : Array.from(obrasMap.keys())

    // 1 & 2: Budget alerts - compare pagamentos vs items_orcamentos per obra
    const { data: orcamentos } = await supabase
      .from('items_orcamentos')
      .select('id_obra, preco_total_item')
      .in('id_obra', obraIds)

    const orcamentoMap = new Map<number, number>()
    for (const o of orcamentos ?? []) {
      if (o.id_obra == null) continue
      orcamentoMap.set(o.id_obra, (orcamentoMap.get(o.id_obra) ?? 0) + (o.preco_total_item ?? 0))
    }

    const { data: pagByObra } = await supabase
      .from('pagamentos')
      .select('id_obra, valor_pago')
      .in('id_obra', obraIds)
      .limit(10000)

    const gastoMap = new Map<number, number>()
    for (const p of pagByObra ?? []) {
      if (p.id_obra == null) continue
      gastoMap.set(p.id_obra, (gastoMap.get(p.id_obra) ?? 0) + (p.valor_pago ?? 0))
    }

    for (const [obraId, orcamento] of orcamentoMap.entries()) {
      if (orcamento <= 0) continue
      const gasto = gastoMap.get(obraId) ?? 0
      const pct = (gasto / orcamento) * 100
      const obraNome = obrasMap.get(obraId)?.nome ?? `Obra ${obraId}`

      if (pct > 100) {
        alerts.push({
          severity: 'critical',
          message: `Orcamento estourado (${formatPercent(pct)})`,
          obra: obraNome,
          value: formatCurrency(gasto - orcamento),
        })
      } else if (pct > 90) {
        alerts.push({
          severity: 'warning',
          message: `Orcamento acima de 90% (${formatPercent(pct)})`,
          obra: obraNome,
          value: formatPercent(pct),
        })
      }
    }

    // 3 & 4: Faturamento overdue
    // Fetch all faturamentos and recebimentos, then cross-reference
    const { data: fatData } = await supabase
      .from('faturamentos')
      .select('id_faturamento, id_obra, data_vencimento, valor_parcela')
      .limit(10000)

    const { data: recData } = await supabase
      .from('recebimentos')
      .select('id_faturamento')
      .limit(10000)

    // Build set of received faturamento IDs
    const receivedFatIds = new Set<number>()
    for (const r of recData ?? []) {
      if (r.id_faturamento != null) receivedFatIds.add(r.id_faturamento)
    }

    for (const f of fatData ?? []) {
      if (!f.data_vencimento || !f.valor_parcela) continue
      if (filters.obras?.length && f.id_obra && !obraIds.includes(f.id_obra)) continue
      // Skip faturamentos that have been received
      if (f.id_faturamento != null && receivedFatIds.has(f.id_faturamento)) continue

      const vencimento = new Date(f.data_vencimento)
      const diffDays = Math.floor((Date.now() - vencimento.getTime()) / (1000 * 60 * 60 * 24))
      const obraNome = f.id_obra ? obrasMap.get(f.id_obra)?.nome ?? `Obra ${f.id_obra}` : 'N/A'

      if (diffDays > 30) {
        alerts.push({
          severity: 'critical',
          message: `Faturamento vencido ha ${diffDays} dias`,
          obra: obraNome,
          value: formatCurrency(f.valor_parcela),
        })
      } else if (diffDays > 7) {
        alerts.push({
          severity: 'warning',
          message: `Faturamento vencido ha ${diffDays} dias`,
          obra: obraNome,
          value: formatCurrency(f.valor_parcela),
        })
      }
    }

    // 5 & 6: Bills overdue / due soon
    // Fetch lancamentos and pagamentos to cross-reference unpaid ones
    const { data: lancData } = await supabase
      .from('lancamentos')
      .select('id_lancamento, id_obra, data_vencimento, valor_parcela, descricao')
      .not('data_vencimento', 'is', null)
      .limit(10000)

    const { data: paidLanc } = await supabase
      .from('pagamentos')
      .select('id_lancamento')
      .limit(10000)

    // Build set of paid lancamento IDs
    const paidLancIds = new Set<number>()
    for (const p of paidLanc ?? []) {
      if (p.id_lancamento != null) paidLancIds.add(p.id_lancamento)
    }

    for (const l of lancData ?? []) {
      if (!l.data_vencimento || !l.valor_parcela) continue
      if (filters.obras?.length && l.id_obra && !obraIds.includes(l.id_obra)) continue
      // Skip lancamentos that have been paid
      if (l.id_lancamento != null && paidLancIds.has(l.id_lancamento)) continue

      const vencimento = new Date(l.data_vencimento)
      const diffDays = Math.floor((vencimento.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      const obraNome = l.id_obra ? obrasMap.get(l.id_obra)?.nome ?? `Obra ${l.id_obra}` : 'Geral'

      if (diffDays < 0) {
        alerts.push({
          severity: 'critical',
          message: `Conta vencida ha ${Math.abs(diffDays)} dias`,
          obra: obraNome,
          value: formatCurrency(l.valor_parcela),
        })
      } else if (diffDays <= 3) {
        alerts.push({
          severity: 'warning',
          message: `Conta vence em ${diffDays} dia${diffDays !== 1 ? 's' : ''}`,
          obra: obraNome,
          value: formatCurrency(l.valor_parcela),
        })
      }
    }

    // 7: Obra behind schedule
    const { data: cronData } = await supabase
      .from('cronogramas')
      .select('id_obra, data_fim_planejado, data_fim_realizado, etapa_item')

    // Group by obra: count overdue tasks (data_fim_planejado < today AND data_fim_realizado IS NULL)
    const cronByObra = new Map<number, { overdue: number; total: number }>()
    for (const c of cronData ?? []) {
      if (c.id_obra == null) continue
      if (filters.obras?.length && !obraIds.includes(c.id_obra)) continue
      const existing = cronByObra.get(c.id_obra) ?? { overdue: 0, total: 0 }
      existing.total += 1
      if (c.data_fim_planejado && c.data_fim_planejado < today && c.data_fim_realizado == null) {
        existing.overdue += 1
      }
      cronByObra.set(c.id_obra, existing)
    }

    for (const [obraId, { overdue, total }] of cronByObra.entries()) {
      if (overdue > 0) {
        const obraNome = obrasMap.get(obraId)?.nome ?? `Obra ${obraId}`
        alerts.push({
          severity: 'warning',
          message: `Obra atrasada (${overdue} de ${total} etapas vencidas sem conclusao)`,
          obra: obraNome,
          value: `${overdue} etapa${overdue !== 1 ? 's' : ''}`,
        })
      }
    }

    // 8: Projected negative cash (use saldo calculation)
    // Simple check: if current running balance is negative or trending negative
    const { data: recTotal } = await supabase
      .from('recebimentos')
      .select('valor_recebido')
      .limit(10000)
    const { data: pagTotal } = await supabase
      .from('pagamentos')
      .select('valor_pago')
      .limit(10000)

    const totalRec = (recTotal ?? []).reduce((s, r) => s + (r.valor_recebido ?? 0), 0)
    const totalPag = (pagTotal ?? []).reduce((s, r) => s + (r.valor_pago ?? 0), 0)
    const currentSaldo = totalRec - totalPag

    // Check upcoming obligations in next 30 days
    const thirtyDaysLater = new Date()
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30)
    const { data: upcomingPag } = await supabase
      .from('lancamentos')
      .select('valor_parcela')
      .gte('data_vencimento', today)
      .lte('data_vencimento', thirtyDaysLater.toISOString().slice(0, 10))
      .limit(10000)

    const upcomingTotal = (upcomingPag ?? []).reduce((s, r) => s + (r.valor_parcela ?? 0), 0)
    const projectedSaldo = currentSaldo - upcomingTotal

    if (projectedSaldo < 0) {
      alerts.push({
        severity: 'critical',
        message: 'Projecao de caixa negativo em 30 dias',
        obra: 'Geral',
        value: formatCurrency(projectedSaldo),
      })
    }

    // Sort: critical first, then warning. Limit to reasonable amount
    alerts.sort((a, b) => {
      if (a.severity === 'critical' && b.severity !== 'critical') return -1
      if (a.severity !== 'critical' && b.severity === 'critical') return 1
      return 0
    })

    return alerts
  } catch (error) {
    console.error('Error fetching alerts:', error)
    return []
  }
}
