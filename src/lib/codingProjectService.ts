import JSZip from 'jszip';
import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import { CodingProject, ProjectFile, FileDiff, ProjectCheckpoint } from '../types/codeAgent';

const STORAGE_KEY = 'intelicat_coding_projects_v1';
const CHECKPOINTS_STORAGE_KEY = 'intelicat_coding_checkpoints_v1';

/**
 * Modern High-Quality Starter Project Templates
 */
export const STARTER_PROJECT_TEMPLATES: Record<string, {
  name: string;
  description: string;
  framework: 'react' | 'html' | 'vanilla';
  files: Record<string, ProjectFile>;
  activeFilePath: string;
}> = {
  'react-spa': {
    name: 'React 19 + Tailwind Cyber App',
    description: 'Modern interactive single page application with reactive state and styled components',
    framework: 'react',
    activeFilePath: 'src/App.tsx',
    files: {
      'src/App.tsx': {
        path: 'src/App.tsx',
        language: 'typescript',
        content: `import React, { useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);
  const [theme, setTheme] = useState<'neon' | 'cyber'>('neon');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex flex-col items-center justify-center font-sans">
      <div className="max-w-md w-full bg-slate-900/90 border border-red-500/30 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-2 mb-3">
          <span className="p-2 rounded-xl bg-red-600/20 text-red-400 font-bold text-sm">🐱</span>
          <h1 className="text-xl font-black tracking-tight text-white">Intelicat React Workspace</h1>
        </div>
        <p className="text-xs text-slate-400 mb-6">
          Live editable React 19 component rendered securely in isolated browser preview.
        </p>

        <div className="p-4 rounded-xl bg-black/60 border border-white/10 text-center mb-6">
          <div className="text-3xl font-black text-red-500 font-mono mb-1">{count}</div>
          <div className="text-[11px] uppercase tracking-wider text-slate-400">Reactive Click State</div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={() => setCount(c => c + 1)}
            className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md shadow-red-600/30 transition-all cursor-pointer"
          >
            Increment +1
          </button>
          <button
            onClick={() => setCount(0)}
            className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 font-bold text-xs transition-all cursor-pointer"
          >
            Reset
          </button>
        </div>

        <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-500">
          <span>React 19 • Tailwind CSS</span>
          <span className="text-emerald-400 font-semibold">● Ready for AI Agent Edits</span>
        </div>
      </div>
    </div>
  );
}`,
      },
      'package.json': {
        path: 'package.json',
        language: 'json',
        content: `{
  "name": "cyber-react-app",
  "version": "1.0.0",
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "lucide-react": "^0.500.0"
  }
}`,
      },
      'index.html': {
        path: 'index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Cyber React App</title>
</head>
<body>
  <div id="root"></div>
</body>
</html>`,
      },
    },
  },
  'arcade-game': {
    name: 'Cyber Cat Arcade 2D Game',
    description: 'HTML5 2D Canvas retro game with particle jump mechanics, score, and obstacle collisions',
    framework: 'html',
    activeFilePath: 'index.html',
    files: {
      'index.html': {
        path: 'index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cyber Cat Runner</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    canvas { background: #070913; border: 2px solid #ef233c40; border-radius: 16px; }
  </style>
</head>
<body className="bg-black text-white flex flex-col items-center justify-center min-h-screen p-4 font-mono select-none">
  <div className="flex items-center justify-between w-full max-w-[480px] mb-3">
    <div className="text-sm font-bold text-red-500">🐾 CYBER CAT RUNNER</div>
    <div id="score" className="text-xs font-mono text-emerald-400">Score: 0</div>
  </div>
  <canvas id="game" width="480" height="260" className="shadow-2xl"></canvas>
  <p className="text-[11px] text-neutral-400 mt-3">Press <strong>[SPACE]</strong> or Tap canvas to jump!</p>

  <script>
    const canvas = document.getElementById('game');
    const ctx = canvas.getContext('2d');
    const scoreEl = document.getElementById('score');

    let cat = { x: 50, y: 190, vy: 0, w: 28, h: 28, isGrounded: true };
    let obstacles = [];
    let score = 0;
    let gameOver = false;
    let frame = 0;

    function jump() {
      if (cat.isGrounded && !gameOver) {
        cat.vy = -11;
        cat.isGrounded = false;
      } else if (gameOver) {
        resetGame();
      }
    }

    window.addEventListener('keydown', e => { if (e.code === 'Space') jump(); });
    canvas.addEventListener('click', jump);

    function resetGame() {
      cat.y = 190;
      cat.vy = 0;
      obstacles = [];
      score = 0;
      gameOver = false;
      loop();
    }

    function loop() {
      if (gameOver) return;
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Floor
      ctx.strokeStyle = '#ef233c';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 220);
      ctx.lineTo(canvas.width, 220);
      ctx.stroke();

      // Cat physics
      cat.vy += 0.55;
      cat.y += cat.vy;
      if (cat.y >= 190) { cat.y = 190; cat.vy = 0; cat.isGrounded = true; }

      // Draw Cat
      ctx.fillStyle = '#ef233c';
      ctx.fillRect(cat.x, cat.y, cat.w, cat.h);
      ctx.fillStyle = '#fff';
      ctx.fillRect(cat.x + 18, cat.y + 6, 4, 4); // Eye

      // Spawning obstacles
      if (frame % 85 === 0) {
        obstacles.push({ x: canvas.width, y: 195, w: 18, h: 25 });
      }

      for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        obs.x -= 4.5;
        ctx.fillStyle = '#10b981';
        ctx.fillRect(obs.x, obs.y, obs.w, obs.h);

        // Collision
        if (cat.x < obs.x + obs.w && cat.x + cat.w > obs.x &&
            cat.y < obs.y + obs.h && cat.y + cat.h > obs.y) {
          gameOver = true;
          ctx.fillStyle = 'rgba(0,0,0,0.7)';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '#ef233c';
          ctx.font = 'bold 20px monospace';
          ctx.fillText('GAME OVER', 180, 120);
          ctx.font = '12px monospace';
          ctx.fillStyle = '#fff';
          ctx.fillText('Tap to Restart', 190, 150);
          return;
        }

        if (obs.x + obs.w < 0) {
          obstacles.splice(i, 1);
          score += 10;
          scoreEl.textContent = 'Score: ' + score;
        }
      }

      requestAnimationFrame(loop);
    }
    loop();
  </script>
</body>
</html>`,
      },
    },
  },
  'crypto-dashboard': {
    name: 'Real-Time Market Analytics',
    description: 'Financial dashboard with interactive assets table, allocation charts, and metrics',
    framework: 'react',
    activeFilePath: 'src/Dashboard.tsx',
    files: {
      'src/Dashboard.tsx': {
        path: 'src/Dashboard.tsx',
        language: 'typescript',
        content: `import React, { useState } from 'react';

const ASSETS = [
  { id: '1', name: 'Bitcoin', symbol: 'BTC', price: '$89,450.00', change: '+4.2%', isUp: true },
  { id: '2', name: 'Ethereum', symbol: 'ETH', price: '$3,420.50', change: '+2.8%', isUp: true },
  { id: '3', name: 'Solana', symbol: 'SOL', price: '$182.10', change: '-1.4%', isUp: false },
  { id: '4', name: 'CatCoin', symbol: 'ICAT', price: '$12.45', change: '+18.9%', isUp: true },
];

export default function Dashboard() {
  const [filter, setFilter] = useState('');

  const filtered = ASSETS.filter(a => a.name.toLowerCase().includes(filter.toLowerCase()) || a.symbol.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="min-h-screen bg-[#07090f] text-slate-100 p-6 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex items-center justify-between pb-4 border-b border-white/10">
          <div>
            <h1 className="text-xl font-black text-white">Intelicat Market Pulse</h1>
            <p className="text-xs text-slate-400">High-speed real-time financial telemetry</p>
          </div>
          <input
            type="text"
            placeholder="Search coin..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white outline-none focus:border-red-500"
          />
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-xs text-slate-400">Total Portfolio</span>
            <div className="text-2xl font-black text-white mt-1">$124,590.00</div>
            <span className="text-[11px] text-emerald-400 font-bold">+12.4% this week</span>
          </div>
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-xs text-slate-400">24h Volume</span>
            <div className="text-2xl font-black text-white mt-1">$48.2 Billion</div>
            <span className="text-[11px] text-slate-400">Across 18 exchanges</span>
          </div>
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-xs text-slate-400">Risk Assessment</span>
            <div className="text-2xl font-black text-emerald-400 mt-1">Low (0.18)</div>
            <span className="text-[11px] text-emerald-400">Optimal Sharpe Ratio</span>
          </div>
        </div>

        <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-black/40 text-slate-400 border-b border-white/10">
              <tr>
                <th className="p-3">Asset</th>
                <th className="p-3">Price</th>
                <th className="p-3">24h Change</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map(asset => (
                <tr key={asset.id} className="hover:bg-white/[0.02]">
                  <td className="p-3 font-bold text-white flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-red-600/20 text-red-400 flex items-center justify-center text-xs">🪙</span>
                    {asset.name} <span className="text-slate-400 text-[10px]">{asset.symbol}</span>
                  </td>
                  <td className="p-3 font-mono">{asset.price}</td>
                  <td className={\`p-3 font-bold \${asset.isUp ? 'text-emerald-400' : 'text-red-400'}\`}>{asset.change}</td>
                  <td className="p-3 text-right">
                    <button className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold cursor-pointer">Trade</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}`,
      },
    },
  },
};

/**
 * Normalizes file paths to match project file keys (e.g. "App.tsx" -> "src/App.tsx")
 */
export function normalizeFilePath(rawPath: string, existingFiles: Record<string, any>): string {
  if (!rawPath) return 'src/App.tsx';
  let clean = rawPath.trim().replace(/^(\.\/|\/)/, ''); // strip leading ./ or /
  if (existingFiles[clean]) return clean;

  // Search if any existing file ends with this basename (e.g. "App.tsx" matches "src/App.tsx")
  const baseName = clean.split('/').pop() || clean;
  for (const existingPath of Object.keys(existingFiles)) {
    if (existingPath === clean || existingPath.endsWith('/' + baseName) || existingPath === baseName) {
      return existingPath;
    }
  }

  // If new file in src
  if (!clean.includes('/') && existingFiles['src/App.tsx']) {
    const withSrc = `src/${clean}`;
    if (existingFiles[withSrc]) return withSrc;
  }

  return clean;
}

/**
 * Computes unified diff between two file versions
 */
export function computeFileDiff(path: string, oldContent: string, newContent: string): FileDiff {
  if (oldContent === newContent) {
    return {
      path,
      oldContent,
      newContent,
      status: 'modified',
      additions: 0,
      deletions: 0,
    };
  }

  const oldLines = oldContent ? oldContent.split('\n') : [];
  const newLines = newContent ? newContent.split('\n') : [];

  const status: 'created' | 'modified' | 'deleted' =
    oldLines.length === 0 ? 'created' : newLines.length === 0 ? 'deleted' : 'modified';

  // Basic line addition & deletion metrics
  const additions = Math.max(0, newLines.length - oldLines.length) + (status === 'created' ? newLines.length : 1);
  const deletions = Math.max(0, oldLines.length - newLines.length) + (status === 'deleted' ? oldLines.length : 0);

  return {
    path,
    oldContent,
    newContent,
    status,
    additions,
    deletions,
  };
}

/**
 * Creates a clean new AI Web App project
 */
export function createNewAppProject(userId?: string, title?: string): CodingProject {
  const cleanTitle = title || 'New AI Web App';
  return {
    id: `app_${Date.now()}`,
    userId,
    name: cleanTitle,
    description: 'Created with IntellicatAI Agent',
    framework: 'react',
    files: {
      'src/App.tsx': {
        path: 'src/App.tsx',
        language: 'tsx',
        content: `import React from 'react';\n\nexport default function App() {\n  return (\n    <main className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 font-sans">\n      <div className="max-w-md w-full text-center space-y-4 p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl">\n        <div className="w-16 h-16 rounded-2xl bg-[#EF233C]/20 border border-[#EF233C]/40 mx-auto flex items-center justify-center text-[#EF233C] text-2xl font-bold">\n          🐾\n        </div>\n        <h1 className="text-xl font-black text-white">What would you like to build?</h1>\n        <p className="text-xs text-slate-400 leading-relaxed">\n          Describe your app or tool in the Chat panel. The AI Agent will build the app and launch it right here in real time!\n        </p>\n      </div>\n    </main>\n  );\n}\n`,
      },
      'package.json': {
        path: 'package.json',
        language: 'json',
        content: `{\n  "name": "ai-app",\n  "version": "1.0.0",\n  "dependencies": {\n    "react": "^19.0.0",\n    "react-dom": "^19.0.0",\n    "lucide-react": "^0.500.0"\n  }\n}`,
      },
      'index.html': {
        path: 'index.html',
        language: 'html',
        content: `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>AI Web App</title>\n</head>\n<body>\n  <div id="root"></div>\n</body>\n</html>`,
      },
    },
    activeFilePath: 'src/App.tsx',
    openTabs: ['src/App.tsx'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Loads user coding projects from Firestore & localStorage
 */
export async function loadUserCodingProjects(userId?: string): Promise<CodingProject[]> {
  const localProjects: CodingProject[] = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach((p) => {
          if (p && typeof p === 'object') {
            const validFiles = p.files && Object.keys(p.files).length > 0 ? p.files : createNewAppProject(userId, p.name).files;
            localProjects.push({
              ...p,
              userId: p.userId || userId,
              files: validFiles,
              activeFilePath: p.activeFilePath || Object.keys(validFiles)[0] || 'src/App.tsx',
            });
          }
        });
      }
    }
  } catch (err) {
    console.warn('Failed to parse local coding projects:', err);
  }

  if (userId) {
    try {
      const colRef = collection(db, 'users', userId, 'coding_projects');
      const snap = await getDocs(colRef);
      const remoteProjects: CodingProject[] = [];
      snap.forEach((d) => {
        const data = d.data();
        let parsedFiles: Record<string, ProjectFile> = {};
        if (data.files) {
          try {
            parsedFiles = typeof data.files === 'string' ? JSON.parse(data.files) : data.files;
          } catch (e) {
            console.warn('Failed to parse project files:', e);
          }
        }
        const validFiles = Object.keys(parsedFiles).length > 0 ? parsedFiles : createNewAppProject(userId, data.name).files;
        remoteProjects.push({
          id: d.id,
          userId,
          name: data.name || 'Untitled Project',
          description: data.description || '',
          framework: data.framework || 'react',
          files: validFiles,
          activeFilePath: data.activeFilePath || Object.keys(validFiles)[0] || 'src/App.tsx',
          openTabs: data.openTabs || ['src/App.tsx'],
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
        });
      });

      if (remoteProjects.length > 0) {
        // Merge local & remote
        const mergedMap = new Map<string, CodingProject>();
        localProjects.forEach((p) => mergedMap.set(p.id, p));
        remoteProjects.forEach((p) => mergedMap.set(p.id, p));
        const merged = Array.from(mergedMap.values());
        merged.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        return merged;
      }
    } catch (err) {
      console.warn('Failed to load remote coding projects from firestore:', err);
    }
  }

  localProjects.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());

  // If no projects exist, seed default app
  if (localProjects.length === 0) {
    const initialProject = createNewAppProject(userId, 'My First AI App');
    saveUserCodingProject(initialProject);
    return [initialProject];
  }

  return localProjects;
}

/**
 * Saves a coding project to localStorage and Firestore
 */
export async function saveUserCodingProject(project: CodingProject): Promise<void> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list: CodingProject[] = raw ? JSON.parse(raw) : [];
    const index = list.findIndex((p) => p.id === project.id);
    const updatedProject = { ...project, updatedAt: new Date().toISOString() };

    if (index >= 0) {
      list[index] = updatedProject;
    } else {
      list.unshift(updatedProject);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));

    if (project.userId) {
      const docRef = doc(db, 'users', project.userId, 'coding_projects', project.id);
      await setDoc(docRef, {
        id: project.id,
        userId: project.userId,
        name: project.name,
        description: project.description || '',
        framework: project.framework,
        files: JSON.stringify(project.files),
        activeFilePath: project.activeFilePath,
        openTabs: project.openTabs,
        createdAt: project.createdAt,
        updatedAt: updatedProject.updatedAt,
      }, { merge: true });
    }
  } catch (err) {
    console.error('Failed to save coding project:', err);
  }
}

/**
 * Deletes a coding project
 */
export async function deleteUserCodingProject(projectId: string, userId?: string): Promise<void> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const list: CodingProject[] = JSON.parse(raw);
      const filtered = list.filter((p) => p.id !== projectId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    }

    if (userId) {
      const docRef = doc(db, 'users', userId, 'coding_projects', projectId);
      await deleteDoc(docRef);
    }
  } catch (err) {
    console.error('Failed to delete coding project:', err);
  }
}

/**
 * Exports a project as a ZIP archive
 */
export async function exportProjectAsZip(project: CodingProject): Promise<void> {
  const zip = new JSZip();

  Object.values(project.files).forEach((file) => {
    zip.file(file.path, file.content);
  });

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${project.name.toLowerCase().replace(/[^a-z0-9_-]/g, '-')}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Imports a project from an uploaded ZIP archive
 */
export async function importProjectFromZip(file: File, userId?: string): Promise<CodingProject> {
  const zip = await JSZip.loadAsync(file);
  const files: Record<string, ProjectFile> = {};
  let detectedFramework: 'react' | 'html' | 'vanilla' = 'html';
  let activeFilePath = '';

  const entries: Array<{ path: string; zipEntry: JSZip.JSZipObject }> = [];
  zip.forEach((relativePath, zipEntry) => {
    // Exclude hidden folders, node_modules, build outputs
    if (!zipEntry.dir && !relativePath.includes('node_modules/') && !relativePath.startsWith('__MACOSX/')) {
      entries.push({ path: relativePath, zipEntry });
    }
  });

  for (const item of entries) {
    try {
      const content = await item.zipEntry.async('string');
      const ext = item.path.split('.').pop()?.toLowerCase() || '';

      if (['tsx', 'jsx'].includes(ext)) {
        detectedFramework = 'react';
      }

      files[item.path] = {
        path: item.path,
        content,
        language: ext,
      };

      if (!activeFilePath || item.path.includes('App') || item.path === 'index.html') {
        activeFilePath = item.path;
      }
    } catch (e) {
      console.warn('Skipped binary or non-text file in ZIP:', item.path);
    }
  }

  const projectName = file.name.replace(/\.zip$/i, '') || 'Imported Project';
  const newProject: CodingProject = {
    id: `proj-${Date.now()}`,
    userId,
    name: projectName,
    description: `Imported from ZIP archive (${Object.keys(files).length} files)`,
    framework: detectedFramework,
    files,
    activeFilePath: activeFilePath || Object.keys(files)[0] || '',
    openTabs: Object.keys(files).slice(0, 5),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await saveUserCodingProject(newProject);
  return newProject;
}

/**
 * Imports a repository from GitHub public API
 */
export async function importProjectFromGitHub(repoUrl: string, userId?: string): Promise<CodingProject> {
  // Normalize GitHub URL e.g. https://github.com/owner/repo
  const cleanUrl = repoUrl.trim().replace(/\/+$/, '');
  const match = cleanUrl.match(/github\.com\/([^/]+)\/([^/]+)/i);

  if (!match) {
    throw new Error('Please enter a valid GitHub repository URL (e.g. https://github.com/owner/repo)');
  }

  const owner = match[1];
  const repo = match[2].replace(/\.git$/i, '');

  // 1. Fetch repo metadata
  const metaRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
  if (!metaRes.ok) {
    throw new Error(`GitHub repository not found or access restricted (${metaRes.status}).`);
  }
  const meta = await metaRes.json();
  const defaultBranch = meta.default_branch || 'main';

  // 2. Fetch repo tree
  const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`);
  if (!treeRes.ok) {
    throw new Error(`Failed to read repository file tree (${treeRes.status}).`);
  }
  const treeData = await treeRes.json();

  const files: Record<string, ProjectFile> = {};
  let detectedFramework: 'react' | 'html' | 'vanilla' = 'react';
  let activeFilePath = '';

  const validTreeItems = (treeData.tree || [])
    .filter((item: any) => item.type === 'blob')
    .filter((item: any) => {
      const p = item.path.toLowerCase();
      return (
        !p.includes('node_modules/') &&
        !p.startsWith('.git/') &&
        !p.includes('dist/') &&
        !p.includes('build/') &&
        !p.match(/\.(png|jpe?g|gif|webp|svg|ico|pdf|zip|mp4|exe|woff2?|lock)$/)
      );
    })
    .slice(0, 30); // Bounded to 30 core files

  for (const item of validTreeItems) {
    try {
      const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/${item.path}`;
      const fileRes = await fetch(rawUrl);
      if (fileRes.ok) {
        const content = await fileRes.text();
        const ext = item.path.split('.').pop()?.toLowerCase() || '';

        files[item.path] = {
          path: item.path,
          content,
          language: ext,
        };

        if (!activeFilePath || item.path.includes('App') || item.path.endsWith('index.html')) {
          activeFilePath = item.path;
        }
      }
    } catch {
      // Continue next file
    }
  }

  if (Object.keys(files).length === 0) {
    throw new Error('No accessible text or source code files found in repository.');
  }

  const project: CodingProject = {
    id: `proj-${Date.now()}`,
    userId,
    name: `${repo} (GitHub)`,
    description: meta.description || `Imported from ${owner}/${repo}`,
    framework: detectedFramework,
    files,
    activeFilePath: activeFilePath || Object.keys(files)[0],
    openTabs: Object.keys(files).slice(0, 4),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await saveUserCodingProject(project);
  return project;
}

/**
 * Creates and restores project rollback checkpoints
 */
export function saveProjectCheckpoint(project: CodingProject, title: string): ProjectCheckpoint {
  const checkpoint: ProjectCheckpoint = {
    id: `chk-${Date.now()}`,
    projectId: project.id,
    title,
    timestamp: Date.now(),
    files: JSON.parse(JSON.stringify(project.files)),
  };

  try {
    const raw = localStorage.getItem(`${CHECKPOINTS_STORAGE_KEY}_${project.id}`);
    const list: ProjectCheckpoint[] = raw ? JSON.parse(raw) : [];
    list.unshift(checkpoint);
    localStorage.setItem(`${CHECKPOINTS_STORAGE_KEY}_${project.id}`, JSON.stringify(list.slice(0, 10)));
  } catch (err) {
    console.warn('Failed to save checkpoint:', err);
  }

  return checkpoint;
}

export function loadProjectCheckpoints(projectId: string): ProjectCheckpoint[] {
  try {
    const raw = localStorage.getItem(`${CHECKPOINTS_STORAGE_KEY}_${projectId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
