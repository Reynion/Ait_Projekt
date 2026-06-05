'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import RecordCommentSection from '@/components/RecordCommentSection'
import { notifyAll } from '@/lib/notifications'
import Image from 'next/image'
import Link from 'next/link'
import { extractYoutubeId } from '@/lib/youtube'
import UserProfileModal from '@/components/UserProfileModal'

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
  concert: 'bg-purple-500/20 text-purple-600 border-purple-500/30',
  practice: 'bg-amber-500/20 text-amber-600 border-amber-500/30',
  etc: 'bg-zinc-600/50 text-zinc-300 border-zinc-500/30',
}

export default function RecordDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [post, setPost] = useState<RecordPost | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [prevPost, setPrevPost] = useState<{ id: number; title: string } | null>(null)
  const [nextPost, setNextPost] = useState<{ id: number; title: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedImg, setSelectedImg] = useState<string | null>(null)
  const [profileUserId, setProfileUserId] = useState<string | null>(null)

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

      const numId = Number(id)
      const [{ data: prev }, { data: next }] = await Promise.all([
        supabase.from('record_posts').select('id, title').eq('is_notice', false).is('deleted_at', null).lt('id', numId).order('id', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('record_posts').select('id, title').eq('is_notice', false).is('deleted_at', null).gt('id', numId).order('id', { ascending: true }).limit(1).maybeSingle(),
      ])
      if (prev) setPrevPost(prev)
      if (next) setNextPost(next)

      setLoading(false)
    })
  }, [id, router])

  async function handleDelete() {
    if (!confirm('기록을 삭제할까요?')) return
    const supabase = createClient()
    const { error } = await supabase.from('record_posts').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    if (error) { alert('삭제에 실패했습니다.'); return }
    router.push('/records')
  }

  async function toggleNotice() {
    if (!post || !isAdmin) return
    const supabase = createClient()
    const { error } = await supabase.from('record_posts').update({ is_notice: !post.is_notice }).eq('id', id)
    if (!error) {
      setPost(p => p ? { ...p, is_notice: !p.is_notice } : p)
      if (!post.is_notice) {
        const { data: { user } } = await supabase.auth.getUser()
        await notifyAll({ supabase, senderId: user?.id ?? '', type: 'new_notice', message: `새 공지가 등록됐습니다: ${post.title}`, link: `/records/${id}` })
      }
    }
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
      {profileUserId && <UserProfileModal userId={profileUserId} onClose={() => setProfileUserId(null)} />}
      <Navbar />
      <section className="max-w-2xl w-full mx-auto px-4 py-8 flex flex-col gap-6">
        {/* 헤더 */}
        <div>
          <Link href="/records" className="text-zinc-400 hover:text-white transition-colors text-sm">← 목록</Link>
        </div>

        {/* 메타 정보 */}
        <div className={`border rounded-xl p-5 flex flex-col gap-3 ${post.is_notice ? 'bg-amber-950/20 border-amber-700/40' : 'bg-zinc-800 border-zinc-700'}`}>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {post.is_notice && (
                <span className="text-xs bg-amber-500/20 text-amber-700 border border-amber-500/30 px-2 py-0.5 rounded-full font-medium flex-shrink-0">📌 공지</span>
              )}
              <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight min-w-0 break-words">{post.title}</h1>
            </div>
            <div className="flex items-center gap-2 flex-wrap sm:flex-shrink-0">
              {post.record_type && (
                <span className={`text-xs px-2 py-1 rounded-full border ${TYPE_STYLE[post.record_type]}`}>
                  {TYPE_LABEL[post.record_type]}
                </span>
              )}
              {isAdmin && (
                <button
                  onClick={toggleNotice}
                  className={`text-sm transition-colors border px-3 py-1 rounded-lg ${post.is_notice ? 'text-amber-700 border-amber-600 hover:border-amber-400' : 'text-zinc-500 border-zinc-700 hover:text-amber-700 hover:border-amber-600'}`}
                >
                  {post.is_notice ? '공지 해제' : '공지 설정'}
                </button>
              )}
              {canEdit && (
                <>
                  <Link href={`/records/${id}/edit`} className="text-sm text-zinc-500 hover:text-zinc-200 transition-colors border border-zinc-700 hover:border-zinc-500 px-3 py-1 rounded-lg">수정</Link>
                  <button onClick={handleDelete} className="text-sm text-zinc-500 hover:text-red-400 transition-colors border border-zinc-700 hover:border-red-500 px-3 py-1 rounded-lg">삭제</button>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-zinc-400 border-t border-zinc-700 pt-3">
            <span>📅 {new Date(post.record_date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            <span>📍 {post.location}</span>
            <button type="button" onClick={() => setProfileUserId(post.created_by)} className="hover:text-white transition-colors">· {post.users?.nickname}</button>
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
            <RecordCommentSection recordPostId={Number(id)} currentUserId={currentUserId} postAuthorId={post.created_by} link={`/records/${id}`} />
          </div>
        )}

        {/* 이전/다음 */}
        {!post.is_notice && (
          <div className="grid grid-cols-2 gap-3">
            {prevPost ? (
              <Link href={`/records/${prevPost.id}`} className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 hover:border-zinc-500 transition-colors flex flex-col gap-1">
                <span className="text-xs text-zinc-500">← 이전 글</span>
                <span className="text-sm text-zinc-200 truncate">{prevPost.title}</span>
              </Link>
            ) : <div />}
            {nextPost ? (
              <Link href={`/records/${nextPost.id}`} className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 hover:border-zinc-500 transition-colors flex flex-col gap-1 text-right">
                <span className="text-xs text-zinc-500">다음 글 →</span>
                <span className="text-sm text-zinc-200 truncate">{nextPost.title}</span>
              </Link>
            ) : <div />}
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
