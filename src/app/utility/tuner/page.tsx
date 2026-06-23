'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Navbar from '@/components/Navbar'
import Link from 'next/link'

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

const GUITAR_STRINGS = [
  { label: '6번줄', note: 'E', octave: 2 },
  { label: '5번줄', note: 'A', octave: 2 },
  { label: '4번줄', note: 'D', octave: 3 },
  { label: '3번줄', note: 'G', octave: 3 },
  { label: '2번줄', note: 'B', octave: 3 },
  { label: '1번줄', note: 'E', octave: 4 },
]

const BASS_STRINGS = [
  { label: '4번줄', note: 'E', octave: 1 },
  { label: '3번줄', note: 'A', octave: 1 },
  { label: '2번줄', note: 'D', octave: 2 },
  { label: '1번줄', note: 'G', octave: 2 },
]

function getNoteFromFreq(freq: number, a4: number) {
  if (freq <= 0) return null
  const semitones = 12 * Math.log2(freq / a4)
  const noteIndex = Math.round(semitones) + 57 // A4 = 57번째 반음 (C0 기준)
  const octave = Math.floor(noteIndex / 12)
  const noteNum = ((noteIndex % 12) + 12) % 12
  const cents = (semitones - Math.round(semitones)) * 100
  return { note: NOTE_NAMES[noteNum], octave, cents, noteNum }
}

function autoCorrelate(buffer: Float32Array, sampleRate: number): number {
  const SIZE = buffer.length
  let rms = 0
  for (let i = 0; i < SIZE; i++) rms += buffer[i] * buffer[i]
  rms = Math.sqrt(rms / SIZE)
  if (rms < 0.04) return -1

  let r1 = 0, r2 = SIZE - 1
  const thres = 0.2
  for (let i = 0; i < SIZE / 2; i++) {
    if (Math.abs(buffer[i]) < thres) { r1 = i; break }
  }
  for (let i = 1; i < SIZE / 2; i++) {
    if (Math.abs(buffer[SIZE - i]) < thres) { r2 = SIZE - i; break }
  }

  const buf = buffer.slice(r1, r2)
  const c = new Float32Array(buf.length).fill(0)

  for (let i = 0; i < buf.length; i++) {
    for (let j = 0; j < buf.length - i; j++) {
      c[i] += buf[j] * buf[j + i]
    }
  }

  let d = 0
  while (c[d] > c[d + 1]) d++
  let maxval = -1, maxpos = -1
  for (let i = d; i < buf.length; i++) {
    if (c[i] > maxval) { maxval = c[i]; maxpos = i }
  }

  let T0 = maxpos
  const x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1]
  const a = (x1 + x3 - 2 * x2) / 2
  const b = (x3 - x1) / 2
  if (a) T0 = T0 - b / (2 * a)

  return sampleRate / T0
}

export default function TunerPage() {
  const [isListening, setIsListening] = useState(false)
  const [detectedNote, setDetectedNote] = useState<string | null>(null)
  const [detectedOctave, setDetectedOctave] = useState<number | null>(null)
  const [detectedFreq, setDetectedFreq] = useState<number | null>(null)
  const [cents, setCents] = useState<number>(0)
  const [a4, setA4] = useState(440)
  const [instrument, setInstrument] = useState<'guitar' | 'bass'>('guitar')

  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const a4Ref = useRef(a4)
  const recentDetectionsRef = useRef<string[]>([])
  const recentCentsRef = useRef<number[]>([])

  useEffect(() => { a4Ref.current = a4 }, [a4])

  const getColorClass = (c: number) => {
    const abs = Math.abs(c)
    if (abs <= 5) return 'text-emerald-400'
    if (abs <= 20) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getGaugeColor = (c: number) => {
    const abs = Math.abs(c)
    if (abs <= 5) return '#34d399'
    if (abs <= 20) return '#facc15'
    return '#f87171'
  }

  const analyze = useCallback(() => {
    if (!analyserRef.current) return
    const buffer = new Float32Array(analyserRef.current.fftSize)
    analyserRef.current.getFloatTimeDomainData(buffer)
    const freq = autoCorrelate(buffer, audioCtxRef.current!.sampleRate)

    if (freq > 0) {
      const result = getNoteFromFreq(freq, a4Ref.current)
      if (result) {
        const key = `${result.note}${result.octave}`
        const recent = recentDetectionsRef.current
        recent.push(key)
        if (recent.length > 5) recent.shift()

        const count = recent.filter(k => k === key).length
        if (count >= 3) {
          const recentCents = recentCentsRef.current
          recentCents.push(result.cents)
          if (recentCents.length > 5) recentCents.shift()
          const avgCents = recentCents.reduce((a, b) => a + b, 0) / recentCents.length

          setDetectedNote(result.note)
          setDetectedOctave(result.octave)
          setDetectedFreq(freq)
          setCents(avgCents)
        }
      }
    } else {
      recentDetectionsRef.current = []
      recentCentsRef.current = []
    }

    rafRef.current = requestAnimationFrame(analyze)
  }, [])

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const ctx = new AudioContext()
      audioCtxRef.current = ctx
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 2048
      source.connect(analyser)
      analyserRef.current = analyser
      setIsListening(true)
      analyze()
    } catch {
      alert('마이크 접근 권한이 필요해요.')
    }
  }

  const stopListening = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    audioCtxRef.current?.close()
    audioCtxRef.current = null
    analyserRef.current = null
    streamRef.current = null
    setIsListening(false)
    setDetectedNote(null)
    setDetectedOctave(null)
    setDetectedFreq(null)
    setCents(0)
  }

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      streamRef.current?.getTracks().forEach(t => t.stop())
      audioCtxRef.current?.close()
    }
  }, [])

  const strings = instrument === 'guitar' ? GUITAR_STRINGS : BASS_STRINGS
  const isMatchingString = (s: { note: string; octave: number }) =>
    detectedNote === s.note && detectedOctave === s.octave

  // 게이지 위치 (cents: -50 ~ +50 → 0% ~ 100%)
  const gaugePercent = Math.min(100, Math.max(0, ((cents + 50) / 100) * 100))

  return (
    <main className="min-h-screen bg-zinc-950">
      <Navbar />
      <div className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-8">
        {/* 헤더 */}
        <div className="flex items-center gap-3">
          <Link href="/utility" className="text-zinc-400 hover:text-white transition-colors text-sm">← 유틸리티</Link>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">🎸 튜너</h1>
        </div>

        {/* 메인 디스플레이 */}
        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-8 flex flex-col items-center gap-6">
          {/* 음이름 */}
          <div className="text-center">
            {detectedNote ? (
              <>
                <p className={`text-8xl font-black tracking-tight ${getColorClass(cents)}`}>
                  {detectedNote}
                </p>
                <p className="text-zinc-400 text-xl mt-1">{detectedOctave !== null ? `${detectedNote}${detectedOctave}` : ''}</p>
              </>
            ) : (
              <p className="text-7xl font-black text-zinc-700">--</p>
            )}
          </div>

          {/* 주파수 */}
          <p className="text-zinc-500 text-sm">
            {detectedFreq !== null ? `${detectedFreq.toFixed(1)} Hz` : '-- Hz'}
          </p>

          {/* 튜닝 게이지 */}
          <div className="w-full flex flex-col gap-2">
            <div className="relative w-full h-4 bg-zinc-800 rounded-full overflow-hidden">
              {/* 중앙선 */}
              <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-zinc-600 z-10" />
              {/* 게이지 바 */}
              <div
                className="absolute top-1 bottom-1 w-3 rounded-full transition-all duration-100"
                style={{
                  left: `calc(${gaugePercent}% - 6px)`,
                  backgroundColor: isListening && detectedNote ? getGaugeColor(cents) : '#52525b',
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-zinc-600">
              <span>♭ flat</span>
              <span className={`font-semibold ${getColorClass(cents)}`}>
                {detectedNote ? `${cents > 0 ? '+' : ''}${cents.toFixed(0)}¢` : '0¢'}
              </span>
              <span>sharp ♯</span>
            </div>
          </div>

          {/* 시작/정지 */}
          <button
            onClick={isListening ? stopListening : startListening}
            className={`w-full py-4 rounded-xl text-lg font-bold transition-all active:scale-95 ${isListening ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}
          >
            {isListening ? '⏹ 정지' : '🎤 시작'}
          </button>
        </div>

        {/* 기준음 A4 조절 */}
        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-zinc-400">기준음 A4</p>
            <p className="text-white font-bold">{a4} Hz</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setA4(v => Math.max(430, v - 1))} className="w-9 h-9 rounded-lg bg-zinc-700 text-white hover:bg-zinc-600 transition-colors flex-shrink-0">-1</button>
            <input
              type="range"
              min={430}
              max={450}
              value={a4}
              onChange={e => setA4(Number(e.target.value))}
              className="flex-1 accent-emerald-500"
            />
            <button onClick={() => setA4(v => Math.min(450, v + 1))} className="w-9 h-9 rounded-lg bg-zinc-700 text-white hover:bg-zinc-600 transition-colors flex-shrink-0">+1</button>
          </div>
          <button onClick={() => setA4(440)} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors text-left">기본값으로 초기화 (440Hz)</button>
        </div>

        {/* 악기별 튜닝 참고 */}
        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 flex flex-col gap-4">
          {/* 악기 탭 */}
          <div className="flex gap-2">
            <button
              onClick={() => setInstrument('guitar')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${instrument === 'guitar' ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
            >
              🎸 기타
            </button>
            <button
              onClick={() => setInstrument('bass')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${instrument === 'bass' ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
            >
              🎵 베이스
            </button>
          </div>

          {/* 줄 목록 */}
          <div className="flex flex-col gap-2">
            {strings.map((s, i) => {
              const matched = isMatchingString(s)
              return (
                <div
                  key={i}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${matched ? 'bg-emerald-900/40 border border-emerald-600' : 'bg-zinc-800 border border-transparent'}`}
                >
                  <span className="text-zinc-400 text-sm">{s.label}</span>
                  <span className={`text-lg font-bold ${matched ? 'text-emerald-400' : 'text-white'}`}>
                    {s.note}{s.octave}
                    {matched && <span className="ml-2 text-xs text-emerald-500">✓</span>}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </main>
  )
}
