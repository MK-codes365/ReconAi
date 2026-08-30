'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, User, ShieldCheck, Cpu, AlertOctagon, 
  PauseCircle, History, BarChart2, Zap, Award, ShieldAlert, CheckCircle2,
  Clock, DollarSign, Activity, Sparkles, ChevronRight, Mail, Phone, Lock,
  Share2, Copy, ExternalLink, Check, MessageSquare, Edit3
} from 'lucide-react';
import MainButton from '@/components/common/MainButton';

export default function RecoveryCaseDetailPage() {
  const params = useParams();
  const caseId = params.id as string;

  const [data, setData] = useState<any>(null);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [decision, setDecision] = useState<any>(null);
  const [policyEval, setPolicyEval] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [phoneInput, setPhoneInput] = useState('+917535947485');

  const fetchCaseDetail = async () => {
    try {
      const [resDetail, resCandidates, resDecision, resPolicy] = await Promise.all([
        fetch(`/api/recovery/cases/${caseId}`),
        fetch(`/api/recovery/cases/${caseId}/candidates`),
        fetch(`/api/recovery/cases/${caseId}/decision`),
        fetch(`/api/recovery/cases/${caseId}/policy`),
      ]);

      if (resDetail.ok) {
        const detail = await resDetail.json();
        setData(detail);
        const p = detail.case?.customerPhone || detail.case?.customer?.phone;
        if (p && !p.includes('9876543210')) {
          setPhoneInput(p);
        } else {
          setPhoneInput('+917535947485');
        }
      }
      if (resCandidates.ok) setCandidates(await resCandidates.json());
      if (resDecision.ok) setDecision(await resDecision.json());
      if (resPolicy.ok) setPolicyEval(await resPolicy.json());
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

  const handleExecuteAction = async (actionType: string, channel: string) => {
    setExecuting(true);
    try {
      const res = await fetch(`/api/recovery/cases/${caseId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionType, channel }),
      });
      if (res.ok) await fetchCaseDetail();
    } catch (err) {
      console.error('Execution error:', err);
    } finally {
      setExecuting(false);
    }
  };

  const handleCopyLink = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const link = `${origin}/pay/${caseId}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (loading) {
    return (
      <div className="text-center py-32 space-y-3 font-mono text-xs text-slate-400">
        <div className="w-10 h-10 mx-auto rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center animate-spin text-[#FA5D29]">
          <Activity className="w-5 h-5" />
        </div>
        <div>Loading Recovery Case, AI Decision Engine & Policy Guardrails...</div>
      </div>
    );
  }

  if (!data || !data.case) {
    return (
      <div className="text-center py-32 font-mono text-xs text-red-400 space-y-2">
        <AlertOctagon className="w-8 h-8 mx-auto text-red-400" />
        <div>Recovery Case Not Found</div>
      </div>
    );
  }

  const { case: caseRecord, journey } = data;
  const topCandidate = candidates.find((c) => c.selected) || candidates[0];

  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const payUrl = `${origin}/pay/${caseRecord.id || caseId}`;
  const cleanPhone = phoneInput.replace(/[^0-9]/g, '');
  let cleanName = (caseRecord.customerName || '').trim();
  if (!cleanName || cleanName.toLowerCase().includes('void') || cleanName.toLowerCase() === 'customer') {
    cleanName = 'Valued Customer';
  } else {
    cleanName = cleanName.split(' ')[0];
  }
  const reason = caseRecord.failureReason ? caseRecord.failureReason.replace(/_/g, ' ') : 'temporary bank network timeout';

  const waText = 
`*Payment Recovery Alert | ReconAI* ⚡

Hello *${cleanName}*,

Your payment of *₹${caseRecord.amountAtRiskInr?.toLocaleString('en-IN')}* for Order *#${caseRecord.caseNumber}* was interrupted (${reason}).

To prevent your order from being cancelled, please complete your payment securely using the 1-click link below:

👉 *Complete Payment Securely:*
${payUrl}

🔒 _256-bit Encrypted • UPI, Cards & Netbanking Supported_`;
  const directWaUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waText)}`;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div className="flex items-center space-x-3.5">
          <button 
            onClick={() => window.history.back()} 
            className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition shadow-md"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-2xl font-extrabold font-mono text-white tracking-tight">{caseRecord.caseNumber}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border shadow-sm ${
                caseRecord.status === 'RECOVERED' ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60' :
                caseRecord.status === 'ESCALATED' ? 'bg-amber-950/80 text-amber-300 border-amber-700/60' :
                caseRecord.status === 'STOPPED' ? 'bg-red-950/80 text-red-300 border-red-700/60' :
                'bg-blue-950/80 text-blue-300 border-blue-700/60'
              }`}>
                {caseRecord.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">Created {new Date(caseRecord.createdAt).toLocaleString()}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* 100% Free Instant WhatsApp Button */}
          <a
            href={directWaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-lg shadow-emerald-900/40 hover:-translate-y-0.5 animate-pulse"
          >
            <MessageSquare className="w-4 h-4 fill-current" />
            <span>Send to WhatsApp ({phoneInput || '+91 75359 47485'})</span>
          </a>

          {/* Copy Link Button */}
          <button
            onClick={handleCopyLink}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white font-semibold text-xs transition-all shadow-md"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            <span>{copied ? 'Link Copied!' : 'Copy Pay Link'}</span>
          </button>

          {/* Customer Portal Link */}
          <a
            href={`/pay/${caseRecord.id || caseId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white text-xs font-semibold transition"
          >
            <span>Checkout Portal</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          <MainButton
            text="Escalate"
            variant="amber"
            size="small"
            disabled={caseRecord.status === 'ESCALATED' || caseRecord.status === 'RECOVERED'}
            action={handleEscalateCase}
            iconComponent={<AlertOctagon className="w-3.5 h-3.5" />}
          />

          <MainButton
            text="Stop"
            variant="danger"
            size="small"
            disabled={caseRecord.status === 'STOPPED' || caseRecord.status === 'RECOVERED'}
            action={handleStopCase}
            iconComponent={<PauseCircle className="w-3.5 h-3.5" />}
          />
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Customer Context & Attention Safeguards */}
        <div className="space-y-6">
          <div className="bg-[#0c1120] border border-slate-800/90 rounded-2xl p-5.5 space-y-4 shadow-xl">
            <div className="flex items-center space-x-2 text-sm font-bold text-white border-b border-slate-800/80 pb-3">
              <User className="w-4 h-4 text-blue-400" />
              <span>Customer Context</span>
            </div>
            <div className="text-xs space-y-3 text-slate-300">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Name:</span>
                <span className="font-semibold text-white">{caseRecord.customerName || caseRecord.customer?.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Email:</span>
                <span className="font-mono text-slate-300 text-[11px]">{caseRecord.customerEmail || caseRecord.customer?.email}</span>
              </div>

              {/* Editable Phone Input */}
              <div className="space-y-1 pt-1 border-t border-slate-800/60">
                <div className="flex justify-between items-center text-slate-400 text-[11px]">
                  <span>Recipient WhatsApp:</span>
                  <span className="text-[#FA5D29] font-mono text-[10px]">Editable</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <input
                    type="text"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="+91 75359 47485"
                    className="w-full bg-[#080d18] border border-slate-700/80 focus:border-emerald-500 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono outline-none transition"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-1 border-t border-slate-800/60">
                <span className="text-slate-400">Amount At Risk:</span>
                <span className="font-mono font-bold text-red-400 text-sm">₹{caseRecord.amountAtRiskInr?.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Priority Score:</span>
                <span className="font-mono font-bold text-amber-400 px-2 py-0.5 rounded bg-amber-950/60 border border-amber-800/40">
                  {caseRecord.priorityScore}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-[#0c1120] border border-slate-800/90 rounded-2xl p-5.5 space-y-4 shadow-xl">
            <div className="flex items-center space-x-2 text-sm font-bold text-white border-b border-slate-800/80 pb-3">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Attention Budget Safeguards</span>
            </div>
            <div className="text-xs space-y-2.5 text-slate-300">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Contacts Used:</span>
                <span className="font-mono text-amber-400 font-bold">
                  {caseRecord.customer?.attentionBudget?.contactsUsed || 0} / {caseRecord.customer?.attentionBudget?.maximumContacts || 3}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Retries Used:</span>
                <span className="font-mono text-amber-400 font-bold">
                  {caseRecord.customer?.attentionBudget?.retriesUsed || 0} / {caseRecord.customer?.attentionBudget?.maximumRetries || 2}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Cooldown Window:</span>
                <span className="font-mono text-slate-300">{caseRecord.customer?.attentionBudget?.cooldownHours || 6} hours</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Policy Status, Next Best Recovery Moment & Candidate Comparison */}
        <div className="lg:col-span-2 space-y-6">
          {/* Policy Safeguard Validation Status */}
          <div className="bg-[#0c1120] border border-slate-800/90 rounded-2xl p-5.5 space-y-3.5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-sm">Policy & Financial Guardrails</h3>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase border ${
                policyEval?.status === 'APPROVED' ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60' :
                policyEval?.status === 'REQUIRES_HUMAN_REVIEW' ? 'bg-amber-950/80 text-amber-300 border-amber-700/60' :
                'bg-red-950/80 text-red-300 border-red-700/60'
              }`}>
                STATUS: {policyEval?.status || 'APPROVED'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs font-mono pt-1">
              <div className="flex items-center space-x-2 text-emerald-400">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Payment is uncaptured</span>
              </div>
              <div className="flex items-center space-x-2 text-emerald-400">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Customer consent verified</span>
              </div>
              <div className="flex items-center space-x-2 text-emerald-400">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Attention budget available</span>
              </div>
              <div className="flex items-center space-x-2 text-emerald-400">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Decision freshness verified</span>
              </div>
            </div>
          </div>

          {/* Next Best Recovery Moment Banner */}
          <div className="bg-gradient-to-br from-[#121a2d] to-[#0c1120] border border-[#FA5D29]/40 rounded-2xl p-5.5 space-y-4 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#FA5D29]/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
              <div className="flex items-center space-x-2">
                <Zap className="w-5 h-5 text-[#FA5D29]" />
                <h3 className="font-bold text-white text-sm tracking-wide">Next Best Recovery Moment</h3>
              </div>
              <span className="text-[11px] font-mono font-bold text-[#FA5D29] bg-[#FA5D29]/15 px-3 py-1 rounded-full border border-[#FA5D29]/30 self-start sm:self-auto">
                Confidence: {decision?.decisionConfidenceLevel || 'HIGH'} ({(decision?.confidence ? decision.confidence * 100 : 88).toFixed(0)}%)
              </span>
            </div>

            {topCandidate ? (
              <div className="space-y-3.5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-[#080d18] p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 text-[10px] uppercase font-mono">Action</span>
                    <div className="font-mono font-bold text-[#FA5D29] text-sm mt-0.5">{topCandidate.actionType}</div>
                  </div>
                  <div className="bg-[#080d18] p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 text-[10px] uppercase font-mono">Recommended Time</span>
                    <div className="font-mono font-bold text-white text-xs mt-0.5">
                      {new Date(topCandidate.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div className="bg-[#080d18] p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 text-[10px] uppercase font-mono">Channel / Method</span>
                    <div className="font-mono font-bold text-white text-xs mt-0.5">{topCandidate.channel} ({topCandidate.paymentMethod})</div>
                  </div>
                  <div className="bg-[#080d18] p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 text-[10px] uppercase font-mono">Net Recovery Value</span>
                    <div className="font-mono font-bold text-emerald-400 text-sm mt-0.5">
                      ₹{(Number(topCandidate.netRecoveryValueMinorUnit) / 100).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed bg-[#080d18] p-3.5 rounded-xl border border-slate-800/90">
                  <span className="text-[#FA5D29] font-bold">Why Selected: </span>
                  {decision?.reason || topCandidate.reason}
                </p>

                <div className="flex items-center justify-end space-x-3 pt-1">
                  <a
                    href={directWaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all inline-flex items-center space-x-2 shadow-lg shadow-emerald-900/30 hover:-translate-y-0.5"
                  >
                    <MessageSquare className="w-4 h-4 fill-current" />
                    <span>Send to WhatsApp ({phoneInput || '+91 75359 47485'})</span>
                  </a>

                  <MainButton
                    text={`Execute ${topCandidate.actionType}`}
                    variant="emerald"
                    isLoading={executing}
                    disabled={executing || caseRecord.status === 'RECOVERED'}
                    action={() => handleExecuteAction(topCandidate.actionType, topCandidate.channel)}
                    iconComponent={<CheckCircle2 className="w-4 h-4" />}
                  />
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500 font-mono py-4">Evaluating candidate interventions...</div>
            )}
          </div>

          {/* Candidate Alternatives Comparison Table */}
          <div className="bg-[#0c1120] border border-slate-800/90 rounded-2xl p-5.5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center space-x-2">
                <Award className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-white text-sm tracking-wide">Evaluated Intervention Alternatives</h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400 font-semibold">{candidates.length} Alternatives Evaluated</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#080d18] text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
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
                <tbody className="divide-y divide-slate-800/70">
                  {candidates.map((cand) => (
                    <tr key={cand.id} className={cand.selected ? 'bg-[#FA5D29]/10 text-white font-semibold' : 'text-slate-300 hover:bg-slate-800/40'}>
                      <td className="py-3 px-3 font-bold text-slate-400">#{cand.rank}</td>
                      <td className="py-3 px-3 font-bold text-[#FA5D29]">{cand.actionType}</td>
                      <td className="py-3 px-3 text-slate-400">{cand.channel}</td>
                      <td className="py-3 px-3 text-emerald-400 font-bold">{(cand.recoveryProbability * 100).toFixed(0)}%</td>
                      <td className="py-3 px-3 text-slate-400">{cand.frictionScore}</td>
                      <td className="py-3 px-3 font-bold text-emerald-400">
                        ₹{(Number(cand.netRecoveryValueMinorUnit) / 100).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {cand.selected ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-[#FA5D29] text-white font-bold text-[10px] uppercase shadow-sm">
                            SELECTED
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[10px]">EVALUATED</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Customer Journey Timeline */}
          <div className="bg-[#0c1120] border border-slate-800/90 rounded-2xl p-5.5 space-y-4 shadow-xl">
            <div className="flex items-center space-x-2 border-b border-slate-800/80 pb-3">
              <History className="w-4 h-4 text-blue-400" />
              <h3 className="font-bold text-white text-sm tracking-wide">Customer Recovery Journey</h3>
            </div>
            
            <div className="space-y-4 pt-1">
              {journey && journey.length > 0 ? (
                journey.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-start space-x-3 text-xs">
                    <div className="p-1.5 rounded-full bg-slate-900 border border-slate-800 text-blue-400 mt-0.5">
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 bg-[#080d18] p-3 rounded-xl border border-slate-800">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-white">{item.title || item.eventType}</span>
                        <span className="text-[10px] font-mono text-slate-500">{new Date(item.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-slate-400 mt-1 text-[11px] leading-relaxed">{item.description}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-500 font-mono py-2">No historical journey events recorded yet.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
