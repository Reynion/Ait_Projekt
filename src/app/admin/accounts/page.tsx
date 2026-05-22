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
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-700 text-zinc-400 text-left bg-zinc-900">
              <th className="px-4 py-3 font-medium">닉네임</th>
              <th className="px-4 py-3 font-medium">이메일</th>
              <th className="px-4 py-3 font-medium">가입일</th>
              <th className="px-4 py-3 font-medium">권한</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-zinc-700 last:border-0 hover:bg-zinc-700/50 transition-colors">
                <td className="px-4 py-3 font-medium text-zinc-100">{user.nickname}</td>
                <td className="px-4 py-3 text-zinc-400">{user.email}</td>
                <td className="px-4 py-3 text-zinc-400">{new Date(user.created_at).toLocaleDateString('ko-KR')}</td>
                <td className="px-4 py-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                    user.role === 'admin'
                      ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                      : 'bg-zinc-700 border-zinc-600 text-zinc-400'
                  }`}>
                    {user.role === 'admin' ? '관리자' : '멤버'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleRole(user)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-zinc-600 hover:border-zinc-400 text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    {user.role === 'admin' ? '멤버로 변경' : '관리자로 변경'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && <p className="text-center text-zinc-500 py-10">계정이 없습니다.</p>}
      </div>
    </div>
  )
}
