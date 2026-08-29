'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { 
  ArrowLeft, User, ShieldCheck, Cpu, AlertOctagon, 
  PauseCircle, History, BarChart2, Zap, CheckCircle2, Award, Clock 
} from 'lucide-react';

export default function RecoveryCaseDetailPage() {
  const params = useParams();
  const caseId = params.id as string;

  const [data, setData] = useState<any>(null);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [decision, setDecision] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchCaseDetail = async () => {
    try {
      const [resDetail, resCandidates, resDecision] = await Promise.all([
        fetch(`/api/recovery/cases/${caseId}`),
        fetch(`/api/recovery/cases/${caseId}/candidates`),
        fetch(`/api/recovery/cases/${caseId}/decision`),
      ]);

      if (resDetail.ok) {
        const bodyDetail = await resDetail.json();
        setData(bodyDetail);
      }
      if (resCandidates.ok) {
        const bodyCandidates = await resCandidates.json();
        setCandidates(bodyCandidates);
      }
      if (resDecision.ok) {
        const bodyDecision = await resDecision.json();
        setDecision(bodyDecision);
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

  const handleStopCase = async () => {
    try {
      const res = await fetch(`/api/recovery/cases/${caseId}/stop`, { method: 'POST' });
      if (res.ok) await fetchCaseDetail();
    } catch (err) {
      console.error('Stop case error:', err);
    }
  };

  const handleEscalateCase = async () => {
    try {
      const res = await fetch(`/api/recovery/cases/${caseId}/escalate`, { method: 'POST' });
      if (res.ok) await fetchCaseDetail();
    } catch (err) {
      console.error('Escalate case error:', err);
    }
  };

  if (loading) {
    return <div className="text-center py-20 font-mono text-xs text-slate-500">Loading Recovery Case & Decision Context...</div>;
  }

  if (!data || !data.case) {
    return <div className="text-center py-20 font-mono text-xs text-red-400">Recovery Case Not Found</div>;
  }

  const { case: caseRecord, journey } = data;
  const mlProb = caseRecord.recoveryProbability;
  const topCandidate = candidates.find((c) => c.selected) || candidates[0];

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
              <h1 className="text-xl font-bold font-mono text-white">{caseRecord.caseNumber}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono uppercase ${
                caseRecord.status === 'RECOVERED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                caseRecord.status === 'ESCALATED' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                caseRecord.status === 'STOPPED' ? 'bg-red-950 text-red-400 border border-red-800' :
                'bg-blue-950 text-blue-400 border border-blue-800'
              }`}>
                {caseRecord.status}
              </span>
            </div>
            <p className="text-xs text-slate-400">Created {new Date(caseRecord.createdAt).toLocaleString()}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleEscalateCase}
            disabled={caseRecord.status === 'ESCALATED' || caseRecord.status === 'RECOVERED'}
            className="px-3.5 py-2 rounded-lg bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-800/60 text-xs font-semibold flex items-center space-x-1.5 transition disabled:opacity-50"
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>Escalate Case</span>
          </button>

          <button
            onClick={handleStopCase}
            disabled={caseRecord.status === 'STOPPED' || caseRecord.status === 'RECOVERED'}
            className="px-3.5 py-2 rounded-lg bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-800/60 text-xs font-semibold flex items-center space-x-1.5 transition disabled:opacity-50"
          >
            <PauseCircle className="w-3.5 h-3.5" />
            <span>Stop Recovery</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Customer Context & Attention Safeguards */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center space-x-2 text-sm font-semibold text-white border-b border-slate-800 pb-2">
              <User className="w-4 h-4 text-blue-400" />
              <span>Customer Context</span>
            </div>
            <div className="text-xs space-y-2 text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Name:</span>
                <span className="font-semibold text-white">{caseRecord.customer?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Email:</span>
                <span className="font-mono text-slate-300">{caseRecord.customer?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Amount At Risk:</span>
                <span className="font-mono font-bold text-red-400">₹{caseRecord.amountAtRiskInr.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Priority Score:</span>
                <span className="font-mono font-bold text-amber-400">{caseRecord.priorityScore}</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center space-x-2 text-sm font-semibold text-white border-b border-slate-800 pb-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Attention Budget Safeguards</span>
            </div>
            <div className="text-xs space-y-2 text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Contacts Used:</span>
                <span className="font-mono text-amber-400 font-bold">
                  {caseRecord.customer?.attentionBudget?.contactsUsed || 0} / {caseRecord.customer?.attentionBudget?.maximumContacts || 3}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Retries Used:</span>
                <span className="font-mono text-amber-400 font-bold">
                  {caseRecord.customer?.attentionBudget?.retriesUsed || 0} / {caseRecord.customer?.attentionBudget?.maximumRetries || 2}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Cooldown Period:</span>
                <span className="font-mono text-slate-300">{caseRecord.customer?.attentionBudget?.cooldownHours || 6} hours</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Next Best Recovery Moment & Candidate Comparison */}
        <div className="lg:col-span-2 space-y-6">
          {/* Next Best Recovery Moment Banner */}
          <div className="bg-slate-900 border border-blue-900/60 rounded-xl p-5 space-y-4 shadow-lg shadow-blue-950/30">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Zap className="w-5 h-5 text-amber-400" />
                <h3 className="font-semibold text-white text-sm">Next Best Recovery Moment</h3>
              </div>
              <span className="text-xs font-mono text-blue-400 bg-blue-950 px-2.5 py-0.5 rounded border border-blue-800">
                Confidence: {decision?.decisionConfidenceLevel || 'HIGH'} ({(decision?.confidence ? decision.confidence * 100 : 85).toFixed(0)}%)
              </span>
            </div>

            {topCandidate ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <span className="text-slate-400 text-[10px] uppercase">Action</span>
                    <div className="font-mono font-bold text-amber-400 text-sm">{topCandidate.actionType}</div>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <span className="text-slate-400 text-[10px] uppercase">Recommended Time</span>
                    <div className="font-mono font-bold text-white text-xs">
                      {new Date(topCandidate.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <span className="text-slate-400 text-[10px] uppercase">Channel / Method</span>
                    <div className="font-mono font-bold text-white text-xs">{topCandidate.channel} ({topCandidate.paymentMethod})</div>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <span className="text-slate-400 text-[10px] uppercase">Net Recovery Value</span>
                    <div className="font-mono font-bold text-emerald-400 text-sm">
                      ₹{(Number(topCandidate.netRecoveryValueMinorUnit) / 100).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3 rounded-lg border border-slate-800/80">
                  <span className="text-blue-400 font-semibold">Why Selected: </span>
                  {decision?.reason || topCandidate.reason}
                </p>
              </div>
            ) : (
              <div className="text-xs text-slate-500 font-mono">Evaluating candidate interventions...</div>
            )}
          </div>

          {/* Candidate Alternatives Comparison Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Award className="w-4 h-4 text-emerald-400" />
                <h3 className="font-semibold text-white text-sm">Evaluated Intervention Alternatives</h3>
              </div>
              <span className="text-[10px] font-mono text-slate-500">{candidates.length} Alternatives Evaluated</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 font-mono uppercase border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Rank</th>
                    <th className="py-2.5 px-3">Action</th>
                    <th className="py-2.5 px-3">Channel</th>
                    <th className="py-2.5 px-3">Prob %</th>
                    <th className="py-2.5 px-3">Friction</th>
                    <th className="py-2.5 px-3">Net Value</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {candidates.map((cand) => (
                    <tr key={cand.id} className={cand.selected ? 'bg-blue-950/30 text-white font-semibold' : 'text-slate-300 hover:bg-slate-800/40'}>
                      <td className="py-3 px-3">#{cand.rank}</td>
                      <td className="py-3 px-3 font-bold text-amber-400">{cand.actionType}</td>
                      <td className="py-3 px-3 text-slate-400">{cand.channel}</td>
                      <td className="py-3 px-3 text-emerald-400 font-bold">{(cand.recoveryProbability * 100).toFixed(0)}%</td>
                      <td className="py-3 px-3 text-slate-400">{cand.frictionScore}</td>
                      <td className="py-3 px-3 font-bold text-emerald-400">
                        ₹{(Number(cand.netRecoveryValueMinorUnit) / 100).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {cand.selected ? (
                          <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-semibold text-[10px] uppercase">
                            SELECTED
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[10px]">Evaluated</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Reconstructed Customer Journey Timeline */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-sm font-semibold text-white">
                <History className="w-4 h-4 text-emerald-400" />
                <span>Customer Payment Journey Timeline</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">{journey?.length || 0} Events</span>
            </div>

            <div className="space-y-4 relative before:absolute before:inset-0 before:left-2.5 before:w-0.5 before:bg-slate-800 text-xs pl-7">
              {(!journey || journey.length === 0) ? (
                <div className="text-slate-500 py-4">No journey events recorded yet.</div>
              ) : (
                journey.map((item: any, idx: number) => (
                  <div key={idx} className="relative space-y-1">
                    <span className={`absolute -left-7 top-1 w-3 h-3 rounded-full ring-4 ring-slate-900 ${
                      item.eventType === 'PAYMENT_FAILED' ? 'bg-red-500' :
                      item.eventType === 'PAYMENT_CAPTURED' ? 'bg-emerald-500' :
                      item.eventType === 'RECOVERY_CASE_CREATED' ? 'bg-amber-500' : 'bg-blue-500'
                    }`}></span>

                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">{item.title}</span>
                      <span className="text-[10px] font-mono text-slate-500">{new Date(item.timestamp).toLocaleTimeString()}</span>
                    </div>

                    <p className="text-slate-400 text-[11px]">{item.description}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
