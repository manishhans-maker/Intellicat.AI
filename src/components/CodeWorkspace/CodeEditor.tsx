import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import {
  FileCode,
  Save,
  Copy,
  Check,
  Download,
  X,
  Plus,
  Code2,
  FolderTree,
  Trash2,
  FilePlus,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { ProjectFile } from '../../types/codeAgent';

interface CodeEditorProps {
  files: Record<string, ProjectFile>;
  activeFilePath: string;
  openTabs: string[];
  onSelectTab: (path: string) => void;
  onCloseTab: (path: string) => void;
  onContentChange: (path: string, newContent: string) => void;
  onSaveFile?: (path: string) => void;
  onCreateFile?: (path: string, content?: string) => void;
  onDeleteFile?: (path: string) => void;
}

const EXT_TO_MONACO_LANG: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  html: 'html',
  css: 'css',
  json: 'json',
  md: 'markdown',
  py: 'python',
  sql: 'sql',
  rs: 'rust',
  go: 'go',
  sh: 'shell',
  yaml: 'yaml',
  yml: 'yaml',
};

export const CodeEditor: React.FC<CodeEditorProps> = ({
  files,
  activeFilePath,
  openTabs,
  onSelectTab,
  onCloseTab,
  onContentChange,
  onSaveFile,
  onCreateFile,
  onDeleteFile,
}) => {
  const [copied, setCopied] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [showExplorer, setShowExplorer] = useState(true);
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [newFilePathInput, setNewFilePathInput] = useState('');

  const activeFile = files[activeFilePath];
  const ext = activeFilePath.split('.').pop()?.toLowerCase() || '';
  const monacoLanguage = EXT_TO_MONACO_LANG[ext] || 'plaintext';

  // Handle Ctrl+S / Cmd+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (activeFilePath && onSaveFile) {
          onSaveFile(activeFilePath);
          setSavedFeedback(true);
          setTimeout(() => setSavedFeedback(false), 2000);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFilePath, onSaveFile]);

  const handleCopy = () => {
    if (!activeFile) return;
    navigator.clipboard.writeText(activeFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!activeFile) return;
    const blob = new Blob([activeFile.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = activeFilePath.split('/').pop() || 'code.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCreateNewFile = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newFilePathInput.trim().replace(/^(\.\/|\/)/, '');
    if (!clean) return;
    if (onCreateFile) {
      onCreateFile(clean);
    }
    setNewFilePathInput('');
    setIsCreatingFile(false);
  };

  const fileList = Object.keys(files).sort();

  return (
    <div className="flex-1 flex flex-col h-full bg-[#090a10] border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative">
      {/* Top Header Bar with Explorer Toggle & Tabs */}
      <div className="flex items-center justify-between bg-[#0e1017] border-b border-white/10 px-2 pt-1.5 shrink-0 overflow-x-auto select-none">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
          {/* Toggle Explorer Sidebar */}
          <button
            type="button"
            onClick={() => setShowExplorer(!showExplorer)}
            className={`p-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer mr-1.5 ${
              showExplorer
                ? 'bg-[#EF233C]/20 border-[#EF233C]/40 text-red-300'
                : 'bg-white/5 border-white/10 text-neutral-400 hover:text-white'
            }`}
            title="Toggle File Explorer Sidebar"
          >
            <FolderTree className="w-3.5 h-3.5" />
          </button>

          {/* Open Tabs */}
          {openTabs.map((path) => {
            const fileName = path.split('/').pop() || path;
            const isActive = path === activeFilePath;
            const file = files[path];
            const isDirty = file?.isModified;

            return (
              <div
                key={path}
                onClick={() => onSelectTab(path)}
                className={`group flex items-center gap-2 px-3 py-1.5 rounded-t-xl text-xs font-mono font-medium transition-all cursor-pointer border-t border-x ${
                  isActive
                    ? 'bg-[#090a10] border-white/15 text-white border-b-transparent shadow-sm'
                    : 'bg-black/30 border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
                }`}
              >
                <FileCode className={`w-3.5 h-3.5 ${isActive ? 'text-[#EF233C]' : 'text-neutral-500'}`} />
                <span className="truncate max-w-[140px]">{fileName}</span>
                {isDirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Unsaved changes" />}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(path);
                  }}
                  className="p-0.5 rounded hover:bg-white/15 text-neutral-500 hover:text-white transition-colors cursor-pointer"
                  title="Close tab"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Action buttons on the right */}
        {activeFile && (
          <div className="flex items-center gap-1.5 pb-1 pr-2">
            <button
              onClick={() => {
                if (activeFilePath && onSaveFile) {
                  onSaveFile(activeFilePath);
                  setSavedFeedback(true);
                  setTimeout(() => setSavedFeedback(false), 2000);
                }
              }}
              type="button"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-neutral-300 hover:text-white text-xs font-semibold transition-all cursor-pointer"
              title="Save changes (Ctrl+S)"
            >
              {savedFeedback ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400 text-[11px]">Saved</span>
                </>
              ) : (
                <>
                  <Save className="w-3 h-3" />
                  <span className="text-[11px] hidden sm:inline">Save</span>
                </>
              )}
            </button>

            <button
              onClick={handleCopy}
              type="button"
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-neutral-300 hover:text-white transition-all cursor-pointer"
              title="Copy code"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={handleDownload}
              type="button"
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-neutral-300 hover:text-white transition-all cursor-pointer"
              title="Download file"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Main Body: File Explorer Sidebar + Monaco Canvas */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left File Explorer Sidebar */}
        {showExplorer && (
          <div className="w-52 sm:w-60 bg-[#0c0d16] border-r border-white/10 flex flex-col shrink-0 select-none text-xs font-mono">
            <div className="p-2.5 bg-[#10111f] border-b border-white/10 flex items-center justify-between">
              <span className="text-[11px] font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                <FolderTree className="w-3.5 h-3.5 text-[#EF233C]" />
                Project Files
              </span>

              <button
                type="button"
                onClick={() => setIsCreatingFile(true)}
                className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#EF233C]/20 hover:bg-[#EF233C]/35 text-red-300 border border-[#EF233C]/40 text-[11px] font-bold transition-all cursor-pointer"
                title="Create a new file in this app"
              >
                <Plus className="w-3 h-3" />
                <span>File</span>
              </button>
            </div>

            {/* Inline New File Creator */}
            {isCreatingFile && (
              <form onSubmit={handleCreateNewFile} className="p-2 bg-black/60 border-b border-white/10 flex items-center gap-1">
                <input
                  type="text"
                  autoFocus
                  placeholder="src/components/Card.tsx"
                  value={newFilePathInput}
                  onChange={(e) => setNewFilePathInput(e.target.value)}
                  className="flex-1 px-2 py-1 bg-black border border-[#EF233C] rounded text-[11px] text-white outline-none"
                />
                <button type="submit" className="p-1 rounded bg-emerald-600 text-white cursor-pointer" title="Add File">
                  <Check className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreatingFile(false)}
                  className="p-1 rounded hover:bg-white/10 text-neutral-400 cursor-pointer"
                  title="Cancel"
                >
                  <X className="w-3 h-3" />
                </button>
              </form>
            )}

            {/* Files List */}
            <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
              {fileList.map((path) => {
                const isActive = path === activeFilePath;
                const isRoot = path === 'src/App.tsx' || path === 'index.html' || path === 'package.json';

                return (
                  <div
                    key={path}
                    onClick={() => onSelectTab(path)}
                    className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors ${
                      isActive
                        ? 'bg-[#EF233C]/20 text-white font-bold border border-[#EF233C]/40'
                        : 'text-neutral-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <FileCode className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#EF233C]' : 'text-neutral-500'}`} />
                      <span className="truncate text-[11px]">{path}</span>
                    </div>

                    {!isRoot && onDeleteFile && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteFile(path);
                        }}
                        className="p-1 rounded text-neutral-500 hover:text-red-400 hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shrink-0"
                        title="Delete file"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Right Monaco Editor Canvas */}
        <div className="flex-1 relative overflow-hidden bg-[#090a10]">
          {activeFile ? (
            <Editor
              height="100%"
              language={monacoLanguage}
              value={activeFile.content}
              theme="vs-dark"
              onChange={(val) => onContentChange(activeFilePath, val || '')}
              options={{
                fontSize: 13,
                fontFamily: "'Fira Code', 'JetBrains Mono', Consolas, monospace",
                fontLigatures: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                lineNumbers: 'on',
                folding: true,
                bracketPairColorization: { enabled: true },
                automaticLayout: true,
                cursorBlinking: 'smooth',
                cursorSmoothCaretAnimation: 'on',
                padding: { top: 12, bottom: 12 },
                renderLineHighlight: 'all',
                tabSize: 2,
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 text-neutral-500">
              <Code2 className="w-10 h-10 mb-3 opacity-30 text-[#EF233C]" />
              <p className="text-sm font-semibold text-neutral-400">No File Currently Open</p>
              <p className="text-xs text-neutral-500 mt-1">
                Select a file from the explorer on the left or click <strong className="text-white">+ File</strong> to create one.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Editor Status Footer Bar */}
      <div className="px-3.5 py-1.5 bg-[#0e1017] border-t border-white/10 text-[11px] font-mono text-neutral-400 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-neutral-300 font-semibold">{activeFilePath || 'Untitled'}</span>
          {activeFile && (
            <span>
              {activeFile.content.split('\n').length} lines • {(activeFile.content.length / 1024).toFixed(1)} KB
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-neutral-300 font-bold">
            {monacoLanguage}
          </span>
          <span className="text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Monaco Ready
          </span>
        </div>
      </div>
    </div>
  );
};

