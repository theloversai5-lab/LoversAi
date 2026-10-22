'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase, type UserRole } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/store/authStore'
import { Users, Calendar, Store, Mail, Lock, User, ArrowRight, AlertCircle } from 'lucide-react'
import Image from 'next/image'

function AuthContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const roleParam = searchParams.get('role') as UserRole | null
  const errorParam = searchParams.get('error')
  
  const [mode, setMode] = useState<'signin' | 'signup'>('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(errorParam ? 'Email confirmation failed. Please try signing in.' : '')
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [confirmationEmail, setConfirmationEmail] = useState('')
  
  const { setUser, setRole, role: storedRole } = useAuthStore()
  const role = roleParam || storedRole || 'couple'

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.push(getRedirectPath(role))
      }
    }
    checkAuth()

    // Listen for auth state changes (when user confirms email)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const userRole = (session.user.user_metadata.role as UserRole) || role
        setUser({
          id: session.user.id,
          email: session.user.email!,
          role: userRole,
          full_name: session.user.user_metadata.full_name,
          created_at: session.user.created_at,
        })
        setRole(userRole)
        router.push(getRedirectPath(userRole))
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const getRedirectPath = (userRole: UserRole) => {
    switch (userRole) {
      case 'couple': return '/couple'
      case 'planner': return '/planner'
      case 'vendor': return '/vendor'
      default: return '/couple'
    }
  }

  const getRoleInfo = (userRole: UserRole) => {
    switch (userRole) {
      case 'couple':
        return {
          icon: <Users size={20} strokeWidth={2.5} />,
          title: 'Couple',
          description: 'Plan your dream wedding',
          color: '#1E4636',
          goldColor: '#E2B451'
        }
      case 'planner':
        return {
          icon: <Calendar size={20} strokeWidth={2.5} />,
          title: 'Wedding Planner',
          description: 'Find couples and vendors',
          color: '#3A2563',
          goldColor: '#E2B451'
        }
      case 'vendor':
        return {
          icon: <Store size={20} strokeWidth={2.5} />,
          title: 'Wedding Vendor',
          description: 'Connect with couples',
          color: '#F08A3C',
          goldColor: '#E2B451'
        }
    }
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
            data: {
              full_name: fullName,
              role: role,
            }
          }
        })

        if (signUpError) throw signUpError

        // Show confirmation screen - user needs to verify email
        if (data.user && !data.session) {
          setConfirmationEmail(email)
          setShowConfirmation(true)
        } else if (data.session) {
          // Auto-confirmed (if email confirmation is disabled in Supabase)
          setUser({
            id: data.user!.id,
            email: data.user!.email!,
            role: role,
            full_name: fullName,
            created_at: new Date().toISOString(),
          })
          setRole(role)
          router.push(getRedirectPath(role))
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (signInError) throw signInError

        if (data.user) {
          const userRole = (data.user.user_metadata.role as UserRole) || role
          setUser({
            id: data.user.id,
            email: data.user.email!,
            role: userRole,
            full_name: data.user.user_metadata.full_name,
            created_at: data.user.created_at,
          })
          setRole(userRole)
          router.push(getRedirectPath(userRole))
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleAuth = async () => {
    setError('')
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?role=${role}`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        }
      })

      if (error) throw error
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed')
      setLoading(false)
    }
  }

  const handleBypass = () => {
    // Bypass auth for testing - set mock user and cookie
    setUser({
      id: 'bypass-user-' + Date.now(),
      email: 'test@example.com',
      role: role,
      full_name: 'Test User',
      created_at: new Date().toISOString(),
    })
    setRole(role)
    
    // Set bypass cookie for middleware
    document.cookie = `bypass_auth=true; path=/; max-age=86400` // 24 hours
    
    router.push(getRedirectPath(role))
  }

  const roleInfo = getRoleInfo(role)

  // Show email confirmation screen
  if (showConfirmation) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{
        background: role === 'couple' 
          ? '#1E4636'
          : role === 'planner'
          ? '#3A2563'
          : 'linear-gradient(180deg, #1E4636 0%, #3A2563 100%)'
      }}>
        <div className="w-full max-w-[420px]">
          <div style={{
            background: 'rgba(0, 0, 0, 0.25)',
            backdropFilter: 'blur(40px)',
            border: '1px solid rgba(226, 180, 81, 0.2)',
            borderRadius: '16px',
            padding: '36px 32px',
            textAlign: 'center'
          }}>
            {/* Success Icon */}
            <div style={{
              width: '56px',
              height: '56px',
              margin: '0 auto 20px',
              borderRadius: '50%',
              background: 'rgba(226, 180, 81, 0.15)',
              border: '2px solid rgba(226, 180, 81, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Mail size={28} style={{ color: '#E2B451' }} />
            </div>

            {/* Title */}
            <h1 style={{
              fontFamily: 'Cormorant Garamond, Georgia, serif',
              fontSize: '26px',
              fontWeight: 400,
              color: '#E2B451',
              marginBottom: '8px',
              letterSpacing: '0.02em'
            }}>
              Check your email
            </h1>

            {/* Description */}
            <p style={{
              fontFamily: 'Cormorant Garamond, Georgia, serif',
              fontSize: '14px',
              fontWeight: 300,
              color: 'rgba(226, 180, 81, 0.75)',
              marginBottom: '6px',
              lineHeight: '1.5'
            }}>
              We sent a confirmation link to
            </p>
            <p style={{
              fontFamily: 'Cormorant Garamond, Georgia, serif',
              fontSize: '15px',
              fontWeight: 500,
              color: '#E2B451',
              marginBottom: '24px'
            }}>
              {confirmationEmail}
            </p>

            {/* Instructions */}
            <div style={{
              padding: '16px',
              background: 'rgba(226, 180, 81, 0.08)',
              border: '1px solid rgba(226, 180, 81, 0.2)',
              borderRadius: '10px',
              marginBottom: '24px'
            }}>
              <p style={{
                fontFamily: 'Cormorant Garamond, Georgia, serif',
                fontSize: '13px',
                fontWeight: 300,
                color: 'rgba(226, 180, 81, 0.85)',
                lineHeight: '1.6',
                marginBottom: '10px'
              }}>
                Click the link in the email to verify your account. Once verified, you'll be automatically signed in.
              </p>
              <p style={{
                fontFamily: 'Cormorant Garamond, Georgia, serif',
                fontSize: '12px',
                fontWeight: 300,
                color: 'rgba(226, 180, 81, 0.6)',
                lineHeight: '1.5'
              }}>
                Didn't receive the email? Check your spam folder.
              </p>
            </div>

            {/* Back to sign in */}
            <button
              type="button"
              onClick={() => {
                setShowConfirmation(false)
                setMode('signin')
                setEmail('')
                setPassword('')
                setFullName('')
              }}
              style={{
                background: 'none',
                border: 'none',
                fontFamily: 'Cormorant Garamond, Georgia, serif',
                fontSize: '13px',
                fontWeight: 500,
                color: '#E2B451',
                cursor: 'pointer',
                transition: 'color 0.2s',
                padding: '8px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              ← Back to sign in
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{
      background: role === 'couple' 
        ? '#1E4636'
        : role === 'planner'
        ? '#3A2563'
        : 'linear-gradient(180deg, #1E4636 0%, #3A2563 100%)'
    }}>
      <div className="w-full max-w-[420px]">
        {/* Card */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.25)',
          backdropFilter: 'blur(40px)',
          border: '1px solid rgba(226, 180, 81, 0.2)',
          borderRadius: '16px',
          padding: '28px 32px'
        }}>
          
          {/* Title */}
          <div className="text-center mb-6">
            <h1 style={{
              fontFamily: 'Cormorant Garamond, Georgia, serif',
              fontSize: '26px',
              fontWeight: 400,
              color: '#E2B451',
              marginBottom: '6px',
              letterSpacing: '0.02em'
            }}>
              {mode === 'signup' ? 'Create account' : 'Welcome back'}
            </h1>
            <p style={{
              fontFamily: 'Cormorant Garamond, Georgia, serif',
              fontSize: '13px',
              fontWeight: 300,
              color: 'rgba(226, 180, 81, 0.75)',
              letterSpacing: '0.01em'
            }}>
              {mode === 'signup' ? 'Start planning your wedding' : 'Sign in to continue'}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              marginBottom: '14px',
              padding: '10px 12px',
              background: 'rgba(255, 100, 100, 0.1)',
              border: '1px solid rgba(255, 100, 100, 0.25)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px'
            }}>
              <AlertCircle size={16} style={{ color: '#ff6b6b', marginTop: '1px', flexShrink: 0 }} />
              <p style={{ 
                fontFamily: 'Cormorant Garamond, Georgia, serif',
                fontSize: '12px', 
                fontWeight: 300,
                color: '#ffb3b3', 
                lineHeight: '1.4' 
              }}>{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {mode === 'signup' && (
              <div>
                <label style={{
                  display: 'block',
                  fontFamily: 'Cormorant Garamond, Georgia, serif',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: '#E2B451',
                  marginBottom: '6px',
                  letterSpacing: '0.01em'
                }}>
                  Full name
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={16} style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'rgba(226, 180, 81, 0.35)'
                  }} />
                  <input
                    type="text"
                    className="auth-input"
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label style={{
                display: 'block',
                fontFamily: 'Cormorant Garamond, Georgia, serif',
                fontSize: '12px',
                fontWeight: 500,
                color: '#E2B451',
                marginBottom: '6px',
                letterSpacing: '0.01em'
              }}>
                Email
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'rgba(226, 180, 81, 0.35)'
                }} />
                <input
                  type="email"
                  className="auth-input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{
                display: 'block',
                fontFamily: 'Cormorant Garamond, Georgia, serif',
                fontSize: '12px',
                fontWeight: 500,
                color: '#E2B451',
                marginBottom: '6px',
                letterSpacing: '0.01em'
              }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'rgba(226, 180, 81, 0.35)'
                }} />
                <input
                  type="password"
                  className="auth-input"
                  placeholder={mode === 'signup' ? 'Create a strong password' : 'Enter your password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '11px 20px',
                marginTop: '4px',
                background: loading ? 'rgba(240, 138, 60, 0.6)' : '#F08A3C',
                border: 'none',
                borderRadius: '8px',
                fontFamily: 'Cormorant Garamond, Georgia, serif',
                fontSize: '14px',
                fontWeight: 600,
                color: '#1E4636',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.2s',
                letterSpacing: '0.01em'
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = 'translateY(-1px)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(240, 138, 60, 0.25)'
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              {loading ? (
                <>
                  <div style={{
                    width: '14px',
                    height: '14px',
                    border: '2px solid rgba(30, 70, 54, 0.25)',
                    borderTopColor: '#1E4636',
                    borderRadius: '50%',
                    animation: 'spin 0.6s linear infinite'
                  }} />
                  <span>Please wait...</span>
                </>
              ) : (
                <>
                  <span>{mode === 'signup' ? 'Create account' : 'Sign in'}</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            margin: '18px 0'
          }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(226, 180, 81, 0.2)' }} />
            <span style={{ 
              fontFamily: 'Cormorant Garamond, Georgia, serif',
              fontSize: '11px',
              fontWeight: 300,
              color: 'rgba(226, 180, 81, 0.5)' 
            }}>or</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(226, 180, 81, 0.2)' }} />
          </div>

          {/* Google OAuth */}
          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={loading}
            style={{
              width: '100%',
              padding: '10px 20px',
              background: 'rgba(0, 0, 0, 0.2)',
              border: '1px solid rgba(226, 180, 81, 0.25)',
              borderRadius: '8px',
              fontFamily: 'Cormorant Garamond, Georgia, serif',
              fontSize: '13px',
              fontWeight: 500,
              color: '#E2B451',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              transition: 'all 0.2s',
              letterSpacing: '0.01em'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.background = 'rgba(0, 0, 0, 0.35)'
                e.currentTarget.style.borderColor = 'rgba(226, 180, 81, 0.35)'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(0, 0, 0, 0.2)'
              e.currentTarget.style.borderColor = 'rgba(226, 180, 81, 0.25)'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          {/* Bypass Button (Development) */}
          <button
            type="button"
            onClick={handleBypass}
            style={{
              width: '100%',
              marginTop: '12px',
              padding: '10px 20px',
              background: 'rgba(240, 138, 60, 0.15)',
              border: '1px solid rgba(240, 138, 60, 0.3)',
              borderRadius: '8px',
              fontFamily: 'Cormorant Garamond, Georgia, serif',
              fontSize: '13px',
              fontWeight: 600,
              color: '#F08A3C',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              letterSpacing: '0.01em'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(240, 138, 60, 0.25)'
              e.currentTarget.style.borderColor = 'rgba(240, 138, 60, 0.5)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(240, 138, 60, 0.15)'
              e.currentTarget.style.borderColor = 'rgba(240, 138, 60, 0.3)'
            }}
          >
            <ArrowRight size={16} />
            Bypass (Dev Mode)
          </button>

          {/* Mode Toggle */}
          <div style={{ marginTop: '16px', textAlign: 'center' }}>
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'signup' ? 'signin' : 'signup')
                setError('')
              }}
              style={{
                background: 'none',
                border: 'none',
                fontFamily: 'Cormorant Garamond, Georgia, serif',
                fontSize: '12px',
                fontWeight: 300,
                color: 'rgba(226, 180, 81, 0.7)',
                cursor: 'pointer',
                transition: 'color 0.2s',
                letterSpacing: '0.01em'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#E2B451'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(226, 180, 81, 0.7)'}
            >
              {mode === 'signup' ? 'Already have an account? ' : "Don't have an account? "}
              <span style={{ fontWeight: 600, color: '#E2B451' }}>
                {mode === 'signup' ? 'Sign in' : 'Sign up'}
              </span>
            </button>
          </div>

          {/* Back to Home */}
          <div style={{ marginTop: '12px', textAlign: 'center' }}>
            <button
              type="button"
              onClick={() => router.push('/')}
              style={{
                background: 'none',
                border: 'none',
                fontFamily: 'Cormorant Garamond, Georgia, serif',
                fontSize: '11px',
                fontWeight: 300,
                color: 'rgba(226, 180, 81, 0.5)',
                cursor: 'pointer',
                transition: 'color 0.2s',
                letterSpacing: '0.01em'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(226, 180, 81, 0.7)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(226, 180, 81, 0.5)'}
            >
              ← Back to home
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .auth-input {
          width: 100%;
          padding: 10px 14px 10px 42px;
          background: rgba(0, 0, 0, 0.25);
          border: 1px solid rgba(226, 180, 81, 0.25);
          border-radius: 8px;
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 13px;
          font-weight: 300;
          color: #E2B451;
          outline: none;
          transition: all 0.2s;
          letter-spacing: 0.01em;
        }
        .auth-input::placeholder {
          color: rgba(226, 180, 81, 0.35);
          font-weight: 300;
        }
        .auth-input:focus {
          background: rgba(0, 0, 0, 0.35);
          border-color: rgba(226, 180, 81, 0.45);
        }
      `}</style>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-emerald-900 to-emerald-950 flex items-center justify-center"><div className="text-gold">Loading...</div></div>}>
      <AuthContent />
    </Suspense>
  )
}
