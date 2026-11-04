import { useCallback, useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase, supabaseConfigured } from '../lib/supabase'

export type WeddingRole = 'admin' | 'ceremonialist'
type AccessState = 'checking' | 'local' | 'signed_out' | 'ready' | 'denied' | 'error' | 'password_recovery'
type Member = { user_id: string; email: string; name: string; role: WeddingRole; active: boolean }
const isRecoveryUrl = () => new URLSearchParams(window.location.hash.slice(1)).get('type') === 'recovery'

export function useSessionAccess() {
  const [state, setState] = useState<AccessState>(() => !supabaseConfigured ? 'local' : isRecoveryUrl() ? 'password_recovery' : 'checking')
  const [member, setMember] = useState<Member | null>(null)
  const [message, setMessage] = useState('')

  const resolveUser = useCallback(async (user: User | null) => {
    if (!user || !supabase) { setMember(null); setState('signed_out'); return }
    const { data, error } = await supabase.from('wedding_members')
      .select('user_id,email,name,role,active').eq('user_id', user.id).maybeSingle()
    if (error) { setMessage('Não foi possível validar esta conta. Confira as permissões do Supabase.'); setState('error'); return }
    if (!data || !data.active || !['admin', 'ceremonialist'].includes(data.role)) {
      setMember(null)
      setMessage('Esta conta ainda não tem acesso ao planejador. Peça a um administrador para verificar o cadastro.')
      setState('denied')
      return
    }
    setMember(data as Member)
    setMessage('')
    setState('ready')
  }, [])

  useEffect(() => {
    if (!supabase) return
    let alive = true
    const recoveryFlow = isRecoveryUrl()
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!alive) return
      if (error) { setMessage('Não foi possível validar a sessão. Tente entrar novamente.'); setState('error'); return }
      if (recoveryFlow) { setState('password_recovery'); return }
      if (data.session) void resolveUser(data.session.user)
      else setState('signed_out')
    })
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!alive) return
      if (event === 'PASSWORD_RECOVERY') { setMessage(''); setState('password_recovery'); return }
      if (session) window.setTimeout(() => { if (alive && !isRecoveryUrl()) void resolveUser(session.user) }, 0)
      else { setMember(null); setState('signed_out') }
    })
    return () => { alive = false; listener.subscription.unsubscribe() }
  }, [resolveUser])

  const signIn = async (email: string, password: string) => {
    if (!supabase) return
    setMessage('')
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) setMessage('E-mail ou senha incorretos. Confira os dados e tente novamente.')
  }

  const requestPasswordReset = async (email: string) => {
    if (!supabase) return false
    setMessage('')
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}` })
    if (error) { setMessage('Não foi possível solicitar a recuperação agora. Tente novamente em instantes.'); return false }
    setMessage('Se este e-mail estiver cadastrado, você receberá um link para criar outra senha.')
    return true
  }

  const updatePassword = async (password: string) => {
    if (!supabase) return false
    setMessage('')
    const { data, error } = await supabase.auth.updateUser({ password })
    if (error || !data.user) { setMessage('Não foi possível salvar a senha. Solicite um novo link e tente novamente.'); return false }
    window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.search}`)
    await resolveUser(data.user)
    return true
  }

  const signOut = async () => { if (supabase) await supabase.auth.signOut() }
  return { state, member, message, signIn, requestPasswordReset, updatePassword, signOut }
}
