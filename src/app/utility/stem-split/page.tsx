'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

type Status = 'idle' | 'uploading' | 'queued' | 'processing' | 'completed' | 'failed'

type SeparateUrls = {
  vocals: string
  drums: string
  bass: string
  other: string
  instrumental: string
}

const TRACKS: { key: keyof SeparateUrls; label: string; icon: string }[] = [
  { key: 'vocals', label: '보컬', icon: '🎤' },
  { key: 'drums', label: '드럼', icon: '🥁' },
  { key: 'bass', label: '베이스', icon: '🎸' },
  { key: 'other', label: '나머지 악기', icon: '🎹' },
  { key: 'instrumental', label: '인스트루멘탈 (보컬 제거)', icon: '🎼' },
]

const STATUS_TEXT: Record<Status, string> = {
  idle: '',
  uploading: '파일 업로드 중...',
  queued: '대기열에 등록됐어요...',
  processing: '분리 처리 중이에요...',
  completed: '분리 완료!',
  failed: '분리 실패',
}

type MixResult = { key: string; label: string; url: string }

type HistoryJob = {
  job_id: string
  filename: string
  created_at: string
  urls: SeparateUrls
  mixes: MixResult[]
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function downloadUrl(rawUrl: string, filename: string) {
  const u = new URL(rawUrl)
  u.searchParams.set('download', filename)
  return u.toString()
}

function pitchSpeedHref(url: string, filename: string) {
  return `/utility/pitch-speed?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`
}

function TrackList({ urls, baseName }: { urls: SeparateUrls; baseName: string }) {
  const available = TRACKS.filter(track => urls[track.key])
  return (
    <div className="flex flex-col gap-3">
      {available.map(track => {
        const trackFilename = `${baseName}_${track.key}.mp3`
        return (
          <div key={track.key} className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-lg flex-shrink-0">{track.icon}</span>
                <span className="text-zinc-200 font-medium text-sm truncate">{track.label}</span>
              </div>
              <a
                href={downloadUrl(urls[track.key], trackFilename)}
                className="flex-shrink-0 text-xs text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 px-2 py-1 rounded transition-colors"
              >
                ⬇ 다운로드
              </a>
            </div>
            <audio controls src={urls[track.key]} className="w-full h-10" />
            <Link
              href={pitchSpeedHref(urls[track.key], trackFilename)}
              className="w-fit text-xs text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 px-2 py-1 rounded transition-colors"
            >
              🎛 피치·속도 조절하기
            </Link>
          </div>
        )
      })}
    </div>
  )
}

function MixList({ mixes, baseName }: { mixes: MixResult[]; baseName: string }) {
  if (mixes.length === 0) return null
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-zinc-500">🎚 믹스 결과</p>
      {mixes.map(mix => {
        const mixFilename = `${baseName}_${mix.key}.mp3`
        return (
          <div key={mix.key} className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-zinc-200 font-medium text-sm truncate">{mix.label}</span>
              <a
                href={downloadUrl(mix.url, mixFilename)}
                className="flex-shrink-0 text-xs text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 px-2 py-1 rounded transition-colors"
              >
                ⬇ 다운로드
              </a>
            </div>
            <audio controls src={mix.url} className="w-full h-10" />
            <Link
              href={pitchSpeedHref(mix.url, mixFilename)}
              className="w-fit text-xs text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 px-2 py-1 rounded transition-colors"
            >
              🎛 피치·속도 조절하기
            </Link>
          </div>
        )
      })}
    </div>
  )
}

function StemSplitContent() {
  const searchParams = useSearchParams()
  const [file, setFile] = useState<File | null>(null)
  const [sourceFilename, setSourceFilename] = useState<string | null>(null)
  const [externalUrl, setExternalUrl] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [dragging, setDragging] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [urls, setUrls] = useState<SeparateUrls | null>(null)
  const [progress, setProgress] = useState(0)

  const [userId, setUserId] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryJob[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const url = searchParams.get('file_url')
    const name = searchParams.get('filename')
    if (url && name) {
      setExternalUrl(url)
      setSourceFilename(name)
    }
  }, [searchParams])

  async function fetchHistory() {
    try {
      const res = await fetch('/api/separate/history', { cache: 'no-store' })
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
          setUrls(data.urls)
          stopPolling()
          fetchHistory()
        } else if (data.status === 'failed') {
          setError(data.error ?? '분리 처리 중 오류가 발생했어요.')
          stopPolling()
        }
      } catch {
        setError('상태 조회 중 네트워크 오류가 발생했어요.')
        setStatus('failed')
        stopPolling()
      }
    }, 4000)
  }

  async function requestSeparation(fileUrl: string, filename: string) {
    try {
      const supabase = createClient()
      const res = await fetch('/api/separate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_url: fileUrl }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? '분리 요청에 실패했어요.')
        setStatus('failed')
        return
      }
      setStatus((data.status as Status) ?? 'queued')
      startPolling(data.job_id)
      if (userId) {
        supabase.from('stem_jobs').insert({ job_id: data.job_id, user_id: userId, filename }).then(() => {}, () => {})
      }
    } catch {
      setError('요청 중 네트워크 오류가 발생했어요.')
      setStatus('failed')
    }
  }

  async function handleFile(f: File) {
    const validMimeTypes = ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/flac', 'audio/x-flac', 'audio/ogg', 'audio/mp4', 'audio/x-m4a']
    const isValidType = validMimeTypes.includes(f.type) || /\.(mp3|wav|flac|ogg|m4a)$/i.test(f.name)
    if (!isValidType) {
      setFileError('mp3, wav, flac, ogg, m4a 파일만 업로드할 수 있어요.')
      return
    }
    if (!userId) {
      setFileError('로그인 정보를 확인하는 중이에요. 잠시 후 다시 시도해주세요.')
      return
    }

    setFileError(null)
    setError(null)
    setUrls(null)
    setProgress(0)
    setFile(f)
    setSourceFilename(f.name)
    setExternalUrl(null)
    setStatus('uploading')

    try {
      const supabase = createClient()
      const ext = f.name.split('.').pop()
      const path = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
      const { error: upErr } = await supabase.storage.from('stem-uploads').upload(path, f, { contentType: f.type || undefined })
      if (upErr) {
        setError('파일 업로드에 실패했어요.')
        setStatus('failed')
        return
      }
      const { data: publicUrlData } = supabase.storage.from('stem-uploads').getPublicUrl(path)
      await requestSeparation(publicUrlData.publicUrl, f.name)
    } catch {
      setError('업로드 중 네트워크 오류가 발생했어요.')
      setStatus('failed')
    }
  }

  async function handleStartExternal() {
    if (!externalUrl || !sourceFilename) return
    if (!userId) {
      setError('로그인 정보를 확인하는 중이에요. 잠시 후 다시 시도해주세요.')
      return
    }
    setError(null)
    setUrls(null)
    setProgress(0)
    setStatus('queued')
    await requestSeparation(externalUrl, sourceFilename)
  }

  function reset() {
    stopPolling()
    setFile(null)
    setExternalUrl(null)
    setStatus('idle')
    setError(null)
    setUrls(null)
    setProgress(0)
    setFileError(null)
  }

  useEffect(() => {
    return () => stopPolling()
  }, [])

  const busy = status === 'uploading' || status === 'queued' || status === 'processing'

  return (
    <main className="min-h-screen bg-zinc-950">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
        <Link href="/utility" className="text-zinc-400 hover:text-white transition-colors text-sm w-fit">
          ← 유틸리티
        </Link>

        <div>
          <h1 className="text-2xl font-bold text-white">🎚 음원 분리</h1>
          <p className="text-zinc-400 text-sm mt-1">곡을 보컬·드럼·베이스·나머지 악기로 분리해요. 곡 길이만큼 처리 시간이 걸릴 수 있어요.</p>
        </div>

        {/* 외부에서 가져온 파일 */}
        {status === 'idle' && externalUrl && sourceFilename && (
          <div className="bg-zinc-800 border border-emerald-500/30 rounded-xl p-4 flex items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-zinc-500 text-xs">🔗 다른 도구에서 가져온 파일</span>
              <span className="text-zinc-200 text-sm font-medium truncate">{sourceFilename}</span>
            </div>
            <button
              onClick={handleStartExternal}
              className="flex-shrink-0 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              분리 시작
            </button>
          </div>
        )}

        {/* 파일 업로드 */}
        <label
          htmlFor="stem-input"
          className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-3 transition-colors ${
            busy ? 'opacity-50 cursor-not-allowed border-zinc-700' : dragging ? 'border-emerald-500 bg-emerald-500/5 cursor-pointer' : 'border-zinc-700 hover:border-zinc-500 cursor-pointer'
          }`}
          onDragOver={e => { if (busy) return; e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); if (busy) return; const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
        >
          <span className="text-4xl">{busy ? '⏳' : '🎵'}</span>
          <p className="text-zinc-300 font-medium text-center">
            {file ? file.name : '오디오 파일을 드래그하거나 클릭해서 불러오기'}
          </p>
          <p className="text-zinc-500 text-xs">mp3, wav, flac, ogg, m4a</p>
          {fileError && (
            <p className="text-red-400 text-xs text-center px-2">{fileError}</p>
          )}
          <input
            id="stem-input"
            type="file"
            accept="audio/mpeg,audio/wav,audio/x-wav,audio/flac,audio/ogg,audio/mp4,.mp3,.wav,.flac,.ogg,.m4a"
            className="hidden"
            disabled={busy}
            onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); e.target.value = '' }}
          />
        </label>

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
            {status === 'processing' && (
              <p className="text-zinc-500 text-xs text-center">CPU로 처리해서 시간이 꽤 걸려요. 곡 길이와 비슷한 시간이 걸릴 수 있어요. 페이지를 벗어나도 서버에서는 계속 처리돼요.</p>
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

        {/* 완료 - 트랙 목록 */}
        {status === 'completed' && urls && (
          <div className="flex flex-col gap-4">
            <TrackList urls={urls} baseName={sourceFilename?.replace(/\.[^.]+$/, '') ?? 'track'} />
            <button
              onClick={reset}
              className="w-full py-2.5 bg-zinc-700 hover:bg-zinc-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              새 파일 분리하기
            </button>
          </div>
        )}

        {/* 최근 기록 */}
        <div className="flex flex-col gap-3 pt-4 border-t border-zinc-800">
          <div>
            <h2 className="text-lg font-semibold text-white">최근 기록</h2>
            <p className="text-zinc-500 text-xs mt-1">결과 파일은 생성된 지 1시간이 지나면 서버에서 자동으로 삭제돼요. 본인이 올린 기록만 보여요.</p>
          </div>
          {historyLoading ? (
            <p className="text-zinc-500 text-sm">불러오는 중...</p>
          ) : history.length === 0 ? (
            <p className="text-zinc-500 text-sm">아직 남아있는 기록이 없어요.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {history.map(job => (
                <div key={job.job_id} className="bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpandedJobId(expandedJobId === job.job_id ? null : job.job_id)}
                    className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-zinc-700/50 transition-colors"
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-zinc-200 text-sm font-medium truncate">{job.filename}</span>
                      <span className="text-zinc-500 text-xs">{formatDate(job.created_at)}</span>
                    </div>
                    <span className="text-zinc-500 text-sm flex-shrink-0">{expandedJobId === job.job_id ? '▲' : '▼'}</span>
                  </button>
                  {expandedJobId === job.job_id && (
                    <div className="px-4 pb-4 flex flex-col gap-3">
                      <Link
                        href={`/utility/stem-split/mix/${job.job_id}?filename=${encodeURIComponent(job.filename)}`}
                        className="w-fit text-xs text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 hover:border-emerald-500 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        🎚 믹스 만들기
                      </Link>
                      <TrackList urls={job.urls} baseName={job.filename.replace(/\.[^.]+$/, '')} />
                      <MixList mixes={job.mixes} baseName={job.filename.replace(/\.[^.]+$/, '')} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

export default function StemSplitPage() {
  return (
    <Suspense fallback={null}>
      <StemSplitContent />
    </Suspense>
  )
}
