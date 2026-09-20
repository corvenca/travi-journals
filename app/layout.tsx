import type { Metadata } from "next";
import "./globals.css";
import { AccountProvider } from '@/components/trading/AccountContext';

export const metadata: Metadata = {
  title: 'Travi Journals',
  description: 'Bitácora de trading profesional',
  icons: {
    icon: '/favicon.ico',
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="h-full antialiased min-h-full flex flex-col">
        <AccountProvider>
          {children}
        </AccountProvider>
      </body>
    </html>
  );
}
