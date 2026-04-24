import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * GET /api/extrato/cliente?q=FERREIRA&secret=<CRON_SECRET>
 *
 * Returns all faturamentos + recebimentos for a given cliente (partial match, case-insensitive).
 * Useful for n8n integrations and external reporting.
 *
 * Query params:
 *   q       - cliente name (partial match, required)
 *   secret  - must match CRON_SECRET env var
 *   obra_id - (optional) filter by id_obra
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = Record<string, any>

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl

  // Auth
  const secret = searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const q = searchParams.get('q')
  if (!q || q.trim().length < 2) {
    return NextResponse.json({ error: 'Query param "q" is required (min 2 chars)' }, { status: 400 })
  }

  const obraIdParam = searchParams.get('obra_id')

  const supabase = createServiceRoleClient()

  // ── 1. Fetch faturamentos ────────────────────────────────────────
  let fatQuery = supabase
    .from('faturamentos')
    .select(
      'id_faturamento, id_obra, centro_de_custo, cliente, descricao, natureza, ' +
      'data_competencia, data_faturamento, data_vencimento, ' +
      'numero_parcela, valor_parcela, valor_bruto, valor_liquido, ' +
      'condicao_recebimento, conta_bancaria, numero_documento'
    )
    .ilike('cliente', `%${q.trim()}%`)
    .order('id_faturamento', { ascending: true })
    .order('numero_parcela', { ascending: true })

  if (obraIdParam) fatQuery = fatQuery.eq('id_obra', Number(obraIdParam))

  const { data: fatRaw, error: fatError } = await fatQuery.limit(5000)
  if (fatError) {
    return NextResponse.json({ error: `faturamentos query failed: ${fatError.message}` }, { status: 500 })
  }

  const fatData = (fatRaw ?? []) as AnyRow[]

  if (fatData.length === 0) {
    return NextResponse.json({ cliente: q, total_parcelas: 0, parcelas: [] })
  }

  // ── 2. Fetch recebimentos for these id_faturamentos ──────────────
  const fatIds = [...new Set(fatData.map((f) => f.id_faturamento as number))]

  const { data: recRaw, error: recError } = await supabase
    .from('recebimentos')
    .select(
      'id_faturamento, numero_parcela, id_obra, ' +
      'data_recebimento, valor_recebido, valor_desconto, valor_juros_e_multa, ' +
      'forma_recebimento, conta_bancaria'
    )
    .in('id_faturamento', fatIds)
    .order('id_faturamento', { ascending: true })
    .order('numero_parcela', { ascending: true })

  if (recError) {
    return NextResponse.json({ error: `recebimentos query failed: ${recError.message}` }, { status: 500 })
  }

  const recData = (recRaw ?? []) as AnyRow[]

  // ── 3. Build lookup map recebimentos ────────────────────────────
  const recMap = new Map<string, AnyRow>()
  for (const r of recData) {
    const key = `${r.id_faturamento}-${r.numero_parcela}`
    recMap.set(key, r)
  }

  // ── 4. Join & compute status ────────────────────────────────────
  const parcelas = fatData.map((f) => {
    const key = `${f.id_faturamento}-${f.numero_parcela}`
    const rec = recMap.get(key)

    const valorParcela = Number(f.valor_parcela) || 0
    const valorRecebido = Number(rec?.valor_recebido) || 0
    const juros = Number(rec?.valor_juros_e_multa) || 0
    const desconto = Number(rec?.valor_desconto) || 0

    let status: 'Recebido' | 'Parcial' | 'Pendente'
    if (valorRecebido >= valorParcela && valorParcela > 0) status = 'Recebido'
    else if (valorRecebido > 0) status = 'Parcial'
    else status = 'Pendente'

    return {
      id_faturamento:      f.id_faturamento,
      id_obra:             f.id_obra,
      centro_de_custo:     f.centro_de_custo,
      cliente:             f.cliente,
      descricao:           f.descricao,
      natureza:            f.natureza,
      data_competencia:    f.data_competencia,
      data_faturamento:    f.data_faturamento,
      numero_parcela:      f.numero_parcela,
      valor_parcela:       valorParcela,
      valor_bruto:         Number(f.valor_bruto) || 0,
      data_vencimento:     f.data_vencimento,
      data_recebimento:    rec?.data_recebimento ?? null,
      valor_recebido:      valorRecebido,
      valor_juros_e_multa: juros,
      valor_desconto:      desconto,
      forma_recebimento:   rec?.forma_recebimento ?? null,
      conta_bancaria:      rec?.conta_bancaria ?? f.conta_bancaria ?? null,
      status,
    }
  })

  // ── 5. Summary totals ────────────────────────────────────────────
  const totalFaturado = parcelas.reduce((s, p) => s + p.valor_parcela, 0)
  const totalRecebido = parcelas.reduce((s, p) => s + p.valor_recebido, 0)
  const totalJuros    = parcelas.reduce((s, p) => s + p.valor_juros_e_multa, 0)
  const totalPendente = parcelas.reduce((s, p) => s + Math.max(0, p.valor_parcela - p.valor_recebido), 0)
  const clientes      = [...new Set(parcelas.map((p) => p.cliente).filter(Boolean))]
  const obras         = [...new Set(parcelas.map((p) => p.id_obra).filter(Boolean))]

  return NextResponse.json({
    query:           q,
    clientes,
    obras,
    total_parcelas:  parcelas.length,
    total_recebidos: parcelas.filter((p) => p.status === 'Recebido').length,
    total_pendentes: parcelas.filter((p) => p.status === 'Pendente').length,
    total_parciais:  parcelas.filter((p) => p.status === 'Parcial').length,
    resumo: {
      total_faturado: totalFaturado,
      total_recebido: totalRecebido,
      total_juros_e_multa: totalJuros,
      total_pendente: totalPendente,
      pct_recebido: totalFaturado > 0 ? Math.round((totalRecebido / totalFaturado) * 10000) / 100 : 0,
    },
    parcelas,
    synced_at: new Date().toISOString(),
  })
}
