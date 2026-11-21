import './globals.css'
import ReturnButton from './components/ReturnButton'

export const metadata = {
  title: 'Libra',
  description: 'A reading platform starter powered by Neon and hosted on Render.'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Gallery pages: apply the remembered night view before the first paint. */}
        <script dangerouslySetInnerHTML={{ __html: "try{if(localStorage.getItem('libra.theme')==='night')document.documentElement.dataset.gsTheme='night'}catch(e){}" }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Oswald:wght@500;600&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;1,8..60,400&display=swap"
        />
      </head>
      <body>
        <ReturnButton />
        {children}
      </body>
    </html>
  )
}
