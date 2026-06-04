'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

interface Poll {
  id: number
  title: string
  description: string | null
  max_votes_per_user: number
  is_active: boolean
  ends_at: string | null
  created_at: string
}

interface Candidate {
  id: number
  post_id: number
  posts: { title: string; artist: string | null } | null
  voters: string[]
}

export default function PollStatsPage() {
  const { id } = useParams()
  const router = useRouter()
  const [poll, setPoll] = useState<Poll | null>(null)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [totalVoters, setTotalVoters] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      const { data: pollData } = await supabase.from('polls').select('*').eq('id', id).single()
      if (!pollData) { router.push('/admin/polls'); return }
      setPoll(pollData)

      const { data: candidatesData } = await supabase
        .from('poll_candidates')
        .select('id, post_id, posts(title, artist)')
        .eq('poll_id', id)
        .order('id', { ascending: true })

      const { data: votesData } = await supabase
        .from('poll_votes')
        .select('candidate_id, users(nickname)')
        .eq('poll_id', id)

      const enriched: Candidate[] = ((candidatesData ?? []) as unknown as Candidate[]).map(c => ({
        ...c,
        voters: (votesData ?? [])
          .filter((v: any) => v.candidate_id === c.id)
          .map((v: any) => v.users?.nickname ?? '알 수 없음'),
      }))

      setCandidates(enriched)

      const uniqueVoters = new Set(
        (votesData ?? []).map((v: any) => v.users?.nickname).filter(Boolean)
      )
      setTotalVoters(uniqueVoters.size)

      setLoading(false)
    }
    load()
  }, [id, router])

  if (loading) return <p className="text-zinc-400">불러오는 중...</p>
  if (!poll) return null

  const totalVotes = candidates.reduce((sum, c) => sum + c.voters.length, 0)
  const maxVotes = Math.max(...candidates.map(c => c.voters.length), 1)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/polls" className="text-zinc-500 hover:text-zinc-200 transition-colors text-sm">← 투표 관리</Link>
        <h1 className="text-2xl font-bold text-white">투표 현황</h1>
      </div>

      {/* 기본 정보 */}
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-5 flex flex-col gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-lg font-semibold text-white">{poll.title}</h2>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium border flex-shrink-0 ${
            poll.is_active
              ? 'bg-green-500/10 border-green-500/40 text-green-400'
              : 'bg-zinc-700 border-zinc-600 text-zinc-500'
          }`}>
            {poll.is_active ? '진행중' : '종료'}
          </span>
        </div>
        {poll.description && <p className="text-sm text-zinc-400">{poll.description}</p>}
        <div className="flex flex-wrap gap-4 text-sm text-zinc-500 pt-2 border-t border-zinc-700">
          <span>1인 최대 <span className="text-zinc-300">{poll.max_votes_per_user}표</span></span>
          {poll.ends_at && <span>마감 <span className="text-zinc-300">{new Date(poll.ends_at).toLocaleDateString('ko-KR')}</span></span>}
          <span>총 투표 <span className="text-zinc-300">{totalVotes}표</span></span>
          <span>참여 인원 <span className="text-zinc-300">{totalVoters}명</span></span>
        </div>
      </div>

      {/* 후보곡별 현황 */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">후보곡별 득표</h3>
        {candidates.length === 0 && (
          <p className="text-zinc-500 text-sm">등록된 후보곡이 없습니다.</p>
        )}
        {candidates
          .slice()
          .sort((a, b) => b.voters.length - a.voters.length)
          .map((candidate, idx) => {
            const pct = totalVotes === 0 ? 0 : Math.round((candidate.voters.length / totalVotes) * 100)
            const barWidth = totalVotes === 0 ? 0 : (candidate.voters.length / maxVotes) * 100
            return (
              <div key={candidate.id} className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500 font-mono w-4">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{candidate.posts?.title ?? '(삭제된 곡)'}</p>
                    {candidate.posts?.artist && (
                      <p className="text-xs text-zinc-500">{candidate.posts.artist}</p>
                    )}
                  </div>
                  <span className="text-lg font-bold text-white flex-shrink-0">{candidate.voters.length}표</span>
                  <span className="text-sm text-zinc-400 flex-shrink-0 w-10 text-right">{pct}%</span>
                </div>

                {/* 득표 바 */}
                <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>

                {/* 투표한 사람 */}
                {candidate.voters.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {candidate.voters.map((nickname, i) => (
                      <span key={i} className="text-xs bg-zinc-700 border border-zinc-600 text-zinc-300 px-2 py-0.5 rounded-full">
                        {nickname}
                      </span>
                    ))}
                  </div>
                )}
                {candidate.voters.length === 0 && (
                  <p className="text-xs text-zinc-600">투표 없음</p>
                )}
              </div>
            )
          })}
      </div>
    </div>
  )
}
