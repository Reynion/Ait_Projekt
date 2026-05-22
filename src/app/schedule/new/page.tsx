'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Link from 'next/link'

export default function ScheduleNewPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const defaultDate = searchParams.get('date') ?? ''

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    start_date: defaultDate,
    start_time: '',
    end_date: '',
    end_time: '',
    type: 'personal' as 'official' | 'personal',
    location: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/login'); return }
      setCurrentUserId(data.user.id)
      const { data: row } = await supabase.from('users').select('role').eq('id', data.user.id).single()
      if (row?.role === 'admin') setIsAdmin(true)
      setLoading(false)
    })
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!currentUserId || !form.title.trim() || !form.start_date) return
    setSubmitting(true)
    const supabase = createClient()
    const { error } = await supabase.from('schedules').insert({
      title: form.title.trim(),
      description: form.description.trim() || null,
      start_date: form.start_date,
      start_time: form.start_time || null,
      end_date: form.end_date || null,
      end_time: form.end_time || null,
      type: isAdmin ? form.type : 'personal',
      location: form.location.trim() || null,
      created_by: currentUserId,
    })
    if (!error) router.push('/schedule')
    else { alert('저장에 실패했습니다.'); setSubmitting(false) }
  }

  if (loading) return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950">
      <p className="text-zinc-400">불러오는 중...</p>
    </main>
  )

  return (
    <main className="flex min-h-screen flex-col bg-zinc-950">
      <Navbar />
      <section className="max-w-lg w-full mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/schedule" className="text-zinc-400 hover:text-white transition-colors text-sm">← 일정으로</Link>
          <h1 className="text-xl font-bold text-white">일정 추가</h1>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 bg-zinc-800 border border-zinc-700 rounded-xl p-5">
          {isAdmin && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, type: 'personal' }))}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
                  form.type === 'personal'
                    ? 'bg-green-600 border-green-500 text-white'
                    : 'bg-zinc-700 border-zinc-600 text-zinc-400 hover:text-white'
                }`}
              >
                개인 일정
              </button>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, type: 'official' }))}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
                  form.type === 'official'
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-zinc-700 border-zinc-600 text-zinc-400 hover:text-white'
                }`}
              >
                공식 일정
              </button>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-zinc-300 font-medium">제목 *</label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="일정 제목"
              required
              className="bg-zinc-900 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-400"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="text-sm text-zinc-300 font-medium">시작일 *</label>
              <input
                type="date"
                value={form.start_date}
                onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                required
                className="bg-zinc-900 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-400"
              />
            </div>
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="text-sm text-zinc-300 font-medium">시작 시간</label>
              <input
                type="time"
                value={form.start_time}
                onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                className="bg-zinc-900 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-400"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="text-sm text-zinc-300 font-medium">종료일</label>
              <input
                type="date"
                value={form.end_date}
                onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                className="bg-zinc-900 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-400"
              />
            </div>
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="text-sm text-zinc-300 font-medium">종료 시간</label>
              <input
                type="time"
                value={form.end_time}
                onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                className="bg-zinc-900 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-400"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-zinc-300 font-medium">장소</label>
            <input
              type="text"
              value={form.location}
              onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
              placeholder="장소 (선택)"
              className="bg-zinc-900 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-400"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-zinc-300 font-medium">설명</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="설명 (선택)"
              rows={3}
              className="bg-zinc-900 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-400 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !form.title.trim() || !form.start_date}
            className="bg-zinc-700 border border-zinc-600 text-white font-medium py-2.5 rounded-lg hover:bg-zinc-600 hover:border-zinc-500 disabled:opacity-50 transition-colors mt-1"
          >
            {submitting ? '저장 중...' : '일정 저장'}
          </button>
        </form>
      </section>
    </main>
  )
}
