'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

interface Comment {
  id: number
  content: string
  created_at: string
  users: { nickname: string } | null
}

interface PostRow {
  id: number
  title: string
  description: string | null
  created_at: string
  users: { nickname: string } | null
}

export default function AdminPosts() {
  const [posts, setPosts] = useState<PostRow[]>([])
  const [comments, setComments] = useState<Record<number, Comment[]>>({})
  const [expanded, setExpanded] = useState<number | null>(null)
  const [loadingComments, setLoadingComments] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  async function fetchPosts() {
    const supabase = createClient()
    const { data } = await supabase
      .from('posts')
      .select('id, title, description, created_at, users(nickname)')
      .order('created_at', { ascending: false })
    if (data) setPosts(data as unknown as PostRow[])
    setLoading(false)
  }

  useEffect(() => { fetchPosts() }, [])

  async function toggleComments(postId: number) {
    if (expanded === postId) { setExpanded(null); return }

    setExpanded(postId)
    if (comments[postId]) return

    setLoadingComments(postId)
    const supabase = createClient()
    const { data } = await supabase
      .from('comments')
      .select('id, content, created_at, users(nickname)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
    setComments(prev => ({ ...prev, [postId]: (data ?? []) as unknown as Comment[] }))
    setLoadingComments(null)
  }

  async function handleDeleteComment(postId: number, commentId: number) {
    if (!confirm('댓글을 삭제하시겠습니까?')) return
    const supabase = createClient()
    await supabase.from('comments').delete().eq('id', commentId)
    setComments(prev => ({
      ...prev,
      [postId]: prev[postId].filter(c => c.id !== commentId),
    }))
  }

  async function handleDeletePost(id: number) {
    if (!confirm('정말 삭제하시겠습니까?')) return
    const supabase = createClient()
    await supabase.from('posts').delete().eq('id', id)
    setPosts(prev => prev.filter(p => p.id !== id))
    if (expanded === id) setExpanded(null)
  }

  if (loading) return <p className="text-zinc-400">불러오는 중...</p>

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">음악제안 관리</h1>
      <div className="flex flex-col gap-2">
        {posts.length === 0 && <p className="text-zinc-500">게시글이 없습니다.</p>}
        {posts.map((post) => (
          <div key={post.id} className="bg-zinc-800 rounded-xl overflow-hidden">
            {/* 게시글 행 */}
            <div className="flex items-center gap-4 px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{post.title}</p>
                {post.description && (
                  <p className="text-zinc-500 text-xs truncate max-w-md">{post.description}</p>
                )}
              </div>
              <span className="text-xs text-zinc-400 flex-shrink-0">{post.users?.nickname ?? '알 수 없음'}</span>
              <span className="text-xs text-zinc-500 flex-shrink-0">{new Date(post.created_at).toLocaleDateString('ko-KR')}</span>
              <Link
                href={`/admin/posts/${post.id}`}
                className="text-xs px-3 py-1 rounded border border-zinc-600 hover:border-zinc-400 text-zinc-400 hover:text-white transition-colors flex-shrink-0"
              >
                보기
              </Link>
              <button
                onClick={() => toggleComments(post.id)}
                className="text-xs px-3 py-1 rounded border border-zinc-600 hover:border-zinc-400 text-zinc-400 hover:text-white transition-colors flex-shrink-0"
              >
                💬 댓글 {expanded === post.id ? '닫기' : '보기'}
              </button>
              <button
                onClick={() => handleDeletePost(post.id)}
                className="text-xs px-3 py-1 rounded border border-zinc-600 hover:border-red-500 text-zinc-400 hover:text-red-400 transition-colors flex-shrink-0"
              >
                삭제
              </button>
            </div>

            {/* 댓글 영역 */}
            {expanded === post.id && (
              <div className="border-t border-zinc-700 bg-zinc-900 px-4 py-3 flex flex-col gap-2">
                {loadingComments === post.id && (
                  <p className="text-xs text-zinc-500">불러오는 중...</p>
                )}
                {!loadingComments && comments[post.id]?.length === 0 && (
                  <p className="text-xs text-zinc-500">댓글이 없습니다.</p>
                )}
                {(comments[post.id] ?? []).map(comment => (
                  <div key={comment.id} className="flex items-start justify-between gap-3 text-sm">
                    <div className="flex gap-2 min-w-0">
                      <span className="text-zinc-400 font-medium flex-shrink-0">{comment.users?.nickname ?? '알 수 없음'}</span>
                      <span className="text-xs text-zinc-500 flex-shrink-0 mt-0.5">{new Date(comment.created_at).toLocaleDateString('ko-KR')}</span>
                      <span className="text-zinc-300 truncate">{comment.content}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteComment(post.id, comment.id)}
                      className="text-xs text-zinc-500 hover:text-red-400 transition-colors flex-shrink-0"
                    >
                      삭제
                    </button>
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
