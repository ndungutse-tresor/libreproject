import type { ReactNode } from 'react'

/** Re-mounted on every admin navigation, so each page floats in on the glass sheet. */
export default function AdminTemplate({ children }: { children: ReactNode }) {
  return <div className="ga-page">{children}</div>
}
