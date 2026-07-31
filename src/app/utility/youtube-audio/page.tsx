'use client'

import { useEffect, useRef, useState } from 'react'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

type Status = 'idle' | 'submitting' | 'queued' | 'processing' | 'uploading' | 'completed' | 'failed'

type Result = {
  filename: string
  url: string
}

type HistoryJob = {
  job_id: string
  filename: string
  created_at: string
  url: string
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const STATUS_TEXT: Record<Status, string> = {
  idle: '',
  submitting: '요청 중...',
  queued: '대기열에 등록됐어요...',
  processing: '오디오 추출 중이에요...',
  uploading: '업로드 마무리 중...',
  completed: '완료!',
  failed: '실패',
}

function isYoutubeUrl(url: string) {
  return /(?:youtube\.com\/watch\?v=|youtu\.be\/)[A-Za-z0-9_-]{11}/.test(url)
}

function downloadUrl(rawUrl: string, filename: string) {
  const name = filename.toLowerCase().endsWith('.mp3') ? filename : `${filename}.mp3`
  const u = new URL(rawUrl)
  u.searchParams.set('download', name)
  return u.toString()
}

function SendToButtons({ url, filename }: { url: string; filename: string }) {
  const linkClass = "text-xs text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 px-2 py-1 rounded transition-colors"
  return (
    <div className="flex flex-wrap gap-2">
      <Link href={`/utility/stem-split?file_url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`} className={linkClass}>
        🎚 음원 분리하기
      </Link>
      <Link href={`/utility/pitch-speed?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`} className={linkClass}>
        🎛 피치·속도 조절하기
      </Link>
    </div>
  )
}

export default function YoutubeAudioPage() {
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [progress, setProgress] = useState(0)
  const [urlError, setUrlError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Result | null>(null)

  const [userId, setUserId] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryJob[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function fetchHistory() {
    try {
      const res = await fetch('/api/youtube-audio/history', { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      setHistory(data.jobs ?? [])
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null))
    fetchHistory()
  }, [])

  function stopPolling() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  function startPolling(jobId: string) {
    stopPolling()
    intervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/separate/status/${jobId}`, { cache: 'no-store' })
        const data = await res.json()
        if (!res.ok) {
          setError(data.error ?? '상태 조회에 실패했어요.')
          setStatus('failed')
          stopPolling()
          return
        }
        setStatus(data.status as Status)
        setProgress(typeof data.progress === 'number' ? data.progress : 0)
        if (data.status === 'completed') {
          setResult({ filename: data.filename, url: data.urls?.audio })
          stopPolling()
          if (userId) {
            const supabase = createClient()
            supabase.from('youtube_jobs').insert({ job_id: jobId, user_id: userId, filename: data.filename }).then(() => fetchHistory(), () => {})
          }
        } else if (data.status === 'failed') {
          setError(data.error ?? '추출 중 오류가 발생했어요.')
          stopPolling()
        }
      } catch {
        setError('상태 조회 중 네트워크 오류가 발생했어요.')
        setStatus('failed')
        stopPolling()
      }
    }, 4000)
  }

  async function handleSubmit() {
    if (!isYoutubeUrl(url)) {
      setUrlError('올바른 유튜브 링크를 입력해주세요.')
      return
    }

    setUrlError(null)
    setError(null)
    setResult(null)
    setProgress(0)
    setStatus('submitting')

    try {
      const res = await fetch('/api/youtube-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? '추출 요청에 실패했어요.')
        setStatus('failed')
        return
      }
      setStatus((data.status as Status) ?? 'queued')
      startPolling(data.job_id)
    } catch {
      setError('요청 중 네트워크 오류가 발생했어요.')
      setStatus('failed')
    }
  }

  function reset() {
    stopPolling()
    setUrl('')
    setStatus('idle')
    setError(null)
    setResult(null)
    setProgress(0)
    setUrlError(null)
  }

  useEffect(() => {
    return () => stopPolling()
  }, [])

  const busy = status === 'submitting' || status === 'queued' || status === 'processing' || status === 'uploading'

  return (
    <main className="min-h-screen bg-zinc-950">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
        <Link href="/utility" className="text-zinc-400 hover:text-white transition-colors text-sm w-fit">
          ← 유틸리티
        </Link>

        <div>
          <h1 className="text-2xl font-bold text-white">📺 유튜브 음원 추출</h1>
          <p className="text-zinc-400 text-sm mt-1">유튜브 링크를 넣으면 오디오만 뽑아서 mp3로 만들어줘요.</p>
          <p className="text-zinc-500 text-xs mt-1">추출된 파일은 15분 후 서버에서 자동으로 삭제돼요.</p>
        </div>

        {/* 링크 입력 */}
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              type="url"
              value={url}
              onChange={e => { setUrl(e.target.value); setUrlError(null) }}
              placeholder="https://youtu.be/..."
              disabled={busy}
              className="flex-1 min-w-0 bg-zinc-900 border border-zinc-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-400 disabled:opacity-50"
            />
            <button
              onClick={handleSubmit}
              disabled={busy || !url}
              className="flex-shrink-0 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
            >
              추출하기
            </button>
          </div>
          {urlError && <p className="text-red-400 text-xs">{urlError}</p>}
        </div>

        {/* 진행 상태 */}
        {busy && (
          <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-zinc-600 border-t-emerald-500 rounded-full animate-spin" />
            <p className="text-zinc-200 text-sm font-medium">{STATUS_TEXT[status]}</p>
            {(status === 'queued' || status === 'processing') && (
              <div className="w-full flex flex-col gap-1.5">
                <div className="w-full h-2 bg-zinc-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-zinc-500 text-xs text-right font-mono">{progress}%</p>
              </div>
            )}
          </div>
        )}

        {/* 실패 */}
        {status === 'failed' && (
          <div className="bg-zinc-800 border border-red-900/50 rounded-xl p-6 flex flex-col items-center gap-3">
            <span className="text-3xl">⚠️</span>
            <p className="text-red-400 text-sm text-center">{error}</p>
            <button
              onClick={reset}
              className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              다시 시도
            </button>
          </div>
        )}

        {/* 완료 */}
        {status === 'completed' && result && (
          <div className="flex flex-col gap-4">
            <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-zinc-200 font-medium text-sm truncate">{result.filename}</span>
                <a
                  href={downloadUrl(result.url, result.filename)}
                  className="flex-shrink-0 text-xs text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 px-2 py-1 rounded transition-colors"
                >
                  ⬇ 다운로드
                </a>
              </div>
              <audio controls src={result.url} className="w-full h-10" />
              <SendToButtons url={result.url} filename={result.filename} />
            </div>
            <button
              onClick={reset}
              className="w-full py-2.5 bg-zinc-700 hover:bg-zinc-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              다른 링크 추출하기
            </button>
          </div>
        )}

        {/* 최근 기록 */}
        <div className="flex flex-col gap-3 pt-4 border-t border-zinc-800">
          <div>
            <h2 className="text-lg font-semibold text-white">최근 기록</h2>
            <p className="text-zinc-500 text-xs mt-1">본인이 추출한 기록만 보여요. 15분 지나면 목록에서 사라져요.</p>
          </div>
          {historyLoading ? (
            <p className="text-zinc-500 text-sm">불러오는 중...</p>
          ) : history.length === 0 ? (
            <p className="text-zinc-500 text-sm">아직 남아있는 기록이 없어요.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {history.map(job => (
                <div key={job.job_id} className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-zinc-200 font-medium text-sm truncate">{job.filename}</span>
                      <span className="text-zinc-500 text-xs">{formatDate(job.created_at)}</span>
                    </div>
                    <a
                      href={downloadUrl(job.url, job.filename)}
                      className="flex-shrink-0 text-xs text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 px-2 py-1 rounded transition-colors"
                    >
                      ⬇ 다운로드
                    </a>
                  </div>
                  <audio controls src={job.url} className="w-full h-10" />
                  <SendToButtons url={job.url} filename={job.filename} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
