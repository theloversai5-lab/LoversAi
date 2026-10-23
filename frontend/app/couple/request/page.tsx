'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, CalendarDays, Check, MapPin, UsersRound } from 'lucide-react'
import { useCoupleStore } from '@/lib/store/coupleStore'
import { supabase } from '@/lib/supabase/client'

type WeddingRequestInfo = { partnerNames: string; date: string; city: string; guests: string; budget: string; images: string[] }

const serviceOptions = ['Full planning', 'Part planning', 'Wedding day help', 'Wedding design']
const priorityOptions = ['Keep costs clear', 'Choose good vendors', 'Plan the day', 'Create the look', 'Less stress']
const stepTitles = ['What help do you need?', 'What matters most?', 'Add a short note', 'Check your request']

export default function RequestPlannerPage() {
  const router = useRouter()
  const weddingProfile = useCoupleStore((state) => state.weddingProfile)
  const [step, setStep] = useState(0)
  const [services, setServices] = useState<string[]>([])
  const [priorities, setPriorities] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [wedding, setWedding] = useState<WeddingRequestInfo | null>(null)
  const [hasMoodboard, setHasMoodboard] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [requestId, setRequestId] = useState('')

  useEffect(() => {
    let alive = true
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/auth?role=couple&next=%2Fcouple%2Frequest')
        return
      }
      const [{ data: profile, error: profileError }, { data: needs, error: needsError }, { data: boards, error: boardError }] = await Promise.all([
        supabase.from('profiles').select('id,role,city,display_name').eq('id', user.id).maybeSingle(),
        supabase.from('couple_requirements').select('partner_names,wedding_date,city,guest_count,budget_min,budget_max,services,priorities,notes').eq('profile_id', user.id).maybeSingle(),
        supabase.from('moodboards').select('id,title,style,image_urls').eq('profile_id', user.id).order('created_at', { ascending: false }).limit(1),
      ])
      if (!alive) return
      if (profileError || needsError || boardError) {
        setError('Wedding details could not load.')
        setLoading(false)
        return
      }
      if (!profile || profile.role !== 'couple') {
        router.replace(profile?.role ? `/${profile.role}` : '/')
        return
      }
      const board = boards?.[0]
      setHasMoodboard(Boolean(board))
      setWedding({
        partnerNames: needs?.partner_names || profile.display_name || weddingProfile?.partner1Name || 'Your wedding',
        date: needs?.wedding_date || weddingProfile?.weddingDate || '',
        city: needs?.city || profile.city || weddingProfile?.city || '',
        guests: String(needs?.guest_count || weddingProfile?.guestCount || ''),
        budget: needs?.budget_max ? `₹${Number(needs.budget_max).toLocaleString('en-IN')}` : weddingProfile?.budget ? `₹${weddingProfile.budget}` : '',
        images: board?.image_urls ?? [],
      })
      setServices(needs?.services ?? [])
      setPriorities(needs?.priorities ?? [])
      setNote(needs?.notes ?? '')
      setLoading(false)
    }
    void load().catch(() => { if (alive) { setError('Wedding details could not load.'); setLoading(false) } })
    return () => { alive = false }
  }, [router, weddingProfile])

  const toggle = (value: string, values: string[], update: (next: string[]) => void) => {
    update(values.includes(value) ? values.filter((item) => item !== value) : [...values, value])
  }

  async function sendRequest() {
    if (saving || !wedding || !services.length || !priorities.length) return
    setSaving(true)
    setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth?role=couple&next=%2Fcouple%2Frequest')
        return
      }
      const { data: existing, error: loadError } = await supabase.from('couple_requirements')
        .select('partner_names,initials,wedding_date,city,guest_count,budget_min,budget_max,services,priorities,notes,visible_to_pros')
        .eq('profile_id', user.id).maybeSingle()
      if (loadError) throw loadError
      const { error: requirementError } = await supabase.from('couple_requirements').upsert({
        ...(existing ?? {}),
        profile_id: user.id,
        partner_names: existing?.partner_names || wedding.partnerNames,
        wedding_date: existing?.wedding_date || weddingProfile?.weddingDate || null,
        city: existing?.city || wedding.city,
        guest_count: existing?.guest_count || Number(wedding.guests) || null,
        services,
        priorities,
        notes: note.trim(),
        visible_to_pros: true,
      })
      if (requirementError) throw requirementError
      const { data: board, error: boardError } = await supabase.from('moodboards')
        .select('id').eq('profile_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
      if (boardError) throw boardError
      if (!board) {
        setHasMoodboard(false)
        setError('Save your moodboard first.')
        return
      }
      const { data: request, error: requestError } = await supabase.from('planner_requests').insert({
        couple_profile_id: user.id,
        moodboard_id: board.id,
        services,
        priorities,
        notes: note.trim(),
        status: 'open',
      }).select('id').single()
      if (requestError) throw requestError
      setRequestId(request.id)
      setStep(4)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Your request did not send.')
    } finally {
      setSaving(false)
    }
  }

  const canContinue = step === 0 ? services.length > 0 : step === 1 ? priorities.length > 0 : true

  if (loading) return <main className="min-h-screen bg-[#1E4636] p-8 text-center text-[#E2B451]">Loading your wedding…</main>

  return (
    <main className="min-h-screen bg-[#1E4636] px-4 py-5 text-[#E2B451] sm:px-7 sm:py-8">
      <div className="mx-auto w-full max-w-4xl">
        <header className="mb-6 flex items-center justify-between border-b border-[#E2B451]/30 pb-4">
          <Link href="/couple" className="inline-flex min-h-10 items-center gap-2 text-sm font-bold text-[#E2B451]"><ArrowLeft size={17} /> Back</Link>
          {step < 4 && <span className="text-xs font-bold tracking-wide">STEP {step + 1} OF 4</span>}
        </header>

        {step === 4 ? (
          <section className="mx-auto max-w-2xl py-8 sm:py-16" aria-live="polite">
            <span className="mb-5 grid size-14 place-items-center rounded-full bg-[#E2B451] text-[#1E4636]"><Check size={26} /></span>
            <p className="mb-2 text-xs font-extrabold tracking-[.16em] text-[#F08A3C]">REQUEST SENT</p>
            <h1 className="font-[Cormorant_Garamond] text-5xl font-bold leading-none sm:text-6xl">Planners can now reply.</h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-[#E2B451]/85">Approved planners can review.</p>
            <p className="mt-4 text-xs text-[#E2B451]/70">Request ID · {requestId.slice(0, 8).toUpperCase()}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/couple/requests" className="inline-flex min-h-12 items-center gap-2 bg-[#F08A3C] px-5 font-bold text-[#1E4636]">Track request <ArrowRight size={17} /></Link>
              <Link href="/couple" className="inline-flex min-h-12 items-center border border-[#E2B451]/50 px-5 font-bold text-[#E2B451]">Back to wedding</Link>
            </div>
          </section>
        ) : !hasMoodboard ? (
          <section className="mx-auto max-w-2xl py-8 sm:py-14">
            <p className="mb-2 text-xs font-extrabold tracking-[.16em] text-[#F08A3C]">FIRST, SAVE YOUR IDEAS</p>
            <h1 className="font-[Cormorant_Garamond] text-5xl font-bold leading-none sm:text-6xl">Make a moodboard first.</h1>
            <p className="mt-4 text-sm leading-6 text-[#E2B451]/85">Planners use it to see your style.</p>
            <Link href="/couple/moodboard" className="mt-7 inline-flex min-h-12 items-center gap-2 bg-[#F08A3C] px-5 font-bold text-[#1E4636]">Open moodboard <ArrowRight size={17} /></Link>
          </section>
        ) : (
          <>
            <div className="mb-8 grid gap-6 md:grid-cols-[minmax(0,1fr)_240px] md:items-end">
              <div>
                <p className="mb-2 text-xs font-extrabold tracking-[.16em] text-[#F08A3C]">HIRE A PLANNER</p>
                <h1 className="font-[Cormorant_Garamond] text-5xl font-bold leading-[.95] sm:text-6xl">{stepTitles[step]}</h1>
                <p className="mt-3 text-sm leading-6 text-[#E2B451]/85">Help planners see your style.</p>
              </div>
              {wedding && <aside className="grid grid-cols-2 gap-3 border-l-2 border-[#E2B451] bg-[#3A2563] p-4 text-xs">
                <strong className="col-span-2 font-[Cormorant_Garamond] text-2xl">{wedding.partnerNames}</strong>
                <span className="inline-flex items-center gap-1"><CalendarDays size={14} />{wedding.date || 'Date open'}</span>
                <span className="inline-flex items-center gap-1"><MapPin size={14} />{wedding.city || 'City open'}</span>
                {wedding.guests && <span className="inline-flex items-center gap-1"><UsersRound size={14} />{wedding.guests} guests</span>}
                {wedding.budget && <span>{wedding.budget}</span>}
              </aside>}
            </div>

            <div className="mb-8 flex gap-2" aria-label="Request progress">{stepTitles.map((label, index) => <span key={label} className={`h-1.5 flex-1 ${index <= step ? 'bg-[#F08A3C]' : 'bg-[#3A2563]'}`} />)}</div>

            {step === 0 && <div className="grid gap-3 sm:grid-cols-2">{serviceOptions.map((item) => <button key={item} type="button" aria-pressed={services.includes(item)} onClick={() => toggle(item, services, setServices)} className={`flex min-h-20 items-center justify-between gap-4 border px-5 text-left font-bold transition ${services.includes(item) ? 'border-[#F08A3C] bg-[#3A2563]' : 'border-[#E2B451]/35 bg-[#1E4636] hover:bg-[#3A2563]'}`}><span>{item}</span><span className={`grid size-6 place-items-center border ${services.includes(item) ? 'border-[#F08A3C] bg-[#F08A3C] text-[#1E4636]' : 'border-[#E2B451]/50'}`}>{services.includes(item) && <Check size={15} />}</span></button>)}</div>}

            {step === 1 && <div className="grid gap-3 sm:grid-cols-2">{priorityOptions.map((item) => <button key={item} type="button" aria-pressed={priorities.includes(item)} onClick={() => toggle(item, priorities, setPriorities)} className={`flex min-h-16 items-center justify-between gap-4 border px-5 text-left font-bold transition ${priorities.includes(item) ? 'border-[#F08A3C] bg-[#3A2563]' : 'border-[#E2B451]/35 bg-[#1E4636] hover:bg-[#3A2563]'}`}><span>{item}</span><span className={`grid size-6 place-items-center border ${priorities.includes(item) ? 'border-[#F08A3C] bg-[#F08A3C] text-[#1E4636]' : 'border-[#E2B451]/50'}`}>{priorities.includes(item) && <Check size={15} />}</span></button>)}</div>}

            {step === 2 && <div className="max-w-2xl"><label htmlFor="planner-note" className="mb-2 block text-sm font-bold">A note for planners</label><textarea id="planner-note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={800} placeholder="Tell us what matters to you." className="min-h-40 w-full resize-y border border-[#E2B451]/40 bg-[#3A2563] p-4 text-sm text-[#E2B451] placeholder:text-[#E2B451]/55 focus:outline focus:outline-2 focus:outline-[#F08A3C]"/><p className="mt-2 text-right text-xs text-[#E2B451]/70">{note.length} / 800</p></div>}

            {step === 3 && <div className="grid gap-5 md:grid-cols-[1fr_260px]">
              <div className="space-y-5">
                <section className="border-l-2 border-[#F08A3C] bg-[#3A2563] p-5"><h2 className="font-[Cormorant_Garamond] text-2xl font-bold">Help you need</h2><p className="mt-2 text-sm leading-6">{services.join(' · ')}</p><button className="mt-3 text-xs font-bold text-[#F08A3C] underline" onClick={() => setStep(0)}>Change</button></section>
                <section className="border-l-2 border-[#E2B451] bg-[#3A2563] p-5"><h2 className="font-[Cormorant_Garamond] text-2xl font-bold">Your top needs</h2><p className="mt-2 text-sm leading-6">{priorities.join(' · ')}</p><button className="mt-3 text-xs font-bold text-[#F08A3C] underline" onClick={() => setStep(1)}>Change</button></section>
                {note.trim() && <section className="bg-[#3A2563] p-5"><h2 className="font-[Cormorant_Garamond] text-2xl font-bold">Your note</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{note}</p><button className="mt-3 text-xs font-bold text-[#F08A3C] underline" onClick={() => setStep(2)}>Change</button></section>}
              </div>
              <aside className="bg-[#3A2563] p-4"><p className="mb-3 text-xs font-bold">SAVED MOODBOARD</p><div className="grid grid-cols-2 gap-2">{wedding?.images.slice(0, 4).map((image, index) => <img key={`${image}-${index}`} src={image} alt={`Moodboard idea ${index + 1}`} className="aspect-square w-full object-cover" />)}</div><p className="mt-3 text-xs leading-5 text-[#E2B451]/80">Planners can see these ideas.</p></aside>
            </div>}

            {error && <p className="mt-5 text-sm font-bold text-[#F08A3C]" role="alert">{error}</p>}
            <footer className="mt-8 flex flex-wrap justify-between gap-3 border-t border-[#E2B451]/25 pt-5">
              <button type="button" onClick={() => step === 0 ? router.push('/couple/decide') : setStep(step - 1)} className="min-h-11 border border-[#E2B451]/45 px-4 text-sm font-bold">{step === 0 ? 'Back' : 'Previous'}</button>
              {step < 3 ? <button type="button" onClick={() => setStep(step + 1)} disabled={!canContinue} className="inline-flex min-h-11 items-center gap-2 bg-[#F08A3C] px-5 font-bold text-[#1E4636] disabled:cursor-not-allowed disabled:opacity-50">Continue <ArrowRight size={17} /></button> : <button type="button" onClick={() => void sendRequest()} disabled={saving} className="inline-flex min-h-11 items-center gap-2 bg-[#F08A3C] px-5 font-bold text-[#1E4636] disabled:cursor-wait disabled:opacity-60">{saving ? 'Sending…' : 'Send request'} <ArrowRight size={17} /></button>}
            </footer>
          </>
        )}
      </div>
    </main>
  )
}
