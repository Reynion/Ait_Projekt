'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Navbar from '@/components/Navbar'
import Link from 'next/link'

const TIME_SIGNATURES = {
  '단순박자': [
    { label: '1/4', beats: 1, division: 4 },
    { label: '2/4', beats: 2, division: 4 },
    { label: '2/2', beats: 2, division: 2 },
    { label: '3/4', beats: 3, division: 4 },
    { label: '4/4', beats: 4, division: 4 },
  ],
  '복합박자': [
    { label: '6/8', beats: 6, division: 8 },
    { label: '9/8', beats: 9, division: 8 },
    { label: '12/8', beats: 12, division: 8 },
  ],
  '변박': [
    { label: '5/4', beats: 5, division: 4 },
    { label: '5/8', beats: 5, division: 8 },
    { label: '7/4', beats: 7, division: 4 },
    { label: '7/8', beats: 7, division: 8 },
    { label: '11/8', beats: 11, division: 8 },
  ],
}

// 분모에 따른 비트 간격 (4분음표 기준 BPM 대비)
// division 2: 2분음표 → 4분음표의 2배
// division 4: 4분음표 → 기준
// division 8: 8분음표 → 4분음표의 절반
function calcSecondsPerBeat(bpm: number, division: number): number {
  return (60 / bpm) * (4 / division)
}

type BeatAccent = 'accent' | 'normal' | 'mute'

// 박자별 기본 강박 패턴
function getDefaultAccents(beats: number, label: string): BeatAccent[] {
  const arr: BeatAccent[] = Array(beats).fill('normal')
  arr[0] = 'accent'
  if (label === '6/8')  { arr[3] = 'accent' }
  if (label === '9/8')  { arr[3] = 'accent'; arr[6] = 'accent' }
  if (label === '12/8') { arr[3] = 'accent'; arr[6] = 'accent'; arr[9] = 'accent' }
  return arr
}

const ALL_SIGNATURES = Object.values(TIME_SIGNATURES).flat()

export default function MetronomePage() {
  const [bpm, setBpm] = useState(120)
  const [timeSig, setTimeSig] = useState(ALL_SIGNATURES[4]) // 4/4 기본
  const [sigGroup, setSigGroup] = useState<keyof typeof TIME_SIGNATURES>('단순박자')
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentBeat, setCurrentBeat] = useState(-1)
  const [beatAccents, setBeatAccents] = useState<BeatAccent[]>(getDefaultAccents(4, '4/4'))
  const [swing, setSwing] = useState(50)
  const [screenFlash, setScreenFlash] = useState(false)
  const [screenFlashStrong, setScreenFlashStrong] = useState(false)
  const [flashEnabled, setFlashEnabled] = useState(false)
  const [torchEnabled, setTorchEnabled] = useState(false)
  const [torchSupported, setTorchSupported] = useState(false)

  const audioCtxRef = useRef<AudioContext | null>(null)
  const nextBeatTimeRef = useRef(0)
  const currentBeatRef = useRef(0)
  const schedulerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tapTimesRef = useRef<number[]>([])
  const torchTrackRef = useRef<MediaStreamTrack | null>(null)
  const torchOffTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const torchIsOnRef = useRef(false)
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const spbRef = useRef(calcSecondsPerBeat(120, 4))
  const bpmRef = useRef(bpm)
  const timeSigRef = useRef(timeSig)
  const beatAccentsRef = useRef(beatAccents)
  const swingRef = useRef(swing)
  const flashEnabledRef = useRef(flashEnabled)
  const torchEnabledRef = useRef(torchEnabled)

  useEffect(() => { bpmRef.current = bpm }, [bpm])
  useEffect(() => { timeSigRef.current = timeSig }, [timeSig])
  useEffect(() => { beatAccentsRef.current = beatAccents }, [beatAccents])
  useEffect(() => { swingRef.current = swing }, [swing])
  useEffect(() => { flashEnabledRef.current = flashEnabled }, [flashEnabled])
  useEffect(() => { torchEnabledRef.current = torchEnabled }, [torchEnabled])

  useEffect(() => {
    const checkTorch = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        const track = stream.getVideoTracks()[0]
        const caps = track.getCapabilities() as MediaTrackCapabilities & { torch?: boolean }
        if (caps.torch) {
          setTorchSupported(true)
          torchTrackRef.current = track
        } else {
          track.stop()
        }
      } catch {
        setTorchSupported(false)
      }
    }
    checkTorch()
    return () => { torchTrackRef.current?.stop() }
  }, [])

  const getAudioCtx = () => {
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext()
    return audioCtxRef.current
  }

  const scheduleClick = useCallback((beatIndex: number, time: number) => {
    const ctx = getAudioCtx()
    const accent = beatAccentsRef.current[beatIndex] ?? 'normal'

    if (accent !== 'mute') {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = accent === 'accent' ? 1000 : 800
      gain.gain.setValueAtTime(accent === 'accent' ? 1.0 : 0.5, time)
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05)
      osc.start(time)
      osc.stop(time + 0.05)
    }

    const delay = (time - ctx.currentTime) * 1000
    const spbMs = spbRef.current * 1000
    const maxDuration = spbMs * 0.4  // 비트 간격의 40% 이내로 제한
    setTimeout(() => {
      setCurrentBeat(beatIndex)
      if (flashEnabledRef.current && accent !== 'mute') {
        const flashDuration = Math.min(accent === 'accent' ? 80 : 40, maxDuration)
        setScreenFlash(true)
        setScreenFlashStrong(accent === 'accent')
        if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
        flashTimerRef.current = setTimeout(() => setScreenFlash(false), flashDuration)
      }
      if (torchEnabledRef.current && torchTrackRef.current && accent !== 'mute') {
        const torchDuration = Math.min(accent === 'accent' ? 100 : 30, maxDuration)
        if (!torchIsOnRef.current) {
          torchIsOnRef.current = true
          torchTrackRef.current.applyConstraints({ advanced: [{ torch: true } as MediaTrackConstraintSet] })
        }
        if (torchOffTimerRef.current) clearTimeout(torchOffTimerRef.current)
        torchOffTimerRef.current = setTimeout(() => {
          torchIsOnRef.current = false
          torchTrackRef.current?.applyConstraints({ advanced: [{ torch: false } as MediaTrackConstraintSet] })
        }, torchDuration)
      }
    }, Math.max(0, delay))
  }, [])

  const scheduler = useCallback(() => {
    const ctx = getAudioCtx()
    const spb = calcSecondsPerBeat(bpmRef.current, timeSigRef.current.division)
    spbRef.current = spb
    const swingRatio = swingRef.current / 100
    const scheduleAhead = 0.1

    while (nextBeatTimeRef.current < ctx.currentTime + scheduleAhead) {
      const beatIndex = currentBeatRef.current
      // 홀수 비트에 스윙 오프셋 적용: spb * (2*swingRatio - 1)
      // swingRatio=0.5 → offset=0 (straight), swingRatio=0.67 → offset≈0.34*spb (shuffle)
      const swingOffset = beatIndex % 2 === 1 ? spb * (swingRatio * 2 - 1) : 0
      scheduleClick(beatIndex, nextBeatTimeRef.current + swingOffset)
      nextBeatTimeRef.current += spb
      currentBeatRef.current = (currentBeatRef.current + 1) % timeSigRef.current.beats
    }

    schedulerTimerRef.current = setTimeout(scheduler, 25)
  }, [scheduleClick])

  const start = useCallback(() => {
    const ctx = getAudioCtx()
    if (ctx.state === 'suspended') ctx.resume()
    currentBeatRef.current = 0
    nextBeatTimeRef.current = ctx.currentTime + 0.05
    scheduler()
    setIsPlaying(true)
  }, [scheduler])

  const stop = useCallback(() => {
    if (schedulerTimerRef.current) clearTimeout(schedulerTimerRef.current)
    setIsPlaying(false)
    setCurrentBeat(-1)
    torchIsOnRef.current = false
    torchTrackRef.current?.applyConstraints({ advanced: [{ torch: false } as MediaTrackConstraintSet] })
  }, [])

  // BPM/박자/스윙 변경 시 재시작
  useEffect(() => {
    if (isPlaying) {
      if (schedulerTimerRef.current) clearTimeout(schedulerTimerRef.current)
      currentBeatRef.current = 0
      const ctx = getAudioCtx()
      nextBeatTimeRef.current = ctx.currentTime + 0.05
      scheduler()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bpm, timeSig, swing])

  useEffect(() => {
    return () => { if (schedulerTimerRef.current) clearTimeout(schedulerTimerRef.current) }
  }, [])

  const handleTap = () => {
    const now = performance.now()
    // 2초 이상 지나면 초기화
    if (tapTimesRef.current.length > 0 && now - tapTimesRef.current[tapTimesRef.current.length - 1] > 2000) {
      tapTimesRef.current = []
    }
    tapTimesRef.current.push(now)
    if (tapTimesRef.current.length > 8) tapTimesRef.current.shift()
    if (tapTimesRef.current.length >= 2) {
      const t = tapTimesRef.current
      const intervals = t.slice(1).map((v, i) => v - t[i])
      const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length
      setBpm(Math.min(240, Math.max(40, Math.round(60000 / avg))))
    }
  }

  const handleBpmInput = (val: number) => setBpm(Math.min(240, Math.max(40, val)))

  const selectTimeSig = (sig: typeof ALL_SIGNATURES[0]) => {
    setTimeSig(sig)
    setBeatAccents(getDefaultAccents(sig.beats, sig.label))
  }

  const toggleBeatAccent = (i: number) => {
    setBeatAccents(prev => {
      const next = [...prev]
      next[i] = next[i] === 'accent' ? 'normal' : next[i] === 'normal' ? 'mute' : 'accent'
      return next
    })
  }

  const getBeatStyle = (accent: BeatAccent, active: boolean) => {
    if (accent === 'accent') return `w-6 h-6 ${active ? 'bg-emerald-300' : 'bg-emerald-700'}`
    if (accent === 'normal') return `w-5 h-5 ${active ? 'bg-emerald-500' : 'bg-zinc-600'}`
    return `w-4 h-4 border border-zinc-600 ${active ? 'bg-zinc-400' : 'bg-zinc-800'}`
  }

  const swingLabel = swing <= 50 ? 'Straight' : swing >= 67 ? 'Shuffle' : `${swing}%`

  return (
    <main className="min-h-screen bg-zinc-950 relative overflow-hidden">
      {flashEnabled && (
        <div
          className="pointer-events-none fixed inset-0 z-50 transition-opacity duration-75"
          style={{ backgroundColor: 'white', opacity: screenFlash ? (screenFlashStrong ? 0.7 : 0.4) : 0 }}
        />
      )}

      <Navbar />
      <div className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-8">
        <Link href="/utility" className="text-zinc-400 hover:text-white transition-colors text-sm w-fit">← 유틸리티</Link>
        <h1 className="text-2xl font-bold text-white -mt-4">🥁 메트로놈</h1>

        {/* BPM */}
        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 flex flex-col gap-5">
          <div className="text-center">
            <input
              type="number"
              value={bpm}
              min={40}
              max={240}
              onChange={e => handleBpmInput(Number(e.target.value))}
              className="text-7xl font-bold text-white bg-transparent text-center w-full outline-none"
            />
            <p className="text-zinc-400 text-sm -mt-1">BPM</p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <button onClick={() => handleBpmInput(bpm - 5)} className="w-12 h-12 rounded-full bg-zinc-700 text-white font-bold hover:bg-zinc-600 transition-colors text-sm flex-shrink-0">-5</button>
            <button onClick={() => handleBpmInput(bpm - 1)} className="w-10 h-10 rounded-full bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors text-sm flex-shrink-0">-1</button>
            <div className="w-12 flex-shrink-0" />
            <button onClick={() => handleBpmInput(bpm + 1)} className="w-10 h-10 rounded-full bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors text-sm flex-shrink-0">+1</button>
            <button onClick={() => handleBpmInput(bpm + 5)} className="w-12 h-12 rounded-full bg-zinc-700 text-white font-bold hover:bg-zinc-600 transition-colors text-sm flex-shrink-0">+5</button>
          </div>
          <input
            type="range" min={40} max={240} value={bpm}
            onChange={e => handleBpmInput(Number(e.target.value))}
            className="w-full accent-emerald-500"
          />
          <div className="flex flex-col gap-1.5">
            <button
              onClick={handleTap}
              className="w-full py-3 rounded-xl bg-zinc-700 text-zinc-200 font-semibold hover:bg-zinc-600 active:scale-95 transition-all"
            >
              탭 템포
            </button>
            <p className="text-xs text-zinc-500 text-center">박자에 맞춰 탭하면 BPM이 자동으로 계산돼요 · 2초 이상 쉬면 초기화돼요</p>
          </div>
        </div>

        {/* 박자 선택 */}
        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 flex flex-col gap-4">
          <p className="text-sm font-semibold text-zinc-400">박자</p>
          <div className="flex gap-2 flex-wrap">
            {(Object.keys(TIME_SIGNATURES) as (keyof typeof TIME_SIGNATURES)[]).map(group => (
              <button
                key={group}
                onClick={() => setSigGroup(group)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${sigGroup === group ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
              >
                {group}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {TIME_SIGNATURES[sigGroup].map(sig => (
              <button
                key={sig.label}
                onClick={() => selectTimeSig(sig)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${timeSig.label === sig.label ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}
              >
                {sig.label}
              </button>
            ))}
          </div>
        </div>

        {/* 비트 표시등 */}
        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-zinc-400">비트</p>
            <p className="text-xs text-zinc-600">클릭해서 강박 · 약박 · 무음 전환</p>
          </div>
          <div className="flex justify-center gap-3 flex-wrap min-h-[28px] items-center">
            {beatAccents.map((accent, i) => (
              <button
                key={i}
                onClick={() => toggleBeatAccent(i)}
                className={`rounded-full transition-all duration-75 ${getBeatStyle(accent, currentBeat === i)}`}
                title={accent === 'accent' ? '강박' : accent === 'normal' ? '약박' : '무음'}
              />
            ))}
          </div>
          <div className="flex gap-4 justify-center text-xs text-zinc-500">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-700 inline-block" />강박</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-zinc-600 inline-block" />약박</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-zinc-800 border border-zinc-600 inline-block" />무음</span>
          </div>
        </div>

        {/* 스윙 */}
        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-zinc-400">스윙</p>
            <p className="text-white font-semibold text-sm">{swingLabel}</p>
          </div>
          <input
            type="range" min={50} max={75} value={swing}
            onChange={e => setSwing(Number(e.target.value))}
            className="w-full accent-emerald-500"
          />
          <div className="flex justify-between text-xs text-zinc-600">
            <span>Straight</span>
            <span>Shuffle</span>
            <span>Heavy</span>
          </div>
          <p className="text-xs text-zinc-500">홀수 비트를 뒤로 밀어 딱-따닥 리듬을 만들어요</p>
        </div>

        {/* 재생/정지 */}
        <button
          onClick={() => isPlaying ? stop() : start()}
          className={`w-full py-5 rounded-2xl text-xl font-bold transition-all active:scale-95 ${isPlaying ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}
        >
          {isPlaying ? '⏹ 정지' : '▶ 시작'}
        </button>

        {/* 추가 기능 */}
        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 flex flex-col gap-4">
          <p className="text-sm font-semibold text-zinc-400">추가 기능</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm font-medium">화면 깜빡임</p>
              <p className="text-zinc-500 text-xs mt-0.5">강박에 더 밝게 깜빡여요</p>
            </div>
            <button
              onClick={() => setFlashEnabled(v => !v)}
              className={`w-12 h-6 rounded-full transition-colors relative ${flashEnabled ? 'bg-emerald-600' : 'bg-zinc-700'}`}
            >
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${flashEnabled ? 'left-7' : 'left-1'}`} />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${torchSupported ? 'text-white' : 'text-zinc-600'}`}>플래시 깜빡임</p>
              <p className="text-zinc-500 text-xs mt-0.5">
                {torchSupported ? '강박에 더 길게 켜져요' : 'Android Chrome에서만 지원돼요'}
              </p>
            </div>
            <button
              onClick={() => torchSupported && setTorchEnabled(v => !v)}
              disabled={!torchSupported}
              className={`w-12 h-6 rounded-full transition-colors relative ${!torchSupported ? 'opacity-30 cursor-not-allowed' : ''} ${torchEnabled && torchSupported ? 'bg-emerald-600' : 'bg-zinc-700'}`}
            >
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${torchEnabled && torchSupported ? 'left-7' : 'left-1'}`} />
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
