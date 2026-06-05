'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Navbar from '@/components/Navbar'

interface Season {
  id: number
  name: string
  is_active: boolean
}

export default function EditPostPage() {
  const { id } = useParams()
  const router = useRouter()
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [description, setDescription] = useState('')
  const [seasonId, setSeasonId] = useState<number | null>(null)
  const [seasons, setSeasons] = useState<Season[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setCurrentUserId(user.id)

      const { data: row } = await supabase.from('users').select('role').eq('id', user.id).single()
      const admin = row?.role === 'admin'
      if (admin) setIsAdmin(true)

      const { data: post } = await supabase
        .from('posts')
        .select('*')
        .eq('id', id)
        .single()

      if (!post) { router.push('/posts'); return }
      if (post.user_id !== user.id && !admin) { router.push(`/posts/${id}`); return }

      setTitle(post.title)
      setArtist(post.artist ?? '')
      setYoutubeUrl(post.youtube_url ?? '')
      setDescription(post.description ?? '')
      setSeasonId(post.season_id ?? null)

      const { data: seasonData } = await supabase
        .from('seasons')
        .select('id, name, is_active')
        .order('started_at', { ascending: true })
      setSeasons((seasonData ?? []) as Season[])

      setLoading(false)
    }
    load()
  }, [id, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!currentUserId) return
    setError('')
    setSaving(true)

    const supabase = createClient()
    const { error } = await supabase
      .from('posts')
      .update({
        title,
        artist: artist || null,
        youtube_url: youtubeUrl || null,
        description: description || null,
        season_id: seasonId,
      })
      .eq('id', id)

    if (error) {
      setError('저장에 실패했습니다. 다시 시도해주세요.')
      setSaving(false)
      return
    }

    if (isAdmin) {
      router.push(`/admin/posts/${id}`)
    } else {
      router.push(`/posts/${id}`)
    }
  }

  const inputClass = "bg-zinc-900 border border-zinc-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-400 w-full"

  if (loading) return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950">
      <p className="text-zinc-400">불러오는 중...</p>
    </main>
  )

  return (
    <main className="flex min-h-screen flex-col bg-zinc-950">
      <Navbar />

      <div className="max-w-lg w-full mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-white mb-6">음악 제안 수정</h1>

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

            {seasons.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-zinc-300">시즌</label>
                <select
                  value={seasonId ?? ''}
                  onChange={e => setSeasonId(e.target.value ? Number(e.target.value) : null)}
                  className={inputClass}
                >
                  <option value="">미분류</option>
                  {seasons.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}{s.is_active ? ' (현재 활성)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => isAdmin ? router.push(`/admin/posts/${id}`) : router.push(`/posts/${id}`)}
              className="flex-1 bg-zinc-800 border border-zinc-600 rounded-lg py-2.5 text-sm font-medium text-zinc-300 text-center hover:border-zinc-400 hover:text-white transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-zinc-100 text-zinc-900 rounded-lg py-2.5 text-sm font-semibold hover:bg-white disabled:opacity-50 transition-colors"
            >
              {saving ? '저장 중...' : '수정 완료'}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}
