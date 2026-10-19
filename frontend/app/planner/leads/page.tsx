'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Search,
  Filter,
  Calendar,
  MapPin,
  Users,
  IndianRupee,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  X,
  Layers,
  Send,
  ArrowLeft,
  ChevronDown,
  Paperclip,
  Mic,
  Image as ImageIcon,
} from 'lucide-react'

// Hardcoded sample leads representing couples who completed their moodboards
interface WeddingLead {
  id: string
  couple: string
  title: string
  date: string
  dateRaw: string // YYYY-MM-DD for filtering
  city: string
  state: string
  budgetDisplay: string
  budgetRaw: number // in Lakhs
  guests: number
  venueStyle: 'Open Lawn' | 'Heritage Palace' | 'Garden Meadow'
  coverImage: string
  moodboardSteps: string[]
  needs: string[]
  note: string
}

const sampleLeads: WeddingLead[] = [
  {
    id: 'lead-1',
    couple: 'Priya & Siddharth',
    title: 'Golden Sunset Mandap Celebration',
    date: 'Dec 14, 2026',
    dateRaw: '2026-12-14',
    city: 'Udaipur',
    state: 'Rajasthan',
    budgetDisplay: '₹35,00,000',
    budgetRaw: 35,
    guests: 350,
    venueStyle: 'Open Lawn',
    coverImage: '/playground-04-decor.png',
    moodboardSteps: ['Sunset lawn space', 'Sacred mandap stage', 'Guest chair aisles', 'Marigold & lotus canopy'],
    needs: ['Mandap setup', 'Banquet seating', 'Fairy lighting', 'Guest coordination'],
    note: 'We finished our 4-layer moodboard. We need a planner who can build this exact mandap on a lakeside lawn.',
  },
  {
    id: 'lead-2',
    couple: 'Rhea & Kabir',
    title: 'Daytime Botanical Garden Ceremony',
    date: 'Nov 28, 2026',
    dateRaw: '2026-11-28',
    city: 'Alibaug',
    state: 'Maharashtra',
    budgetDisplay: '₹22,00,000',
    budgetRaw: 22,
    guests: 200,
    venueStyle: 'Garden Meadow',
    coverImage: '/lawn-venue.png',
    moodboardSteps: ['Open orchard lawn', 'Floral arch stage', 'Cross-back chairs', 'Hanging brass lamps'],
    needs: ['Floral canopy', 'Acoustic sound', 'Daytime bar setup', 'Local catering management'],
    note: 'Day event with pastels and natural greenery. Moodboard is ready, looking for local Alibaug coordinator.',
  },
  {
    id: 'lead-3',
    couple: 'Meera & Arjun',
    title: 'Royal Courtyard & Night Reception',
    date: 'Jan 18, 2027',
    dateRaw: '2027-01-18',
    city: 'Jaipur',
    state: 'Rajasthan',
    budgetDisplay: '₹50,00,000',
    budgetRaw: 50,
    guests: 400,
    venueStyle: 'Heritage Palace',
    coverImage: '/playground-02-stage.png',
    moodboardSteps: ['Palace courtyard', 'Elevated royal stage', 'Round table banquet', 'Candlelit lanterns'],
    needs: ['Royal entry coordination', 'Stage production', 'Multi-day vendors', 'Luxury artist booking'],
    note: 'Grand family wedding. Complete courtyard layout created on Lovers AI. Need seasoned luxury planner.',
  },
  {
    id: 'lead-4',
    couple: 'Ananya & Dev',
    title: 'Lakeview Minimalist Mandap',
    date: 'Feb 08, 2027',
    dateRaw: '2027-02-08',
    city: 'Bangalore',
    state: 'Karnataka',
    budgetDisplay: '₹18,00,000',
    budgetRaw: 18,
    guests: 150,
    venueStyle: 'Open Lawn',
    coverImage: '/playground-03-seating.png',
    moodboardSteps: ['Lakefront green', 'Minimal wood mandap', 'Theatre seating', 'White jasmine runners'],
    needs: ['Wood stage fabrication', 'Intimate seating setup', 'Live shehnai / flute artists'],
    note: 'Intimate gathering of close friends and family. Clean lines and eco-friendly floral decor only.',
  },
  {
    id: 'lead-5',
    couple: 'Tara & Vivaan',
    title: 'Meadow Pavilion with Sunset Views',
    date: 'Mar 15, 2027',
    dateRaw: '2027-03-15',
    city: 'Goa',
    state: 'Goa',
    budgetDisplay: '₹42,00,000',
    budgetRaw: 42,
    guests: 280,
    venueStyle: 'Garden Meadow',
    coverImage: '/empty-lawn-venue.png',
    moodboardSteps: ['Lawn cliff overlooking sea', 'Curved floral mandap', 'Lounge seating pods', 'Sunset bistro lights'],
    needs: ['Weather-safe canopy', 'DJ & dance floor setup', 'Cocktail bar coordination', 'Guest transport'],
    note: 'Destination wedding in South Goa. Full 3D lawn concept ready. Need planner with strong local vendor network.',
  },
]

export default function LeadsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedBudget, setSelectedBudget] = useState('all')
  const [selectedDateRange, setSelectedDateRange] = useState('all')
  const [selectedStyle, setSelectedStyle] = useState('all')

  // Selected lead for detail/pitch modal
  const [activeLead, setActiveLead] = useState<WeddingLead | null>(null)
  const [pitchSent, setPitchSent] = useState(false)
  const [pitchMessage, setPitchMessage] = useState('')
  const [showMessageBox, setShowMessageBox] = useState(false)
  const [isRecording, setIsRecording] = useState(false)

  // Filter leads dynamically
  const filteredLeads = useMemo(() => {
    return sampleLeads.filter((lead) => {
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
  }, [searchTerm, selectedBudget, selectedDateRange, selectedStyle])

  const handleOpenLead = (lead: WeddingLead) => {
    setActiveLead(lead)
    setPitchSent(false)
    setPitchMessage('')
    setShowMessageBox(false)
    setIsRecording(false)
  }

  const handleSendPitch = (e: React.FormEvent) => {
    e.preventDefault()
    setPitchSent(true)
    setShowMessageBox(false)
  }

  const handleToggleRecording = () => {
    setIsRecording(!isRecording)
    // In a real app, this would start/stop audio recording
  }

  const handleResetFilters = () => {
    setSearchTerm('')
    setSelectedBudget('all')
    setSelectedDateRange('all')
    setSelectedStyle('all')
  }

  return (
    <main className="leads-page-wrap">
      {/* Top Navigation */}
      <header className="leads-header">
        <div className="leads-header-inner">
          <Link href="/" className="leads-back-btn">
            <ArrowLeft size={16} />
            <span>Back to Home</span>
          </Link>

          <div className="leads-brand">
            <span className="brand-mark">♜</span>
            <span className="leads-brand-text">
              <strong>A LOVERS CARD</strong>
              <small>PLANNER WORKSPACE</small>
            </span>
          </div>

          <div className="leads-status-pill">
            <span className="status-dot" />
            <span>5 Weddings Open for Planners</span>
          </div>
        </div>
      </header>

      {/* Hero Banner with Title & Explanation Subline */}
      <section className="leads-hero">
        <div className="leads-hero-inner">
          <h1 className="leads-title">Find leads</h1>

          {/* Subline clearly explaining what leads are to non-technical planners/vendors */}
          <p className="leads-subline">
            Find customers for your business here
          </p>
        </div>
      </section>

      {/* Search and Filters Section */}
      <section className="leads-controls-section">
        <div className="leads-controls-card">
          {/* Search bar */}
          <div className="leads-search-box">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search by couple name, city, or wedding style..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="leads-search-input"
            />
            {searchTerm && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setSearchTerm('')}
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </div>

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
        </div>
      </section>

      {/* Leads List Grid */}
      <section className="leads-list-section">
        <div className="leads-count-header">
          <h2>Available weddings ({filteredLeads.length})</h2>
        </div>

        {filteredLeads.length === 0 ? (
          <div className="leads-empty-state">
            <span className="empty-icon">♜</span>
            <h3>No weddings found</h3>
            <p>Try clearing your search term or broadening your budget and date filters.</p>
            <button
              type="button"
              className="button button-small"
              onClick={handleResetFilters}
            >
              Reset all filters
            </button>
          </div>
        ) : (
          <div className="leads-cards-grid">
            {filteredLeads.map((lead, index) => (
              <article key={lead.id} className="lead-card">
                {/* Cover Image with Moodboard Preview */}
                <div className="lead-card-media">
                  <Image
                    src={lead.coverImage}
                    alt={lead.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="lead-cover-img"
                    priority={index < 3}
                  />
                  <div className="lead-media-overlay" />

                  {/* Moodboard badge */}
                  <span className="lead-badge-moodboard">
                    <Sparkles size={11} /> Moodboard Ready
                  </span>

                  {/* Style tag */}
                  <span className="lead-style-tag">{lead.venueStyle}</span>
                </div>

                {/* Lead Card Body */}
                <div className="lead-card-body">
                  <div className="lead-primary-meta">
                    <span className="lead-date">
                      <Calendar size={13} /> {lead.date}
                    </span>
                    <span className="lead-location">
                      <MapPin size={13} /> {lead.city}, {lead.state}
                    </span>
                  </div>

                  <h3 className="lead-couple-names">{lead.couple}</h3>
                  <h4 className="lead-wedding-title">{lead.title}</h4>

                  {/* Cost & Guests Key Metrics */}
                  <div className="lead-metrics-row">
                    <div className="metric-box">
                      <span className="metric-label">Estimated Budget</span>
                      <strong className="metric-value cost-value">
                        {lead.budgetDisplay}
                      </strong>
                    </div>
                    <div className="metric-box">
                      <span className="metric-label">Expected Guests</span>
                      <strong className="metric-value guests-value">
                        <Users size={13} /> {lead.guests}
                      </strong>
                    </div>
                  </div>

                  {/* Couple's Needs Tags */}
                  <div className="lead-needs-tags">
                    {lead.needs.slice(0, 3).map((item) => (
                      <span key={item} className="need-tag">
                        {item}
                      </span>
                    ))}
                    {lead.needs.length > 3 && (
                      <span className="need-tag more-tag">
                        +{lead.needs.length - 3} more
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="lead-card-footer">
                    <button
                      type="button"
                      className="view-lead-btn"
                      onClick={() => handleOpenLead(lead)}
                    >
                      <span>View details</span>
                      <ArrowRight size={14} />
                    </button>
                    <button
                      type="button"
                      className="pitch-lead-btn"
                      onClick={() => handleOpenLead(lead)}
                    >
                      <span>Pitch now</span>
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

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

          {/* Hero Image Section */}
          <div className="detail-hero-section">
            <div className="detail-hero-image">
              <Image
                src={activeLead.coverImage}
                alt={activeLead.title}
                fill
                className="detail-cover-img"
              />
              <div className="detail-hero-overlay" />
            </div>
            
            <div className="detail-hero-content">
              <h1 className="detail-couple-name">{activeLead.couple}</h1>
              <h2 className="detail-wedding-title">{activeLead.title}</h2>
              <span className="detail-venue-style">{activeLead.venueStyle}</span>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="detail-content-wrapper">
            <div className="detail-main-content">
              
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
                      <strong>{activeLead.city}, {activeLead.state}</strong>
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

              {/* Moodboard Layers */}
              <section className="detail-section">
                <h3 className="detail-section-title">Moodboard layers built on Lovers AI</h3>
                <div className="detail-layers-grid">
                  {activeLead.moodboardSteps.map((step, idx) => (
                    <div key={step} className="detail-layer-card">
                      <span className="layer-number">Layer {idx + 1}</span>
                      <p className="layer-description">{step}</p>
                      <CheckCircle2 size={16} className="layer-check" />
                    </div>
                  ))}
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
                {pitchSent ? (
                  <div className="message-success">
                    <CheckCircle2 size={40} className="success-icon" />
                    <h4>Message sent!</h4>
                    <p>The couple will review your profile and respond soon.</p>
                  </div>
                ) : !showMessageBox ? (
                  <>
                    <h3 className="action-card-title">Interested in this wedding?</h3>
                    <p className="action-card-subtitle">Send a message to connect</p>
                    
                    <button 
                      type="button"
                      className="detail-message-btn"
                      onClick={() => setShowMessageBox(true)}
                    >
                      <span className="btn-text">Message couple</span>
                      <span className="btn-icon">
                        <Send size={16} />
                      </span>
                    </button>

                    <div className="action-info-box">
                      <p>The couple will see your planner profile and contact details</p>
                    </div>
                  </>
                ) : (
                  <div className="whatsapp-message-box">
                    <div className="message-box-header">
                      <h4>Send message to {activeLead.couple}</h4>
                      <button 
                        type="button"
                        className="close-message-box"
                        onClick={() => setShowMessageBox(false)}
                      >
                        <X size={18} />
                      </button>
                    </div>

                    <form onSubmit={handleSendPitch} className="message-form">
                      <div className="message-input-wrapper">
                        <textarea
                          rows={4}
                          placeholder="Type your message here..."
                          value={pitchMessage}
                          onChange={(e) => setPitchMessage(e.target.value)}
                          required
                          className="message-textarea"
                        />
                      </div>

                      <div className="message-actions-row">
                        <div className="attachment-options">
                          <button 
                            type="button" 
                            className="attachment-btn"
                            title="Attach image"
                          >
                            <ImageIcon size={18} />
                          </button>
                          <button 
                            type="button" 
                            className="attachment-btn"
                            title="Attach file"
                          >
                            <Paperclip size={18} />
                          </button>
                          <button 
                            type="button" 
                            className={`attachment-btn ${isRecording ? 'recording' : ''}`}
                            onClick={handleToggleRecording}
                            title={isRecording ? "Stop recording" : "Record audio"}
                          >
                            <Mic size={18} />
                          </button>
                        </div>

                        <button 
                          type="submit" 
                          className="send-message-btn"
                          disabled={!pitchMessage.trim()}
                        >
                          <Send size={18} />
                        </button>
                      </div>

                      {isRecording && (
                        <div className="recording-indicator">
                          <span className="recording-dot"></span>
                          <span>Recording audio...</span>
                        </div>
                      )}
                    </form>
                  </div>
                )}
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
