import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import { Header } from '@/components/layout/Header';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Tasklin - Integração com Google Calendar',
  description: 'Aplicativo de calendário e gerenciamento de tarefas auto-hospedado com sincronização do Google Calendar, otimizado para telas touchscreen Raspberry Pi',
  keywords: ['calendário', 'tarefas', 'google calendar', 'raspberry pi', 'Tasklin', 'auto-hospedado'],
  authors: [{ name: 'Tasklin' }],
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="min-h-screen bg-background">
            <Header />
            <main className="pb-8">
              {children}
            </main>
          </div>
          <Toaster 
            position="top-center"
            expand={true}
            richColors
            closeButton
          />
        </ThemeProvider>
      </body>
    </html>
  );
}