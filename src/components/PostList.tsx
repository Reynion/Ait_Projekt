'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { extractYoutubeId, getThumbnailUrl } from '@/lib/youtube'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

interface Season {
  id: number
  name: string
  is_active: boolean
}

interface Post {
  id: number
  title: string
  artist: string | null
  description: string | null
  youtube_url: string | null
  created_at: string
  season_id: number | null
  users: { nickname: string; avatar_url: string | null } | null
  likeCount: number
  commentCount: number
}

type SortType = 'latest' | 'likes'
type SearchType = 'title' | 'artist'

const PAGE_SIZE = 20

function Avatar({ url, nickname, size = 8 }: { url: string | null; nickname: string; size?: 6 | 8 }) {
  const sizeClass = size === 6 ? 'w-6 h-6' : 'w-8 h-8'
  return (
    <div className={`relative ${sizeClass} rounded-full overflow-hidden bg-zinc-700 border border-zinc-600 flex-shrink-0`}>
      {url ? (
        <Image src={url} alt={nickname} fill className="object-cover" unoptimized />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-zinc-400 text-base">👤</div>
      )}
    </div>
  )
}

export default function PostList() {
  const router = useRouter()
  const [posts, setPosts] = useState<Post[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const [selectedSeason, setSelectedSeason] = useState<number | 'all' | 'none'>('all')
  const [members, setMembers] = useState<string[]>([])
  const [sort, setSort] = useState<SortType>('latest')
  const [selectedMember, setSelectedMember] = useState<string>('all')

  const [searchType, setSearchType] = useState<SearchType>('title')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const [appliedSearchType, setAppliedSearchType] = useState<SearchType>('title')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [appliedDateFrom, setAppliedDateFrom] = useState('')
  const [appliedDateTo, setAppliedDateTo] = useState('')

  const [currentPage, setCurrentPage] = useState(1)

  function applySearch() {
    setAppliedSearch(search)
    setAppliedSearchType(searchType)
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

  async function fetchData() {
    const supabase = createClient()

    const { data: seasonData } = await supabase
      .from('seasons')
      .select('id, name, is_active')
      .order('started_at', { ascending: true })

    const fetchedSeasons: Season[] = (seasonData ?? []) as Season[]
    setSeasons(fetchedSeasons)

    const activeSeason = fetchedSeasons.find(s => s.is_active)
    if (activeSeason) {
      setSelectedSeason(activeSeason.id)
    }

    const { data: postsData } = await supabase
      .from('posts')
      .select('*, users(nickname, avatar_url)')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    const { data: likesData } = await supabase.from('likes').select('post_id, is_like')
    const { data: commentsData } = await supabase.from('comments').select('post_id')

    const enriched: Post[] = ((postsData ?? []) as unknown as Post[]).map(post => ({
      ...post,
      likeCount: (likesData ?? []).filter(l => l.post_id === post.id && l.is_like).length,
      commentCount: (commentsData ?? []).filter(c => c.post_id === post.id).length,
    }))

    setPosts(enriched)
    setMembers(Array.from(new Set(enriched.map(p => p.users?.nickname).filter(Boolean) as string[])))
  }

  useEffect(() => {
    fetchData()
    const supabase = createClient()
    const channel = supabase
      .channel('posts-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, fetchData)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  function handleSeasonChange(val: number | 'all' | 'none') {
    setSelectedSeason(val)
    setCurrentPage(1)
  }

  const filtered = posts
    .filter(post => {
      if (selectedSeason === 'none') return post.season_id === null
      if (selectedSeason !== 'all') return post.season_id === selectedSeason
      return true
    })
    .filter(post => {
      const target = appliedSearchType === 'title' ? post.title : (post.artist ?? '')
      const matchSearch = !appliedSearch || target.replace(/\s/g, '').toLowerCase().includes(appliedSearch.replace(/\s/g, '').toLowerCase())
      const matchMember = selectedMember === 'all' || post.users?.nickname === selectedMember
      const postDate = new Date(post.created_at)
      const matchFrom = !appliedDateFrom || postDate >= new Date(appliedDateFrom)
      const matchTo = !appliedDateTo || postDate <= new Date(appliedDateTo + 'T23:59:59')
      return matchSearch && matchMember && matchFrom && matchTo
    })
    .sort((a, b) =>
      sort === 'likes'
        ? b.likeCount - a.likeCount
        : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const tabClass = (active: boolean) =>
    `px-3 py-1.5 rounded-lg border text-sm whitespace-nowrap transition-colors flex-shrink-0 ${
      active
        ? 'bg-zinc-700 border-zinc-500 text-white'
        : 'bg-transparent border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
    }`

  return (
    <div className="flex flex-col gap-4">
      {/* 시즌 탭 */}
      {seasons.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => handleSeasonChange('all')}
            className={tabClass(selectedSeason === 'all')}
          >
            전체
          </button>
          {seasons.map(s => (
            <button
              key={s.id}
              onClick={() => handleSeasonChange(s.id)}
              className={`${tabClass(selectedSeason === s.id)} ${s.is_active ? 'relative' : ''}`}
            >
              {s.name}
              {s.is_active && (
                <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-green-400 align-middle" />
              )}
            </button>
          ))}
          <button
            onClick={() => handleSeasonChange('none')}
            className={tabClass(selectedSeason === 'none')}
          >
            미분류
          </button>
        </div>
      )}

      {/* 검색 + 필터 */}
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <select
            value={searchType}
            onChange={e => { setSearchType(e.target.value as SearchType); setSearch('') }}
            className="bg-zinc-900 border border-zinc-600 rounded-lg px-2 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-400 flex-shrink-0"
          >
            <option value="title">곡 제목</option>
            <option value="artist">아티스트</option>
          </select>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && applySearch()}
            placeholder={searchType === 'title' ? '곡 제목...' : '아티스트...'}
            className="flex-1 min-w-0 bg-zinc-900 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-400"
          />
          <button
            onClick={applySearch}
            className="bg-zinc-700 border border-zinc-600 text-zinc-200 text-sm px-3 py-2 rounded-lg hover:bg-zinc-600 hover:text-white transition-colors flex-shrink-0"
          >
            검색
          </button>
        </div>
        <div className="flex gap-2">
          <select
            value={selectedMember}
            onChange={e => { setSelectedMember(e.target.value); setCurrentPage(1) }}
            className="flex-1 bg-zinc-900 border border-zinc-600 rounded-lg px-2 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-400"
          >
            <option value="all">전체 멤버</option>
            {members.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
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

      {/* 정렬 탭 */}
      <div className="flex gap-2">
        {(['latest', 'likes'] as SortType[]).map(s => (
          <button
            key={s}
            onClick={() => { setSort(s); setCurrentPage(1) }}
            className={`px-3 py-1.5 rounded-lg border transition-colors ${
              sort === s
                ? 'bg-zinc-700 border-zinc-500 text-white'
                : 'bg-transparent border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
            }`}
          >
            {s === 'latest' ? '최신순' : '추천순'}
          </button>
        ))}
        <span className="ml-auto text-sm text-zinc-500 self-center">총 {filtered.length}개</span>
      </div>

      {filtered.length === 0 && (
        <div className="text-center text-zinc-500 py-20">
          {posts.length === 0 ? '아직 제안된 음악이 없습니다. 첫 번째로 제안해보세요!' : '검색 결과가 없습니다.'}
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {paginated.map((post, idx) => {
          const youtubeId = post.youtube_url ? extractYoutubeId(post.youtube_url) : null
          const thumbnail = youtubeId ? getThumbnailUrl(youtubeId) : null
          const seq = filtered.length - ((currentPage - 1) * PAGE_SIZE + idx)

          return (
            <li
              key={post.id}
              onClick={() => router.push(`/posts/${post.id}`)}
              className="bg-zinc-800 border border-zinc-700 rounded-xl p-3 hover:border-zinc-500 transition-all cursor-pointer flex flex-col gap-2 overflow-hidden"
            >
              <div className="flex gap-3 items-start">
                <span className="text-xs text-zinc-500 font-mono w-5 flex-shrink-0 text-right pt-0.5">{seq}</span>
                {thumbnail ? (
                  <div className="relative w-20 h-14 sm:w-32 sm:h-20 flex-shrink-0 rounded-lg overflow-hidden bg-zinc-700 border border-zinc-600">
                    <Image src={thumbnail} alt={post.title} fill className="object-cover" unoptimized />
                  </div>
                ) : (
                  <div className="w-20 h-14 sm:w-32 sm:h-20 flex-shrink-0 rounded-lg bg-zinc-700 border border-zinc-600 flex items-center justify-center text-zinc-500 text-xl sm:text-2xl">🎵</div>
                )}
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <h3 className="font-semibold text-sm sm:text-base text-white truncate">{post.title}</h3>
                  {post.artist && <p className="text-xs text-zinc-400 truncate">{post.artist}</p>}
                  {post.description && <p className="text-xs text-zinc-500 line-clamp-1 sm:line-clamp-2">{post.description}</p>}
                </div>
              </div>
              <div className="flex items-center gap-1.5 pt-2 border-t border-zinc-700">
                <Avatar url={post.users?.avatar_url ?? null} nickname={post.users?.nickname ?? ''} size={6} />
                <span className="text-xs text-zinc-300 font-medium truncate">{post.users?.nickname ?? '알 수 없음'}</span>
                <span className="text-zinc-600 flex-shrink-0">·</span>
                <span className="text-xs text-zinc-500 flex-shrink-0">{new Date(post.created_at).toLocaleDateString('ko-KR')}</span>
                <span className="text-xs text-zinc-500 ml-auto flex-shrink-0">💬 {post.commentCount}</span>
                <span className="text-xs text-zinc-400 flex-shrink-0 font-medium">👍 {post.likeCount}</span>
              </div>
            </li>
          )
        })}
      </ul>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 pt-2">
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
    </div>
  )
}
