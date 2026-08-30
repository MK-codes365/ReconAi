import './globals.css';
import AppShell from '@/components/layout/AppShell';

export const metadata = {
  title: 'ReconAI — Real-Time AI Revenue Recovery Platform',
  description: 'Production-grade AI Revenue Recovery Platform for Razorpay',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#090d16] text-slate-100 min-h-screen flex flex-col font-sans antialiased">
        <AppShell>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
