import { SupabaseClient } from '@supabase/supabase-js'

export async function getRole(supabase: SupabaseClient): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('users').select('role').eq('id', user.id).single()
  return data?.role ?? null
}

export async function isAdmin(supabase: SupabaseClient): Promise<boolean> {
  const role = await getRole(supabase)
  return role === 'admin'
}
