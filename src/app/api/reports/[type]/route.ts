import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type ReportType =
  | 'fluxo-caixa'
  | 'demonstrativo-obra'
  | 'inadimplencia'
  | 'gastos-categoria'
  | 'balancete'
  | 'status-obras'
  | 'extrato-obra'
  | 'proposta-resultado'
  | 'custom'

interface ReportFilters {
  dateFrom?: string
  dateTo?: string
  obras?: string[]
  categorias?: string[]
  tipoDado?: string
}

interface RouteParams {
  params: Promise<{ type: string }>
}

function buildExcelResponse(data: Record<string, unknown>[], filename: string): NextResponse {
  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Relatório')

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}.xlsx"`,
    },
  })
}

function buildCsvResponse(data: Record<string, unknown>[], filename: string): NextResponse {
  if (data.length === 0) {
    return new NextResponse('', {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}.csv"`,
      },
    })
  }

  const headers = Object.keys(data[0])
  const csvRows = [
    headers.join(';'),
    ...data.map((row) =>
      headers.map((h) => {
        const val = row[h]
        if (val === null || val === undefined) return ''
        const str = String(val)
        return str.includes(';') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str
      }).join(';')
    ),
  ]

  return new NextResponse(csvRows.join('\n'), {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}.csv"`,
    },
  })
}

async function getFluxoCaixa(filters: ReportFilters): Promise<Record<string, unknown>[]> {
  const supabase = createServiceRoleClient()

  const recebimentosQuery = supabase
    .from('recebimentos')
    .select('data_recebimento, valor, descricao, obra_id')
    .order('data_recebimento', { ascending: true })

  if (filters.dateFrom) recebimentosQuery.gte('data_recebimento', filters.dateFrom)
  if (filters.dateTo) recebimentosQuery.lte('data_recebimento', filters.dateTo)
  if (filters.obras?.length) recebimentosQuery.in('obra_id', filters.obras)

  const pagamentosQuery = supabase
    .from('pagamentos')
    .select('data_pagamento, valor, descricao, obra_id')
    .order('data_pagamento', { ascending: true })

  if (filters.dateFrom) pagamentosQuery.gte('data_pagamento', filters.dateFrom)
  if (filters.dateTo) pagamentosQuery.lte('data_pagamento', filters.dateTo)
  if (filters.obras?.length) pagamentosQuery.in('obra_id', filters.obras)

  const [{ data: recebimentos }, { data: pagamentos }] = await Promise.all([
    recebimentosQuery,
    pagamentosQuery,
  ])

  const entries: Record<string, { entradas: number; saidas: number }> = {}

  for (const r of recebimentos ?? []) {
    const date = r.data_recebimento as string
    if (!entries[date]) entries[date] = { entradas: 0, saidas: 0 }
    entries[date].entradas += Number(r.valor) || 0
  }

  for (const p of pagamentos ?? []) {
    const date = p.data_pagamento as string
    if (!entries[date]) entries[date] = { entradas: 0, saidas: 0 }
    entries[date].saidas += Number(p.valor) || 0
  }

  const sortedDates = Object.keys(entries).sort()
  let saldoAcumulado = 0

  return sortedDates.map((date) => {
    const { entradas, saidas } = entries[date]
    saldoAcumulado += entradas - saidas
    return {
      Data: date,
      Entradas: entradas.toFixed(2),
      Saídas: saidas.toFixed(2),
      'Saldo Diário': (entradas - saidas).toFixed(2),
      'Saldo Acumulado': saldoAcumulado.toFixed(2),
    }
  })
}

async function getDemonstrativoObra(filters: ReportFilters): Promise<Record<string, unknown>[]> {
  const supabase = createServiceRoleClient()

  const { data: obras } = await supabase
    .from('obras')
    .select('id, nome, valor_orcado, valor_realizado')

  if (!obras) return []

  const filtered = filters.obras?.length
    ? obras.filter((o) => filters.obras!.includes(String(o.id)))
    : obras

  return filtered.map((obra) => {
    const orcado = Number(obra.valor_orcado) || 0
    const realizado = Number(obra.valor_realizado) || 0
    const desvio = realizado - orcado
    const desvioPercent = orcado > 0 ? ((desvio / orcado) * 100).toFixed(1) : '0.0'

    return {
      Obra: obra.nome,
      'Valor Orçado': orcado.toFixed(2),
      'Valor Realizado': realizado.toFixed(2),
      'Desvio (R$)': desvio.toFixed(2),
      'Desvio (%)': `${desvioPercent}%`,
    }
  })
}

async function getInadimplencia(filters: ReportFilters): Promise<Record<string, unknown>[]> {
  const supabase = createServiceRoleClient()

  const query = supabase
    .from('recebimentos')
    .select('*, obras(nome)')
    .eq('status', 'pendente')
    .order('data_vencimento', { ascending: true })

  if (filters.dateFrom) query.gte('data_vencimento', filters.dateFrom)
  if (filters.dateTo) query.lte('data_vencimento', filters.dateTo)
  if (filters.obras?.length) query.in('obra_id', filters.obras)

  const { data: recebimentos } = await query

  const today = new Date()

  return (recebimentos ?? []).map((r) => {
    const vencimento = new Date(r.data_vencimento as string)
    const diasAtraso = Math.max(0, Math.floor((today.getTime() - vencimento.getTime()) / (1000 * 60 * 60 * 24)))

    let faixa = 'A vencer'
    if (diasAtraso > 0 && diasAtraso <= 30) faixa = '1-30 dias'
    else if (diasAtraso > 30 && diasAtraso <= 60) faixa = '31-60 dias'
    else if (diasAtraso > 60 && diasAtraso <= 90) faixa = '61-90 dias'
    else if (diasAtraso > 90) faixa = '90+ dias'

    const obraData = r.obras as Record<string, unknown> | null

    return {
      Obra: obraData?.nome ?? '-',
      Descrição: r.descricao ?? '-',
      Valor: (Number(r.valor) || 0).toFixed(2),
      Vencimento: r.data_vencimento,
      'Dias em Atraso': diasAtraso,
      Faixa: faixa,
    }
  })
}

async function getGastosCategoria(filters: ReportFilters): Promise<Record<string, unknown>[]> {
  const supabase = createServiceRoleClient()

  const query = supabase
    .from('lancamentos')
    .select('categoria, centro_custo, valor, data_lancamento, obra_id')
    .eq('tipo', 'saida')
    .order('categoria', { ascending: true })

  if (filters.dateFrom) query.gte('data_lancamento', filters.dateFrom)
  if (filters.dateTo) query.lte('data_lancamento', filters.dateTo)
  if (filters.obras?.length) query.in('obra_id', filters.obras)
  if (filters.categorias?.length) query.in('categoria', filters.categorias)

  const { data: lancamentos } = await query

  const grouped: Record<string, { total: number; centroCusto: string }> = {}

  for (const l of lancamentos ?? []) {
    const cat = (l.categoria as string) || 'Sem categoria'
    if (!grouped[cat]) grouped[cat] = { total: 0, centroCusto: (l.centro_custo as string) || '-' }
    grouped[cat].total += Number(l.valor) || 0
  }

  return Object.entries(grouped).map(([categoria, data]) => ({
    Categoria: categoria,
    'Centro de Custo': data.centroCusto,
    'Total (R$)': data.total.toFixed(2),
  }))
}

async function getBalancete(filters: ReportFilters): Promise<Record<string, unknown>[]> {
  const supabase = createServiceRoleClient()

  const query = supabase
    .from('lancamentos')
    .select('tipo, categoria, valor, data_lancamento')
    .order('data_lancamento', { ascending: true })

  if (filters.dateFrom) query.gte('data_lancamento', filters.dateFrom)
  if (filters.dateTo) query.lte('data_lancamento', filters.dateTo)

  const { data: lancamentos } = await query

  let totalReceitas = 0
  let totalDespesas = 0

  const porCategoria: Record<string, { receitas: number; despesas: number }> = {}

  for (const l of lancamentos ?? []) {
    const cat = (l.categoria as string) || 'Sem categoria'
    if (!porCategoria[cat]) porCategoria[cat] = { receitas: 0, despesas: 0 }

    const valor = Number(l.valor) || 0
    if (l.tipo === 'entrada') {
      totalReceitas += valor
      porCategoria[cat].receitas += valor
    } else {
      totalDespesas += valor
      porCategoria[cat].despesas += valor
    }
  }

  const rows: Record<string, unknown>[] = Object.entries(porCategoria).map(([cat, data]) => ({
    Categoria: cat,
    'Receitas (R$)': data.receitas.toFixed(2),
    'Despesas (R$)': data.despesas.toFixed(2),
    'Resultado (R$)': (data.receitas - data.despesas).toFixed(2),
  }))

  rows.push({
    Categoria: 'TOTAL',
    'Receitas (R$)': totalReceitas.toFixed(2),
    'Despesas (R$)': totalDespesas.toFixed(2),
    'Resultado (R$)': (totalReceitas - totalDespesas).toFixed(2),
  })

  return rows
}

async function getStatusObras(): Promise<Record<string, unknown>[]> {
  const supabase = createServiceRoleClient()

  const { data: obras } = await supabase
    .from('obras')
    .select('nome, status, valor_orcado, valor_realizado, data_inicio, data_previsao_termino')
    .order('nome', { ascending: true })

  return (obras ?? []).map((obra) => {
    const orcado = Number(obra.valor_orcado) || 0
    const realizado = Number(obra.valor_realizado) || 0
    const progresso = orcado > 0 ? ((realizado / orcado) * 100).toFixed(1) : '0.0'

    return {
      Obra: obra.nome,
      Status: obra.status ?? '-',
      'Valor Orçado': orcado.toFixed(2),
      'Valor Realizado': realizado.toFixed(2),
      'Progresso (%)': `${progresso}%`,
      'Data Início': obra.data_inicio ?? '-',
      'Previsão Término': obra.data_previsao_termino ?? '-',
    }
  })
}

async function getExtratoObra(filters: ReportFilters): Promise<Record<string, unknown>[]> {
  const supabase = createServiceRoleClient()

  const query = supabase
    .from('lancamentos')
    .select('data_lancamento, tipo, categoria, descricao, valor, obra_id, obras(nome)')
    .order('data_lancamento', { ascending: true })

  if (filters.dateFrom) query.gte('data_lancamento', filters.dateFrom)
  if (filters.dateTo) query.lte('data_lancamento', filters.dateTo)
  if (filters.obras?.length) query.in('obra_id', filters.obras)

  const { data: lancamentos } = await query

  return (lancamentos ?? []).map((l) => {
    const obraData = (l.obras as unknown) as Record<string, unknown> | null
    return {
      Data: l.data_lancamento,
      Obra: obraData?.nome ?? '-',
      Tipo: l.tipo === 'entrada' ? 'Entrada' : 'Saída',
      Categoria: l.categoria ?? '-',
      Descrição: l.descricao ?? '-',
      'Valor (R$)': (Number(l.valor) || 0).toFixed(2),
    }
  })
}

async function getPropostaResultado(filters: ReportFilters): Promise<Record<string, unknown>[]> {
  const supabase = createServiceRoleClient()

  const { data: propostas } = await supabase
    .from('propostas')
    .select('id, nome, valor_proposto, obra_id, obras(nome)')
    .order('nome', { ascending: true })

  if (!propostas) return []

  const filtered = filters.obras?.length
    ? propostas.filter((p) => filters.obras!.includes(String(p.obra_id)))
    : propostas

  const obraIds = [...new Set(filtered.map((p) => p.obra_id).filter(Boolean))]

  let faturamentos: Record<string, unknown>[] = []
  let pagamentos: Record<string, unknown>[] = []

  if (obraIds.length > 0) {
    const [fatResult, pagResult] = await Promise.all([
      supabase.from('faturamentos').select('obra_id, valor').in('obra_id', obraIds),
      supabase.from('pagamentos').select('obra_id, valor').in('obra_id', obraIds),
    ])
    faturamentos = (fatResult.data ?? []) as Record<string, unknown>[]
    pagamentos = (pagResult.data ?? []) as Record<string, unknown>[]
  }

  const faturadoPorObra: Record<string, number> = {}
  for (const f of faturamentos) {
    const id = String(f.obra_id)
    faturadoPorObra[id] = (faturadoPorObra[id] || 0) + (Number(f.valor) || 0)
  }

  const custoPorObra: Record<string, number> = {}
  for (const p of pagamentos) {
    const id = String(p.obra_id)
    custoPorObra[id] = (custoPorObra[id] || 0) + (Number(p.valor) || 0)
  }

  return filtered.map((proposta) => {
    const obraData = (proposta.obras as unknown) as Record<string, unknown> | null
    const obraId = String(proposta.obra_id)
    const proposto = Number(proposta.valor_proposto) || 0
    const faturado = faturadoPorObra[obraId] || 0
    const custo = custoPorObra[obraId] || 0
    const resultado = faturado - custo

    return {
      Proposta: proposta.nome,
      Obra: obraData?.nome ?? '-',
      'Valor Proposto': proposto.toFixed(2),
      'Valor Faturado': faturado.toFixed(2),
      'Custo Real': custo.toFixed(2),
      Resultado: resultado.toFixed(2),
      'Margem (%)': faturado > 0 ? `${((resultado / faturado) * 100).toFixed(1)}%` : '0.0%',
    }
  })
}

async function getCustomReport(filters: ReportFilters): Promise<Record<string, unknown>[]> {
  const supabase = createServiceRoleClient()

  const query = supabase
    .from('lancamentos')
    .select('data_lancamento, tipo, categoria, descricao, valor, obra_id, obras(nome)')
    .order('data_lancamento', { ascending: true })

  if (filters.dateFrom) query.gte('data_lancamento', filters.dateFrom)
  if (filters.dateTo) query.lte('data_lancamento', filters.dateTo)
  if (filters.obras?.length) query.in('obra_id', filters.obras)
  if (filters.categorias?.length) query.in('categoria', filters.categorias)
  if (filters.tipoDado === 'entradas') query.eq('tipo', 'entrada')
  else if (filters.tipoDado === 'saidas') query.eq('tipo', 'saida')

  const { data: lancamentos } = await query

  return (lancamentos ?? []).map((l) => {
    const obraData = (l.obras as unknown) as Record<string, unknown> | null
    return {
      Data: l.data_lancamento,
      Obra: obraData?.nome ?? '-',
      Tipo: l.tipo === 'entrada' ? 'Entrada' : 'Saída',
      Categoria: l.categoria ?? '-',
      Descrição: l.descricao ?? '-',
      'Valor (R$)': (Number(l.valor) || 0).toFixed(2),
    }
  })
}

const REPORT_HANDLERS: Record<string, (filters: ReportFilters) => Promise<Record<string, unknown>[]>> = {
  'fluxo-caixa': getFluxoCaixa,
  'demonstrativo-obra': getDemonstrativoObra,
  'inadimplencia': getInadimplencia,
  'gastos-categoria': getGastosCategoria,
  'balancete': getBalancete,
  'status-obras': getStatusObras,
  'extrato-obra': getExtratoObra,
  'proposta-resultado': getPropostaResultado,
  'custom': getCustomReport,
}

const REPORT_NAMES: Record<string, string> = {
  'fluxo-caixa': 'fluxo-de-caixa',
  'demonstrativo-obra': 'demonstrativo-por-obra',
  'inadimplencia': 'inadimplencia',
  'gastos-categoria': 'gastos-por-categoria',
  'balancete': 'balancete-simplificado',
  'status-obras': 'status-obras',
  'extrato-obra': 'extrato-por-obra',
  'proposta-resultado': 'proposta-vs-resultado',
  'custom': 'relatorio-customizado',
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { type } = await params
    const { searchParams } = new URL(request.url)

    const reportType = type as ReportType
    const handler = REPORT_HANDLERS[reportType]

    if (!handler) {
      return NextResponse.json(
        { error: `Tipo de relatório inválido: ${type}` },
        { status: 400 }
      )
    }

    const formato = searchParams.get('formato') || 'excel'
    const filters: ReportFilters = {
      dateFrom: searchParams.get('dateFrom') ?? undefined,
      dateTo: searchParams.get('dateTo') ?? undefined,
      obras: searchParams.get('obras')?.split(',').filter(Boolean) ?? undefined,
      categorias: searchParams.get('categorias')?.split(',').filter(Boolean) ?? undefined,
      tipoDado: searchParams.get('tipoDado') ?? undefined,
    }

    const data = await handler(filters)

    if (data.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum dado encontrado para os filtros informados.' },
        { status: 404 }
      )
    }

    const filename = `${REPORT_NAMES[reportType] ?? reportType}-${new Date().toISOString().split('T')[0]}`

    if (formato === 'csv') {
      return buildCsvResponse(data, filename)
    }

    return buildExcelResponse(data, filename)
  } catch (error: unknown) {
    console.error('Erro ao gerar relatório:', error)
    const message = error instanceof Error ? error.message : 'Erro interno do servidor'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
