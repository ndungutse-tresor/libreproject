/**
 * Geometry for a gallery corridor that bends gently to the left, like a ring.
 *
 * Seen from above, the corridor is the band between two circles around a centre C.
 * The camera walks along the middle of the band, so the outer wall (on the right)
 * runs away from it in a long curve and the inner wall (on the left) turns out of
 * sight a few steps ahead. Walking forward is the same as sliding everything hung
 * on the walls backwards round the ring, so the room itself never changes while
 * the visitor walks; only the hung pieces move.
 *
 * Coordinates are in pixels. The camera rests at the origin looking down -z, with
 * +x to its right and +y downwards (screen convention). C sits at (-rc, 0).
 * A point at angle theta round a circle of radius R is (-rc + R cos theta, -R sin theta),
 * so theta = 0 is level with the camera and theta grows ahead of it.
 */

export type Wall = 'outer' | 'inner'

/** Where the camera stands and which way it looks: polar position round C, and yaw (radians, + turns right). */
export type Pose = { r: number; a: number; yaw: number }

export type Corridor = {
  width: number
  height: number
  /** Focal length: CSS perspective distance. */
  f: number
  /** Screen position of the camera axis. */
  cx: number
  horizon: number
  /** Half the corridor's width. */
  d: number
  rc: number
  ri: number
  ro: number
  itemHeight: number
  itemY: number
  /** Space between neighbouring pieces on the same wall, measured along the middle of the corridor. */
  gap: number
  ceilY: number
  floorY: number
  /** Range of positions along the walk (relative to the camera) that can ever be on screen. */
  behind: number
  ahead: number
  /** Where keyboard focus parks a piece, as an angle ahead of the camera, per wall. */
  viewAngle: Record<Wall, number>
  rest: Pose
}

const clampNumber = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value))

export function buildCorridor(width: number, height: number): Corridor {
  const portrait = height > width * 1.05
  // Landscape matches a wide desktop view: walking along the middle of the corridor,
  // looking where it goes. A portrait screen is too narrow to take in the bend and
  // the pieces at once, so there the visitor walks with their head turned a little
  // towards the outer wall, and the corridor is taller for its width.
  const f = portrait ? width * 0.9 : Math.min(width * 0.76, height * 1.45)
  const d = f
  const rc = 12 * d
  const ri = rc - d
  const ro = rc + d
  const itemHeight = (portrait ? 1.2 : 0.64) * d
  const yaw = portrait ? 0.4 : 0
  // The line of sight that grazes the inner wall, where the bend disappears.
  const tangent = Math.acos(ri / rc)
  const cx = portrait ? width * 0.66 : width / 2

  const corridor: Corridor = {
    width,
    height,
    f,
    cx,
    horizon: height * (portrait ? 0.46 : 0.47),
    d,
    rc,
    ri,
    ro,
    itemHeight,
    itemY: -0.02 * itemHeight,
    gap: (portrait ? 1.05 : 1.8) * itemHeight,
    ceilY: (portrait ? -1.75 : -0.76) * d,
    floorY: (portrait ? 1.55 : 0.66) * d,
    behind: 3 * d,
    ahead: 0,
    viewAngle: { outer: 0, inner: 0 },
    rest: { r: rc, a: 0, yaw }
  }

  // The far end of the visible outer wall: just past where the sight line grazes the inner wall.
  const far = tangent + Math.acos(ri / ro)
  corridor.ahead = far * rc + 5 * d
  corridor.viewAngle = {
    outer: angleAtScreenX(corridor, 'outer', width * (portrait ? 0.56 : 0.63)),
    inner: angleAtScreenX(corridor, 'inner', width * (portrait ? 0.08 : 0.1))
  }
  return corridor
}

/** Angle round the ring at which a point of the given wall appears at screen x, seen from rest. */
function angleAtScreenX(c: Corridor, wall: Wall, x: number) {
  const radius = wall === 'outer' ? c.ro : c.ri
  const fr = frameOf(c, c.rest)
  const limit = wall === 'outer' ? Math.acos(c.ri / c.rc) + Math.acos(c.ri / c.ro) : Math.acos(c.ri / c.rc)
  const screen = (theta: number) => {
    const dx = -c.rc + radius * Math.cos(theta) - fr.qx
    const dz = -radius * Math.sin(theta) - fr.qz
    const depth = dx * fr.vx + dz * fr.vz
    return depth > 1 ? c.cx + (c.f * (dx * fr.rx + dz * fr.rz)) / depth : wall === 'outer' ? Infinity : -Infinity
  }
  // Along the outer wall screen x falls steadily as theta grows; along the inner wall it rises.
  const falls = wall === 'outer'
  let lo = 0.0005
  let hi = limit
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2
    if (screen(mid) > x === falls) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

export type Frame = {
  qx: number
  qz: number
  /** Camera right and forward directions in the floor plane. */
  rx: number
  rz: number
  vx: number
  vz: number
}

export function frameOf(c: Corridor, pose: Pose): Frame {
  return {
    qx: -c.rc + pose.r * Math.cos(pose.a),
    qz: -pose.r * Math.sin(pose.a),
    rx: Math.cos(pose.yaw),
    rz: Math.sin(pose.yaw),
    vx: Math.sin(pose.yaw),
    vz: -Math.cos(pose.yaw)
  }
}

export type Hung = {
  /** Centre in camera space: x to the right, depth straight ahead. */
  x: number
  depth: number
  /** CSS rotateY for the piece, radians. */
  rotate: number
  /** Screen x of the piece's two side edges. */
  left: number
  right: number
  visible: boolean
  /** Local x range of the piece hidden behind the inner wall, if any. */
  hidden?: [number, number]
}

/**
 * Where a piece of the given width hangs, as seen from the pose.
 * `theta` is its angle round the ring relative to the resting camera.
 */
export function hang(c: Corridor, fr: Frame, wall: Wall, theta: number, width: number, clip: [number, number] | null): Hung {
  const radius = wall === 'outer' ? c.ro : c.ri
  const cos = Math.cos(theta)
  const sin = Math.sin(theta)
  const px = -c.rc + radius * cos
  const pz = -radius * sin
  // Facing direction (into the corridor), and the piece's own left-to-right axis as you face it:
  // rotateY(g) turns the normal to (sin g, cos g) and the x axis to (cos g, -sin g).
  const sign = wall === 'outer' ? 1 : -1
  const nx = -cos * sign
  const nz = sin * sign
  const ax = nz
  const az = -nx
  const rotate = Math.atan2(nx, nz)

  const dx = px - fr.qx
  const dz = pz - fr.qz
  const x = dx * fr.rx + dz * fr.rz
  const depth = dx * fr.vx + dz * fr.vz
  const yaw = Math.atan2(fr.vx, -fr.vz)
  const result: Hung = { x, depth, rotate: rotate + yaw, left: 0, right: 0, visible: false }

  // Facing away (the far side of the inner wall) or behind the camera.
  if (nx * -dx + nz * -dz <= 0) return result
  const half = width / 2
  // Camera-space x and depth along the piece: a point u (from -half to half) is centre + u * axis.
  const ux = ax * fr.rx + az * fr.rz
  const ud = ax * fr.vx + az * fr.vz
  const nearDepth = Math.min(depth - half * ud, depth + half * ud)
  if (nearDepth < c.f * 0.12) return result
  const screen = (u: number) => c.cx + (c.f * (x + u * ux)) / (depth + u * ud)
  const a = screen(-half)
  const b = screen(half)
  result.left = Math.min(a, b)
  result.right = Math.max(a, b)
  if (result.right < -c.width * 0.1 || result.left > c.width * 1.1) return result

  if (wall === 'outer' && clip) {
    const [s1, s2] = clip
    if (result.left >= s1 && result.right <= s2) return result
    if (result.right > s1 && result.left < s2) {
      // Local u where the screen position equals sx: solve cx + f (x + u ux) / (depth + u ud) = sx.
      const local = (sx: number) => {
        const k = (sx - c.cx) / c.f
        const den = ux - k * ud
        return Math.abs(den) < 1e-9 ? (sx < c.cx ? -half : half) : (k * depth - x) / den
      }
      // Screen x runs monotonically along the piece, so whichever end lands in the strip is
      // hidden up to the strip edge that crosses it. Back in element coordinates (0 = its left edge).
      const inside = (sx: number) => sx >= s1 && sx <= s2
      const edge = (end: number) => clampNumber(local(end > s2 ? s2 : s1), -half, half)
      if (inside(a)) result.hidden = [0, edge(b) + half]
      else if (inside(b)) result.hidden = [edge(a) + half, width]
    }
  }
  result.visible = true
  return result
}

const LIMIT = 1e5
const fmt = (value: number) => clampNumber(value, -LIMIT, LIMIT).toFixed(1)

export type Room = {
  ceilingFill: string
  floorFill: string
  innerFill: string
  ceilingLine: string
  floorLine: string
  innerEdge: string
  /** Screen x range covered by the inner wall, full height. */
  clip: [number, number] | null
  /** Screen x of the far end of the corridor, for the light at the end of it. */
  vanish: number
}

/** Draws the room for a pose by casting one ray per few columns of the screen. */
export function drawRoom(c: Corridor, pose: Pose): Room {
  const fr = frameOf(c, pose)
  const mx = fr.qx + c.rc
  const mz = fr.qz
  const m2 = mx * mx + mz * mz
  const dist = Math.sqrt(m2)

  // Sight lines that graze the inner wall, so the silhouette edge is drawn crisply.
  const extra: number[] = []
  let clip: [number, number] | null = null
  const toC = Math.atan2(-mx * fr.rx - mz * fr.rz, -mx * fr.vx - mz * fr.vz)
  const spread = Math.asin(Math.min(1, c.ri / dist))
  const edges = [toC - spread, toC + spread].map((angle) => Math.atan2(Math.sin(angle), Math.cos(angle)))
  const screenOf = (angle: number) => c.cx + c.f * Math.tan(clampNumber(angle, -1.55, 1.55))
  if (Math.abs(toC) - spread < Math.PI / 2) {
    const lo = Math.max(edges[0], -1.55)
    const hi = Math.min(edges[1], 1.55)
    if (hi > lo) {
      clip = [edges[0] <= -1.55 ? -LIMIT : screenOf(lo), edges[1] >= 1.55 ? LIMIT : screenOf(hi)]
      for (const x of clip) if (Math.abs(x) < LIMIT) extra.push(x - 0.4, x + 0.4)
    }
  }

  const columns: number[] = []
  const pad = 24
  const steps = Math.ceil((c.width + pad * 2) / 10)
  for (let i = 0; i <= steps; i++) columns.push(-pad + (i / steps) * (c.width + pad * 2))
  columns.push(...extra.filter((x) => x > -pad && x < c.width + pad))
  columns.sort((p, q) => p - q)

  type Sample = { x: number; top: number; bottom: number; inner: boolean }
  const samples: Sample[] = columns.map((x) => {
    const phi = Math.atan((x - c.cx) / c.f)
    const cos = Math.cos(phi)
    const sin = Math.sin(phi)
    const dx = fr.vx * cos + fr.rx * sin
    const dz = fr.vz * cos + fr.rz * sin
    const b = dx * mx + dz * mz
    let t = -1
    let inner = false
    const di = b * b - (m2 - c.ri * c.ri)
    if (di > 0) {
      const t1 = -b - Math.sqrt(di)
      if (t1 > 0) { t = t1; inner = true }
    }
    if (!inner) t = -b + Math.sqrt(Math.max(0, b * b - (m2 - c.ro * c.ro)))
    const depth = Math.max(1e-3, t * cos)
    return { x, top: c.horizon + (c.ceilY * c.f) / depth, bottom: c.horizon + (c.floorY * c.f) / depth, inner }
  })

  const path = (points: Sample[], key: 'top' | 'bottom') => points.map((p, i) => `${i ? 'L' : 'M'}${fmt(p.x)} ${fmt(p[key])}`).join(' ')
  const first = samples[0]
  const last = samples[samples.length - 1]
  const ceilingEdge = path(samples, 'top')
  const floorEdge = path(samples, 'bottom')

  // Runs of columns that land on the same wall, for the soft junction lines.
  const runs: Sample[][] = []
  for (const sample of samples) {
    const run = runs[runs.length - 1]
    if (run && run[0].inner === sample.inner) run.push(sample)
    else runs.push([sample])
  }
  const innerRun = runs.find((run) => run[0].inner)
  const innerFill = innerRun
    ? `${path(innerRun, 'top')} ${innerRun.slice().reverse().map((p) => `L${fmt(p.x)} ${fmt(p.bottom)}`).join(' ')} Z`
    : ''
  let innerEdge = ''
  if (innerRun && runs.length > 1) {
    // The vertical edge where the inner wall turns out of sight.
    const end = runs.indexOf(innerRun) < runs.length - 1 ? innerRun[innerRun.length - 1] : innerRun[0]
    innerEdge = `M${fmt(end.x)} ${fmt(end.top)} L${fmt(end.x)} ${fmt(end.bottom)}`
  }

  const outerRun = runs.filter((run) => !run[0].inner).sort((p, q) => q.length - p.length)[0]
  const vanish = outerRun ? outerRun.reduce((best, p) => (p.bottom < best.bottom ? p : best), outerRun[0]).x : c.cx

  return {
    ceilingFill: `${ceilingEdge} L${fmt(last.x)} ${-LIMIT} L${fmt(first.x)} ${-LIMIT} Z`,
    floorFill: `${floorEdge} L${fmt(last.x)} ${LIMIT} L${fmt(first.x)} ${LIMIT} Z`,
    innerFill,
    ceilingLine: runs.map((run) => path(run, 'top')).join(' '),
    floorLine: runs.map((run) => path(run, 'bottom')).join(' '),
    innerEdge,
    clip,
    vanish
  }
}

/**
 * Where the camera stops to look straight at a piece, close enough for it to fill most
 * of the frame. The camera faces the piece squarely and stands a little to one side when
 * the screen's centre is not on the camera axis, so the piece still lands mid-screen.
 */
export function focusPose(c: Corridor, wall: Wall, theta: number, width: number, height: number): Pose {
  const portrait = c.height > c.width * 1.05
  const distance = Math.min(Math.max((height * c.f) / (c.height * (portrait ? 0.46 : 0.62)), (width * c.f) / (c.width * (portrait ? 0.74 : 0.5))), c.d * 1.7)
  const radius = wall === 'outer' ? c.ro : c.ri
  const sign = wall === 'outer' ? 1 : -1
  const yaw = sign * Math.PI / 2 - theta
  const px = -c.rc + radius * Math.cos(theta)
  const pz = -radius * Math.sin(theta)
  // Into the corridor from the piece, then sideways along the camera's right.
  const nx = -Math.cos(theta) * sign
  const nz = Math.sin(theta) * sign
  const side = distance * ((c.cx - c.width / 2) / c.f)
  const qx = px + nx * distance + Math.cos(yaw) * side
  const qz = pz + nz * distance + Math.sin(yaw) * side
  return { r: Math.hypot(qx + c.rc, qz), a: Math.atan2(-qz, qx + c.rc), yaw }
}

export function mixPose(from: Pose, to: Pose, t: number): Pose {
  return { r: from.r + (to.r - from.r) * t, a: from.a + (to.a - from.a) * t, yaw: from.yaw + (to.yaw - from.yaw) * t }
}

export const samePose = (p: Pose, q: Pose) => Math.abs(p.r - q.r) < 0.01 && Math.abs(p.a - q.a) < 1e-6 && Math.abs(p.yaw - q.yaw) < 1e-6

export type Slot = { index: number; copy: number; wall: Wall; s: number; width: number; height: number }

/**
 * Hangs a sequence of pieces along the walk. Collection title cards go on the outer
 * wall; the pieces after them alternate sides, the way a corridor gallery is hung,
 * so each wall keeps a steady rhythm. Short collections repeat so the walk never
 * shows the same piece twice at once or a long bare stretch.
 */
export function hangAll(c: Corridor, sizes: { width: number; height: number; placard: boolean }[]) {
  const art = sizes.filter((size) => !size.placard).length
  const alternate = art >= 6
  const once = (copy: number, start: number, list: Slot[]) => {
    let s = start
    let previous: Slot | null = null
    let side: Wall = 'outer'
    sizes.forEach((size, index) => {
      let wall: Wall = 'outer'
      if (!size.placard && alternate) { wall = side; side = side === 'outer' ? 'inner' : 'outer' }
      if (size.placard) side = 'outer'
      if (previous) {
        const space = previous.width / 2 + size.width / 2 + c.gap
        s += previous.wall === wall ? space : space / 2
      }
      const slot: Slot = { index, copy, wall, s, width: size.width, height: size.height }
      list.push(slot)
      previous = slot
    })
    const tail = previous ? (previous as Slot).width / 2 + c.gap : 0
    return s + tail - start
  }
  const probe: Slot[] = []
  const length = Math.max(1, once(0, 0, probe))
  const needed = c.ahead + c.behind
  const copies = sizes.length >= 4 && length < needed ? Math.ceil(needed / length) : 1
  const slots: Slot[] = []
  for (let copy = 0; copy < copies; copy++) once(copy, copy * length, slots)
  return { slots, total: Math.max(length * copies, needed) }
}
