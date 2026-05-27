'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { notifyAll } from '@/lib/notifications'

interface Post {
  id: number
  title: string
  artist: string | null
  users: { nickname: string } | null
}

const EMPTY_FORM = {
  title: '',
  description: '',
  max_votes_per_user: 1,
  ends_at: '',
  show_results: true,
}

const inputClass = "bg-zinc-900 border border-zinc-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-400 w-full"

export default function NewPollPage() {
  const router = useRouter()
  const [form, setForm] = useState(EMPTY_FORM)
  const [posts, setPosts] = useState<Post[]>([])
  const [members, setMembers] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [selectedMember, setSelectedMember] = useState<string>('all')
  const [selectedPostIds, setSelectedPostIds] = useState<number[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('posts')
      .select('id, title, artist, users(nickname)')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        const rows = (data ?? []) as unknown as Post[]
        setPosts(rows)
        const uniqueMembers = Array.from(
          new Set(rows.map(p => p.users?.nickname).filter(Boolean) as string[])
        )
        setMembers(uniqueMembers)
      })
  }, [])

  function applySearch() {
    setAppliedSearch(search)
  }

  const filtered = posts.filter(post => {
    const matchSearch =
      !appliedSearch ||
      post.title.toLowerCase().includes(appliedSearch.toLowerCase()) ||
      (post.artist ?? '').toLowerCase().includes(appliedSearch.toLowerCase())
    const matchMember = selectedMember === 'all' || post.users?.nickname === selectedMember
    return matchSearch && matchMember
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
    const { data: { user } } = await supabase.auth.getUser()

    const { data: poll, error } = await supabase.from('polls').insert({
      title: form.title,
      description: form.description || null,
      max_votes_per_user: form.max_votes_per_user,
      ends_at: form.ends_at || null,
      show_results: form.show_results,
      created_by: user?.id,
    }).select().single()

    if (error || !poll) { alert('투표 생성에 실패했습니다.'); setSubmitting(false); return }

    await supabase.from('poll_candidates').insert(
      selectedPostIds.map(postId => ({ poll_id: poll.id, post_id: postId }))
    )

    await notifyAll({
      supabase,
      senderId: user?.id ?? '',
      type: 'new_poll',
      message: `새 투표가 생성됐습니다: ${form.title}`,
      link: `/polls/${poll.id}`,
    })

    router.push('/admin/polls')
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/admin/polls')} className="text-zinc-500 hover:text-zinc-200 transition-colors text-sm">← 투표 관리</button>
        <h1 className="text-2xl font-bold text-white">투표 생성</h1>
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
              <label className="text-sm font-medium text-zinc-300">마감일</label>
              <input type="date" value={form.ends_at} onChange={e => setForm(p => ({ ...p, ends_at: e.target.value }))} className={inputClass} />
            </div>
          </div>

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
            <span className="text-xs text-zinc-500">{form.show_results ? '멤버에게 실시간 득표 현황이 표시됩니다.' : '멤버에게 득표 현황이 숨겨집니다.'}</span>
          </div>
        </section>

        {/* 후보곡 선택 */}
        <section className="bg-zinc-800 border border-zinc-700 rounded-xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">후보곡 선택</h2>
            <span className="text-sm text-zinc-400">{selectedPostIds.length}곡 선택됨</span>
          </div>

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
              className="bg-zinc-700 border border-zinc-600 text-zinc-200 text-sm px-3 py-2 rounded-lg hover:bg-zinc-600 transition-colors"
            >
              검색
            </button>
            <select
              value={selectedMember}
              onChange={e => setSelectedMember(e.target.value)}
              className="bg-zinc-900 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-400"
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
              {selectedPostIds.map(id => {
                const post = posts.find(p => p.id === id)
                return (
                  <span key={id} className="flex items-center gap-1 bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs px-2.5 py-1 rounded-full">
                    {post?.title}
                    <button type="button" onClick={() => togglePost(id)} className="hover:text-white ml-0.5">✕</button>
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
            {submitting ? '생성 중...' : '투표 생성'}
          </button>
        </div>
      </form>
    </div>
  )
}
