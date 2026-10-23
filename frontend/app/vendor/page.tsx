import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Camera, Check, Store } from 'lucide-react'

const vendorServices = ['Photography', 'Flowers', 'Food', 'Music', 'Beauty', 'Venues']

export default function VendorLandingPage() {
  return (
    <main className="vendor-landing">
      <header className="vendor-header">
        <Link href="/" className="vendor-wordmark">A Lovers Card</Link>
        <nav aria-label="Account"><Link href="/auth?role=vendor&mode=signin">Sign in</Link><Link className="vendor-header-cta" href="/auth?role=vendor">Join as vendor</Link></nav>
      </header>
      <section className="vendor-hero">
        <div className="vendor-hero-copy">
          <p className="vendor-eyebrow">FOR WEDDING VENDORS</p>
          <h1>Show your work.<br />Meet more couples.</h1>
          <p className="vendor-summary"><span>Share your best work.</span><span>List each service.</span><span>Meet more couples.</span></p>
          <div className="vendor-actions">
            <Link href="/auth?role=vendor">Create your profile <ArrowRight size={17} /></Link>
            <Link href="/auth?role=vendor&mode=signin">Sign in</Link>
            <Link href="/planner/leads?role=vendor">See couple requests</Link>
          </div>
          <p className="vendor-note"><Check size={15} /> Your work, in one place.</p>
        </div>
        <div className="vendor-feature-image">
          <Image src="/tool-vendor.jpg" alt="Wedding flowers and decor" fill priority sizes="(max-width: 760px) 90vw, 52vw" />
          <span><Camera size={16} /> Your portfolio</span>
        </div>
      </section>
      <section className="vendor-services" aria-labelledby="vendor-services-title">
        <p className="vendor-eyebrow">WHAT YOU OFFER</p>
        <h2 id="vendor-services-title">Show your services</h2>
        <div>{vendorServices.map((service) => <span key={service}><Store size={17} />{service}</span>)}</div>
      </section>
    </main>
  )
}
