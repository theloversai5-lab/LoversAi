'use client'

import { FormEvent, Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, LockKeyhole, Mail } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { supabase, type UserRole } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/store/authStore'
import { roleRedirectPath } from '@/lib/auth/redirect'

const roles: UserRole[] = ['couple', 'planner', 'vendor']

function AuthContent() {
  const router = useRouter()
  const search = useSearchParams()
  const requestedRole = roles.includes(search.get('role') as UserRole) ? search.get('role') as UserRole : 'couple'
  const [mode, setMode] = useState<'signup' | 'signin'>(search.get('mode') === 'signin' ? 'signin' : 'signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [token, setToken] = useState('')
  const [stage, setStage] = useState<'email' | 'code'>('email')
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  async function sendCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setNotice('')

    if (mode === 'signin') {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (signInError || !data.user) {
        setLoading(false)
        setError(signInError?.message ?? 'Could not sign in. Try again.')
        return
      }
      await finishSignIn(data.user)
      return
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { role: requestedRole } },
    })
    if (signUpError) {
      setLoading(false)
      setError(signUpError.message)
      return
    }
    if (data.session && data.user) {
      await finishSignIn(data.user)
      return
    }

    setStage('code')
    setLoading(false)
    setNotice('Enter the six digit code.')
  }

  async function resendCode() {
    setLoading(true)
    setError('')
    const { error: otpError } = await supabase.auth.resend({ type: 'signup', email: email.trim() })
    setLoading(false)
    if (otpError) setError(otpError.message)
    else setNotice('A new code is on its way.')
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: token.trim(),
      type: 'signup',
    })
    if (verifyError || !data.user) {
      setLoading(false)
      setError(verifyError?.message ?? 'That code did not work. Try again.')
      return
    }

    await finishSignIn(data.user)
  }

  async function finishSignIn(user: User) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role,is_complete')
      .eq('id', user.id)
      .maybeSingle()
    setLoading(false)
    if (profileError || !profile) {
      setError('Profile setup is not ready. Apply the Supabase migration, then try again.')
      return
    }

    const role = profile.role as UserRole
    useAuthStore.getState().setUser({
      id: user.id,
      email: user.email ?? email.trim(),
      role,
      full_name: user.user_metadata?.full_name,
      created_at: user.created_at,
    })
    useAuthStore.getState().setRole(role)
    const next = roleRedirectPath(role, search.get('next'))
    router.replace(profile.is_complete ? next : `/profile/setup?next=${encodeURIComponent(next)}`)
  }

  function useDevBypass() {
    if (process.env.NODE_ENV === 'production') return
    document.cookie = `bypass_auth=${requestedRole}; path=/; max-age=86400; samesite=lax`
    router.push(`/${requestedRole}`)
  }

  return (
    <main className="account-page">
      <section className="account-card" aria-labelledby="account-title">
        <Link className="account-back" href={`/${requestedRole}`}><ArrowLeft size={16} /> Back</Link>
        <p className="account-eyebrow">A LOVERS CARD · {requestedRole.toUpperCase()}</p>
        <h1 id="account-title">{stage === 'code' ? 'Check your email' : mode === 'signup' ? 'Create your account' : 'Welcome back'}</h1>
        <p className="account-help">{stage === 'code' ? 'Enter the six digit code.' : mode === 'signup' ? 'Create an account with email.' : 'Sign in with your password.'}</p>

        {error && <p className="account-message is-error" role="alert">{error}</p>}
        {notice && <p className="account-message" role="status">{notice}</p>}

        {stage === 'email' ? (
          <form className="account-form" onSubmit={sendCode}>
            <label htmlFor="email">Email address</label>
            <div className="account-input-wrap"><span className="account-input-icon" aria-hidden="true"><Mail size={18} /></span><input id="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></div>
            <label htmlFor="password">Password</label>
            <div className="account-input-wrap"><span className="account-input-icon" aria-hidden="true"><LockKeyhole size={18} /></span><input id="password" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" /></div>
            <button className="account-submit" type="submit" disabled={loading}>{loading ? mode === 'signup' ? 'Creating account…' : 'Signing in…' : mode === 'signup' ? 'Create account' : 'Sign in'} <ArrowRight size={17} /></button>
          </form>
        ) : (
          <form className="account-form" onSubmit={verifyCode}>
            <label htmlFor="otp">Six digit code</label>
            <input className="account-code-input" id="otp" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={token} onChange={(event) => setToken(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" />
            <button className="account-submit" type="submit" disabled={loading || token.length !== 6}>{loading ? 'Checking code…' : 'Continue'} <ArrowRight size={17} /></button>
            <button className="account-text-button" type="button" onClick={resendCode} disabled={loading}>Send a new code</button>
            <button className="account-text-button" type="button" onClick={() => { setStage('email'); setToken(''); setNotice('') }}>Use another email</button>
          </form>
        )}

        {stage === 'email' && <div className="account-switch"><span>{mode === 'signup' ? 'Already have an account?' : 'New to A Lovers Card?'}</span><button type="button" onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError('') }}>{mode === 'signup' ? 'Sign in' : 'Create account'}</button></div>}
        {process.env.NODE_ENV !== 'production' && <button className="account-dev-bypass" type="button" onClick={useDevBypass}>Role preview</button>}
      </section>
      <style jsx>{`
        .account-page { min-height: 100svh; display: grid; place-items: center; padding: clamp(18px, 5vh, 48px) 18px; color: #E2B451; background: #1E4636; font-family: Manrope, Arial, sans-serif; }
        .account-card { position: relative; width: min(100%, 460px); padding: clamp(26px, 5vw, 42px); border: 1px solid rgba(226,180,81,.48); border-top: 3px solid #E2B451; border-radius: 12px; background: #3A2563; box-shadow: 0 22px 64px rgba(18,61,48,.42); }
        .account-back { min-height: 40px; display: inline-flex; align-items: center; gap: 8px; margin: -5px 0 29px -8px; padding: 0 8px; color: rgba(226,180,81,.88); font: 700 12px Manrope, sans-serif; text-decoration: none; transition: color .18s ease; }
        .account-back:hover { color: #F08A3C; }
        .account-eyebrow { margin: 0 0 12px; color: #F08A3C; font: 800 10px Manrope, sans-serif; letter-spacing: .17em; }
        h1 { margin: 0; color: #E2B451; font: 700 clamp(36px, 7vw, 46px)/1.04 'Cormorant Garamond', Georgia, serif; letter-spacing: -.02em; }
        .account-help { margin: 10px 0 27px; color: rgba(226,180,81,.84); font: 14px/1.55 Manrope, sans-serif; }
        .account-form { display: grid; gap: 11px; }
        .account-form label { color: #E2B451; font: 800 11px Manrope, sans-serif; }
        .account-input-wrap { position: relative; }
        .account-input-icon { position: absolute; z-index: 1; top: 50%; left: 15px; display: grid; place-items: center; color: #E2B451; pointer-events: none; transform: translateY(-50%); }
        input { width: 100%; min-height: 52px; padding: 12px 14px; border: 1px solid rgba(226,180,81,.48); border-radius: 5px; outline: 0; color: #E2B451; background: #1E4636; font: 13px Manrope, sans-serif; transition: border-color .18s ease, background .18s ease; }
        .account-input-wrap input { padding-left: 45px; }
        input::placeholder { color: rgba(226,180,81,.62); }
        input:focus { border-color: #E2B451; background: #1E4636; }
        input:focus-visible, button:focus-visible, a:focus-visible { outline: 3px solid #F08A3C; outline-offset: 3px; }
        .account-code-input { text-align: center; letter-spacing: .32em; font-size: 21px; }
        .account-submit { min-height: 52px; display: flex; justify-content: center; align-items: center; gap: 10px; margin-top: 7px; border: 0; border-radius: 5px; color: #1E4636; background: #F08A3C; font: 800 12px Manrope, sans-serif; cursor: pointer; transition: background .18s ease, transform .18s ease; }
        .account-submit:hover:not(:disabled) { background: #E2B451; transform: translateY(-1px); }
        .account-submit:disabled { cursor: wait; opacity: .7; }
        .account-switch { display: flex; align-items: center; justify-content: center; gap: 7px; flex-wrap: nowrap; margin-top: 22px; padding-top: 18px; border-top: 1px solid rgba(226,180,81,.22); color: rgba(226,180,81,.82); font: 12px/1.5 Manrope, sans-serif; text-align: center; }
        .account-switch span { flex: 0 1 auto; }
        .account-switch button, .account-text-button { min-height: 40px; flex: 0 0 auto; padding: 0 4px; border: 0; color: #E2B451; background: transparent; font: 800 12px Manrope, sans-serif; cursor: pointer; white-space: nowrap; }
        .account-switch button:hover, .account-text-button:hover:not(:disabled) { color: #F08A3C; }
        .account-text-button:disabled { cursor: wait; opacity: .65; }
        .account-text-button { justify-self: center; padding: 7px 10px; }
        .account-message { margin: 0 0 16px; padding: 11px 13px; border: 1px solid rgba(226,180,81,.38); color: #E2B451; background: #1E4636; font: 12px/1.5 Manrope, sans-serif; }
        .account-message.is-error { border-color: #F08A3C; color: #F08A3C; }
        .account-dev-bypass { display: block; min-height: 38px; margin: 15px auto 0; padding: 0 10px; border: 1px solid rgba(226,180,81,.3); border-radius: 4px; color: rgba(226,180,81,.78); background: transparent; font: 10px Manrope, sans-serif; cursor: pointer; transition: border-color .18s ease, color .18s ease; }
        .account-dev-bypass:hover { border-color: #E2B451; color: #E2B451; }
        @media (max-width: 420px) { .account-page { padding: 14px; } .account-card { padding: 25px 21px; border-radius: 9px; } .account-back { margin-bottom: 24px; } .account-help { margin-bottom: 23px; } .account-switch { gap: 5px; font-size: 11px; } .account-switch button { font-size: 11px; } }
      `}</style>
    </main>
  )
}

export default function AuthPage() {
  return <Suspense fallback={<main className="account-page" />}><AuthContent /></Suspense>
}
