'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import {
  ArrowRight,
  Brush,
  Coins,
  Image as ImageIcon,
  Handshake,
  MessageSquareText,
  ScrollText,
  UserRound,
  WandSparkles,
} from 'lucide-react'

const flowSteps = [
  { number: '01', title: 'Create your account', copy: 'Keep your wedding details.', action: 'Create account or sign in', href: '/auth?role=couple', icon: UserRound, layout: 'is-account' },
  { number: '02', title: 'Build your moodboard', copy: 'Save styles, colors, and ideas.', action: 'Open your moodboard', href: '/couple/moodboard', icon: ImageIcon, image: '/tool-couples.jpg', imageAlt: 'Wedding moodboard with colors and ideas', layout: 'is-moodboard' },
  { number: '03', title: 'Hire a planner', copy: 'Get help from a planner.', action: 'Find a planner', href: '/couple/request', icon: Handshake, image: '/tool-planner.jpg', imageAlt: 'Wedding planner notes and plans', layout: 'is-choice' },
  { number: '04', title: 'Plan it yourself', copy: 'Shape each part your way.', action: 'Start your design', href: '/couple/vision', icon: WandSparkles, image: '/playground-04-decor.png', imageAlt: 'Wedding ceremony designed for a couple', layout: 'is-choice' },
]

const inspiration = [
  { title: 'Plan your wedding', image: '/playground-04-decor.png', href: '/couple/vision' },
  { title: 'Check your saved design', image: '/playground-03-seating.png', href: '/couple/moodboard' },
  { title: 'Find a vendor', image: '/tool-vendor.jpg', href: '/couple/vendors' },
]

export default function CoupleHomePage() {
  const templeRef = useRef<HTMLDivElement>(null)
  const [topbarHidden, setTopbarHidden] = useState(false)

  useEffect(() => {
    let previousScrollY = window.scrollY

    const handleScroll = () => {
      const currentScrollY = window.scrollY
      const scrollDelta = currentScrollY - previousScrollY

      if (currentScrollY < 48) {
        setTopbarHidden(false)
      } else if (scrollDelta > 6) {
        setTopbarHidden(true)
      } else if (scrollDelta < -6) {
        setTopbarHidden(false)
      }

      previousScrollY = currentScrollY
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const temple = templeRef.current
    const revealItems = Array.from(document.querySelectorAll<HTMLElement>('.couple-scroll-reveal'))
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const desktop = window.matchMedia('(min-width: 681px)').matches
    let cleanupParallax = () => {}

    if (!reducedMotion && desktop && temple) {
      const moveTemple = (event: PointerEvent) => {
        const bounds = temple.getBoundingClientRect()
        const x = (event.clientX - (bounds.left + bounds.width / 2)) / bounds.width
        const y = (event.clientY - (bounds.top + bounds.height / 2)) / bounds.height
        temple.style.setProperty('--parallax-x', `${x * 5}px`)
        temple.style.setProperty('--parallax-y', `${y * 4}px`)
      }
      const resetTemple = () => {
        temple.style.setProperty('--parallax-x', '0px')
        temple.style.setProperty('--parallax-y', '0px')
      }
      temple.addEventListener('pointermove', moveTemple)
      temple.addEventListener('pointerleave', resetTemple)
      cleanupParallax = () => {
        temple.removeEventListener('pointermove', moveTemple)
        temple.removeEventListener('pointerleave', resetTemple)
      }
    }

    if (reducedMotion || !('IntersectionObserver' in window)) {
      revealItems.forEach((item) => item.classList.add('is-visible'))
      return cleanupParallax
    }

    revealItems.forEach((item) => item.classList.add('is-pending'))
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible')
          observer.unobserve(entry.target)
        }
      })
    }, { threshold: 0.12, rootMargin: '0px 0px -36px 0px' })
    revealItems.forEach((item) => observer.observe(item))

    return () => {
      observer.disconnect()
      cleanupParallax()
    }
  }, [])

  return (
    <main className="couple-home">
      <header className={`couple-topbar ${topbarHidden ? 'is-hidden' : ''}`}>
        <Link className="couple-brand" href="/couple" aria-label="A Lovers Card home">
          <strong>A Lovers Card</strong>
        </Link>
        <div className="couple-header-actions">
          <Link className="couple-message-button" href="/couple/messages" aria-label="Messages">
            <MessageSquareText size={20} strokeWidth={1.7} />
          </Link>
          <a className="couple-profile" href="#account" aria-label="Your account">
            <UserRound size={20} strokeWidth={1.7} />
          </a>
        </div>
      </header>

      <div className="couple-dashboard-wrap">
        <section className="couple-welcome" id="home">
          <div className="couple-welcome-copy">
            <p className="couple-eyebrow">YOUR WEDDING</p>
            <h1>
              <span>Your day.</span>
              <span>Your story.</span>
            </h1>
            <p className="couple-welcome-line"><span>Plan your day.</span><span>Your way.</span></p>
            <span className="couple-copy-divider" aria-hidden="true" />
            <Link href="/couple/moodboard" className="couple-primary-button">
              Design your wedding <ArrowRight className="couple-cta-arrow" size={17} />
            </Link>
            <div className="couple-auth-actions">
              <Link href="/auth?role=couple&next=%2Fcouple%2Fmoodboard">Create account</Link>
              <Link href="/auth?role=couple&mode=signin&next=%2Fcouple%2Fmoodboard">Sign in</Link>
            </div>
          </div>
          <div className="couple-welcome-art" ref={templeRef} aria-hidden="true">
            <span className="couple-temple-art" />
          </div>
        </section>

        <div className="couple-hero-credits couple-scroll-reveal" aria-label="Our promise">
          <span>Thoughtfully planned</span>
          <span>Uniquely yours</span>
          <span>A little bit legendary</span>
        </div>

        <section className="couple-tools-section couple-scroll-reveal" id="tools" aria-labelledby="tools-title">
          <div className="couple-section-heading">
            <div>
              <p className="couple-eyebrow">YOUR WEDDING TOOLS</p>
              <h2 id="tools-title">Your wedding, step by step</h2>
              <p className="couple-flow-intro"><span>Start with your ideas.</span><span>Then choose how to plan.</span></p>
            </div>
          </div>
          <div className="couple-flow-grid">
            {flowSteps.map(({ number, title, copy, action, href, icon: Icon, image, imageAlt, layout }, index) => (
              <div className="couple-flow-item" key={number}>
                {index === 2 && (
                  <div className="couple-flow-choice-heading">
                    <p className="couple-eyebrow">STEP 3 · CHOOSE YOUR WAY</p>
                    <h3>Who will plan your day?</h3>
                    <p>Choose what feels right.</p>
                  </div>
                )}
                <Link href={href} className={`couple-flow-card ${layout}`}>
                  <span className="couple-flow-visual">
                    {image ? <Image src={image} alt={imageAlt ?? ''} fill sizes="(max-width: 680px) 90vw, 42vw" /> : <Icon size={54} strokeWidth={1.35} />}
                    <span className="couple-flow-number">{number}</span>
                  </span>
                  <span className="couple-flow-copy">
                    <small className="couple-flow-kicker">STEP {number}</small>
                    <strong>{title}</strong>
                    <span>{copy}</span>
                    <span className="couple-flow-action">{action}<ArrowRight size={17} aria-hidden="true" /></span>
                  </span>
                </Link>
              </div>
            ))}
          </div>
        </section>

        <section className="couple-legacy-grid" id="quotes">
          <div className="couple-checklist panel-card">
            <div className="couple-panel-heading">
              <div>
                <p className="couple-eyebrow">PLANNER REQUEST</p>
                <h2>Track your request</h2>
              </div>
              <ScrollText size={24} className="couple-panel-mark" />
            </div>
            <p className="couple-panel-note">Check its status here.</p>
            <Link href="/couple/requests" className="couple-text-link">View your request <ArrowRight size={15} /></Link>
          </div>

          <div className="couple-account-card panel-card" id="account">
            <p className="couple-eyebrow">YOUR ACCOUNT</p>
            <div className="couple-account-row"><Coins size={20} /><span>Credits</span><strong>—</strong></div>
            <div className="couple-account-row"><Brush size={20} /><span>Current plan</span><strong>—</strong></div>
          </div>
        </section>

        <section className="couple-inspiration-section" aria-labelledby="inspiration-title">
          <div className="couple-section-heading">
            <div>
              <p className="couple-eyebrow">YOUR NEXT STEP</p>
              <h2 id="inspiration-title">What would you like to do?</h2>
            </div>
          </div>
          <div className="couple-inspiration-grid">
            {inspiration.map((item) => (
              <Link href={item.href} className="couple-inspiration-card" key={item.title}>
                <Image src={item.image} alt="" fill sizes="(max-width: 760px) 90vw, 30vw" />
                <span>{item.title}<ArrowRight size={15} /></span>
              </Link>
            ))}
          </div>
        </section>

        <footer className="couple-footer"><span>A LOVERS CARD</span><span>YOUR WEDDING, YOUR WAY</span></footer>
      </div>
    </main>
  )
}
