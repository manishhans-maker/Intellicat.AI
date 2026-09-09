import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Sparkles,
  User,
  RefreshCw,
  Zap,
  ArrowRight,
  Download,
  Copy,
  Check,
  Code,
  MessageSquare,
  Cat,
  Crown,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { RobotBackground } from './RobotBackground';
import { INTELLICAT_LOGO_URL } from '../constants';

export type ChatMode = 'normal' | 'cat-code';
export type AiProvider = 'groq' | 'gemini';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  mode?: ChatMode;
  provider?: AiProvider;
}

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPrompt?: string;
  defaultMode?: ChatMode;
  onOpenBuyVip?: () => void;
  isVipMember?: boolean;
  isFounder?: boolean;
}

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({
  isOpen,
  onClose,
  initialPrompt,
  defaultMode = 'normal',
  onOpenBuyVip,
  isVipMember = false,
  isFounder = false,
}) => {
  const [mode, setMode] = useState<ChatMode>(defaultMode);
  
  const getWelcomeMessage = (selectedMode: ChatMode = 'normal'): Message => {
    if (selectedMode === 'normal') {
      return {
        id: 'welcome-normal',
        role: 'assistant',
        content: `Hello! I'm your AI conversational companion in **Normal Talk Mode** powered by **Groq LPU (Llama 3.3 70B)** ⚡.\n\nWe can talk about anything — brainstorm ideas, write essays or stories, discuss general topics, plan projects, or just have a friendly chat at lightning speed. What's on your mind today?`,
        timestamp: 'Just now',
        mode: 'normal',
        provider: 'groq',
      };
    } else {
      return {
        id: 'welcome-cat-code',
        role: 'assistant',
        content: `Purr-fect timing! 🐾 I am **IntelicatAI**, your Cybernetic Cat Coder in **Cat Code Mode** powered by **Google Gemini 3.6 Flash** ✨.\n\nI catch bugs faster than mice and write pristine, high-performance code across TypeScript, Python, Rust, Go, SQL, and React. What software are we building or debugging?`,
        timestamp: 'Just now',
        mode: 'cat-code',
        provider: 'gemini',
      };
    }
  };

  const initialChatMode: ChatMode = (defaultMode === 'cat-code') ? 'cat-code' : 'normal';
  const [messages, setMessages] = useState<Message[]>([getWelcomeMessage(initialChatMode)]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  
  // AI Inference Engine: Groq for Normal Talk, Gemini for Cat Code
  const [provider, setProvider] = useState<AiProvider>(initialChatMode === 'cat-code' ? 'gemini' : 'groq');
  const [availableProviders, setAvailableProviders] = useState<{ groq: boolean; gemini: boolean }>({
    groq: true,
    gemini: true,
  });

  // Fetch available API keys dynamically on mount
  useEffect(() => {
    fetch('/api/providers')
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          setAvailableProviders({
            groq: Boolean(data.groq),
            gemini: Boolean(data.gemini),
          });
        }
      })
      .catch(() => {});
  }, []);

  // Real-time telemetry stats
  const [streamStats, setStreamStats] = useState({
    tokenCount: 120,
    latencyMs: initialChatMode === 'normal' ? 3.2 : 6.5,
  });

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync mode when defaultMode changes upon modal open
  useEffect(() => {
    if (isOpen) {
      const targetMode: ChatMode = (defaultMode === 'cat-code') ? 'cat-code' : 'normal';
      setMode(targetMode);
      setProvider(targetMode === 'normal' ? 'groq' : 'gemini');
      setStreamStats((s) => ({ ...s, latencyMs: targetMode === 'normal' ? 3.2 : 6.5 }));
      setMessages([getWelcomeMessage(targetMode)]);
    }
  }, [isOpen, defaultMode]);

  const normalPrompts = [
    'Help me brainstorm creative ideas for a product launch',
    'Explain the concept of quantum computing in simple terms',
    'Write a polite and professional follow-up email',
    'What are some high-impact productivity habits for morning routines?',
  ];

  const catCodePrompts = [
    'Write a production-ready TypeScript debounce utility with cancel support',
    'Debug why my React useEffect is causing infinite re-renders',
    'Design a scalable Redis rate-limiter using token bucket algorithm',
    'Write a fast Python async queue processor with graceful shutdown',
  ];

  // Auto-scroll on new messages
  useEffect(() => {
    if (isOpen) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [messages, isOpen, loading]);

  // Handle initial prompt if passed
  useEffect(() => {
    if (initialPrompt && isOpen) {
      handleSend(initialPrompt);
    }
  }, [initialPrompt, isOpen]);

  // Clean up speech synthesis when closing
  useEffect(() => {
    if (!isOpen && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
    }
  }, [isOpen]);

  const handleSwitchMode = (newMode: ChatMode) => {
    if (newMode === mode) return;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
    }
    const nextProvider: AiProvider = newMode === 'normal' ? 'groq' : 'gemini';
    setMode(newMode);
    setProvider(nextProvider);
    setStreamStats((s) => ({ ...s, latencyMs: newMode === 'normal' ? 3.2 : 6.5 }));
    setMessages([getWelcomeMessage(newMode)]);
    setError(null);
  };

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || input.trim();
    if (!text || loading) return;

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
    }

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mode,
    };

    const assistantMsgId = `assistant-${Date.now()}`;
    const initialAssistantMsg: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mode,
      provider,
    };

    const updatedWithUser = [...messages, userMsg];
    setMessages([...updatedWithUser, initialAssistantMsg]);
    setInput('');
    setLoading(true);
    setError(null);

    const startTime = performance.now();

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedWithUser.map((m) => ({ role: m.role, content: m.content })),
          mode,
          provider,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('ReadableStream not supported.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let accumulatedContent = '';
      let buffer = '';
      let streamError: string | null = null;
      let streamProvider: AiProvider = provider;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const dataStr = trimmed.slice(6);
          if (dataStr === '[DONE]') break;

          let parsed: any;
          try {
            parsed = JSON.parse(dataStr);
          } catch {
            continue;
          }

          if (parsed.error) {
            streamError = parsed.error;
            break;
          }

          if (parsed.provider) {
            streamProvider = parsed.provider;
          }

          if (parsed.text) {
            accumulatedContent += parsed.text;
            const currentText = accumulatedContent;
            
            const words = currentText.split(/\s+/).length;
            setStreamStats({
              tokenCount: words * 2,
              latencyMs: Number(((performance.now() - startTime) / Math.max(1, words)).toFixed(1)),
            });

            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMsgId
                  ? { ...msg, content: currentText, provider: streamProvider }
                  : msg
              )
            );
          }
        }
        if (streamError) break;
      }

      if (streamError) {
        throw new Error(streamError);
      }

      if (!accumulatedContent) {
        throw new Error(
          streamProvider === 'groq'
            ? 'No response received from Groq. Please check that GROQ_API_KEY is configured in your Environment Variables or switch to Gemini.'
            : 'No response received from Gemini. Please check that GEMINI_API_KEY is configured in your Environment Variables or switch to Groq.'
        );
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      let errMsg = err.message || 'Unable to connect to AI engine.';
      try {
        if (errMsg.includes('{"error"')) {
          const match = errMsg.match(/\{.*"error".*\}/);
          if (match) {
            const parsed = JSON.parse(match[0]);
            if (parsed.error?.message) {
              errMsg = parsed.error.message;
            }
          }
        }
      } catch {}
      setError(errMsg);
      setMessages((prev) => prev.filter((m) => m.id !== assistantMsgId || m.content.length > 0));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
    }
    setMessages([getWelcomeMessage(mode)]);
    setError(null);
  };

  const handleSpeak = (msgId: string, text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (speakingMessageId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*_#`]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);

    setSpeakingMessageId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleDownloadMarkdown = () => {
    const mdContent = `# AI Chat Export (${mode === 'normal' ? 'Normal Talk' : 'Cat Code'})\nDate: ${new Date().toLocaleString()}\n\n` +
      messages
        .map((m) => `### ${m.role === 'user' ? '👤 You' : mode === 'normal' ? '🤖 AI Assistant' : '🐾 IntelicatAI Cat Coder'} (${m.timestamp})\n\n${m.content}\n`)
        .join('\n---\n\n');
    
    const blob = new Blob([mdContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-${mode}-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 lg:p-6 bg-black/90 backdrop-blur-xl overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 20 }}
        transition={{ duration: 0.3 }}
        className={`relative w-full max-w-4xl rounded-[28px] sm:rounded-[36px] bg-[#0c0c10] shadow-[0_0_80px_rgba(239,35,60,0.35)] flex flex-col h-[92vh] max-h-[860px] overflow-hidden text-white border ${
          mode === 'cat-code' ? 'border-[#EF233C]/40' : 'border-white/20'
        }`}
      >
        {/* Background Ambient Glow */}
        <RobotBackground mode="cinema" opacity={0.45} />

        {/* Modal Header with the 2-Mode Switcher */}
        <header className="relative z-20 px-4 sm:px-6 py-3.5 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 bg-black/80 backdrop-blur-md">
          
          {/* Left: 2 Modes Selector Tabs */}
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-2xl bg-neutral-900/90 border border-white/10 flex items-center shadow-inner">
              {/* Mode 1: Normal Talk (Groq) */}
              <button
                id="mode-normal-btn"
                onClick={() => handleSwitchMode('normal')}
                className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  mode === 'normal'
                    ? 'bg-white text-black shadow-md shadow-white/20 scale-[1.02]'
                    : 'text-neutral-400 hover:text-white hover:bg-white/5'
                }`}
                title="Normal Talk Mode — powered by Groq LPU (Llama 3.3 70B)"
              >
                <MessageSquare className={`w-4 h-4 ${mode === 'normal' ? 'text-black' : 'text-neutral-400'}`} />
                <span>Normal Talk</span>
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5 ${
                  mode === 'normal'
                    ? 'bg-black/10 text-neutral-900 border border-black/10'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  <Zap className="w-2.5 h-2.5 text-amber-500" />
                  <span>Groq</span>
                </span>
              </button>

              {/* Mode 2: Cat Code (Gemini) */}
              <button
                id="mode-catcode-btn"
                onClick={() => handleSwitchMode('cat-code')}
                className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  mode === 'cat-code'
                    ? 'bg-gradient-to-r from-[#EF233C] to-amber-500 text-white shadow-md shadow-red-500/30 scale-[1.02]'
                    : 'text-neutral-400 hover:text-white hover:bg-white/5'
                }`}
                title="Cat Code Mode — powered by Google Gemini 3.6 Flash"
              >
                <Cat className={`w-4 h-4 ${mode === 'cat-code' ? 'text-white' : 'text-[#EF233C]'}`} />
                <span>Cat Code 🐾</span>
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5 ${
                  mode === 'cat-code'
                    ? 'bg-white/20 text-white border border-white/20'
                    : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                }`}>
                  <Sparkles className="w-2.5 h-2.5 text-blue-300" />
                  <span>Gemini</span>
                </span>
              </button>
            </div>
          </div>

          {/* Center/Right: Active AI Engine Status & Manual Override Toggle (Desktop/Tablet) */}
          <div className="hidden md:flex items-center gap-1 p-1 rounded-2xl bg-neutral-900/90 border border-white/10 text-xs shadow-inner">
            <button
              id="engine-groq-btn"
              type="button"
              onClick={() => setProvider('groq')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                provider === 'groq'
                  ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50 shadow-sm shadow-amber-500/30 scale-[1.02]'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
              title="Groq LPU: Llama 3.3 70B (Default for Normal Talk)"
            >
              <Zap className={`w-3.5 h-3.5 ${provider === 'groq' ? 'text-amber-400 fill-amber-400/30' : 'text-neutral-400'}`} />
              <span>Groq LPU</span>
              {mode === 'normal' && (
                <span className="text-[9px] px-1 py-0.2 rounded bg-amber-400/20 text-amber-300">Default</span>
              )}
            </button>

            <button
              id="engine-gemini-btn"
              type="button"
              onClick={() => setProvider('gemini')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                provider === 'gemini'
                  ? 'bg-blue-500/25 text-blue-300 border border-blue-500/50 shadow-sm shadow-blue-500/30 scale-[1.02]'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
              title="Google Gemini 3.6 Flash (Default for Cat Code)"
            >
              <Sparkles className={`w-3.5 h-3.5 ${provider === 'gemini' ? 'text-blue-400 fill-blue-400/30' : 'text-neutral-400'}`} />
              <span>Gemini</span>
              {mode === 'cat-code' && (
                <span className="text-[9px] px-1 py-0.2 rounded bg-blue-400/20 text-blue-300">Default</span>
              )}
            </button>
          </div>

          {/* Right Controls: VIP Pass, Latency, Reset, Export & Close */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* VIP Status or Buy */}
            <button
              onClick={() => {
                onClose();
                onOpenBuyVip?.();
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                isFounder
                  ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-black border border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                  : 'bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300'
              }`}
            >
              <Crown className={`w-3.5 h-3.5 ${isFounder ? 'text-black' : 'text-amber-400'}`} />
              <span>{isFounder ? '👑 $1B Founder' : isVipMember ? 'VIP Member' : 'Buy VIP'}</span>
            </button>

            {/* Speed Pill */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/50 border border-white/10 text-[10px] font-mono text-neutral-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>{streamStats.latencyMs}ms</span>
            </div>

            {/* Reset */}
            <button
              onClick={handleReset}
              title="Reset chat"
              className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Export */}
            <button
              onClick={handleDownloadMarkdown}
              title="Export conversation (.md)"
              className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 relative z-10">
          {messages.map((m) => {
            const isUser = m.role === 'user';
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 max-w-[88%] sm:max-w-[82%] ${
                  isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-md overflow-hidden ${
                    isUser
                      ? 'bg-neutral-800 border border-white/15 text-white'
                      : mode === 'cat-code'
                      ? 'border border-amber-500/50 bg-black shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                      : 'bg-white text-black'
                  }`}
                >
                  {isUser ? (
                    <User className="w-4 h-4" />
                  ) : mode === 'cat-code' ? (
                    <img
                      src={INTELLICAT_LOGO_URL}
                      alt="IntellicatAI"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <MessageSquare className="w-4 h-4" />
                  )}
                </div>

                {/* Bubble */}
                <div
                  className={`rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed border ${
                    isUser
                      ? mode === 'cat-code'
                        ? 'bg-[#EF233C]/20 border-[#EF233C]/40 text-white shadow-md'
                        : 'bg-white/15 border-white/25 text-white shadow-md'
                      : 'bg-[#13131a]/95 border-white/10 text-neutral-100 shadow-xl backdrop-blur-md'
                  }`}
                >
                  <div className="space-y-2 whitespace-pre-wrap font-sans">
                    {m.content ? (
                      m.content
                    ) : (
                      <div className="flex items-center gap-1.5 py-1 text-neutral-400">
                        <span className="w-2 h-2 rounded-full bg-[#EF233C] animate-bounce" />
                        <span className="w-2 h-2 rounded-full bg-[#EF233C] animate-bounce [animation-delay:0.2s]" />
                        <span className="w-2 h-2 rounded-full bg-[#EF233C] animate-bounce [animation-delay:0.4s]" />
                      </div>
                    )}
                  </div>

                  {/* Actions under AI response */}
                  {!isUser && m.content && (
                    <div className="flex flex-wrap items-center justify-between border-t border-white/10 mt-2.5 pt-2 text-[10px] text-neutral-400 gap-2">
                      <div className="flex items-center gap-2 font-mono shrink-0">
                        <span>{m.timestamp}</span>
                        <span className={`px-2 py-0.5 rounded text-[9px] flex items-center gap-1 font-sans font-medium whitespace-nowrap ${
                          (m.provider || provider) === 'groq'
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            : 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                        }`}>
                          {(m.provider || provider) === 'groq' ? (
                            <>
                              <Zap className="w-2.5 h-2.5 text-amber-400" />
                              <span>Groq LPU</span>
                              <span className="hidden sm:inline text-amber-400/70">(Llama 3.3 70B)</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-2.5 h-2.5 text-blue-400" />
                              <span>Gemini 3.6</span>
                              <span className="hidden sm:inline text-blue-400/70">Flash</span>
                            </>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <button
                          onClick={() => handleSpeak(m.id, m.content)}
                          className="hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                        >
                          {speakingMessageId === m.id ? (
                            <>
                              <VolumeX className="w-3 h-3 text-[#EF233C]" />
                              <span className="text-[#EF233C]">Stop</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-3 h-3" />
                              <span>Listen</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleCopy(m.content)}
                          className="hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
          <div ref={chatBottomRef} />
        </div>

        {/* Suggested Quick Prompts based on Mode */}
        {messages.length <= 2 && (
          <div className="px-4 sm:px-6 py-2 relative z-10 flex flex-wrap gap-2">
            {(mode === 'normal' ? normalPrompts : catCodePrompts).map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(p)}
                className="text-[11px] px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-neutral-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5"
              >
                {mode === 'normal' ? (
                  <MessageSquare className="w-3 h-3 text-neutral-400" />
                ) : (
                  <Cat className="w-3 h-3 text-[#EF233C]" />
                )}
                <span>{p}</span>
              </button>
            ))}
          </div>
        )}

        {/* Bottom Input Area */}
        <div className="p-3 sm:p-4 border-t border-white/10 bg-black/80 backdrop-blur-md relative z-20">
          {error && (
            <div className="mb-2 p-2.5 rounded-xl bg-red-500/15 border border-red-500/35 text-red-300 text-xs flex flex-col sm:flex-row items-center justify-between gap-2">
              <span className="text-center sm:text-left">{error}</span>
              {error.includes('GROQ_API_KEY') && (
                <span className="text-[11px] text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-md border border-amber-500/40 whitespace-nowrap">
                  ⚡ Tip: Add GROQ_API_KEY in Secrets or console.groq.com
                </span>
              )}
              {error.includes('GEMINI_API_KEY') && (
                <span className="text-[11px] text-blue-300 bg-blue-500/20 px-2 py-0.5 rounded-md border border-blue-500/40 whitespace-nowrap">
                  ✨ Tip: Add GEMINI_API_KEY in Secrets
                </span>
              )}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className={`flex items-center gap-2 bg-[#14141c] border rounded-2xl p-1.5 transition-colors ${
              mode === 'cat-code'
                ? 'border-white/15 focus-within:border-[#EF233C]'
                : 'border-white/15 focus-within:border-white'
            }`}
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                mode === 'normal'
                  ? 'Chat about anything, ask a question, or brainstorm...'
                  : 'Ask Cat Coder to write, debug, or architect software...'
              }
              disabled={loading}
              className="flex-1 bg-transparent px-3 py-2 text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none"
            />

            <button
              type="submit"
              disabled={!input.trim() || loading}
              className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-95 transition-all cursor-pointer shadow-md ${
                mode === 'cat-code'
                  ? 'red-cta-btn text-white shadow-red-600/30'
                  : 'bg-white text-black hover:bg-neutral-200 shadow-white/20'
              }`}
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Send</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};
