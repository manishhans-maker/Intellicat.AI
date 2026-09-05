import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { motion } from 'motion/react';

interface StatCardsProps {
  onOpenInfo?: (tabId?: string) => void;
}

export const StatCards: React.FC<StatCardsProps> = ({ onOpenInfo }) => {
  return (
    <div className="flex flex-wrap items-stretch gap-3 sm:gap-4 mt-8 sm:mt-12">
      {/* 150+ Projects Delivered Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        whileHover={{ y: -4, borderColor: 'rgba(255, 255, 255, 0.35)' }}
        onClick={() => onOpenInfo?.('features')}
        className="w-36 sm:w-44 p-4 sm:p-5 rounded-2xl bg-[#0f0f12]/80 border border-white/10 backdrop-blur-md flex flex-col justify-between transition-all duration-200 cursor-pointer group shadow-lg"
      >
        <div className="flex items-start justify-between w-full mb-3">
          <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight group-hover:text-red-400 transition-colors">
            150+
          </span>
          <ArrowUpRight className="w-4 h-4 text-neutral-400 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-200" />
        </div>
        <span className="text-xs sm:text-sm text-neutral-400 font-medium">
          Projects Delivered
        </span>
      </motion.div>

      {/* 98% Client Satisfaction Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        whileHover={{ y: -4, borderColor: 'rgba(255, 255, 255, 0.35)' }}
        onClick={() => onOpenInfo?.('blogs')}
        className="w-36 sm:w-44 p-4 sm:p-5 rounded-2xl bg-[#0f0f12]/80 border border-white/10 backdrop-blur-md flex flex-col justify-between transition-all duration-200 cursor-pointer group shadow-lg"
      >
        <div className="flex items-start justify-between w-full mb-3">
          <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight group-hover:text-red-400 transition-colors">
            98%
          </span>
          <ArrowUpRight className="w-4 h-4 text-neutral-400 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-200" />
        </div>
        <span className="text-xs sm:text-sm text-neutral-400 font-medium">
          Client Satisfaction
        </span>
      </motion.div>
    </div>
  );
};
