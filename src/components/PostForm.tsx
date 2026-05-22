'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'

interface Props {
  userId: string
  onClose: () => void
}

export default function PostForm({ userId, onClose }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.from('posts').insert({
      user_id: userId,
      title,
      description: description || null,
      youtube_url: youtubeUrl || null,
    })

    if (error) {
      setError('저장에 실패했습니다. 다시 시도해주세요.')
      setLoading(false)
      return
    }

    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">음악 제안하기</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 text-xl">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">곡 제목 *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:bg-zinc-700 dark:border-zinc-600"
              placeholder="아티스트 - 곡명"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">유튜브 링크</label>
            <input
              type="url"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:bg-zinc-700 dark:border-zinc-600"
              placeholder="https://youtube.com/watch?v=..."
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">설명</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:bg-zinc-700 dark:border-zinc-600 resize-none"
              placeholder="이 곡을 추천하는 이유 등..."
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border rounded-lg py-2 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-zinc-900 text-white rounded-lg py-2 text-sm font-medium hover:bg-zinc-700 disabled:opacity-50 transition-colors dark:bg-white dark:text-zinc-900"
            >
              {loading ? '저장 중...' : '제안하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
