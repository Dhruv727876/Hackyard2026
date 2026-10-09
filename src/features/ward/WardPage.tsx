import { useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { RATE_BY_MATERIAL } from '@/config/rates'
import { repo } from '@/data'
import type { MaterialId, WardStats } from '@/domain/types'
import { formatINR, formatKg } from '@/lib/format'

function isMaterialId(key: string): key is MaterialId {
  return key in RATE_BY_MATERIAL
}

export default function WardPage(): React.JSX.Element {
  const [stats, setStats] = useState<WardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    repo
      .getWardStats('ward-151')
      .then((data) => {
        if (!active) return
        setStats(data)
        setLoading(false)
      })
      .catch(() => {
        if (!active) return
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  if (loading) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-bold text-teal-800">Ward 151 Impact</h1>
        <div className="grid grid-cols-2 gap-3" role="status" aria-label="Loading ward stats">
          {[1, 2, 3, 4].map((key) => (
            <div key={key} className="h-24 animate-pulse rounded-2xl bg-slate-200/80 p-4" />
          ))}
        </div>
      </section>
    )
  }

  const chartData = stats
    ? Object.entries(stats.byMaterial)
        .filter((entry): entry is [MaterialId, number] => isMaterialId(entry[0]))
        .map(([mat, kg]) => ({
          name: RATE_BY_MATERIAL[mat].displayName,
          kg,
        }))
        .filter((d) => d.kg > 0)
    : []

  return (
    <section className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-teal-800">Ward 151 Impact</h1>
        <p className="text-sm text-slate-600">
          Real-time recycling and resource circularity metrics for Koramangala.
        </p>
      </header>

      {stats && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs">
            <span className="text-xs font-medium text-slate-500">Total Diverted</span>
            <p className="mt-1 text-xl font-bold text-teal-700">
              {formatKg(stats.totalKg)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs">
            <span className="text-xs font-medium text-slate-500">₹ Circulated</span>
            <p className="mt-1 text-xl font-bold text-teal-700">
              {formatINR(stats.totalINR)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs">
            <span className="text-xs font-medium text-slate-500">Completed Pickups</span>
            <p className="mt-1 text-xl font-bold text-teal-700">
              {stats.pickupsCompleted}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs">
            <span className="text-xs font-medium text-slate-500">CO₂ Avoided</span>
            <p className="mt-1 text-xl font-bold text-teal-700">
              {stats.co2Saved.toFixed(1)} kg
            </p>
          </div>
        </div>
      )}

      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-bold text-slate-800">Material breakdown</h2>

        {chartData.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500">
            No recycling data yet.
          </div>
        ) : (
          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  angle={-25}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  formatter={(value) => {
                    const num = typeof value === 'number' ? value : Number(value)
                    return [`${Number.isFinite(num) ? num.toFixed(1) : '0'} kg`, 'Weight']
                  }}
                  contentStyle={{
                    borderRadius: '8px',
                    borderColor: '#cbd5e1',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="kg" fill="#0d9488" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </section>
  )
}
