import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const { data: jobs, error } = await supabase
    .from('pitch_speed_jobs')
    .select('job_id, filename, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(30)

  if (error) {
    return NextResponse.json({ error: '기록 조회에 실패했어요.' }, { status: 500 })
  }

  const admin = createAdminClient()

  const results = await Promise.all((jobs ?? []).map(async job => {
    const { data: files } = await admin.storage.from('pitch-speed-audio').list(job.job_id)
    const audioFile = files?.find(f => f.name.startsWith('audio.'))
    if (!audioFile) return null

    const { data: pub } = admin.storage.from('pitch-speed-audio').getPublicUrl(`${job.job_id}/${audioFile.name}`)

    return { job_id: job.job_id, filename: job.filename, created_at: job.created_at, url: pub.publicUrl }
  }))

  return NextResponse.json({ jobs: results.filter((j): j is NonNullable<typeof j> => j !== null) })
}
