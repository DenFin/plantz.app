interface ApiResponse<T> {
  data: T
  success?: boolean
  message?: string
}

interface Plant {
  id: string
  name: string
  species: string
  location: string
  thumbnail: {
    url: string
  }
  room_id: string
}

interface Room {
  id: string
  name: string
  icon: string
}
