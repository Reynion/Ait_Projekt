'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'
import { extractYoutubeId, getThumbnailUrl } from '@/lib/youtube'

interface Season {
  id: number
  name: string
  description: string | null
  started_at: string
  ended_at: string | null
  is_active: boolean
}

interface Post {
  id: number
  title: string
  artist: string | null
  description: string | null
  youtube_url: string | null
  created_at: string
  users: { nickname: string; avatar_url: string | null } | null
  likeCount: number
  commentCount: number
}

export default function AdminSeasonDetail() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [season, setSeason] = useState<Season | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [togglingActive, setTogglingActive] = useState(false)

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()
      const { data: s } = await supabase.from('seasons').select('*').eq('id', id).maybeSingle()
      if (!s) { router.push('/admin/seasons'); return }
      setSeason(s)

      const { data: postsData } = await supabase
        .from('music_posts')
        .select('*, users(nickname, avatar_url)')
        .eq('season_id', id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      const { data: likesData } = await supabase.from('music_likes').select('post_id, is_like')
      const { data: commentsData } = await supabase.from('music_comments').select('post_id').is('deleted_at', null)

      const enriched: Post[] = ((postsData ?? []) as unknown as Post[]).map(p => ({
        ...p,
        likeCount: (likesData ?? []).filter(l => l.post_id === p.id && l.is_like).length,
        commentCount: (commentsData ?? []).filter(c => c.post_id === p.id).length,
      }))

      setPosts(enriched)
      setLoading(false)
    }
    fetchData()
  }, [id, router])

  async function handleToggleActive() {
    if (!season) return
    setTogglingActive(true)
    const supabase = createClient()
    if (!season.is_active) {
      await supabase.from('seasons').update({ is_active: false }).neq('id', season.id)
      await supabase.from('seasons').update({ is_active: true }).eq('id', season.id)
      setSeason(s => s ? { ...s, is_active: true } : s)
    } else {
      await supabase.from('seasons').update({ is_active: false }).eq('id', season.id)
      setSeason(s => s ? { ...s, is_active: false } : s)
    }
    setTogglingActive(false)
  }

  async function handleDeletePost(postId: number) {
    if (!confirm('이 글을 삭제하시겠습니까?')) return
    const supabase = createClient()
    await supabase.from('music_posts').update({ deleted_at: new Date().toISOString() }).eq('id', postId)
    setPosts(prev => prev.filter(p => p.id !== postId))
  }

  if (loading || !season) return <p className="text-zinc-400">불러오는 중...</p>

  return (
    <div className="flex flex-col gap-6">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/admin/seasons" className="text-zinc-400 hover:text-white transition-colors text-sm flex-shrink-0">← 목록</Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold truncate">{season.name}</h1>
              {season.is_active && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/15 border border-green-500/30 text-green-400 flex-shrink-0">활성</span>
              )}
            </div>
            {season.description && <p className="text-sm text-zinc-400 mt-0.5">{season.description}</p>}
            <p className="text-xs text-zinc-500 mt-1">{season.started_at} ~ {season.ended_at ?? '진행중'}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={handleToggleActive}
            disabled={togglingActive}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
              season.is_active
                ? 'border-green-600/50 text-green-400 hover:border-green-500'
                : 'border-zinc-600 text-zinc-400 hover:border-green-600/50 hover:text-green-400'
            }`}
          >
            {season.is_active ? '활성 해제' : '활성 지정'}
          </button>
          <Link
            href={`/admin/seasons/${season.id}/edit`}
            className="text-xs px-3 py-1.5 rounded-lg border border-zinc-600 hover:border-zinc-400 text-zinc-400 hover:text-white transition-colors"
          >
            수정
          </Link>
        </div>
      </div>

      {/* 글 목록 */}
      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-zinc-400">글 목록 ({posts.length}개)</h2>
        {posts.length === 0 && (
          <p className="text-zinc-500 text-center py-12 bg-zinc-800 rounded-xl border border-zinc-700 text-sm">
            이 시즌에 속한 글이 없습니다.
          </p>
        )}
        {posts.map((post, idx) => {
          const youtubeId = post.youtube_url ? extractYoutubeId(post.youtube_url) : null
          const thumbnail = youtubeId ? getThumbnailUrl(youtubeId) : null
          const seq = posts.length - idx

          return (
            <div key={post.id} className="bg-zinc-800 border border-zinc-700 rounded-xl p-3 flex flex-col gap-2 overflow-hidden">
              <div className="flex gap-3 items-start">
                <span className="text-xs text-zinc-500 font-mono w-5 flex-shrink-0 text-right pt-0.5">{seq}</span>
                {thumbnail ? (
                  <div className="relative w-20 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-zinc-700">
                    <Image src={thumbnail} alt={post.title} fill className="object-cover" unoptimized />
                  </div>
                ) : (
                  <div className="w-20 h-14 flex-shrink-0 rounded-lg bg-zinc-700 flex items-center justify-center text-zinc-500 text-xl">🎵</div>
                )}
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <p className="font-semibold text-sm text-white truncate">{post.title}</p>
                  {post.artist && <p className="text-xs text-zinc-400 truncate">{post.artist}</p>}
                  {post.description && <p className="text-xs text-zinc-500 line-clamp-1">{post.description}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-zinc-700">
                <span className="text-xs text-zinc-400 truncate">{post.users?.nickname ?? '알 수 없음'}</span>
                <span className="text-zinc-600">·</span>
                <span className="text-xs text-zinc-500 flex-shrink-0">{new Date(post.created_at).toLocaleDateString('ko-KR')}</span>
                <span className="text-xs text-zinc-500 flex-shrink-0">💬 {post.commentCount}</span>
                <span className="text-xs text-zinc-400 flex-shrink-0">👍 {post.likeCount}</span>
                <div className="ml-auto flex gap-2 flex-shrink-0">
                  <Link
                    href={`/admin/posts/${post.id}`}
                    className="text-xs px-2 py-1 rounded-lg border border-zinc-600 hover:border-zinc-400 text-zinc-400 hover:text-white transition-colors"
                  >
                    보기
                  </Link>
                  <button
                    onClick={() => handleDeletePost(post.id)}
                    className="text-xs px-2 py-1 rounded-lg border border-zinc-700 hover:border-red-500/50 text-zinc-500 hover:text-red-400 transition-colors"
                  >
                    삭제
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
