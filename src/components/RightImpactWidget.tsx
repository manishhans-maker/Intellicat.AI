import React from 'react';
import { motion } from 'motion/react';

interface RightImpactWidgetProps {
  onOpenInfo?: (tabId?: string) => void;
}

export const RightImpactWidget: React.FC<RightImpactWidgetProps> = ({ onOpenInfo }) => {
  // 4 ascending dark red bars
  const bars = [
    { height: '48px', value: '+10%' },
    { height: '64px', value: '+20%' },
    { height: '80px', value: '+30%' },
    { height: '96px', value: '+40%' },
  ];

  return (
    <div className="flex flex-col gap-10 sm:gap-14 max-w-sm ml-auto relative z-10">
      {/* Top Bar Chart & +40% Performance Metric */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        onClick={() => onOpenInfo?.('product')}
        className="flex items-end gap-5 cursor-pointer group"
      >
        {/* 4 Dark Crimson Rounded Bars */}
        <div className="flex items-end gap-2 h-24">
          {bars.map((bar, idx) => (
            <motion.div
              key={idx}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 0.5, delay: 0.3 + idx * 0.1, ease: 'easeOut' }}
              style={{ height: bar.height }}
              className="w-3.5 bg-[#800010] rounded-sm origin-bottom transition-all duration-300 group-hover:bg-[#d90429] shadow-sm"
              title={`Stage ${idx + 1}: ${bar.value}`}
            />
          ))}
        </div>

        {/* Text Metric */}
        <div className="flex flex-col justify-end pb-0.5 group-hover:translate-x-1 transition-transform">
          <span className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-none mb-1 group-hover:text-red-400 transition-colors">
            +40%
          </span>
          <span className="text-xs sm:text-sm text-neutral-300 leading-tight">
            Performance
          </span>
          <span className="text-xs sm:text-sm text-neutral-300 leading-tight">
            Improvement
          </span>
        </div>
      </motion.div>

      {/* #HumanFirstImpact Section */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.45 }}
        onClick={() => onOpenInfo?.('about')}
        className="border-l-2 border-[#EF233C] pl-4 flex flex-col gap-1.5 cursor-pointer hover:border-white transition-colors group"
      >
        <span className="text-sm sm:text-base font-semibold text-[#EF233C] tracking-tight group-hover:text-red-400 transition-colors">
          #HumanFirstImpact
        </span>
        <p className="text-xs sm:text-sm text-neutral-400 font-normal leading-relaxed group-hover:text-neutral-300 transition-colors">
          Built for humans, enhanced by innovation, driven by impact.
        </p>
      </motion.div>
    </div>
  );
};
