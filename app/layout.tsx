import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Interview Drills - AI-Powered Interview Preparation',
  description:
    'Practice interview skills with AI-powered evaluation and feedback',
}

/**
 * Root layout component for the Next.js App Router
 * Provides the basic HTML structure for all pages
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
