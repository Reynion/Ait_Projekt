'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

interface BoardPost {
  id: number
  title: string
  content: string
  created_at: string
  users: { nickname: string } | null
}

interface BoardComment {
  id: number
  board_post_id: number
  content: string
  created_at: string
  users: { nickname: string } | null
}

export default function AdminBoardPage() {
  const [posts, setPosts] = useState<BoardPost[]>([])
  const [comments, setComments] = useState<BoardComment[]>([])
  const [openPostId, setOpenPostId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  async function fetchData() {
    const supabase = createClient()
    const { data: postsData } = await supabase
      .from('board_posts')
      .select('*, users(nickname)')
      .order('created_at', { ascending: false })
    const { data: commentsData } = await supabase
      .from('board_comments')
      .select('*, users(nickname)')
      .order('created_at', { ascending: true })
    setPosts((postsData ?? []) as unknown as BoardPost[])
    setComments((commentsData ?? []) as unknown as BoardComment[])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  async function handleDeletePost(id: number) {
    if (!confirm('게시글과 댓글이 모두 삭제됩니다. 삭제하시겠습니까?')) return
    const supabase = createClient()
    await supabase.from('board_posts').delete().eq('id', id)
    setPosts(prev => prev.filter(p => p.id !== id))
    setComments(prev => prev.filter(c => c.board_post_id !== id))
    if (openPostId === id) setOpenPostId(null)
  }

  async function handleDeleteComment(id: number) {
    const supabase = createClient()
    await supabase.from('board_comments').delete().eq('id', id)
    setComments(prev => prev.filter(c => c.id !== id))
  }

  if (loading) return <p className="text-zinc-400">불러오는 중...</p>

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-white">게시글 관리</h1>

      <div className="flex flex-col gap-3">
        {posts.length === 0 && (
          <div className="text-center text-zinc-500 py-10 bg-zinc-800 border border-zinc-700 rounded-xl">
            게시글이 없습니다.
          </div>
        )}
        {posts.map(post => (
          <div key={post.id} className="bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4 p-4">
              <div className="flex flex-col gap-1 flex-1 min-w-0">
                <span className="font-semibold text-zinc-100 truncate">{post.title}</span>
                <p className="text-xs text-zinc-500 line-clamp-1">{post.content}</p>
                <div className="flex gap-2 text-xs text-zinc-500 mt-0.5">
                  <span className="text-zinc-400">{post.users?.nickname ?? '알 수 없음'}</span>
                  <span>·</span>
                  <span>{new Date(post.created_at).toLocaleDateString('ko-KR')}</span>
                  <span>·</span>
                  <span>댓글 {comments.filter(c => c.board_post_id === post.id).length}개</span>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Link
                  href={`/admin/board/${post.id}`}
                  className="text-xs px-3 py-1.5 rounded-lg border border-zinc-600 hover:border-zinc-400 text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  보기
                </Link>
                <button
                  onClick={() => setOpenPostId(openPostId === post.id ? null : post.id)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-zinc-600 hover:border-zinc-400 text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  {openPostId === post.id ? '댓글 닫기' : '💬 댓글 보기'}
                </button>
                <button
                  onClick={() => handleDeletePost(post.id)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-zinc-700 hover:border-red-500/50 text-zinc-500 hover:text-red-400 transition-colors"
                >
                  삭제
                </button>
              </div>
            </div>

            {openPostId === post.id && (
              <div className="border-t border-zinc-700 bg-zinc-900 px-4 py-3 flex flex-col gap-2">
                {comments.filter(c => c.board_post_id === post.id).length === 0 && (
                  <p className="text-xs text-zinc-500 py-2">댓글이 없습니다.</p>
                )}
                {comments.filter(c => c.board_post_id === post.id).map(comment => (
                  <div key={comment.id} className="flex items-start justify-between gap-3 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-medium text-zinc-300">{comment.users?.nickname ?? '알 수 없음'}</span>
                      <p className="text-xs text-zinc-400">{comment.content}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
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
