import '@/index.css'
import { AppProviders } from './providers'

export const metadata = {
    title: 'Solutia Docs',
    description: 'Sistema de gestão documental inteligente para empresas',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="pt-BR" suppressHydrationWarning>
            <body>
                <AppProviders>{children}</AppProviders>
            </body>
        </html>
    )
}
