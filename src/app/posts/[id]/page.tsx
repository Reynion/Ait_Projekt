'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { extractYoutubeId } from '@/lib/youtube'
import CommentSection from '@/components/CommentSection'
import LikeButton from '@/components/LikeButton'
import Link from 'next/link'
import Image from 'next/image'
import Navbar from '@/components/Navbar'

interface Post {
  id: number
  title: string
  artist: string | null
  description: string | null
  youtube_url: string | null
  created_at: string
  user_id: string
  users: { nickname: string; avatar_url: string | null } | null
}

export default function PostDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [post, setPost] = useState<Post | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [prevPost, setPrevPost] = useState<{ id: number; title: string } | null>(null)
  const [nextPost, setNextPost] = useState<{ id: number; title: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setCurrentUserId(user.id)

      const { data } = await supabase
        .from('posts')
        .select('*, users(nickname, avatar_url)')
        .eq('id', id)
        .single()

      setPost(data)

      const numId = Number(id)
      const [{ data: prev }, { data: next }] = await Promise.all([
        supabase.from('posts').select('id, title').lt('id', numId).order('id', { ascending: false }).limit(1).single(),
        supabase.from('posts').select('id, title').gt('id', numId).order('id', { ascending: true }).limit(1).single(),
      ])
      if (prev) setPrevPost(prev)
      if (next) setNextPost(next)

      setLoading(false)
    }
    load()
  }, [id, router])

  async function handleDelete() {
    if (!post || !confirm('정말 삭제하시겠습니까?')) return
    const supabase = createClient()
    await supabase.from('posts').delete().eq('id', post.id)
    router.push('/posts')
  }

  if (loading) return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950">
      <p className="text-zinc-400">불러오는 중...</p>
    </main>
  )

  if (!post) return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950">
      <p className="text-zinc-400">게시글을 찾을 수 없습니다.</p>
    </main>
  )

  const youtubeId = post.youtube_url ? extractYoutubeId(post.youtube_url) : null

  return (
    <main className="flex min-h-screen flex-col bg-zinc-950">
      <Navbar />

      <div className="max-w-2xl w-full mx-auto px-4 py-8 flex flex-col gap-6">
        <div>
          <Link href="/posts" className="text-sm text-zinc-400 hover:text-white transition-colors">← 목록</Link>
        </div>

        {/* 유튜브 플레이어 */}
        {youtubeId && (
          <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-zinc-900 border border-zinc-700">
            <iframe
              src={`https://www.youtube.com/embed/${youtubeId}`}
              title={post.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            />
          </div>
        )}

        {/* 곡 정보 */}
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-5 flex flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex flex-col gap-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-white break-words">{post.title}</h1>
              {post.artist && (
                <p className="text-sm text-zinc-400">{post.artist}</p>
              )}
            </div>
            {post.user_id === currentUserId && (
              <div className="flex gap-2 flex-shrink-0">
                <Link
                  href={`/posts/${post.id}/edit`}
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
              </div>
            )}
          </div>

          {post.description && (
            <p className="text-zinc-200 text-sm leading-relaxed whitespace-pre-wrap border-t border-zinc-700 pt-3">{post.description}</p>
          )}

          <div className="flex items-center gap-2 border-t border-zinc-700 pt-3">
            <div className="relative w-9 h-9 rounded-full overflow-hidden bg-zinc-700 border border-zinc-600 flex-shrink-0">
              {post.users?.avatar_url ? (
                <Image src={post.users.avatar_url} alt={post.users.nickname} fill className="object-cover" unoptimized />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-400 text-lg">👤</div>
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-zinc-200 font-medium">{post.users?.nickname ?? '알 수 없음'}</span>
              <span className="text-zinc-500 text-sm">{new Date(post.created_at).toLocaleDateString('ko-KR')}</span>
            </div>
          </div>

          {currentUserId && (
            <LikeButton postId={post.id} currentUserId={currentUserId} />
          )}
        </div>

        {/* 댓글 */}
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-5">
          {currentUserId && (
            <CommentSection postId={post.id} currentUserId={currentUserId} />
          )}
        </div>

        {/* 이전/다음 */}
        <div className="grid grid-cols-2 gap-3">
          {prevPost ? (
            <Link href={`/posts/${prevPost.id}`} className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 hover:border-zinc-500 transition-colors flex flex-col gap-1">
              <span className="text-xs text-zinc-500">← 이전 글</span>
              <span className="text-sm text-zinc-200 truncate">{prevPost.title}</span>
            </Link>
          ) : <div />}
          {nextPost ? (
            <Link href={`/posts/${nextPost.id}`} className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 hover:border-zinc-500 transition-colors flex flex-col gap-1 text-right">
              <span className="text-xs text-zinc-500">다음 글 →</span>
              <span className="text-sm text-zinc-200 truncate">{nextPost.title}</span>
            </Link>
          ) : <div />}
        </div>
      </div>
    </main>
  )
}
