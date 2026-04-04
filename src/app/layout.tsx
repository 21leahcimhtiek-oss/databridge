import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import * as Sentry from '@sentry/nextjs'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'DataBridge',
  description: 'Visual data pipeline builder',
}

const SentryErrorBoundary = Sentry.ErrorBoundary

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <SentryErrorBoundary fallback={
            <div className="flex min-h-screen items-center justify-center">
              <p className="text-red-500">Something went wrong. Please refresh.</p>
            </div>
          }>
            {children}
          </SentryErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  )
}