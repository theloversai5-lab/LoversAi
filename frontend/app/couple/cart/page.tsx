'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, ShoppingCart, Trash2 } from 'lucide-react'
import { useCartStore } from '@/lib/store/cartStore'

export default function CartPage() {
  const router = useRouter()
  const { items, removeItem } = useCartStore()

  return (
    <main className="saved-page">
      <div className="saved-shell">
        <header className="saved-topbar">
          <button className="saved-back" onClick={() => router.push('/couple/moodboard')}><ArrowLeft size={17} /> Back to ideas</button>
          <span className="saved-brand">A Lovers Card</span>
          <span className="saved-count"><ShoppingCart size={16} /> {items.length}</span>
        </header>

        <section className="saved-content">
          <p className="saved-eyebrow">YOUR WEDDING IDEAS</p>
          <h1>Your saved ideas</h1>
          <p className="saved-intro">Keep your favourite<br />ideas close.</p>

          {items.length === 0 ? (
            <div className="saved-empty">
              <p>Your cart is empty.</p>
              <button className="saved-primary" onClick={() => router.push('/couple/moodboard')}>Find ideas <ArrowRight size={17} /></button>
            </div>
          ) : (
            <>
              <div className="saved-grid">
                {items.map((item) => (
                  <article className="saved-card" key={item.id}>
                    <div className="saved-image">
                      <Image src={item.imageUrl} alt={item.theme} fill sizes="(max-width: 650px) 90vw, 30vw" />
                    </div>
                    <div className="saved-card-info">
                      <div><h2>{item.theme}</h2><p>{item.prompt}</p></div>
                      <button className="saved-remove" onClick={() => removeItem(item.id)} aria-label={`Remove ${item.theme}`}><Trash2 size={16} /><span>Remove</span></button>
                    </div>
                  </article>
                ))}
              </div>
              <div className="saved-actions">
                <p>{items.length} {items.length === 1 ? 'idea' : 'ideas'} in your cart</p>
                <button className="saved-primary" onClick={() => router.push('/couple/decide')}>Choose how to plan <ArrowRight size={17} /></button>
              </div>
            </>
          )}
        </section>
      </div>
      <style jsx>{`
        .saved-page { min-height: 100svh; color: #E2B451; background: #1E4636; font-family: Manrope, Arial, sans-serif; }
        .saved-shell { width: min(100% - 48px, 1180px); margin: 0 auto; }
        .saved-topbar { min-height: 72px; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; border-bottom: 1px solid rgba(226,180,81,.32); }
        .saved-back { justify-self: start; display: inline-flex; align-items: center; gap: 8px; padding: 8px 0; border: 0; color: #E2B451; background: transparent; font: 700 11px Manrope, sans-serif; cursor: pointer; }
        .saved-back:hover { color: #F08A3C; }
        .saved-brand { color: #E2B451; font: 700 23px 'Cormorant Garamond', Georgia, serif; letter-spacing: .035em; }
        .saved-count { justify-self: end; display: inline-flex; align-items: center; gap: 8px; padding: 8px 11px; border: 1px solid rgba(226,180,81,.5); font-size: 11px; font-weight: 800; }
        .saved-content { padding: clamp(38px, 6vw, 74px) 0; }
        .saved-eyebrow { margin: 0 0 10px; color: #F08A3C; font-size: 10px; font-weight: 800; letter-spacing: .17em; }
        h1 { margin: 0; color: #E2B451; font: 600 clamp(38px, 5vw, 58px)/1 'Cormorant Garamond', Georgia, serif; }
        .saved-intro { margin: 12px 0 30px; color: rgba(226,180,81,.86); font-size: 14px; line-height: 1.55; }
        .saved-grid { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 16px; }
        .saved-card { min-width: 0; border: 1px solid rgba(226,180,81,.45); background: #3A2563; }
        .saved-image { position: relative; aspect-ratio: 1.35; background: #1E4636; }
        .saved-image :global(img) { object-fit: cover; }
        .saved-card-info { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 13px; }
        .saved-card-info h2 { margin: 0; color: #E2B451; font: 600 21px/1.1 'Cormorant Garamond', Georgia, serif; }
        .saved-card-info p { margin: 4px 0 0; color: rgba(226,180,81,.82); font-size: 10px; line-height: 1.45; }
        .saved-remove { min-height: 38px; display: inline-flex; align-items: center; gap: 6px; padding: 0 8px; border: 1px solid rgba(226,180,81,.45); color: #E2B451; background: transparent; font: 700 10px Manrope, sans-serif; cursor: pointer; }
        .saved-remove:hover { border-color: #F08A3C; color: #F08A3C; }
        .saved-actions { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-top: 18px; padding: 16px 18px; border-left: 3px solid #F08A3C; background: #3A2563; }
        .saved-actions p { margin: 0; font: 600 20px 'Cormorant Garamond', Georgia, serif; }
        .saved-primary { min-height: 46px; display: inline-flex; align-items: center; justify-content: center; gap: 10px; padding: 0 16px; border: 1px solid #F08A3C; color: #1E4636; background: #F08A3C; font: 800 11px Manrope, sans-serif; cursor: pointer; transition: transform .18s ease, background .18s ease; }
        .saved-primary:hover { background: #E2B451; transform: translateY(-1px); }
        .saved-empty { display: grid; justify-items: start; gap: 14px; padding: 26px; border: 1px solid rgba(226,180,81,.45); background: #3A2563; }
        .saved-empty p { margin: 0; font: 600 24px 'Cormorant Garamond', Georgia, serif; }
        .saved-page button:focus-visible { outline: 3px solid #E2B451; outline-offset: 3px; }
        @media (max-width: 760px) { .saved-shell { width: min(100% - 28px, 600px); } .saved-topbar { min-height: 62px; } .saved-brand { font-size: 20px; } .saved-grid { grid-template-columns: repeat(2,minmax(0,1fr)); gap: 11px; } .saved-card-info { align-items: start; flex-direction: column; } .saved-remove { min-height: 36px; } }
        @media (max-width: 460px) { .saved-grid { grid-template-columns: 1fr; } .saved-card { display: grid; grid-template-columns: 43% 1fr; } .saved-image { min-height: 145px; aspect-ratio: auto; } .saved-card-info { justify-content: center; padding: 12px; } .saved-card-info h2 { font-size: 19px; } .saved-actions { align-items: stretch; flex-direction: column; } .saved-primary { width: 100%; } }
      `}</style>
    </main>
  )
}
