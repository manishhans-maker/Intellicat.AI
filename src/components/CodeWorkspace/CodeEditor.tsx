import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import {
  FileCode,
  Save,
  Copy,
  Check,
  Download,
  X,
  Plus,
  Maximize2,
  Minimize2,
  Sparkles,
  RotateCcw,
  Code2,
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
}) => {
  const [copied, setCopied] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [monacoLoaded, setMonacoLoaded] = useState(false);
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

  return (
    <div className="flex-1 flex flex-col h-full bg-[#090a10] border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative">
      {/* Tab Switcher Bar */}
      <div className="flex items-center justify-between bg-[#0e1017] border-b border-white/10 px-2 pt-1.5 shrink-0 overflow-x-auto select-none">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
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

      {/* Main Editor Canvas */}
      <div className="flex-1 relative overflow-hidden bg-[#090a10]">
        {activeFile ? (
          <Editor
            height="100%"
            language={monacoLanguage}
            value={activeFile.content}
            theme="vs-dark"
            onMount={() => setMonacoLoaded(true)}
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
            <p className="text-xs text-neutral-500 mt-1">Select a file from the explorer on the left or create a new file.</p>
          </div>
        )}
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
