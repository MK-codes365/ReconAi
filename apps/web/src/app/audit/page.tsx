'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, RefreshCw, Inbox, Shield, Clock, Search, Terminal } from 'lucide-react';

export default function AuditTrailPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/audit');
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((l) => 
    l.action?.toLowerCase().includes(search.toLowerCase()) ||
    JSON.stringify(l.metadata || {}).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-md bg-purple-500/15 text-purple-400 text-[11px] font-mono font-bold tracking-wider uppercase border border-purple-500/30">
              Compliance & Safety
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center space-x-2 mt-1">
            <FileText className="w-6 h-6 text-purple-400" />
            <span>Immutable Audit Trail</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">Chronological tamper-evident system decision and policy safeguard logs</p>
        </div>

        <button 
          onClick={fetchLogs} 
          disabled={loading}
          className="flex items-center space-x-2 p-2.5 px-4 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition shadow-md self-start sm:self-auto text-xs font-semibold"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-purple-400' : ''}`} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-[#0c1120] border border-slate-800/90 p-3.5 rounded-2xl shadow-lg flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder="Filter audit events by action keyword or payload..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
        />
      </div>

      {/* Log Feed */}
      <div className="bg-[#0c1120] border border-slate-800/90 rounded-2xl p-5.5 space-y-4 shadow-xl">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-20 space-y-3 text-slate-500">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center">
              <Inbox className="w-6 h-6 text-slate-500" />
            </div>
            <div className="text-sm font-medium text-slate-400">No audit records found.</div>
            <div className="text-xs text-slate-600">Audit logs are created automatically upon intervention decision execution.</div>
          </div>
        ) : (
          <div className="space-y-3 font-mono">
            {filteredLogs.map((log) => (
              <div key={log.id} className="p-4 bg-[#080d18] rounded-2xl border border-slate-800/90 text-xs space-y-2 hover:border-purple-500/40 transition shadow-md">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-300 font-bold border border-purple-500/30">
                      {log.action}
                    </span>
                  </div>
                  <span className="text-slate-500 text-[10px] flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3 text-slate-600" />
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
                {log.metadata && (
                  <div className="bg-[#05080f] p-3 rounded-xl text-[11px] text-slate-300 border border-slate-900 overflow-x-auto font-mono">
                    <pre>{JSON.stringify(log.metadata, null, 2)}</pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
