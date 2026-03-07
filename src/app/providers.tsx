'use client'

import { UserPreferencesProvider } from '@/contexts/UserPreferencesContext'
import { CookieConsent } from '@/components/CookieConsent'

export function AppProviders({ children }: { children: React.ReactNode }) {
    return (
        <UserPreferencesProvider>
            {children}
            <CookieConsent />
        </UserPreferencesProvider>
    )
}
