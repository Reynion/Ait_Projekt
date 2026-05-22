'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Image from 'next/image'

export default function EditBoardPostPage() {
  const { id } = useParams()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([])
  const [newImageFiles, setNewImageFiles] = useState<File[]>([])
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setCurrentUserId(user.id)

      const { data: post } = await supabase
        .from('board_posts')
        .select('*')
        .eq('id', id)
        .single()

      if (!post) { router.push('/board'); return }
      if (post.user_id !== user.id) { router.push(`/board/${id}`); return }

      setTitle(post.title)
      setContent(post.content)
      setExistingImageUrls(post.image_urls ?? [])
      setLoading(false)
    }
    load()
  }, [id, router])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    const total = existingImageUrls.length + newImageFiles.length + files.length
    if (total > 5) {
      setError('이미지는 최대 5장까지 첨부할 수 있습니다.')
      return
    }
    setError('')
    setNewImageFiles(prev => [...prev, ...files])
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = ev => setNewImagePreviews(prev => [...prev, ev.target?.result as string])
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  function removeExistingImage(idx: number) {
    setExistingImageUrls(prev => prev.filter((_, i) => i !== idx))
  }

  function removeNewImage(idx: number) {
    setNewImageFiles(prev => prev.filter((_, i) => i !== idx))
    setNewImagePreviews(prev => prev.filter((_, i) => i !== idx))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!currentUserId) return
    setError('')
    setSaving(true)

    const supabase = createClient()

    const uploadedUrls: string[] = []
    for (const file of newImageFiles) {
      const ext = file.name.split('.').pop()
      const path = `${currentUserId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
      const { error: upErr } = await supabase.storage.from('board-images').upload(path, file)
      if (upErr) { setError('이미지 업로드에 실패했습니다.'); setSaving(false); return }
      const { data } = supabase.storage.from('board-images').getPublicUrl(path)
      uploadedUrls.push(data.publicUrl)
    }

    const { error } = await supabase
      .from('board_posts')
      .update({ title, content, image_urls: [...existingImageUrls, ...uploadedUrls] })
      .eq('id', id)

    if (error) {
      setError('저장에 실패했습니다. 다시 시도해주세요.')
      setSaving(false)
      return
    }

    router.push(`/board/${id}`)
  }

  const inputClass = "bg-zinc-900 border border-zinc-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-400 w-full"

  if (loading) return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950">
      <p className="text-zinc-400">불러오는 중...</p>
    </main>
  )

  const totalImages = existingImageUrls.length + newImageFiles.length

  return (
    <main className="flex min-h-screen flex-col bg-zinc-950">
      <Navbar />

      <div className="max-w-lg w-full mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-white mb-6">게시글 수정</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-5 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-300">제목 *</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
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
                className={`${inputClass} resize-none`}
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-zinc-300">이미지 <span className="text-zinc-500 font-normal">({totalImages}/5)</span></label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={totalImages >= 5}
                  className="text-sm text-zinc-400 hover:text-zinc-200 border border-zinc-600 hover:border-zinc-400 px-3 py-1 rounded-lg transition-colors disabled:opacity-40"
                >
                  + 이미지 추가
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
              </div>

              {(existingImageUrls.length > 0 || newImagePreviews.length > 0) && (
                <div className="flex flex-wrap gap-2">
                  {existingImageUrls.map((url, idx) => (
                    <div key={`e-${idx}`} className="relative w-20 h-20 rounded-lg overflow-hidden border border-zinc-600 flex-shrink-0">
                      <Image src={url} alt="" fill className="object-cover" unoptimized />
                      <button
                        type="button"
                        onClick={() => removeExistingImage(idx)}
                        className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/70 rounded-full text-white text-xs flex items-center justify-center hover:bg-red-500 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {newImagePreviews.map((src, idx) => (
                    <div key={`n-${idx}`} className="relative w-20 h-20 rounded-lg overflow-hidden border border-blue-600/50 flex-shrink-0">
                      <Image src={src} alt="" fill className="object-cover" unoptimized />
                      <button
                        type="button"
                        onClick={() => removeNewImage(idx)}
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
              onClick={() => router.push(`/board/${id}`)}
              className="flex-1 bg-zinc-800 border border-zinc-600 rounded-lg py-2.5 text-sm font-medium text-zinc-300 hover:border-zinc-400 hover:text-white transition-colors"
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
