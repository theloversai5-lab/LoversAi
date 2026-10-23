'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, MessageCircle } from 'lucide-react'
import MessageInterface from '@/components/shared/MessageInterface'
import { supabase, type UserRole } from '@/lib/supabase/client'

type Conversation = { id: string; personId: string; name: string; role: 'couple'; initials: string; lastMessage: string; updatedAt: string }
type Message = { id: string; conversation_id: string; sender_profile_id: string; body: string; created_at: string }

export default function ProfessionalMessages({ role }: { role: Extract<UserRole, 'planner' | 'vendor'> }) {
  const router = useRouter()
  const [userId, setUserId] = useState('')
  const [items, setItems] = useState<Conversation[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const selected = useMemo(() => items.find((item) => item.id === selectedId), [items, selectedId])

  const loadMessages = useCallback(async (id: string) => {
    const { data, error: loadError } = await supabase.from('messages').select('id,conversation_id,sender_profile_id,body,created_at').eq('conversation_id', id).order('created_at')
    if (loadError) throw loadError
    return (data ?? []) as Message[]
  }, [])

  useEffect(() => {
    let active = true
    async function loadInbox() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace(`/auth?role=${role}&mode=signin&next=%2F${role}%2Fmessages`); return }
      const { data: ownProfile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
      if (ownProfile?.role !== role) { router.replace(`/${ownProfile?.role ?? role}`); return }
      const { data: rows, error: rowError } = await supabase.from('conversations').select('id,couple_profile_id,last_message,updated_at').eq('professional_profile_id', user.id).order('updated_at', { ascending: false })
      if (rowError) throw rowError
      const ids = (rows ?? []).map((row) => row.couple_profile_id)
      const { data: people, error: peopleError } = ids.length
        ? await supabase.from('profiles').select('id,display_name,initials').in('id', ids)
        : { data: [], error: null }
      if (peopleError) throw peopleError
      if (!active) return
      const profiles = new Map((people ?? []).map((person) => [person.id, person]))
      setUserId(user.id)
      setItems((rows ?? []).flatMap((row) => {
        const person = profiles.get(row.couple_profile_id)
        if (!person) return []
        return [{ id: row.id, personId: person.id, name: person.display_name, role: 'couple' as const, initials: person.initials || person.display_name.slice(0, 2).toUpperCase(), lastMessage: row.last_message || 'Start your conversation.', updatedAt: row.updated_at }]
      }))
      const requestedConversation = new URLSearchParams(window.location.search).get('conversation')
      const requestedIsInInbox = Boolean(requestedConversation && (rows ?? []).some((row) => row.id === requestedConversation))
      setSelectedId(requestedIsInInbox ? requestedConversation! : (rows ?? [])[0]?.id ?? '')
      setLoading(false)
    }
    void loadInbox().catch((loadError: unknown) => { if (active) { setError(loadError instanceof Error ? loadError.message : 'Messages could not load.'); setLoading(false) } })
    return () => { active = false }
  }, [role, router])

  useEffect(() => {
    if (!selectedId) { setMessages([]); return }
    let active = true
    const refresh = () => loadMessages(selectedId).then((loaded) => { if (active) setMessages(loaded) }).catch((loadError: unknown) => { if (active) setError(loadError instanceof Error ? loadError.message : 'Messages could not load.') })
    void refresh()
    const channel = supabase.channel(`professional-conversation-${selectedId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${selectedId}` }, () => { void refresh() }).subscribe()
    return () => { active = false; void supabase.removeChannel(channel) }
  }, [loadMessages, selectedId])

  async function sendMessage(text: string) {
    if (!selected || !userId) return false
    setSending(true)
    setError('')
    const { data, error: sendError } = await supabase.from('messages').insert({ conversation_id: selected.id, sender_profile_id: userId, body: text }).select('id,conversation_id,sender_profile_id,body,created_at').single()
    setSending(false)
    if (sendError || !data) { setError(sendError?.message ?? 'Message could not send.'); return false }
    setMessages((current) => current.some((item) => item.id === data.id) ? current : [...current, data as Message])
    setItems((current) => current.map((item) => item.id === selected.id ? { ...item, lastMessage: data.body, updatedAt: data.created_at } : item))
    return true
  }

  return <main className="couple-messages-page professional-messages-page">
    <header className="couple-messages-topbar"><Link href={`/${role}/profile`} className="couple-messages-back"><ArrowLeft size={17} /> Back to profile</Link><div className="couple-messages-brand">A Lovers Card</div></header>
    <div className="couple-messages-shell">
      <aside className="couple-conversation-panel" aria-label="Your conversations"><div className="couple-conversation-heading"><div><p>YOUR WEDDING WORK</p><h1>Messages</h1></div></div><div className="couple-conversation-list">{items.map((item) => <button key={item.id} type="button" className={`couple-conversation-item ${selectedId === item.id ? 'is-active' : ''}`} onClick={() => setSelectedId(item.id)}><span className="couple-conversation-avatar is-planner" aria-hidden="true">{item.initials}</span><span className="couple-conversation-main"><span className="couple-conversation-name-line"><strong>{item.name}</strong><time>{new Date(item.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</time></span><span className="couple-conversation-preview-line"><span>{item.lastMessage}</span></span><span className="couple-conversation-type">Couple</span></span></button>)}</div></aside>
      <section className="couple-message-workspace" aria-label="Conversation">{loading ? <p className="couple-messages-status">Loading your messages…</p> : selected ? <>{error && <p className="couple-messages-error" role="alert">{error}</p>}<MessageInterface recipientName={selected.name} recipientType="couple" messages={messages.map((message) => ({ id: message.id, senderId: message.sender_profile_id, senderName: message.sender_profile_id === userId ? 'You' : selected.name, text: message.body, timestamp: new Date(message.created_at), isOwn: message.sender_profile_id === userId }))} onSendMessage={sendMessage} isSending={sending} sendError={error} theme={role} /></> : <div className="couple-messages-empty"><span><MessageCircle size={24} /></span><h2>{error ? 'Messages need setup.' : 'No chats yet.'}</h2><p>{error || 'Couple chats appear here.'}</p></div>}</section>
    </div>
  </main>
}
