import { createClient } from '@/lib/supabase'

const ALL_SECTIONS = ['posts', 'board', 'polls', 'schedule', 'records']

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

// 섹션별 읽기 권한 맵 반환 { posts: true, board: false, ... }
export async function getAllReadPermissions(): Promise<Record<string, boolean>> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Object.fromEntries(ALL_SECTIONS.map(s => [s, false]))

  // 익명(방문객)
  const role = user.is_anonymous
    ? 'guest'
    : ((await supabase.from('users').select('role').eq('id', user.id).maybeSingle()).data?.role ?? 'member')

  // 관리자는 전체 허용
  if (role === 'admin') return Object.fromEntries(ALL_SECTIONS.map(s => [s, true]))

  const { data } = await supabase
    .from('section_permissions')
    .select('section, can_read')
    .eq('role', role)

  const map = Object.fromEntries(ALL_SECTIONS.map(s => [s, true]))
  for (const p of (data ?? [])) {
    map[p.section] = p.can_read
  }
  return map
}
