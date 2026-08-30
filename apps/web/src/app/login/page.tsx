'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Lock, Mail, ArrowRight, CheckCircle2, UserCheck, ShieldAlert,
  User, UserPlus, LogIn, Crown, Eye, EyeOff
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regRole, setRegRole] = useState<'ADMIN' | 'OPERATOR'>('OPERATOR');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('reconai_token');
    if (token) {
      router.push('/dashboard');
      return;
    }

    const savedEmail = localStorage.getItem('reconai_saved_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
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

      localStorage.setItem('reconai_token', data.token);
      localStorage.setItem('reconai_user', JSON.stringify(data.user));
      
      if (rememberMe) {
        localStorage.setItem('reconai_saved_email', targetEmail);
        localStorage.setItem('reconai_remember', 'true');
      } else {
        localStorage.removeItem('reconai_saved_email');
        localStorage.removeItem('reconai_remember');
      }

      document.cookie = `reconai_token=${data.token}; path=/; max-age=2592000; SameSite=Lax`;
      
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
      setError('Please fill in all fields');
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
      localStorage.setItem('reconai_saved_email', regEmail);
      localStorage.setItem('reconai_remember', 'true');
      document.cookie = `reconai_token=${data.token}; path=/; max-age=2592000; SameSite=Lax`;

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
        <div className="absolute -top-10 -right-10 w-36 h-36 bg-[#FA5D29]/15 rounded-full blur-3xl pointer-events-none" />

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
            <p className="text-xs text-slate-400">Revenue Recovery Command Center</p>
          </div>
        </div>

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
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-[#060a14] border border-slate-800 rounded-xl text-white focus:outline-none focus:border-[#FA5D29]/80 font-mono text-xs transition"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200 transition p-1"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-0.5">
              <label className="flex items-center space-x-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 bg-[#060a14] text-[#FA5D29] accent-[#FA5D29] focus:ring-0 cursor-pointer"
                />
                <span className="text-[11px] text-slate-300 font-medium">Remember me on this device</span>
              </label>
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
                  type={showRegPassword ? 'text' : 'password'}
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-[#060a14] border border-slate-800 rounded-xl text-white focus:outline-none focus:border-[#FA5D29]/80 font-mono text-xs transition"
                  placeholder="Create secure password"
                />
                <button
                  type="button"
                  onClick={() => setShowRegPassword(!showRegPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200 transition p-1"
                  tabIndex={-1}
                >
                  {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

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
                  <span className="text-[11px]">Operator</span>
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
                  <span className="text-[11px]">Admin</span>
                  <span className="text-[9px] text-slate-500">System Control</span>
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

        <div className="flex items-center justify-center gap-3 text-[10px] text-slate-500 pt-3 border-t border-slate-800/80 font-mono">
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
