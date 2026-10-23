'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, BriefcaseBusiness, Store, UsersRound } from 'lucide-react'
import Navbar from '@/components/landing/Navbar'
import HeroSection from '@/components/landing/HeroSection'
import RoleModal from '@/components/landing/RoleModal'
import { useAuthStore } from '@/lib/store/authStore'

export default function Page() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const router = useRouter()
  const setRole = useAuthStore(state => state.setRole)

  const handleSelectRole = (role: 'couple' | 'planner' | 'vendor') => {
    setRole(role)
    setIsModalOpen(false)
    router.push(`/${role}`)
  }

  return (
    <main className="site-shell">
      <div className="navbar-hero-backdrop">
        <Navbar onUseApp={() => setIsModalOpen(true)} />
        <HeroSection onUseApp={() => setIsModalOpen(true)} />
      </div>

      <RoleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelectRole={handleSelectRole}
      />

      <section className="how section" id="use-tools">
        <div className="section-heading">
          <h2>Choose your role</h2>
        </div>
        <div className="step-grid role-overview-grid">
          <button type="button" className="role-overview-card" onClick={() => handleSelectRole('couple')}>
            <span className="role-overview-icon"><UsersRound aria-hidden="true" /></span>
            <span className="role-overview-title">Couple</span>
            <span className="role-overview-detail">Plan your wedding</span>
            <ArrowRight className="role-overview-arrow" aria-hidden="true" />
          </button>
          <button type="button" className="role-overview-card" onClick={() => handleSelectRole('planner')}>
            <span className="role-overview-icon"><BriefcaseBusiness aria-hidden="true" /></span>
            <span className="role-overview-title">Planner</span>
            <span className="role-overview-detail">Find wedding leads</span>
            <ArrowRight className="role-overview-arrow" aria-hidden="true" />
          </button>
          <button type="button" className="role-overview-card" onClick={() => handleSelectRole('vendor')}>
            <span className="role-overview-icon"><Store aria-hidden="true" /></span>
            <span className="role-overview-title">Vendor</span>
            <span className="role-overview-detail">Show your services</span>
            <ArrowRight className="role-overview-arrow" aria-hidden="true" />
          </button>
        </div>
      </section>

      <section className="cta cta-simple" id="planning">
        <div>
          <h2>Ready to begin?</h2>
          <p>Choose your wedding path.</p>
          <button
            type="button"
            className="button"
            onClick={() => setIsModalOpen(true)}
          >
            Use app <ArrowRight size={16} />
          </button>
        </div>
      </section>

      <footer>
        <a href="#top" className="brand">
          <span className="brand-mark">♜</span>
          <span>
            <strong>A LOVERS CARD</strong>
            <small>WEDDING PLANNING</small>
          </span>
        </a>
        <nav>
          <a href="#use-tools">Use Tools</a>
          <a href="#moodboard">Moodboard Playground</a>
          <a href="#planning">Get Started</a>
        </nav>
        <div>
          <a href="#top">Privacy Policy</a>
          <a href="#top">Terms of Service</a>
          <a href="#top">Contact</a>
        </div>
      </footer>
    </main>
  )
}
