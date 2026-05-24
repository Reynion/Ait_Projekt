'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'

interface UserInfo {
  nickname: string
  avatar_url: string | null
  role: string
}

const NAV_ITEMS = [
  { label: '홈', href: '/' },
  { label: '음악 제안', href: '/posts' },
  { label: '게시판', href: '/board' },
  { label: '투표', href: '/polls' },
  { label: '일정', href: '/schedule' },
  { label: '기록', href: '/records' },
]

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      const { data: row } = await supabase
        .from('users')
        .select('nickname, avatar_url, role')
        .eq('id', data.user.id)
        .single()
      if (row) setUserInfo(row)
    })
  }, [])

  // pathname 바뀌면 메뉴 닫기
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

  const allNavItems = [
    ...NAV_ITEMS,
    ...(userInfo?.role === 'admin' ? [{ label: '관리자', href: '/admin' }] : []),
  ]

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-700 bg-zinc-900">
      <div className="flex items-center justify-between px-4 py-3">
        {/* 로고 */}
        <Link href="/" className="text-lg font-bold text-white flex-shrink-0">🎸 Ait</Link>

        {/* 데스크톱 네비게이션 */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map(item => (
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
          {userInfo && (
            <Link href="/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="relative w-8 h-8 rounded-full overflow-hidden bg-zinc-700 border border-zinc-600 flex-shrink-0">
                {userInfo.avatar_url ? (
                  <Image src={userInfo.avatar_url} alt="프로필" fill className="object-cover" unoptimized />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm text-zinc-400">👤</div>
                )}
              </div>
              <span className="text-sm text-zinc-200">{userInfo.nickname}</span>
            </Link>
          )}
          <button
            onClick={handleLogout}
            className="text-sm text-zinc-500 hover:text-zinc-200 border border-zinc-700 hover:border-zinc-500 px-3 py-1.5 rounded-lg transition-colors"
          >
            로그아웃
          </button>
        </div>

        {/* 모바일 우측: 프로필 + 햄버거 */}
        <div className="flex md:hidden items-center gap-3">
          {userInfo && (
            <Link href="/profile" className="flex items-center gap-2">
              <div className="relative w-8 h-8 rounded-full overflow-hidden bg-zinc-700 border border-zinc-600 flex-shrink-0">
                {userInfo.avatar_url ? (
                  <Image src={userInfo.avatar_url} alt="프로필" fill className="object-cover" unoptimized />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm text-zinc-400">👤</div>
                )}
              </div>
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
