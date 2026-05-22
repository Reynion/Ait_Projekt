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

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 border-b border-zinc-700 bg-zinc-900">
      <div className="flex items-center gap-6">
        <Link href="/" className="text-lg font-bold text-white flex-shrink-0">🎸 Ait</Link>
        <nav className="flex items-center gap-1">
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
      </div>

      <div className="flex items-center gap-3">
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
    </header>
  )
}
