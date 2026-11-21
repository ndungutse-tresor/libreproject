'use client'

import { usePathname, useRouter } from 'next/navigation'
import ProfileQuickLink from './ProfileQuickLink'

export default function ReturnButton() {
  const pathname = usePathname()
  const router = useRouter()

  // Only the account pages use this bar; the library, book, reader, plans and
  // not-found pages carry their own header.
  const withBar = ['/login', '/signup', '/profile', '/writer']
  if (!withBar.includes(pathname)) return null

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
