import React, { useState, useEffect } from 'react';
import {
  Plus,
  Sparkles,
  RotateCcw,
  X,
  History,
  Eye,
  Code2,
  Download,
  Trash2,
  Check,
  Search,
  FolderKanban,
  Edit3,
  ArrowRight,
  Zap,
} from 'lucide-react';
import {
  CodingProject,
  ProjectFile,
  FileDiff,
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
  computeFileDiff,
  normalizeFilePath,
} from '../../lib/codingProjectService';
import { CodeEditor } from './CodeEditor';
import { LivePreviewSandbox } from './LivePreviewSandbox';
import { AgentChatPanel } from './AgentChatPanel';
import { INTELLICAT_LOGO_URL } from '../../constants';

interface CodingWorkspaceProps {
  userId?: string;
  onClose?: () => void;
}

export const CodingWorkspace: React.FC<CodingWorkspaceProps> = ({ userId, onClose }) => {
  const [projects, setProjects] = useState<CodingProject[]>([]);
  const [activeProject, setActiveProject] = useState<CodingProject | null>(null);
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [mobileTab, setMobileTab] = useState<'chat' | 'preview' | 'code'>('chat');
  const [historyOpen, setHistoryOpen] = useState(false);
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

  // Create a brand new app directly when clicking + New App
  const handleCreateNewApp = () => {
    const newApp = createNewAppProject(userId, `AI Web App #${projects.length + 1}`);
    const updatedList = [newApp, ...projects];
    setProjects(updatedList);
    setActiveProject(newApp);
    setTitleInput(newApp.name);
    saveUserCodingProject(newApp);
    setAgentHistory([]);
    setMobileTab('chat');
    setHistoryOpen(false);
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
    setMobileTab('chat');
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
          (activeProject.name.startsWith('New AI Web App') || activeProject.name.startsWith('My First AI App')) &&
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
      <div className="flex-1 flex items-center justify-center p-8 text-neutral-400 bg-[#07090f] text-xs">
        Loading AI App Workspace...
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full min-h-screen bg-[#07090f] text-white font-sans overflow-hidden">
      {/* Workspace Top Header Bar */}
      <header className="px-3 sm:px-6 py-2.5 bg-[#0e101a] border-b border-white/10 flex items-center justify-between shrink-0 gap-2 z-20">
        {/* Left: App Icon & Editable Title */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#EF233C] to-red-600 p-0.5 shrink-0 shadow-md shadow-[#EF233C]/30 flex items-center justify-center">
            <img
              src={INTELLICAT_LOGO_URL}
              alt="IntellicatAI"
              className="w-full h-full object-cover rounded-[10px]"
            />
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
                  className="px-2 py-0.5 rounded-lg bg-black border border-[#EF233C] text-xs font-bold text-white outline-none"
                />
                <button
                  type="button"
                  onClick={handleSaveTitle}
                  className="p-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 group">
                <h1
                  onClick={() => setEditingTitle(true)}
                  className="text-xs sm:text-sm font-black text-white truncate max-w-[140px] xs:max-w-[200px] sm:max-w-xs cursor-pointer hover:text-red-300 transition-colors"
                  title="Click to rename app"
                >
                  {activeProject.name}
                </h1>
                <Edit3
                  onClick={() => setEditingTitle(true)}
                  className="w-3 h-3 text-neutral-500 group-hover:text-white cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                />
              </div>
            )}
            <div className="text-[10px] text-neutral-400 flex items-center gap-1.5">
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                AI App Engine
              </span>
            </div>
          </div>
        </div>

        {/* Right Header Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* + New App Button */}
          <button
            type="button"
            onClick={handleCreateNewApp}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EF233C] hover:bg-red-600 text-white text-xs font-bold transition-all shadow-md shadow-[#EF233C]/30 cursor-pointer active:scale-95"
            title="Create a fresh AI App"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New App</span>
            <span className="sm:hidden">New</span>
          </button>

          {/* History Button */}
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-neutral-200 hover:text-white text-xs font-semibold transition-all cursor-pointer"
            title="View Saved Apps History"
          >
            <History className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">History ({projects.length})</span>
            <span className="sm:hidden">History</span>
          </button>

          {/* Code View Toggle */}
          <button
            type="button"
            onClick={() => setShowCodeEditor(!showCodeEditor)}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
              showCodeEditor
                ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 font-bold'
                : 'bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white border-white/10'
            }`}
            title="Toggle Raw Code Editor"
          >
            <Code2 className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">{showCodeEditor ? 'Hide Code' : 'View Code'}</span>
          </button>

          {/* Download ZIP */}
          <button
            type="button"
            onClick={() => exportProjectAsZip(activeProject)}
            className="hidden lg:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-neutral-200 hover:text-white text-xs font-semibold transition-all cursor-pointer"
            title="Download App Source ZIP"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>ZIP</span>
          </button>

          {/* Close Workspace */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title="Close Workspace"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Mobile Notice Bar when app is updated */}
      {showMobileNotice && (
        <div className="md:hidden bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-3 py-1.5 text-xs font-bold flex items-center justify-between shadow-md">
          <span>✨ App updated live! Tap Live Preview to view.</span>
          <button
            type="button"
            onClick={() => {
              setMobileTab('preview');
              setShowMobileNotice(false);
            }}
            className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-black/40 text-white text-[11px] font-bold cursor-pointer"
          >
            <span>Preview</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Mobile View Switcher (< 768px) */}
      <div className="md:hidden flex items-center justify-around bg-black/60 p-1 border-b border-white/10 text-xs shrink-0">
        <button
          type="button"
          onClick={() => setMobileTab('chat')}
          className={`flex-1 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            mobileTab === 'chat'
              ? 'bg-[#EF233C] text-white shadow-md shadow-[#EF233C]/30'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Chat & Prompts</span>
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

        {showCodeEditor && (
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
        )}
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden p-2 sm:p-3 gap-2 sm:gap-3">
        {/* Mobile View Render */}
        <div className="md:hidden flex-1 flex flex-col min-h-0 overflow-hidden">
          {mobileTab === 'chat' && (
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
            />
          )}

          {mobileTab === 'preview' && (
            <LivePreviewSandbox
              files={activeProject.files}
              framework={activeProject.framework}
              onSendErrorToAgent={(err) => {
                setMobileTab('chat');
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

        {/* Desktop Split Screen View (>= 768px): Chat on Left, Preview on Right */}
        <div className="hidden md:flex flex-1 overflow-hidden gap-3">
          {/* Left Side: Chat & Agent Panel (~45% width) */}
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

          {/* Right Side: Live App Preview OR Code Editor (~55% width) */}
          <div className="flex-1 h-full flex flex-col min-w-0">
            {showCodeEditor ? (
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
            ) : (
              <LivePreviewSandbox
                files={activeProject.files}
                framework={activeProject.framework}
                onSendErrorToAgent={(err) => {
                  handleRunAgentTask(`Fix this runtime error in the app:\n${err}`, 'fix_bug');
                }}
              />
            )}
          </div>
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
                  No built apps found. Click <strong className="text-white">+ New App</strong> to create one!
                </div>
              ) : (
                filteredHistory.map((proj) => {
                  const isActive = activeProject.id === proj.id;
                  const fileCount = Object.keys(proj.files || {}).length;
                  const formattedDate = proj.updatedAt
                    ? new Date(proj.updatedAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Recently';

                  return (
                    <div
                      key={proj.id}
                      onClick={() => handleSelectFromHistory(proj)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${
                        isActive
                          ? 'bg-[#EF233C]/20 border-[#EF233C]/50 shadow-lg shadow-[#EF233C]/20'
                          : 'bg-white/5 hover:bg-white/10 border-white/10'
                      }`}
                    >
                      <div className="min-w-0 flex-1 mr-3">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-white truncate">{proj.name}</h4>
                          {isActive && (
                            <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 text-[9px] font-bold">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                          {proj.description || `${fileCount} files • Updated ${formattedDate}`}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => handleDeleteFromHistory(proj.id, e)}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-white/10 transition-colors cursor-pointer"
                          title="Delete App"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer create button */}
            <div className="pt-3 border-t border-white/10 flex justify-between items-center">
              <span className="text-[11px] text-neutral-400">Total Apps: {projects.length}</span>
              <button
                type="button"
                onClick={handleCreateNewApp}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#EF233C] hover:bg-red-600 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Create New App</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
