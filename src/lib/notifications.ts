import { SupabaseClient } from '@supabase/supabase-js'

export async function notifyComment({
  supabase,
  senderId,
  senderNickname,
  postAuthorId,
  parentComment,
  content,
  link,
}: {
  supabase: SupabaseClient
  senderId: string
  senderNickname: string
  postAuthorId: string | null
  parentComment: { user_id: string } | null
  content: string
  link: string
}) {
  const notifications: { user_id: string; type: string; message: string; link: string }[] = []

  if (parentComment) {
    if (parentComment.user_id !== senderId) {
      notifications.push({
        user_id: parentComment.user_id,
        type: 'reply',
        message: `${senderNickname}님이 회원님의 댓글에 답글을 달았습니다.`,
        link,
      })
    }
  } else if (postAuthorId && postAuthorId !== senderId) {
    notifications.push({
      user_id: postAuthorId,
      type: 'comment',
      message: `${senderNickname}님이 댓글을 달았습니다.`,
      link,
    })
  }

  const mentionMatches = content.match(/@(\S+)/g) ?? []
  if (mentionMatches.length > 0) {
    const nicknames = [...new Set(mentionMatches.map(m => m.slice(1)))]
    const { data: mentionedUsers } = await supabase
      .from('users')
      .select('id')
      .in('nickname', nicknames)
    for (const u of mentionedUsers ?? []) {
      if (u.id !== senderId && !notifications.find(n => n.user_id === u.id)) {
        notifications.push({
          user_id: u.id,
          type: 'mention',
          message: `${senderNickname}님이 회원님을 멘션했습니다.`,
          link,
        })
      }
    }
  }

  if (notifications.length > 0) {
    await supabase.from('notifications').insert(notifications)
  }
}

export async function notifyAll({
  supabase,
  senderId,
  type,
  message,
  link,
}: {
  supabase: SupabaseClient
  senderId: string
  type: string
  message: string
  link: string
}) {
  const { data: users } = await supabase
    .from('users')
    .select('id')
    .neq('id', senderId)
  if (!users || users.length === 0) return
  await supabase.from('notifications').insert(
    users.map(u => ({ user_id: u.id, type, message, link }))
  )
}
