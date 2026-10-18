'use client'

import { useEffect } from 'react'
import { Heart, Briefcase, X, ArrowRight } from 'lucide-react'

interface RoleModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectRole: (role: 'couple' | 'planner') => void
}

export default function RoleModal({ isOpen, onClose, onSelectRole }: RoleModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="role-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="role-modal-card" onClick={(e) => e.stopPropagation()}>
        <button
          className="role-modal-close"
          onClick={onClose}
          type="button"
          aria-label="Close dialog"
        >
          <X size={20} />
        </button>

        <div className="role-modal-header">
          <p className="role-modal-eyebrow">A LOVERS CARD</p>
          <h2 className="role-modal-title">Who is planning?</h2>
          <p className="role-modal-sub">Choose who you are.</p>
        </div>

        <div className="role-modal-grid">
          <button
            type="button"
            className="role-option-card couple-card"
            onClick={() => onSelectRole('couple')}
          >
            <div className="role-icon-wrap">
              <Heart size={26} strokeWidth={2} />
            </div>
            <h3>We are a couple</h3>
            <p>Planning our wedding.</p>
            <span className="role-card-action">
              Start planning <ArrowRight size={14} />
            </span>
          </button>

          <button
            type="button"
            className="role-option-card planner-card"
            onClick={() => onSelectRole('planner')}
          >
            <div className="role-icon-wrap">
              <Briefcase size={26} strokeWidth={2} />
            </div>
            <h3>I am a planner</h3>
            <p>Managing weddings.</p>
            <span className="role-card-action">
              Open workspace <ArrowRight size={14} />
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
