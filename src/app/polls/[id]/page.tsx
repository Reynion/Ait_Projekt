'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { extractYoutubeId, getThumbnailUrl } from '@/lib/youtube'
import Image from 'next/image'
import Navbar from '@/components/Navbar'
import PollCommentSection from '@/components/PollCommentSection'
import Link from 'next/link'

interface Poll {
  id: number
  title: string
  description: string | null
  max_votes_per_user: number
  is_active: boolean
  ends_at: string | null
}

interface Candidate {
  id: number
  post_id: number
  posts: {
    id: number
    title: string
    artist: string | null
    youtube_url: string | null
    users: { nickname: string } | null
  } | null
  voteCount: number
}

export default function PollDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [poll, setPoll] = useState<Poll | null>(null)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [myVotes, setMyVotes] = useState<number[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [voting, setVoting] = useState(false)

  async function fetchData() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setCurrentUserId(user.id)

    const { data: pollData } = await supabase.from('polls').select('*').eq('id', id).single()
    setPoll(pollData)

    const { data: candidatesData } = await supabase
      .from('poll_candidates')
      .select('id, post_id, posts(id, title, artist, youtube_url, users(nickname))')
      .eq('poll_id', id)

    const { data: votesData } = await supabase
      .from('poll_votes')
      .select('candidate_id, user_id')
      .eq('poll_id', id)

    const myVoteIds = (votesData ?? []).filter(v => v.user_id === user.id).map(v => v.candidate_id)
    setMyVotes(myVoteIds)

    const enriched = ((candidatesData ?? []) as unknown as Candidate[]).map(c => ({
      ...c,
      voteCount: (votesData ?? []).filter(v => v.candidate_id === c.id).length,
    }))
    setCandidates(enriched)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [id, router])

  async function handleVote(candidateId: number) {
    if (!poll?.is_active || voting || !currentUserId) return
    setVoting(true)
    const supabase = createClient()

    if (myVotes.includes(candidateId)) {
      await supabase.from('poll_votes').delete()
        .eq('poll_id', poll.id).eq('candidate_id', candidateId).eq('user_id', currentUserId)
      setMyVotes(prev => prev.filter(id => id !== candidateId))
      setCandidates(prev => prev.map(c => c.id === candidateId ? { ...c, voteCount: c.voteCount - 1 } : c))
    } else {
      if (myVotes.length >= poll.max_votes_per_user) {
        alert(`최대 ${poll.max_votes_per_user}표까지 투표할 수 있습니다.`)
        setVoting(false)
        return
      }
      const { error } = await supabase.from('poll_votes').insert({
        poll_id: poll.id, candidate_id: candidateId, user_id: currentUserId,
      })
      if (!error) {
        setMyVotes(prev => [...prev, candidateId])
        setCandidates(prev => prev.map(c => c.id === candidateId ? { ...c, voteCount: c.voteCount + 1 } : c))
      }
    }
    setVoting(false)
  }

  if (loading) return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950">
      <p className="text-zinc-400">불러오는 중...</p>
    </main>
  )

  if (!poll) return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950">
      <p className="text-zinc-400">투표를 찾을 수 없습니다.</p>
    </main>
  )

  const totalVotes = candidates.reduce((sum, c) => sum + c.voteCount, 0)

  return (
    <main className="flex min-h-screen flex-col bg-zinc-950">
      <Navbar />

      <section className="max-w-2xl w-full mx-auto px-4 py-8 flex flex-col gap-6">
        <div>
          <Link href="/polls" className="text-sm text-zinc-400 hover:text-white transition-colors">← 목록</Link>
        </div>

        {/* 투표 정보 */}
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-5 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">{poll.title}</h1>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
              poll.is_active
                ? 'bg-green-500/10 border-green-500/40 text-green-400'
                : 'bg-zinc-700 border-zinc-600 text-zinc-500'
            }`}>
              {poll.is_active ? '진행중' : '종료'}
            </span>
          </div>
          {poll.description && <p className="text-sm text-zinc-300">{poll.description}</p>}
          <div className="flex gap-3 text-xs text-zinc-500 pt-2 border-t border-zinc-700 mt-1">
            <span>1인 최대 <span className="text-zinc-300 font-medium">{poll.max_votes_per_user}</span>표 · 현재 <span className="text-zinc-300 font-medium">{myVotes.length}</span>표 행사</span>
            {poll.ends_at && <span>마감: {new Date(poll.ends_at).toLocaleDateString('ko-KR')}</span>}
          </div>
        </div>

        {/* 후보곡 목록 */}
        <div className="flex flex-col gap-3">
          {candidates.map(candidate => {
            const post = candidate.posts
            if (!post) return null
            const youtubeId = post.youtube_url ? extractYoutubeId(post.youtube_url) : null
            const thumbnail = youtubeId ? getThumbnailUrl(youtubeId) : null
            const isVoted = myVotes.includes(candidate.id)
            const pct = totalVotes > 0 ? Math.round((candidate.voteCount / totalVotes) * 100) : 0

            return (
              <div
                key={candidate.id}
                className={`bg-zinc-800 rounded-xl p-4 flex flex-col gap-3 border-2 transition-all ${
                  isVoted ? 'border-blue-500 bg-blue-500/5' : 'border-zinc-700 hover:border-zinc-500'
                }`}
              >
                <div className="flex gap-4 items-center">
                  {thumbnail ? (
                    <div className="relative w-20 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-zinc-700 border border-zinc-600">
                      <Image src={thumbnail} alt={post.title} fill className="object-cover" unoptimized />
                    </div>
                  ) : (
                    <div className="w-20 h-14 flex-shrink-0 rounded-lg bg-zinc-700 border border-zinc-600 flex items-center justify-center text-zinc-500 text-xl">🎵</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate">{post.title}</p>
                    {post.artist && <p className="text-xs text-zinc-400">{post.artist}</p>}
                    <p className="text-xs text-zinc-500 mt-0.5">{post.users?.nickname}</p>
                  </div>
                  {poll.is_active && (
                    <button
                      onClick={() => handleVote(candidate.id)}
                      disabled={voting}
                      className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium border transition-all disabled:opacity-50 ${
                        isVoted
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'bg-zinc-700 border-zinc-600 text-zinc-300 hover:border-zinc-400 hover:text-white'
                      }`}
                    >
                      {isVoted ? '✓ 투표됨' : '투표'}
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-zinc-700 rounded-full h-2 border border-zinc-600">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-zinc-400 w-20 text-right">{candidate.voteCount}표 ({pct}%)</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* 댓글 */}
        {currentUserId && (
          <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-5">
            <PollCommentSection pollId={poll.id} currentUserId={currentUserId} />
          </div>
        )}
      </section>
    </main>
  )
}
