'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Camera, ClipboardList, MessageCircle } from 'lucide-react'
import MessageInterface from '@/components/shared/MessageInterface'
import { supabase } from '@/lib/supabase/client'

interface Conversation {
  id: string
  recipientId: string
  recipientName: string
  recipientType: 'vendor' | 'planner'
  initials: string
  lastMessage: string
  updatedAt: string
}

interface MessageRow {
  id: string
  conversation_id: string
  sender_profile_id: string
  body: string
  created_at: string
}

function formatTime(value: string) {
  const date = new Date(value)
  const isToday = date.toDateString() === new Date().toDateString()
  return isToday
    ? date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export default function CoupleMessagesPage() {
  const router = useRouter()
  const [userId, setUserId] = useState('')
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [loading, setLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedId),
    [conversations, selectedId],
  )

  const loadMessages = useCallback(async (conversationId: string) => {
    const { data, error: loadError } = await supabase
      .from('messages')
      .select('id,conversation_id,sender_profile_id,body,created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
    if (loadError) throw loadError
    return (data ?? []) as MessageRow[]
  }, [])

  useEffect(() => {
    let active = true
    async function loadInbox() {
      setLoading(true)
      setError('')
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/auth?role=couple&next=%2Fcouple%2Fmessages')
        return
      }
      const { data: ownProfile, error: ownProfileError } = await supabase
        .from('profiles').select('role').eq('id', user.id).maybeSingle()
      if (ownProfileError) {
        if (active) { setError('Messages need a Supabase update.'); setLoading(false) }
        return
      }
      if (!ownProfile || ownProfile.role !== 'couple') {
        router.replace('/couple')
        return
      }

      const currentUrl = new URL(window.location.href)
      const requestedRecipient = currentUrl.searchParams.get('with')
      let requestedConversation = currentUrl.searchParams.get('conversation')
      if (requestedRecipient) {
        const { data: recipient, error: recipientError } = await supabase.from('profiles')
          .select('id,role,is_public,is_complete')
          .eq('id', requestedRecipient)
          .maybeSingle()
        if (recipientError || !recipient || !recipient.is_public || !recipient.is_complete || !['planner', 'vendor'].includes(recipient.role)) {
          if (active) { setError('This profile cannot receive messages yet.'); setLoading(false) }
          return
        }
        const { data: existing, error: existingError } = await supabase.from('conversations')
          .select('id').eq('couple_profile_id', user.id).eq('professional_profile_id', recipient.id).maybeSingle()
        if (existingError) {
          if (active) { setError('Messages need a Supabase update.'); setLoading(false) }
          return
        }
        let conversationId = existing?.id
        if (!conversationId) {
          const { data: created, error: createError } = await supabase.from('conversations')
            .insert({ couple_profile_id: user.id, professional_profile_id: recipient.id })
            .select('id').single()
          if (createError && createError.code !== '23505') {
            if (active) { setError(createError.message); setLoading(false) }
            return
          }
          if (created) conversationId = created.id
          else {
            const { data: raced } = await supabase.from('conversations')
              .select('id').eq('couple_profile_id', user.id).eq('professional_profile_id', recipient.id).maybeSingle()
            conversationId = raced?.id
          }
        }
        if (!conversationId) {
          if (active) { setError('Could not open this conversation. Try again.'); setLoading(false) }
          return
        }
        requestedConversation = conversationId
        currentUrl.searchParams.delete('with')
        currentUrl.searchParams.set('conversation', conversationId)
        window.history.replaceState({}, '', `${currentUrl.pathname}${currentUrl.search}`)
      }

      const { data: rows, error: conversationsError } = await supabase.from('conversations')
        .select('id,professional_profile_id,last_message,updated_at')
        .eq('couple_profile_id', user.id)
        .order('updated_at', { ascending: false })
      if (conversationsError) {
        if (active) { setError('Messages need a Supabase update.'); setLoading(false) }
        return
      }
      const conversationRows = rows ?? []
      const recipientIds = conversationRows.map((row) => row.professional_profile_id)
      const { data: profiles, error: profilesError } = recipientIds.length
        ? await supabase.from('profiles').select('id,role,display_name,company_name,initials').in('id', recipientIds)
        : { data: [] }
      if (profilesError) {
        if (active) { setError('Could not load your wedding team.'); setLoading(false) }
        return
      }
      if (!active) return
      const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]))
      const mapped = conversationRows.flatMap((row) => {
        const profile = profileMap.get(row.professional_profile_id)
        if (!profile || !['planner', 'vendor'].includes(profile.role)) return []
        return [{
          id: row.id,
          recipientId: profile.id,
          recipientName: profile.company_name || profile.display_name,
          recipientType: profile.role as 'planner' | 'vendor',
          initials: profile.initials || profile.display_name.slice(0, 2).toUpperCase(),
          lastMessage: row.last_message || 'Start your conversation.',
          updatedAt: row.updated_at,
        }]
      })
      setUserId(user.id)
      setConversations(mapped)
      const initialSelection = mapped.some((conversation) => conversation.id === requestedConversation)
        ? requestedConversation!
        : mapped[0]?.id ?? ''
      setSelectedId(initialSelection)
      setLoading(false)
    }
    void loadInbox().catch((loadError: unknown) => {
      if (active) {
        setError(loadError instanceof Error ? loadError.message : 'Could not load messages.')
        setLoading(false)
      }
    })
    return () => { active = false }
  }, [router])

  useEffect(() => {
    if (!selectedId || !userId) { setMessages([]); return }
    let active = true
    setMessagesLoading(true)
    const refresh = () => loadMessages(selectedId).then((loaded) => {
      if (active) { setMessages(loaded); setError(''); setMessagesLoading(false) }
    }).catch((loadError: unknown) => {
      if (active) { setError(loadError instanceof Error ? loadError.message : 'Could not load messages.'); setMessagesLoading(false) }
    })
    void refresh()
    const channel = supabase.channel(`couple-conversation-${selectedId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${selectedId}` }, (payload) => {
        const incoming = payload.new as MessageRow
        setConversations((current) => current.map((conversation) => conversation.id === selectedId
          ? { ...conversation, lastMessage: incoming.body, updatedAt: incoming.created_at }
          : conversation))
        void refresh()
      })
      .subscribe()
    return () => { active = false; void supabase.removeChannel(channel) }
  }, [loadMessages, selectedId, userId])

  async function sendMessage(text: string) {
    if (!activeConversation || !userId) return false
    setSending(true)
    setError('')
    const { data, error: sendError } = await supabase.from('messages').insert({
      conversation_id: activeConversation.id,
      sender_profile_id: userId,
      body: text,
    }).select('id,conversation_id,sender_profile_id,body,created_at').single()
    setSending(false)
    if (sendError || !data) {
      setError(sendError?.message ?? 'Message could not be sent.')
      return false
    }
    const sent = data as MessageRow
    setMessages((current) => current.some((message) => message.id === sent.id) ? current : [...current, sent])
    setConversations((current) => current.map((conversation) => conversation.id === sent.conversation_id
      ? { ...conversation, lastMessage: sent.body, updatedAt: sent.created_at }
      : conversation))
    return true
  }

  return (
    <main className="couple-messages-page">
      <header className="couple-messages-topbar">
        <Link href="/couple" className="couple-messages-back"><ArrowLeft size={17} /> Back to wedding</Link>
        <div className="couple-messages-brand">A Lovers Card</div>
      </header>

      <div className="couple-messages-shell">
        <aside className="couple-conversation-panel" aria-label="Your conversations">
          <div className="couple-conversation-heading"><div><p>YOUR WEDDING</p><h1>Messages</h1></div></div>
          <div className="couple-conversation-list">
            {conversations.map((conversation) => (
              <button
                className={`couple-conversation-item ${selectedId === conversation.id ? 'is-active' : ''}`}
                key={conversation.id}
                type="button"
                onClick={() => {
                  setSelectedId(conversation.id)
                  const url = new URL(window.location.href)
                  url.searchParams.set('conversation', conversation.id)
                  window.history.replaceState({}, '', `${url.pathname}${url.search}`)
                }}
              >
                <span className={`couple-conversation-avatar is-${conversation.recipientType}`} aria-hidden="true">
                  {conversation.recipientType === 'vendor' ? <Camera size={17} /> : <ClipboardList size={17} />}
                </span>
                <span className="couple-conversation-main">
                  <span className="couple-conversation-name-line"><strong>{conversation.recipientName}</strong><time>{formatTime(conversation.updatedAt)}</time></span>
                  <span className="couple-conversation-preview-line"><span>{conversation.lastMessage}</span></span>
                  <span className="couple-conversation-type">{conversation.recipientType}</span>
                </span>
              </button>
            ))}
          </div>
        </aside>

        <section className="couple-message-workspace" aria-label="Conversation">
          {loading ? <p className="couple-messages-status">Loading your messages…</p>
            : activeConversation ? <>
              {error && <p className="couple-messages-error" role="alert">{error}</p>}
              {messagesLoading && messages.length === 0 ? <p className="couple-messages-status">Loading this chat…</p> : null}
              <MessageInterface
                recipientName={activeConversation.recipientName}
                recipientType={activeConversation.recipientType}
                messages={messages.map((message) => ({
                  id: message.id,
                  senderId: message.sender_profile_id,
                  senderName: message.sender_profile_id === userId ? 'You' : activeConversation.recipientName,
                  text: message.body,
                  timestamp: new Date(message.created_at),
                  isOwn: message.sender_profile_id === userId,
                }))}
                onSendMessage={sendMessage}
                isSending={sending}
                theme="couple"
              />
            </> : <div className="couple-messages-empty">
              <span><MessageCircle size={24} /></span>
              <h2>{error ? 'Messages need setup.' : 'No chats yet.'}</h2>
              <p>{error || 'Choose a planner or vendor to start.'}</p>
              <Link href="/couple/vendors">Find a wedding team <ArrowRight size={15} /></Link>
            </div>}
        </section>
      </div>
    </main>
  )
}
