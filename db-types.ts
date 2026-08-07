/* AUTO-GENERATED FILE. DO NOT EDIT. */

export type CareEvents = {
  id: string
  plant_id: string
  type: any
  occurred_at: string
  note: string | null
  created_at: string | null
}

export type Notes = {
  id: string
  plant_id: string | null
  content: string
  created_at: string | null
}

export type Photos = {
  id: string
  plant_id: string | null
  image_url: string
  taken_at: string | null
  note_id: string | null
}

export type Plants = {
  id: string
  user_id: string | null
  name: string
  species: string | null
  location: string | null
  created_at: string | null
  room_id: number | null
  status: any
  parent_plant_id: string | null
}

export type Reminders = {
  id: string
  plant_id: string | null
  remind_at: string
  message: string | null
  created_at: string | null
}

export type Rooms = {
  id: number
  name: string
  color: string
  icon: string
  orientation: string
  created_at: string | null
}

export type SchemaMigrations = {
  filename: string
  applied_at: string
}

export type Users = {
  id: string
  email: string
  password_hash: string
  created_at: string | null
}
