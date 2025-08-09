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

interface Note {
  id: string
  plant_id: string
  content: string
  created_at: string
}

interface Photo {
  id: string
  plant_id: string
  image_url: string
  taken_at: string
  note_id: string
}
