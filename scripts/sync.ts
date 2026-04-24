import { createClient } from '@supabase/supabase-js'
import Papa from 'papaparse'
import { config } from 'dotenv'
config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const API_BASE = process.env.MAIS_CONTROLE_BASE_URL!
const API_TOKEN = process.env.MAIS_CONTROLE_AUTH_TOKEN!

function convertDate(value: string | null | undefined): string | null {
  if (!value) return null
  const parts = value.split('/')
  if (parts.length !== 3) return null
  const [day, month, year] = parts
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

function convertNum(value: string | null | undefined): number | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null

  // If value contains comma, assume Brazilian format (1.234,56)
  if (trimmed.includes(',')) {
    const cleaned = trimmed.replace(/\./g, '').replace(',', '.')
    const num = parseFloat(cleaned)
    return isNaN(num) ? null : num
  }

  // Otherwise, standard format with dot as decimal (44000.00)
  const num = parseFloat(trimmed)
  return isNaN(num) ? null : num
}

function convertInt(value: string | null | undefined): number | null {
  if (!value) return null
  const num = parseInt(value, 10)
  return isNaN(num) ? null : num
}

async function fetchCSV(endpoint: string): Promise<Record<string, string>[]> {
  const res = await fetch(`${API_BASE}/${endpoint}`, {
    headers: { Authorization: API_TOKEN },
    signal: AbortSignal.timeout(30000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  let text = await res.text()
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1)
  const { data } = Papa.parse<Record<string, string>>(text, {
    header: true, skipEmptyLines: true,
    transformHeader: (h: string) => h.trim(),
    transform: (v: string) => v.trim() || '',
  })
  return data
}

// The tables already mirror API CSV headers exactly.
// We just need to convert dates and numerics.

interface SyncConfig {
  endpoint: string
  table: string
  conflictColumns: string
  syncStrategy: 'upsert' | 'replace'
  transform: (row: Record<string, string>) => Record<string, unknown>
}

/**
 * Dedup rows where ALL data fields are identical (true duplicates).
 * Uses JSON serialization of the row (excluding synced_at) as a hash key.
 */
function dedupTrueDuplicates(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  const seen = new Set<string>()
  const result: Record<string, unknown>[] = []
  for (const row of rows) {
    // Build a hash from all fields except synced_at
    const { synced_at, ...rest } = row
    const key = JSON.stringify(rest, Object.keys(rest).sort())
    if (!seen.has(key)) {
      seen.add(key)
      result.push(row)
    }
  }
  return result
}

const configs: SyncConfig[] = [
  {
    endpoint: 'obras',
    table: 'obras',
    conflictColumns: 'id',
    syncStrategy: 'upsert',
    transform: (r) => ({
      id: convertInt(r['id']),
      nome: r['nome'] || null,
      status_obra: r['status_obra'] || null,
      codigo_obra: r['codigo_obra'] || null,
      tipo_obra: r['tipo_obra'] || null,
      responsavel_obra: r['responsavel_obra'] || null,
      responsavel_tecnico: r['responsavel_tecnico'] || null,
      area_total: convertNum(r['area_total']),
      unidade_area_total: r['unidade_area_total'] || null,
      cliente: r['cliente'] || null,
    }),
  },
  {
    endpoint: 'lancamentos',
    table: 'lancamentos',
    conflictColumns: 'id_lancamento,numero_parcela',
    syncStrategy: 'replace',
    transform: (r) => ({
      id_lancamento: convertInt(r['id_lancamento']),
      id_obra: convertInt(r['id_obra']),
      centro_de_custo: r['centro_de_custo'] || null,
      fornecedor: r['fornecedor'] || null,
      descricao: r['descricao'] || null,
      numero_documento: r['numero_documento'] || null,
      data_competencia: convertDate(r['data_competencia']),
      valor_total_lancamento: convertNum(r['valor_total_lancamento']),
      conta_bancaria: r['conta_bancaria'] || null,
      categoria: r['categoria'] || null,
      condicao_pagamento: r['condicao_pagamento'] || null,
      numero_parcela: convertInt(r['numero_parcela']) ?? 1,
      valor_parcela: convertNum(r['valor_parcela']),
      data_vencimento: convertDate(r['data_vencimento']),
      indice_item_orcamento: r['indice_item_orcamento'] || null,
      possui_vinculo_estoque: r['possui_vinculo_estoque'] || null,
      ordem_de_compra: r['ordem_de_compra'] || null,
      data_lancamento: convertDate(r['data_lancamento']),
    }),
  },
  {
    endpoint: 'pagamentos',
    table: 'pagamentos',
    conflictColumns: 'id_lancamento,numero_parcela',
    syncStrategy: 'replace',
    transform: (r) => ({
      id_lancamento: convertInt(r['id_lancamento']),
      data_competencia: convertDate(r['data_competencia']),
      data_vencimento: convertDate(r['data_vencimento']),
      data_pagamento: convertDate(r['data_pagamento']),
      numero_parcela: convertInt(r['numero_parcela']) ?? 1,
      valor_parcela: convertNum(r['valor_parcela']),
      valor_pago: convertNum(r['valor_pago']),
      valor_desconto: convertNum(r['valor_desconto']),
      valor_juros_e_multa: convertNum(r['valor_juros_e_multa']),
      fornecedor: r['fornecedor'] || null,
      descricao: r['descricao'] || null,
      numero_documento: r['numero_documento'] || null,
      categoria: r['categoria'] || null,
      grupo: r['grupo'] || null,
      plano_de_conta: r['plano_de_conta'] || null,
      condicao_pagamento: r['condicao_pagamento'] || null,
      forma_pagamento: r['forma_pagamento'] || null,
      quem_paga: r['quem_paga'] || null,
      conta_bancaria: r['conta_bancaria'] || null,
      id_obra: convertInt(r['id_obra']),
      centro_de_custo: r['centro_de_custo'] || null,
      indice_item_orcamento: r['indice_item_orcamento'] || null,
      ordem_de_compra: r['ordem_de_compra'] || null,
    }),
  },
  {
    endpoint: 'recebimentos',
    table: 'recebimentos',
    conflictColumns: 'id_faturamento,numero_parcela',
    syncStrategy: 'replace',
    transform: (r) => ({
      id_faturamento: convertInt(r['id_faturamento']),
      data_competencia: convertDate(r['data_competencia']),
      data_vencimento: convertDate(r['data_vencimento']),
      data_recebimento: convertDate(r['data_recebimento']),
      numero_parcela: convertInt(r['numero_parcela']) ?? 1,
      valor_parcela: convertNum(r['valor_parcela']),
      valor_recebido: convertNum(r['valor_recebido']),
      valor_desconto: convertNum(r['valor_desconto']),
      valor_juros_e_multa: convertNum(r['valor_juros_e_multa']),
      id_obra: convertInt(r['id_obra']),
      centro_de_custo: r['centro_de_custo'] || null,
      cliente: r['cliente'] || null,
      descricao: r['descricao'] || null,
      numero_documento: r['numero_documento'] || null,
      condicao_recebimento: r['condicao_recebimento'] || null,
      conta_bancaria: r['conta_bancaria'] || null,
      forma_recebimento: r['forma_recebimento'] || null,
      natureza: r['natureza'] || null,
    }),
  },
  {
    endpoint: 'faturamentos',
    table: 'faturamentos',
    conflictColumns: 'id_faturamento,numero_parcela',
    syncStrategy: 'upsert',
    transform: (r) => ({
      id_faturamento: convertInt(r['id_faturamento']),
      id_obra: convertInt(r['id_obra']),
      centro_de_custo: r['centro_de_custo'] || null,
      cliente: r['cliente'] || null,
      descricao: r['descricao'] || null,
      data_competencia: convertDate(r['data_competencia']),
      valor_bruto: convertNum(r['valor_bruto']),
      impostos: convertNum(r['impostos']),
      valor_liquido: convertNum(r['valor_liquido']),
      numero_parcela: convertInt(r['numero_parcela']) ?? 1,
      valor_parcela: convertNum(r['valor_parcela']),
      data_vencimento: convertDate(r['data_vencimento']),
      conta_bancaria: r['conta_bancaria'] || null,
      natureza: r['natureza'] || null,
      condicao_recebimento: r['condicao_recebimento'] || null,
      numero_documento: r['numero_documento'] || null,
      vendedor: r['vendedor'] || null,
      calculo_reajuste_acumulado: r['calculo_reajuste_acumulado'] || null,
      tipo: r['tipo'] || null,
      valor: convertNum(r['valor']),
      tabela_reajuste: r['tabela_reajuste'] || null,
      pct_reajuste: convertNum(r['%_reajuste']),
      pct_reajuste_acumulado: convertNum(r['%_reajuste_acumulado']),
      data_faturamento: convertDate(r['data_faturamento']),
    }),
  },
  {
    endpoint: 'propostas',
    table: 'propostas',
    conflictColumns: 'id_obra,cod_orcamento',
    syncStrategy: 'upsert',
    transform: (r) => ({
      id_obra: convertInt(r['id_obra']),
      obra: r['obra'] || null,
      cod_orcamento: r['cod_orcamento'] || '',
      cliente: r['cliente'] || null,
      status_proposta: r['status_proposta'] || null,
      data_criacao: convertDate(r['data_criacao']),
      data_entrega: convertDate(r['data_entrega']),
      data_venda: convertDate(r['data_venda']),
      responsavel: r['responsavel'] || null,
      cond_pgto: r['cond_pgto'] || null,
      desconto: convertNum(r['desconto']),
      preco_total_com_desconto: convertNum(r['preco_total_com_desconto']),
    }),
  },
  {
    endpoint: 'cronogramas',
    table: 'cronogramas',
    conflictColumns: 'id_obra,indice',
    syncStrategy: 'upsert',
    transform: (r) => ({
      id_obra: convertInt(r['id_obra']),
      obra: r['obra'] || null,
      indice: r['indice'] || '',
      etapa_item: r['etapa_item'] || null,
      descricao: r['descricao'] || null,
      dias_uteis_desconsiderar: r['dias_uteis_desconsiderar'] || null,
      dias_uteis_planejado: convertInt(r['dias_uteis_planejado']),
      dias_corridos_planejado: convertInt(r['dias_corridos_planejado']),
      data_inicio_planejado: convertDate(r['data_inicio_planejado']),
      data_fim_planejado: convertDate(r['data_fim_planejado']),
      dias_uteis_realizado: convertInt(r['dias_uteis_realizado']),
      dias_corridos_realizado: convertInt(r['dias_corridos_realizado']),
      data_inicio_realizado: convertDate(r['data_inicio_realizado']),
      data_fim_realizado: convertDate(r['data_fim_realizado']),
    }),
  },
  {
    endpoint: 'items-orcamentos',
    table: 'items_orcamentos',
    conflictColumns: 'id_obra,indice',
    syncStrategy: 'upsert',
    transform: (r) => ({
      id_obra: convertInt(r['id_obra']),
      obra: r['obra'] || null,
      indice: r['indice'] || '',
      etapa_item: r['etapa_item'] || null,
      codigo_item: r['codigo_item'] || null,
      base: r['base'] || null,
      tipo: r['tipo'] || null,
      descricao: r['descricao'] || null,
      unid: r['unid'] || null,
      qtde: convertNum(r['qtde']),
      custo_unitario_mao_de_obra: convertNum(r['custo_unitario_mao_de_obra']),
      custo_unitario_material: convertNum(r['custo_unitario_material']),
      custo_unitario_equipamento: convertNum(r['custo_unitario_equipamento']),
      custo_unitario_outros: convertNum(r['custo_unitario_outros']),
      custo_unitario_item: convertNum(r['custo_unitario_item']),
      custo_total_mao_de_obra: convertNum(r['custo_total_mao_de_obra']),
      custo_total_material: convertNum(r['custo_total_material']),
      custo_total_equipamento: convertNum(r['custo_total_equipamento']),
      custo_total_outros: convertNum(r['custo_total_outros']),
      custo_total_item: convertNum(r['custo_total_item']),
      bdi_item: convertNum(r['bdi_item']),
      preco_unitario_mao_de_obra: convertNum(r['preco_unitario_mao_de_obra']),
      preco_unitario_material: convertNum(r['preco_unitario_material']),
      preco_unitario_equipamento: convertNum(r['preco_unitario_equipamento']),
      preco_unitario_outros: convertNum(r['preco_unitario_outros']),
      preco_unitario_item: convertNum(r['preco_unitario_item']),
      preco_total_mao_de_obra: convertNum(r['preco_total_mao_de_obra']),
      preco_total_material: convertNum(r['preco_total_material']),
      preco_total_equipamento: convertNum(r['preco_total_equipamento']),
      preco_total_outros: convertNum(r['preco_total_outros']),
      preco_total_item: convertNum(r['preco_total_item']),
    }),
  },
]

async function main() {
  console.log('🔄 Starting sync...\n')

  for (const cfg of configs) {
    process.stdout.write(`📦 ${cfg.endpoint.padEnd(20)}`)
    try {
      const rows = await fetchCSV(cfg.endpoint)
      process.stdout.write(`${rows.length.toString().padStart(5)} rows → `)

      if (rows.length === 0) { console.log('⏭️  empty'); continue }

      const allTransformed: Record<string, unknown>[] = rows
        .map(r => ({ ...cfg.transform(r), synced_at: new Date().toISOString() }))

      let transformed: Record<string, unknown>[]

      if (cfg.syncStrategy === 'replace') {
        // Dedup TRUE duplicates only (all fields match, not just composite key)
        transformed = dedupTrueDuplicates(allTransformed)
        if (transformed.length < allTransformed.length) {
          process.stdout.write(`(true-dedup ${allTransformed.length}→${transformed.length}) → `)
        }

        // Truncate the table first
        const { error: deleteError } = await supabase
          .from(cfg.table)
          .delete()
          .gte('id', 0)  // delete all rows (Supabase requires a filter)

        if (deleteError) {
          console.log(`❌ delete failed: ${deleteError.message}`)
          continue
        }

        // Insert all rows in batches
        let total = 0
        for (let i = 0; i < transformed.length; i += 500) {
          const batch = transformed.slice(i, i + 500)
          const { error } = await supabase
            .from(cfg.table)
            .insert(batch)

          if (error) {
            console.log(`❌ ${error.message}`)
            console.log('   Sample:', JSON.stringify(batch[0], null, 2).substring(0, 200))
            break
          }
          total += batch.length
        }
        if (total > 0) console.log(`✅ ${total} (replaced)`)
      } else {
        // Upsert strategy: deduplicate by conflict key (keep last occurrence)
        const keyFields = cfg.conflictColumns.split(',')
        const deduped = new Map<string, Record<string, unknown>>()
        for (const row of allTransformed) {
          const key = keyFields.map(k => String(row[k] ?? '')).join('|')
          deduped.set(key, row)
        }
        transformed = Array.from(deduped.values())
        if (transformed.length < allTransformed.length) {
          process.stdout.write(`(deduped ${allTransformed.length}→${transformed.length}) → `)
        }

        // Upsert in batches
        let total = 0
        for (let i = 0; i < transformed.length; i += 500) {
          const batch = transformed.slice(i, i + 500)
          const { error } = await supabase
            .from(cfg.table)
            .upsert(batch, { onConflict: cfg.conflictColumns })

          if (error) {
            console.log(`❌ ${error.message}`)
            console.log('   Sample:', JSON.stringify(batch[0], null, 2).substring(0, 200))
            break
          }
          total += batch.length
        }
        if (total > 0) console.log(`✅ ${total}`)
      }
    } catch (e: unknown) {
      console.log(`❌ ${e instanceof Error ? e.message : e}`)
    }
  }

  console.log('\n🔄 Refreshing views...')
  const { error } = await supabase.rpc('refresh_all_materialized_views')
  if (error) console.log('⚠️', error.message)
  else console.log('✅ Views refreshed!')

  console.log('\n🏁 Done!')
}

main().catch(console.error)
