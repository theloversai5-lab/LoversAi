'use client'

import { useState, useMemo, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Search,
  Calendar,
  MapPin,
  Users,
  IndianRupee,
  CheckCircle2,
  X,
  Layers,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  MessageCircle,
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

// Leads load from couple requests in Supabase.
interface WeddingLead {
  id: string
  status: 'open' | 'viewed'
  profileId: string
  profileHandle: string
  couple: string
  title: string
  date: string
  dateRaw: string // YYYY-MM-DD for filtering
  city: string
  budgetDisplay: string
  budgetRaw: number // in Lakhs
  budgetTotal: number // in rupees
  guests: number
  venueStyle: string
  hasMoodboard: boolean
  coverImage: string
  moodboardImages: string[]
  needs: string[]
  note: string
}

export default function LeadsPage() {
  const router = useRouter()
  const [leads, setLeads] = useState<WeddingLead[]>([])
  const [loadingLeads, setLoadingLeads] = useState(true)
  const [leadLoadError, setLeadLoadError] = useState('')
  const [approvalPending, setApprovalPending] = useState(false)
  const [professionalRole, setProfessionalRole] = useState<'planner' | 'vendor'>('planner')
  const [roleReady, setRoleReady] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchDraft, setSearchDraft] = useState('')
  const [selectedBudget, setSelectedBudget] = useState('all')
  const [selectedDateRange, setSelectedDateRange] = useState('all')
  const [selectedStyle, setSelectedStyle] = useState('all')

  // A mock unlock is saved in this browser until payment is integrated.
  const [unlockedLeadIds, setUnlockedLeadIds] = useState<string[]>([])
  const [pendingLead, setPendingLead] = useState<WeddingLead | null>(null)
  const [unlockError, setUnlockError] = useState('')
  const [activeLead, setActiveLead] = useState<WeddingLead | null>(null)
  const [openingConversation, setOpeningConversation] = useState(false)

  useEffect(() => {
    try {
      window.localStorage.removeItem('alc-mock-unlocked-leads')
      const stored: unknown = JSON.parse(window.localStorage.getItem('alc-live-lead-unlocks') || '[]')
      setUnlockedLeadIds(Array.isArray(stored) && stored.every((item) => typeof item === 'string') ? stored : [])
    } catch {
      setUnlockedLeadIds([])
    }
  }, [])

  useEffect(() => {
    const requestedRole = new URLSearchParams(window.location.search).get('role')
    if (requestedRole === 'vendor') setProfessionalRole('vendor')
    setRoleReady(true)
  }, [])

  useEffect(() => {
    let active = true
    async function loadLeads() {
      if (!roleReady) return
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        const next = professionalRole === 'vendor' ? '/planner/leads?role=vendor' : '/planner/leads'
        window.location.href = `/auth?role=${professionalRole}&mode=signin&next=${encodeURIComponent(next)}`
        return
      }
      const { data: ownProfile, error: ownProfileError } = await supabase.from('profiles').select('role,is_approved,is_demo').eq('id', user.id).maybeSingle()
      if (ownProfileError) throw ownProfileError
      if (ownProfile?.role !== professionalRole) {
        window.location.href = `/${ownProfile?.role ?? professionalRole}`
        return
      }
      if (!ownProfile.is_approved && !ownProfile.is_demo) {
        if (active) setApprovalPending(true)
      }
      const { data: requests, error: requestError } = await supabase
        .from('planner_requests')
        .select('id,couple_profile_id,moodboard_id,services,priorities,notes,status,created_at')
        .in('status', ['open', 'viewed'])
        .not('moodboard_id', 'is', null)
        .order('created_at', { ascending: false })
      if (requestError) throw requestError
      if (!requests?.length) { if (active) setLoadingLeads(false); return }
      const ids = [...new Set(requests.map((request) => request.couple_profile_id))]
      const moodboardIds = [...new Set(requests.map((request) => request.moodboard_id).filter((id): id is string => Boolean(id)))]
      const [{ data: profiles, error: profileError }, { data: requirements, error: requirementsError }, { data: boards, error: boardsError }] = await Promise.all([
        supabase.from('profiles').select('id,handle,display_name,initials,city,role,is_demo,is_public,is_complete').in('id', ids),
        supabase.from('couple_requirements').select('profile_id,partner_names,wedding_date,city,guest_count,budget_min,budget_max').in('profile_id', ids),
        supabase.from('moodboards').select('id,profile_id,title,event_type,style,summary,image_urls').in('id', moodboardIds),
      ])
      if (profileError) throw profileError
      if (requirementsError) throw requirementsError
      if (boardsError) throw boardsError
      if (active) {
        const visibleRequests = requests.filter((request) => {
          const profile = profiles?.find((item) => item.id === request.couple_profile_id)
          const board = boards?.find((item) => item.id === request.moodboard_id && item.profile_id === request.couple_profile_id)
          return Boolean(profile && profile.role === 'couple' && (profile.is_demo || (profile.is_public && profile.is_complete)) && board)
        })
        const rows: WeddingLead[] = visibleRequests.map((request) => {
          const profile = profiles?.find((item) => item.id === request.couple_profile_id)
          const requirement = requirements?.find((item) => item.profile_id === request.couple_profile_id)
          const board = boards?.find((item) => item.id === request.moodboard_id && item.profile_id === request.couple_profile_id)
          const dateRaw = requirement?.wedding_date ?? ''
          const low = Number(requirement?.budget_min ?? 0)
          const high = Number(requirement?.budget_max ?? 0)
          return {
            id: request.id,
            status: request.status === 'viewed' ? 'viewed' : 'open',
            profileId: request.couple_profile_id,
            profileHandle: profile?.handle ?? '',
            couple: requirement?.partner_names || profile?.display_name || 'Name not shared',
            title: board?.title || board?.event_type || 'Wedding plans',
            date: dateRaw ? new Date(`${dateRaw}T00:00:00`).toLocaleDateString('en', { month: 'short', day: '2-digit', year: 'numeric' }) : 'Date not set',
            dateRaw,
            city: requirement?.city || profile?.city || 'City not set',
            budgetDisplay: high ? `₹${(low / 100000).toFixed(0)}–₹${(high / 100000).toFixed(0)} lakh` : 'Budget not set',
            budgetRaw: high / 100000,
            budgetTotal: high || low,
            guests: Number(requirement?.guest_count ?? 0),
            venueStyle: board?.style || 'Style not set',
            hasMoodboard: Boolean(board),
            coverImage: board?.image_urls?.[0] || '',
            moodboardImages: board?.image_urls ?? [],
            needs: request.services ?? [],
            note: request.notes || board?.summary || (request.priorities ?? []).join(' · '),
          }
        })
        setLeads(rows)
        setLoadingLeads(false)
      }
    }
    void loadLeads().catch((error: unknown) => {
      if (!active) return
      setLeadLoadError(error instanceof Error ? error.message : 'Could not load leads.')
      setLoadingLeads(false)
    })
    return () => { active = false }
  }, [professionalRole, roleReady])

  useEffect(() => {
    if (!activeLead || activeLead.status !== 'open') return
    let active = true
    async function markRequestViewed() {
      const { error } = await supabase.from('planner_requests')
        .update({ status: 'viewed' })
        .eq('id', activeLead!.id)
        .eq('status', 'open')
      if (error || !active) return
      setLeads((current) => current.map((item) => item.id === activeLead!.id ? { ...item, status: 'viewed' } : item))
      setActiveLead((current) => current?.id === activeLead!.id ? { ...current, status: 'viewed' } : current)
    }
    void markRequestViewed()
    return () => { active = false }
  }, [activeLead])

  useEffect(() => {
    if (!activeLead || activeLead.status !== 'open') return
    let active = true
    async function markAsViewed() {
      const { error } = await supabase.from('planner_requests')
        .update({ status: 'viewed' })
        .eq('id', activeLead!.id)
        .eq('status', 'open')
      if (error || !active) return
      setLeads((current) => current.map((item) => item.id === activeLead!.id ? { ...item, status: 'viewed' } : item))
      setActiveLead((current) => current?.id === activeLead!.id ? { ...current, status: 'viewed' } : current)
    }
    void markAsViewed()
    return () => { active = false }
  }, [activeLead])

  // Filter leads dynamically
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // Search term filter (couple name, city, title)
      const q = searchTerm.toLowerCase().trim()
      if (
        q &&
        !lead.couple.toLowerCase().includes(q) &&
        !lead.city.toLowerCase().includes(q) &&
        !lead.title.toLowerCase().includes(q)
      ) {
        return false
      }

      // Budget filter (in Lakhs)
      if (selectedBudget === 'under25' && lead.budgetRaw >= 25) return false
      if (selectedBudget === '25to40' && (lead.budgetRaw < 25 || lead.budgetRaw > 40)) return false
      if (selectedBudget === 'above40' && lead.budgetRaw <= 40) return false

      // Date range filter
      if (selectedDateRange === '2026' && !lead.dateRaw.startsWith('2026')) return false
      if (selectedDateRange === 'early2027' && !lead.dateRaw.startsWith('2027-01') && !lead.dateRaw.startsWith('2027-02')) return false
      if (selectedDateRange === 'spring2027' && !lead.dateRaw.startsWith('2027-03')) return false

      // Style filter
      if (selectedStyle !== 'all' && lead.venueStyle !== selectedStyle) return false

      return true
    })
  }, [leads, searchTerm, selectedBudget, selectedDateRange, selectedStyle])

  const unlockFee = (lead: WeddingLead) => lead.budgetTotal * 0.0001

  const handleSelectLead = (lead: WeddingLead) => {
    setUnlockError('')
    if (unlockedLeadIds.includes(lead.id)) setActiveLead(lead)
    else setPendingLead(lead)
  }

  const handleMockPayment = () => {
    if (!pendingLead) return
    const next = [...new Set([...unlockedLeadIds, pendingLead.id])]
    setUnlockedLeadIds(next)
    window.localStorage.setItem('alc-live-lead-unlocks', JSON.stringify(next))
    setActiveLead(pendingLead)
    setPendingLead(null)
    setUnlockError('')
  }

  const handleMessageCouple = async (lead: WeddingLead) => {
    if (openingConversation) return
    setOpeningConversation(true)
    setUnlockError('')
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      if (!user) {
        const next = professionalRole === 'vendor' ? '/planner/leads?role=vendor' : '/planner/leads'
        router.push(`/auth?role=${professionalRole}&mode=signin&next=${encodeURIComponent(next)}`)
        return
      }
      const { data: ownProfile, error: profileError } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
      if (profileError) throw profileError
      if (ownProfile?.role !== professionalRole) {
        setUnlockError(`Sign in as a ${professionalRole} to message.`)
        return
      }
      const { data: existing, error: lookupError } = await supabase
        .from('conversations').select('id')
        .eq('couple_profile_id', lead.profileId)
        .eq('professional_profile_id', user.id)
        .maybeSingle()
      if (lookupError) throw lookupError
      const { data: conversation, error } = existing
        ? { data: existing, error: null }
        : await supabase.from('conversations')
          .insert({ couple_profile_id: lead.profileId, professional_profile_id: user.id })
          .select('id').single()
      if (error) throw error
      if (!conversation) throw new Error('Could not open this chat. Try again.')
      router.push(`/${professionalRole}/messages?conversation=${encodeURIComponent(conversation.id)}`)
    } catch (error) {
      setUnlockError(error instanceof Error ? error.message : 'Could not open this chat.')
    } finally {
      setOpeningConversation(false)
    }
  }

  const handleResetFilters = () => {
    setSearchTerm('')
    setSearchDraft('')
    setSelectedBudget('all')
    setSelectedDateRange('all')
    setSelectedStyle('all')
  }

  const activeFilterChips = [
    ...(searchTerm ? [{ label: `Search: ${searchTerm}`, clear: () => { setSearchTerm(''); setSearchDraft('') } }] : []),
    ...(selectedBudget !== 'all' ? [{ label: selectedBudget === 'under25' ? 'Under ₹25 Lakhs' : selectedBudget === '25to40' ? '₹25L – ₹40 Lakhs' : 'Above ₹40 Lakhs', clear: () => setSelectedBudget('all') }] : []),
    ...(selectedDateRange !== 'all' ? [{ label: selectedDateRange === '2026' ? 'Late 2026' : selectedDateRange === 'early2027' ? 'Early 2027' : 'Spring 2027', clear: () => setSelectedDateRange('all') }] : []),
    ...(selectedStyle !== 'all' ? [{ label: selectedStyle, clear: () => setSelectedStyle('all') }] : []),
  ]

  return (
    <main className="leads-page-wrap">
      {/* Top Navigation */}
      <header className="leads-header">
        <div className="leads-header-inner">
          <div className="leads-brand">
            <Link href="/" className="leads-back-btn"><ArrowLeft size={15} /><span>Back</span></Link>
            <span className="brand-mark">♜</span>
            <span className="leads-brand-text">
              <strong>A LOVERS CARD</strong>
              <small>{professionalRole === 'vendor' ? 'VENDOR TOOLS' : 'PLANNER TOOLS'}</small>
            </span>
          </div>

          <nav className="leads-nav" aria-label="Page sections">
            <a href="#lead-filters">Filters</a>
            <a href="#available-weddings">Couples</a>
          </nav>

          <div className="leads-status-pill">
            <span className="status-dot" />
            <span>Lead search</span>
          </div>
        </div>
      </header>

      {/* Hero Banner with Title & Explanation Subline */}
      <section className="leads-hero">
        <div className="leads-hero-inner">
          <h1 className="leads-title">Find leads</h1>

          {/* Subline clearly explaining what leads are to non-technical planners/vendors */}
          <p className="leads-subline">
            Find couples ready to plan.
          </p>
        </div>
      </section>

      {/* Search and Filters Section */}
      <section className="leads-controls-section" id="lead-filters">
        <div className="leads-controls-card">
          {/* Search bar */}
          <form className="leads-search-box" onSubmit={(event) => { event.preventDefault(); setSearchTerm(searchDraft.trim()) }}>
            <Search size={18} className="search-icon" />
            <input
              type="text"
              aria-label="Search couples"
              placeholder="Search names, places, styles"
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              className="leads-search-input"
            />
            {searchDraft && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => { setSearchTerm(''); setSearchDraft('') }}
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            )}
            <button className="leads-search-submit" type="submit"><Search size={16} /><span>Search</span></button>
          </form>

          {/* Filter options row */}
          <div className="leads-filter-row">
            {/* Budget filter */}
            <div className="filter-group">
              <label htmlFor="budget-filter">
                <IndianRupee size={12} /> Budget
              </label>
              <div className="select-wrap">
                <select
                  id="budget-filter"
                  value={selectedBudget}
                  onChange={(e) => setSelectedBudget(e.target.value)}
                  className="leads-select"
                >
                  <option value="all">All budgets</option>
                  <option value="under25">Under ₹25 Lakhs</option>
                  <option value="25to40">₹25L – ₹40 Lakhs</option>
                  <option value="above40">Above ₹40 Lakhs</option>
                </select>
                <ChevronDown size={14} className="select-arrow" />
              </div>
            </div>

            {/* Date filter */}
            <div className="filter-group">
              <label htmlFor="date-filter">
                <Calendar size={12} /> Wedding Date
              </label>
              <div className="select-wrap">
                <select
                  id="date-filter"
                  value={selectedDateRange}
                  onChange={(e) => setSelectedDateRange(e.target.value)}
                  className="leads-select"
                >
                  <option value="all">All dates</option>
                  <option value="2026">Late 2026 (Nov - Dec)</option>
                  <option value="early2027">Early 2027 (Jan - Feb)</option>
                  <option value="spring2027">Spring 2027 (March)</option>
                </select>
                <ChevronDown size={14} className="select-arrow" />
              </div>
            </div>

            {/* Style filter */}
            <div className="filter-group">
              <label htmlFor="style-filter">
                <Layers size={12} /> Venue Style
              </label>
              <div className="select-wrap">
                <select
                  id="style-filter"
                  value={selectedStyle}
                  onChange={(e) => setSelectedStyle(e.target.value)}
                  className="leads-select"
                >
                  <option value="all">All styles</option>
                  <option value="Open Lawn">Open Lawn Mandap</option>
                  <option value="Heritage Palace">Heritage Palace</option>
                  <option value="Garden Meadow">Garden Meadow</option>
                </select>
                <ChevronDown size={14} className="select-arrow" />
              </div>
            </div>

            {/* Reset button */}
            {(searchTerm || selectedBudget !== 'all' || selectedDateRange !== 'all' || selectedStyle !== 'all') && (
              <button
                type="button"
                className="reset-filters-btn"
                onClick={handleResetFilters}
              >
                Reset filters
              </button>
            )}
          </div>
          {activeFilterChips.length > 0 && <div className="leads-filter-chips" aria-label="Active filters">{activeFilterChips.map((chip) => <button type="button" key={chip.label} onClick={chip.clear}>{chip.label}<X size={13} aria-hidden="true" /></button>)}<button type="button" className="leads-clear-filters" onClick={handleResetFilters}>Clear all</button></div>}
        </div>
      </section>

      {/* Leads list */}
      <section className="leads-list-section" id="available-weddings">
        <div className="leads-count-header">
          <h2>Available weddings ({filteredLeads.length})</h2>
        </div>
        {approvalPending && <p className="leads-approval-note">Your profile is being reviewed.</p>}

        {loadingLeads ? <div className="leads-empty-state"><h3>Finding open weddings…</h3></div> : leadLoadError ? (
          <div className="leads-empty-state"><h3>Leads did not load.</h3><p>{leadLoadError}</p></div>
        ) : filteredLeads.length === 0 ? (
          <div className="leads-empty-state">
            <span className="empty-icon">♜</span>
            <h3>No open requests yet</h3>
            <p>New couple requests appear here.</p>
            <button
              type="button"
              className="button button-small"
              onClick={handleResetFilters}
            >
              Reset all filters
            </button>
          </div>
        ) : (
          <div className="leads-rows" role="table" aria-label="Wedding leads">
            <div className="leads-row leads-row-heading" role="row">
              <span role="columnheader">Name</span>
              <span role="columnheader">Expected budget</span>
            </div>
            {filteredLeads.map((lead) => (
              <button key={lead.id} type="button" className="leads-row leads-row-item" role="row" onClick={() => handleSelectLead(lead)}>
                <span role="cell">{lead.couple}</span>
                <span role="cell">{lead.budgetDisplay}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {pendingLead && (
        <div className="lead-unlock-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPendingLead(null) }}>
          <section className="lead-unlock-card" role="dialog" aria-modal="true" aria-labelledby="lead-unlock-title">
            <button type="button" className="lead-unlock-close" aria-label="Close" onClick={() => setPendingLead(null)}><X size={20} /></button>
            <p className="lead-unlock-eyebrow">Unlock this lead</p>
            <h2 id="lead-unlock-title">{pendingLead.couple}</h2>
            <p className="lead-unlock-budget">Expected budget <strong>{pendingLead.budgetDisplay}</strong></p>
            <div className="lead-unlock-fee"><span>Unlock fee</span><strong>{pendingLead.budgetTotal ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(unlockFee(pendingLead)) : 'Not available'}</strong></div>
            <p className="lead-unlock-note">Fee is 0.01% of budget.</p>
            <p className="lead-unlock-note">Mock payment. No charge.</p>
            {unlockError && <p className="lead-unlock-error" role="alert">{unlockError}</p>}
            <button type="button" className="lead-unlock-pay" disabled={!pendingLead.budgetTotal} onClick={handleMockPayment}>Pay and unlock</button>
            <button type="button" className="lead-unlock-cancel" onClick={() => setPendingLead(null)}>Go back</button>
          </section>
        </div>
      )}

      {/* Full-Screen Lead Detail View */}
      {activeLead && (
        <div className="lead-detail-fullscreen">
          {/* Back Navigation */}
          <button
            className="detail-back-btn"
            onClick={() => setActiveLead(null)}
            type="button"
          >
            <ArrowLeft size={18} />
            <span>Back to all leads</span>
          </button>

          {/* Couple and moodboard heading */}
          <div className="detail-hero-section">
            <div className="detail-hero-content">
              <div className="detail-hero-copy">
                <p className="detail-eyebrow">Couple’s wedding</p>
              <h1 className="detail-couple-name">{activeLead.couple}</h1>
              <h2 className="detail-wedding-title">{activeLead.title}</h2>
                <span className="detail-venue-style">{activeLead.venueStyle}</span>
              </div>
              {activeLead.profileHandle && <Link className="view-lead-btn" href={`/profile/${activeLead.profileHandle}`}>View couple profile <ArrowRight size={15} /></Link>}
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="detail-content-wrapper">
            <div className="detail-main-content">
              {/* The saved moodboard is the first thing planners can review. */}
              <section className="detail-section detail-moodboard-section">
                <div className="detail-moodboard-heading">
                  <div><p className="detail-eyebrow">Their saved ideas</p><h3 className="detail-section-title">Wedding moodboard</h3></div>
                  <span>{activeLead.moodboardImages.length} ideas</span>
                </div>
                {activeLead.moodboardImages.length > 0 ? <div className="detail-layers-grid">
                  {activeLead.moodboardImages.map((imageUrl, idx) => (
                    <figure key={`${imageUrl}-${idx}`} className="detail-layer-card">
                      <div className="detail-layer-image"><Image src={imageUrl} alt={`${activeLead.couple} moodboard idea ${idx + 1}`} fill sizes="(max-width: 700px) 80vw, 360px" unoptimized /></div>
                      <figcaption className="layer-number">Idea {idx + 1}</figcaption>
                    </figure>
                  ))}
                </div> : <p className="detail-moodboard-empty">This couple has not saved images yet.</p>}
              </section>
              {/* Key Specifications */}
              <section className="detail-section">
                <h3 className="detail-section-title">Wedding details</h3>
                <div className="detail-specs-grid">
                  <div className="detail-spec-card">
                    <Calendar size={20} className="spec-icon" />
                    <div className="spec-info">
                      <small>Wedding Date</small>
                      <strong>{activeLead.date}</strong>
                    </div>
                  </div>
                  <div className="detail-spec-card">
                    <MapPin size={20} className="spec-icon" />
                    <div className="spec-info">
                      <small>Location</small>
                      <strong>{activeLead.city}</strong>
                    </div>
                  </div>
                  <div className="detail-spec-card">
                    <IndianRupee size={20} className="spec-icon" />
                    <div className="spec-info">
                      <small>Estimated Budget</small>
                      <strong className="cost-accent">{activeLead.budgetDisplay}</strong>
                    </div>
                  </div>
                  <div className="detail-spec-card">
                    <Users size={20} className="spec-icon" />
                    <div className="spec-info">
                      <small>Expected Guests</small>
                      <strong>{activeLead.guests} Guests</strong>
                    </div>
                  </div>
                </div>
              </section>

              {/* Couple's Request */}
              <section className="detail-section">
                <h3 className="detail-section-title">What the couple wants</h3>
                <div className="detail-quote-box">
                  <p className="detail-quote-text">&ldquo;{activeLead.note}&rdquo;</p>
                </div>
              </section>

              {/* Services Needed */}
              <section className="detail-section">
                <h3 className="detail-section-title">Services needed</h3>
                <div className="detail-needs-grid">
                  {activeLead.needs.map((need) => (
                    <div key={need} className="detail-need-pill">
                      <CheckCircle2 size={14} />
                      <span>{need}</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* Sidebar - Message Action */}
            <aside className="detail-sidebar">
              <div className="detail-action-card">
                <h3 className="action-card-title">Want to talk?</h3>
                <p className="action-card-subtitle">Message this couple.</p>
                <button type="button" className="detail-message-btn" disabled={openingConversation} onClick={() => void handleMessageCouple(activeLead)}>
                  <span className="btn-text">Message couple</span>
                  <span className="btn-icon"><MessageCircle size={16} /></span>
                </button>
                {unlockError && <p className="lead-unlock-error" role="alert">{unlockError}</p>}
                <div className="action-info-box"><p>Your profile will be shared.</p></div>
              </div>
            </aside>
          </div>
        </div>
      )}

      {/* Footer */}
      {!activeLead && (
        <footer className="leads-footer">
          <Link href="/" className="brand">
            <span className="brand-mark">♜</span>
            <span>
              <strong>A LOVERS CARD</strong>
              <small>PLANNER WORKSPACE</small>
            </span>
          </Link>
          <p className="footer-lead-text">
            Connecting couples who love beauty with coordinators who create magic.
          </p>
          <nav>
            <Link href="/">Home</Link>
            <Link href="/#how-it-works">How It Works</Link>
            <Link href="/#moodboard">Moodboard</Link>
          </nav>
        </footer>
      )}
    </main>
  )
}
