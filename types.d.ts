type ApiResponse<T> = {
  data: T
  success?: boolean
  message?: string
}

type Plant = {
  id: string
  name: string
  species: string
  location: string
  thumbnail: {
    url: string
  }
  room_id: string
}

type Room = {
  id: string
  name: string
  icon: string
}

type Note = {
  id: string
  plant_id: string
  content: string
  created_at: string
}

type Photo = {
  id: string
  plant_id: string
  image_url: string
  taken_at: string
  note_id: string
}
