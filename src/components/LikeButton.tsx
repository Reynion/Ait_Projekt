'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

interface Props {
  postId: number
  currentUserId: string
}

interface LikeSummary {
  likes: number
  dislikes: number
  myVote: boolean | null
}

export default function LikeButton({ postId, currentUserId }: Props) {
  const [summary, setSummary] = useState<LikeSummary>({ likes: 0, dislikes: 0, myVote: null })
  const [loading, setLoading] = useState(false)

  async function fetchLikes() {
    const supabase = createClient()
    const { data } = await supabase
      .from('likes')
      .select('user_id, is_like')
      .eq('post_id', postId)

    if (!data) return
    const likes = data.filter(r => r.is_like).length
    const dislikes = data.filter(r => !r.is_like).length
    const mine = data.find(r => r.user_id === currentUserId)
    setSummary({ likes, dislikes, myVote: mine ? mine.is_like : null })
  }

  useEffect(() => {
    fetchLikes()
    const supabase = createClient()
    const channel = supabase
      .channel(`likes-${postId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, fetchLikes)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [postId, currentUserId])

  async function handleVote(isLike: boolean) {
    if (loading) return
    setLoading(true)
    const prevSummary = summary

    setSummary(prev => {
      if (prev.myVote === isLike) {
        return {
          likes: isLike ? prev.likes - 1 : prev.likes,
          dislikes: !isLike ? prev.dislikes - 1 : prev.dislikes,
          myVote: null,
        }
      } else if (prev.myVote === null) {
        return {
          likes: isLike ? prev.likes + 1 : prev.likes,
          dislikes: !isLike ? prev.dislikes + 1 : prev.dislikes,
          myVote: isLike,
        }
      } else {
        return {
          likes: isLike ? prev.likes + 1 : prev.likes - 1,
          dislikes: !isLike ? prev.dislikes + 1 : prev.dislikes - 1,
          myVote: isLike,
        }
      }
    })

    const supabase = createClient()
    let error = null

    if (summary.myVote === isLike) {
      const res = await supabase.from('likes').delete()
        .eq('post_id', postId).eq('user_id', currentUserId)
      error = res.error
    } else if (summary.myVote === null) {
      const res = await supabase.from('likes').insert({ post_id: postId, user_id: currentUserId, is_like: isLike })
      error = res.error
    } else {
      const res = await supabase.from('likes').update({ is_like: isLike })
        .eq('post_id', postId).eq('user_id', currentUserId)
      error = res.error
    }

    if (error) setSummary(prevSummary)
    setLoading(false)
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => handleVote(true)}
        disabled={loading}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all disabled:opacity-50 ${
          summary.myVote === true
            ? 'bg-blue-600 border-blue-500 text-white'
            : 'bg-zinc-800 border-zinc-600 text-zinc-300 hover:border-zinc-400 hover:text-white'
        }`}
      >
        👍 추천 <span className="font-bold">{summary.likes}</span>
      </button>
      <button
        onClick={() => handleVote(false)}
        disabled={loading}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all disabled:opacity-50 ${
          summary.myVote === false
            ? 'bg-red-600 border-red-500 text-white'
            : 'bg-zinc-800 border-zinc-600 text-zinc-300 hover:border-zinc-400 hover:text-white'
        }`}
      >
        👎 비추천 <span className="font-bold">{summary.dislikes}</span>
      </button>
    </div>
  )
}
