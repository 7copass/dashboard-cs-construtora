import { NextRequest, NextResponse } from 'next/server'
import { fetchFromAPI } from '@/lib/mais-controle/client'
import { parseCSV } from '@/lib/mais-controle/parser'
import { endpoints, SYNC_ORDER } from '@/lib/mais-controle/endpoints'
import { upsertRecords } from '@/lib/sync/processor'
import { startSyncLog, completeSyncLog, failSyncLog } from '@/lib/sync/logger'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const maxDuration = 300 // 5 minutes for full sync

export async function GET(request: NextRequest) {
  // Authenticate
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results: Record<string, { status: string; records?: number; error?: string }> = {}

  // Sync in order (obras first for FK dependencies)
  for (const endpointName of SYNC_ORDER) {
    const config = endpoints.find((e) => e.name === endpointName)
    if (!config) continue

    let logId: string | null = null

    try {
      logId = await startSyncLog(config.name)

      // 1. Fetch CSV from API
      const csvText = await fetchFromAPI(config.name)

      // 2. Parse CSV
      const rawRows = parseCSV(csvText)

      // 3. Transform rows
      const transformedRows = rawRows.map((row) => config.transformRow(row))

      // 4. Upsert to Supabase (use the config's onConflict key)
      const recordCount = await upsertRecords(config.table, transformedRows, config.onConflict)

      // 5. Log success
      await completeSyncLog(logId, recordCount)

      results[config.name] = { status: 'success', records: recordCount }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (logId) {
        await failSyncLog(logId, errorMessage)
      }
      results[config.name] = { status: 'error', error: errorMessage }
    }
  }

  // Refresh materialized views
  try {
    const supabase = createServiceRoleClient()
    await supabase.rpc('refresh_all_materialized_views')
    results['materialized_views'] = { status: 'success' }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    results['materialized_views'] = { status: 'error', error: errorMessage }
  }

  const hasErrors = Object.values(results).some((r) => r.status === 'error')

  return NextResponse.json(
    {
      synced_at: new Date().toISOString(),
      overall_status: hasErrors ? 'partial' : 'success',
      results,
    },
    { status: hasErrors ? 207 : 200 }
  )
}
