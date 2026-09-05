import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Check,
  Sparkles,
  Shield,
  Zap,
  Cpu,
  Server,
  ChevronRight,
  Calculator,
  Crown,
  Activity,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { INTELLICAT_LOGO_URL } from '../constants';

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTier?: (tierName: string) => void;
  onOpenBuyVip?: () => void;
}

export const PremiumModal: React.FC<PremiumModalProps> = ({
  isOpen,
  onClose,
  onSelectTier,
  onOpenBuyVip,
}) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [selectedTier, setSelectedTier] = useState<string>('pro');
  const [showRoiCalculator, setShowRoiCalculator] = useState(false);
  const [teamSize, setTeamSize] = useState(15);

  if (!isOpen) return null;

  // Dynamic ROI calculation
  const estimatedHoursSaved = teamSize * 14;
  const estimatedCostSavings = (teamSize * 14 * 65).toLocaleString();

  const tiers = [
    {
      id: 'starter',
      name: 'Essential',
      badge: 'Core Platform',
      price: billingCycle === 'annual' ? '$49' : '$59',
      period: '/mo billed annually',
      description: 'Foundational human-first AI infrastructure for agile teams.',
      features: [
        'Single-tenant neural runtime environment',
        'Standard Human-First ergonomics suite',
        'Up to 25,000 adaptive sessions/month',
        'Sub-50ms global edge inference',
        'Standard community & ticket support',
      ],
      highlight: false,
    },
    {
      id: 'pro',
      name: 'Premium Suite',
      badge: 'Most Popular',
      price: billingCycle === 'annual' ? '$149' : '$179',
      period: '/mo billed annually',
      description: 'Full autonomous capability with real-time cognitive optimization.',
      features: [
        'Everything in Essential, plus:',
        'Real-time cognitive load detection & auto-adaptation',
        'Unlimited sensory & multi-modal interactions',
        'Ultra-low latency (<12ms) dedicated edge dispatch',
        'Custom domain & full branding white-labeling',
        'Dedicated success engineer & 99.99% uptime SLA',
      ],
      highlight: true,
    },
    {
      id: 'enterprise',
      name: 'Enterprise Autonomous',
      badge: 'Custom Architecture',
      price: 'Custom',
      period: 'tailored deployment',
      description: 'Isolated sovereign infrastructure, custom fine-tuning & on-premise VPC.',
      features: [
        'Everything in Premium, plus:',
        'Proprietary model weights distillation & on-prem VPC',
        'Human-in-the-Loop audit trails & red-teaming guardrails',
        'SOC2 Type II, HIPAA, ISO 27001 compliance guarantee',
        'Dedicated 24/7 mission-control war room support',
        'Bespoke UX neural telemetry research lab integration',
      ],
      highlight: false,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-xl overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 20 }}
        className="relative w-full max-w-5xl my-auto rounded-3xl bg-[#0e0e12] border border-white/15 shadow-[0_0_60px_rgba(239,35,60,0.3)] p-5 sm:p-9 text-white max-h-[92vh] overflow-y-auto"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors z-20 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Section */}
        <div className="text-center max-w-2xl mx-auto mb-7">
          <div className="flex items-center justify-center mb-3">
            <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.5)] bg-black">
              <img
                src={INTELLICAT_LOGO_URL}
                alt="IntellicatAI"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EF233C]/15 border border-[#EF233C]/30 text-[#EF233C] text-xs font-semibold uppercase tracking-wider mb-2.5">
            <Sparkles className="w-3.5 h-3.5" />
            IntellicatAI Premium Editions
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-2">
            Supercharge Digital Experiences with <span className="text-[#EF233C]">Premium AI</span>
          </h2>
          <p className="text-neutral-400 text-xs sm:text-sm">
            Engineered exclusively for enterprises and creators who demand human-first precision, ultra-low latency, and uncompromising reliability.
          </p>

          {/* Quick Action Shortcuts Banner */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
            <button
              onClick={() => {
                onClose();
                onOpenBuyVip?.();
              }}
              className="px-4 py-1.5 rounded-full bg-gradient-to-r from-[#EF233C]/25 to-amber-500/25 hover:from-[#EF233C]/40 hover:to-amber-500/40 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 text-amber-300 transition-all cursor-pointer shadow-sm hover:scale-105"
            >
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>Buy VIP Pass (#048)</span>
              <ArrowRight className="w-3 h-3 text-amber-300" />
            </button>

            <button
              onClick={() => {
                onClose();
                onOpenBuyVip?.();
              }}
              className="px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500/30 via-yellow-500/20 to-amber-500/30 hover:from-amber-500/50 hover:to-yellow-500/40 border border-amber-400/60 text-xs font-black flex items-center gap-1.5 text-amber-300 transition-all cursor-pointer shadow-sm hover:scale-105"
            >
              <Crown className="w-3.5 h-3.5 text-yellow-400" />
              <span>👑 $1 Billion Founder Access (Joke)</span>
              <Sparkles className="w-3 h-3 text-yellow-300" />
            </button>
          </div>

          {/* Billing Cycle Switch & ROI Calculator Toggle */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
            <div className="inline-flex items-center p-1 rounded-xl bg-neutral-900/90 border border-white/10">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  billingCycle === 'monthly'
                    ? 'bg-white text-black shadow'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Monthly Billing
              </button>
              <button
                onClick={() => setBillingCycle('annual')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  billingCycle === 'annual'
                    ? 'bg-[#EF233C] text-white shadow-lg shadow-red-600/30'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <span>Annual Billing</span>
                <span className="bg-black/30 text-[10px] px-1.5 py-0.5 rounded-full font-bold">SAVE 20%</span>
              </button>
            </div>

            <button
              onClick={() => setShowRoiCalculator(!showRoiCalculator)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                showRoiCalculator
                  ? 'bg-white/20 border-white text-white'
                  : 'bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Calculator className="w-3.5 h-3.5 text-[#EF233C]" />
              <span>{showRoiCalculator ? 'Hide ROI Estimator' : 'Calculate ROI'}</span>
            </button>
          </div>
        </div>

        {/* Interactive ROI Calculator Card (Expandable) */}
        <AnimatePresence>
          {showRoiCalculator && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-6"
            >
              <div className="rounded-2xl bg-gradient-to-r from-[#1e1014] to-[#12121a] border border-[#EF233C]/40 p-5 shadow-lg">
                <div className="flex items-center justify-between gap-4 mb-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#EF233C]" />
                    <h3 className="text-xs sm:text-sm font-bold text-white">
                      Enterprise Value & Velocity Estimator
                    </h3>
                  </div>
                  <span className="text-[11px] text-neutral-400 font-mono">
                    Based on +40% cognitive throughput metric
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                  <div>
                    <label className="block text-[11px] text-neutral-300 mb-1">
                      Engineers / Creators on Team: <strong className="text-white font-mono">{teamSize}</strong>
                    </label>
                    <input
                      type="range"
                      min={2}
                      max={100}
                      value={teamSize}
                      onChange={(e) => setTeamSize(Number(e.target.value))}
                      className="w-full accent-[#EF233C] bg-neutral-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-black/40 border border-white/10 text-center">
                    <span className="block text-[10px] text-neutral-400 uppercase">Dev Hours Saved / Mo</span>
                    <span className="text-lg font-bold text-[#EF233C]">{estimatedHoursSaved} hrs</span>
                  </div>

                  <div className="p-3 rounded-xl bg-black/40 border border-white/10 text-center">
                    <span className="block text-[10px] text-neutral-400 uppercase">Estimated Monthly Savings</span>
                    <span className="text-lg font-bold text-emerald-400">${estimatedCostSavings}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {tiers.map((tier) => {
            const isSelected = selectedTier === tier.id;
            return (
              <div
                key={tier.id}
                onClick={() => setSelectedTier(tier.id)}
                className={`relative rounded-2xl p-6 flex flex-col justify-between transition-all duration-300 cursor-pointer ${
                  tier.highlight
                    ? 'bg-gradient-to-b from-[#1c1214] to-[#121216] border-2 border-[#EF233C] shadow-xl shadow-red-600/10'
                    : 'bg-[#141418] border border-white/10 hover:border-white/20'
                } ${isSelected ? 'ring-2 ring-red-500 ring-offset-2 ring-offset-black' : ''}`}
              >
                {tier.highlight && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#EF233C] text-white text-[11px] font-bold tracking-wide uppercase shadow-md">
                    {tier.badge}
                  </div>
                )}

                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold text-white">{tier.name}</h3>
                    {!tier.highlight && (
                      <span className="text-[11px] text-neutral-400 px-2 py-0.5 rounded bg-white/5 font-medium">
                        {tier.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-400 min-h-[32px] mb-4">{tier.description}</p>

                  <div className="flex items-baseline gap-1 mb-6 pb-4 border-b border-white/10">
                    <span className="text-3xl sm:text-4xl font-extrabold text-white">{tier.price}</span>
                    <span className="text-xs text-neutral-400">{tier.period}</span>
                  </div>

                  <ul className="space-y-3 mb-6">
                    {tier.features.map((feat, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-xs text-neutral-300">
                        <div className="p-0.5 rounded-full bg-[#EF233C]/20 text-[#EF233C] mt-0.5 shrink-0">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onSelectTier) onSelectTier(tier.name);
                    onClose();
                  }}
                  className={`w-full py-2.5 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    tier.highlight
                      ? 'red-cta-btn text-white shadow-lg'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  <span>Select {tier.name}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Enterprise Highlights Footer */}
        <div className="pt-6 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div className="flex flex-col items-center gap-1.5 p-2">
            <Zap className="w-5 h-5 text-[#EF233C]" />
            <span className="text-xs font-bold text-white">&lt;12ms Edge Dispatch</span>
            <span className="text-[11px] text-neutral-400">Zero perceived lag</span>
          </div>
          <div className="flex flex-col items-center gap-1.5 p-2">
            <Shield className="w-5 h-5 text-[#EF233C]" />
            <span className="text-xs font-bold text-white">SOC2 & HIPAA Ready</span>
            <span className="text-[11px] text-neutral-400">Bank-grade isolation</span>
          </div>
          <div className="flex flex-col items-center gap-1.5 p-2">
            <Cpu className="w-5 h-5 text-[#EF233C]" />
            <span className="text-xs font-bold text-white">Cognitive Telemetry</span>
            <span className="text-[11px] text-neutral-400">Real-time UX tuning</span>
          </div>
          <div className="flex flex-col items-center gap-1.5 p-2">
            <Server className="w-5 h-5 text-[#EF233C]" />
            <span className="text-xs font-bold text-white">99.99% Availability</span>
            <span className="text-[11px] text-neutral-400">Mission-critical uptime</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
