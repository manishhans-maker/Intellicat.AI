import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Settings as SettingsIcon,
  Brain,
  Volume2,
  Cpu,
  Palette,
  BarChart2,
  Database,
  Trash2,
  Plus,
  Edit2,
  Check,
  ToggleLeft,
  ToggleRight,
  Download,
  AlertCircle,
  Key,
  CheckCircle2,
  Zap,
} from 'lucide-react';
import { UserMemory, AiMode, AiProvider } from '../types';
import {
  loadUserMemories,
  saveUserMemory,
  deleteUserMemory,
  toggleMemoryState,
  clearAllMemories,
} from '../lib/memoryService';
import { getAvailableVoices } from '../lib/voiceService';
import { useAuth } from '../context/AuthContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  robotMode: 'vivid' | 'cinema' | 'balanced';
  onSetRobotMode: (mode: 'vivid' | 'cinema' | 'balanced') => void;
  defaultMode: AiMode;
  onSetDefaultMode: (mode: AiMode) => void;
  defaultProvider: AiProvider | 'auto';
  onSetDefaultProvider: (provider: AiProvider | 'auto') => void;
  groqKey: string;
  onSaveGroqKey: (key: string) => void;
  conversationsCount?: number;
  onExportAllData?: () => void;
  onClearAllHistory?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  robotMode,
  onSetRobotMode,
  defaultMode,
  onSetDefaultMode,
  defaultProvider,
  onSetDefaultProvider,
  groqKey,
  onSaveGroqKey,
  conversationsCount = 0,
  onExportAllData,
  onClearAllHistory,
}) => {
  const { user, userProfile, remainingRequests, requestCount, maxRequests, isLimitReached } =
    useAuth();

  const [activeTab, setActiveTab] = useState<'memory' | 'model' | 'voice' | 'usage' | 'theme' | 'data'>('memory');

  // Memory State
  const [memories, setMemories] = useState<UserMemory[]>([]);
  const [memoryEnabled, setMemoryEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('intelicat_memory_master_toggle') !== 'false';
    } catch {
      return true;
    }
  });
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newCategory, setNewCategory] = useState<'preference' | 'profile' | 'study' | 'general'>('preference');
  const [editingMemoryId, setEditingMemoryId] = useState<string | null>(null);

  // Groq Key Input State
  const [inputGroqKey, setInputGroqKey] = useState(groqKey);
  const [keySaved, setKeySaved] = useState(false);

  // Voice Settings State
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('intelicat_voice_enabled') === 'true';
    } catch {
      return false;
    }
  });
  const [autoSpeak, setAutoSpeak] = useState<boolean>(() => {
    try {
      return localStorage.getItem('intelicat_auto_speak') === 'true';
    } catch {
      return false;
    }
  });
  const [voiceRate, setVoiceRate] = useState<number>(() => {
    try {
      return parseFloat(localStorage.getItem('intelicat_voice_rate') || '1.0');
    } catch {
      return 1.0;
    }
  });
  const [voicePitch, setVoicePitch] = useState<number>(() => {
    try {
      return parseFloat(localStorage.getItem('intelicat_voice_pitch') || '1.0');
    } catch {
      return 1.0;
    }
  });
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>(() => {
    try {
      return localStorage.getItem('intelicat_voice_uri') || '';
    } catch {
      return '';
    }
  });
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    loadUserMemories(user?.uid).then(setMemories);
    setAvailableVoices(getAvailableVoices());
    setInputGroqKey(groqKey);
  }, [isOpen, user?.uid, groqKey]);

  const handleToggleMemoryMaster = () => {
    const next = !memoryEnabled;
    setMemoryEnabled(next);
    try {
      localStorage.setItem('intelicat_memory_master_toggle', String(next));
    } catch {
      // ignore
    }
  };

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim() || !newValue.trim()) return;

    const newMem: UserMemory = {
      id: editingMemoryId || `mem-${Date.now()}`,
      userId: user?.uid || 'anonymous',
      key: newKey.trim(),
      value: newValue.trim(),
      category: newCategory,
      isEnabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveUserMemory(newMem, user?.uid);
    const updated = await loadUserMemories(user?.uid);
    setMemories(updated);
    setNewKey('');
    setNewValue('');
    setEditingMemoryId(null);
  };

  const handleStartEditMemory = (m: UserMemory) => {
    setEditingMemoryId(m.id);
    setNewKey(m.key);
    setNewValue(m.value);
    setNewCategory(m.category || 'preference');
  };

  const handleDeleteMemory = async (id: string) => {
    await deleteUserMemory(id, user?.uid);
    setMemories((prev) => prev.filter((m) => m.id !== id));
  };

  const handleToggleMemory = async (id: string, currentState: boolean) => {
    await toggleMemoryState(id, !currentState, user?.uid);
    setMemories((prev) =>
      prev.map((m) => (m.id === id ? { ...m, isEnabled: !currentState } : m))
    );
  };

  const handleClearMemories = async () => {
    if (window.confirm('Are you sure you want to delete all stored memories?')) {
      await clearAllMemories(user?.uid);
      setMemories([]);
    }
  };

  const handleSaveGroq = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveGroqKey(inputGroqKey.trim());
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 2200);
  };

  const handleSaveVoiceSettings = () => {
    try {
      localStorage.setItem('intelicat_voice_enabled', String(voiceEnabled));
      localStorage.setItem('intelicat_auto_speak', String(autoSpeak));
      localStorage.setItem('intelicat_voice_rate', String(voiceRate));
      localStorage.setItem('intelicat_voice_pitch', String(voicePitch));
      localStorage.setItem('intelicat_voice_uri', selectedVoiceURI);
    } catch {
      // ignore
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-4xl bg-[#0b0b10] border border-white/15 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/40">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-[#EF233C]/20 border border-[#EF233C]/30 text-[#EF233C]">
                <SettingsIcon className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  IntelicatAI <span className="text-[#FF2A3A]">Settings & Control</span>
                </h3>
                <p className="text-[11px] text-neutral-400">
                  Configure memory, voice synthesis, quota optimization, and keys
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-neutral-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 px-6 py-2 border-b border-white/10 bg-black/20 overflow-x-auto text-xs font-semibold">
            <button
              onClick={() => setActiveTab('memory')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all cursor-pointer ${
                activeTab === 'memory'
                  ? 'bg-[#EF233C] text-white shadow-md'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Brain className="w-3.5 h-3.5" />
              <span>User Memory</span>
            </button>

            <button
              onClick={() => setActiveTab('model')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all cursor-pointer ${
                activeTab === 'model'
                  ? 'bg-[#EF233C] text-white shadow-md'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Model & Groq Key</span>
            </button>

            <button
              onClick={() => setActiveTab('voice')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all cursor-pointer ${
                activeTab === 'voice'
                  ? 'bg-[#EF233C] text-white shadow-md'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Voice</span>
            </button>

            <button
              onClick={() => setActiveTab('usage')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all cursor-pointer ${
                activeTab === 'usage'
                  ? 'bg-[#EF233C] text-white shadow-md'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Quota & Usage</span>
            </button>

            <button
              onClick={() => setActiveTab('theme')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all cursor-pointer ${
                activeTab === 'theme'
                  ? 'bg-[#EF233C] text-white shadow-md'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Theme</span>
            </button>

            <button
              onClick={() => setActiveTab('data')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all cursor-pointer ${
                activeTab === 'data'
                  ? 'bg-[#EF233C] text-white shadow-md'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Data</span>
            </button>
          </div>

          {/* Modal Content */}
          <div className="flex-1 overflow-y-auto p-6 text-sm text-neutral-200">
            {/* TAB 1: MEMORY */}
            {activeTab === 'memory' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
                  <div>
                    <h4 className="font-bold text-white flex items-center gap-2">
                      <span>Persistent Memory System</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono">
                        Quota-Optimized
                      </span>
                    </h4>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      IntelicatAI recalls key preferences, tech stack, or grade to personalize future conversations without repeating full history.
                    </p>
                  </div>

                  <button
                    onClick={handleToggleMemoryMaster}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all cursor-pointer text-xs font-bold"
                  >
                    {memoryEnabled ? (
                      <>
                        <ToggleRight className="w-5 h-5 text-emerald-400" />
                        <span className="text-emerald-400">Enabled</span>
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="w-5 h-5 text-neutral-500" />
                        <span className="text-neutral-400">Disabled</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Add / Edit Memory Form */}
                <form onSubmit={handleAddMemory} className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-[#EF233C]" />
                    <span>{editingMemoryId ? 'Edit Memory' : 'Add New Memory'}</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] text-neutral-400 block mb-1">Key / Label</label>
                      <input
                        type="text"
                        value={newKey}
                        onChange={(e) => setNewKey(e.target.value)}
                        placeholder="E.g. Student Grade, Tech Stack"
                        className="w-full rounded-xl bg-neutral-900 border border-white/15 px-3 py-2 text-xs text-white focus:outline-none focus:border-[#EF233C]"
                        required
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-[11px] text-neutral-400 block mb-1">Memory Content</label>
                      <input
                        type="text"
                        value={newValue}
                        onChange={(e) => setNewValue(e.target.value)}
                        placeholder="E.g. Class 7 student, prefers TypeScript and React"
                        className="w-full rounded-xl bg-neutral-900 border border-white/15 px-3 py-2 text-xs text-white focus:outline-none focus:border-[#EF233C]"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-neutral-400">Category:</span>
                      <select
                        value={newCategory}
                        onChange={(e: any) => setNewCategory(e.target.value)}
                        className="rounded-lg bg-neutral-900 border border-white/15 px-2 py-1 text-xs text-neutral-200"
                      >
                        <option value="preference">Preference</option>
                        <option value="profile">Profile</option>
                        <option value="study">Study</option>
                        <option value="general">General</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      {editingMemoryId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingMemoryId(null);
                            setNewKey('');
                            setNewValue('');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-white/10 text-neutral-300 text-xs cursor-pointer"
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        type="submit"
                        className="px-3.5 py-1.5 rounded-lg bg-[#EF233C] hover:bg-[#d90429] text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                      >
                        {editingMemoryId ? 'Update Memory' : 'Save Memory'}
                      </button>
                    </div>
                  </div>
                </form>

                {/* Stored Memories List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-neutral-400">
                    <span>Stored Memories ({memories.length})</span>
                    {memories.length > 0 && (
                      <button
                        onClick={handleClearMemories}
                        className="text-red-400 hover:underline cursor-pointer normal-case text-xs"
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  {memories.map((m) => (
                    <div
                      key={m.id}
                      className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-start gap-2.5">
                        <button
                          onClick={() => handleToggleMemory(m.id, m.isEnabled)}
                          className="cursor-pointer mt-0.5"
                          title={m.isEnabled ? 'Disable memory' : 'Enable memory'}
                        >
                          {m.isEnabled ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border border-neutral-600" />
                          )}
                        </button>

                        <div>
                          <div className="font-bold text-white flex items-center gap-2">
                            <span>{m.key}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/10 text-neutral-400">
                              {m.category || 'general'}
                            </span>
                          </div>
                          <p className="text-neutral-300 mt-0.5">{m.value}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleStartEditMemory(m)}
                          className="p-1.5 hover:text-white text-neutral-400 hover:bg-white/10 rounded-lg cursor-pointer"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteMemory(m.id)}
                          className="p-1.5 hover:text-red-400 text-neutral-400 hover:bg-white/10 rounded-lg cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {memories.length === 0 && (
                    <div className="text-center py-6 text-neutral-500 text-xs">
                      No memories stored yet. Add memories above or let IntelicatAI record key facts automatically.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: MODEL & GROQ KEY */}
            {activeTab === 'model' && (
              <div className="space-y-6">
                {/* Groq Key Configuration */}
                <form onSubmit={handleSaveGroq} className="p-5 rounded-2xl bg-black/40 border border-white/10 space-y-3">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-amber-400" />
                    <h4 className="font-bold text-white text-sm">Groq API Key (Unlimited Fast Chat)</h4>
                  </div>
                  <p className="text-xs text-neutral-400">
                    Enter your personal Groq key from <a href="https://console.groq.com" target="_blank" rel="noreferrer" className="text-[#EF233C] underline">console.groq.com</a>. This enables ultra-fast LPU inference (Llama 3.3 70B & Llama 3.1 8B) with ZERO Gemini quota usage!
                  </p>

                  <div className="flex items-center gap-2">
                    <input
                      type="password"
                      value={inputGroqKey}
                      onChange={(e) => setInputGroqKey(e.target.value)}
                      placeholder="gsk_..."
                      className="flex-1 rounded-xl bg-neutral-900 border border-white/15 px-3 py-2 text-xs text-white focus:outline-none focus:border-[#EF233C] font-mono"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-[#EF233C] hover:bg-[#d90429] text-white text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                    >
                      {keySaved ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Saved!</span>
                        </>
                      ) : (
                        <span>Save Key</span>
                      )}
                    </button>
                  </div>
                </form>

                {/* Default Mode Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 block">
                    Default Chat Mode on Launch
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    {(
                      [
                        { id: 'normal', label: 'Normal Talk' },
                        { id: 'fast', label: 'Fast (Groq LPU)' },
                        { id: 'coding', label: 'Cat Code 🐾' },
                        { id: 'study', label: 'Study Tutor' },
                        { id: 'deep-think', label: 'Deep Think' },
                        { id: 'search', label: 'Web Search' },
                      ] as const
                    ).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => onSetDefaultMode(m.id as any)}
                        className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                          defaultMode === m.id
                            ? 'bg-[#EF233C] border-[#EF233C] text-white font-bold'
                            : 'bg-white/5 border-white/10 text-neutral-300 hover:text-white'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Default Provider Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 block">
                    Preferred AI Engine
                  </label>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => onSetDefaultProvider('auto')}
                      className={`p-3 rounded-xl border text-center cursor-pointer transition-all ${
                        defaultProvider === 'auto'
                          ? 'bg-[#EF233C] border-[#EF233C] text-white font-bold'
                          : 'bg-white/5 border-white/10 text-neutral-300 hover:text-white'
                      }`}
                    >
                      <div className="font-bold">Auto (Recommended)</div>
                      <div className="text-[10px] text-neutral-300 opacity-80 mt-0.5">Saves Gemini quota</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => onSetDefaultProvider('groq')}
                      className={`p-3 rounded-xl border text-center cursor-pointer transition-all ${
                        defaultProvider === 'groq'
                          ? 'bg-[#EF233C] border-[#EF233C] text-white font-bold'
                          : 'bg-white/5 border-white/10 text-neutral-300 hover:text-white'
                      }`}
                    >
                      <div className="font-bold">Groq LPU ⚡</div>
                      <div className="text-[10px] text-neutral-300 opacity-80 mt-0.5">Zero Gemini tokens</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => onSetDefaultProvider('gemini')}
                      className={`p-3 rounded-xl border text-center cursor-pointer transition-all ${
                        defaultProvider === 'gemini'
                          ? 'bg-[#EF233C] border-[#EF233C] text-white font-bold'
                          : 'bg-white/5 border-white/10 text-neutral-300 hover:text-white'
                      }`}
                    >
                      <div className="font-bold">Google Gemini ✨</div>
                      <div className="text-[10px] text-neutral-300 opacity-80 mt-0.5">Vision & Search Grounding</div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: VOICE */}
            {activeTab === 'voice' && (
              <div className="space-y-5">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-white text-sm">Browser Speech Capabilities</h4>
                    <p className="text-xs text-neutral-400">
                      Operates 100% locally with SpeechSynthesis and Web Speech API. Zero API tokens consumed!
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      const next = !voiceEnabled;
                      setVoiceEnabled(next);
                      handleSaveVoiceSettings();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer"
                  >
                    {voiceEnabled ? (
                      <>
                        <ToggleRight className="w-5 h-5 text-emerald-400" />
                        <span className="text-emerald-400">Enabled</span>
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="w-5 h-5 text-neutral-500" />
                        <span className="text-neutral-400">Disabled</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="space-y-4 bg-black/40 border border-white/10 rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white text-xs">Auto-Speak Responses</div>
                      <div className="text-[11px] text-neutral-400">Automatically read incoming assistant answers aloud</div>
                    </div>
                    <button
                      onClick={() => {
                        const next = !autoSpeak;
                        setAutoSpeak(next);
                        handleSaveVoiceSettings();
                      }}
                      className="cursor-pointer"
                    >
                      {autoSpeak ? <ToggleRight className="w-5 h-5 text-emerald-400" /> : <ToggleLeft className="w-5 h-5 text-neutral-500" />}
                    </button>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs text-neutral-300 mb-1">
                      <span>Speaking Speed: {voiceRate}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={voiceRate}
                      onChange={(e) => {
                        setVoiceRate(parseFloat(e.target.value));
                        handleSaveVoiceSettings();
                      }}
                      className="w-full accent-[#EF233C]"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs text-neutral-300 mb-1">
                      <span>Voice Pitch: {voicePitch}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="1.5"
                      step="0.1"
                      value={voicePitch}
                      onChange={(e) => {
                        setVoicePitch(parseFloat(e.target.value));
                        handleSaveVoiceSettings();
                      }}
                      className="w-full accent-[#EF233C]"
                    />
                  </div>

                  {availableVoices.length > 0 && (
                    <div>
                      <label className="text-xs font-bold text-neutral-300 block mb-1">
                        Select Speech Voice
                      </label>
                      <select
                        value={selectedVoiceURI}
                        onChange={(e) => {
                          setSelectedVoiceURI(e.target.value);
                          handleSaveVoiceSettings();
                        }}
                        className="w-full rounded-xl bg-neutral-900 border border-white/15 px-3 py-2 text-xs text-white"
                      >
                        <option value="">Default Browser Voice</option>
                        {availableVoices.map((v) => (
                          <option key={v.voiceURI} value={v.voiceURI}>
                            {v.name} ({v.lang})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: QUOTA & USAGE */}
            {activeTab === 'usage' && (
              <div className="space-y-5">
                <div className="p-5 rounded-2xl bg-black/40 border border-white/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">
                        Current Account Tier
                      </span>
                      <h4 className="text-base font-bold text-white capitalize flex items-center gap-2">
                        <span>{userProfile?.tier || 'Free Explorer'} Tier</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono">
                          Limit Enforced
                        </span>
                      </h4>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">
                        Remaining Queries
                      </span>
                      <div className="text-lg font-black text-[#EF233C]">
                        {remainingRequests} / {maxRequests}
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-[#EF233C] transition-all duration-300"
                      style={{
                        width: `${Math.min(100, (requestCount / (maxRequests || 1)) * 100)}%`,
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-neutral-400">
                    <span>Used: {requestCount} requests</span>
                    <span>Max Allowed: {maxRequests} requests</span>
                  </div>
                </div>

                {/* Quota-Saving Tips */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" />
                    <span>How To Keep Your API Quota Healthy</span>
                  </h4>
                  <ul className="text-xs text-neutral-300 space-y-1.5 list-disc pl-4 leading-relaxed">
                    <li>Use <strong>Fast Mode (Groq LPU)</strong>: runs on Llama 3.3 and consumes <strong>ZERO Gemini quota</strong>!</li>
                    <li>Add your free Groq API key in the Model tab for unlimited fast conversations.</li>
                    <li>Use <strong>Image Studio</strong> for illustrations — it uses an independent visual engine with no Gemini quota burn.</li>
                    <li>File Chat automatically extracts compact relevant excerpts to avoid sending huge documents repeatedly.</li>
                  </ul>
                </div>
              </div>
            )}

            {/* TAB 5: THEME & BACKDROP */}
            {activeTab === 'theme' && (
              <div className="space-y-4">
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 block">
                  Cybernetic Robot Background Preset
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'vivid', label: 'Vivid Mode', desc: 'Balanced clarity showing both artwork and UI' },
                    { id: 'cinema', label: 'Cinema Glow', desc: 'Maximum illumination for ambient atmosphere' },
                    { id: 'balanced', label: 'Focus Dark', desc: 'Higher contrast stealth dark background' },
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => onSetRobotMode(preset.id as any)}
                      className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all ${
                        robotMode === preset.id
                          ? 'bg-[#EF233C] border-[#EF233C] text-white font-bold shadow-lg'
                          : 'bg-white/5 border-white/10 text-neutral-300 hover:text-white'
                      }`}
                    >
                      <div className="text-xs font-bold">{preset.label}</div>
                      <div className="text-[10px] text-neutral-300 opacity-80 mt-1">{preset.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 6: DATA */}
            {activeTab === 'data' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-white text-xs">Export Conversations</h4>
                    <p className="text-[11px] text-neutral-400">Download your chat history as JSON or Markdown file</p>
                  </div>
                  <button
                    onClick={onExportAllData}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export</span>
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-red-950/20 border border-red-500/30 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-red-300 text-xs">Clear Local Data</h4>
                    <p className="text-[11px] text-neutral-400">Remove local cached messages and reset local state</p>
                  </div>
                  <button
                    onClick={onClearAllHistory}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-semibold transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Data</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
