import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { HeroContent } from './components/HeroContent';
import { StatCards } from './components/StatCards';
import { RightImpactWidget } from './components/RightImpactWidget';
import { PartnerLogos } from './components/PartnerLogos';
import { PriorityListSection } from './components/PriorityListSection';
import { PremiumModal } from './components/PremiumModal';
import { InfoModal } from './components/InfoModal';
import { AiAssistantModal, ChatMode } from './components/AiAssistantModal';
import { VipCheckoutModal, VipData } from './components/VipCheckoutModal';
import { RobotBackground } from './components/RobotBackground';
import { AnimatePresence, motion } from 'motion/react';
import { X, CheckCircle2, Eye, Sparkles, Cat, Crown, MessageSquare } from 'lucide-react';
import { INTELLICAT_LOGO_URL } from './constants';

export default function App() {
  const [currentView, setCurrentView] = useState<'hero' | 'priority'>('hero');
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [chatMode, setChatMode] = useState<ChatMode>('normal');
  const [initialAiPrompt, setInitialAiPrompt] = useState<string | undefined>(undefined);
  const [modalOpen, setModalOpen] = useState(false);
  const [premiumOpen, setPremiumOpen] = useState(false);
  const [vipCheckoutOpen, setVipCheckoutOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [infoTab, setInfoTab] = useState('features');
  
  // VIP & Founder membership state
  const [isVipMember, setIsVipMember] = useState<boolean>(() => {
    try {
      return localStorage.getItem('intelicat_vip_active') === 'true';
    } catch {
      return false;
    }
  });

  const [isFounder, setIsFounder] = useState<boolean>(() => {
    try {
      return localStorage.getItem('intelicat_is_founder') === 'true';
    } catch {
      return false;
    }
  });

  // Robot video visibility mode: 'balanced' | 'vivid' | 'cinema'
  const [robotMode, setRobotMode] = useState<'balanced' | 'vivid' | 'cinema'>('vivid');
  
  const [email, setEmail] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<string>('Priority Pro');
  const [submitted, setSubmitted] = useState(false);

  const handleOpenChat = (mode: ChatMode = 'normal', customPrompt?: string) => {
    setChatMode(mode);
    setInitialAiPrompt(customPrompt);
    setAiChatOpen(true);
  };

  const handleOpenInfo = (tabId?: string) => {
    if (tabId) setInfoTab(tabId);
    setInfoOpen(true);
  };

  const handleOpenPremium = () => {
    setPremiumOpen(true);
  };

  const handleOpenBuyVip = () => {
    setVipCheckoutOpen(true);
  };

  const handleVipPurchased = (vipData: VipData) => {
    setIsVipMember(true);
    if (vipData.isFounder) {
      setIsFounder(true);
    }
    try {
      localStorage.setItem('intelicat_vip_active', 'true');
      localStorage.setItem('intelicat_vip_id', vipData.serialId);
      localStorage.setItem('intelicat_vip_tier', vipData.tierId);
      if (vipData.isFounder) {
        localStorage.setItem('intelicat_is_founder', 'true');
      }
    } catch (e) {
      // Ignore storage errors
    }
  };

  const handleSelectTier = (tierName: string) => {
    setSelectedPlan(tierName);
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubmitted(true);
      setTimeout(() => {
        setModalOpen(false);
        setEmail('');
        setSubmitted(false);
      }, 1800);
    }
  };

  return (
    <main className="min-h-screen w-full bg-black text-white flex items-center justify-center p-2 sm:p-4 lg:p-7 font-sans selection:bg-[#EF233C] selection:text-white relative overflow-hidden">
      {/* Outer Card with Neon Red Border matching reference */}
      <div className="w-full max-w-[1440px] relative rounded-[26px] sm:rounded-[32px] bg-transparent neon-frame overflow-hidden flex flex-col justify-between min-h-[850px] shadow-2xl">
        
        {/* High-Reliability Glowing Robot Background with Video and Poster Fallback */}
        <RobotBackground mode={robotMode} />

        {/* Top Navigation */}
        <Navbar
          currentView={currentView}
          onSelectView={setCurrentView}
          onGetStarted={() => handleOpenChat('normal')}
          onOpenChat={(mode) => handleOpenChat(mode)}
          onOpenInfo={handleOpenInfo}
          onOpenPremium={handleOpenPremium}
          onOpenBuyVip={handleOpenBuyVip}
          isVipMember={isVipMember}
          isFounder={isFounder}
        />

        {/* Dynamic Section View with AnimatePresence */}
        <AnimatePresence mode="wait">
          {currentView === 'hero' ? (
            <motion.div
              key="hero-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="flex-1 px-6 sm:px-10 lg:px-14 py-6 sm:py-10 flex flex-col justify-between relative z-10"
            >
              {/* Main Grid: Left Hero Content & Right Impact Widget */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-start mb-auto">
                {/* Left Content Area */}
                <div className="lg:col-span-8 flex flex-col justify-start">
                  <HeroContent
                    onOpenChat={(mode, prompt) => handleOpenChat(mode, prompt)}
                    onOpenBuyVip={handleOpenBuyVip}
                  />
                </div>

                {/* Right Widget Area */}
                <div className="lg:col-span-4 flex flex-col justify-start pt-4 lg:pt-8">
                  <RightImpactWidget onOpenInfo={handleOpenInfo} />
                </div>
              </div>

              {/* Bottom Row: Stat Cards (Left) & Section Switcher (Center) & Partners (Right) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end mt-10 pt-6">
                {/* Bottom Left: Stat Cards */}
                <div className="lg:col-span-5">
                  <StatCards onOpenInfo={handleOpenInfo} />
                </div>

                {/* Bottom Middle: View & Robot Controls */}
                <div className="lg:col-span-3 flex flex-col items-start lg:items-center gap-2">
                  {/* Priority List Quick Jump Banner */}
                  <button
                    onClick={() => setCurrentView('priority')}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#EF233C]/20 hover:bg-[#EF233C]/35 border border-[#EF233C]/40 text-[#EF233C] text-xs font-bold transition-all shadow-md group cursor-pointer"
                  >
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#EF233C]"></span>
                    </span>
                    <span>View Priority List</span>
                    <Sparkles className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" />
                  </button>

                  {/* Robot Visibility Switcher */}
                  <div className="flex items-center gap-1.5 p-1 rounded-full bg-black/60 border border-white/10 backdrop-blur-md text-[11px] shadow-lg">
                    <span className="text-neutral-400 pl-2 flex items-center gap-1">
                      <Eye className="w-3 h-3 text-[#EF233C]" />
                      <span className="hidden sm:inline">Canvas:</span>
                    </span>
                    <button
                      onClick={() => setRobotMode('vivid')}
                      className={`px-2 py-0.5 rounded-full font-medium transition-all cursor-pointer ${
                        robotMode === 'vivid'
                          ? 'bg-[#EF233C] text-white shadow-sm'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                      title="Optimal clarity showing both artwork and UI"
                    >
                      Vivid
                    </button>
                    <button
                      onClick={() => setRobotMode('cinema')}
                      className={`px-2 py-0.5 rounded-full font-medium transition-all cursor-pointer ${
                        robotMode === 'cinema'
                          ? 'bg-[#EF233C] text-white shadow-sm'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                      title="Maximum brightness for ambient background"
                    >
                      Cinema
                    </button>
                    <button
                      onClick={() => setRobotMode('balanced')}
                      className={`px-2 py-0.5 rounded-full font-medium transition-all cursor-pointer ${
                        robotMode === 'balanced'
                          ? 'bg-[#EF233C] text-white shadow-sm'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                      title="Higher contrast dark background"
                    >
                      Focus
                    </button>
                  </div>
                </div>

                {/* Bottom Right: Partners */}
                <div className="lg:col-span-4 flex justify-start lg:justify-end">
                  <PartnerLogos />
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="priority-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="flex-1 flex flex-col justify-between relative z-10"
            >
              <PriorityListSection
                onOpenPremium={handleOpenPremium}
                onOpenInfo={handleOpenInfo}
                onOpenAiChat={(prompt) => handleOpenChat('cat-code', prompt)}
                onOpenChat={(mode, prompt) => handleOpenChat(mode, prompt)}
                onOpenBuyVip={handleOpenBuyVip}
                isVipMember={isVipMember}
                isFounder={isFounder}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Live 2-Mode AI Assistant Modal */}
      <AiAssistantModal
        isOpen={aiChatOpen}
        onClose={() => setAiChatOpen(false)}
        initialPrompt={initialAiPrompt}
        defaultMode={chatMode}
        onOpenBuyVip={handleOpenBuyVip}
        isVipMember={isVipMember}
        isFounder={isFounder}
      />

      {/* VIP Checkout / Purchase Modal */}
      <VipCheckoutModal
        isOpen={vipCheckoutOpen}
        onClose={() => setVipCheckoutOpen(false)}
        onVipPurchased={handleVipPurchased}
        onOpenAiAssistant={(prompt) => {
          setVipCheckoutOpen(false);
          handleOpenChat('cat-code', prompt);
        }}
      />

      {/* Floating Action Trigger Bar: 2 Chat Modes & Buy VIP */}
      <div className="fixed bottom-5 right-5 sm:bottom-8 sm:right-8 z-40 flex items-center gap-2">
        {/* Quick VIP Buy Launcher */}
        <button
          onClick={handleOpenBuyVip}
          title="Buy Alpha VIP Pass"
          className="hidden md:flex items-center gap-1.5 px-3.5 py-2.5 rounded-full bg-black/85 hover:bg-black border border-amber-500/40 text-amber-300 shadow-xl backdrop-blur-xl hover:scale-105 active:scale-95 transition-all cursor-pointer text-xs font-bold"
        >
          <Crown className="w-4 h-4 text-amber-400" />
          <span>{isVipMember ? 'VIP Active' : 'Buy VIP'}</span>
        </button>

        {/* Floating Trigger 1: Normal Talk */}
        <button
          onClick={() => handleOpenChat('normal')}
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-black/90 hover:bg-neutral-900 border border-white/25 text-white shadow-xl backdrop-blur-xl hover:scale-105 active:scale-95 transition-all group cursor-pointer"
        >
          <MessageSquare className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
          <span className="text-xs sm:text-sm font-semibold">Talk</span>
        </button>

        {/* Floating Trigger 2: Cat Code */}
        <button
          onClick={() => handleOpenChat('cat-code')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-black/90 hover:bg-black border-2 border-[#EF233C] text-white shadow-[0_0_25px_rgba(239,35,60,0.4)] backdrop-blur-xl hover:scale-105 active:scale-95 transition-all group cursor-pointer"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#EF233C]"></span>
          </span>
          <span className="text-xs sm:text-sm font-bold tracking-tight">
            Cat <span className="text-[#FF2A3A]">Code 🐾</span>
          </span>
        </button>
      </div>

      {/* Premium Suite Modal */}
      <PremiumModal
        isOpen={premiumOpen}
        onClose={() => setPremiumOpen(false)}
        onSelectTier={handleSelectTier}
        onOpenBuyVip={handleOpenBuyVip}
      />

      {/* Deep Platform Architecture & Info Modal */}
      <InfoModal
        isOpen={infoOpen}
        onClose={() => setInfoOpen(false)}
        initialTab={infoTab}
      />

      {/* Interactive Get Started / Access Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md p-6 sm:p-8 rounded-3xl bg-[#121216] border border-white/15 text-white shadow-2xl"
            >
              <button
                onClick={() => setModalOpen(false)}
                className="absolute top-5 right-5 p-1 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl overflow-hidden border border-amber-500/50 bg-black shadow-[0_0_12px_rgba(245,158,11,0.4)] shrink-0">
                  <img
                    src={INTELLICAT_LOGO_URL}
                    alt="IntellicatAI"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#EF233C] block">Access Portal</span>
                  <span className="text-sm font-extrabold text-white">IntellicatAI Platform</span>
                </div>
              </div>

              <h3 className="text-2xl font-bold mb-2">Selected: {selectedPlan}</h3>
              <p className="text-xs text-neutral-400 mb-6">
                Enter your work email to get instant provisioned credentials for both Normal Talk and Cat Code modes.
              </p>

              {submitted ? (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span>Success! Access link and credentials sent to {email}.</span>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                      Work Email
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="engineer@company.com"
                      className="w-full px-4 py-3 rounded-xl bg-black/60 border border-white/15 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#EF233C]"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 px-6 rounded-xl font-bold text-sm text-white red-cta-btn shadow-lg shadow-red-600/30 hover:scale-[1.02] active:scale-98 transition-all cursor-pointer"
                  >
                    Confirm Access & Launch
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
