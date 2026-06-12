'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import { getWritePermission } from '@/lib/permissions'

export default function GuestbookNewPage() {
  const router = useRouter()
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/login'); return }
      const canWrite = await getWritePermission('guestbook')
      if (!canWrite) { router.push('/guestbook'); return }
      setCurrentUserId(data.user.id)
      setLoading(false)
    })
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim() || !currentUserId) return
    setSubmitting(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('guestbook')
      .insert({ user_id: currentUserId, content: content.trim() })
      .select('id')
      .single()
    if (error || !data) { alert('저장에 실패했습니다.'); setSubmitting(false); return }
    router.push(`/guestbook/${data.id}`)
  }

  if (loading) return (
    <main className="flex min-h-screen flex-col bg-zinc-950">
      <Navbar />
      <div className="max-w-2xl w-full mx-auto px-4 py-8">
        <p className="text-zinc-400">불러오는 중...</p>
      </div>
    </main>
  )

  return (
    <main className="flex min-h-screen flex-col bg-zinc-950">
      <Navbar />
      <div className="max-w-2xl w-full mx-auto px-4 py-8 flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <Link href="/guestbook" className="text-sm text-zinc-500 hover:text-zinc-200 transition-colors">← 방명록</Link>
        </div>

        <h1 className="text-2xl font-bold text-white">방명록 남기기</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-zinc-300">내용 <span className="text-red-400">*</span></label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="방명록에 남길 메시지를 입력하세요..."
              rows={6}
              className="w-full bg-zinc-800 border border-zinc-600 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-400 resize-none leading-relaxed"
              required
            />
            <p className="text-xs text-zinc-500 text-right">{content.length}자</p>
          </div>

          <div className="flex gap-3 justify-end">
            <Link href="/guestbook" className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 border border-zinc-700 hover:border-zinc-500 rounded-lg transition-colors">
              취소
            </Link>
            <button
              type="submit"
              disabled={submitting || !content.trim()}
              className="px-5 py-2 text-sm bg-zinc-200 text-zinc-900 font-semibold rounded-lg hover:bg-white disabled:opacity-50 transition-colors"
            >
              {submitting ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}
