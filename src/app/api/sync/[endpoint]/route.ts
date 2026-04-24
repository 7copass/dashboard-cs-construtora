import { NextRequest, NextResponse } from 'next/server'
import { fetchFromAPI } from '@/lib/mais-controle/client'
import { parseCSV } from '@/lib/mais-controle/parser'
import { getEndpointConfig, SYNC_ORDER } from '@/lib/mais-controle/endpoints'
import { upsertRecords } from '@/lib/sync/processor'
import { startSyncLog, completeSyncLog, failSyncLog } from '@/lib/sync/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: { endpoint: string } }
) {
  // Authenticate
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { endpoint } = params

  // Validate endpoint name
  if (!SYNC_ORDER.includes(endpoint)) {
    return NextResponse.json(
      {
        error: `Invalid endpoint: ${endpoint}`,
        valid_endpoints: SYNC_ORDER,
      },
      { status: 400 }
    )
  }

  const config = getEndpointConfig(endpoint)
  if (!config) {
    return NextResponse.json({ error: 'Endpoint config not found' }, { status: 500 })
  }

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

    return NextResponse.json({
      endpoint: config.name,
      status: 'success',
      records_processed: recordCount,
      synced_at: new Date().toISOString(),
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    if (logId) {
      await failSyncLog(logId, errorMessage)
    }
    return NextResponse.json(
      {
        endpoint: config.name,
        status: 'error',
        error: errorMessage,
      },
      { status: 500 }
    )
  }
}
