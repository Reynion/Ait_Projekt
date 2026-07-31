import { NextRequest, NextResponse } from 'next/server'
import { getDemucsServerUrl } from '@/lib/demucs'

const DEMUCS_API_KEY = process.env.DEMUCS_API_KEY

export async function POST(request: NextRequest) {
  const serverUrl = await getDemucsServerUrl()
  if (!serverUrl) {
    return NextResponse.json({ error: '음원 분리 서버가 현재 꺼져 있어요. 로컬 서버가 켜져 있는지 확인해주세요.' }, { status: 503 })
  }

  const body = await request.json().catch(() => null)
  const jobId = body?.job_id
  const mixes = body?.mixes

  if (typeof jobId !== 'string' || !jobId) {
    return NextResponse.json({ error: 'job_id가 없습니다.' }, { status: 400 })
  }
  if (!Array.isArray(mixes) || mixes.length === 0) {
    return NextResponse.json({ error: 'mixes가 비어있습니다.' }, { status: 400 })
  }

  const res = await fetch(`${serverUrl}/mix`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(DEMUCS_API_KEY ? { 'X-API-Key': DEMUCS_API_KEY } : {}),
    },
    body: JSON.stringify({ job_id: jobId, mixes }),
  })

  if (!res.ok) {
    const detail = await res.text()
    return NextResponse.json({ error: `믹스 서버 오류: ${detail}` }, { status: res.status })
  }

  return NextResponse.json(await res.json())
}
