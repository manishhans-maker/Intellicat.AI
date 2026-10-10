import React, { useState, useEffect, useRef } from 'react';
import {
  FolderKanban,
  Plus,
  Trash2,
  Edit3,
  Save,
  FileText,
  Sparkles,
  CheckCircle2,
  Code,
  GraduationCap,
  Layers,
  ArrowRight,
  RotateCcw,
  BookOpen,
  Brain,
  Rocket,
  Terminal,
  Cpu,
  AlertCircle,
  Loader2,
  X,
} from 'lucide-react';
import { ProjectSpace } from '../types';
import {
  loadUserSpaces,
  saveUserSpace,
  deleteUserSpace,
  resetDefaultSpaces,
} from '../lib/spaceService';

interface SpacesPanelProps {
  userId?: string;
  activeSpace: ProjectSpace | null;
  onSelectSpace: (space: ProjectSpace | null) => void;
  onLaunchSpaceChat: (space: ProjectSpace) => void;
}

const PRESET_TEMPLATES = [
  {
    title: 'Class 7 STEM & Math Hub',
    description: 'Homework, science concepts, math formulas, and step-by-step problem solving.',
    icon: 'GraduationCap',
    customInstructions: 'Act as an encouraging tutor for Class 7 students. Break down math and science questions step-by-step with clear formulas, real-world examples, and practice tips.',
    notes: '# Class 7 Curriculum Goals\n- Master Fractions & Algebraic Expressions\n- Science: Photosynthesis and Motion & Time\n- Prepare for weekly practice quizzes',
  },
  {
    title: 'Full-Stack Architecture & TypeScript',
    description: 'System design, TypeScript/React components, Express servers, and database optimization.',
    icon: 'Code',
    customInstructions: 'Focus on production-grade TypeScript, robust error handling, minimal latency, modular component structure, and clean architecture.',
    notes: '# Architecture Notes\n- Keep API calls minimal, cached, and idempotent\n- Stream AI responses using Server-Sent Events (SSE)\n- Modular component design with clean types',
  },
  {
    title: 'Cyber Cat Coder Prototyping',
    description: 'Rapid prototyping, creative algorithms, and interactive UI components.',
    icon: 'Sparkles',
    customInstructions: 'Respond as the Cyber Cat Coder: enthusiastic, sharp, delivering clean copy-paste code with playful tech humor.',
    notes: '# Cyber Cat Scratchpad\n- Mission: Craft lightning-fast, visually striking web tools\n- Key stack: React, Vite, Tailwind CSS, Lucide icons',
  },
  {
    title: 'Exam Preparation & Flashcards',
    description: 'Rapid question-answer drills, key formulas, and memory retention techniques.',
    icon: 'Brain',
    customInstructions: 'Help the user memorize key concepts through active recall, concise summaries, flashcard generation, and mock test questions.',
    notes: '# Exam Target\n- Key definitions and theorems\n- Formulas to memorize\n- Practice questions and weak spots to review',
  },
];

export const SpacesPanel: React.FC<SpacesPanelProps> = ({
  userId,
  activeSpace,
  onSelectSpace,
  onLaunchSpaceChat,
}) => {
  const [spaces, setSpaces] = useState<ProjectSpace[]>([]);
  const [editingSpace, setEditingSpace] = useState<ProjectSpace | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [notesSaveSuccess, setNotesSaveSuccess] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  // Form fields & feedback
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('FolderKanban');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);

  const formContainerRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadUserSpaces(userId).then((list) => {
      setSpaces(list);
      if (list.length > 0) {
        if (!activeSpace || !list.some((s) => s.id === activeSpace.id)) {
          onSelectSpace(list[0]);
          setNotes(list[0].notes || '');
        } else {
          setNotes(activeSpace.notes || '');
        }
      }
    });
  }, [userId]);

  useEffect(() => {
    if (activeSpace && !isCreating && !editingSpace) {
      setNotes(activeSpace.notes || '');
    }
  }, [activeSpace?.id]);

  const handleStartCreate = () => {
    setIsCreating(true);
    setEditingSpace(null);
    setTitle('');
    setDescription('');
    setCustomInstructions('');
    setNotes('');
    setSelectedIcon('FolderKanban');
    setFormError(null);
    setTimeout(() => {
      formContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      titleInputRef.current?.focus();
    }, 60);
  };

  const handleApplyPreset = (template: typeof PRESET_TEMPLATES[0]) => {
    setIsCreating(true);
    setEditingSpace(null);
    setTitle(template.title);
    setDescription(template.description);
    setCustomInstructions(template.customInstructions);
    setNotes(template.notes);
    setSelectedIcon(template.icon);
    setFormError(null);
    setTimeout(() => {
      formContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      titleInputRef.current?.focus();
    }, 60);
  };

  const handleStartEdit = (space: ProjectSpace) => {
    setEditingSpace(space);
    setIsCreating(false);
    setTitle(space.title);
    setDescription(space.description || '');
    setCustomInstructions(space.customInstructions || '');
    setNotes(space.notes || '');
    setSelectedIcon(space.icon || 'FolderKanban');
    setFormError(null);
    setTimeout(() => {
      formContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      titleInputRef.current?.focus();
    }, 60);
  };

  const handleSaveSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setFormError('Please enter a space title (e.g. "Physics 101" or "Full-Stack Project").');
      titleInputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const spacePayload: Partial<ProjectSpace> = {
        id: editingSpace?.id || `space-${Date.now()}`,
        userId: userId || 'anonymous',
        title: cleanTitle,
        description: description.trim(),
        icon: selectedIcon,
        customInstructions: customInstructions.trim(),
        notes: notes.trim(),
        createdAt: editingSpace?.createdAt || new Date().toISOString(),
      };

      const saved = await saveUserSpace(spacePayload, userId);
      const updated = await loadUserSpaces(userId);
      setSpaces(updated);
      onSelectSpace(saved);
      setNotes(saved.notes || '');
      setIsCreating(false);
      setEditingSpace(null);
      setFeedbackSuccess(
        editingSpace ? `Updated space "${saved.title}"` : `Created & activated space "${saved.title}"!`
      );
      setTimeout(() => setFeedbackSuccess(null), 3000);
    } catch (err: any) {
      console.error('Failed to save space:', err);
      setFormError(err?.message || 'Could not save space. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (spaceId: string) => {
    if (spaces.length <= 1) {
      if (!window.confirm('This is your last space. Are you sure you want to delete it?')) return;
    }
    await deleteUserSpace(spaceId, userId);
    const updated = await loadUserSpaces(userId);
    setSpaces(updated);
    if (activeSpace?.id === spaceId) {
      const nextActive = updated.length > 0 ? updated[0] : null;
      onSelectSpace(nextActive);
      setNotes(nextActive?.notes || '');
    }
  };

  const handleResetDefaults = async () => {
    if (window.confirm('Reset project spaces to official IntellicatAI default templates?')) {
      const defaults = await resetDefaultSpaces(userId);
      setSpaces(defaults);
      onSelectSpace(defaults[0]);
      setNotes(defaults[0].notes || '');
      setIsCreating(false);
      setEditingSpace(null);
    }
  };

  const handleQuickSaveNotes = async () => {
    if (!activeSpace) return;
    const updated: ProjectSpace = {
      ...activeSpace,
      notes,
      updatedAt: new Date().toISOString(),
    };
    await saveUserSpace(updated, userId);
    onSelectSpace(updated);
    setNotesSaveSuccess(true);
    setTimeout(() => setNotesSaveSuccess(false), 2000);
  };

  const getSpaceIcon = (iconName?: string) => {
    switch (iconName) {
      case 'GraduationCap':
        return <GraduationCap className="w-4 h-4 text-amber-400" />;
      case 'Code':
        return <Code className="w-4 h-4 text-emerald-400" />;
      case 'Sparkles':
        return <Sparkles className="w-4 h-4 text-[#EF233C]" />;
      case 'Brain':
        return <Brain className="w-4 h-4 text-purple-400" />;
      case 'Rocket':
        return <Rocket className="w-4 h-4 text-sky-400" />;
      case 'Terminal':
        return <Terminal className="w-4 h-4 text-green-400" />;
      default:
        return <FolderKanban className="w-4 h-4 text-neutral-400" />;
    }
  };

  const filteredSpaces = spaces.filter((sp) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      sp.title.toLowerCase().includes(q) ||
      (sp.description && sp.description.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto px-3 sm:px-6 py-4 text-white space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-[#EF233C]/20 border border-[#EF233C]/30 text-[#EF233C]">
              <FolderKanban className="w-5 h-5" />
            </span>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              IntellicatAI <span className="text-[#FF2A3A]">Spaces</span>
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
              Active Context
            </span>
          </div>
          <p className="text-xs text-neutral-400">
            Isolated project environments with dedicated system instructions, persistent scratchpad notes, and instant AI chat integration.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white text-xs font-medium border border-white/10 transition-all cursor-pointer"
            title="Restore default pre-configured spaces"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Templates</span>
          </button>

          <button
            onClick={handleStartCreate}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#EF233C] hover:bg-[#d90429] text-white text-xs font-bold shadow-lg shadow-red-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Space</span>
          </button>
        </div>
      </div>

      {/* Success notification banner */}
      {feedbackSuccess && (
        <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between animate-in fade-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{feedbackSuccess}</span>
          </div>
          <button
            onClick={() => setFeedbackSuccess(null)}
            className="text-emerald-400 hover:text-white p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Preset Starters Quick-Picker Strip */}
      <div className="p-3.5 rounded-2xl bg-black/60 border border-white/10 backdrop-blur-md">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Quick Starter Templates</span>
          </h4>
          <span className="text-[10px] text-neutral-500 font-mono">1-Click Auto-Fill</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {PRESET_TEMPLATES.map((tmpl, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleApplyPreset(tmpl)}
              className="p-2.5 text-left rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#EF233C]/50 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-1.5 font-bold text-xs text-white group-hover:text-[#EF233C]">
                {getSpaceIcon(tmpl.icon)}
                <span className="truncate">{tmpl.title}</span>
              </div>
              <p className="text-[10px] text-neutral-400 mt-0.5 line-clamp-1">
                {tmpl.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Main Spaces Layout: Left Space Selector, Right Workspace details & Notes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Spaces List */}
        <div className="lg:col-span-4 space-y-3 bg-black/60 border border-white/10 rounded-2xl p-3.5 backdrop-blur-md">
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                Your Spaces ({spaces.length})
              </h3>
              <span className="text-[10px] text-neutral-500 font-mono">
                Auto-synced
              </span>
            </div>

            <button
              onClick={handleStartCreate}
              type="button"
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#EF233C]/20 hover:bg-[#EF233C]/30 text-[#EF233C] hover:text-white border border-[#EF233C]/30 text-[10px] font-bold transition-all cursor-pointer"
              title="Add a new space"
            >
              <Plus className="w-3 h-3" />
              <span>Add</span>
            </button>
          </div>

          {/* Search bar if multiple spaces */}
          {spaces.length > 2 && (
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search spaces..."
              className="w-full px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#EF233C]"
            />
          )}

          <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1 scrollbar-thin">
            {filteredSpaces.map((sp) => {
              const isActive = activeSpace?.id === sp.id;
              return (
                <div
                  key={sp.id}
                  onClick={() => {
                    onSelectSpace(sp);
                    setNotes(sp.notes || '');
                    if (isCreating || editingSpace) {
                      setIsCreating(false);
                      setEditingSpace(null);
                    }
                  }}
                  className={`p-3 rounded-xl border transition-all cursor-pointer relative group ${
                    isActive
                      ? 'bg-[#EF233C]/15 border-[#EF233C] text-white shadow-md'
                      : 'bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 font-bold text-xs sm:text-sm">
                      {getSpaceIcon(sp.icon)}
                      <span className="truncate">{sp.title}</span>
                    </div>

                    <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartEdit(sp);
                        }}
                        className="p-1 hover:text-white text-neutral-400 cursor-pointer"
                        title="Edit Space Settings"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(sp.id);
                        }}
                        className="p-1 hover:text-red-400 text-neutral-400 cursor-pointer"
                        title="Delete Space"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {sp.description && (
                    <p className="text-[11px] text-neutral-400 mt-1 line-clamp-2">
                      {sp.description}
                    </p>
                  )}

                  <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[10px]">
                    <span className={isActive ? 'text-[#EF233C] font-semibold' : 'text-neutral-500'}>
                      {isActive ? '● Active in Chat' : 'Click to activate'}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectSpace(sp);
                        onLaunchSpaceChat(sp);
                      }}
                      className="text-[#EF233C] hover:underline flex items-center gap-0.5 font-semibold cursor-pointer"
                    >
                      <span>Chat</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}

            {spaces.length === 0 && (
              <div className="text-center py-8 text-neutral-500 text-xs">
                No project spaces yet. Click "+ New Space" above to get started!
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Space Details, Form, or Scratchpad */}
        <div ref={formContainerRef} className="lg:col-span-8 space-y-4">
          {isCreating || editingSpace ? (
            <div className="bg-black/75 border border-white/20 rounded-2xl p-5 sm:p-6 backdrop-blur-xl shadow-2xl space-y-4 ring-1 ring-[#EF233C]/30">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-[#EF233C]" />
                  <span>{isCreating ? 'Create New Project Space' : `Edit: ${editingSpace?.title}`}</span>
                </h3>

                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-neutral-400">Icon:</span>
                  {(['FolderKanban', 'GraduationCap', 'Code', 'Sparkles', 'Brain', 'Rocket', 'Terminal'] as const).map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setSelectedIcon(ic)}
                      className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                        selectedIcon === ic
                          ? 'bg-[#EF233C]/20 border-[#EF233C] text-white ring-1 ring-[#EF233C]'
                          : 'bg-white/5 border-white/10 text-neutral-400 hover:text-white'
                      }`}
                      title={ic}
                    >
                      {getSpaceIcon(ic)}
                    </button>
                  ))}
                </div>
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-red-950/70 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSaveSpace} className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-300 block mb-1">
                    Space Title <span className="text-[#EF233C]">*</span>
                  </label>
                  <input
                    ref={titleInputRef}
                    type="text"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      if (formError) setFormError(null);
                    }}
                    placeholder="E.g. Class 7 Math & Science, or Rust Engine..."
                    className="w-full rounded-xl bg-neutral-900 border border-white/20 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#EF233C] focus:ring-1 focus:ring-[#EF233C]"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-300 block mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Short summary of this workspace's goals"
                    className="w-full rounded-xl bg-neutral-900 border border-white/15 px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-[#EF233C]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-300 block mb-1 flex items-center justify-between">
                    <span>Custom AI System Instructions</span>
                    <span className="text-[10px] text-amber-400 font-normal lowercase">Injected into LLM prompts</span>
                  </label>
                  <textarea
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    rows={3}
                    placeholder="E.g. Always respond as an encouraging tutor for Class 7 students. Break down math problems with formula definitions."
                    className="w-full rounded-xl bg-neutral-900 border border-white/15 px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-[#EF233C] resize-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-300 block mb-1">
                    Initial Scratchpad Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    placeholder="Persistent notes, equations, code snippets, or reference links for this space..."
                    className="w-full rounded-xl bg-neutral-900 border border-white/15 px-3.5 py-2 text-xs sm:text-sm text-white font-mono focus:outline-none focus:border-[#EF233C] resize-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#EF233C] hover:bg-[#d90429] disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-red-500/30 transition-all cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving Space...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>{isCreating ? 'Create & Activate Space' : 'Update Space'}</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreating(false);
                      setEditingSpace(null);
                      setFormError(null);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-neutral-300 text-xs font-semibold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          ) : activeSpace ? (
            <div className="bg-black/60 border border-white/15 rounded-2xl p-5 backdrop-blur-md shadow-2xl space-y-4">
              {/* Space Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                <div>
                  <div className="flex items-center gap-2">
                    {getSpaceIcon(activeSpace.icon)}
                    <h3 className="text-base sm:text-lg font-bold text-white">
                      {activeSpace.title}
                    </h3>
                  </div>
                  {activeSpace.description && (
                    <p className="text-xs text-neutral-400 mt-0.5">{activeSpace.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleStartEdit(activeSpace)}
                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-neutral-200 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Space</span>
                  </button>

                  <button
                    onClick={() => onLaunchSpaceChat(activeSpace)}
                    className="px-3.5 py-1.5 rounded-lg bg-[#EF233C] hover:bg-[#d90429] text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Chat in this Space</span>
                  </button>
                </div>
              </div>

              {/* Instructions preview */}
              {activeSpace.customInstructions && (
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#EF233C] flex items-center gap-1">
                      <Cpu className="w-3 h-3" />
                      <span>Custom AI Persona & Space Rules</span>
                    </span>
                    <button
                      onClick={() => handleStartEdit(activeSpace)}
                      className="text-[10px] text-neutral-400 hover:text-white underline cursor-pointer"
                    >
                      Edit rules
                    </button>
                  </div>
                  <p className="text-xs text-neutral-200 leading-relaxed font-sans">
                    {activeSpace.customInstructions}
                  </p>
                </div>
              )}

              {/* Scratchpad Notes */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-amber-400" />
                    <span>Scratchpad & Working Notes</span>
                  </label>

                  <button
                    onClick={handleQuickSaveNotes}
                    className="flex items-center gap-1 text-[11px] text-[#EF233C] hover:underline font-semibold cursor-pointer"
                  >
                    {notesSaveSuccess ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Notes Saved!</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>Save Notes</span>
                      </>
                    )}
                  </button>
                </div>

                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={8}
                  placeholder="Record your equations, formulas, prompt templates, or project links here..."
                  className="w-full rounded-xl bg-neutral-900/90 border border-white/15 p-3.5 text-xs sm:text-sm text-neutral-200 font-mono focus:outline-none focus:border-[#EF233C] leading-relaxed resize-y"
                />
                <div className="flex items-center justify-between text-[11px] text-neutral-500 px-1">
                  <span>Changes are saved locally and synced to your cloud account.</span>
                  <span>{notes.length} characters</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-neutral-500 text-sm bg-black/40 border border-white/5 rounded-2xl">
              <p>Select a space on the left or create a new one to begin.</p>
              <button
                onClick={handleStartCreate}
                className="mt-3 px-4 py-2 rounded-xl bg-[#EF233C] hover:bg-[#d90429] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Space</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
