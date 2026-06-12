'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'
import Navbar from '@/components/Navbar'
import GuestbookCommentSection from '@/components/GuestbookCommentSection'

interface GuestbookEntry {
  id: number
  content: string
  created_at: string
  user_id: string
  users: { nickname: string; avatar_url: string | null } | null
}

export default function GuestbookDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [entry, setEntry] = useState<GuestbookEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setCurrentUserId(user.id)

      if (!user.is_anonymous) {
        const { data: userRow } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle()
        if (userRow?.role === 'admin') setIsAdmin(true)
      }

      const { data } = await supabase
        .from('guestbook')
        .select('id, content, created_at, user_id, users(nickname, avatar_url)')
        .eq('id', id)
        .is('deleted_at', null)
        .maybeSingle()

      if (!data) { router.push('/guestbook'); return }
      setEntry(data as unknown as GuestbookEntry)
      setLoading(false)
    }
    load()
  }, [id, router])

  async function handleDelete() {
    if (!entry || !confirm('이 글을 삭제하시겠습니까?')) return
    const supabase = createClient()
    await supabase.from('guestbook').update({ deleted_at: new Date().toISOString() }).eq('id', entry.id)
    router.push('/guestbook')
  }

  if (loading) return (
    <main className="flex min-h-screen flex-col bg-zinc-950">
      <Navbar />
      <div className="max-w-2xl w-full mx-auto px-4 py-8">
        <p className="text-zinc-400">불러오는 중...</p>
      </div>
    </main>
  )

  if (!entry) return null

  const canDelete = isAdmin || entry.user_id === currentUserId

  return (
    <main className="flex min-h-screen flex-col bg-zinc-950">
      <Navbar />
      <div className="max-w-2xl w-full mx-auto px-4 py-8 flex flex-col gap-6">
        <Link href="/guestbook" className="text-sm text-zinc-500 hover:text-zinc-200 transition-colors self-start">← 목록</Link>

        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-5 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative w-10 h-10 rounded-full overflow-hidden bg-zinc-700 border border-zinc-600 flex-shrink-0">
                {entry.users?.avatar_url ? (
                  <Image src={entry.users.avatar_url} alt={entry.users.nickname} fill className="object-cover" unoptimized />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-400">👤</div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-zinc-100 truncate">{entry.users?.nickname ?? '알 수 없음'}</p>
                <p className="text-xs text-zinc-500">{new Date(entry.created_at).toLocaleDateString('ko-KR')}</p>
              </div>
            </div>
            {canDelete && (
              <button onClick={handleDelete} className="text-sm text-zinc-500 hover:text-red-400 border border-zinc-700 hover:border-red-500 px-3 py-1 rounded-lg transition-colors flex-shrink-0">
                삭제
              </button>
            )}
          </div>

          <p className="text-zinc-200 text-sm leading-relaxed whitespace-pre-wrap break-words border-t border-zinc-700 pt-4">{entry.content}</p>
        </div>

        {currentUserId && (
          <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-5">
            <GuestbookCommentSection
              guestbookId={entry.id}
              currentUserId={currentUserId}
              postAuthorId={entry.user_id}
              link={`/guestbook/${entry.id}`}
            />
          </div>
        )}
      </div>
    </main>
  )
}
