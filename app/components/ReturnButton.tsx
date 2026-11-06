'use client'

import { usePathname, useRouter } from 'next/navigation'

export default function ReturnButton() {
  const pathname = usePathname()
  const router = useRouter()

  if (pathname === '/' || pathname.startsWith('/admin')) return null

  function goBack() {
    const referrer = document.referrer
    const cameFromThisSite = referrer && new URL(referrer).origin === window.location.origin

    if (cameFromThisSite && window.history.length > 1) {
      router.back()
    } else {
      router.push('/')
    }
  }

  return (
    <div className="return-bar">
      <button className="return-button" type="button" onClick={goBack}>
        <span aria-hidden="true">←</span> Return
      </button>
    </div>
  )
}
