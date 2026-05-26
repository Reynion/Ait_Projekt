'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import BoardCommentSection from '@/components/BoardCommentSection'
import Link from 'next/link'
import Image from 'next/image'

interface BoardPost {
  id: number
  title: string
  content: string
  image_urls: string[] | null
  created_at: string
  user_id: string
  is_notice: boolean
  users: { nickname: string; avatar_url: string | null } | null
}

export default function BoardPostDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [post, setPost] = useState<BoardPost | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setCurrentUserId(user.id)
      const { data: row } = await supabase.from('users').select('role').eq('id', user.id).single()
      if (row?.role === 'admin') setIsAdmin(true)

      const { data } = await supabase
        .from('board_posts')
        .select('*, users(nickname, avatar_url)')
        .eq('id', id)
        .single()

      if (!data) { router.push('/board'); return }
      setPost(data as unknown as BoardPost)
      setLoading(false)
    }
    load()
  }, [id, router])

  async function handleDelete() {
    if (!post || !confirm('정말 삭제하시겠습니까?')) return
    const supabase = createClient()
    await supabase.from('board_posts').delete().eq('id', post.id)
    router.push('/board')
  }

  async function toggleNotice() {
    if (!post || !isAdmin) return
    const supabase = createClient()
    const { error } = await supabase.from('board_posts').update({ is_notice: !post.is_notice }).eq('id', post.id)
    if (!error) setPost(p => p ? { ...p, is_notice: !p.is_notice } : p)
  }

  if (loading) return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950">
      <p className="text-zinc-400">불러오는 중...</p>
    </main>
  )

  if (!post) return null

  return (
    <main className="flex min-h-screen flex-col bg-zinc-950">
      <Navbar />

      <div className="max-w-2xl w-full mx-auto px-4 py-8 flex flex-col gap-6">
        <div>
          <Link href="/board" className="text-sm text-zinc-400 hover:text-white transition-colors">← 목록</Link>
        </div>

        {/* 게시글 */}
        <div className={`border rounded-xl p-5 flex flex-col gap-4 ${post.is_notice ? 'bg-amber-950/20 border-amber-700/40' : 'bg-zinc-800 border-zinc-700'}`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {post.is_notice && (
                <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-medium flex-shrink-0">📌 공지</span>
              )}
              <h1 className="text-2xl font-bold text-white min-w-0 break-words">{post.title}</h1>
            </div>
            <div className="flex gap-2 flex-shrink-0 mt-1">
              {isAdmin && (
                <button
                  onClick={toggleNotice}
                  className={`text-sm transition-colors border px-3 py-1 rounded-lg ${post.is_notice ? 'text-amber-400 border-amber-600 hover:border-amber-400' : 'text-zinc-500 border-zinc-700 hover:text-amber-400 hover:border-amber-600'}`}
                >
                  {post.is_notice ? '공지 해제' : '공지 설정'}
                </button>
              )}
              {(post.user_id === currentUserId || isAdmin) && (
                <>
                  <Link
                    href={`/board/${post.id}/edit`}
                    className="text-sm text-zinc-500 hover:text-zinc-200 transition-colors border border-zinc-700 hover:border-zinc-500 px-3 py-1 rounded-lg"
                  >
                    수정
                  </Link>
                  <button
                    onClick={handleDelete}
                    className="text-sm text-zinc-500 hover:text-red-400 transition-colors border border-zinc-700 hover:border-red-500 px-3 py-1 rounded-lg"
                  >
                    삭제
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 pb-3 border-b border-zinc-700">
            <div className="relative w-8 h-8 rounded-full overflow-hidden bg-zinc-700 border border-zinc-600 flex-shrink-0">
              {post.users?.avatar_url ? (
                <Image src={post.users.avatar_url} alt={post.users.nickname} fill className="object-cover" unoptimized />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-400 text-sm">👤</div>
              )}
            </div>
            <span className="text-zinc-200 font-medium">{post.users?.nickname ?? '알 수 없음'}</span>
            <span className="text-zinc-500 text-sm ml-1">{new Date(post.created_at).toLocaleDateString('ko-KR')}</span>
          </div>

          <p className="text-zinc-200 text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>

          {post.image_urls && post.image_urls.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-zinc-700">
              {post.image_urls.map((url, idx) => (
                <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="relative aspect-square rounded-lg overflow-hidden border border-zinc-600 hover:border-zinc-400 transition-colors">
                  <Image src={url} alt="" fill className="object-cover" unoptimized />
                </a>
              ))}
            </div>
          )}
        </div>

        {/* 댓글 */}
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-5">
          {currentUserId && (
            <BoardCommentSection boardPostId={post.id} currentUserId={currentUserId} />
          )}
        </div>
      </div>
    </main>
  )
}
