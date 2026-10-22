'use client'

import { useEffect, useState } from 'react'
import { Users, Calendar, Store, X, ArrowRight, ArrowLeft } from 'lucide-react'

interface RoleModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectRole: (role: 'couple' | 'planner' | 'vendor') => void
}

export default function RoleModal({ isOpen, onClose, onSelectRole }: RoleModalProps) {
  const [step, setStep] = useState<'initial' | 'professional'>('initial')

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        setStep('initial')
      }
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

  const handleClose = () => {
    onClose()
    setTimeout(() => setStep('initial'), 300)
  }

  const handleProfessionalSelect = () => {
    setStep('professional')
  }

  const handleBack = () => {
    setStep('initial')
  }

  if (!isOpen) return null

  return (
    <div className="role-modal-backdrop" onClick={handleClose} role="dialog" aria-modal="true">
      <div className="role-modal-card" onClick={(e) => e.stopPropagation()}>
        <button
          className="role-modal-close"
          onClick={handleClose}
          type="button"
          aria-label="Close dialog"
        >
          <X size={20} />
        </button>

        {step === 'professional' && (
          <button
            className="role-modal-back"
            onClick={handleBack}
            type="button"
            aria-label="Go back"
          >
            <ArrowLeft size={18} />
          </button>
        )}

        <div className="role-modal-header">
          <p className="role-modal-eyebrow">A LOVERS CARD</p>
          <h2 className="role-modal-title">Who is planning?</h2>
          <p className="role-modal-sub">Choose your path</p>
        </div>

        {step === 'initial' ? (
          <div className="role-modal-grid">
            <button
              type="button"
              className="role-option-card couple-card"
              onClick={() => onSelectRole('couple')}
            >
              <div className="role-icon-wrap">
                <Users size="50%" strokeWidth={2.5} />
              </div>
              <h3>We are a couple</h3>
            </button>

            <button
              type="button"
              className="role-option-card professional-card"
              onClick={handleProfessionalSelect}
            >
              <div className="role-icon-wrap">
                <Calendar size="50%" strokeWidth={2.5} />
              </div>
              <h3>I am a planner / vendor</h3>
            </button>
          </div>
        ) : (
          <div className="role-modal-grid">
            <button
              type="button"
              className="role-option-card planner-card"
              onClick={() => onSelectRole('planner')}
            >
              <div className="role-icon-wrap">
                <Calendar size="50%" strokeWidth={2.5} />
              </div>
              <h3>I am a planner</h3>
            </button>

            <button
              type="button"
              className="role-option-card vendor-card"
              onClick={() => onSelectRole('vendor')}
            >
              <div className="role-icon-wrap">
                <Store size="50%" strokeWidth={2.5} />
              </div>
              <h3>I am a vendor</h3>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
