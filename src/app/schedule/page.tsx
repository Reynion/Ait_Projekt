'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Link from 'next/link'

interface Schedule {
  id: number
  title: string
  description: string | null
  start_date: string
  start_time: string | null
  end_date: string | null
  end_time: string | null
  type: 'official' | 'personal'
  location: string | null
  created_by: string
  users: { nickname: string } | null
}

const DAYS = ['일', '월', '화', '수', '목', '금', '토']

function toLocalDateStr(date: Date) {
  return date.toISOString().slice(0, 10)
}

function isBetween(dateStr: string, startStr: string, endStr: string | null) {
  if (!endStr) return dateStr === startStr
  return dateStr >= startStr && dateStr <= endStr
}

export default function SchedulePage() {
  const router = useRouter()
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const [today] = useState(() => toLocalDateStr(new Date()))
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(() => toLocalDateStr(new Date()))

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/login'); return }
      setCurrentUserId(data.user.id)
      const { data: row } = await supabase.from('users').select('role').eq('id', data.user.id).single()
      if (row?.role === 'admin') setIsAdmin(true)
      await fetchSchedules()
      setLoading(false)
    })
  }, [router])

  async function fetchSchedules() {
    const supabase = createClient()
    const { data } = await supabase
      .from('schedules')
      .select('*, users(nickname)')
      .is('deleted_at', null)
      .order('start_date', { ascending: true })
    if (data) setSchedules(data as unknown as Schedule[])
  }

  async function handleDelete(id: number) {
    if (!confirm('일정을 삭제할까요?')) return
    const supabase = createClient()
    const { error } = await supabase.from('schedules').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    if (error) { alert('삭제에 실패했습니다.'); return }
    setSchedules(prev => prev.filter(s => s.id !== id))
  }

  // 달력 계산
  const firstDay = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  function getDateStr(day: number) {
    return `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  function getSchedulesForDate(dateStr: string) {
    return schedules.filter(s => isBetween(dateStr, s.start_date, s.end_date))
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  const selectedSchedules = selectedDate ? getSchedulesForDate(selectedDate) : []

  if (loading) return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950">
      <p className="text-zinc-400">불러오는 중...</p>
    </main>
  )

  return (
    <main className="flex min-h-screen flex-col bg-zinc-950">
      <Navbar />

      <div className="flex flex-col lg:flex-row flex-1 gap-0 max-w-7xl w-full mx-auto px-4 py-6">
        {/* 달력 */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* 헤더 */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <button onClick={prevMonth} className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">‹</button>
              <h2 className="text-lg sm:text-xl font-bold text-white">{viewYear}년 {viewMonth + 1}월</h2>
              <button onClick={nextMonth} className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">›</button>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3 text-xs text-zinc-400">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span>공식</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block"></span>개인</span>
              </div>
              <Link
                href={`/schedule/new${selectedDate ? `?date=${selectedDate}` : ''}`}
                className="bg-zinc-700 border border-zinc-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-zinc-600 hover:border-zinc-500 transition-colors whitespace-nowrap"
              >
                + 일정 추가
              </Link>
            </div>
          </div>

          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map((d, i) => (
              <div key={d} className={`text-center text-xs font-semibold py-2 ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-zinc-400'}`}>
                {d}
              </div>
            ))}
          </div>

          {/* 날짜 그리드 */}
          <div className="grid grid-cols-7 gap-px bg-zinc-500 rounded-xl overflow-hidden border border-zinc-500">
            {cells.map((day, idx) => {
              if (!day) return <div key={idx} className="bg-zinc-900 min-h-[90px]" />
              const dateStr = getDateStr(day)
              const daySchedules = getSchedulesForDate(dateStr)
              const isToday = dateStr === today
              const isSelected = dateStr === selectedDate
              const dow = idx % 7

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`bg-zinc-900 min-h-[60px] sm:min-h-[90px] p-1 sm:p-1.5 cursor-pointer transition-colors hover:bg-zinc-800 ${isSelected ? 'ring-2 ring-inset ring-zinc-400' : ''}`}
                >
                  <div className={`text-xs font-semibold mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                    isToday ? 'bg-white text-zinc-900' : dow === 0 ? 'text-red-400' : dow === 6 ? 'text-blue-400' : 'text-zinc-300'
                  }`}>
                    {day}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {daySchedules.slice(0, 2).map(s => (
                      <div
                        key={s.id}
                        className={`text-xs px-1.5 py-0.5 rounded truncate ${
                          s.type === 'official'
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            : 'bg-green-500/20 text-green-600 border border-green-500/30'
                        }`}
                      >
                        {s.title}
                      </div>
                    ))}
                    {daySchedules.length > 2 && (
                      <div className="text-xs text-zinc-500 px-1">+{daySchedules.length - 2}개</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 사이드 패널 */}
        <div className="w-full lg:w-72 lg:flex-shrink-0 lg:ml-5 mt-4 lg:mt-0">
          <div className="sticky top-20 bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-700 flex items-center justify-between">
              <h3 className="font-semibold text-white text-sm">
                {selectedDate
                  ? `${parseInt(selectedDate.slice(5, 7))}월 ${parseInt(selectedDate.slice(8, 10))}일`
                  : '날짜 선택'}
              </h3>
              {selectedDate && (
                <Link
                  href={`/schedule/new?date=${selectedDate}`}
                  className="text-xs text-zinc-400 hover:text-white transition-colors"
                >
                  + 추가
                </Link>
              )}
            </div>

            <div className="p-3 flex flex-col gap-2 max-h-64 lg:max-h-[calc(100vh-200px)] overflow-y-auto">
              {!selectedDate && (
                <p className="text-xs text-zinc-500 text-center py-6">날짜를 클릭하세요</p>
              )}
              {selectedDate && selectedSchedules.length === 0 && (
                <p className="text-xs text-zinc-500 text-center py-6">일정이 없습니다</p>
              )}
              {selectedSchedules.map(s => {
                const canEdit = isAdmin || s.created_by === currentUserId
                return (
                  <div
                    key={s.id}
                    className={`rounded-lg p-3 border ${
                      s.type === 'official'
                        ? 'bg-blue-500/10 border-blue-500/30'
                        : 'bg-green-500/10 border-green-500/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <p className="text-sm font-semibold text-white leading-tight">{s.title}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${
                        s.type === 'official' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-600'
                      }`}>
                        {s.type === 'official' ? '공식' : '개인'}
                      </span>
                    </div>
                    {s.location && <p className="text-xs text-zinc-400 mb-1">📍 {s.location}</p>}
                    {s.start_time && (
                      <p className="text-xs text-zinc-400 mb-1">
                        🕐 {s.start_time.slice(0, 5)}{s.end_time ? ` ~ ${s.end_time.slice(0, 5)}` : ''}
                      </p>
                    )}
                    {s.end_date && s.end_date !== s.start_date && (
                      <p className="text-xs text-zinc-500 mb-1">
                        ~ {parseInt(s.end_date.slice(5, 7))}월 {parseInt(s.end_date.slice(8, 10))}일{s.end_time ? ` ${s.end_time.slice(0, 5)}` : ''}
                      </p>
                    )}
                    {s.description && <p className="text-xs text-zinc-300 mb-1">{s.description}</p>}
                    <p className="text-xs text-zinc-500">{s.users?.nickname}</p>
                    {canEdit && (
                      <div className="flex gap-2 mt-2 pt-2 border-t border-zinc-700">
                        <Link
                          href={`/schedule/${s.id}/edit`}
                          className="text-xs text-zinc-400 hover:text-white transition-colors"
                        >
                          수정
                        </Link>
                        <button
                          onClick={() => handleDelete(s.id)}
                          className="text-xs text-zinc-400 hover:text-red-400 transition-colors"
                        >
                          삭제
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
