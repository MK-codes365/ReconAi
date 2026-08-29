'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Activity, RefreshCw, Inbox, ChevronRight, AlertTriangle, CheckCircle2, ShieldAlert, ArrowUpRight } from 'lucide-react';

export default function CommandCenter() {
  const [metrics, setMetrics] = useState<any>(null);
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAnalyticsAndCases = async () => {
    try {
      const resM = await fetch('/api/analytics/recovery');
      if (resM.ok) {
        const dataM = await resM.json();
        setMetrics(dataM);
      }

      const resC = await fetch('/api/recovery/cases?limit=10');
      if (resC.ok) {
        const dataC = await resC.json();
        setCases(dataC.data || []);
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsAndCases();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center space-x-2">
            <Activity className="w-5 h-5 text-blue-400" />
            <span>Command Center</span>
          </h1>
          <p className="text-xs text-slate-400">Real-time revenue recovery operations dashboard</p>
        </div>

        <button onClick={fetchAnalyticsAndCases} className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Real Analytics Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex justify-between items-center text-xs font-medium text-slate-400">
            <span>REVENUE AT RISK</span>
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-red-400">
            {metrics ? `₹${metrics.totalRevenueAtRiskInr.toLocaleString('en-IN')}` : '₹0'}
          </div>
          <span className="text-[11px] text-slate-500">Live PostgreSQL Telemetry</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex justify-between items-center text-xs font-medium text-slate-400">
            <span>RECOVERED REVENUE</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {metrics ? `₹${metrics.totalRecoveredRevenueInr.toLocaleString('en-IN')}` : '₹0'}
          </div>
          <span className="text-[11px] text-slate-500">Honest Organic/ReconAI Attribution</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex justify-between items-center text-xs font-medium text-slate-400">
            <span>RECOVERY RATE</span>
            <ArrowUpRight className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-blue-400">
            {metrics ? `${metrics.recoveryRate}%` : '0%'}
          </div>
          <span className="text-[11px] text-slate-500">Conversion efficiency</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex justify-between items-center text-xs font-medium text-slate-400">
            <span>ACTIVE / ESCALATED</span>
            <ShieldAlert className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex justify-between items-center text-sm pt-1">
            <span className="text-amber-400 font-bold">Active: {metrics?.activeCases || 0}</span>
            <span className="text-red-400 font-bold">Escalated: {metrics?.escalatedCases || 0}</span>
          </div>
          <span className="text-[11px] text-slate-500">Real-time case state queue</span>
        </div>
      </div>

      {/* Active Recovery Cases Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-semibold text-white text-sm">Recent Recovery Cases</h3>
            <p className="text-xs text-slate-400">PostgreSQL recovery cases queue</p>
          </div>
          <Link href="/recovery" className="text-xs font-mono text-blue-400 hover:underline flex items-center space-x-1">
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {cases.length === 0 ? (
          <div className="text-center py-12 space-y-2 text-slate-500">
            <Inbox className="w-8 h-8 mx-auto text-slate-600" />
            <div className="text-xs font-mono">No recovery cases yet.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-mono uppercase border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Case #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Amount At Risk</th>
                  <th className="py-3 px-4">Priority Score</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-sans">
                {cases.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-mono font-semibold text-blue-400">{c.caseNumber}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-white">{c.customerName}</div>
                      <div className="text-[10px] text-slate-500">{c.customerEmail}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-white">₹{c.amountAtRiskInr.toLocaleString('en-IN')}</td>
                    <td className="py-3.5 px-4 font-mono text-amber-400 font-bold">{c.priorityScore}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${
                        c.status === 'RECOVERED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                        c.status === 'ESCALATED' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                        c.status === 'STOPPED' ? 'bg-red-950 text-red-400 border border-red-800' :
                        'bg-blue-950 text-blue-400 border border-blue-800'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link href={`/recovery/${c.id}`} className="px-2.5 py-1 rounded bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white transition font-medium text-[11px]">
                        Inspect
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
