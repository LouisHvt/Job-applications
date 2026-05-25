import { NextResponse } from 'next/server'
import { getProfile, saveProfile } from '@/lib/data'
import { Profile } from '@/lib/types'

export async function GET() {
  return NextResponse.json(getProfile())
}

export async function PUT(request: Request) {
  const profile: Profile = await request.json()
  saveProfile(profile)
  return NextResponse.json({ ok: true })
}
