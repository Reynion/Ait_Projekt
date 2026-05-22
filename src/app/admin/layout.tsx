'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/login'); return }
      const { data: userRow } = await supabase.from('users').select('role').eq('id', data.user.id).single()
      if (userRow?.role !== 'admin') { router.push('/'); return }
      setChecking(false)
    })
  }, [router])

  if (checking) return (
    <main className="flex min-h-screen items-center justify-center">
      <p className="text-zinc-400">확인 중...</p>
    </main>
  )

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center justify-between px-6 py-3 bg-zinc-900 border-b border-zinc-700">
        <span className="text-sm font-semibold text-zinc-300">🛠 관리자 페이지</span>
        <Link href="/" className="text-sm text-zinc-400 hover:text-white transition-colors">← 메인으로</Link>
      </header>
      <div className="flex flex-1">
        <aside className="w-48 bg-zinc-900 border-r border-zinc-700 flex flex-col gap-1 p-4">
          <p className="text-xs text-zinc-500 font-semibold uppercase mb-3">메뉴</p>
          <Link href="/admin" className="text-sm text-zinc-300 hover:text-white px-2 py-1.5 rounded hover:bg-zinc-800 transition-colors">대시보드</Link>
          <Link href="/admin/accounts" className="text-sm text-zinc-300 hover:text-white px-2 py-1.5 rounded hover:bg-zinc-800 transition-colors">계정 관리</Link>
          <Link href="/admin/posts" className="text-sm text-zinc-300 hover:text-white px-2 py-1.5 rounded hover:bg-zinc-800 transition-colors">음악제안 관리</Link>
          <Link href="/admin/board" className="text-sm text-zinc-300 hover:text-white px-2 py-1.5 rounded hover:bg-zinc-800 transition-colors">게시글 관리</Link>
          <Link href="/admin/polls" className="text-sm text-zinc-300 hover:text-white px-2 py-1.5 rounded hover:bg-zinc-800 transition-colors">투표 관리</Link>
        </aside>
        <main className="flex-1 p-8 bg-zinc-950 text-white">
          {children}
        </main>
      </div>
    </div>
  )
}
