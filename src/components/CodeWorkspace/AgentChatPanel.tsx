import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  Cat,
  Bug,
  Code2,
  CheckCircle2,
  RefreshCw,
  Lightbulb,
  Zap,
  RotateCcw,
  Undo2,
  ChevronDown,
  ChevronUp,
  Palette,
  Volume2,
  Smartphone,
  ShieldCheck,
} from 'lucide-react';
import { ProjectFile, AgentActionPlan, AgentHistoryMessage } from '../../types/codeAgent';

interface AgentChatPanelProps {
  files: Record<string, ProjectFile>;
  activeFilePath: string;
  onRunAgentTask: (task: string, intent: string) => Promise<void>;
  isLoading: boolean;
  currentPlan?: AgentActionPlan;
  lastExplanation?: string;
  history?: AgentHistoryMessage[];
  onUndoLastChange?: () => void;
  canUndo?: boolean;
  selectedModel?: string;
  onSelectModel?: (model: string) => void;
}

const QUICK_ACTIONS = [
  { id: 'features', label: 'Add New Feature', icon: Sparkles, desc: 'Interactive buttons, widgets, sound' },
  { id: 'fix_bug', label: 'Fix App Errors', icon: Bug, desc: 'Resolve glitches or runtime issues' },
  { id: 'style', label: 'Redesign & Theme', icon: Palette, desc: 'Modern colors, dark mode, animations' },
  { id: 'mobile', label: 'Mobile Responsive', icon: Smartphone, desc: 'Optimize layouts for phones & tablets' },
];

const SUGGESTION_CHIPS = [
  'Add dark / light mode toggle with smooth transition',
  'Add sound effects & visual click feedback',
  'Save user score & data automatically in memory',
  'Make the UI fully responsive with touch controls',
  'Add animations & polished hover effects',
];

export const AgentChatPanel: React.FC<AgentChatPanelProps> = ({
  files,
  activeFilePath,
  onRunAgentTask,
  isLoading,
  currentPlan,
  lastExplanation,
  history = [],
  onUndoLastChange,
  canUndo = false,
  selectedModel = 'gemini-3.8-flash',
  onSelectModel,
}) => {
  const [input, setInput] = useState('');
  const [expandedExplanations, setExpandedExplanations] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history.length, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const prompt = input.trim();
    if (!prompt || isLoading) return;
    onRunAgentTask(prompt, 'edit');
    setInput('');
  };

  const handleQuickAction = (actionId: string, label: string) => {
    let prompt = '';
    switch (actionId) {
      case 'features':
        prompt = `Add engaging new interactive features and smooth sound feedback to this app.`;
        break;
      case 'fix_bug':
        prompt = `Check the app for any bugs, glitches, or errors and fix them completely.`;
        break;
      case 'style':
        prompt = `Redesign the app with a modern neon dark theme, crisp typography, and polished micro-animations.`;
        break;
      case 'mobile':
        prompt = `Optimize the mobile and tablet layout for touch interaction and responsive fitting.`;
        break;
      default:
        prompt = `${label}`;
    }
    onRunAgentTask(prompt, actionId);
  };

  const handleSelectChip = (chip: string) => {
    if (isLoading) return;
    onRunAgentTask(chip, 'edit');
  };

  const toggleExplanation = (id: string) => {
    setExpandedExplanations((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="flex flex-col h-full bg-[#0c0d16] border border-white/10 rounded-2xl overflow-hidden shadow-2xl text-white">
      {/* Agent Header */}
      <div className="p-3 bg-[#11121d] border-b border-white/10 flex items-center justify-between shrink-0 gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[#EF233C]/20 border border-[#EF233C]/40 flex items-center justify-center text-[#EF233C] shrink-0">
            <Cat className="w-4.5 h-4.5 animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
              <span>AI Web App Creator</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            </div>
            <div className="text-[10px] text-neutral-400 truncate">
              Describe your app ideas & see updates live
            </div>
          </div>
        </div>

        {/* Header Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Model Selector Dropdown */}
          {onSelectModel && (
            <div className="flex items-center gap-1 bg-black/50 border border-white/10 rounded-xl px-2.5 py-1">
              <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <select
                value={selectedModel}
                onChange={(e) => onSelectModel(e.target.value)}
                className="bg-transparent text-[11px] font-bold text-white outline-none cursor-pointer"
                title="Choose AI Model for coding"
              >
                <option value="gemini-3.8-flash" className="bg-[#11121d] text-white">Gemini 3.8 Flash (⚡ Recommended)</option>
                <option value="gemini-3.5-flash" className="bg-[#11121d] text-white">Gemini 3.5 Flash (Stable)</option>
                <option value="gemini-3.5-flash-lite" className="bg-[#11121d] text-white">Gemini 3.5 Flash Lite (Fast)</option>
                <option value="gemini-3.6-flash" className="bg-[#11121d] text-white">Gemini 3.6 Flash</option>
                <option value="gemini-flash-latest" className="bg-[#11121d] text-white">Gemini Flash Latest</option>
              </select>
            </div>
          )}

          {/* Undo Last Change Button */}
          {canUndo && onUndoLastChange && (
            <button
              type="button"
              onClick={onUndoLastChange}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-bold transition-all cursor-pointer shadow-sm"
              title="Undo last app modification"
            >
              <Undo2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Undo Edit</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Agent Conversation Feed */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3.5">
        {/* Welcome Card if no history */}
        {history.length === 0 && (
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-2xl">✨</span>
              <div>
                <h4 className="text-xs font-bold text-white">What would you like to build or edit?</h4>
                <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
                  Describe any app, game, calculator, dashboard, or tool. You can request changes or new features anytime!
                </p>
              </div>
            </div>

            {/* Quick Suggestions Chips */}
            <div className="space-y-1.5 pt-2 border-t border-white/5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Popular App Features</div>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTION_CHIPS.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectChip(chip)}
                    disabled={isLoading}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white border border-white/10 transition-all cursor-pointer disabled:opacity-50 text-left"
                  >
                    + {chip}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Quick Contextual Actions Grid */}
        <div className="space-y-1.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Quick App Enhancements</div>
          <div className="grid grid-cols-2 gap-1.5">
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => handleQuickAction(action.id, action.label)}
                  disabled={isLoading}
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-all cursor-pointer group disabled:opacity-50"
                >
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-white group-hover:text-red-300">
                    <Icon className="w-3.5 h-3.5 text-[#EF233C]" />
                    <span>{action.label}</span>
                  </div>
                  <div className="text-[10px] text-neutral-400 line-clamp-1 mt-0.5">{action.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Render Conversation Thread */}
        {history.map((msg) => {
          const isUser = msg.role === 'user';
          const isExpanded = Boolean(expandedExplanations[msg.id]);

          if (isUser) {
            return (
              <div key={msg.id} className="flex justify-end">
                <div className="max-w-[85%] p-3 rounded-2xl rounded-br-sm bg-gradient-to-r from-red-600 to-[#EF233C] text-white text-xs font-medium shadow-lg">
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                  <div className="text-[9px] text-white/70 text-right mt-1 font-mono">{msg.timestamp}</div>
                </div>
              </div>
            );
          }

          // Agent Message Card
          return (
            <div key={msg.id} className="space-y-2.5">
              <div className="p-3.5 rounded-2xl bg-[#131422] border border-white/15 space-y-3 shadow-xl">
                {/* Header Badge */}
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{msg.isError ? 'Notice' : 'App Updated Live'}</span>
                  </div>
                  <span className="text-[10px] text-neutral-400 font-mono">{msg.timestamp}</span>
                </div>

                {/* Plan Summary Card */}
                {msg.plan && (
                  <div className="space-y-1.5 bg-black/40 p-2.5 rounded-xl border border-white/5">
                    <div className="text-[11px] font-bold text-neutral-200">
                      🎯 {msg.plan.taskSummary}
                    </div>
                    <div className="space-y-1 pt-1">
                      {msg.plan.steps.map((st, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-[11px] text-neutral-300">
                          <span className="w-3.5 h-3.5 rounded-full bg-white/10 text-neutral-400 text-[9px] flex items-center justify-center shrink-0 mt-0.5 font-bold">
                            {i + 1}
                          </span>
                          <span>{st}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Status Action Buttons */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    {onUndoLastChange && (
                      <button
                        type="button"
                        onClick={onUndoLastChange}
                        className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-amber-300 transition-colors cursor-pointer font-semibold"
                        title="Revert these changes"
                      >
                        <RotateCcw className="w-3 h-3 text-neutral-400" />
                        <span>Revert Edit</span>
                      </button>
                    )}
                  </div>

                  {msg.explanation && (
                    <button
                      type="button"
                      onClick={() => toggleExplanation(msg.id)}
                      className="flex items-center gap-1 text-[10px] text-neutral-400 hover:text-white cursor-pointer transition-colors"
                    >
                      <span>{isExpanded ? 'Hide Notes' : 'App Notes'}</span>
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  )}
                </div>

                {/* Collapsible Explanation */}
                {isExpanded && msg.explanation && (
                  <div className="pt-2 border-t border-white/10 text-[11px] text-neutral-300 font-sans whitespace-pre-wrap leading-relaxed bg-black/30 p-2.5 rounded-xl">
                    {msg.explanation}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Loading Spinner */}
        {isLoading && (
          <div className="p-3.5 rounded-2xl bg-[#EF233C]/10 border border-[#EF233C]/30 flex items-center gap-3 text-xs text-red-200 animate-pulse">
            <RefreshCw className="w-4 h-4 text-[#EF233C] animate-spin shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-bold text-white text-xs">Building your app...</div>
              <div className="text-[10px] text-neutral-400 truncate">
                Applying updates directly to live preview.
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form at Bottom */}
      <form onSubmit={handleSubmit} className="p-2.5 sm:p-3 bg-[#11121d] border-t border-white/10 shrink-0">
        <div className="relative flex items-center bg-black/60 rounded-xl border border-white/15 focus-within:border-[#EF233C] p-1.5 transition-all">
          <input
            type="text"
            placeholder="Describe features to add or changes to make..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            className="flex-1 bg-transparent px-3 py-1.5 text-xs text-white placeholder-neutral-500 outline-none"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="p-2 rounded-lg bg-[#EF233C] hover:bg-red-600 disabled:opacity-40 text-white transition-colors cursor-pointer shrink-0"
            title="Send Instruction"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
};

