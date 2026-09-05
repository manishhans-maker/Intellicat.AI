import React, { useState } from 'react';
import { ArrowRight, Sparkles, Shield, Zap, Crown, CheckCircle2, Clock, Users, Cpu, Lock, ChevronRight, Cat, Code, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ChatMode } from './AiAssistantModal';
import { INTELLICAT_LOGO_URL } from '../constants';

interface PriorityListSectionProps {
  onOpenPremium?: () => void;
  onOpenInfo?: (tabId?: string) => void;
  onOpenAiChat?: (prompt?: string) => void;
  onOpenChat?: (mode: ChatMode, prompt?: string) => void;
  onOpenBuyVip?: () => void;
  isVipMember?: boolean;
  isFounder?: boolean;
}

export const PriorityListSection: React.FC<PriorityListSectionProps> = ({
  onOpenPremium,
  onOpenInfo,
  onOpenAiChat,
  onOpenChat,
  onOpenBuyVip,
  isVipMember = false,
  isFounder = false,
}) => {
  const [email, setEmail] = useState('');
  const [tier, setTier] = useState<'Priority Pro' | 'Enterprise VIP' | 'Founder Access ($1B)'>('Priority Pro');
  const [submitted, setSubmitted] = useState(false);
  const [queueSpot, setQueueSpot] = useState(48);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubmitted(true);
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col justify-between py-4 sm:py-8 px-4 sm:px-8 lg:px-14 relative z-10">
      {/* Top Tagline & Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        {/* Left Tagline Badge matching hero */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-3"
        >
          {/* Logo Badge */}
          <div className="w-8 h-8 rounded-xl overflow-hidden border border-amber-500/40 bg-black/60 shadow-[0_0_12px_rgba(245,158,11,0.4)] shrink-0">
            <img
              src={INTELLICAT_LOGO_URL}
              alt="IntellicatAI"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="w-[1px] h-7 bg-neutral-700/80" />

          <div className="flex flex-col text-[12px] leading-[1.3] text-neutral-300 font-medium tracking-wide">
            <span className="text-white font-semibold">IntellicatAI Priority Queue</span>
            <span className="text-neutral-400">Alpha Cohort #048</span>
          </div>
        </motion.div>

        {/* Live Priority Queue Indicator & VIP Pass Trigger */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-2.5"
        >
          <button
            onClick={onOpenBuyVip}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#EF233C]/20 to-amber-500/20 hover:from-[#EF233C]/35 hover:to-amber-500/35 border border-amber-500/40 text-amber-300 text-xs font-bold transition-all cursor-pointer shadow-sm"
          >
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span>Buy VIP Pass</span>
          </button>

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/60 border border-white/10 backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#EF233C]"></span>
            </span>
            <span className="text-xs font-semibold text-neutral-200">
              Queue: <span className="text-[#EF233C] font-bold">ACTIVE</span>
            </span>
            <span className="text-[11px] text-neutral-400 bg-white/5 px-2 py-0.5 rounded-md font-mono">
              #{queueSpot} in line
            </span>
          </div>
        </motion.div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center my-auto">
        {/* Left Column: Headline, Description & Partner Spark Badge */}
        <div className="lg:col-span-7 flex flex-col items-start">
          {/* Main Headline with Signature Serif Display */}
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-[40px] sm:text-[56px] lg:text-[68px] xl:text-[76px] font-bold text-white tracking-[-0.03em] leading-[1.06] mb-5 select-none"
          >
            <span className="block font-sans font-extrabold">Build Intelligent Robots</span>
            <span className="block font-sans font-extrabold">
              with{' '}
              <span className="font-serif-display font-normal text-[#EF233C] tracking-tight ml-1 text-[1.12em] inline-block transform -translate-y-0.5">
                AI Precision
              </span>
            </span>
            <span className="block font-sans font-extrabold text-neutral-100">
              for the Future
            </span>
          </motion.h1>

          {/* Subtitle Description */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-neutral-300 text-sm sm:text-base lg:text-lg font-normal leading-relaxed max-w-xl mb-6"
          >
            Empower your development team with feline coding intelligence, instant debugging, and priority compute access.
          </motion.p>

          {/* 2 Modes Launch & Buy VIP Pass */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="flex flex-wrap items-center gap-3 mb-8"
          >
            <button
              onClick={() => onOpenChat ? onOpenChat('normal') : onOpenAiChat?.("Let's talk and brainstorm ideas")}
              className="flex items-center gap-2 text-xs font-semibold text-white px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 transition-all cursor-pointer shadow-sm group"
            >
              <MessageSquare className="w-3.5 h-3.5 text-sky-400 group-hover:scale-110 transition-transform" />
              <span>Normal Talk</span>
            </button>

            <button
              onClick={() => onOpenChat ? onOpenChat('cat-code', "Write a clean TypeScript module with error handling and unit tests") : onOpenAiChat?.("Write a clean TypeScript module with error handling and full unit tests")}
              className="flex items-center gap-2 text-xs font-semibold text-white px-3.5 py-1.5 rounded-full bg-[#EF233C]/20 hover:bg-[#EF233C]/35 border border-[#EF233C]/40 transition-all cursor-pointer shadow-sm group"
            >
              <Cat className="w-3.5 h-3.5 text-[#EF233C] group-hover:scale-110 transition-transform" />
              <span>Cat Code 🐾</span>
              <span className="text-[10px] text-[#EF233C] font-mono">Gemini</span>
            </button>

            <button
              onClick={onOpenBuyVip}
              className="flex items-center gap-2 text-xs font-semibold text-amber-300 px-3.5 py-1.5 rounded-full bg-amber-500/15 hover:bg-amber-500/30 border border-amber-500/40 hover:border-amber-500 transition-all cursor-pointer shadow-sm group"
            >
              <Crown className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
              <span>Buy VIP Pass (#048)</span>
              <ArrowRight className="w-3 h-3 text-amber-300" />
            </button>
          </motion.div>

          {/* Quick Metrics Strip */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-400">
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-[#EF233C]" />
              <span>&lt;12ms Neural Loop</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-neutral-600" />
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-[#EF233C]" />
              <span>SOC2 Type II Certified</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-neutral-600" />
            <div className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-[#EF233C]" />
              <span>Kinematics Acceleration</span>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Priority List Registration & Premium Perks Card */}
        <div className="lg:col-span-5">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="relative rounded-3xl p-6 sm:p-7 bg-[#0d0d12]/90 border border-white/15 backdrop-blur-xl shadow-2xl overflow-hidden"
          >
            {/* Top Glowing Red Accent Bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#EF233C] to-transparent" />

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#EF233C]/20 border border-[#EF233C]/30 text-[#EF233C] flex items-center justify-center">
                  <Crown className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white leading-tight">
                    On Priority List
                  </h3>
                  <span className="text-[11px] text-neutral-400">
                    Guaranteed early robotics cohort deployment
                  </span>
                </div>
              </div>

              <button
                onClick={onOpenPremium}
                className="text-[11px] font-bold text-[#EF233C] hover:text-white bg-[#EF233C]/10 hover:bg-[#EF233C]/25 border border-[#EF233C]/30 px-2.5 py-1 rounded-full transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>View Tiers</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {/* Tier Selector Pills */}
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-black/60 border border-white/10 mb-5">
              {(['Priority Pro', 'Enterprise VIP', 'Founder Access ($1B)'] as const).map((item) => (
                <button
                  key={item}
                  onClick={() => {
                    setTier(item);
                    if (item === 'Founder Access ($1B)') {
                      onOpenBuyVip?.();
                    }
                  }}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-all truncate text-center cursor-pointer ${
                    tier === item
                      ? item.includes('$1B')
                        ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow-md font-bold'
                        : 'bg-[#EF233C] text-white shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>

            {/* Form or Submitted State */}
            {!submitted ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5 flex items-center justify-between">
                    <span>Work Email Address</span>
                    <span className="text-[10px] text-[#EF233C]">Fast-track queue</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="developer@catcode.ai"
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-900/90 border border-white/10 text-white placeholder-neutral-500 focus:outline-none focus:border-[#EF233C] text-xs sm:text-sm transition-colors"
                  />
                </div>

                {/* Priority Benefits Included */}
                <div className="space-y-2 py-1">
                  <div className="flex items-center gap-2 text-xs text-neutral-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#EF233C] shrink-0" />
                    <span>Instant queue position (#048) locked</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-neutral-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#EF233C] shrink-0" />
                    <span>Access to Cyber Cat Coder AI engine</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-neutral-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#EF233C] shrink-0" />
                    <span>Dedicated priority inference compute slot</span>
                  </div>
                </div>

                {/* CTA Button */}
                <button
                  type="submit"
                  id="priority-submit-btn"
                  className="w-full group relative flex items-center justify-between pl-5 pr-2 py-2 red-cta-btn rounded-full cursor-pointer transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-xl shadow-red-600/30"
                >
                  <span className="text-white font-semibold text-xs sm:text-sm select-none">
                    Lock In Priority Spot
                  </span>
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-neutral-900 group-hover:translate-x-0.5 transition-transform duration-200 shadow-sm">
                    <ArrowRight className="w-4 h-4 text-black stroke-[2.5]" />
                  </div>
                </button>
              </form>
            ) : (
              <div className="py-6 text-center flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-[#EF233C]/20 border border-[#EF233C]/40 flex items-center justify-center text-[#EF233C] mb-3">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-bold text-white mb-1">
                  Spot #{queueSpot} Reserved!
                </h4>
                <p className="text-xs text-neutral-300 mb-4 max-w-xs">
                  Your priority status for <span className="text-[#EF233C] font-semibold">{tier}</span> is active with <span className="font-mono text-white">{email}</span>.
                </p>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 w-full text-left text-xs space-y-1 text-neutral-400">
                  <div className="flex justify-between text-neutral-200 font-semibold">
                    <span>Cohort:</span>
                    <span className="text-[#EF233C]">Alpha Cat Wave 1</span>
                  </div>
                  <div className="flex justify-between">
                    <span>VIP SLA:</span>
                    <span className="text-white">&lt;12ms Edge Dispatch</span>
                  </div>
                </div>
                <button
                  onClick={onOpenBuyVip}
                  className="mt-4 px-4 py-2 rounded-xl bg-gradient-to-r from-[#EF233C] to-amber-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md hover:scale-105 transition-all cursor-pointer"
                >
                  <Crown className="w-3.5 h-3.5" />
                  <span>Buy VIP Priority Pass</span>
                </button>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Bottom Footer Details */}
      <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-400 mt-6">
        <div className="flex items-center gap-2">
          <span className="text-white font-bold tracking-tight">IntelicatAI</span>
          <span>•</span>
          <span>Cyber Cat Coder Engine v3.4</span>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => onOpenInfo?.('product')}
            className="hover:text-white transition-colors underline underline-offset-4 decoration-neutral-600 hover:decoration-white cursor-pointer"
          >
            Product Specs
          </button>
          <button
            onClick={onOpenPremium}
            className="hover:text-[#EF233C] transition-colors cursor-pointer"
          >
            Premium Tiers
          </button>
          <button
            onClick={() => onOpenInfo?.('blogs')}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Research
          </button>
        </div>
      </div>
    </div>
  );
};
