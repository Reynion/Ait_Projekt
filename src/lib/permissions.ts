import { createClient } from '@/lib/supabase'

export async function getWritePermission(section: string): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data: userRow } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle()
  if (!userRow) return false
  if (userRow.role === 'admin') return true

  const { data: perm } = await supabase
    .from('section_permissions')
    .select('can_write')
    .eq('section', section)
    .eq('role', userRow.role)
    .maybeSingle()
  return perm?.can_write ?? false
}
