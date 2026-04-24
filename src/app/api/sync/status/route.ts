import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { SYNC_ORDER } from '@/lib/mais-controle/endpoints'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createServiceRoleClient()

  const statuses: Record<
    string,
    {
      last_sync: string | null
      status: string | null
      records_processed: number | null
      errors: string | null
    }
  > = {}

  // Query latest sync log per endpoint
  for (const endpoint of SYNC_ORDER) {
    const { data } = await supabase
      .from('sync_logs')
      .select('started_at, finished_at, status, records_processed, errors')
      .eq('endpoint', endpoint)
      .order('started_at', { ascending: false })
      .limit(1)
      .single()

    statuses[endpoint] = {
      last_sync: data?.finished_at ?? data?.started_at ?? null,
      status: data?.status ?? null,
      records_processed: data?.records_processed ?? null,
      errors: data?.errors ?? null,
    }
  }

  return NextResponse.json({
    endpoints: statuses,
    checked_at: new Date().toISOString(),
  })
}
