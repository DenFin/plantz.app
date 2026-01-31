export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { id: plantId, name, species, location, room_id, parent_plant_id } = body

  const query = `
        UPDATE plants
        SET name = $1, species = $2, location = $3, room_id = $4, parent_plant_id = $6
        WHERE id = $5
    `
  const values = [name, species, location, room_id, plantId, parent_plant_id]
  const client = await database()
  try {
    await client.query('BEGIN')
    const plantResult = await client.query(query, values)
    console.log('plantResult', plantResult)
    await client.query('COMMIT')
    return { status: 204 }
  }
  catch (error) {
    await client.query('ROLLBACK')
    console.error(error)
    return { status: 404 }
  }
})
