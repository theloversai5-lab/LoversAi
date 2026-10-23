'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, CalendarDays, MapPin } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

type RequestRow = {
  id: string
  status: 'open' | 'viewed' | 'closed'
  services: string[]
  priorities: string[]
  notes: string
  created_at: string
  moodboard_id: string | null
  images: string[]
}

const statusCopy = {
  open: 'Finding a planner',
  viewed: 'A planner viewed this',
  closed: 'This request is closed',
}

export default function CoupleRequestsPage() {
  const router = useRouter()
  const [requests, setRequests] = useState<RequestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/auth?role=couple&next=%2Fcouple%2Frequests'); return }
      const { data, error: requestError } = await supabase.from('planner_requests')
        .select('id,status,services,priorities,notes,created_at,moodboard_id')
        .eq('couple_profile_id', user.id)
        .order('created_at', { ascending: false })
      if (requestError) throw requestError
      const boardIds = [...new Set((data ?? []).map((item) => item.moodboard_id).filter((id): id is string => Boolean(id)))]
      const { data: boards, error: boardError } = boardIds.length
        ? await supabase.from('moodboards').select('id,image_urls').in('id', boardIds)
        : { data: [], error: null }
      if (boardError) throw boardError
      if (!active) return
      setRequests((data ?? []).map((item) => ({ ...item, images: boards?.find((board) => board.id === item.moodboard_id)?.image_urls ?? [] })))
      setLoading(false)
    }
    void load().catch((cause) => { if (active) { setError(cause instanceof Error ? cause.message : 'Requests could not load.'); setLoading(false) } })
    return () => { active = false }
  }, [router])

  return (
    <main className="min-h-screen bg-[#1E4636] px-4 py-7 text-[#E2B451] sm:px-8">
      <div className="mx-auto max-w-4xl">
        <Link href="/couple" className="inline-flex min-h-10 items-center gap-2 text-sm font-bold"><ArrowLeft size={17} /> Back to wedding</Link>
        <div className="mb-8 mt-8 border-b border-[#E2B451]/30 pb-5">
          <p className="mb-2 text-xs font-extrabold tracking-[.16em] text-[#F08A3C]">YOUR PLANNER REQUESTS</p>
          <h1 className="font-[Cormorant_Garamond] text-5xl font-bold sm:text-6xl">Track your request</h1>
          <p className="mt-3 text-sm text-[#E2B451]/80">See what happens next.</p>
        </div>
        {loading ? <p className="py-12 text-center">Loading your requests…</p> : error ? <p className="bg-[#3A2563] p-5 text-sm text-[#F08A3C]" role="alert">{error}</p> : requests.length === 0 ? (
          <section className="bg-[#3A2563] p-6 sm:p-9"><h2 className="font-[Cormorant_Garamond] text-3xl font-bold">No request yet.</h2><p className="mt-2 text-sm text-[#E2B451]/80">Share your plans with planners.</p><Link href="/couple/request" className="mt-6 inline-flex min-h-11 items-center gap-2 bg-[#F08A3C] px-4 font-bold text-[#1E4636]">Find a planner <ArrowRight size={16} /></Link></section>
        ) : <div className="grid gap-4">{requests.map((request) => <article key={request.id} className="bg-[#3A2563] p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-extrabold tracking-wide text-[#F08A3C]">{statusCopy[request.status]}</p><h2 className="mt-1 font-[Cormorant_Garamond] text-3xl font-bold">Planner request</h2></div><time className="inline-flex items-center gap-2 text-xs text-[#E2B451]/75"><CalendarDays size={14} />{new Date(request.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</time></div>
          <div className="mt-4 flex flex-wrap gap-2">{request.services.map((service) => <span key={service} className="border border-[#E2B451]/35 px-3 py-1.5 text-xs">{service}</span>)}</div>
          {request.priorities.length > 0 && <p className="mt-4 text-sm leading-6"><strong>Your priorities:</strong> {request.priorities.join(' · ')}</p>}
          {request.notes && <p className="mt-2 text-sm leading-6 text-[#E2B451]/80">{request.notes}</p>}
          {request.images.length > 0 && <div className="mt-5"><p className="mb-2 text-xs font-bold">SHARED MOODBOARD</p><div className="grid max-w-md grid-cols-4 gap-2">{request.images.slice(0, 4).map((image, index) => <img key={`${image}-${index}`} src={image} alt={`Moodboard idea ${index + 1}`} className="aspect-square w-full object-cover" />)}</div></div>}
          <p className="mt-5 border-t border-[#E2B451]/20 pt-4 text-xs leading-5 text-[#E2B451]/75">Planners can review your plans.<br />They may contact you.</p>
        </article>)}</div>}
        <div className="mt-7 flex flex-wrap gap-3"><Link href="/couple/moodboard" className="inline-flex min-h-10 items-center gap-2 border border-[#E2B451]/40 px-4 text-sm font-bold">Open moodboard</Link><Link href="/couple" className="inline-flex min-h-10 items-center gap-2 border border-[#E2B451]/40 px-4 text-sm font-bold"><MapPin size={15} /> Wedding home</Link></div>
      </div>
    </main>
  )
}
