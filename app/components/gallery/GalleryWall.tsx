'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

/**
 * A curved gallery wall. Items hang on the inside of an oval room and slide
 * along the wall as the visitor scrolls or drags. The room itself is drawn once
 * as an SVG backdrop; only the hung items move, so a frame costs one transform
 * per visible item.
 *
 * Coordinates: the camera sits at the origin looking down -z. CSS perspective
 * places the viewer `f` pixels in front of the screen plane, so a world point
 * (x, y, z) is translated by (x, y, z + f) and projects to
 * (x * f / -z, y * f / -z) around the perspective origin.
 */

export type WallItem = {
  key: string
  kind?: 'art' | 'placard'
  /** Width divided by height. */
  aspect: number
  /** Accessible name for the item's button. */
  label: string
  /** Two short caption lines shown under the work, the second in italics. */
  caption?: [string, string?]
  content: ReactNode
}

type Props = {
  items: WallItem[]
  onOpen: (item: WallItem) => void
  /** Remembers the wall position (per tab) so returning from a detail page lands where the visitor left. */
  storageKey?: string
  hint?: string
}

type Point = { x: number; z: number; s: number }

type Geometry = {
  width: number
  height: number
  f: number
  horizon: number
  itemHeight: number
  itemY: number
  gap: number
  ceilY: number
  floorY: number
  pts: Point[]
  perimeter: number
  /** Arc position directly ahead of the camera. */
  sAhead: number
}

const LUT_STEPS = 1536

function buildGeometry(width: number, height: number): Geometry {
  // Portrait screens crop the sides rather than shrinking the room.
  const virtualWidth = Math.max(width, height * 1.5)
  const f = (virtualWidth / 2) / Math.tan((90 * Math.PI) / 360)
  const A = 1.2 * f // lateral semi-axis of the oval room
  const B = 3.6 * f // depth semi-axis
  const zc = -5 * f + B // room centre on the z axis
  const cx = -0.45 * A // room centre sits left of the camera, so the right-hand wall is near
  const itemHeight = 0.62 * f

  const pts: Point[] = []
  let perimeter = 0
  let prev: Point | null = null
  for (let i = 0; i <= LUT_STEPS; i++) {
    const t = (i / LUT_STEPS) * Math.PI * 2
    const p: Point = { x: cx + A * Math.sin(t), z: zc - B * Math.cos(t), s: 0 }
    if (prev) perimeter += Math.hypot(p.x - prev.x, p.z - prev.z)
    p.s = perimeter
    pts.push(p)
    prev = p
  }

  // Where the wall crosses the camera's line of sight (x = 0) on the far side.
  const tAhead = Math.asin(Math.max(-1, Math.min(1, -cx / A)))
  const index = (tAhead / (Math.PI * 2)) * LUT_STEPS
  const lo = Math.floor(index)
  const sAhead = pts[lo].s + (pts[Math.min(lo + 1, LUT_STEPS)].s - pts[lo].s) * (index - lo)

  return {
    width,
    height,
    f,
    horizon: height * 0.57,
    itemHeight,
    itemY: -0.04 * itemHeight,
    gap: 0.55 * itemHeight,
    ceilY: -1.15 * itemHeight,
    floorY: 1.2 * itemHeight,
    pts,
    perimeter,
    sAhead
  }
}

function pointAt(g: Geometry, s: number) {
  const { pts, perimeter } = g
  const wrapped = ((s % perimeter) + perimeter) % perimeter
  let lo = 0
  let hi = pts.length - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (pts[mid].s < wrapped) lo = mid
    else hi = mid
  }
  const a = pts[lo]
  const b = pts[hi]
  const k = (wrapped - a.s) / (b.s - a.s || 1)
  const tx = b.x - a.x
  const tz = b.z - a.z
  const length = Math.hypot(tx, tz) || 1
  return { x: a.x + tx * k, z: a.z + tz * k, tx: tx / length, tz: tz / length }
}

function roomPaths(g: Geometry) {
  const project = (x: number, y: number, z: number): [number, number] => [g.width / 2 + (x * g.f) / -z, g.horizon + (y * g.f) / -z]
  const LIMIT = 1e5
  const clamp = (value: number) => Math.max(-LIMIT, Math.min(LIMIT, value))
  const edge = (y: number) => {
    // The longest run of wall points in front of the camera, unwrapped across the seam.
    const flags = g.pts.map((p) => p.z < -g.f * 0.2)
    const doubled = [...g.pts, ...g.pts]
    let best: Point[] = []
    let run: Point[] = []
    doubled.forEach((p, i) => {
      if (flags[i % g.pts.length]) run.push(p)
      else {
        if (run.length > best.length) best = run
        run = []
      }
    })
    if (run.length > best.length) best = run
    return best.slice(0, g.pts.length).map((p) => project(p.x, y, p.z).map(clamp) as [number, number])
  }
  const line = (pts: [number, number][]) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
  const ceiling = line(edge(g.ceilY))
  const floor = line(edge(g.floorY))
  return {
    ceiling,
    floor,
    ceilingFill: `${ceiling} L${LIMIT} ${-LIMIT} L${-LIMIT} ${-LIMIT} Z`,
    floorFill: `${floor} L${LIMIT} ${LIMIT} L${-LIMIT} ${LIMIT} Z`
  }
}

/**
 * Where the detail page draws its main image (see .gs-product / .gs-media-frame),
 * so the clicked work can fly straight into place before the page arrives.
 */
function detailFrame(aspect: number) {
  const width = window.innerWidth
  const height = window.innerHeight
  if (width <= 900) {
    const w = Math.min(width - 36, 420)
    return { x: (width - w) / 2, y: 72, w, h: w / aspect }
  }
  const content = Math.min(1280, width)
  const left = (width - content) / 2 + 40
  const column = ((content - 80 - 64) * 1.05) / 2.05
  let h = Math.min(height * 0.74, 720)
  let w = h * aspect
  if (w > column) { w = column; h = w / aspect }
  return { x: left + column - w, y: 84, w, h }
}

/** A flat copy of the artwork that travels from the wall to the detail page's image slot. */
function flyToDetail(art: HTMLElement, aspect: number) {
  const from = art.getBoundingClientRect()
  const to = detailFrame(aspect)
  const ghost = document.createElement('div')
  ghost.className = 'gw-ghost'
  ghost.setAttribute('aria-hidden', 'true')
  ghost.appendChild(art.cloneNode(true))
  Object.assign(ghost.style, { left: `${to.x}px`, top: `${to.y}px`, width: `${to.w}px`, height: `${to.h}px` })
  ghost.style.transform = `translate(${from.left - to.x}px, ${from.top - to.y}px) scale(${from.width / to.w}, ${from.height / to.h})`
  document.body.appendChild(ghost)
  ghost.getBoundingClientRect()
  requestAnimationFrame(() => {
    ghost.classList.add('is-flying')
    ghost.style.transform = 'none'
  })
  let removed = false
  const remove = () => {
    if (removed) return
    removed = true
    window.removeEventListener('gs:arrived', arrive)
    ghost.classList.add('is-done')
    window.setTimeout(() => ghost.remove(), 260)
  }
  // The detail page announces itself once its image is on screen.
  const arrive = () => window.setTimeout(remove, 120)
  window.addEventListener('gs:arrived', arrive)
  window.setTimeout(remove, 5000)
}

type Placed = { item: WallItem; key: string; copy: number; width: number; height: number; s: number }

export default function GalleryWall({ items, onOpen, storageKey, hint = 'Scroll or drag to walk the wall' }: Props) {
  const stageRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [geometry, setGeometry] = useState<Geometry | null>(null)
  const [dragging, setDragging] = useState(false)

  const motion = useRef({ offset: 0, target: 0, opening: false, restored: false })
  const drag = useRef<{ x: number; target: number; moved: boolean; lastX: number; lastT: number; velocity: number } | null>(null)

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const measure = () => {
      const rect = stage.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) setGeometry(buildGeometry(rect.width, rect.height))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(stage)
    return () => observer.disconnect()
  }, [])

  const placed = useMemo(() => {
    if (!geometry || items.length === 0) return { list: [] as Placed[], total: 1 }
    const one = items.map((item) => {
      const height = item.kind === 'placard' ? geometry.itemHeight * 0.62 : geometry.itemHeight
      return { item, width: height * item.aspect, height }
    })
    const length = one.reduce((sum, entry) => sum + entry.width + geometry.gap, 0)
    // Short collections repeat round the room so the wall never shows a long blank stretch.
    const copies = items.length >= 4 && length < geometry.perimeter ? Math.ceil(geometry.perimeter / length) : 1
    const list: Placed[] = []
    let s = 0
    for (let copy = 0; copy < copies; copy++) {
      for (const entry of one) {
        list.push({ ...entry, key: `${entry.item.key}~${copy}`, copy, s: s + entry.width / 2 })
        s += entry.width + geometry.gap
      }
    }
    return { list, total: Math.max(s, geometry.perimeter) }
  }, [geometry, items])

  const paths = useMemo(() => (geometry ? roomPaths(geometry) : null), [geometry])

  const layout = useCallback(() => {
    const g = geometry
    if (!g) return
    const { offset } = motion.current
    const { list, total } = placed
    const limit = g.perimeter / 2
    list.forEach((entry, index) => {
      const element = itemRefs.current[index]
      if (!element) return
      let rel = (((entry.s - offset) % total) + total) % total
      if (rel > total / 2) rel -= total
      const p = Math.abs(rel) < limit - entry.width ? pointAt(g, g.sAhead + rel) : null
      const screenX = p ? (p.x * g.f) / -p.z : 0
      if (!p || p.z > -g.f * 0.45 || Math.abs(screenX) > g.width) {
        if (element.style.visibility !== 'hidden') element.style.visibility = 'hidden'
        return
      }
      const angle = Math.atan2(-p.tz, p.tx)
      element.style.visibility = 'visible'
      element.style.transform = `translate3d(${p.x.toFixed(2)}px, ${g.itemY.toFixed(2)}px, ${(p.z + g.f).toFixed(2)}px) rotateY(${angle.toFixed(5)}rad) translate(-50%, -50%)`
    })
  }, [geometry, placed])

  // Restore the remembered position once the wall knows its own length.
  useEffect(() => {
    if (!geometry || motion.current.restored || placed.list.length === 0) return
    motion.current.restored = true
    let start = placed.list[0].s - geometry.perimeter * 0.12
    if (storageKey) {
      try {
        const saved = Number(window.sessionStorage.getItem(storageKey))
        if (Number.isFinite(saved) && window.sessionStorage.getItem(storageKey) !== null) start = saved
      } catch { /* storage can be unavailable; start at the beginning */ }
    }
    motion.current.offset = start
    motion.current.target = start
  }, [geometry, placed, storageKey])

  useEffect(() => {
    let frame = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(64, now - last)
      last = now
      const m = motion.current
      m.offset += (m.target - m.offset) * (1 - Math.exp(-dt / 95))
      if (Math.abs(m.target - m.offset) < 0.05) m.offset = m.target
      layout()
      frame = requestAnimationFrame(tick)
    }
    layout()
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [layout])

  useEffect(() => () => {
    if (!storageKey) return
    try { window.sessionStorage.setItem(storageKey, String(motion.current.target)) } catch { /* ignore */ }
  }, [storageKey])

  const step = geometry ? geometry.itemHeight * 0.66 + geometry.gap : 300

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      if (motion.current.opening) return
      const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 400 : 1
      motion.current.target += (event.deltaY + event.deltaX) * scale * 1.25
    }
    stage.addEventListener('wheel', onWheel, { passive: false })
    return () => stage.removeEventListener('wheel', onWheel)
  }, [])

  const nearestTarget = (s: number) => {
    const { total } = placed
    const current = motion.current.target
    return s + Math.round((current - s) / total) * total
  }

  const open = (index: number) => {
    const entry = placed.list[index]
    const element = itemRefs.current[index]
    const stage = stageRef.current
    if (!entry || !element || !stage || motion.current.opening) return
    motion.current.opening = true
    if (storageKey) {
      try { window.sessionStorage.setItem(storageKey, String(motion.current.target)) } catch { /* ignore */ }
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onOpen(entry.item)
      return
    }
    const art = element.querySelector('.gw-art')
    if (art) flyToDetail(art as HTMLElement, entry.item.aspect)
    const rect = element.getBoundingClientRect()
    const box = stage.getBoundingClientRect()
    stage.style.setProperty('--gw-origin', `${rect.left + rect.width / 2 - box.left}px ${rect.top + rect.height / 2 - box.top}px`)
    stage.classList.add('is-leaving')
    window.setTimeout(() => onOpen(entry.item), 560)
  }

  const onPointerDown = (event: React.PointerEvent) => {
    if (event.button !== 0 || motion.current.opening) return
    drag.current = { x: event.clientX, target: motion.current.target, moved: false, lastX: event.clientX, lastT: performance.now(), velocity: 0 }
  }

  const onPointerMove = (event: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const dx = event.clientX - d.x
    if (!d.moved && Math.abs(dx) > 6) {
      d.moved = true
      setDragging(true)
      stageRef.current?.setPointerCapture(event.pointerId)
    }
    if (!d.moved) return
    const now = performance.now()
    const dt = Math.max(1, now - d.lastT)
    d.velocity = d.velocity * 0.6 + ((event.clientX - d.lastX) / dt) * 0.4
    d.lastX = event.clientX
    d.lastT = now
    motion.current.target = d.target - dx * 2.6
  }

  const endDrag = (event: React.PointerEvent) => {
    const d = drag.current
    drag.current = null
    if (!d) return
    if (d.moved) {
      // A little glide after a flick.
      motion.current.target -= d.velocity * 2.6 * 260
      setDragging(false)
      if (stageRef.current?.hasPointerCapture(event.pointerId)) stageRef.current.releasePointerCapture(event.pointerId)
      // Swallow the click that follows a drag.
      const swallow = (click: MouseEvent) => { click.stopPropagation(); click.preventDefault() }
      window.addEventListener('click', swallow, { capture: true, once: true })
      window.setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 0)
    }
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (motion.current.opening) return
    if (event.key === 'ArrowRight') { motion.current.target += step; event.preventDefault() }
    if (event.key === 'ArrowLeft') { motion.current.target -= step; event.preventDefault() }
  }

  return (
    <div
      ref={stageRef}
      className={`gw-stage${dragging ? ' is-dragging' : ''}`}
      tabIndex={0}
      role="region"
      aria-label="Gallery wall. Use the arrow keys or scroll to move along the wall."
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={onKeyDown}
    >
      <div className="gw-zoom">
        {geometry && paths && <svg className="gw-room" viewBox={`0 0 ${geometry.width} ${geometry.height}`} aria-hidden="true">
          <defs>
            <linearGradient id="gw-wall" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#f6f6f5" /><stop offset="0.6" stopColor="#f1f1f0" /><stop offset="1" stopColor="#eaeae9" />
            </linearGradient>
            <linearGradient id="gw-ceiling" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#fbfbfa" /><stop offset="1" stopColor="#fdfdfc" />
            </linearGradient>
            <linearGradient id="gw-floor" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#dfdfde" /><stop offset="1" stopColor="#ececeb" />
            </linearGradient>
            <filter id="gw-soft" x="-5%" y="-50%" width="110%" height="200%"><feGaussianBlur stdDeviation="6" /></filter>
          </defs>
          <rect width={geometry.width} height={geometry.height} fill="url(#gw-wall)" />
          <path d={paths.ceilingFill} fill="url(#gw-ceiling)" />
          <path d={paths.floorFill} fill="url(#gw-floor)" />
          <path d={paths.floor} fill="none" stroke="rgba(0,0,0,0.09)" strokeWidth="10" filter="url(#gw-soft)" />
          <path d={paths.ceiling} fill="none" stroke="rgba(0,0,0,0.035)" strokeWidth="14" filter="url(#gw-soft)" />
        </svg>}
        {geometry && <div className="gw-scene" style={{ perspective: `${geometry.f}px`, perspectiveOrigin: `50% ${geometry.horizon}px` }}>
          <div className="gw-anchor" style={{ top: geometry.horizon }}>
            {placed.list.map((entry, index) => (
              <button
                key={entry.key}
                ref={(element) => { itemRefs.current[index] = element }}
                type="button"
                className={`gw-item${entry.item.kind === 'placard' ? ' is-placard' : ''}`}
                style={{ width: entry.width, height: entry.height, fontSize: entry.height * 0.045 }}
                aria-label={entry.item.label}
                aria-hidden={entry.copy > 0 || undefined}
                tabIndex={entry.copy > 0 ? -1 : 0}
                onFocus={() => { if (!motion.current.opening && !drag.current) motion.current.target = nearestTarget(entry.s) }}
                onClick={() => {
                  if (entry.item.kind === 'placard') motion.current.target = nearestTarget(entry.s)
                  else open(index)
                }}
              >
                <span className="gw-art">{entry.item.content}</span>
                {entry.item.caption && <span className="gw-cap">
                  <span>{entry.item.caption[0]}</span>
                  {entry.item.caption[1] && <em>{entry.item.caption[1]}</em>}
                </span>}
              </button>
            ))}
          </div>
        </div>}
      </div>
      {hint && <p className="gw-hint">{hint}</p>}
    </div>
  )
}
