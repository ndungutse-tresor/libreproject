'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { buildCorridor, drawRoom, focusPose, frameOf, hang, hangAll, mixPose, samePose, type Corridor, type Pose, type Room, type Slot } from './corridor'

/**
 * A gallery corridor. The visitor walks round a gently curving corridor with work
 * hung on both walls: scrolling or dragging walks forward, so pieces come up out of
 * the bend ahead, grow as they near and slide past. Clicking a piece makes the
 * visitor step over and look at it closely; clicking it again opens it.
 *
 * The room is drawn as an SVG backdrop and the pieces are DOM buttons placed with
 * CSS 3D transforms, using the same camera (see ./corridor). While walking, only the
 * pieces move; the room is redrawn only while the camera itself turns and steps.
 */

export type WallItem = {
  key: string
  kind?: 'art' | 'placard'
  /** Width divided by height. */
  aspect: number
  /** Accessible name for the item's button. */
  label: string
  /** Room name a placard opens, shown under the corridor while the visitor walks past it. */
  title?: string
  /** For placards: what "Enter the collection" does. Without it the link is not shown. */
  onEnter?: () => void
  /** Two short caption lines shown under the work, the second in italics. */
  caption?: [string, string?]
  content: ReactNode
}

type Props = {
  items: WallItem[]
  onOpen: (item: WallItem) => void
  /** Remembers the walk position (per tab) so returning from a detail page lands where the visitor left. */
  storageKey?: string
  /** Two short lines (split on " · ") shown by the arrows while walking. */
  hint?: string
  /** The same, while a piece is being looked at. */
  focusHint?: string
  /** Label that follows the pointer over a piece. */
  lookLabel?: string
  /** Label over the piece being looked at. */
  openLabel?: string
  walkingLabel?: string
  enterLabel?: string
}

type Rect = { x: number; y: number; w: number; h: number }

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

function place(element: HTMLElement, r: Rect) {
  Object.assign(element.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px` })
}

/** A flat copy of the artwork, lifted off the wall. It lives on <body> so it can outlast the page. */
function makeGhost(art: HTMLElement) {
  const ghost = document.createElement('div')
  ghost.className = 'gw-ghost'
  ghost.setAttribute('aria-hidden', 'true')
  ghost.appendChild(art.cloneNode(true))
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
const coarsePointer = () => window.matchMedia('(pointer: coarse)').matches
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

/** Ignores the click that the browser sends at the end of a drag or a dismissing tap. */
function swallowNextClick() {
  const swallow = (click: MouseEvent) => { click.stopPropagation(); click.preventDefault() }
  window.addEventListener('click', swallow, { capture: true, once: true })
  window.setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 0)
}

type Placed = Slot & { item: WallItem; key: string; room: number }

type Flight = { from: Pose; to: Pose; start: number; duration: number }

const ROOM_PARTS = ['ceilingFill', 'floorFill', 'innerFill', 'floorLine', 'ceilingLine', 'innerEdge'] as const

export default function GalleryWall({
  items,
  onOpen,
  storageKey,
  hint = 'Scroll or drag to walk round · Click a piece to look closer',
  focusHint = 'Click the piece to open it · Scroll or click away to step back',
  lookLabel = 'Look closer',
  openLabel = 'Open it',
  walkingLabel = 'You are walking past',
  enterLabel = 'Enter the collection'
}: Props) {
  const stageRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])
  const roomRefs = useRef<Partial<Record<(typeof ROOM_PARTS)[number], SVGPathElement | null>>>({})
  const pillRef = useRef<HTMLSpanElement>(null)
  const [geometry, setGeometry] = useState<Corridor | null>(null)
  const [dragging, setDragging] = useState(false)
  const [focused, setFocused] = useState(false)
  const [roomIndex, setRoomIndex] = useState(-1)

  const motion = useRef({ offset: 0, target: 0, opening: false, restored: false })
  const camera = useRef<{ pose: Pose; flight: Flight | null; drawn: Pose | null; room: Room | null }>({ pose: { r: 0, a: 0, yaw: 0 }, flight: null, drawn: null, room: null })
  const drag = useRef<{ x: number; target: number; moved: boolean; lastX: number; lastT: number; velocity: number } | null>(null)
  /** The slot being looked at, and its angle round the ring when the camera set off. */
  const focusRef = useRef<{ index: number; theta: number } | null>(null)
  const roomRef = useRef(-1)
  const clipCache = useRef<string[]>([])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const measure = () => {
      const rect = stage.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) setGeometry(buildCorridor(rect.width, rect.height))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(stage)
    return () => observer.disconnect()
  }, [])

  // A new room size: stand back in the middle of the corridor.
  useEffect(() => {
    if (!geometry) return
    focusRef.current = null
    setFocused(false)
    camera.current.pose = geometry.rest
    camera.current.flight = null
    camera.current.drawn = null
  }, [geometry])

  const placed = useMemo(() => {
    if (!geometry || items.length === 0) return { list: [] as Placed[], total: 1 }
    const sizes = items.map((item) => {
      const height = item.kind === 'placard' ? geometry.itemHeight * 0.84 : geometry.itemHeight
      return { width: height * item.aspect, height, placard: item.kind === 'placard' }
    })
    // Which collection each piece belongs to: the last placard before it (wrapping round).
    let current = -1
    for (let i = items.length - 1; i >= 0 && current < 0; i--) if (items[i].kind === 'placard') current = i
    const roomOf = items.map((item, index) => {
      if (item.kind === 'placard') current = index
      return current
    })
    const { slots, total } = hangAll(geometry, sizes)
    const list: Placed[] = slots.map((slot) => ({ ...slot, item: items[slot.index], key: `${items[slot.index].key}~${slot.copy}`, room: roomOf[slot.index] }))
    return { list, total }
  }, [geometry, items])

  /** Position of a slot along the walk, relative to the camera, wrapped into the stretch that can be seen. */
  const relative = useCallback((s: number) => {
    const g = geometry
    if (!g) return 0
    const { total } = placed
    const low = camera.current.pose.a * g.rc - g.behind
    return ((((s - motion.current.offset - low) % total) + total) % total) + low
  }, [geometry, placed])

  const layout = useCallback(() => {
    const g = geometry
    if (!g) return
    const cam = camera.current
    if (!cam.drawn || !samePose(cam.drawn, cam.pose)) {
      const room = drawRoom(g, cam.pose)
      cam.room = room
      cam.drawn = cam.pose
      for (const part of ROOM_PARTS) roomRefs.current[part]?.setAttribute('d', room[part])
    }
    const frame = frameOf(g, cam.pose)
    const clip = cam.room?.clip ?? null
    const low = cam.pose.a * g.rc - g.behind
    const high = cam.pose.a * g.rc + g.ahead
    const { list } = placed
    list.forEach((entry, index) => {
      const element = itemRefs.current[index]
      if (!element) return
      const rel = relative(entry.s)
      const shown = rel < high && rel > low ? hang(g, frame, entry.wall, rel / g.rc, entry.width, clip) : null
      if (!shown || !shown.visible) {
        if (element.style.visibility !== 'hidden') element.style.visibility = 'hidden'
        return
      }
      element.style.visibility = 'visible'
      element.style.transform = `translate3d(${(g.cx + shown.x - entry.width / 2).toFixed(2)}px, ${(g.horizon + g.itemY - entry.height / 2).toFixed(2)}px, ${(g.f - shown.depth).toFixed(2)}px) rotateY(${shown.rotate.toFixed(5)}rad)`
      // The part of a piece behind the bend is cut away, so it slips out of sight behind the inner wall.
      let cut = ''
      if (shown.hidden) {
        const [from, to] = shown.hidden
        cut = from <= 0.5 ? `inset(-60% -60% -120% ${to.toFixed(1)}px)` : `inset(-60% ${(entry.width - from).toFixed(1)}px -120% -60%)`
      }
      if (clipCache.current[index] !== cut) {
        clipCache.current[index] = cut
        element.style.clipPath = cut
      }
    })

    // The collection the visitor is walking past, for the caption under the corridor.
    let room = -1
    const f = focusRef.current
    if (f) room = list[f.index]?.room ?? -1
    else {
      const look = cam.pose.a * g.rc + g.viewAngle.outer * g.rc
      let best = Infinity
      list.forEach((entry) => {
        const distance = Math.abs(relative(entry.s) - look)
        if (distance < best) { best = distance; room = entry.room }
      })
    }
    if (room !== roomRef.current) {
      roomRef.current = room
      setRoomIndex(room)
    }
  }, [geometry, placed, relative])

  // Restore the remembered position once the walk knows its own length.
  useEffect(() => {
    if (!geometry || motion.current.restored || placed.list.length === 0) return
    motion.current.restored = true
    let start = placed.list[0].s - geometry.viewAngle.outer * geometry.rc
    if (storageKey) {
      try {
        const saved = window.sessionStorage.getItem(storageKey)
        if (saved !== null && Number.isFinite(Number(saved))) start = Number(saved)
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
      m.offset += (m.target - m.offset) * (1 - Math.exp(-dt / 120))
      if (Math.abs(m.target - m.offset) < 0.05) m.offset = m.target
      const cam = camera.current
      if (cam.flight) {
        const t = Math.min(1, (now - cam.flight.start) / cam.flight.duration)
        cam.pose = mixPose(cam.flight.from, cam.flight.to, ease(t))
        if (t >= 1) cam.flight = null
      }
      layout()
      frame = requestAnimationFrame(tick)
    }
    layout()
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [layout])

  useEffect(() => () => {
    // Nothing to remember until the walk has been placed (React may mount twice in development).
    if (!storageKey || !motion.current.restored) return
    try { window.sessionStorage.setItem(storageKey, String(motion.current.target)) } catch { /* ignore */ }
  }, [storageKey])

  const remember = () => {
    if (!storageKey || !motion.current.restored) return
    try { window.sessionStorage.setItem(storageKey, String(motion.current.target)) } catch { /* ignore */ }
  }

  /** The pointer label only follows real pointer moves; when the room moves under it, it goes. */
  const hidePill = () => pillRef.current?.classList.remove('is-on')

  const fly = (to: Pose, duration: number) => {
    hidePill()
    const cam = camera.current
    cam.flight = { from: cam.pose, to, start: performance.now(), duration: reducedMotion() ? 1 : duration }
  }

  /** Steps back into the middle of the corridor, facing along it, from wherever the camera got to. */
  const unfocus = useCallback(() => {
    const g = geometry
    if (!g || !focusRef.current) return
    focusRef.current = null
    setFocused(false)
    // Walking on to where the camera stands, so stepping back does not walk it back too.
    const cam = camera.current
    const turn = cam.pose.a
    motion.current.offset += turn * g.rc
    motion.current.target = motion.current.offset
    cam.pose = { r: cam.pose.r, a: 0, yaw: cam.pose.yaw + turn }
    cam.flight = null
    fly(g.rest, 820)
  }, [geometry])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && focusRef.current) unfocus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [unfocus])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage || !geometry) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      if (motion.current.opening) return
      hidePill()
      if (focusRef.current) { unfocus(); return }
      // Still stepping back from a piece: let the camera land first.
      if (camera.current.flight) return
      const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 400 : 1
      const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX
      motion.current.target += delta * scale * (geometry.d / 260)
    }
    stage.addEventListener('wheel', onWheel, { passive: false })
    return () => stage.removeEventListener('wheel', onWheel)
  }, [unfocus, geometry])

  /** The walk position that puts a slot where the eye rests on its wall. */
  const viewTarget = (entry: Placed) => {
    const g = geometry
    if (!g) return motion.current.target
    const { total } = placed
    const s = entry.s - g.viewAngle[entry.wall] * g.rc
    const current = motion.current.target
    return s + Math.round((current - s) / total) * total
  }

  /** Second step: the piece being looked at glides into the detail page's image slot. */
  const openFocused = () => {
    const f = focusRef.current
    const stage = stageRef.current
    const entry = f ? placed.list[f.index] : null
    const element = f ? itemRefs.current[f.index] : null
    const art = element?.querySelector<HTMLElement>('.gw-art')
    if (!f || !stage || !entry || !art || motion.current.opening) return
    motion.current.opening = true
    remember()
    const from = art.getBoundingClientRect()
    const ghost = makeGhost(art)
    place(ghost, { x: from.left, y: from.top, w: from.width, h: from.height })
    document.body.appendChild(ghost)
    ghost.getBoundingClientRect()
    element?.classList.add('is-lifted')
    ghost.classList.add('is-moving')
    place(ghost, detailFrame(entry.item.aspect))
    stage.classList.add('is-leaving')
    handOff(ghost)
    window.setTimeout(() => onOpen(entry.item), 600)
  }

  /** First step: the visitor turns and steps over to look at the piece. */
  const focusOn = (index: number) => {
    const g = geometry
    const entry = placed.list[index]
    if (!g || !entry || motion.current.opening) return
    if (reducedMotion()) {
      motion.current.opening = true
      remember()
      onOpen(entry.item)
      return
    }
    motion.current.target = motion.current.offset
    const theta = relative(entry.s) / g.rc
    focusRef.current = { index, theta }
    setFocused(true)
    const cam = camera.current
    const distance = Math.hypot(cam.pose.a - theta, (cam.pose.r - g.rc) / g.rc)
    fly(focusPose(g, entry.wall, theta, entry.width, entry.height), Math.min(1250, 850 + distance * 500))
    const element = itemRefs.current[index]
    window.setTimeout(() => { if (focusRef.current?.index === index) element?.focus({ preventScroll: true }) }, 400)
  }

  /** The next piece along the walk from a slot (or from where the eye rests), on either wall. */
  const neighbour = (direction: 1 | -1, from?: number) => {
    const g = geometry
    if (!g) return -1
    const base = from ?? camera.current.pose.a * g.rc + g.viewAngle.outer * g.rc
    let best = -1
    let bestDistance = Infinity
    placed.list.forEach((entry, index) => {
      if (entry.item.kind === 'placard') return
      const gap = (relative(entry.s) - base) * direction
      if (gap > 1 && gap < bestDistance) { bestDistance = gap; best = index }
    })
    return best
  }

  const step = (direction: 1 | -1) => {
    if (motion.current.opening) return
    hidePill()
    const f = focusRef.current
    if (f) {
      const next = neighbour(direction, relative(placed.list[f.index].s))
      if (next >= 0) focusOn(next)
      return
    }
    if (camera.current.flight) return
    const g = geometry
    if (!g) return
    // Walk so the next piece along comes to rest where the eye falls.
    const look = motion.current.target + g.viewAngle.outer * g.rc
    let best = Infinity
    let target = motion.current.target + direction * (g.gap + g.itemHeight * 0.66) / 2
    placed.list.forEach((entry) => {
      if (entry.wall !== 'outer') return
      const view = viewTarget(entry)
      const gap = (view + g.viewAngle.outer * g.rc - look) * direction
      if (gap > 2 && gap < best) { best = gap; target = view }
    })
    motion.current.target = target
  }

  const onPointerDown = (event: React.PointerEvent) => {
    if (event.button !== 0 || motion.current.opening) return
    const onItem = (event.target as Element).closest('.gw-item')
    if (focusRef.current) {
      // Touching the room while looking at a piece steps back out; touching a piece looks at that one.
      if (!onItem) { unfocus(); swallowNextClick() }
      return
    }
    if (camera.current.flight) return
    drag.current = { x: event.clientX, target: motion.current.target, moved: false, lastX: event.clientX, lastT: performance.now(), velocity: 0 }
  }

  /** How far the walk moves per pixel dragged, so the wall roughly follows the finger. */
  const dragScale = geometry ? (geometry.d * 5) / geometry.f : 5

  const showPill = (event: React.PointerEvent) => {
    const pill = pillRef.current
    const stage = stageRef.current
    if (!pill || !stage) return
    const item = event.pointerType === 'mouse' && !drag.current?.moved ? (event.target as Element).closest<HTMLElement>('.gw-item') : null
    const entry = item ? placed.list[itemRefs.current.indexOf(item as HTMLButtonElement)] : null
    if (!entry || entry.item.kind === 'placard' || motion.current.opening) {
      pill.classList.remove('is-on')
      return
    }
    const f = focusRef.current
    pill.textContent = f && placed.list[f.index] === entry ? openLabel : lookLabel
    const box = stage.getBoundingClientRect()
    pill.style.transform = `translate(${event.clientX - box.left + 16}px, ${event.clientY - box.top - 10}px)`
    pill.classList.add('is-on')
  }

  const onPointerMove = (event: React.PointerEvent) => {
    showPill(event)
    const d = drag.current
    if (!d) return
    const dx = event.clientX - d.x
    if (!d.moved && Math.abs(dx) > 6) {
      d.moved = true
      setDragging(true)
      pillRef.current?.classList.remove('is-on')
      stageRef.current?.setPointerCapture(event.pointerId)
    }
    if (!d.moved) return
    const now = performance.now()
    const dt = Math.max(1, now - d.lastT)
    d.velocity = d.velocity * 0.6 + ((event.clientX - d.lastX) / dt) * 0.4
    d.lastX = event.clientX
    d.lastT = now
    // Pulling the wall to the right walks forward, the way the pieces travel past.
    motion.current.target = d.target + dx * dragScale
  }

  const endDrag = (event: React.PointerEvent) => {
    const d = drag.current
    drag.current = null
    if (!d) return
    if (d.moved) {
      // A little glide after a flick.
      motion.current.target += d.velocity * dragScale * 260
      setDragging(false)
      if (stageRef.current?.hasPointerCapture(event.pointerId)) stageRef.current.releasePointerCapture(event.pointerId)
      swallowNextClick()
    }
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (motion.current.opening) return
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') { step(1); event.preventDefault() }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') { step(-1); event.preventDefault() }
  }

  const rest = useMemo(() => (geometry ? drawRoom(geometry, geometry.rest) : null), [geometry])
  const currentRoom = roomIndex >= 0 ? items[roomIndex] : undefined
  const lines = (focused ? (coarsePointer() ? focusHint.replace(/\bclick/g, 'tap').replace(/\bClick/g, 'Tap') : focusHint) : hint).split(' · ')

  return (
    <div
      ref={stageRef}
      className={`gw-stage${dragging ? ' is-dragging' : ''}${focused ? ' is-focused' : ''}`}
      tabIndex={0}
      role="region"
      aria-label="Gallery corridor. Use the arrow keys or scroll to walk along it."
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerLeave={() => pillRef.current?.classList.remove('is-on')}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={onKeyDown}
    >
      <div className="gw-zoom">
        {geometry && rest && <svg className="gw-room" viewBox={`0 0 ${geometry.width} ${geometry.height}`} aria-hidden="true">
          <defs>
            <linearGradient id="gw-wall" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={geometry.height}>
              <stop offset="0" style={{ stopColor: 'var(--gw-wall-a)' }} /><stop offset="0.6" style={{ stopColor: 'var(--gw-wall-b)' }} /><stop offset="1" style={{ stopColor: 'var(--gw-wall-c)' }} />
            </linearGradient>
            <linearGradient id="gw-ceiling" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={geometry.horizon}>
              <stop offset="0" style={{ stopColor: 'var(--gw-ceiling-a)' }} /><stop offset="1" style={{ stopColor: 'var(--gw-ceiling-b)' }} />
            </linearGradient>
            <linearGradient id="gw-floor" gradientUnits="userSpaceOnUse" x1="0" y1={geometry.horizon} x2="0" y2={geometry.height}>
              <stop offset="0" style={{ stopColor: 'var(--gw-floor-a)' }} /><stop offset="1" style={{ stopColor: 'var(--gw-floor-b)' }} />
            </linearGradient>
            <linearGradient id="gw-inner" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={geometry.width * 0.3} y2="0">
              <stop offset="0" style={{ stopColor: 'var(--gw-inner-b)' }} /><stop offset="1" style={{ stopColor: 'var(--gw-inner-a)' }} />
            </linearGradient>
            <filter id="gw-soft" x="-5%" y="-50%" width="110%" height="200%"><feGaussianBlur stdDeviation="7" /></filter>
            <filter id="gw-soft-edge" x="-50%" y="-5%" width="200%" height="110%"><feGaussianBlur stdDeviation="3" /></filter>
          </defs>
          <rect width={geometry.width} height={geometry.height} fill="url(#gw-wall)" />
          <path ref={(el) => { roomRefs.current.ceilingFill = el }} d={rest.ceilingFill} fill="url(#gw-ceiling)" />
          <path ref={(el) => { roomRefs.current.floorFill = el }} d={rest.floorFill} fill="url(#gw-floor)" />
          <path ref={(el) => { roomRefs.current.floorLine = el }} d={rest.floorLine} fill="none" style={{ stroke: 'var(--gw-floor-line)' }} strokeWidth="12" filter="url(#gw-soft)" />
          <path ref={(el) => { roomRefs.current.ceilingLine = el }} d={rest.ceilingLine} fill="none" style={{ stroke: 'var(--gw-ceiling-line)' }} strokeWidth="16" filter="url(#gw-soft)" />
          <path ref={(el) => { roomRefs.current.innerFill = el }} d={rest.innerFill} fill="url(#gw-inner)" />
          <path ref={(el) => { roomRefs.current.innerEdge = el }} d={rest.innerEdge} fill="none" style={{ stroke: 'var(--gw-edge)' }} strokeWidth="4" filter="url(#gw-soft-edge)" />
        </svg>}
        {geometry && <div className="gw-scene" style={{ perspective: `${geometry.f}px`, perspectiveOrigin: `${geometry.cx}px ${geometry.horizon}px` }}>
          {placed.list.map((entry, index) => (
            <button
              key={entry.key}
              ref={(element) => { itemRefs.current[index] = element }}
              type="button"
              className={`gw-item${entry.item.kind === 'placard' ? ' is-placard' : ''}`}
              style={{ width: entry.width, height: entry.height, fontSize: geometry.itemHeight * (entry.item.kind === 'placard' ? 0.036 : 0.045) }}
              aria-label={entry.item.label}
              aria-hidden={entry.copy > 0 || undefined}
              tabIndex={entry.copy > 0 ? -1 : 0}
              onFocus={() => { if (!motion.current.opening && !drag.current && !focusRef.current && !camera.current.flight) motion.current.target = viewTarget(entry) }}
              onClick={() => {
                if (motion.current.opening) return
                if (entry.item.kind === 'placard') {
                  if (focusRef.current) unfocus()
                  else motion.current.target = viewTarget(entry)
                } else if (focusRef.current?.index === index) openFocused()
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
        </div>}
      </div>
      <span ref={pillRef} className="gw-pill" aria-hidden="true" />
      {currentRoom && <div className="gw-roomcap">
        <small>{walkingLabel}</small>
        <strong>{currentRoom.title ?? currentRoom.label}</strong>
        {currentRoom.onEnter && <button type="button" onClick={(event) => { event.stopPropagation(); currentRoom.onEnter?.() }} onPointerDown={(event) => event.stopPropagation()}>{enterLabel} →</button>}
      </div>}
      <div className="gw-controls" onPointerDown={(event) => event.stopPropagation()}>
        <p>{lines.map((line) => <span key={line}>{line}</span>)}</p>
        <button type="button" aria-label={focused ? 'Previous piece' : 'Walk back'} onClick={() => step(-1)}><span aria-hidden="true">‹</span></button>
        <button type="button" aria-label={focused ? 'Next piece' : 'Walk on'} onClick={() => step(1)}><span aria-hidden="true">›</span></button>
      </div>
    </div>
  )
}

