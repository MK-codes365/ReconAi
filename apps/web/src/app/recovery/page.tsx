'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Activity, RefreshCw, Inbox, ChevronRight } from 'lucide-react';

export default function RecoveryCasesPage() {
  const [cases, setCases] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>({ page: 1, limit: 25, total: 0 });
  const [loading, setLoading] = useState(true);

  const fetchCases = async () => {
    try {
      const res = await fetch(`/api/recovery/cases?page=${pagination.page}&limit=25`);
      if (res.ok) {
        const body = await res.json();
        setCases(body.data || []);
        setPagination(body.pagination);
      }
    } catch (err) {
      console.error('Error fetching recovery cases:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [pagination.page]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center space-x-2">
            <Activity className="w-5 h-5 text-amber-400" />
            <span>Recovery Cases Queue</span>
          </h1>
          <p className="text-xs text-slate-400">Manage active and historical recovery intervention cases</p>
        </div>

        <button onClick={fetchCases} className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        {cases.length === 0 ? (
          <div className="text-center py-16 space-y-2 text-slate-500">
            <Inbox className="w-10 h-10 mx-auto text-slate-600" />
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
                  <th className="py-3 px-4">Created At</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-sans">
                {cases.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-mono font-semibold text-blue-400">{c.caseNumber}</td>
                    <td className="py-3.5 px-4 font-medium text-white">{c.customerName}</td>
                    <td className="py-3.5 px-4 font-mono text-white font-semibold">₹{c.amountAtRiskInr.toLocaleString('en-IN')}</td>
                    <td className="py-3.5 px-4 font-mono text-amber-400 font-bold">{c.priorityScore}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${
                        c.status === 'RECOVERED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                        c.status === 'ESCALATED' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                        'bg-blue-950 text-blue-400 border border-blue-800'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">{new Date(c.createdAt).toLocaleString()}</td>
                    <td className="py-3.5 px-4 text-right">
                      <Link href={`/recovery/${c.id}`} className="px-2.5 py-1 rounded bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white transition font-medium text-[11px] inline-flex items-center space-x-1">
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
    </div>
  );
}
