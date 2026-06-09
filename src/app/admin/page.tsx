'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

interface Stats {
  users: number
  posts: number
  postsCurrentSeason: number | null
  board: number
  polls: number
  schedules: number
  records: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ users: 0, posts: 0, postsCurrentSeason: null, board: 0, polls: 0, schedules: 0, records: 0 })

  useEffect(() => {
    const supabase = createClient()
    async function fetchStats() {
      const today = new Date().toISOString().slice(0, 10)
      const { data: activeSeason } = await supabase.from('seasons').select('id').eq('is_active', true).maybeSingle()

      const [u, p, b, po, s, r] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact', head: true }),
        supabase.from('music_posts').select('id', { count: 'exact', head: true }).is('deleted_at', null),
        supabase.from('board_posts').select('id', { count: 'exact', head: true }).is('deleted_at', null),
        supabase.from('polls').select('id', { count: 'exact', head: true }).is('deleted_at', null),
        supabase.from('schedules').select('id', { count: 'exact', head: true }).is('deleted_at', null).gte('start_date', today),
        supabase.from('record_posts').select('id', { count: 'exact', head: true }).is('deleted_at', null),
      ])

      let postsCurrentSeason: number | null = null
      if (activeSeason) {
        const { count } = await supabase.from('music_posts').select('id', { count: 'exact', head: true }).is('deleted_at', null).eq('season_id', activeSeason.id)
        postsCurrentSeason = count ?? 0
      }

      setStats({ users: u.count ?? 0, posts: p.count ?? 0, postsCurrentSeason, board: b.count ?? 0, polls: po.count ?? 0, schedules: s.count ?? 0, records: r.count ?? 0 })
    }
    fetchStats()
  }, [])

  const cards = [
    { label: '전체 계정', value: stats.users, href: '/admin/accounts', icon: '👥' },
    { label: '음악 게시글', value: stats.posts, seasonValue: stats.postsCurrentSeason, href: '/admin/posts', icon: '🎵' },
    { label: '게시판 글', value: stats.board, href: '/admin/board', icon: '📋' },
    { label: '투표 이벤트', value: stats.polls, href: '/admin/polls', icon: '🗳️' },
    { label: '남은 일정', value: stats.schedules, href: '/admin/schedules', icon: '📅' },
    { label: '기록', value: stats.records, href: '/admin/records', icon: '🎬' },
  ]

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-bold text-white">대시보드</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {cards.map(card => (
          <Link
            key={card.label}
            href={card.href}
            className="bg-zinc-800 border border-zinc-700 rounded-xl p-6 hover:border-zinc-500 transition-all"
          >
            <div className="text-2xl mb-3">{card.icon}</div>
            <p className="text-sm text-zinc-400 mb-1">{card.label}</p>
            {'seasonValue' in card && card.seasonValue !== null ? (
              <div className="flex items-baseline gap-1">
                <p className="text-3xl font-bold text-white">{card.seasonValue}</p>
                <p className="text-base text-zinc-500">/ {card.value}</p>
              </div>
            ) : (
              <p className="text-3xl font-bold text-white">{card.value}</p>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}
