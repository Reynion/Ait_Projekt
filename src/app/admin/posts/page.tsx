'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

interface Season {
  id: number
  name: string
  is_active: boolean
}

interface Comment {
  id: number
  content: string
  created_at: string
  users: { nickname: string } | null
}

interface PostRow {
  id: number
  title: string
  artist: string | null
  description: string | null
  created_at: string
  season_id: number | null
  seasons: { name: string } | null
  users: { nickname: string } | null
  likes: { is_like: boolean }[]
}

export default function AdminPosts() {
  const [posts, setPosts] = useState<PostRow[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const [comments, setComments] = useState<Record<number, Comment[]>>({})
  const [expanded, setExpanded] = useState<number | null>(null)
  const [loadingComments, setLoadingComments] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  const [seasonTab, setSeasonTab] = useState<number | 'all' | 'none'>('all')
  const [searchText, setSearchText] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [sort, setSort] = useState<'newest' | 'likes'>('newest')

  async function fetchData() {
    const supabase = createClient()
    const [{ data: postsData }, { data: seasonsData }] = await Promise.all([
      supabase
        .from('posts')
        .select('id, title, artist, description, created_at, season_id, seasons(name), users(nickname), likes(is_like)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false }),
      supabase.from('seasons').select('id, name, is_active').order('started_at', { ascending: true }),
    ])
    if (postsData) setPosts(postsData as unknown as PostRow[])
    if (seasonsData) setSeasons(seasonsData as Season[])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

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
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
    setComments(prev => ({ ...prev, [postId]: (data ?? []) as unknown as Comment[] }))
    setLoadingComments(null)
  }

  async function handleDeleteComment(postId: number, commentId: number) {
    if (!confirm('댓글을 삭제하시겠습니까?')) return
    const supabase = createClient()
    await supabase.from('comments').update({ deleted_at: new Date().toISOString() }).eq('id', commentId)
    setComments(prev => ({ ...prev, [postId]: prev[postId].filter(c => c.id !== commentId) }))
  }

  async function handleDeletePost(id: number) {
    if (!confirm('정말 삭제하시겠습니까?')) return
    const supabase = createClient()
    await supabase.from('posts').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    setPosts(prev => prev.filter(p => p.id !== id))
    if (expanded === id) setExpanded(null)
  }

  const filtered = useMemo(() => {
    let list = [...posts]

    if (seasonTab === 'none') {
      list = list.filter(p => p.season_id === null)
    } else if (seasonTab !== 'all') {
      list = list.filter(p => p.season_id === seasonTab)
    }

    if (appliedSearch) {
      const q = appliedSearch.replace(/\s/g, '').toLowerCase()
      list = list.filter(p =>
        p.title.replace(/\s/g, '').toLowerCase().includes(q) ||
        (p.artist ?? '').replace(/\s/g, '').toLowerCase().includes(q) ||
        (p.users?.nickname ?? '').replace(/\s/g, '').toLowerCase().includes(q)
      )
    }

    if (sort === 'likes') {
      list.sort((a, b) => b.likes.filter(l => l.is_like).length - a.likes.filter(l => l.is_like).length)
    }

    return list
  }, [posts, seasonTab, appliedSearch, sort])

  if (loading) return <p className="text-zinc-400">불러오는 중...</p>

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">음악제안 관리</h1>

      {/* 시즌 탭 */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setSeasonTab('all')}
          className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${seasonTab === 'all' ? 'bg-zinc-100 text-zinc-900 border-zinc-100' : 'border-zinc-600 text-zinc-400 hover:border-zinc-400'}`}
        >
          전체
        </button>
        {seasons.map(s => (
          <button
            key={s.id}
            onClick={() => setSeasonTab(s.id)}
            className={`text-sm px-3 py-1.5 rounded-full border transition-colors flex items-center gap-1.5 ${seasonTab === s.id ? 'bg-zinc-100 text-zinc-900 border-zinc-100' : 'border-zinc-600 text-zinc-400 hover:border-zinc-400'}`}
          >
            {s.is_active && <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />}
            {s.name}
          </button>
        ))}
        <button
          onClick={() => setSeasonTab('none')}
          className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${seasonTab === 'none' ? 'bg-zinc-100 text-zinc-900 border-zinc-100' : 'border-zinc-600 text-zinc-400 hover:border-zinc-400'}`}
        >
          미분류
        </button>
      </div>

      {/* 검색 + 정렬 */}
      <div className="flex gap-2 flex-wrap">
        <div className="flex flex-1 min-w-0 gap-2">
          <input
            type="text"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') setAppliedSearch(searchText) }}
            placeholder="제목 / 아티스트 / 닉네임 검색"
            className="flex-1 min-w-0 bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-400"
          />
          <button
            onClick={() => setAppliedSearch(searchText)}
            className="px-4 py-2 text-sm bg-zinc-700 hover:bg-zinc-600 rounded-lg text-zinc-200 transition-colors flex-shrink-0"
          >
            검색
          </button>
          {appliedSearch && (
            <button
              onClick={() => { setSearchText(''); setAppliedSearch('') }}
              className="px-3 py-2 text-sm text-zinc-400 hover:text-white transition-colors flex-shrink-0"
            >
              ✕
            </button>
          )}
        </div>
        <select
          value={sort}
          onChange={e => setSort(e.target.value as 'newest' | 'likes')}
          className="bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-zinc-400 flex-shrink-0"
        >
          <option value="newest">최신순</option>
          <option value="likes">추천순</option>
        </select>
      </div>

      <div className="flex flex-col gap-2">
        {filtered.length === 0 && <p className="text-zinc-500">게시글이 없습니다.</p>}
        {filtered.map((post) => (
          <div key={post.id} className="bg-zinc-800 rounded-xl overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium truncate">{post.title}</p>
                  {post.seasons && (
                    <span className="text-xs text-green-400 bg-green-500/10 border border-green-500/30 px-2 py-0.5 rounded-full flex-shrink-0">{post.seasons.name}</span>
                  )}
                </div>
                {post.artist && (
                  <p className="text-zinc-500 text-xs truncate">{post.artist}</p>
                )}
                <div className="flex flex-wrap gap-2 text-xs text-zinc-500 mt-0.5">
                  <span className="text-zinc-400">{post.users?.nickname ?? '알 수 없음'}</span>
                  <span>·</span>
                  <span>{new Date(post.created_at).toLocaleDateString('ko-KR')}</span>
                  <span>·</span>
                  <span>👍 {post.likes.filter(l => l.is_like).length}</span>
                  <span>👎 {post.likes.filter(l => !l.is_like).length}</span>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Link
                  href={`/admin/posts/${post.id}`}
                  className="text-xs px-3 py-1.5 rounded-lg border border-zinc-600 hover:border-zinc-400 text-zinc-400 hover:text-white transition-colors"
                >
                  보기
                </Link>
                <button
                  onClick={() => toggleComments(post.id)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-zinc-600 hover:border-zinc-400 text-zinc-400 hover:text-white transition-colors"
                >
                  💬 댓글 {expanded === post.id ? '닫기' : '보기'}
                </button>
                <button
                  onClick={() => handleDeletePost(post.id)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-zinc-700 hover:border-red-500/50 text-zinc-500 hover:text-red-400 transition-colors"
                >
                  삭제
                </button>
              </div>
            </div>

            {expanded === post.id && (
              <div className="border-t border-zinc-700 bg-zinc-900 px-4 py-3 flex flex-col gap-2">
                {loadingComments === post.id && <p className="text-xs text-zinc-500">불러오는 중...</p>}
                {!loadingComments && comments[post.id]?.length === 0 && <p className="text-xs text-zinc-500">댓글이 없습니다.</p>}
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
