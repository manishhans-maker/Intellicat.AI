import React, { useState, useEffect, useRef } from 'react';
import {
  RotateCw,
  Terminal,
  Monitor,
  Tablet,
  Smartphone,
  ExternalLink,
  Trash2,
  Bug,
  AlertCircle,
  Maximize2,
  Minimize2,
  CheckCircle2,
} from 'lucide-react';
import { ProjectFile, ConsoleLogEntry } from '../../types/codeAgent';

interface LivePreviewSandboxProps {
  files: Record<string, ProjectFile>;
  framework?: 'react' | 'html' | 'vanilla' | 'node';
  onSendErrorToAgent?: (errorMsg: string) => void;
}

export const LivePreviewSandbox: React.FC<LivePreviewSandboxProps> = ({
  files,
  framework = 'react',
  onSendErrorToAgent,
}) => {
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [logs, setLogs] = useState<ConsoleLogEntry[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Clear logs on explicit reload
  const handleReload = () => {
    setRefreshKey((k) => k + 1);
  };

  // Compile bundled HTML
  const bundledHtml = React.useMemo(() => {
    let indexHtml = files['index.html']?.content || '';
    const mainAppPath =
      Object.keys(files).find(
        (p) => p === 'src/App.tsx' || p === 'App.tsx' || p === 'src/App.jsx' || p.endsWith('/App.tsx') || p.endsWith('/App.jsx')
      ) || Object.keys(files).find((p) => p.endsWith('.tsx') || p.endsWith('.jsx')) || 'src/App.tsx';

    const mainAppContent = files[mainAppPath]?.content || '';
    const stylesCss =
      files['src/styles.css']?.content ||
      files['styles.css']?.content ||
      files['style.css']?.content ||
      files['src/index.css']?.content ||
      '';

    const consoleCaptureScript = `
      <script>
        (function() {
          function sendLog(type, args) {
            try {
              var message = Array.from(args).map(function(arg) {
                if (typeof arg === 'object') {
                  try { return JSON.stringify(arg); } catch(e) { return String(arg); }
                }
                return String(arg);
              }).join(' ');
              window.parent.postMessage({ type: 'SANDBOX_CONSOLE', logType: type, message: message }, '*');
            } catch(e) {}
          }
          var _log = console.log, _warn = console.warn, _error = console.error, _info = console.info;
          console.log = function() { sendLog('log', arguments); _log.apply(console, arguments); };
          console.warn = function() { sendLog('warn', arguments); _warn.apply(console, arguments); };
          console.error = function() { sendLog('error', arguments); _error.apply(console, arguments); };
          console.info = function() { sendLog('info', arguments); _info.apply(console, arguments); };

          window.onerror = function(msg, url, line, col, error) {
            var fullMsg = msg + ' (Line ' + line + (col ? ':' + col : '') + ')';
            window.parent.postMessage({ type: 'SANDBOX_CONSOLE', logType: 'error', message: fullMsg }, '*');
            return false;
          };
          window.addEventListener('unhandledrejection', function(event) {
            window.parent.postMessage({ type: 'SANDBOX_CONSOLE', logType: 'error', message: 'Unhandled Promise: ' + (event.reason ? (event.reason.message || event.reason) : 'Rejected') }, '*');
          });
        })();
      </script>
    `;

    // 1. Pure HTML project (no React App.tsx)
    if (indexHtml && !mainAppContent) {
      let finalHtml = indexHtml;
      if (!finalHtml.includes('cdn.tailwindcss')) {
        finalHtml = finalHtml.replace(/<head>/i, '<head><script src="https://cdn.tailwindcss.com"></script>');
      }
      finalHtml = finalHtml.replace(/<head>/i, `<head>${consoleCaptureScript}`);
      return finalHtml;
    }

    // 2. React SPA Compilation
    const sanitizeReactCode = (code: string) => {
      if (!code) return '';
      let cleaned = code;
      // Strip multi-line & single-line imports
      cleaned = cleaned.replace(/^\s*import\s+[\s\S]*?from\s*['"][^'"]+['"];?/gm, '');
      cleaned = cleaned.replace(/^\s*import\s+['"][^'"]+['"];?/gm, '');
      cleaned = cleaned.replace(/^\s*import\s+[\s\S]*?$/gm, '');
      cleaned = cleaned.replace(/^\s*export\s+[\s\S]*?from\s*['"][^'"]+['"];?/gm, '');

      // Strip exports
      cleaned = cleaned.replace(/export\s+default\s+function\s+([A-Za-z0-9_]+)/g, 'function $1');
      cleaned = cleaned.replace(/export\s+default\s+class\s+([A-Za-z0-9_]+)/g, 'class $1');
      cleaned = cleaned.replace(/export\s+default\s+const\s+/g, 'const ');
      cleaned = cleaned.replace(/export\s+default\s+([A-Za-z0-9_]+);?/g, '');
      cleaned = cleaned.replace(/export\s+function\s+/g, 'function ');
      cleaned = cleaned.replace(/export\s+const\s+/g, 'const ');
      cleaned = cleaned.replace(/export\s+class\s+/g, 'class ');
      cleaned = cleaned.replace(/export\s+(type|interface|enum)\s+/g, '$1 ');
      return cleaned;
    };

    // Combine subcomponent files first
    const otherCodeParts: string[] = [];
    Object.entries(files).forEach(([path, file]) => {
      if (
        path !== mainAppPath &&
        (path.endsWith('.tsx') || path.endsWith('.ts') || path.endsWith('.jsx') || path.endsWith('.js'))
      ) {
        if (!path.includes('node_modules') && !path.includes('vite') && !path.includes('config')) {
          otherCodeParts.push(sanitizeReactCode(file.content));
        }
      }
    });

    const sanitizedMainApp = sanitizeReactCode(mainAppContent);
    const combinedReactCode = [...otherCodeParts, sanitizedMainApp].join('\n\n');

    const matchComp =
      sanitizedMainApp.match(/function\s+([A-Z][A-Za-z0-9_]*)/) ||
      sanitizedMainApp.match(/const\s+([A-Z][A-Za-z0-9_]*)\s*=/) ||
      sanitizedMainApp.match(/class\s+([A-Z][A-Za-z0-9_]*)/);
    const componentName = matchComp ? matchComp[1] : 'App';

    const commonLucideIcons = [
      'Sparkles', 'Cat', 'Cpu', 'Plus', 'Minus', 'RotateCcw', 'ShieldCheck', 'Bug',
      'Code', 'Code2', 'Play', 'Pause', 'Square', 'Check', 'X', 'Send', 'RefreshCw',
      'Eye', 'EyeOff', 'Terminal', 'Search', 'Download', 'Upload', 'History',
      'Folder', 'File', 'Settings', 'Zap', 'Award', 'ArrowRight', 'ArrowLeft',
      'ArrowUp', 'ArrowDown', 'ChevronDown', 'ChevronUp', 'ChevronLeft',
      'ChevronRight', 'ExternalLink', 'Lock', 'Unlock', 'User', 'Users', 'Mail',
      'Phone', 'Calendar', 'Clock', 'Heart', 'Star', 'Moon', 'Sun', 'Layout',
      'Layers', 'Maximize2', 'Minimize2', 'Copy', 'CheckCircle2', 'CheckCircle',
      'AlertCircle', 'AlertTriangle', 'Info', 'HelpCircle', 'List', 'Grid', 'Sliders',
      'SlidersHorizontal', 'Menu', 'Trash2', 'Trash', 'Edit3', 'Edit', 'Crown',
      'MessageSquare', 'MessageCircle', 'Palette', 'Flame', 'Volume2', 'VolumeX',
      'Volume1', 'Coins', 'DollarSign', 'TrendingUp', 'TrendingDown', 'BarChart',
      'BarChart2', 'PieChart', 'Activity', 'Gamepad', 'Gamepad2', 'Music',
      'Headphones', 'Video', 'Camera', 'Image', 'MapPin', 'Compass', 'Globe',
      'Share2', 'Bookmark', 'Tag', 'Filter', 'Database', 'Server', 'Wifi',
      'Battery', 'Shield', 'Key', 'Gift', 'ShoppingBag', 'ShoppingCart',
      'CreditCard', 'Smile', 'Frown', 'Meh', 'ThumbsUp', 'ThumbsDown', 'Sparkle',
      'Box', 'Package', 'TerminalSquare', 'FileText', 'FilePlus', 'FolderPlus',
      'XCircle', 'PlusCircle', 'MinusCircle', 'PlayCircle', 'PauseCircle',
      'StopCircle', 'Repeat', 'Shuffle', 'Volume', 'Bell', 'BellOff', 'Trophy',
      'Medal', 'Target', 'Rocket', 'Lightbulb', 'Brain', 'Radio', 'Tv', 'Watch'
    ];

    const iconDeclarations = commonLucideIcons
      .map((name) => {
        return `window.${name} = (props) => {
          var size = (props && props.size) || 18;
          var className = (props && props.className) || '';
          return React.createElement('span', {
            className: 'inline-flex items-center justify-center ' + className,
            style: { width: size, height: size, display: 'inline-flex' },
            title: '${name}'
          }, React.createElement('i', { 'data-lucide': '${name.toLowerCase().replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '')}', style: { width: '100%', height: '100%' } }));
        };`;
      })
      .join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
  ${consoleCaptureScript}
  <style>
    body { margin: 0; min-height: 100vh; background: #07090f; color: #f1f5f9; font-family: system-ui, -apple-system, sans-serif; }
    ${stylesCss}
  </style>
</head>
<body>
  <div id="root"></div>
  <div id="error-display" style="display:none; padding:24px; color:#f87171; background:#0b0c14; min-height:100vh; font-family:monospace;">
    <div style="max-width:600px; margin:20px auto; background:rgba(239,35,60,0.1); border:1px solid rgba(239,35,60,0.3); padding:20px; border-radius:16px;">
      <h3 style="margin-top:0; font-size:15px; font-weight:bold; color:#fca5a5;">⚠️ App Sandbox Error Notice</h3>
      <p style="font-size:12px; color:#cbd5e1; margin-bottom:12px;">An issue occurred while rendering the app component:</p>
      <pre id="error-text" style="white-space:pre-wrap; word-break:break-word; font-size:11px; color:#fca5a5; background:black; padding:12px; border-radius:8px; border:1px solid rgba(255,255,255,0.1); font-family:monospace;"></pre>
    </div>
  </div>

  <script>
    function showError(errMessage) {
      var errDiv = document.getElementById('error-display');
      var errText = document.getElementById('error-text');
      if (errDiv && errText) {
        errText.textContent = errMessage;
        errDiv.style.display = 'block';
      }
      try {
        window.parent.postMessage({ type: 'SANDBOX_CONSOLE', logType: 'error', message: errMessage }, '*');
      } catch(e) {}
    }

    window.addEventListener('DOMContentLoaded', function() {
      try {
        if (typeof React === 'undefined' || typeof ReactDOM === 'undefined' || typeof Babel === 'undefined') {
          showError('CDN dependencies loading failed. Please check connection and click Reload.');
          return;
        }

        var { useState, useEffect, useRef, useMemo, useCallback, createContext, useContext, useReducer } = React;
        
        // Icon Declarations
        ${iconDeclarations}

        var rawCode = ${JSON.stringify(combinedReactCode)};

        // Auto-define any unhandled JSX component or icon tag
        var matches = rawCode.match(/<([A-Z][A-Za-z0-9_]*)/g) || [];
        matches.forEach(function(m) {
          var name = m.slice(1);
          if (typeof window[name] === 'undefined' && !['App', 'React', 'ReactDOM'].includes(name)) {
            window[name] = function(props) {
              var size = (props && props.size) || 18;
              var className = (props && props.className) || '';
              var children = props && props.children;
              return React.createElement('span', {
                className: 'inline-flex items-center justify-center ' + className,
                style: { width: size, height: size, display: 'inline-flex' },
                title: name
              }, children || React.createElement('i', {
                'data-lucide': name.toLowerCase().replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, ''),
                style: { width: '100%', height: '100%' }
              }));
            };
          }
        });

        // Register AST plugin in Babel to cleanly strip all import and export statements
        if (typeof Babel !== 'undefined' && Babel.registerPlugin) {
          Babel.registerPlugin('strip-imports-exports', function(api) {
            var t = api.types;
            return {
              visitor: {
                ImportDeclaration: function(path) {
                  path.remove();
                },
                ExportDefaultDeclaration: function(path) {
                  var decl = path.node.declaration;
                  if (t.isFunctionDeclaration(decl)) {
                    if (!decl.id) decl.id = t.identifier('App');
                    path.replaceWith(decl);
                  } else if (t.isFunctionExpression(decl) || t.isArrowFunctionExpression(decl)) {
                    path.replaceWith(
                      t.variableDeclaration('const', [
                        t.variableDeclarator(t.identifier('App'), decl)
                      ])
                    );
                  } else if (t.isIdentifier(decl)) {
                    path.remove();
                  } else {
                    path.remove();
                  }
                },
                ExportNamedDeclaration: function(path) {
                  if (path.node.declaration) {
                    path.replaceWith(path.node.declaration);
                  } else {
                    path.remove();
                  }
                }
              }
            };
          });
        }

        // Transpile React / TS code with classic runtime and AST plugin
        var transpiled = Babel.transform(rawCode, {
          presets: [
            ['react', { runtime: 'classic' }],
            ['typescript', { ignoreExtensions: true }]
          ],
          plugins: [
            'strip-imports-exports'
          ],
          filename: 'App.tsx'
        }).code;

        // Post-strip any lingering import statements
        transpiled = transpiled.replace(/^\s*import\s+[\s\S]*?from\s*['"][^'"]+['"];?/gm, '');
        transpiled = transpiled.replace(/^\s*import\s+['"][^'"]+['"];?/gm, '');

        // Execute code
        eval(transpiled);

        // Auto-expose all top-level declared components to window so sandbox can render them
        var foundDecls = transpiled.match(/(?:var|let|const|function)\s+([A-Z][A-Za-z0-9_]*)/g) || [];
        foundDecls.forEach(function(declStr) {
          var name = declStr.replace(/^(var|let|const|function)\s+/, '').trim();
          if (name && name !== 'React' && name !== 'ReactDOM' && name !== 'Babel') {
            try {
              var boundVal = eval(name);
              if (boundVal && (typeof boundVal === 'function' || typeof boundVal === 'object')) {
                window[name] = boundVal;
              }
            } catch(e) {}
          }
        });

        // Render main component
        var targetName = ${JSON.stringify(componentName)};
        var targetComp = window[targetName] || window.App;
        if (!targetComp) {
          var possibleCompNames = Object.keys(window).filter(function(k) {
            return k.match(/^[A-Z]/) && typeof window[k] === 'function' && k !== 'React' && k !== 'ReactDOM' && k !== 'Babel';
          });
          if (possibleCompNames.length > 0) {
            targetComp = window[possibleCompNames[possibleCompNames.length - 1]];
          }
        }

        if (targetComp) {
          var root = ReactDOM.createRoot(document.getElementById('root'));
          root.render(React.createElement(targetComp));
          setTimeout(function() {
            if (window.lucide && window.lucide.createIcons) {
              window.lucide.createIcons();
            }
          }, 150);
        } else {
          showError('No valid React component found in App.tsx');
        }
      } catch(err) {
        showError(err.stack || err.message || String(err));
      }
    });
  </script>
</body>
</html>`;
  }, [files]);

  // Listen for sandbox console messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SANDBOX_CONSOLE') {
        const newLog: ConsoleLogEntry = {
          id: `log-${Date.now()}-${Math.random()}`,
          type: event.data.logType || 'log',
          message: event.data.message || '',
          timestamp: Date.now(),
        };
        setLogs((prev) => [...prev.slice(-80), newLog]);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const viewportWidths = {
    desktop: 'w-full',
    tablet: 'max-w-[768px] mx-auto border-x border-white/20 shadow-2xl',
    mobile: 'max-w-[375px] mx-auto border-x-4 border-t-8 border-b-8 border-neutral-800 rounded-3xl shadow-2xl',
  };

  const hasErrors = logs.some((l) => l.type === 'error');

  return (
    <div className="flex-1 flex flex-col h-full bg-[#08090f] border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative">
      {/* Top Preview Controls Bar */}
      <div className="flex items-center justify-between p-2.5 bg-[#0e1017] border-b border-white/10 shrink-0 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Live Sandbox</span>
          </span>
          <span className="text-xs text-neutral-400 hidden sm:inline">Isolated browser execution</span>
        </div>

        {/* Viewport Toggles & Actions */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-black/60 p-0.5 rounded-lg border border-white/10 text-neutral-400">
            <button
              onClick={() => setViewport('desktop')}
              className={`p-1 rounded transition-colors ${viewport === 'desktop' ? 'bg-white/20 text-white' : 'hover:text-white'}`}
              title="Desktop View"
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewport('tablet')}
              className={`p-1 rounded transition-colors ${viewport === 'tablet' ? 'bg-white/20 text-white' : 'hover:text-white'}`}
              title="Tablet View (768px)"
            >
              <Tablet className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewport('mobile')}
              className={`p-1 rounded transition-colors ${viewport === 'mobile' ? 'bg-white/20 text-white' : 'hover:text-white'}`}
              title="Mobile View (375px)"
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={handleReload}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-neutral-300 hover:text-white transition-colors cursor-pointer"
            title="Reload Preview"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setConsoleOpen(!consoleOpen)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
              hasErrors
                ? 'bg-red-500/20 border-red-500/40 text-red-300 animate-pulse'
                : consoleOpen
                ? 'bg-white/20 border-white/30 text-white'
                : 'bg-white/5 border-white/10 text-neutral-400 hover:text-white'
            }`}
            title="Toggle Console Logs"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Console</span>
            {logs.length > 0 && <span className="text-[10px] opacity-75">({logs.length})</span>}
          </button>
        </div>
      </div>

      {/* Main Sandbox IFrame View */}
      <div className="flex-1 relative overflow-auto bg-[#07080d] p-2 flex items-center justify-center">
        <div className={`h-full transition-all duration-300 ${viewportWidths[viewport]}`}>
          <iframe
            key={refreshKey}
            ref={iframeRef}
            srcDoc={bundledHtml}
            title="Intelicat Code Sandbox"
            sandbox="allow-scripts allow-forms allow-same-origin allow-modals"
            className="w-full h-full rounded-xl bg-white border border-white/15 shadow-2xl block"
          />
        </div>
      </div>

      {/* Slide-Up Console Drawer */}
      {consoleOpen && (
        <div className="h-48 bg-[#0b0c13] border-t border-white/15 flex flex-col shrink-0 text-xs font-mono">
          <div className="p-2 px-3 bg-[#11121c] border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-neutral-400" />
              <span className="font-bold text-white uppercase tracking-wider text-[11px]">Runtime Console</span>
            </div>
            <div className="flex items-center gap-1.5">
              {hasErrors && onSendErrorToAgent && (
                <button
                  type="button"
                  onClick={() => {
                    const lastError = [...logs].reverse().find((l) => l.type === 'error');
                    if (lastError) onSendErrorToAgent(lastError.message);
                  }}
                  className="flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[#EF233C] hover:bg-red-600 text-white text-[11px] font-bold cursor-pointer"
                >
                  <Bug className="w-3 h-3" />
                  <span>Send Error to AI Agent</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setLogs([])}
                className="p-1 rounded hover:bg-white/10 text-neutral-400 hover:text-white"
                title="Clear console"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2.5 space-y-1 select-text">
            {logs.length === 0 ? (
              <div className="text-neutral-500 text-[11px] italic">Console output is empty. Logs and errors will appear here.</div>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className={`flex items-start gap-2 py-0.5 px-2 rounded ${
                    log.type === 'error'
                      ? 'bg-red-950/40 text-red-300 border-l-2 border-red-500'
                      : log.type === 'warn'
                      ? 'bg-amber-950/40 text-amber-300 border-l-2 border-amber-500'
                      : 'text-neutral-300 hover:bg-white/[0.02]'
                  }`}
                >
                  <span className={`text-[10px] uppercase font-bold shrink-0 ${
                    log.type === 'error' ? 'text-red-400' : log.type === 'warn' ? 'text-amber-400' : 'text-neutral-500'
                  }`}>
                    [{log.type}]
                  </span>
                  <span className="flex-1 whitespace-pre-wrap break-words">{log.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
