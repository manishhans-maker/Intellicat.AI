import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Cpu, Layers, ShieldCheck, Activity, Users, Globe, BookOpen, Terminal, Sparkles } from 'lucide-react';
import { INTELLICAT_LOGO_URL } from '../constants';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: string;
}

export const InfoModal: React.FC<InfoModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'features',
}) => {
  const [activeTab, setActiveTab] = useState(initialTab);

  if (!isOpen) return null;

  const tabs = [
    { id: 'features', label: 'Features' },
    { id: 'how-it-works', label: 'How It Works' },
    { id: 'about', label: 'About' },
    { id: 'product', label: 'Product Specs' },
    { id: 'blogs', label: 'Research & Blogs' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-xl overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-4xl my-auto rounded-3xl bg-[#0e0e12] border border-white/15 shadow-2xl p-6 sm:p-8 text-white max-h-[90vh] overflow-y-auto"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors z-20"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Title & Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl overflow-hidden border border-amber-500/50 bg-black shadow-[0_0_15px_rgba(245,158,11,0.4)] shrink-0">
              <img
                src={INTELLICAT_LOGO_URL}
                alt="IntellicatAI"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[#EF233C] uppercase tracking-wider mb-0.5">
                <Sparkles className="w-3.5 h-3.5" />
                IntellicatAI Knowledge Base
              </div>
              <h2 className="text-xl sm:text-2xl font-bold">Platform Architecture & Info</h2>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-neutral-900 border border-white/10">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-[#EF233C] text-white shadow'
                    : 'text-neutral-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="py-2">
          {/* Features Tab */}
          {activeTab === 'features' && (
            <div className="space-y-6">
              <p className="text-sm text-neutral-300 leading-relaxed">
                IntelicatAI shifts the artificial intelligence paradigm from rigid mechanical automation to responsive, human-aligned neural interfaces.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-2">
                  <div className="w-8 h-8 rounded-lg bg-red-500/20 text-[#EF233C] flex items-center justify-center">
                    <Cpu className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-sm text-white">Cognitive Resonance Engine</h4>
                  <p className="text-xs text-neutral-400">
                    Dynamically modulates UI density, typography tracking, and data presentation based on real-time task complexity and user cognitive load.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-2">
                  <div className="w-8 h-8 rounded-lg bg-red-500/20 text-[#EF233C] flex items-center justify-center">
                    <Activity className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-sm text-white">Adaptive Telemetry (+40% Boost)</h4>
                  <p className="text-xs text-neutral-400">
                    Continuously optimizes interaction paths, shaving down friction by over 40% compared to traditional legacy dashboards.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-2">
                  <div className="w-8 h-8 rounded-lg bg-red-500/20 text-[#EF233C] flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-sm text-white">Zero-Knowledge Guardrails</h4>
                  <p className="text-xs text-neutral-400">
                    Enterprise privacy layers with on-device vectorization and full cryptographic isolation for sensitive organizational workloads.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-2">
                  <div className="w-8 h-8 rounded-lg bg-red-500/20 text-[#EF233C] flex items-center justify-center">
                    <Globe className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-sm text-white">Distributed Edge Matrix</h4>
                  <p className="text-xs text-neutral-400">
                    Over 280 edge locations worldwide providing sub-12ms latency to users regardless of geographic location.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* How It Works Tab */}
          {activeTab === 'how-it-works' && (
            <div className="space-y-6">
              <h3 className="text-base font-bold text-white">The 3-Step Human-Centric Flow</h3>
              
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
                  <span className="w-7 h-7 rounded-full bg-[#EF233C] text-white font-bold text-xs flex items-center justify-center shrink-0">1</span>
                  <div>
                    <h4 className="font-bold text-sm text-white mb-1">Contextual Sensory Ingestion</h4>
                    <p className="text-xs text-neutral-400">
                      The system reads input intents, behavioral cues, and environment constraints rather than expecting rigid machine syntax.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
                  <span className="w-7 h-7 rounded-full bg-[#EF233C] text-white font-bold text-xs flex items-center justify-center shrink-0">2</span>
                  <div>
                    <h4 className="font-bold text-sm text-white mb-1">Real-Time Ergonomic Adaptation</h4>
                    <p className="text-xs text-neutral-400">
                      Neural synthesis creates the optimal visualization, action flows, and recommendations shaped directly for human intuition.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
                  <span className="w-7 h-7 rounded-full bg-[#EF233C] text-white font-bold text-xs flex items-center justify-center shrink-0">3</span>
                  <div>
                    <h4 className="font-bold text-sm text-white mb-1">Measurable Real-World Impact</h4>
                    <p className="text-xs text-neutral-400">
                      Teams report +40% accelerated throughput, 98% client satisfaction, and eliminate workflow fatigue.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* About Tab */}
          {activeTab === 'about' && (
            <div className="space-y-4 text-sm text-neutral-300">
              <h3 className="text-base font-bold text-white">Our Mission: Technology for Humans</h3>
              <p className="text-xs leading-relaxed text-neutral-400">
                Founded on the belief that artificial intelligence should mold to natural human cognitive patterns rather than forcing people to learn machine protocols. IntelicatAI designs interfaces and computational pipelines where clarity, beauty, and ergonomics take front seat.
              </p>
              <div className="p-4 rounded-2xl bg-[#EF233C]/10 border border-[#EF233C]/20 text-xs text-neutral-200">
                <span className="font-bold text-white block mb-1">#HumanFirstImpact</span>
                "When technology feels invisible and empowering, humans achieve their highest creative and strategic potential."
              </div>
            </div>
          )}

          {/* Product Specs Tab */}
          {activeTab === 'product' && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-white">Technical Architecture & Benchmarks</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-xl font-bold text-[#EF233C]">&lt;12ms</div>
                  <div className="text-[11px] text-neutral-400">Global Edge Latency</div>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-xl font-bold text-white">99.99%</div>
                  <div className="text-[11px] text-neutral-400">Service SLA</div>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-xl font-bold text-white">256-bit</div>
                  <div className="text-[11px] text-neutral-400">End-to-End Encryption</div>
                </div>
              </div>
            </div>
          )}

          {/* Blogs Tab */}
          {activeTab === 'blogs' && (
            <div className="space-y-3">
              <h3 className="text-base font-bold text-white mb-2">Latest Insights & Research</h3>
              
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors cursor-pointer">
                <span className="text-[11px] text-[#EF233C] font-semibold">RESEARCH PAPER • JUNE 2026</span>
                <h4 className="text-sm font-bold text-white">Why Cognitive Ergonomics Outperforms Pure Model Scaling</h4>
                <p className="text-xs text-neutral-400 mt-1">Analyzing benchmark friction in 10,000+ operator sessions across fintech and health tech.</p>
              </div>

              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors cursor-pointer">
                <span className="text-[11px] text-[#EF233C] font-semibold">CASE STUDY • MAY 2026</span>
                <h4 className="text-sm font-bold text-white">How Global Partners Achieved +40% Throughput Without Employee Fatigue</h4>
                <p className="text-xs text-neutral-400 mt-1">Enterprise insights from deployment across BookStore, zantic, and Mercury ecosystems.</p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
