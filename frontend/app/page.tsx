'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
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
    router.push('/auth?role=' + role)
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
          <h2>Couples · Planner · Vendor</h2>
        </div>
        <div className="step-grid">
          <article className="step glass-card">
            <div className="step-image">
              <img src="/couple.png" alt="Couples tool" />
            </div>
            <div className="step-content">
              <p><strong>Design your perfect wedding</strong> with AI-powered moodboards</p>
            </div>
          </article>
          <article className="step glass-card">
            <div className="step-image">
              <img src="/planner.png" alt="Planner tool" />
            </div>
            <div className="step-content">
              <p><strong>Manage leads and coordinate</strong> every wedding detail</p>
            </div>
          </article>
          <article className="step glass-card">
            <div className="step-image">
              <img src="/vendor.png" alt="Vendor tool" />
            </div>
            <div className="step-content">
              <p><strong>Showcase services and grow</strong> your wedding business</p>
            </div>
          </article>
        </div>
      </section>

      <section className="cta cta-simple" id="planning">
        <div>
          <h2>Ready to start planning?</h2>
          <p>Join as a couple, planner, or vendor to bring your wedding vision to life</p>
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
