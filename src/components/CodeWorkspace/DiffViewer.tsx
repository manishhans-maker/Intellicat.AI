import React, { useState } from 'react';
import { Check, X, FileDiff as FileDiffIcon, ChevronRight, Eye, Split, Columns } from 'lucide-react';
import { FileDiff } from '../../types/codeAgent';

interface DiffViewerProps {
  diffs: FileDiff[];
  onApplyDiff: (diff: FileDiff) => void;
  onApplyAll: () => void;
  onRejectAll: () => void;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  diffs,
  onApplyDiff,
  onApplyAll,
  onRejectAll,
}) => {
  const [selectedDiffIndex, setSelectedDiffIndex] = useState(0);
  const activeDiff = diffs[selectedDiffIndex] || diffs[0];

  if (diffs.length === 0) {
    return null;
  }

  const renderUnifiedLines = (oldText: string, newText: string) => {
    const oldLines = oldText ? oldText.split('\n') : [];
    const newLines = newText ? newText.split('\n') : [];

    // Simple line diff presentation
    const max = Math.max(oldLines.length, newLines.length);
    const result: React.ReactNode[] = [];

    let oldIdx = 0;
    let newIdx = 0;

    while (oldIdx < oldLines.length || newIdx < newLines.length) {
      const oldLine = oldLines[oldIdx];
      const newLine = newLines[newIdx];

      if (oldLine === newLine) {
        result.push(
          <div key={`same-${oldIdx}-${newIdx}`} className="flex text-xs font-mono py-0.5 px-3 hover:bg-white/[0.02]">
            <span className="w-10 text-neutral-600 select-none text-right pr-3">{oldIdx + 1}</span>
            <span className="w-10 text-neutral-600 select-none text-right pr-3">{newIdx + 1}</span>
            <span className="w-5 text-neutral-600 select-none"> </span>
            <span className="flex-1 text-neutral-300 whitespace-pre">{oldLine}</span>
          </div>
        );
        oldIdx++;
        newIdx++;
      } else {
        if (oldIdx < oldLines.length && (newIdx >= newLines.length || !newLines.includes(oldLine))) {
          result.push(
            <div key={`del-${oldIdx}`} className="flex text-xs font-mono py-0.5 px-3 bg-red-950/40 text-red-200 border-l-2 border-red-500">
              <span className="w-10 text-red-500/70 select-none text-right pr-3">{oldIdx + 1}</span>
              <span className="w-10 text-neutral-700 select-none text-right pr-3"> </span>
              <span className="w-5 text-red-400 font-bold select-none">-</span>
              <span className="flex-1 whitespace-pre">{oldLine}</span>
            </div>
          );
          oldIdx++;
        }
        if (newIdx < newLines.length && (oldIdx >= oldLines.length || !oldLines.includes(newLine))) {
          result.push(
            <div key={`add-${newIdx}`} className="flex text-xs font-mono py-0.5 px-3 bg-emerald-950/40 text-emerald-200 border-l-2 border-emerald-500">
              <span className="w-10 text-neutral-700 select-none text-right pr-3"> </span>
              <span className="w-10 text-emerald-500/70 select-none text-right pr-3">{newIdx + 1}</span>
              <span className="w-5 text-emerald-400 font-bold select-none">+</span>
              <span className="flex-1 whitespace-pre">{newLine}</span>
            </div>
          );
          newIdx++;
        }
      }
    }

    return result;
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a12] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
      {/* Diff Header Bar */}
      <div className="flex items-center justify-between p-3 bg-[#11121c] border-b border-white/10 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <FileDiffIcon className="w-4 h-4 text-[#EF233C]" />
          <span className="font-bold text-xs text-white uppercase tracking-wider">
            Review Proposed Changes ({diffs.length} {diffs.length === 1 ? 'file' : 'files'})
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRejectAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white text-xs font-semibold transition-all cursor-pointer border border-white/10"
          >
            <X className="w-3.5 h-3.5" />
            <span>Reject All</span>
          </button>
          <button
            type="button"
            onClick={onApplyAll}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/30 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Apply All Changes</span>
          </button>
        </div>
      </div>

      {/* Main Split Layout: Left File List, Right Line Diff */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
        {/* Left column: Files list */}
        <div className="md:col-span-4 bg-[#0d0e17] border-r border-white/10 p-2 overflow-y-auto space-y-1">
          {diffs.map((d, index) => {
            const isSelected = index === selectedDiffIndex;
            return (
              <div
                key={d.path}
                onClick={() => setSelectedDiffIndex(index)}
                className={`p-2.5 rounded-xl text-xs font-mono transition-all cursor-pointer flex items-center justify-between border ${
                  isSelected
                    ? 'bg-[#EF233C]/20 border-[#EF233C]/50 text-white'
                    : 'bg-white/5 border-transparent text-neutral-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <div className="min-w-0 pr-2">
                  <div className="font-semibold truncate">{d.path.split('/').pop()}</div>
                  <div className="text-[10px] text-neutral-500 truncate">{d.path}</div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 text-[10px] font-bold">
                  {d.additions > 0 && <span className="text-emerald-400">+{d.additions}</span>}
                  {d.deletions > 0 && <span className="text-red-400">-{d.deletions}</span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right column: Line Diff Viewer */}
        <div className="md:col-span-8 flex flex-col bg-[#08090f] overflow-hidden">
          {activeDiff && (
            <>
              {/* File details bar */}
              <div className="p-2.5 bg-[#12131e] border-b border-white/10 flex items-center justify-between text-xs">
                <span className="font-mono text-neutral-300 font-semibold">{activeDiff.path}</span>
                <button
                  type="button"
                  onClick={() => onApplyDiff(activeDiff)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#EF233C] hover:bg-red-600 text-white text-[11px] font-bold transition-colors cursor-pointer"
                >
                  <Check className="w-3 h-3" />
                  <span>Apply This File</span>
                </button>
              </div>

              {/* Code lines */}
              <div className="flex-1 overflow-auto p-2 font-mono">
                {renderUnifiedLines(activeDiff.oldContent, activeDiff.newContent)}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
