import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const DATA_DIR = process.env.VIBE_DATA_DIR || path.join(__dirname, 'data')
export const MEDIA_DIR = path.join(DATA_DIR, 'media')
const DB_PATH = path.join(DATA_DIR, 'vibe.json')

export function ensureDirs() {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.mkdirSync(MEDIA_DIR, { recursive: true })
}

function emptyState() {
  return {
    users: [],
    posts: [],
    conversations: [],
    activities: [],
  }
}

export function loadDb() {
  ensureDirs()
  if (!fs.existsSync(DB_PATH)) {
    const s = emptyState()
    saveDb(s)
    return s
  }
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'))
  } catch {
    const s = emptyState()
    saveDb(s)
    return s
  }
}

export function saveDb(state) {
  ensureDirs()
  const tmp = `${DB_PATH}.${randomUUID()}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(state))
  fs.renameSync(tmp, DB_PATH)
}

export function publicUser(u) {
  if (!u) return null
  const { password, ...rest } = u
  return rest
}

export function uid(prefix = 'id') {
  return `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 12)}`
}
