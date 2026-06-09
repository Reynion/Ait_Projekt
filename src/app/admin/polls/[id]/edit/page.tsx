'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

interface Season {
  id: number
  name: string
  is_active: boolean
}

interface Post {
  id: number
  title: string
  artist: string | null
  season_id: number | null
  users: { nickname: string } | null
}

const inputClass = "bg-zinc-900 border border-zinc-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-400 w-full"

export default function EditPollPage() {
  const { id } = useParams()
  const router = useRouter()

  const [form, setForm] = useState({
    title: '',
    description: '',
    max_votes_per_user: 1,
    ends_at: '',
    is_active: true,
    show_results: true,
  })
  const [posts, setPosts] = useState<Post[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const [members, setMembers] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [selectedMember, setSelectedMember] = useState('all')
  const [selectedSeason, setSelectedSeason] = useState<number | 'all' | 'none'>('all')
  const [selectedPostIds, setSelectedPostIds] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      const { data: poll } = await supabase.from('polls').select('*').eq('id', id).single()
      if (!poll) { router.push('/admin/polls'); return }

      setForm({
        title: poll.title,
        description: poll.description ?? '',
        max_votes_per_user: poll.max_votes_per_user,
        ends_at: poll.ends_at ? new Date(poll.ends_at).toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' }).slice(0, 16) : '',
        is_active: poll.is_active,
        show_results: poll.show_results ?? true,
      })

      const { data: candidates } = await supabase
        .from('poll_candidates')
        .select('post_id')
        .eq('poll_id', id)
      setSelectedPostIds((candidates ?? []).map(c => c.post_id))

      const { data: seasonData } = await supabase
        .from('seasons')
        .select('id, name, is_active')
        .order('is_active', { ascending: false })
        .order('started_at', { ascending: false })
      const fetchedSeasons = (seasonData ?? []) as Season[]
      setSeasons(fetchedSeasons)
      const active = fetchedSeasons.find(s => s.is_active)
      if (active) setSelectedSeason(active.id)

      const { data: postsData } = await supabase
        .from('music_posts')
        .select('id, title, artist, season_id, users(nickname)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
      const rows = (postsData ?? []) as unknown as Post[]
      setPosts(rows)
      setMembers(Array.from(new Set(rows.map(p => p.users?.nickname).filter(Boolean) as string[])))
      setLoading(false)
    }
    load()
  }, [id, router])

  function applySearch() {
    setAppliedSearch(search)
  }

  const seasonTabs = [
    { key: 'all' as const, label: '전체' },
    ...seasons.filter(s => s.is_active).map(s => ({ key: s.id as number | 'all' | 'none', label: s.name })),
    ...seasons.filter(s => !s.is_active).map(s => ({ key: s.id as number | 'all' | 'none', label: s.name })),
    { key: 'none' as const, label: '미분류' },
  ]

  const filtered = posts.filter(post => {
    const matchSeason =
      selectedSeason === 'all' ||
      (selectedSeason === 'none' ? post.season_id === null : post.season_id === selectedSeason)
    const matchSearch =
      !appliedSearch ||
      post.title.toLowerCase().includes(appliedSearch.toLowerCase()) ||
      (post.artist ?? '').toLowerCase().includes(appliedSearch.toLowerCase())
    const matchMember = selectedMember === 'all' || post.users?.nickname === selectedMember
    return matchSeason && matchSearch && matchMember
  })

  function togglePost(postId: number) {
    setSelectedPostIds(prev =>
      prev.includes(postId) ? prev.filter(id => id !== postId) : [...prev, postId]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (selectedPostIds.length === 0) { alert('후보곡을 1곡 이상 선택해주세요.'); return }
    setSubmitting(true)

    const supabase = createClient()

    await supabase.from('polls').update({
      title: form.title,
      description: form.description || null,
      max_votes_per_user: form.max_votes_per_user,
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
      is_active: form.is_active,
      show_results: form.show_results,
    }).eq('id', id)

    const { data: existingCandidates } = await supabase
      .from('poll_candidates')
      .select('id, post_id')
      .eq('poll_id', id)

    const existingPostIds = (existingCandidates ?? []).map(c => c.post_id)
    const toAdd = selectedPostIds.filter(pid => !existingPostIds.includes(pid))
    const toRemove = (existingCandidates ?? []).filter(c => !selectedPostIds.includes(c.post_id))

    if (toRemove.length > 0) {
      await supabase.from('poll_candidates').delete().in('id', toRemove.map(c => c.id))
    }
    if (toAdd.length > 0) {
      await supabase.from('poll_candidates').insert(toAdd.map(postId => ({ poll_id: Number(id), post_id: postId })))
    }

    router.push('/admin/polls')
  }

  if (loading) return <p className="text-zinc-400">불러오는 중...</p>

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/admin/polls')} className="text-zinc-500 hover:text-zinc-200 transition-colors text-sm">← 투표 관리</button>
        <h1 className="text-2xl font-bold text-white">투표 수정</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* 기본 정보 */}
        <section className="bg-zinc-800 border border-zinc-700 rounded-xl p-5 flex flex-col gap-4">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">기본 정보</h2>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-300">투표 제목 *</label>
            <input type="text" required value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="예: 6월 공연 연습곡 선정" className={inputClass} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-300">설명</label>
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} placeholder="투표에 대한 설명..." className={`${inputClass} resize-none`} />
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="text-sm font-medium text-zinc-300">1인 최대 투표 수 *</label>
              <input type="number" min={1} required value={form.max_votes_per_user} onChange={e => setForm(p => ({ ...p, max_votes_per_user: Number(e.target.value) }))} className={inputClass} />
            </div>
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="text-sm font-medium text-zinc-300">마감 일시</label>
              <input type="datetime-local" value={form.ends_at} onChange={e => setForm(p => ({ ...p, ends_at: e.target.value }))} className={inputClass} />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-zinc-300">투표 상태</label>
            <button
              type="button"
              onClick={() => setForm(p => ({ ...p, is_active: !p.is_active }))}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                form.is_active
                  ? 'bg-green-500/10 border-green-500/40 text-green-400'
                  : 'bg-zinc-700 border-zinc-600 text-zinc-400'
              }`}
            >
              {form.is_active ? '진행중' : '종료됨'}
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-zinc-300">현황 공개</label>
              <button
                type="button"
                onClick={() => setForm(p => ({ ...p, show_results: !p.show_results }))}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  form.show_results
                    ? 'bg-blue-500/10 border-blue-500/40 text-blue-400'
                    : 'bg-zinc-700 border-zinc-600 text-zinc-400'
                }`}
              >
                {form.show_results ? '공개' : '비공개'}
              </button>
            </div>
            <span className="text-xs text-zinc-500">{form.show_results ? '멤버에게 실시간 득표 현황이 표시됩니다.' : '멤버에게 득표 현황이 숨겨집니다.'}</span>
          </div>
        </section>

        {/* 후보곡 선택 */}
        <section className="bg-zinc-800 border border-zinc-700 rounded-xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">후보곡</h2>
            <span className="text-sm text-zinc-400">{selectedPostIds.length}곡 선택됨</span>
          </div>

          <div className="flex gap-1.5 flex-wrap">
            {seasonTabs.map(tab => (
              <button
                key={String(tab.key)}
                type="button"
                onClick={() => setSelectedSeason(tab.key)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${selectedSeason === tab.key ? 'bg-zinc-100 text-zinc-900 border-zinc-100' : 'border-zinc-600 text-zinc-400 hover:border-zinc-400'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && applySearch()}
                placeholder="곡 제목 / 아티스트 검색..."
                className="flex-1 bg-zinc-900 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-400"
              />
              <button
                type="button"
                onClick={applySearch}
                className="bg-zinc-700 border border-zinc-600 text-zinc-200 text-sm px-3 py-2 rounded-lg hover:bg-zinc-600 transition-colors flex-shrink-0"
              >
                검색
              </button>
            </div>
            <select
              value={selectedMember}
              onChange={e => setSelectedMember(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-400"
            >
              <option value="all">전체 멤버</option>
              {members.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div className="border border-zinc-700 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
            {filtered.length === 0 && (
              <p className="text-center text-zinc-500 py-6 text-sm">검색 결과가 없습니다.</p>
            )}
            {filtered.map(post => (
              <label
                key={post.id}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-zinc-700 last:border-0 transition-colors ${
                  selectedPostIds.includes(post.id) ? 'bg-blue-500/10' : 'hover:bg-zinc-700'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedPostIds.includes(post.id)}
                  onChange={() => togglePost(post.id)}
                  className="accent-blue-500 w-4 h-4 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-100 truncate">{post.title}</p>
                  <p className="text-xs text-zinc-500">{post.artist ? `${post.artist} · ` : ''}{post.users?.nickname}</p>
                </div>
              </label>
            ))}
          </div>

          {selectedPostIds.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedPostIds.map(pid => {
                const post = posts.find(p => p.id === pid)
                return (
                  <span key={pid} className="flex items-center gap-1 bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs px-2.5 py-1 rounded-full">
                    {post?.title}
                    <button type="button" onClick={() => togglePost(pid)} className="hover:text-white ml-0.5">✕</button>
                  </span>
                )
              })}
            </div>
          )}
        </section>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.push('/admin/polls')}
            className="flex-1 bg-zinc-800 border border-zinc-600 rounded-lg py-2.5 text-sm font-medium text-zinc-300 hover:border-zinc-400 hover:text-white transition-colors"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 bg-zinc-100 text-zinc-900 rounded-lg py-2.5 text-sm font-semibold hover:bg-white disabled:opacity-50 transition-colors"
          >
            {submitting ? '저장 중...' : '수정 완료'}
          </button>
        </div>
      </form>
    </div>
  )
}
