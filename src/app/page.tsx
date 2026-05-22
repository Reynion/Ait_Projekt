'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'

export default function Home() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/login'); return }
      setLoading(false)
    })
  }, [router])

  if (loading) return null

  const cards = [
    {
      href: '/posts',
      icon: '🎵',
      title: '음악 제안',
      desc: '멤버들이 연주하고 싶은 곡을 제안하고 의견을 나눠요.',
    },
    {
      href: '/board',
      icon: '📋',
      title: '게시판',
      desc: '공지사항 등 자유롭게 소통해요.',
    },
    {
      href: '/polls',
      icon: '🗳️',
      title: '투표',
      desc: '다음 공연 연습곡을 투표로 결정해요.',
    },
    {
      href: '/schedule',
      icon: '📅',
      title: '일정',
      desc: '밴드 일정을 달력으로 한눈에 확인해요.',
    },
    {
      href: '/records',
      icon: '🎬',
      title: '기록',
      desc: '공연과 연습의 소중한 순간을 기록해요.',
    },
  ]

  return (
    <main className="flex min-h-screen flex-col bg-zinc-950">
      <Navbar />

      <section className="flex-1 max-w-2xl w-full mx-auto px-4 py-16 flex flex-col items-center gap-12">
        <div className="text-center flex flex-col gap-3">
          <h1 className="text-4xl font-bold text-white">🎸 Ait 놀이터</h1>
          <p className="text-zinc-400 text-lg">Ait의 커뮤니티 공간이에요.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
          {cards.map(card => (
            <Link
              key={card.href}
              href={card.href}
              className="bg-zinc-800 border border-zinc-700 rounded-xl p-6 flex flex-col gap-3 hover:border-zinc-500 hover:bg-zinc-750 transition-all group"
            >
              <span className="text-4xl">{card.icon}</span>
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-semibold text-white group-hover:text-white">{card.title}</h2>
                <p className="text-sm text-zinc-400 leading-relaxed">{card.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
