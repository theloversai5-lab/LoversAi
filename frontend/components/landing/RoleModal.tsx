'use client'

import { useEffect } from 'react'
import { UsersRound, BriefcaseBusiness, Store, X } from 'lucide-react'

interface RoleModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectRole: (role: 'couple' | 'planner' | 'vendor') => void
}

export default function RoleModal({ isOpen, onClose, onSelectRole }: RoleModalProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="role-modal-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <section
        className="role-modal-card"
        aria-labelledby="role-modal-title"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <button
          className="role-modal-close"
          onClick={onClose}
          type="button"
          aria-label="Close role choices"
        >
          <X size={20} />
        </button>

        <div className="role-modal-header">
          <p className="role-modal-eyebrow">A LOVERS CARD</p>
          <h2 className="role-modal-title" id="role-modal-title">Choose your path</h2>
        </div>

        <div className="role-modal-grid">
          <button
            type="button"
            className="role-option-card couple-card"
            onClick={() => onSelectRole('couple')}
          >
            <span className="role-icon-wrap"><UsersRound size={28} strokeWidth={1.8} /></span>
            <span className="role-option-copy">
              <strong>Couple</strong>
            </span>
          </button>

          <button type="button" className="role-option-card professional-card" onClick={() => onSelectRole('planner')}>
            <span className="role-icon-wrap"><BriefcaseBusiness size={28} strokeWidth={1.8} /></span>
            <span className="role-option-copy"><strong>Planner</strong></span>
          </button>
          <button type="button" className="role-option-card professional-card" onClick={() => onSelectRole('vendor')}>
            <span className="role-icon-wrap"><Store size={28} strokeWidth={1.8} /></span>
            <span className="role-option-copy"><strong>Vendor</strong></span>
          </button>
        </div>
      </section>
    </div>
  )
}
