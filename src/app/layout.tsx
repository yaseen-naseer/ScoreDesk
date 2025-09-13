import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import SupabaseProvider from '@/components/providers/supabase-provider'
import Link from 'next/link'
import { AuthProvider } from '@/lib/auth/auth-context'
import { OrganizationProvider } from '@/lib/contexts/organization-context'
import { RealtimeProvider } from '@/lib/contexts/realtime-context'
import SessionMonitor from '@/components/auth/session-monitor'
import { SessionTimeoutModal } from '@/components/session/session-timeout-modal'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { Toaster } from '@/components/ui/toaster'
import { ConnectionStatus } from '@/components/ui/connection-status'
import { SyncStatusHeader } from '@/components/ui/sync-status-header'
import { SyncNotification } from '@/components/ui/sync-notification'
import Polyfills from './polyfills'
import CrossBrowserCompatibility from '@/components/cross-browser/cross-browser-compatibility'
import ServiceWorkerProvider from '@/components/providers/service-worker-provider'
import Script from 'next/script'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ScoreDesk - Football & Futsal Management',
  description: 'Professional sports management application for football and futsal tournaments',
  manifest: '/manifest.json',
  themeColor: '#0ea5e9',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-3 focus:py-2 focus:rounded-md focus:bg-primary focus:text-primary-foreground"
        >
          Skip to main content
        </a>
        {process.env.NEXT_PUBLIC_ENABLE_PWA === 'true' && (
          <Script id="pwa-register" strategy="afterInteractive">
            {`if ('serviceWorker' in navigator) {
              window.addEventListener('load', () => {
                navigator.serviceWorker
                  .register('/sw.js')
                  .catch(() => {})
              })
            }`}
          </Script>
        )}
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Polyfills />
          <CrossBrowserCompatibility />
      <SupabaseProvider>
        <AuthProvider>
          <OrganizationProvider>
            <RealtimeProvider>
              <ServiceWorkerProvider>
                <SessionMonitor warningMinutes={10} maxInactiveMinutes={120}>
                  {/* App navigation */}
                  <header className="border-b">
                    <div className="container mx-auto px-4 py-3 flex items-center justify-between">
                      <Link href="/" className="font-semibold">ScoreDesk</Link>
                     <div className="flex items-center gap-4">
                       <ConnectionStatus compact />
                       <SyncStatusHeader variant="compact" />
                       <nav className="flex items-center gap-4 text-sm">
                          <Link href="/matches" className="hover:underline">Matches</Link>
                          <Link href="/tournaments" className="hover:underline">Tournaments</Link>
                          <Link href="/teams" className="hover:underline">Teams</Link>
                          <Link href="/venues" className="hover:underline">Venues</Link>
                          <Link href="/referees" className="hover:underline">Referees</Link>
                        </nav>
                      </div>
                    </div>
                  </header>
                  <main id="main-content" role="main">
                    {children}
                  </main>
                <SessionTimeoutModal />
                <SyncNotification />
              </SessionMonitor>
              </ServiceWorkerProvider>
            </RealtimeProvider>
          </OrganizationProvider>
        </AuthProvider>
      </SupabaseProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}