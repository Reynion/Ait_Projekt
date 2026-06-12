import { createClient } from '@/lib/supabase'

const ALL_SECTIONS = ['posts', 'board', 'polls', 'schedule', 'records', 'guestbook']

export async function getWritePermission(section: string): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const role = user.is_anonymous
    ? 'guest'
    : ((await supabase.from('users').select('role').eq('id', user.id).maybeSingle()).data?.role ?? 'member')

  if (role === 'admin') return true

  const { data: perm } = await supabase
    .from('section_permissions')
    .select('can_write')
    .eq('section', section)
    .eq('role', role)
    .maybeSingle()
  return perm?.can_write ?? false
}

export async function getCommentPermission(section: string): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const role = user.is_anonymous
    ? 'guest'
    : ((await supabase.from('users').select('role').eq('id', user.id).maybeSingle()).data?.role ?? 'member')

  if (role === 'admin') return true

  const { data, error } = await supabase
    .from('section_permissions')
    .select('can_comment')
    .eq('section', section)
    .eq('role', role)
    .maybeSingle()
  if (error) return false
  return data?.can_comment ?? false
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
