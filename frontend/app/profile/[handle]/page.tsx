import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight, Banknote, BookOpen, BriefcaseBusiness, Building2, Camera, ChartNoAxesColumnIncreasing, Coins, FileText, Handshake, Image as ImageIcon, LayoutDashboard, Mail, MapPin, MessageCircle, Package, Palette, Search, Sparkles, Store, Utensils, Users, Video } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import StartConversationButton from '@/components/shared/StartConversationButton'
import ProfileSignOut from '@/components/shared/ProfileSignOut'

const plannerTools = [
  { title: 'Find wedding leads', href: '/planner/leads', icon: Search, ready: true },
  { title: 'Manage clients', href: '/planner/clients', icon: Users, ready: true },
  { title: 'Messages', href: '/planner/messages', icon: MessageCircle, ready: true },
  { title: 'Planner profile', href: '/planner/profile', icon: BriefcaseBusiness, ready: true },
  { title: 'Find wedding vendors', icon: Store },
  { title: 'Track bids', icon: FileText },
  { title: 'Build quotes', icon: FileText },
  { title: 'Manage deals', icon: Handshake },
  { title: 'Save pitch work', icon: BookOpen },
  { title: 'Pitch with AI', icon: Sparkles },
  { title: 'Venue views', icon: ImageIcon },
  { title: 'Change photo angles', icon: Camera },
  { title: 'Retouch photos', icon: ImageIcon },
  { title: 'Make wedding videos', icon: Video },
  { title: 'Design wedding decor', icon: Palette },
  { title: 'Plan wedding food', icon: Utensils },
  { title: 'Venue partners', icon: Building2 },
  { title: 'Manage vendor requests', icon: Package },
  { title: 'Send service quotes', icon: Banknote },
  { title: 'Track earnings', icon: ChartNoAxesColumnIncreasing },
  { title: 'Tool credits and plans', icon: Coins },
]

type Profile = { id: string; role: 'couple' | 'planner' | 'vendor'; handle: string; display_name: string; initials: string; company_name: string; city: string; bio: string; avatar_url: string | null; is_demo: boolean; is_approved: boolean }

export default async function PublicProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('*').eq('handle', handle).maybeSingle() as { data: Profile | null }
  if (!profile) notFound()
  const isOwner = user?.id === profile.id

  const [{ data: services }, { data: portfolio }, { data: requirements }, { data: moodboards }] = await Promise.all([
    supabase.from('profile_services').select('id,service_name').eq('profile_id', profile.id).order('display_order'),
    supabase.from('profile_portfolio').select('id,image_url,alt_text').eq('profile_id', profile.id).order('display_order'),
    profile.role === 'couple' ? supabase.from('couple_requirements').select('*').eq('profile_id', profile.id).maybeSingle() : Promise.resolve({ data: null }),
    profile.role === 'couple' ? supabase.from('moodboards').select('id,title,style,summary,image_urls').eq('profile_id', profile.id).order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
  ])

  return (
    <main className="public-profile">
      <header className="profile-topbar"><Link href={`/${profile.role}`}><ArrowLeft size={16} /> A Lovers Card</Link>{isOwner ? <nav className="profile-owner-nav" aria-label="Your account"><Link href={profile.role === 'couple' ? '/couple/messages' : `/${profile.role}/messages`}><MessageCircle size={17} /> Messages</Link><Link href={profile.role === 'couple' ? '/couple' : `/${profile.role}`}><LayoutDashboard size={17} /> Home</Link><ProfileSignOut /></nav> : null}</header>
      <article className="profile-card">
        <section className="profile-intro">
          <div className="profile-avatar">{profile.avatar_url ? <Image src={profile.avatar_url} alt="" fill sizes="120px" /> : <span>{profile.initials || profile.display_name.slice(0, 2).toUpperCase()}</span>}</div>
          <div className="profile-heading"><p className="profile-role">{profile.role}</p><h1>{profile.display_name}</h1>{profile.company_name && <h2>{profile.company_name}</h2>}{profile.city && <p className="profile-city"><MapPin size={15} />{profile.city}</p>}{profile.bio && <p className="profile-bio">{profile.bio}</p>}</div>
        </section>

        {profile.role !== 'couple' && profile.is_approved && <StartConversationButton profileId={profile.id} role={profile.role} />}

        {services?.length ? <section className="profile-section"><p className="profile-label">SERVICES</p><div className="profile-services">{services.map((service) => <span key={service.id}>{service.service_name}</span>)}</div></section> : null}

        {requirements && <section className="profile-section profile-needs"><p className="profile-label">COUPLE NEEDS</p><div className="profile-facts">{requirements.city && <div><span>City</span><strong>{requirements.city}</strong></div>}{requirements.wedding_date && <div><span>Wedding date</span><strong>{new Date(`${requirements.wedding_date}T00:00:00`).toLocaleDateString('en', { month: 'long', year: 'numeric' })}</strong></div>}{requirements.guest_count && <div><span>Guests</span><strong>{requirements.guest_count}</strong></div>}{requirements.budget_min && requirements.budget_max && <div><span>Budget</span><strong>₹{Number(requirements.budget_min).toLocaleString('en-IN')} – ₹{Number(requirements.budget_max).toLocaleString('en-IN')}</strong></div>}</div>{requirements.services?.length > 0 && <div className="profile-services">{requirements.services.map((service: string) => <span key={service}>{service}</span>)}</div>}{requirements.priorities?.length > 0 && <p className="profile-bio">Top needs: {requirements.priorities.join(' · ')}</p>}{requirements.notes && <p className="profile-bio">{requirements.notes}</p>}</section>}

        {moodboards?.length ? <section className="profile-section"><p className="profile-label">MOODBOARDS</p>{moodboards.map((board) => <div className="profile-board" key={board.id}><h3>{board.title}</h3><p>{board.style} · {board.summary}</p><div className="profile-gallery">{board.image_urls?.map((url: string) => <div key={url}><Image src={url} alt="Wedding moodboard idea" fill sizes="(max-width: 650px) 45vw, 240px" /></div>)}</div></div>)}</section> : null}

        {portfolio?.length ? <section className="profile-section"><p className="profile-label">PORTFOLIO</p><div className="profile-gallery">{portfolio.map((item) => <div key={item.id}><Image src={item.image_url} alt={item.alt_text || 'Wedding portfolio work'} fill sizes="(max-width: 650px) 45vw, 300px" /></div>)}</div></section> : null}
        {profile.is_demo && <p className="profile-demo-note">Example profile</p>}
      </article>
      {isOwner && profile.role === 'planner' && <section className="profile-workspace" aria-labelledby="planner-workspace-title"><div className="profile-workspace-heading"><p className="profile-label">YOUR PLANNER TOOLS</p><h2 id="planner-workspace-title">Your wedding work</h2><p>Find couples. Plan each day.</p></div><div className="profile-tool-grid">{plannerTools.map((tool) => { const Icon = tool.icon; const content = <><span className="profile-tool-icon"><Icon size={19} /></span><span className="profile-tool-title">{tool.title}</span>{tool.ready ? <ArrowRight className="profile-tool-arrow" size={16} /> : <span className="profile-tool-status">Coming soon</span>}</>; return tool.href ? <Link className="profile-tool-card is-ready" href={tool.href} key={tool.title}>{content}</Link> : <div className="profile-tool-card" key={tool.title}>{content}</div> })}</div></section>}
    </main>
  )
}
