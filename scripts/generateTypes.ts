import fs from 'node:fs'
import path from 'node:path'
import { Client } from 'pg'
import 'dotenv/config'

const client = new Client({
  user: process.env.DATABASE_USER,
  host: process.env.DATABASE_HOST,
  database: process.env.DATABASE_NAME,
  password: process.env.DATABASE_PASSWORD,
  port: Number(process.env.DATABASE_PORT),
})

type Column = {
  table_name: string
  column_name: string
  data_type: string
  is_nullable: 'YES' | 'NO'
  udt_name: string
}

function pgTypeToTs(column: Column): string {
  const { data_type, udt_name } = column

  // Arrays
  if (udt_name.startsWith('_')) {
    const baseType = pgTypeToTs({
      ...column,
      udt_name: udt_name.slice(1),
      data_type,
    })
    return `${baseType}[]`
  }

  switch (data_type) {
    case 'integer':
    case 'bigint':
    case 'numeric':
    case 'real':
    case 'double precision':
      return 'number'

    case 'boolean':
      return 'boolean'

    case 'json':
    case 'jsonb':
      return 'any'

    case 'timestamp without time zone':
    case 'timestamp with time zone':
    case 'date':
      return 'string'

    case 'uuid':
    case 'character varying':
    case 'text':
    case 'character':
      return 'string'

    default:
      return 'any'
  }
}

async function generateTypes() {
  await client.connect()

  const res = await client.query<Column>(`
    SELECT
      table_name,
      column_name,
      data_type,
      is_nullable,
      udt_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position;
  `)

  const tables: Record<string, Column[]> = {}

  for (const column of res.rows) {
    if (!tables[column.table_name]) {
      tables[column.table_name] = []
    }
    tables[column.table_name].push(column)
  }

  let output = `/* AUTO-GENERATED FILE. DO NOT EDIT. */\n\n`

  for (const [tableName, columns] of Object.entries(tables)) {
    const typeName = tableName
      .split('_')
      .map(p => p.charAt(0).toUpperCase() + p.slice(1))
      .join('')

    output += `export type ${typeName} = {\n`

    for (const col of columns) {
      const tsType = pgTypeToTs(col)
      const nullable = col.is_nullable === 'YES' ? ' | null' : ''
      output += `  ${col.column_name}: ${tsType}${nullable};\n`
    }

    output += `};\n\n`
  }

  const outPath = path.join(process.cwd(), 'db-types.ts')
  fs.writeFileSync(outPath, output)

  await client.end()
  console.log(`Types written to ${outPath}`)
}

generateTypes().catch((err) => {
  console.error(err)
  process.exit(1)
})
