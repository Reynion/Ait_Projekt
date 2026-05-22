'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'

interface Poll {
  id: number
  title: string
  description: string | null
  max_votes_per_user: number
  is_active: boolean
  ends_at: string | null
  created_at: string
}

const PAGE_SIZE = 20

export default function PollsPage() {
  const router = useRouter()
  const [polls, setPolls] = useState<Poll[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/login'); return }
    })
    supabase.from('polls').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      if (data) setPolls(data)
      setLoading(false)
    })
  }, [router])

  if (loading) return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950">
      <p className="text-zinc-400">불러오는 중...</p>
    </main>
  )

  const totalPages = Math.ceil(polls.length / PAGE_SIZE)
  const paginated = polls.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  return (
    <main className="flex min-h-screen flex-col bg-zinc-950">
      <Navbar />

      <section className="max-w-2xl w-full mx-auto px-4 py-8 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">연습곡 투표</h1>
          <span className="text-sm text-zinc-500">총 {polls.length}개</span>
        </div>

        {polls.length === 0 && (
          <div className="text-center text-zinc-500 py-20 bg-zinc-800 border border-zinc-700 rounded-xl">
            진행 중인 투표가 없습니다.
          </div>
        )}

        {paginated.map((poll, idx) => {
          const seq = polls.length - ((currentPage - 1) * PAGE_SIZE + idx)
          return (
            <Link
              key={poll.id}
              href={`/polls/${poll.id}`}
              className="bg-zinc-800 border border-zinc-700 rounded-xl p-5 hover:border-zinc-500 transition-all flex gap-3 items-start"
            >
              <span className="text-sm text-zinc-500 font-mono w-7 flex-shrink-0 pt-0.5 text-right">{seq}</span>
              <div className="flex flex-col gap-2 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">{poll.title}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium border flex-shrink-0 ${
                    poll.is_active
                      ? 'bg-green-500/10 border-green-500/40 text-green-400'
                      : 'bg-zinc-700 border-zinc-600 text-zinc-500'
                  }`}>
                    {poll.is_active ? '진행중' : '종료'}
                  </span>
                </div>
                {poll.description && <p className="text-sm text-zinc-300">{poll.description}</p>}
                <div className="flex gap-3 text-xs text-zinc-500 pt-1 border-t border-zinc-700 mt-1">
                  <span>1인 최대 {poll.max_votes_per_user}표</span>
                  {poll.ends_at && <span>마감: {new Date(poll.ends_at).toLocaleDateString('ko-KR')}</span>}
                </div>
              </div>
            </Link>
          )
        })}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1 pt-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm"
            >
              이전
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                  page === currentPage
                    ? 'bg-zinc-700 border-zinc-500 text-white'
                    : 'border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm"
            >
              다음
            </button>
          </div>
        )}
      </section>
    </main>
  )
}
