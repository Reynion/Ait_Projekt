'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

export default function EditSeasonPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [form, setForm] = useState({
    name: '',
    description: '',
    started_at: '',
    ended_at: '',
    is_active: false,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchSeason() {
      const supabase = createClient()
      const { data } = await supabase.from('seasons').select('*').eq('id', id).maybeSingle()
      if (!data) { router.push('/admin/seasons'); return }
      setForm({
        name: data.name,
        description: data.description ?? '',
        started_at: data.started_at,
        ended_at: data.ended_at ?? '',
        is_active: data.is_active,
      })
      setLoading(false)
    }
    fetchSeason()
  }, [id, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.started_at) return
    setSaving(true)
    setError('')

    const supabase = createClient()

    if (form.is_active) {
      await supabase.from('seasons').update({ is_active: false }).neq('id', id)
    }

    const { error: err } = await supabase.from('seasons').update({
      name: form.name.trim(),
      description: form.description.trim() || null,
      started_at: form.started_at,
      ended_at: form.ended_at || null,
      is_active: form.is_active,
    }).eq('id', id)

    if (err) { setError('저장에 실패했습니다.'); setSaving(false); return }
    router.push(`/admin/seasons/${id}`)
  }

  const inputClass = "bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-400 w-full"

  if (loading) return <p className="text-zinc-400">불러오는 중...</p>

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href={`/admin/seasons/${id}`} className="text-zinc-400 hover:text-white transition-colors text-sm">← 상세</Link>
        <h1 className="text-2xl font-bold">시즌 수정</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 bg-zinc-800 border border-zinc-700 rounded-xl p-5">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-400 font-medium">시즌명 *</label>
          <input
            type="text"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="예: 1기, 2026 봄"
            required
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-400 font-medium">설명</label>
          <input
            type="text"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="선택사항"
            className={inputClass}
          />
        </div>

        <div className="flex gap-3">
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-xs text-zinc-400 font-medium">시작일 *</label>
            <input
              type="date"
              value={form.started_at}
              onChange={e => setForm(f => ({ ...f, started_at: e.target.value }))}
              required
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-xs text-zinc-400 font-medium">종료일</label>
            <input
              type="date"
              value={form.ended_at}
              onChange={e => setForm(f => ({ ...f, ended_at: e.target.value }))}
              className={inputClass}
            />
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
            className="w-4 h-4 rounded accent-green-500"
          />
          <span className="text-sm text-zinc-300">활성 시즌으로 지정</span>
          <span className="text-xs text-zinc-500">(기존 활성 시즌은 자동 해제)</span>
        </label>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex gap-2 justify-end pt-2">
          <Link
            href={`/admin/seasons/${id}`}
            className="text-sm px-4 py-2 rounded-lg border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors"
          >
            취소
          </Link>
          <button
            type="submit"
            disabled={saving || !form.name.trim() || !form.started_at}
            className="text-sm px-4 py-2 rounded-lg bg-zinc-100 text-zinc-900 font-semibold hover:bg-white disabled:opacity-50 transition-colors"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </form>
    </div>
  )
}
