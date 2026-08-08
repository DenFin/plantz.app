export const CARE_TYPES = ['watering', 'fertilizing', 'repotting', 'pruning', 'treatment'] as const

export type CareType = typeof CARE_TYPES[number]

export type CareEvent = {
  id: string
  plant_id: string
  type: CareType
  occurred_at: string
  note: string | null
  created_at: string
}

export function useCare() {
  const many: Ref<CareEvent[] | null> = useState('careEvents', () => null)

  async function fetchMany(plantId: string) {
    try {
      const response = await $fetch<ApiResponse<CareEvent[]>>(`/api/plants/${plantId}/care`)
      many.value = response.data
      return response
    }
    catch (e) {
      console.error(e)
    }
  }

  /**
   * The one-tap path: no date, no note, `occurred_at` defaults to now on the server.
   */
  async function log(plantId: string, type: CareType, extra?: { occurred_at?: string, note?: string }) {
    const response = await $fetch<ApiResponse<CareEvent>>(`/api/plants/${plantId}/care`, {
      method: 'POST',
      body: { type, ...extra },
    })
    await fetchMany(plantId)
    return response
  }

  function lastOf(type: CareType) {
    return many.value?.find(event => event.type === type) ?? null
  }

  return {
    many,
    fetchMany,
    log,
    lastOf,
  }
}
