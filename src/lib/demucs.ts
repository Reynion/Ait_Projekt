import { createAdminClient } from '@/lib/supabase-admin'

export async function getDemucsServerUrl(): Promise<string | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('demucs_server')
    .select('url')
    .eq('id', 1)
    .single()

  if (error || !data?.url) return null
  return data.url
}
