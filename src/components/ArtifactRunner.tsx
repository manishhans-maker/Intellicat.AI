import React, { useState, useMemo, useRef } from 'react';
import {
  Eye,
  Code2,
  ExternalLink,
  Maximize2,
  Minimize2,
  RotateCw,
  Smartphone,
  Tablet,
  Monitor,
  Download,
  Copy,
  Check,
  Cat,
  Sparkles,
  Terminal,
} from 'lucide-react';

interface ArtifactRunnerProps {
  language?: string;
  code: string;
  title?: string;
  isCatCode?: boolean;
}

const EXTENSION_MAP: Record<string, string> = {
  typescript: 'ts',
  ts: 'ts',
  tsx: 'tsx',
  javascript: 'js',
  js: 'js',
  jsx: 'jsx',
  python: 'py',
  py: 'py',
  html: 'html',
  htm: 'html',
  css: 'css',
  svg: 'svg',
  sql: 'sql',
  rust: 'rs',
  go: 'go',
  json: 'json',
};

/**
 * Detects if a code snippet is a runnable web application or website artifact
 */
export function isPreviewableArtifact(language?: string, code?: string, isCatCode?: boolean): boolean {
  if (!code || typeof code !== 'string') return false;
  const lang = (language || '').toLowerCase().trim();
  const trimmed = code.trim();

  // If in Cat Code mode, any web-related code is treated as an artifact
  if (isCatCode) {
    if (['html', 'htm', 'xhtml', 'svg', 'xml', 'jsx', 'tsx', 'react', 'js', 'javascript', 'typescript', 'ts', 'css'].includes(lang)) {
      if (trimmed.length > 20) return true;
    }
  }

  // HTML or SVG
  if (['html', 'htm', 'xhtml', 'svg', 'xml'].includes(lang)) {
    return true;
  }

  // React / JSX / TSX / TypeScript
  if (['jsx', 'tsx', 'react', 'typescript', 'ts'].includes(lang)) {
    if (
      trimmed.includes('<') &&
      (trimmed.includes('return') ||
        trimmed.includes('export default') ||
        trimmed.includes('function') ||
        trimmed.includes('const') ||
        trimmed.includes('<div>') ||
        trimmed.includes('className') ||
        trimmed.includes('useState') ||
        trimmed.includes('useEffect') ||
        trimmed.includes('React.'))
    ) {
      return true;
    }
  }

  // JavaScript with DOM manipulation or HTML tags
  if (['javascript', 'js'].includes(lang)) {
    if (
      trimmed.includes('<!DOCTYPE') ||
      trimmed.includes('<html') ||
      trimmed.includes('<div') ||
      trimmed.includes('document.getElementById') ||
      trimmed.includes('document.querySelector') ||
      trimmed.includes('document.createElement') ||
      trimmed.includes('addEventListener') ||
      trimmed.includes('canvas.getContext') ||
      trimmed.includes('window.')
    ) {
      return true;
    }
  }

  // Explicit DOCTYPE or full HTML structure regardless of language tag
  if (
    trimmed.startsWith('<!DOCTYPE html') ||
    trimmed.startsWith('<html') ||
    (trimmed.includes('<body') && trimmed.includes('</body>')) ||
    (trimmed.includes('<div') && trimmed.includes('</div>') && (trimmed.includes('<script') || trimmed.includes('<style') || trimmed.includes('class=')))
  ) {
    return true;
  }

  return false;
}

/**
 * Builds a secure, self-contained HTML bundle for the sandbox iframe
 */
export function generateArtifactHtml(code: string, language?: string): string {
  const lang = (language || '').toLowerCase().trim();
  const trimmed = code.trim();

  const iconScript = `
    <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
    <script>
      window.addEventListener('DOMContentLoaded', () => {
        if (window.lucide) window.lucide.createIcons();
      });
      setTimeout(() => {
        if (window.lucide) window.lucide.createIcons();
      }, 300);
    </script>
  `;

  const errorOverlayScript = `
    <script>
      window.onerror = function(msg, url, line) {
        var errDiv = document.getElementById('sandbox-error-overlay');
        if (!errDiv) {
          errDiv = document.createElement('div');
          errDiv.id = 'sandbox-error-overlay';
          errDiv.style = 'position:fixed;bottom:12px;left:12px;right:12px;background:#ef233c1f;color:#fca5a5;border:1px solid #ef233c50;padding:10px 14px;border-radius:12px;font-family:monospace;font-size:11px;z-index:999999;backdrop-filter:blur(10px);box-shadow:0 10px 25px rgba(0,0,0,0.5);display:flex;align-items:center;gap:8px;';
          document.body.appendChild(errDiv);
        }
        errDiv.innerHTML = '<span>⚠️</span><div><strong>Script Notice (line ' + line + '):</strong> ' + msg + '</div>';
        return false;
      };
    </script>
  `;

  // 1. Full HTML Document
  if (trimmed.includes('<!DOCTYPE html') || (trimmed.includes('<html') && trimmed.includes('</html>'))) {
    let html = trimmed;
    // Inject Tailwind CDN if not present for styling support
    if (!html.includes('tailwindcss.com') && !html.includes('cdn.tailwindcss')) {
      if (/<head[^>]*>/i.test(html)) {
        html = html.replace(/<head[^>]*>/i, (m) => `${m}\n<script src="https://cdn.tailwindcss.com"></script>`);
      } else if (/<html[^>]*>/i.test(html)) {
        html = html.replace(/<html[^>]*>/i, (m) => `${m}\n<head><script src="https://cdn.tailwindcss.com"></script></head>`);
      } else {
        html = `<script src="https://cdn.tailwindcss.com"></script>\n${html}`;
      }
    }
    // Inject Lucide & FontAwesome
    if (/<head[^>]*>/i.test(html)) {
      html = html.replace(/<head[^>]*>/i, (m) => `${m}\n${iconScript}`);
    } else {
      html = `${iconScript}\n${html}`;
    }
    // Inject error overlay
    if (/<\/body>/i.test(html)) {
      html = html.replace(/<\/body>/i, `${errorOverlayScript}\n</body>`);
    } else {
      html = `${html}\n${errorOverlayScript}`;
    }
    return html;
  }

  // 2. SVG Vector Graphic
  if (lang === 'svg' || trimmed.startsWith('<svg')) {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #09090f;
      padding: 2rem;
    }
    svg {
      max-width: 100%;
      height: auto;
      filter: drop-shadow(0 15px 30px rgba(0,0,0,0.6));
    }
  </style>
</head>
<body>
  ${trimmed}
</body>
</html>`;
  }

  // 3. React / JSX / TSX Component
  if (
    ['jsx', 'tsx', 'react', 'typescript', 'ts'].includes(lang) ||
    trimmed.includes('import React') ||
    trimmed.includes('export default') ||
    trimmed.includes('function App') ||
    trimmed.includes('const App =')
  ) {
    let cleanedCode = trimmed;
    cleanedCode = cleanedCode.replace(/import\s+React\s*,?\s*(\{[^}]*\})?\s*from\s*['"]react['"];?/g, '');
    cleanedCode = cleanedCode.replace(/import\s+(\{[^}]*\})\s*from\s*['"]react['"];?/g, '');
    cleanedCode = cleanedCode.replace(/import\s+(\{[^}]*\})\s*from\s*['"]lucide-react['"];?/g, '');
    cleanedCode = cleanedCode.replace(/import\s+[^;]+from\s*['"][^'"]+['"];?/g, '');
    cleanedCode = cleanedCode.replace(/export\s+default\s+function\s+([A-Za-z0-9_]+)/g, 'function $1');
    cleanedCode = cleanedCode.replace(/export\s+default\s+([A-Za-z0-9_]+);?/g, '');

    const matchComp =
      cleanedCode.match(/function\s+([A-Z][A-Za-z0-9_]*)/) ||
      cleanedCode.match(/const\s+([A-Z][A-Za-z0-9_]*)\s*=/);
    const componentName = matchComp ? matchComp[1] : 'App';

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  ${iconScript}
  <style>
    body {
      margin: 0;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0c0d14;
      color: #f8fafc;
      min-height: 100vh;
    }
    #root {
      min-height: 100vh;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  ${errorOverlayScript}
  <script type="text/babel" data-presets="react,typescript">
    const { useState, useEffect, useRef, useMemo, useCallback } = React;

    // Dynamic Lucide React icon proxy so any imported icon renders safely
    const IconProxy = new Proxy({}, {
      get: (target, prop) => {
        return function DynamicIcon(props) {
          const { size = 18, className = '', color = 'currentColor', ...rest } = props || {};
          return (
            <span
              className={'inline-flex items-center justify-center align-middle ' + className}
              style={{ display: 'inline-flex', verticalAlign: 'middle' }}
              {...rest}
            >
              <svg
                width={size}
                height={size}
                viewBox="0 0 24 24"
                fill="none"
                stroke={color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="8" opacity="0.3" />
                <path d="M12 8v8M8 12h8" />
              </svg>
            </span>
          );
        };
      }
    });

    // Common Lucide icon aliases
    const Sparkles = IconProxy.Sparkles;
    const Cat = IconProxy.Cat;
    const Code = IconProxy.Code;
    const Check = IconProxy.Check;
    const X = IconProxy.X;
    const ArrowRight = IconProxy.ArrowRight;
    const Heart = IconProxy.Heart;
    const Play = IconProxy.Play;
    const Trophy = IconProxy.Trophy;
    const Zap = IconProxy.Zap;

    ${cleanedCode}

    if (typeof ${componentName} !== 'undefined') {
      const root = ReactDOM.createRoot(document.getElementById('root'));
      root.render(<${componentName} />);
    }
  </script>
</body>
</html>`;
  }

  // 4. Standard HTML Fragment / Interactive Widget
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <script src="https://cdn.tailwindcss.com"></script>
  ${iconScript}
  <style>
    body {
      margin: 0;
      padding: 1.25rem;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0c0d14;
      color: #f8fafc;
      min-height: 100vh;
    }
  </style>
</head>
<body>
  ${trimmed}
  ${errorOverlayScript}
</body>
</html>`;
}

export const ArtifactRunner: React.FC<ArtifactRunnerProps> = ({
  language,
  code,
  title,
  isCatCode = false,
}) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const lines = code.split('\n');
  const displayLang = (language || 'html').toLowerCase();
  const ext = EXTENSION_MAP[displayLang] || 'html';

  const previewHtml = useMemo(() => {
    return generateArtifactHtml(code, language);
  }, [code, language]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    try {
      const isWebType = ['html', 'htm', 'tsx', 'jsx', 'svg', 'js'].includes(displayLang) || isCatCode;
      const contentToDownload = isWebType ? previewHtml : code;
      const fileExt = isWebType ? 'html' : ext;
      const mimeType = isWebType ? 'text/html;charset=utf-8' : 'text/plain;charset=utf-8';

      const blob = new Blob([contentToDownload], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `cat-code-website.${fileExt}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 2000);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const handleOpenInNewTab = () => {
    try {
      const blob = new Blob([previewHtml], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      if (!win) {
        // Popup was blocked or inside iframe constraint - fallback to fullscreen
        setIsFullscreen(true);
      }
    } catch (err) {
      console.error('Open in new tab failed:', err);
      setIsFullscreen(true);
    }
  };

  // Viewport widths
  const viewportStyles = {
    desktop: 'w-full',
    tablet: 'max-w-[768px] mx-auto border-x border-white/20 shadow-2xl',
    mobile: 'max-w-[375px] mx-auto border-x-4 border-t-8 border-b-8 border-neutral-800 rounded-3xl shadow-2xl relative',
  };

  const containerContent = (
    <div
      data-artifact="true"
      className={`rounded-2xl overflow-hidden border border-white/20 bg-[#0a0a10] shadow-2xl flex flex-col transition-all ${
        isFullscreen
          ? 'fixed inset-2 sm:inset-6 z-[100] max-w-none h-[calc(100vh-1rem)] sm:h-[calc(100vh-3rem)] ring-2 ring-[#EF233C]/60'
          : 'my-3 w-full h-[450px] sm:h-[540px] md:h-[580px]'
      }`}
    >
      {/* Top Artifact Navigation Bar */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 bg-[#12121c] border-b border-white/10 shrink-0 gap-2 flex-wrap">
        {/* Left: Artifact Branding & Tabs */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#EF233C]/20 border border-[#EF233C]/40 text-[#EF233C] text-xs font-bold shrink-0 shadow-sm">
            <Cat className="w-3.5 h-3.5 animate-pulse" />
            <span className="hidden xs:inline">Cat Code</span>
            <span>Artifact</span>
          </div>

          {/* Tab Switcher: Live Website vs Code */}
          <div className="flex items-center bg-black/60 p-0.5 rounded-xl border border-white/10 text-xs">
            <button
              onClick={() => setActiveTab('preview')}
              type="button"
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                activeTab === 'preview'
                  ? 'bg-[#EF233C] text-white shadow-md shadow-[#EF233C]/30'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Live Website</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </button>

            <button
              onClick={() => setActiveTab('code')}
              type="button"
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                activeTab === 'code'
                  ? 'bg-white/20 text-white shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Source Code</span>
            </button>
          </div>
        </div>

        {/* Right: Viewport Toggles & Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {activeTab === 'preview' && (
            <div className="hidden sm:flex items-center bg-black/50 p-0.5 rounded-lg border border-white/10 text-xs text-neutral-400">
              <button
                onClick={() => setViewport('desktop')}
                type="button"
                className={`p-1 rounded transition-colors ${
                  viewport === 'desktop' ? 'bg-white/20 text-white' : 'hover:text-white'
                }`}
                title="Desktop View (100%)"
              >
                <Monitor className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewport('tablet')}
                type="button"
                className={`p-1 rounded transition-colors ${
                  viewport === 'tablet' ? 'bg-white/20 text-white' : 'hover:text-white'
                }`}
                title="Tablet View (768px)"
              >
                <Tablet className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewport('mobile')}
                type="button"
                className={`p-1 rounded transition-colors ${
                  viewport === 'mobile' ? 'bg-white/20 text-white' : 'hover:text-white'
                }`}
                title="Mobile View (375px)"
              >
                <Smartphone className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Reload Preview */}
          {activeTab === 'preview' && (
            <button
              onClick={() => setRefreshKey((k) => k + 1)}
              type="button"
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
              title="Reload Website Preview"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Open in New Window */}
          <button
            onClick={handleOpenInNewTab}
            type="button"
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
            title="Open Website in New Window"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>

          {/* Copy Code */}
          <button
            onClick={handleCopy}
            type="button"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white border border-white/10 transition-colors cursor-pointer text-xs"
            title="Copy source code"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span className="hidden xs:inline">Copy</span>
              </>
            )}
          </button>

          {/* Download File */}
          <button
            onClick={handleDownload}
            type="button"
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
            title={`Download as .${ext}`}
          >
            {downloaded ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Download className="w-3.5 h-3.5" />}
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen((f) => !f)}
            type="button"
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              isFullscreen
                ? 'bg-[#EF233C] border-[#EF233C] text-white shadow-md'
                : 'bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white border-white/10'
            }`}
            title={isFullscreen ? 'Exit Fullscreen' : 'Expand Live Website Preview'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Artifact Workspace */}
      <div className="flex-1 relative bg-black overflow-hidden flex flex-col">
        {activeTab === 'preview' ? (
          <div className="w-full h-full p-2 sm:p-3 overflow-auto flex items-center justify-center bg-[#07070b]">
            <div className={`h-full transition-all duration-300 ${viewportStyles[viewport]}`}>
              <iframe
                key={refreshKey}
                srcDoc={previewHtml}
                title="Cat Code Live Website Preview"
                sandbox="allow-scripts allow-modals allow-same-origin allow-forms"
                className="w-full h-full rounded-xl bg-white border border-white/15 shadow-2xl block"
              />
            </div>
          </div>
        ) : (
          /* Code View */
          <div className="w-full h-full overflow-auto p-4 text-neutral-200 font-mono text-xs sm:text-[13px] leading-relaxed flex gap-3 selection:bg-[#EF233C] selection:text-white">
            {lines.length > 1 && (
              <div className="select-none text-neutral-600 text-right pr-3 border-r border-white/10 font-mono text-xs">
                {lines.map((_, i) => (
                  <div key={i} className="leading-relaxed">
                    {i + 1}
                  </div>
                ))}
              </div>
            )}
            <pre className="m-0 p-0 flex-1 overflow-x-auto">
              <code>{code}</code>
            </pre>
          </div>
        )}
      </div>

      {/* Bottom Status Footer */}
      <div className="px-4 py-1.5 bg-[#0e0e16] border-t border-white/10 text-[10px] text-neutral-400 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-emerald-400 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live Built Website
          </span>
          <span>•</span>
          <span className="font-mono text-neutral-300 uppercase">{displayLang}</span>
          <span>•</span>
          <span>{lines.length} lines</span>
        </div>
        <div className="flex items-center gap-2 font-mono">
          <span>Responsive Sandbox</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {containerContent}
      {isFullscreen && (
        <div
          onClick={() => setIsFullscreen(false)}
          className="fixed inset-0 z-[90] bg-black/85 backdrop-blur-md transition-opacity"
        />
      )}
    </>
  );
};
