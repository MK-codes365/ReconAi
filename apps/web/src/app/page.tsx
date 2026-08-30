'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Marquee from 'react-fast-marquee';
import { motion } from 'framer-motion';
import { FollowerPointerCard } from '@/components/ui/following-pointer';
import { MacbookScroll } from '@/components/ui/macbook-scroll';
import { 
  ShieldCheck, Zap, ArrowRight, Activity, Smartphone,
  CheckCircle2, IndianRupee, Sparkles, Lock, TrendingUp,
  ChevronRight, RefreshCw, BarChart3, Bot, Layers, Play,
  ExternalLink, ArrowUpRight, Cpu, Radio, Award
} from 'lucide-react';

export default function ReconAiLandingPage() {
  const [monthlyRevenue, setMonthlyRevenue] = useState(5000000); // 50 Lakhs
  const [failureRate, setFailureRate] = useState(25); // 25% failure rate

  // Financial Calculations
  const revenueAtRisk = monthlyRevenue * (failureRate / 100);
  const recoveredMonthly = revenueAtRisk * 0.382; // 38.2% recovery lift
  const recoveredAnnual = recoveredMonthly * 12;

  const marqueeData = [
    "⚡ Autonomous Razorpay Webhook Ingestion —",
    "🧠 Google Gemini 1.5 Flash Root-Cause Diagnosis —",
    "📱 1-Click WhatsApp Recovery Dispatch —",
    "🛡️ Customer Attention Budget & 6h Cooldown Guardrails —",
    "💰 38.2% Average ARR Recovery Lift —",
    "🚀 Real-Time Command Center Telemetry —",
    "💳 Multi-Rail Customer Checkout Portal (UPI, Cards, Netbanking) —"
  ];

  return (
    <main className="bg-[#0B0B0F] min-h-screen text-white selection:bg-[#FA5D29] selection:text-white relative overflow-hidden font-sans">
      {/* Floating Top Navbar */}
      <header className="sticky top-0 z-50 bg-[#0a0f1d]/90 backdrop-blur-md border-b border-slate-800/80 px-6 py-4 shadow-2xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Image 
              src="/Logo.png" 
              alt="ReconAI Logo" 
              width={40} 
              height={40} 
              className="w-10 h-10 rounded-2xl object-contain shadow-lg shadow-[#FA5D29]/30" 
              priority
            />
            <div>
              <span className="font-extrabold text-xl tracking-tight text-white">Recon<span className="text-[#FA5D29]">AI</span></span>
              <span className="ml-2 px-2.5 py-0.5 rounded-full bg-slate-800 text-[10px] font-mono text-emerald-400 border border-slate-700 font-bold">
                ● LIVE RECOVERY ACTIVE
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-8 text-xs font-bold text-slate-300">
            <a href="#console" className="hover:text-white transition">3D Interactive Console</a>
            <a href="#pipeline" className="hover:text-white transition">Autonomous Pipeline</a>
            <a href="#security" className="hover:text-white transition">Guardrails & Safety</a>
          </div>

          <div className="flex items-center space-x-3">
            <Link 
              href="/login"
              className="px-4 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white transition shadow-sm"
            >
              Sign In
            </Link>
            <Link 
              href="/dashboard"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FA5D29] to-orange-600 hover:from-orange-500 hover:to-orange-600 text-white text-xs font-extrabold transition shadow-xl shadow-[#FA5D29]/30 flex items-center space-x-1.5 group"
            >
              <span>Launch Command Center</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Header with Cursor Following Pointer Effect */}
      <div className="pt-14 pb-4 flex justify-center text-center">
        <FollowerPointerCard
          title={
            <div className="flex space-x-2 items-center">
              <div className="w-4 h-4 rounded-full bg-[#FA5D29] flex items-center justify-center text-[9px] font-bold text-white">
                AI
              </div>
              <p className="font-mono text-xs text-white font-bold">ReconAI Agent Active</p>
            </div>
          }
          className="inline-flex cursor-pointer"
        >
          <div className="space-y-3">
            <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-[#FA5D29]/15 border border-[#FA5D29]/30 text-[#FA5D29] text-xs font-mono font-bold tracking-wider uppercase shadow-inner">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Autonomous Revenue Recovery for Razorpay</span>
            </div>
            <p className="pt-2 text-4xl sm:text-6xl md:text-7xl font-black text-white tracking-tight">
              Recon<span className="text-[#FA5D29]">AI</span>
            </p>
            <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto font-medium">
              Autonomous AI Agent that turns dropped checkouts into recovered revenue in real time.
            </p>
          </div>
        </FollowerPointerCard>
      </div>

      {/* Streaming Marquee Ticker */}
      <div className="my-6 py-3.5 bg-[#0a0f1d] border-y border-slate-800/80">
        <Marquee pauseOnHover speed={45}>
          {marqueeData.map((info, index) => (
            <p key={index} className="mx-6 text-xs font-mono font-bold text-slate-400 flex items-center space-x-2">
              <span>{info}</span>
            </p>
          ))}
        </Marquee>
      </div>

      {/* 3D Macbook Scroll Showcase Section with Interactive ReconAI Console Inside Screen */}
      <section id="console" className="relative overflow-hidden bg-[#060a14] w-full pt-4">
        <MacbookScroll
          title={
            <div className="text-center space-y-3 pb-8">
              <span className="px-3.5 py-1 rounded-full bg-[#FA5D29]/15 border border-[#FA5D29]/30 text-[#FA5D29] text-xs font-mono font-bold uppercase tracking-wider">
                Interactive 3D Laptop Console
              </span>
              <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
                Scroll to Open ReconAI Terminal
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
                Interact with the live ROI calculator and real-time telemetry directly inside the 3D MacBook display.
              </p>
            </div>
          }
          showGradient={false}
        >
          {/* Custom Clean ReconAI Screen Content Filling Laptop Display */}
          <div className="w-full h-full bg-[#080d1a] flex flex-col font-sans select-none overflow-y-auto">
            {/* macOS Topbar */}
            <div className="px-3 py-2 bg-[#050811] border-b border-slate-800/90 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                <span className="text-[10px] font-mono text-slate-400 ml-2">reconai.io/operator-console</span>
              </div>
              <div className="flex items-center space-x-1.5 text-[9px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>ONLINE (GEMINI 1.5 FLASH)</span>
              </div>
            </div>

            {/* Inner Console Screen Content */}
            <div className="p-3.5 space-y-3 flex-1 flex flex-col justify-between">
              {/* KPI Strip */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-[#0c1222] border border-slate-800/90 p-2.5 rounded-xl text-left">
                  <div className="text-[9px] font-mono text-slate-400 uppercase">Monthly GMV</div>
                  <div className="text-sm font-extrabold text-[#FA5D29] font-mono mt-0.5">
                    ₹{(monthlyRevenue / 100000).toFixed(1)}L
                  </div>
                </div>

                <div className="bg-[#0c1222] border border-slate-800/90 p-2.5 rounded-xl text-left">
                  <div className="text-[9px] font-mono text-slate-400 uppercase">Drop Rate</div>
                  <div className="text-sm font-extrabold text-red-400 font-mono mt-0.5">{failureRate}%</div>
                </div>

                <div className="bg-gradient-to-br from-[#0c1222] to-emerald-950/40 border border-emerald-800/50 p-2.5 rounded-xl text-left">
                  <div className="text-[9px] font-mono text-emerald-400 uppercase font-bold">ARR Lift</div>
                  <div className="text-sm font-extrabold text-emerald-400 font-mono mt-0.5">
                    +₹{(recoveredAnnual / 100000).toFixed(1)}L
                  </div>
                </div>
              </div>

              {/* Interactive Sliders inside Laptop */}
              <div className="bg-[#0c1222] border border-slate-800/90 p-3 rounded-xl space-y-2.5 text-left">
                <div>
                  <div className="flex justify-between text-[10px] font-mono text-slate-300 mb-1">
                    <span>Monthly Transaction Volume</span>
                    <span className="text-[#FA5D29] font-bold">₹{(monthlyRevenue / 100000).toFixed(1)} Lakhs</span>
                  </div>
                  <input
                    type="range"
                    min="500000"
                    max="50000000"
                    step="500000"
                    value={monthlyRevenue}
                    onChange={(e) => setMonthlyRevenue(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#FA5D29]"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[10px] font-mono text-slate-300 mb-1">
                    <span>Payment Drop Rate</span>
                    <span className="text-red-400 font-bold">{failureRate}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="40"
                    step="1"
                    value={failureRate}
                    onChange={(e) => setFailureRate(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-red-500"
                  />
                </div>
              </div>

              {/* Bottom Quick Launch Button inside Screen */}
              <Link
                href="/dashboard"
                className="w-full py-2 bg-gradient-to-r from-[#FA5D29] to-orange-600 hover:from-orange-500 hover:to-orange-600 text-white font-bold rounded-xl text-center text-[11px] shadow-lg shadow-[#FA5D29]/30 flex items-center justify-center space-x-1.5 transition shrink-0"
              >
                <span>Open Full Command Center</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </MacbookScroll>
      </section>

      {/* 5-Step Autonomous Pipeline Architecture (Comes after scrolling) */}
      <section id="pipeline" className="max-w-7xl mx-auto px-6 py-20 relative z-10">
        <div className="text-center space-y-3 mb-16">
          <span className="px-3.5 py-1 rounded-full bg-[#FA5D29]/15 border border-[#FA5D29]/30 text-[#FA5D29] text-xs font-mono font-extrabold uppercase tracking-wider">
            5-Tier Autonomous Engine
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            How Lost Revenue is Recovered
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
            From the millisecond a bank drops a payment to instant cash recovery on customer phones.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            {
              step: '01',
              title: 'Live Ingestion',
              desc: 'Catches Razorpay payment failures in milliseconds via secure webhooks.',
              icon: Zap,
              color: 'text-amber-400',
              border: 'group-hover:border-amber-500/50'
            },
            {
              step: '02',
              title: 'Gemini AI Triage',
              desc: 'Google Gemini 1.5 Flash diagnoses root cause from raw bank error codes.',
              icon: Bot,
              color: 'text-blue-400',
              border: 'group-hover:border-blue-500/50'
            },
            {
              step: '03',
              title: 'ML Next Moment',
              desc: 'XGBoost ML model predicts optimal recovery timing and channel.',
              icon: Cpu,
              color: 'text-purple-400',
              border: 'group-hover:border-purple-500/50'
            },
            {
              step: '04',
              title: 'WhatsApp Dispatch',
              desc: 'Dispatches personalized 1-click recovery links directly to customer.',
              icon: Smartphone,
              color: 'text-emerald-400',
              border: 'group-hover:border-emerald-500/50'
            },
            {
              step: '05',
              title: 'Instant Checkout',
              desc: 'Customer completes payment via UPI or Cards. Revenue recovered live.',
              icon: ShieldCheck,
              color: 'text-[#FA5D29]',
              border: 'group-hover:border-[#FA5D29]/50'
            }
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div 
                key={s.step} 
                className={`bg-[#0b101d]/90 border border-slate-800 rounded-3xl p-6 space-y-4 relative group transition-all duration-300 hover:scale-105 hover:shadow-2xl ${s.border}`}
              >
                <div className="flex justify-between items-center">
                  <div className={`w-10 h-10 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center ${s.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-mono text-slate-500 font-extrabold">{s.step}</span>
                </div>
                <h3 className="text-base font-bold text-white">{s.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{s.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Guardrails & Security Section */}
      <section id="security" className="max-w-6xl mx-auto px-6 py-20 relative z-10">
        <div className="bg-[#0b101d]/90 border border-slate-800 rounded-3xl p-8 sm:p-12 shadow-2xl backdrop-blur-md grid grid-cols-1 md:grid-cols-3 gap-8 text-center sm:text-left">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-blue-950/80 border border-blue-800/60 flex items-center justify-center text-blue-400 mb-3 mx-auto sm:mx-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Attention Budget Guardrails</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Enforces strict contact limits (max 3) and mandatory 6-hour cooldowns so customers are never spammed.
            </p>
          </div>

          <div className="space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400 mb-3 mx-auto sm:mx-0">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Bank-Grade Compliance</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              HMAC-SHA256 signature verification, 256-bit encryption, and zero cardholder data storage.
            </p>
          </div>

          <div className="space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-[#FA5D29]/15 border border-[#FA5D29]/40 flex items-center justify-center text-[#FA5D29] mb-3 mx-auto sm:mx-0">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Immutable Audit Trail</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every decision, AI prompt, and recovery action is cryptographically logged into a tamper-evident audit record.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#04070e] py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-3">
            <Image 
              src="/Logo.png" 
              alt="ReconAI Logo" 
              width={32} 
              height={32} 
              className="w-8 h-8 rounded-xl object-contain shadow-md" 
            />
            <span className="font-bold text-white text-sm">ReconAI Platform</span>
          </div>

          <div className="text-xs text-slate-500 font-mono">
            Autonomous Revenue Recovery for Razorpay • Powered by Google Gemini 1.5 Flash
          </div>

          <div className="flex items-center space-x-6 text-xs font-semibold text-slate-400">
            <Link href="/dashboard" className="hover:text-white transition">Command Center</Link>
            <Link href="/recovery" className="hover:text-white transition">Cases Queue</Link>
            <Link href="/evaluation" className="hover:text-white transition">Benchmark</Link>
            <Link href="/login" className="hover:text-white transition">Sign In</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
