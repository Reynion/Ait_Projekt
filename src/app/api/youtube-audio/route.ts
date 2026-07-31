import { NextRequest, NextResponse } from 'next/server'
import { getDemucsServerUrl } from '@/lib/demucs'

const DEMUCS_API_KEY = process.env.DEMUCS_API_KEY

export async function POST(request: NextRequest) {
  const serverUrl = await getDemucsServerUrl()
  if (!serverUrl) {
    return NextResponse.json({ error: '서버가 꺼져 있어요.' }, { status: 503 })
  }

  const body = await request.json().catch(() => null)
  const url = body?.url
  if (typeof url !== 'string' || !url) {
    return NextResponse.json({ error: 'url이 없습니다.' }, { status: 400 })
  }

  const res = await fetch(`${serverUrl}/youtube-audio`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(DEMUCS_API_KEY ? { 'X-API-Key': DEMUCS_API_KEY } : {}),
    },
    body: JSON.stringify({ url }),
  })

  if (!res.ok) {
    const detail = await res.text()
    return NextResponse.json({ error: detail }, { status: res.status })
  }
  return NextResponse.json(await res.json())
}
