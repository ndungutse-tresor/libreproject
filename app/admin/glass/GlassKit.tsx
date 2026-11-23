'use client'

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'

/**
 * Small building blocks for the glass admin: icons, numbers that count up,
 * bar charts that grow, a donut and a ring that draw themselves.
 * Shared by the Libra and StudyReel admin workspaces (copied, not imported).
 */

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Props that make an element float up into place, `index` steps apart. */
export function rise(index: number, className = ''): { className: string; style: CSSProperties } {
  return { className: `ga-rise${className ? ` ${className}` : ''}`, style: { '--i': index } as CSSProperties }
}

/** 1.2K, 34K, 1.5M. Written out by hand so the server and the browser always agree. */
export function compactNumber(value: number) {
  const abs = Math.abs(value)
  const [scaled, unit] = abs >= 1e9 ? [value / 1e9, 'B'] : abs >= 1e6 ? [value / 1e6, 'M'] : abs >= 1e3 ? [value / 1e3, 'K'] : [value, '']
  const digits = Math.abs(scaled) >= 100 || (!unit && Number.isInteger(scaled)) ? 0 : 1
  return `${Number(scaled.toFixed(digits)).toLocaleString('en')}${unit}`
}

export const wholeNumber = (value: number) => Math.round(value).toLocaleString('en')

/** Currency amounts, e.g. $1,240 or £12.50; `compact` gives $1.2K. */
export function money(currency = 'USD', compact = false) {
  let symbol = `${currency} `
  try {
    symbol = new Intl.NumberFormat('en', { style: 'currency', currency, currencyDisplay: 'narrowSymbol' }).formatToParts(0).find((part) => part.type === 'currency')?.value ?? symbol
  } catch { /* unknown currency code: keep the code itself */ }
  return (value: number) => {
    const sign = value < 0 ? '-' : ''
    const abs = Math.abs(value)
    if (compact) return `${sign}${symbol}${compactNumber(abs)}`
    const digits = abs >= 1000 || Number.isInteger(Math.round(abs * 100) / 100) ? 0 : 2
    return `${sign}${symbol}${abs.toLocaleString('en', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`
  }
}

export const percent = (digits = 1) => (value: number) => `${value.toFixed(digits)}%`

/** Initials for an avatar circle. */
export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : parts[0]?.[1] ?? '')).toUpperCase() || '·'
}

/** Morning, afternoon or evening, by the visitor's own clock. */
export function Greeting({ name }: { name: string }) {
  const [part, setPart] = useState('Hello')
  useEffect(() => {
    const hour = new Date().getHours()
    setPart(hour < 5 ? 'Good evening' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening')
  }, [])
  return <>{part}, {name}</>
}

/** Today's date in the visitor's own words, e.g. "Monday, November 23". */
export function Today() {
  const [text, setText] = useState('')
  useEffect(() => {
    setText(new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date()))
  }, [])
  return <>{text}</>
}

/**
 * A number that counts up from zero the first time it appears, and glides to
 * new values after that. The server renders the final value, so nothing is lost
 * without JavaScript.
 */
export function CountUp({ value, format = wholeNumber, duration = 1100 }: { value: number; format?: (value: number) => string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const shown = useRef(0)
  const formatRef = useRef(format)
  formatRef.current = format

  useIsoLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    if (prefersReducedMotion()) {
      shown.current = value
      element.textContent = formatRef.current(value)
      return
    }
    const from = shown.current
    const start = performance.now()
    let frame = 0
    element.textContent = formatRef.current(from)
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 4)
      shown.current = from + (value - from) * eased
      element.textContent = formatRef.current(t >= 1 ? value : shown.current)
      if (t < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [value, duration])

  return <span ref={ref}>{format(value)}</span>
}

/* ---------- icons (lucide-style strokes) ---------- */

const PATHS: Record<string, ReactNode> = {
  home: <><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M10 21v-6h4v6" /></>,
  chart: <><path d="M3 3v18h18" /><path d="M8 16v-5" /><path d="M13 16V8" /><path d="M18 16v-8" /></>,
  tasks: <><path d="m9 11 3 3 8-8" /><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9" /></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  userPlus: <><circle cx="9" cy="8" r="4" /><path d="M2 21a7 7 0 0 1 14 0" /><path d="M19 8v6" /><path d="M16 11h6" /></>,
  shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></>,
  headphones: <><path d="M3 18v-6a9 9 0 0 1 18 0v6" /><path d="M21 19a2 2 0 0 1-2 2h-1v-6h3z" /><path d="M3 19a2 2 0 0 0 2 2h1v-6H3z" /></>,
  megaphone: <><path d="m3 11 18-5v12L3 14z" /><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" /></>,
  review: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="m9 15 2 2 4-4" /></>,
  dollar: <><path d="M12 2v20" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></>,
  card: <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></>,
  receipt: <><path d="M4 2v20l3-2 3 2 3-2 3 2 3-2 1 .7V2l-1 .7-3-2-3 2-3-2-3 2-3-2z" /><path d="M8 8h8" /><path d="M8 12h8" /><path d="M8 16h5" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  history: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l4 2" /></>,
  plug: <><path d="M12 22v-5" /><path d="M9 8V2" /><path d="M15 8V2" /><path d="M18 8v5a6 6 0 0 1-12 0V8z" /></>,
  server: <><rect x="3" y="3" width="18" height="8" rx="2" /><rect x="3" y="13" width="18" height="8" rx="2" /><path d="M7 7h.01" /><path d="M7 17h.01" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
  refresh: <><path d="M21 12a9 9 0 1 1-2.6-6.4L21 8" /><path d="M21 3v5h-5" /></>,
  download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5" /><path d="M12 15V3" /></>,
  external: <><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></>,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></>,
  bell: <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" /></>,
  book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></>,
  library: <><path d="m16 6 4 14" /><path d="M12 6v14" /><path d="M8 8v12" /><path d="M4 4v16" /></>,
  film: <><rect x="2" y="2" width="20" height="20" rx="2.5" /><path d="M7 2v20" /><path d="M17 2v20" /><path d="M2 12h20" /><path d="M2 7h5" /><path d="M2 17h5" /><path d="M17 17h5" /><path d="M17 7h5" /></>,
  graduation: <><path d="M22 10 12 5 2 10l10 5 10-5z" /><path d="M6 12v5c3 2 9 2 12 0v-5" /></>,
  inbox: <><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.1z" /></>,
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
  x: <><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>,
  check: <path d="M20 6 9 17l-5-5" />,
  up: <><path d="M7 17 17 7" /><path d="M8 7h9v9" /></>,
  down: <><path d="M7 7l10 10" /><path d="M17 8v9H8" /></>,
  trending: <><path d="m22 7-8.5 8.5-5-5L2 17" /><path d="M16 7h6v6" /></>,
  layers: <><path d="m12 2 10 5-10 5L2 7z" /><path d="m2 17 10 5 10-5" /><path d="m2 12 10 5 10-5" /></>,
  menu: <><path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" /></>,
  sparkles: <><path d="M12 3 13.9 8.1 19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" /><path d="M19 3v4" /><path d="M21 5h-4" /></>,
  quote: <><path d="M3 21c3 0 7-1 7-8V5H3v7h4c0 4-2 6-4 6z" /><path d="M14 21c3 0 7-1 7-8V5h-7v7h4c0 4-2 6-4 6z" /></>,
  image: <><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-5-5L5 21" /></>,
  calendar: <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" /></>,
  play: <><circle cx="12" cy="12" r="9" /><path d="m10 8 6 4-6 4z" /></>,
  coins: <><circle cx="8" cy="8" r="6" /><path d="M18.1 10.4A6 6 0 1 1 10.3 18" /><path d="M7 6h1v4" /></>,
  percent: <><path d="M19 5 5 19" /><circle cx="6.5" cy="6.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" /></>,
  activity: <path d="M22 12h-4l-3 9L9 3l-3 9H2" />,
  star: <path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.2L5.8 21 7 14.2 2 9.3l6.9-1z" />,
  key: <><circle cx="7.5" cy="15.5" r="5.5" /><path d="m21 2-9.6 9.6" /><path d="m15.5 7.5 3 3L22 7l-3-3" /></>,
  pin: <><path d="M12 17v5" /><path d="M9 10.8V5h6v5.8l3 3.2v2H6v-2z" /></>,
  send: <><path d="m22 2-7 20-4-9-9-4z" /><path d="M22 2 11 13" /></>,
  trash: <><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 16v-4" /><path d="M12 8h.01" /></>,
  alert: <><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><path d="M12 9v4" /><path d="M12 17h.01" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3a14 14 0 0 1 0 18" /><path d="M12 3a14 14 0 0 0 0 18" /></>
}

export type IconName = keyof typeof PATHS

export function GaIcon({ name, size }: { name: IconName | string; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {PATHS[name] ?? PATHS.layers}
    </svg>
  )
}

/* ---------- controls ---------- */

export function Segmented<T extends string>({ options, value, onChange, label, wide }: {
  options: { value: T; label: string; count?: number }[]
  value: T
  onChange: (value: T) => void
  label: string
  wide?: boolean
}) {
  return (
    <div className={`ga-segmented${wide ? ' is-wide' : ''}`} role="group" aria-label={label}>
      {options.map((option) => (
        <button key={option.value} type="button" aria-pressed={option.value === value} onClick={() => onChange(option.value)}>
          {option.label}
          {option.count !== undefined && <span>{option.count}</span>}
        </button>
      ))}
    </div>
  )
}

/** A change against the previous period, as a small green or red pill. */
export function Change({ now, before, suffix = '' }: { now: number; before: number; suffix?: string }) {
  if (!before && !now) return null
  const delta = before ? ((now - before) / before) * 100 : 100
  const up = delta >= 0
  return (
    <span className={`ga-chip ${up ? 'is-green' : 'is-red'}`} title={`Compared with the period before${suffix}`}>
      <GaIcon name={up ? 'up' : 'down'} />
      {`${up ? '+' : ''}${Math.round(delta)}%`}
    </span>
  )
}

export function StatCard({ icon, value, format, label, sub, badge, index = 0, onClick, pressed }: {
  icon: IconName | string
  value: number
  format?: (value: number) => string
  label: string
  sub?: ReactNode
  badge?: ReactNode
  index?: number
  onClick?: () => void
  pressed?: boolean
}) {
  const body = (
    <>
      <span className="ga-stat-icon"><GaIcon name={icon} /></span>
      {badge}
      <strong><CountUp value={value} format={format} /></strong>
      <b>{label}</b>
      {sub && <small>{sub}</small>}
    </>
  )
  const props = rise(index, 'ga-card ga-stat is-lift')
  if (onClick) return <button type="button" {...props} onClick={onClick} aria-pressed={pressed}>{body}</button>
  return <article {...props}>{body}</article>
}

/* ---------- charts ---------- */

export type Datum = { label: string; value: number; hint?: string }

/** A round top for the value axis, so its four steps read cleanly (0, 50, 100, 150, 200). */
function niceMax(value: number, integers = false) {
  if (value <= 0) return 4
  const step = value / 4
  const power = Math.max(integers ? 1 : 0, Math.pow(10, Math.floor(Math.log10(step))))
  const steps = integers && power === 1 ? [1, 2, 5, 10] : [1, 2, 2.5, 5, 10]
  const nice = steps.find((candidate) => candidate * power >= step) ?? 10
  return nice * power * 4
}

/** Bars that grow up from the axis; the latest one is picked out, as on a live dashboard. */
export function BarChart({ data, format = compactNumber, height = 210, highlight = 'last', empty = 'Nothing to chart yet.' }: {
  data: Datum[]
  format?: (value: number) => string
  height?: number
  highlight?: 'last' | 'max'
  empty?: string
}) {
  const box = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [hover, setHover] = useState(-1)

  useEffect(() => {
    const element = box.current
    if (!element) return
    const measure = () => setWidth(element.clientWidth)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const max = niceMax(Math.max(0, ...data.map((d) => d.value)), data.every((d) => Number.isInteger(d.value)))
  const peak = highlight === 'last' ? data.length - 1 : data.reduce((best, d, i) => (d.value > data[best].value ? i : best), 0)
  const left = 40
  const bottom = 22
  const top = 18
  const plotW = Math.max(0, width - left - 4)
  const plotH = height - bottom - top
  const slot = data.length ? plotW / data.length : 0
  const barW = Math.min(46, slot * 0.5)
  const nothing = data.every((d) => d.value === 0)
  // On narrow charts, label every second or third bar so the dates never collide.
  const labelEvery = slot > 0 && slot < 46 ? Math.ceil(46 / slot) : 1
  // Remount the bars when the data changes so they grow again.
  const key = useMemo(() => data.map((d) => `${d.label}:${d.value}`).join('|'), [data])

  return (
    <div className="ga-bars" ref={box} style={{ height }} onMouseLeave={() => setHover(-1)}>
      {width > 0 && (nothing ? <div className="ga-bars-empty">{empty}</div> : (
        <svg key={key} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={data.map((d) => `${d.label}: ${format(d.value)}`).join(', ')}>
          {[0, 0.25, 0.5, 0.75, 1].map((step) => {
            const y = top + plotH * (1 - step)
            return (
              <g key={step}>
                <line className="ga-grid-line" x1={left} x2={width} y1={y} y2={y} />
                <text x={left - 8} y={y + 3} textAnchor="end">{step === 0 ? '0' : format(max * step)}</text>
              </g>
            )
          })}
          {data.map((d, i) => {
            const h = Math.max(d.value > 0 ? 3 : 0, (d.value / max) * plotH)
            const x = left + slot * i + (slot - barW) / 2
            const y = top + plotH - h
            return (
              <g key={d.label} onMouseEnter={() => setHover(i)}>
                <rect x={left + slot * i} y={top} width={slot} height={plotH} fill="transparent" />
                <rect className={`ga-bar${i === peak ? ' is-peak' : ''}`} x={x} y={y} width={barW} height={h} rx={Math.min(7, barW / 3)} style={{ animationDelay: `${150 + i * 70}ms` }} />
                {i === peak && d.value > 0 && <text className="ga-bar-value" x={x + barW / 2} y={y - 7} textAnchor="middle">{format(d.value)}</text>}
                {(data.length - 1 - i) % labelEvery === 0 && <text x={x + barW / 2} y={height - 5} textAnchor="middle">{d.label}</text>}
              </g>
            )
          })}
        </svg>
      ))}
      {hover >= 0 && data[hover] && width > 0 && !nothing && (
        <div className="ga-tip" style={{ left: left + slot * hover + slot / 2, top: top + plotH - (data[hover].value / max) * plotH }}>
          {format(data[hover].value)}
          <small>{data[hover].hint ?? data[hover].label}</small>
        </div>
      )}
    </div>
  )
}

export const PALETTE = ['#3b82f6', '#22c55e', '#f59e0b', '#ef5b3b', '#a855f7', '#14b8a6', '#64748b']

/** A donut whose arcs draw themselves in; hovering a legend entry lifts its arc. */
export function Donut({ data, center, centerLabel, format = compactNumber, size = 150 }: {
  data: { label: string; value: number; color?: string }[]
  center: ReactNode
  centerLabel?: string
  format?: (value: number) => string
  size?: number
}) {
  const [drawn, setDrawn] = useState(false)
  const [on, setOn] = useState(-1)
  useEffect(() => {
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => setDrawn(true)))
    return () => cancelAnimationFrame(frame)
  }, [])
  const total = data.reduce((sum, d) => sum + d.value, 0)
  const r = size / 2 - 14
  const c = 2 * Math.PI * r
  const gap = data.filter((d) => d.value > 0).length > 1 ? 3 : 0
  let offset = 0
  return (
    <div>
      <div className="ga-donut">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={data.map((d) => `${d.label}: ${format(d.value)}`).join(', ')}>
          <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(16,40,64,0.08)" strokeWidth="16" />
          {total > 0 && data.map((d, i) => {
            const length = (d.value / total) * c
            const arc = Math.max(0, length - gap)
            const start = offset
            offset += length
            return (
              <circle
                key={d.label}
                className={`ga-arc${on === i ? ' is-on' : ''}`}
                cx={size / 2}
                cy={size / 2}
                r={r}
                stroke={d.color ?? PALETTE[i % PALETTE.length]}
                strokeWidth="16"
                strokeLinecap="butt"
                strokeDasharray={`${drawn ? arc : 0} ${c}`}
                strokeDashoffset={-start}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                style={{ transition: `stroke-dasharray 900ms cubic-bezier(0.22,1,0.36,1) ${120 + i * 110}ms, stroke-width 200ms ease` }}
                onMouseEnter={() => setOn(i)}
                onMouseLeave={() => setOn(-1)}
              />
            )
          })}
          <text className="ga-donut-center" x="50%" y={centerLabel ? '48%' : '52%'} textAnchor="middle" dominantBaseline="middle">{center}</text>
          {centerLabel && <text className="ga-donut-sub" x="50%" y="61%" textAnchor="middle">{centerLabel}</text>}
        </svg>
      </div>
      <div className="ga-legend">
        {data.map((d, i) => (
          <button type="button" key={d.label} onMouseEnter={() => setOn(i)} onMouseLeave={() => setOn(-1)} onFocus={() => setOn(i)} onBlur={() => setOn(-1)}>
            <i style={{ background: d.color ?? PALETTE[i % PALETTE.length] }} />
            <span>{d.label}</span>
            <b>{format(d.value)}</b>
          </button>
        ))}
      </div>
    </div>
  )
}

/** A progress ring that fills to `value` (0 to 1), with a number counting up in the middle. */
export function Ring({ value, label, size = 128, format = (v: number) => `${Math.round(v)}%` }: { value: number; label?: string; size?: number; format?: (value: number) => string }) {
  const [drawn, setDrawn] = useState(false)
  useEffect(() => {
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => setDrawn(true)))
    return () => cancelAnimationFrame(frame)
  }, [])
  const clamped = Math.max(0, Math.min(1, value || 0))
  const r = size / 2 - 9
  const c = 2 * Math.PI * r
  const id = `ga-ring-${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  return (
    <div className="ga-ring" style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#3cc6ea" />
            <stop offset="1" stopColor="#1d7fd0" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(16,40,64,0.08)" strokeWidth="10" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={`url(#${id})`}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={drawn ? c * (1 - clamped) : c}
          style={{ transition: 'stroke-dashoffset 1200ms cubic-bezier(0.22,1,0.36,1) 150ms' }}
        />
      </svg>
      <div className="ga-ring-label">
        <div>
          <strong><CountUp value={clamped * 100} format={format} duration={1200} /></strong>
          {label && <small style={{ display: 'block' }}>{label}</small>}
        </div>
      </div>
    </div>
  )
}

/** Last `count` months as chart slots, oldest first: `{ key: '2026-11', label: 'Nov' }`. */
export function lastMonths(count: number, now = new Date()) {
  const months: { key: string; label: string }[] = []
  for (let i = count - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({ key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`, label: date.toLocaleString('en', { month: 'short' }) })
  }
  return months
}
