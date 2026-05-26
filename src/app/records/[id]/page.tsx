'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import RecordCommentSection from '@/components/RecordCommentSection'
import Image from 'next/image'
import Link from 'next/link'
import { extractYoutubeId } from '@/lib/youtube'

interface RecordPost {
  id: number
  title: string
  content: string
  record_date: string
  location: string
  record_type: 'concert' | 'practice' | 'etc' | null
  setlist: string | null
  youtube_url: string | null
  image_urls: string[]
  is_notice: boolean
  created_at: string
  created_by: string
  users: { nickname: string; avatar_url: string | null } | null
}

const TYPE_LABEL: Record<string, string> = { concert: '공연', practice: '연습', etc: '기타' }
const TYPE_STYLE: Record<string, string> = {
  concert: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  practice: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  etc: 'bg-zinc-600/50 text-zinc-300 border-zinc-500/30',
}

export default function RecordDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [post, setPost] = useState<RecordPost | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedImg, setSelectedImg] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/login'); return }
      setCurrentUserId(data.user.id)
      const { data: row } = await supabase.from('users').select('role').eq('id', data.user.id).single()
      if (row?.role === 'admin') setIsAdmin(true)

      const { data: postData } = await supabase
        .from('record_posts')
        .select('*, users(nickname, avatar_url)')
        .eq('id', id)
        .single()
      if (!postData) { router.push('/records'); return }
      setPost(postData as unknown as RecordPost)
      setLoading(false)
    })
  }, [id, router])

  async function handleDelete() {
    if (!confirm('기록을 삭제할까요?')) return
    const supabase = createClient()
    await supabase.from('record_posts').delete().eq('id', id)
    router.push('/records')
  }

  async function toggleNotice() {
    if (!post || !isAdmin) return
    const supabase = createClient()
    const { error } = await supabase.from('record_posts').update({ is_notice: !post.is_notice }).eq('id', id)
    if (!error) setPost(p => p ? { ...p, is_notice: !p.is_notice } : p)
  }

  if (loading) return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950">
      <p className="text-zinc-400">불러오는 중...</p>
    </main>
  )
  if (!post) return null

  const canEdit = isAdmin || post.created_by === currentUserId
  const youtubeId = post.youtube_url ? extractYoutubeId(post.youtube_url) : null

  return (
    <main className="flex min-h-screen flex-col bg-zinc-950">
      <Navbar />
      <section className="max-w-2xl w-full mx-auto px-4 py-8 flex flex-col gap-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <Link href="/records" className="text-zinc-400 hover:text-white transition-colors text-sm">← 목록</Link>
          <div className="flex gap-3">
            {isAdmin && (
              <button
                onClick={toggleNotice}
                className={`text-sm transition-colors border px-3 py-1 rounded-lg ${post.is_notice ? 'text-amber-400 border-amber-600 hover:border-amber-400' : 'text-zinc-400 border-zinc-700 hover:text-amber-400 hover:border-amber-600'}`}
              >
                {post.is_notice ? '공지 해제' : '공지 설정'}
              </button>
            )}
            {canEdit && (
              <>
                <Link href={`/records/${id}/edit`} className="text-sm text-zinc-400 hover:text-white transition-colors">수정</Link>
                <button onClick={handleDelete} className="text-sm text-zinc-400 hover:text-red-400 transition-colors">삭제</button>
              </>
            )}
          </div>
        </div>

        {/* 메타 정보 */}
        <div className={`border rounded-xl p-5 flex flex-col gap-3 ${post.is_notice ? 'bg-amber-950/20 border-amber-700/40' : 'bg-zinc-800 border-zinc-700'}`}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {post.is_notice && (
                <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-medium flex-shrink-0">📌 공지</span>
              )}
              <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight min-w-0 break-words">{post.title}</h1>
            </div>
            {post.record_type && (
              <span className={`text-xs px-2 py-1 rounded-full border flex-shrink-0 ${TYPE_STYLE[post.record_type]}`}>
                {TYPE_LABEL[post.record_type]}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-zinc-400 border-t border-zinc-700 pt-3">
            <span>📅 {new Date(post.record_date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            <span>📍 {post.location}</span>
            <span>· {post.users?.nickname}</span>
          </div>
        </div>

        {/* 이미지 */}
        {post.image_urls.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {post.image_urls.map((url, idx) => (
              <div
                key={idx}
                onClick={() => setSelectedImg(url)}
                className="relative w-20 h-16 sm:w-28 sm:h-24 rounded-xl overflow-hidden border border-zinc-600 cursor-pointer hover:border-zinc-400 transition-colors"
              >
                <Image src={url} alt="" fill className="object-cover" unoptimized />
              </div>
            ))}
          </div>
        )}

        {/* 내용 */}
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-5">
          <p className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">{post.content}</p>
        </div>

        {/* 셋리스트 */}
        {post.setlist && (
          <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-zinc-300 mb-3">셋리스트</h2>
            <p className="text-sm text-zinc-300 whitespace-pre-wrap font-mono leading-relaxed">{post.setlist}</p>
          </div>
        )}

        {/* 유튜브 */}
        {youtubeId && (
          <div className="rounded-xl overflow-hidden border border-zinc-700">
            <iframe
              src={`https://www.youtube.com/embed/${youtubeId}`}
              className="w-full aspect-video"
              allowFullScreen
            />
          </div>
        )}

        {/* 댓글 */}
        {currentUserId && (
          <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-5">
            <RecordCommentSection recordPostId={post.id} currentUserId={currentUserId} />
          </div>
        )}
      </section>

      {/* 이미지 라이트박스 */}
      {selectedImg && (
        <div
          onClick={() => setSelectedImg(null)}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full h-full">
            <Image src={selectedImg} alt="" fill className="object-contain" unoptimized />
          </div>
        </div>
      )}
    </main>
  )
}
