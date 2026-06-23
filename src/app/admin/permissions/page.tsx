'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

const SECTIONS = [
  { key: 'posts', label: '음악제안' },
  { key: 'board', label: '게시판' },
  { key: 'polls', label: '투표' },
  { key: 'schedule', label: '일정' },
  { key: 'records', label: '기록' },
  { key: 'guestbook', label: '방명록' },
  { key: 'utility', label: '유틸리티' },
]

const ROLES = [
  { key: 'member', label: '멤버' },
  { key: 'former', label: '전멤버' },
  { key: 'guest', label: '방문객' },
]

interface Permission {
  section: string
  role: string
  can_read: boolean
  can_write: boolean
  can_comment: boolean
}

export default function PermissionsPage() {
  const [perms, setPerms] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('section_permissions')
      .select('section, role, can_read, can_write, can_comment')
      .then(({ data }) => {
        if (data) setPerms(data as Permission[])
        setLoading(false)
      })
  }, [])

  function getPerm(section: string, role: string) {
    return perms.find(p => p.section === section && p.role === role)
  }

  async function toggle(section: string, role: string, field: 'can_read' | 'can_write' | 'can_comment') {
    const current = getPerm(section, role)
    if (!current) return
    const newVal = !current[field]

    const key = `${section}-${role}-${field}`
    setSaving(key)

    const supabase = createClient()
    const update: Partial<Permission> = { [field]: newVal }
    if (field === 'can_read' && !newVal) { update.can_write = false; update.can_comment = false }
    if (field === 'can_write' && newVal) update.can_read = true
    if (field === 'can_comment' && newVal) update.can_read = true

    await supabase
      .from('section_permissions')
      .update(update)
      .eq('section', section)
      .eq('role', role)

    setPerms(prev => prev.map(p =>
      p.section === section && p.role === role ? { ...p, ...update } : p
    ))
    setSaving(null)
  }

  if (loading) return <p className="text-zinc-400">불러오는 중...</p>

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-white">권한 설정</h1>
        <p className="text-sm text-zinc-400 mt-1">관리자는 항상 전체 권한을 가집니다.</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="text-left py-3 pr-6 text-zinc-400 font-medium">섹션</th>
              {ROLES.map(r => (
                <th key={r.key} className="py-3 px-4 text-center text-zinc-400 font-medium" colSpan={3}>
                  {r.label}
                </th>
              ))}
            </tr>
            <tr className="border-b border-zinc-700">
              <th />
              {ROLES.map(r => (
                <>
                  <th key={`${r.key}-read`} className="pb-2 px-3 text-center text-xs text-zinc-500 font-normal">읽기</th>
                  <th key={`${r.key}-write`} className="pb-2 px-3 text-center text-xs text-zinc-500 font-normal">쓰기</th>
                  <th key={`${r.key}-comment`} className="pb-2 px-3 text-center text-xs text-zinc-500 font-normal">댓글</th>
                </>
              ))}
            </tr>
          </thead>
          <tbody>
            {SECTIONS.map(s => (
              <tr key={s.key} className="border-b border-zinc-800 hover:bg-zinc-800/50 transition-colors">
                <td className="py-4 pr-6 font-medium text-zinc-200">{s.label}</td>
                {ROLES.map(r => {
                  const perm = getPerm(s.key, r.key)
                  return (
                    <>
                      <td key={`${r.key}-read`} className="py-4 px-3 text-center">
                        <button
                          onClick={() => toggle(s.key, r.key, 'can_read')}
                          disabled={saving !== null}
                          className={`w-6 h-6 rounded border transition-colors disabled:opacity-50 ${
                            perm?.can_read
                              ? 'bg-emerald-500 border-emerald-400'
                              : 'bg-zinc-800 border-zinc-600'
                          }`}
                        >
                          {perm?.can_read && <span className="text-[#ffffff] text-xs">✓</span>}
                        </button>
                      </td>
                      <td key={`${r.key}-write`} className="py-4 px-3 text-center">
                        <button
                          onClick={() => toggle(s.key, r.key, 'can_write')}
                          disabled={saving !== null}
                          className={`w-6 h-6 rounded border transition-colors disabled:opacity-50 ${
                            perm?.can_write
                              ? 'bg-blue-500 border-blue-400'
                              : 'bg-zinc-800 border-zinc-600'
                          }`}
                        >
                          {perm?.can_write && <span className="text-[#ffffff] text-xs">✓</span>}
                        </button>
                      </td>
                      <td key={`${r.key}-comment`} className="py-4 px-3 text-center">
                        <button
                          onClick={() => toggle(s.key, r.key, 'can_comment')}
                          disabled={saving !== null}
                          className={`w-6 h-6 rounded border transition-colors disabled:opacity-50 ${
                            perm?.can_comment
                              ? 'bg-purple-500 border-purple-400'
                              : 'bg-zinc-800 border-zinc-600'
                          }`}
                        >
                          {perm?.can_comment && <span className="text-[#ffffff] text-xs">✓</span>}
                        </button>
                      </td>
                    </>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-zinc-500">읽기 끄면 쓰기·댓글도 자동으로 꺼집니다. 쓰기·댓글 켜면 읽기도 자동으로 켜집니다.</p>
    </div>
  )
}
