import Image from 'next/image'
import Link from 'next/link'
import LeadStream from '@/components/landing/LeadStream'
import {
  ArrowRight,
  Banknote,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  Camera,
  ChartNoAxesColumnIncreasing,
  ClipboardList,
  Coins,
  FileText,
  Handshake,
  Image as ImageIcon,
  LayoutDashboard,
  Mail,
  MessageCircle,
  Package,
  Palette,
  Search,
  Sparkles,
  Store,
  Users,
  Video,
  Utensils,
  type LucideIcon,
} from 'lucide-react'

type ProTool = {
  title: string
  detail: string
  icon: LucideIcon
  href?: string
  venues?: string[]
}

type ToolGroup = {
  id: string
  label: string
  title: string
  detail: string
  tools: ProTool[]
}

const toolGroups: ToolGroup[] = [
  {
    id: 'planner-tools',
    label: 'FOR PLANNERS',
    title: 'Plan each celebration',
    detail: 'Find couples. Shape each day.',
    tools: [
      { title: 'Find wedding leads', detail: 'Meet couples ready to plan.', icon: Search, href: '/planner/leads' },
      { title: 'Manage clients', detail: 'Keep each wedding on track.', icon: Users, href: '/planner/clients' },
      { title: 'Find wedding vendors', detail: 'Bring the right team together.', icon: Store },
      { title: 'Track bids', detail: 'See new couple requests.', icon: ClipboardList },
      { title: 'Build quotes', detail: 'Share costs with each couple.', icon: FileText },
      { title: 'Manage deals', detail: 'Track each wedding deal.', icon: Handshake },
      { title: 'Planner messages', detail: 'Talk with every couple.', icon: MessageCircle },
      { title: 'Save pitch work', detail: 'Keep your best ideas close.', icon: BookOpen },
      { title: 'Planner profile', detail: 'Show your work and style.', icon: BriefcaseBusiness, href: '/planner/profile' },
    ],
  },
  {
    id: 'pitch-tools',
    label: 'PITCH AND DESIGN',
    title: 'Show each wedding idea',
    detail: 'Shape the look before the day.',
    tools: [
      { title: 'Pitch with AI', detail: 'Show a full wedding look.', icon: Sparkles },
      { title: 'Venue views', detail: 'See every side of venues.', icon: Building2 },
      { title: 'Change photo angles', detail: 'View new sides of spaces.', icon: Camera },
      { title: 'Retouch photos', detail: 'Try new looks in photos.', icon: ImageIcon },
      { title: 'Make wedding videos', detail: 'Bring each scene to life.', icon: Video },
      { title: 'Design wedding decor', detail: 'Plan each event zone.', icon: Palette },
      { title: 'Plan wedding food', detail: 'Shape menus for guests.', icon: Utensils },
      { title: 'Pitch library', detail: 'Save your favorite work.', icon: BookOpen },
      { title: 'Tool credits and plans', detail: 'Keep track of tool use.', icon: Coins },
      {
        title: 'Venue partners',
        detail: 'Explore wedding spaces.',
        icon: Building2,
        venues: ['MasterVenue AI', 'FairMount Mumbai', 'Taj Agra', 'ITC Mughal', 'Jaypee Palace'],
      },
    ],
  },
  {
    id: 'vendor-tools',
    label: 'FOR VENDORS',
    title: 'Grow your wedding work',
    detail: 'Show your work. Meet planners.',
    tools: [
      { title: 'Vendor home', detail: 'See your work and requests.', icon: LayoutDashboard, href: '/vendor' },
      { title: 'Show your portfolio', detail: 'Share your best work.', icon: ImageIcon, href: '/vendor/portfolio' },
      { title: 'Manage inventory', detail: 'List your goods and services.', icon: Package },
      { title: 'Receive requests', detail: 'Answer planner needs.', icon: Mail, href: '/vendor/inquiries' },
      { title: 'Send service quotes', detail: 'Share clear prices.', icon: Banknote },
      { title: 'Track earnings', detail: 'See sales and payouts.', icon: ChartNoAxesColumnIncreasing },
      { title: 'Vendor messages', detail: 'Talk with your planner team.', icon: MessageCircle },
      { title: 'Vendor profile', detail: 'Share your business details.', icon: BriefcaseBusiness, href: '/vendor/profile' },
    ],
  },
]

function ToolCard({ tool, index }: { tool: ProTool; index: number }) {
  const Icon = tool.icon
  const content = (
    <>
      <span className="pro-tool-icon" aria-hidden="true"><Icon size={19} strokeWidth={1.8} /></span>
      <span className="pro-tool-copy">
        <span className="pro-tool-title">{tool.title}</span>
        <span className="pro-tool-detail">{tool.detail}</span>
        {tool.venues && (
          <span className="pro-venue-list">
            {tool.venues.map((venue) => <span key={venue}>{venue}</span>)}
          </span>
        )}
      </span>
      <span className={`pro-tool-status ${tool.href ? 'is-preview' : 'is-soon'}`}>
        {tool.href ? 'Preview' : 'Coming soon'}
      </span>
      {tool.href && <ArrowRight className="pro-tool-arrow" size={17} aria-hidden="true" />}
      <span className="pro-tool-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
    </>
  )

  return tool.href ? (
    <Link className="pro-tool-card is-linked" href={tool.href}>
      {content}
    </Link>
  ) : (
    <article className="pro-tool-card">
      {content}
    </article>
  )
}

export default function PlannerLandingPage() {
  return (
    <main className="pro-landing">
      <header className="pro-topbar">
        <Link className="pro-brand" href="/" aria-label="A Lovers Card home">
          A Lovers Card
        </Link>
        <nav className="pro-nav" aria-label="Page sections">
          <a href="#planner-tools">Planner tools</a>
          <a href="#pitch-tools">Pitch tools</a>
          <a href="#vendor-tools">Vendor tools</a>
        </nav>
        <Link className="pro-sign-in" href="/auth?role=planner&mode=signin&next=%2Fplanner%2Fprofile">Sign in</Link>
      </header>

      <div className="pro-page-content">
        <section className="pro-hero" aria-labelledby="pro-hero-title">
          <div className="pro-hero-copy">
            <p className="pro-eyebrow">FOR WEDDING PROFESSIONALS</p>
            <h1 id="pro-hero-title"><span>Your work deserves</span><span>to be discovered.</span></h1>
            <p className="pro-hero-line">
              Meet couples planning weddings.<br />
              Show your work.
            </p>
            <LeadStream />
            <div className="pro-hero-actions">
              <Link className="pro-primary-button" href="/auth?role=planner&next=%2Fplanner%2Fprofile">
                Create your profile <ArrowRight size={17} />
              </Link>
              <Link className="pro-secondary-link" href="/auth?role=planner&mode=signin&next=%2Fplanner%2Fprofile">Sign in</Link>
              <Link className="pro-secondary-link" href="/planner/leads" aria-label="Find leads. Sign in or create a profile first.">
                Find leads
              </Link>
            </div>
          </div>
          <figure className="pro-showcase" aria-label="Wedding portfolio examples">
            <div className="pro-showcase-main">
              <Image
                src="/tool-vendor.jpg"
                alt="Floral wedding stage with warm lights"
                fill
                priority
                sizes="(max-width: 760px) 92vw, 48vw"
              />
              <span className="pro-showcase-caption">A setting made memorable</span>
            </div>
            <Link className="pro-showcase-card" href="/vendor/portfolio" aria-label="Open your vendor portfolio">
              <Image
                src="/lawn-venue.png"
                alt="Outdoor wedding ceremony setup"
                width={180}
                height={130}
                sizes="180px"
              />
              <span>
                <small>YOUR PORTFOLIO</small>
                <strong>Show your work</strong>
              </span>
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </figure>
        </section>

        <div className="pro-promise" aria-label="Professional tools">
          <span>Show your portfolio</span>
          <span>Meet wedding couples</span>
          <span>Reply to inquiries</span>
        </div>

        <div className="pro-tools-intro" id="tools">
          <p className="pro-eyebrow">YOUR WEDDING WORKSPACE</p>
          <h2>Tools for every step</h2>
          <p>Some tools are previews. More arrive soon.</p>
        </div>

        <div className="pro-tool-groups">
          {toolGroups.map((group) => (
            <section className="pro-tool-group" id={group.id} key={group.id} aria-labelledby={`${group.id}-title`}>
              <div className="pro-group-heading">
                <div>
                  <p className="pro-eyebrow">{group.label}</p>
                  <h2 id={`${group.id}-title`}>{group.title}</h2>
                  <p>{group.detail}</p>
                </div>
              </div>
              <div className="pro-tool-list">
                {group.tools.map((tool, index) => (
                  <ToolCard key={tool.title} tool={tool} index={index} />
                ))}
              </div>
            </section>
          ))}
        </div>

        <footer className="pro-footer">
          <Link className="pro-brand" href="/">A Lovers Card</Link>
          <span>WEDDING WORK, WELL PLANNED</span>
          <Link href="/auth?role=planner&next=%2Fplanner%2Fprofile">Join as a pro <ArrowRight size={15} /></Link>
        </footer>
      </div>
    </main>
  )
}
