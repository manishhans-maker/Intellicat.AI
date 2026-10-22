import React, { useState, useEffect, useRef } from 'react';
import {
  Languages,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Copy,
  Check,
  ArrowRightLeft,
  Sparkles,
  RotateCcw,
  Clock,
  Trash2,
  MessageSquare,
  Globe,
  SlidersHorizontal,
  ChevronDown,
  Loader2,
  Info,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const SUPPORTED_LANGUAGES = [
  { code: 'auto', name: 'Auto-Detect', flag: '🌐' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish (Español)', flag: '🇪🇸' },
  { code: 'fr', name: 'French (Français)', flag: '🇫🇷' },
  { code: 'de', name: 'German (Deutsch)', flag: '🇩🇪' },
  { code: 'hi', name: 'Hindi (हिन्दी)', flag: '🇮🇳' },
  { code: 'ja', name: 'Japanese (日本語)', flag: '🇯🇵' },
  { code: 'zh', name: 'Chinese (中文)', flag: '🇨🇳' },
  { code: 'ar', name: 'Arabic (العربية)', flag: '🇸🇦' },
  { code: 'ru', name: 'Russian (Русский)', flag: '🇷🇺' },
  { code: 'pt', name: 'Portuguese (Português)', flag: '🇵🇹' },
  { code: 'it', name: 'Italian (Italiano)', flag: '🇮🇹' },
  { code: 'ko', name: 'Korean (한국어)', flag: '🇰🇷' },
  { code: 'nl', name: 'Dutch (Nederlands)', flag: '🇳🇱' },
  { code: 'tr', name: 'Turkish (Türkçe)', flag: '🇹🇷' },
  { code: 'vi', name: 'Vietnamese (Tiếng Việt)', flag: '🇻🇳' },
  { code: 'id', name: 'Indonesian (Bahasa)', flag: '🇮🇩' },
  { code: 'th', name: 'Thai (ไทย)', flag: '🇹🇭' },
  { code: 'bn', name: 'Bengali (বাংলা)', flag: '🇧🇩' },
  { code: 'pa', name: 'Punjabi (ਪੰਜਾਬੀ)', flag: '🇮🇳' },
  { code: 'pl', name: 'Polish (Polski)', flag: '🇵🇱' },
  { code: 'sv', name: 'Swedish (Svenska)', flag: '🇸🇪' },
  { code: 'el', name: 'Greek (Ελληνικά)', flag: '🇬🇷' },
  { code: 'he', name: 'Hebrew (עברית)', flag: '🇮🇱' },
  { code: 'ur', name: 'Urdu (اردو)', flag: '🇵🇰' },
  { code: 'fa', name: 'Persian (فارسی)', flag: '🇮🇷' },
];

interface TranslationHistoryItem {
  id: string;
  sourceText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  timestamp: number;
}

interface TranslatorPanelProps {
  onOpenChatWithQuery?: (prompt: string) => void;
}

export const TranslatorPanel: React.FC<TranslatorPanelProps> = ({ onOpenChatWithQuery }) => {
  const [sourceLang, setSourceLang] = useState('auto');
  const [targetLang, setTargetLang] = useState('Spanish (Español)');
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [phonetic, setPhonetic] = useState('');
  const [alternatives, setAlternatives] = useState<string[]>([]);
  const [detectedLang, setDetectedLang] = useState('');
  const [tone, setTone] = useState<'natural' | 'formal' | 'casual' | 'business'>('natural');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const [history, setHistory] = useState<TranslationHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('intelicat_translator_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const recognitionRef = useRef<any>(null);
  const debounceTimerRef = useRef<any>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = sourceLang === 'auto' ? 'en-US' : sourceLang;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          setSourceText(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition warning:', event?.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } catch (e) {
      console.warn('Speech recognition initialization failed:', e);
      setSpeechSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, [sourceLang]);

  // Execute translation
  const handleTranslate = async (textToTranslate = sourceText) => {
    const trimmed = textToTranslate.trim();
    if (!trimmed) {
      setTranslatedText('');
      setPhonetic('');
      setAlternatives([]);
      setDetectedLang('');
      return;
    }

    setLoading(true);
    try {
      let data: any = null;

      try {
        const res = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: trimmed,
            sourceLang,
            targetLang,
            tone,
          }),
        });
        if (res.ok) {
          data = await res.json();
        }
      } catch {
        data = null;
      }

      // Fail-safe instant translation engine if backend is unreachable or returning error
      if (!data || !data.translation) {
        try {
          const langCodeMap: Record<string, string> = {
            'French (Français)': 'fr',
            'Spanish (Español)': 'es',
            'German (Deutsch)': 'de',
            'Hindi (हिन्दी)': 'hi',
            'Japanese (日本語)': 'ja',
            'Chinese (中文)': 'zh',
            'Arabic (العربية)': 'ar',
            'Russian (Русский)': 'ru',
            'Portuguese (Português)': 'pt',
            'Italian (Italiano)': 'it',
            'Korean (한국어)': 'ko',
            'Dutch (Nederlands)': 'nl',
            'Turkish (Türkçe)': 'tr',
            'Vietnamese (Tiếng Việt)': 'vi',
            'Indonesian (Bahasa)': 'id',
            'Thai (ไทย)': 'th',
            'Bengali (বাংলা)': 'bn',
            'Punjabi (ਪੰਜਾਬੀ)': 'pa',
            'Polish (Polski)': 'pl',
            'Swedish (Svenska)': 'sv',
            'Greek (Ελληνικά)': 'el',
            'Hebrew (עברית)': 'he',
            'Urdu (اردو)': 'ur',
            'Persian (فارسی)': 'fa',
            'English': 'en',
          };

          const targetCode = langCodeMap[targetLang] || 'fr';
          const gtUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetCode}&dt=t&q=${encodeURIComponent(trimmed)}`;
          const gtRes = await fetch(gtUrl);
          if (gtRes.ok) {
            const gtData = await gtRes.json();
            if (gtData && gtData[0]) {
              const translatedStr = gtData[0].map((part: any) => part[0]).filter(Boolean).join('');
              if (translatedStr) {
                data = {
                  translation: translatedStr,
                  detectedSourceLang: gtData[2] ? gtData[2].toUpperCase() : 'Auto',
                  phonetic: '',
                  alternatives: [],
                };
              }
            }
          }
        } catch {
          // ignore
        }
      }

      if (data && data.translation) {
        setTranslatedText(data.translation);
        setPhonetic(data.phonetic || '');
        setAlternatives(data.alternatives || []);
        setDetectedLang(data.detectedSourceLang || '');

        // Add to history
        const newItem: TranslationHistoryItem = {
          id: `trans-${Date.now()}`,
          sourceText: trimmed,
          translatedText: data.translation,
          sourceLang: data.detectedSourceLang || sourceLang,
          targetLang,
          timestamp: Date.now(),
        };

        setHistory((prev) => {
          const updated = [newItem, ...prev.filter((i) => i.sourceText !== trimmed)].slice(0, 15);
          try {
            localStorage.setItem('intelicat_translator_history', JSON.stringify(updated));
          } catch {
            // ignore
          }
          return updated;
        });
      }
    } catch (err) {
      console.error('Translation failed:', err);
    } finally {
      setLoading(false);
    }
  };

  // Debounced auto-translate on text change
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (!sourceText.trim()) {
      setTranslatedText('');
      setPhonetic('');
      setAlternatives([]);
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      handleTranslate(sourceText);
    }, 600);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [sourceText, targetLang, tone]);

  // Toggle voice recognition
  const toggleSpeechRecognition = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.warn('Could not start microphone:', err);
        setIsListening(false);
      }
    }
  };

  // Text-to-Speech (Pronunciation)
  const handleSpeak = (text: string, langName: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    if (speaking) {
      setSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  // Copy to clipboard
  const handleCopy = () => {
    if (!translatedText) return;
    navigator.clipboard.writeText(translatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Swap source and target languages
  const handleSwapLanguages = () => {
    if (sourceLang === 'auto') return;
    const oldSource = sourceLang;
    const oldTarget = targetLang;
    const oldSourceText = sourceText;
    const oldTransText = translatedText;

    setSourceLang(oldTarget);
    setTargetLang(oldSource);
    setSourceText(oldTransText);
    setTranslatedText(oldSourceText);
  };

  // Clear translation
  const handleClear = () => {
    setSourceText('');
    setTranslatedText('');
    setPhonetic('');
    setAlternatives([]);
    setDetectedLang('');
  };

  // Clear history
  const handleClearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem('intelicat_translator_history');
    } catch {
      // ignore
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-[#12121c] via-[#0d0d16] to-[#07070e] border border-white/10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#EF233C] to-red-600 flex items-center justify-center text-white shadow-lg shadow-red-600/30 shrink-0">
            <Languages className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#EF233C] uppercase tracking-wider mb-0.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>IntellicatAI Voice & Text Polyglot Engine</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">AI Universal Translator</h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Speak or type in any language for instant real-time translations, speech synthesis, and contextual nuances.
            </p>
          </div>
        </div>

        {/* Tone Selector */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-black/60 border border-white/10 backdrop-blur-md self-start sm:self-center">
          <span className="text-[11px] text-neutral-400 pl-2 font-medium flex items-center gap-1">
            <SlidersHorizontal className="w-3 h-3 text-[#EF233C]" />
            <span className="hidden md:inline">Tone:</span>
          </span>
          {(['natural', 'formal', 'casual', 'business'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTone(t)}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer ${
                tone === t
                  ? 'bg-[#EF233C] text-white shadow-md shadow-[#EF233C]/30'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Main Dual Translation Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Source Text Box */}
        <div className="flex flex-col rounded-3xl bg-[#0d0d14] border border-white/10 shadow-2xl overflow-hidden focus-within:border-[#EF233C]/60 transition-all">
          {/* Header Bar */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#12121c] border-b border-white/10 shrink-0 gap-2">
            <div className="flex items-center gap-2">
              <label htmlFor="source-lang-select" className="text-xs font-bold text-neutral-300">From:</label>
              <select
                id="source-lang-select"
                value={sourceLang}
                onChange={(e) => setSourceLang(e.target.value)}
                aria-label="Source Language"
                className="bg-black/60 text-xs font-semibold text-white px-3 py-1.5 rounded-xl border border-white/10 focus:outline-none focus:border-[#EF233C] cursor-pointer"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code === 'auto' ? 'auto' : lang.name} className="bg-[#12121c] text-white">
                    {lang.flag} {lang.name}
                  </option>
                ))}
              </select>
              {detectedLang && sourceLang === 'auto' && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Detected: {detectedLang}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {sourceText && (
                <button
                  onClick={handleClear}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer text-xs"
                  title="Clear source text"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Text Area */}
          <div className="relative p-4 flex-1 min-h-[220px] sm:min-h-[260px] flex flex-col">
            <textarea
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder="Type anything to translate, or click the microphone to speak in any language..."
              className="w-full flex-1 bg-transparent resize-none text-sm sm:text-base text-neutral-100 placeholder-neutral-500 focus:outline-none leading-relaxed"
            />

            {/* Listening Indicator Ripple */}
            <AnimatePresence>
              {isListening && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="mt-2 p-2.5 rounded-2xl bg-red-600/20 border border-red-500/40 text-red-200 text-xs flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                    </span>
                    <span className="font-semibold">Listening to speech... Speak clearly now!</span>
                  </div>
                  <button
                    onClick={toggleSpeechRecognition}
                    className="px-2 py-0.5 rounded-lg bg-red-600 text-white font-bold text-[10px] cursor-pointer"
                  >
                    Done
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bottom Tools Bar */}
            <div className="flex items-center justify-between pt-3 mt-2 border-t border-white/5 text-xs text-neutral-400">
              <div className="flex items-center gap-2">
                {/* Voice Input Mic Button */}
                {speechSupported && (
                  <button
                    onClick={toggleSpeechRecognition}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isListening
                        ? 'bg-red-600 text-white shadow-lg shadow-red-600/40 animate-pulse'
                        : 'bg-white/10 hover:bg-white/15 text-neutral-200 hover:text-white'
                    }`}
                    title={isListening ? 'Stop recording voice' : 'Speak into microphone to translate'}
                  >
                    {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-[#EF233C]" />}
                    <span>{isListening ? 'Recording...' : 'Speak'}</span>
                  </button>
                )}

                {sourceText && (
                  <button
                    onClick={() => handleSpeak(sourceText, sourceLang)}
                    className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                    title="Listen to pronunciation"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <span className="text-[11px] font-mono text-neutral-500">
                {sourceText.length} / 5000 chars
              </span>
            </div>
          </div>
        </div>

        {/* Target Translation Box */}
        <div className="flex flex-col rounded-3xl bg-[#0d0d14] border border-white/10 shadow-2xl overflow-hidden focus-within:border-emerald-500/60 transition-all">
          {/* Header Bar */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#12121c] border-b border-white/10 shrink-0 gap-2">
            <div className="flex items-center gap-2">
              <label htmlFor="target-lang-select" className="text-xs font-bold text-neutral-300">To:</label>
              <select
                id="target-lang-select"
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                aria-label="Target Language"
                className="bg-black/60 text-xs font-semibold text-white px-3 py-1.5 rounded-xl border border-white/10 focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                {SUPPORTED_LANGUAGES.filter((l) => l.code !== 'auto').map((lang) => (
                  <option key={lang.code} value={lang.name} className="bg-[#12121c] text-white">
                    {lang.flag} {lang.name}
                  </option>
                ))}
              </select>

              {sourceLang !== 'auto' && (
                <button
                  onClick={handleSwapLanguages}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Swap languages"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {translatedText && (
                <>
                  <button
                    onClick={() => handleSpeak(translatedText, targetLang)}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    title="Pronounce translation"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  </button>

                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/15 text-neutral-200 text-xs font-semibold transition-colors cursor-pointer"
                    title="Copy translated text"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Translation Result Output Box */}
          <div className="relative p-4 flex-1 min-h-[220px] sm:min-h-[260px] flex flex-col justify-between">
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 text-neutral-400 py-10">
                <Loader2 className="w-6 h-6 animate-spin text-[#EF233C]" />
                <span className="text-xs font-medium">Translating idiomatically...</span>
              </div>
            ) : translatedText ? (
              <div className="space-y-3 flex-1">
                <div className="text-base sm:text-lg font-medium text-white leading-relaxed select-text">
                  {translatedText}
                </div>

                {/* Phonetics / Pronunciation Helper */}
                {phonetic && (
                  <div className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl inline-block border border-emerald-500/20">
                    🗣️ {phonetic}
                  </div>
                )}

                {/* Alternative phrases */}
                {alternatives.length > 0 && (
                  <div className="pt-2 border-t border-white/5">
                    <span className="text-[11px] font-bold text-neutral-400 block mb-1">Alternative Phrasings:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {alternatives.map((alt, idx) => (
                        <button
                          key={idx}
                          onClick={() => setTranslatedText(alt)}
                          className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white text-xs transition-colors cursor-pointer"
                        >
                          "{alt}"
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-neutral-500">
                <Languages className="w-8 h-8 stroke-1 mb-2 opacity-50" />
                <p className="text-xs">Translation output will appear here automatically.</p>
              </div>
            )}

            {/* Bottom Actions */}
            {translatedText && onOpenChatWithQuery && (
              <div className="pt-3 mt-2 border-t border-white/5 flex items-center justify-between">
                <button
                  onClick={() =>
                    onOpenChatWithQuery(
                      `Explain the grammar, cultural context, and nuances of this translation:\nSource (${detectedLang || sourceLang}): "${sourceText}"\nTranslated (${targetLang}): "${translatedText}"`
                    )
                  }
                  className="flex items-center gap-1.5 text-xs text-[#EF233C] hover:text-red-400 font-semibold cursor-pointer transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Ask Cyber Cat AI about grammar & cultural context</span>
                </button>

                <span className="text-[11px] text-neutral-500 font-mono">
                  {targetLang}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Translation History Section */}
      {history.length > 0 && (
        <div className="p-5 sm:p-6 rounded-3xl bg-[#0c0c14] border border-white/10 shadow-xl space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">Recent Translations</h3>
              <span className="text-xs text-neutral-500">({history.length})</span>
            </div>

            <button
              onClick={handleClearHistory}
              className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-red-400 transition-colors cursor-pointer"
              title="Clear all translation history"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear History</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {history.slice(0, 6).map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  setSourceText(item.sourceText);
                  setTranslatedText(item.translatedText);
                  setTargetLang(item.targetLang);
                }}
                className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15 transition-all cursor-pointer flex flex-col justify-between gap-2 group"
              >
                <div>
                  <div className="flex items-center justify-between text-[10px] text-neutral-400 mb-1">
                    <span className="font-semibold text-neutral-300">{item.sourceLang} → {item.targetLang}</span>
                    <span>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-xs text-neutral-200 line-clamp-1 font-medium">"{item.sourceText}"</p>
                  <p className="text-xs text-emerald-400 line-clamp-1 mt-0.5">"{item.translatedText}"</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
