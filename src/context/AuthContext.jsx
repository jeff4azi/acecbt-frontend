import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import api from '../lib/api'

const AuthContext = createContext(null)

const DEV_ROLE_KEY = 'ace_edu_dev_role'
const VALID_DEV_ROLES = ['student', 'creator', 'admin']

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)   // { id, full_name, email, is_admin } from /api/me
  const [loading, setLoading] = useState(true)   // true while initializing (session + profile loading)
  const [devRole, setDevRole] = useState(() => {
    if (typeof window === 'undefined') return null
    const stored = window.localStorage.getItem(DEV_ROLE_KEY)
    return VALID_DEV_ROLES.includes(stored) ? stored : null
  })

  const loadProfile = useCallback(async (activeSession) => {
    if (!activeSession?.access_token) {
      setProfile(null)
      setLoading(false)
      return
    }
    try {
      const res = await api.get('/me')
      setProfile(res.data ?? null)
    } catch (err) {
      const code = err?.response?.data?.code
      if (code === 'MISSING_TOKEN' || code === 'TOKEN_EXPIRED' || code === 'INVALID_TOKEN') {
        // Session is toast — clear everything
        setProfile(null)
        setSession(null)
        await supabase.auth.signOut().catch(() => {})
      } else {
        // Network/server issue — leave profile null but keep session
        console.warn('[Auth] Failed to load /api/me profile:', err?.message || err)
        setProfile(null)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Initial session + profile load ────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data } = await supabase.auth.getSession()
      if (cancelled) return
      setSession(data.session)
      if (data.session) {
        await loadProfile(data.session)
      } else {
        setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [loadProfile])

  // ── React to auth state changes (login, logout, token refresh, etc.) ──────
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      if (newSession) {
        setLoading(true)
        loadProfile(newSession)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })
    return () => listener.subscription.unsubscribe()
  }, [loadProfile])

  // ── Derived admin flag, with Dev Role Switcher override ───────────────────
  //   - devRole 'admin' forces isAdmin=true (useful for testing without an
  //     admin account / before the backend is connected)
  //   - devRole 'student' forces isAdmin=false even if backend says admin
  //   - devRole null or 'creator' => trust the backend is_admin from profile
  const isAdmin = useMemo(() => {
    if (devRole === 'admin') return true
    if (devRole === 'student') return false
    return profile?.is_admin === true
  }, [profile, devRole])

  const user = session?.user ?? null

  // Expose the enriched user object with profile info merged in so
  // existing code that reads user.user_metadata.full_name etc still works
  const enrichedUser = useMemo(() => {
    if (!user) return null
    const next = { ...user }
    if (profile?.full_name) {
      next.user_metadata = {
        ...(next.user_metadata || {}),
        full_name: profile.full_name,
      }
    }
    if (profile?.email) {
      next.email = profile.email
    }
    next.is_admin = isAdmin
    return next
  }, [user, profile, isAdmin])

  // ── Dev Role Switcher (per user's workflow) ───────────────────────────────
  const cycleDevRole = useCallback(() => {
    setDevRole((prev) => {
      const order = [null, 'student', 'creator', 'admin']
      const idx = order.indexOf(prev)
      const next = order[(idx + 1) % order.length]
      if (next === null) {
        window.localStorage.removeItem(DEV_ROLE_KEY)
      } else {
        window.localStorage.setItem(DEV_ROLE_KEY, next)
      }
      return next
    })
  }, [])

  const setDevRolePersisted = useCallback((role) => {
    if (role === null) {
      window.localStorage.removeItem(DEV_ROLE_KEY)
      setDevRole(null)
    } else if (VALID_DEV_ROLES.includes(role)) {
      window.localStorage.setItem(DEV_ROLE_KEY, role)
      setDevRole(role)
    }
  }, [])

  const signOut = useCallback(async () => {
    window.localStorage.removeItem(DEV_ROLE_KEY)
    setDevRole(null)
    await supabase.auth.signOut().catch(() => {})
    setProfile(null)
    setSession(null)
  }, [])

  const value = {
    // auth state
    session,
    user: enrichedUser,
    profile,
    isAdmin,
    loading,
    // auth actions
    signOut,
    // dev role switcher — user workflow: cycle for quick role previews
    devRole,
    setDevRole: setDevRolePersisted,
    cycleDevRole,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
