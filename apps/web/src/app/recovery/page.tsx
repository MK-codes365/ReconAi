'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, RefreshCw, Inbox, ChevronRight, Filter, Search,
  MessageSquare, IndianRupee, ShieldCheck, Zap, AlertTriangle,
  CheckCircle2, Clock, Smartphone, Building2, CreditCard, Sparkles,
  ArrowUpRight, Radio, ExternalLink
} from 'lucide-react';

export default function RecoveryCasesPage() {
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [wsConnected, setWsConnected] = useState(false);

  const fetchCases = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/recovery/cases?limit=50`);
      if (res.ok) {
        const body = await res.json();
        setCases(body.data || []);
      }
    } catch (err) {
      console.error('Error fetching recovery cases:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();

    let ws: WebSocket;
    const connectWs = () => {
      ws = new WebSocket('ws://localhost:4000');
      ws.onopen = () => setWsConnected(true);
      ws.onclose = () => {
        setWsConnected(false);
        setTimeout(connectWs, 3000);
      };
      ws.onmessage = () => {
        fetchCases();
      };
    };

    connectWs();
    return () => { if (ws) ws.close(); };
  }, []);

  const totalAtRisk = cases.reduce((acc, c) => acc + (c.amountAtRiskInr || 0), 0);
  const totalRecovered = cases.filter(c => c.status === 'RECOVERED').reduce((acc, c) => acc + (c.amountAtRiskInr || 0), 0);
  const activeCount = cases.filter(c => c.status === 'PENDING_ACTION' || c.status === 'ACTION_SCHEDULED' || c.status === 'OPEN').length;

  const filteredCases = cases.filter((c) => {
    const matchesStatus = filterStatus === 'ALL' || c.status === filterStatus;
    const matchesSearch = 
      c.caseNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.customerEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.failureReason?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
    >
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center space-x-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-[#FA5D29]/15 text-[#FA5D29] text-[10px] font-mono font-extrabold tracking-wider uppercase border border-[#FA5D29]/30">
              Autonomous Pipeline
            </span>
            <div className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-[10px] text-slate-400 font-mono">
              <span className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}></span>
              <span>{wsConnected ? 'LIVE FEED' : 'CONNECTING'}</span>
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center space-x-2.5">
            <Activity className="w-7 h-7 text-[#FA5D29]" />
            <span>Recovery Cases Queue</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">Autonomous triage queue with real-time Gemini AI diagnosis and instant WhatsApp dispatch</p>
        </div>

        <div className="flex items-center space-x-3">
          <button 
            onClick={fetchCases} 
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition shadow-md text-xs font-semibold group"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#FA5D29]' : 'group-hover:rotate-180 transition-transform'}`} />
            <span>Refresh Queue</span>
          </button>
        </div>
      </div>

      {/* Mini KPI Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-[#0b101d]/90 border border-slate-800/90 rounded-2xl p-4 shadow-lg backdrop-blur-md">
          <div className="text-[11px] font-mono uppercase text-slate-400 tracking-wider">Total Pipeline Cases</div>
          <div className="text-2xl font-extrabold font-mono text-white mt-1">{cases.length}</div>
        </div>

        <div className="bg-[#0b101d]/90 border border-slate-800/90 rounded-2xl p-4 shadow-lg backdrop-blur-md">
          <div className="text-[11px] font-mono uppercase text-slate-400 tracking-wider">Active In Recovery</div>
          <div className="text-2xl font-extrabold font-mono text-amber-400 mt-1">{activeCount}</div>
        </div>

        <div className="bg-[#0b101d]/90 border border-slate-800/90 rounded-2xl p-4 shadow-lg backdrop-blur-md">
          <div className="text-[11px] font-mono uppercase text-slate-400 tracking-wider">Revenue At Risk</div>
          <div className="text-2xl font-extrabold font-mono text-red-400 mt-1">₹{totalAtRisk.toLocaleString('en-IN')}</div>
        </div>

        <div className="bg-[#0b101d]/90 border border-emerald-900/40 rounded-2xl p-4 shadow-lg backdrop-blur-md bg-gradient-to-br from-[#0b101d] to-emerald-950/20">
          <div className="text-[11px] font-mono uppercase text-emerald-400 tracking-wider">Recovered Revenue</div>
          <div className="text-2xl font-extrabold font-mono text-emerald-400 mt-1">₹{totalRecovered.toLocaleString('en-IN')}</div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3.5 bg-[#0b101d]/90 border border-slate-800/90 p-3.5 rounded-2xl shadow-xl backdrop-blur-md">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by case #, customer, email, reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#060a14] border border-slate-800/90 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FA5D29]/70 focus:ring-1 focus:ring-[#FA5D29]/70 transition font-mono"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: 'ALL', label: 'All Cases' },
            { id: 'PENDING_ACTION', label: 'Pending Action' },
            { id: 'ACTION_SCHEDULED', label: 'Scheduled' },
            { id: 'RECOVERED', label: 'Recovered' },
            { id: 'ESCALATED', label: 'Escalated' },
            { id: 'STOPPED', label: 'Stopped' }
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setFilterStatus(st.id)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-mono font-bold transition-all whitespace-nowrap ${
                filterStatus === st.id
                  ? 'bg-gradient-to-r from-[#FA5D29] to-orange-600 text-white shadow-md shadow-[#FA5D29]/30'
                  : 'bg-slate-900/90 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800/80'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Cases Table */}
      <div className="bg-[#0b101d]/90 border border-slate-800/90 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
        {filteredCases.length === 0 ? (
          <div className="text-center py-20 px-4 space-y-4 text-slate-500">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-center shadow-inner">
              <Inbox className="w-7 h-7 text-slate-500" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">No Recovery Cases in Queue</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                {searchQuery 
                  ? 'No cases match your search filter. Try clearing your search.' 
                  : 'All payments are currently healthy. Any real payment failures from Razorpay will appear here instantly.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#060a14] text-slate-400 font-mono uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 font-bold">Case #</th>
                  <th className="py-3.5 px-4 font-bold">Customer & Reason</th>
                  <th className="py-3.5 px-4 font-bold">Amount At Risk</th>
                  <th className="py-3.5 px-4 font-bold">Optimal Channel</th>
                  <th className="py-3.5 px-4 font-bold">Priority</th>
                  <th className="py-3.5 px-4 font-bold">Status</th>
                  <th className="py-3.5 px-4 font-bold">Timestamp</th>
                  <th className="py-3.5 px-4 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {filteredCases.map((c) => {
                  const phone = (c.customerPhone || c.customer?.phone || '917535947485').replace(/[^0-9]/g, '');
                  let cleanName = (c.customerName || '').trim();
                  if (!cleanName || cleanName.toLowerCase().includes('void') || cleanName.toLowerCase() === 'customer') {
                    cleanName = 'Valued Customer';
                  } else {
                    cleanName = cleanName.split(' ')[0];
                  }
                  const reason = c.failureReason ? c.failureReason.replace(/_/g, ' ') : 'temporary bank network timeout';

                  const waMsg = 
`*Payment Recovery Alert | ReconAI* ⚡

Hello *${cleanName}*,

Your payment of *₹${c.amountAtRiskInr?.toLocaleString('en-IN')}* for Order *#${c.caseNumber}* was interrupted (${reason}).

To prevent your order from being cancelled, please complete your payment securely using the 1-click link below:

👉 *Complete Payment Securely:*
http://localhost:3000/pay/${c.id}

🔒 _256-bit Encrypted • UPI, Cards & Netbanking Supported_`;
                  const directWaUrl = `https://wa.me/${phone}?text=${encodeURIComponent(waMsg)}`;

                  return (
                    <tr key={c.id} className="hover:bg-slate-850/60 transition-colors duration-150 group">
                      {/* Case Number */}
                      <td className="py-4 px-4 font-mono font-extrabold text-[#FA5D29]">
                        <Link href={`/recovery/${c.id}`} className="hover:underline flex items-center space-x-1">
                          <span>{c.caseNumber}</span>
                        </Link>
                      </td>

                      {/* Customer & Reason */}
                      <td className="py-4 px-4">
                        <div className="font-bold text-white group-hover:text-slate-100">{c.customerName || 'Customer'}</div>
                        <div className="text-[11px] text-slate-400 font-mono flex items-center space-x-1.5 mt-0.5">
                          <span className="text-red-400 font-semibold">{c.failureReason?.replace(/_/g, ' ') || 'gateway_failure'}</span>
                        </div>
                      </td>

                      {/* Amount At Risk */}
                      <td className="py-4 px-4 font-mono font-extrabold text-white text-sm">
                        ₹{c.amountAtRiskInr?.toLocaleString('en-IN')}
                      </td>

                      {/* Optimal Action / Channel */}
                      <td className="py-4 px-4 font-mono text-xs">
                        <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                          <Smartphone className="w-3 h-3 text-emerald-400" />
                          <span className="text-[11px] font-semibold">{c.optimalChannel || 'WHATSAPP'}</span>
                        </div>
                      </td>

                      {/* Priority Score */}
                      <td className="py-4 px-4 font-mono font-bold">
                        <span className={`px-2.5 py-0.5 rounded-md text-[11px] border ${
                          (c.priorityScore || 80) >= 80 ? 'bg-red-950/80 text-red-400 border-red-800/60' :
                          (c.priorityScore || 80) >= 50 ? 'bg-amber-950/80 text-amber-400 border-amber-800/60' :
                          'bg-blue-950/80 text-blue-400 border-blue-800/60'
                        }`}>
                          {c.priorityScore || 85}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-extrabold uppercase tracking-wider border shadow-sm ${
                          c.status === 'RECOVERED' ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60' :
                          c.status === 'ESCALATED' ? 'bg-amber-950/80 text-amber-300 border-amber-700/60' :
                          c.status === 'STOPPED' ? 'bg-red-950/80 text-red-300 border-red-700/60' :
                          c.status === 'ACTION_SCHEDULED' ? 'bg-purple-950/80 text-purple-300 border-purple-700/60 animate-pulse' :
                          'bg-blue-950/80 text-blue-300 border-blue-700/60'
                        }`}>
                          {c.status}
                        </span>
                      </td>

                      {/* Created At */}
                      <td className="py-4 px-4 text-slate-400 font-mono text-[11px]">
                        {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>

                      {/* Quick Action Buttons */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {/* 1-Click WhatsApp Direct Button */}
                          <a
                            href={directWaUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Send via WhatsApp (Free)"
                            className="p-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-800/50 hover:border-emerald-500 transition-all shadow-sm"
                          >
                            <MessageSquare className="w-3.5 h-3.5 fill-current" />
                          </a>

                          {/* Inspect Case */}
                          <Link 
                            href={`/recovery/${c.id}`} 
                            className="px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-[#FA5D29] text-slate-300 hover:text-white border border-slate-700/80 hover:border-[#FA5D29] transition-all font-semibold text-[11px] inline-flex items-center space-x-1 shadow-sm"
                          >
                            <span>Inspect</span>
                            <ChevronRight className="w-3 h-3" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
}
