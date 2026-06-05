'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Navbar from '@/components/Navbar'

export default function NewPostPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [activeSeason, setActiveSeason] = useState<{ id: number; name: string } | null>(null)
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/login'); return }
      setUserId(data.user.id)
      const { data: season } = await supabase
        .from('seasons')
        .select('id, name')
        .eq('is_active', true)
        .maybeSingle()
      if (season) setActiveSeason(season)
    })
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.from('posts').insert({
      user_id: userId,
      title,
      artist: artist || null,
      youtube_url: youtubeUrl || null,
      description: description || null,
      season_id: activeSeason?.id ?? null,
    })

    if (error) {
      setError('저장에 실패했습니다. 다시 시도해주세요.')
      setLoading(false)
      return
    }

    router.push('/posts')
  }

  const inputClass = "bg-zinc-900 border border-zinc-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-400 w-full"

  return (
    <main className="flex min-h-screen flex-col bg-zinc-950">
      <Navbar />

      <div className="max-w-lg w-full mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-white mb-6">음악 제안하기</h1>
        {activeSeason ? (
          <div className="mb-4 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-sm text-green-400">
            현재 시즌: <span className="font-semibold">{activeSeason.name}</span>에 자동 등록됩니다.
          </div>
        ) : (
          <div className="mb-4 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-500">
            현재 활성 시즌이 없습니다. 미분류로 등록됩니다.
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-5 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-300">곡 제목 *</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} required placeholder="곡 제목" className={inputClass} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-300">가수 / 아티스트 *</label>
              <input type="text" value={artist} onChange={e => setArtist(e.target.value)} required placeholder="아티스트명" className={inputClass} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-300">유튜브 링크 *</label>
              <input type="url" value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} required placeholder="https://youtube.com/watch?v=..." className={inputClass} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-300">설명 *</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={4}
                required
                placeholder="이 곡을 추천하는 이유 등..."
                className={`${inputClass} resize-none`}
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.push('/posts')}
              className="flex-1 bg-zinc-800 border border-zinc-600 rounded-lg py-2.5 text-sm font-medium text-zinc-300 text-center hover:border-zinc-400 hover:text-white transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading || !userId}
              className="flex-1 bg-zinc-100 text-zinc-900 rounded-lg py-2.5 text-sm font-semibold hover:bg-white disabled:opacity-50 transition-colors"
            >
              {loading ? '저장 중...' : '제안하기'}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}
