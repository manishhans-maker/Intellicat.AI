import React, { useState } from 'react';
import {
  ChevronDown,
  Sparkles,
  Crown,
  ArrowRight,
  Cat,
  Code,
  MessageSquare,
  User,
  LogOut,
  Zap,
  Shield,
  Image as ImageIcon,
  GraduationCap,
  FolderKanban,
  Settings as SettingsIcon,
  Search,
  Menu,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ChatMode } from './AiAssistantModal';
import { INTELLICAT_LOGO_URL } from '../constants';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  currentView?: 'hero' | 'priority' | 'study' | 'spaces';
  onSelectView?: (view: 'hero' | 'priority' | 'study' | 'spaces') => void;
  onGetStarted?: () => void;
  onOpenChat?: (mode: ChatMode) => void;
  onOpenInfo?: (tabId?: string) => void;
  onOpenPremium?: () => void;
  onOpenBuyVip?: () => void;
  onOpenSettings?: () => void;
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
  onOpenSettings,
  isVipMember = false,
  isFounder = false,
}) => {
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    isOwner,
    tier,
  } = useAuth();

  const isFounderActive = Boolean(isFounder || isOwner || tier === 'founder');
  const isVipActive = Boolean(isVipMember || isFounderActive || tier === 'vip');

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
        {isFounderActive ? (
          <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-black text-[10px] font-black uppercase tracking-wider shadow-[0_0_15px_rgba(245,158,11,0.8)] animate-pulse">
            <Crown className="w-3 h-3 text-black" /> $1B FOUNDER
          </span>
        ) : isVipActive ? (
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

        {/* Study & Tutoring Hub (Class 7 Highlight) */}
        <button
          onClick={() => onSelectView?.('study')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer ${
            currentView === 'study'
              ? 'text-white bg-[#EF233C] shadow-md font-semibold'
              : 'text-neutral-300 hover:text-white hover:bg-white/5'
          }`}
        >
          <GraduationCap className="w-3.5 h-3.5 text-amber-400" />
          <span>Study Hub 🎓</span>
        </button>

        {/* Intelicat Spaces */}
        <button
          onClick={() => onSelectView?.('spaces')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer ${
            currentView === 'spaces'
              ? 'text-white bg-[#EF233C] shadow-md font-semibold'
              : 'text-neutral-300 hover:text-white hover:bg-white/5'
          }`}
        >
          <FolderKanban className="w-3.5 h-3.5 text-emerald-400" />
          <span>Spaces</span>
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
          <span>Chat</span>
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
        {/* Quick Settings Button */}
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-neutral-300 hover:text-white transition-all cursor-pointer"
            title="Open Settings (Memory, Model, Voice, Quota)"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>
        )}

        {/* Auth State & Quota / Sign In */}
        {user ? (
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 pl-2.5 pr-2 py-1.5 rounded-full bg-neutral-900/90 hover:bg-neutral-800 border border-white/15 text-xs transition-all cursor-pointer shadow-sm hover:border-white/30"
              title="Click to view profile & request usage"
            >
              {/* Request Quota Pill */}
              <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono border ${
                isLimitReached && !isOwner && !isFounderActive
                  ? 'bg-red-500/20 text-red-400 border-red-500/40'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
              }`}>
                <Zap className="w-2.5 h-2.5 text-amber-400" />
                <span>
                  {isOwner
                    ? 'Unlimited Left'
                    : `${remainingRequests} / ${maxRequests} Left`}
                </span>
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
                        {isOwner
                          ? '👑 Founder (Unlimited)'
                          : isFounderActive
                          ? `👑 Founder (${maxRequests})`
                          : isVipActive
                          ? `⭐ VIP Pro (${maxRequests})`
                          : `Free Tier (${maxRequests})`}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-neutral-300">Requests used:</span>
                        <span className="font-mono font-bold text-white">
                          {isOwner
                            ? `${requestCount} / Unlimited`
                            : `${requestCount} / ${maxRequests}`}
                        </span>
                      </div>
                      {/* Progress Bar */}
                      <div className="w-full h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isLimitReached && !isOwner && !isFounderActive
                              ? 'bg-red-500'
                              : remainingRequests <= 3 && !isOwner && !isFounderActive
                              ? 'bg-amber-500'
                              : 'bg-[#EF233C]'
                          }`}
                          style={{
                            width: isOwner
                              ? '15%'
                              : `${Math.min(100, (requestCount / (maxRequests || 1)) * 100)}%`,
                          }}
                        />
                      </div>
                      <div className="text-[10px] text-neutral-400 mt-1.5 flex items-center justify-between">
                        <span>
                          {isOwner
                            ? 'Unlimited queries (Founder Access)'
                            : `${remainingRequests} queries remaining`}
                        </span>
                        {isLimitReached && !isOwner && !isFounderActive && (
                          <span className="text-red-400 font-bold">Limit Reached</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons in Dropdown */}
                  <div className="mt-3 space-y-1">
                    {onOpenSettings && (
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          onOpenSettings();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/5 text-neutral-300 hover:text-white text-xs transition-colors cursor-pointer"
                      >
                        <SettingsIcon className="w-3.5 h-3.5 text-neutral-400" />
                        <span>Settings (Memory, Voice, Keys)</span>
                      </button>
                    )}

                    {!isFounderActive && (
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          onOpenBuyVip?.();
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <Crown className="w-3.5 h-3.5 text-amber-400" />
                          <span>{isVipActive ? 'Upgrade to Founder' : 'Upgrade to VIP (150 Queries)'}</span>
                        </span>
                        <ArrowRight className="w-3 h-3" />
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
          title={isFounderActive ? "Supreme $1B Founder Passholder" : "Buy Alpha Cohort VIP Pass"}
          className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full transition-all duration-200 cursor-pointer shadow-sm hover:scale-105 active:scale-95 ${
            isFounderActive
              ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-black border border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.5)]'
              : 'text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 shadow-amber-500/20'
          }`}
        >
          <Crown className={`w-3.5 h-3.5 ${isFounderActive ? 'text-black' : 'text-amber-400'}`} />
          <span>{isFounderActive ? '👑 $1B Founder' : isVipActive ? 'VIP Member' : 'Buy VIP Pass'}</span>
        </button>

        {/* Action Button: Chat */}
        <button
          id="nav-get-started-btn"
          onClick={() => (onOpenChat ? onOpenChat('normal') : onGetStarted?.())}
          className="px-3.5 sm:px-5 py-2 text-xs sm:text-sm font-semibold text-black bg-white rounded-full hover:bg-neutral-200 active:scale-95 transition-all duration-200 shadow-md shadow-white/10 cursor-pointer flex items-center gap-1.5 shrink-0"
        >
          <MessageSquare className="w-3.5 h-3.5 text-black" />
          <span className="hidden xs:inline">Talk with AI</span>
          <span className="xs:hidden">Chat</span>
        </button>

        {/* Mobile Hamburger Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(true)}
          type="button"
          className="md:hidden p-2 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/15 cursor-pointer min-w-[38px] min-h-[38px] flex items-center justify-center active:scale-95 shrink-0"
          title="Open Navigation Menu"
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Mobile Navigation Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="relative w-[80vw] max-w-xs h-full bg-[#0d0d14] border-l border-white/10 p-5 flex flex-col justify-between shadow-2xl z-10 text-white overflow-y-auto"
            >
              {/* Top: Header & Links */}
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl overflow-hidden border border-amber-500/40 bg-black">
                      <img src={INTELLICAT_LOGO_URL} alt="Logo" className="w-full h-full object-cover" />
                    </div>
                    <span className="font-bold text-sm text-white">Intellicat<span className="text-[#FF2A3A]">AI</span></span>
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white border border-white/10 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Primary Views */}
                <div className="py-4 space-y-1">
                  <div className="px-2 text-[10px] uppercase font-bold text-neutral-400 tracking-wider mb-2">Navigation</div>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onSelectView?.('hero');
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer text-left ${
                      currentView === 'hero' ? 'bg-white/15 text-white' : 'text-neutral-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <span>🏠 Overview</span>
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onSelectView?.('study');
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer text-left ${
                      currentView === 'study' ? 'bg-[#EF233C] text-white' : 'text-neutral-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <GraduationCap className="w-4 h-4 text-amber-400" />
                    <span>Study Hub (Class 7)</span>
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onSelectView?.('spaces');
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer text-left ${
                      currentView === 'spaces' ? 'bg-[#EF233C] text-white' : 'text-neutral-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <FolderKanban className="w-4 h-4 text-emerald-400" />
                    <span>Spaces</span>
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onSelectView?.('priority');
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer text-left ${
                      currentView === 'priority' ? 'bg-[#EF233C] text-white' : 'text-neutral-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Sparkles className="w-4 h-4 text-sky-400" />
                    <span>Priority List</span>
                  </button>
                </div>

                {/* AI Assistant Launchers */}
                <div className="py-2 border-t border-white/10 space-y-1.5">
                  <div className="px-2 text-[10px] uppercase font-bold text-neutral-400 tracking-wider mb-1">Launch AI Chat</div>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenChat?.('normal');
                    }}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-white border border-white/5 cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-sky-400" />
                      <span>Normal Talk</span>
                    </span>
                    <Zap className="w-3 h-3 text-amber-400" />
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenChat?.('cat-code');
                    }}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-[#EF233C]/20 hover:bg-[#EF233C]/30 text-xs font-semibold text-red-200 border border-[#EF233C]/30 cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Cat className="w-4 h-4 text-[#EF233C]" />
                      <span>Cyber Cat Code 🐾</span>
                    </span>
                    <Code className="w-3 h-3 text-red-400" />
                  </button>
                </div>
              </div>

              {/* Bottom: User, VIP, Settings */}
              <div className="pt-4 border-t border-white/10 space-y-2">
                {onOpenSettings && (
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenSettings();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-neutral-300 hover:text-white cursor-pointer"
                  >
                    <SettingsIcon className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Settings (Voice, Models)</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenBuyVip?.();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Crown className="w-4 h-4 text-amber-400" />
                    <span>{isFounderActive ? '$1B Founder Pass' : isVipActive ? 'VIP Active' : 'Buy VIP Pass'}</span>
                  </span>
                  <ArrowRight className="w-3 h-3" />
                </button>

                {user ? (
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-neutral-400 hover:text-red-400 text-xs cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out ({user.email})</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      openAuthModal('signin');
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white text-black text-xs font-bold cursor-pointer"
                  >
                    <User className="w-4 h-4 text-black" />
                    <span>Sign In (15 Free)</span>
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </header>
  );
};
