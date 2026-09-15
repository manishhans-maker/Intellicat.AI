import React, { useState } from 'react';
import { ChevronDown, Sparkles, Crown, ArrowRight, Cat, Code, MessageSquare, User, LogOut, Zap, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ChatMode } from './AiAssistantModal';
import { INTELLICAT_LOGO_URL } from '../constants';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  currentView?: 'hero' | 'priority';
  onSelectView?: (view: 'hero' | 'priority') => void;
  onGetStarted?: () => void;
  onOpenChat?: (mode: ChatMode) => void;
  onOpenInfo?: (tabId?: string) => void;
  onOpenPremium?: () => void;
  onOpenBuyVip?: () => void;
  isVipMember?: boolean;
  isFounder?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView = 'hero',
  onSelectView,
  onGetStarted,
  onOpenChat,
  onOpenInfo,
  onOpenPremium,
  onOpenBuyVip,
  isVipMember = false,
  isFounder = false,
}) => {
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const {
    user,
    userProfile,
    openAuthModal,
    logout,
    remainingRequests,
    requestCount,
    maxRequests,
    isLimitReached,
    isUnlimited,
  } = useAuth();

  const isActuallyUnlimited = true;

  const navItems = [
    { name: 'Features', hasDropdown: true, tabId: 'features' },
    { name: 'Architecture', hasDropdown: false, tabId: 'architecture' },
    { name: 'Pricing', hasDropdown: false, tabId: 'pricing' },
    { name: 'Docs', hasDropdown: false, tabId: 'docs' },
  ];

  return (
    <header className="w-full flex items-center justify-between px-6 sm:px-10 lg:px-14 py-4 sm:py-6 relative z-30">
      {/* Brand / Logo */}
      <div
        onClick={() => onSelectView?.('hero')}
        className="flex items-center gap-3 cursor-pointer select-none group"
      >
        <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-amber-500/40 bg-black/60 shadow-[0_0_15px_rgba(239,35,60,0.35)] group-hover:scale-105 group-hover:shadow-[0_0_20px_rgba(245,158,11,0.5)] transition-all duration-300">
          <img
            src={INTELLICAT_LOGO_URL}
            alt="IntellicatAI Logo"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="font-bold text-lg sm:text-xl tracking-tight text-white flex items-center">
          <span>Intellicat</span>
          <span className="text-[#FF2A3A]">AI</span>
        </div>
        {isFounder ? (
          <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-black text-[10px] font-black uppercase tracking-wider shadow-[0_0_15px_rgba(245,158,11,0.8)] animate-pulse">
            <Crown className="w-3 h-3 text-black" /> $1B FOUNDER
          </span>
        ) : isVipMember ? (
          <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#EF233C] to-amber-500 text-white text-[10px] font-black uppercase tracking-wider shadow-[0_0_12px_rgba(239,35,60,0.6)]">
            <Crown className="w-3 h-3" /> VIP ACTIVE
          </span>
        ) : null}
      </div>

      {/* Navigation Pills */}
      <nav
        aria-label="Main Navigation"
        className="hidden md:flex items-center gap-1 p-1 rounded-xl nav-pill-bg border border-white/10 shadow-lg shadow-black/40 backdrop-blur-md"
      >
        {/* Main Hero & Priority List Switcher */}
        <button
          onClick={() => onSelectView?.('hero')}
          className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer ${
            currentView === 'hero'
              ? 'text-white bg-white/15 shadow-sm font-semibold'
              : 'text-neutral-300 hover:text-white hover:bg-white/5'
          }`}
        >
          Overview
        </button>

        <button
          onClick={() => onSelectView?.('priority')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer ${
            currentView === 'priority'
              ? 'text-white bg-[#EF233C] shadow-md font-semibold'
              : 'text-[#EF233C] hover:bg-[#EF233C]/10'
          }`}
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
          </span>
          <span>Priority List</span>
        </button>

        <div className="w-[1px] h-4 bg-white/10 mx-1" />

        {/* 2 Mode Direct Nav Links: Normal Talk & Cat Code */}
        <button
          onClick={() => (onOpenChat ? onOpenChat('normal') : onGetStarted?.())}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all duration-200 text-neutral-300 hover:text-white hover:bg-white/5 cursor-pointer"
        >
          <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
          <span>Normal Talk</span>
        </button>

        <button
          onClick={() => (onOpenChat ? onOpenChat('cat-code') : onGetStarted?.())}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all duration-200 text-neutral-300 hover:text-white hover:bg-white/5 cursor-pointer"
        >
          <Cat className="w-3.5 h-3.5 text-[#EF233C]" />
          <span>Cat Code 🐾</span>
        </button>

        {navItems.map((item) => (
          <div key={item.name} className="relative">
            <button
              id={`nav-item-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
              onClick={() => {
                if (item.hasDropdown) {
                  setFeaturesOpen(!featuresOpen);
                } else {
                  setFeaturesOpen(false);
                  onOpenInfo?.(item.tabId);
                }
              }}
              onMouseEnter={() => {
                if (item.hasDropdown) setFeaturesOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all duration-200 text-neutral-300 hover:text-white hover:bg-white/5 cursor-pointer"
            >
              <span>{item.name}</span>
              {item.hasDropdown && (
                <ChevronDown
                  className={`w-3.5 h-3.5 text-neutral-400 transition-transform duration-200 ${
                    featuresOpen ? 'rotate-180 text-white' : ''
                  }`}
                />
              )}
            </button>

            {/* Dropdown for Features */}
            {item.hasDropdown && (
              <AnimatePresence>
                {featuresOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    onMouseLeave={() => setFeaturesOpen(false)}
                    className="absolute top-full left-0 mt-2 w-72 p-2 rounded-xl bg-[#141418]/95 border border-white/10 shadow-2xl backdrop-blur-xl z-50"
                  >
                    <div className="space-y-1">
                      <button
                        onClick={() => {
                          setFeaturesOpen(false);
                          if (onOpenChat) onOpenChat('normal');
                          else onGetStarted?.();
                        }}
                        className="w-full text-left flex items-start gap-3 p-2.5 rounded-lg hover:bg-white/5 transition-colors group cursor-pointer"
                      >
                        <MessageSquare className="w-4 h-4 text-sky-400 mt-0.5" />
                        <div>
                          <div className="text-xs font-semibold text-white group-hover:text-sky-300">
                            Normal Talk Mode
                          </div>
                          <div className="text-[11px] text-neutral-400">
                            General dialogue, writing & open chat
                          </div>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          setFeaturesOpen(false);
                          if (onOpenChat) onOpenChat('cat-code');
                          else onGetStarted?.();
                        }}
                        className="w-full text-left flex items-start gap-3 p-2.5 rounded-lg hover:bg-white/5 transition-colors group cursor-pointer"
                      >
                        <Cat className="w-4 h-4 text-[#EF233C] mt-0.5" />
                        <div>
                          <div className="text-xs font-semibold text-white group-hover:text-red-400">
                            Cyber Cat Coder Mode
                          </div>
                          <div className="text-[11px] text-neutral-400">
                            Fast multi-language code generation
                          </div>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          setFeaturesOpen(false);
                          onOpenBuyVip?.();
                        }}
                        className="w-full text-left flex items-start gap-3 p-2.5 rounded-lg hover:bg-white/5 transition-colors group cursor-pointer"
                      >
                        <Crown className="w-4 h-4 text-amber-400 mt-0.5" />
                        <div>
                          <div className="text-xs font-semibold text-white group-hover:text-amber-300">
                            Buy VIP Priority Pass (#048)
                          </div>
                          <div className="text-[11px] text-neutral-400">
                            Instant priority compute & perks
                          </div>
                        </div>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>
        ))}
      </nav>

      {/* Right Controls: Auth, Usage Quota, VIP Pass & Chat */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Auth State & Quota / Sign In */}
        {user ? (
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 pl-2.5 pr-2 py-1.5 rounded-full bg-neutral-900/90 hover:bg-neutral-800 border border-white/15 text-xs transition-all cursor-pointer shadow-sm hover:border-white/30"
              title="Click to view profile & request usage"
            >
              {/* Request Quota Pill */}
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <Crown className="w-2.5 h-2.5 text-amber-400" />
                <span>Unlimited Access</span>
              </span>

              {/* User Avatar / Initials */}
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#EF233C] to-amber-500 flex items-center justify-center text-white text-[11px] font-bold overflow-hidden">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  (user.displayName?.[0] || user.email?.[0] || 'U').toUpperCase()
                )}
              </div>
              <ChevronDown className="w-3 h-3 text-neutral-400" />
            </button>

            {/* User Dropdown Menu */}
            <AnimatePresence>
              {userMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  onMouseLeave={() => setUserMenuOpen(false)}
                  className="absolute right-0 top-full mt-2 w-72 p-3.5 rounded-2xl bg-[#131317]/95 border border-white/15 shadow-2xl backdrop-blur-xl z-50 text-white"
                >
                  <div className="flex items-center gap-3 pb-3 border-b border-white/10">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#EF233C] to-amber-500 flex items-center justify-center text-white text-sm font-bold overflow-hidden shrink-0">
                      {user.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt={user.displayName || 'User'}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        (user.displayName?.[0] || user.email?.[0] || 'U').toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold truncate text-white">
                        {user.displayName || 'Intelicat User'}
                      </div>
                      <div className="text-[11px] text-neutral-400 truncate">
                        {user.email}
                      </div>
                    </div>
                  </div>

                  {/* Usage Quota Card */}
                  <div className="mt-3 p-2.5 rounded-xl bg-neutral-900/90 border border-white/10">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-neutral-400">Plan Tier:</span>
                      <span className="font-bold text-amber-400 uppercase text-[10px] tracking-wider">
                        {isUnlimited ? (isFounder ? '👑 Founder' : 'VIP Pro') : 'Free Tier'}
                      </span>
                    </div>

                    {!isUnlimited ? (
                      <div>
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="text-neutral-300">Requests used:</span>
                          <span className="font-mono font-bold text-white">
                            {requestCount} / {maxRequests}
                          </span>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isLimitReached
                                ? 'bg-red-500'
                                : remainingRequests <= 3
                                ? 'bg-amber-500'
                                : 'bg-[#EF233C]'
                            }`}
                            style={{ width: `${Math.min(100, (requestCount / maxRequests) * 100)}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-neutral-400 mt-1.5 flex items-center justify-between">
                          <span>{remainingRequests} free queries remaining</span>
                          {isLimitReached && <span className="text-red-400 font-bold">Limit Reached</span>}
                        </div>
                      </div>
                    ) : (
                      <div className="text-[11px] text-emerald-400 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Unlimited High-Speed Access Active</span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons in Dropdown */}
                  <div className="mt-3 space-y-1">
                    {!isUnlimited && (
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          onOpenBuyVip?.();
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <Crown className="w-3.5 h-3.5 text-amber-400" />
                          <span>Upgrade to Unlimited</span>
                        </span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-neutral-400 hover:text-red-400 hover:bg-red-500/10 transition-colors text-xs cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <button
            onClick={() => openAuthModal('signin')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full border border-white/20 bg-white/5 hover:bg-white/15 text-white transition-all duration-200 cursor-pointer shadow-sm hover:scale-105"
          >
            <User className="w-3.5 h-3.5 text-sky-400" />
            <span>Sign In</span>
            <span className="hidden sm:inline-block px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 text-[10px] font-mono font-bold ml-0.5">
              15 Free
            </span>
          </button>
        )}

        {/* Buy VIP Pass Trigger */}
        <button
          onClick={onOpenBuyVip}
          title={isFounder ? "Supreme $1B Founder Passholder" : "Buy Alpha Cohort VIP Pass"}
          className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full transition-all duration-200 cursor-pointer shadow-sm hover:scale-105 active:scale-95 ${
            isFounder
              ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-black border border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.5)]'
              : 'text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 shadow-amber-500/20'
          }`}
        >
          <Crown className={`w-3.5 h-3.5 ${isFounder ? 'text-black' : 'text-amber-400'}`} />
          <span>{isFounder ? '👑 $1B Founder' : isVipMember ? 'VIP Member' : 'Buy VIP Pass'}</span>
        </button>

        {/* Action Button: Chat */}
        <button
          id="nav-get-started-btn"
          onClick={() => (onOpenChat ? onOpenChat('normal') : onGetStarted?.())}
          className="px-4 sm:px-5 py-2 text-xs sm:text-sm font-semibold text-black bg-white rounded-full hover:bg-neutral-200 active:scale-95 transition-all duration-200 shadow-md shadow-white/10 cursor-pointer flex items-center gap-1.5"
        >
          <MessageSquare className="w-3.5 h-3.5 text-black" />
          <span>Talk with AI</span>
        </button>
      </div>
    </header>
  );
};
