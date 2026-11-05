/**
 * GitHub Integration & Direct Code Push Service for IntellicatAI Code Mode 2.0
 */

export interface GitHubAuthData {
  token: string;
  username: string;
  name?: string;
  avatarUrl?: string;
}

export interface PushOptions {
  token: string;
  owner: string;
  repo: string;
  files: Record<string, { path: string; content: string }>;
  commitMessage?: string;
  isPrivate?: boolean;
  branch?: string;
  onProgress?: (message: string, progress: number) => void;
}

export interface PushResult {
  success: boolean;
  repoUrl: string;
  commitUrl?: string;
  isNewRepo: boolean;
  filesPushedCount: number;
}

const GITHUB_AUTH_STORAGE_KEY = 'intelicat_github_auth_v1';

/**
 * Retrieve saved GitHub credentials from localStorage
 */
export function getStoredGitHubAuth(): GitHubAuthData | null {
  try {
    const raw = localStorage.getItem(GITHUB_AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Save GitHub credentials to localStorage
 */
export function saveGitHubAuth(data: GitHubAuthData): void {
  try {
    localStorage.setItem(GITHUB_AUTH_STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('Failed to save GitHub auth:', err);
  }
}

/**
 * Clear stored GitHub credentials
 */
export function clearGitHubAuth(): void {
  try {
    localStorage.removeItem(GITHUB_AUTH_STORAGE_KEY);
  } catch (err) {
    console.warn('Failed to clear GitHub auth:', err);
  }
}

/**
 * Verifies a GitHub Personal Access Token and retrieves user details
 */
export async function verifyGitHubToken(token: string): Promise<GitHubAuthData> {
  const cleanToken = token.trim();
  if (!cleanToken) {
    throw new Error('Please enter a GitHub Personal Access Token.');
  }

  const res = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${cleanToken}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (res.status === 401) {
    throw new Error('Invalid or expired GitHub token. Please verify your token permissions.');
  }

  if (res.status === 403) {
    throw new Error('GitHub API rate limit exceeded or token lacks required permissions (need "repo" scope).');
  }

  if (!res.ok) {
    throw new Error(`GitHub verification failed (${res.status}). Please check your token.`);
  }

  const user = await res.json();
  const authData: GitHubAuthData = {
    token: cleanToken,
    username: user.login,
    name: user.name || user.login,
    avatarUrl: user.avatar_url,
  };

  saveGitHubAuth(authData);
  return authData;
}

/**
 * Direct push of all project files to a GitHub repository
 */
export async function pushProjectToGitHub(options: PushOptions): Promise<PushResult> {
  const {
    token,
    owner,
    repo,
    files,
    commitMessage = 'feat: update code via IntellicatAI Code Mode 2.0',
    isPrivate = false,
    branch = 'main',
    onProgress,
  } = options;

  const headers = {
    Authorization: `Bearer ${token.trim()}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  onProgress?.('Verifying repository on GitHub...', 10);

  // 1. Check if repository exists
  let repoExists = false;
  let targetBranch = branch;
  let repoData: any = null;

  const checkRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
  if (checkRes.ok) {
    repoExists = true;
    repoData = await checkRes.json();
    targetBranch = repoData.default_branch || branch;
  } else if (checkRes.status === 404) {
    repoExists = false;
  } else if (checkRes.status === 401 || checkRes.status === 403) {
    throw new Error('GitHub token lacks permission to view or manage this repository. Ensure "repo" scope is enabled.');
  } else {
    throw new Error(`Failed to check repository (${checkRes.status}).`);
  }

  // 2. Create repository if it does not exist
  if (!repoExists) {
    onProgress?.(`Creating new GitHub repository ${owner}/${repo}...`, 20);
    const createRes = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: repo,
        description: 'Built with IntellicatAI Code Mode 2.0 live autonomous agent',
        private: isPrivate,
        auto_init: true,
      }),
    });

    if (!createRes.ok) {
      const errJson = await createRes.json().catch(() => ({}));
      throw new Error(errJson.message || `Failed to create GitHub repository (${createRes.status}).`);
    }

    repoData = await createRes.json();
    targetBranch = repoData.default_branch || 'main';

    // Wait a brief moment for GitHub to initialize branch
    await new Promise((r) => setTimeout(r, 1500));
  }

  onProgress?.(`Reading branch "${targetBranch}" reference...`, 35);

  // 3. Get the latest commit and tree of the target branch
  let parentCommitSha: string | null = null;
  let baseTreeSha: string | null = null;

  const refRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${targetBranch}`, { headers });
  if (refRes.ok) {
    const refData = await refRes.json();
    parentCommitSha = refData.object.sha;

    const commitRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/commits/${parentCommitSha}`, { headers });
    if (commitRes.ok) {
      const commitData = await commitRes.json();
      baseTreeSha = commitData.tree.sha;
    }
  }

  // 4. Upload all project files as Git Blobs
  const fileEntries = Object.entries(files).filter(([path]) => {
    return !path.includes('node_modules/') && !path.startsWith('.git/');
  });

  if (fileEntries.length === 0) {
    throw new Error('No files to push to GitHub.');
  }

  const treeItems: Array<{ path: string; mode: string; type: string; sha: string }> = [];
  let processedCount = 0;

  for (const [path, fileObj] of fileEntries) {
    processedCount++;
    const percent = Math.min(80, 40 + Math.round((processedCount / fileEntries.length) * 40));
    onProgress?.(`Uploading ${path} (${processedCount}/${fileEntries.length})...`, percent);

    const blobRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/blobs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        content: fileObj.content,
        encoding: 'utf-8',
      }),
    });

    if (!blobRes.ok) {
      const blobErr = await blobRes.json().catch(() => ({}));
      throw new Error(`Failed to upload ${path}: ${blobErr.message || blobRes.statusText}`);
    }

    const blobData = await blobRes.json();
    treeItems.push({
      path,
      mode: '100644',
      type: 'blob',
      sha: blobData.sha,
    });
  }

  // 5. Create new Git Tree
  onProgress?.('Generating new Git tree structure...', 85);
  const treeBody: any = { tree: treeItems };
  if (baseTreeSha) {
    treeBody.base_tree = baseTreeSha;
  }

  const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees`, {
    method: 'POST',
    headers,
    body: JSON.stringify(treeBody),
  });

  if (!treeRes.ok) {
    const treeErr = await treeRes.json().catch(() => ({}));
    throw new Error(`Failed to create Git tree: ${treeErr.message || treeRes.statusText}`);
  }

  const newTreeData = await treeRes.json();

  // 6. Create Git Commit
  onProgress?.('Signing and finalizing Git commit...', 92);
  const commitRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/commits`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      message: commitMessage,
      tree: newTreeData.sha,
      parents: parentCommitSha ? [parentCommitSha] : [],
    }),
  });

  if (!commitRes.ok) {
    const commitErr = await commitRes.json().catch(() => ({}));
    throw new Error(`Failed to create commit: ${commitErr.message || commitRes.statusText}`);
  }

  const newCommit = await commitRes.json();

  // 7. Update Ref to point to new commit (or create ref if branch did not exist)
  onProgress?.(`Publishing changes to branch "${targetBranch}"...`, 97);
  let updateRefRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${targetBranch}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      sha: newCommit.sha,
      force: true,
    }),
  });

  if (updateRefRes.status === 404 || updateRefRes.status === 422) {
    // If ref doesn't exist yet, create it
    updateRefRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ref: `refs/heads/${targetBranch}`,
        sha: newCommit.sha,
      }),
    });
  }

  if (!updateRefRes.ok) {
    const refErr = await updateRefRes.json().catch(() => ({}));
    throw new Error(`Failed to update branch ref: ${refErr.message || updateRefRes.statusText}`);
  }

  onProgress?.('Complete! Code published to GitHub.', 100);

  return {
    success: true,
    repoUrl: `https://github.com/${owner}/${repo}`,
    commitUrl: `https://github.com/${owner}/${repo}/commit/${newCommit.sha}`,
    isNewRepo: !repoExists,
    filesPushedCount: fileEntries.length,
  };
}
