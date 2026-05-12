import { createServiceRoleClient } from '@/lib/supabase/server'

const BATCH_SIZE = 500

/**
 * Deduplicate records within a batch by their conflict key(s).
 * When duplicates exist, the last occurrence wins (most recent API row).
 * This prevents "ON CONFLICT DO UPDATE command cannot affect row a second time" errors.
 */
function deduplicateBatch(
  records: Record<string, unknown>[],
  conflictKey: string
): Record<string, unknown>[] {
  const columns = conflictKey.split(',').map((c) => c.trim())
  const seen = new Map<string, Record<string, unknown>>()

  for (const record of records) {
    const key = columns.map((col) => String(record[col] ?? '')).join('|')
    seen.set(key, record) // last occurrence wins
  }

  return [...seen.values()]
}

/**
 * Aggregate recebimentos by (id_faturamento, numero_parcela).
 *
 * The Mais Controle API sends one row per partial payment event — multiple rows
 * can share the same (id_faturamento, numero_parcela). We must SUM the monetary
 * fields instead of letting the last row overwrite the rest.
 *
 * Rules:
 *  - valor_recebido, valor_desconto, valor_juros_e_multa  → SUM
 *  - data_recebimento                                     → latest (MAX)
 *  - all other fields                                     → from the last row
 */
function aggregateRecebimentos(
  records: Record<string, unknown>[]
): Record<string, unknown>[] {
  const map = new Map<string, Record<string, unknown>>()

  for (const row of records) {
    const key = `${row['id_faturamento']}|${row['numero_parcela']}`

    if (!map.has(key)) {
      map.set(key, { ...row })
      continue
    }

    const agg = map.get(key)!

    // Sum monetary fields
    agg['valor_recebido']     = (Number(agg['valor_recebido'])     || 0) + (Number(row['valor_recebido'])     || 0)
    agg['valor_desconto']     = (Number(agg['valor_desconto'])     || 0) + (Number(row['valor_desconto'])     || 0)
    agg['valor_juros_e_multa']= (Number(agg['valor_juros_e_multa'])|| 0) + (Number(row['valor_juros_e_multa'])|| 0)

    // Keep latest data_recebimento
    const existing = agg['data_recebimento'] as string | null
    const incoming = row['data_recebimento'] as string | null
    if (incoming && (!existing || incoming > existing)) {
      agg['data_recebimento'] = incoming
    }

    // Update non-monetary fields from the latest row
    for (const field of ['forma_recebimento', 'conta_bancaria', 'condicao_recebimento']) {
      if (row[field]) agg[field] = row[field]
    }
  }

  return [...map.values()]
}

/**
 * Upsert records into a Supabase table.
 * @param onConflictColumn - Single column name or comma-separated list for composite keys
 *                           e.g. "id" | "id_lancamento,numero_parcela"
 */
export async function upsertRecords(
  table: string,
  records: Record<string, unknown>[],
  onConflictColumn: string = 'id'
): Promise<number> {
  if (records.length === 0) return 0

  const supabase = createServiceRoleClient()
  const now = new Date().toISOString()

  // Add synced_at timestamp to every record
  const timestampedRecords = records.map((record) => ({
    ...record,
    synced_at: now,
  }))

  // For recebimentos: aggregate monetary values BEFORE batching so that
  // multiple partial-payment rows for the same (id_faturamento, numero_parcela)
  // are summed into one record rather than the last overwriting the rest.
  const preparedRecords = table === 'recebimentos'
    ? aggregateRecebimentos(timestampedRecords)
    : timestampedRecords

  let totalProcessed = 0

  // Process in batches to avoid payload limits
  for (let i = 0; i < preparedRecords.length; i += BATCH_SIZE) {
    const rawBatch = preparedRecords.slice(i, i + BATCH_SIZE)

    // Deduplicate within batch to avoid "cannot affect row a second time" errors
    const batch = deduplicateBatch(rawBatch, onConflictColumn)

    const { error } = await supabase
      .from(table)
      .upsert(batch, { onConflict: onConflictColumn })

    if (error) {
      throw new Error(
        `[sync] Upsert failed for table "${table}" (batch ${Math.floor(i / BATCH_SIZE) + 1}): ${error.message}`
      )
    }

    totalProcessed += batch.length
  }

  return totalProcessed
}
