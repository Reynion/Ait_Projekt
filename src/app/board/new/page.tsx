'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Image from 'next/image'
import { validateBoardFile, isImageFile } from '@/lib/validateUpload'
import { notifyAll } from '@/lib/notifications'

interface MusicItem {
  youtube_url: string
  comment: string
}

function getYoutubeId(url: string): string | null {
  const match = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/)
  return match ? match[1] : null
}

export default function NewBoardPostPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [postType, setPostType] = useState<'normal' | 'music'>('normal')

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isNotice, setIsNotice] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<(string | null)[]>([])

  const [musicTitle, setMusicTitle] = useState('')
  const [musicIntro, setMusicIntro] = useState('')
  const [musicItems, setMusicItems] = useState<MusicItem[]>([{ youtube_url: '', comment: '' }])
  const [musicOutro, setMusicOutro] = useState('')

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
    const selected = Array.from(e.target.files ?? [])
    if (files.length + selected.length > 5) {
      setError('파일은 최대 5개까지 첨부할 수 있습니다.')
      return
    }
    for (const file of selected) {
      const err = validateBoardFile(file)
      if (err) { setError(err); return }
    }
    setError('')
    setFiles(prev => [...prev, ...selected])
    selected.forEach(file => {
      if (isImageFile(file)) {
        const reader = new FileReader()
        reader.onload = ev => setPreviews(prev => [...prev, ev.target?.result as string])
        reader.readAsDataURL(file)
      } else {
        setPreviews(prev => [...prev, null])
      }
    })
    e.target.value = ''
  }

  function removeFile(idx: number) {
    setFiles(prev => prev.filter((_, i) => i !== idx))
    setPreviews(prev => prev.filter((_, i) => i !== idx))
  }

  function addMusicItem() {
    setMusicItems(prev => [...prev, { youtube_url: '', comment: '' }])
  }

  function removeMusicItem(idx: number) {
    setMusicItems(prev => prev.filter((_, i) => i !== idx))
  }

  function updateMusicItem(idx: number, field: keyof MusicItem, value: string) {
    setMusicItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return
    setError('')
    setLoading(true)

    const supabase = createClient()

    if (postType === 'normal') {
      const imageUrls: string[] = []
      for (const file of files) {
        const ext = file.name.split('.').pop()
        const path = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
        const { error: upErr } = await supabase.storage.from('board-images').upload(path, file, { contentType: file.type || undefined })
        if (upErr) { setError('파일 업로드에 실패했습니다.'); setLoading(false); return }
        const { data } = supabase.storage.from('board-images').getPublicUrl(path)
        imageUrls.push(data.publicUrl)
      }

      const { data: inserted, error } = await supabase.from('board_posts').insert({
        user_id: userId,
        title,
        content,
        image_urls: imageUrls,
        is_notice: isAdmin && isNotice,
        post_type: 'normal',
      }).select('id').single()

      if (error) { setError('저장에 실패했습니다.'); setLoading(false); return }

      if (isAdmin && isNotice && inserted) {
        await notifyAll({ supabase, senderId: userId, type: 'new_notice', message: `새 공지가 등록됐습니다: ${title}`, link: `/board/${inserted.id}` })
      }
    } else {
      const validItems = musicItems.filter(item => item.youtube_url.trim())
      if (validItems.length === 0) { setError('유튜브 링크를 최소 1개 입력해주세요.'); setLoading(false); return }

      const { error } = await supabase.from('board_posts').insert({
        user_id: userId,
        title: musicTitle,
        content: musicIntro,
        music_outro: musicOutro,
        image_urls: [],
        is_notice: false,
        post_type: 'music',
        music_items: validItems,
      })

      if (error) { setError('저장에 실패했습니다.'); setLoading(false); return }
    }

    router.push('/board')
  }

  const inputClass = "bg-zinc-900 border border-zinc-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-400 w-full"

  return (
    <main className="flex min-h-screen flex-col bg-zinc-950">
      <Navbar />

      <div className="max-w-lg w-full mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-white mb-6">게시글 작성</h1>

        <div className="flex gap-2 mb-5">
          <button
            type="button"
            onClick={() => setPostType('normal')}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              postType === 'normal'
                ? 'bg-zinc-700 border-zinc-500 text-white'
                : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500'
            }`}
          >
            기본
          </button>
          <button
            type="button"
            onClick={() => setPostType('music')}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              postType === 'music'
                ? 'bg-zinc-700 border-zinc-500 text-white'
                : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500'
            }`}
          >
            🎵 음악 공유
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {postType === 'normal' ? (
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
                  <span className="text-sm text-amber-700 font-medium">📌 공지로 등록</span>
                </label>
              )}

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-zinc-300">
                    파일 첨부 <span className="text-zinc-500 font-normal">(최대 5개, 이미지·PDF·GP5)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={files.length >= 5}
                    className="flex-shrink-0 text-sm text-zinc-400 hover:text-zinc-200 border border-zinc-600 hover:border-zinc-400 px-3 py-1 rounded-lg transition-colors disabled:opacity-40"
                  >
                    + 파일 추가
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*,application/pdf,.gp5,.gpx,.gp4,.gp" multiple className="hidden" onChange={handleFileChange} />
                </div>
                {files.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {files.map((file, idx) => (
                      previews[idx] ? (
                        <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-zinc-600 flex-shrink-0">
                          <Image src={previews[idx]!} alt="" fill className="object-cover" unoptimized />
                          <button type="button" onClick={() => removeFile(idx)} className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/70 rounded-full text-[#ffffff] text-xs flex items-center justify-center hover:bg-red-500 transition-colors">✕</button>
                        </div>
                      ) : (
                        <div key={idx} className="relative flex items-center gap-2 bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 flex-shrink-0 max-w-[180px]">
                          <span className="text-base">📄</span>
                          <span className="text-xs text-zinc-300 truncate">{file.name}</span>
                          <button type="button" onClick={() => removeFile(idx)} className="ml-1 text-zinc-500 hover:text-red-400 text-xs flex-shrink-0">✕</button>
                        </div>
                      )
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-5 flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-zinc-300">제목 *</label>
                  <input
                    type="text"
                    value={musicTitle}
                    onChange={e => setMusicTitle(e.target.value)}
                    required
                    placeholder="제목을 입력하세요"
                    className={inputClass}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-zinc-300">내용</label>
                  <textarea
                    value={musicIntro}
                    onChange={e => setMusicIntro(e.target.value)}
                    rows={4}
                    placeholder="곡 소개 전 내용을 입력하세요..."
                    className={`${inputClass} resize-none`}
                  />
                </div>
              </div>

              {musicItems.map((item, idx) => (
                <div key={idx} className="bg-zinc-800 border border-zinc-700 rounded-xl p-5 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-zinc-300">🎵 {idx + 1}번 곡</span>
                    {musicItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMusicItem(idx)}
                        className="text-xs text-zinc-500 hover:text-red-400 border border-zinc-700 hover:border-red-500 px-2 py-1 rounded-lg transition-colors"
                      >
                        삭제
                      </button>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-zinc-400">유튜브 링크 *</label>
                    <input
                      type="url"
                      value={item.youtube_url}
                      onChange={e => updateMusicItem(idx, 'youtube_url', e.target.value)}
                      required
                      placeholder="https://youtu.be/..."
                      className={inputClass}
                    />
                    {item.youtube_url && getYoutubeId(item.youtube_url) && (
                      <div className="aspect-video rounded-lg overflow-hidden border border-zinc-600 mt-1">
                        <iframe
                          src={`https://www.youtube.com/embed/${getYoutubeId(item.youtube_url)}`}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-zinc-400">의견</label>
                    <textarea
                      value={item.comment}
                      onChange={e => updateMusicItem(idx, 'comment', e.target.value)}
                      rows={3}
                      placeholder="이 곡에 대한 의견을 적어주세요..."
                      className={`${inputClass} resize-none`}
                    />
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addMusicItem}
                className="w-full py-3 border border-dashed border-zinc-600 hover:border-zinc-400 text-zinc-400 hover:text-zinc-200 rounded-xl text-sm transition-colors"
              >
                + 곡 추가
              </button>

              <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-zinc-300">마무리 내용</label>
                  <textarea
                    value={musicOutro}
                    onChange={e => setMusicOutro(e.target.value)}
                    rows={4}
                    placeholder="마무리 내용을 입력하세요..."
                    className={`${inputClass} resize-none`}
                  />
                </div>
              </div>
            </div>
          )}

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
