'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CreditCard, Smartphone, ShieldAlert, CheckCircle2, 
  ArrowRight, RefreshCw, Lock, MessageSquare, ExternalLink,
  ChevronRight, Sparkles, Building2, Zap, AlertTriangle
} from 'lucide-react';

export default function RazorpayCheckoutSimulator() {
  const [amount, setAmount] = useState<number>(4999);
  const [customerName, setCustomerName] = useState('Priya Sharma');
  const [customerEmail, setCustomerEmail] = useState('priya.sharma@enterprise.io');
  const [customerPhone, setCustomerPhone] = useState('9876543210');
  const [failureScenario, setFailureScenario] = useState('bank_otp_timeout_504');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSimulateFailure = async () => {
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/dev/events/payment-failed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amount,
          customerName: customerName,
          customerEmail: customerEmail,
          customerPhone: customerPhone,
          failureReason: failureScenario,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to trigger webhook');

      setResult({
        type: 'FAILED',
        caseId: data.caseId || `case_${Date.now()}`,
        caseNumber: data.caseNumber || `CASE-${Date.now().toString().slice(-4)}`,
        amount: amount,
        customerName: customerName,
        customerPhone: customerPhone,
        failureReason: failureScenario,
        payUrl: `http://localhost:3000/pay/${data.caseId || 'case_rec_9824'}`,
      });
    } catch (err: any) {
      alert(err.message || 'Error sending webhook to ReconAI');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-white p-4 md:p-8 flex items-center justify-center">
      <div className="w-full max-w-xl space-y-6">
        {/* Header Bar */}
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-white transition">
            <ChevronRight className="w-4 h-4 rotate-180" />
            <span>Back to Command Center</span>
          </Link>
          <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-blue-950/80 text-blue-400 border border-blue-800/60">
            Razorpay Sandbox Simulator
          </span>
        </div>

        {/* Razorpay Checkout Card */}
        <div className="bg-[#0b1120] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          {/* Razorpay Classic Blue Header */}
          <div className="bg-gradient-to-r from-[#0c2340] to-[#021329] p-6 border-b border-blue-950/80 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono uppercase tracking-wider text-blue-300 font-bold">Razorpay Standard Checkout</span>
              </div>
              <h2 className="text-xl font-extrabold text-white">ReconAI Merchant Store</h2>
              <p className="text-xs text-slate-300">Annual Enterprise Subscription</p>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-400 font-mono">Amount Payable</div>
              <div className="text-2xl font-black text-white font-mono">₹{amount.toLocaleString('en-IN')}</div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="p-6 space-y-4 text-xs font-sans">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-slate-400 font-mono uppercase text-[10px] font-bold">Customer Name</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#060a14] border border-slate-800 text-white font-medium focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400 font-mono uppercase text-[10px] font-bold">Transaction Amount (₹)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl bg-[#060a14] border border-slate-800 text-white font-mono font-bold focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-slate-400 font-mono uppercase text-[10px] font-bold">Customer Phone (for WhatsApp)</label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="9876543210"
                  className="w-full p-2.5 rounded-xl bg-[#060a14] border border-slate-800 text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400 font-mono uppercase text-[10px] font-bold">Bank Failure Reason</label>
                <select
                  value={failureScenario}
                  onChange={(e) => setFailureScenario(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#060a14] border border-slate-800 text-slate-200 font-mono text-xs focus:outline-none focus:border-blue-500"
                >
                  <option value="bank_otp_timeout_504">504 Gateway Timeout (OTP Delay)</option>
                  <option value="customer_insufficient_funds">Insufficient Account Balance</option>
                  <option value="issuer_technical_decline">Bank Server Hardware Failure</option>
                  <option value="upi_app_switch_drop">UPI Intent App Switch Timeout</option>
                </select>
              </div>
            </div>

            {/* Simulation Trigger Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleSimulateFailure}
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-bold rounded-2xl flex items-center justify-center space-x-2 shadow-xl shadow-red-950/50 transition-all disabled:opacity-50 text-sm"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <ShieldAlert className="w-4 h-4" />
                    <span>Trigger Failed Razorpay Transaction (Webhook)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Live Interception Result Card */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-[#0b101d] border border-emerald-800/80 rounded-3xl p-6 space-y-4 shadow-2xl relative overflow-hidden"
            >
              <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>Transaction Dropped & Intercepted by ReconAI!</span>
              </div>

              <div className="p-4 bg-[#060a14] rounded-2xl border border-slate-800/80 space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Case Number:</span>
                  <span className="text-[#FA5D29] font-bold">{result.caseNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Customer:</span>
                  <span className="text-white">{result.customerName} (+91 {result.customerPhone})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Amount at Risk:</span>
                  <span className="text-emerald-400 font-bold">₹{result.amount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Root Cause:</span>
                  <span className="text-red-400">{result.failureReason}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* 1-Click WhatsApp Trigger */}
                <a
                  href={`https://wa.me/91${result.customerPhone}?text=${encodeURIComponent(
                    `*Payment Recovery Alert | ReconAI* ⚡\n\nHello *${result.customerName}*,\nYour payment of *₹${result.amount.toLocaleString('en-IN')}* failed due to bank timeout.\n\nComplete your checkout securely in 1-click:\n👉 ${result.payUrl}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-emerald-900/40 transition"
                >
                  <MessageSquare className="w-4 h-4 fill-current" />
                  <span>Send via WhatsApp (wa.me)</span>
                </a>

                {/* Direct 1-Click Recovery Payment Link */}
                <Link
                  href={result.payUrl}
                  target="_blank"
                  className="py-3 px-4 rounded-xl bg-[#FA5D29] hover:bg-orange-500 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-orange-950/40 transition"
                >
                  <span>Open 1-Click Payment Link</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
