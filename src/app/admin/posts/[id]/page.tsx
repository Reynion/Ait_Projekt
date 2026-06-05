'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { extractYoutubeId } from '@/lib/youtube'
import Link from 'next/link'
import Image from 'next/image'

interface Post {
  id: number
  title: string
  artist: string | null
  description: string | null
  youtube_url: string | null
  created_at: string
  user_id: string
  users: { nickname: string; avatar_url: string | null } | null
  seasons: { name: string } | null
}

interface Comment {
  id: number
  content: string
  created_at: string
  parent_id: number | null
  users: { nickname: string } | null
}

export default function AdminPostDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [post, setPost] = useState<Post | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      const { data: postData } = await supabase
        .from('posts')
        .select('*, users(nickname, avatar_url), seasons(name)')
        .eq('id', id)
        .single()
      if (!postData) { router.push('/admin/posts'); return }
      setPost(postData as unknown as Post)

      const { data: commentData } = await supabase
        .from('comments')
        .select('id, content, created_at, parent_id, users(nickname)')
        .eq('post_id', id)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
      setComments((commentData ?? []) as unknown as Comment[])
      setLoading(false)
    }
    load()
  }, [id, router])

  async function handleDeleteComment(commentId: number) {
    if (!confirm('댓글을 삭제하시겠습니까?')) return
    const supabase = createClient()
    await supabase.from('comments').update({ deleted_at: new Date().toISOString() }).eq('id', commentId)
    setComments(prev => prev.filter(c => c.id !== commentId && c.parent_id !== commentId))
  }

  async function handleDeletePost() {
    if (!post || !confirm('게시글을 삭제하시겠습니까?')) return
    const supabase = createClient()
    await supabase.from('posts').update({ deleted_at: new Date().toISOString() }).eq('id', post.id)
    router.push('/admin/posts')
  }

  if (loading) return <p className="text-zinc-400">불러오는 중...</p>
  if (!post) return null

  const youtubeId = post.youtube_url ? extractYoutubeId(post.youtube_url) : null
  const topLevel = comments.filter(c => c.parent_id === null)
  const replies = (parentId: number) => comments.filter(c => c.parent_id === parentId)

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/posts" className="text-zinc-500 hover:text-zinc-200 transition-colors text-sm">← 음악제안 관리</Link>
      </div>

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

      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-5 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-white">{post.title}</h1>
            {post.artist && <p className="text-sm text-zinc-400 mt-0.5">{post.artist}</p>}
            {post.seasons && (
              <span className="text-xs text-green-400 bg-green-500/10 border border-green-500/30 px-2 py-0.5 rounded-full inline-block mt-1">{post.seasons.name}</span>
            )}
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Link
              href={`/posts/${post.id}/edit`}
              className="text-sm text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 px-3 py-1 rounded-lg transition-colors"
            >
              수정
            </Link>
            <button
              onClick={handleDeletePost}
              className="text-sm text-zinc-500 hover:text-red-400 border border-zinc-700 hover:border-red-500 px-3 py-1 rounded-lg transition-colors"
            >
              삭제
            </button>
          </div>
        </div>

        {post.description && (
          <p className="text-zinc-200 text-sm leading-relaxed whitespace-pre-wrap border-t border-zinc-700 pt-3">{post.description}</p>
        )}

        <div className="flex items-center gap-2 border-t border-zinc-700 pt-3">
          <div className="relative w-8 h-8 rounded-full overflow-hidden bg-zinc-700 border border-zinc-600 flex-shrink-0">
            {post.users?.avatar_url ? (
              <Image src={post.users.avatar_url} alt={post.users.nickname} fill className="object-cover" unoptimized />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-400 text-sm">👤</div>
            )}
          </div>
          <span className="text-zinc-200 font-medium">{post.users?.nickname ?? '알 수 없음'}</span>
          <span className="text-zinc-500 text-sm">{new Date(post.created_at).toLocaleDateString('ko-KR')}</span>
        </div>
      </div>

      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-5 flex flex-col gap-4">
        <h2 className="font-semibold text-white">댓글 <span className="text-zinc-400 font-normal">{comments.length}개</span></h2>
        {topLevel.length === 0 && <p className="text-sm text-zinc-500">댓글이 없습니다.</p>}
        <ul className="flex flex-col gap-3">
          {topLevel.map(comment => (
            <li key={comment.id} className="flex flex-col gap-2">
              <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 flex justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-zinc-200">{comment.users?.nickname ?? '알 수 없음'}</span>
                  <p className="text-sm text-zinc-300">{comment.content}</p>
                </div>
                <button onClick={() => handleDeleteComment(comment.id)} className="text-xs text-zinc-500 hover:text-red-400 transition-colors flex-shrink-0">삭제</button>
              </div>
              {replies(comment.id).map(reply => (
                <div key={reply.id} className="ml-8 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 flex justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-zinc-200">{reply.users?.nickname ?? '알 수 없음'}</span>
                    <p className="text-sm text-zinc-300">{reply.content}</p>
                  </div>
                  <button onClick={() => handleDeleteComment(reply.id)} className="text-xs text-zinc-500 hover:text-red-400 transition-colors flex-shrink-0">삭제</button>
                </div>
              ))}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
