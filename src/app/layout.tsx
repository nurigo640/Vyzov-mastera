import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Вызов мастера',
  description: 'Ремонт ресторанного оборудования',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  )
}
