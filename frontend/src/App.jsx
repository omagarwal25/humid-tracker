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

function formatHHMM(dateStr) {
  const d = new Date(dateStr)
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

export default function App() {
  const [readings, setReadings] = useState([])
  const [stats, setStats] = useState(null)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  async function fetchData() {
    try {
      const [readingsRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/api/readings?limit=500`),
        fetch(`${API_BASE}/api/readings/stats`),
      ])

      if (!readingsRes.ok || !statsRes.ok) {
        throw new Error('Failed to fetch data from backend')
      }

      const readingsData = await readingsRes.json()
      const statsData = await statsRes.json()

      setReadings(readingsData)
      setStats(statsData)
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

  const chartData = [...readings]
    .reverse()
    .map((r) => ({
      time: formatHHMM(r.createdAt),
      humidity: parseFloat(r.humidity.toFixed(2)),
      temperature: parseFloat(r.temperature.toFixed(2)),
    }))

  return (
    <div className="app">
      <header className="header">
        <h1>Humidity Monitor</h1>
        {lastUpdated && (
          <span className="last-updated">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </span>
        )}
      </header>

      {error && <div className="error-banner">Error: {error}</div>}

      <section className="stats-bar">
        <div className="stat-card">
          <div className="stat-label">Current Humidity</div>
          <div className="stat-value">
            {latest ? `${latest.humidity.toFixed(2)}%` : '—'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Current Temp</div>
          <div className="stat-value">
            {latest ? `${latest.temperature.toFixed(2)}°C` : '—'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Humidity Min / Max</div>
          <div className="stat-value">
            {stats
              ? `${stats.humidity.min.toFixed(2)}% / ${stats.humidity.max.toFixed(2)}%`
              : '—'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Humidity Avg</div>
          <div className="stat-value">
            {stats ? `${stats.humidity.avg.toFixed(2)}%` : '—'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Temp Min / Max</div>
          <div className="stat-value">
            {stats
              ? `${stats.temperature.min.toFixed(2)}°C / ${stats.temperature.max.toFixed(2)}°C`
              : '—'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Temp Avg</div>
          <div className="stat-value">
            {stats ? `${stats.temperature.avg.toFixed(2)}°C` : '—'}
          </div>
        </div>
      </section>

      <section className="chart-section">
        <h2>Readings Over Time</h2>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
              <XAxis
                dataKey="time"
                tick={{ fill: '#a0a0c0', fontSize: 12 }}
                interval="preserveStartEnd"
              />
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
              <Line
                type="monotone"
                dataKey="humidity"
                stroke="#4f9cf9"
                strokeWidth={2}
                dot={false}
                name="Humidity (%)"
              />
              <Line
                type="monotone"
                dataKey="temperature"
                stroke="#f97b4f"
                strokeWidth={2}
                dot={false}
                name="Temperature (°C)"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="no-data">No readings available yet.</div>
        )}
      </section>

      <section className="table-section">
        <h2>All Readings</h2>
        {readings.length > 0 ? (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>MAC Address</th>
                  <th>Temperature</th>
                  <th>Humidity</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {readings.map((r) => (
                  <tr key={r.id}>
                    <td className="mono">{r.mac}</td>
                    <td>{r.temperature.toFixed(2)}°C</td>
                    <td>{r.humidity.toFixed(2)}%</td>
                    <td>{new Date(r.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="no-data">No readings to display.</div>
        )}
      </section>
    </div>
  )
}
