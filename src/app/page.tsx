'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import { useFCMToken } from '@/hooks/useFCMToken'
import { useLastSeen } from '@/hooks/useLastSeen'
import NameRequiredModal from '@/components/NameRequiredModal'
import { getAllReadPermissions } from '@/lib/permissions'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface RecentItem {
  id: number
  title: string
  created_at?: string
  start_date?: string
  is_active?: boolean
  nickname?: string
}

interface Notice {
  id: number
  title: string
}

export default function Home() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [installing, setInstalling] = useState(false)
  const [showGuide, setShowGuide] = useState(false)

  const [notices, setNotices] = useState<Notice[]>([])
  const [recentPosts, setRecentPosts] = useState<RecentItem[]>([])
  const [recentBoard, setRecentBoard] = useState<RecentItem[]>([])
  const [recentPolls, setRecentPolls] = useState<RecentItem[]>([])
  const [recentSchedules, setRecentSchedules] = useState<RecentItem[]>([])
  const [recentRecords, setRecentRecords] = useState<RecentItem[]>([])
  const [hasActivePoll, setHasActivePoll] = useState(false)
  const [showNameModal, setShowNameModal] = useState(false)
  const [allowedSections, setAllowedSections] = useState<Record<string, boolean>>({ posts: true, board: true, polls: true, schedule: true, records: true })

  useFCMToken(userId)
  useLastSeen(userId)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/login'); return }
      setUserId(data.user.id)
      if (!data.user.is_anonymous) {
        const { data: userRow, error: nameError } = await supabase.from('users').select('name').eq('id', data.user.id).maybeSingle()
        if (!nameError && !userRow?.name) setShowNameModal(true)
      }

      const perms = await getAllReadPermissions()
      setAllowedSections(perms)

      const [
        { data: noticeData },
        { data: postsData },
        { data: boardData },
        { data: pollsData },
        { count: activePollCount },
        { data: schedulesData },
        { data: recordsData },
      ] = await Promise.all([
        supabase.from('board_posts').select('id, title').eq('is_notice', true).is('deleted_at', null).order('created_at', { ascending: false }).limit(3),
        supabase.from('music_posts').select('id, title, created_at, users(nickname)').is('deleted_at', null).order('created_at', { ascending: false }).limit(3),
        supabase.from('board_posts').select('id, title, created_at, users(nickname)').eq('is_notice', false).is('deleted_at', null).order('created_at', { ascending: false }).limit(3),
        supabase.from('polls').select('id, title, is_active').is('deleted_at', null).order('created_at', { ascending: false }).limit(3),
        supabase.from('polls').select('id', { count: 'exact', head: true }).eq('is_active', true).is('deleted_at', null),
        supabase.from('schedules').select('id, title, start_date').is('deleted_at', null).order('start_date', { ascending: true }).gte('start_date', new Date().toISOString().slice(0, 10)).limit(3),
        supabase.from('record_posts').select('id, title, created_at, users(nickname)').is('deleted_at', null).order('created_at', { ascending: false }).limit(3),
      ])

      setNotices((noticeData ?? []) as Notice[])
      setRecentPosts(((postsData ?? []) as unknown[]).map((p: unknown) => { const x = p as { id: number; title: string; created_at: string; users: { nickname: string } | null }; return { id: x.id, title: x.title, created_at: x.created_at, nickname: x.users?.nickname } }))
      setRecentBoard(((boardData ?? []) as unknown[]).map((p: unknown) => { const x = p as { id: number; title: string; created_at: string; users: { nickname: string } | null }; return { id: x.id, title: x.title, created_at: x.created_at, nickname: x.users?.nickname } }))
      setRecentPolls((pollsData ?? []) as RecentItem[])
      setRecentSchedules(((schedulesData ?? []) as unknown[]).map((p: unknown) => { const x = p as { id: number; title: string; start_date: string }; return { id: x.id, title: x.title, start_date: x.start_date } }))
      setRecentRecords(((recordsData ?? []) as unknown[]).map((p: unknown) => { const x = p as { id: number; title: string; created_at: string; users: { nickname: string } | null }; return { id: x.id, title: x.title, created_at: x.created_at, nickname: x.users?.nickname } }))
      setHasActivePoll((activePollCount ?? 0) > 0)
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
      return ['하단 공유 버튼(□↑)을 탭해요.', '"홈 화면에 추가"를 선택해요.', '"추가"를 탭하면 완료!']
    }
    return ['브라우저 우측 상단 메뉴(⋮)를 탭해요.', '"홈 화면에 추가" 또는 "앱 설치"를 선택해요.', '확인하면 완료!']
  }

  if (loading) return null

  const allCards = [
    { href: '/posts', section: 'posts', icon: '🎵', title: '음악 제안', desc: '멤버들이 연주하고 싶은 곡을 제안하고 의견을 나눠요.' },
    { href: '/board', section: 'board', icon: '📋', title: '게시판', desc: '공지사항 등 자유롭게 소통해요.' },
    { href: '/polls', section: 'polls', icon: '🗳️', title: '투표', desc: '다음 공연 연습곡을 투표로 결정해요.' },
    { href: '/schedule', section: 'schedule', icon: '📅', title: '일정', desc: '밴드 일정을 달력으로 한눈에 확인해요.' },
    { href: '/records', section: 'records', icon: '🎬', title: '기록', desc: '공연과 연습의 소중한 순간을 기록해요.' },
  ]
  const cards = allCards.filter(c => allowedSections[c.section] !== false)

  const allRecentSections = [
    {
      section: 'posts', title: '음악 제안', href: '/posts', items: recentPosts,
      itemHref: (id: number) => `/posts/${id}`,
      meta: (item: RecentItem) => item.nickname ?? '',
    },
    {
      section: 'board', title: '게시판', href: '/board', items: recentBoard,
      itemHref: (id: number) => `/board/${id}`,
      meta: (item: RecentItem) => item.nickname ?? '',
    },
    {
      section: 'polls', title: '투표', href: '/polls', items: recentPolls,
      itemHref: (id: number) => `/polls/${id}`,
      meta: (item: RecentItem) => item.is_active ? '진행중' : '종료',
    },
    {
      section: 'schedule', title: '다가오는 일정', href: '/schedule', items: recentSchedules,
      itemHref: () => `/schedule`,
      meta: (item: RecentItem) => item.start_date ? new Date(item.start_date + 'T00:00:00').toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }) : '',
    },
    {
      section: 'records', title: '기록', href: '/records', items: recentRecords,
      itemHref: (id: number) => `/records/${id}`,
      meta: (item: RecentItem) => item.nickname ?? '',
    },
  ]
  const recentSections = allRecentSections.filter(s => allowedSections[s.section] !== false)

  return (
    <main className="flex min-h-screen flex-col bg-zinc-950">
      {showNameModal && <NameRequiredModal onClose={() => setShowNameModal(false)} />}
      <Navbar />

      <section className="flex-1 max-w-2xl w-full mx-auto px-4 py-10 flex flex-col items-center gap-8">
        <div className="text-center flex flex-col gap-3">
          <h1 className="text-4xl font-bold text-white">🎸 Ait 놀이터</h1>
          <p className="text-zinc-400 text-lg">Ait의 커뮤니티 공간이에요.</p>
        </div>

        {/* 공지 배너 */}
        {notices.length > 0 && (
          <div className="w-full flex flex-col gap-2">
            {notices.map(notice => (
              <Link
                key={notice.id}
                href={`/board/${notice.id}`}
                className="flex items-center gap-3 bg-amber-950/30 border border-amber-700/40 rounded-xl px-4 py-3 hover:border-amber-600/60 transition-colors"
              >
                <span className="text-amber-500 flex-shrink-0 text-sm">📌</span>
                <span className="text-sm text-amber-200 truncate">{notice.title}</span>
              </Link>
            ))}
          </div>
        )}

        {/* 카드 6개 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
          {cards.map(card => {
            const isRainbow = card.href === '/polls' && hasActivePoll
            const inner = (
              <Link
                key={card.href}
                href={card.href}
                className={`flex flex-col gap-3 p-6 transition-all group ${isRainbow ? 'bg-zinc-800 rounded-[10px] relative z-10 hover:bg-zinc-700/80' : 'bg-zinc-800 border border-zinc-700 rounded-xl hover:border-zinc-500 hover:bg-zinc-750'}`}
              >
                <span className="text-4xl">{card.icon}</span>
                <div className="flex flex-col gap-1">
                  <h2 className="text-lg font-semibold text-white">{card.title}</h2>
                  <p className="text-sm text-zinc-400 leading-relaxed">{card.desc}</p>
                </div>
              </Link>
            )
            if (isRainbow) {
              return (
                <div key={card.href} className="relative p-[2px] rounded-xl overflow-hidden">
                  <div className="absolute inset-[-50%] bg-[conic-gradient(from_0deg,#ff0000,#ff7700,#ffff00,#00ff00,#0088ff,#8800ff,#ff0000)] [animation:rainbow-spin_3s_linear_infinite]" />
                  {inner}
                </div>
              )
            }
            return inner
          })}

          {!isInstalled && (
            <div className="flex flex-col gap-0">
              <button
                onClick={handleInstall}
                disabled={installing}
                className="bg-zinc-800 border border-zinc-700 rounded-xl p-6 flex flex-col gap-3 hover:border-zinc-500 transition-all text-left disabled:opacity-50 disabled:cursor-default w-full"
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

        {/* 최근 게시물 섹션 */}
        <div className="w-full flex flex-col gap-4">
          <h2 className="text-base font-semibold text-zinc-300">최근 활동</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {recentSections.map(section => (
              <div key={section.href} className="bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700">
                  <span className="text-sm font-semibold text-zinc-200">{section.title}</span>
                  <Link href={section.href} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">더보기 →</Link>
                </div>
                <div className="flex flex-col">
                  {section.items.length === 0 ? (
                    <p className="text-xs text-zinc-600 px-4 py-3">등록된 내용이 없습니다.</p>
                  ) : (
                    section.items.map(item => (
                      <Link
                        key={item.id}
                        href={section.itemHref(item.id)}
                        className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-zinc-700/50 transition-colors border-b border-zinc-700/50 last:border-0"
                      >
                        <span className="text-sm text-zinc-200 truncate">{item.title}</span>
                        <span className="text-xs text-zinc-500 flex-shrink-0">{section.meta(item)}</span>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
