'use client';

import { useState, useEffect } from 'react';
import { FileText, RefreshCw, Inbox } from 'lucide-react';

export default function AuditTrailPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center space-x-2">
            <FileText className="w-5 h-5 text-purple-400" />
            <span>Audit Trail</span>
          </h1>
          <p className="text-xs text-slate-400">Chronological immutable system decision audit log</p>
        </div>

        <button onClick={fetchLogs} className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        {logs.length === 0 ? (
          <div className="text-center py-16 space-y-2 text-slate-500">
            <Inbox className="w-10 h-10 mx-auto text-slate-600" />
            <div className="text-xs font-mono">No recovery data available</div>
            <div className="text-[11px] text-slate-600">Audit logs will record automatically upon system actions</div>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div key={log.id} className="p-3 bg-slate-950 rounded border border-slate-800 text-xs space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="font-mono text-purple-400 font-bold">{log.action}</span>
                  <span className="text-slate-500 font-mono">{new Date(log.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-slate-300">{log.details}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
