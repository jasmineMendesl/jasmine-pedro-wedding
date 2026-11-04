export type Task = {
  id: string
  title: string
  category: string
  description?: string
  dueDate: string
  done: boolean
  assignee?: string
  status?: 'pending' | 'in_progress' | 'completed'
  day?: 'planning' | 'eve' | 'wedding'
  [key: string]: unknown
}

export type Vendor = {
  id: string
  name: string
  category: string
  contactName?: string
  phone?: string
  notes?: string
  dayInfo?: string
  [key: string]: unknown
}

export type ScheduleEntry = {
  id: string
  time: string
  title: string
  details: string
  responsible: string
  [key: string]: unknown
}

export type WeddingData = {
  couple: string
  date: string
  venue: string
  tasks: Task[]
  vendors: Vendor[]
  schedule?: ScheduleEntry[]
  [key: string]: unknown
}
