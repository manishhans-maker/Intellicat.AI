import React from 'react';
import { motion } from 'motion/react';

export const PartnerLogos: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.55 }}
      className="flex flex-col items-end gap-3 mt-8 sm:mt-12"
    >
      {/* "Our Partners" small label */}
      <span className="text-xs text-neutral-400 font-medium tracking-wide">
        Our Partners
      </span>

      {/* Partner Logos Row */}
      <div className="flex flex-wrap items-center justify-end gap-6 sm:gap-8 lg:gap-10 text-neutral-200">
        {/* BookStore Logo */}
        <div className="flex items-center gap-2 text-white/90 hover:text-white transition-opacity duration-200 cursor-default">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9H9V9h10v2zm-4 4H9v-2h6v2zm4-8H9V5h10v2z" />
          </svg>
          <span className="text-sm sm:text-base font-semibold tracking-tight">BookStore</span>
        </div>

        {/* zantic Logo */}
        <div className="flex items-center gap-2 text-white/90 hover:text-white transition-opacity duration-200 cursor-default">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m13 3-7 9h6l-2 9 9-11h-6l4-7z" />
          </svg>
          <span className="text-sm sm:text-base font-semibold tracking-tight font-sans">zantic</span>
        </div>

        {/* Conva Logo */}
        <div className="flex items-center gap-2 text-white/90 hover:text-white transition-opacity duration-200 cursor-default">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="9" />
            <path d="M8 12a4 4 0 0 1 8 0" strokeDasharray="3 3" />
          </svg>
          <span className="text-sm sm:text-base font-semibold tracking-tight">Conva</span>
        </div>

        {/* Mercury Logo */}
        <div className="flex items-center gap-2 text-white/90 hover:text-white transition-opacity duration-200 cursor-default">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 18c2-6 5-11 8-11s6 5 8 11" />
            <path d="M8 18c1.5-4 2.5-7 4-7s2.5 3 4 7" />
          </svg>
          <span className="text-sm sm:text-base font-semibold tracking-tight">Mercury</span>
        </div>

        {/* Widget Logo */}
        <div className="flex items-center gap-2 text-white/90 hover:text-white transition-opacity duration-200 cursor-default">
          <div className="grid grid-cols-2 gap-0.5 w-4 h-4 rotate-45">
            <div className="bg-white rounded-[1px] w-1.5 h-1.5" />
            <div className="bg-white rounded-[1px] w-1.5 h-1.5" />
            <div className="bg-white rounded-[1px] w-1.5 h-1.5" />
            <div className="bg-white rounded-[1px] w-1.5 h-1.5" />
          </div>
          <span className="text-sm sm:text-base font-semibold tracking-tight">Widget</span>
        </div>
      </div>
    </motion.div>
  );
};
