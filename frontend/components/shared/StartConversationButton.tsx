'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

export default function StartConversationButton({ profileId, role }: { profileId: string; role: 'planner' | 'vendor' }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function openConversation() {
    setLoading(true)
    setError('')
    const next = `/couple/messages?with=${encodeURIComponent(profileId)}`
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push(`/auth?role=couple&next=${encodeURIComponent(next)}`)
      return
    }

    const { data: ownProfile, error: profileError } = await supabase.from('profiles')
      .select('role').eq('id', user.id).maybeSingle()
    if (profileError) {
      setError('Messages need a Supabase update.')
      setLoading(false)
      return
    }
    if (ownProfile?.role !== 'couple') {
      setError('Sign in with a couple account.')
      setLoading(false)
      return
    }

    const { data: existing, error: existingError } = await supabase.from('conversations')
      .select('id').eq('couple_profile_id', user.id).eq('professional_profile_id', profileId).maybeSingle()
    if (existingError) {
      setError('Messages need a Supabase update.')
      setLoading(false)
      return
    }

    let conversationId = existing?.id
    if (!conversationId) {
      const { data: created, error: createError } = await supabase.from('conversations')
        .insert({ couple_profile_id: user.id, professional_profile_id: profileId })
        .select('id').single()
      if (createError && createError.code !== '23505') {
        setError(createError.message)
        setLoading(false)
        return
      }
      if (created) conversationId = created.id
      else {
        const { data: raced } = await supabase.from('conversations')
          .select('id').eq('couple_profile_id', user.id).eq('professional_profile_id', profileId).maybeSingle()
        conversationId = raced?.id
      }
    }

    if (!conversationId) {
      setError('Could not open this chat. Try again.')
      setLoading(false)
      return
    }
    router.push(`/couple/messages?conversation=${encodeURIComponent(conversationId)}`)
  }

  return <div className="start-conversation-action">
    <button type="button" onClick={openConversation} disabled={loading}>
      {loading ? 'Opening chat…' : `Message this ${role}`} <ArrowRight size={16} />
    </button>
    {error && <p role="alert">{error}</p>}
  </div>
}
