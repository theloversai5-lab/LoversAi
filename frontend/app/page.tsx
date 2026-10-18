'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import Navbar from '@/components/landing/Navbar'
import HeroSection from '@/components/landing/HeroSection'
import RoleModal from '@/components/landing/RoleModal'

const referenceImage =
  'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-BKNxdlxcThjF5XPM48EE4LMRTC7xXo.png'

const steps = [
  {
    number: '01',
    title: 'Choose your wedding style.',
    text: 'Explore curated aesthetics — from grand heritage mandaps to intimate open-air lawns.',
    position: 'center 22%',
  },
  {
    number: '02',
    title: 'Plan it yourself or work with a planner.',
    text: 'Shape every detail on your own, or collaborate with an experienced wedding coordinator.',
    position: 'center 50%',
  },
  {
    number: '03',
    title: 'Find the right vendors.',
    text: 'Connect directly with verified decorators, caterers, photographers, and venues tailored to your vision.',
    position: 'center 75%',
  },
]

export default function Page() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<'couple' | 'planner' | null>(null)

  const handleSelectRole = (role: 'couple' | 'planner') => {
    setSelectedRole(role)
    setIsModalOpen(false)
    if (role === 'planner') {
      window.location.href = '/planner/leads'
      return
    }
    const pathwaysSection = document.getElementById('pathways')
    if (pathwaysSection) {
      pathwaysSection.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <main className="site-shell">
      {/* Combined Navbar + Hero with shared backdrop */}
      <div className="navbar-hero-backdrop">
        <Navbar onUseApp={() => setIsModalOpen(true)} />
        <HeroSection onUseApp={() => setIsModalOpen(true)} />
      </div>

      {/* Pop-up modal for Couple vs Planner role selection */}
      <RoleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelectRole={handleSelectRole}
      />

      {/* Use Tools Section */}
      <section className="how section" id="use-tools">
        <div className="section-heading">
          <h2>Couples · Planner · Vendor</h2>
        </div>
        <div className="step-grid">
          <article className="step glass-card">
            <div className="step-image">
              <img
                src="/couple.png"
                alt="Couples tool"
              />
            </div>
            <div className="step-content">
              <p><strong>Design your perfect wedding</strong> with AI-powered moodboards</p>
            </div>
          </article>
          <article className="step glass-card">
            <div className="step-image">
              <img
                src="/planner.png"
                alt="Planner tool"
              />
            </div>
            <div className="step-content">
              <p><strong>Manage leads and coordinate</strong> every wedding detail</p>
            </div>
          </article>
          <article className="step glass-card">
            <div className="step-image">
              <img
                src="/vendor.png"
                alt="Vendor tool"
              />
            </div>
            <div className="step-content">
              <p><strong>Showcase services and grow</strong> your wedding business</p>
            </div>
          </article>
        </div>
      </section>

      {/* Ready CTA */}
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

      {/* Footer */}
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
