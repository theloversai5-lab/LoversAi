'use client'

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Check, ImagePlus, Plus, X } from 'lucide-react'
import { supabase, type UserRole } from '@/lib/supabase/client'
import { roleRedirectPath } from '@/lib/auth/redirect'

const roleOptions: UserRole[] = ['couple', 'planner', 'vendor']

function initialsFrom(value: string) {
  return value.trim().replace(/\s+and\s+/gi, ' & ').split('&').map((part) => part.trim()).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('')
}

function slugFrom(value: string) {
  return value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32) || 'my-profile'
}

export default function ProfileSetupPage() {
  const router = useRouter()
  const [userId, setUserId] = useState('')
  const [role, setRole] = useState<UserRole>('couple')
  const [step, setStep] = useState(0)
  const [displayName, setDisplayName] = useState('')
  const [partnerNames, setPartnerNames] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [city, setCity] = useState('')
  const [weddingDate, setWeddingDate] = useState('')
  const [guestCount, setGuestCount] = useState('')
  const [budgetMin, setBudgetMin] = useState('')
  const [budgetMax, setBudgetMax] = useState('')
  const [bio, setBio] = useState('')
  const [serviceText, setServiceText] = useState('')
  const [services, setServices] = useState<string[]>([])
  const [priorities, setPriorities] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/auth'); return }
      const { data: profile, error: profileError } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
      if (profileError || !profile) { if (active) { setError('Profile details could not load. Apply the database migration first.'); setLoading(false) } return }
      if (!active) return
      setUserId(user.id)
      setRole(roleOptions.includes(profile.role) ? profile.role : 'couple')
      setDisplayName(profile.display_name ?? '')
      setPartnerNames(profile.display_name ?? '')
      setCompanyName(profile.company_name ?? '')
      setCity(profile.city ?? '')
      setBio(profile.bio ?? '')
      if (profile.role === 'couple') {
        const { data: needs } = await supabase.from('couple_requirements').select('*').eq('profile_id', profile.id).maybeSingle()
        if (needs && active) {
          setWeddingDate(needs.wedding_date ?? '')
          setGuestCount(needs.guest_count?.toString() ?? '')
          setBudgetMin(needs.budget_min?.toString() ?? '')
          setBudgetMax(needs.budget_max?.toString() ?? '')
          setServices(needs.services ?? [])
          setPriorities(needs.priorities ?? [])
          setNotes(needs.notes ?? '')
        }
      } else {
        const { data: savedServices } = await supabase.from('profile_services').select('service_name').eq('profile_id', profile.id).order('display_order')
        if (savedServices && active) setServices(savedServices.map((item) => item.service_name))
      }
      const next = roleRedirectPath(profile.role, new URLSearchParams(window.location.search).get('next'))
      if (profile.is_complete) router.replace(next)
      setLoading(false)
    }
    void load()
    return () => { active = false }
  }, [router])

  const nameForProfile = role === 'couple' ? partnerNames : displayName
  const stepTitles = role === 'couple' ? ['Your names', 'Wedding needs', 'Review'] : ['Your business', 'Your services', 'Your portfolio']
  const initials = useMemo(() => initialsFrom(nameForProfile), [nameForProfile])

  function addService(event?: FormEvent) {
    event?.preventDefault()
    const value = serviceText.trim()
    if (!value || services.some((service) => service.toLowerCase() === value.toLowerCase())) return
    setServices((current) => [...current, value])
    setServiceText('')
  }

  function togglePriority(value: string) {
    setPriorities((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value])
  }

  function onFiles(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? [])
    const valid = selected.filter((file) => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) && file.size <= 8 * 1024 * 1024)
    if (valid.length !== selected.length) setError('Use JPG, PNG, or WebP. Each under 8 MB.')
    setFiles((current) => [...current, ...valid].slice(0, 12))
    event.target.value = ''
  }

  async function finish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (step === 0 && (!nameForProfile.trim() || (role !== 'couple' && !companyName.trim()))) {
      setError(role === 'couple' ? 'Add both names to continue.' : 'Add your name and company.')
      return
    }
    if (step === 1 && role === 'couple' && services.length === 0) {
      setError('Add one wedding need first.')
      return
    }
    if (step === 1 && role !== 'couple' && services.length === 0) {
      setError('Add one service first.')
      return
    }
    if (step < 2) { setError(''); setStep((current) => current + 1); return }
    setSaving(true)
    setError('')
    const name = nameForProfile.trim()
    if (!name) { setError('Add your name to continue.'); setSaving(false); setStep(0); return }
    const handle = `${slugFrom(name)}-${userId.replaceAll('-', '').slice(0, 6)}`
    const { data: profile, error: saveProfileError } = await supabase.from('profiles').update({
      display_name: name,
      initials,
      company_name: role === 'couple' ? '' : companyName.trim(),
      city: city.trim(),
      bio: bio.trim(),
      handle,
      is_public: false,
      is_complete: false,
    }).eq('id', userId).select('id').single()
    if (saveProfileError || !profile) { setError(saveProfileError?.message ?? 'Could not save your profile.'); setSaving(false); return }

    if (role === 'couple') {
      const { error: reqError } = await supabase.from('couple_requirements').upsert({
        profile_id: profile.id,
        partner_names: partnerNames.trim(),
        initials,
        wedding_date: weddingDate || null,
        city: city.trim(),
        guest_count: guestCount ? Number(guestCount) : null,
        budget_min: budgetMin ? Number(budgetMin) : null,
        budget_max: budgetMax ? Number(budgetMax) : null,
        services,
        priorities,
        notes: notes.trim(),
        visible_to_pros: true,
      })
      if (reqError) { setError(reqError.message); setSaving(false); return }
    } else {
      const { error: deleteError } = await supabase.from('profile_services').delete().eq('profile_id', profile.id)
      if (deleteError) { setError(deleteError.message); setSaving(false); return }
      if (services.length) {
        const { error: serviceError } = await supabase.from('profile_services').insert(services.map((service_name, display_order) => ({ profile_id: profile.id, service_name, display_order })))
        if (serviceError) { setError(serviceError.message); setSaving(false); return }
      }
      for (const [index, file] of files.entries()) {
        const path = `${userId}/${crypto.randomUUID()}.${file.name.split('.').pop()?.toLowerCase() ?? 'jpg'}`
        const { error: uploadError } = await supabase.storage.from('profile-media').upload(path, file, { contentType: file.type, upsert: false })
        if (uploadError) { setError(uploadError.message); setSaving(false); return }
        const { data: publicUrl } = supabase.storage.from('profile-media').getPublicUrl(path)
        const { error: portfolioError } = await supabase.from('profile_portfolio').insert({ profile_id: profile.id, image_url: publicUrl.publicUrl, alt_text: `${name} portfolio image ${index + 1}`, display_order: index })
        if (portfolioError) { setError(portfolioError.message); setSaving(false); return }
      }
    }
    const { error: publishError } = await supabase.from('profiles').update({ is_public: true, is_complete: true }).eq('id', userId)
    if (publishError) { setError(publishError.message); setSaving(false); return }
    setSaving(false)
    router.replace(roleRedirectPath(role, new URLSearchParams(window.location.search).get('next')))
  }

  if (loading) return <main className="profile-setup"><p>Loading your profile…</p></main>

  return (
    <main className="profile-setup">
      <section className="profile-setup-card">
        <Link href={`/${role}`} className="profile-setup-back"><ArrowLeft size={16} /> Back</Link>
        <p className="setup-eyebrow">YOUR PROFILE · {role.toUpperCase()}</p>
        <h1>Let people meet you.</h1>
        <p className="setup-intro">Add a few profile details.</p>
        <div className="setup-progress" aria-label={`Step ${step + 1} of 3`}><span style={{ width: `${((step + 1) / 3) * 100}%` }} /></div>
        <div className="setup-step-label"><span>STEP 0{step + 1}</span><strong>{stepTitles[step]}</strong></div>
        {error && <p className="setup-error" role="alert">{error}</p>}
        <form onSubmit={finish}>
          {step === 0 && <div className="setup-fields">
            {role === 'couple' ? <label>Both names<input value={partnerNames} onChange={(event) => { setPartnerNames(event.target.value); setDisplayName(event.target.value) }} placeholder="Maya and Arjun" required /></label> : <>
              <label>Your name<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Your name" required /></label>
              <label>Company name<input value={companyName} onChange={(event) => setCompanyName(event.target.value)} placeholder="Your company" required /></label>
              <label>What you do<input value={bio} onChange={(event) => setBio(event.target.value)} placeholder="A short introduction" /></label>
            </>}
            <label>City<input value={city} onChange={(event) => setCity(event.target.value)} placeholder="Your city" /></label>
            <div className="setup-avatar"><span>{initials || 'AC'}</span><p>Your name initials</p></div>
          </div>}

          {step === 1 && (role === 'couple' ? <div className="setup-fields">
            <label>Wedding date<input type="date" value={weddingDate} onChange={(event) => setWeddingDate(event.target.value)} /></label>
            <label>Guest count<input type="number" min="0" value={guestCount} onChange={(event) => setGuestCount(event.target.value)} placeholder="How many guests?" /></label>
            <div className="setup-two-fields"><label>Budget from<input type="number" min="0" value={budgetMin} onChange={(event) => setBudgetMin(event.target.value)} placeholder="₹" /></label><label>Budget to<input type="number" min="0" value={budgetMax} onChange={(event) => setBudgetMax(event.target.value)} placeholder="₹" /></label></div>
            <label>What do you need?<span className="setup-add-service"><input value={serviceText} onChange={(event) => setServiceText(event.target.value)} placeholder="Flowers, food, music…" /><button type="button" onClick={() => addService()} aria-label="Add need"><Plus size={18} /></button></span></label>
            <div className="setup-tags">{services.map((item) => <button type="button" key={item} onClick={() => setServices((current) => current.filter((service) => service !== item))}>{item}<X size={14} /></button>)}</div>
            <p className="setup-label">What matters most?</p>
            <div className="setup-tags">{['Stay on budget','Guest comfort','Beautiful photos','Easy planning','Unique style'].map((item) => <button className={priorities.includes(item) ? 'is-selected' : ''} type="button" key={item} onClick={() => togglePriority(item)}>{item}</button>)}</div>
            <label>Anything else?<textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Share your plans" rows={3} /></label>
          </div> : <div className="setup-fields">
            <label>List your services<span className="setup-add-service"><input value={serviceText} onChange={(event) => setServiceText(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addService() } }} placeholder="Planning, design, flowers…" /><button type="button" onClick={() => addService()} aria-label="Add service"><Plus size={18} /></button></span></label>
            <p className="setup-hint">Add each service separately.</p>
            <div className="setup-tags">{services.map((item) => <button type="button" key={item} onClick={() => setServices((current) => current.filter((service) => service !== item))}>{item}<X size={14} /></button>)}</div>
          </div>)}

          {step === 2 && (role === 'couple' ? <div className="setup-review">
            <div className="setup-avatar is-large"><span>{initials || 'AC'}</span></div>
            <h2>{partnerNames || 'Your names'}</h2>
            <p>{city || 'Add your city'}{weddingDate ? ` · ${weddingDate}` : ''}</p>
            <div className="setup-review-list"><strong>Your needs</strong><span>{services.length ? services.join(' · ') : 'Add services later'}</span><strong>For planners and vendors</strong><span>Your profile will show these details.</span></div>
          </div> : <div className="setup-fields">
            <div className="setup-upload"><ImagePlus size={28} /><strong>Show your best work</strong><span>Choose up to twelve images.</span><label htmlFor="portfolio">Choose images<input id="portfolio" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={onFiles} /></label></div>
            <p className="setup-hint">JPG, PNG, or WebP. Max 8 MB each.</p>
            {files.length > 0 && <div className="setup-file-list">{files.map((file) => <span key={`${file.name}-${file.size}`}>{file.name}<button type="button" onClick={() => setFiles((current) => current.filter((item) => item !== file))} aria-label={`Remove ${file.name}`}><X size={14} /></button></span>)}</div>}
          </div>)}

          <div className="setup-actions">{step > 0 && <button type="button" className="setup-previous" onClick={() => setStep((current) => current - 1)}>Back</button>}<button className="setup-continue" type="submit" disabled={saving}>{saving ? 'Saving…' : step === 2 ? 'Finish profile' : 'Continue'}{step === 2 && !saving ? <Check size={17} /> : <ArrowRight size={17} />}</button></div>
        </form>
      </section>
      <style jsx>{`
        .profile-setup { min-height: 100vh; display: grid; place-items: center; padding: 30px 18px; color: #E2B451; background: #1E4636; }
        .profile-setup-card { width: min(100%, 650px); padding: clamp(24px, 5vw, 48px); border: 1px solid rgba(226,180,81,.5); background: #3A2563; }
        .profile-setup-back { display: inline-flex; align-items: center; gap: 7px; margin-bottom: 30px; color: #E2B451; font: 700 12px Manrope, sans-serif; text-decoration: none; }
        .setup-eyebrow, .setup-step-label span { color: #F08A3C; font: 800 10px Manrope, sans-serif; letter-spacing: .15em; }
        .setup-eyebrow { margin: 0 0 10px; }
        h1 { margin: 0; font: 700 clamp(36px, 8vw, 54px)/.98 'Cormorant Garamond', Georgia, serif; }
        .setup-intro, .setup-review p { color: rgba(226,180,81,.84); font: 14px/1.5 Manrope, sans-serif; }
        .setup-progress { height: 3px; margin: 25px 0 19px; background: rgba(226,180,81,.22); }
        .setup-progress span { display: block; height: 100%; background: #F08A3C; transition: width .2s ease; }
        .setup-step-label { display: flex; flex-direction: column; gap: 5px; margin-bottom: 22px; }
        .setup-step-label strong { font: 700 25px 'Cormorant Garamond', Georgia, serif; }
        .setup-fields { display: grid; gap: 15px; }
        .setup-fields label { display: grid; gap: 7px; color: #E2B451; font: 700 12px Manrope, sans-serif; }
        .setup-fields input, .setup-fields textarea { width: 100%; min-height: 46px; padding: 11px 13px; border: 1px solid rgba(226,180,81,.46); color: #E2B451; background: #1E4636; outline: 0; font: 13px Manrope, sans-serif; }
        .setup-fields input::placeholder, .setup-fields textarea::placeholder { color: rgba(226,180,81,.56); }
        .setup-fields input:focus-visible, .setup-fields textarea:focus-visible, button:focus-visible, a:focus-visible, .setup-upload label:focus-within { outline: 3px solid #F08A3C; outline-offset: 3px; }
        .setup-two-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .setup-add-service { display: flex; }
        .setup-add-service button { width: 48px; flex: 0 0 48px; border: 0; color: #1E4636; background: #E2B451; cursor: pointer; }
        .setup-tags { display: flex; flex-wrap: wrap; gap: 8px; }
        .setup-tags button, .setup-file-list > span { display: inline-flex; align-items: center; gap: 7px; padding: 8px 10px; border: 1px solid rgba(226,180,81,.45); color: #E2B451; background: #1E4636; font: 600 11px Manrope, sans-serif; cursor: pointer; }
        .setup-tags button.is-selected { color: #1E4636; background: #E2B451; }
        .setup-label { margin: 0; color: #E2B451; font: 700 12px Manrope, sans-serif; }
        .setup-hint { margin: -8px 0 0; color: rgba(226,180,81,.78); font: 11px Manrope, sans-serif; }
        .setup-avatar { display: flex; align-items: center; gap: 11px; margin-top: 5px; }
        .setup-avatar span { width: 42px; height: 42px; display: grid; place-items: center; border-radius: 50%; color: #1E4636; background: #E2B451; font: 800 13px Manrope, sans-serif; }
        .setup-avatar p { color: #E2B451; font: 12px Manrope, sans-serif; }
        .setup-review { padding: 24px; border: 1px solid rgba(226,180,81,.35); background: #1E4636; }
        .setup-avatar.is-large { justify-content: center; }
        .setup-avatar.is-large span { width: 68px; height: 68px; font-size: 20px; }
        .setup-review h2 { margin: 15px 0 0; text-align: center; font: 700 34px 'Cormorant Garamond', Georgia, serif; }
        .setup-review > p { margin: 5px 0 20px; text-align: center; }
        .setup-review-list { display: grid; gap: 9px; padding-top: 16px; border-top: 1px solid rgba(226,180,81,.3); font: 12px/1.5 Manrope, sans-serif; }
        .setup-review-list span { margin-bottom: 10px; color: rgba(226,180,81,.82); overflow-wrap: anywhere; }
        .setup-upload { min-height: 220px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; border: 1px dashed rgba(226,180,81,.55); color: #E2B451; background: #1E4636; text-align: center; }
        .setup-upload > span { color: rgba(226,180,81,.8); font: 12px Manrope, sans-serif; }
        .setup-upload label { position: relative; padding: 10px 14px; color: #1E4636; background: #F08A3C; font: 800 11px Manrope, sans-serif; cursor: pointer; }
        .setup-upload input { position: absolute; width: 1px; height: 1px; min-height: 1px; opacity: 0; }
        .setup-file-list { display: flex; flex-direction: column; gap: 6px; }
        .setup-file-list > span { justify-content: space-between; overflow-wrap: anywhere; }
        .setup-file-list button { border: 0; color: #E2B451; background: transparent; cursor: pointer; }
        .setup-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 25px; }
        .setup-actions button { min-height: 46px; display: inline-flex; align-items: center; justify-content: center; gap: 10px; padding: 0 16px; font: 800 12px Manrope, sans-serif; cursor: pointer; }
        .setup-previous { border: 1px solid rgba(226,180,81,.5); color: #E2B451; background: transparent; }
        .setup-continue { border: 0; color: #1E4636; background: #F08A3C; }
        .setup-continue:disabled { opacity: .7; cursor: wait; }
        .setup-error { color: #F08A3C; font: 12px/1.5 Manrope, sans-serif; }
        @media (max-width: 460px) { .setup-two-fields { grid-template-columns: 1fr; } }
      `}</style>
    </main>
  )
}
