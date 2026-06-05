'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'

export default function Nav() {
  const path = usePathname()
  const router = useRouter()
  const [scouting, setScouting] = useState(false)
  const [scoutResult, setScoutResult] = useState<string | null>(null)

  const runScout = async () => {
    setScouting(true)
    setScoutResult(null)
    try {
      const res = await fetch('/api/scout', { method: 'POST' })
      const data = await res.json()
      if (data.error) {
        setScoutResult('Scout failed')
      } else {
        setScoutResult(`+${data.inserted} jobs`)
        router.refresh()
      }
    } catch {
      setScoutResult('Scout failed')
    } finally {
      setScouting(false)
      setTimeout(() => setScoutResult(null), 4000)
    }
  }

  const link = (href: string, label: string) => (
    <Link
      href={href}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        path === href || (href !== '/' && path.startsWith(href))
          ? 'bg-blue-600 text-white'
          : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {label}
    </Link>
  )

  return (
    <nav className="h-14 border-b border-gray-200 bg-white flex items-center px-6 gap-2 sticky top-0 z-10">
      <span className="font-bold text-gray-900 mr-4 text-sm tracking-tight">Job Applications</span>
      {link('/', 'Jobs')}
      {link('/profile', 'My Profile')}
      <div className="ml-auto flex items-center gap-3">
        {scoutResult && (
          <span className={`text-xs font-medium ${scoutResult.includes('failed') ? 'text-red-500' : 'text-green-600'}`}>
            {scoutResult}
          </span>
        )}
        <button
          onClick={runScout}
          disabled={scouting}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            scouting
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-gray-900 text-white hover:bg-gray-700'
          }`}
        >
          {scouting ? 'Scouting...' : 'Scout now'}
        </button>
      </div>
    </nav>
  )
}
