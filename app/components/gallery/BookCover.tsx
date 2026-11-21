/**
 * A printed-poster style cover, drawn in SVG from the book's title so every
 * book has artwork worth hanging, even ones uploaded without a cover image.
 * The same title always produces the same cover.
 */

type Palette = { bg: string; a: string; b: string; ink: string }

const PALETTES: Palette[] = [
  { bg: '#1f5c45', a: '#e9b949', b: '#f3e7d3', ink: '#f6ecd9' },
  { bg: '#b5292a', a: '#f2d3a0', b: '#1b1b1b', ink: '#f8ecd8' },
  { bg: '#efe4cf', a: '#c0392b', b: '#1f5c45', ink: '#1b1b1b' },
  { bg: '#2a3d7c', a: '#f0a830', b: '#e9e2d0', ink: '#f4efe3' },
  { bg: '#cf4b8f', a: '#ffd6e7', b: '#2b1a3d', ink: '#fff5f9' },
  { bg: '#e7b43c', a: '#7a2d1c', b: '#1e4d3a', ink: '#2a1a10' },
  { bg: '#16302b', a: '#d9534f', b: '#f2e6c9', ink: '#f2e6c9' },
  { bg: '#4a8fc9', a: '#f6e7b4', b: '#173a5e', ink: '#ffffff' },
  { bg: '#f3efe6', a: '#2a3d7c', b: '#e9b949', ink: '#1b1b1b' },
  { bg: '#6d2e46', a: '#f2b880', b: '#f7e9d7', ink: '#f7e9d7' }
]

function hash(text: string) {
  let value = 2166136261
  for (let i = 0; i < text.length; i++) {
    value ^= text.charCodeAt(i)
    value = Math.imul(value, 16777619)
  }
  return value >>> 0
}

function wrap(title: string, max: number) {
  const words = title.toUpperCase().split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    if (line && (line + ' ' + word).length > max) {
      lines.push(line)
      line = word
    } else line = line ? `${line} ${word}` : word
  }
  if (line) lines.push(line)
  return lines.slice(0, 4)
}

function Motif({ layout, p }: { layout: number; p: Palette }) {
  switch (layout) {
    case 0: // sun over a horizon
      return <>
        <circle cx="128" cy="168" r="62" fill={p.a} />
        <rect x="0" y="206" width="200" height="94" fill={p.b} />
        <rect x="0" y="226" width="200" height="8" fill={p.bg} opacity="0.55" />
        <rect x="0" y="246" width="200" height="5" fill={p.bg} opacity="0.4" />
      </>
    case 1: // doorway arch
      return <>
        <path d="M46 300 V176 a54 54 0 0 1 108 0 V300 Z" fill={p.b} />
        <path d="M70 300 V182 a30 30 0 0 1 60 0 V300 Z" fill={p.a} />
        <circle cx="100" cy="150" r="10" fill={p.bg} />
      </>
    case 2: // diagonal bands
      return <>
        <path d="M0 300 L0 210 L200 112 L200 300 Z" fill={p.a} />
        <path d="M0 300 L0 258 L200 160 L200 196 L0 300 Z" fill={p.b} />
        <circle cx="152" cy="236" r="16" fill={p.bg} />
      </>
    case 3: // offset rings
      return <>
        <circle cx="64" cy="208" r="84" fill={p.a} />
        <circle cx="64" cy="208" r="58" fill={p.b} />
        <circle cx="64" cy="208" r="32" fill={p.bg} />
        <circle cx="160" cy="262" r="20" fill={p.a} />
      </>
    case 4: // a shelf of spines
      return <>
        {[18, 44, 62, 92, 112, 138, 160].map((x, i) => (
          <rect key={x} x={x} y={300 - [118, 92, 136, 104, 128, 86, 114][i]} width={[22, 14, 26, 16, 22, 18, 24][i]} height="300" fill={i % 2 ? p.b : p.a} />
        ))}
        <rect x="0" y="282" width="200" height="18" fill={p.ink} opacity="0.85" />
      </>
    default: // moon and tide
      return <>
        <path d="M150 112 a46 46 0 1 1 -1 0 Z" fill={p.a} />
        <path d="M0 236 C40 214 70 258 110 236 S170 214 200 230 V300 H0 Z" fill={p.b} />
        <path d="M0 262 C40 242 70 282 110 262 S170 242 200 256 V300 H0 Z" fill={p.a} opacity="0.75" />
      </>
  }
}

export default function BookCover({ title, author, tag }: { title: string; author?: string | null; tag?: string }) {
  const seed = hash(title)
  const palette = PALETTES[seed % PALETTES.length]
  const layout = (seed >>> 8) % 6
  const lines = wrap(title, title.length > 24 ? 11 : 10)
  const longest = Math.max(1, ...lines.map((line) => line.length))
  // Long single words shrink so they stay inside the cover, whatever font is available.
  // Leave room for the small tag in the top corner when there is one.
  const size = Math.min(lines.length > 2 ? 21 : 25, (tag ? 140 : 168) / (longest * 0.72))
  const id = `cover-grain-${seed}`

  return (
    <svg viewBox="0 0 200 300" preserveAspectRatio="xMidYMid slice" role="img" aria-label={`${title}${author ? ` by ${author}` : ''}`}>
      <defs>
        <filter id={id}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.07 0" />
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
      </defs>
      <rect width="200" height="300" fill={palette.bg} />
      <Motif layout={layout} p={palette} />
      <text x="16" y={34} fill={palette.ink} style={{ font: `600 ${size}px Oswald, 'Arial Narrow', Arial, sans-serif`, letterSpacing: '0.01em' }}>
        {lines.map((line, i) => <tspan key={i} x="16" dy={i === 0 ? 0 : size * 0.98}>{line}</tspan>)}
      </text>
      {author && <text x="16" y={34 + lines.length * size * 0.98 + 4} fill={palette.ink} opacity="0.85" style={{ font: "italic 400 10.5px 'Source Serif 4', Georgia, serif" }}>{author}</text>}
      {tag && <text x="184" y="22" textAnchor="end" fill={palette.ink} opacity="0.7" style={{ font: "600 7px Inter, Arial, sans-serif", letterSpacing: '0.18em' }}>{tag}</text>}
      <rect width="200" height="300" filter={`url(#${id})`} />
    </svg>
  )
}
