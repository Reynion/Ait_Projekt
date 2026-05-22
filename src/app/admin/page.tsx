'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

interface Stats {
  users: number
  posts: number
  polls: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ users: 0, posts: 0, polls: 0 })

  useEffect(() => {
    const supabase = createClient()
    async function fetchStats() {
      const [u, p, po] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact', head: true }),
        supabase.from('posts').select('id', { count: 'exact', head: true }),
        supabase.from('polls').select('id', { count: 'exact', head: true }),
      ])
      setStats({ users: u.count ?? 0, posts: p.count ?? 0, polls: po.count ?? 0 })
    }
    fetchStats()
  }, [])

  const cards = [
    { label: '전체 계정', value: stats.users, href: '/admin/accounts', icon: '👥' },
    { label: '음악 게시글', value: stats.posts, href: '/admin/posts', icon: '🎵' },
    { label: '투표 이벤트', value: stats.polls, href: '/admin/polls', icon: '🗳️' },
  ]

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-bold text-white">대시보드</h1>
      <div className="grid grid-cols-3 gap-4">
        {cards.map(card => (
          <Link
            key={card.label}
            href={card.href}
            className="bg-zinc-800 border border-zinc-700 rounded-xl p-6 hover:border-zinc-500 transition-all"
          >
            <div className="text-2xl mb-3">{card.icon}</div>
            <p className="text-sm text-zinc-400 mb-1">{card.label}</p>
            <p className="text-3xl font-bold text-white">{card.value}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
