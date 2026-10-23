'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, ClipboardList, SendHorizontal } from 'lucide-react'
import { validateMessageContent } from '@/lib/utils/messageFilter'

interface Message {
  id: string
  senderId: string
  senderName: string
  text: string
  timestamp: Date
  isOwn: boolean
}

interface MessageInterfaceProps {
  recipientName: string
  recipientType?: 'couple' | 'vendor' | 'planner'
  messages: Message[]
  onSendMessage: (text: string) => void | boolean | Promise<void | boolean>
  isSending?: boolean
  sendError?: string
  theme?: 'couple' | 'planner' | 'vendor'
}

export default function MessageInterface({
  recipientName,
  recipientType = 'vendor',
  messages,
  onSendMessage,
  isSending = false,
  sendError = '',
  theme = 'couple',
}: MessageInterfaceProps) {
  const [messageText, setMessageText] = useState('')
  const [validationError, setValidationError] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const RecipientIcon = recipientType === 'vendor' ? Camera : ClipboardList

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!messageText.trim()) return

    const validation = validateMessageContent(messageText)
    if (!validation.valid) {
      setValidationError(validation.reason || 'This message cannot be sent.')
      return
    }

    try {
      const sent = await onSendMessage(messageText.trim())
      if (sent === false) return
      setMessageText('')
      setValidationError('')
    } catch {
      setValidationError('Message could not be sent. Try again.')
    }
  }

  return (
    <div className={`message-interface message-interface--${theme}`}>
      <header className="message-interface-header">
        <span className={`message-recipient-avatar is-${recipientType}`} aria-hidden="true">
          <RecipientIcon size={18} />
        </span>
        <div className="message-recipient-copy">
          <h2>{recipientName}</h2>
          <p>{recipientType === 'vendor' ? 'Wedding vendor' : recipientType === 'planner' ? 'Wedding planner' : 'Wedding couple'}</p>
        </div>
      </header>

      <div className="message-thread" aria-live="polite">
        <p className="message-thread-date">Today</p>
        {messages.map((message) => (
          <div className={`message-row ${message.isOwn ? 'is-own' : ''}`} key={message.id}>
            <div className="message-content">
              {!message.isOwn && <p className="message-sender">{message.senderName}</p>}
              <div className="message-bubble">
                <p>{message.text}</p>
                <time>
                  {message.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </time>
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="message-composer">
        {validationError && <p className="message-validation-error">{validationError}</p>}
        <form onSubmit={handleSend}>
          <input
            aria-label="Write a message"
            value={messageText}
            onChange={(event) => {
              setMessageText(event.target.value)
              setValidationError('')
            }}
            placeholder="Write a message"
            type="text"
          />
          <button aria-label="Send message" disabled={!messageText.trim() || isSending} type="submit">
            <SendHorizontal size={18} />
          </button>
        </form>
        <p role={sendError ? 'alert' : undefined}>{sendError || 'Press Enter to send'}</p>
      </div>
    </div>
  )
}
