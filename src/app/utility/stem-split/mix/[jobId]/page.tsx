'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Link from 'next/link'

type Stem = 'vocals' | 'drums' | 'bass' | 'other'
type Status = 'idle' | 'submitting' | 'queued' | 'processing' | 'uploading' | 'completed' | 'failed'

const STEM_ORDER: Stem[] = ['vocals', 'drums', 'bass', 'other']
const STEM_LABELS: Record<Stem, string> = { vocals: '보컬', drums: '드럼', bass: '베이스', other: '기타' }

type Combo = { key: string; stems: Stem[]; label: string }

const PRESET_STEMS: Stem[][] = [
  ['vocals'],
  ['drums'],
  ['bass'],
  ['other'],
  ['drums', 'bass', 'other'],
]

function sortStems(stems: Stem[]): Stem[] {
  return STEM_ORDER.filter(s => stems.includes(s))
}

function isInstrumental(sorted: Stem[]) {
  return sorted.length === 3 && sorted.join(',') === 'drums,bass,other'
}

function makeKey(stems: Stem[]): string {
  const sorted = sortStems(stems)
  if (isInstrumental(sorted)) return 'instrumental'
  if (sorted.length === 1) return `${sorted[0]}_only`
  return sorted.join('_')
}

function makeLabel(stems: Stem[]): string {
  const sorted = sortStems(stems)
  if (isInstrumental(sorted)) return '인스트루멘탈'
  return sorted.map(s => STEM_LABELS[s]).join('+')
}

function downloadUrl(rawUrl: string, filename: string) {
  const u = new URL(rawUrl)
  u.searchParams.set('download', filename)
  return u.toString()
}

const STATUS_TEXT: Record<Status, string> = {
  idle: '',
  submitting: '요청 중...',
  queued: '대기열에 등록됐어요...',
  processing: '믹스 만드는 중이에요...',
  uploading: '업로드 마무리 중...',
  completed: '완료!',
  failed: '실패',
}

function MixPageContent() {
  const { jobId } = useParams<{ jobId: string }>()
  const searchParams = useSearchParams()
  const filename = searchParams.get('filename') ?? '선택한 곡'
  const baseName = filename.replace(/\.[^.]+$/, '')

  const [pending, setPending] = useState<Combo[]>([])
  const [checked, setChecked] = useState<Set<Stem>>(new Set())
  const [notice, setNotice] = useState<string | null>(null)

  const [status, setStatus] = useState<Status>('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, string> | null>(null)
  const [resultCombos, setResultCombos] = useState<Combo[]>([])

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function stopPolling() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  useEffect(() => {
    return () => stopPolling()
  }, [])

  function addCombo(stems: Stem[]) {
    if (stems.length === 0) {
      setNotice('파트를 1개 이상 선택해주세요.')
      return
    }
    const key = makeKey(stems)
    if (pending.some(c => c.key === key)) {
      setNotice('이미 추가된 조합이에요.')
      return
    }
    setNotice(null)
    setPending(prev => [...prev, { key, stems: sortStems(stems), label: makeLabel(stems) }])
  }

  function toggleCheck(stem: Stem) {
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(stem)) next.delete(stem)
      else next.add(stem)
      return next
    })
  }

  function handleAddCustom() {
    addCombo(Array.from(checked))
    setChecked(new Set())
  }

  function removeCombo(key: string) {
    setPending(prev => prev.filter(c => c.key !== key))
  }

  function startPolling(mixJobId: string) {
    stopPolling()
    intervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/separate/status/${mixJobId}`, { cache: 'no-store' })
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
          setResults(data.urls ?? {})
          stopPolling()
        } else if (data.status === 'failed') {
          setError(data.error ?? '믹스 처리 중 오류가 발생했어요.')
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
    if (pending.length === 0) return
    setError(null)
    setResults(null)
    setProgress(0)
    setResultCombos(pending)
    setStatus('submitting')

    try {
      const res = await fetch('/api/mix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId, mixes: pending.map(c => ({ key: c.key, stems: c.stems })) }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? '믹스 요청에 실패했어요.')
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

  function retry() {
    stopPolling()
    setStatus('idle')
    setError(null)
    setResults(null)
    setProgress(0)
  }

  function startOver() {
    retry()
    setPending([])
  }

  const busy = status === 'submitting' || status === 'queued' || status === 'processing' || status === 'uploading'

  return (
    <main className="min-h-screen bg-zinc-950">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
        <Link href="/utility/stem-split" className="text-zinc-400 hover:text-white transition-colors text-sm w-fit">
          ← 음원 분리
        </Link>

        <div>
          <h1 className="text-2xl font-bold text-white">🎚 믹스 만들기</h1>
          <p className="text-zinc-400 text-sm mt-1 truncate">{filename}</p>
          <p className="text-zinc-500 text-xs mt-1">분리 완료 후 1시간이 지나면 원본이 사라져서 믹스를 만들 수 없어요.</p>
        </div>

        {status === 'idle' && (
          <>
            {/* 프리셋 */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-zinc-300">프리셋</label>
              <div className="flex flex-wrap gap-2">
                {PRESET_STEMS.map(stems => (
                  <button
                    key={makeKey(stems)}
                    onClick={() => addCombo(stems)}
                    className="px-3 py-2 bg-zinc-800 border border-zinc-700 hover:border-emerald-500 text-zinc-200 text-sm rounded-lg transition-colors"
                  >
                    {makeLabel(stems)}
                  </button>
                ))}
              </div>
            </div>

            {/* 커스텀 조합 */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-zinc-300">직접 조합 만들기</label>
              <div className="flex items-center gap-3 flex-wrap">
                {STEM_ORDER.map(stem => (
                  <label key={stem} className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={checked.has(stem)}
                      onChange={() => toggleCheck(stem)}
                      className="w-4 h-4 accent-emerald-500"
                    />
                    <span className="text-sm text-zinc-300">{STEM_LABELS[stem]}</span>
                  </label>
                ))}
                <button
                  onClick={handleAddCustom}
                  className="ml-auto px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  이 조합 추가
                </button>
              </div>
            </div>

            {notice && <p className="text-amber-500 text-xs">{notice}</p>}

            {/* 선택된 조합 */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-zinc-300">선택한 조합 ({pending.length}개)</label>
              {pending.length === 0 ? (
                <p className="text-zinc-500 text-sm">아직 추가한 조합이 없어요.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {pending.map(c => (
                    <div key={c.key} className="flex items-center gap-1.5 bg-zinc-800 border border-zinc-700 rounded-lg pl-3 pr-2 py-1.5">
                      <span className="text-sm text-zinc-200">{c.label}</span>
                      <button
                        onClick={() => removeCombo(c.key)}
                        className="text-zinc-500 hover:text-red-400 text-sm flex-shrink-0"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handleSubmit}
              disabled={pending.length === 0}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
            >
              {pending.length > 0 ? `${pending.length}개 조합 요청하기` : '조합을 추가해주세요'}
            </button>
          </>
        )}

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
              onClick={retry}
              className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              다시 시도
            </button>
          </div>
        )}

        {/* 완료 */}
        {status === 'completed' && results && (
          <div className="flex flex-col gap-4">
            {resultCombos.map(c => {
              const url = results[c.key]
              return (
                <div key={c.key} className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 flex flex-col gap-2">
                  {url ? (
                    <>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-zinc-200 font-medium text-sm truncate">{c.label}</span>
                        <a
                          href={downloadUrl(url, `${baseName}_${c.key}.mp3`)}
                          className="flex-shrink-0 text-xs text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 px-2 py-1 rounded transition-colors"
                        >
                          ⬇ 다운로드
                        </a>
                      </div>
                      <audio controls src={url} className="w-full h-10" />
                    </>
                  ) : (
                    <p className="text-zinc-500 text-sm">
                      <span className="text-zinc-300">{c.label}</span> — 원본이 만료돼서 만들지 못했어요. 다시 분리해주세요.
                    </p>
                  )}
                </div>
              )
            })}
            <button
              onClick={startOver}
              className="w-full py-2.5 bg-zinc-700 hover:bg-zinc-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              새로 만들기
            </button>
          </div>
        )}
      </div>
    </main>
  )
}

export default function MixPage() {
  return (
    <Suspense fallback={null}>
      <MixPageContent />
    </Suspense>
  )
}
