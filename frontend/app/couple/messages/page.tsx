'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Camera, ClipboardList } from 'lucide-react'
import MessageInterface from '@/components/shared/MessageInterface'

interface Conversation {
  id: string
  recipientName: string
  recipientType: 'vendor' | 'planner'
  lastMessage: string
  unread: boolean
  timestamp: string
}

const conversations: Conversation[] = [
  { id: 'conv1', recipientName: 'Eternal Frames', recipientType: 'vendor', lastMessage: 'We can make it work.', unread: true, timestamp: '2h' },
  { id: 'conv2', recipientName: 'Events by Priya', recipientType: 'planner', lastMessage: 'I would love to help.', unread: false, timestamp: '1d' },
]

const startingMessages = [
  { id: 'm1', senderId: 'couple1', senderName: 'You', text: 'We love your work.', timestamp: new Date(Date.now() - 3_600_000), isOwn: true },
  { id: 'm2', senderId: 'vendor1', senderName: 'Eternal Frames', text: 'When is your day?', timestamp: new Date(Date.now() - 3_000_000), isOwn: false },
  { id: 'm3', senderId: 'couple1', senderName: 'You', text: '14 Dec, Udaipur.', timestamp: new Date(Date.now() - 2_400_000), isOwn: true },
  { id: 'm4', senderId: 'vendor1', senderName: 'Eternal Frames', text: 'We can make it work.', timestamp: new Date(Date.now() - 1_800_000), isOwn: false },
]

export default function CoupleMessagesPage() {
  const [selectedConversation, setSelectedConversation] = useState(conversations[0].id)
  const [messages, setMessages] = useState(startingMessages)
  const activeConversation = conversations.find((conversation) => conversation.id === selectedConversation)

  const handleSendMessage = (text: string) => {
    setMessages((currentMessages) => [
      ...currentMessages,
      { id: `m${currentMessages.length + 1}`, senderId: 'couple1', senderName: 'You', text, timestamp: new Date(), isOwn: true },
    ])
  }

  return (
    <main className="couple-messages-page">
      <header className="couple-messages-topbar">
        <Link href="/couple" className="couple-messages-back">
          <ArrowLeft size={17} /> Back to wedding
        </Link>
        <div className="couple-messages-brand">A Lovers Card</div>
      </header>

      <div className="couple-messages-shell">
        <aside className="couple-conversation-panel" aria-label="Your conversations">
          <div className="couple-conversation-heading">
            <div>
              <p>YOUR WEDDING</p>
              <h1>Messages</h1>
            </div>
          </div>

          <div className="couple-conversation-list">
            {conversations.map((conversation) => (
              <button
                className={`couple-conversation-item ${selectedConversation === conversation.id ? 'is-active' : ''}`}
                key={conversation.id}
                type="button"
                onClick={() => setSelectedConversation(conversation.id)}
              >
                <span className={`couple-conversation-avatar is-${conversation.recipientType}`} aria-hidden="true">
                  {conversation.recipientType === 'vendor' ? <Camera size={17} /> : <ClipboardList size={17} />}
                </span>
                <span className="couple-conversation-main">
                  <span className="couple-conversation-name-line">
                    <strong>{conversation.recipientName}</strong>
                    <time>{conversation.timestamp}</time>
                  </span>
                  <span className="couple-conversation-preview-line">
                    <span>{conversation.lastMessage}</span>
                    {conversation.unread && <i aria-label="Unread message" />}
                  </span>
                  <span className="couple-conversation-type">{conversation.recipientType}</span>
                </span>
              </button>
            ))}
          </div>

        </aside>

        <section className="couple-message-workspace" aria-label="Conversation">
          {activeConversation && (
            <MessageInterface
              recipientName={activeConversation.recipientName}
              recipientType={activeConversation.recipientType}
              messages={messages}
              onSendMessage={handleSendMessage}
              theme="couple"
            />
          )}
        </section>
      </div>
    </main>
  )
}
