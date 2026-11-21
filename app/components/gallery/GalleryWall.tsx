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
  /** Shown under a piece once it has been brought forward. */
  focusHint?: string
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
  // Portrait screens crop the sides rather than shrinking the room, and lean in
  // further so the pieces stay big enough to recognise on a phone.
  const virtualWidth = height > width ? Math.max(width, height * 2.1) : Math.max(width, height * 1.5)
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

type Rect = { x: number; y: number; w: number; h: number }
type Box = { left: number; top: number; width: number; height: number }

/**
 * Where the detail page draws its main image (see .gs-product / .gs-media-frame),
 * so the chosen work can glide straight into place before the page arrives.
 */
function detailFrame(aspect: number): Rect {
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

/** Where a piece sits when it is brought forward: centred and large, with its caption beneath. */
function focusFrame(stage: Box, aspect: number): Rect {
  const narrow = stage.width < 700
  let h = stage.height * (narrow ? 0.5 : 0.62)
  let w = h * aspect
  const maxWidth = stage.width * (narrow ? 0.78 : 0.5)
  if (w > maxWidth) { w = maxWidth; h = w / aspect }
  return { x: stage.left + (stage.width - w) / 2, y: stage.top + stage.height * 0.46 - h / 2, w, h }
}

function place(element: HTMLElement, r: Rect) {
  Object.assign(element.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px` })
}

/** A transform that makes an element laid out at `to` appear exactly over `from`. */
function mapOnto(from: Box, to: Rect) {
  return `translate(${from.left - to.x}px, ${from.top - to.y}px) scale(${from.width / to.w}, ${from.height / to.h})`
}

/** A flat copy of the artwork, lifted off the wall. It lives on <body> so it can outlast the page. */
function makeGhost(art: HTMLElement, item: WallItem, frame: Rect, hint: string) {
  const ghost = document.createElement('button')
  ghost.type = 'button'
  ghost.className = 'gw-ghost'
  ghost.setAttribute('aria-label', item.label)
  ghost.appendChild(art.cloneNode(true))
  const caption = document.createElement('span')
  caption.className = 'gw-ghost-cap'
  if (item.caption) {
    const first = document.createElement('span')
    first.textContent = item.caption[0]
    caption.appendChild(first)
    if (item.caption[1]) {
      const second = document.createElement('em')
      second.textContent = item.caption[1]
      caption.appendChild(second)
    }
  }
  const note = document.createElement('small')
  note.textContent = hint
  caption.appendChild(note)
  ghost.appendChild(caption)
  place(ghost, frame)
  return ghost
}

/** Keeps the ghost over the detail page's image until the page says it has drawn it. */
function handOff(ghost: HTMLElement) {
  let removed = false
  const remove = () => {
    if (removed) return
    removed = true
    window.removeEventListener('gs:arrived', arrive)
    ghost.classList.add('is-done')
    window.setTimeout(() => ghost.remove(), 260)
  }
  const arrive = () => window.setTimeout(remove, 160)
  window.addEventListener('gs:arrived', arrive)
  window.setTimeout(remove, 5000)
}

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Ignores the click that the browser sends at the end of a drag or a dismissing tap. */
function swallowNextClick() {
  const swallow = (click: MouseEvent) => { click.stopPropagation(); click.preventDefault() }
  window.addEventListener('click', swallow, { capture: true, once: true })
  window.setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 0)
}

type Focus = { index: number; item: WallItem; element: HTMLButtonElement; ghost: HTMLButtonElement; from: Box; frame: Rect }

type Placed = { item: WallItem; key: string; copy: number; width: number; height: number; s: number }

export default function GalleryWall({ items, onOpen, storageKey, hint = 'Scroll or drag to walk the wall', focusHint = 'Click to view · Scroll to step back' }: Props) {
  const stageRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [geometry, setGeometry] = useState<Geometry | null>(null)
  const [dragging, setDragging] = useState(false)

  const motion = useRef({ offset: 0, target: 0, opening: false, restored: false })
  const drag = useRef<{ x: number; target: number; moved: boolean; lastX: number; lastT: number; velocity: number } | null>(null)
  const focusRef = useRef<Focus | null>(null)

  /** Sends a brought-forward piece back to its place on the wall. */
  const unfocus = useCallback((restoreFocus = false) => {
    const f = focusRef.current
    if (!f) return
    focusRef.current = null
    f.ghost.classList.remove('is-focused', 'is-lifting')
    f.ghost.classList.add('is-returning')
    f.ghost.style.transform = mapOnto(f.from, f.frame)
    stageRef.current?.classList.remove('is-focused')
    window.setTimeout(() => {
      f.element.classList.remove('is-lifted')
      f.ghost.remove()
      if (restoreFocus) f.element.focus({ preventScroll: true })
    }, 540)
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && focusRef.current) unfocus(document.activeElement === focusRef.current.ghost)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      const f = focusRef.current
      if (f) f.ghost.remove()
    }
  }, [unfocus])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const measure = () => {
      if (focusRef.current) unfocus()
      const rect = stage.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) setGeometry(buildGeometry(rect.width, rect.height))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(stage)
    return () => observer.disconnect()
  }, [unfocus])

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
      if (focusRef.current) { unfocus(); return }
      const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 400 : 1
      motion.current.target += (event.deltaY + event.deltaX) * scale * 1.25
    }
    stage.addEventListener('wheel', onWheel, { passive: false })
    return () => stage.removeEventListener('wheel', onWheel)
  }, [unfocus])

  const nearestTarget = (s: number) => {
    const { total } = placed
    const current = motion.current.target
    return s + Math.round((current - s) / total) * total
  }

  const remember = () => {
    if (!storageKey) return
    try { window.sessionStorage.setItem(storageKey, String(motion.current.target)) } catch { /* ignore */ }
  }

  /** Second step: the brought-forward piece glides into the detail page's image slot. */
  const openFocused = () => {
    const f = focusRef.current
    const stage = stageRef.current
    if (!f || !stage || motion.current.opening) return
    focusRef.current = null
    motion.current.opening = true
    remember()
    const { ghost } = f
    ghost.classList.remove('is-focused', 'is-lifting')
    ghost.style.transform = 'none'
    ghost.classList.add('is-moving')
    ghost.blur()
    place(ghost, detailFrame(f.item.aspect))
    stage.classList.remove('is-focused')
    stage.classList.add('is-leaving')
    handOff(ghost)
    window.setTimeout(() => onOpen(f.item), 600)
  }

  /** First step: the camera leans in and the piece comes forward to the middle of the room. */
  const focusOn = (index: number) => {
    const entry = placed.list[index]
    const element = itemRefs.current[index]
    const stage = stageRef.current
    const art = element?.querySelector<HTMLElement>('.gw-art')
    if (!entry || !element || !stage || !art || motion.current.opening || focusRef.current) return
    if (reducedMotion()) {
      motion.current.opening = true
      remember()
      onOpen(entry.item)
      return
    }
    motion.current.target = motion.current.offset
    const from = art.getBoundingClientRect()
    const box = stage.getBoundingClientRect()
    const frame = focusFrame(box, entry.item.aspect)
    const touch = window.matchMedia('(pointer: coarse)').matches
    const ghost = makeGhost(art, entry.item, frame, touch ? 'Tap to view · Tap the room to step back' : focusHint)
    ghost.style.transform = mapOnto(from, frame)
    ghost.addEventListener('click', openFocused)
    document.body.appendChild(ghost)
    ghost.getBoundingClientRect()
    element.classList.add('is-lifted')
    stage.style.setProperty('--gw-origin', `${from.left + from.width / 2 - box.left}px ${from.top + from.height / 2 - box.top}px`)
    stage.classList.add('is-focused')
    focusRef.current = { index, item: entry.item, element, ghost, from, frame }
    requestAnimationFrame(() => {
      ghost.classList.add('is-lifting', 'is-focused')
      ghost.style.transform = 'none'
    })
    window.setTimeout(() => { if (focusRef.current?.ghost === ghost) ghost.focus({ preventScroll: true }) }, 320)
  }

  const onPointerDown = (event: React.PointerEvent) => {
    if (event.button !== 0 || motion.current.opening) return
    if (focusRef.current) {
      // Touching the room while a piece is forward steps back out.
      unfocus()
      swallowNextClick()
      return
    }
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
      swallowNextClick()
    }
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (motion.current.opening) return
    if (focusRef.current && (event.key === 'ArrowRight' || event.key === 'ArrowLeft')) unfocus()
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
              <stop offset="0" style={{ stopColor: 'var(--gw-wall-a)' }} /><stop offset="0.6" style={{ stopColor: 'var(--gw-wall-b)' }} /><stop offset="1" style={{ stopColor: 'var(--gw-wall-c)' }} />
            </linearGradient>
            <linearGradient id="gw-ceiling" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={{ stopColor: 'var(--gw-ceiling-a)' }} /><stop offset="1" style={{ stopColor: 'var(--gw-ceiling-b)' }} />
            </linearGradient>
            <linearGradient id="gw-floor" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={{ stopColor: 'var(--gw-floor-a)' }} /><stop offset="1" style={{ stopColor: 'var(--gw-floor-b)' }} />
            </linearGradient>
            <filter id="gw-soft" x="-5%" y="-50%" width="110%" height="200%"><feGaussianBlur stdDeviation="6" /></filter>
          </defs>
          <rect width={geometry.width} height={geometry.height} fill="url(#gw-wall)" />
          <path d={paths.ceilingFill} fill="url(#gw-ceiling)" />
          <path d={paths.floorFill} fill="url(#gw-floor)" />
          <path d={paths.floor} fill="none" style={{ stroke: 'var(--gw-floor-line)' }} strokeWidth="10" filter="url(#gw-soft)" />
          <path d={paths.ceiling} fill="none" style={{ stroke: 'var(--gw-ceiling-line)' }} strokeWidth="14" filter="url(#gw-soft)" />
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
                onFocus={() => { if (!motion.current.opening && !drag.current && !focusRef.current) motion.current.target = nearestTarget(entry.s) }}
                onClick={() => {
                  if (entry.item.kind === 'placard') motion.current.target = nearestTarget(entry.s)
                  else focusOn(index)
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
