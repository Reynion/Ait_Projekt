'use client'

import { useEffect, useState, useMemo, Suspense } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import Image from 'next/image'

interface GuestbookEntry {
  id: number
  content: string
  created_at: string
  user_id: string | null
  guest_nickname: string | null
  users: { nickname: string; avatar_url: string | null } | null
}

interface GuestbookComment {
  id: number
  guestbook_id: number
  content: string
  created_at: string
  users: { nickname: string } | null
}

function AdminGuestbookContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const [entries, setEntries] = useState<GuestbookEntry[]>([])
  const [comments, setComments] = useState<GuestbookComment[]>([])
  const [openId, setOpenId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  const [searchText, setSearchText] = useState(() => searchParams.get('q') ?? '')
  const [appliedSearch, setAppliedSearch] = useState(() => searchParams.get('q') ?? '')
  const [sort, setSort] = useState<'newest' | 'oldest'>(() => searchParams.get('sort') === 'oldest' ? 'oldest' : 'newest')

  function updateUrl(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') params.delete(key)
      else params.set(key, value)
    })
    if (params.get('sort') === 'newest') params.delete('sort')
    const qs = params.toString()
    router.push(`${pathname}${qs ? '?' + qs : ''}`, { scroll: false })
  }

  async function fetchData() {
    const supabase = createClient()
    const [{ data: entriesData }, { data: commentsData }] = await Promise.all([
      supabase.from('guestbook').select('id, content, created_at, user_id, guest_nickname, users(nickname, avatar_url)').is('deleted_at', null).order('created_at', { ascending: false }),
      supabase.from('guestbook_comments').select('id, guestbook_id, content, created_at, users(nickname)').is('deleted_at', null).order('created_at', { ascending: true }),
    ])
    setEntries((entriesData ?? []) as unknown as GuestbookEntry[])
    setComments((commentsData ?? []) as unknown as GuestbookComment[])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  function handleSortChange(val: 'newest' | 'oldest') {
    setSort(val)
    updateUrl({ sort: val })
  }

  function applySearch() {
    setAppliedSearch(searchText)
    updateUrl({ q: searchText || null })
  }

  function clearSearch() {
    setSearchText('')
    setAppliedSearch('')
    updateUrl({ q: null })
  }

  async function handleDeleteEntry(id: number) {
    if (!confirm('이 글을 삭제하시겠습니까?')) return
    const supabase = createClient()
    const { error } = await supabase.from('guestbook').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    if (error) { alert('삭제에 실패했습니다.'); return }
    setEntries(prev => prev.filter(e => e.id !== id))
    if (openId === id) setOpenId(null)
  }

  async function handleDeleteComment(id: number) {
    const supabase = createClient()
    const { error } = await supabase.from('guestbook_comments').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    if (error) { alert('삭제에 실패했습니다.'); return }
    setComments(prev => prev.filter(c => c.id !== id))
  }

  const filtered = useMemo(() => {
    let list = [...entries]
    if (appliedSearch) {
      const q = appliedSearch.replace(/\s/g, '').toLowerCase()
      list = list.filter(e =>
        e.content.replace(/\s/g, '').toLowerCase().includes(q) ||
        (e.users?.nickname ?? '').replace(/\s/g, '').toLowerCase().includes(q)
      )
    }
    if (sort === 'oldest') list = list.reverse()
    return list
  }, [entries, appliedSearch, sort])

  if (loading) return <p className="text-zinc-400">불러오는 중...</p>

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-white">방명록 관리</h1>

      <div className="flex gap-2 flex-wrap">
        <div className="flex flex-1 min-w-0 gap-2">
          <input
            type="text"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') applySearch() }}
            placeholder="내용 / 닉네임 검색"
            className="flex-1 min-w-0 bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-400"
          />
          <button onClick={applySearch} className="px-4 py-2 text-sm bg-zinc-700 hover:bg-zinc-600 rounded-lg text-zinc-200 transition-colors flex-shrink-0">검색</button>
          {appliedSearch && <button onClick={clearSearch} className="px-3 py-2 text-sm text-zinc-400 hover:text-white transition-colors flex-shrink-0">✕</button>}
        </div>
        <select value={sort} onChange={e => handleSortChange(e.target.value as 'newest' | 'oldest')} className="bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-zinc-400 flex-shrink-0">
          <option value="newest">최신순</option>
          <option value="oldest">오래된순</option>
        </select>
      </div>

      <div className="flex flex-col gap-3">
        {filtered.length === 0 && <div className="text-center text-zinc-500 py-10 bg-zinc-800 border border-zinc-700 rounded-xl">방명록이 없습니다.</div>}
        {filtered.map(entry => (
          <div key={entry.id} className="bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4 p-4">
              <div className="flex gap-3 flex-1 min-w-0">
                <div className="relative w-8 h-8 rounded-full overflow-hidden bg-zinc-700 border border-zinc-600 flex-shrink-0">
                  {entry.users?.avatar_url ? (
                    <Image src={entry.users.avatar_url} alt={entry.users.nickname} fill className="object-cover" unoptimized />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-zinc-400">👤</div>
                  )}
                </div>
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <span className="text-zinc-300 font-medium">{entry.guest_nickname ?? entry.users?.nickname ?? '알 수 없음'}</span>
                  {entry.guest_nickname && <span className="text-xs text-zinc-600 bg-zinc-700/50 px-1 py-0.5 rounded">방문객</span>}
                    <span>·</span>
                    <span>{new Date(entry.created_at).toLocaleDateString('ko-KR')}</span>
                    <span>·</span>
                    <span>💬 {comments.filter(c => c.guestbook_id === entry.id).length}</span>
                  </div>
                  <p className="text-sm text-zinc-200 line-clamp-2">{entry.content}</p>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => setOpenId(openId === entry.id ? null : entry.id)} className="text-xs px-3 py-1.5 rounded-lg border border-zinc-600 hover:border-zinc-400 text-zinc-400 hover:text-zinc-200 transition-colors">{openId === entry.id ? '댓글 닫기' : '💬 댓글 보기'}</button>
                <button onClick={() => handleDeleteEntry(entry.id)} className="text-xs px-3 py-1.5 rounded-lg border border-zinc-700 hover:border-red-500/50 text-zinc-500 hover:text-red-400 transition-colors">삭제</button>
              </div>
            </div>
            {openId === entry.id && (
              <div className="border-t border-zinc-700 bg-zinc-900 px-4 py-3 flex flex-col gap-2">
                {comments.filter(c => c.guestbook_id === entry.id).length === 0 && <p className="text-xs text-zinc-500 py-2">댓글이 없습니다.</p>}
                {comments.filter(c => c.guestbook_id === entry.id).map(comment => (
                  <div key={comment.id} className="flex items-start justify-between gap-3 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2">
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-xs font-medium text-zinc-300">{comment.users?.nickname ?? '알 수 없음'}</span>
                      <p className="text-xs text-zinc-400 break-words">{comment.content}</p>
                    </div>
                    <button onClick={() => handleDeleteComment(comment.id)} className="text-xs text-zinc-500 hover:text-red-400 transition-colors flex-shrink-0">삭제</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AdminGuestbookPage() {
  return (
    <Suspense fallback={<p className="text-zinc-400">불러오는 중...</p>}>
      <AdminGuestbookContent />
    </Suspense>
  )
}
