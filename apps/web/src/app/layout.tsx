import './globals.css';
import AppShell from '@/components/layout/AppShell';

export const metadata = {
  title: 'ReconAI — Real-Time AI Revenue Recovery Platform',
  description: 'Production-grade AI Revenue Recovery Platform for Razorpay',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" style={{ backgroundColor: '#0B0B0F', color: '#f1f5f9' }}>
      <body className="bg-[#0B0B0F] text-slate-100 min-h-screen flex flex-col font-sans antialiased" style={{ backgroundColor: '#0B0B0F', color: '#f1f5f9' }}>
        <AppShell>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
