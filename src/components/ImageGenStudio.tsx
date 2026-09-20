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
} from 'lucide-react';
import { GeneratedImage } from '../types';

interface ImageGenStudioProps {
  onClose?: () => void;
}

const STYLE_PRESETS = [
  { id: 'cyberpunk', label: 'Cyberpunk 🐾', desc: 'Neon red, dark carbon, high-tech glow' },
  { id: 'realistic', label: 'Photorealistic', desc: 'Natural lighting, 35mm lens fidelity' },
  { id: 'anime', label: 'Anime Studio', desc: 'Vibrant manga illustrations & dynamic lines' },
  { id: '3d-render', label: '3D Render', desc: 'Pixar/Disney 3D glossy character render' },
  { id: 'watercolor', label: 'Watercolor', desc: 'Artistic fluid pigments & expressive paper texture' },
];

const ASPECT_RATIOS = [
  { id: '1:1', label: '1:1 Square', icon: '◻️' },
  { id: '16:9', label: '16:9 Wide', icon: '▭' },
  { id: '9:16', label: '9:16 Story', icon: '▯' },
  { id: '4:3', label: '4:3 Classic', icon: '▱' },
];

const PROMPT_CHIPS = [
  'Cybernetic neon cat with glowing red eyes standing on a futuristic rooftop in 2088',
  'Futuristic AI command center with holographic code displays and sleek robot assistants',
  'Cute robotic cat wearing astronaut helmet exploring a bioluminescent alien jungle',
  'High-speed data stream tunnel with cyber cat avatar navigating quantum circuits',
];

export const ImageGenStudio: React.FC<ImageGenStudioProps> = () => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [style, setStyle] = useState('cyberpunk');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);

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

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt || loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: cleanPrompt,
          aspectRatio,
          style,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to generate image');
      }

      const data = await res.json();
      const newImg: GeneratedImage = {
        id: `img-${Date.now()}`,
        prompt: cleanPrompt,
        imageUrl: data.imageUrl,
        aspectRatio,
        style,
        provider: data.provider || 'flux-engine',
        createdAt: new Date().toISOString(),
      };

      setGallery((prev) => [newImg, ...prev]);
      setSelectedImage(newImg);
    } catch (err: any) {
      setError(err?.message || 'Error generating image.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPrompt = (img: GeneratedImage) => {
    navigator.clipboard.writeText(img.prompt);
    setCopiedId(img.id);
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
            Generate stunning high-resolution AI visuals with zero Gemini quota consumption.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs bg-white/5 border border-white/10 px-3 py-1.5 rounded-full text-neutral-300">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>Independent Image Engine (Quota-Protected)</span>
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
                placeholder="E.g. Cyberpunk red robotic cat perched on neon skyscraper rooftop in the rain..."
                rows={4}
                className="w-full rounded-xl bg-neutral-900/90 border border-white/15 px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#EF233C] transition-all resize-none"
              />
            </div>

            {/* Quick Inspiration Prompt Chips */}
            <div>
              <span className="text-[11px] font-semibold text-neutral-400 block mb-1.5">
                Try quick inspiration:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {PROMPT_CHIPS.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPrompt(chip)}
                    className="text-[11px] px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-neutral-300 hover:text-white transition-all text-left truncate max-w-full cursor-pointer"
                  >
                    {chip.slice(0, 40)}...
                  </button>
                ))}
              </div>
            </div>

            {/* Style Selector */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5">
                Aesthetic Style
              </label>
              <div className="grid grid-cols-2 gap-2">
                {STYLE_PRESETS.map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setStyle(st.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      style === st.id
                        ? 'bg-[#EF233C]/20 border-[#EF233C] text-white shadow-[0_0_15px_rgba(239,35,60,0.3)]'
                        : 'bg-white/5 border-white/10 text-neutral-400 hover:text-neutral-200 hover:bg-white/10'
                    }`}
                  >
                    <div className="text-xs font-bold text-white">{st.label}</div>
                    <div className="text-[10px] text-neutral-400 line-clamp-1">{st.desc}</div>
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
              disabled={loading || !prompt.trim()}
              className="w-full py-3 rounded-xl bg-[#EF233C] hover:bg-[#d90429] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm tracking-wide shadow-[0_0_20px_rgba(239,35,60,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Synthesizing Canvas...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Image</span>
                </>
              )}
            </button>
          </form>

          {error && (
            <div className="p-3 rounded-xl bg-red-950/80 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
              <span className="font-bold">Error:</span> {error}
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
                  {selectedImage.aspectRatio} • {selectedImage.style || 'custom'}
                </span>
              </div>

              {/* Image Display */}
              <div className="relative rounded-xl overflow-hidden bg-neutral-950 border border-white/10 flex items-center justify-center min-h-[300px] max-h-[500px]">
                <img
                  src={selectedImage.imageUrl}
                  alt={selectedImage.prompt}
                  referrerPolicy="no-referrer"
                  className="w-full h-auto object-contain max-h-[500px] transition-transform duration-300 hover:scale-[1.01]"
                />
              </div>

              {/* Prompt & Actions */}
              <div className="space-y-2">
                <p className="text-xs sm:text-sm text-neutral-200 italic bg-white/5 p-3 rounded-xl border border-white/10">
                  "{selectedImage.prompt}"
                </p>

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
                    onClick={() => handleCopyPrompt(selectedImage)}
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
              <h3 className="text-base font-bold text-white">Your Canvas Is Ready</h3>
              <p className="text-xs text-neutral-400 max-w-sm">
                Enter any creative prompt on the left to synthesize high-definition AI illustrations, wallpapers, and character designs.
              </p>
            </div>
          )}

          {/* History Gallery */}
          {gallery.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                <span>Recent Generations ({gallery.length})</span>
              </h4>

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
