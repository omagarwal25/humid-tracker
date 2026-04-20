import { useState, useEffect } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import './App.css'

const API_BASE = import.meta.env.VITE_API_URL || ''

const WINDOWS = [
  { label: '1h',  ms: 60 * 60 * 1000 },
  { label: '6h',  ms: 6 * 60 * 60 * 1000 },
  { label: '24h', ms: 24 * 60 * 60 * 1000 },
  { label: '7d',  ms: 7 * 24 * 60 * 60 * 1000 },
  { label: 'All', ms: null },
]

function formatTime(dateStr, windowMs) {
  const d = new Date(dateStr)
  if (windowMs === null || windowMs > 24 * 60 * 60 * 1000) {
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function toF(c) {
  return c * 9 / 5 + 32
}

function fmtTemp(c, useFahrenheit) {
  return useFahrenheit ? `${toF(c).toFixed(2)}°F` : `${c.toFixed(2)}°C`
}

function StatCard({ label, value, outdoor = false }) {
  return (
    <div
      className={`flex-1 min-w-[130px] rounded-xl p-4 border ${
        outdoor
          ? 'bg-[#0f2a1e] border-[#2a4a3a]'
          : 'bg-[#16213e] border-[#2a2a4a]'
      }`}
    >
      <div className="text-[0.72rem] uppercase tracking-widest text-[#6060a0] mb-2">{label}</div>
      <div className="text-xl font-semibold text-white whitespace-nowrap">{value}</div>
    </div>
  )
}

export default function App() {
  const [readings, setReadings] = useState([])
  const [stats, setStats] = useState(null)
  const [outdoor, setOutdoor] = useState(null)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [activeWindow, setActiveWindow] = useState('24h')
  const [useFahrenheit, setUseFahrenheit] = useState(false)

  async function fetchData() {
    try {
      const [readingsRes, statsRes, weatherRes] = await Promise.all([
        fetch(`${API_BASE}/api/readings?limit=500`),
        fetch(`${API_BASE}/api/readings/stats`),
        fetch(`${API_BASE}/api/weather`),
      ])

      if (!readingsRes.ok || !statsRes.ok) {
        throw new Error('Failed to fetch data from backend')
      }

      const readingsData = await readingsRes.json()
      const statsData = await statsRes.json()

      setReadings(readingsData)
      setStats(statsData)
      if (weatherRes.ok) setOutdoor(await weatherRes.json())
      setError(null)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 60000)
    return () => clearInterval(interval)
  }, [])

  const latest = readings[0] || null

  const windowMs = WINDOWS.find((w) => w.label === activeWindow)?.ms ?? null
  const windowedReadings = windowMs
    ? readings.filter((r) => Date.now() - new Date(r.createdAt).getTime() <= windowMs)
    : readings

  const cvtTemp = (c) => useFahrenheit ? parseFloat(toF(c).toFixed(2)) : parseFloat(c.toFixed(2))
  const tempUnit = useFahrenheit ? '°F' : '°C'

  const chartData = [...windowedReadings].reverse().map((r) => ({
    time: formatTime(r.createdAt, windowMs),
    humidity: parseFloat(r.humidity.toFixed(2)),
    temperature: cvtTemp(r.temperature),
    ...(r.outdoorHumidity != null && { outdoorHumidity: parseFloat(r.outdoorHumidity.toFixed(2)) }),
    ...(r.outdoorTemperature != null && { outdoorTemperature: cvtTemp(r.outdoorTemperature) }),
  }))

  return (
    <div className="max-w-[1200px] mx-auto py-6 px-4">
      {/* Header */}
      <header className="flex items-center gap-4 mb-7 flex-wrap">
        <h1 className="text-[1.75rem] font-bold text-white tracking-tight">Humidity Monitor</h1>
        {lastUpdated && (
          <span className="text-xs text-[#6060a0]">Last updated: {lastUpdated.toLocaleTimeString()}</span>
        )}
        <button
          onClick={() => setUseFahrenheit((f) => !f)}
          className="ml-auto px-2.5 py-1 rounded-md text-xs font-semibold tracking-wider border border-[#2a2a4a] text-[#6060a0] hover:border-[#4f9cf9] hover:text-[#c0c0e0] transition-colors cursor-pointer"
        >
          {useFahrenheit ? '°C' : '°F'}
        </button>
      </header>

      {error && (
        <div className="bg-[#3a1a2a] border border-[#8b3a52] text-[#f08090] rounded-lg px-4 py-3 mb-5 text-sm">
          Error: {error}
        </div>
      )}

      {/* Stats */}
      <section className="flex flex-wrap gap-3 mb-8">
        <StatCard label="Current Humidity" value={latest ? `${latest.humidity.toFixed(2)}%` : '—'} />
        <StatCard label="Current Temp" value={latest ? fmtTemp(latest.temperature, useFahrenheit) : '—'} />
        <StatCard
          label="Humidity Min / Max"
          value={stats ? `${stats.humidity.min.toFixed(2)}% / ${stats.humidity.max.toFixed(2)}%` : '—'}
        />
        <StatCard
          label="Humidity Avg"
          value={stats ? `${stats.humidity.avg.toFixed(2)}%` : '—'}
        />
        <StatCard
          label="Temp Min / Max"
          value={stats ? `${fmtTemp(stats.temperature.min, useFahrenheit)} / ${fmtTemp(stats.temperature.max, useFahrenheit)}` : '—'}
        />
        <StatCard
          label="Temp Avg"
          value={stats ? fmtTemp(stats.temperature.avg, useFahrenheit) : '—'}
        />
        {outdoor && (
          <>
            <StatCard label="Outdoor Humidity" value={`${outdoor.humidity.toFixed(0)}%`} outdoor />
            <StatCard label="Outdoor Temp" value={fmtTemp(outdoor.temperature, useFahrenheit)} outdoor />
          </>
        )}
      </section>

      {/* Chart */}
      <section className="bg-[#16213e] border border-[#2a2a4a] rounded-xl p-5 mb-8">
        <div className="flex items-center justify-between flex-wrap gap-2.5 mb-4">
          <h2 className="text-sm font-semibold text-[#c0c0e0] uppercase tracking-wider">
            Readings Over Time
          </h2>
          <div className="flex gap-1">
            {WINDOWS.map((w) => (
              <button
                key={w.label}
                onClick={() => setActiveWindow(w.label)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold tracking-wider border transition-colors cursor-pointer ${
                  activeWindow === w.label
                    ? 'bg-[#4f9cf9] border-[#4f9cf9] text-white'
                    : 'bg-transparent border-[#2a2a4a] text-[#6060a0] hover:border-[#4f9cf9] hover:text-[#c0c0e0]'
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
              <XAxis dataKey="time" tick={{ fill: '#a0a0c0', fontSize: 12 }} interval="preserveStartEnd" />
              <YAxis tick={{ fill: '#a0a0c0', fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#16213e',
                  border: '1px solid #2a2a4a',
                  borderRadius: '6px',
                  color: '#e0e0f0',
                }}
              />
              <Legend wrapperStyle={{ color: '#a0a0c0' }} />
              <Line type="monotone" dataKey="humidity" stroke="#4f9cf9" strokeWidth={2} dot={false} name="Humidity (%)" />
              <Line type="monotone" dataKey="temperature" stroke="#f97b4f" strokeWidth={2} dot={false} name={`Temperature (${tempUnit})`} />
              <Line type="monotone" dataKey="outdoorHumidity" stroke="#4f9cf9" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Outdoor Humidity (%)" connectNulls />
              <Line type="monotone" dataKey="outdoorTemperature" stroke="#f97b4f" strokeWidth={2} strokeDasharray="5 5" dot={false} name={`Outdoor Temp (${tempUnit})`} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center text-[#505080] py-10 text-sm">No readings available yet.</div>
        )}
      </section>

      {/* Table */}
      <section className="bg-[#16213e] border border-[#2a2a4a] rounded-xl p-5">
        <h2 className="text-sm font-semibold text-[#c0c0e0] uppercase tracking-wider mb-4">
          Readings — {activeWindow !== 'All' ? `Last ${activeWindow}` : 'All'}
        </h2>
        {windowedReadings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  {['MAC Address', 'Temperature', 'Humidity', 'Timestamp'].map((h) => (
                    <th
                      key={h}
                      className="text-left px-3.5 py-2.5 text-[#6060a0] font-semibold uppercase text-[0.72rem] tracking-widest border-b border-[#2a2a4a] whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {windowedReadings.map((r) => (
                  <tr key={r.id} className="odd:bg-[#1e1e3a] even:bg-[#16213e] hover:bg-[#252550]">
                    <td className="px-3.5 py-2.5 border-b border-[#1e1e38] whitespace-nowrap font-mono text-xs text-[#8080b0]">
                      {r.mac}
                    </td>
                    <td className="px-3.5 py-2.5 border-b border-[#1e1e38] whitespace-nowrap text-[#c0c0e0]">
                      {fmtTemp(r.temperature, useFahrenheit)}
                    </td>
                    <td className="px-3.5 py-2.5 border-b border-[#1e1e38] whitespace-nowrap text-[#c0c0e0]">
                      {r.humidity.toFixed(2)}%
                    </td>
                    <td className="px-3.5 py-2.5 border-b border-[#1e1e38] whitespace-nowrap text-[#c0c0e0]">
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center text-[#505080] py-10 text-sm">No readings in this window.</div>
        )}
      </section>
    </div>
  )
}
