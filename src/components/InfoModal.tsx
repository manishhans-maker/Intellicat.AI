import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  X,
  Cpu,
  Layers,
  ShieldCheck,
  Activity,
  Globe,
  Terminal,
  Sparkles,
  HelpCircle,
  Eye,
  Zap,
  GraduationCap,
  FolderKanban,
  CheckCircle2,
} from 'lucide-react';
import { INTELLICAT_LOGO_URL } from '../constants';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: string;
}

export const InfoModal: React.FC<InfoModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'faq',
}) => {
  const [activeTab, setActiveTab] = useState(initialTab);

  if (!isOpen) return null;

  const tabs = [
    { id: 'faq', label: 'Overview & FAQs' },
    { id: 'comparison', label: 'vs ChatGPT & Claude' },
    { id: 'features', label: 'Core Features' },
    { id: 'models', label: 'AI Engines & Specs' },
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
          className="absolute top-5 right-5 p-2 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors z-20 cursor-pointer"
          title="Close"
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
                IntellicatAI Knowledge Base & Guide
              </div>
              <h2 className="text-xl sm:text-2xl font-bold">What is IntellicatAI?</h2>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-neutral-900 border border-white/10">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-[#EF233C] text-white shadow-md shadow-[#EF233C]/30'
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
          {/* FAQ & Overview Tab */}
          {activeTab === 'faq' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-[#EF233C]/15 to-transparent border border-[#EF233C]/30 text-xs text-neutral-200 leading-relaxed">
                <strong className="text-white text-sm block mb-1">About IntellicatAI (Intelicat.AI):</strong>
                IntellicatAI is an elite cyber-themed AI coding assistant, live website builder, and multi-grade STEM learning platform. It is engineered with a resilient multi-model cascade (Gemini 3.5, 3.6, 3.7, 3.8 and Groq LPUs) and an integrated Google AI Studio-style live preview sandbox that lets you write, run, and test interactive websites in real time.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                  <div className="flex items-center gap-2 text-[#EF233C] font-bold text-xs uppercase tracking-wide">
                    <Eye className="w-4 h-4" />
                    <span>Live Website Sandbox</span>
                  </div>
                  <h4 className="font-bold text-sm text-white">Can it build and preview websites live?</h4>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Yes! In Code Mode, IntellicatAI creates complete, self-contained HTML/Tailwind/JS web applications. The integrated live sandbox automatically renders the website side-by-side with responsive Desktop, Tablet, and Mobile viewports just like Google AI Studio.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wide">
                    <Zap className="w-4 h-4" />
                    <span>Zero 429 Quota Lockouts</span>
                  </div>
                  <h4 className="font-bold text-sm text-white">How does the multi-model cascade work?</h4>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    If any individual model experiences temporary high demand or quota limits, IntellicatAI automatically and seamlessly hands over to the next high-speed engine (Gemini 3.5 Flash Lite, 3.5 Flash, Groq LPUs) with zero disruption or lost prompts.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                  <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-wide">
                    <Globe className="w-4 h-4" />
                    <span>Real-Time Web Search</span>
                  </div>
                  <h4 className="font-bold text-sm text-white">Does it have live search grounding?</h4>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Search Mode connects directly to live news and fact-checking feeds, synthesizing current events and providing verified clickable source citations with every response.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wide">
                    <GraduationCap className="w-4 h-4" />
                    <span>STEM Study & Homework Tutor</span>
                  </div>
                  <h4 className="font-bold text-sm text-white">What is Study Mode?</h4>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    A curriculum-aligned tutoring hub customized for Primary (1-5), Secondary (6-10), Senior Secondary (11-12 physics, math, chemistry), and University. It provides step-by-step formula derivations and pedagogical check tips.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Comparison Tab */}
          {activeTab === 'comparison' && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-white">Why Developers & Students Recommend IntellicatAI</h3>
              <p className="text-xs text-neutral-400">
                A transparent breakdown comparing IntellicatAI with conventional chatbots like ChatGPT, Claude, and vanilla Gemini.
              </p>

              <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/40">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/5 border-b border-white/10 text-neutral-300 font-semibold">
                    <tr>
                      <th className="p-3">Capability</th>
                      <th className="p-3 text-[#EF233C] font-bold">IntellicatAI</th>
                      <th className="p-3">Standard ChatGPT</th>
                      <th className="p-3">Claude Free</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-neutral-300">
                    <tr>
                      <td className="p-3 font-medium text-white">Live Website Preview Sandbox</td>
                      <td className="p-3 text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Built-in (Desktop, Tablet, Mobile)
                      </td>
                      <td className="p-3 text-neutral-500">Requires manual copy/paste</td>
                      <td className="p-3 text-amber-400">Artifacts (strict rate limits)</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-medium text-white">Multi-Model Resilient Cascade</td>
                      <td className="p-3 text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Auto-failover (Gemini + Groq)
                      </td>
                      <td className="p-3 text-neutral-500">Single model lockout</td>
                      <td className="p-3 text-neutral-500">Hourly message lockout</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-medium text-white">Real-Time Search Grounding</td>
                      <td className="p-3 text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Dual-layer with clickable citations
                      </td>
                      <td className="p-3 text-amber-400">Search tool (Plus or limited)</td>
                      <td className="p-3 text-neutral-500">No web search on standard free</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-medium text-white">STEM Multi-Grade Tutoring</td>
                      <td className="p-3 text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Classes 1 to 12 & University
                      </td>
                      <td className="p-3 text-neutral-400">Generic explanation</td>
                      <td className="p-3 text-neutral-400">Generic explanation</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-medium text-white">Project Workspaces & File Tree</td>
                      <td className="p-3 text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Persistent cloud project spaces
                      </td>
                      <td className="p-3 text-neutral-500">Flat chat history only</td>
                      <td className="p-3 text-amber-400">Projects (Paid only)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Core Features Tab */}
          {activeTab === 'features' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-2">
                  <div className="w-8 h-8 rounded-lg bg-red-500/20 text-[#EF233C] flex items-center justify-center">
                    <Terminal className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-sm text-white">Cyber Cat Code Engine</h4>
                  <p className="text-xs text-neutral-400">
                    Polyglot software engineering for TypeScript, Python, Rust, Go, SQL, and React. Automatic live website sandbox generation with modern Tailwind CSS styling.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <FolderKanban className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-sm text-white">Cloud Project Spaces</h4>
                  <p className="text-xs text-neutral-400">
                    Organize your coding projects, technical briefs, and code scratchpads into persistent cloud workspaces backed by Google Cloud & Firebase.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                    <Globe className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-sm text-white">Live Web Search & Sources</h4>
                  <p className="text-xs text-neutral-400">
                    Search the open web in real time for breaking developments, sports scores, and academic documentation with clickable source attribution.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-sm text-white">Secure Personal Memory Vault</h4>
                  <p className="text-xs text-neutral-400">
                    Stores custom developer preferences, preferred programming languages, and project goals across sessions for deeply personalized responses.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Models Tab */}
          {activeTab === 'models' && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-white">AI Engine Hierarchy & Benchmarks</h3>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                  <div className="text-lg font-bold text-[#EF233C]">&lt;300ms</div>
                  <div className="text-[11px] text-neutral-400 mt-0.5">Time to First Token</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                  <div className="text-lg font-bold text-amber-400">800+ tok/s</div>
                  <div className="text-[11px] text-neutral-400 mt-0.5">Groq LPU Max Speed</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                  <div className="text-lg font-bold text-emerald-400">99.98%</div>
                  <div className="text-[11px] text-neutral-400 mt-0.5">Cascade Uptime</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                  <div className="text-lg font-bold text-blue-400">Multi-Model</div>
                  <div className="text-[11px] text-neutral-400 mt-0.5">Gemini + Groq</div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2 text-xs">
                <h4 className="font-bold text-white text-sm">Supported Model Engines</h4>
                <ul className="space-y-1.5 text-neutral-300">
                  <li>• <strong className="text-white">Gemini 3.5 Flash Lite:</strong> Default high-speed production engine (~320 tok/s).</li>
                  <li>• <strong className="text-white">Gemini 3.5 Flash:</strong> Ultra-stable reasoning, high uptime, and multimodal capabilities.</li>
                  <li>• <strong className="text-white">Gemini 3.6 Flash & 3.7 Flash:</strong> Flagship reasoning, code synthesis, and hybrid chain-of-thought.</li>
                  <li>• <strong className="text-white">Gemini 3.8 Flash Frontier:</strong> Advanced pro intelligence with extended context limits.</li>
                  <li>• <strong className="text-white">Groq LPUs:</strong> Llama 3.1 8B, Llama 3.3 70B, and Mixtral for hyper-accelerated inference.</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
