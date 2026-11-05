import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Copy,
  Check,
  Lock,
  Globe,
  Loader2,
  RefreshCw,
  GitBranch,
  FolderGit2,
  KeyRound,
  User,
  ArrowRight,
} from 'lucide-react';
import { CodingProject } from '../../types/codeAgent';
import {
  getStoredGitHubAuth,
  saveGitHubAuth,
  clearGitHubAuth,
  verifyGitHubToken,
  pushProjectToGitHub,
  GitHubAuthData,
  PushResult,
} from '../../lib/githubSyncService';

interface GitHubSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: CodingProject | null;
}

export const GitHubSyncModal: React.FC<GitHubSyncModalProps> = ({ isOpen, onClose, project }) => {
  const [activeTab, setActiveTab] = useState<'push' | 'cli'>('push');
  const [authData, setAuthData] = useState<GitHubAuthData | null>(null);
  const [tokenInput, setTokenInput] = useState('');
  const [isVerifyingToken, setIsVerifyingToken] = useState(false);

  // Push Configuration
  const [repoName, setRepoName] = useState('');
  const [commitMessage, setCommitMessage] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [branch, setBranch] = useState('main');

  // Push Execution State
  const [isPushing, setIsPushing] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [pushResult, setPushResult] = useState<PushResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Copied State
  const [copiedCli, setCopiedCli] = useState(false);

  // Load auth data on mount
  useEffect(() => {
    if (isOpen) {
      const stored = getStoredGitHubAuth();
      setAuthData(stored);
      setErrorMessage(null);
      setPushResult(null);

      if (project) {
        // Sanitize project name for GitHub repository
        const sanitized = project.name
          .toLowerCase()
          .replace(/[^a-z0-9_-]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '') || 'ai-web-app';
        setRepoName(sanitized);
        setCommitMessage(`feat: update ${project.name} via IntellicatAI Code Mode 2.0`);
      }
    }
  }, [isOpen, project?.id]);

  if (!isOpen || !project) return null;

  const handleVerifyAndSaveToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;
    setIsVerifyingToken(true);
    setErrorMessage(null);

    try {
      const user = await verifyGitHubToken(tokenInput.trim());
      setAuthData(user);
      setTokenInput('');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to authenticate token with GitHub.');
    } finally {
      setIsVerifyingToken(false);
    }
  };

  const handleDisconnect = () => {
    clearGitHubAuth();
    setAuthData(null);
    setPushResult(null);
    setErrorMessage(null);
  };

  const handlePushCode = async () => {
    if (!authData?.token || !authData.username) {
      setErrorMessage('Please connect your GitHub account first.');
      return;
    }
    const cleanRepo = repoName.trim();
    if (!cleanRepo) {
      setErrorMessage('Please specify a repository name.');
      return;
    }

    setIsPushing(true);
    setErrorMessage(null);
    setPushResult(null);
    setProgressPercent(5);
    setProgressText('Starting GitHub deployment pipeline...');

    try {
      const result = await pushProjectToGitHub({
        token: authData.token,
        owner: authData.username,
        repo: cleanRepo,
        files: project.files,
        commitMessage: commitMessage.trim() || 'feat: update code via IntellicatAI',
        isPrivate,
        branch: branch.trim() || 'main',
        onProgress: (msg, percent) => {
          setProgressText(msg);
          setProgressPercent(percent);
        },
      });

      setPushResult(result);
    } catch (err: any) {
      console.error('GitHub push failed:', err);
      setErrorMessage(err?.message || 'Failed to push code to GitHub.');
    } finally {
      setIsPushing(false);
    }
  };

  const fileCount = Object.keys(project.files).length;
  const usernameDisplay = authData?.username || 'your-github-username';
  const cleanRepoDisplay = repoName || 'my-app';

  const cliSnippet = `# 1. Download or extract your project files into a folder
# 2. In your terminal, run:
git init
git add .
git commit -m "${commitMessage || 'feat: update code via IntellicatAI'}"
git branch -M ${branch || 'main'}
git remote add origin https://github.com/${usernameDisplay}/${cleanRepoDisplay}.git
git push -u origin ${branch || 'main'}`;

  const handleCopyCli = () => {
    navigator.clipboard.writeText(cliSnippet);
    setCopiedCli(true);
    setTimeout(() => setCopiedCli(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[92vh] flex flex-col bg-[#0f101a] border border-white/15 rounded-3xl shadow-2xl overflow-hidden text-white">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#141524] border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-neutral-900 border border-white/20 flex items-center justify-center shadow-md">
              <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Push to GitHub</span>
                <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Live Sync
                </span>
              </h3>
              <p className="text-xs text-neutral-400">
                Directly push <span className="text-white font-medium">"{project.name}"</span> ({fileCount} files) to your repository
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 px-4 sm:px-5 bg-black/30 shrink-0">
          <button
            onClick={() => setActiveTab('push')}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'push'
                ? 'border-[#EF233C] text-white'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <FolderGit2 className="w-3.5 h-3.5" />
            <span>1-Click Push (API)</span>
          </button>
          <button
            onClick={() => setActiveTab('cli')}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'cli'
                ? 'border-[#EF233C] text-white'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>CLI Commands</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-red-500/15 border border-red-500/30 text-xs text-red-200 flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {/* Success Banner */}
          {pushResult && (
            <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 space-y-3 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-emerald-300">
                    {pushResult.isNewRepo ? 'Repository Created & Pushed Successfully!' : 'Code Successfully Pushed to GitHub!'}
                  </h4>
                  <p className="text-xs text-emerald-200/80 mt-1">
                    All {pushResult.filesPushedCount} project files have been committed to GitHub on branch <span className="font-mono text-white">{branch}</span>.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-2">
                <a
                  href={pushResult.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
                >
                  <span>Open on GitHub</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                {pushResult.commitUrl && (
                  <a
                    href={pushResult.commitUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-all cursor-pointer"
                  >
                    <span>View Commit</span>
                    <ExternalLink className="w-3 h-3 text-neutral-400" />
                  </a>
                )}
              </div>
            </div>
          )}

          {activeTab === 'push' && (
            <>
              {/* Account Connection State */}
              {!authData ? (
                /* Step 1: Connect Token */
                <form onSubmit={handleVerifyAndSaveToken} className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <KeyRound className="w-4 h-4 text-amber-400" />
                    <span>Connect your GitHub Account</span>
                  </div>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Paste your GitHub Personal Access Token (classic or fine-grained with <span className="text-white font-semibold">repo</span> permissions) to push your website directly.
                  </p>

                  <div className="space-y-1.5">
                    <input
                      type="password"
                      value={tokenInput}
                      onChange={(e) => setTokenInput(e.target.value)}
                      placeholder="ghp_xxxxxxxxxxxxxxxxxxxx or github_pat_..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-red-500 font-mono"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <a
                      href="https://github.com/settings/tokens/new?scopes=repo&description=IntellicatAI+Code+Mode"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Generate token on GitHub ↗</span>
                    </a>

                    <button
                      type="submit"
                      disabled={isVerifyingToken || !tokenInput.trim()}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md shadow-red-600/30 cursor-pointer"
                    >
                      {isVerifyingToken ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Verifying...</span>
                        </>
                      ) : (
                        <>
                          <span>Connect GitHub</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                /* Connected Account Banner */
                <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {authData.avatarUrl ? (
                      <img src={authData.avatarUrl} alt={authData.username} className="w-9 h-9 rounded-full border border-white/20" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-neutral-800 flex items-center justify-center">
                        <User className="w-4 h-4 text-neutral-300" />
                      </div>
                    )}
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>@{authData.username}</span>
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      </div>
                      <div className="text-[11px] text-neutral-400">Authenticated & Ready to Push</div>
                    </div>
                  </div>

                  <button
                    onClick={handleDisconnect}
                    className="text-[11px] text-neutral-400 hover:text-red-400 hover:underline cursor-pointer"
                  >
                    Disconnect
                  </button>
                </div>
              )}

              {/* Repo Settings & Push Controls */}
              {authData && (
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3.5">
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <FolderGit2 className="w-4 h-4 text-red-500" />
                    <span>Repository Details</span>
                  </div>

                  {/* Repository Name */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-neutral-300">Repository Name</label>
                    <div className="flex items-center rounded-xl bg-black/60 border border-white/15 px-3 py-2 text-xs font-mono">
                      <span className="text-neutral-500">{authData.username}/</span>
                      <input
                        type="text"
                        value={repoName}
                        onChange={(e) => setRepoName(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '-'))}
                        placeholder="repo-name"
                        className="bg-transparent text-white outline-none flex-1 font-mono"
                      />
                    </div>
                    <p className="text-[10px] text-neutral-400">
                      If this repository does not exist on your account, IntellicatAI will automatically create it for you!
                    </p>
                  </div>

                  {/* Commit Message */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-neutral-300">Commit Message</label>
                    <input
                      type="text"
                      value={commitMessage}
                      onChange={(e) => setCommitMessage(e.target.value)}
                      placeholder="Commit summary..."
                      className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-xs text-white placeholder-neutral-500 outline-none focus:border-red-500"
                    />
                  </div>

                  {/* Branch & Visibility */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-[11px] font-semibold text-neutral-300">Target Branch</label>
                      <input
                        type="text"
                        value={branch}
                        onChange={(e) => setBranch(e.target.value)}
                        placeholder="main"
                        className="w-full mt-1 px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-xs text-white font-mono outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-neutral-300">Visibility</label>
                      <div className="flex items-center gap-2 mt-1">
                        <button
                          type="button"
                          onClick={() => setIsPrivate(false)}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            !isPrivate
                              ? 'bg-white/15 border-white/40 text-white shadow-sm'
                              : 'bg-black/40 border-white/10 text-neutral-400 hover:text-white'
                          }`}
                        >
                          <Globe className="w-3.5 h-3.5 text-sky-400" />
                          <span>Public</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsPrivate(true)}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            isPrivate
                              ? 'bg-white/15 border-white/40 text-white shadow-sm'
                              : 'bg-black/40 border-white/10 text-neutral-400 hover:text-white'
                          }`}
                        >
                          <Lock className="w-3.5 h-3.5 text-amber-400" />
                          <span>Private</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Push Progress Bar */}
                  {isPushing && (
                    <div className="pt-2 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-neutral-300 font-medium">
                        <span className="flex items-center gap-1.5">
                          <Loader2 className="w-3 h-3 animate-spin text-red-500" />
                          <span>{progressText}</span>
                        </span>
                        <span>{progressPercent}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-black rounded-full overflow-hidden border border-white/10">
                        <div
                          className="h-full bg-gradient-to-r from-red-600 to-amber-500 transition-all duration-300"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Primary Action Button */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handlePushCode}
                      disabled={isPushing}
                      className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#EF233C] to-red-600 hover:from-red-600 hover:to-red-700 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99]"
                    >
                      {isPushing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Pushing Code to GitHub...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                          </svg>
                          <span>Push {fileCount} Files to GitHub</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'cli' && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Terminal Commands</span>
                  <button
                    type="button"
                    onClick={handleCopyCli}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-neutral-200 text-xs font-semibold cursor-pointer transition-colors"
                  >
                    {copiedCli ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCli ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="p-3 bg-black/80 rounded-xl text-[11px] font-mono text-emerald-300 overflow-x-auto whitespace-pre leading-relaxed border border-white/10">
                  {cliSnippet}
                </pre>
              </div>

              <div className="text-[11px] text-neutral-400 leading-relaxed space-y-1 p-1">
                <div>💡 <span className="text-white font-medium">Tip:</span> Download your project as a ZIP first using the ZIP button in Code Mode 2.0.</div>
                <div>Extract the files into a local folder on your computer and run these commands to push directly.</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
