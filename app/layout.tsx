import './globals.css'

export const metadata = {
  title: 'Libra',
  description: 'A reading platform starter powered by Neon and hosted on Render.'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
