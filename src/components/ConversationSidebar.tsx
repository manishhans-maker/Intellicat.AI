import React, { useState } from 'react';
import {
  Plus,
  Search,
  Pin,
  Trash2,
  Edit2,
  Archive,
  ArchiveRestore,
  MessageSquare,
  Cat,
  X,
  Check,
  Zap,
  Sparkles,
} from 'lucide-react';
import { Conversation, ChatMode } from '../types';

interface ConversationSidebarProps {
  isOpen: boolean;
  onCloseMobile: () => void;
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: (mode?: ChatMode) => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onDeleteConversation: (id: string) => void;
  onTogglePin: (id: string, currentPinned: boolean) => void;
  onToggleArchive: (id: string, currentArchived: boolean) => void;
}

export const ConversationSidebar: React.FC<ConversationSidebarProps> = ({
  isOpen,
  onCloseMobile,
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onRenameConversation,
  onDeleteConversation,
  onTogglePin,
  onToggleArchive,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const filteredConversations = conversations.filter((c) => {
    const matchesTab = activeTab === 'archived' ? Boolean(c.isArchived) : !c.isArchived;
    if (!matchesTab) return false;
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      c.title.toLowerCase().includes(query) ||
      (c.lastMessagePreview && c.lastMessagePreview.toLowerCase().includes(query))
    );
  });

  const pinnedConversations = filteredConversations.filter((c) => c.isPinned);
  const unpinnedConversations = filteredConversations.filter((c) => !c.isPinned);

  const startEditing = (c: Conversation) => {
    setEditingId(c.id);
    setEditTitle(c.title);
  };

  const handleSaveRename = (id: string) => {
    if (editTitle.trim()) {
      onRenameConversation(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const renderConversationItem = (c: Conversation) => {
    const isActive = c.id === activeConversationId;
    const isEditing = c.id === editingId;

    return (
      <div
        key={c.id}
        className={`group relative flex items-center justify-between p-2.5 rounded-xl text-xs transition-all cursor-pointer border ${
          isActive
            ? 'bg-[#EF233C]/15 border-[#EF233C]/40 text-white shadow-md shadow-[#EF233C]/5'
            : 'bg-white/[0.03] hover:bg-white/[0.07] border-white/5 text-neutral-300 hover:text-white'
        }`}
        onClick={() => {
          if (!isEditing) {
            onSelectConversation(c.id);
            onCloseMobile();
          }
        }}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
          {c.mode === 'cat-code' ? (
            <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
              <Cat className="w-3.5 h-3.5" />
            </div>
          ) : (
            <div className="w-6 h-6 rounded-lg bg-[#EF233C]/20 text-[#EF233C] flex items-center justify-center shrink-0 border border-[#EF233C]/30">
              <MessageSquare className="w-3.5 h-3.5" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            {isEditing ? (
              <div
                className="flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveRename(c.id);
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  autoFocus
                  className="w-full px-2 py-0.5 rounded bg-black/80 border border-[#EF233C] text-white text-xs outline-none"
                />
                <button
                  onClick={() => handleSaveRename(c.id)}
                  type="button"
                  className="p-1 text-emerald-400 hover:bg-emerald-500/20 rounded cursor-pointer"
                  title="Save"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  type="button"
                  className="p-1 text-neutral-400 hover:bg-white/10 rounded cursor-pointer"
                  title="Cancel"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="truncate font-medium text-neutral-200 group-hover:text-white">
                {c.title}
              </div>
            )}

            {c.lastMessagePreview && !isEditing && (
              <div className="text-[10px] text-neutral-400 truncate mt-0.5">
                {c.lastMessagePreview}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions (Pin, Rename, Archive, Delete) - Always visible on mobile */}
        {!isEditing && (
          <div
            className={`flex items-center gap-0.5 shrink-0 transition-opacity ${
              isActive ? 'opacity-100' : 'opacity-80 sm:opacity-0 group-hover:opacity-100'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => onTogglePin(c.id, Boolean(c.isPinned))}
              type="button"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer min-w-[28px] min-h-[28px] flex items-center justify-center ${
                c.isPinned
                  ? 'text-amber-400 hover:bg-amber-500/20'
                  : 'text-neutral-400 hover:text-white hover:bg-white/10'
              }`}
              title={c.isPinned ? 'Unpin chat' : 'Pin to top'}
            >
              <Pin className={`w-3 h-3 ${c.isPinned ? 'fill-amber-400' : ''}`} />
            </button>

            <button
              onClick={() => startEditing(c)}
              type="button"
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer min-w-[28px] min-h-[28px] flex items-center justify-center"
              title="Rename chat"
            >
              <Edit2 className="w-3 h-3" />
            </button>

            <button
              onClick={() => onToggleArchive(c.id, Boolean(c.isArchived))}
              type="button"
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer min-w-[28px] min-h-[28px] flex items-center justify-center"
              title={c.isArchived ? 'Unarchive chat' : 'Archive chat'}
            >
              {c.isArchived ? (
                <ArchiveRestore className="w-3 h-3" />
              ) : (
                <Archive className="w-3 h-3" />
              )}
            </button>

            {deleteConfirmId === c.id ? (
              <div className="flex items-center gap-1 bg-red-950/80 p-0.5 rounded border border-red-500/40">
                <button
                  onClick={() => {
                    onDeleteConversation(c.id);
                    setDeleteConfirmId(null);
                  }}
                  type="button"
                  className="px-1.5 py-0.5 bg-red-600 text-white text-[10px] rounded hover:bg-red-700 cursor-pointer font-semibold"
                  title="Confirm Delete"
                >
                  Delete
                </button>
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  type="button"
                  className="p-0.5 text-neutral-400 hover:text-white cursor-pointer"
                  title="Cancel"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setDeleteConfirmId(c.id)}
                type="button"
                className="p-1.5 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer min-w-[28px] min-h-[28px] flex items-center justify-center"
                title="Delete conversation"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/75 z-40 lg:hidden backdrop-blur-xs"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 w-[85vw] max-w-xs sm:w-80 bg-[#09090D] border-r border-white/10 flex flex-col transition-transform duration-300 ease-in-out shrink-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-0 lg:overflow-hidden lg:border-r-0'
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-3.5 border-b border-white/10 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#EF233C]/20 border border-[#EF233C]/40 flex items-center justify-center text-[#EF233C]">
              <Cat className="w-4 h-4" />
            </div>
            <span className="font-bold text-xs uppercase tracking-wider text-white">
              Chat History
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onNewChat()}
              type="button"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#EF233C] hover:bg-red-600 text-white font-medium text-xs shadow-md shadow-[#EF233C]/20 transition-all cursor-pointer"
              title="Start a new chat"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
            <button
              onClick={onCloseMobile}
              type="button"
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/10 lg:hidden cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search & Tabs */}
        <div className="p-3 border-b border-white/5 space-y-2">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-neutral-200 placeholder:text-neutral-500 text-xs focus:outline-none focus:border-[#EF233C]/50 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Active vs Archived filter tabs */}
          <div className="flex rounded-lg bg-black/40 p-0.5 border border-white/5 text-[11px]">
            <button
              onClick={() => setActiveTab('active')}
              type="button"
              className={`flex-1 py-1 rounded-md text-center font-medium transition-colors cursor-pointer ${
                activeTab === 'active'
                  ? 'bg-white/15 text-white'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setActiveTab('archived')}
              type="button"
              className={`flex-1 py-1 rounded-md text-center font-medium transition-colors cursor-pointer ${
                activeTab === 'archived'
                  ? 'bg-white/15 text-white'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Archived
            </button>
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-3">
          {filteredConversations.length === 0 ? (
            <div className="text-center py-10 px-4 text-neutral-500">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">
                {searchQuery
                  ? 'No conversations matching your search'
                  : activeTab === 'archived'
                  ? 'No archived conversations'
                  : 'No conversation history yet. Start a chat!'}
              </p>
            </div>
          ) : (
            <>
              {pinnedConversations.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1 px-2 py-1 text-[10px] uppercase font-bold text-amber-400/80 tracking-wider">
                    <Pin className="w-3 h-3" />
                    <span>Pinned</span>
                  </div>
                  {pinnedConversations.map(renderConversationItem)}
                </div>
              )}

              {unpinnedConversations.length > 0 && (
                <div className="space-y-1">
                  {pinnedConversations.length > 0 && (
                    <div className="px-2 py-1 text-[10px] uppercase font-bold text-neutral-500 tracking-wider">
                      Recent
                    </div>
                  )}
                  {unpinnedConversations.map(renderConversationItem)}
                </div>
              )}
            </>
          )}
        </div>

        {/* Sidebar Footer info */}
        <div className="p-3 border-t border-white/10 bg-black/40 text-[11px] text-neutral-400 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Firestore Synced</span>
          </div>
          <span className="text-neutral-500 text-[10px]">v2.5 Pro</span>
        </div>
      </aside>
    </>
  );
};
