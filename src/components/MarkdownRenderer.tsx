import React, { useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Check, Copy, Download, Terminal, Code2, FileCode } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
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
  css: 'css',
  sql: 'sql',
  rust: 'rs',
  rs: 'rs',
  go: 'go',
  json: 'json',
  markdown: 'md',
  md: 'md',
  bash: 'sh',
  sh: 'sh',
  shell: 'sh',
  cpp: 'cpp',
  c: 'c',
  java: 'java',
};

const CodeBlock: React.FC<{
  language?: string;
  value: string;
}> = ({ language, value }) => {
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const displayLang = (language || 'code').toLowerCase();
  const ext = EXTENSION_MAP[displayLang] || 'txt';
  const lines = value.split('\n');

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    try {
      const blob = new Blob([value], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `intelicat-snippet.${ext}`;
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

  return (
    <div className="my-3.5 rounded-xl overflow-hidden border border-white/15 bg-[#0a0a0f] shadow-2xl text-xs sm:text-sm font-mono group">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-black/70 border-b border-white/10 text-neutral-400">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-[#EF233C]" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-200">
            {displayLang}
          </span>
          <span className="text-[10px] text-neutral-500 font-sans hidden sm:inline">
            ({lines.length} {lines.length === 1 ? 'line' : 'lines'})
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Download code button */}
          <button
            onClick={handleDownload}
            type="button"
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white transition-all cursor-pointer text-[11px]"
            title={`Download as .${ext}`}
          >
            {downloaded ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400">Saved</span>
              </>
            ) : (
              <>
                <Download className="w-3 h-3" />
                <span className="hidden sm:inline">Download</span>
              </>
            )}
          </button>

          {/* Copy code button */}
          <button
            onClick={handleCopy}
            type="button"
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/5 hover:bg-[#EF233C]/20 border border-white/5 hover:border-[#EF233C]/40 text-neutral-300 hover:text-white transition-all cursor-pointer text-[11px]"
            title="Copy snippet"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code Body with Line Numbers */}
      <div className="p-3.5 overflow-x-auto text-neutral-200 leading-relaxed font-mono selection:bg-[#EF233C] selection:text-white flex gap-3 text-xs sm:text-[13px]">
        {lines.length > 1 && (
          <div className="select-none text-neutral-600 text-right pr-2 border-r border-white/10 font-mono text-xs">
            {lines.map((_, i) => (
              <div key={i} className="leading-relaxed">
                {i + 1}
              </div>
            ))}
          </div>
        )}
        <pre className="m-0 p-0 flex-1 overflow-x-auto">
          <code>{value}</code>
        </pre>
      </div>
    </div>
  );
};

/**
 * Safely converts LaTeX math/arrow commands into clean, readable Unicode characters.
 * Runs only on non-code sections to preserve actual code blocks.
 * Prevents raw commands like `$\rightarrow$` or `$\times$` from showing up as raw text.
 */
export function cleanLatexAndMathSymbols(input: string): string {
  if (!input || typeof input !== 'string') return '';

  // Split by code blocks (```...```) to preserve code snippets untouched
  const parts = input.split(/(```[\s\S]*?```)/g);

  return parts
    .map((part, index) => {
      // If it's a code block (odd indexes from split), return as is
      if (index % 2 === 1) return part;

      let text = part;

      // 1. Text styling inside LaTeX
      text = text.replace(/\\text\{([^}]+)\}/g, '$1');
      text = text.replace(/\\mathrm\{([^}]+)\}/g, '$1');
      text = text.replace(/\\mathbf\{([^}]+)\}/g, '**$1**');
      text = text.replace(/\\mathit\{([^}]+)\}/g, '*$1*');

      // 2. Fractions and Square Roots
      text = text.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)');
      text = text.replace(/\\sqrt\[([^\]]+)\]\{([^}]+)\}/g, '$1√($2)');
      text = text.replace(/\\sqrt\{([^}]+)\}/g, '√($1)');

      // 3. Arrows and Directional Symbols
      text = text.replace(/\\(?:rightarrow|longrightarrow|to)\b/g, '→');
      text = text.replace(/\\(?:leftarrow|longleftarrow|gets)\b/g, '←');
      text = text.replace(/\\(?:Rightarrow|Longrightarrow|implies)\b/g, '⇒');
      text = text.replace(/\\(?:Leftarrow|Longleftarrow)\b/g, '⇐');
      text = text.replace(/\\(?:leftrightarrow|longleftrightarrow|iff)\b/g, '↔');
      text = text.replace(/\\uparrow\b/g, '↑');
      text = text.replace(/\\downarrow\b/g, '↓');
      text = text.replace(/\\updownarrow\b/g, '↕');
      text = text.replace(/\\mapsto\b/g, '↦');

      // 4. Comparison and Math Operators
      text = text.replace(/\\times\b/g, '×');
      text = text.replace(/\\(?:div|divided)\b/g, '÷');
      text = text.replace(/\\pm\b/g, '±');
      text = text.replace(/\\mp\b/g, '∓');
      text = text.replace(/\\(?:neq|ne)\b/g, '≠');
      text = text.replace(/\\(?:leq|le)\b/g, '≤');
      text = text.replace(/\\(?:geq|ge)\b/g, '≥');
      text = text.replace(/\\approx\b/g, '≈');
      text = text.replace(/\\equiv\b/g, '≡');
      text = text.replace(/\\infty\b/g, '∞');
      text = text.replace(/\\cdot\b/g, '·');
      // Degrees and angles (handling ^\circ, ^{\circ}, \circ, \degree)
      text = text.replace(/\^\{?\\(?:circ|degree)\}?/g, '°');
      text = text.replace(/\\(?:circ|degree)\b/g, '°');
      text = text.replace(/\\bullet\b/g, '•');
      text = text.replace(/\\forall\b/g, '∀');
      text = text.replace(/\\exists\b/g, '∃');
      text = text.replace(/\\in\b/g, '∈');
      text = text.replace(/\\notin\b/g, '∉');
      text = text.replace(/\\(?:subset|subsetneq)\b/g, '⊂');
      text = text.replace(/\\subseteq\b/g, '⊆');
      text = text.replace(/\\cup\b/g, '∪');
      text = text.replace(/\\cap\b/g, '∩');
      text = text.replace(/\\(?:empty|emptyset)\b/g, '∅');
      text = text.replace(/\\nabla\b/g, '∇');
      text = text.replace(/\\partial\b/g, '∂');

      // 5. Greek Letters
      text = text.replace(/\\alpha\b/g, 'α');
      text = text.replace(/\\beta\b/g, 'β');
      text = text.replace(/\\gamma\b/g, 'γ');
      text = text.replace(/\\Delta\b/g, 'Δ');
      text = text.replace(/\\delta\b/g, 'δ');
      text = text.replace(/\\theta\b/g, 'θ');
      text = text.replace(/\\Theta\b/g, 'Θ');
      text = text.replace(/\\lambda\b/g, 'λ');
      text = text.replace(/\\Lambda\b/g, 'Λ');
      text = text.replace(/\\mu\b/g, 'µ');
      text = text.replace(/\\pi\b/g, 'π');
      text = text.replace(/\\Pi\b/g, 'Π');
      text = text.replace(/\\sigma\b/g, 'σ');
      text = text.replace(/\\Sigma\b/g, 'Σ');
      text = text.replace(/\\omega\b/g, 'ω');
      text = text.replace(/\\Omega\b/g, 'Ω');
      text = text.replace(/\\phi\b/g, 'φ');

      // 6. Superscript digits for math exponents
      text = text.replace(/\^2\b/g, '²');
      text = text.replace(/\^3\b/g, '³');
      text = text.replace(/\^0\b/g, '⁰');
      text = text.replace(/\^1\b/g, '¹');
      text = text.replace(/\^([0-9]+)/g, (_match, p1) => {
        const supMap: Record<string, string> = {
          '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
          '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
        };
        return p1.split('').map((c: string) => supMap[c] || c).join('');
      });

      // 7. Strip single/double dollar signs wrapping cleaned symbols/math so they don't stay as `$→$`
      text = text.replace(/\$\$([\s\S]*?)\$\$/g, '$1');
      text = text.replace(/\$([^\$\n]+?)\$/g, '$1');

      return text;
    })
    .join('');
}

class MarkdownErrorBoundary extends React.Component<
  { children: React.ReactNode; fallbackContent: string },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallbackContent: string }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.warn('MarkdownRenderer safely caught an error and rendered fallback:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="whitespace-pre-wrap leading-relaxed text-neutral-200">
          {this.props.fallbackContent}
        </div>
      );
    }
    return this.props.children;
  }
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const sanitizedContent = cleanLatexAndMathSymbols(content);

  return (
    <MarkdownErrorBoundary fallbackContent={sanitizedContent || content}>
      <div className="markdown-body space-y-2 text-xs sm:text-sm leading-relaxed break-words">
        <Markdown
          remarkPlugins={[remarkGfm]}
          components={{
          code({ inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const rawCode = String(children).replace(/\n$/, '');

            if (!inline && (match || rawCode.includes('\n'))) {
              return <CodeBlock language={match ? match[1] : undefined} value={rawCode} />;
            }

            return (
              <code
                className="px-1.5 py-0.5 rounded-md bg-white/10 text-amber-300 font-mono text-[11px] sm:text-xs border border-white/10"
                {...props}
              >
                {children}
              </code>
            );
          },
          p({ children }) {
            return <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>;
          },
          h1({ children }) {
            return (
              <h1 className="text-base sm:text-lg font-bold text-white mt-4 mb-2 pb-1 border-b border-white/10">
                {children}
              </h1>
            );
          },
          h2({ children }) {
            return (
              <h2 className="text-sm sm:text-base font-bold text-white mt-3 mb-1.5">{children}</h2>
            );
          },
          h3({ children }) {
            return (
              <h3 className="text-xs sm:text-sm font-bold text-amber-300 mt-2.5 mb-1">{children}</h3>
            );
          },
          ul({ children }) {
            return (
              <ul className="list-disc list-outside pl-4 space-y-1 mb-2 text-neutral-200">
                {children}
              </ul>
            );
          },
          ol({ children }) {
            return (
              <ol className="list-decimal list-outside pl-4 space-y-1 mb-2 text-neutral-200">
                {children}
              </ol>
            );
          },
          li({ children }) {
            return <li className="leading-relaxed">{children}</li>;
          },
          blockquote({ children }) {
            return (
              <blockquote className="border-l-2 border-[#EF233C] pl-3 py-1 my-2 italic text-neutral-300 bg-white/5 rounded-r-lg">
                {children}
              </blockquote>
            );
          },
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#EF233C] hover:underline font-medium inline-flex items-center gap-0.5"
              >
                {children}
              </a>
            );
          },
          table({ children }) {
            return (
              <div className="overflow-x-auto my-3 rounded-lg border border-white/10">
                <table className="min-w-full divide-y divide-white/10 text-xs sm:text-sm">
                  {children}
                </table>
              </div>
            );
          },
          th({ children }) {
            return (
              <th className="px-3 py-2 text-left font-bold text-neutral-200 bg-white/5 border-b border-white/10">
                {children}
              </th>
            );
          },
          td({ children }) {
            return <td className="px-3 py-2 border-b border-white/5 text-neutral-300">{children}</td>;
          },
        }}
      >
        {sanitizedContent}
      </Markdown>
    </div>
    </MarkdownErrorBoundary>
  );
};
