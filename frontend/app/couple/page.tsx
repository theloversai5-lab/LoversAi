'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import {
  ArrowRight,
  Brush,
  CalendarDays,
  Coins,
  Image as ImageIcon,
  MessageCircle,
  MessageSquareText,
  ScrollText,
  ShoppingBag,
  Store,
  UserRound,
  WandSparkles,
} from 'lucide-react'

const tools = [
  { title: 'Wedding vision', copy: 'Shape each wedding event.', href: '/couple/vision', image: '/playground-04-decor.png', icon: WandSparkles },
  { title: 'Moodboards', copy: 'Save and edit ideas.', href: '/couple/moodboard', image: '/playground-03-seating.png', icon: ImageIcon },
  { title: 'Find vendors', copy: 'Choose your wedding team.', href: '/couple/vendors', image: '/tool-vendor.jpg', icon: Store },
  { title: 'Hire a planner', copy: 'Ask for planning help.', href: '/couple/request', image: '/empty-lawn-venue.png', icon: ScrollText },
  { title: 'Saved choices', copy: 'Review your wedding cart.', href: '/couple/cart', image: '/lawn-venue.png', icon: ShoppingBag },
  { title: 'Your messages', copy: 'Talk with your team.', href: '/couple/messages', image: '/playground-02-stage.png', icon: MessageCircle },
]

const inspiration = [
  { title: 'Wedding vision', image: '/playground-04-decor.png', href: '/couple/vision' },
  { title: 'Moodboards', image: '/playground-03-seating.png', href: '/couple/moodboard' },
  { title: 'Vendor search', image: '/tool-vendor.jpg', href: '/couple/vendors' },
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
          <a className="couple-profile" href="#profile" aria-label="Wedding details">
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
            <Link href="/couple/vision" className="couple-primary-button">
              Design your wedding <ArrowRight className="couple-cta-arrow" size={17} />
            </Link>
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
              <h2 id="tools-title">Plan every part</h2>
            </div>
          </div>
          <div className="couple-tool-grid">
            {tools.map(({ title, copy, href, image, icon: Icon }, index) => (
              <Link href={href} className="couple-tool-card" key={title}>
                <div className="couple-tool-image">
                  <Image src={image} alt="" fill sizes="(max-width: 760px) 90vw, 30vw" />
                  <span className="couple-tool-icon"><Icon size={19} /></span>
                  <span className="couple-tool-number">0{index + 1}</span>
                </div>
                <div className="couple-tool-copy">
                  <h3>{title}</h3>
                  <p>{copy}</p>
                  <span className="couple-tool-action" aria-hidden="true"><ArrowRight size={17} /></span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="couple-legacy-grid" id="quotes">
          <div className="couple-checklist panel-card">
            <div className="couple-panel-heading">
              <div>
                <p className="couple-eyebrow">PLANNER REPLIES</p>
                <h2>Quotes and bids</h2>
              </div>
              <ScrollText size={24} className="couple-panel-mark" />
            </div>
            <div className="couple-status-grid">
              <div><strong>—</strong><span>Accepted</span></div>
              <div><strong>—</strong><span>Waiting</span></div>
              <div><strong>—</strong><span>Closed</span></div>
            </div>
            <p className="couple-panel-note">Planner replies show here.</p>
            <Link href="/couple/request" className="couple-text-link">Find a planner <ArrowRight size={15} /></Link>
          </div>

          <div className="couple-account-card panel-card" id="account">
            <p className="couple-eyebrow">YOUR ACCOUNT</p>
            <div className="couple-account-row"><Coins size={20} /><span>Credits</span><strong>—</strong></div>
            <div className="couple-account-row"><Brush size={20} /><span>Current plan</span><strong>—</strong></div>
            <a href="#profile" className="couple-text-link">Wedding details <ArrowRight size={15} /></a>
          </div>
        </section>

        <section className="couple-inspiration-section" aria-labelledby="inspiration-title">
          <div className="couple-section-heading">
            <div>
              <p className="couple-eyebrow">WEDDING IDEAS</p>
              <h2 id="inspiration-title">Begin with a vision</h2>
            </div>
            <CalendarDays size={24} className="couple-panel-mark" />
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

        <section className="couple-help-strip" id="messages">
          <span className="couple-help-icon"><MessageCircle size={19} /></span>
          <div><strong>Recent messages</strong><span>Messages live here.</span></div>
          <Link href="/couple/messages" aria-label="Open messages"><ArrowRight size={18} /></Link>
        </section>

        <section className="couple-profile-strip" id="profile">
          <div><p className="couple-eyebrow">YOUR WEDDING DETAILS</p><strong>Names · Date · Place · Guests · Budget</strong></div>
        </section>

        <footer className="couple-footer"><span>A LOVERS CARD</span><span>YOUR WEDDING, YOUR WAY</span></footer>
      </div>
    </main>
  )
}
