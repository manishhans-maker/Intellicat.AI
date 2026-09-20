import React from 'react';
import { ArrowRight, Crown, Sparkles, Cat, Code, MessageSquare } from 'lucide-react';
import { motion } from 'motion/react';
import { ChatMode } from './AiAssistantModal';
import { INTELLICAT_LOGO_URL } from '../constants';

interface HeroContentProps {
  onOpenChat?: (mode: ChatMode, prompt?: string) => void;
  onOpenBuyVip?: () => void;
}

export const HeroContent: React.FC<HeroContentProps> = ({
  onOpenChat,
  onOpenBuyVip,
}) => {
  return (
    <div className="flex flex-col items-start max-w-2xl relative z-10">
      {/* Top Tagline Badge with Logo */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center gap-3 mb-6"
      >
        {/* IntellicatAI Logo Badge */}
        <div className="w-8 h-8 rounded-xl overflow-hidden border border-amber-500/40 bg-black/60 shadow-[0_0_12px_rgba(245,158,11,0.4)] shrink-0">
          <img
            src={INTELLICAT_LOGO_URL}
            alt="IntellicatAI"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Vertical Divider Line */}
        <div className="w-[1px] h-7 bg-neutral-600/70" />

        {/* Text */}
        <div className="flex flex-col text-[12px] leading-[1.3] text-neutral-300 font-medium tracking-wide">
          <span className="font-bold text-white flex items-center gap-1.5">
            Intellicat AI Platform
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </span>
          <span className="text-neutral-400">Dual Intelligence: Normal Talk & Cat Code</span>
        </div>
      </motion.div>

      {/* Main Headline */}
      <motion.h1
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="text-[34px] xs:text-[40px] sm:text-[64px] lg:text-[76px] xl:text-[84px] font-bold text-white tracking-[-0.03em] leading-[1.08] sm:leading-[1.02] mb-5 sm:mb-6 select-none"
      >
        <span className="block font-sans font-extrabold">Technology</span>
        <span className="block font-sans font-extrabold">
          Crafted for{' '}
          <span className="font-serif-display font-normal text-[#EF233C] tracking-tight ml-1 text-[1.12em] inline-block transform -translate-y-0.5">
            AI
          </span>
        </span>
        <span className="block font-sans font-extrabold">
          Not{' '}
          <span className="font-serif-display font-normal text-[#EF233C] tracking-tight ml-1 text-[1.12em] inline-block transform -translate-y-0.5">
            Machines
          </span>
        </span>
      </motion.h1>

      {/* Subtitle Description */}
      <motion.p
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="text-neutral-300 text-base sm:text-lg font-normal leading-relaxed max-w-lg mb-6 sm:mb-8"
      >
        Choose between two dedicated modes: **Normal Talk Mode** for friendly open conversations and brainstorms, or **Cat Code Mode** for elite cybernetic programming, debugging, and architecture.
      </motion.p>

      {/* 2-Mode Quick Launch Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.25 }}
        className="flex flex-wrap items-center gap-2.5 mb-8"
      >
        {/* Mode 1: Normal Talk Button */}
        <button
          id="hero-normal-talk-btn"
          onClick={() => onOpenChat?.('normal')}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-xs sm:text-sm font-semibold text-white transition-all cursor-pointer shadow-sm group hover:scale-105"
        >
          <MessageSquare className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
          <span>Mode 1: Normal Talk</span>
        </button>

        {/* Mode 2: Cat Code Button */}
        <button
          id="hero-cat-code-btn"
          onClick={() => onOpenChat?.('cat-code')}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#EF233C]/20 hover:bg-[#EF233C]/35 border border-[#EF233C]/40 text-xs sm:text-sm font-semibold text-white transition-all cursor-pointer shadow-sm group hover:scale-105"
        >
          <Cat className="w-4 h-4 text-[#EF233C] group-hover:scale-110 transition-transform" />
          <span>Mode 2: Cat Code 🐾</span>
          <span className="text-[10px] text-[#EF233C] font-mono bg-[#EF233C]/20 px-1.5 py-0.5 rounded font-bold">
            Gemini
          </span>
        </button>

        {/* VIP Pass */}
        <button
          onClick={onOpenBuyVip}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-gradient-to-r from-amber-500/15 to-amber-500/25 hover:from-amber-500/30 hover:to-amber-500/40 border border-amber-500/40 text-xs font-semibold text-amber-300 transition-all cursor-pointer shadow-sm group"
        >
          <Crown className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-12 transition-transform" />
          <span>Buy VIP Pass</span>
        </button>
      </motion.div>

      {/* CTA Button & Social Proof */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="flex flex-wrap items-center gap-4 sm:gap-6"
      >
        {/* Main Red/Orange CTA Button */}
        <button
          id="hero-cta-button"
          onClick={() => onOpenChat?.('normal')}
          className="group relative flex items-center justify-between pl-6 pr-2 py-2 red-cta-btn rounded-full cursor-pointer transition-all duration-300 hover:scale-[1.03] active:scale-95 shadow-lg shadow-red-600/30"
        >
          <span className="text-white font-semibold text-base pr-4 select-none flex items-center gap-2">
            <span>Start Conversation</span>
          </span>
          <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-neutral-900 group-hover:translate-x-0.5 transition-transform duration-200 shadow-sm">
            <ArrowRight className="w-4 h-4 text-black stroke-[2.5]" />
          </div>
        </button>

        {/* User Avatars & Worldwide Stat */}
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2.5 items-center">
            {/* Avatar 1 */}
            <div className="w-8 h-8 rounded-full border-2 border-black bg-gradient-to-tr from-red-600 via-orange-500 to-amber-400 flex items-center justify-center overflow-hidden shadow-inner">
              <svg className="w-6 h-6 text-white/90" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </div>
            {/* Avatar 2 */}
            <div className="w-8 h-8 rounded-full border-2 border-black bg-gradient-to-tr from-rose-700 via-red-500 to-pink-500 flex items-center justify-center overflow-hidden shadow-inner">
              <svg className="w-6 h-6 text-white/90" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </div>
            {/* Avatar 3 */}
            <div className="w-8 h-8 rounded-full border-2 border-black bg-gradient-to-tr from-blue-600 via-indigo-500 to-cyan-400 flex items-center justify-center overflow-hidden shadow-inner">
              <svg className="w-6 h-6 text-white/90" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </div>
          </div>

          <div className="flex flex-col text-xs leading-tight">
            <span className="text-white font-semibold">100+ Satisfied Devs</span>
            <span className="text-neutral-400 text-[11px]">Worldwide</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
