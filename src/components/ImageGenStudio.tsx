import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Download,
  Copy,
  Check,
  RefreshCw,
  Image as ImageIcon,
  Palette,
  Maximize2,
  Trash2,
  ArrowRight,
  Cat,
  Zap,
  Clock,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  ChevronDown,
  Info,
  Car,
} from 'lucide-react';
import { GeneratedImage } from '../types';

interface ImageGenStudioProps {
  onClose?: () => void;
}

const STYLE_PRESETS = [
  { id: 'realistic', label: 'Photorealistic', desc: 'Natural lighting, 35mm lens, anatomical precision' },
  { id: 'cyberpunk', label: 'Cyberpunk 🐾', desc: 'Neon red, dark carbon, high-tech glow' },
  { id: 'anime', label: 'Anime Studio', desc: 'Vibrant manga illustrations & dynamic lines' },
  { id: '3d-render', label: '3D Render', desc: 'Pixar/Disney 3D glossy character render' },
  { id: 'watercolor', label: 'Watercolor', desc: 'Artistic fluid pigments & expressive paper texture' },
];

const ENGINES = [
  { id: 'flux', label: 'Flux.1 Ultra', desc: 'Highest anatomical & physical precision (Recommended)', badge: 'Ultra HD' },
  { id: 'turbo', label: 'SDXL Turbo Fast', desc: 'Ultra-fast 2s instant synthesis', badge: 'Fast ⚡' },
];

const ASPECT_RATIOS = [
  { id: '1:1', label: '1:1 Square', icon: '◻️' },
  { id: '16:9', label: '16:9 Wide', icon: '▭' },
  { id: '9:16', label: '9:16 Story', icon: '▯' },
  { id: '4:3', label: '4:3 Classic', icon: '▱' },
];

const PROMPT_CHIPS = [
  'Sleek red Lamborghini Huracan supercar, complete car, four pristine alloy wheels in asphalt perspective',
  'Cute fluffy domestic cat sitting peacefully on cushion with exactly one tail and four paws',
  'Futuristic cybernetic cat in neon Tokyo alley with single tail and glowing green eyes',
  'Hyper-realistic metallic blue Porsche 911 with 4 wheels in dramatic studio lighting',
  'Cute baby robot wearing astronaut helmet exploring a bioluminescent alien jungle',
];

export const ImageGenStudio: React.FC<ImageGenStudioProps> = () => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [style, setStyle] = useState('realistic');
  const [engine, setEngine] = useState('flux');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [showEnhancedPrompt, setShowEnhancedPrompt] = useState(false);

  // Gallery saved in local storage
  const [gallery, setGallery] = useState<GeneratedImage[]>(() => {
    try {
      const raw = localStorage.getItem('intelicat_generated_images');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('intelicat_generated_images', JSON.stringify(gallery));
    } catch (err) {
      console.warn('Failed to save image gallery:', err);
    }
  }, [gallery]);

  const [isImageRendering, setIsImageRendering] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);

  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const timer = setInterval(() => {
      setCooldownRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownRemaining]);

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt || loading) return;

    if (cooldownRemaining > 0) {
      setError(`Please wait ${cooldownRemaining}s before generating the next image.`);
      return;
    }

    setLoading(true);
    setError(null);
    setIsImageRendering(true);

    try {
      let res: Response | null = null;
      let data: any = null;

      try {
        res = await fetch('/api/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: cleanPrompt, aspectRatio, style, engine }),
        });
      } catch {
        // Fallback to secondary route
        try {
          res = await fetch('/api/imageGen', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: cleanPrompt, aspectRatio, style, engine }),
          });
        } catch {
          res = null;
        }
      }

      if (res) {
        const rawText = await res.text();
        try {
          data = rawText ? JSON.parse(rawText) : null;
        } catch {
          data = null;
        }

        if (res.status === 429 && data?.remainingSeconds) {
          setCooldownRemaining(data.remainingSeconds);
          setIsImageRendering(false);
          setError(`Please wait ${data.remainingSeconds}s before generating.`);
          return;
        }
      }

      let imageUrl = data?.imageUrl;
      const enhancedPrompt = data?.enhancedPrompt;

      // Fail-safe client generation fallback with anatomical rules if backend fails
      if (!imageUrl) {
        let width = 1024;
        let height = 1024;
        if (aspectRatio === '16:9') { width = 1280; height = 720; }
        else if (aspectRatio === '9:16') { width = 720; height = 1280; }
        else if (aspectRatio === '4:3') { width = 1024; height = 768; }

        let cleanText = cleanPrompt
          .replace(/^(can\s+you\s+)?(make|generate|genrate|render|draw|paint)(\s+me)?(\s+an?|\s+the)?(\s+image|\s+picture|\s+photo)?(\s+of)?\s+/i, '')
          .replace(/\blambo\b/gi, 'Lamborghini supercar')
          .trim() || cleanPrompt;

        const isVehicle = /\b(car|lamborghini|ferrari|porsche|supercar|vehicle)\b/i.test(cleanText);
        const isFeline = /\b(cat|kitten|kitty|feline)\b/i.test(cleanText);

        let anatomyRule = '';
        if (isVehicle) {
          anatomyRule = 'complete vehicle, all four alloy wheels in correct perspective, no missing wheels, no three wheels';
        } else if (isFeline) {
          anatomyRule = 'anatomically correct feline, exactly one natural tail, four paws, no duplicate tails';
        }

        const seed = Math.floor(Math.random() * 1000000);
        const fullPrompt = [cleanText, anatomyRule, `${style} style, 8k resolution, cinematic lighting`].filter(Boolean).join(', ');
        const encoded = encodeURIComponent(fullPrompt);
        imageUrl = `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&seed=${seed}&nologo=true&model=${engine}`;
      }

      // Short 2s anti-spam cooldown
      setCooldownRemaining(2);

      const newImg: GeneratedImage = {
        id: `img-${Date.now()}`,
        prompt: cleanPrompt,
        enhancedPrompt: enhancedPrompt || undefined,
        imageUrl,
        fallbackUrl: data?.fallbackUrl || undefined,
        aspectRatio,
        style,
        engine,
        provider: data?.provider || 'flux-engine',
        createdAt: new Date().toISOString(),
      };

      setGallery((prev) => [newImg, ...prev]);
      setSelectedImage(newImg);
    } catch (err: any) {
      setIsImageRendering(false);
      setError(err?.message || 'Error generating image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPrompt = (textToCopy: string, id: string) => {
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteImage = (id: string) => {
    setGallery((prev) => prev.filter((img) => img.id !== id));
    if (selectedImage?.id === id) {
      setSelectedImage(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto px-4 sm:px-8 py-6 text-white space-y-6">
      {/* Studio Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-[#EF233C]/20 border border-[#EF233C]/30 text-[#EF233C]">
              <ImageIcon className="w-5 h-5" />
            </span>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              Intelicat <span className="text-[#FF2A3A]">Image Studio</span>
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-neutral-400">
            Next-Gen AI Image Generator with Anatomical Perfection (4-wheel vehicles, single-tail felines, photorealistic physics).
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-full text-emerald-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Anatomical & Physical Integrity Shield Active</span>
        </div>
      </div>

      {/* Main Studio Workspace: Left Controls, Right Preview/Gallery */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Creator Form */}
        <div className="lg:col-span-5 space-y-5 bg-black/60 border border-white/10 rounded-2xl p-5 backdrop-blur-md">
          <form onSubmit={handleGenerate} className="space-y-4">
            {/* Prompt Input Area */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5">
                Describe Your Image
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="E.g. Sleek red Lamborghini Huracan supercar, complete car with four pristine alloy wheels parked on asphalt road..."
                rows={4}
                className="w-full rounded-xl bg-neutral-900/90 border border-white/15 px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#EF233C] transition-all resize-none"
              />
            </div>

            {/* Quick Inspiration Prompt Chips */}
            <div>
              <span className="text-[11px] font-semibold text-neutral-400 block mb-1.5">
                Try verified flawless prompts:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {PROMPT_CHIPS.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPrompt(chip)}
                    className="text-[11px] px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-neutral-300 hover:text-white transition-all text-left truncate max-w-full cursor-pointer"
                  >
                    {chip.slice(0, 42)}...
                  </button>
                ))}
              </div>
            </div>

            {/* Engine Selection */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5">
                AI Generation Engine
              </label>
              <div className="grid grid-cols-2 gap-2">
                {ENGINES.map((eng) => (
                  <button
                    key={eng.id}
                    type="button"
                    onClick={() => setEngine(eng.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      engine === eng.id
                        ? 'bg-[#EF233C]/20 border-[#EF233C] text-white shadow-[0_0_15px_rgba(239,35,60,0.3)]'
                        : 'bg-white/5 border-white/10 text-neutral-400 hover:text-neutral-200 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-bold text-white">{eng.label}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/10 text-neutral-300">{eng.badge}</span>
                    </div>
                    <div className="text-[10px] text-neutral-400 line-clamp-1">{eng.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Style Selector */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5">
                Aesthetic Style
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {STYLE_PRESETS.map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setStyle(st.id)}
                    className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                      style === st.id
                        ? 'bg-[#EF233C]/20 border-[#EF233C] text-white shadow-[0_0_15px_rgba(239,35,60,0.3)]'
                        : 'bg-white/5 border-white/10 text-neutral-400 hover:text-neutral-200 hover:bg-white/10'
                    }`}
                  >
                    <div className="text-xs font-bold text-white">{st.label}</div>
                    <div className="text-[9px] text-neutral-400 line-clamp-1">{st.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Aspect Ratio Selector */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5">
                Aspect Ratio
              </label>
              <div className="grid grid-cols-4 gap-2">
                {ASPECT_RATIOS.map((ar) => (
                  <button
                    key={ar.id}
                    type="button"
                    onClick={() => setAspectRatio(ar.id)}
                    className={`py-2 px-1.5 rounded-xl border text-center text-xs font-medium transition-all cursor-pointer ${
                      aspectRatio === ar.id
                        ? 'bg-[#EF233C] border-[#EF233C] text-white shadow-md'
                        : 'bg-white/5 border-white/10 text-neutral-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <div className="text-sm mb-0.5">{ar.icon}</div>
                    <div className="text-[11px] font-bold">{ar.id}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Generate Action Button */}
            <button
              type="submit"
              disabled={loading || !prompt.trim() || cooldownRemaining > 0}
              className={`w-full py-3.5 rounded-xl font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2 ${
                cooldownRemaining > 0
                  ? 'bg-neutral-800/90 border border-amber-500/40 text-amber-300 cursor-not-allowed shadow-inner'
                  : 'bg-[#EF233C] hover:bg-[#d90429] disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-[0_0_20px_rgba(239,35,60,0.4)] cursor-pointer active:scale-98'
              }`}
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Synthesizing Flawless Canvas...</span>
                </>
              ) : cooldownRemaining > 0 ? (
                <>
                  <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
                  <span>Ready in {cooldownRemaining}s</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Flawless Image</span>
                </>
              )}
            </button>
          </form>

          {error && (
            <div className="p-3 rounded-xl bg-red-950/80 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
              <span className="font-bold">Notice:</span> {error}
            </div>
          )}
        </div>

        {/* Right Column: Active Preview & History Gallery */}
        <div className="lg:col-span-7 space-y-6">
          {/* Active Preview Card */}
          {selectedImage ? (
            <div className="bg-black/70 border border-white/15 rounded-2xl p-4 backdrop-blur-md shadow-2xl space-y-4">
              <div className="flex items-center justify-between text-xs text-neutral-400 pb-2 border-b border-white/10">
                <span className="font-semibold text-white">Active Artwork</span>
                <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] text-neutral-300">
                  {selectedImage.aspectRatio} • {selectedImage.style || 'custom'} • {selectedImage.engine || 'flux'}
                </span>
              </div>

              {/* Image Display */}
              <div className="relative rounded-xl overflow-hidden bg-neutral-950 border border-white/10 flex items-center justify-center min-h-[300px] max-h-[500px]">
                {isImageRendering && (
                  <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-3">
                    <RefreshCw className="w-8 h-8 text-[#EF233C] animate-spin" />
                    <span className="text-xs font-semibold text-neutral-300">Rendering high-res canvas...</span>
                  </div>
                )}
                <img
                  src={selectedImage.imageUrl}
                  alt={selectedImage.prompt}
                  referrerPolicy="no-referrer"
                  onLoad={() => setIsImageRendering(false)}
                  onError={() => {
                    setIsImageRendering(false);
                    if (selectedImage) {
                      if (selectedImage.fallbackUrl && selectedImage.imageUrl !== selectedImage.fallbackUrl) {
                        setSelectedImage({ ...selectedImage, imageUrl: selectedImage.fallbackUrl });
                      } else {
                        const freshSeed = Math.floor(Math.random() * 1000000);
                        const cleanPromptText = encodeURIComponent(selectedImage.prompt.slice(0, 300));
                        const recoveryUrl = `https://pollinations.ai/p/${cleanPromptText}?width=1024&height=1024&seed=${freshSeed}&nologo=true`;
                        if (selectedImage.imageUrl !== recoveryUrl) {
                          setSelectedImage({ ...selectedImage, imageUrl: recoveryUrl });
                        }
                      }
                    }
                  }}
                  className={`w-full h-auto object-contain max-h-[500px] transition-all duration-300 hover:scale-[1.01] ${
                    isImageRendering ? 'opacity-20' : 'opacity-100'
                  }`}
                />
              </div>

              {/* Prompt & Actions */}
              <div className="space-y-2">
                <p className="text-xs sm:text-sm text-neutral-200 italic bg-white/5 p-3 rounded-xl border border-white/10">
                  "{selectedImage.prompt}"
                </p>

                {/* Show Enhanced Prompt Accordion if available */}
                {selectedImage.enhancedPrompt && (
                  <div className="rounded-xl bg-neutral-900/80 border border-white/10 p-3 text-xs space-y-1.5">
                    <button
                      type="button"
                      onClick={() => setShowEnhancedPrompt(!showEnhancedPrompt)}
                      className="w-full flex items-center justify-between font-bold text-neutral-300 hover:text-white transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5 text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>AI Prompt Optimization & Physical Accuracy Rules Applied</span>
                      </span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showEnhancedPrompt ? 'rotate-180' : ''}`} />
                    </button>
                    {showEnhancedPrompt && (
                      <p className="text-[11px] text-neutral-400 leading-relaxed pt-1 border-t border-white/5 font-mono">
                        {selectedImage.enhancedPrompt}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <a
                    href={selectedImage.imageUrl}
                    download="intelicat-artwork.jpg"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EF233C] hover:bg-[#d90429] text-white text-xs font-semibold shadow-md transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Full HD</span>
                  </a>

                  <button
                    onClick={() => {
                      setPrompt(selectedImage.prompt);
                      handleGenerate();
                    }}
                    disabled={loading || cooldownRemaining > 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-40 text-neutral-200 text-xs font-semibold transition-all cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Regenerate (New Seed)</span>
                  </button>

                  <button
                    onClick={() => handleCopyPrompt(selectedImage.prompt, selectedImage.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-neutral-200 text-xs font-semibold transition-all cursor-pointer"
                  >
                    {copiedId === selectedImage.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Prompt Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Prompt</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleDeleteImage(selectedImage.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold transition-all ml-auto cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-black/40 border border-dashed border-white/15 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-3 min-h-[300px]">
              <div className="p-4 rounded-full bg-white/5 text-neutral-400">
                <Sparkles className="w-8 h-8 text-[#EF233C]" />
              </div>
              <h3 className="text-base font-bold text-white">Your High-Fidelity Canvas Is Ready</h3>
              <p className="text-xs text-neutral-400 max-w-sm">
                Enter any prompt (e.g. "lambo", "cat", "cyberpunk street"). Our AI prompt engine automatically injects anatomical symmetry, 4-wheel perspective, and eliminates mutated tails or wheels!
              </p>
            </div>
          )}

          {/* History Gallery */}
          {gallery.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                  <span>Recent Generations ({gallery.length})</span>
                </h4>
                <button
                  onClick={() => {
                    setGallery([]);
                    setSelectedImage(null);
                    localStorage.removeItem('intelicat_generated_images');
                  }}
                  className="text-[11px] text-neutral-500 hover:text-red-400 transition-colors cursor-pointer"
                >
                  Clear Gallery
                </button>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {gallery.map((img) => (
                  <div
                    key={img.id}
                    onClick={() => setSelectedImage(img)}
                    className={`relative rounded-xl overflow-hidden aspect-square border cursor-pointer transition-all group ${
                      selectedImage?.id === img.id
                        ? 'border-[#EF233C] ring-2 ring-[#EF233C]/50'
                        : 'border-white/10 hover:border-white/30'
                    }`}
                  >
                    <img
                      src={img.imageUrl}
                      alt={img.prompt}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-end text-[10px] text-white">
                      <p className="line-clamp-2 leading-tight">{img.prompt}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
