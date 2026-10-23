'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'

const links = [
  { href: '#use-tools', label: 'Couple' },
  { href: '/planner', label: 'Planner' },
  { href: '/vendor', label: 'Vendor' },
]

interface NavbarProps {
  onUseApp?: () => void
}

export default function Navbar({ onUseApp }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  const handleUseApp = (e: React.MouseEvent) => {
    e.preventDefault()
    setMenuOpen(false)
    if (onUseApp) {
      onUseApp()
    } else {
      const target = document.getElementById('planning')
      target?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <header className="site-header">
      <a href="#top" className="brand" aria-label="A Lovers Card home">
        <span className="brand-logo">
          <Image
            src="/temple-logo.png"
            alt=""
            width={44}
            height={44}
            className="brand-logo-img"
            priority
          />
        </span>
        <span className="brand-copy">
          <strong>A LOVERS CARD</strong>
          <small>WEDDING PLANNING</small>
        </span>
      </a>

      <button
        className="menu-toggle"
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
        aria-expanded={menuOpen}
        aria-label="Toggle menu"
      >
        ☰
      </button>

      <nav className={menuOpen ? 'nav-links open' : 'nav-links'} aria-label="Primary">
        {links.map((link) => (
          <a key={link.href} href={link.href} onClick={() => setMenuOpen(false)}>
            {link.label}
          </a>
        ))}
      </nav>

      <div className="header-actions">
        <a href="#planning" className="sign-in" onClick={() => setMenuOpen(false)}>
          Sign In
        </a>
        <button
          type="button"
          className="button button-small start-planning"
          onClick={handleUseApp}
        >
          Use app <ArrowRight size={14} strokeWidth={2.2} />
        </button>
      </div>
    </header>
  )
}
