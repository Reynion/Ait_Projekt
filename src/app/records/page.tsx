'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import Image from 'next/image'

interface RecordPost {
  id: number
  title: string
  content: string
  record_date: string
  location: string
  record_type: 'concert' | 'practice' | 'etc' | null
  image_urls: string[]
  is_notice: boolean
  created_at: string
  created_by: string
  users: { nickname: string; avatar_url: string | null } | null
}

const TYPE_LABEL: Record<string, string> = {
  concert: '공연',
  practice: '연습',
  etc: '기타',
}

const TYPE_STYLE: Record<string, string> = {
  concert: 'bg-purple-500/20 text-purple-600 border-purple-500/30',
  practice: 'bg-amber-500/20 text-amber-600 border-amber-500/30',
  etc: 'bg-zinc-600/50 text-zinc-300 border-zinc-500/30',
}

const PAGE_SIZE = 20

export default function RecordsPage() {
  const router = useRouter()
  const [posts, setPosts] = useState<RecordPost[]>([])
  const [notices, setNotices] = useState<RecordPost[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push('/login')
    })
  }, [router])

  useEffect(() => {
    fetchPosts()
  }, [page])

  async function fetchPosts() {
    setLoading(true)
    const supabase = createClient()

    const { data: noticeData } = await supabase
      .from('record_posts')
      .select('*, users(nickname, avatar_url)')
      .eq('is_notice', true)
      .is('deleted_at', null)
      .order('record_date', { ascending: false })
    if (noticeData) setNotices(noticeData as unknown as RecordPost[])

    const from = (page - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1
    const { data, count } = await supabase
      .from('record_posts')
      .select('*, users(nickname, avatar_url)', { count: 'exact' })
      .eq('is_notice', false)
      .is('deleted_at', null)
      .order('record_date', { ascending: false })
      .range(from, to)
    if (data) setPosts(data as unknown as RecordPost[])
    if (count !== null) setTotal(count)
    setLoading(false)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <main className="flex min-h-screen flex-col bg-zinc-950">
      <Navbar />
      <section className="max-w-3xl w-full mx-auto px-4 py-8 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">기록</h1>
          <Link
            href="/records/new"
            className="bg-zinc-700 border border-zinc-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-zinc-600 hover:border-zinc-500 transition-colors"
          >
            + 기록 작성
          </Link>
        </div>

        {loading ? (
          <p className="text-zinc-400 text-center py-12">불러오는 중...</p>
        ) : (
          <>
            {/* 공지 */}
            {notices.length > 0 && (
              <ul className="flex flex-col gap-4">
                {notices.map(post => (
                  <li key={post.id}>
                    <Link href={`/records/${post.id}`} className="block bg-amber-950/20 border border-amber-700/40 rounded-xl p-4 hover:border-amber-600/60 transition-colors">
                      <div className="flex gap-4">
                        {post.image_urls.length > 0 && (
                          <div className="relative w-24 h-20 rounded-lg overflow-hidden flex-shrink-0 border border-amber-800/40">
                            <Image src={post.image_urls[0]} alt={post.title} fill className="object-cover" unoptimized />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-medium">📌 공지</span>
                            {post.record_type && (
                              <span className={`text-xs px-2 py-0.5 rounded-full border ${TYPE_STYLE[post.record_type]}`}>
                                {TYPE_LABEL[post.record_type]}
                              </span>
                            )}
                          </div>
                          <p className="font-semibold text-white truncate">{post.title}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-zinc-400">
                            <span>📅 {new Date(post.record_date).toLocaleDateString('ko-KR')}</span>
                            <span>📍 {post.location}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {notices.length > 0 && posts.length > 0 && (
              <div className="border-t border-zinc-700" />
            )}

            {posts.length === 0 && notices.length === 0 ? (
              <p className="text-zinc-500 text-center py-12">기록이 없습니다.</p>
            ) : (
              <ul className="flex flex-col gap-4">
                {posts.map((post, idx) => (
                  <li key={post.id}>
                    <Link href={`/records/${post.id}`} className="block bg-zinc-800 border border-zinc-700 rounded-xl p-4 hover:border-zinc-500 transition-colors">
                      <div className="flex gap-4">
                        {post.image_urls.length > 0 && (
                          <div className="relative w-24 h-20 rounded-lg overflow-hidden flex-shrink-0 border border-zinc-600">
                            <Image src={post.image_urls[0]} alt={post.title} fill className="object-cover" unoptimized />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-zinc-500 font-medium">#{total - (page - 1) * PAGE_SIZE - idx}</span>
                            {post.record_type && (
                              <span className={`text-xs px-2 py-0.5 rounded-full border ${TYPE_STYLE[post.record_type]}`}>
                                {TYPE_LABEL[post.record_type]}
                              </span>
                            )}
                          </div>
                          <p className="font-semibold text-white truncate">{post.title}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-zinc-400">
                            <span>📅 {new Date(post.record_date).toLocaleDateString('ko-KR')}</span>
                            <span>📍 {post.location}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-2 text-xs text-zinc-500">
                            <span>{post.users?.nickname}</span>
                            <span>·</span>
                            <span>{new Date(post.created_at).toLocaleDateString('ko-KR')}</span>
                            {post.image_urls.length > 1 && <span>· 사진 {post.image_urls.length}장</span>}
                          </div>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center gap-1 pt-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-8 h-8 rounded-lg text-sm transition-colors ${
                  p === page ? 'bg-zinc-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
