import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { userId, email, nickname } = await req.json()
  if (!userId || !email || !nickname) return NextResponse.json({ ok: false }, { status: 400 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await supabase.from('users').insert({
    id: userId,
    email,
    nickname,
    role: 'member',
  })

  if (error) {
    await supabase.auth.admin.deleteUser(userId)
    return NextResponse.json({ ok: false }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
