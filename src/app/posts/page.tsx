'use client'

import { useEffect, useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import PostList from '@/components/PostList'

export default function PostsPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/login'); return }
      setReady(true)
    })
  }, [router])

  if (!ready) return null

  return (
    <main className="flex min-h-screen flex-col bg-zinc-950">
      <Navbar />

      <section className="flex-1 max-w-2xl w-full mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">음악 제안 목록</h2>
          <Link
            href="/posts/new"
            className="bg-zinc-800 border border-zinc-600 text-zinc-200 text-sm px-4 py-2 rounded-lg hover:border-zinc-400 hover:text-white transition-colors"
          >
            + 제안하기
          </Link>
        </div>
        <Suspense fallback={<p className="text-zinc-400">불러오는 중...</p>}>
          <PostList />
        </Suspense>
      </section>
    </main>
  )
}
