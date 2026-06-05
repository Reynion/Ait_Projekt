'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { notifyComment } from '@/lib/notifications'
import Image from 'next/image'
import UserProfileModal from '@/components/UserProfileModal'

interface Comment {
  id: number
  content: string
  created_at: string
  parent_id: number | null
  user_id: string
  users: { nickname: string; avatar_url: string | null } | null
}

interface ReplyTarget {
  parentId: number
  mention: string | null
}

interface Props {
  recordPostId: number
  currentUserId: string
  postAuthorId: string | null
  link: string
}

function renderContent(content: string) {
  const parts = content.split(/(@\S+)/g)
  return parts.map((part, i) =>
    part.startsWith('@')
      ? <span key={i} className="text-blue-400 font-medium">{part}</span>
      : part
  )
}

function Avatar({ url, nickname, onClick }: { url: string | null; nickname: string; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex-shrink-0 hover:opacity-80 transition-opacity">
      <div className="relative w-8 h-8 rounded-full overflow-hidden bg-zinc-700 border border-zinc-600">
        {url ? (
          <Image src={url} alt={nickname} fill className="object-cover" unoptimized />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-lg text-zinc-400">👤</div>
        )}
      </div>
    </button>
  )
}

export default function RecordCommentSection({ recordPostId, currentUserId, postAuthorId, link }: Props) {
  const [comments, setComments] = useState<Comment[]>([])
  const [content, setContent] = useState('')
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [currentUserNickname, setCurrentUserNickname] = useState('')
  const [profileUserId, setProfileUserId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('users').select('nickname').eq('id', currentUserId).single()
      .then(({ data }) => { if (data) setCurrentUserNickname(data.nickname) })
  }, [currentUserId])

  async function fetchComments() {
    const supabase = createClient()
    const { data } = await supabase
      .from('record_comments')
      .select('*, users(nickname, avatar_url)')
      .eq('record_post_id', recordPostId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
    if (data) setComments(data as unknown as Comment[])
  }

  useEffect(() => {
    fetchComments()
    const supabase = createClient()
    const channel = supabase
      .channel(`record-comments-${recordPostId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'record_comments' }, fetchComments)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [recordPostId])

  function startReply(parentId: number, mention: string | null) {
    setReplyTarget({ parentId, mention })
    const prefix = mention ? `@${mention} ` : ''
    setContent(prefix)
    setTimeout(() => {
      inputRef.current?.focus()
      const len = prefix.length
      inputRef.current?.setSelectionRange(len, len)
    }, 50)
  }

  function cancelReply() {
    setReplyTarget(null)
    setContent('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setSubmitting(true)
    const supabase = createClient()
    await supabase.from('record_comments').insert({
      record_post_id: recordPostId,
      user_id: currentUserId,
      content: content.trim(),
      parent_id: replyTarget?.parentId ?? null,
    })
    const parentComment = replyTarget ? (comments.find(c => c.id === replyTarget.parentId) ?? null) : null
    await notifyComment({
      supabase,
      senderId: currentUserId,
      senderNickname: currentUserNickname,
      postAuthorId,
      parentComment: parentComment ? { user_id: parentComment.user_id } : null,
      content: content.trim(),
      link,
    })
    setContent('')
    setReplyTarget(null)
    setSubmitting(false)
    fetchComments()
  }

  async function handleDelete(commentId: number) {
    const supabase = createClient()
    const { error } = await supabase.from('record_comments').update({ deleted_at: new Date().toISOString() }).eq('id', commentId)
    if (!error) fetchComments()
  }

  const topLevel = comments.filter(c => c.parent_id === null)
  const replies = (parentId: number) => comments.filter(c => c.parent_id === parentId)

  return (
    <>
      {profileUserId && <UserProfileModal userId={profileUserId} onClose={() => setProfileUserId(null)} />}
      <div className="flex flex-col gap-5">
        <h3 className="font-semibold text-base text-white">댓글 <span className="text-zinc-400 font-normal">{comments.length}개</span></h3>

        <ul className="flex flex-col gap-4">
          {topLevel.map((comment) => (
            <li key={comment.id} className="flex flex-col gap-2">
              <div className="flex gap-3">
                <Avatar url={comment.users?.avatar_url ?? null} nickname={comment.users?.nickname ?? ''} onClick={() => setProfileUserId(comment.user_id)} />
                <div className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <button type="button" onClick={() => setProfileUserId(comment.user_id)} className="text-sm font-semibold text-zinc-100 hover:text-white transition-colors">{comment.users?.nickname ?? '알 수 없음'}</button>
                    <span className="text-xs text-zinc-500">{new Date(comment.created_at).toLocaleDateString('ko-KR')}</span>
                  </div>
                  <p className="text-sm text-zinc-200">{renderContent(comment.content)}</p>
                  <div className="flex gap-3 mt-2">
                    <button onClick={() => startReply(comment.id, null)} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">답글</button>
                    {comment.user_id === currentUserId && (
                      <button onClick={() => handleDelete(comment.id)} className="text-xs text-zinc-500 hover:text-red-400 transition-colors">삭제</button>
                    )}
                  </div>
                </div>
              </div>

              {replies(comment.id).length > 0 && (
                <ul className="ml-6 sm:ml-10 flex flex-col gap-2">
                  {replies(comment.id).map((reply) => (
                    <li key={reply.id} className="flex gap-3">
                      <Avatar url={reply.users?.avatar_url ?? null} nickname={reply.users?.nickname ?? ''} onClick={() => setProfileUserId(reply.user_id)} />
                      <div className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5">
                        <div className="flex items-center gap-2 mb-1.5">
                          <button type="button" onClick={() => setProfileUserId(reply.user_id)} className="text-sm font-semibold text-zinc-100 hover:text-white transition-colors">{reply.users?.nickname ?? '알 수 없음'}</button>
                          <span className="text-xs text-zinc-500">{new Date(reply.created_at).toLocaleDateString('ko-KR')}</span>
                        </div>
                        <p className="text-sm text-zinc-200">{renderContent(reply.content)}</p>
                        <div className="flex gap-3 mt-2">
                          <button onClick={() => startReply(comment.id, reply.users?.nickname ?? null)} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">답글</button>
                          {reply.user_id === currentUserId && (
                            <button onClick={() => handleDelete(reply.id)} className="text-xs text-zinc-500 hover:text-red-400 transition-colors">삭제</button>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>

        <form onSubmit={handleSubmit} className="flex flex-col gap-2 pt-2 border-t border-zinc-700">
          {replyTarget && (
            <div className="flex items-center gap-2 text-sm text-zinc-400 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2">
              <span>↩ {replyTarget.mention ? `@${replyTarget.mention}에게 답글` : '답글 작성 중'}</span>
              <button type="button" onClick={cancelReply} className="text-zinc-500 hover:text-zinc-200 ml-auto">✕</button>
            </div>
          )}
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder={replyTarget ? '답글을 입력하세요...' : '댓글을 입력하세요...'}
              className="flex-1 bg-zinc-900 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-400"
            />
            <button
              type="submit"
              disabled={submitting || !content.trim()}
              className="bg-zinc-700 border border-zinc-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-zinc-600 hover:border-zinc-500 disabled:opacity-50 transition-colors"
            >
              등록
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
