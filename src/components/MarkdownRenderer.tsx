import React, { useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Check, Copy, Terminal } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
}

const CodeBlock: React.FC<{
  language?: string;
  value: string;
}> = ({ language, value }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayLang = (language || 'code').toLowerCase();

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-white/15 bg-[#0d0d12] shadow-xl text-xs sm:text-sm font-mono">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-black/60 border-b border-white/10 text-neutral-400">
        <div className="flex items-center gap-1.5">
          <Terminal className="w-3.5 h-3.5 text-[#EF233C]" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-300">
            {displayLang}
          </span>
        </div>
        <button
          onClick={handleCopy}
          type="button"
          className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white transition-all cursor-pointer text-[11px]"
          title="Copy code to clipboard"
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

      {/* Code Body */}
      <div className="p-3 overflow-x-auto text-neutral-200 leading-relaxed font-mono selection:bg-[#EF233C] selection:text-white">
        <pre className="m-0 p-0">
          <code>{value}</code>
        </pre>
      </div>
    </div>
  );
};

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
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
            return <h1 className="text-base sm:text-lg font-bold text-white mt-4 mb-2 pb-1 border-b border-white/10">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="text-sm sm:text-base font-bold text-white mt-3 mb-1.5">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="text-xs sm:text-sm font-bold text-amber-300 mt-2.5 mb-1">{children}</h3>;
          },
          ul({ children }) {
            return <ul className="list-disc list-outside pl-4 space-y-1 mb-2 text-neutral-200">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="list-decimal list-outside pl-4 space-y-1 mb-2 text-neutral-200">{children}</ol>;
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
                className="text-[#EF233C] hover:text-red-400 underline underline-offset-2 transition-colors inline-flex items-center gap-0.5"
              >
                {children}
              </a>
            );
          },
          table({ children }) {
            return (
              <div className="overflow-x-auto my-3 rounded-xl border border-white/15">
                <table className="min-w-full divide-y divide-white/10 text-xs">{children}</table>
              </div>
            );
          },
          thead({ children }) {
            return <thead className="bg-black/60 text-neutral-300 font-semibold">{children}</thead>;
          },
          tbody({ children }) {
            return <tbody className="divide-y divide-white/10 bg-neutral-900/40">{children}</tbody>;
          },
          tr({ children }) {
            return <tr>{children}</tr>;
          },
          th({ children }) {
            return <th className="px-3 py-2 text-left text-neutral-300 font-bold uppercase tracking-wider text-[11px]">{children}</th>;
          },
          td({ children }) {
            return <td className="px-3 py-2 text-neutral-200 whitespace-pre-wrap">{children}</td>;
          },
        }}
      >
        {content}
      </Markdown>
    </div>
  );
};
