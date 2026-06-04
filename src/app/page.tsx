'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import { useFCMToken } from '@/hooks/useFCMToken'
import { useLastSeen } from '@/hooks/useLastSeen'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function Home() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [installing, setInstalling] = useState(false)
  const [showGuide, setShowGuide] = useState(false)

  useFCMToken(userId)
  useLastSeen(userId)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/login'); return }
      setUserId(data.user.id)
      setLoading(false)
    })
  }, [router])

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
      navigator.serviceWorker.register('/firebase-messaging-sw.js').catch(() => {})
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function handleInstall() {
    if (installPrompt) {
      setInstalling(true)
      await installPrompt.prompt()
      const { outcome } = await installPrompt.userChoice
      if (outcome === 'accepted') setIsInstalled(true)
      setInstallPrompt(null)
      setInstalling(false)
    } else {
      setShowGuide(g => !g)
    }
  }

  function getGuideSteps() {
    const ua = navigator.userAgent
    const isIOS = /iPad|iPhone|iPod/.test(ua)
    if (isIOS) {
      return [
        '하단 공유 버튼(□↑)을 탭해요.',
        '"홈 화면에 추가"를 선택해요.',
        '"추가"를 탭하면 완료!',
      ]
    }
    return [
      '브라우저 우측 상단 메뉴(⋮)를 탭해요.',
      '"홈 화면에 추가" 또는 "앱 설치"를 선택해요.',
      '확인하면 완료!',
    ]
  }

  if (loading) return null

  const cards = [
    { href: '/posts', icon: '🎵', title: '음악 제안', desc: '멤버들이 연주하고 싶은 곡을 제안하고 의견을 나눠요.' },
    { href: '/board', icon: '📋', title: '게시판', desc: '공지사항 등 자유롭게 소통해요.' },
    { href: '/polls', icon: '🗳️', title: '투표', desc: '다음 공연 연습곡을 투표로 결정해요.' },
    { href: '/schedule', icon: '📅', title: '일정', desc: '밴드 일정을 달력으로 한눈에 확인해요.' },
    { href: '/records', icon: '🎬', title: '기록', desc: '공연과 연습의 소중한 순간을 기록해요.' },
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

          {!isInstalled && (
            <div className="flex flex-col gap-0">
              <button
                onClick={handleInstall}
                disabled={installing}
                className="bg-zinc-800 border border-zinc-700 rounded-xl p-6 flex flex-col gap-3 hover:border-zinc-500 transition-all text-left disabled:opacity-50 disabled:cursor-default"
              >
                <span className="text-4xl">📲</span>
                <div className="flex flex-col gap-1">
                  <h2 className="text-lg font-semibold text-white">
                    {installing ? '설치 중...' : '앱 추가하기'}
                  </h2>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    홈 화면에 추가하면 앱처럼 사용하고 푸시 알림을 받을 수 있어요.
                  </p>
                </div>
              </button>

              {showGuide && (
                <div className="bg-zinc-800 border border-t-0 border-zinc-700 rounded-b-xl px-6 py-4 flex flex-col gap-2">
                  {getGuideSteps().map((step, i) => (
                    <p key={i} className="text-sm text-zinc-300 flex gap-2">
                      <span className="text-zinc-500 flex-shrink-0">{i + 1}.</span>
                      {step}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
