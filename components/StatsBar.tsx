interface StatsBarProps {
  proposed: number
  ready: number
  applied: number
  interviews: number
  thisWeek: number
}

export default function StatsBar({ proposed, ready, applied, interviews, thisWeek }: StatsBarProps) {
  const items = [
    { label: 'proposed', value: proposed },
    { label: 'ready', value: ready },
    { label: 'applied', value: applied },
    { label: 'interviews', value: interviews },
    { label: 'this week', value: thisWeek },
  ]
  return (
    <div className="flex items-center gap-6 px-5 py-3 bg-white border border-gray-200 rounded-xl mb-6 text-sm">
      {items.map((item, i) => (
        <span key={item.label} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-gray-300 mr-4">·</span>}
          <span className="font-semibold text-gray-900">{item.value}</span>
          <span className="text-gray-400">{item.label}</span>
        </span>
      ))}
    </div>
  )
}
