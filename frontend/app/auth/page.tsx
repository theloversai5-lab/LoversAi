'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Mail, Heart, Briefcase, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type UserRole = 'couple' | 'planner' | 'vendor' | null

export default function AuthPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [step, setStep] = useState<'role' | 'auth'>('role')
  const [selectedRole, setSelectedRole] = useState<UserRole>(null)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role)
    setStep('auth')
  }

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (authMode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              role: selectedRole,
            },
          },
        })
        if (error) throw error
        
        // Redirect based on role
        if (selectedRole === 'planner') {
          router.push('/planner/leads')
        } else if (selectedRole === 'couple') {
          router.push('/couple/start')
        } else {
          router.push('/vendor/dashboard')
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        
        // Get user role and redirect
        const { data: userData } = await supabase.auth.getUser()
        const userRole = userData?.user?.user_metadata?.role
        
        if (userRole === 'planner') {
          router.push('/planner/leads')
        } else if (userRole === 'couple') {
          router.push('/couple/start')
        } else {
          router.push('/vendor/dashboard')
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleAuth = async () => {
    setLoading(true)
    setError('')

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })
      if (error) throw error
    } catch (err: any) {
      setError(err.message || 'An error occurred')
      setLoading(false)
    }
  }

  return (
    <main className="auth-page">
      <Link href="/" className="auth-back-btn">
        <ArrowLeft size={18} />
        <span>Back to home</span>
      </Link>

      <div className="auth-container">
        {step === 'role' ? (
          <div className="role-selection">
            <div className="auth-header">
              <span className="brand-mark">♜</span>
              <h1>Choose your path</h1>
              <p>Select how you want to use A Lovers Card</p>
            </div>

            <div className="role-cards-grid">
              <button
                type="button"
                className="role-card"
                onClick={() => handleRoleSelect('couple')}
              >
                <div className="role-icon">
                  <Heart size={32} />
                </div>
                <h3>Couple</h3>
                <p>Plan your wedding together</p>
              </button>

              <button
                type="button"
                className="role-card"
                onClick={() => handleRoleSelect('planner')}
              >
                <div className="role-icon">
                  <Briefcase size={32} />
                </div>
                <h3>Planner</h3>
                <p>Find leads and manage</p>
              </button>

              <button
                type="button"
                className="role-card"
                onClick={() => handleRoleSelect('vendor')}
              >
                <div className="role-icon">
                  <Users size={32} />
                </div>
                <h3>Vendor</h3>
                <p>Showcase your services</p>
              </button>
            </div>
          </div>
        ) : (
          <div className="auth-form-container">
            <button
              type="button"
              className="auth-back-step"
              onClick={() => setStep('role')}
            >
              <ArrowLeft size={16} />
              <span>Change role</span>
            </button>

            <div className="auth-header">
              <span className="brand-mark">♜</span>
              <h1>{authMode === 'signup' ? 'Create account' : 'Welcome back'}</h1>
              <p>
                {selectedRole === 'couple' && 'Start planning your dream wedding'}
                {selectedRole === 'planner' && 'Access your planner dashboard'}
                {selectedRole === 'vendor' && 'Manage your vendor profile'}
              </p>
            </div>

            <form onSubmit={handleEmailAuth} className="auth-form">
              {error && (
                <div className="auth-error">
                  {error}
                </div>
              )}

              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="your@email.com"
                  className="auth-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="auth-input"
                  minLength={6}
                />
              </div>

              <button
                type="submit"
                className="auth-submit-btn"
                disabled={loading}
              >
                <Mail size={18} />
                <span>{loading ? 'Please wait...' : authMode === 'signup' ? 'Sign up with email' : 'Sign in with email'}</span>
              </button>

              <div className="auth-divider">
                <span>or</span>
              </div>

              <button
                type="button"
                className="auth-google-btn"
                onClick={handleGoogleAuth}
                disabled={loading}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
                  <path d="M9.003 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.96v2.332C2.44 15.983 5.485 18 9.003 18z" fill="#34A853"/>
                  <path d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71 0-.593.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                  <path d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.428 0 9.003 0 5.485 0 2.44 2.017.96 4.958L3.967 7.29c.708-2.127 2.692-3.71 5.036-3.71z" fill="#EA4335"/>
                </svg>
                <span>Continue with Google</span>
              </button>

              <div className="auth-toggle">
                {authMode === 'signup' ? (
                  <p>
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setAuthMode('signin')}
                      className="auth-toggle-link"
                    >
                      Sign in
                    </button>
                  </p>
                ) : (
                  <p>
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setAuthMode('signup')}
                      className="auth-toggle-link"
                    >
                      Sign up
                    </button>
                  </p>
                )}
              </div>
            </form>
          </div>
        )}
      </div>
    </main>
  )
}
