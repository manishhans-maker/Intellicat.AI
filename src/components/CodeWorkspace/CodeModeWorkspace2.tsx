import React, { useState, useEffect, useRef } from 'react';
import {
  Zap,
  Sparkles,
  Plus,
  History,
  Download,
  Code2,
  Eye,
  Columns,
  Layers,
  ArrowLeft,
  Check,
  Edit3,
  Search,
  X,
  Bug,
  RotateCcw,
  Undo2,
  FolderTree,
  Maximize2,
  Minimize2,
  Play,
  RefreshCw,
  Folder,
  FileCode,
  Layout,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Flame,
  Wand2,
} from 'lucide-react';
import {
  CodingProject,
  ProjectFile,
  AgentActionPlan,
  ProjectCheckpoint,
  AgentHistoryMessage,
} from '../../types/codeAgent';
import {
  loadUserCodingProjects,
  saveUserCodingProject,
  deleteUserCodingProject,
  exportProjectAsZip,
  createNewAppProject,
  saveProjectCheckpoint,
  loadProjectCheckpoints,
  normalizeFilePath,
  STARTER_PROJECT_TEMPLATES,
} from '../../lib/codingProjectService';
import { CodeEditor } from './CodeEditor';
import { LivePreviewSandbox } from './LivePreviewSandbox';
import { AgentChatPanel } from './AgentChatPanel';
import { INTELLICAT_LOGO_URL } from '../../constants';

interface CodeModeWorkspaceProps {
  userId?: string;
  onBack?: () => void;
}

export type LayoutMode = 'split-preview' | 'split-code' | 'trio' | 'full-preview' | 'full-code';

export const CodeModeWorkspace2: React.FC<CodeModeWorkspaceProps> = ({ userId, onBack }) => {
  const [projects, setProjects] = useState<CodingProject[]>([]);
  const [activeProject, setActiveProject] = useState<CodingProject | null>(null);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('split-preview');
  const [mobileTab, setMobileTab] = useState<'agent' | 'preview' | 'code'>('agent');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [newTemplateMenuOpen, setNewTemplateMenuOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    const saved = localStorage.getItem('intelicat_coding_model');
    if (!saved || saved.includes('1.') || saved.includes('2.')) {
      return 'gemini-3.8-flash';
    }
    return saved;
  });

  useEffect(() => {
    localStorage.setItem('intelicat_coding_model', selectedModel);
  }, [selectedModel]);

  // Agent State
  const [currentPlan, setCurrentPlan] = useState<AgentActionPlan | undefined>(undefined);
  const [lastExplanation, setLastExplanation] = useState<string | undefined>(undefined);
  const [isAgentLoading, setIsAgentLoading] = useState(false);
  const [agentHistory, setAgentHistory] = useState<AgentHistoryMessage[]>([]);
  const [checkpoints, setCheckpoints] = useState<ProjectCheckpoint[]>([]);

  // Editing Title
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('');

  // Notification for mobile when app updates
  const [showMobileNotice, setShowMobileNotice] = useState(false);

  // 1. Load User Apps on Mount
  useEffect(() => {
    loadUserCodingProjects(userId).then((list) => {
      setProjects(list);
      if (list.length > 0) {
        setActiveProject(list[0]);
        setTitleInput(list[0].name);
      } else {
        const defaultApp = createNewAppProject(userId, 'My First AI Web App');
        setProjects([defaultApp]);
        setActiveProject(defaultApp);
        setTitleInput(defaultApp.name);
      }
    });
  }, [userId]);

  // Sync title input & checkpoints when active project changes
  useEffect(() => {
    if (activeProject) {
      setTitleInput(activeProject.name);
      setCheckpoints(loadProjectCheckpoints(activeProject.id));
    }
  }, [activeProject?.id]);

  // Create a brand new app directly
  const handleCreateNewApp = (templateKey?: string) => {
    let newApp: CodingProject;
    if (templateKey && STARTER_PROJECT_TEMPLATES[templateKey]) {
      const tmpl = STARTER_PROJECT_TEMPLATES[templateKey];
      newApp = {
        id: `proj-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        userId,
        name: tmpl.name,
        description: tmpl.description,
        framework: tmpl.framework,
        files: JSON.parse(JSON.stringify(tmpl.files)),
        activeFilePath: tmpl.activeFilePath,
        openTabs: Object.keys(tmpl.files),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    } else {
      newApp = createNewAppProject(userId, `AI Web App #${projects.length + 1}`);
    }

    const updatedList = [newApp, ...projects];
    setProjects(updatedList);
    setActiveProject(newApp);
    setTitleInput(newApp.name);
    saveUserCodingProject(newApp);
    setAgentHistory([]);
    setMobileTab('agent');
    setHistoryOpen(false);
    setNewTemplateMenuOpen(false);
  };

  // Select an app from History
  const handleSelectFromHistory = (proj: CodingProject) => {
    const validFiles =
      proj.files && Object.keys(proj.files).length > 0
        ? proj.files
        : createNewAppProject(userId, proj.name).files;

    const fullProj: CodingProject = {
      ...proj,
      userId: proj.userId || userId,
      files: validFiles,
      activeFilePath: proj.activeFilePath || Object.keys(validFiles)[0] || 'src/App.tsx',
    };

    setActiveProject(fullProj);
    setTitleInput(fullProj.name);
    setAgentHistory([]);
    setCheckpoints(loadProjectCheckpoints(fullProj.id));
    setHistoryOpen(false);
    setMobileTab('agent');
  };

  // Delete an app from History
  const handleDeleteFromHistory = async (projId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteUserCodingProject(projId, userId);
    const updated = projects.filter((p) => p.id !== projId);
    setProjects(updated);
    if (activeProject?.id === projId) {
      if (updated.length > 0) {
        handleSelectFromHistory(updated[0]);
      } else {
        const fresh = createNewAppProject(userId, 'My First AI App');
        setProjects([fresh]);
        setActiveProject(fresh);
        setTitleInput(fresh.name);
      }
    }
  };

  // Rename current app
  const handleSaveTitle = () => {
    if (!activeProject) return;
    const clean = titleInput.trim() || 'Untitled AI App';
    const updated: CodingProject = {
      ...activeProject,
      name: clean,
    };
    setActiveProject(updated);
    saveUserCodingProject(updated);
    setProjects((prev) => [updated, ...prev.filter((p) => p.id !== updated.id)]);
    setEditingTitle(false);
  };

  // Run AI Agent Task
  const handleRunAgentTask = async (task: string, intent: string) => {
    if (!activeProject) return;
    setIsAgentLoading(true);

    const userMessage: AgentHistoryMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      text: task,
      intent,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setAgentHistory((prev) => [...prev, userMessage]);

    try {
      const fileList = Object.values(activeProject.files);
      const res = await fetch('/api/code-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task,
          intent,
          files: fileList.map((f) => ({ path: f.path, content: f.content })),
          fileTree: Object.keys(activeProject.files),
          activeFilePath: activeProject.activeFilePath || 'src/App.tsx',
          framework: activeProject.framework,
          history: agentHistory.map((h) => ({ role: h.role, text: h.text })),
          selectedModel,
        }),
      });

      if (!res.ok) {
        throw new Error(`Agent request failed (${res.status})`);
      }

      const data = await res.json();

      if (data.plan) {
        setCurrentPlan(data.plan);
      }
      if (data.explanation) {
        setLastExplanation(data.explanation);
      }

      const changedFilePaths: string[] = [];

      if (Array.isArray(data.fileChanges) && data.fileChanges.length > 0) {
        // Save rollback checkpoint
        saveProjectCheckpoint(activeProject, `Before edit: ${task.slice(0, 40)}`);
        setCheckpoints(loadProjectCheckpoints(activeProject.id));

        // Directly apply edits to project files
        const updatedFiles = { ...activeProject.files };
        const updatedTabs = [...activeProject.openTabs];

        data.fileChanges.forEach((change: any) => {
          const normalizedPath = normalizeFilePath(change.path, activeProject.files);
          changedFilePaths.push(normalizedPath);
          const ext = normalizedPath.split('.').pop() || '';

          updatedFiles[normalizedPath] = {
            path: normalizedPath,
            content: change.content,
            language: ext,
            isModified: false,
          };
          if (!updatedTabs.includes(normalizedPath)) {
            updatedTabs.push(normalizedPath);
          }
        });

        const primaryPath = changedFilePaths[0] || activeProject.activeFilePath || 'src/App.tsx';

        // Automatically rename project if it has a default name
        let newName = activeProject.name;
        if (
          (activeProject.name.startsWith('New AI Web App') ||
            activeProject.name.startsWith('My First AI App') ||
            activeProject.name.startsWith('AI Web App #')) &&
          data.plan?.taskSummary
        ) {
          newName = data.plan.taskSummary.slice(0, 32);
        }

        const updatedProject: CodingProject = {
          ...activeProject,
          name: newName,
          files: updatedFiles,
          openTabs: updatedTabs,
          activeFilePath: primaryPath,
          updatedAt: new Date().toISOString(),
        };

        setActiveProject(updatedProject);
        setTitleInput(newName);
        saveUserCodingProject(updatedProject);
        setProjects((prev) => [updatedProject, ...prev.filter((p) => p.id !== updatedProject.id)]);

        // Show mobile notice
        setShowMobileNotice(true);
      }

      const agentMessage: AgentHistoryMessage = {
        id: `msg-${Date.now()}-agent`,
        role: 'agent',
        text:
          data.summary ||
          (changedFilePaths.length > 0
            ? `Your app has been updated live!`
            : data.explanation || 'App generated.'),
        plan: data.plan,
        changedFiles: changedFilePaths,
        explanation: data.explanation,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setAgentHistory((prev) => [...prev, agentMessage]);
    } catch (err: any) {
      console.error('Agent error:', err);
      const errMsg = err?.message || 'Unable to update app.';
      setLastExplanation(`⚠️ Error: ${errMsg}`);

      const errMessage: AgentHistoryMessage = {
        id: `msg-${Date.now()}-agent-err`,
        role: 'agent',
        text: `⚠️ Error: ${errMsg}`,
        isError: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setAgentHistory((prev) => [...prev, errMessage]);
    } finally {
      setIsAgentLoading(false);
    }
  };

  // Undo last change via checkpoint rollback
  const handleUndoLastChange = () => {
    if (!activeProject || checkpoints.length === 0) return;
    const latest = checkpoints[0];
    const restored: CodingProject = {
      ...activeProject,
      files: { ...latest.files },
      updatedAt: new Date().toISOString(),
    };
    setActiveProject(restored);
    saveUserCodingProject(restored);
    setCheckpoints((prev) => prev.slice(1));

    const undoMsg: AgentHistoryMessage = {
      id: `msg-${Date.now()}-undo`,
      role: 'agent',
      text: `⏪ Restored snapshot: "${latest.title}". App reverted.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setAgentHistory((prev) => [...prev, undoMsg]);
  };

  // Create new file
  const handleCreateFile = (path: string, content = '') => {
    if (!activeProject) return;
    const cleanPath = path.trim().replace(/^(\.\/|\/)/, '');
    if (!cleanPath) return;

    const ext = cleanPath.split('.').pop() || 'tsx';
    const componentName = cleanPath.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'Component';
    const defaultCode =
      content ||
      `import React from 'react';\n\nexport default function ${componentName}() {\n  return (\n    <div className="p-4">\n      <h2 className="text-lg font-bold">${cleanPath}</h2>\n    </div>\n  );\n}\n`;

    const updatedFiles = {
      ...activeProject.files,
      [cleanPath]: {
        path: cleanPath,
        content: defaultCode,
        language: ext,
        isModified: false,
      },
    };

    const updatedTabs = activeProject.openTabs.includes(cleanPath)
      ? activeProject.openTabs
      : [...activeProject.openTabs, cleanPath];

    const updatedProject: CodingProject = {
      ...activeProject,
      files: updatedFiles,
      openTabs: updatedTabs,
      activeFilePath: cleanPath,
      updatedAt: new Date().toISOString(),
    };

    setActiveProject(updatedProject);
    saveUserCodingProject(updatedProject);
  };

  // Delete file
  const handleDeleteFile = (path: string) => {
    if (!activeProject) return;
    if (Object.keys(activeProject.files).length <= 1) return;

    const updatedFiles = { ...activeProject.files };
    delete updatedFiles[path];

    const updatedTabs = activeProject.openTabs.filter((t) => t !== path);
    const primaryPath = updatedTabs[0] || Object.keys(updatedFiles)[0] || 'src/App.tsx';

    const updatedProject: CodingProject = {
      ...activeProject,
      files: updatedFiles,
      openTabs: updatedTabs,
      activeFilePath: primaryPath,
      updatedAt: new Date().toISOString(),
    };

    setActiveProject(updatedProject);
    saveUserCodingProject(updatedProject);
  };

  const filteredHistory = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(historySearch.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(historySearch.toLowerCase()))
  );

  if (!activeProject) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-neutral-400 bg-[#07090f] text-xs space-y-3">
        <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-[0_0_25px_rgba(239,35,60,0.35)] border border-white/20 bg-black flex items-center justify-center">
          <img src="/assets/intellicat-logo.png" alt="IntellicatAI" className="w-full h-full object-cover" />
        </div>
        <p className="font-semibold text-white">Initializing Code Mode 2.0 Autonomous Agent...</p>
        <p className="text-[11px] text-neutral-500">Connecting project files & live runtime</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-80px)] min-h-[700px] w-full bg-[#07090f] text-white rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
      {/* Workspace Header */}
      <header className="h-14 border-b border-white/10 bg-[#0c0e17] flex items-center justify-between px-3 sm:px-4 shrink-0 gap-2 z-20">
        {/* Left: Back & App Identity */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={() => (onBack ? onBack() : (window.location.hash = ''))}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer border border-white/10 shrink-0"
            title="Return to Main Overview"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Overview</span>
          </button>

          <div className="h-4 w-[1px] bg-white/10 shrink-0" />

          {/* Logo / Badge */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl overflow-hidden bg-black border border-white/20 shadow-[0_0_12px_rgba(239,35,60,0.3)] shrink-0 flex items-center justify-center">
              <img src="/assets/intellicat-logo.png" alt="IntellicatAI Cat Logo" className="w-full h-full object-cover" />
            </div>

            <div className="min-w-0">
              {editingTitle ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveTitle();
                    }}
                    autoFocus
                    className="px-2 py-0.5 rounded-lg bg-black border border-[#EF233C] text-xs font-bold text-white outline-none w-36 sm:w-48"
                  />
                  <button
                    type="button"
                    onClick={handleSaveTitle}
                    className="p-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 group">
                  <h1
                    onClick={() => setEditingTitle(true)}
                    className="text-xs sm:text-sm font-extrabold text-white truncate max-w-[120px] sm:max-w-xs cursor-pointer hover:text-red-300 transition-colors"
                    title="Click to rename app"
                  >
                    {activeProject.name}
                  </h1>
                  <span className="hidden md:inline-flex px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-mono font-bold uppercase">
                    Code 2.0
                  </span>
                  <Edit3
                    onClick={() => setEditingTitle(true)}
                    className="w-3 h-3 text-neutral-500 group-hover:text-white cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Center / Right Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Layout Mode Switcher (Desktop >= 768px) */}
          <div className="hidden lg:flex items-center gap-1 p-1 rounded-xl bg-black/40 border border-white/10 text-xs">
            <button
              onClick={() => setLayoutMode('split-preview')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                layoutMode === 'split-preview'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="Agent + Live Preview (Recommended for app building)"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview</span>
            </button>
            <button
              onClick={() => setLayoutMode('split-code')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                layoutMode === 'split-code'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="Agent + Monaco Code Editor (Inspect & edit source)"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Code</span>
            </button>
            <button
              onClick={() => setLayoutMode('trio')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                layoutMode === 'trio'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="Full 3-Panel Studio (Agent + Code + Preview)"
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Studio 3-Way</span>
            </button>
          </div>

          {/* New App Dropdown */}
          <div className="relative">
            <button
              onClick={() => setNewTemplateMenuOpen(!newTemplateMenuOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#EF233C] to-red-600 hover:from-red-600 hover:to-red-700 text-white text-xs font-bold transition-all shadow-md shadow-[#EF233C]/30 cursor-pointer active:scale-95"
              title="Create a fresh app or choose a template"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New App</span>
              <ChevronDown className="w-3 h-3 opacity-70" />
            </button>

            {newTemplateMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-[#11121d] border border-white/15 rounded-2xl p-2 shadow-2xl z-50 space-y-1 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  Starter Templates
                </div>
                <button
                  onClick={() => handleCreateNewApp()}
                  className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-white/10 text-xs text-white flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <span className="p-1 rounded-lg bg-red-500/20 text-red-400">✨</span>
                  <div>
                    <div className="font-bold">Blank AI App</div>
                    <div className="text-[10px] text-neutral-400">Start from scratch with AI Agent</div>
                  </div>
                </button>
                <button
                  onClick={() => handleCreateNewApp('arcade-game')}
                  className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-white/10 text-xs text-white flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <span className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400">🎮</span>
                  <div>
                    <div className="font-bold">Cyber Cat 2D Runner</div>
                    <div className="text-[10px] text-neutral-400">Canvas arcade physics & collision</div>
                  </div>
                </button>
                <button
                  onClick={() => handleCreateNewApp('crypto-dashboard')}
                  className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-white/10 text-xs text-white flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <span className="p-1 rounded-lg bg-amber-500/20 text-amber-400">📊</span>
                  <div>
                    <div className="font-bold">Market Analytics</div>
                    <div className="text-[10px] text-neutral-400">Real-time asset telemetry dashboard</div>
                  </div>
                </button>
                <button
                  onClick={() => handleCreateNewApp('react-spa')}
                  className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-white/10 text-xs text-white flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <span className="p-1 rounded-lg bg-sky-500/20 text-sky-400">⚛️</span>
                  <div>
                    <div className="font-bold">React 19 Cyber App</div>
                    <div className="text-[10px] text-neutral-400">Reactive state & Tailwind CSS</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* History Button */}
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-neutral-200 hover:text-white text-xs font-semibold transition-all cursor-pointer"
            title="View Saved Apps History"
          >
            <History className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">History ({projects.length})</span>
            <span className="sm:hidden">({projects.length})</span>
          </button>

          {/* Download ZIP */}
          <button
            type="button"
            onClick={() => exportProjectAsZip(activeProject)}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-neutral-200 hover:text-white text-xs font-semibold transition-all cursor-pointer"
            title="Download App Source ZIP"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>ZIP</span>
          </button>
        </div>
      </header>

      {/* Mobile Notice Bar when app is updated */}
      {showMobileNotice && (
        <div className="md:hidden bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-3 py-1.5 text-xs font-bold flex items-center justify-between shadow-md shrink-0">
          <span>✨ App updated live by AI! Tap Preview to view.</span>
          <button
            type="button"
            onClick={() => {
              setMobileTab('preview');
              setShowMobileNotice(false);
            }}
            className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-black/40 text-white text-[11px] font-bold cursor-pointer"
          >
            <span>Preview</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Mobile View Switcher (< 768px) */}
      <div className="md:hidden flex items-center justify-around bg-black/60 p-1.5 border-b border-white/10 text-xs shrink-0">
        <button
          type="button"
          onClick={() => setMobileTab('agent')}
          className={`flex-1 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            mobileTab === 'agent'
              ? 'bg-[#EF233C] text-white shadow-md shadow-[#EF233C]/30'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI Agent</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setMobileTab('preview');
            setShowMobileNotice(false);
          }}
          className={`flex-1 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            mobileTab === 'preview'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Live Preview</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileTab('code')}
          className={`flex-1 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            mobileTab === 'code'
              ? 'bg-sky-600 text-white shadow-md'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>Code</span>
        </button>
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden p-2 sm:p-3 gap-2 sm:gap-3">
        {/* Mobile View */}
        <div className="md:hidden flex-1 flex flex-col min-h-0 overflow-hidden">
          {mobileTab === 'agent' && (
            <AgentChatPanel
              files={activeProject.files}
              activeFilePath={activeProject.activeFilePath || 'src/App.tsx'}
              onRunAgentTask={handleRunAgentTask}
              isLoading={isAgentLoading}
              currentPlan={currentPlan}
              lastExplanation={lastExplanation}
              history={agentHistory}
              onUndoLastChange={handleUndoLastChange}
              canUndo={checkpoints.length > 0}
              selectedModel={selectedModel}
              onSelectModel={setSelectedModel}
            />
          )}

          {mobileTab === 'preview' && (
            <LivePreviewSandbox
              files={activeProject.files}
              framework={activeProject.framework}
              onSendErrorToAgent={(err) => {
                setMobileTab('agent');
                handleRunAgentTask(`Fix this runtime error in the app:\n${err}`, 'fix_bug');
              }}
            />
          )}

          {mobileTab === 'code' && (
            <CodeEditor
              files={activeProject.files}
              activeFilePath={activeProject.activeFilePath || 'src/App.tsx'}
              openTabs={activeProject.openTabs}
              onSelectTab={(p) => setActiveProject({ ...activeProject, activeFilePath: p })}
              onCloseTab={(p) =>
                setActiveProject({
                  ...activeProject,
                  openTabs: activeProject.openTabs.filter((t) => t !== p),
                })
              }
              onContentChange={(path, content) => {
                const updatedFiles = {
                  ...activeProject.files,
                  [path]: { ...activeProject.files[path], content },
                };
                setActiveProject({ ...activeProject, files: updatedFiles });
                saveUserCodingProject({ ...activeProject, files: updatedFiles });
              }}
              onSaveFile={() => saveUserCodingProject(activeProject)}
              onCreateFile={handleCreateFile}
              onDeleteFile={handleDeleteFile}
            />
          )}
        </div>

        {/* Desktop Layout (>= 768px) */}
        <div className="hidden md:flex flex-1 overflow-hidden gap-3">
          {/* Mode 1: Split Preview (Agent on Left ~42%, Live Preview on Right ~58%) */}
          {layoutMode === 'split-preview' && (
            <>
              <div className="w-[42%] lg:w-[45%] shrink-0 h-full flex flex-col">
                <AgentChatPanel
                  files={activeProject.files}
                  activeFilePath={activeProject.activeFilePath || 'src/App.tsx'}
                  onRunAgentTask={handleRunAgentTask}
                  isLoading={isAgentLoading}
                  currentPlan={currentPlan}
                  lastExplanation={lastExplanation}
                  history={agentHistory}
                  onUndoLastChange={handleUndoLastChange}
                  canUndo={checkpoints.length > 0}
                  selectedModel={selectedModel}
                  onSelectModel={setSelectedModel}
                />
              </div>
              <div className="flex-1 h-full flex flex-col min-w-0">
                <LivePreviewSandbox
                  files={activeProject.files}
                  framework={activeProject.framework}
                  onSendErrorToAgent={(err) => {
                    handleRunAgentTask(`Fix this runtime error in the app:\n${err}`, 'fix_bug');
                  }}
                />
              </div>
            </>
          )}

          {/* Mode 2: Split Code (Agent on Left ~42%, Monaco Code Editor on Right ~58%) */}
          {layoutMode === 'split-code' && (
            <>
              <div className="w-[42%] lg:w-[45%] shrink-0 h-full flex flex-col">
                <AgentChatPanel
                  files={activeProject.files}
                  activeFilePath={activeProject.activeFilePath || 'src/App.tsx'}
                  onRunAgentTask={handleRunAgentTask}
                  isLoading={isAgentLoading}
                  currentPlan={currentPlan}
                  lastExplanation={lastExplanation}
                  history={agentHistory}
                  onUndoLastChange={handleUndoLastChange}
                  canUndo={checkpoints.length > 0}
                  selectedModel={selectedModel}
                  onSelectModel={setSelectedModel}
                />
              </div>
              <div className="flex-1 h-full flex flex-col min-w-0">
                <CodeEditor
                  files={activeProject.files}
                  activeFilePath={activeProject.activeFilePath || 'src/App.tsx'}
                  openTabs={activeProject.openTabs}
                  onSelectTab={(p) => setActiveProject({ ...activeProject, activeFilePath: p })}
                  onCloseTab={(p) =>
                    setActiveProject({
                      ...activeProject,
                      openTabs: activeProject.openTabs.filter((t) => t !== p),
                    })
                  }
                  onContentChange={(path, content) => {
                    const updatedFiles = {
                      ...activeProject.files,
                      [path]: { ...activeProject.files[path], content },
                    };
                    setActiveProject({ ...activeProject, files: updatedFiles });
                    saveUserCodingProject({ ...activeProject, files: updatedFiles });
                  }}
                  onSaveFile={() => saveUserCodingProject(activeProject)}
                  onCreateFile={handleCreateFile}
                  onDeleteFile={handleDeleteFile}
                />
              </div>
            </>
          )}

          {/* Mode 3: Trio (Agent ~32%, Monaco Editor ~34%, Live Preview ~34%) */}
          {layoutMode === 'trio' && (
            <>
              <div className="w-[32%] shrink-0 h-full flex flex-col">
                <AgentChatPanel
                  files={activeProject.files}
                  activeFilePath={activeProject.activeFilePath || 'src/App.tsx'}
                  onRunAgentTask={handleRunAgentTask}
                  isLoading={isAgentLoading}
                  currentPlan={currentPlan}
                  lastExplanation={lastExplanation}
                  history={agentHistory}
                  onUndoLastChange={handleUndoLastChange}
                  canUndo={checkpoints.length > 0}
                  selectedModel={selectedModel}
                  onSelectModel={setSelectedModel}
                />
              </div>
              <div className="w-[34%] shrink-0 h-full flex flex-col">
                <CodeEditor
                  files={activeProject.files}
                  activeFilePath={activeProject.activeFilePath || 'src/App.tsx'}
                  openTabs={activeProject.openTabs}
                  onSelectTab={(p) => setActiveProject({ ...activeProject, activeFilePath: p })}
                  onCloseTab={(p) =>
                    setActiveProject({
                      ...activeProject,
                      openTabs: activeProject.openTabs.filter((t) => t !== p),
                    })
                  }
                  onContentChange={(path, content) => {
                    const updatedFiles = {
                      ...activeProject.files,
                      [path]: { ...activeProject.files[path], content },
                    };
                    setActiveProject({ ...activeProject, files: updatedFiles });
                    saveUserCodingProject({ ...activeProject, files: updatedFiles });
                  }}
                  onSaveFile={() => saveUserCodingProject(activeProject)}
                  onCreateFile={handleCreateFile}
                  onDeleteFile={handleDeleteFile}
                />
              </div>
              <div className="flex-1 h-full flex flex-col min-w-0">
                <LivePreviewSandbox
                  files={activeProject.files}
                  framework={activeProject.framework}
                  onSendErrorToAgent={(err) => {
                    handleRunAgentTask(`Fix this runtime error in the app:\n${err}`, 'fix_bug');
                  }}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* History Drawer Modal */}
      {historyOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-xl w-full max-h-[85vh] bg-[#11121d] border border-white/15 rounded-3xl p-6 shadow-2xl flex flex-col space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Your Built AI Apps History</h3>
              </div>
              <button
                type="button"
                onClick={() => setHistoryOpen(false)}
                className="p-1 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search filter */}
            <div className="relative">
              <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search your built apps..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-black/60 border border-white/10 text-xs text-white placeholder-neutral-500 outline-none focus:border-[#EF233C]"
              />
            </div>

            {/* App List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {filteredHistory.length === 0 ? (
                <div className="p-8 text-center text-neutral-500 text-xs">
                  No applications found matching "{historySearch}".
                </div>
              ) : (
                filteredHistory.map((proj) => {
                  const isCurrent = activeProject?.id === proj.id;
                  const fileCount = proj.files ? Object.keys(proj.files).length : 1;
                  return (
                    <div
                      key={proj.id}
                      onClick={() => handleSelectFromHistory(proj)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${
                        isCurrent
                          ? 'bg-[#EF233C]/10 border-[#EF233C]/50 text-white'
                          : 'bg-white/[0.03] hover:bg-white/[0.08] border-white/5 text-neutral-300'
                      }`}
                    >
                      <div className="min-w-0 flex-1 pr-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-xs text-white truncate">{proj.name}</span>
                          {isCurrent && (
                            <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-bold">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-neutral-400 flex items-center gap-3">
                          <span>{fileCount} files</span>
                          <span>•</span>
                          <span>{new Date(proj.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => handleDeleteFromHistory(proj.id, e)}
                          className="p-1.5 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          title="Delete app"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
