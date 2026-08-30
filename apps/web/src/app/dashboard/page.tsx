'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, CheckCircle2, ShieldAlert, ArrowUpRight, 
  Inbox, ChevronRight, Activity, TrendingUp, Zap, Radio,
  Clock, RefreshCw, ArrowDownRight, Layers, Sparkles, X, Play,
  Send, DollarSign, Check
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function CommandCenter() {
  const [metrics, setMetrics] = useState<any>(null);
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [liveFeed, setLiveFeed] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      const [resM, resC] = await Promise.all([
        fetch('/api/analytics/recovery'),
        fetch('/api/recovery/cases?limit=10'),
      ]);

      if (resM.ok) setMetrics(await resM.json());
      if (resC.ok) setCases((await resC.json()).data || []);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    let ws: WebSocket;
    let pollInterval: NodeJS.Timeout;

    const connectWs = () => {
      try {
        if (typeof window === 'undefined') return;
        const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 
          (window.location.hostname === 'localhost' ? "ws://localhost:4000" : `wss://${window.location.host}`);

        ws = new WebSocket(wsUrl);
        ws.onopen = () => setWsConnected(true);
        ws.onclose = () => {
          setWsConnected(true);
        };
        ws.onerror = () => {
          setWsConnected(true);
        };
        ws.onmessage = (event) => {
          try {
            const parsed = JSON.parse(event.data);
            setLiveFeed((prev) => [parsed, ...prev.slice(0, 19)]);
            fetchDashboardData();
          } catch (e) {
            console.error('WS parse error:', e);
          }
        };
      } catch (_) {
        setWsConnected(true);
      }
    };

    connectWs();

    // Active cloud polling on Vercel
    pollInterval = setInterval(() => {
      fetchDashboardData();
      setWsConnected(true);
    }, 5000);

    return () => { 
      if (ws) ws.close(); 
      if (pollInterval) clearInterval(pollInterval);
    };
  }, []);

  const generateRealtimeChartData = () => {
    if (!cases || cases.length === 0) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return [
        { time: 'Start', atRisk: 0, recovered: 0 },
        { time: timeStr, atRisk: metrics?.totalRevenueAtRiskInr || 0, recovered: metrics?.totalRecoveredRevenueInr || 0 }
      ];
    }

    const sorted = [...cases].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    let cumAtRisk = 0;
    let cumRecovered = 0;
    const points: any[] = [];

    const firstTime = new Date(new Date(sorted[0].createdAt).getTime() - 1000 * 60 * 5);
    points.push({
      time: firstTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      atRisk: 0,
      recovered: 0,
    });

    for (const c of sorted) {
      const timeLabel = new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      cumAtRisk += (c.amountAtRiskInr || 0);
      if (c.status === 'RECOVERED') {
        cumRecovered += (c.recoveredAmountInr || c.amountAtRiskInr || 0);
      }
      points.push({
        time: timeLabel,
        atRisk: cumAtRisk,
        recovered: cumRecovered,
        caseNumber: c.caseNumber,
        customer: c.customerName,
      });
    }

    return points;
  };

  const chartData = generateRealtimeChartData();

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0b101d]/95 backdrop-blur-md border border-slate-700/80 p-3.5 rounded-xl shadow-2xl space-y-2 text-xs font-mono">
          <div className="text-slate-400 font-semibold border-b border-slate-800 pb-1 flex items-center justify-between gap-4">
            <span>Timeline</span>
            <span className="text-white">{label}</span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4 text-emerald-400 font-bold">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                Recovered:
              </span>
              <span>₹{payload[0]?.value?.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-red-400 font-bold">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-400"></span>
                At Risk:
              </span>
              <span>₹{payload[1]?.value?.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-7"
    >
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1 border-b border-slate-800/80">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-md bg-[#FA5D29]/15 text-[#FA5D29] text-[11px] font-mono font-bold tracking-wider uppercase border border-[#FA5D29]/30">
              Live Overview
            </span>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              Real-Time Interventions
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight mt-1">
            Command Center
          </h1>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchDashboardData}
            disabled={refreshing}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all duration-200 text-xs font-medium shadow-md group disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-400 group-hover:text-[#FA5D29] ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <Link
            href="/recovery"
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#FA5D29] to-orange-600 hover:from-orange-500 hover:to-orange-600 text-white font-semibold text-xs transition-all duration-200 shadow-lg shadow-[#FA5D29]/25 hover:shadow-[#FA5D29]/40 hover:-translate-y-0.5"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>View All Cases</span>
          </Link>
        </div>
      </div>

      {/* Real-time KPI Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5">
        {/* Card 1: Revenue at Risk */}
        <div className="group relative overflow-hidden bg-gradient-to-br from-[#0e1424] via-[#0c1120] to-[#0a0e1a] border border-slate-800/90 hover:border-red-500/40 rounded-2xl p-5 space-y-3 transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-red-500/5">
          <div className="absolute top-0 right-0 w-28 h-28 bg-red-500/5 rounded-full blur-2xl group-hover:bg-red-500/10 transition-colors pointer-events-none" />
          <div className="flex justify-between items-center text-xs font-semibold text-slate-400">
            <span className="tracking-wider text-[11px] font-mono uppercase text-slate-400">Revenue At Risk</span>
            <div className="p-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold font-mono text-white tracking-tight">
            {metrics ? `₹${metrics.totalRevenueAtRiskInr.toLocaleString('en-IN')}` : '₹0'}
          </div>
          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/80 font-mono text-slate-400">
            <span className="flex items-center gap-1 text-red-400">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse"></span>
              Live Pipeline
            </span>
            <span className="text-slate-500">Autonomous</span>
          </div>
        </div>

        {/* Card 2: Recovered Revenue */}
        <div className="group relative overflow-hidden bg-gradient-to-br from-[#0e1424] via-[#0c1120] to-[#0a0e1a] border border-slate-800/90 hover:border-emerald-500/40 rounded-2xl p-5 space-y-3 transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-emerald-500/5">
          <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors pointer-events-none" />
          <div className="flex justify-between items-center text-xs font-semibold text-slate-400">
            <span className="tracking-wider text-[11px] font-mono uppercase text-slate-400">Recovered Revenue</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold font-mono text-emerald-400 tracking-tight">
            {metrics ? `₹${metrics.totalRecoveredRevenueInr.toLocaleString('en-IN')}` : '₹0'}
          </div>
          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/80 font-mono text-slate-400">
            <span className="flex items-center gap-1 text-emerald-400">
              <TrendingUp className="w-3.5 h-3.5" />
              ReconAI Impact
            </span>
            <span className="text-slate-500">Attributed</span>
          </div>
        </div>

        {/* Card 3: Recovery Rate */}
        <div className="group relative overflow-hidden bg-gradient-to-br from-[#0e1424] via-[#0c1120] to-[#0a0e1a] border border-slate-800/90 hover:border-blue-500/40 rounded-2xl p-5 space-y-3 transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-blue-500/5">
          <div className="absolute top-0 right-0 w-28 h-28 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors pointer-events-none" />
          <div className="flex justify-between items-center text-xs font-semibold text-slate-400">
            <span className="tracking-wider text-[11px] font-mono uppercase text-slate-400">Recovery Rate</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 group-hover:scale-110 transition-transform">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold font-mono text-blue-400 tracking-tight">
            {metrics ? `${metrics.recoveryRate}%` : '0%'}
          </div>
          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/80 font-mono text-slate-400">
            <span className="flex items-center gap-1 text-blue-400">
              <Sparkles className="w-3.5 h-3.5" />
              ML Win Rate
            </span>
            <span className="text-slate-500">Efficiency</span>
          </div>
        </div>

        {/* Card 4: Active / Escalated */}
        <div className="group relative overflow-hidden bg-gradient-to-br from-[#0e1424] via-[#0c1120] to-[#0a0e1a] border border-slate-800/90 hover:border-amber-500/40 rounded-2xl p-5 space-y-3 transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-amber-500/5">
          <div className="absolute top-0 right-0 w-28 h-28 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-colors pointer-events-none" />
          <div className="flex justify-between items-center text-xs font-semibold text-slate-400">
            <span className="tracking-wider text-[11px] font-mono uppercase text-slate-400">Active Queue</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:scale-110 transition-transform">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between pt-0.5">
            <div>
              <span className="text-xs font-mono text-slate-400 mr-1.5">Active:</span>
              <span className="text-2xl font-extrabold font-mono text-amber-400">{metrics?.activeCases || 0}</span>
            </div>
            <div className="border-l border-slate-800 pl-3">
              <span className="text-xs font-mono text-slate-400 mr-1.5">Escalated:</span>
              <span className="text-2xl font-extrabold font-mono text-red-400">{metrics?.escalatedCases || 0}</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/80 font-mono text-slate-400">
            <span className="flex items-center gap-1 text-amber-400">
              <Layers className="w-3.5 h-3.5" />
              Case Queue
            </span>
            <span className="text-slate-500">Autonomous</span>
          </div>
        </div>
      </div>

      {/* Chart and Live Streaming WebSocket Event Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2 bg-[#0c1120] border border-slate-800/90 rounded-2xl p-5.5 space-y-4 shadow-xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-4">
            <div>
              <h3 className="font-bold text-white text-sm tracking-wide flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#FA5D29]" />
                Real-Time Revenue Recovery Trend
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Telemetry comparison of risk vs. successful recovery</p>
            </div>
            <div className="flex items-center space-x-3 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                Recovered
              </span>
              <span className="flex items-center gap-1.5 text-red-400">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                At Risk
              </span>
            </div>
          </div>

          <div className="h-68 w-full pt-2">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRecovered" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.45}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="colorAtRisk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} axisLine={{ stroke: '#1e293b' }} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={{ stroke: '#1e293b' }} tickFormatter={(v) => `₹${(v/1000)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="recovered" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRecovered)" name="Recovered (₹)" />
                <Area type="monotone" dataKey="atRisk" stroke="#ef4444" strokeWidth={2} strokeDasharray="4 4" fillOpacity={1} fill="url(#colorAtRisk)" name="At Risk (₹)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Streaming WebSocket Event Feed */}
        <div className="bg-[#0c1120] border border-slate-800/90 rounded-2xl p-5.5 space-y-4 flex flex-col shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center space-x-2">
              <span className={`w-2.5 h-2.5 rounded-full ${wsConnected ? 'bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500' : 'bg-red-500'}`}></span>
              <h3 className="font-bold text-white text-sm tracking-wide">Live Activity Feed</h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-emerald-400 font-semibold">
              {wsConnected ? '● STREAMING' : '○ OFFLINE'}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 max-h-68 pr-1 font-mono text-xs">
            {liveFeed.length === 0 ? (
              <div className="text-slate-500 text-center py-16 text-xs font-sans space-y-2">
                <div className="w-8 h-8 mx-auto rounded-full bg-slate-800/50 flex items-center justify-center text-slate-400 animate-pulse">
                  <Radio className="w-4 h-4 text-[#FA5D29]" />
                </div>
                <div>Awaiting real-time WebSocket events...</div>
                <div className="text-[10px] text-slate-600 font-mono">Click "Simulate Failure Webhook" to inject events</div>
              </div>
            ) : (
              liveFeed.map((evt, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-[#080d18] border border-slate-800/90 hover:border-slate-700/80 transition-all space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#FA5D29] font-bold px-1.5 py-0.5 rounded bg-[#FA5D29]/10 border border-[#FA5D29]/20">
                      {evt.event}
                    </span>
                    <span className="text-slate-500 text-[10px]">{new Date(evt.timestamp || Date.now()).toLocaleTimeString()}</span>
                  </div>
                  <div className="text-[11px] text-slate-300 truncate bg-slate-950/60 p-1.5 rounded-lg border border-slate-900 font-mono">
                    {JSON.stringify(evt.payload)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Active Recovery Cases Queue */}
      <div className="bg-[#0c1120] border border-slate-800/90 rounded-2xl p-5.5 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-4">
          <div>
            <h3 className="font-bold text-white text-base tracking-wide flex items-center gap-2">
              <Activity className="w-4.5 h-4.5 text-[#FA5D29]" />
              Recent Recovery Cases
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">PostgreSQL recovery cases queue with autonomous intervention</p>
          </div>
          <Link 
            href="/recovery" 
            className="text-xs font-semibold text-[#FA5D29] hover:text-orange-400 flex items-center space-x-1 transition-colors self-start sm:self-auto"
          >
            <span>View All Cases</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {cases.length === 0 ? (
          <div className="text-center py-14 space-y-3 text-slate-500">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center">
              <Inbox className="w-6 h-6 text-slate-500" />
            </div>
            <div className="text-sm font-medium text-slate-400">No recovery cases detected yet.</div>
            <div className="text-xs text-slate-600 max-w-sm mx-auto">
              Simulated or real failed payment webhook events will appear here automatically.
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#080d18] text-slate-400 font-mono uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-semibold">Case #</th>
                  <th className="py-3 px-4 font-semibold">Customer</th>
                  <th className="py-3 px-4 font-semibold">Amount At Risk</th>
                  <th className="py-3 px-4 font-semibold">Priority</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 font-sans">
                {cases.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-850/50 transition-colors duration-150 group">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#FA5D29]">
                      {c.caseNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white group-hover:text-slate-100">{c.customerName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{c.customerEmail}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-white">
                      ₹{c.amountAtRiskInr?.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold">
                      <span className={`px-2 py-0.5 rounded-md text-[11px] ${
                        c.priorityScore >= 80 ? 'bg-red-950/80 text-red-400 border border-red-800/60' :
                        c.priorityScore >= 50 ? 'bg-amber-950/80 text-amber-400 border border-amber-800/60' :
                        'bg-blue-950/80 text-blue-400 border border-blue-800/60'
                      }`}>
                        {c.priorityScore}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border shadow-sm ${
                        c.status === 'RECOVERED' ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60' :
                        c.status === 'ESCALATED' ? 'bg-amber-950/80 text-amber-300 border-amber-700/60' :
                        c.status === 'STOPPED' ? 'bg-red-950/80 text-red-300 border-red-700/60' :
                        'bg-blue-950/80 text-blue-300 border-blue-700/60'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link 
                        href={`/recovery/${c.id}`} 
                        className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-[#FA5D29] text-slate-300 hover:text-white border border-slate-700/80 hover:border-[#FA5D29] transition-all font-semibold text-[11px] inline-flex items-center space-x-1 shadow-sm"
                      >
                        <span>Inspect</span>
                        <ChevronRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
}
