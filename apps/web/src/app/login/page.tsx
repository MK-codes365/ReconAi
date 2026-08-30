'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, Lock, Mail, ArrowRight, Zap, Shield, 
  Sparkles, CheckCircle2, KeyRound, UserCheck, ShieldAlert,
  User, UserPlus, LogIn, Crown, SlidersHorizontal
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Sign In State (Clean Empty Fields)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState<'ADMIN' | 'OPERATOR'>('OPERATOR');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // If already logged in, redirect to dashboard
  useEffect(() => {
    const token = localStorage.getItem('reconai_token');
    if (token) {
      router.push('/dashboard');
    }
  }, [router]);

  const handleLogin = async (e?: React.FormEvent, customEmail?: string, customPass?: string) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

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

      // Save real session credentials
      localStorage.setItem('reconai_token', data.token);
      localStorage.setItem('reconai_user', JSON.stringify(data.user));
      document.cookie = `reconai_token=${data.token}; path=/; max-age=604800; SameSite=Lax`;
      
      setSuccess(`Signed in as ${data.user.role}! Redirecting...`);
      setTimeout(() => {
        router.push('/dashboard');
      }, 500);
    } catch (err: any) {
      setError(err.message || 'Unable to authenticate. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (!regName.trim() || !regEmail.trim() || !regPassword.trim()) {
      setError('Please fill in all registration fields');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName,
          email: regEmail,
          password: regPassword,
          role: regRole
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      localStorage.setItem('reconai_token', data.token);
      localStorage.setItem('reconai_user', JSON.stringify(data.user));
      document.cookie = `reconai_token=${data.token}; path=/; max-age=604800; SameSite=Lax`;

      setSuccess(`Account created as ${data.user.role}! Redirecting to Command Center...`);
      setTimeout(() => {
        router.push('/dashboard');
      }, 600);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Try a different email.');
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
        className="w-full max-w-md bg-[#0b101d]/95 border border-slate-800/90 rounded-3xl p-7 space-y-5 shadow-2xl backdrop-blur-md relative overflow-hidden"
      >
        {/* Glow Accent */}
        <div className="absolute -top-10 -right-10 w-36 h-36 bg-[#FA5D29]/15 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FA5D29]/20 to-orange-600/10 border border-[#FA5D29]/40 flex items-center justify-center mx-auto shadow-xl shadow-[#FA5D29]/20 p-2">
            <Image 
              src="/Logo.png" 
              alt="ReconAI Logo" 
              width={46} 
              height={46} 
              className="object-contain rounded-xl" 
              priority
            />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">ReconAI Portal</h1>
            <p className="text-xs text-slate-400">Autonomous Revenue Recovery Command Center</p>
          </div>
        </div>

        {/* Tab Selector: Sign In vs Register */}
        <div className="grid grid-cols-2 p-1 bg-[#060a14] rounded-2xl border border-slate-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setTab('LOGIN'); setError(''); setSuccess(''); }}
            className={`py-2 rounded-xl transition flex items-center justify-center space-x-1.5 ${
              tab === 'LOGIN' 
                ? 'bg-[#FA5D29] text-white font-bold shadow-md shadow-[#FA5D29]/30' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => { setTab('REGISTER'); setError(''); setSuccess(''); }}
            className={`py-2 rounded-xl transition flex items-center justify-center space-x-1.5 ${
              tab === 'REGISTER' 
                ? 'bg-[#FA5D29] text-white font-bold shadow-md shadow-[#FA5D29]/30' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Create Account</span>
          </button>
        </div>

        {/* Error / Success Notifications */}
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -5 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0 }}
              className="p-3 bg-red-950/70 border border-red-800/80 rounded-xl text-xs text-red-300 font-mono flex items-center gap-2"
            >
              <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          {success && (
            <motion.div 
              initial={{ opacity: 0, y: -5 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0 }}
              className="p-3 bg-emerald-950/70 border border-emerald-800/80 rounded-xl text-xs text-emerald-300 font-mono flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{success}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab 1: Sign In Form */}
        {tab === 'LOGIN' && (
          <motion.form 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            onSubmit={(e) => handleLogin(e)} 
            className="space-y-3.5 text-xs"
          >
            <div className="space-y-1">
              <label className="text-slate-300 font-medium font-mono uppercase text-[10px] tracking-wider">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-[#060a14] border border-slate-800 rounded-xl text-white focus:outline-none focus:border-[#FA5D29]/80 font-mono text-xs transition"
                  placeholder="Enter your registered email"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-medium font-mono uppercase text-[10px] tracking-wider">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-[#060a14] border border-slate-800 rounded-xl text-white focus:outline-none focus:border-[#FA5D29]/80 font-mono text-xs transition"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !!success}
              className="w-full py-3 bg-gradient-to-r from-[#FA5D29] to-orange-600 hover:from-orange-500 hover:to-orange-600 text-white font-bold rounded-xl flex items-center justify-center space-x-2 shadow-xl shadow-[#FA5D29]/30 hover:shadow-[#FA5D29]/50 transition-all disabled:opacity-50 text-xs group"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Sign In to Command Center</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </motion.form>
        )}

        {/* Tab 2: Real Register Form */}
        {tab === 'REGISTER' && (
          <motion.form 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            onSubmit={handleRegister} 
            className="space-y-3 text-xs"
          >
            <div className="space-y-1">
              <label className="text-slate-300 font-medium font-mono uppercase text-[10px] tracking-wider">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-[#060a14] border border-slate-800 rounded-xl text-white focus:outline-none focus:border-[#FA5D29]/80 font-mono text-xs transition"
                  placeholder="Alex Rivera"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-medium font-mono uppercase text-[10px] tracking-wider">Work Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-[#060a14] border border-slate-800 rounded-xl text-white focus:outline-none focus:border-[#FA5D29]/80 font-mono text-xs transition"
                  placeholder="alex@company.com"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-medium font-mono uppercase text-[10px] tracking-wider">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-[#060a14] border border-slate-800 rounded-xl text-white focus:outline-none focus:border-[#FA5D29]/80 font-mono text-xs transition"
                  placeholder="Create secure password"
                />
              </div>
            </div>

            {/* Role Selection Radio Group */}
            <div className="space-y-1">
              <label className="text-slate-300 font-medium font-mono uppercase text-[10px] tracking-wider">Assigned Role</label>
              <div className="grid grid-cols-2 gap-2">
                <div 
                  onClick={() => setRegRole('OPERATOR')}
                  className={`p-2.5 rounded-xl border cursor-pointer transition flex flex-col items-center text-center space-y-1 ${
                    regRole === 'OPERATOR'
                      ? 'bg-blue-950/50 border-blue-500 text-white font-bold'
                      : 'bg-[#060a14] border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <UserCheck className="w-4 h-4 text-blue-400" />
                  <span className="text-[11px]">🛡️ Operator</span>
                  <span className="text-[9px] text-slate-500">Triage & Actions</span>
                </div>

                <div 
                  onClick={() => setRegRole('ADMIN')}
                  className={`p-2.5 rounded-xl border cursor-pointer transition flex flex-col items-center text-center space-y-1 ${
                    regRole === 'ADMIN'
                      ? 'bg-amber-950/50 border-amber-500 text-white font-bold'
                      : 'bg-[#060a14] border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <Crown className="w-4 h-4 text-amber-400" />
                  <span className="text-[11px]">👑 Admin</span>
                  <span className="text-[9px] text-slate-500">Full System Control</span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !!success}
              className="w-full py-3 bg-gradient-to-r from-[#FA5D29] to-orange-600 hover:from-orange-500 hover:to-orange-600 text-white font-bold rounded-xl flex items-center justify-center space-x-2 shadow-xl shadow-[#FA5D29]/30 transition-all disabled:opacity-50 text-xs"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <span>Register & Open Command Center</span>
              )}
            </button>
          </motion.form>
        )}

        {/* 1-Click Demo Quick Logins for Hackathon Judges */}
        <div className="pt-2 border-t border-slate-800/80 space-y-2">
          <div className="text-[10px] font-mono uppercase text-slate-500 tracking-wider text-center">Instant 1-Click Role Logins</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setTab('LOGIN');
                setEmail('admin@reconai.io');
                setPassword('admin123');
                handleLogin(undefined, 'admin@reconai.io', 'admin123');
              }}
              disabled={loading || !!success}
              className="py-2 px-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold flex items-center justify-center space-x-1.5 transition shadow-sm"
            >
              <Crown className="w-3.5 h-3.5 text-[#FA5D29]" />
              <span>Admin Demo</span>
            </button>

            <button
              onClick={() => {
                setTab('LOGIN');
                setEmail('operator@reconai.io');
                setPassword('operator123');
                handleLogin(undefined, 'operator@reconai.io', 'operator123');
              }}
              disabled={loading || !!success}
              className="py-2 px-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold flex items-center justify-center space-x-1.5 transition shadow-sm"
            >
              <UserCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>Operator Demo</span>
            </button>
          </div>
        </div>

        {/* Security Trust Indicators */}
        <div className="flex items-center justify-center gap-3 text-[10px] text-slate-500 pt-1 font-mono">
          <div className="flex items-center space-x-1">
            <Lock className="w-3 h-3 text-emerald-400" />
            <span>256-bit JWT Auth</span>
          </div>
          <span>•</span>
          <span>Role-Based Access Control</span>
        </div>
      </motion.div>
    </div>
  );
}
