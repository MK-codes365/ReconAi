'use client';

import { useState } from 'react';
import { BarChart3, Inbox, Play } from 'lucide-react';

export default function BatchEvaluationPage() {
  const [evalData, setEvalData] = useState<any>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
            <span>Batch Evaluation</span>
          </h1>
          <p className="text-xs text-slate-400">Offline batch recovery evaluation environment</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        {!evalData ? (
          <div className="text-center py-16 space-y-2 text-slate-500">
            <Inbox className="w-10 h-10 mx-auto text-slate-600" />
            <div className="text-xs font-mono">No recovery data available</div>
            <div className="text-[11px] text-slate-600">Batch evaluations will display metrics once batch datasets are processed</div>
          </div>
        ) : (
          <div className="text-xs text-white">Batch Evaluation Metrics Ready</div>
        )}
      </div>
    </div>
  );
}
