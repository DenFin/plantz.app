export type ReminderFilter = 'open' | 'overdue' | 'completed'

export type Reminder = {
  id: string
  plant_id: string
  plant_name?: string
  remind_at: string
  message: string | null
  recurrence_days: number | null
  completed_at: string | null
  created_at: string | null
}

export function useReminders() {
  const many: Ref<Reminder[] | null> = useState('reminders', () => null)
  const overdue: Ref<Reminder[] | null> = useState('remindersOverdue', () => null)

  async function fetchMany(filter?: ReminderFilter) {
    try {
      const query = filter ? `?filter=${filter}` : ''
      const response = await $fetch<ApiResponse<Reminder[]>>(`/api/reminders${query}`)
      many.value = response.data
      return response
    }
    catch (e) {
      console.error(e)
    }
  }

  async function fetchOverdue() {
    try {
      const response = await $fetch<ApiResponse<Reminder[]>>('/api/reminders?filter=overdue')
      overdue.value = response.data
      return response
    }
    catch (e) {
      console.error(e)
    }
  }

  async function fetchForPlant(plantId: string, filter?: ReminderFilter) {
    const query = filter ? `?filter=${filter}` : ''
    return $fetch<ApiResponse<Reminder[]>>(`/api/plants/${plantId}/reminders${query}`)
  }

  async function create(input: {
    plant_id: string
    remind_at: string
    message?: string
    recurrence_days?: number | null
  }) {
    return $fetch<ApiResponse<Reminder>>('/api/reminders', { method: 'POST', body: input })
  }

  /**
   * Completing a recurring reminder also returns its successor, so the caller can show
   * the next date without a second round trip.
   */
  async function complete(id: string) {
    return $fetch<ApiResponse<{ completed: Reminder, successor: Reminder | null }>>(
      `/api/reminders/${id}/complete`,
      { method: 'POST' },
    )
  }

  async function remove(id: string) {
    return $fetch(`/api/reminders/${id}`, { method: 'DELETE' })
  }

  return {
    many,
    overdue,
    fetchMany,
    fetchOverdue,
    fetchForPlant,
    create,
    complete,
    remove,
  }
}
