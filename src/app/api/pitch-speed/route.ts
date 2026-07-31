import { NextRequest, NextResponse } from 'next/server'
import { getDemucsServerUrl } from '@/lib/demucs'

const DEMUCS_API_KEY = process.env.DEMUCS_API_KEY

export async function POST(request: NextRequest) {
  const serverUrl = await getDemucsServerUrl()
  if (!serverUrl) {
    return NextResponse.json({ error: '오디오 서버가 현재 꺼져 있어요.' }, { status: 503 })
  }

  const body = await request.json().catch(() => null)
  const { file_url, tempo, pitch } = body ?? {}

  if (typeof file_url !== 'string' || !file_url) {
    return NextResponse.json({ error: 'file_url이 없습니다.' }, { status: 400 })
  }

  const res = await fetch(`${serverUrl}/pitch-speed`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(DEMUCS_API_KEY ? { 'X-API-Key': DEMUCS_API_KEY } : {}),
    },
    body: JSON.stringify({ file_url, tempo, pitch }),
  })

  if (!res.ok) {
    const detail = await res.text()
    return NextResponse.json({ error: `피치/속도 서버 오류: ${detail}` }, { status: res.status })
  }

  return NextResponse.json(await res.json())
}
