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

const ALL_SIGNATURES = Object.values(TIME_SIGNATURES).flat()

export default function MetronomePage() {
  const [bpm, setBpm] = useState(120)
  const [timeSig, setTimeSig] = useState(ALL_SIGNATURES[4]) // 4/4 기본
  const [sigGroup, setSigGroup] = useState<keyof typeof TIME_SIGNATURES>('단순박자')
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentBeat, setCurrentBeat] = useState(-1)
  const [screenFlash, setScreenFlash] = useState(false)
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
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const bpmRef = useRef(bpm)
  const timeSigRef = useRef(timeSig)
  const flashEnabledRef = useRef(flashEnabled)
  const torchEnabledRef = useRef(torchEnabled)

  useEffect(() => { bpmRef.current = bpm }, [bpm])
  useEffect(() => { timeSigRef.current = timeSig }, [timeSig])
  useEffect(() => { flashEnabledRef.current = flashEnabled }, [flashEnabled])
  useEffect(() => { torchEnabledRef.current = torchEnabled }, [torchEnabled])

  // 토치 지원 여부 감지
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
    return () => {
      torchTrackRef.current?.stop()
    }
  }, [])

  const getAudioCtx = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext()
    }
    return audioCtxRef.current
  }

  const scheduleClick = useCallback((beatIndex: number, time: number) => {
    const ctx = getAudioCtx()
    const isAccent = beatIndex === 0
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.frequency.value = isAccent ? 1000 : 800
    gain.gain.setValueAtTime(isAccent ? 1.0 : 0.5, time)
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05)

    osc.start(time)
    osc.stop(time + 0.05)

    // 시각 피드백 타이밍 계산
    const delay = (time - ctx.currentTime) * 1000
    setTimeout(() => {
      setCurrentBeat(beatIndex)
      // 화면 깜빡임
      if (flashEnabledRef.current) {
        setScreenFlash(true)
        if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
        flashTimerRef.current = setTimeout(() => setScreenFlash(false), isAccent ? 80 : 40)
      }
      // 토치 깜빡임
      if (torchEnabledRef.current && torchTrackRef.current) {
        const onDuration = isAccent ? 100 : 30
        torchTrackRef.current.applyConstraints({ advanced: [{ torch: true } as MediaTrackConstraintSet] })
        if (torchOffTimerRef.current) clearTimeout(torchOffTimerRef.current)
        torchOffTimerRef.current = setTimeout(() => {
          torchTrackRef.current?.applyConstraints({ advanced: [{ torch: false } as MediaTrackConstraintSet] })
        }, onDuration)
      }
    }, Math.max(0, delay))
  }, [])

  const scheduler = useCallback(() => {
    const ctx = getAudioCtx()
    const secondsPerBeat = 60 / bpmRef.current
    const scheduleAhead = 0.1

    while (nextBeatTimeRef.current < ctx.currentTime + scheduleAhead) {
      scheduleClick(currentBeatRef.current, nextBeatTimeRef.current)
      nextBeatTimeRef.current += secondsPerBeat
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
    torchTrackRef.current?.applyConstraints({ advanced: [{ torch: false } as MediaTrackConstraintSet] })
  }, [])

  const toggle = () => {
    if (isPlaying) stop()
    else start()
  }

  // BPM/박자 변경 시 재시작
  useEffect(() => {
    if (isPlaying) {
      if (schedulerTimerRef.current) clearTimeout(schedulerTimerRef.current)
      currentBeatRef.current = 0
      const ctx = getAudioCtx()
      nextBeatTimeRef.current = ctx.currentTime + 0.05
      scheduler()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bpm, timeSig])

  useEffect(() => {
    return () => {
      if (schedulerTimerRef.current) clearTimeout(schedulerTimerRef.current)
    }
  }, [])

  const handleTap = () => {
    const now = performance.now()
    const taps = tapTimesRef.current
    taps.push(now)
    if (taps.length > 8) taps.shift()
    if (taps.length >= 2) {
      const intervals = taps.slice(1).map((t, i) => t - taps[i])
      const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length
      const newBpm = Math.round(60000 / avg)
      setBpm(Math.min(240, Math.max(40, newBpm)))
    }
  }

  const handleBpmInput = (val: number) => {
    setBpm(Math.min(240, Math.max(40, val)))
  }

  const selectTimeSig = (sig: typeof ALL_SIGNATURES[0]) => {
    setTimeSig(sig)
    if (isPlaying) setCurrentBeat(0)
  }

  return (
    <main className="min-h-screen bg-zinc-950 relative overflow-hidden">
      {/* 화면 깜빡임 오버레이 */}
      {flashEnabled && (
        <div
          className="pointer-events-none fixed inset-0 z-50 transition-opacity duration-75"
          style={{ backgroundColor: 'white', opacity: screenFlash ? 0.35 : 0 }}
        />
      )}

      <Navbar />
      <div className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-8">
        {/* 헤더 */}
        <div className="flex items-center gap-3">
          <Link href="/utility" className="text-zinc-400 hover:text-white transition-colors text-sm">← 유틸리티</Link>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">🥁 메트로놈</h1>
        </div>

        {/* BPM */}
        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 flex flex-col gap-5">
          <div className="flex items-center justify-center gap-4">
            <button onClick={() => handleBpmInput(bpm - 5)} className="w-10 h-10 rounded-full bg-zinc-700 text-white font-bold hover:bg-zinc-600 transition-colors flex-shrink-0">-5</button>
            <button onClick={() => handleBpmInput(bpm - 1)} className="w-9 h-9 rounded-full bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors flex-shrink-0">-1</button>
            <div className="text-center min-w-[100px]">
              <input
                type="number"
                value={bpm}
                min={40}
                max={240}
                onChange={e => handleBpmInput(Number(e.target.value))}
                className="text-6xl font-bold text-white bg-transparent text-center w-full outline-none"
              />
              <p className="text-zinc-400 text-sm">BPM</p>
            </div>
            <button onClick={() => handleBpmInput(bpm + 1)} className="w-9 h-9 rounded-full bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors flex-shrink-0">+1</button>
            <button onClick={() => handleBpmInput(bpm + 5)} className="w-10 h-10 rounded-full bg-zinc-700 text-white font-bold hover:bg-zinc-600 transition-colors flex-shrink-0">+5</button>
          </div>
          <input
            type="range"
            min={40}
            max={240}
            value={bpm}
            onChange={e => handleBpmInput(Number(e.target.value))}
            className="w-full accent-emerald-500"
          />
          <button
            onClick={handleTap}
            className="w-full py-3 rounded-xl bg-zinc-700 text-zinc-200 font-semibold hover:bg-zinc-600 active:scale-95 transition-all"
          >
            탭 템포
          </button>
        </div>

        {/* 박자 선택 */}
        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 flex flex-col gap-4">
          <p className="text-sm font-semibold text-zinc-400">박자</p>
          {/* 그룹 탭 */}
          <div className="flex gap-2">
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
          {/* 박자 버튼들 */}
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
        <div className="flex justify-center gap-2 flex-wrap">
          {Array.from({ length: timeSig.beats }).map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-75 ${
                i === 0
                  ? currentBeat === i
                    ? 'bg-emerald-400 w-6 h-6'
                    : 'bg-zinc-600 w-6 h-6'
                  : currentBeat === i
                    ? 'bg-emerald-600 w-5 h-5'
                    : 'bg-zinc-700 w-5 h-5'
              }`}
            />
          ))}
        </div>

        {/* 재생/정지 */}
        <button
          onClick={toggle}
          className={`w-full py-5 rounded-2xl text-xl font-bold transition-all active:scale-95 ${isPlaying ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}
        >
          {isPlaying ? '⏹ 정지' : '▶ 시작'}
        </button>

        {/* 추가 기능 */}
        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 flex flex-col gap-4">
          <p className="text-sm font-semibold text-zinc-400">추가 기능</p>

          {/* 화면 깜빡임 */}
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

          {/* 플래시 깜빡임 */}
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
