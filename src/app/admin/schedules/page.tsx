'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

interface Schedule {
  id: number
  title: string
  description: string | null
  start_date: string
  start_time: string | null
  end_date: string | null
  type: 'official' | 'personal'
  location: string | null
  created_by: string
  users: { nickname: string } | null
}

export default function AdminSchedules() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchSchedules() {
    const supabase = createClient()
    const { data } = await supabase
      .from('schedules')
      .select('*, users(nickname)')
      .is('deleted_at', null)
      .order('start_date', { ascending: false })
    if (data) setSchedules(data as unknown as Schedule[])
    setLoading(false)
  }

  useEffect(() => { fetchSchedules() }, [])

  async function handleDelete(id: number) {
    if (!confirm('일정을 삭제하시겠습니까?')) return
    const supabase = createClient()
    await supabase.from('schedules').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    setSchedules(prev => prev.filter(s => s.id !== id))
  }

  if (loading) return <p className="text-zinc-400">불러오는 중...</p>

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-white">일정 관리</h1>
        <Link
          href="/schedule/new"
          className="bg-zinc-100 text-zinc-900 text-sm px-4 py-2 rounded-lg hover:bg-white transition-colors font-semibold"
        >
          + 일정 추가
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        {schedules.length === 0 && (
          <div className="text-center text-zinc-500 py-10 bg-zinc-800 border border-zinc-700 rounded-xl">
            등록된 일정이 없습니다.
          </div>
        )}
        {schedules.map((schedule) => (
          <div
            key={schedule.id}
            className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 hover:border-zinc-600 transition-colors"
          >
            <div className="flex flex-col gap-1 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium border flex-shrink-0 ${
                  schedule.type === 'official'
                    ? 'bg-blue-500/10 border-blue-500/40 text-blue-400'
                    : 'bg-green-500/10 border-green-500/40 text-green-400'
                }`}>
                  {schedule.type === 'official' ? '공식' : '개인'}
                </span>
                <span className="font-semibold text-zinc-100 truncate">{schedule.title}</span>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500">
                <span>📅 {new Date(schedule.start_date).toLocaleDateString('ko-KR')}{schedule.start_time ? ` ${schedule.start_time.slice(0, 5)}` : ''}</span>
                {schedule.end_date && <span>~ {new Date(schedule.end_date).toLocaleDateString('ko-KR')}</span>}
                {schedule.location && <span>📍 {schedule.location}</span>}
                <span>작성: {schedule.users?.nickname ?? '알 수 없음'}</span>
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Link
                href={`/schedule/${schedule.id}/edit`}
                className="text-xs px-3 py-1.5 rounded-lg border border-zinc-600 hover:border-zinc-400 text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                수정
              </Link>
              <button
                onClick={() => handleDelete(schedule.id)}
                className="text-xs px-3 py-1.5 rounded-lg border border-zinc-700 hover:border-red-500/50 text-zinc-500 hover:text-red-400 transition-colors"
              >
                삭제
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
