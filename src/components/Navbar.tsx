'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import { useTheme } from '@/components/ThemeProvider'
import { getAllReadPermissions } from '@/lib/permissions'

interface UserInfo {
  nickname: string
  avatar_url: string | null
  role: string
  isAnonymous?: boolean
}

interface Notification {
  id: number
  type: string
  message: string
  link: string
  is_read: boolean
  created_at: string
}

const NAV_ITEMS = [
  { label: '홈', href: '/' },
  { label: '음악 제안', href: '/posts' },
  { label: '게시판', href: '/board' },
  { label: '투표', href: '/polls' },
  { label: '일정', href: '/schedule' },
  { label: '기록', href: '/records' },
]

function roleBadgeClass(role: string) {
  if (role === 'admin') return 'bg-blue-500/10 border-blue-500/30 text-blue-400'
  if (role === 'former') return 'bg-amber-500/10 border-amber-500/30 text-amber-500'
  if (role === 'guest') return 'bg-zinc-600/50 border-zinc-500/30 text-zinc-400'
  return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
}

function roleLabel(role: string) {
  if (role === 'admin') return '관리자'
  if (role === 'former') return '전멤버'
  if (role === 'guest') return '방문객'
  return '멤버'
}

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [notiOpen, setNotiOpen] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [allowedSections, setAllowedSections] = useState<Record<string, boolean>>({})
  const notiRef = useRef<HTMLDivElement>(null)
  const notiRefMobile = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      setCurrentUserId(data.user.id)

      if (data.user.is_anonymous) {
        setUserInfo({ nickname: '방문객', avatar_url: null, role: 'guest', isAnonymous: true })
      } else {
        const { data: row } = await supabase
          .from('users')
          .select('nickname, avatar_url, role')
          .eq('id', data.user.id)
          .single()
        if (row) setUserInfo(row)
      }

      const perms = await getAllReadPermissions()
      setAllowedSections(perms)
    })
  }, [])

  useEffect(() => {
    if (!currentUserId) return
    const supabase = createClient()

    async function fetchNotifications() {
      // 7일 이전 알림 자동 삭제
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      await supabase.from('notifications')
        .delete()
        .eq('user_id', currentUserId!)
        .lt('created_at', sevenDaysAgo)

      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false })
        .limit(30)

      let notis = (data ?? []) as Notification[]

      // 만료된 일정 알림 추가 삭제
      const scheduleNotis = notis.filter(n => n.link.startsWith('/schedule/'))
      if (scheduleNotis.length > 0) {
        const scheduleIds = scheduleNotis
          .map(n => parseInt(n.link.split('/')[2]))
          .filter(id => !isNaN(id))

        const { data: schedules } = await supabase
          .from('schedules')
          .select('id, start_date, end_date')
          .in('id', scheduleIds)

        const today = new Date().toISOString().slice(0, 10)
        const expiredIds = new Set(
          (schedules ?? [])
            .filter(s => (s.end_date ?? s.start_date) < today)
            .map(s => s.id)
        )

        const toDelete = scheduleNotis
          .filter(n => expiredIds.has(parseInt(n.link.split('/')[2])))
          .map(n => n.id)

        if (toDelete.length > 0) {
          await supabase.from('notifications').delete().in('id', toDelete)
          notis = notis.filter(n => !toDelete.includes(n.id))
        }
      }

      setNotifications(notis)
    }

    fetchNotifications()
    const channel = supabase.channel('notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${currentUserId}` }, fetchNotifications)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [currentUserId])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node
      const insideDesktop = notiRef.current?.contains(target) ?? false
      const insideMobile = notiRefMobile.current?.contains(target) ?? false
      if (!insideDesktop && !insideMobile) setNotiOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function markAllRead() {
    if (!currentUserId) return
    const supabase = createClient()
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', currentUserId).eq('is_read', false)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  async function deleteNotification(e: React.MouseEvent, id: number) {
    e.stopPropagation()
    const supabase = createClient()
    await supabase.from('notifications').delete().eq('id', id)
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  async function deleteAllNotifications() {
    if (!currentUserId) return
    const supabase = createClient()
    await supabase.from('notifications').delete().eq('user_id', currentUserId)
    setNotifications([])
  }

  async function handleNotiClick(noti: Notification) {
    const supabase = createClient()
    if (!noti.is_read) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', noti.id)
      setNotifications(prev => prev.map(n => n.id === noti.id ? { ...n, is_read: true } : n))
    }
    setNotiOpen(false)
    router.push(noti.link)
  }

  const unreadCount = notifications.filter(n => !n.is_read).length
  const { theme } = useTheme()

  useEffect(() => { setMenuOpen(false) }, [pathname])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  const sectionKeyMap: Record<string, string> = {
    '/posts': 'posts', '/board': 'board', '/polls': 'polls',
    '/schedule': 'schedule', '/records': 'records',
  }

  const filteredNavItems = NAV_ITEMS.filter(item => {
    const key = sectionKeyMap[item.href]
    if (!key) return true // 홈 등 섹션 아닌 항목은 항상 표시
    return allowedSections[key] !== false
  })

  const allNavItems = [
    ...filteredNavItems,
    ...(userInfo?.role === 'admin' ? [{ label: '관리자', href: '/admin' }] : []),
  ]

  function NotiDropdown({ mobile = false }: { mobile?: boolean }) {
    return (
      <div className={mobile
        ? 'fixed right-2 top-14 w-[min(18rem,calc(100vw-1rem))] bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl z-50 overflow-hidden'
        : 'absolute right-0 top-full mt-2 w-80 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl z-50 overflow-hidden'
      }>
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700">
          <span className="text-sm font-semibold text-white">알림</span>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-zinc-400 hover:text-white transition-colors">
                모두 읽음
              </button>
            )}
            {notifications.length > 0 && (
              <button onClick={deleteAllNotifications} className="text-xs text-red-400 hover:text-red-300 transition-colors">
                전체 삭제
              </button>
            )}
          </div>
        </div>
        <ul className={mobile ? 'max-h-72 overflow-y-auto' : 'max-h-80 overflow-y-auto'}>
          {notifications.length === 0 && (
            <li className="text-center text-zinc-500 text-sm py-8">알림이 없습니다.</li>
          )}
          {notifications.map(noti => (
            <li
              key={noti.id}
              className={`flex items-start border-b border-zinc-700 last:border-0 hover:bg-zinc-700 transition-colors ${!noti.is_read ? 'bg-zinc-700/50' : ''}`}
            >
              <button
                onClick={() => handleNotiClick(noti)}
                className="flex-1 text-left px-4 py-3 flex gap-3 items-start min-w-0"
              >
                <span className="text-lg flex-shrink-0">
                  {noti.type === 'comment' ? '💬' : noti.type === 'reply' ? '↩' : noti.type === 'mention' ? '@' : noti.type === 'new_poll' ? '🗳' : '📌'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-200 leading-snug">{noti.message}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{new Date(noti.created_at).toLocaleDateString('ko-KR')}</p>
                </div>
                {!noti.is_read && <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />}
              </button>
              <button
                onClick={e => deleteNotification(e, noti.id)}
                className="flex-shrink-0 px-3 py-3 text-zinc-600 hover:text-red-400 transition-colors"
                aria-label="알림 삭제"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-700 bg-zinc-900">
      <div className="flex items-center justify-between px-4 py-3">
        {/* 로고 */}
        <Link href="/" className="flex-shrink-0">
          <Image
            src={theme === 'light' ? '/logo_wtt.png' : '/logo_bkt.png'}
            alt="Ait"
            height={32}
            width={120}
            className="h-8 w-auto object-contain"
            priority
          />
        </Link>

        {/* 데스크톱 네비게이션 */}
        <nav className="hidden md:flex items-center gap-1">
          {filteredNavItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isActive(item.href)
                  ? 'bg-zinc-700 text-white'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              {item.label}
            </Link>
          ))}
          {userInfo?.role === 'admin' && (
            <Link
              href="/admin"
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                isActive('/admin')
                  ? 'bg-zinc-700 text-white border-zinc-500'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 border-zinc-700 hover:border-zinc-500'
              }`}
            >
              관리자
            </Link>
          )}
        </nav>

        {/* 데스크톱 우측 */}
        <div className="hidden md:flex items-center gap-3">
          <div className="relative" ref={notiRef}>
            <button
              onClick={() => setNotiOpen(o => !o)}
              className="relative p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-[#ffffff] text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {notiOpen && <NotiDropdown />}
          </div>
          {userInfo && (
            <Link href={userInfo.isAnonymous ? '/login' : '/profile'} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="relative w-8 h-8 rounded-full overflow-hidden bg-zinc-700 border border-zinc-600 flex-shrink-0">
                {userInfo.avatar_url ? (
                  <Image src={userInfo.avatar_url} alt="프로필" fill className="object-cover" unoptimized />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm text-zinc-400">👤</div>
                )}
              </div>
              <span className="text-sm text-zinc-200">{userInfo.nickname}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full border ${roleBadgeClass(userInfo.role)}`}>
                {roleLabel(userInfo.role)}
              </span>
            </Link>
          )}
          <button
            onClick={handleLogout}
            className="text-sm text-zinc-500 hover:text-zinc-200 border border-zinc-700 hover:border-zinc-500 px-3 py-1.5 rounded-lg transition-colors"
          >
            로그아웃
          </button>
        </div>

        {/* 모바일 우측: 알림 + 프로필 + 햄버거 */}
        <div className="flex md:hidden items-center gap-2">
          <div className="relative" ref={notiRefMobile}>
            <button
              onClick={() => setNotiOpen(o => !o)}
              className="relative p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-[#ffffff] text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {notiOpen && <NotiDropdown mobile />}
          </div>
          {userInfo && (
            <Link href={userInfo.isAnonymous ? '/login' : '/profile'} className="flex items-center gap-1.5">
              <div className="relative w-8 h-8 rounded-full overflow-hidden bg-zinc-700 border border-zinc-600 flex-shrink-0">
                {userInfo.avatar_url ? (
                  <Image src={userInfo.avatar_url} alt="프로필" fill className="object-cover" unoptimized />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm text-zinc-400">👤</div>
                )}
              </div>
              <span className={`text-xs px-1.5 py-0.5 rounded-full border ${roleBadgeClass(userInfo.role)}`}>
                {roleLabel(userInfo.role)}
              </span>
            </Link>
          )}
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            aria-label="메뉴"
          >
            {menuOpen ? (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* 모바일 드롭다운 메뉴 */}
      {menuOpen && (
        <nav className="md:hidden border-t border-zinc-700 bg-zinc-900 px-4 py-3 flex flex-col gap-1">
          {allNavItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive(item.href)
                  ? 'bg-zinc-700 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              {item.label}
            </Link>
          ))}
          <div className="border-t border-zinc-700 mt-2 pt-2">
            {userInfo && (
              <p className="px-3 py-1 text-xs text-zinc-500 mb-1">{userInfo.nickname}</p>
            )}
            <button
              onClick={handleLogout}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-colors"
            >
              로그아웃
            </button>
          </div>
        </nav>
      )}
    </header>
  )
}
