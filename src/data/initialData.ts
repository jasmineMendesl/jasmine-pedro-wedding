import type { WeddingData } from '../types'

// Modelo operacional. A linha existente no Supabase continua sendo a fonte principal.
export const initialData: WeddingData = {
  couple: 'Jasmine & Pedro',
  date: '',
  venue: '',
  tasks: [
    { id: 't1', title: 'Definir data do casamento', category: 'Planejamento', dueDate: '', done: false, status: 'pending', day: 'planning' },
    { id: 't2', title: 'Pesquisar espaços para a celebração', category: 'Local', dueDate: '', done: false, status: 'pending', day: 'planning' },
    { id: 't3', title: 'Criar lista de convidados', category: 'Convidados', dueDate: '', done: false, status: 'pending', day: 'planning' },
  ],
  vendors: [],
  schedule: [],
}
