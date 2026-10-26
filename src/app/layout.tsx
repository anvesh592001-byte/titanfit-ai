import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/ui/ThemeProvider';
import { ToastProvider } from '@/components/ui/ToastProvider';

export const metadata: Metadata = {
  title: 'TitanFit AI — Personalized Full-Stack Digital Fitness & Nutrition Coach',
  description:
    'Deterministic calorie & macro calculation, personalized Indian & global meal planning, food tracking, adaptive workout programming, progress analytics, and AI coaching backed by Supabase.'
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen font-sans antialiased selection:bg-crimson-600 selection:text-white">
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
