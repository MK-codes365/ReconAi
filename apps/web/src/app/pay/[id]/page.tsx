'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, CheckCircle2, CreditCard, Smartphone, Building2, 
  ArrowLeft, Lock, Clock, AlertTriangle, Zap, IndianRupee,
  Wallet, QrCode, ChevronRight, PartyPopper
} from 'lucide-react';

const PAYMENT_METHODS = [
  { 
    id: 'upi', 
    label: 'UPI', 
    description: 'GPay, PhonePe, Paytm, BHIM',
    icon: Smartphone, 
    color: 'from-violet-500 to-purple-600',
    borderColor: 'border-violet-500/40',
    bgColor: 'bg-violet-500/10',
    recommended: true 
  },
  { 
    id: 'card', 
    label: 'Credit / Debit Card', 
    description: 'Visa, Mastercard, RuPay',
    icon: CreditCard, 
    color: 'from-blue-500 to-cyan-600',
    borderColor: 'border-blue-500/40',
    bgColor: 'bg-blue-500/10',
    recommended: false 
  },
  { 
    id: 'netbanking', 
    label: 'Net Banking', 
    description: 'HDFC, SBI, ICICI, Axis & more',
    icon: Building2, 
    color: 'from-emerald-500 to-teal-600',
    borderColor: 'border-emerald-500/40',
    bgColor: 'bg-emerald-500/10',
    recommended: false 
  },
  { 
    id: 'wallet', 
    label: 'Wallet', 
    description: 'Paytm, Amazon Pay, Freecharge',
    icon: Wallet, 
    color: 'from-amber-500 to-orange-600',
    borderColor: 'border-amber-500/40',
    bgColor: 'bg-amber-500/10',
    recommended: false 
  },
];

export default function CustomerRecoveryPaymentPage() {
  const params = useParams();
  const caseId = params?.id as string;

  const [caseData, setCaseData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMethod, setSelectedMethod] = useState<string | null>('upi');
  const [paying, setPaying] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [receiptNumber, setReceiptNumber] = useState('');

  useEffect(() => {
    const fetchCase = async () => {
      try {
        const res = await fetch(`/api/recovery/cases/${caseId}`);
        if (res.ok) {
          const data = await res.json();
          setCaseData(data.case);
          if (data.case?.status === 'RECOVERED') {
            setPaymentComplete(true);
          }
        }
      } catch (err) {
        console.error('Failed to load recovery case:', err);
      } finally {
        setLoading(false);
      }
    };

    if (caseId) fetchCase();
  }, [caseId]);

  const handlePayment = async () => {
    if (!selectedMethod || paying) return;
    setPaying(true);

    try {
      const res = await fetch(`/api/recovery/cases/${caseId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod: selectedMethod.toUpperCase(),
          paymentReference: `pay_${Date.now()}`
        })
      });

      if (res.ok) {
        const result = await res.json();
        setReceiptNumber(result.receiptNumber || `REC-RCPT-${Date.now().toString().slice(-6)}`);
        setPaymentComplete(true);
      }
    } catch (err) {
      console.error('Payment failed:', err);
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060a14] flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-2 border-[#FA5D29] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 text-sm font-medium">Loading payment details...</p>
        </div>
      </div>
    );
  }

  const amount = caseData?.amountAtRiskInr || 0;
  const customerName = caseData?.customerName || caseData?.customer?.name || 'Customer';
  const caseNumber = caseData?.caseNumber || 'REC-2026-001';

  // Payment Success Screen
  if (paymentComplete) {
    return (
      <div className="min-h-screen bg-[#060a14] flex items-center justify-center p-4">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, type: 'spring' }}
          className="max-w-md w-full bg-[#0e1424] border border-emerald-500/30 rounded-3xl p-8 text-center space-y-6 shadow-2xl shadow-emerald-500/10"
        >
          <motion.div 
            initial={{ scale: 0 }} 
            animate={{ scale: 1 }} 
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="w-20 h-20 mx-auto rounded-full bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center"
          >
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          </motion.div>

          <div>
            <h1 className="text-2xl font-extrabold text-white">Payment Successful!</h1>
            <p className="text-slate-400 text-sm mt-2">Your payment has been recovered successfully.</p>
          </div>

          <div className="bg-[#080d18] rounded-2xl border border-slate-800 p-5 space-y-3 text-left">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Amount Paid</span>
              <span className="text-emerald-400 font-extrabold text-lg font-mono">₹{amount.toLocaleString('en-IN')}</span>
            </div>
            <div className="border-t border-slate-800/80"></div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Case Number</span>
              <span className="text-slate-300 font-mono">{caseNumber}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Receipt</span>
              <span className="text-slate-300 font-mono">{receiptNumber}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Status</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-700/50 text-[10px] font-bold uppercase">Recovered</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
            <Lock className="w-3.5 h-3.5" />
            <span>Secured by ReconAI × Razorpay</span>
          </div>
        </motion.div>
      </div>
    );
  }

  // Main Payment Recovery Page
  return (
    <div className="min-h-screen bg-[#060a14] flex items-center justify-center p-4">
      <div className="max-w-lg w-full space-y-6">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <div className="flex items-center justify-center gap-2 text-xs text-slate-500 mb-3">
            <Shield className="w-4 h-4 text-emerald-500" />
            <span>Secured Payment Recovery Portal</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Complete Your Payment</h1>
          <p className="text-slate-400 text-sm">
            Your payment for order <span className="text-[#FA5D29] font-mono font-bold">{caseNumber}</span> needs attention.
          </p>
        </motion.div>

        {/* Invoice Summary Card */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#0e1424] border border-slate-800/90 rounded-2xl p-6 space-y-4 shadow-xl"
        >
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-400 font-mono uppercase tracking-wider">Payment Summary</div>
            <div className="flex items-center gap-1.5 text-xs text-amber-400">
              <Clock className="w-3.5 h-3.5" />
              <span>Action Required</span>
            </div>
          </div>

          <div className="border-t border-slate-800/80"></div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Customer</span>
              <span className="text-white font-semibold">{customerName}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Case Number</span>
              <span className="text-slate-300 font-mono">{caseNumber}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Reason</span>
              <span className="text-red-400 font-mono text-xs">{caseData?.failureReason || 'gateway_timeout'}</span>
            </div>
          </div>

          <div className="border-t border-slate-800/80"></div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-medium">Amount Due</span>
            <div className="flex items-center gap-1">
              <IndianRupee className="w-5 h-5 text-white" />
              <span className="text-3xl font-extrabold text-white font-mono">{amount.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </motion.div>

        {/* Payment Methods */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          <div className="text-xs text-slate-400 font-mono uppercase tracking-wider px-1">Choose Payment Method</div>
          
          <div className="space-y-2.5">
            {PAYMENT_METHODS.map((method) => {
              const Icon = method.icon;
              const isSelected = selectedMethod === method.id;
              
              return (
                <button
                  key={method.id}
                  onClick={() => setSelectedMethod(method.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all duration-200 group ${
                    isSelected 
                      ? `bg-[#0e1424] ${method.borderColor} shadow-lg` 
                      : 'bg-[#0a0f1a] border-slate-800/70 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className={`p-2.5 rounded-xl ${method.bgColor} ${isSelected ? 'ring-1 ring-white/10' : ''}`}>
                      <Icon className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold text-sm ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                          {method.label}
                        </span>
                        {method.recommended && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 text-[9px] font-bold uppercase border border-emerald-800/50">
                            Recommended
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{method.description}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      isSelected 
                        ? 'border-[#FA5D29] bg-[#FA5D29]' 
                        : 'border-slate-600'
                    }`}>
                      {isSelected && <div className="w-2 h-2 rounded-full bg-white"></div>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Pay Button */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <button
            onClick={handlePayment}
            disabled={!selectedMethod || paying}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#FA5D29] to-orange-600 hover:from-orange-500 hover:to-orange-600 text-white font-bold text-base transition-all duration-200 shadow-xl shadow-[#FA5D29]/30 hover:shadow-[#FA5D29]/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 group"
          >
            {paying ? (
              <>
                <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                <span>Processing Payment...</span>
              </>
            ) : (
              <>
                <Zap className="w-5 h-5 fill-current" />
                <span>Pay ₹{amount.toLocaleString('en-IN')} Now</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </button>
        </motion.div>

        {/* Security Footer */}
        <div className="flex items-center justify-center gap-4 text-[11px] text-slate-600 pb-4">
          <div className="flex items-center gap-1">
            <Lock className="w-3 h-3" />
            <span>256-bit SSL</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1">
            <Shield className="w-3 h-3" />
            <span>PCI DSS Compliant</span>
          </div>
          <span>•</span>
          <span>Powered by ReconAI × Razorpay</span>
        </div>
      </div>
    </div>
  );
}
