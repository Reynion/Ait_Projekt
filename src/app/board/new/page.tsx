'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Image from 'next/image'

export default function NewBoardPostPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isNotice, setIsNotice] = useState(false)
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/login'); return }
      setUserId(data.user.id)
      const { data: row } = await supabase.from('users').select('role').eq('id', data.user.id).single()
      if (row?.role === 'admin') setIsAdmin(true)
    })
  }, [router])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (imageFiles.length + files.length > 5) {
      setError('이미지는 최대 5장까지 첨부할 수 있습니다.')
      return
    }
    setError('')
    setImageFiles(prev => [...prev, ...files])
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = ev => setPreviews(prev => [...prev, ev.target?.result as string])
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  function removeImage(idx: number) {
    setImageFiles(prev => prev.filter((_, i) => i !== idx))
    setPreviews(prev => prev.filter((_, i) => i !== idx))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return
    setError('')
    setLoading(true)

    const supabase = createClient()

    const imageUrls: string[] = []
    for (const file of imageFiles) {
      const ext = file.name.split('.').pop()
      const path = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
      const { error: upErr } = await supabase.storage.from('board-images').upload(path, file)
      if (upErr) { setError('이미지 업로드에 실패했습니다.'); setLoading(false); return }
      const { data } = supabase.storage.from('board-images').getPublicUrl(path)
      imageUrls.push(data.publicUrl)
    }

    const { error } = await supabase.from('board_posts').insert({
      user_id: userId,
      title,
      content,
      image_urls: imageUrls,
      is_notice: isAdmin && isNotice,
    })

    if (error) {
      setError('저장에 실패했습니다. 다시 시도해주세요.')
      setLoading(false)
      return
    }

    router.push('/board')
  }

  const inputClass = "bg-zinc-900 border border-zinc-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-400 w-full"

  return (
    <main className="flex min-h-screen flex-col bg-zinc-950">
      <Navbar />

      <div className="max-w-lg w-full mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-white mb-6">게시글 작성</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-5 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-300">제목 *</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
                placeholder="제목을 입력하세요"
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-300">내용 *</label>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                rows={8}
                required
                placeholder="내용을 입력하세요..."
                className={`${inputClass} resize-none`}
              />
            </div>

            {isAdmin && (
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isNotice}
                  onChange={e => setIsNotice(e.target.checked)}
                  className="w-4 h-4 accent-amber-500"
                />
                <span className="text-sm text-amber-400 font-medium">📌 공지로 등록</span>
              </label>
            )}

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-zinc-300">이미지 첨부 <span className="text-zinc-500 font-normal">(최대 5장)</span></label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={imageFiles.length >= 5}
                  className="text-sm text-zinc-400 hover:text-zinc-200 border border-zinc-600 hover:border-zinc-400 px-3 py-1 rounded-lg transition-colors disabled:opacity-40"
                >
                  + 이미지 추가
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
              </div>
              {previews.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {previews.map((src, idx) => (
                    <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-zinc-600 flex-shrink-0">
                      <Image src={src} alt="" fill className="object-cover" unoptimized />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/70 rounded-full text-white text-xs flex items-center justify-center hover:bg-red-500 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.push('/board')}
              className="flex-1 bg-zinc-800 border border-zinc-600 rounded-lg py-2.5 text-sm font-medium text-zinc-300 hover:border-zinc-400 hover:text-white transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading || !userId}
              className="flex-1 bg-zinc-100 text-zinc-900 rounded-lg py-2.5 text-sm font-semibold hover:bg-white disabled:opacity-50 transition-colors"
            >
              {loading ? '저장 중...' : '등록하기'}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}
