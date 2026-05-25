'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Nav() {
  const path = usePathname()
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
    </nav>
  )
}
