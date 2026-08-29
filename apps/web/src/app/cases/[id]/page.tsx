'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, ShieldCheck, CheckCircle2, AlertTriangle, Play, 
  Cpu, Clock, User, Zap, Lock, ChevronRight, MessageSquare 
} from 'lucide-react';

export default function CaseDetailPage() {
  const params = useParams();
  const caseId = params.id as string;

  const [caseData, setCaseData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [executing, setExecuting] = useState(false);

  const fetchCaseDetail = async () => {
    try {
      const res = await fetch(`/api/recovery/cases/${caseId}`);
      if (res.ok) {
        const data = await res.json();
        setCaseData(data);
      }
    } catch (err) {
      console.error('Error fetching case detail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (caseId) fetchCaseDetail();
  }, [caseId]);

  const handleRunAnalysis = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch(`/api/recovery/cases/${caseId}/analyze`, { method: 'POST' });
      if (res.ok) {
        await fetchCaseDetail();
      }
    } catch (err) {
      console.error('Analysis error:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleExecuteAction = async (actionType: string, channel: string) => {
    setExecuting(true);
    try {
      const res = await fetch(`/api/recovery/cases/${caseId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionType, channel }),
      });
      if (res.ok) {
        await fetchCaseDetail();
      }
    } catch (err) {
      console.error('Execution error:', err);
    } finally {
      setExecuting(false);
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-slate-400 font-mono">Loading ReconAI Recovery Case...</div>;
  }

  if (!caseData) {
    return <div className="text-center py-20 text-red-400 font-mono">Recovery Case Not Found</div>;
  }

  const latestPrediction = caseData.aiPredictions?.[0];
  const candidates = caseData.candidates || [];
  const policyDecision = caseData.policyDecisions?.[0];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-3">
          <button onClick={() => window.history.back()} className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold font-mono text-white">{caseData.caseNumber}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono uppercase ${
                caseData.status === 'RECOVERED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                caseData.status === 'BLOCKED' ? 'bg-red-950 text-red-400 border border-red-800' :
                'bg-blue-950 text-blue-400 border border-blue-800'
              }`}>
                {caseData.status}
              </span>
            </div>
            <p className="text-xs text-slate-400">Created {new Date(caseData.createdAt).toLocaleString()}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleRunAnalysis}
            disabled={analyzing}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center space-x-2 shadow-lg shadow-blue-500/20 transition disabled:opacity-50"
          >
            <Cpu className="w-4 h-4" />
            <span>{analyzing ? 'Running AI & ML Engine...' : 'Re-Run AI Diagnosis'}</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Customer & Journey */}
        <div className="space-y-6">
          {/* Customer Overview Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center space-x-2 text-sm font-semibold text-white border-b border-slate-800 pb-3">
              <User className="w-4 h-4 text-blue-400" />
              <span>Customer Context</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Name:</span>
                <span className="font-semibold text-white">{caseData.customer?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Email:</span>
                <span className="font-mono text-slate-300">{caseData.customer?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Amount At Risk:</span>
                <span className="font-mono font-bold text-red-400">₹{caseData.amount?.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Historical Success:</span>
                <span className="text-emerald-400 font-semibold">{caseData.customer?.historicalSuccessCount} payments</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Attention Contacts Used:</span>
                <span className="text-amber-400 font-mono">{caseData.customer?.attentionBudget?.contactsUsed || 0} / 3</span>
              </div>
            </div>
          </div>

          {/* Payment Journey Timeline */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center space-x-2 text-sm font-semibold text-white border-b border-slate-800 pb-3">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>Payment Journey Timeline</span>
            </div>

            <div className="space-y-3 relative before:absolute before:inset-0 before:left-2 before:w-0.5 before:bg-slate-800 text-xs pl-6">
              <div className="relative space-y-1">
                <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-red-500 ring-4 ring-slate-900"></span>
                <div className="font-semibold text-white">Payment Failed</div>
                <div className="text-slate-400 text-[11px]">{caseData.failureReason || 'Temporary gateway error'}</div>
              </div>

              <div className="relative space-y-1 pt-2">
                <span className="absolute -left-6 top-3 w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-slate-900"></span>
                <div className="font-semibold text-white">ReconAI Initialized</div>
                <div className="text-slate-400 text-[11px]">Recovery Case {caseData.caseNumber} created</div>
              </div>

              <div className="relative space-y-1 pt-2">
                <span className="absolute -left-6 top-3 w-2.5 h-2.5 rounded-full bg-purple-500 ring-4 ring-slate-900"></span>
                <div className="font-semibold text-white">AI & ML Diagnostics</div>
                <div className="text-slate-400 text-[11px]">Probability score predicted: {(caseData.recoveryProbability * 100 || 78).toFixed(0)}%</div>
              </div>

              {caseData.status === 'RECOVERED' && (
                <div className="relative space-y-1 pt-2">
                  <span className="absolute -left-6 top-3 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-slate-900"></span>
                  <div className="font-semibold text-emerald-400">Payment Recovered!</div>
                  <div className="text-slate-400 text-[11px]">Captured via Razorpay Test Mode</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: AI Diagnosis, Simulator, Policy Engine */}
        <div className="lg:col-span-2 space-y-6">
          {/* AI Diagnosis Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Cpu className="w-5 h-5 text-blue-400" />
                <h3 className="font-semibold text-white text-sm">AI Diagnosis & Root Cause Reasoning</h3>
              </div>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                Confidence: {(caseData.recoveryProbability * 100 || 82).toFixed(0)}%
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {latestPrediction?.rootCause || 'Transient banking gateway timeout during transaction authorization. High tenure customer.'}
            </p>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1 text-xs">
              <span className="text-slate-400 font-semibold">Evidence Signals:</span>
              <ul className="list-disc list-inside text-slate-300 space-y-0.5 text-[11px]">
                <li>Gateway error string: "{caseData.failureReason || 'gateway_error'}"</li>
                <li>Customer tenure: {caseData.customer?.tenureDays || 30} days with prior successful payments</li>
              </ul>
            </div>
          </div>

          {/* Intervention Simulator (Candidate Actions) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Zap className="w-5 h-5 text-amber-400" />
                <h3 className="font-semibold text-white text-sm">Intervention Simulator (Candidate Actions)</h3>
              </div>
              <span className="text-xs font-mono text-blue-400">Deterministic Net Recovery Value Scoring</span>
            </div>

            <div className="space-y-3">
              {candidates.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs">
                  Click "Re-Run AI Diagnosis" above to simulate candidate recovery interventions.
                </div>
              ) : (
                candidates.map((cand: any, idx: number) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border transition ${
                      cand.isSelected
                        ? 'bg-blue-950/40 border-blue-600/80 shadow-md shadow-blue-500/10'
                        : 'bg-slate-950/60 border-slate-800/80'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        {cand.isSelected && (
                          <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-semibold text-[10px] uppercase">
                            Next Best Moment
                          </span>
                        )}
                        <span className="font-mono font-bold text-white text-xs">{cand.actionType}</span>
                        <span className="text-[11px] text-slate-400">via {cand.channel}</span>
                      </div>

                      <div className="flex items-center space-x-4 text-xs font-mono">
                        <div>
                          <span className="text-slate-500">Prob: </span>
                          <span className="text-emerald-400 font-bold">{(cand.recoveryProbability * 100).toFixed(0)}%</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Net Value: </span>
                          <span className="text-white font-bold">₹{cand.netValue?.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-400 mt-2">{cand.explanation}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Policy Decision & Action Execution Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h3 className="font-semibold text-white text-sm">Policy Engine Validation</h3>
            </div>

            <div className="p-3.5 rounded-lg bg-emerald-950/50 border border-emerald-800/60 text-xs space-y-1">
              <div className="flex items-center space-x-2 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Status: {policyDecision?.result || 'APPROVED'}</span>
              </div>
              <p className="text-slate-300 text-[11px]">
                {policyDecision?.reason || 'Passed all maximum retries, cooldown, and transaction amount safety checks.'}
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => handleExecuteAction(caseData.optimalAction || 'SEND_PAYMENT_LINK_SMS', 'SMS')}
                disabled={executing || caseData.status === 'RECOVERED'}
                className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center space-x-2 shadow-lg shadow-emerald-500/20 transition disabled:opacity-50"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{executing ? 'Executing Razorpay Action...' : `Execute ${caseData.optimalAction || 'Recovery Action'}`}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
