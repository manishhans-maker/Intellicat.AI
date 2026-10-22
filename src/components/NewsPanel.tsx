import React, { useState, useEffect } from 'react';
import {
  Newspaper,
  Globe,
  TrendingUp,
  Cpu,
  Briefcase,
  FlaskConical,
  Trophy,
  Film,
  Search,
  ExternalLink,
  Volume2,
  VolumeX,
  Sparkles,
  RefreshCw,
  Clock,
  Layers,
  ChevronRight,
  MessageSquare,
  X,
  Share2,
  Bookmark,
  Check,
  Radio,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { NewsArticle } from '../../api/news';

interface NewsPanelProps {
  onOpenChatWithQuery?: (prompt: string) => void;
}

const CATEGORIES = [
  { id: 'top', label: 'Top Headlines', icon: Newspaper },
  { id: 'technology', label: 'Tech & AI', icon: Cpu },
  { id: 'business', label: 'Markets & Finance', icon: Briefcase },
  { id: 'world', label: 'World Affairs', icon: Globe },
  { id: 'science', label: 'Science & Space', icon: FlaskConical },
  { id: 'sports', label: 'Sports', icon: Trophy },
  { id: 'entertainment', label: 'Culture & Entertainment', icon: Film },
];

export const NewsPanel: React.FC<NewsPanelProps> = ({ onOpenChatWithQuery }) => {
  const [category, setCategory] = useState('top');
  const [searchQuery, setSearchQuery] = useState('');
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [speakingArticleId, setSpeakingArticleId] = useState<string | null>(null);

  // AI Briefing Modal State
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [briefingData, setBriefingData] = useState<{
    executiveSummary?: string;
    keyTakeaways?: string[];
    whyItMatters?: string;
  } | null>(null);

  // Saved bookmarks in localStorage
  const [savedArticles, setSavedArticles] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('intelicat_saved_articles');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const fetchNews = async (cat = category, query = searchQuery) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (cat) params.append('category', cat);
      if (query.trim()) params.append('q', query.trim());

      const res = await fetch(`/api/news?${params.toString()}`);
      const data = await res.json();
      if (data && Array.isArray(data.articles)) {
        setArticles(data.articles);
      }
    } catch (err) {
      console.warn('News fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews(category, searchQuery);
  }, [category]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchNews(category, searchQuery);
  };

  // AI Deep Briefing
  const handleOpenBriefing = async (article: NewsArticle) => {
    setSelectedArticle(article);
    setBriefingLoading(true);
    setBriefingData(null);

    try {
      const res = await fetch('/api/news/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: article.title,
          source: article.source,
          snippet: article.snippet,
        }),
      });

      const data = await res.json();
      if (data && data.success) {
        setBriefingData({
          executiveSummary: data.executiveSummary,
          keyTakeaways: data.keyTakeaways,
          whyItMatters: data.whyItMatters,
        });
      }
    } catch (err) {
      console.error('Failed to get AI briefing:', err);
    } finally {
      setBriefingLoading(false);
    }
  };

  // Text-to-Speech audio reader
  const handleSpeakNews = (article: NewsArticle) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    if (speakingArticleId === article.id) {
      setSpeakingArticleId(null);
      return;
    }

    const textToRead = `${article.headline}. Published by ${article.source}. ${article.snippet}`;
    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.rate = 1.0;

    utterance.onstart = () => setSpeakingArticleId(article.id);
    utterance.onend = () => setSpeakingArticleId(null);
    utterance.onerror = () => setSpeakingArticleId(null);

    window.speechSynthesis.speak(utterance);
  };

  // Toggle bookmark
  const toggleBookmark = (id: string) => {
    setSavedArticles((prev) => {
      const next = prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id];
      try {
        localStorage.setItem('intelicat_saved_articles', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const leadArticle = articles[0];
  const gridArticles = articles.slice(1);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Newspaper Top Masthead Bar */}
      <div className="rounded-3xl bg-[#0c0d14] border border-white/15 shadow-2xl p-6 sm:p-8 relative overflow-hidden">
        {/* Subtle background newspaper texture overlay */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Edition & Date Meta Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-white/10 gap-2 text-xs text-neutral-400 font-mono">
          <div className="flex items-center gap-3">
            <span className="text-[#EF233C] font-bold tracking-wider uppercase flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 animate-pulse text-red-500" />
              <span>Global Wire</span>
            </span>
            <span>•</span>
            <span>Edition: Morning Global Chronicle</span>
            <span>•</span>
            <span className="hidden md:inline">Issue #{Math.floor(Date.now() / 86400000)}</span>
          </div>

          <div className="flex items-center gap-2">
            <span>📅 {todayFormatted}</span>
            <span>•</span>
            <span className="text-emerald-400 font-semibold">Live Feed ✓</span>
          </div>
        </div>

        {/* Newspaper Title Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2">
          <div>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white font-serif uppercase">
              The Intelicat Gazette
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1 font-sans">
              Worldwide News, Technology Milestones & Real-Time Intelligence Powered by AI
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Search input form */}
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search topics, stocks, news..."
                className="w-48 sm:w-64 pl-9 pr-3 py-2 rounded-xl bg-black/60 border border-white/10 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#EF233C]"
              />
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
            </form>

            <button
              onClick={() => fetchNews(category, searchQuery)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-neutral-200 transition-colors cursor-pointer border border-white/10"
              title="Refresh live news"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#EF233C]' : ''}`} />
            </button>
          </div>
        </div>

        {/* Category Pills Navigation Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-4 mt-2 border-t border-white/10">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = category === cat.id && !searchQuery;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setSearchQuery('');
                  setCategory(cat.id);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#EF233C] text-white shadow-md shadow-[#EF233C]/30'
                    : 'bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
          <div className="md:col-span-2 h-72 rounded-3xl bg-white/5 border border-white/10" />
          <div className="h-72 rounded-3xl bg-white/5 border border-white/10" />
          <div className="h-64 rounded-3xl bg-white/5 border border-white/10" />
          <div className="h-64 rounded-3xl bg-white/5 border border-white/10" />
          <div className="h-64 rounded-3xl bg-white/5 border border-white/10" />
        </div>
      )}

      {!loading && articles.length > 0 && (
        <div className="space-y-6">
          {/* Front-Page Featured Lead Story Card */}
          {leadArticle && (
            <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#121420] via-[#0d0e17] to-[#07080f] border border-white/15 shadow-2xl relative overflow-hidden group">
              <div className="flex flex-col lg:flex-row gap-6 justify-between items-start">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-[#EF233C] text-white text-[11px] font-black uppercase tracking-wider shadow-sm">
                      Lead Story
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-white/10 text-neutral-300 text-xs font-semibold">
                      {leadArticle.source}
                    </span>
                    <span className="text-xs text-neutral-400 font-mono">
                      {leadArticle.timeAgo}
                    </span>
                  </div>

                  <h2 className="text-2xl sm:text-4xl font-extrabold text-white leading-tight font-serif hover:text-[#EF233C] transition-colors">
                    <a href={leadArticle.link} target="_blank" rel="noopener noreferrer">
                      {leadArticle.headline}
                    </a>
                  </h2>

                  <p className="text-sm sm:text-base text-neutral-300 leading-relaxed max-w-4xl">
                    {leadArticle.snippet}
                  </p>

                  {/* Lead Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <button
                      onClick={() => handleOpenBriefing(leadArticle)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#EF233C] hover:bg-red-600 text-white text-xs font-bold transition-all shadow-md shadow-[#EF233C]/30 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>AI Deep Briefing</span>
                    </button>

                    <button
                      onClick={() => handleSpeakNews(leadArticle)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-neutral-200 text-xs font-semibold transition-colors cursor-pointer"
                      title="Listen to story audio"
                    >
                      {speakingArticleId === leadArticle.id ? (
                        <>
                          <VolumeX className="w-3.5 h-3.5 text-red-400" />
                          <span>Stop Audio</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Listen</span>
                        </>
                      )}
                    </button>

                    <a
                      href={leadArticle.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer border border-white/10"
                    >
                      <span>Read on {leadArticle.source}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>

                    {onOpenChatWithQuery && (
                      <button
                        onClick={() =>
                          onOpenChatWithQuery(`Discuss and analyze this breaking news headline:\n"${leadArticle.title}"`)
                        }
                        className="flex items-center gap-1 px-3 py-2 rounded-xl text-neutral-400 hover:text-[#EF233C] text-xs font-medium transition-colors cursor-pointer ml-auto"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Ask Cyber Cat AI</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Newspaper Column Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {gridArticles.map((article) => {
              const isSaved = savedArticles.includes(article.id);
              const isSpeaking = speakingArticleId === article.id;

              return (
                <div
                  key={article.id}
                  className="flex flex-col justify-between p-5 rounded-3xl bg-[#0d0e16] border border-white/10 hover:border-white/20 shadow-xl hover:shadow-2xl transition-all group"
                >
                  <div className="space-y-3">
                    {/* Header meta */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="px-2 py-0.5 rounded-lg bg-white/10 text-neutral-300 font-semibold text-[11px]">
                        {article.source}
                      </span>
                      <div className="flex items-center gap-1.5 text-neutral-400 text-[11px] font-mono">
                        <Clock className="w-3 h-3" />
                        <span>{article.timeAgo}</span>
                      </div>
                    </div>

                    {/* Headline */}
                    <h3 className="text-base sm:text-lg font-bold text-white leading-snug font-serif group-hover:text-[#EF233C] transition-colors">
                      <a href={article.link} target="_blank" rel="noopener noreferrer">
                        {article.headline}
                      </a>
                    </h3>

                    {/* Snippet */}
                    <p className="text-xs text-neutral-400 leading-relaxed line-clamp-3">
                      {article.snippet}
                    </p>
                  </div>

                  {/* Card Actions Footer */}
                  <div className="pt-4 mt-4 border-t border-white/5 flex items-center justify-between text-xs gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenBriefing(article)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#EF233C]/20 hover:bg-[#EF233C]/35 text-[#EF233C] border border-[#EF233C]/40 font-bold text-[11px] transition-colors cursor-pointer"
                        title="AI Executive Summary"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Briefing</span>
                      </button>

                      <button
                        onClick={() => handleSpeakNews(article)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                        title="Read headline out loud"
                      >
                        <Volume2 className={`w-3.5 h-3.5 ${isSpeaking ? 'text-red-400 animate-pulse' : ''}`} />
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleBookmark(article.id)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          isSaved ? 'text-amber-400 bg-amber-400/20' : 'text-neutral-400 hover:text-white bg-white/5 hover:bg-white/15'
                        }`}
                        title={isSaved ? 'Bookmarked' : 'Save story'}
                      >
                        <Bookmark className="w-3.5 h-3.5" />
                      </button>

                      <a
                        href={article.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                        title="Open full news article"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AI Deep Briefing Modal */}
      <AnimatePresence>
        {selectedArticle && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-xl"
            onClick={() => setSelectedArticle(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-2xl bg-[#0e0e14] border border-white/20 rounded-3xl shadow-2xl p-6 sm:p-8 text-white max-h-[90vh] overflow-y-auto space-y-5"
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedArticle(null)}
                className="absolute top-5 right-5 p-2 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Modal Header */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded-lg bg-[#EF233C]/20 text-[#EF233C] border border-[#EF233C]/40 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    AI Intelligence Briefing
                  </span>
                  <span className="text-neutral-400 font-mono">{selectedArticle.source}</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold font-serif text-white">
                  {selectedArticle.headline}
                </h3>
              </div>

              {/* Content Body */}
              {briefingLoading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3 text-neutral-400">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#EF233C]" />
                  <span className="text-xs font-semibold">Synthesizing intelligence breakdown...</span>
                </div>
              ) : briefingData ? (
                <div className="space-y-4 pt-2">
                  {/* Executive Summary */}
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
                    <span className="text-xs font-bold text-[#EF233C] uppercase tracking-wider block">
                      Executive Summary
                    </span>
                    <p className="text-xs sm:text-sm text-neutral-200 leading-relaxed">
                      {briefingData.executiveSummary}
                    </p>
                  </div>

                  {/* Key Takeaways */}
                  {briefingData.keyTakeaways && briefingData.keyTakeaways.length > 0 && (
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                      <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
                        3-Bullet Core Facts
                      </span>
                      <ul className="space-y-2 text-xs sm:text-sm text-neutral-300">
                        {briefingData.keyTakeaways.map((point, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shrink-0" />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Why It Matters */}
                  {briefingData.whyItMatters && (
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-900/20 to-transparent border border-blue-500/30 space-y-1.5">
                      <span className="text-xs font-bold text-blue-400 uppercase tracking-wider block">
                        Strategic Impact & Why It Matters
                      </span>
                      <p className="text-xs sm:text-sm text-neutral-200 leading-relaxed">
                        {briefingData.whyItMatters}
                      </p>
                    </div>
                  )}

                  {/* Modal Footer Actions */}
                  <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
                    <a
                      href={selectedArticle.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors"
                    >
                      <span>Read Original Newspaper Article</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    {onOpenChatWithQuery && (
                      <button
                        onClick={() => {
                          const articleTitle = selectedArticle.title;
                          setSelectedArticle(null);
                          onOpenChatWithQuery(`Discuss and analyze this news development:\n"${articleTitle}"`);
                        }}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#EF233C] hover:bg-red-600 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Chat with Cyber Cat AI</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-neutral-400 text-xs">
                  Could not load briefing. Please read the original article directly.
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
