import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Play,
  Sparkles,
  Copy,
  Check,
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copiedHtml, setCopiedHtml] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Clear logs on explicit reload
  const handleReload = () => {
    setLogs([]);
    setRefreshKey((k) => k + 1);
  };

  // Compile bundled HTML
  const bundledHtml = useMemo(() => {
    const indexHtml = files['index.html']?.content || '';
    const mainAppPath =
      Object.keys(files).find(
        (p) =>
          p === 'src/App.tsx' ||
          p === 'App.tsx' ||
          p === 'src/App.jsx' ||
          p === 'App.jsx' ||
          p.endsWith('/App.tsx') ||
          p.endsWith('/App.jsx')
      ) ||
      Object.keys(files).find((p) => p.endsWith('.tsx') || p.endsWith('.jsx')) ||
      '';

    const mainAppContent = mainAppPath && files[mainAppPath] ? files[mainAppPath].content : '';
    const stylesCss =
      files['src/styles.css']?.content ||
      files['styles.css']?.content ||
      files['style.css']?.content ||
      files['src/index.css']?.content ||
      files['index.css']?.content ||
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
            var fullMsg = (error && error.message) ? error.message : msg;
            if (line) fullMsg += ' (line ' + line + (col ? ':' + col : '') + ')';
            window.parent.postMessage({ type: 'SANDBOX_CONSOLE', logType: 'error', message: fullMsg }, '*');
            return false;
          };
          window.addEventListener('unhandledrejection', function(event) {
            var reason = event.reason ? (event.reason.message || event.reason) : 'Rejected';
            window.parent.postMessage({ type: 'SANDBOX_CONSOLE', logType: 'error', message: 'Unhandled Promise: ' + reason }, '*');
          });
        })();
      </script>
    `;

    // 1. Pure HTML / Canvas / Vanilla project OR no React App file
    if (framework === 'html' || (indexHtml && !mainAppContent)) {
      let finalHtml = indexHtml;
      if (!finalHtml.trim()) {
        finalHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>App Preview</title></head><body><div class="p-6 text-white font-sans">App content is loading...</div></body></html>`;
      }

      if (!finalHtml.includes('cdn.tailwindcss.com')) {
        if (finalHtml.includes('<head>')) {
          finalHtml = finalHtml.replace(/<head>/i, '<head><script src="https://cdn.tailwindcss.com"></script>');
        } else {
          finalHtml = `<script src="https://cdn.tailwindcss.com"></script>` + finalHtml;
        }
      }

      if (finalHtml.includes('<head>')) {
        finalHtml = finalHtml.replace(/<head>/i, `<head>${consoleCaptureScript}`);
      } else {
        finalHtml = consoleCaptureScript + finalHtml;
      }
      return finalHtml;
    }

    // 2. React SPA Compilation
    const cleanReactSource = (code: string, filePath: string): { cleaned: string; lucideIconNames: string[] } => {
      if (!code) return { cleaned: '', lucideIconNames: [] };
      let cleaned = code;

      // Extract all imported names from lucide-react before stripping imports
      const lucideIconNames: string[] = [];
      const lucideImportMatches: string[] = cleaned.match(/import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/g) || [];
      lucideImportMatches.forEach((m: string) => {
        const inside = m.replace(/import\s*\{/, '').replace(/\}\s*from.*/, '');
        inside.split(',').forEach((n) => {
          const name = n.trim().split(/\s+as\s+/).pop()?.trim();
          if (name) lucideIconNames.push(name);
        });
      });

      // Strip single & multiline imports
      cleaned = cleaned.replace(/^\s*import\s+(?:type\s+)?[\s\S]*?from\s*['"][^'"]+['"];?/gm, '');
      cleaned = cleaned.replace(/^\s*import\s+['"][^'"]+['"];?/gm, '');
      cleaned = cleaned.replace(/^\s*import\s+type\s+[\s\S]*?;/gm, '');

      // Derive fallback component name from file path (e.g. src/components/ScoreBoard.tsx -> ScoreBoard)
      const fileNameMatch = filePath.split('/').pop()?.replace(/\.[^/.]+$/, '');
      const defaultName = (fileNameMatch && /^[A-Z]/.test(fileNameMatch)) ? fileNameMatch : (filePath === mainAppPath ? 'App' : 'SubComponent');

      // Clean function default exports
      cleaned = cleaned.replace(/^\s*export\s+default\s+function(?:\s+([A-Za-z0-9_$]+))?\s*\(/gm, function (_, name) {
        const fnName = name || defaultName;
        return `window.${fnName} = function ${fnName}(`;
      });

      // Clean class default exports
      cleaned = cleaned.replace(/^\s*export\s+default\s+class(?:\s+([A-Za-z0-9_$]+))?/gm, function (_, name) {
        const clsName = name || defaultName;
        return `window.${clsName} = class ${clsName} `;
      });

      // Clean arrow function default exports
      cleaned = cleaned.replace(/^\s*export\s+default\s*(?:\([^)]*\)|[A-Za-z0-9_$]+)\s*=>/gm, function (match) {
        const after = match.replace(/^\s*export\s+default\s*/, '');
        return `window.${defaultName} = ${after}`;
      });

      // Clean identifier default exports (e.g. export default App; or export default Calculator;)
      cleaned = cleaned.replace(/^\s*export\s+default\s+([A-Za-z0-9_$]+);?/gm, function (_, name) {
        if (filePath === mainAppPath) {
          return `window.App = ${name}; try { window.${name} = ${name}; } catch(e){}; exports.default = ${name};`;
        }
        return `try { window.${name} = ${name}; } catch(e){};`;
      });

      // Clean named exports
      cleaned = cleaned.replace(/^\s*export\s+(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=/gm, function(_, name) {
        return `var ${name} = window.${name} =`;
      });
      cleaned = cleaned.replace(/^\s*export\s+function\s+([A-Za-z0-9_$]+)\s*\(/gm, function(_, name) {
        return `window.${name} = function ${name}(`;
      });
      cleaned = cleaned.replace(/^\s*export\s+class\s+([A-Za-z0-9_$]+)/gm, function(_, name) {
        return `window.${name} = class ${name}`;
      });
      cleaned = cleaned.replace(/^\s*export\s+(type|interface|enum)\s+/gm, '$1 ');
      cleaned = cleaned.replace(/^\s*export\s+(?:type\s+)?\{[\s\S]*?\};?/gm, '');

      return { cleaned, lucideIconNames };
    };

    // Combine subcomponent files first so they are available in scope
    const subcomponentCodeParts: string[] = [];
    const collectedLucideIcons = new Set<string>();

    Object.entries(files).forEach(([path, file]) => {
      if (
        path !== mainAppPath &&
        (path.endsWith('.tsx') || path.endsWith('.ts') || path.endsWith('.jsx') || path.endsWith('.js'))
      ) {
        if (!path.includes('node_modules') && !path.includes('vite') && !path.includes('config')) {
          const { cleaned, lucideIconNames } = cleanReactSource(file.content, path);
          subcomponentCodeParts.push(cleaned);
          lucideIconNames.forEach((n) => collectedLucideIcons.add(n));
        }
      }
    });

    const { cleaned: sanitizedMainApp, lucideIconNames: mainLucideIcons } = cleanReactSource(mainAppContent, mainAppPath);
    mainLucideIcons.forEach((n) => collectedLucideIcons.add(n));

    const combinedReactCode = [...subcomponentCodeParts, sanitizedMainApp].join('\n\n');

    // Detect target component name
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
      'Medal', 'Target', 'Rocket', 'Lightbulb', 'Brain', 'Radio', 'Tv', 'Watch',
      'Wand2', 'CheckCheck', 'Link', 'Undo2', 'Redo2', 'FilterX', 'Power',
    ];

    collectedLucideIcons.forEach((icon) => {
      if (!commonLucideIcons.includes(icon)) commonLucideIcons.push(icon);
    });

    // Safely serialize code for script injection (prevent </script> breakout)
    const serializedReactCode = JSON.stringify(combinedReactCode).replace(/<\/script>/gi, '<\\/script>');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.24.4/babel.min.js"></script>
  <script src="https://unpkg.com/lucide@0.344.0/dist/umd/lucide.min.js"></script>
  ${consoleCaptureScript}
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      background: #07090f;
      color: #f1f5f9;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    #root {
      min-height: 100vh;
      width: 100%;
    }
    ${stylesCss}
  </style>
</head>
<body>
  <div id="root">
    <div style="min-height:100vh; display:flex; align-items:center; justify-content:center; flex-direction:column; padding:24px; color:#94a3b8; font-family:sans-serif;">
      <div style="width:44px; height:44px; border-radius:14px; background:linear-gradient(135deg, #ef233c, #f59e0b); display:flex; align-items:center; justify-content:center; color:white; font-size:22px; margin-bottom:12px; box-shadow:0 10px 25px rgba(239,35,60,0.35);">
        ⚡
      </div>
      <div style="font-size:14px; font-weight:bold; color:white;">Preparing App Preview...</div>
      <div style="font-size:11px; margin-top:4px; opacity:0.8;">Compiling React components & runtime</div>
    </div>
  </div>

  <div id="error-display" style="display:none; padding:20px; font-family:system-ui, monospace; background:#0b0c16; color:#f87171; min-height:100vh;">
    <div style="max-width:580px; margin:24px auto; background:rgba(239,35,60,0.08); border:1px solid rgba(239,35,60,0.35); border-radius:16px; padding:20px; box-shadow:0 20px 40px rgba(0,0,0,0.5);">
      <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
        <span style="font-size:20px;">⚠️</span>
        <h3 style="margin:0; font-size:14px; font-weight:bold; color:#fca5a5;">App Preview Notice</h3>
      </div>
      <p style="margin:0 0 12px 0; font-size:12px; color:#cbd5e1;">A runtime or syntax error occurred in the sandbox:</p>
      <pre id="error-text" style="background:#05060a; padding:12px; border-radius:8px; font-size:11px; color:#fca5a5; overflow-x:auto; border:1px solid rgba(255,255,255,0.08); white-space:pre-wrap; word-break:break-word;"></pre>
      <div style="margin-top:14px; display:flex; gap:8px;">
        <button onclick="location.reload()" style="padding:6px 14px; background:#ef233c; color:white; border:none; border-radius:8px; font-size:11px; font-weight:bold; cursor:pointer;">
          Retry Preview
        </button>
      </div>
    </div>
  </div>

  <script>
    function showError(errMessage) {
      var errDiv = document.getElementById('error-display');
      var errText = document.getElementById('error-text');
      var rootDiv = document.getElementById('root');
      if (errDiv && errText) {
        errText.textContent = errMessage;
        errDiv.style.display = 'block';
        if (rootDiv) rootDiv.style.display = 'none';
      }
      try {
        window.parent.postMessage({ type: 'SANDBOX_CONSOLE', logType: 'error', message: errMessage }, '*');
      } catch(e) {}
    }

    function bootSandboxApp() {
      try {
        // Global Environment & Module setup
        window.exports = window.exports || {};
        window.module = { exports: window.exports };
        window.React = React;
        window.ReactDOM = ReactDOM;
        window.useState = React.useState;
        window.useEffect = React.useEffect;
        window.useRef = React.useRef;
        window.useMemo = React.useMemo;
        window.useCallback = React.useCallback;
        window.useContext = React.useContext;
        window.createContext = React.createContext;
        window.useReducer = React.useReducer;
        window.useId = React.useId || function() { return 'id-' + Math.random().toString(36).substr(2, 6); };

        // Universal SVG Lucide Icon Generator
        function makeIconComponent(iconName) {
          return function(props) {
            var p = props || {};
            var size = p.size || 18;
            var className = p.className || '';
            var strokeWidth = p.strokeWidth || 2;
            var color = p.color || 'currentColor';

            var iconTuple = null;
            if (window.lucide) {
              if (window.lucide.icons && window.lucide.icons[iconName]) {
                iconTuple = window.lucide.icons[iconName];
              } else if (window.lucide[iconName]) {
                iconTuple = window.lucide[iconName];
              }
            }

            if (iconTuple && Array.isArray(iconTuple)) {
              var defaultAttrs = iconTuple[1] || {};
              var children = iconTuple[2] || [];

              var svgAttrs = Object.assign({}, defaultAttrs, {
                width: size,
                height: size,
                stroke: color,
                strokeWidth: strokeWidth,
                className: className,
              });
              delete svgAttrs['stroke-width'];
              delete svgAttrs['stroke-linecap'];
              delete svgAttrs['stroke-linejoin'];
              svgAttrs.strokeLinecap = 'round';
              svgAttrs.strokeLinejoin = 'round';

              var childEls = children.map(function(c, idx) {
                var cTag = c[0];
                var cAttrs = Object.assign({ key: idx }, c[1]);
                return React.createElement(cTag, cAttrs);
              });

              return React.createElement('svg', svgAttrs, childEls);
            }

            // Fallback for custom or missing icon names
            return React.createElement('span', {
              className: 'inline-flex items-center justify-center ' + className,
              style: { width: size, height: size, display: 'inline-flex', verticalAlign: 'middle', fontSize: Math.max(10, size - 4) },
              title: iconName
            }, '✦');
          };
        }

        // Register ONLY known Lucide icons on window
        var iconList = ${JSON.stringify(commonLucideIcons)};
        iconList.forEach(function(icon) {
          window[icon] = makeIconComponent(icon);
        });

        // Framer Motion compatibility shim (prevents crashes when code uses motion.div)
        window.motion = new Proxy({}, {
          get: function(target, prop) {
            return function(props) {
              var p = Object.assign({}, props || {});
              delete p.initial; delete p.animate; delete p.exit; delete p.transition;
              delete p.whileHover; delete p.whileTap; delete p.whileFocus; delete p.whileDrag;
              return React.createElement(prop, p);
            };
          }
        });
        window.AnimatePresence = function(props) { return props.children; };

        // Canvas Confetti shim fallback
        if (typeof window.confetti === 'undefined') {
          window.confetti = function() { console.log('🎉 Confetti triggered!'); };
        }

        var rawCode = ${serializedReactCode};

        // Transpile React / TypeScript code safely using standard Babel presets
        var transpiled = Babel.transform(rawCode, {
          presets: ['react', 'typescript'],
          filename: 'App.tsx'
        }).code;

        // Clean any leftover module statements
        transpiled = transpiled.replace(/^\\s*import\\s+[\\s\\S]*?from\\s*['\"][^'\"]+['\"];?/gm, '');
        transpiled = transpiled.replace(/^\\s*import\\s+['\"][^'\"]+['\"];?/gm, '');

        var targetName = ${JSON.stringify(componentName)};

        // Append explicit global attachments so components are guaranteed on window
        var glueCode = '\\n' +
          'if (typeof ' + targetName + ' !== \"undefined\") { window[' + JSON.stringify(targetName) + '] = ' + targetName + '; window.App = ' + targetName + '; window.exports.default = ' + targetName + '; }\\n' +
          'if (typeof App !== \"undefined\") { window.App = App; window.exports.default = App; }\\n';

        // Execute in global scope using indirect eval
        (1, eval)(transpiled + glueCode);

        // Determine main component to render
        var targetComp = window[targetName] || window.App || window.exports.default || (window.module && window.module.exports);

        if (!targetComp) {
          var candidates = Object.keys(window).filter(function(k) {
            return k.match(/^[A-Z]/) && typeof window[k] === 'function' && !['React', 'ReactDOM', 'Babel'].includes(k);
          });
          if (candidates.length > 0) {
            targetComp = window[candidates[candidates.length - 1]];
          }
        }

        if (targetComp) {
          var rootElement = document.getElementById('root');
          rootElement.innerHTML = '';

          // React Error Boundary Component
          class SandboxErrorBoundary extends React.Component {
            constructor(props) {
              super(props);
              this.state = { hasError: false, error: null };
            }
            static getDerivedStateFromError(error) {
              return { hasError: true, error: error };
            }
            componentDidCatch(error, errorInfo) {
              var errMessage = error ? (error.stack || error.message || String(error)) : 'Unknown component error';
              showError(errMessage);
            }
            render() {
              if (this.state.hasError) {
                return null;
              }
              return this.props.children;
            }
          }

          var root = ReactDOM.createRoot(rootElement);
          root.render(
            React.createElement(SandboxErrorBoundary, null,
              React.createElement(targetComp)
            )
          );
        } else {
          showError('No valid React component found in App.tsx to render.');
        }
      } catch(err) {
        showError(err.stack || err.message || String(err));
      }
    }

    // Polling loader: waits for React, ReactDOM, and Babel to be fully ready before booting
    function waitForLibs(callback, retriesLeft) {
      if (typeof React !== 'undefined' && typeof ReactDOM !== 'undefined' && typeof Babel !== 'undefined') {
        callback();
      } else if (retriesLeft > 0) {
        setTimeout(function() {
          waitForLibs(callback, retriesLeft - 1);
        }, 50);
      } else {
        showError('Preview libraries failed to load from CDN. Please check your network connection and click Reload.');
      }
    }

    // Start boot sequence
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        waitForLibs(bootSandboxApp, 100);
      });
    } else {
      waitForLibs(bootSandboxApp, 100);
    }
  </script>
</body>
</html>`;
  }, [files, framework]);

  // Listen for sandbox console messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SANDBOX_CONSOLE') {
        const newLog: ConsoleLogEntry = {
          id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
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
    desktop: 'w-full h-full',
    tablet: 'w-full max-w-[768px] h-full mx-auto border-x border-white/20 shadow-2xl',
    mobile: 'w-full max-w-[375px] h-full mx-auto border-x-4 border-t-8 border-b-8 border-neutral-800 rounded-3xl shadow-2xl',
  };

  const hasErrors = logs.some((l) => l.type === 'error');

  const handleOpenInNewTab = () => {
    try {
      const blob = new Blob([bundledHtml], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      if (!win) {
        setIsFullscreen(true);
      }
    } catch (err) {
      console.error('Open in new tab failed:', err);
      setIsFullscreen(true);
    }
  };

  const handleCopyHtml = () => {
    navigator.clipboard.writeText(bundledHtml);
    setCopiedHtml(true);
    setTimeout(() => setCopiedHtml(false), 2000);
  };

  return (
    <>
      <div
        className={`flex flex-col bg-[#08090f] border border-white/10 rounded-2xl overflow-hidden shadow-2xl transition-all min-h-0 ${
          isFullscreen
            ? 'fixed inset-2 sm:inset-5 z-[100] h-[calc(100vh-1rem)] sm:h-[calc(100vh-2.5rem)] ring-2 ring-[#EF233C]/60'
            : 'flex-1 h-full relative'
        }`}
      >
      {/* Top Preview Controls Bar */}
      <div className="flex items-center justify-between p-2.5 bg-[#0e1017] border-b border-white/10 shrink-0 gap-2 flex-wrap z-10">
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
              className={`p-1 rounded transition-colors cursor-pointer ${
                viewport === 'desktop' ? 'bg-white/20 text-white' : 'hover:text-white'
              }`}
              title="Desktop View (100%)"
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewport('tablet')}
              className={`p-1 rounded transition-colors cursor-pointer ${
                viewport === 'tablet' ? 'bg-white/20 text-white' : 'hover:text-white'
              }`}
              title="Tablet View (768px)"
            >
              <Tablet className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewport('mobile')}
              className={`p-1 rounded transition-colors cursor-pointer ${
                viewport === 'mobile' ? 'bg-white/20 text-white' : 'hover:text-white'
              }`}
              title="Mobile View (375px)"
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Reload Preview */}
          <button
            type="button"
            onClick={handleReload}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-neutral-300 hover:text-white transition-colors cursor-pointer"
            title="Reload Preview"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>

          {/* Open in New Window / Tab */}
          <button
            type="button"
            onClick={handleOpenInNewTab}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-neutral-300 hover:text-sky-400 transition-colors cursor-pointer"
            title="Open Website in Standalone New Tab"
          >
            <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-neutral-300 hover:text-amber-400 transition-colors cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Preview'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5 text-amber-400" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {/* Copy Compiled Code */}
          <button
            type="button"
            onClick={handleCopyHtml}
            className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white border border-white/10 transition-colors cursor-pointer text-xs"
            title="Copy compiled HTML"
          >
            {copiedHtml ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400 font-semibold text-[11px]">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span className="text-[11px]">Copy</span>
              </>
            )}
          </button>

          {/* Console Toggle */}
          <button
            type="button"
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
      <div className="flex-1 relative overflow-hidden bg-[#07080d] p-2 flex flex-col items-center justify-center min-h-0">
        <div className={`transition-all duration-300 flex flex-col min-h-0 ${viewportWidths[viewport]}`}>
          <iframe
            key={refreshKey}
            ref={iframeRef}
            srcDoc={bundledHtml}
            title="Intelicat Code Sandbox"
            sandbox="allow-scripts allow-forms allow-same-origin allow-modals"
            className="w-full h-full flex-1 rounded-xl bg-[#07090f] border border-white/15 shadow-2xl block min-h-0"
          />
        </div>
      </div>

      {/* Slide-Up Console Drawer */}
      {consoleOpen && (
        <div className="h-48 bg-[#0b0c13] border-t border-white/15 flex flex-col shrink-0 text-xs font-mono z-20">
          <div className="p-2 px-3 bg-[#11121d] border-b border-white/10 flex items-center justify-between">
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
                className="p-1 rounded hover:bg-white/10 text-neutral-400 hover:text-white cursor-pointer"
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
                  <span
                    className={`text-[10px] uppercase font-bold shrink-0 ${
                      log.type === 'error'
                        ? 'text-red-400'
                        : log.type === 'warn'
                        ? 'text-amber-400'
                        : 'text-neutral-500'
                    }`}
                  >
                    [{log.type}]
                  </span>
                  <span className="break-all">{log.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Bottom Status Footer (matches Code 1.0) */}
      <div className="px-3 sm:px-4 py-1.5 bg-[#0a0b12] border-t border-white/10 text-[10px] text-neutral-400 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live Built Website
          </span>
          <span>•</span>
          <span className="font-mono text-neutral-300 uppercase">{framework}</span>
          <span>•</span>
          <span>{Object.keys(files).length} files</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenInNewTab}
            className="flex items-center gap-1 text-neutral-400 hover:text-sky-400 transition-colors cursor-pointer"
            title="Open website in standalone new browser tab"
          >
            <span>Open in new tab</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>
    </div>

    {isFullscreen && (
      <div
        onClick={() => setIsFullscreen(false)}
        className="fixed inset-0 z-[95] bg-black/85 backdrop-blur-md transition-opacity"
      />
    )}
  </>
  );
};
