'use client'

import { useEffect, useRef, useState } from 'react'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import type { SoundTouchNode as SoundTouchNodeType } from '@soundtouchjs/audio-worklet'

export default function PitchSpeedPage() {
  const [file, setFile] = useState<File | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [tempo, setTempo] = useState(1.0)
  const [pitch, setPitch] = useState(0)
  const [loading, setLoading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)

  const audioCtxRef = useRef<AudioContext | null>(null)
  const audioBufferRef = useRef<AudioBuffer | null>(null)
  const stNodeRef = useRef<SoundTouchNodeType | null>(null)
  const sourceRef = useRef<AudioBufferSourceNode | null>(null)
  const startRealTimeRef = useRef(0)  // 재생 시작 시 ctx.currentTime
  const startOffsetRef = useRef(0)    // 재생 시작 시 버퍼 내 오프셋
  const offsetRef = useRef(0)         // 일시정지/탐색 시 저장되는 오프셋
  const tempoRef = useRef(1.0)
  const rafRef = useRef<number>(0)
  const isPlayingRef = useRef(false)

  async function initAudio() {
    if (audioCtxRef.current) return
    const { SoundTouchNode } = await import('@soundtouchjs/audio-worklet')
    const ctx = new AudioContext()
    audioCtxRef.current = ctx
    await SoundTouchNode.register(ctx, '/soundtouch-processor.js')
    const stNode = new SoundTouchNode({ context: ctx })
    stNode.connect(ctx.destination)
    stNodeRef.current = stNode
  }

  async function handleFile(f: File) {
    if (!f.type.startsWith('audio/') && !f.name.match(/\.(m4a|mp4|aac)$/i)) return
    setFileError(null)
    setLoading(true)
    stop()
    try {
      await initAudio()
      const ab = await f.arrayBuffer()
      const audioBuffer = await audioCtxRef.current!.decodeAudioData(ab)
      audioBufferRef.current = audioBuffer
      setDuration(audioBuffer.duration)
      setCurrentTime(0)
      offsetRef.current = 0
      setFile(f)
    } catch {
      setFileError('이 파일은 현재 브라우저에서 재생할 수 없어요. Chrome/Edge에서 시도하거나 mp3, wav 형식으로 변환 후 사용해 주세요.')
    } finally {
      setLoading(false)
    }
  }

  function stop() {
    isPlayingRef.current = false
    if (sourceRef.current) {
      try { sourceRef.current.stop() } catch (_) {}
      sourceRef.current.disconnect()
      sourceRef.current = null
    }
    setIsPlaying(false)
    cancelAnimationFrame(rafRef.current)
  }

  function play() {
    if (!audioBufferRef.current || !audioCtxRef.current || !stNodeRef.current) return

    stop()

    const ctx = audioCtxRef.current
    const stNode = stNodeRef.current
    const source = ctx.createBufferSource()
    source.buffer = audioBufferRef.current
    source.playbackRate.value = tempo
    source.connect(stNode)

    stNode.playbackRate.value = tempo
    stNode.pitchSemitones.value = pitch

    const offset = Math.min(offsetRef.current, audioBufferRef.current.duration - 0.01)
    source.start(0, offset)
    startRealTimeRef.current = ctx.currentTime
    startOffsetRef.current = offset
    sourceRef.current = source
    isPlayingRef.current = true
    setIsPlaying(true)

    source.addEventListener('ended', () => {
      // sourceRef.current가 이 소스가 아니면 stop()으로 중지된 것 → 무시
      if (sourceRef.current !== source) return
      isPlayingRef.current = false
      setIsPlaying(false)
      offsetRef.current = 0
      setCurrentTime(0)
      cancelAnimationFrame(rafRef.current)
    })

    function tick() {
      if (!audioCtxRef.current) return
      const realElapsed = audioCtxRef.current.currentTime - startRealTimeRef.current
      const bufferPos = startOffsetRef.current + realElapsed * tempoRef.current
      setCurrentTime(Math.min(bufferPos, audioBufferRef.current?.duration ?? 0))
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  function pause() {
    if (!audioCtxRef.current || !sourceRef.current) return
    const realElapsed = audioCtxRef.current.currentTime - startRealTimeRef.current
    offsetRef.current = Math.min(
      startOffsetRef.current + realElapsed * tempoRef.current,
      audioBufferRef.current?.duration ?? 0
    )
    stop()
  }

  function handleTempoChange(v: number) {
    // tempo 변경 시 기준점 재설정 (이전 tempo로 계산한 현재 버퍼 위치를 새 기준으로)
    if (audioCtxRef.current && isPlayingRef.current) {
      const realElapsed = audioCtxRef.current.currentTime - startRealTimeRef.current
      startOffsetRef.current = startOffsetRef.current + realElapsed * tempoRef.current
      startRealTimeRef.current = audioCtxRef.current.currentTime
    }
    tempoRef.current = v
    setTempo(v)
    if (sourceRef.current) sourceRef.current.playbackRate.value = v
    if (stNodeRef.current) stNodeRef.current.playbackRate.value = v
  }

  function handlePitchChange(v: number) {
    setPitch(v)
    if (stNodeRef.current) stNodeRef.current.pitchSemitones.value = v
  }

  function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
    if (!duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    offsetRef.current = ratio * duration
    setCurrentTime(offsetRef.current)
    if (isPlayingRef.current) play()
  }

  function audioBufferToWav(buffer: AudioBuffer): Blob {
    const numChannels = buffer.numberOfChannels
    const sampleRate = buffer.sampleRate
    const blockAlign = numChannels * 2
    const dataSize = buffer.length * blockAlign
    const ab = new ArrayBuffer(44 + dataSize)
    const view = new DataView(ab)
    const ws = (off: number, str: string) => { for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i)) }
    ws(0, 'RIFF'); view.setUint32(4, 36 + dataSize, true); ws(8, 'WAVE')
    ws(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true)
    view.setUint16(22, numChannels, true); view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * blockAlign, true); view.setUint16(32, blockAlign, true)
    view.setUint16(34, 16, true); ws(36, 'data'); view.setUint32(40, dataSize, true)
    let off = 44
    for (let i = 0; i < buffer.length; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        const s = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]))
        view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true)
        off += 2
      }
    }
    return new Blob([ab], { type: 'audio/wav' })
  }

  async function audioBufferToMp3(buffer: AudioBuffer): Promise<Blob> {
    const { Mp3Encoder } = await import('@breezystack/lamejs')
    const numChannels = buffer.numberOfChannels
    const sampleRate = buffer.sampleRate
    const encoder = new Mp3Encoder(numChannels, sampleRate, 320)
    const blockSize = 1152
    const mp3Data: BlobPart[] = []

    const channels: Int16Array[] = []
    for (let ch = 0; ch < numChannels; ch++) {
      const float = buffer.getChannelData(ch)
      const int16 = new Int16Array(float.length)
      for (let i = 0; i < float.length; i++) {
        const s = Math.max(-1, Math.min(1, float[i]))
        int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
      }
      channels.push(int16)
    }

    for (let i = 0; i < channels[0].length; i += blockSize) {
      const left = channels[0].subarray(i, i + blockSize)
      const right = numChannels > 1 ? channels[1].subarray(i, i + blockSize) : left
      const buf = encoder.encodeBuffer(left, right) as unknown as Uint8Array<ArrayBuffer>
      if (buf.length > 0) mp3Data.push(buf)
    }
    const end = encoder.flush() as unknown as Uint8Array<ArrayBuffer>
    if (end.length > 0) mp3Data.push(end)

    return new Blob(mp3Data, { type: 'audio/mp3' })
  }

  async function handleExport(format: 'wav' | 'mp3') {
    if (!audioBufferRef.current || !file) return
    setExporting(true)
    try {
      const { processOffline } = await import('@soundtouchjs/audio-worklet')
      const processed = await processOffline({
        input: audioBufferRef.current,
        processorUrl: '/soundtouch-processor.js',
        pitchSemitones: pitch,
        playbackRate: tempo,
      })
      const blob = format === 'mp3' ? await audioBufferToMp3(processed) : audioBufferToWav(processed)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const baseName = file.name.replace(/\.[^.]+$/, '')
      const pitchStr = pitch > 0 ? `+${pitch}` : `${pitch}`
      a.download = `${baseName}_pitch${pitchStr}_speed${tempo.toFixed(2)}x.${format}`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  function formatTime(s: number) {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current)
      audioCtxRef.current?.close()
    }
  }, [])

  return (
    <main className="min-h-screen bg-zinc-950">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
        <Link href="/utility" className="text-zinc-400 hover:text-white transition-colors text-sm w-fit">
          ← 유틸리티
        </Link>

        <div>
          <h1 className="text-2xl font-bold text-white">🎛 피치 / 속도 조절</h1>
          <p className="text-zinc-400 text-sm mt-1">오디오 파일을 불러와 피치와 속도를 독립적으로 조절해 연습하세요.</p>
        </div>

        {/* 파일 업로드 */}
        <label
          htmlFor="audio-input"
          className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-colors ${
            dragging ? 'border-emerald-500 bg-emerald-500/5' : 'border-zinc-700 hover:border-zinc-500'
          }`}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
        >
          <span className="text-4xl">{loading ? '⏳' : '🎵'}</span>
          <p className="text-zinc-300 font-medium text-center">
            {loading ? '파일 불러오는 중...' : file ? file.name : '오디오 파일을 드래그하거나 클릭해서 불러오기'}
          </p>
          <p className="text-zinc-500 text-xs">mp3, wav, ogg, m4a, flac 등</p>
          {fileError && (
            <p className="text-red-400 text-xs text-center px-2">{fileError}</p>
          )}
          <input
            id="audio-input"
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); e.target.value = '' }}
          />
        </label>

        {/* 플레이어 */}
        {file && !loading && (
          <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6 flex flex-col gap-6">

            {/* 프로그레스바 + 시간 */}
            <div className="flex flex-col gap-2">
              <div
                className="w-full h-2 bg-zinc-700 rounded-full cursor-pointer group relative"
                onClick={handleSeek}
              >
                <div
                  className="h-2 bg-emerald-500 rounded-full transition-none"
                  style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
                />
              </div>
              <div className="flex justify-between text-xs text-zinc-500">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* 재생/일시정지 */}
            <div className="flex justify-center">
              <button
                onClick={isPlaying ? pause : play}
                className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-500 transition-colors flex items-center justify-center text-[#ffffff]"
              >
                {isPlaying ? (
                  <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                )}
              </button>
            </div>

            {/* 속도 슬라이더 */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-zinc-200">속도</label>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono text-emerald-400 w-14 text-right">{tempo.toFixed(2)}x</span>
                  <button
                    onClick={() => handleTempoChange(1.0)}
                    className="text-xs text-zinc-500 hover:text-zinc-300 border border-zinc-700 hover:border-zinc-500 px-2 py-0.5 rounded transition-colors"
                  >
                    리셋
                  </button>
                </div>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.05"
                value={tempo}
                onChange={e => handleTempoChange(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <div className="relative h-4 text-xs text-zinc-400">
                <span className="absolute left-0">0.5x</span>
                <span className="absolute -translate-x-1/2" style={{ left: '33.33%' }}>1.0x</span>
                <span className="absolute right-0">2.0x</span>
              </div>
            </div>

            {/* 피치 슬라이더 */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-zinc-200">피치</label>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono text-blue-400 w-14 text-right">
                    {pitch > 0 ? `+${pitch}` : pitch} 반음
                  </span>
                  <button
                    onClick={() => handlePitchChange(0)}
                    className="text-xs text-zinc-500 hover:text-zinc-300 border border-zinc-700 hover:border-zinc-500 px-2 py-0.5 rounded transition-colors"
                  >
                    리셋
                  </button>
                </div>
              </div>
              <input
                type="range"
                min="-12"
                max="12"
                step="1"
                value={pitch}
                onChange={e => handlePitchChange(parseInt(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer"
              />
              <div className="flex justify-between text-xs text-zinc-400">
                <span>-12</span>
                <span>0</span>
                <span>+12</span>
              </div>
            </div>

            {/* 내보내기 */}
            <div className="flex gap-2">
              <button
                onClick={() => handleExport('wav')}
                disabled={exporting}
                className="flex-1 py-2.5 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                {exporting ? '⏳ 변환 중...' : '⬇ WAV'}
              </button>
              <button
                onClick={() => handleExport('mp3')}
                disabled={exporting}
                className="flex-1 py-2.5 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                {exporting ? '⏳ 변환 중...' : '⬇ MP3'}
              </button>
            </div>

          </div>
        )}
      </div>
    </main>
  )
}
