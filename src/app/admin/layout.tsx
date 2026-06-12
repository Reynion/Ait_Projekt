'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

const ADMIN_MENUS = [
  { href: '/admin', label: '대시보드' },
  { href: '/admin/accounts', label: '멤버 관리' },
  { href: '/admin/permissions', label: '권한 설정' },
  { href: '/admin/invite-codes', label: '초대 코드' },
  { href: '/admin/seasons', label: '시즌 관리' },
  { href: '/admin/posts', label: '음악제안 관리' },
  { href: '/admin/board', label: '게시글 관리' },
  { href: '/admin/polls', label: '투표 관리' },
  { href: '/admin/schedules', label: '일정 관리' },
  { href: '/admin/records', label: '기록 관리' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [checking, setChecking] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/login'); return }
      const { data: userRow } = await supabase.from('users').select('role').eq('id', data.user.id).single()
      if (userRow?.role !== 'admin') { router.push('/'); return }
      setChecking(false)
    })
  }, [router])

  useEffect(() => { setMenuOpen(false) }, [pathname])

  if (checking) return (
    <main className="flex min-h-screen items-center justify-center">
      <p className="text-zinc-400">확인 중...</p>
    </main>
  )

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-zinc-700">
        <div className="flex items-center gap-3">
          {/* 모바일 햄버거 */}
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="md:hidden p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
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
          <span className="text-sm font-semibold text-zinc-300">🛠 관리자 페이지</span>
        </div>
        <Link href="/" className="text-sm text-zinc-400 hover:text-white transition-colors">← 메인으로</Link>
      </header>

      {/* 모바일 드롭다운 */}
      {menuOpen && (
        <nav className="md:hidden bg-zinc-900 border-b border-zinc-700 px-4 py-3 flex flex-col gap-1">
          {ADMIN_MENUS.map(m => (
            <Link key={m.href} href={m.href} className="text-sm text-zinc-300 hover:text-white px-3 py-2.5 rounded-lg hover:bg-zinc-800 transition-colors">
              {m.label}
            </Link>
          ))}
        </nav>
      )}

      <div className="flex flex-1">
        {/* 데스크톱 사이드바 */}
        <aside className="hidden md:flex w-48 flex-shrink-0 bg-zinc-900 border-r border-zinc-700 flex-col gap-1 p-4">
          <p className="text-xs text-zinc-500 font-semibold uppercase mb-3">메뉴</p>
          {ADMIN_MENUS.map(m => (
            <Link key={m.href} href={m.href} className="text-sm text-zinc-300 hover:text-white px-2 py-1.5 rounded hover:bg-zinc-800 transition-colors">
              {m.label}
            </Link>
          ))}
        </aside>

        <main className="flex-1 min-w-0 overflow-x-hidden p-4 md:p-8 bg-zinc-950 text-white">
          {children}
        </main>
      </div>
    </div>
  )
}
