'use client'

import { useEffect, useRef, useState } from 'react'
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

export default function StemSplitPage() {
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [dragging, setDragging] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [urls, setUrls] = useState<SeparateUrls | null>(null)

  const [userId, setUserId] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null))
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
        if (data.status === 'completed') {
          setUrls(data.urls)
          stopPolling()
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
    setFile(f)
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

      const res = await fetch('/api/separate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_url: publicUrlData.publicUrl }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? '분리 요청에 실패했어요.')
        setStatus('failed')
        return
      }
      setStatus((data.status as Status) ?? 'queued')
      startPolling(data.job_id)
    } catch {
      setError('업로드 중 네트워크 오류가 발생했어요.')
      setStatus('failed')
    }
  }

  function reset() {
    stopPolling()
    setFile(null)
    setStatus('idle')
    setError(null)
    setUrls(null)
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
            {TRACKS.map(track => (
              <div key={track.key} className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{track.icon}</span>
                    <span className="text-zinc-200 font-medium text-sm">{track.label}</span>
                  </div>
                  <a
                    href={`${urls[track.key]}?download=${encodeURIComponent(`${file?.name.replace(/\.[^.]+$/, '') ?? 'track'}_${track.key}.mp3`)}`}
                    className="text-xs text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 px-2 py-1 rounded transition-colors"
                  >
                    ⬇ 다운로드
                  </a>
                </div>
                <audio controls src={urls[track.key]} className="w-full h-10" />
              </div>
            ))}
            <button
              onClick={reset}
              className="w-full py-2.5 bg-zinc-700 hover:bg-zinc-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              새 파일 분리하기
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
