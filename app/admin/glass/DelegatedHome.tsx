'use client'

import Link from 'next/link'
import { CountUp, GaIcon, Greeting, Today, rise } from './GlassKit'

type Section = { permission: string; href: string; title: string; description: string; icon: string; unit: string; waiting: number }

/** The overview for administrators who were given some areas, not all. */
export default function DelegatedHome({ name, sections }: { name: string; sections: Section[] }) {
  const waiting = sections.reduce((sum, section) => sum + section.waiting, 0)
  return (
    <div>
      <header className="ga-head">
        <div {...rise(0)}>
          <h1><Greeting name={name} /></h1>
          <p><Today /> · {waiting ? `${waiting} ${waiting === 1 ? 'thing needs' : 'things need'} your attention` : 'Your workspace only includes the areas you were given.'}</p>
        </div>
      </header>
      {sections.length ? (
        <div className="ga-grid is-three">
          {sections.map((section, index) => (
            <Link key={section.permission} href={section.href} {...rise(index + 1, 'ga-card is-lift ga-stat')} style={{ ...rise(index + 1).style, color: 'inherit', textDecoration: 'none' }}>
              <span className="ga-stat-icon"><GaIcon name={section.icon} /></span>
              <strong><CountUp value={section.waiting} /></strong>
              <b>{section.title}</b>
              <small>{section.unit} · {section.description}</small>
            </Link>
          ))}
        </div>
      ) : (
        <div {...rise(1, 'ga-card ga-empty')}>
          <strong>No admin areas yet</strong>
          <span>Ask the super administrator to give your account access to members, orders or publishing.</span>
        </div>
      )}
    </div>
  )
}
