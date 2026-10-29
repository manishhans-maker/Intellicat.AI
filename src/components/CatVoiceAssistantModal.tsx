import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mic,
  MicOff,
  X,
  Volume2,
  VolumeX,
  Cat,
  Sparkles,
  RefreshCw,
  Zap,
  MessageSquare,
  Play,
  Square,
  HelpCircle,
  Radio,
  Settings,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { INTELLICAT_LOGO_URL } from '../constants';

interface CatVoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenChatMode?: (mode: 'sassy-cat' | 'normal') => void;
}

export const CatVoiceAssistantModal: React.FC<CatVoiceAssistantModalProps> = ({
  isOpen,
  onClose,
  onOpenChatMode,
}) => {
  const { user } = useAuth();

  // Voice & AI State
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [catResponse, setCatResponse] = useState(
    'Meow~ *yawns and stretches claws* Greetings human! I am your Sassy Cat Voice Assistant 🐱✨! Tap the mic or pick a prompt to talk to me!'
  );
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [catMood, setCatMood] = useState<'sassy' | 'listening' | 'thinking' | 'speaking' | 'purring'>('sassy');
  const [purrActive, setPurrActive] = useState(false);
  const [voicePitch, setVoicePitch] = useState(1.4); // Sassy cat higher pitch
  const [voiceRate, setVoiceRate] = useState(1.05);

  // Web Speech API refs
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Initialize Speech Synthesis & Audio Context
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  // Web Audio Synthesizer: Real Purrs & Meow Sound Effects
  const playWebAudioPurr = () => {
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      setPurrActive(true);
      setCatMood('purring');

      // Purr Low Frequency Modulation Oscillator
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const modOsc = ctx.createOscillator();
      const modGain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(65, ctx.currentTime); // Low purr fundamental

      modOsc.type = 'sine';
      modOsc.frequency.setValueAtTime(24, ctx.currentTime); // Purr rumble rate (24Hz)
      modGain.gain.setValueAtTime(15, ctx.currentTime);

      modOsc.connect(modGain);
      modGain.connect(osc.frequency);

      gain.gain.setValueAtTime(0.01, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.8);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      modOsc.start();

      setTimeout(() => {
        try {
          osc.stop();
          modOsc.stop();
        } catch {}
        setPurrActive(false);
        setCatMood('sassy');
      }, 1800);
    } catch (e) {
      console.warn('AudioContext purr notice:', e);
      setPurrActive(false);
    }
  };

  const playMeowChime = () => {
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      // Pitch slide up and down for cute meow frequency
      osc.frequency.setValueAtTime(550, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.35);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.38);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch {}
  };

  // Speak response aloud using Web Speech API
  const speakCatText = (text: string) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();

    // Clean text for natural cat speech
    const cleanSpeech = text
      .replace(/```[\s\S]*?```/g, 'Code omitted.')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/[*_#~]/g, '')
      .trim();

    if (!cleanSpeech) return;

    const utterance = new SpeechSynthesisUtterance(cleanSpeech);
    utterance.pitch = voicePitch;
    utterance.rate = voiceRate;

    // Pick female or cute English voice if available
    const voices = synthRef.current.getVoices();
    const catVoice = voices.find(
      (v) =>
        (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Zira') || v.name.includes('Victoria')) &&
        v.lang.startsWith('en')
    );
    if (catVoice) {
      utterance.voice = catVoice;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      setCatMood('speaking');
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setCatMood('sassy');
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setCatMood('sassy');
    };

    synthRef.current.speak(utterance);
  };

  // Stop speaking
  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
      setCatMood('sassy');
    }
  };

  // Send voice query to AI Chat handler with mode 'sassy-cat'
  const handleSendVoiceQuery = async (queryText: string) => {
    if (!queryText.trim() || isThinking) return;

    stopSpeaking();
    setIsThinking(true);
    setCatMood('thinking');
    playMeowChime();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: queryText }],
          mode: 'sassy-cat',
          provider: 'gemini',
        }),
      });

      if (!res.ok) {
        throw new Error('Upstream AI service issue.');
      }

      if (!res.body) throw new Error('No stream body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const dataStr = trimmed.slice(6);
          if (dataStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.text) {
              fullText += parsed.text;
              setCatResponse(fullText);
            }
          } catch {}
        }
      }

      setIsThinking(false);
      setCatMood('sassy');

      if (autoSpeak && fullText) {
        speakCatText(fullText);
      }
    } catch (err: any) {
      console.error('Cat voice assistant error:', err);
      const fallback = 'Meow~ *flicks tail with slight annoyance* My neural cat connection hiccuped! Tap again to retry, human!';
      setCatResponse(fallback);
      setIsThinking(false);
      setCatMood('sassy');
      if (autoSpeak) speakCatText(fallback);
    }
  };

  // Toggle Web Speech Recognition
  const toggleSpeechRecognition = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      setCatMood('sassy');
    } else {
      stopSpeaking();
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        setCatResponse('Meow! Your browser doesn\'t support SpeechRecognition. Try Chrome, Safari, or Edge!');
        return;
      }

      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          setIsListening(true);
          setCatMood('listening');
          setInterimTranscript('');
          playMeowChime();
        };

        recognition.onresult = (event: any) => {
          let currentInterim = '';
          let finalFound = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcriptChunk = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalFound += transcriptChunk;
            } else {
              currentInterim += transcriptChunk;
            }
          }

          setInterimTranscript(currentInterim);

          if (finalFound) {
            setTranscript(finalFound);
            setInterimTranscript('');
            setIsListening(false);
            setCatMood('thinking');
            handleSendVoiceQuery(finalFound);
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('Speech recognition error:', event.error);
          setIsListening(false);
          setCatMood('sassy');
        };

        recognition.onend = () => {
          setIsListening(false);
          if (catMood === 'listening') setCatMood('sassy');
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err) {
        console.error('Speech recognition start failed:', err);
        setIsListening(false);
      }
    }
  };

  useEffect(() => {
    if (!isOpen) {
      stopSpeaking();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsListening(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const quickPrompts = [
    'Tell me a secret, sassy cat!',
    'Why are cats superior to humans?',
    'Gossip about dogs in sassy cat mode',
    'Meow me a hilarious cat story',
    'Give me a cat compliment with attitude',
  ];

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/90 backdrop-blur-xl overflow-y-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto scrollbar-thin bg-[#0e0e16] border border-amber-500/40 rounded-3xl p-4 sm:p-7 shadow-[0_0_50px_rgba(245,158,11,0.25)] text-white flex flex-col gap-4 sm:gap-6"
        >
          {/* Prominent Always-Visible Floating Close Cross Button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 z-40 p-2.5 rounded-full bg-red-600 hover:bg-red-500 text-white border-2 border-white/80 shadow-[0_0_15px_rgba(239,35,60,0.8)] transition-all cursor-pointer active:scale-90 flex items-center justify-center"
            title="Close Cat Assistant (X)"
            aria-label="Close Cat Assistant"
          >
            <X className="w-5 h-5 stroke-[3]" />
          </button>

          {/* Sticky Header Bar */}
          <div className="sticky top-0 z-30 bg-[#0e0e16]/95 backdrop-blur-md pb-3 border-b border-white/10 flex items-center justify-between pr-10">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-[#EF233C] via-amber-500 to-yellow-300 p-0.5 shadow-lg shadow-amber-500/30 animate-pulse shrink-0">
                <img
                  src={INTELLICAT_LOGO_URL}
                  alt="Sassy Cat Logo"
                  className="w-full h-full object-cover rounded-[14px]"
                />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-black tracking-tight text-white flex items-center gap-1.5 flex-wrap">
                  <span>Sassy Cat Voice Assistant</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-mono border border-amber-400/40 uppercase font-extrabold">
                    Voice 🎙️
                  </span>
                </h2>
                <p className="text-[11px] sm:text-xs text-neutral-400">
                  Zero-latency speech recognition with sassy cat audio purrs & answers
                </p>
              </div>
            </div>
          </div>

          {/* Sassy Animated Cat Avatar Frame */}
          <div className="relative flex flex-col items-center justify-center py-6 px-4 rounded-3xl bg-gradient-to-b from-black/80 via-[#141420] to-black/80 border border-white/10 overflow-hidden shadow-inner">
            {/* Ambient Animated Radial Glow */}
            <div
              className={`absolute w-64 h-64 rounded-full filter blur-3xl transition-all duration-500 opacity-30 ${
                catMood === 'listening'
                  ? 'bg-red-500 scale-125'
                  : catMood === 'thinking'
                  ? 'bg-amber-400 scale-110'
                  : catMood === 'speaking'
                  ? 'bg-emerald-400 scale-110'
                  : 'bg-purple-600 scale-100'
              }`}
            />

            {/* Cat Face Vector Illustration / Avatar */}
            <div className="relative z-10 flex flex-col items-center gap-4">
              <div className="relative group cursor-pointer" onClick={playWebAudioPurr}>
                {/* Visualizer Pulsing Rings when Listening or Speaking */}
                {(isListening || isSpeaking || isThinking) && (
                  <div className="absolute inset-0 -m-4 rounded-full border-2 border-amber-400/40 animate-ping" />
                )}

                <div
                  className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-gradient-to-tr from-[#1b1b28] to-[#252538] border-2 flex items-center justify-center shadow-2xl transition-all duration-300 ${
                    catMood === 'listening'
                      ? 'border-red-500 shadow-[0_0_30px_rgba(239,35,60,0.6)]'
                      : catMood === 'thinking'
                      ? 'border-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.6)]'
                      : catMood === 'speaking'
                      ? 'border-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.6)]'
                      : 'border-amber-500/40 hover:border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                  }`}
                >
                  {/* Sassy Cat Face Graphic */}
                  <div className="flex flex-col items-center justify-center relative">
                    {/* Cat Ears */}
                    <div className="flex gap-12 absolute -top-8 text-amber-400 font-bold text-2xl">
                      <span className="transform -rotate-12 animate-bounce">/\</span>
                      <span className="transform rotate-12 animate-bounce">/\</span>
                    </div>

                    <Cat className={`w-16 h-16 sm:w-20 sm:h-20 transition-all duration-300 ${
                      catMood === 'listening'
                        ? 'text-red-400 scale-110'
                        : catMood === 'thinking'
                        ? 'text-amber-300 animate-spin'
                        : catMood === 'speaking'
                        ? 'text-emerald-300 scale-105'
                        : 'text-amber-400'
                    }`} />

                    {/* Mood Pill Badge */}
                    <div className="absolute -bottom-3 px-3 py-0.5 rounded-full bg-black/90 border border-white/20 text-[10px] font-black uppercase tracking-wider text-amber-300 shadow-md">
                      {catMood === 'listening'
                        ? '🎙️ Listening...'
                        : catMood === 'thinking'
                        ? '🧠 Pondering...'
                        : catMood === 'speaking'
                        ? '🗣️ Meowing...'
                        : catMood === 'purring'
                        ? '🐾 Purring...'
                        : '🐱 Sassy Cat'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Sound Prompt */}
              <button
                onClick={playWebAudioPurr}
                disabled={purrActive}
                className="mt-2 px-3 py-1 rounded-full bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>{purrActive ? 'Purring... 🐾' : 'Pet the Cat (Purr Sound Effect) 🐾'}</span>
              </button>
            </div>

            {/* Dynamic Cat Response Display Box */}
            <div className="mt-5 w-full max-h-40 overflow-y-auto p-4 rounded-2xl bg-black/60 border border-white/10 text-xs sm:text-sm text-neutral-200 font-medium leading-relaxed shadow-inner">
              {isThinking ? (
                <div className="flex items-center gap-2 text-amber-400 font-semibold animate-pulse">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>The Sassy Cat is formulating a clever response... Meow~</span>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{catResponse}</p>
              )}
            </div>

            {/* Live Transcript Banner */}
            {(isListening || interimTranscript || transcript) && (
              <div className="mt-3 w-full px-3 py-1.5 rounded-xl bg-red-950/40 border border-red-500/30 text-[11px] text-red-200 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping shrink-0" />
                <span className="font-bold">Voice Input:</span>
                <span className="italic truncate">{interimTranscript || transcript || 'Speak now, human...'}</span>
              </div>
            )}
          </div>

          {/* Main Controls & Microphone Trigger */}
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-3">
              {/* Primary Push-To-Talk Mic Button */}
              <button
                onClick={toggleSpeechRecognition}
                className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer shadow-2xl active:scale-95 ${
                  isListening
                    ? 'bg-red-600 text-white shadow-[0_0_35px_rgba(239,35,60,0.8)] border-4 border-white animate-pulse'
                    : 'bg-gradient-to-tr from-[#EF233C] via-amber-500 to-yellow-400 text-black shadow-[0_0_25px_rgba(245,158,11,0.5)] border-2 border-amber-300 hover:scale-105'
                }`}
                title={isListening ? 'Tap to Stop Listening' : 'Tap to Speak with Sassy Cat'}
              >
                {isListening ? (
                  <MicOff className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                ) : (
                  <Mic className="w-8 h-8 sm:w-10 sm:h-10 text-black" />
                )}
              </button>

              {/* Stop Speaking Audio Button */}
              {isSpeaking && (
                <button
                  onClick={stopSpeaking}
                  className="p-3 rounded-full bg-neutral-800 hover:bg-neutral-700 text-white border border-white/20 cursor-pointer active:scale-95 shadow-md"
                  title="Mute Speech Output"
                >
                  <Square className="w-5 h-5 text-red-400 fill-red-400" />
                </button>
              )}
            </div>

            <p className="text-xs text-neutral-400 font-medium">
              {isListening ? 'Listening for your voice... Speak now!' : 'Tap the microphone button to start voice conversation'}
            </p>

            {/* Quick Sassy Prompts Pills */}
            <div className="w-full space-y-1.5">
              <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider text-center">
                Quick Voice Prompts
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {quickPrompts.map((promptText, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setTranscript(promptText);
                      handleSendVoiceQuery(promptText);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-xs text-amber-200 hover:text-white transition-all cursor-pointer active:scale-95"
                  >
                    💬 {promptText}
                  </button>
                ))}
              </div>
            </div>

            {/* Footer Action Bar */}
            <div className="w-full pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAutoSpeak(!autoSpeak)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer flex items-center gap-1.5 ${
                    autoSpeak
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-white/5 text-neutral-400 border-white/10'
                  }`}
                >
                  {autoSpeak ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                  <span>Voice: {autoSpeak ? 'ON' : 'OFF'}</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-red-500/20 border border-white/20 text-neutral-200 hover:text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                >
                  <X className="w-3.5 h-3.5 text-red-400" />
                  <span>Close ❌</span>
                </button>

                {onOpenChatMode && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenChatMode('sassy-cat');
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-[#EF233C] hover:bg-red-600 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-red-500/30 active:scale-95"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Open Cat Chat 🐱</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
