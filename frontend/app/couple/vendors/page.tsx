'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, BriefcaseBusiness, MapPin, Search, Store, UsersRound } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

type ProProfile = { id: string; handle: string; role: 'planner' | 'vendor'; display_name: string; initials: string; company_name: string; city: string; bio: string; services: string[]; cover: string | null }

export default function VendorsPage() {
  const [profiles, setProfiles] = useState<ProProfile[]>([])
  const [selectedRole, setSelectedRole] = useState<'all' | 'planner' | 'vendor'>('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function loadProfiles() {
      const { data: rows, error } = await supabase.from('profiles').select('id,handle,role,display_name,initials,company_name,city,bio').in('role', ['planner', 'vendor']).eq('is_public', true).eq('is_complete', true).or('is_demo.eq.true,is_approved.eq.true').order('created_at', { ascending: false })
      if (error || !rows?.length) { if (active) setLoading(false); return }
      const ids = rows.map((profile) => profile.id)
      const [{ data: serviceRows }, { data: imageRows }] = await Promise.all([
        supabase.from('profile_services').select('profile_id,service_name').in('profile_id', ids).order('display_order'),
        supabase.from('profile_portfolio').select('profile_id,image_url').in('profile_id', ids).order('display_order'),
      ])
      if (active) {
        setProfiles(rows.map((profile) => ({
          ...profile,
          role: profile.role as 'planner' | 'vendor',
          services: serviceRows?.filter((service) => service.profile_id === profile.id).map((service) => service.service_name) ?? [],
          cover: imageRows?.find((image) => image.profile_id === profile.id)?.image_url ?? null,
        })))
        setLoading(false)
      }
    }
    void loadProfiles()
    return () => { active = false }
  }, [])

  const filtered = useMemo(() => profiles.filter((profile) => {
    const matchesRole = selectedRole === 'all' || profile.role === selectedRole
    const haystack = [profile.display_name, profile.company_name, profile.city, ...profile.services].join(' ').toLowerCase()
    return matchesRole && haystack.includes(search.trim().toLowerCase())
  }), [profiles, search, selectedRole])

  return (
    <main className="pro-directory">
      <header className="directory-header"><Link href="/couple"><ArrowLeft size={17} /> Your wedding</Link><Link className="directory-home" href="/couple">A Lovers Card</Link><Link href="/couple/cart">Your saved ideas</Link></header>
      <section className="directory-intro"><p>YOUR WEDDING TEAM</p><h1>Find your people.</h1><span>Meet planners and vendors.</span></section>
      <section className="directory-content" aria-label="Planner and vendor profiles">
        <div className="directory-controls">
          <label className="directory-search"><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, city, service" aria-label="Search by name, city, or service" /></label>
          <div className="directory-filters" aria-label="Choose a role">
            <button className={selectedRole === 'all' ? 'is-active' : ''} onClick={() => setSelectedRole('all')}>Everyone</button>
            <button className={selectedRole === 'planner' ? 'is-active' : ''} onClick={() => setSelectedRole('planner')}><BriefcaseBusiness size={15} /> Planners</button>
            <button className={selectedRole === 'vendor' ? 'is-active' : ''} onClick={() => setSelectedRole('vendor')}><Store size={15} /> Vendors</button>
          </div>
        </div>
        <p className="directory-count">{filtered.length} {filtered.length === 1 ? 'profile' : 'profiles'}</p>
        {loading ? <p className="directory-empty">Finding wedding teams…</p> : filtered.length === 0 ? <p className="directory-empty">No matching profiles yet.</p> : <div className="directory-grid">
          {filtered.map((profile) => <Link href={`/profile/${profile.handle}`} className="directory-card" key={profile.id}>
            <div className="directory-cover">{profile.cover ? <img src={profile.cover} alt="" /> : <span className="directory-initials">{profile.initials || profile.display_name.slice(0, 2).toUpperCase()}</span>}<span className="directory-role">{profile.role === 'planner' ? <BriefcaseBusiness size={14} /> : <Store size={14} />}{profile.role}</span></div>
            <div className="directory-card-copy"><h2>{profile.company_name || profile.display_name}</h2><p className="directory-owner">{profile.display_name}</p>{profile.city && <p className="directory-city"><MapPin size={14} />{profile.city}</p>}{profile.bio && <p className="directory-bio">{profile.bio}</p>}<div className="directory-services">{profile.services.slice(0, 4).map((service) => <span key={service}>{service}</span>)}</div><span className="directory-open">Open profile <ArrowRight size={15} /></span></div>
          </Link>)}
        </div>}
      </section>
      <style jsx>{`
        .pro-directory { min-height: 100vh; padding: 0 clamp(18px, 5vw, 70px) 60px; color: #E2B451; background: #1E4636; }
        .directory-header { min-height: 70px; display: flex; align-items: center; justify-content: space-between; gap: 15px; border-bottom: 1px solid rgba(226,180,81,.3); }
        .directory-header a { display: inline-flex; align-items: center; gap: 7px; color: #E2B451; font: 700 11px Manrope, sans-serif; text-decoration: none; }
        .directory-header .directory-home { font: 700 21px 'Cormorant Garamond', Georgia, serif; }
        .directory-intro { padding: 52px 0 32px; text-align: center; }
        .directory-intro p { margin: 0 0 10px; color: #F08A3C; font: 800 10px Manrope, sans-serif; letter-spacing: .16em; }
        .directory-intro h1 { margin: 0; color: #E2B451; font: 700 clamp(40px, 7vw, 62px)/1 'Cormorant Garamond', Georgia, serif; }
        .directory-intro span { display: block; margin-top: 11px; color: rgba(226,180,81,.84); font: 14px Manrope, sans-serif; }
        .directory-content { width: min(100%, 1120px); margin: 0 auto; }
        .directory-controls { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px; padding: 16px; border: 1px solid rgba(226,180,81,.4); background: #3A2563; }
        .directory-search { min-width: min(100%, 280px); flex: 1; display: flex; align-items: center; gap: 10px; padding: 0 12px; border: 1px solid rgba(226,180,81,.45); color: #E2B451; background: #1E4636; }
        .directory-search input { width: 100%; min-height: 42px; border: 0; outline: 0; color: #E2B451; background: transparent; font: 12px Manrope, sans-serif; }
        .directory-search input::placeholder { color: rgba(226,180,81,.62); }
        .directory-filters { display: flex; flex-wrap: wrap; gap: 7px; }
        .directory-filters button { min-height: 38px; display: inline-flex; align-items: center; gap: 7px; padding: 0 11px; border: 1px solid rgba(226,180,81,.4); color: #E2B451; background: #1E4636; font: 700 10px Manrope, sans-serif; cursor: pointer; }
        .directory-filters button.is-active { color: #1E4636; background: #E2B451; }
        .directory-count { margin: 24px 0 12px; color: rgba(226,180,81,.8); font: 700 11px Manrope, sans-serif; }
        .directory-grid { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 16px; }
        .directory-card { min-width: 0; overflow: hidden; border: 1px solid rgba(226,180,81,.4); color: #E2B451; background: #3A2563; text-decoration: none; transition: border-color .2s, transform .2s; }
        .directory-card:hover { transform: translateY(-3px); border-color: #F08A3C; }
        .directory-cover { height: 190px; position: relative; display: grid; place-items: center; overflow: hidden; background: #3A2563; }
        .directory-cover img { width: 100%; height: 100%; object-fit: cover; }
        .directory-initials { color: #E2B451; font: 700 64px 'Cormorant Garamond', Georgia, serif; }
        .directory-role { position: absolute; left: 11px; top: 11px; display: inline-flex; align-items: center; gap: 6px; padding: 7px 9px; color: #1E4636; background: #E2B451; font: 800 9px Manrope, sans-serif; text-transform: uppercase; }
        .directory-card-copy { padding: 18px; }
        .directory-card-copy h2 { margin: 0; color: #E2B451; font: 700 26px/1.05 'Cormorant Garamond', Georgia, serif; overflow-wrap: anywhere; }
        .directory-owner { margin: 6px 0; color: rgba(226,180,81,.8); font: 11px Manrope, sans-serif; }
        .directory-city { display: flex; align-items: center; gap: 5px; margin: 9px 0; color: #E2B451; font: 11px Manrope, sans-serif; }
        .directory-bio { min-height: 40px; margin: 10px 0; color: rgba(226,180,81,.82); font: 11px/1.5 Manrope, sans-serif; }
        .directory-services { display: flex; flex-wrap: wrap; gap: 6px; }
        .directory-services span { padding: 5px 7px; border: 1px solid rgba(226,180,81,.35); color: #E2B451; font: 10px Manrope, sans-serif; }
        .directory-open { display: flex; align-items: center; justify-content: space-between; margin-top: 16px; padding-top: 12px; border-top: 1px solid rgba(226,180,81,.25); color: #F08A3C; font: 800 11px Manrope, sans-serif; }
        .directory-empty { padding: 46px 12px; color: #E2B451; font: 14px Manrope, sans-serif; text-align: center; }
        .pro-directory a:focus-visible, .pro-directory button:focus-visible, .pro-directory input:focus-visible { outline: 3px solid #F08A3C; outline-offset: 3px; }
        @media (max-width: 820px) { .directory-grid { grid-template-columns: repeat(2,minmax(0,1fr)); } }
        @media (max-width: 560px) { .directory-header { gap: 9px; } .directory-header .directory-home { display: none; } .directory-intro { padding: 38px 0 25px; } .directory-controls { padding: 11px; } .directory-grid { grid-template-columns: 1fr; } .directory-cover { height: 210px; } }
      `}</style>
    </main>
  )
}
