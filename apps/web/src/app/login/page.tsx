'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  ShieldCheck, Lock, Mail, ArrowRight, Zap, Shield, 
  Sparkles, CheckCircle2, KeyRound, UserCheck
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@reconai.io');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e?: React.FormEvent, customEmail?: string, customPass?: string) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');

    const targetEmail = customEmail || email;
    const targetPass = customPass || password;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, password: targetPass }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      localStorage.setItem('reconai_token', data.token);
      localStorage.setItem('reconai_user', JSON.stringify(data.user));
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md bg-[#0b101d]/90 border border-slate-800/90 rounded-3xl p-8 space-y-6 shadow-2xl backdrop-blur-md relative overflow-hidden"
      >
        {/* Glow Accent */}
        <div className="absolute -top-10 -right-10 w-36 h-36 bg-[#FA5D29]/15 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="text-center space-y-2.5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FA5D29]/20 to-orange-600/10 border border-[#FA5D29]/40 flex items-center justify-center text-[#FA5D29] mx-auto shadow-lg shadow-[#FA5D29]/10">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">ReconAI Portal</h1>
            <p className="text-xs text-slate-400 mt-1">Autonomous Revenue Recovery Command Center</p>
          </div>
        </div>

        {error && (
          <div className="p-3.5 bg-red-950/60 border border-red-800/80 rounded-xl text-xs text-red-300 font-mono text-center">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={(e) => handleLogin(e)} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="text-slate-300 font-medium font-mono uppercase text-[10px] tracking-wider">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3.5 py-3 bg-[#060a14] border border-slate-800 rounded-xl text-white focus:outline-none focus:border-[#FA5D29]/80 font-mono text-xs transition"
                placeholder="admin@reconai.io"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-slate-300 font-medium font-mono uppercase text-[10px] tracking-wider">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3.5 py-3 bg-[#060a14] border border-slate-800 rounded-xl text-white focus:outline-none focus:border-[#FA5D29]/80 font-mono text-xs transition"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-[#FA5D29] to-orange-600 hover:from-orange-500 hover:to-orange-600 text-white font-bold rounded-xl flex items-center justify-center space-x-2 shadow-xl shadow-[#FA5D29]/30 hover:shadow-[#FA5D29]/50 transition-all disabled:opacity-50 text-sm group"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <span>Sign In to Command Center</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        {/* 1-Click Demo Quick Logins for Hackathon Judges */}
        <div className="pt-3 border-t border-slate-800/80 space-y-2">
          <div className="text-[10px] font-mono uppercase text-slate-500 tracking-wider text-center">1-Click Hackathon Quick Logins</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleLogin(undefined, 'admin@reconai.io', 'admin123')}
              disabled={loading}
              className="py-2.5 px-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold flex items-center justify-center space-x-1.5 transition shadow-sm"
            >
              <KeyRound className="w-3.5 h-3.5 text-[#FA5D29]" />
              <span>Admin Role</span>
            </button>

            <button
              onClick={() => handleLogin(undefined, 'operator@reconai.io', 'operator123')}
              disabled={loading}
              className="py-2.5 px-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold flex items-center justify-center space-x-1.5 transition shadow-sm"
            >
              <UserCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>Operator Role</span>
            </button>
          </div>
        </div>

        {/* Security Badge */}
        <div className="flex items-center justify-center gap-3 text-[11px] text-slate-600 pt-1">
          <div className="flex items-center space-x-1">
            <Lock className="w-3 h-3" />
            <span>256-bit JWT Auth</span>
          </div>
          <span>•</span>
          <span>RBAC Protected</span>
        </div>
      </motion.div>
    </div>
  );
}
