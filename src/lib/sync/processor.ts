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

  let totalProcessed = 0

  // Process in batches to avoid payload limits
  for (let i = 0; i < timestampedRecords.length; i += BATCH_SIZE) {
    const rawBatch = timestampedRecords.slice(i, i + BATCH_SIZE)

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
