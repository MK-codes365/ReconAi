import './globals.css';
import Link from 'next/link';
import { ShieldCheck, Activity, BarChart3, FileText, Cpu, LayoutDashboard, RefreshCw } from 'lucide-react';

export const metadata = {
  title: 'ReconAI — Real-Time AI Revenue Recovery Platform',
  description: 'Production-grade AI Revenue Recovery Platform for Razorpay',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#090d16] text-slate-100 min-h-screen flex flex-col font-sans">
        {/* Top Operational Bar */}
        <header className="border-b border-slate-800 bg-[#0d1322]/90 backdrop-blur sticky top-0 z-50 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-white">Recon<span className="text-blue-500">AI</span></span>
              <span className="text-[10px] ml-2 px-1.5 py-0.5 rounded bg-blue-950 text-blue-400 font-mono uppercase tracking-wider border border-blue-800/50">Phase 1 Foundation</span>
            </div>
          </div>

          <div className="flex items-center space-x-4 text-xs font-mono">
            <div className="flex items-center space-x-2 px-3 py-1 bg-emerald-950/60 border border-emerald-800/50 text-emerald-400 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>System Operational</span>
            </div>
          </div>
        </header>

        <div className="flex flex-1">
          {/* Sidebar Navigation */}
          <aside className="w-64 border-r border-slate-800 bg-[#0c111d] p-4 flex flex-col space-y-1 text-sm font-medium text-slate-400">
            <div className="text-[11px] font-mono text-slate-500 uppercase px-3 py-2">Operations Control</div>
            
            <Link href="/" className="px-3 py-2 rounded-lg hover:text-white hover:bg-slate-800/60 flex items-center space-x-2.5 transition">
              <LayoutDashboard className="w-4 h-4 text-blue-400" />
              <span>Command Center</span>
            </Link>

            <Link href="/recovery" className="px-3 py-2 rounded-lg hover:text-white hover:bg-slate-800/60 flex items-center space-x-2.5 transition">
              <Activity className="w-4 h-4 text-amber-400" />
              <span>Recovery Cases</span>
            </Link>

            <Link href="/audit" className="px-3 py-2 rounded-lg hover:text-white hover:bg-slate-800/60 flex items-center space-x-2.5 transition">
              <FileText className="w-4 h-4 text-purple-400" />
              <span>Audit Trail</span>
            </Link>

            <Link href="/evaluation" className="px-3 py-2 rounded-lg hover:text-white hover:bg-slate-800/60 flex items-center space-x-2.5 transition">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              <span>Batch Evaluation</span>
            </Link>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
            {children}
          </main>
        </div>

        <footer className="border-t border-slate-800 py-3 px-6 text-center text-xs text-slate-500 font-mono">
          ReconAI Real-Time Revenue Recovery Foundation • Razorpay BuildSprint
        </footer>
      </body>
    </html>
  );
}
