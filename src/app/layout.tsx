import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import SupabaseProvider from '@/components/providers/supabase-provider'
import { AuthProvider } from '@/lib/auth/auth-context'
import { OrganizationProvider } from '@/lib/contexts/organization-context'
import SessionMonitor from '@/components/auth/session-monitor'
import { SessionTimeoutModal } from '@/components/session/session-timeout-modal'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { Toaster } from '@/components/ui/toaster'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ScoreDesk - Football & Futsal Management',
  description: 'Professional sports management application for football and futsal tournaments',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SupabaseProvider>
            <AuthProvider>
              <OrganizationProvider>
                <SessionMonitor warningMinutes={10} maxInactiveMinutes={120}>
                  {children}
                  <SessionTimeoutModal />
                </SessionMonitor>
              </OrganizationProvider>
            </AuthProvider>
          </SupabaseProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}