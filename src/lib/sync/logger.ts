import { createServiceRoleClient } from '@/lib/supabase/server'

export async function startSyncLog(endpoint: string): Promise<string> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('sync_logs')
    .insert({
      endpoint,
      started_at: new Date().toISOString(),
      status: 'running',
    })
    .select('id')
    .single()

  if (error || !data) {
    throw new Error(`[sync-log] Failed to create log for ${endpoint}: ${error?.message}`)
  }

  return data.id
}

export async function completeSyncLog(
  id: string,
  recordsProcessed: number
): Promise<void> {
  const supabase = createServiceRoleClient()

  const { error } = await supabase
    .from('sync_logs')
    .update({
      finished_at: new Date().toISOString(),
      records_processed: recordsProcessed,
      status: 'success',
    })
    .eq('id', id)

  if (error) {
    console.error(`[sync-log] Failed to complete log ${id}: ${error.message}`)
  }
}

export async function failSyncLog(id: string, errorMessage: string): Promise<void> {
  const supabase = createServiceRoleClient()

  const { error } = await supabase
    .from('sync_logs')
    .update({
      finished_at: new Date().toISOString(),
      errors: errorMessage,
      status: 'error',
    })
    .eq('id', id)

  if (error) {
    console.error(`[sync-log] Failed to update error log ${id}: ${error.message}`)
  }
}
