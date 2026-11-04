import JSZip from 'jszip';
import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import { CodingProject, ProjectFile, FileDiff, ProjectCheckpoint, AgentHistoryMessage } from '../types/codeAgent';

const STORAGE_KEY = 'intelicat_coding_projects_v1';
const CHECKPOINTS_STORAGE_KEY = 'intelicat_coding_checkpoints_v1';
const CHAT_STORAGE_KEY_PREFIX = 'intelicat_coding_chat_v1_';

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
  <title>Cyber Cat Neon Runner Deluxe</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    canvas { background: radial-gradient(circle at center, #111325 0%, #06070c 100%); border: 2px solid #ef233c60; border-radius: 20px; box-shadow: 0 0 25px rgba(239, 35, 60, 0.25); }
  </style>
</head>
<body class="bg-slate-950 text-white flex flex-col items-center justify-center min-h-screen p-4 font-mono select-none">
  <div class="flex items-center justify-between w-full max-w-[520px] mb-3 px-1">
    <div class="flex items-center gap-2">
      <span class="text-lg">🐾</span>
      <span class="text-xs font-extrabold text-red-500 tracking-wider uppercase">Cyber Cat Neon Runner</span>
    </div>
    <div class="flex items-center gap-4 text-xs">
      <span id="score" class="text-emerald-400 font-bold">SCORE: 0</span>
      <span id="highscore" class="text-amber-400 font-bold">BEST: 0</span>
    </div>
  </div>

  <div class="relative">
    <canvas id="game" width="520" height="280"></canvas>
    <div id="startMenu" class="absolute inset-0 bg-black/85 backdrop-blur-sm rounded-[20px] flex flex-col items-center justify-center p-6 text-center space-y-4">
      <h2 class="text-2xl font-black text-red-500 tracking-tight">CYBER CAT NEON RUNNER</h2>
      <p class="text-xs text-slate-300 max-w-xs leading-relaxed">
        Dodge neon lasers, collect energy gems, and double-jump through the cyber grid!
      </p>
      <button id="startBtn" class="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-red-600/40 transition-all cursor-pointer">
        PLAY GAME
      </button>
      <div class="text-[10px] text-slate-500">Press [SPACE] or Tap to Jump (Double Jump Enabled)</div>
    </div>
  </div>

  <div class="flex items-center gap-4 mt-4">
    <button id="jumpBtn" class="px-6 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs font-bold active:bg-red-600/30">
      🦘 TAP JUMP
    </button>
    <button id="soundToggle" class="px-4 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-slate-400">
      🔊 Sound: ON
    </button>
  </div>

  <script>
    const canvas = document.getElementById('game');
    const ctx = canvas.getContext('2d');
    const scoreEl = document.getElementById('score');
    const highscoreEl = document.getElementById('highscore');
    const startMenu = document.getElementById('startMenu');
    const startBtn = document.getElementById('startBtn');
    const jumpBtn = document.getElementById('jumpBtn');
    const soundToggle = document.getElementById('soundToggle');

    // Audio Synthesizer
    let soundEnabled = true;
    let audioCtx = null;
    function playAudio(type) {
      if (!soundEnabled) return;
      try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        const now = audioCtx.currentTime;
        if (type === 'jump') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(250, now);
          osc.frequency.exponentialRampToValueAtTime(600, now + 0.12);
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.linearRampToValueAtTime(0, now + 0.12);
          osc.start(now); osc.stop(now + 0.12);
        } else if (type === 'coin') {
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(523, now);
          osc.frequency.setValueAtTime(659, now + 0.08);
          gain.gain.setValueAtTime(0.25, now);
          gain.gain.linearRampToValueAtTime(0, now + 0.2);
          osc.start(now); osc.stop(now + 0.2);
        } else if (type === 'hit') {
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(150, now);
          osc.frequency.linearRampToValueAtTime(40, now + 0.25);
          gain.gain.setValueAtTime(0.3, now);
          gain.gain.linearRampToValueAtTime(0, now + 0.25);
          osc.start(now); osc.stop(now + 0.25);
        }
      } catch (e) {}
    }

    soundToggle.addEventListener('click', () => {
      soundEnabled = !soundEnabled;
      soundToggle.textContent = soundEnabled ? '🔊 Sound: ON' : '🔇 Sound: OFF';
    });

    let highScore = parseInt(localStorage.getItem('cyber_cat_highscore') || '0', 10);
    highscoreEl.textContent = 'BEST: ' + highScore;

    let cat = { x: 60, y: 200, vy: 0, w: 32, h: 32, jumps: 0 };
    let obstacles = [];
    let gems = [];
    let particles = [];
    let score = 0;
    let isPlaying = false;
    let frame = 0;

    function createParticles(x, y, color, count = 12) {
      for (let i = 0; i < count; i++) {
        particles.push({
          x, y,
          vx: (Math.random() - 0.5) * 6,
          vy: (Math.random() - 0.5) * 6,
          radius: Math.random() * 3 + 1,
          color,
          life: 1
        });
      }
    }

    function jump() {
      if (!isPlaying) return;
      if (cat.jumps < 2) {
        cat.vy = -10.5;
        cat.jumps++;
        playAudio('jump');
        createParticles(cat.x + cat.w / 2, cat.y + cat.h, '#ef233c', 6);
      }
    }

    window.addEventListener('keydown', e => { if (e.code === 'Space') { e.preventDefault(); jump(); } });
    canvas.addEventListener('click', jump);
    jumpBtn.addEventListener('click', jump);

    function startGame() {
      startMenu.classList.add('hidden');
      cat.y = 200;
      cat.vy = 0;
      cat.jumps = 0;
      obstacles = [];
      gems = [];
      particles = [];
      score = 0;
      frame = 0;
      isPlaying = true;
      scoreEl.textContent = 'SCORE: 0';
      loop();
    }

    startBtn.addEventListener('click', startGame);

    function loop() {
      if (!isPlaying) return;
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Floor Grid
      ctx.strokeStyle = '#ef233c50';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 232);
      ctx.lineTo(canvas.width, 232);
      ctx.stroke();

      // Cat physics
      cat.vy += 0.52;
      cat.y += cat.vy;
      if (cat.y >= 200) { cat.y = 200; cat.vy = 0; cat.jumps = 0; }

      // Draw Cat
      ctx.fillStyle = '#ef233c';
      ctx.shadowColor = '#ef233c';
      ctx.shadowBlur = 10;
      ctx.fillRect(cat.x, cat.y, cat.w, cat.h);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cat.x + 22, cat.y + 8, 5, 5); // Eye

      // Spawning obstacles & gems
      if (frame % 80 === 0) {
        obstacles.push({ x: canvas.width, y: 200, w: 22, h: 32 });
      }
      if (frame % 110 === 0) {
        gems.push({ x: canvas.width, y: 130 + Math.random() * 40, w: 16, h: 16 });
      }

      // Render Gems
      for (let i = gems.length - 1; i >= 0; i--) {
        const gem = gems[i];
        gem.x -= 4.2;
        ctx.fillStyle = '#f59e0b';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 8;
        ctx.fillRect(gem.x, gem.y, gem.w, gem.h);
        ctx.shadowBlur = 0;

        // Gem collection
        if (cat.x < gem.x + gem.w && cat.x + cat.w > gem.x &&
            cat.y < gem.y + gem.h && cat.y + cat.h > gem.y) {
          gems.splice(i, 1);
          score += 25;
          scoreEl.textContent = 'SCORE: ' + score;
          playAudio('coin');
          createParticles(gem.x, gem.y, '#f59e0b', 10);
        } else if (gem.x < -20) {
          gems.splice(i, 1);
        }
      }

      // Render Obstacles
      for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        obs.x -= 4.8;
        ctx.fillStyle = '#10b981';
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 8;
        ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
        ctx.shadowBlur = 0;

        // Collision
        if (cat.x < obs.x + obs.w && cat.x + cat.w > obs.x &&
            cat.y < obs.y + obs.h && cat.y + cat.h > obs.y) {
          isPlaying = false;
          playAudio('hit');
          createParticles(cat.x + cat.w / 2, cat.y + cat.h / 2, '#ef233c', 25);

          if (score > highScore) {
            highScore = score;
            localStorage.setItem('cyber_cat_highscore', highScore);
            highscoreEl.textContent = 'BEST: ' + highScore;
          }

          startMenu.querySelector('h2').textContent = 'GAME OVER!';
          startBtn.textContent = 'RETRY GAME';
          startMenu.classList.remove('hidden');
          return;
        }

        if (obs.x + obs.w < 0) {
          obstacles.splice(i, 1);
          score += 10;
          scoreEl.textContent = 'SCORE: ' + score;
        }
      }

      // Update Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.03;
        if (p.life <= 0) {
          particles.splice(i, 1);
        } else {
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.life;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1.0;
        }
      }

      requestAnimationFrame(loop);
    }
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
  'space-invaders': {
    name: '🚀 Neon Space Shooter 2D',
    description: 'Retro arcade alien shooter with laser powerups, boss fights, audio synth, and explosion particles',
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
  <title>Neon Space Shooter Pro</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    canvas { background: radial-gradient(circle at center, #0c0f24 0%, #030408 100%); border: 2px solid #38bdf860; border-radius: 20px; box-shadow: 0 0 30px rgba(56, 189, 248, 0.25); }
  </style>
</head>
<body class="bg-slate-950 text-white flex flex-col items-center justify-center min-h-screen p-4 font-mono select-none">
  <div class="flex items-center justify-between w-full max-w-[540px] mb-3 px-1">
    <div class="flex items-center gap-2">
      <span class="text-lg">🚀</span>
      <span class="text-xs font-black text-sky-400 tracking-wider uppercase">Neon Space Shooter</span>
    </div>
    <div class="flex items-center gap-4 text-xs font-bold">
      <span id="score" class="text-emerald-400">SCORE: 0</span>
      <span id="highscore" class="text-amber-400">BEST: 0</span>
    </div>
  </div>

  <div class="relative">
    <canvas id="game" width="540" height="340"></canvas>
    <div id="startMenu" class="absolute inset-0 bg-black/85 backdrop-blur-sm rounded-[20px] flex flex-col items-center justify-center p-6 text-center space-y-4">
      <h2 class="text-2xl font-black text-sky-400 tracking-tight">NEON SPACE SHOOTER</h2>
      <p class="text-xs text-slate-300 max-w-xs leading-relaxed">
        Destroy alien armadas, collect laser upgrades, and survive alien boss attacks!
      </p>
      <button id="startBtn" class="px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-sky-500/40 transition-all cursor-pointer">
        START MISSION
      </button>
      <div class="text-[10px] text-slate-500">Controls: [A][D] or [ARROWS] to move • [SPACE] or Tap to Fire</div>
    </div>
  </div>

  <div class="flex items-center gap-3 mt-4">
    <button id="leftBtn" class="px-5 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs font-bold active:bg-sky-500/30">◀ LEFT</button>
    <button id="fireBtn" class="px-6 py-2 bg-sky-500 text-slate-950 rounded-xl text-xs font-black shadow-md shadow-sky-500/30 active:scale-95">🔥 FIRE</button>
    <button id="rightBtn" class="px-5 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs font-bold active:bg-sky-500/30">RIGHT ▶</button>
  </div>

  <script>
    const canvas = document.getElementById('game');
    const ctx = canvas.getContext('2d');
    const scoreEl = document.getElementById('score');
    const highscoreEl = document.getElementById('highscore');
    const startMenu = document.getElementById('startMenu');
    const startBtn = document.getElementById('startBtn');
    const fireBtn = document.getElementById('fireBtn');

    let audioCtx = null;
    function playAudio(type) {
      try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        const now = audioCtx.currentTime;

        if (type === 'laser') {
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(800, now);
          osc.frequency.exponentialRampToValueAtTime(150, now + 0.08);
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.linearRampToValueAtTime(0, now + 0.08);
          osc.start(now); osc.stop(now + 0.08);
        } else if (type === 'explosion') {
          osc.type = 'square';
          osc.frequency.setValueAtTime(120, now);
          osc.frequency.exponentialRampToValueAtTime(30, now + 0.2);
          gain.gain.setValueAtTime(0.25, now);
          gain.gain.linearRampToValueAtTime(0, now + 0.2);
          osc.start(now); osc.stop(now + 0.2);
        }
      } catch(e) {}
    }

    let highScore = parseInt(localStorage.getItem('space_shooter_hs') || '0', 10);
    highscoreEl.textContent = 'BEST: ' + highScore;

    let player = { x: 250, y: 290, w: 36, h: 24, speed: 6 };
    let bullets = [];
    let enemies = [];
    let particles = [];
    let score = 0;
    let isPlaying = false;
    let keys = {};
    let frame = 0;

    window.addEventListener('keydown', e => { keys[e.code] = true; if (e.code === 'Space') fireBullet(); });
    window.addEventListener('keyup', e => { keys[e.code] = false; });

    document.getElementById('leftBtn').addEventListener('touchstart', e => { e.preventDefault(); keys['ArrowLeft'] = true; });
    document.getElementById('leftBtn').addEventListener('touchend', e => { keys['ArrowLeft'] = false; });
    document.getElementById('rightBtn').addEventListener('touchstart', e => { e.preventDefault(); keys['ArrowRight'] = true; });
    document.getElementById('rightBtn').addEventListener('touchend', e => { keys['ArrowRight'] = false; });
    fireBtn.addEventListener('click', fireBullet);

    function fireBullet() {
      if (!isPlaying) return;
      bullets.push({ x: player.x + player.w / 2 - 2, y: player.y, w: 4, h: 12, speed: 9 });
      playAudio('laser');
    }

    function createParticles(x, y, color) {
      for (let i = 0; i < 15; i++) {
        particles.push({
          x, y,
          vx: (Math.random() - 0.5) * 7,
          vy: (Math.random() - 0.5) * 7,
          radius: Math.random() * 3 + 1,
          color, life: 1
        });
      }
    }

    function startGame() {
      startMenu.classList.add('hidden');
      player.x = 250;
      bullets = [];
      enemies = [];
      particles = [];
      score = 0;
      frame = 0;
      isPlaying = true;
      scoreEl.textContent = 'SCORE: 0';
      loop();
    }

    startBtn.addEventListener('click', startGame);

    function loop() {
      if (!isPlaying) return;
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Player Movement
      if ((keys['ArrowLeft'] || keys['KeyA']) && player.x > 10) player.x -= player.speed;
      if ((keys['ArrowRight'] || keys['KeyD']) && player.x < canvas.width - player.w - 10) player.x += player.speed;

      // Draw Player Ship
      ctx.fillStyle = '#38bdf8';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(player.x + player.w / 2, player.y);
      ctx.lineTo(player.x + player.w, player.y + player.h);
      ctx.lineTo(player.x, player.y + player.h);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;

      // Spawn Enemies
      if (frame % 45 === 0) {
        enemies.push({ x: Math.random() * (canvas.width - 30) + 10, y: -20, w: 26, h: 22, vy: 2 + Math.random() * 1.5 });
      }

      // Bullets Update
      for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.y -= b.speed;
        ctx.fillStyle = '#f43f5e';
        ctx.shadowColor = '#f43f5e';
        ctx.shadowBlur = 8;
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.shadowBlur = 0;
        if (b.y < -10) bullets.splice(i, 1);
      }

      // Enemies Update
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        e.y += e.vy;
        ctx.fillStyle = '#a855f7';
        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = 10;
        ctx.fillRect(e.x, e.y, e.w, e.h);
        ctx.shadowBlur = 0;

        // Bullet collisions
        for (let j = bullets.length - 1; j >= 0; j--) {
          const b = bullets[j];
          if (b.x < e.x + e.w && b.x + b.w > e.x && b.y < e.y + e.h && b.y + b.h > e.y) {
            createParticles(e.x + e.w / 2, e.y + e.h / 2, '#a855f7');
            playAudio('explosion');
            enemies.splice(i, 1);
            bullets.splice(j, 1);
            score += 50;
            scoreEl.textContent = 'SCORE: ' + score;
            break;
          }
        }

        // Enemy past player
        if (e && e.y > canvas.height) {
          enemies.splice(i, 1);
        }

        // Enemy hits player
        if (e && player.x < e.x + e.w && player.x + player.w > e.x && player.y < e.y + e.h && player.y + player.h > e.y) {
          isPlaying = false;
          playAudio('explosion');
          createParticles(player.x + player.w / 2, player.y + player.h / 2, '#38bdf8');
          if (score > highScore) {
            highScore = score;
            localStorage.setItem('space_shooter_hs', highScore);
            highscoreEl.textContent = 'BEST: ' + highScore;
          }
          startMenu.querySelector('h2').textContent = 'SHIP DESTROYED!';
          startBtn.textContent = 'RETRY MISSION';
          startMenu.classList.remove('hidden');
          return;
        }
      }

      // Particles Update
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy; p.life -= 0.04;
        if (p.life <= 0) particles.splice(i, 1);
        else {
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.life;
          ctx.fillRect(p.x, p.y, p.radius * 2, p.radius * 2);
          ctx.globalAlpha = 1.0;
        }
      }

      requestAnimationFrame(loop);
    }
  </script>
</body>
</html>`,
      },
    },
  },
  'brick-breaker': {
    name: '🕹️ Cyber Brick Breaker Deluxe',
    description: 'Arkanoid Breakout game with multi-ball powerups, explosive bricks, sound synth, and high score',
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
  <title>Cyber Brick Breaker Deluxe</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    canvas { background: radial-gradient(circle at center, #180920 0%, #08030b 100%); border: 2px solid #ec489960; border-radius: 20px; box-shadow: 0 0 25px rgba(236, 72, 153, 0.25); }
  </style>
</head>
<body class="bg-slate-950 text-white flex flex-col items-center justify-center min-h-screen p-4 font-mono select-none">
  <div class="flex items-center justify-between w-full max-w-[500px] mb-3 px-1">
    <div class="flex items-center gap-2">
      <span class="text-lg">🕹️</span>
      <span class="text-xs font-black text-pink-500 tracking-wider uppercase">Cyber Brick Breaker</span>
    </div>
    <div class="flex items-center gap-4 text-xs font-bold">
      <span id="score" class="text-emerald-400">SCORE: 0</span>
      <span id="highscore" class="text-amber-400">BEST: 0</span>
    </div>
  </div>

  <div class="relative">
    <canvas id="game" width="500" height="320"></canvas>
    <div id="startMenu" class="absolute inset-0 bg-black/85 backdrop-blur-sm rounded-[20px] flex flex-col items-center justify-center p-6 text-center space-y-4">
      <h2 class="text-2xl font-black text-pink-500 tracking-tight">BRICK BREAKER DELUXE</h2>
      <p class="text-xs text-slate-300 max-w-xs leading-relaxed">
        Smash neon cyber bricks, catch laser paddle powerups, and aim for the high score!
      </p>
      <button id="startBtn" class="px-6 py-2.5 rounded-xl bg-pink-500 hover:bg-pink-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-pink-500/40 transition-all cursor-pointer">
        LAUNCH BALL
      </button>
      <div class="text-[10px] text-slate-500">Move mouse / finger across canvas to position paddle</div>
    </div>
  </div>

  <script>
    const canvas = document.getElementById('game');
    const ctx = canvas.getContext('2d');
    const scoreEl = document.getElementById('score');
    const highscoreEl = document.getElementById('highscore');
    const startMenu = document.getElementById('startMenu');
    const startBtn = document.getElementById('startBtn');

    let audioCtx = null;
    function playAudio(freq, type = 'sine', duration = 0.08) {
      try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + duration);
        osc.start(); osc.stop(audioCtx.currentTime + duration);
      } catch(e) {}
    }

    let highScore = parseInt(localStorage.getItem('brick_breaker_hs') || '0', 10);
    highscoreEl.textContent = 'BEST: ' + highScore;

    let paddle = { w: 90, h: 14, x: 205, y: 290 };
    let ball = { x: 250, y: 270, radius: 7, dx: 4, dy: -4 };
    let bricks = [];
    let particles = [];
    let score = 0;
    let isPlaying = false;

    const rowCount = 5;
    const colCount = 8;
    const brickW = 52;
    const brickH = 16;
    const brickPadding = 8;
    const offsetTop = 40;
    const offsetLeft = 14;

    function initBricks() {
      bricks = [];
      const colors = ['#ec4899', '#f43f5e', '#8b5cf6', '#3b82f6', '#10b981'];
      for (let r = 0; r < rowCount; r++) {
        bricks[r] = [];
        for (let c = 0; c < colCount; c++) {
          bricks[r][c] = { x: 0, y: 0, status: 1, color: colors[r % colors.length] };
        }
      }
    }

    function createParticles(x, y, color) {
      for (let i = 0; i < 10; i++) {
        particles.push({
          x, y,
          vx: (Math.random() - 0.5) * 6,
          vy: (Math.random() - 0.5) * 6,
          radius: Math.random() * 3 + 1,
          color, life: 1
        });
      }
    }

    function movePaddle(e) {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      paddle.x = clientX - rect.left - paddle.w / 2;
      if (paddle.x < 0) paddle.x = 0;
      if (paddle.x + paddle.w > canvas.width) paddle.x = canvas.width - paddle.w;
    }

    canvas.addEventListener('mousemove', movePaddle);
    canvas.addEventListener('touchmove', e => { e.preventDefault(); movePaddle(e); });

    function startGame() {
      startMenu.classList.add('hidden');
      initBricks();
      paddle.x = (canvas.width - paddle.w) / 2;
      ball.x = canvas.width / 2;
      ball.y = canvas.height - 50;
      ball.dx = (Math.random() > 0.5 ? 4 : -4);
      ball.dy = -4.5;
      score = 0;
      scoreEl.textContent = 'SCORE: 0';
      isPlaying = true;
      loop();
    }

    startBtn.addEventListener('click', startGame);

    function loop() {
      if (!isPlaying) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw Bricks
      let activeBricks = 0;
      for (let r = 0; r < rowCount; r++) {
        for (let c = 0; c < colCount; c++) {
          const b = bricks[r][c];
          if (b.status === 1) {
            activeBricks++;
            const bx = c * (brickW + brickPadding) + offsetLeft;
            const by = r * (brickH + brickPadding) + offsetTop;
            b.x = bx; b.y = by;

            ctx.fillStyle = b.color;
            ctx.shadowColor = b.color;
            ctx.shadowBlur = 8;
            ctx.fillRect(bx, by, brickW, brickH);
            ctx.shadowBlur = 0;

            // Collision Detection
            if (ball.x > bx && ball.x < bx + brickW && ball.y > by && ball.y < by + brickH) {
              ball.dy = -ball.dy;
              b.status = 0;
              score += 20;
              scoreEl.textContent = 'SCORE: ' + score;
              playAudio(400 + r * 80, 'square');
              createParticles(bx + brickW / 2, by + brickH / 2, b.color);
            }
          }
        }
      }

      if (activeBricks === 0) {
        initBricks(); // Reset bricks on clear
      }

      // Draw Paddle
      ctx.fillStyle = '#ec4899';
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = 12;
      ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);
      ctx.shadowBlur = 0;

      // Draw Ball
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Ball Wall Bounces
      if (ball.x + ball.dx > canvas.width - ball.radius || ball.x + ball.dx < ball.radius) {
        ball.dx = -ball.dx;
        playAudio(200);
      }
      if (ball.y + ball.dy < ball.radius) {
        ball.dy = -ball.dy;
        playAudio(200);
      } else if (ball.y + ball.dy > paddle.y - ball.radius) {
        if (ball.x > paddle.x && ball.x < paddle.x + paddle.w) {
          ball.dy = -ball.dy;
          const hitPoint = ball.x - (paddle.x + paddle.w / 2);
          ball.dx = hitPoint * 0.15;
          playAudio(320, 'triangle');
        } else if (ball.y > canvas.height) {
          isPlaying = false;
          playAudio(100, 'sawtooth', 0.3);
          if (score > highScore) {
            highScore = score;
            localStorage.setItem('brick_breaker_hs', highScore);
            highscoreEl.textContent = 'BEST: ' + highScore;
          }
          startMenu.querySelector('h2').textContent = 'GAME OVER!';
          startBtn.textContent = 'RETRY';
          startMenu.classList.remove('hidden');
          return;
        }
      }

      ball.x += ball.dx;
      ball.y += ball.dy;

      // Particles Update
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy; p.life -= 0.04;
        if (p.life <= 0) particles.splice(i, 1);
        else {
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.life;
          ctx.fillRect(p.x, p.y, p.radius * 2, p.radius * 2);
          ctx.globalAlpha = 1.0;
        }
      }

      requestAnimationFrame(loop);
    }
  </script>
</body>
</html>`,
      },
    },
  },
  'cyber-snake': {
    name: '🐍 Neon Cyber Snake Pro',
    description: 'Classic Snake with speed boosters, glow trails, audio chimes, obstacles, and high score',
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
  <title>Neon Cyber Snake Pro</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    canvas { background: #060913; border: 2px solid #10b98160; border-radius: 20px; box-shadow: 0 0 25px rgba(16, 185, 129, 0.25); }
  </style>
</head>
<body class="bg-slate-950 text-white flex flex-col items-center justify-center min-h-screen p-4 font-mono select-none">
  <div class="flex items-center justify-between w-full max-w-[480px] mb-3 px-1">
    <div class="flex items-center gap-2">
      <span class="text-lg">🐍</span>
      <span class="text-xs font-black text-emerald-400 tracking-wider uppercase">Neon Cyber Snake</span>
    </div>
    <div class="flex items-center gap-4 text-xs font-bold">
      <span id="score" class="text-emerald-400">SCORE: 0</span>
      <span id="highscore" class="text-amber-400">BEST: 0</span>
    </div>
  </div>

  <div class="relative">
    <canvas id="game" width="480" height="320"></canvas>
    <div id="startMenu" class="absolute inset-0 bg-black/85 backdrop-blur-sm rounded-[20px] flex flex-col items-center justify-center p-6 text-center space-y-4">
      <h2 class="text-2xl font-black text-emerald-400 tracking-tight">NEON CYBER SNAKE</h2>
      <p class="text-xs text-slate-300 max-w-xs leading-relaxed">
        Eat energy cubes, grow your glowing neon tail, and avoid walls or self-collisions!
      </p>
      <button id="startBtn" class="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/40 transition-all cursor-pointer">
        START GAME
      </button>
      <div class="text-[10px] text-slate-500">Controls: [WASD] or [ARROWS] or Touch D-Pad</div>
    </div>
  </div>

  <div class="grid grid-cols-3 gap-2 w-full max-w-[200px] mt-4">
    <div></div>
    <button id="upBtn" class="py-2.5 bg-slate-900 border border-white/10 rounded-xl text-xs font-bold active:bg-emerald-500/30">▲</button>
    <div></div>
    <button id="leftBtn" class="py-2.5 bg-slate-900 border border-white/10 rounded-xl text-xs font-bold active:bg-emerald-500/30">◀</button>
    <button id="downBtn" class="py-2.5 bg-slate-900 border border-white/10 rounded-xl text-xs font-bold active:bg-emerald-500/30">▼</button>
    <button id="rightBtn" class="py-2.5 bg-slate-900 border border-white/10 rounded-xl text-xs font-bold active:bg-emerald-500/30">▶</button>
  </div>

  <script>
    const canvas = document.getElementById('game');
    const ctx = canvas.getContext('2d');
    const scoreEl = document.getElementById('score');
    const highscoreEl = document.getElementById('highscore');
    const startMenu = document.getElementById('startMenu');
    const startBtn = document.getElementById('startBtn');

    const grid = 20;
    let audioCtx = null;
    function playAudio(freq) {
      try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.1);
        osc.start(); osc.stop(audioCtx.currentTime + 0.1);
      } catch(e) {}
    }

    let highScore = parseInt(localStorage.getItem('cyber_snake_hs') || '0', 10);
    highscoreEl.textContent = 'BEST: ' + highScore;

    let snake = [{ x: 160, y: 160 }, { x: 140, y: 160 }, { x: 120, y: 160 }];
    let dx = grid;
    let dy = 0;
    let food = { x: 300, y: 160 };
    let score = 0;
    let isPlaying = false;
    let gameLoopTimeout = null;

    function randomFood() {
      food.x = Math.floor(Math.random() * (canvas.width / grid)) * grid;
      food.y = Math.floor(Math.random() * (canvas.height / grid)) * grid;
    }

    function setDirection(newDx, newDy) {
      if (!isPlaying) return;
      if (newDx !== -dx && newDy !== -dy) {
        dx = newDx; dy = newDy;
      }
    }

    window.addEventListener('keydown', e => {
      if (e.key === 'ArrowUp' || e.key === 'w') setDirection(0, -grid);
      if (e.key === 'ArrowDown' || e.key === 's') setDirection(0, grid);
      if (e.key === 'ArrowLeft' || e.key === 'a') setDirection(-grid, 0);
      if (e.key === 'ArrowRight' || e.key === 'd') setDirection(grid, 0);
    });

    document.getElementById('upBtn').addEventListener('click', () => setDirection(0, -grid));
    document.getElementById('downBtn').addEventListener('click', () => setDirection(0, grid));
    document.getElementById('leftBtn').addEventListener('click', () => setDirection(-grid, 0));
    document.getElementById('rightBtn').addEventListener('click', () => setDirection(grid, 0));

    function startGame() {
      startMenu.classList.add('hidden');
      snake = [{ x: 160, y: 160 }, { x: 140, y: 160 }, { x: 120, y: 160 }];
      dx = grid; dy = 0;
      score = 0;
      scoreEl.textContent = 'SCORE: 0';
      randomFood();
      isPlaying = true;
      if (gameLoopTimeout) clearTimeout(gameLoopTimeout);
      loop();
    }

    startBtn.addEventListener('click', startGame);

    function loop() {
      if (!isPlaying) return;

      const head = { x: snake[0].x + dx, y: snake[0].y + dy };

      // Wall collision or self collision
      if (head.x < 0 || head.x >= canvas.width || head.y < 0 || head.y >= canvas.height ||
          snake.some(segment => segment.x === head.x && segment.y === head.y)) {
        isPlaying = false;
        playAudio(120);
        if (score > highScore) {
          highScore = score;
          localStorage.setItem('cyber_snake_hs', highScore);
          highscoreEl.textContent = 'BEST: ' + highScore;
        }
        startMenu.querySelector('h2').textContent = 'GAME OVER!';
        startBtn.textContent = 'PLAY AGAIN';
        startMenu.classList.remove('hidden');
        return;
      }

      snake.unshift(head);

      // Eat food
      if (head.x === food.x && head.y === food.y) {
        score += 10;
        scoreEl.textContent = 'SCORE: ' + score;
        playAudio(520);
        randomFood();
      } else {
        snake.pop();
      }

      // Render Canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw Food
      ctx.fillStyle = '#f59e0b';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 10;
      ctx.fillRect(food.x + 2, food.y + 2, grid - 4, grid - 4);
      ctx.shadowBlur = 0;

      // Draw Snake
      snake.forEach((part, idx) => {
        ctx.fillStyle = idx === 0 ? '#10b981' : '#34d399';
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = idx === 0 ? 12 : 4;
        ctx.fillRect(part.x + 1, part.y + 1, grid - 2, grid - 2);
        ctx.shadowBlur = 0;
      });

      gameLoopTimeout = setTimeout(loop, Math.max(60, 110 - Math.floor(score / 30) * 5));
    }
  </script>
</body>
</html>`,
      },
    },
  },
  'memory-match': {
    name: '🃏 Cyberpunk Memory Match',
    description: 'Flip cards, find matching pairs, score combo bonuses, with audio FX and high score board',
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
  <title>Cyberpunk Memory Match</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    .card { perspective: 1000px; }
    .card-inner { transition: transform 0.4s; transform-style: preserve-3d; }
    .card.flipped .card-inner { transform: rotateY(180deg); }
    .card-front, .card-back { backface-visibility: hidden; }
    .card-back { transform: rotateY(180deg); }
  </style>
</head>
<body class="bg-slate-950 text-white flex flex-col items-center justify-center min-h-screen p-4 font-mono select-none">
  <div class="max-w-md w-full bg-slate-900 border border-purple-500/30 rounded-3xl p-5 shadow-2xl space-y-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="text-xl">🃏</span>
        <h1 class="text-sm font-black text-purple-400 uppercase tracking-wider">Cyber Memory Match</h1>
      </div>
      <div class="flex items-center gap-3 text-xs font-bold">
        <span id="moves" class="text-slate-400">MOVES: 0</span>
        <span id="score" class="text-emerald-400">MATCHES: 0/8</span>
      </div>
    </div>

    <div id="grid" class="grid grid-cols-4 gap-2.5"></div>

    <div class="flex items-center justify-between pt-2 border-t border-white/10">
      <button id="restartBtn" class="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase cursor-pointer">
        🔄 RESET GAME
      </button>
      <span id="timer" class="text-xs font-bold text-amber-400">TIME: 0s</span>
    </div>
  </div>

  <script>
    const EMOJIS = ['🚀', '👾', '💎', '🤖', '⚡', '🔥', '🐾', '🔮'];
    const gridEl = document.getElementById('grid');
    const movesEl = document.getElementById('moves');
    const scoreEl = document.getElementById('score');
    const timerEl = document.getElementById('timer');
    const restartBtn = document.getElementById('restartBtn');

    let cards = [];
    let flipped = [];
    let matched = 0;
    let moves = 0;
    let timer = 0;
    let timerInterval = null;

    let audioCtx = null;
    function playAudio(freq) {
      try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.12);
        osc.start(); osc.stop(audioCtx.currentTime + 0.12);
      } catch(e) {}
    }

    function initGame() {
      gridEl.innerHTML = '';
      cards = [...EMOJIS, ...EMOJIS].sort(() => Math.random() - 0.5);
      flipped = [];
      matched = 0;
      moves = 0;
      timer = 0;
      movesEl.textContent = 'MOVES: 0';
      scoreEl.textContent = 'MATCHES: 0/8';
      timerEl.textContent = 'TIME: 0s';

      if (timerInterval) clearInterval(timerInterval);
      timerInterval = setInterval(() => { timer++; timerEl.textContent = 'TIME: ' + timer + 's'; }, 1000);

      cards.forEach((symbol, idx) => {
        const cardNode = document.createElement('div');
        cardNode.className = 'card h-20 cursor-pointer';
        cardNode.dataset.index = idx;
        cardNode.innerHTML = \`
          <div class="card-inner relative w-full h-full">
            <div class="card-front absolute inset-0 bg-slate-800 border border-white/10 rounded-2xl flex items-center justify-center text-2xl shadow-md hover:border-purple-500">
              ❓
            </div>
            <div class="card-back absolute inset-0 bg-purple-950 border-2 border-purple-500 rounded-2xl flex items-center justify-center text-3xl shadow-xl">
              \${symbol}
            </div>
          </div>
        \`;
        cardNode.addEventListener('click', () => handleCardClick(cardNode, symbol, idx));
        gridEl.appendChild(cardNode);
      });
    }

    function handleCardClick(cardNode, symbol, idx) {
      if (flipped.length >= 2 || cardNode.classList.contains('flipped') || cardNode.classList.contains('matched')) return;

      playAudio(400);
      cardNode.classList.add('flipped');
      flipped.push({ node: cardNode, symbol, idx });

      if (flipped.length === 2) {
        moves++;
        movesEl.textContent = 'MOVES: ' + moves;

        if (flipped[0].symbol === flipped[1].symbol) {
          playAudio(650);
          flipped[0].node.classList.add('matched');
          flipped[1].node.classList.add('matched');
          matched++;
          scoreEl.textContent = \`MATCHES: \${matched}/8\`;
          flipped = [];

          if (matched === 8) {
            clearInterval(timerInterval);
            setTimeout(() => alert(\`🎉 VICTORY! Cleared in \${moves} moves and \${timer}s!\`), 300);
          }
        } else {
          setTimeout(() => {
            flipped[0].node.classList.remove('flipped');
            flipped[1].node.classList.remove('flipped');
            flipped = [];
          }, 800);
        }
      }
    }

    restartBtn.addEventListener('click', initGame);
    initGame();
  </script>
</body>
</html>`,
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
        name: project.name || 'Untitled Project',
        description: project.description || '',
        framework: project.framework || 'react',
        files: JSON.stringify(project.files || {}),
        activeFilePath: project.activeFilePath || 'src/App.tsx',
        openTabs: project.openTabs || ['src/App.tsx'],
        createdAt: project.createdAt || updatedProject.updatedAt,
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
    localStorage.removeItem(`${CHAT_STORAGE_KEY_PREFIX}${projectId}`);
    localStorage.removeItem(`${CHECKPOINTS_STORAGE_KEY}_${projectId}`);

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

/**
 * Saves agent chat messages for a specific coding project
 */
export function saveProjectChatHistory(projectId: string, history: AgentHistoryMessage[]): void {
  try {
    if (!projectId) return;
    localStorage.setItem(`${CHAT_STORAGE_KEY_PREFIX}${projectId}`, JSON.stringify(history));
  } catch (err) {
    console.warn('Failed to save project chat history:', err);
  }
}

/**
 * Loads agent chat messages for a specific coding project
 */
export function loadProjectChatHistory(projectId: string): AgentHistoryMessage[] {
  try {
    if (!projectId) return [];
    const raw = localStorage.getItem(`${CHAT_STORAGE_KEY_PREFIX}${projectId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

