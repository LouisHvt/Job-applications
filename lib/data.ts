import fs from 'fs'
import path from 'path'
import { Profile } from './types'

const DATA_DIR = path.join(process.cwd(), 'data')
const PROFILE_PATH = path.join(DATA_DIR, 'profile.json')

const DEFAULT_PROFILE: Profile = {
  name: '',
  email: '',
  phone: '',
  linkedin: '',
  portfolio: '',
  location: '',
  summary: '',
  experiences: [],
  skills: [],
  education: [],
  coverLetterTemplates: [],
  languages: [],
  otherInfo: [],
  keyStats: [],
}

export function getProfile(): Profile {
  if (!fs.existsSync(PROFILE_PATH)) return DEFAULT_PROFILE
  return JSON.parse(fs.readFileSync(PROFILE_PATH, 'utf-8'))
}

export function saveProfile(profile: Profile): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(PROFILE_PATH, JSON.stringify(profile, null, 2))
}
