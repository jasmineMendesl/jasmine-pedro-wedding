import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (request.method !== 'POST') return json({ error: 'Método não permitido.' }, 405)
  const url = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const authorization = request.headers.get('Authorization')
  if (!url || !serviceKey || !authorization) return json({ error: 'Configuração ou sessão ausente.' }, 401)

  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const token = authorization.replace(/^Bearer\s+/i, '')
  const { data: callerData, error: callerError } = await admin.auth.getUser(token)
  if (callerError || !callerData.user) return json({ error: 'Sessão inválida.' }, 401)
  const { data: caller } = await admin.from('wedding_members').select('role,active').eq('user_id', callerData.user.id).maybeSingle()
  if (caller?.role !== 'admin' || !caller.active) return json({ error: 'Apenas administradores podem gerenciar acessos.' }, 403)

  const body = await request.json().catch(() => ({}))
  if (body.action === 'list') {
    const { data, error } = await admin.from('wedding_members').select('user_id,email,name,role,active').order('created_at')
    return error ? json({ error: error.message }, 400) : json({ members: data })
  }
  if (body.action === 'invite') {
    const email = String(body.email ?? '').trim().toLowerCase()
    const name = String(body.name ?? '').trim()
    const role = body.role === 'admin' || body.role === 'ceremonialist' ? body.role : null
    if (!email || !name || !role) return json({ error: 'Nome, e-mail e perfil são obrigatórios.' }, 400)
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { data: { name } })
    if (error || !data.user) return json({ error: error?.message ?? 'Não foi possível enviar o convite.' }, 400)
    const { error: saveError } = await admin.from('wedding_members').upsert({ user_id: data.user.id, email, name, role, active: true })
    return saveError ? json({ error: saveError.message }, 400) : json({ ok: true })
  }
  if (body.action === 'set-role' || body.action === 'set-active') {
    const userId = String(body.userId ?? '')
    if (!userId) return json({ error: 'Usuário inválido.' }, 400)
    if (userId === callerData.user.id && (body.action === 'set-active' && body.active === false || body.action === 'set-role' && body.role !== 'admin')) return json({ error: 'Não é possível remover o próprio acesso de administrador.' }, 400)
    if (body.action === 'set-role') {
      if (!['admin', 'ceremonialist'].includes(body.role)) return json({ error: 'Perfil inválido.' }, 400)
      const { data: target } = await admin.from('wedding_members').select('role,active').eq('user_id', userId).maybeSingle()
      if (target?.role === 'admin' && target.active && body.role !== 'admin') {
        const { count } = await admin.from('wedding_members').select('*', { count: 'exact', head: true }).eq('role', 'admin').eq('active', true)
        if ((count ?? 0) <= 1) return json({ error: 'Mantenha pelo menos um administrador ativo.' }, 400)
      }
      const { error } = await admin.from('wedding_members').update({ role: body.role }).eq('user_id', userId)
      return error ? json({ error: error.message }, 400) : json({ ok: true })
    }
    if (typeof body.active !== 'boolean') return json({ error: 'Estado de acesso inválido.' }, 400)
    const { data: target } = await admin.from('wedding_members').select('role,active').eq('user_id', userId).maybeSingle()
    if (target?.role === 'admin' && target.active && !body.active) {
      const { count } = await admin.from('wedding_members').select('*', { count: 'exact', head: true }).eq('role', 'admin').eq('active', true)
      if ((count ?? 0) <= 1) return json({ error: 'Mantenha pelo menos um administrador ativo.' }, 400)
    }
    const { error } = await admin.from('wedding_members').update({ active: body.active }).eq('user_id', userId)
    return error ? json({ error: error.message }, 400) : json({ ok: true })
  }
  return json({ error: 'Ação desconhecida.' }, 400)
})
