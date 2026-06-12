'use client'

import { useEffect, useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import Navbar from '@/components/Navbar'
import { getWritePermission } from '@/lib/permissions'

interface GuestbookEntry {
  id: number
  content: string
  created_at: string
  user_id: string | null
  guest_nickname: string | null
  users: { nickname: string; avatar_url: string | null } | null
  comment_count: number
}

const PAGE_SIZE = 20

function GuestbookContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const [entries, setEntries] = useState<GuestbookEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [canWrite, setCanWrite] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const [page, setPage] = useState(() => {
    const p = parseInt(searchParams.get('page') ?? '1')
    return isNaN(p) || p < 1 ? 1 : p
  })

  function updateUrl(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '' || value === '1') params.delete(key)
      else params.set(key, value)
    })
    const qs = params.toString()
    router.push(`${pathname}${qs ? '?' + qs : ''}`, { scroll: false })
  }

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      setCurrentUserId(data.user.id)
      const write = await getWritePermission('guestbook')
      setCanWrite(write)
    })
  }, [])

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      const supabase = createClient()
      const from = (page - 1) * PAGE_SIZE
      const to = from + PAGE_SIZE - 1

      const [{ data, count }, { data: commentCounts }] = await Promise.all([
        supabase.from('guestbook')
          .select('id, content, created_at, user_id, guest_nickname, users(nickname, avatar_url)', { count: 'exact' })
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .range(from, to),
        supabase.from('guestbook_comments')
          .select('guestbook_id')
          .is('deleted_at', null),
      ])

      const countMap: Record<number, number> = {}
      for (const c of (commentCounts ?? [])) {
        countMap[c.guestbook_id] = (countMap[c.guestbook_id] ?? 0) + 1
      }

      const list = ((data ?? []) as unknown as Omit<GuestbookEntry, 'comment_count'>[]).map(e => ({
        ...e,
        comment_count: countMap[e.id] ?? 0,
      }))

      setEntries(list)
      setTotal(count ?? 0)
      setLoading(false)
    }
    fetchData()
  }, [page])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  function handlePage(p: number) {
    setPage(p)
    updateUrl({ page: String(p) })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <main className="flex min-h-screen flex-col bg-zinc-950">
      <Navbar />
      <div className="max-w-2xl w-full mx-auto px-4 py-8 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">방명록</h1>
          {canWrite && (
            <Link href="/guestbook/new" className="text-sm bg-zinc-700 hover:bg-zinc-600 border border-zinc-600 text-zinc-200 px-4 py-2 rounded-lg transition-colors">
              글 남기기
            </Link>
          )}
        </div>

        {loading ? (
          <p className="text-zinc-400 text-center py-10">불러오는 중...</p>
        ) : entries.length === 0 ? (
          <div className="text-center text-zinc-500 py-16 bg-zinc-800 border border-zinc-700 rounded-xl">
            <p className="text-lg mb-1">아직 방명록이 없어요.</p>
            {canWrite && <p className="text-sm">첫 글을 남겨보세요!</p>}
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {entries.map((entry, idx) => {
              const num = total - (page - 1) * PAGE_SIZE - idx
              return (
                <li key={entry.id}>
                  <Link href={`/guestbook/${entry.id}`} className="block bg-zinc-800 border border-zinc-700 rounded-xl hover:border-zinc-500 transition-colors overflow-hidden">
                    <div className="flex flex-col gap-2 p-4">
                      <div className="flex gap-3 items-start">
                        <span className="text-xs text-zinc-500 font-mono w-5 flex-shrink-0 text-right pt-0.5">{num}</span>
                        <p className="flex-1 min-w-0 text-sm text-zinc-200 line-clamp-3 leading-relaxed">{entry.content}</p>
                      </div>
                      <div className="flex items-center gap-2 pt-2 border-t border-zinc-700/60 pl-8">
                        <div className="relative w-6 h-6 rounded-full overflow-hidden bg-zinc-700 border border-zinc-600 flex-shrink-0">
                          {entry.users?.avatar_url ? (
                            <Image src={entry.users.avatar_url} alt={entry.users.nickname} fill className="object-cover" unoptimized />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-zinc-400">👤</div>
                          )}
                        </div>
                        <span className="text-xs text-zinc-400">{entry.guest_nickname ?? entry.users?.nickname ?? '알 수 없음'}</span>
                        {entry.guest_nickname && <span className="text-xs text-zinc-600 bg-zinc-700/50 px-1.5 py-0.5 rounded">방문객</span>}
                        <span className="text-zinc-600 text-xs">·</span>
                        <span className="text-xs text-zinc-500">{new Date(entry.created_at).toLocaleDateString('ko-KR')}</span>
                        {entry.comment_count > 0 && (
                          <>
                            <span className="text-zinc-600 text-xs">·</span>
                            <span className="text-xs text-zinc-500">💬 {entry.comment_count}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center gap-1 flex-wrap">
            <button onClick={() => handlePage(page - 1)} disabled={page === 1} className="px-3 py-1.5 text-sm rounded-lg border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 disabled:opacity-30 transition-colors">이전</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => handlePage(p)} className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${p === page ? 'bg-zinc-200 text-zinc-900 border-zinc-200' : 'border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'}`}>{p}</button>
            ))}
            <button onClick={() => handlePage(page + 1)} disabled={page === totalPages} className="px-3 py-1.5 text-sm rounded-lg border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 disabled:opacity-30 transition-colors">다음</button>
          </div>
        )}
      </div>
    </main>
  )
}

export default function GuestbookPage() {
  return (
    <Suspense fallback={null}>
      <GuestbookContent />
    </Suspense>
  )
}
