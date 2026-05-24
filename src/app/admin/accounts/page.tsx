'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

interface UserRow {
  id: string
  nickname: string
  email: string
  role: string
  created_at: string
}

export default function AdminAccounts() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchUsers() {
    const supabase = createClient()
    const { data } = await supabase
      .from('users')
      .select('id, nickname, email, role, created_at')
      .order('created_at', { ascending: false })
    if (data) setUsers(data)
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [])

  async function toggleRole(user: UserRow) {
    const newRole = user.role === 'admin' ? 'member' : 'admin'
    const supabase = createClient()
    await supabase.from('users').update({ role: newRole }).eq('id', user.id)
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u))
  }

  if (loading) return <p className="text-zinc-400">불러오는 중...</p>

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-white">계정 관리</h1>
      <div className="flex flex-col gap-3">
        {users.length === 0 && (
          <p className="text-center text-zinc-500 py-10 bg-zinc-800 border border-zinc-700 rounded-xl">계정이 없습니다.</p>
        )}
        {users.map((user) => (
          <div key={user.id} className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 hover:border-zinc-600 transition-colors">
            <div className="flex flex-col gap-1 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-zinc-100">{user.nickname}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0 ${
                  user.role === 'admin'
                    ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                    : 'bg-zinc-700 border-zinc-600 text-zinc-400'
                }`}>
                  {user.role === 'admin' ? '관리자' : '멤버'}
                </span>
              </div>
              <span className="text-xs text-zinc-500 truncate">{user.email}</span>
              <span className="text-xs text-zinc-500">가입: {new Date(user.created_at).toLocaleDateString('ko-KR')}</span>
            </div>
            <button
              onClick={() => toggleRole(user)}
              className="text-xs px-3 py-1.5 rounded-lg border border-zinc-600 hover:border-zinc-400 text-zinc-400 hover:text-zinc-200 transition-colors flex-shrink-0 self-start sm:self-auto"
            >
              {user.role === 'admin' ? '멤버로 변경' : '관리자로 변경'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
