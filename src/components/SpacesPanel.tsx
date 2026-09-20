import React, { useState, useEffect } from 'react';
import {
  FolderKanban,
  Plus,
  Trash2,
  Edit3,
  Save,
  FileText,
  Sparkles,
  CheckCircle2,
  BookOpen,
  Code,
  GraduationCap,
  Briefcase,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { ProjectSpace } from '../types';
import {
  loadUserSpaces,
  saveUserSpace,
  deleteUserSpace,
} from '../lib/spaceService';

interface SpacesPanelProps {
  userId?: string;
  activeSpace: ProjectSpace | null;
  onSelectSpace: (space: ProjectSpace | null) => void;
  onLaunchSpaceChat: (space: ProjectSpace) => void;
}

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

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadUserSpaces(userId).then((list) => {
      setSpaces(list);
      if (!activeSpace && list.length > 0) {
        onSelectSpace(list[0]);
      }
    });
  }, [userId]);

  const handleStartCreate = () => {
    setIsCreating(true);
    setEditingSpace(null);
    setTitle('');
    setDescription('');
    setCustomInstructions('');
    setNotes('');
  };

  const handleStartEdit = (space: ProjectSpace) => {
    setEditingSpace(space);
    setIsCreating(false);
    setTitle(space.title);
    setDescription(space.description || '');
    setCustomInstructions(space.customInstructions || '');
    setNotes(space.notes || '');
  };

  const handleSaveSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newSpace: ProjectSpace = {
      id: editingSpace?.id || `space-${Date.now()}`,
      userId: userId || 'anonymous',
      title: title.trim(),
      description: description.trim(),
      customInstructions: customInstructions.trim(),
      notes: notes.trim(),
      createdAt: editingSpace?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveUserSpace(newSpace, userId);
    const updated = await loadUserSpaces(userId);
    setSpaces(updated);
    onSelectSpace(newSpace);
    setIsCreating(false);
    setEditingSpace(null);
  };

  const handleDelete = async (spaceId: string) => {
    await deleteUserSpace(spaceId, userId);
    const updated = await loadUserSpaces(userId);
    setSpaces(updated);
    if (activeSpace?.id === spaceId) {
      onSelectSpace(updated.length > 0 ? updated[0] : null);
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

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto px-4 sm:px-8 py-6 text-white space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-[#EF233C]/20 border border-[#EF233C]/30 text-[#EF233C]">
              <FolderKanban className="w-5 h-5" />
            </span>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              IntelicatAI <span className="text-[#FF2A3A]">Spaces</span>
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-neutral-400">
            Dedicated project workspaces with isolated instructions, persistent notes, and tailored context.
          </p>
        </div>

        <button
          onClick={handleStartCreate}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#EF233C] hover:bg-[#d90429] text-white text-xs font-bold shadow-md transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Space</span>
        </button>
      </div>

      {/* Main Spaces Layout: Left Space Selector, Right Workspace details & Notes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Spaces List */}
        <div className="lg:col-span-4 space-y-3 bg-black/60 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 px-1">
            Your Project Spaces ({spaces.length})
          </h3>

          <div className="space-y-2">
            {spaces.map((sp) => {
              const isActive = activeSpace?.id === sp.id;
              return (
                <div
                  key={sp.id}
                  onClick={() => {
                    onSelectSpace(sp);
                    setNotes(sp.notes || '');
                  }}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer relative group ${
                    isActive
                      ? 'bg-[#EF233C]/15 border-[#EF233C] text-white shadow-md'
                      : 'bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      <FolderKanban className={`w-4 h-4 ${isActive ? 'text-[#EF233C]' : 'text-neutral-400'}`} />
                      <span>{sp.title}</span>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartEdit(sp);
                        }}
                        className="p-1 hover:text-white text-neutral-400 cursor-pointer"
                        title="Edit Space"
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

                  {isActive && (
                    <div className="mt-2.5 pt-2 border-t border-[#EF233C]/20 flex items-center justify-between text-[10px] text-[#EF233C] font-semibold">
                      <span>● Active in Chat</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onLaunchSpaceChat(sp);
                        }}
                        className="hover:underline flex items-center gap-0.5"
                      >
                        <span>Open Chat</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {spaces.length === 0 && (
              <div className="text-center py-8 text-neutral-500 text-xs">
                No project spaces created yet. Click "New Space" above to start!
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Space Details, Form, or Scratchpad */}
        <div className="lg:col-span-8 space-y-5">
          {isCreating || editingSpace ? (
            <div className="bg-black/70 border border-white/15 rounded-2xl p-6 backdrop-blur-md shadow-2xl space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-[#EF233C]" />
                <span>{isCreating ? 'Create New Project Space' : `Edit: ${editingSpace?.title}`}</span>
              </h3>

              <form onSubmit={handleSaveSpace} className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-300 block mb-1">
                    Space Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="E.g. Class 7 Math & Science, or Rust Engine..."
                    className="w-full rounded-xl bg-neutral-900 border border-white/15 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#EF233C]"
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
                    placeholder="Short summary of this workspace's purpose"
                    className="w-full rounded-xl bg-neutral-900 border border-white/15 px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#EF233C]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-300 block mb-1">
                    Custom AI System Instructions
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
                    Notes & Documentation Scratchpad
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
                    className="px-4 py-2 rounded-xl bg-[#EF233C] hover:bg-[#d90429] text-white text-xs font-bold shadow-md transition-all cursor-pointer"
                  >
                    Save Project Space
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreating(false);
                      setEditingSpace(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-neutral-300 text-xs font-semibold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          ) : activeSpace ? (
            <div className="bg-black/60 border border-white/15 rounded-2xl p-6 backdrop-blur-md shadow-2xl space-y-5">
              {/* Space Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <FolderKanban className="w-5 h-5 text-[#EF233C]" />
                    <span>{activeSpace.title}</span>
                  </h3>
                  {activeSpace.description && (
                    <p className="text-xs text-neutral-400 mt-1">{activeSpace.description}</p>
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
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#EF233C]">
                    Space Instructions (Active in LLM Prompts)
                  </span>
                  <p className="text-xs text-neutral-200 leading-relaxed">
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
                  placeholder="Record your equations, research notes, prompt templates, or project links here..."
                  className="w-full rounded-xl bg-neutral-900/90 border border-white/15 p-3.5 text-xs sm:text-sm text-neutral-200 font-mono focus:outline-none focus:border-[#EF233C] leading-relaxed resize-y"
                />
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-neutral-500 text-xs">
              Select or create a space to view workspace details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
