import { NextRequest, NextResponse } from 'next/server'
import { getDemucsServerUrl } from '@/lib/demucs'

const DEMUCS_API_KEY = process.env.DEMUCS_API_KEY

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const serverUrl = await getDemucsServerUrl()
  if (!serverUrl) {
    return NextResponse.json({ error: '음원 분리 서버가 현재 꺼져 있어요.' }, { status: 503 })
  }

  const { jobId } = await params

  const res = await fetch(`${serverUrl}/status/${jobId}`, {
    headers: DEMUCS_API_KEY ? { 'X-API-Key': DEMUCS_API_KEY } : undefined,
    cache: 'no-store',
  })

  if (!res.ok) {
    const detail = await res.text()
    return NextResponse.json({ error: detail }, { status: res.status })
  }

  return NextResponse.json(await res.json())
}
