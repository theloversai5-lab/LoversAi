'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ArrowRight, Check, ShoppingCart, Sparkles } from 'lucide-react'
import { useCartStore } from '@/lib/store/cartStore'
import { supabase } from '@/lib/supabase/client'

const ideas = [
  { id: 'moodboard-lawn', title: 'Open lawn', note: 'A sunset ceremony', image: '/playground-01-empty.png', theme: 'Outdoor wedding' },
  { id: 'moodboard-stage', title: 'Wedding stage', note: 'A place to gather', image: '/playground-02-stage.png', theme: 'Wedding stage' },
  { id: 'moodboard-seating', title: 'Guest seats', note: 'A warm welcome', image: '/playground-03-seating.png', theme: 'Guest seating' },
  { id: 'moodboard-decor', title: 'Flowers and decor', note: 'Soft golden light', image: '/playground-04-decor.png', theme: 'Flowers and decor' },
]

const guideSteps = [
  { title: 'Pick a scene', copy: 'Choose what you love.' },
  { title: 'Save your ideas', copy: 'Keep them in one place.' },
  { title: 'Build your board', copy: 'Make it feel like you.' },
]

export default function MoodboardPage() {
  const router = useRouter()
  const { items, addItem, hasItem } = useCartStore()
  const [activeStep, setActiveStep] = useState(0)
  const [mounted, setMounted] = useState(false)
  const [savingBoard, setSavingBoard] = useState(false)
  const [boardSaved, setBoardSaved] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    setMounted(true)
    void supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase.from('moodboards').select('id').eq('profile_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
      if (data) setBoardSaved(true)
    })
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (reduceMotion.matches) return
    const timer = window.setInterval(() => setActiveStep((step) => (step + 1) % guideSteps.length), 3200)
    return () => window.clearInterval(timer)
  }, [])

  const handleAddToCart = (idea: typeof ideas[number]) => {
    if (hasItem(idea.id)) return
    setBoardSaved(false)
    addItem({
      id: idea.id,
      imageUrl: idea.image,
      theme: idea.theme,
      prompt: idea.note,
      addedAt: new Date().toISOString(),
    })
  }

  const saveMoodboard = async () => {
    if (!items.length) return
    setSavingBoard(true)
    setSaveError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth?role=couple&next=%2Fcouple%2Fmoodboard')
      return
    }
    const { error: profileError } = await supabase.from('profiles').select('id').eq('id', user.id).single()
    if (profileError) {
      setSaveError('Finish your profile first.')
      setSavingBoard(false)
      return
    }
    const { error } = await supabase.from('moodboards').insert({
      profile_id: user.id,
      title: 'Wedding moodboard',
      event_type: 'Wedding',
      style: [...new Set(items.map((item) => item.theme))].join(', '),
      summary: items.map((item) => item.prompt).filter(Boolean).join('. '),
      image_urls: [...new Set(items.map((item) => item.imageUrl))],
      is_public: true,
    })
    setSavingBoard(false)
    if (error) {
      setSaveError('Could not save. Please try again.')
      return
    }
    setBoardSaved(true)
  }

  return (
    <main className="mood-page">
      <div className="mood-shell">
        <header className="mood-topbar">
          <button className="mood-wordmark" onClick={() => router.push('/couple')}>A Lovers Card</button>
          <button className="mood-cart-link" onClick={() => router.push('/couple/cart')} aria-label={`Open cart with ${items.length} items`}>
            <ShoppingCart size={18} />
            <span>Cart</span>
            <b>{mounted ? items.length : 0}</b>
          </button>
        </header>

        <section className="mood-hero" aria-labelledby="mood-title">
          <div className="mood-hero-copy">
            <p className="mood-eyebrow">YOUR WEDDING, YOUR WAY</p>
            <h1 id="mood-title">Build your<br />moodboard</h1>
            <p className="mood-intro">Pick ideas you love.<br />Save them together.</p>
            <button className="mood-start-button" onClick={() => document.getElementById('mood-tool')?.scrollIntoView({ behavior: 'smooth' })}>
              Start with ideas <ArrowRight size={17} />
            </button>
          </div>

          <div className="mood-guide" aria-label="How to make a moodboard">
            <div className="mood-guide-heading"><Sparkles size={16} /><span>HOW TO MAKE YOUR BOARD</span></div>
            <div className="mood-guide-image">
              <Image src={ideas[activeStep === 0 ? 0 : activeStep === 1 ? 2 : 3].image} alt="Wedding moodboard example" fill priority sizes="(max-width: 760px) 90vw, 46vw" />
              <span className="mood-guide-caption">{guideSteps[activeStep].title}</span>
            </div>
            <div className="mood-guide-steps">
              {guideSteps.map((step, index) => (
                <div className={`mood-guide-step${activeStep === index ? ' is-active' : ''}`} key={step.title} aria-current={activeStep === index ? 'step' : undefined}>
                  <span className="mood-step-number">0{index + 1}</span>
                  <span className="mood-step-title">{step.title}</span>
                  <span className="mood-step-copy">{step.copy}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mood-tool" id="mood-tool" aria-labelledby="mood-tool-title">
          <div className="mood-tool-heading">
            <div>
              <p className="mood-eyebrow">START YOUR BOARD</p>
              <h2 id="mood-tool-title">Choose your ideas</h2>
              <p>Pick a few things<br className="mobile-break" /> you love.</p>
            </div>
            {mounted && items.length > 0 && <span className="mood-selection-count">{items.length} saved</span>}
          </div>

          <div className="mood-ideas-grid">
            {ideas.map((idea) => {
              const inCart = hasItem(idea.id)
              return (
                <article className="mood-idea" key={idea.id}>
                  <div className="mood-idea-image">
                    <Image src={idea.image} alt={idea.title} fill sizes="(max-width: 600px) 90vw, (max-width: 1000px) 44vw, 23vw" />
                  </div>
                  <div className="mood-idea-info">
                    <div><h3>{idea.title}</h3><p>{idea.note}</p></div>
                    <button className={`mood-add-button${inCart ? ' is-added' : ''}`} onClick={() => handleAddToCart(idea)} disabled={inCart} aria-label={inCart ? `${idea.title} added to cart` : `Add ${idea.title} to cart`}>
                      {inCart ? <><Check size={16} /><span>Added</span></> : <><span>Add to cart</span><ArrowRight size={16} /></>}
                    </button>
                  </div>
                </article>
              )
            })}
          </div>

          {mounted && items.length > 0 && (
            <div className="mood-actions">
              <div className="mood-actions-copy"><strong>{items.length} ideas picked</strong><span>Save your board or view your cart.</span></div>
              <div className="mood-actions-buttons">
                <button className="mood-save-button" onClick={saveMoodboard} disabled={savingBoard || boardSaved}>
                  {boardSaved ? 'Board saved' : savingBoard ? 'Saving…' : 'Save board'}
                </button>
                <button className="mood-view-cart" onClick={() => router.push('/couple/cart')}>View cart <ArrowRight size={16} /></button>
                {boardSaved && <button className="mood-hire-planner" onClick={() => router.push('/couple/request')}>Hire a planner <ArrowRight size={16} /></button>}
              </div>
              {saveError && <p className="mood-error" role="alert">{saveError}</p>}
            </div>
          )}
        </section>
      </div>

      <style jsx>{`
        .mood-page { min-height: 100svh; color: #E2B451; background: #1E4636; font-family: Manrope, Arial, sans-serif; }
        .mood-shell { width: min(100% - 48px, 1320px); margin: 0 auto; padding-bottom: 64px; }
        .mood-topbar { min-height: 72px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(226,180,81,.32); }
        .mood-wordmark { padding: 8px 0; border: 0; color: #E2B451; background: transparent; font: 700 25px/1 'Cormorant Garamond', Georgia, serif; letter-spacing: .035em; cursor: pointer; }
        .mood-cart-link { min-height: 42px; display: inline-flex; align-items: center; gap: 9px; padding: 0 14px; border: 1px solid rgba(226,180,81,.55); border-radius: 4px; color: #E2B451; background: transparent; font: 700 12px Manrope, sans-serif; cursor: pointer; transition: background .18s ease, color .18s ease; }
        .mood-cart-link:hover { color: #1E4636; background: #E2B451; }
        .mood-cart-link b { min-width: 20px; height: 20px; display: grid; place-items: center; border-radius: 50%; color: #1E4636; background: #E2B451; font-size: 10px; }
        .mood-hero { display: grid; grid-template-columns: .82fr 1.18fr; align-items: center; gap: clamp(34px, 7vw, 100px); padding: clamp(42px, 7vw, 90px) clamp(8px, 3vw, 42px) clamp(54px, 8vw, 100px); }
        .mood-eyebrow { margin: 0 0 16px; color: #F08A3C; font-size: 10px; font-weight: 800; letter-spacing: .18em; }
        .mood-hero h1 { margin: 0; color: #E2B451; font: 600 clamp(46px, 6.3vw, 78px)/.94 'Cormorant Garamond', Georgia, serif; letter-spacing: -.035em; }
        .mood-intro { margin: 21px 0 25px; color: #E2B451; font-size: clamp(15px, 1.6vw, 18px); line-height: 1.6; }
        .mood-start-button, .mood-view-cart { min-height: 48px; display: inline-flex; align-items: center; justify-content: center; gap: 13px; padding: 0 18px; border: 1px solid #F08A3C; border-radius: 4px; color: #1E4636; background: #F08A3C; font: 800 12px Manrope, sans-serif; cursor: pointer; transition: transform .18s ease, background .18s ease; }
        .mood-hire-planner { min-height: 48px; display: inline-flex; align-items: center; justify-content: center; gap: 13px; padding: 0 18px; border: 1px solid #E2B451; border-radius: 4px; color: #1E4636; background: #E2B451; font: 800 12px Manrope, sans-serif; cursor: pointer; transition: transform .18s ease, background .18s ease; }
        .mood-start-button:hover, .mood-view-cart:hover { background: #E2B451; transform: translateY(-2px); }
        .mood-guide { padding: 16px; border: 1px solid rgba(226,180,81,.62); border-radius: 8px; background: #3A2563; box-shadow: 13px 14px 0 rgba(58,37,99,.42); }
        .mood-guide-heading { min-height: 28px; display: flex; align-items: center; gap: 8px; margin: 0 2px 12px; color: #E2B451; font-size: 9px; font-weight: 800; letter-spacing: .15em; }
        .mood-guide-image { position: relative; aspect-ratio: 1.9; overflow: hidden; border: 1px solid rgba(226,180,81,.5); background: #1E4636; }
        .mood-guide-image :global(img) { object-fit: cover; transition: opacity .45s ease; }
        .mood-guide-caption { position: absolute; z-index: 1; right: 12px; bottom: 12px; padding: 8px 11px; color: #1E4636; background: #E2B451; font-size: 11px; font-weight: 800; }
        .mood-guide-steps { display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; padding-top: 14px; }
        .mood-guide-step { min-width: 0; display: grid; grid-template-columns: 25px 1fr; align-items: start; column-gap: 8px; padding: 8px 6px; border-top: 1px solid rgba(226,180,81,.26); opacity: .62; transition: opacity .35s ease, border-color .35s ease; }
        .mood-guide-step.is-active { border-color: #F08A3C; opacity: 1; }
        .mood-step-number { grid-row: span 2; color: #F08A3C; font: 600 17px 'Cormorant Garamond', Georgia, serif; }
        .mood-step-title { color: #E2B451; font-size: 10px; font-weight: 800; line-height: 1.35; }
        .mood-step-copy { grid-column: 2; margin-top: 3px; color: #E2B451; font-size: 9px; line-height: 1.5; }
        .mood-tool { padding: clamp(24px, 4vw, 46px); border: 1px solid rgba(226,180,81,.56); background: #1E4636; }
        .mood-tool-heading { display: flex; align-items: end; justify-content: space-between; gap: 20px; margin-bottom: 22px; }
        .mood-tool-heading .mood-eyebrow { margin-bottom: 8px; }
        .mood-tool-heading h2 { margin: 0; color: #E2B451; font: 600 clamp(30px, 4vw, 44px)/1 'Cormorant Garamond', Georgia, serif; }
        .mood-tool-heading p:not(.mood-eyebrow) { margin: 8px 0 0; color: rgba(226,180,81,.84); font-size: 12px; line-height: 1.55; }
        .mobile-break { display: none; }
        .mood-selection-count { padding: 8px 12px; border: 1px solid rgba(226,180,81,.5); color: #E2B451; font-size: 11px; font-weight: 800; }
        .mood-ideas-grid { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 14px; }
        .mood-idea { min-width: 0; border: 1px solid rgba(226,180,81,.48); background: #3A2563; }
        .mood-idea-image { position: relative; aspect-ratio: 1.15; overflow: hidden; background: #1E4636; }
        .mood-idea-image :global(img) { object-fit: cover; transition: transform .35s ease; }
        .mood-idea:hover .mood-idea-image :global(img) { transform: scale(1.035); }
        .mood-idea-info { display: grid; gap: 13px; padding: 14px; }
        .mood-idea-info h3 { margin: 0; color: #E2B451; font: 600 21px/1.1 'Cormorant Garamond', Georgia, serif; }
        .mood-idea-info p { margin: 5px 0 0; color: rgba(226,180,81,.84); font-size: 11px; line-height: 1.45; }
        .mood-add-button { min-height: 40px; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 0 11px; border: 1px solid #F08A3C; color: #1E4636; background: #F08A3C; font: 800 10px Manrope, sans-serif; cursor: pointer; transition: background .18s ease; }
        .mood-add-button:hover:not(:disabled) { background: #E2B451; }
        .mood-add-button.is-added { justify-content: center; border-color: #E2B451; color: #E2B451; background: #1E4636; cursor: default; }
        .mood-actions { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-top: 18px; padding: 16px 18px; border-left: 3px solid #F08A3C; background: #3A2563; }
        .mood-actions-copy { display: grid; gap: 4px; }
        .mood-actions-copy strong { color: #E2B451; font: 600 20px 'Cormorant Garamond', Georgia, serif; }
        .mood-actions-copy span { color: rgba(226,180,81,.84); font-size: 10px; }
        .mood-actions-buttons { display: flex; gap: 9px; }
        .mood-save-button { min-height: 44px; padding: 0 14px; border: 1px solid #E2B451; color: #E2B451; background: transparent; font: 800 10px Manrope, sans-serif; cursor: pointer; }
        .mood-save-button:hover:not(:disabled) { color: #1E4636; background: #E2B451; }
        .mood-save-button:disabled { opacity: .72; cursor: default; }
        .mood-view-cart { min-height: 44px; font-size: 10px; }
        .mood-error { position: absolute; right: 18px; bottom: -25px; margin: 0; color: #F08A3C; font-size: 11px; }
        .mood-page button:focus-visible { outline: 3px solid #E2B451; outline-offset: 3px; }
        @media (max-width: 900px) { .mood-hero { grid-template-columns: .8fr 1.2fr; gap: 28px; padding-inline: 0; } .mood-ideas-grid { grid-template-columns: repeat(2,minmax(0,1fr)); } }
        @media (max-width: 620px) { .mood-shell { width: min(100% - 28px, 520px); padding-bottom: 32px; } .mood-topbar { min-height: 62px; } .mood-wordmark { font-size: 22px; } .mood-cart-link { min-height: 39px; padding-inline: 10px; } .mood-hero { grid-template-columns: 1fr; gap: 28px; padding: 36px 0 42px; } .mood-hero h1 { font-size: clamp(46px, 13vw, 64px); } .mood-intro { margin: 14px 0 18px; font-size: 15px; } .mood-guide { padding: 11px; box-shadow: 7px 8px 0 rgba(58,37,99,.42); } .mood-guide-steps { gap: 4px; } .mood-guide-step { grid-template-columns: 19px 1fr; column-gap: 5px; padding-inline: 3px; } .mood-step-title { font-size: 9px; } .mood-step-copy { font-size: 8px; } .mood-tool { padding: 20px 14px; } .mood-tool-heading { align-items: start; margin-bottom: 17px; } .mood-tool-heading h2 { font-size: 32px; } .mobile-break { display: initial; } .mood-ideas-grid { grid-template-columns: 1fr; gap: 12px; } .mood-idea { display: grid; grid-template-columns: 42% 1fr; } .mood-idea-image { min-height: 150px; aspect-ratio: auto; } .mood-idea-info { align-content: center; padding: 12px; } .mood-idea-info h3 { font-size: 20px; } .mood-actions { align-items: stretch; flex-direction: column; gap: 13px; padding: 14px; } .mood-actions-buttons { display: grid; grid-template-columns: 1fr 1fr; } .mood-save-button, .mood-view-cart { min-width: 0; padding-inline: 9px; } .mood-error { position: static; } }
        @media (max-width: 360px) { .mood-idea { grid-template-columns: 38% 1fr; } .mood-idea-info h3 { font-size: 18px; } .mood-actions-buttons { grid-template-columns: 1fr; } }
        @media (prefers-reduced-motion: reduce) { .mood-page *, .mood-page *::before, .mood-page *::after { scroll-behavior: auto !important; transition-duration: .01ms !important; animation-duration: .01ms !important; animation-iteration-count: 1 !important; } }
      `}</style>
    </main>
  )
}
