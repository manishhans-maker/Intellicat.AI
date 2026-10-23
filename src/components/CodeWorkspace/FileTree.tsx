import React, { useState, useMemo } from 'react';
import {
  Folder,
  FolderOpen,
  FileCode,
  FileText,
  FileJson,
  File,
  Plus,
  Trash2,
  Edit2,
  Search,
  ChevronRight,
  ChevronDown,
  X,
  Check,
  Sparkles,
} from 'lucide-react';
import { ProjectFile } from '../../types/codeAgent';

interface FileTreeProps {
  files: Record<string, ProjectFile>;
  activeFilePath: string;
  onSelectFile: (path: string) => void;
  onCreateFile: (path: string) => void;
  onDeleteFile: (path: string) => void;
  onRenameFile: (oldPath: string, newPath: string) => void;
}

interface TreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  children?: Record<string, TreeNode>;
}

function buildTree(files: Record<string, ProjectFile>): TreeNode {
  const root: TreeNode = { name: 'root', path: '', isFolder: true, children: {} };

  Object.keys(files).forEach((filePath) => {
    const parts = filePath.split('/');
    let current = root;

    parts.forEach((part, index) => {
      const isLast = index === parts.length - 1;
      const subPath = parts.slice(0, index + 1).join('/');

      if (!current.children) current.children = {};

      if (!current.children[part]) {
        current.children[part] = {
          name: part,
          path: subPath,
          isFolder: !isLast,
          children: isLast ? undefined : {},
        };
      }
      current = current.children[part];
    });
  });

  return root;
}

export const FileTree: React.FC<FileTreeProps> = ({
  files,
  activeFilePath,
  onSelectFile,
  onCreateFile,
  onDeleteFile,
  onRenameFile,
}) => {
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    'src': true,
    'src/components': true,
  });
  const [search, setSearch] = useState('');
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [newFilePath, setNewFilePath] = useState('');
  const [editingPath, setEditingPath] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const tree = useMemo(() => buildTree(files), [files]);

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => ({ ...prev, [path]: !prev[path] }));
  };

  const handleStartCreate = () => {
    setIsCreatingFile(true);
    setNewFilePath('');
  };

  const handleConfirmCreate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = newFilePath.trim().replace(/^\/+/, '');
    if (clean) {
      onCreateFile(clean);
      setIsCreatingFile(false);
      setNewFilePath('');
    }
  };

  const handleStartRename = (path: string) => {
    setEditingPath(path);
    setRenameValue(path);
  };

  const handleConfirmRename = (oldPath: string) => {
    const clean = renameValue.trim().replace(/^\/+/, '');
    if (clean && clean !== oldPath) {
      onRenameFile(oldPath, clean);
    }
    setEditingPath(null);
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['tsx', 'jsx', 'ts', 'js'].includes(ext || '')) {
      return <FileCode className="w-3.5 h-3.5 text-sky-400 shrink-0" />;
    }
    if (ext === 'html') {
      return <FileCode className="w-3.5 h-3.5 text-orange-400 shrink-0" />;
    }
    if (ext === 'css') {
      return <FileCode className="w-3.5 h-3.5 text-cyan-400 shrink-0" />;
    }
    if (ext === 'json') {
      return <FileJson className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
    }
    if (ext === 'md') {
      return <FileText className="w-3.5 h-3.5 text-purple-400 shrink-0" />;
    }
    return <File className="w-3.5 h-3.5 text-neutral-400 shrink-0" />;
  };

  const renderNode = (node: TreeNode, depth = 0) => {
    if (node.isFolder) {
      const isExpanded = expandedFolders[node.path] ?? true;
      const childNodes = Object.values(node.children || {});

      return (
        <div key={node.path || 'root'} className="space-y-0.5">
          {node.name !== 'root' && (
            <div
              onClick={() => toggleFolder(node.path)}
              style={{ paddingLeft: `${depth * 12 + 6}px` }}
              className="flex items-center gap-1.5 py-1 px-2 rounded-lg text-xs font-mono text-neutral-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer select-none group"
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-neutral-500" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-neutral-500" />
              )}
              {isExpanded ? (
                <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Folder className="w-3.5 h-3.5 text-amber-400/80" />
              )}
              <span className="font-semibold truncate">{node.name}</span>
            </div>
          )}

          {(node.name === 'root' || isExpanded) && (
            <div className="space-y-0.5">
              {childNodes
                .sort((a, b) => {
                  if (a.isFolder === b.isFolder) return a.name.localeCompare(b.name);
                  return a.isFolder ? -1 : 1;
                })
                .map((child) => renderNode(child, node.name === 'root' ? 0 : depth + 1))}
            </div>
          )}
        </div>
      );
    }

    const isActive = node.path === activeFilePath;
    const isEditing = editingPath === node.path;

    if (search && !node.name.toLowerCase().includes(search.toLowerCase())) {
      return null;
    }

    return (
      <div
        key={node.path}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => !isEditing && onSelectFile(node.path)}
        className={`group relative flex items-center justify-between py-1 px-2 rounded-lg text-xs font-mono transition-all cursor-pointer select-none ${
          isActive
            ? 'bg-[#EF233C]/20 border border-[#EF233C]/40 text-white font-semibold'
            : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5 border border-transparent'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {getFileIcon(node.name)}
          {isEditing ? (
            <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleConfirmRename(node.path);
                  if (e.key === 'Escape') setEditingPath(null);
                }}
                autoFocus
                className="w-full bg-black/80 border border-[#EF233C] rounded px-1.5 py-0.5 text-white text-[11px] outline-none"
              />
              <button
                type="button"
                onClick={() => handleConfirmRename(node.path)}
                className="p-0.5 text-emerald-400 hover:text-white"
              >
                <Check className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <span className="truncate">{node.name}</span>
          )}
        </div>

        {/* File Actions */}
        {!isEditing && (
          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 shrink-0 transition-opacity">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleStartRename(node.path);
              }}
              className="p-1 rounded hover:bg-white/10 text-neutral-400 hover:text-white cursor-pointer"
              title="Rename file"
            >
              <Edit2 className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteFile(node.path);
              }}
              className="p-1 rounded hover:bg-red-500/20 text-neutral-400 hover:text-red-400 cursor-pointer"
              title="Delete file"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col h-full bg-[#0d0e15] border border-white/10 rounded-2xl overflow-hidden shadow-xl text-neutral-300">
      {/* File Tree Header */}
      <div className="p-3 border-b border-white/10 flex items-center justify-between shrink-0">
        <span className="text-xs font-bold uppercase tracking-wider text-neutral-200 flex items-center gap-2">
          <span>Project Explorer</span>
          <span className="text-[10px] text-neutral-500 font-mono">({Object.keys(files).length})</span>
        </span>
        <button
          type="button"
          onClick={handleStartCreate}
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#EF233C]/20 hover:bg-[#EF233C]/35 text-[#EF233C] text-[11px] font-semibold border border-[#EF233C]/40 transition-colors cursor-pointer"
          title="Create New File"
        >
          <Plus className="w-3 h-3" />
          <span>New File</span>
        </button>
      </div>

      {/* Quick Search Bar */}
      <div className="px-3 pt-2.5 pb-2 border-b border-white/5">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search files..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-2 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-neutral-500 outline-none focus:border-[#EF233C]/50 transition-colors"
          />
        </div>
      </div>

      {/* New File Inline Creator Form */}
      {isCreatingFile && (
        <form onSubmit={handleConfirmCreate} className="p-2.5 bg-black/60 border-b border-white/10 flex items-center gap-1.5">
          <input
            type="text"
            placeholder="e.g. src/components/Header.tsx"
            value={newFilePath}
            onChange={(e) => setNewFilePath(e.target.value)}
            autoFocus
            className="flex-1 bg-neutral-900 border border-[#EF233C] rounded-lg px-2 py-1 text-xs text-white font-mono outline-none"
          />
          <button type="submit" className="p-1 rounded bg-[#EF233C] text-white hover:bg-red-600 cursor-pointer">
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setIsCreatingFile(false)}
            className="p-1 rounded bg-white/10 text-neutral-400 hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </form>
      )}

      {/* Tree Content */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {renderNode(tree)}
      </div>
    </div>
  );
};
