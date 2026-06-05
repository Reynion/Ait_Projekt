'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

interface Season {
  id: number
  name: string
  description: string | null
  started_at: string
  ended_at: string | null
  is_active: boolean
  created_at: string
  postCount?: number
}

export default function AdminSeasons() {
  const [seasons, setSeasons] = useState<Season[]>([])
  const [loading, setLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<number | null>(null)

  async function fetchSeasons() {
    const supabase = createClient()
    const { data: seasonData } = await supabase
      .from('seasons')
      .select('*')
      .order('created_at', { ascending: false })

    const { data: postData } = await supabase
      .from('posts')
      .select('season_id')
      .is('deleted_at', null)

    const enriched = (seasonData ?? []).map(s => ({
      ...s,
      postCount: (postData ?? []).filter(p => p.season_id === s.id).length,
    }))

    setSeasons(enriched)
    setLoading(false)
  }

  useEffect(() => { fetchSeasons() }, [])

  async function handleToggleActive(season: Season) {
    setTogglingId(season.id)
    const supabase = createClient()

    if (!season.is_active) {
      await supabase.from('seasons').update({ is_active: false }).neq('id', season.id)
      await supabase.from('seasons').update({ is_active: true }).eq('id', season.id)
    } else {
      await supabase.from('seasons').update({ is_active: false }).eq('id', season.id)
    }

    await fetchSeasons()
    setTogglingId(null)
  }

  async function handleDelete(season: Season) {
    if (!confirm(`"${season.name}" 시즌을 삭제하시겠습니까?\n해당 시즌에 속한 글은 미분류로 변경됩니다.`)) return
    const supabase = createClient()
    await supabase.from('posts').update({ season_id: null }).eq('season_id', season.id)
    await supabase.from('seasons').delete().eq('id', season.id)
    setSeasons(prev => prev.filter(s => s.id !== season.id))
  }

  if (loading) return <p className="text-zinc-400">불러오는 중...</p>

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">시즌 관리</h1>
        <Link
          href="/admin/seasons/new"
          className="text-sm px-4 py-2 rounded-lg bg-zinc-100 text-zinc-900 font-semibold hover:bg-white transition-colors"
        >
          + 시즌 추가
        </Link>
      </div>

      {seasons.length === 0 && (
        <p className="text-zinc-500 text-center py-16 bg-zinc-800 rounded-xl border border-zinc-700">
          등록된 시즌이 없습니다.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {seasons.map(season => (
          <div key={season.id} className="bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden hover:border-zinc-600 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-zinc-100">{season.name}</span>
                  {season.is_active && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/15 border border-green-500/30 text-green-400">
                      활성
                    </span>
                  )}
                  <span className="text-xs text-zinc-500">
                    글 {season.postCount}개
                  </span>
                </div>
                {season.description && (
                  <p className="text-sm text-zinc-400 mt-0.5 truncate">{season.description}</p>
                )}
                <p className="text-xs text-zinc-500 mt-1">
                  {season.started_at} ~ {season.ended_at ?? '진행중'}
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Link
                  href={`/admin/seasons/${season.id}`}
                  className="text-xs px-3 py-1.5 rounded-lg border border-zinc-600 hover:border-zinc-400 text-zinc-400 hover:text-white transition-colors"
                >
                  상세
                </Link>
                <Link
                  href={`/admin/seasons/${season.id}/edit`}
                  className="text-xs px-3 py-1.5 rounded-lg border border-zinc-600 hover:border-zinc-400 text-zinc-400 hover:text-white transition-colors"
                >
                  수정
                </Link>
                <button
                  onClick={() => handleToggleActive(season)}
                  disabled={togglingId === season.id}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
                    season.is_active
                      ? 'border-green-600/50 text-green-400 hover:border-green-500 hover:text-green-300'
                      : 'border-zinc-600 text-zinc-400 hover:border-green-600/50 hover:text-green-400'
                  }`}
                >
                  {season.is_active ? '활성 해제' : '활성 지정'}
                </button>
                <button
                  onClick={() => handleDelete(season)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-zinc-700 hover:border-red-500/50 text-zinc-500 hover:text-red-400 transition-colors"
                >
                  삭제
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
