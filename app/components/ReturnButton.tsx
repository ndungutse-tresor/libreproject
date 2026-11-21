'use client'

import { usePathname, useRouter } from 'next/navigation'
import ProfileQuickLink from './ProfileQuickLink'

export default function ReturnButton() {
  const pathname = usePathname()
  const router = useRouter()

  // The library gallery and book pages carry their own header.
  if (pathname === '/' || pathname.startsWith('/admin') || pathname === '/library' || pathname.startsWith('/book/')) return null

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
      <ProfileQuickLink />
    </div>
  )
}
