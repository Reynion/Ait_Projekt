'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import Navbar from '@/components/Navbar'
import UserProfileModal from '@/components/UserProfileModal'
import { getWritePermission } from '@/lib/permissions'

interface BoardPost {
  id: number
  title: string
  content: string
  image_urls: string[] | null
  created_at: string
  user_id: string
  is_notice: boolean
  post_type: string | null
  music_items: { youtube_url: string; comment: string }[] | null
  users: { nickname: string; avatar_url: string | null } | null
  commentCount: number
}

function Avatar({ url, nickname }: { url: string | null; nickname: string }) {
  return (
    <div className="relative w-6 h-6 rounded-full overflow-hidden bg-zinc-700 border border-zinc-600 flex-shrink-0">
      {url ? (
        <Image src={url} alt={nickname} fill className="object-cover" unoptimized />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-zinc-400 text-xs">👤</div>
      )}
    </div>
  )
}

type SearchType = 'title' | 'content'
const PAGE_SIZE = 20

export default function BoardPage() {
  const router = useRouter()
  const [posts, setPosts] = useState<BoardPost[]>([])
  const [loading, setLoading] = useState(true)
  const [canWrite, setCanWrite] = useState(false)

  const [searchType, setSearchType] = useState<SearchType>('title')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const [appliedSearchType, setAppliedSearchType] = useState<SearchType>('title')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [appliedDateFrom, setAppliedDateFrom] = useState('')
  const [appliedDateTo, setAppliedDateTo] = useState('')

  const [currentPage, setCurrentPage] = useState(1)
  const [profileUserId, setProfileUserId] = useState<string | null>(null)

  function applySearch() {
    setAppliedSearchType(searchType)
    setAppliedSearch(search)
    setAppliedDateFrom(dateFrom)
    setAppliedDateTo(dateTo)
    setCurrentPage(1)
  }

  function resetDates() {
    setDateFrom('')
    setDateTo('')
    setAppliedDateFrom('')
    setAppliedDateTo('')
    setCurrentPage(1)
  }

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) { router.push('/login'); return }
      getWritePermission('board').then(setCanWrite)

      const { data: postsData } = await supabase
        .from('board_posts')
        .select('*, users(nickname, avatar_url)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      const { data: commentsData } = await supabase
        .from('board_comments')
        .select('board_post_id')
        .is('deleted_at', null)

      const enriched = ((postsData ?? []) as unknown as BoardPost[]).map(post => ({
        ...post,
        commentCount: (commentsData ?? []).filter(c => c.board_post_id === post.id).length,
      }))

      setPosts(enriched)
      setLoading(false)
    }
    load()
  }, [router])

  const filtered = posts.filter(post => {
    const target = appliedSearchType === 'title' ? post.title : post.content
    const matchSearch = !appliedSearch || target.replace(/\s/g, '').toLowerCase().includes(appliedSearch.replace(/\s/g, '').toLowerCase())
    const postDate = new Date(post.created_at)
    const matchFrom = !appliedDateFrom || postDate >= new Date(appliedDateFrom)
    const matchTo = !appliedDateTo || postDate <= new Date(appliedDateTo + 'T23:59:59')
    return matchSearch && matchFrom && matchTo
  })

  const notices = filtered.filter(p => p.is_notice)
  const normals = filtered.filter(p => !p.is_notice)
  const totalPages = Math.ceil(normals.length / PAGE_SIZE)
  const paginated = normals.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  if (loading) return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950">
      <p className="text-zinc-400">불러오는 중...</p>
    </main>
  )

  return (
    <main className="flex min-h-screen flex-col bg-zinc-950">
      {profileUserId && <UserProfileModal userId={profileUserId} onClose={() => setProfileUserId(null)} />}
      <Navbar />

      <section className="flex-1 max-w-2xl w-full mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">게시판</h2>
          {canWrite && (
            <Link
              href="/board/new"
              className="bg-zinc-800 border border-zinc-600 text-zinc-200 text-sm px-4 py-2 rounded-lg hover:border-zinc-400 hover:text-white transition-colors"
            >
              + 글쓰기
            </Link>
          )}
        </div>

        {/* 검색 */}
        <div className="flex flex-col gap-2 mb-4">
          <div className="flex gap-2">
            <select
              value={searchType}
              onChange={e => { setSearchType(e.target.value as SearchType); setSearch('') }}
              className="bg-zinc-900 border border-zinc-600 rounded-lg px-2 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-400 flex-shrink-0"
            >
              <option value="title">제목</option>
              <option value="content">내용</option>
            </select>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && applySearch()}
              placeholder={searchType === 'title' ? '제목...' : '내용...'}
              className="flex-1 min-w-0 bg-zinc-900 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-400"
            />
            <button
              onClick={applySearch}
              className="bg-zinc-700 border border-zinc-600 text-zinc-200 text-sm px-4 py-2 rounded-lg hover:bg-zinc-600 hover:text-white transition-colors flex-shrink-0"
            >
              검색
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-zinc-400 flex-shrink-0">날짜</span>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="flex-1 bg-zinc-900 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-400"
            />
            <span className="text-zinc-500 flex-shrink-0">~</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="flex-1 bg-zinc-900 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-400"
            />
            <button
              onClick={applySearch}
              className="text-xs text-zinc-400 hover:text-white flex-shrink-0 px-3 py-2 border border-zinc-600 hover:border-zinc-400 rounded-lg transition-colors"
            >
              적용
            </button>
            {(appliedDateFrom || appliedDateTo) && (
              <button
                onClick={resetDates}
                className="text-xs text-zinc-500 hover:text-zinc-200 flex-shrink-0 px-2 py-1 border border-zinc-700 hover:border-zinc-500 rounded-lg transition-colors"
              >
                초기화
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-zinc-500">총 {filtered.length}개</span>
        </div>

        {filtered.length === 0 && (
          <div className="text-center text-zinc-500 py-20 bg-zinc-800 border border-zinc-700 rounded-xl">
            {posts.length === 0 ? '아직 게시글이 없습니다. 첫 번째로 글을 남겨보세요!' : '검색 결과가 없습니다.'}
          </div>
        )}

        {/* 공지 */}
        {notices.length > 0 && (
          <ul className="flex flex-col gap-3 mb-2">
            {notices.map(post => (
              <li key={post.id}>
                <Link
                  href={`/board/${post.id}`}
                  className="bg-amber-950/20 border border-amber-700/40 rounded-xl p-4 hover:border-amber-600/60 transition-all flex flex-col gap-2"
                >
                  <div className="flex gap-3 items-start">
                    <span className="text-xs text-amber-600 font-mono w-5 flex-shrink-0 pt-0.5 text-right">📌</span>
                    <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-amber-500/20 text-amber-700 border border-amber-500/30 px-2 py-0.5 rounded-full font-medium flex-shrink-0">공지</span>
                        <h3 className="font-semibold text-white truncate">{post.title}</h3>
                      </div>
                      <p className="text-sm text-zinc-400 line-clamp-2">{post.content}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-500 pt-2 border-t border-amber-800/40">
                    <button
                      type="button"
                      onClick={e => { e.preventDefault(); setProfileUserId(post.user_id) }}
                      className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                    >
                      <Avatar url={post.users?.avatar_url ?? null} nickname={post.users?.nickname ?? ''} />
                      <span className="text-zinc-300">{post.users?.nickname ?? '알 수 없음'}</span>
                    </button>
                    <span>·</span>
                    <span>{new Date(post.created_at).toLocaleDateString('ko-KR')}</span>
                    <div className="ml-auto flex items-center gap-2">
                      {post.image_urls && post.image_urls.length > 0 && (
                        <span>🖼 {post.image_urls.length}</span>
                      )}
                      <span>💬 {post.commentCount}</span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {notices.length > 0 && normals.length > 0 && (
          <div className="border-t border-zinc-700 my-3" />
        )}

        <ul className="flex flex-col gap-3">
          {paginated.map((post, idx) => {
            const seq = normals.length - ((currentPage - 1) * PAGE_SIZE + idx)
            return (
              <li key={post.id}>
                <Link
                  href={`/board/${post.id}`}
                  className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 hover:border-zinc-500 transition-all flex flex-col gap-2"
                >
                  <div className="flex gap-3 items-start">
                    <span className="text-xs text-zinc-500 font-mono w-5 flex-shrink-0 pt-0.5 text-right">{seq}</span>
                    <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        {post.post_type === 'music' && (
                          <span className="text-xs bg-purple-500/20 text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded-full font-medium flex-shrink-0">🎵 노래공유</span>
                        )}
                        <h3 className="font-semibold text-white truncate">{post.title}</h3>
                      </div>
                      <p className="text-sm text-zinc-400 line-clamp-2">{post.content}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-500 pt-2 border-t border-zinc-700">
                    <button
                      type="button"
                      onClick={e => { e.preventDefault(); setProfileUserId(post.user_id) }}
                      className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                    >
                      <Avatar url={post.users?.avatar_url ?? null} nickname={post.users?.nickname ?? ''} />
                      <span className="text-zinc-300">{post.users?.nickname ?? '알 수 없음'}</span>
                    </button>
                    <span>·</span>
                    <span>{new Date(post.created_at).toLocaleDateString('ko-KR')}</span>
                    <div className="ml-auto flex items-center gap-2">
                      {post.image_urls && post.image_urls.length > 0 && (
                        <span>🖼 {post.image_urls.length}</span>
                      )}
                      <span>💬 {post.commentCount}</span>
                    </div>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1 pt-4">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm"
            >
              이전
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                  page === currentPage
                    ? 'bg-zinc-700 border-zinc-500 text-white'
                    : 'border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm"
            >
              다음
            </button>
          </div>
        )}
      </section>
    </main>
  )
}
