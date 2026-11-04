import { useCallback, useEffect, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { initialData } from '../data/initialData'
import type { WeddingData } from '../types'
import { supabase, supabaseConfigured } from '../lib/supabase'

const STORAGE_KEY = 'jasmine-pedro-wedding-v1'
const WEDDING_ID = 'jasmine-pedro'
type SyncStatus = 'connecting' | 'saving' | 'synced' | 'local' | 'error' | 'conflict'
const stableJson = (value: unknown): string => {
  const sort = (item: unknown): unknown => Array.isArray(item) ? item.map(sort) : item && typeof item === 'object'
    ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, sort(child)]))
    : item
  return JSON.stringify(sort(value))
}

export function useWeddingData() {
  const [data, setDataState] = useState<WeddingData>(() => {
    try { const saved = localStorage.getItem(STORAGE_KEY); return saved ? { ...initialData, ...JSON.parse(saved) } : initialData }
    catch { return initialData }
  })
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('connecting')
  const [syncConflict, setSyncConflict] = useState<WeddingData | null>(null)
  const dataRef = useRef(data)
  const conflictRef = useRef<WeddingData | null>(null)
  const dirtyRef = useRef(false)
  const skipNextSave = useRef(false)
  const hydrated = useRef(false)
  const saveQueue = useRef<Promise<void>>(Promise.resolve())
  const saveRevision = useRef(0)

  const setData: Dispatch<SetStateAction<WeddingData>> = useCallback(update => {
    setDataState(current => {
      const next = typeof update === 'function' ? update(current) : update
      dataRef.current = next
      dirtyRef.current = true
      return next
    })
  }, [])

  useEffect(() => {
    let active = true
    async function load() {
      if (!supabaseConfigured || !supabase) {
        if (active) { hydrated.current = true; setSyncStatus('local') }
        return
      }
      try {
        const { data: row, error } = await supabase.from('wedding_planner_state').select('data').eq('id', WEDDING_ID).maybeSingle()
        if (error) throw error
        if (!active) return
        if (row?.data) {
          const remote = { ...initialData, ...row.data } as WeddingData
          dataRef.current = remote
          localStorage.setItem(STORAGE_KEY, JSON.stringify(remote))
          skipNextSave.current = true
          setDataState(remote)
        } else {
          const local = localStorage.getItem(STORAGE_KEY)
          const startingData = local ? { ...initialData, ...JSON.parse(local) } as WeddingData : initialData
          const { error: seedError } = await supabase.from('wedding_planner_state').upsert({ id: WEDDING_ID, data: startingData, updated_at: new Date().toISOString() })
          if (seedError) throw seedError
          dataRef.current = startingData
          skipNextSave.current = true
          setDataState(startingData)
        }
        hydrated.current = true
        setSyncStatus('synced')
      } catch (error) {
        console.error('Não foi possível carregar os dados do Supabase:', error)
        if (active) { hydrated.current = true; setSyncStatus('error') }
      }
    }
    void load()
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!supabase || !supabaseConfigured) return
    const client = supabase
    const channel = client.channel(`planner-state-${WEDDING_ID}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wedding_planner_state', filter: `id=eq.${WEDDING_ID}` }, payload => {
        const row = payload.new as { data?: WeddingData } | null
        if (!row?.data) return
        const remote = { ...initialData, ...row.data } as WeddingData
        if (stableJson(remote) === stableJson(dataRef.current)) return
        if (dirtyRef.current) {
          conflictRef.current = remote
          setSyncConflict(remote)
          setSyncStatus('conflict')
          return
        }
        dataRef.current = remote
        skipNextSave.current = true
        localStorage.setItem(STORAGE_KEY, JSON.stringify(remote))
        setDataState(remote)
        setSyncStatus('synced')
      })
      .subscribe()
    return () => { void client.removeChannel(channel) }
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    if (!hydrated.current) return
    if (skipNextSave.current) { skipNextSave.current = false; return }
    if (!supabaseConfigured || !supabase) { setSyncStatus('local'); return }
    const client = supabase
    const revision = ++saveRevision.current
    setSyncStatus(conflictRef.current ? 'conflict' : 'saving')
    const timeout = window.setTimeout(async () => {
      if (conflictRef.current) return
      saveQueue.current = saveQueue.current.catch(() => undefined).then(async () => {
        if (conflictRef.current) return
        try {
          const { error } = await client.from('wedding_planner_state').upsert({ id: WEDDING_ID, data, updated_at: new Date().toISOString() })
          if (error) throw error
          if (revision === saveRevision.current) { dirtyRef.current = false; setSyncStatus('synced') }
        } catch (error) {
          console.error('Não foi possível sincronizar com o Supabase:', error)
          if (revision === saveRevision.current) setSyncStatus('error')
        }
      })
      await saveQueue.current
    }, 500)
    return () => window.clearTimeout(timeout)
  }, [data])

  const resolveSyncConflict = useCallback((choice: 'remote' | 'local') => {
    const remote = conflictRef.current
    conflictRef.current = null
    setSyncConflict(null)
    if (choice === 'remote' && remote) {
      dirtyRef.current = false
      dataRef.current = remote
      skipNextSave.current = true
      localStorage.setItem(STORAGE_KEY, JSON.stringify(remote))
      setDataState(remote)
      setSyncStatus('synced')
    } else {
      dirtyRef.current = true
      setDataState(current => ({ ...current }))
      setSyncStatus('saving')
    }
  }, [])

  return { data, setData, syncStatus, syncConflict: Boolean(syncConflict), resolveSyncConflict }
}
