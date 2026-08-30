"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  ShieldCheck, LayoutDashboard, Activity, FileText, BarChart3, 
  ChevronLeft, ChevronRight, Zap, RefreshCw, Cpu, ShieldAlert, 
  Sparkles, Radio, Database, Server
} from "lucide-react";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [lastSync, setLastSync] = useState<string>("Just now");

  useEffect(() => {
    let ws: WebSocket;
    let timer: NodeJS.Timeout;

    const connectWs = () => {
      try {
        if (typeof window === 'undefined') return;
        const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:4000";
        ws = new WebSocket(wsUrl);
        ws.onopen = () => {
          setWsConnected(true);
          setLastSync(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        };
        ws.onclose = () => {
          setWsConnected(false);
          timer = setTimeout(connectWs, 5000);
        };
        ws.onerror = () => {
          setWsConnected(false);
        };
        ws.onmessage = () => {
          setLastSync(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        };
      } catch (_) {
        setWsConnected(false);
      }
    };

    connectWs();
    return () => { 
      if (ws) ws.close(); 
      if (timer) clearTimeout(timer);
    };
  }, []);

  // Customer-facing checkout and landing pages bypass the admin shell entirely
  const isStandalone = pathname === '/' || pathname === '/landing' || pathname?.startsWith('/pay');
  if (isStandalone) {
    return <>{children}</>;
  }

  const navGroups = [
    {
      title: "OPERATIONS",
      items: [
        { href: "/dashboard", label: "Command Center", icon: LayoutDashboard },
        { href: "/recovery", label: "Recovery Cases", icon: Activity },
      ],
    },
    {
      title: "ANALYTICS & AI",
      items: [
        { href: "/evaluation", label: "Batch Evaluation", icon: BarChart3 },
        { href: "/audit", label: "Audit Trail", icon: FileText },
        { href: "/landing", label: "Product Landing", icon: Sparkles },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 flex flex-col font-sans antialiased selection:bg-[#FA5D29]/30 selection:text-orange-200">
      {/* Ambient background glow */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-[#FA5D29]/5 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Top Header */}
      <header className="h-16 border-b border-slate-800/80 bg-[#0a0f1d]/85 backdrop-blur-xl sticky top-0 z-50 px-5 flex items-center justify-between shadow-2xl shadow-black/40">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setCollapsed(!collapsed)}
            aria-label="Toggle sidebar"
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/70 border border-slate-800/60 hover:border-slate-700 transition-all duration-200"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          <Link href="/" className="flex items-center space-x-3 group">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FA5D29] via-orange-600 to-amber-600 flex items-center justify-center text-white font-bold shadow-lg shadow-[#FA5D29]/30 group-hover:scale-105 transition-transform duration-200">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500"></span>
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                Recon<span className="text-[#FA5D29]">AI</span>
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-[#FA5D29]/10 text-[#FA5D29] font-mono font-semibold uppercase tracking-wider border border-[#FA5D29]/20 shadow-inner">
                <Sparkles className="w-2.5 h-2.5" />
                V1.0
              </span>
            </div>
          </Link>
        </div>

        {/* System Status Indicators */}
        <div className="flex items-center space-x-3 text-xs font-mono">
          <div className="hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800/80 text-slate-400">
            <Radio className="w-3.5 h-3.5 text-[#FA5D29] animate-pulse" />
            <span>Sync:</span>
            <span className="text-slate-200 font-semibold">{lastSync}</span>
          </div>

          <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border backdrop-blur-md transition-colors duration-300 ${
            wsConnected 
              ? "bg-emerald-950/40 border-emerald-800/50 text-emerald-300" 
              : "bg-red-950/40 border-red-800/50 text-red-300"
          }`}>
            <span className={`w-2 h-2 rounded-full ${wsConnected ? "bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400" : "bg-red-400"}`}></span>
            <span className="font-semibold text-[11px] tracking-wide">
              {wsConnected ? "LIVE TELEMETRY" : "OFFLINE"}
            </span>
          </div>

          <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 bg-gradient-to-r from-slate-900 to-slate-850 text-slate-200 rounded-xl text-[11px] font-semibold border border-slate-750/70 shadow-sm">
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
            <span>OPERATOR</span>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className={`${collapsed ? "w-16" : "w-64"} transition-all duration-300 border-r border-slate-800/80 bg-[#0a0f1d]/70 backdrop-blur-md p-3.5 flex flex-col justify-between select-none z-40`}>
          <div className="space-y-6">
            {navGroups.map((group, idx) => (
              <div key={idx} className="space-y-1.5">
                {!collapsed && (
                  <div className="text-[10px] font-mono font-bold text-slate-400/80 uppercase px-3 py-1 tracking-widest flex items-center justify-between">
                    <span>{group.title}</span>
                  </div>
                )}
                {group.items.map((link) => {
                  const Icon = link.icon;
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-medium text-xs transition-all duration-200 group relative ${
                        isActive
                          ? "bg-gradient-to-r from-[#FA5D29]/20 to-[#FA5D29]/5 text-[#FA5D29] font-bold border border-[#FA5D29]/40 shadow-lg shadow-[#FA5D29]/10"
                          : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 hover:border-slate-700/60 border border-transparent"
                      }`}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#FA5D29] rounded-r-full shadow-sm shadow-orange-500" />
                      )}
                      <Icon className={`w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110 ${isActive ? "text-[#FA5D29]" : "text-slate-400 group-hover:text-slate-200"}`} />
                      {!collapsed && <span className="tracking-wide">{link.label}</span>}
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Sidebar System Telemetry Footer */}
          {!collapsed && (
            <div className="p-3.5 bg-gradient-to-b from-[#080d18] to-[#060911] border border-slate-800/90 rounded-2xl space-y-2.5 text-[11px] font-mono shadow-xl">
              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center space-x-1.5">
                  <Database className="w-3.5 h-3.5 text-blue-400" />
                  <span>PostgreSQL</span>
                </span>
                <span className="text-emerald-400 font-bold flex items-center gap-1 text-[10px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Active
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center space-x-1.5">
                  <Server className="w-3.5 h-3.5 text-purple-400" />
                  <span>ML Engine</span>
                </span>
                <span className="text-emerald-400 font-bold flex items-center gap-1 text-[10px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Ready
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400 pt-1 border-t border-slate-800/80">
                <span className="flex items-center space-x-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                  <span>Kill Switch</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
                  ARMED (OFF)
                </span>
              </div>
            </div>
          )}
        </aside>

        {/* Main Workspace Area */}
        <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
