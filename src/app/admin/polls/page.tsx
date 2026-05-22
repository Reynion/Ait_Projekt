'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

interface Poll {
  id: number
  title: string
  description: string | null
  max_votes_per_user: number
  is_active: boolean
  ends_at: string | null
  created_at: string
}

export default function AdminPolls() {
  const [polls, setPolls] = useState<Poll[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchPolls() {
    const supabase = createClient()
    const { data } = await supabase.from('polls').select('*').order('created_at', { ascending: false })
    if (data) setPolls(data)
    setLoading(false)
  }

  useEffect(() => { fetchPolls() }, [])

  async function toggleActive(poll: Poll) {
    const supabase = createClient()
    await supabase.from('polls').update({ is_active: !poll.is_active }).eq('id', poll.id)
    setPolls(prev => prev.map(p => p.id === poll.id ? { ...p, is_active: !p.is_active } : p))
  }

  async function handleDelete(id: number) {
    if (!confirm('투표를 삭제하면 모든 투표 기록이 사라집니다. 삭제하시겠습니까?')) return
    const supabase = createClient()
    await supabase.from('polls').delete().eq('id', id)
    setPolls(prev => prev.filter(p => p.id !== id))
  }

  if (loading) return <p className="text-zinc-400">불러오는 중...</p>

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">투표 관리</h1>
        <Link href="/admin/polls/new" className="bg-zinc-100 text-zinc-900 text-sm px-4 py-2 rounded-lg hover:bg-white transition-colors font-semibold">
          + 투표 생성
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        {polls.length === 0 && (
          <div className="text-center text-zinc-500 py-10 bg-zinc-800 border border-zinc-700 rounded-xl">
            생성된 투표가 없습니다.
          </div>
        )}
        {polls.map((poll) => (
          <div key={poll.id} className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 flex items-center justify-between gap-4 hover:border-zinc-600 transition-colors">
            <div className="flex flex-col gap-1 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-zinc-100 truncate">{poll.title}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium border flex-shrink-0 ${
                  poll.is_active
                    ? 'bg-green-500/10 border-green-500/40 text-green-400'
                    : 'bg-zinc-700 border-zinc-600 text-zinc-500'
                }`}>
                  {poll.is_active ? '진행중' : '종료'}
                </span>
              </div>
              {poll.description && <p className="text-xs text-zinc-500 truncate">{poll.description}</p>}
              <div className="flex gap-3 text-xs text-zinc-500">
                <span>1인 {poll.max_votes_per_user}표</span>
                {poll.ends_at && <span>마감: {new Date(poll.ends_at).toLocaleDateString('ko-KR')}</span>}
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => toggleActive(poll)}
                className="text-xs px-3 py-1.5 rounded-lg border border-zinc-600 hover:border-zinc-400 text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                {poll.is_active ? '종료' : '재개'}
              </button>
              <Link
                href={`/admin/polls/${poll.id}/edit`}
                className="text-xs px-3 py-1.5 rounded-lg border border-zinc-600 hover:border-zinc-400 text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                수정
              </Link>
              <button
                onClick={() => handleDelete(poll.id)}
                className="text-xs px-3 py-1.5 rounded-lg border border-zinc-700 hover:border-red-500/50 text-zinc-500 hover:text-red-400 transition-colors"
              >
                삭제
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
