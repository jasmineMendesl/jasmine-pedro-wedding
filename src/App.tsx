import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Check, CheckSquare, ChevronRight, ClipboardCheck, ContactRound, Download, Flower2, Heart, House, KeyRound, ListChecks, LogOut, MapPin, Plus, ShieldCheck, Sun, Trash2, Users, X } from 'lucide-react'
import { useWeddingData } from './hooks/useWeddingData'
import { useSessionAccess } from './hooks/useSessionAccess'
import type { ScheduleEntry, Task, Vendor } from './types'

type Page = 'Início' | 'Checklist' | 'Fornecedores' | 'Cronograma' | 'Véspera' | 'Cerimonial'
const pages: { label: Page; icon: typeof Heart; short: string }[] = [
  { label: 'Início', icon: House, short: 'Início' },
  { label: 'Checklist', icon: ListChecks, short: 'Tarefas' },
  { label: 'Fornecedores', icon: ContactRound, short: 'Equipe' },
  { label: 'Cronograma', icon: CalendarDays, short: 'Dia 17/11' },
  { label: 'Véspera', icon: Sun, short: 'Véspera' },
]
const ceremonyPage = { label: 'Cerimonial' as const, icon: ClipboardCheck, short: 'Cerimonial' }
const allPages = [...pages, ceremonyPage]
const pageSlugs: Record<Page, string> = {
  'Início': '',
  Checklist: 'checklist',
  Fornecedores: 'fornecedores',
  Cronograma: 'cronograma',
  Véspera: 'vespera',
  Cerimonial: 'checklist-cerimonial',
}
const pageFromLocation = (): Page => {
  const baseUrl = import.meta.env.BASE_URL
  const pathname = window.location.pathname
  const pathWithinApp = pathname.startsWith(baseUrl) ? pathname.slice(baseUrl.length) : pathname.replace(/^\/+/, '')
  const slug = pathWithinApp.replace(/\/+$/, '')
  return allPages.find(({ label }) => pageSlugs[label] === slug)?.label ?? 'Início'
}
const visibleTask = (task: Task) => task.category?.toLocaleLowerCase('pt-BR') !== 'financeiro'
const taskDone = (task: Task) => task.done || task.status === 'completed'
const weddingDate = new Date(2026, 10, 17)
const daysUntilWedding = () => Math.ceil((new Date(weddingDate.getFullYear(), weddingDate.getMonth(), weddingDate.getDate()).getTime() - new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).getTime()) / 86_400_000)
const localDateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const formatDate = (value: string) => value ? new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''
const formatWhen = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
const whatsappHref = (phone = '') => {
  const digits = phone.replace(/\D/g, '')
  const internationalNumber = digits.startsWith('55') ? digits : `55${digits}`
  const message = encodeURIComponent('Ola, faço parte do cerimonial da Jasmine Mendes.')
  return `https://wa.me/${internationalNumber}?text=${message}`
}

export default function App() {
  // Acesso anônimo temporário habilitado enquanto o site é usado sem contas.
  // Defina VITE_ENABLE_AUTH=true quando login e membros estiverem prontos no Supabase.
  if (import.meta.env.VITE_ENABLE_AUTH !== 'true') {
    return <Workspace memberName="" onSignOut={async () => undefined}/>
  }
  return <AuthenticatedApp/>
}

function AuthenticatedApp() {
  const access = useSessionAccess()
  if (access.state === 'local') return <Workspace memberName="Planejamento local" onSignOut={async () => undefined}/>
  if (access.state === 'checking') return <div className="loading-screen"><Flower2 size={28}/><span>Verificando seu acesso...</span></div>
  if (access.state === 'signed_out') return <Login message={access.message} onSignIn={access.signIn} onReset={access.requestPasswordReset}/>
  if (access.state === 'password_recovery') return <PasswordRecovery message={access.message} onSave={access.updatePassword}/>
  if (access.state === 'denied' || access.state === 'error') return <AccessBlocked message={access.message} onSignOut={access.signOut}/>
  return <Workspace memberName={access.member?.name ?? 'Planejamento'} onSignOut={access.signOut}/>
}

function Login({ message, onSignIn, onReset }: { message: string; onSignIn: (email: string, password: string) => Promise<void>; onReset: (email: string) => Promise<boolean> }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'reset'>('login')
  const [busy, setBusy] = useState(false)
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true)
    try { if (mode === 'login') await onSignIn(email, password); else await onReset(email) } finally { setBusy(false) }
  }
  return <main className="auth-screen"><div className="auth-card"><div className="auth-flower"><Flower2 size={34}/></div><span className="script-label">com amor,</span><h1>Jasmine & Pedro</h1><p>{mode === 'login' ? 'Entre para acompanhar os detalhes do grande dia.' : 'Informe seu e-mail e enviaremos um link para criar outra senha.'}</p><form onSubmit={submit}><label>E-mail<input type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@email.com"/></label>{mode === 'login' && <label>Senha<input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)}/></label>}{message && <p className="form-error">{message}</p>}<button className="primary-button touch-button" disabled={busy}>{busy ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Enviar link de recuperação'}</button></form><button className="auth-link" onClick={() => { setMode(mode === 'login' ? 'reset' : 'login') }}>{mode === 'login' ? 'Esqueci minha senha' : 'Voltar ao login'}</button></div></main>
}

function PasswordRecovery({ message, onSave }: { message: string; onSave: (password: string) => Promise<boolean> }) {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [localError, setLocalError] = useState('')
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (password.length < 8) { setLocalError('Use uma senha com pelo menos 8 caracteres.'); return }
    if (password !== confirmation) { setLocalError('As senhas não coincidem.'); return }
    setBusy(true); setLocalError('')
    try { await onSave(password) } finally { setBusy(false) }
  }
  return <main className="auth-screen"><div className="auth-card"><div className="auth-flower"><KeyRound size={32}/></div><span className="script-label">quase lá,</span><h1>Crie sua senha</h1><p>Escolha uma senha nova para entrar no planejador.</p><form onSubmit={submit}><label>Nova senha<input required type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} minLength={8}/></label><label>Confirmar senha<input required type="password" autoComplete="new-password" value={confirmation} onChange={e => setConfirmation(e.target.value)}/></label>{(localError || message) && <p className="form-error">{localError || message}</p>}<button className="primary-button touch-button" disabled={busy}>{busy ? 'Salvando…' : 'Salvar senha'}</button></form></div></main>
}

function AccessBlocked({ message, onSignOut }: { message: string; onSignOut: () => Promise<void> }) {
  return <main className="auth-screen"><div className="auth-card"><ShieldCheck size={32}/><h1>Acesso não liberado</h1><p>{message || 'Esta conta ainda não tem acesso ao planejador.'}</p><button className="secondary-button touch-button" onClick={() => void onSignOut()}>Voltar ao login</button></div></main>
}

function Workspace({ memberName, onSignOut }: { memberName: string; onSignOut: () => Promise<void> }) {
  const { data, setData, syncStatus, syncConflict, resolveSyncConflict } = useWeddingData()
  const [page, setPage] = useState<Page>(pageFromLocation)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [taskModal, setTaskModal] = useState(false)
  const [taskDay, setTaskDay] = useState<'planning' | 'eve' | 'wedding'>('planning')
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null)
  const [vendorModal, setVendorModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState<ScheduleEntry | null>(null)
  const [eventModal, setEventModal] = useState(false)
  const [editingCeremonyTask, setEditingCeremonyTask] = useState<Task | null>(null)
  const [ceremonyTaskModal, setCeremonyTaskModal] = useState(false)
  const tasks = useMemo(() => data.tasks.filter(visibleTask), [data.tasks])
  const ceremonyTasks = Array.isArray(data.ceremonialTasks) ? data.ceremonialTasks : []
  const navigationPages = allPages
  const pending = tasks.filter(task => !taskDone(task))
  const completed = tasks.filter(taskDone)
  const saveTask = (task: Task) => setData(d => ({ ...d, tasks: d.tasks.some(t => t.id === task.id) ? d.tasks.map(t => t.id === task.id ? { ...t, ...task } : t) : [...d.tasks, task] }))
  const deleteTask = (id: string) => setData(d => ({ ...d, tasks: d.tasks.filter(t => t.id !== id) }))
  const toggleTask = (task: Task) => setData(d => ({ ...d, tasks: d.tasks.map(t => t.id === task.id ? { ...t, done: !taskDone(t), status: taskDone(t) ? 'pending' : 'completed' } : t) }))
  const saveCeremonyTask = (task: Task) => setData(d => {
    const currentTasks = Array.isArray(d.ceremonialTasks) ? d.ceremonialTasks : []
    return { ...d, ceremonialTasks: currentTasks.some(item => item.id === task.id) ? currentTasks.map(item => item.id === task.id ? { ...item, ...task } : item) : [...currentTasks, task] }
  })
  const deleteCeremonyTask = (id: string) => setData(d => ({ ...d, ceremonialTasks: (Array.isArray(d.ceremonialTasks) ? d.ceremonialTasks : []).filter(task => task.id !== id) }))
  const toggleCeremonyTask = (task: Task) => setData(d => ({ ...d, ceremonialTasks: (Array.isArray(d.ceremonialTasks) ? d.ceremonialTasks : []).map(item => item.id === task.id ? { ...item, done: !taskDone(item), status: taskDone(item) ? 'pending' : 'completed' } : item) }))
  const saveVendor = (vendor: Vendor) => setData(d => ({ ...d, vendors: d.vendors.some(v => v.id === vendor.id) ? d.vendors.map(v => v.id === vendor.id ? { ...v, ...vendor } : v) : [...d.vendors, vendor] }))
  const saveEvent = (entry: ScheduleEntry) => setData(d => ({ ...d, schedule: [...(d.schedule ?? []).filter(e => e.id !== entry.id), entry].sort((a, b) => a.time.localeCompare(b.time)) }))
  const openNewTask = (day: 'planning' | 'eve' | 'wedding' = 'planning') => { setTaskDay(day); setEditingTask(null); setTaskModal(true) }
  const navigateToPage = (nextPage: Page) => {
    const nextPath = `${import.meta.env.BASE_URL}${pageSlugs[nextPage]}`
    if (window.location.pathname !== nextPath) window.history.pushState({ page: nextPage }, '', nextPath)
    setPage(nextPage)
  }

  useEffect(() => {
    const handlePopState = () => setPage(pageFromLocation())
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  if (syncStatus === 'connecting') return <div className="loading-screen"><Flower2 size={28}/><span>Carregando o planejamento...</span></div>

  return <div className="app-shell">
    <aside className="sidebar"><div className="brand"><span className="brand-mark"><Flower2 size={21}/></span><span>Jasmine <i>&</i> Pedro<small>WEDDING PLANNER</small></span></div><div className="side-caption">PLANEJAMENTO</div><nav>{navigationPages.map(({ label, icon: Icon }) => <button key={label} className={`nav-item ${page === label ? 'active' : ''}`} onClick={() => navigateToPage(label)}><Icon size={19}/><span>{label}</span>{page === label && <span className="nav-dot"/>}</button>)}</nav><div className="sidebar-bottom"><div className="love-note"><Heart size={17}/><p>Um dia para celebrar<br/>uma vida inteira.</p></div><span>FEITO COM CARINHO</span></div></aside>
    <main className="main-area"><header className="topbar"><div className="breadcrumb">JASMINE & PEDRO <ChevronRight size={14}/><span>{page.toLocaleUpperCase('pt-BR')}</span></div><div className="topbar-right"><span className={`sync-indicator ${syncStatus}`}><i/><span className="sync-desktop">{syncStatus === 'saving' ? 'Salvando…' : syncStatus === 'synced' ? 'Sincronizado' : syncStatus === 'conflict' ? 'Conflito de sincronização' : syncStatus === 'error' ? 'Falha ao sincronizar' : 'Somente neste dispositivo'}</span><span className="sync-mobile">{syncStatus === 'saving' ? 'Salvando' : syncStatus === 'synced' ? 'OK' : syncStatus === 'conflict' ? 'Conflito' : syncStatus === 'error' ? 'Erro' : 'Local'}</span></span><InstallAppButton/>{memberName && memberName !== 'Planejamento local' && <button className="account-button" onClick={() => void onSignOut()} title={`Sair de ${memberName}`} aria-label="Sair"><span>{memberName.slice(0, 1).toLocaleUpperCase('pt-BR')}</span><LogOut size={15}/></button>}</div></header>
      {syncConflict && <section className="sync-conflict" role="alert"><div><strong>Há alterações em outro dispositivo.</strong><span>Escolha qual versão manter para evitar sobrescrever dados.</span></div><div><button onClick={() => resolveSyncConflict('remote')}>Usar versão do Supabase</button><button onClick={() => resolveSyncConflict('local')}>Manter esta versão</button></div></section>}
      {page === 'Início' && <Dashboard data={data} tasks={tasks} pending={pending} completed={completed} schedule={data.schedule ?? []} setPage={navigateToPage} onToggle={toggleTask} onAdd={() => openNewTask()}/ >}
      {page === 'Checklist' && <Checklist tasks={tasks} onToggle={toggleTask} onAdd={() => openNewTask()} onEdit={task => { setEditingTask(task); setTaskModal(true) }}/ >}
      {page === 'Fornecedores' && <Vendors vendors={data.vendors} onAdd={() => { setEditingVendor(null); setVendorModal(true) }} onEdit={vendor => { setEditingVendor(vendor); setVendorModal(true) }}/ >}
      {page === 'Cronograma' && <SchedulePage entries={data.schedule ?? []} onAdd={() => { setEditingEvent(null); setEventModal(true) }} onEdit={entry => { setEditingEvent(entry); setEventModal(true) }}/ >}
      {page === 'Véspera' && <EvePage tasks={tasks.filter(task => task.day === 'eve')} onToggle={toggleTask} onAdd={() => openNewTask('eve')} onEdit={task => { setEditingTask(task); setTaskModal(true) }}/ >}
      {page === 'Cerimonial' && <CeremonyChecklist tasks={ceremonyTasks} onToggle={toggleCeremonyTask} onAdd={() => { setEditingCeremonyTask(null); setCeremonyTaskModal(true) }} onEdit={task => { setEditingCeremonyTask(task); setCeremonyTaskModal(true) }}/ >}
    </main>
    <nav className="mobile-nav mobile-nav-ceremony" aria-label="Navegação principal">{navigationPages.map(({ label, icon: Icon, short }) => <button key={label} onClick={() => navigateToPage(label)} className={page === label ? 'selected' : ''}><Icon size={21}/><span>{short}</span></button>)}</nav>
    {taskModal && <TaskModal task={editingTask} initialDay={taskDay} onClose={() => setTaskModal(false)} onSave={task => { saveTask(task); setTaskModal(false) }} onDelete={deleteTask}/ >}
    {vendorModal && <VendorModal vendor={editingVendor} onClose={() => setVendorModal(false)} onSave={vendor => { saveVendor(vendor); setVendorModal(false) }}/ >}
    {eventModal && <ScheduleModal entry={editingEvent} onClose={() => setEventModal(false)} onSave={entry => { saveEvent(entry); setEventModal(false) }}/ >}
    {ceremonyTaskModal && <CeremonyTaskModal task={editingCeremonyTask} onClose={() => setCeremonyTaskModal(false)} onSave={task => { saveCeremonyTask(task); setCeremonyTaskModal(false) }} onDelete={deleteCeremonyTask}/ >}
  </div>
}

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }> }

function InstallAppButton() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
    setInstalled(standalone)
    const onPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as InstallPromptEvent)
    }
    const onInstalled = () => { setInstalled(true); setInstallPrompt(null) }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (installed) return null
  const install = async () => {
    if (!installPrompt) { setShowHelp(true); return }
    await installPrompt.prompt()
    const choice = await installPrompt.userChoice
    if (choice.outcome === 'accepted') setInstalled(true)
    setInstallPrompt(null)
  }
  const isAppleMobile = /iphone|ipad|ipod/i.test(navigator.userAgent)

  return <>
    <button className="install-button" onClick={() => void install()} title="Adicionar à tela inicial"><Download size={16}/><span>Instalar app</span></button>
    {showHelp && <Modal onClose={() => setShowHelp(false)}><div className="install-help"><div className="eyebrow">ACESSO RÁPIDO</div><h2>Adicione à tela inicial</h2><p>{isAppleMobile ? 'No Safari, toque em Compartilhar e escolha “Adicionar à Tela de Início”.' : 'No menu do navegador, escolha “Instalar app” ou “Adicionar à tela inicial”.'}</p><button className="primary-button touch-button modal-submit" onClick={() => setShowHelp(false)}>Entendi</button></div></Modal>}
  </>
}

function PageHeading({ eyebrow, title, text, action }: { eyebrow: string; title: string; text: string; action?: React.ReactNode }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{text}</p></div>{action}</div>
}

function Dashboard({ data, tasks, pending, completed, schedule, setPage, onToggle, onAdd }: { data: ReturnType<typeof useWeddingData>['data']; tasks: Task[]; pending: Task[]; completed: Task[]; schedule: ScheduleEntry[]; setPage: (page: Page) => void; onToggle: (task: Task) => void; onAdd: () => void }) {
  const todayKey = localDateKey(new Date())
  const upcoming = [
    ...pending.filter(task => task.dueDate && task.dueDate >= todayKey).map(task => ({ id: task.id, title: task.title, date: task.dueDate, time: '', details: task.assignee ? `Responsável: ${task.assignee}` : 'Tarefa do checklist', task })),
    ...schedule.filter(() => '2026-11-17' >= todayKey).map(entry => ({ id: entry.id, title: entry.title, date: '2026-11-17', time: entry.time, details: entry.responsible ? `Responsável: ${entry.responsible}` : entry.details, task: undefined })),
  ].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)).slice(0, 4)
  const days = daysUntilWedding()
  const progress = tasks.length ? Math.round(completed.length / tasks.length * 100) : 0
  return <div className="content"><PageHeading eyebrow="UM DIA PARA CELEBRAR UMA VIDA INTEIRA" title="Nosso grande dia" text="Os detalhes que estamos planejando juntos."/>
    <section className="hero-card"><div className="hero-copy"><span className="script-label">com amor,</span><h2>{data.couple}</h2><div className="hero-meta"><span><CalendarDays size={17}/>{data.date ? new Date(`${data.date}T12:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }) : '17 de novembro de 2026'}</span><span><MapPin size={17}/>{data.venue || 'Local a definir'}</span></div></div><FloralArtwork/><div className="hero-date"><span>FALTAM</span><strong>{days > 0 ? days : days === 0 ? '0' : '♥'}</strong><small>{days > 0 ? 'dias para o sim' : days === 0 ? 'é hoje!' : 'viva o amor'}</small><Heart size={18}/></div></section>
    <div className="stats-grid dashboard-stats"><Stat icon={<CheckSquare size={20}/>} label="CONCLUÍDAS" value={completed.length} detail={`de ${tasks.length} tarefas`} accent="rose"/><Stat icon={<ListChecks size={20}/>} label="PENDENTES" value={pending.length} detail="para organizar" accent="tan"/><Stat icon={<Users size={20}/>} label="FORNECEDORES" value={data.vendors.length} detail="contatos cadastrados" accent="wine"/><Stat icon={<CalendarDays size={20}/>} label="CONTAGEM REGRESSIVA" value={days > 0 ? days : days === 0 ? 'Hoje' : '♥'} detail={days > 0 ? 'dias · 17 nov 2026' : '17 de novembro de 2026'} accent="rose"/></div>
    <section className="progress-panel"><div><div><span>PROGRESSO DO CHECKLIST</span><strong>{progress}%</strong></div><div className="progress-track"><i style={{ width: `${progress}%` }}/></div></div></section>
    <div className="quick-access"><button onClick={() => setPage('Checklist')}><ListChecks size={20}/><span>Checklist</span><ChevronRight size={17}/></button><button onClick={() => setPage('Fornecedores')}><ContactRound size={20}/><span>Fornecedores</span><ChevronRight size={17}/></button><button onClick={() => setPage('Cronograma')}><CalendarDays size={20}/><span>Cronograma</span><ChevronRight size={17}/></button><button onClick={() => setPage('Véspera')}><Sun size={20}/><span>Véspera · 16/11</span><ChevronRight size={17}/></button></div>
    <div className="section-row"><div><div className="eyebrow">AGENDA E PRAZOS</div><h3>Próximos compromissos</h3></div><button className="text-link" onClick={() => setPage('Cronograma')}>Cronograma <ChevronRight size={17}/></button></div>
    <section className="task-card upcoming-list">{upcoming.length ? upcoming.map(item => <div className="upcoming-item" key={`${item.date}-${item.id}`}><span className="upcoming-date">{formatWhen(item.date)}{item.time && <small>{item.time}</small>}</span><span className="upcoming-details"><strong>{item.title}</strong><small>{item.details}</small></span>{item.task && <button className={`checkbox ${taskDone(item.task) ? 'checked' : ''}`} onClick={() => onToggle(item.task!)} aria-label="Concluir tarefa">{taskDone(item.task) && <Check size={16}/>}</button>}</div>) : <div className="empty-inline"><Flower2 size={19}/><span>Adicione prazos às tarefas ou momentos ao cronograma para ver a agenda aqui.</span></div>}<button className="add-task" onClick={onAdd}><Plus size={18}/> Adicionar tarefa</button></section>
    <section className="quote-strip"><span>“</span><p>O amor está nos detalhes que vocês escolhem juntos.</p><Heart size={18}/></section>
  </div>
}

function Stat({ icon, label, value, detail, accent }: { icon: React.ReactNode; label: string; value: string | number; detail: string; accent: string }) {
  return <div className="stat-card"><div className={`stat-icon ${accent}`}>{icon}</div><div><span>{label}</span><strong>{value}<small> {detail}</small></strong></div></div>
}

function TaskRow({ task, onToggle, onEdit }: { task: Task; onToggle: (task: Task) => void; onEdit: (task: Task) => void }) {
  const status = taskDone(task) ? 'Concluída' : task.status === 'in_progress' ? 'Em andamento' : 'Pendente'
  return <div className="task-row task-row-card"><button className={`checkbox ${taskDone(task) ? 'checked' : ''}`} onClick={() => onToggle(task)} aria-label={taskDone(task) ? 'Reabrir tarefa' : 'Concluir tarefa'}>{taskDone(task) && <Check size={17}/>}</button><button className={`task-title ${taskDone(task) ? 'completed' : ''}`} onClick={() => onEdit(task)}>{task.title}</button><span className={`task-status ${taskDone(task) ? 'complete' : task.status === 'in_progress' ? 'progress' : ''}`}>{status}</span><span className="task-category">{task.category}</span>{task.assignee && <span className="task-assignee">Responsável: {task.assignee}</span>}<span className="task-date">{task.dueDate ? formatDate(task.dueDate) : 'Sem prazo'}</span><button className="edit-button" onClick={() => onEdit(task)}>Editar</button>{task.description && <p className="task-description">{task.description}</p>}</div>
}

function Checklist({ tasks, onToggle, onAdd, onEdit }: { tasks: Task[]; onToggle: (task: Task) => void; onAdd: () => void; onEdit: (task: Task) => void }) {
  const [assigneeFilter, setAssigneeFilter] = useState('')
  const search = assigneeFilter.trim().toLocaleLowerCase('pt-BR')
  const filteredTasks = useMemo(() => tasks.filter(task => !search || (task.assignee ?? '').toLocaleLowerCase('pt-BR').includes(search)), [tasks, search])
  const groups = filteredTasks.reduce<Record<string, Task[]>>((all, task) => { const key = task.category || 'Sem categoria'; (all[key] ??= []).push(task); return all }, {})
  const completed = tasks.filter(taskDone).length
  const progress = tasks.length ? Math.round(completed / tasks.length * 100) : 0
  return <div className="content"><PageHeading eyebrow="CADA ETAPA NO SEU TEMPO" title="Checklist" text="Responsáveis, prazos e status em um só lugar." action={<button className="primary-button touch-button" onClick={onAdd}><Plus size={18}/> Nova tarefa</button>}/><div className="ceremony-filter"><label htmlFor="main-checklist-assignee-filter">Filtrar por nome do responsável<input id="main-checklist-assignee-filter" type="search" value={assigneeFilter} onChange={event => setAssigneeFilter(event.target.value)} placeholder="Digite um nome"/></label><span>{filteredTasks.length} de {tasks.length} tarefas</span></div><div className="checklist-summary"><strong>{completed} de {tasks.length} concluídas</strong><span>{progress}%</span><div className="progress-track"><i style={{ width: `${progress}%` }}/></div></div>
    {filteredTasks.length ? <div className="checklist-groups">{Object.entries(groups).map(([category, items]) => <section className="task-card category-card" key={category}><div className="category-heading"><span className="category-pin"/><h2>{category}</h2><span>{items.length} {items.length === 1 ? 'tarefa' : 'tarefas'}</span></div>{items.map(task => <TaskRow key={task.id} task={task} onToggle={onToggle} onEdit={onEdit}/>)}</section>)}</div> : tasks.length ? <EmptyState icon={<ListChecks/>} title="Nenhuma tarefa encontrada" text="Não há tarefas com esse nome de responsável. Limpe o filtro para ver a lista completa."/> : <EmptyState icon={<ListChecks/>} title="Checklist pronto para começar" text="Adicione tarefas e organize por categoria, responsável e prazo." action={<button className="primary-button touch-button" onClick={onAdd}><Plus size={18}/> Nova tarefa</button>}/>}</div>
  }

function CeremonyChecklist({ tasks, onToggle, onAdd, onEdit }: { tasks: Task[]; onToggle: (task: Task) => void; onAdd: () => void; onEdit: (task: Task) => void }) {
  const [assigneeFilter, setAssigneeFilter] = useState('')
  const search = assigneeFilter.trim().toLocaleLowerCase('pt-BR')
  const filteredTasks = useMemo(() => tasks.filter(task => !search || (task.assignee ?? '').toLocaleLowerCase('pt-BR').includes(search)), [tasks, search])
  const groups = filteredTasks.reduce<Record<string, Task[]>>((all, task) => { const key = task.category || 'Sem categoria'; (all[key] ??= []).push(task); return all }, {})
  const completed = tasks.filter(taskDone).length
  const progress = tasks.length ? Math.round(completed / tasks.length * 100) : 0
  return <div className="content">
    <PageHeading eyebrow="EQUIPE DO CERIMONIAL" title="Checklist do cerimonial" text="Organize as tarefas da equipe e acompanhe o que já foi concluído." action={<button className="primary-button touch-button" onClick={onAdd}><Plus size={18}/> Novo item</button>}/>
    <div className="ceremony-filter"><label htmlFor="ceremony-assignee-filter">Filtrar por nome do responsável<input id="ceremony-assignee-filter" type="search" value={assigneeFilter} onChange={event => setAssigneeFilter(event.target.value)} placeholder="Digite um nome"/></label><span>{filteredTasks.length} de {tasks.length} itens</span></div>
    <div className="checklist-summary"><strong>{completed} de {tasks.length} concluídos</strong><span>{progress}%</span><div className="progress-track"><i style={{ width: `${progress}%` }}/></div></div>
    {filteredTasks.length ? <div className="checklist-groups">{Object.entries(groups).map(([category, items]) => <section className="task-card category-card" key={category}><div className="category-heading"><span className="category-pin"/><h2>{category}</h2><span>{items.length} {items.length === 1 ? 'item' : 'itens'}</span></div>{items.map(task => <TaskRow key={task.id} task={task} onToggle={onToggle} onEdit={onEdit}/>)}</section>)}</div> : tasks.length ? <EmptyState icon={<ClipboardCheck/>} title="Nenhum item encontrado" text="Não há itens com esse nome de responsável. Limpe o filtro para ver a lista completa."/> : <EmptyState icon={<ClipboardCheck/>} title="Checklist do cerimonial vazio" text="Adicione o primeiro item para a equipe acompanhar as tarefas." action={<button className="primary-button touch-button" onClick={onAdd}><Plus size={18}/> Adicionar item</button>}/>}
  </div>
}

function Vendors({ vendors, onAdd, onEdit }: { vendors: Vendor[]; onAdd: () => void; onEdit: (vendor: Vendor) => void }) {
  return <div className="content"><PageHeading eyebrow="PESSOAS QUE FARÃO PARTE DESTE DIA" title="Fornecedores" text="Contatos e informações práticas para a organização." action={<button className="primary-button touch-button" onClick={onAdd}><Plus size={18}/> Adicionar</button>}/>{vendors.length ? <div className="vendor-list">{vendors.map(vendor => <article className="vendor-card" key={vendor.id}><div className="vendor-symbol"><Flower2 size={22}/></div><div className="vendor-info"><span className="vendor-category">{vendor.category || 'Serviço'}</span><h2>{vendor.name}</h2>{vendor.contactName && <p><strong>Contato:</strong> {vendor.contactName}</p>}{vendor.phone && <a className="phone-link" href={whatsappHref(vendor.phone)} target="_blank" rel="noreferrer">WhatsApp · {vendor.phone}</a>}{vendor.notes && <p className="vendor-note">{vendor.notes}</p>}{vendor.dayInfo && <p className="vendor-dayinfo"><CalendarDays size={16}/>{vendor.dayInfo}</p>}<button className="text-link vendor-edit" onClick={() => onEdit(vendor)}>Editar informações</button></div></article>)}</div> : <EmptyState icon={<ContactRound/>} title="Sua equipe especial" text="Cadastre os contatos e as informações importantes para o dia." action={<button className="primary-button touch-button" onClick={onAdd}><Plus size={18}/> Adicionar fornecedor</button>}/>}</div>
}

function SchedulePage({ entries, onAdd, onEdit }: { entries: ScheduleEntry[]; onAdd: () => void; onEdit: (entry: ScheduleEntry) => void }) {
  return <div className="content"><PageHeading eyebrow="PROGRAMAÇÃO DA CELEBRAÇÃO" title="Cronograma · 17/11/2026" text="Horários, momentos, responsáveis e observações do grande dia." action={<button className="primary-button touch-button" onClick={onAdd}><Plus size={18}/> Novo momento</button>}/>{entries.length ? <div className="schedule-list">{entries.map((entry, index) => <button className="schedule-entry" key={entry.id} onClick={() => onEdit(entry)}><span className="schedule-time">{entry.time || '—'}</span><span className={`schedule-dot dot-${index % 2}`}/><span className="schedule-copy"><strong>{entry.title}</strong>{entry.details && <small>{entry.details}</small>}{entry.responsible && <em>Responsável: {entry.responsible}</em>}</span><ChevronRight size={18}/></button>)}</div> : <EmptyState icon={<CalendarDays/>} title="O cronograma começa aqui" text="Adicione os momentos do dia 17/11/2026. Os horários ficam em branco até vocês definirem." action={<button className="primary-button touch-button" onClick={onAdd}><Plus size={18}/> Adicionar momento</button>}/>}</div>
}

function EvePage({ tasks, onToggle, onAdd, onEdit }: { tasks: Task[]; onToggle: (task: Task) => void; onAdd: () => void; onEdit: (task: Task) => void }) {
  return <div className="content"><PageHeading eyebrow="SEGUNDA-FEIRA · 16 DE NOVEMBRO DE 2026" title="Véspera do casamento" text="Preparativos finais para que o dia seguinte seja leve." action={<button className="primary-button touch-button" onClick={onAdd}><Plus size={18}/> Nova tarefa</button>}/>{tasks.length ? <section className="task-card category-card">{tasks.map(task => <TaskRow key={task.id} task={task} onToggle={onToggle} onEdit={onEdit}/>)}</section> : <EmptyState icon={<Sun/>} title="Organizem a véspera" text="As tarefas marcadas como “Véspera · 16/11/2026” no checklist aparecem aqui." action={<button className="primary-button touch-button" onClick={onAdd}><Plus size={18}/> Adicionar tarefa da véspera</button>}/>}</div>
}

function EmptyState({ icon, title, text, action }: { icon: React.ReactNode; title: string; text: string; action?: React.ReactNode }) {
  return <section className="empty-state soft-panel"><div className="empty-icon">{icon}</div><h2>{title}</h2><p>{text}</p>{action}</section>
}

function TaskModal({ task, initialDay, onClose, onSave, onDelete }: { task: Task | null; initialDay: 'planning' | 'eve' | 'wedding'; onClose: () => void; onSave: (task: Task) => void; onDelete: (id: string) => void }) {
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [category, setCategory] = useState(task?.category ?? '')
  const [dueDate, setDueDate] = useState(task?.dueDate ?? '')
  const [assignee, setAssignee] = useState(task?.assignee ?? '')
  const [status, setStatus] = useState<'pending' | 'in_progress' | 'completed'>(task?.status ?? (task?.done ? 'completed' : 'pending'))
  const [day, setDay] = useState<'planning' | 'eve' | 'wedding'>(task?.day ?? initialDay)
  const remove = () => { if (task && window.confirm(`Excluir a tarefa “${task.title}”?`)) { onDelete(task.id); onClose() } }
  return <Modal onClose={onClose}><form className="modal-form" onSubmit={e => { e.preventDefault(); if (!title.trim()) return; onSave({ ...(task ?? {}), id: task?.id ?? crypto.randomUUID(), title: title.trim(), description: description.trim(), category: category.trim() || 'Geral', dueDate, assignee: assignee.trim(), status, done: status === 'completed', day }) }}><div className="eyebrow">ORGANIZAÇÃO DO CASAMENTO</div><h2>{task ? 'Editar tarefa' : 'Nova tarefa'}</h2><label>Tarefa<input required autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="O que precisa ser feito?"/></label><label>Descrição<textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Detalhes e orientações para concluir a tarefa"/></label><div className="form-grid"><label>Categoria<input value={category} onChange={e => setCategory(e.target.value)} placeholder="Ex.: Cerimônia"/></label><label>Responsável<input value={assignee} onChange={e => setAssignee(e.target.value)} placeholder="Nome"/></label><label>Prazo<input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}/></label><label>Status<select value={status} onChange={e => setStatus(e.target.value as typeof status)}><option value="pending">Pendente</option><option value="in_progress">Em andamento</option><option value="completed">Concluída</option></select></label></div><label>Área<select value={day} onChange={e => setDay(e.target.value as typeof day)}><option value="planning">Planejamento</option><option value="eve">Véspera · 16/11/2026</option><option value="wedding">Casamento · 17/11/2026</option></select></label><div className="modal-actions">{task && <button type="button" className="delete-button touch-button" onClick={remove}><Trash2 size={18}/> Excluir tarefa</button>}<button className="primary-button touch-button modal-submit">Salvar tarefa</button></div></form></Modal>
}

function CeremonyTaskModal({ task, onClose, onSave, onDelete }: { task: Task | null; onClose: () => void; onSave: (task: Task) => void; onDelete: (id: string) => void }) {
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [category, setCategory] = useState(task?.category ?? 'Equipe do cerimonial')
  const [dueDate, setDueDate] = useState(task?.dueDate ?? '')
  const [assignee, setAssignee] = useState(task?.assignee ?? '')
  const [status, setStatus] = useState<'pending' | 'in_progress' | 'completed'>(task?.status ?? (task?.done ? 'completed' : 'pending'))
  const remove = () => { if (task && window.confirm(`Excluir o item “${task.title}”?`)) { onDelete(task.id); onClose() } }
  return <Modal onClose={onClose}><form className="modal-form" onSubmit={event => {
    event.preventDefault()
    if (!title.trim()) return
    onSave({ ...(task ?? {}), id: task?.id ?? crypto.randomUUID(), title: title.trim(), description: description.trim(), category: category.trim() || 'Equipe do cerimonial', dueDate, assignee: assignee.trim(), status, done: status === 'completed' })
  }}>
    <div className="eyebrow">CHECKLIST DO CERIMONIAL</div>
    <h2>{task ? 'Editar item' : 'Novo item'}</h2>
    <label>Tarefa<input required autoFocus value={title} onChange={event => setTitle(event.target.value)} placeholder="O que a equipe precisa fazer?"/></label>
    <label>Descrição<textarea rows={3} value={description} onChange={event => setDescription(event.target.value)} placeholder="Detalhes para concluir a tarefa"/></label>
    <div className="form-grid"><label>Categoria<input value={category} onChange={event => setCategory(event.target.value)} placeholder="Ex.: Cerimônia"/></label><label>Responsável<input value={assignee} onChange={event => setAssignee(event.target.value)} placeholder="Nome"/></label><label>Prazo<input type="date" value={dueDate} onChange={event => setDueDate(event.target.value)}/></label><label>Status<select value={status} onChange={event => setStatus(event.target.value as typeof status)}><option value="pending">Pendente</option><option value="in_progress">Em andamento</option><option value="completed">Concluída</option></select></label></div>
    <div className="modal-actions">{task && <button type="button" className="delete-button touch-button" onClick={remove}><Trash2 size={18}/> Excluir item</button>}<button className="primary-button touch-button modal-submit">Salvar item</button></div>
  </form></Modal>
}

function VendorModal({ vendor, onClose, onSave }: { vendor: Vendor | null; onClose: () => void; onSave: (vendor: Vendor) => void }) {
  const [name, setName] = useState(vendor?.name ?? '')
  const [category, setCategory] = useState(vendor?.category ?? '')
  const [contactName, setContactName] = useState(vendor?.contactName ?? '')
  const [phone, setPhone] = useState(vendor?.phone ?? '')
  const [notes, setNotes] = useState(vendor?.notes ?? '')
  const [dayInfo, setDayInfo] = useState(vendor?.dayInfo ?? '')
  return <Modal onClose={onClose}><form className="modal-form" onSubmit={e => { e.preventDefault(); onSave({ ...(vendor ?? {}), id: vendor?.id ?? crypto.randomUUID(), name: name.trim(), category: category.trim() || 'Fornecedor', contactName: contactName.trim(), phone: phone.trim(), notes: notes.trim(), dayInfo: dayInfo.trim() }) }}><div className="eyebrow">EQUIPE DO CASAMENTO</div><h2>{vendor ? 'Editar fornecedor' : 'Novo fornecedor'}</h2><label>Nome do fornecedor<input required autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Nome ou empresa"/></label><div className="form-grid"><label>Categoria do serviço<input value={category} onChange={e => setCategory(e.target.value)} placeholder="Ex.: Fotografia"/></label><label>Nome do contato<input value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Pessoa de contato"/></label></div><label>Telefone / WhatsApp<input type="tel" inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(11) 99999-9999"/></label><label>Observações<textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Anotações e combinações importantes"/></label><label>Informações para o dia do casamento<textarea rows={3} value={dayInfo} onChange={e => setDayInfo(e.target.value)} placeholder="Horário de chegada, local, instruções…"/></label><button className="primary-button touch-button modal-submit">Salvar fornecedor</button></form></Modal>
}

function ScheduleModal({ entry, onClose, onSave }: { entry: ScheduleEntry | null; onClose: () => void; onSave: (entry: ScheduleEntry) => void }) {
  const [time, setTime] = useState(entry?.time ?? '')
  const [title, setTitle] = useState(entry?.title ?? '')
  const [details, setDetails] = useState(entry?.details ?? '')
  const [responsible, setResponsible] = useState(entry?.responsible ?? '')
  return <Modal onClose={onClose}><form className="modal-form" onSubmit={e => { e.preventDefault(); if (title.trim()) onSave({ ...(entry ?? {}), id: entry?.id ?? crypto.randomUUID(), time, title: title.trim(), details: details.trim(), responsible: responsible.trim() }) }}><div className="eyebrow">17 DE NOVEMBRO DE 2026</div><h2>{entry ? 'Editar momento' : 'Novo momento'}</h2><div className="form-grid"><label>Horário<input type="time" value={time} onChange={e => setTime(e.target.value)}/></label><label>Responsável<input value={responsible} onChange={e => setResponsible(e.target.value)} placeholder="Nome"/></label></div><label>Atividade<input required autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex.: Cerimônia"/></label><label>Observações<textarea rows={3} value={details} onChange={e => setDetails(e.target.value)} placeholder="Local, orientações e observações"/></label><button className="primary-button touch-button modal-submit">Salvar momento</button></form></Modal>
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}><section className="modal" role="dialog" aria-modal="true"><button className="modal-close" aria-label="Fechar" onClick={onClose}><X size={21}/></button>{children}</section></div>
}

function FloralArtwork() {
  return <svg className="floral-art" viewBox="0 0 300 260" role="img" aria-label="Ilustração floral em tons de pink e laranja"><defs><radialGradient id="petalPink"><stop stopColor="#FF9A00"/><stop offset=".48" stopColor="#FF4FA3"/><stop offset="1" stopColor="#FF1681"/></radialGradient><radialGradient id="petalOrange"><stop stopColor="#FF9A00"/><stop offset="1" stopColor="#FF6500"/></radialGradient><filter id="watercolor"><feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="2" seed="7" result="noise"/><feDisplacementMap in="SourceGraphic" in2="noise" scale="2"/></filter></defs><g fill="none" stroke="#542638" strokeOpacity=".72" strokeWidth="3" strokeLinecap="round"><path d="M158 245c-5-57-19-91-51-131M159 244c14-54 47-83 82-111M157 245c2-66 0-120 4-184"/><path d="M117 166c-26 3-42-5-54-22 25-4 42 2 54 22ZM194 169c22-13 42-12 61-1-17 18-37 20-61 1ZM158 198c-21-2-35-12-42-31 23 1 37 11 42 31Z" fill="#FF9A00" fillOpacity=".8" stroke="#FF6500"/></g><g filter="url(#watercolor)" stroke="#FFF8F2" strokeOpacity=".48" strokeWidth="1.4"><g fill="url(#petalPink)">{Array.from({ length: 8 }, (_, i) => <ellipse key={i} cx="158" cy="30" rx="14" ry="37" transform={`rotate(${i * 45} 158 67)`}/>)}</g><circle cx="158" cy="67" r="15" fill="url(#petalOrange)"/><g fill="url(#petalOrange)">{Array.from({ length: 6 }, (_, i) => <ellipse key={i} cx="83" cy="79" rx="10" ry="25" transform={`rotate(${i * 60} 83 104)`}/>)}</g><circle cx="83" cy="104" r="10" fill="#542638"/><g fill="url(#petalPink)">{Array.from({ length: 6 }, (_, i) => <ellipse key={i} cx="239" cy="103" rx="10" ry="27" transform={`rotate(${i * 60} 239 130)`}/>)}</g><circle cx="239" cy="130" r="10" fill="#FF9A00"/></g></svg>
}
