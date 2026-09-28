import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Sparkles,
  User,
  RefreshCw,
  Zap,
  ArrowRight,
  Download,
  Copy,
  Check,
  Code,
  MessageSquare,
  Cat,
  Crown,
  Volume2,
  VolumeX,
  Square,
  Globe,
  Paperclip,
  Image as ImageIcon,
  Menu,
  FileText,
  Trash2,
  Share2,
  ChevronDown,
  AlertCircle,
  Cpu,
  ExternalLink,
  CheckCircle2,
  Mic,
  MicOff,
  Brain,
  Search,
  Palette,
  GraduationCap,
  SlidersHorizontal,
  Eye,
  PanelRight,
  Split,
} from 'lucide-react';
import { RobotBackground } from './RobotBackground';
import { INTELLICAT_LOGO_URL } from '../constants';
import { useAuth } from '../context/AuthContext';
import {
  ChatMessage,
  ChatMode,
  AiProvider,
  ChatAttachment,
  CitationSource,
  Conversation,
  AVAILABLE_AI_MODELS,
  AiModelOption,
} from '../types';
export type { ChatMode, AiProvider };
import { MarkdownRenderer } from './MarkdownRenderer';
import { ArtifactRunner, isPreviewableArtifact } from './ArtifactRunner';
import { ConversationSidebar } from './ConversationSidebar';
import {
  loadUserConversations,
  saveConversation,
  deleteConversation,
  togglePinConversation,
  toggleArchiveConversation,
  renameConversation,
  loadConversationMessages,
  saveMessage,
  generateAutomaticTitle,
} from '../lib/conversationService';
import { loadUserMemories, formatMemoriesForContext } from '../lib/memoryService';
import { extractTextFromFile, extractRelevantChunks } from '../lib/fileExtractionService';
import {
  startSpeechRecognition,
  stopSpeechRecognition,
  speakText,
  stopSpeaking,
} from '../lib/voiceService';

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPrompt?: string;
  defaultMode?: ChatMode;
  onOpenBuyVip?: () => void;
  isVipMember?: boolean;
  isFounder?: boolean;
}

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({
  isOpen,
  onClose,
  initialPrompt,
  defaultMode = 'normal',
  onOpenBuyVip,
  isVipMember = false,
  isFounder = false,
}) => {
  const {
    user,
    userProfile,
    openAuthModal,
    remainingRequests,
    maxRequests,
    isLimitReached,
    isUnlimited,
    isOwner: authIsOwner,
    tier,
    consumeRequest,
  } = useAuth();

  const isOwner = Boolean(
    authIsOwner ||
    (user?.email && (
      user.email.toLowerCase().includes('hans') ||
      user.email.toLowerCase() === 'ashwinhans2612@gmail.com' ||
      user.email.toLowerCase() === 'manishhans@gmail.com'
    ))
  );
  const isFounderActive = Boolean(isFounder || isOwner || tier === 'founder');
  const isVipActive = Boolean(isVipMember || isFounderActive || tier === 'vip');
  const isUnlimitedAccount = Boolean(isOwner || isUnlimited || isFounderActive || isVipActive);

  // State
  const [mode, setMode] = useState<ChatMode>(defaultMode);
  const [provider, setProvider] = useState<AiProvider>(defaultMode === 'cat-code' ? 'gemini' : 'gemini');
  const [providerCapabilities, setProviderCapabilities] = useState<{
    groq: boolean;
    gemini: boolean;
    searchAvailable: boolean;
  }>({ groq: false, gemini: true, searchAvailable: true });
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Messages & Input
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showEngineModal, setShowEngineModal] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    try {
      return localStorage.getItem('intelicat_selected_model') || 'gemini-3.8-flash';
    } catch {
      return 'gemini-3.8-flash';
    }
  });
  const [modelCategoryFilter, setModelCategoryFilter] = useState<'all' | 'gemini' | 'groq'>('all');

  const activeModelObj: AiModelOption =
    AVAILABLE_AI_MODELS.find((m) => m.id === selectedModel) || AVAILABLE_AI_MODELS[0];

  const handleSelectModel = (modelId: string) => {
    setSelectedModel(modelId);
    const found = AVAILABLE_AI_MODELS.find((m) => m.id === modelId);
    if (found) {
      setProvider(found.provider);
    }
    try {
      localStorage.setItem('intelicat_selected_model', modelId);
    } catch {}
    setShowEngineModal(false);
  };

  const filteredModels = AVAILABLE_AI_MODELS.filter((m) => {
    if (modelCategoryFilter === 'all') return true;
    return m.provider === modelCategoryFilter;
  });

  // File Upload State
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Streaming & Telemetry
  const abortControllerRef = useRef<AbortController | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [streamStats, setStreamStats] = useState({
    tokenCount: 120,
    latencyMs: defaultMode === 'normal' ? 3.2 : 6.5,
  });

  // Dedicated Built Website Artifact Split-Screen View
  const [isSplitView, setIsSplitView] = useState(false);

  // Automatically find the most recent interactive built website artifact in this conversation
  const latestArtifact = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role === 'assistant' && msg.content) {
        const codeBlockMatch = /```(\w+)?\n([\s\S]*?)```/.exec(msg.content);
        if (codeBlockMatch) {
          const lang = codeBlockMatch[1];
          const code = codeBlockMatch[2];
          const isMsgCatCode = msg.mode === 'cat-code' || mode === 'cat-code';
          if (isPreviewableArtifact(lang, code, isMsgCatCode)) {
            return {
              language: lang,
              code,
              messageId: msg.id,
              isCatCode: isMsgCatCode,
            };
          }
        }
      }
    }
    return null;
  }, [messages, mode]);

  const getWelcomeMessage = (selectedMode: ChatMode = 'normal'): ChatMessage => {
    switch (selectedMode) {
      case 'fast':
        return {
          id: `welcome-${Date.now()}`,
          role: 'assistant',
          content: `⚡ **Fast Mode Enabled**\n\nOptimized for rapid-fire responses, quick answers, and minimal latency. Ask your question and get instant clarity.`,
          timestamp: 'Just now',
          createdAt: new Date().toISOString(),
          mode: 'fast',
          provider: 'groq',
        };
      case 'deep-think':
        return {
          id: `welcome-${Date.now()}`,
          role: 'assistant',
          content: `🧠 **Deep Think & Reasoning Mode**\n\nI will break down complex problems step-by-step, trace algorithmic logic, evaluate edge cases, and provide comprehensive analytical reasoning. What problem are we dissecting today?`,
          timestamp: 'Just now',
          createdAt: new Date().toISOString(),
          mode: 'deep-think',
          provider: 'gemini',
        };
      case 'search':
        return {
          id: `welcome-${Date.now()}`,
          role: 'assistant',
          content: `🔍 **Live Web Search Mode**\n\nI retrieve up-to-the-minute web information, verify current facts, synthesize citations, and display sources directly in responses. What would you like me to research?`,
          timestamp: 'Just now',
          createdAt: new Date().toISOString(),
          mode: 'search',
          provider: 'gemini',
        };
      case 'creative':
        return {
          id: `welcome-${Date.now()}`,
          role: 'assistant',
          content: `🎨 **Creative Writing & Story Mode**\n\nVivid imagination, expressive tone, and narrative depth. Share a premise, poem concept, scenario, or screenplay idea!`,
          timestamp: 'Just now',
          createdAt: new Date().toISOString(),
          mode: 'creative',
          provider: 'gemini',
        };
      case 'study':
        return {
          id: `welcome-${Date.now()}`,
          role: 'assistant',
          content: `🎓 **Study & Tutoring Mode**\n\nPersonalized academic guidance, homework walkthroughs, practice quizzes, and concept explanations tailored to your grade level. Let's master the topic together!`,
          timestamp: 'Just now',
          createdAt: new Date().toISOString(),
          mode: 'study',
          provider: 'gemini',
        };
      case 'cat-code':
      case 'coding':
        return {
          id: `welcome-${Date.now()}`,
          role: 'assistant',
          content: `Purr-fect timing! 🐾 I am **IntelicatAI**, your Cybernetic Cat Coder in **Cat Code Mode** featuring **Live Website Artifact Previews** ⚡.\n\nAsk me to build any website, web app, interactive game, calculator, or dashboard! I'll write the code and immediately launch the live website right inside the chat with desktop, tablet, and mobile previews. What app or website shall we build?`,
          timestamp: 'Just now',
          createdAt: new Date().toISOString(),
          mode: 'cat-code',
          provider: 'gemini',
        };
      case 'normal':
      default:
        return {
          id: `welcome-${Date.now()}`,
          role: 'assistant',
          content: `Hello! I'm your AI conversational companion in **Normal Talk Mode** powered by **Groq LPU (Llama 3.3 70B)** ⚡ and **Google Gemini** ✨.\n\nAsk me anything — brainstorm ideas, summarize content, search real-time web facts, upload images/documents for analysis, or just talk. What's on your mind?`,
          timestamp: 'Just now',
          createdAt: new Date().toISOString(),
          mode: 'normal',
          provider: 'groq',
        };
    }
  };

  // 1. Initial Load of Conversations & Provider Capabilities on Open
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    // Check available backend AI engines and search availability
    fetch('/api/providers')
      .then((r) => r.json())
      .then((data) => {
        if (!isMounted) return;
        const groqAvailable = Boolean(data.groq);
        const geminiAvailable = Boolean(data.gemini);
        const searchOk = Boolean(data.searchAvailable !== false);

        setProviderCapabilities({
          groq: groqAvailable,
          gemini: geminiAvailable,
          searchAvailable: searchOk,
        });

        // If currently on Groq but Groq key is absent, auto-switch to Gemini
        if (!groqAvailable && geminiAvailable) {
          setProvider('gemini');
        }
      })
      .catch((err) => {
        console.warn('Could not fetch provider capabilities:', err);
      });

    const loadData = async () => {
      if (user?.uid) {
        const userConvs = await loadUserConversations(user.uid);
        if (isMounted) {
          setConversations(userConvs);
          // When app is started or loaded, always start fresh from a clean New Chat
          if (!currentConversationId) {
            setCurrentConversationId(null);
            setMessages([getWelcomeMessage(mode)]);
          }
        }
      } else {
        // Guest / Not logged in
        if (!currentConversationId || messages.length === 0) {
          setCurrentConversationId(null);
          setMessages([getWelcomeMessage(mode)]);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, user?.uid]);

  // When modal is opened fresh from the app without an explicit custom prompt, start from a new chat
  useEffect(() => {
    if (isOpen && !initialPrompt) {
      setCurrentConversationId(null);
      setMessages([getWelcomeMessage(defaultMode || mode)]);
      setInput('');
      setAttachments([]);
      setError(null);
    }
  }, [isOpen]);

  // Sync mode changes when defaultMode prop changes
  useEffect(() => {
    if (isOpen && !currentConversationId) {
      const targetMode: ChatMode = (defaultMode as ChatMode) || 'normal';
      setMode(targetMode);
      const isGroqFriendly = (targetMode === 'normal' || targetMode === 'fast') && providerCapabilities.groq;
      setProvider(isGroqFriendly ? 'groq' : 'gemini');
      setStreamStats((s) => ({ ...s, latencyMs: isGroqFriendly ? 3.2 : 6.5 }));
      setMessages([getWelcomeMessage(targetMode)]);
    }
  }, [isOpen, defaultMode, providerCapabilities.groq]);

  // Trigger initial prompt if provided
  useEffect(() => {
    if (initialPrompt && isOpen && !loading) {
      handleSend(initialPrompt);
    }
  }, [initialPrompt, isOpen]);

  // Clean up speech synthesis on unmount / close
  useEffect(() => {
    if (!isOpen && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
    }
  }, [isOpen]);

  // Auto-scroll when messages update (unless user is scrolled up)
  useEffect(() => {
    if (isOpen && chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  // Adjust textarea height dynamically
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
      const minH = isMobile ? 74 : 48;
      const targetH = Math.max(minH, Math.min(textareaRef.current.scrollHeight, 220));
      textareaRef.current.style.height = `${targetH}px`;
    }
  };

  // File Upload Handlers (Multiformat: PDF, DOCX, PPTX, TXT, Images)
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    if (attachments.length + files.length > 5) {
      setError('You can attach a maximum of 5 files per message.');
      return;
    }

    for (const file of Array.from(files)) {
      if (file.size > 15 * 1024 * 1024) {
        setError(`File "${file.name}" exceeds the 15MB size limit.`);
        continue;
      }

      try {
        const extracted = await extractTextFromFile(file);
        const newAttachment: ChatAttachment = {
          id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: file.name,
          type: file.type || (extracted.isImage ? 'image/png' : 'text/plain'),
          size: file.size,
          data: extracted.base64 || extracted.text,
        };

        setAttachments((prev) => [...prev, newAttachment]);
        if (extracted.isImage) {
          setProvider('gemini');
        }
      } catch (err) {
        setError(`Failed to read file ${file.name}`);
      }
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  // Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  // Conversation Management Handlers
  const handleNewChat = (customMode?: ChatMode) => {
    if (loading) handleStopGeneration();
    const nextMode = customMode || mode;
    setCurrentConversationId(null);
    setMode(nextMode);
    setProvider((nextMode === 'fast' || nextMode === 'normal') && providerCapabilities.groq ? 'groq' : 'gemini');
    setMessages([getWelcomeMessage(nextMode)]);
    setAttachments([]);
    setInput('');
    setError(null);
    setIsSidebarOpen(false);
  };

  const handleSelectConversation = async (convId: string) => {
    if (convId === currentConversationId) return;
    if (loading) handleStopGeneration();

    const selectedConv = conversations.find((c) => c.id === convId);
    if (!selectedConv) return;

    setCurrentConversationId(convId);
    setMode(selectedConv.mode);
    setProvider(
      selectedConv.provider === 'groq' && !providerCapabilities.groq
        ? 'gemini'
        : selectedConv.provider || (selectedConv.mode === 'cat-code' ? 'gemini' : (providerCapabilities.groq ? 'groq' : 'gemini'))
    );
    setError(null);
    setAttachments([]);

    if (user?.uid) {
      const msgs = await loadConversationMessages(user.uid, convId);
      setMessages(msgs.length > 0 ? msgs : [getWelcomeMessage(selectedConv.mode)]);
    }
  };

  const handleRenameConversation = async (convId: string, newTitle: string) => {
    if (!user?.uid) return;
    await renameConversation(user.uid, convId, newTitle);
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, title: newTitle } : c))
    );
  };

  const handleDeleteConversation = async (convId: string) => {
    if (!user?.uid) return;
    await deleteConversation(user.uid, convId);
    setConversations((prev) => prev.filter((c) => c.id !== convId));
    if (currentConversationId === convId) {
      handleNewChat();
    }
  };

  const handleTogglePin = async (convId: string, currentPinned: boolean) => {
    if (!user?.uid) return;
    await togglePinConversation(user.uid, convId, currentPinned);
    setConversations((prev) => {
      const updated = prev.map((c) => (c.id === convId ? { ...c, isPinned: !currentPinned } : c));
      return updated.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
    });
  };

  const handleToggleArchive = async (convId: string, currentArchived: boolean) => {
    if (!user?.uid) return;
    await toggleArchiveConversation(user.uid, convId, currentArchived);
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, isArchived: !currentArchived } : c))
    );
  };

  // Stop Generation Handler
  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
  };

  // Web Search Toggle with explicit Turn OFF support
  const handleToggleWebSearch = (forceState?: boolean) => {
    const nextState = typeof forceState === 'boolean' ? forceState : !webSearchEnabled;
    if (nextState && !providerCapabilities.searchAvailable) {
      setError('Google Web Search grounding is temporarily on rate-limit cooldown. Standard Gemini reasoning is active.');
      return;
    }
    setWebSearchEnabled(nextState);
    if (!nextState) {
      // If turning OFF web search, and currently in search mode, switch to fast mode
      if (mode === 'search') {
        setMode('fast');
        setStreamStats((s) => ({ ...s, latencyMs: 2.5 }));
      }
    } else {
      if (provider === 'groq') {
        setProvider('gemini');
      }
    }
    setError(null);
  };

  // Mode Switch
  const handleSwitchMode = (newMode: ChatMode) => {
    if (newMode === mode) {
      // If tapping Search mode again when already in search mode, toggle it off!
      if (newMode === 'search') {
        handleToggleWebSearch(false);
      }
      return;
    }
    if (loading) handleStopGeneration();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
    }
    const nextProvider: AiProvider = (newMode === 'fast' || newMode === 'normal')
      ? (providerCapabilities.groq ? 'groq' : 'gemini')
      : 'gemini';
    setMode(newMode);
    setProvider(nextProvider);
    if (newMode === 'search') {
      setWebSearchEnabled(true);
    } else if (webSearchEnabled && (newMode === 'cat-code' || newMode === 'coding')) {
      // Turn off web search when entering coding mode for optimal deterministic code generation
      setWebSearchEnabled(false);
    }
    setStreamStats((s) => ({ ...s, latencyMs: newMode === 'fast' ? 2.5 : newMode === 'normal' ? 3.2 : 6.5 }));
    setError(null);

    // If no messages yet or only welcome, reset welcome message
    if (messages.length <= 1) {
      setMessages([getWelcomeMessage(newMode)]);
    }
  };

  // Voice Input Speech-To-Text Handler
  const handleToggleVoiceInput = () => {
    if (isListening) {
      stopSpeechRecognition();
      setIsListening(false);
    } else {
      const started = startSpeechRecognition(
        (transcript) => {
          setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
        },
        (err) => {
          setError(`Microphone: ${err}`);
          setIsListening(false);
        },
        () => {
          setIsListening(false);
        }
      );
      if (started) {
        setIsListening(true);
      } else {
        setError('Voice recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      }
    }
  };

  // Copy Message Content
  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  // Export Conversation
  const handleExport = (format: 'markdown' | 'json') => {
    const activeConv = conversations.find((c) => c.id === currentConversationId);
    const title = activeConv?.title || 'intelicatai-chat';
    const filename = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}.${format === 'markdown' ? 'md' : 'json'}`;

    let contentToDownload = '';
    if (format === 'markdown') {
      contentToDownload = `# ${title}\n*Exported from IntelicatAI on ${new Date().toLocaleString()}*\n\n---\n\n`;
      messages.forEach((m) => {
        const sender = m.role === 'user' ? '👤 User' : `🐾 IntelicatAI (${m.provider || 'AI'})`;
        contentToDownload += `### ${sender} - ${m.timestamp}\n\n${m.content}\n\n`;
        if (m.citations && m.citations.length > 0) {
          contentToDownload += `**Sources:**\n`;
          m.citations.forEach((c) => {
            contentToDownload += `- [${c.title}](${c.uri})\n`;
          });
          contentToDownload += `\n`;
        }
        contentToDownload += `---\n\n`;
      });
    } else {
      contentToDownload = JSON.stringify(
        {
          title,
          exportedAt: new Date().toISOString(),
          conversationId: currentConversationId,
          messages,
        },
        null,
        2
      );
    }

    const blob = new Blob([contentToDownload], { type: format === 'markdown' ? 'text/markdown' : 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportModal(false);
  };

  // Speech Synthesis
  const handleToggleSpeak = (messageId: string, text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (speakingMessageId === messageId) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }

    window.speechSynthesis.cancel();
    // Clean markdown symbols for cleaner speech
    const cleanText = text
      .replace(/```[\s\S]*?```/g, 'Code block omitted.')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/[#*_~]/g, '');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05;
    utterance.pitch = mode === 'cat-code' ? 1.15 : 1.0;
    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);

    setSpeakingMessageId(messageId);
    window.speechSynthesis.speak(utterance);
  };

  // Regenerate Response
  const handleRegenerate = () => {
    if (loading || messages.length === 0) return;
    setError(null);
    // Find last user message
    const lastUserIdx = [...messages].reverse().findIndex((m) => m.role === 'user');
    if (lastUserIdx === -1) return;

    const actualIdx = messages.length - 1 - lastUserIdx;
    const lastUserMsg = messages[actualIdx];

    // Remove everything after last user message
    const trimmed = messages.slice(0, actualIdx);
    setMessages(trimmed);

    handleSend(lastUserMsg.content, lastUserMsg.attachments, trimmed);
  };

  // Primary Send & Stream Handler
  const handleSend = async (
    textToSend?: string,
    existingAttachments?: ChatAttachment[],
    baseMessages?: ChatMessage[]
  ) => {
    const text = (textToSend !== undefined ? textToSend : input).trim();
    const currentAttachments = existingAttachments || attachments;

    if ((!text && currentAttachments.length === 0) || loading) return;

    // 1. Authentication Check
    if (!user) {
      openAuthModal('signin');
      setError('Please sign in to save your conversation history and access IntelicatAI.');
      return;
    }

    // 2. Strict Quota Enforcement (bypassed for owner and founder/vip accounts)
    if (isLimitReached && !isUnlimitedAccount && !isOwner) {
      setError(`Daily request limit reached (${maxRequests}/${maxRequests} used). Please upgrade to VIP or add your own free Groq API key in Settings to continue!`);
      if (onOpenBuyVip) onOpenBuyVip();
      return;
    }

    // Track usage in background without blocking
    if (user) {
      consumeRequest(true).catch(() => {});
    }

    // Stop speaking
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
    }

    // Prepare User Message
    const userMsgId = `user-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      conversationId: currentConversationId || undefined,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: new Date().toISOString(),
      mode,
      attachments: currentAttachments.length > 0 ? [...currentAttachments] : undefined,
    };

    // Prepare Assistant Placeholder
    const assistantMsgId = `assistant-${Date.now()}`;
    const assistantMsg: ChatMessage = {
      id: assistantMsgId,
      conversationId: currentConversationId || undefined,
      role: 'assistant',
      content: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: new Date().toISOString(),
      mode,
      provider,
    };

    // Clean history: remove empty/failed assistant placeholders so they don't break LLM context
    const sanitizedHistory = (baseMessages || messages).filter(
      (m) => m.content.trim() !== '' || (m.attachments && m.attachments.length > 0)
    );
    const updatedMessages = [...sanitizedHistory, userMsg];

    setMessages([...updatedMessages, assistantMsg]);
    setInput('');
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setLoading(true);
    setError(null);

    // 4. Manage Conversation Persistence (Auto-Title & Save)
    let activeConvId = currentConversationId;
    if (!activeConvId) {
      activeConvId = `conv-${Date.now()}`;
      setCurrentConversationId(activeConvId);

      const newTitle = generateAutomaticTitle(text || 'Image Analysis');
      const newConv: Conversation = {
        id: activeConvId,
        userId: user.uid,
        title: newTitle,
        mode,
        provider,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastMessagePreview: text.slice(0, 80),
      };

      await saveConversation(user.uid, newConv);
      setConversations((prev) => [newConv, ...prev]);
    }

    // Save user message to Firestore
    if (user?.uid && activeConvId) {
      saveMessage(user.uid, activeConvId, userMsg);
    }

    // 5. Connect SSE to /api/chat with Memory Context & Grounding
    const startTime = performance.now();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Load active memory context
    let memoryContext = '';
    if (user?.uid) {
      try {
        const mems = await loadUserMemories(user.uid);
        memoryContext = formatMemoriesForContext(mems);
      } catch (err) {
        console.warn('Memory load error:', err);
      }
    }

    // Load custom Groq key if set
    let customGroqKey = '';
    try {
      customGroqKey = localStorage.getItem('intelicat_custom_groq_key') || '';
    } catch {
      // Ignore
    }

    // Efficient context: up to 10 messages, with smart chunking for text documents to protect tokens
    const contextMessages = updatedMessages
      .filter((m) => m.content.trim() !== '' || (m.attachments && m.attachments.length > 0))
      .slice(-10)
      .map((m) => ({
        role: m.role,
        content: m.content,
        attachments: m.attachments?.map((a) => {
          const isImg = a.type.startsWith('image/');
          return {
            name: a.name,
            type: a.type,
            data: isImg ? a.data : extractRelevantChunks(a.data, text, 2500),
          };
        }),
      }));

    try {
      const requestPayload = {
        messages: contextMessages,
        mode,
        provider,
        model: selectedModel,
        webSearch: webSearchEnabled,
        userId: user.uid,
        isVipOrFounder: isUnlimitedAccount,
        customGroqKey: customGroqKey || undefined,
        userMemoryContext: memoryContext || undefined,
      };

      const token = user.getIdToken ? await user.getIdToken().catch(() => '') : '';
      const authHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        authHeaders['Authorization'] = `Bearer ${token}`;
      }

      let response = await fetch('/api/chat', {
        method: 'POST',
        headers: authHeaders,
        signal: abortController.signal,
        body: JSON.stringify(requestPayload),
      });

      // Auto-retry once on transient failure with safe auto failover
      if (!response.ok && !abortController.signal.aborted) {
        console.warn(`/api/chat initial attempt failed (${response.status}), running auto-recovery...`);
        await new Promise((r) => setTimeout(r, 800));
        response = await fetch('/api/chat', {
          method: 'POST',
          headers: authHeaders,
          signal: abortController.signal,
          body: JSON.stringify({ ...requestPayload, provider: 'auto', webSearch: false }),
        });
      }

      if (!response.ok) {
        let errMsg = `Server error (${response.status})`;
        try {
          const errorData = await response.json();
          if (errorData?.error) {
            errMsg = errorData.error;
          }
        } catch {
          const rawText = await response.text().catch(() => '');
          if (rawText) {
            const stripped = rawText.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
            if (stripped && stripped.length < 120 && !stripped.includes('<!DOCTYPE') && !stripped.includes('<html')) {
              errMsg = stripped;
            }
          }
        }
        throw new Error(errMsg);
      }

      if (!response.body) {
        throw new Error('ReadableStream is not supported by your browser.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let accumulatedContent = '';
      let buffer = '';
      let streamError: string | null = null;
      let streamProvider: AiProvider = provider;
      const gatheredCitations: CitationSource[] = [];

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

          let parsed: any;
          try {
            parsed = JSON.parse(dataStr);
          } catch {
            continue;
          }

          if (parsed.error) {
            streamError = parsed.error;
            break;
          }

          if (parsed.provider) {
            streamProvider = parsed.provider;
          }

          if (parsed.citations && Array.isArray(parsed.citations)) {
            parsed.citations.forEach((cit: CitationSource) => {
              if (!gatheredCitations.some((existing) => existing.uri === cit.uri)) {
                gatheredCitations.push(cit);
              }
            });
          }

          if (parsed.text) {
            accumulatedContent += parsed.text;
            const currentText = accumulatedContent;

            const words = currentText.split(/\s+/).length;
            setStreamStats({
              tokenCount: words * 2,
              latencyMs: Number(((performance.now() - startTime) / Math.max(1, words)).toFixed(1)),
            });

            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMsgId
                  ? {
                      ...msg,
                      content: currentText,
                      provider: streamProvider,
                      model: parsed.model || selectedModel,
                      citations: gatheredCitations.length > 0 ? [...gatheredCitations] : undefined,
                    }
                  : msg
              )
            );
          }
        }
        if (streamError) break;
      }

      if (streamError) {
        throw new Error(streamError);
      }

      // Save finalized assistant message to Firestore
      if (user?.uid && activeConvId && accumulatedContent) {
        const finalizedMsg: ChatMessage = {
          ...assistantMsg,
          content: accumulatedContent,
          provider: streamProvider,
          citations: gatheredCitations.length > 0 ? gatheredCitations : undefined,
        };
        await saveMessage(user.uid, activeConvId, finalizedMsg);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // User clicked "Stop Generation", gracefully finalize what was streamed so far
        console.log('Stream stopped by user.');
      } else {
        console.error('Chat error:', err);
        const errMsg = err.message || 'Unable to connect to AI engine.';
        // Mark the assistant message as errored with inline retry
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId && !msg.content.trim()
              ? { ...msg, isError: true, errorMessage: errMsg }
              : msg
          )
        );
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const activeConversation = conversations.find((c) => c.id === currentConversationId);

  const samplePrompts =
    mode === 'normal'
      ? [
          'Help me brainstorm creative marketing strategies for a launch',
          'Explain how transformer neural networks work with analogies',
          'Write a polished follow-up email after a design sprint',
          'What are high-impact cognitive habits for daily deep work?',
        ]
      : [
          'Write a production-ready TypeScript rate limiter with token bucket',
          'Debug why my React useEffect is causing infinite re-renders',
          'Design an async Python worker queue with graceful cancellation',
          'Write a high-performance SQL query to aggregate monthly active users',
        ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md">
        {/* Robot Background Grid */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
          <RobotBackground />
        </div>

        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => handleFileUpload(e.target.files)}
          multiple
          accept="image/*,text/*,.txt,.pdf,.docx,.pptx,.py,.js,.ts,.tsx,.json,.md,.html,.css,.csv"
          className="hidden"
        />

        {/* Main Modal Container: Fullscreen on mobile, rounded container on desktop */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 10 }}
          transition={{ duration: 0.2 }}
          className={`relative w-full ${isSplitView && latestArtifact ? 'max-w-[97vw] h-full sm:h-[95vh]' : 'max-w-6xl h-full sm:h-[90vh]'} bg-[#0c0c12] rounded-none sm:rounded-2xl border-0 sm:border border-white/10 shadow-2xl flex overflow-hidden text-neutral-100 transition-all duration-300`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Drag & Drop Visual Overlay */}
          {isDraggingOver && (
            <div className="absolute inset-0 z-50 bg-[#EF233C]/20 border-2 border-dashed border-[#EF233C] rounded-2xl flex flex-col items-center justify-center pointer-events-none backdrop-blur-xs">
              <Paperclip className="w-12 h-12 text-white animate-bounce mb-3" />
              <p className="text-white font-bold text-lg">Drop images or code files here to analyze</p>
            </div>
          )}

          {/* Conversations Sidebar */}
          <ConversationSidebar
            isOpen={isSidebarOpen}
            onCloseMobile={() => setIsSidebarOpen(false)}
            conversations={conversations}
            activeConversationId={currentConversationId}
            onSelectConversation={handleSelectConversation}
            onNewChat={handleNewChat}
            onRenameConversation={handleRenameConversation}
            onDeleteConversation={handleDeleteConversation}
            onTogglePin={handleTogglePin}
            onToggleArchive={handleToggleArchive}
          />

          {/* Chat Workspace (Right Panel) */}
          <div className="flex-1 flex flex-col min-w-0 bg-[#0c0c12] relative">
            {/* Top Bar Header: Mobile-Optimized 2-Row Stack */}
            <header className="p-2.5 sm:p-4 border-b border-white/10 bg-black/60 flex flex-col gap-2 shrink-0">
              {/* Row 1: Left Brand & Chat Title + Right Actions & Prominent Close Button */}
              <div className="flex items-center justify-between gap-2 w-full">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  {/* Sidebar Toggle Button */}
                  <button
                    onClick={() => setIsSidebarOpen((prev) => !prev)}
                    type="button"
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-neutral-200 hover:text-white border border-white/10 transition-colors cursor-pointer shrink-0 min-w-[38px] min-h-[38px] flex items-center justify-center"
                    title="Toggle Chat History"
                    aria-label="Toggle Chat History"
                  >
                    <Menu className="w-4 h-4" />
                  </button>

                  {/* Logo & Conversation Title */}
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-xl overflow-hidden bg-gradient-to-tr from-[#EF233C] to-red-600 p-0.5 shrink-0 shadow-md shadow-[#EF233C]/20">
                      <img
                        src={INTELLICAT_LOGO_URL}
                        alt="IntelicatAI Logo"
                        className="w-full h-full object-cover rounded-[10px]"
                      />
                    </div>
                    <div className="min-w-0">
                      <h1 className="font-bold text-xs sm:text-sm text-white truncate max-w-[130px] xs:max-w-[180px] sm:max-w-xs">
                        {activeConversation?.title || 'IntelicatAI Workspace'}
                      </h1>
                      <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] text-neutral-400">
                        <span className="flex items-center gap-1 text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Online
                        </span>
                        <span>•</span>
                        <button
                          onClick={() => setShowEngineModal(true)}
                          type="button"
                          className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-white font-medium text-[10px] transition-all cursor-pointer group shadow-sm active:scale-95"
                          title="Click to switch AI Model (Gemini 3.8 Flash, LLaMA 3.3 70B, etc.)"
                        >
                          <Cpu className="w-3 h-3 text-[#EF233C]" />
                          <span className="truncate max-w-[95px] xs:max-w-[130px] font-semibold">{activeModelObj.name}</span>
                          {activeModelObj.badge && (
                            <span className="hidden sm:inline px-1 py-0.2 rounded bg-white/10 text-[9px] text-amber-300 font-mono">
                              {activeModelObj.badge}
                            </span>
                          )}
                          <ChevronDown className="w-2.5 h-2.5 text-neutral-400 group-hover:text-white transition-colors" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Top Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Built Website Artifact Quick Toggle / Jump */}
                  {latestArtifact && (
                    <button
                      onClick={() => {
                        if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
                          setIsSplitView((prev) => !prev);
                        } else {
                          const artifactEl = document.querySelector('[data-artifact="true"]');
                          if (artifactEl) {
                            artifactEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }
                        }
                      }}
                      type="button"
                      className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer border ${
                        isSplitView
                          ? 'bg-[#EF233C] text-white border-[#EF233C] ring-2 ring-[#EF233C]/40 shadow-[#EF233C]/30'
                          : 'bg-[#EF233C]/20 hover:bg-[#EF233C]/35 text-[#EF233C] border-[#EF233C]/50'
                      }`}
                      title={isSplitView ? 'Close Split View' : 'View Built Website Live Preview'}
                    >
                      <Cat className="w-3.5 h-3.5 animate-pulse" />
                      <span className="hidden xs:inline">{isSplitView ? 'Close Split' : 'Live Website'}</span>
                      <span className="xs:hidden">Website</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    </button>
                  )}

                  {/* Quota / VIP Pill */}
                  {isUnlimitedAccount ? (
                    <div className="hidden xs:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-bold shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                      <Crown className="w-3.5 h-3.5 text-amber-400" />
                      <span>{isOwner || isFounderActive ? '👑 FOUNDER' : '⭐ VIP'}</span>
                    </div>
                  ) : (
                    <button
                      onClick={onOpenBuyVip}
                      type="button"
                      className="hidden xs:flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white text-[11px] transition-colors cursor-pointer"
                      title="Click to upgrade for unlimited queries"
                    >
                      <Zap className="w-3 h-3 text-[#EF233C]" />
                      <span>{remainingRequests}/{maxRequests}</span>
                    </button>
                  )}

                  {/* Export Chat Button */}
                  <button
                    onClick={() => setShowExportModal((prev) => !prev)}
                    type="button"
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white border border-white/10 transition-colors cursor-pointer min-w-[38px] min-h-[38px] flex items-center justify-center"
                    title="Export Chat"
                    aria-label="Export Chat"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  {/* Close Modal Button - Big touch target & high visibility on mobile */}
                  <button
                    onClick={onClose}
                    type="button"
                    className="p-2 rounded-xl bg-white/10 hover:bg-red-500/30 text-neutral-200 hover:text-white border border-white/20 hover:border-red-500/50 transition-all cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center font-bold shadow-md active:scale-95"
                    title="Close Assistant"
                    aria-label="Close Assistant"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>

              {/* Row 2: Mode Selector Pill Suite with smooth mobile horizontal scroll */}
              <div className="flex items-center gap-1.5 overflow-x-auto max-w-full scrollbar-none touch-pan-x py-0.5">
                <button
                  onClick={() => handleSwitchMode('fast')}
                  type="button"
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap min-h-[32px] ${
                    mode === 'fast'
                      ? 'bg-amber-400 text-black font-semibold shadow-md shadow-amber-400/30'
                      : 'text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10'
                  }`}
                  title="Ultra-low latency Fast Mode"
                >
                  <Zap className="w-3 h-3 text-amber-400" />
                  <span>Fast</span>
                </button>
                <button
                  onClick={() => handleSwitchMode('deep-think')}
                  type="button"
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap min-h-[32px] ${
                    mode === 'deep-think'
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                      : 'text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10'
                  }`}
                  title="Reasoning and step-by-step thinking"
                >
                  <Brain className="w-3 h-3 text-purple-400" />
                  <span>Deep Think</span>
                </button>
                <button
                  onClick={() => {
                    if (webSearchEnabled || mode === 'search') {
                      handleToggleWebSearch(false);
                    } else {
                      handleSwitchMode('search');
                    }
                  }}
                  type="button"
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap min-h-[32px] ${
                    webSearchEnabled || mode === 'search'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 border border-blue-400'
                      : 'text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10'
                  }`}
                  title={webSearchEnabled || mode === 'search' ? 'Web Search ON - Click to turn OFF' : 'Click to enable Web Search'}
                >
                  <Search className="w-3 h-3 text-blue-300" />
                  <span>Search {webSearchEnabled ? '✓ ON' : ''}</span>
                </button>
                <button
                  onClick={() => handleSwitchMode('cat-code')}
                  type="button"
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap min-h-[32px] ${
                    mode === 'cat-code' || mode === 'coding'
                      ? 'bg-[#EF233C] text-white shadow-md shadow-[#EF233C]/30'
                      : 'text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10'
                  }`}
                  title="Cyber Cat Code - Software Engineering"
                >
                  <Cat className="w-3 h-3 text-[#EF233C]" />
                  <span>Code 🐾</span>
                </button>
                <button
                  onClick={() => handleSwitchMode('study')}
                  type="button"
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap min-h-[32px] ${
                    mode === 'study'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                      : 'text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10'
                  }`}
                  title="Study, homework, and tutoring mode"
                >
                  <GraduationCap className="w-3 h-3 text-emerald-400" />
                  <span>Study</span>
                </button>
                <button
                  onClick={() => handleSwitchMode('creative')}
                  type="button"
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap min-h-[32px] ${
                    mode === 'creative'
                      ? 'bg-pink-600 text-white shadow-md shadow-pink-600/30'
                      : 'text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10'
                  }`}
                  title="Creative writing & story generation"
                >
                  <Palette className="w-3 h-3 text-pink-400" />
                  <span>Creative</span>
                </button>
              </div>
            </header>

            {/* Export Modal Dropdown */}
            {showExportModal && (
              <div className="absolute right-12 top-16 z-50 w-52 bg-[#12121c] rounded-xl border border-white/15 shadow-2xl p-2 space-y-1">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  Export Conversation
                </div>
                <button
                  onClick={() => handleExport('markdown')}
                  type="button"
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-neutral-200 hover:bg-white/10 hover:text-white transition-colors cursor-pointer text-left"
                >
                  <FileText className="w-3.5 h-3.5 text-[#EF233C]" />
                  <span>Download Markdown (.md)</span>
                </button>
                <button
                  onClick={() => handleExport('json')}
                  type="button"
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-neutral-200 hover:bg-white/10 hover:text-white transition-colors cursor-pointer text-left"
                >
                  <Code className="w-3.5 h-3.5 text-amber-400" />
                  <span>Download JSON (.json)</span>
                </button>
              </div>
            )}

            {/* AI Model & Inference Engine Selector Modal */}
            {showEngineModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md">
                <div className="w-full max-w-xl max-h-[90vh] bg-[#12121e] border border-white/20 rounded-2xl p-4 sm:p-6 shadow-2xl flex flex-col space-y-4 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-[#EF233C]/20 border border-[#EF233C]/40 text-[#EF233C]">
                        <Cpu className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm sm:text-base text-white">Select AI Model</h3>
                        <p className="text-[11px] text-neutral-400">Choose from 7 dedicated reasoning & high-speed inference models</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowEngineModal(false)}
                      type="button"
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Filter Tabs */}
                  <div className="flex items-center gap-1.5 shrink-0 border-b border-white/10 pb-2 overflow-x-auto scrollbar-none">
                    <button
                      type="button"
                      onClick={() => setModelCategoryFilter('all')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                        modelCategoryFilter === 'all'
                          ? 'bg-white text-black shadow-md'
                          : 'text-neutral-400 hover:text-white bg-white/5'
                      }`}
                    >
                      All Models ({AVAILABLE_AI_MODELS.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setModelCategoryFilter('gemini')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                        modelCategoryFilter === 'gemini'
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                          : 'text-neutral-400 hover:text-white bg-white/5'
                      }`}
                    >
                      <span>Google Gemini</span>
                      <span className="text-[10px] opacity-80">(3)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setModelCategoryFilter('groq')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                        modelCategoryFilter === 'groq'
                          ? 'bg-amber-500 text-black shadow-md shadow-amber-500/30'
                          : 'text-neutral-400 hover:text-white bg-white/5'
                      }`}
                    >
                      <span>Groq LPUs ⚡</span>
                      <span className="text-[10px] opacity-80">(4)</span>
                    </button>
                  </div>

                  {/* Model Cards List */}
                  <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin">
                    {filteredModels.map((m) => {
                      const isSelected = selectedModel === m.id;

                      return (
                        <div
                          key={m.id}
                          onClick={() => handleSelectModel(m.id)}
                          className={`p-3.5 rounded-xl border transition-all cursor-pointer group ${
                            isSelected
                              ? 'bg-gradient-to-r from-red-600/15 via-[#EF233C]/10 to-transparent border-[#EF233C]/60 ring-1 ring-[#EF233C]/40 shadow-lg'
                              : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.07] hover:border-white/20'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="font-bold text-xs sm:text-sm text-white group-hover:text-white">
                                  {m.name}
                                </span>
                                {m.badge && (
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                                      m.badge.includes('800')
                                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                        : m.badge === 'Recommended'
                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                        : 'bg-white/10 text-neutral-300 border border-white/15'
                                    }`}
                                  >
                                    {m.badge}
                                  </span>
                                )}
                                {m.speed && (
                                  <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] font-mono text-neutral-400">
                                    {m.speed}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-neutral-300 leading-relaxed mb-2">
                                {m.description}
                              </p>
                              {/* Capabilities tags */}
                              <div className="flex flex-wrap gap-1.5">
                                {m.capabilities.map((cap) => (
                                  <span
                                    key={cap}
                                    className="px-1.5 py-0.5 rounded bg-black/40 border border-white/10 text-[9px] text-neutral-400 font-medium"
                                  >
                                    {cap}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div className="shrink-0 flex items-center justify-center pt-1">
                              {isSelected ? (
                                <div className="w-6 h-6 rounded-full bg-[#EF233C] text-white flex items-center justify-center shadow-md shadow-[#EF233C]/40">
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                </div>
                              ) : (
                                <div className="w-6 h-6 rounded-full border border-white/20 group-hover:border-white/40" />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Footer note */}
                  <div className="pt-2 border-t border-white/10 flex items-center justify-between shrink-0 text-xs">
                    <span className="text-[11px] text-neutral-400">
                      Active Model: <strong className="text-white">{activeModelObj.name}</strong>
                    </span>
                    <button
                      onClick={() => setShowEngineModal(false)}
                      type="button"
                      className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Error Banner */}
            {error && (
              <div className="px-4 py-2.5 bg-red-950/90 border-b border-red-500/30 flex items-center justify-between text-xs text-red-200 backdrop-blur-md">
                <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 animate-ping" />
                  <span className="truncate sm:whitespace-normal font-medium">{error}</span>
                </div>
                <div className="flex items-center gap-2 ml-2 shrink-0">
                  {onOpenBuyVip && (error.includes('limit') || error.includes('quota') || error.includes('authorized')) && (
                    <button
                      onClick={onOpenBuyVip}
                      type="button"
                      className="px-2.5 py-1 rounded-md bg-amber-500 hover:bg-amber-400 text-black font-bold text-[11px] transition-all flex items-center gap-1 shadow-sm cursor-pointer"
                    >
                      <Crown className="w-3 h-3" />
                      <span>Unlock Unlimited VIP</span>
                    </button>
                  )}
                  {messages.some((m) => m.role === 'user') && (
                    <button
                      onClick={handleRegenerate}
                      disabled={loading}
                      type="button"
                      className="px-2.5 py-1 rounded-md bg-red-800/80 hover:bg-red-700 text-white font-medium text-[11px] transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      title="Retry message"
                    >
                      <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                      <span>Retry</span>
                    </button>
                  )}
                  <button
                    onClick={() => setError(null)}
                    type="button"
                    className="text-red-300 hover:text-white p-1 cursor-pointer"
                    title="Dismiss"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Center Area: Chat Column + Optional Built Website Artifact Split Panel */}
            <div className="flex-1 flex overflow-hidden min-h-0 relative">
              {/* Chat Column */}
              <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                {/* Messages Scroll Area */}
                <div
                  ref={chatContainerRef}
              className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-5 selection:bg-[#EF233C] selection:text-white"
            >
              {messages.map((msg, index) => {
                const isUser = msg.role === 'user';
                const isLastAssistant = !isUser && index === messages.length - 1;

                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 sm:gap-4 max-w-4xl mx-auto ${
                      isUser ? 'flex-row-reverse' : 'flex-row'
                    }`}
                  >
                    {/* Avatar */}
                    <div
                      className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 border shadow-md ${
                        isUser
                          ? 'bg-neutral-800 border-white/20 text-neutral-200'
                          : msg.mode === 'cat-code'
                          ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                          : 'bg-[#EF233C]/20 border-[#EF233C]/40 text-[#EF233C]'
                      }`}
                    >
                      {isUser ? (
                        <User className="w-4 h-4" />
                      ) : msg.mode === 'cat-code' ? (
                        <Cat className="w-5 h-5" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                    </div>

                    {/* Message Bubble & Metadata */}
                    <div className={`flex-1 min-w-0 ${isUser ? 'items-end' : 'items-start'}`}>
                      {/* Top Bubble Header */}
                      <div
                        className={`flex items-center gap-2 mb-1.5 text-[11px] text-neutral-400 ${
                          isUser ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <span className="font-semibold text-neutral-300">
                          {isUser ? 'You' : msg.mode === 'cat-code' ? 'IntelicatAI (Cat Code)' : 'IntelicatAI'}
                        </span>
                        <span>•</span>
                        <span>{msg.timestamp}</span>
                        {!isUser && (msg.model || msg.provider) && (
                          <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] uppercase font-mono text-neutral-300">
                            {msg.model || msg.provider}
                          </span>
                        )}
                      </div>

                      {/* Attachments preview if user uploaded files */}
                      {isUser && msg.attachments && msg.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2 justify-end">
                          {msg.attachments.map((att) => (
                            <div
                              key={att.id}
                              className="rounded-xl overflow-hidden border border-white/15 bg-black/40 p-1 max-w-[200px]"
                            >
                              {att.type.startsWith('image/') ? (
                                <img
                                  src={att.data}
                                  alt={att.name}
                                  className="w-36 h-28 object-cover rounded-lg"
                                />
                              ) : (
                                <div className="flex items-center gap-2 p-2 text-xs text-neutral-200">
                                  <FileText className="w-4 h-4 text-[#EF233C]" />
                                  <span className="truncate">{att.name}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Bubble Content Body */}
                      <div
                        className={`p-3.5 sm:p-4 rounded-2xl text-xs sm:text-sm leading-relaxed border shadow-lg ${
                          isUser
                            ? 'bg-[#EF233C]/20 border-[#EF233C]/40 text-white ml-auto rounded-tr-xs max-w-2xl'
                            : 'bg-white/[0.04] border-white/10 text-neutral-200 rounded-tl-xs backdrop-blur-xs'
                        }`}
                      >
                        {isUser ? (
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        ) : msg.content ? (
                          <MarkdownRenderer
                            content={msg.content}
                            isCatCode={msg.mode === 'cat-code' || mode === 'cat-code'}
                          />
                        ) : msg.isError || (!loading && index === messages.length - 1) ? (
                          <div className="flex flex-col gap-2.5 py-1 text-red-300">
                            <div className="flex items-center gap-2 text-xs">
                              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                              <span>{msg.errorMessage || 'The AI engine encountered an unexpected delay.'}</span>
                            </div>
                            <button
                              onClick={handleRegenerate}
                              disabled={loading}
                              type="button"
                              className="self-start px-3 py-1.5 rounded-lg bg-red-900/60 hover:bg-red-800 border border-red-500/40 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                              <span>Retry Response</span>
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-neutral-400 py-1">
                            <span className="w-2 h-2 rounded-full bg-[#EF233C] animate-ping" />
                            <span className="text-xs font-mono">
                              Intelicat is synthesizing response...
                            </span>
                          </div>
                        )}

                        {/* Search Grounding Citations */}
                        {!isUser && msg.citations && msg.citations.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-white/10 space-y-1.5">
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-neutral-300">
                              <Globe className="w-3.5 h-3.5 text-blue-400" />
                              <span>Verified Web Sources:</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {msg.citations.map((cit, cIdx) => (
                                <a
                                  key={cIdx}
                                  href={cit.uri}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 hover:bg-white/15 border border-white/10 text-[10px] text-blue-300 hover:text-white transition-colors"
                                >
                                  <span className="truncate max-w-[160px]">{cit.title}</span>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Action Bar for Assistant Messages (Listen, Copy, Regenerate) */}
                      {!isUser && msg.content && (
                        <div className="flex items-center gap-2 mt-2 text-neutral-400 text-xs">
                          {/* Copy */}
                          <button
                            onClick={() => handleCopyMessage(msg.id, msg.content)}
                            type="button"
                            className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white/10 hover:text-white transition-colors cursor-pointer text-[11px]"
                            title="Copy message"
                          >
                            {copiedMessageId === msg.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400 font-semibold">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>

                          {/* Listen (TTS) */}
                          <button
                            onClick={() => handleToggleSpeak(msg.id, msg.content)}
                            type="button"
                            className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white/10 hover:text-white transition-colors cursor-pointer text-[11px]"
                            title="Read aloud"
                          >
                            {speakingMessageId === msg.id ? (
                              <>
                                <VolumeX className="w-3 h-3 text-[#EF233C]" />
                                <span className="text-[#EF233C]">Stop audio</span>
                              </>
                            ) : (
                              <>
                                <Volume2 className="w-3 h-3" />
                                <span>Listen</span>
                              </>
                            )}
                          </button>

                          {/* Regenerate (only on last assistant message) */}
                          {isLastAssistant && !loading && (
                            <button
                              onClick={handleRegenerate}
                              type="button"
                              className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white/10 hover:text-white transition-colors cursor-pointer text-[11px]"
                              title="Regenerate response"
                            >
                              <RefreshCw className="w-3 h-3" />
                              <span>Regenerate</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Sample Prompts Suggestion Pills (if only welcome message exists) */}
              {messages.length <= 1 && (
                <div className="max-w-3xl mx-auto pt-6 pb-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3 text-center">
                    Suggested Prompts to Explore
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {samplePrompts.map((prompt, pIdx) => (
                      <button
                        key={pIdx}
                        onClick={() => handleSend(prompt)}
                        type="button"
                        className="text-left p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-neutral-300 hover:text-white text-xs leading-relaxed transition-all cursor-pointer flex items-center justify-between group"
                      >
                        <span className="truncate pr-2">{prompt}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-neutral-500 group-hover:text-[#EF233C] shrink-0 transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div ref={chatBottomRef} />
            </div>

            {/* Bottom Composer & Controls */}
            <div className="p-2 sm:p-4 border-t border-white/10 bg-black/50 shrink-0">
              <div className="max-w-4xl mx-auto space-y-2">
                {/* Active Attachments Preview Bar */}
                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-2 bg-white/5 rounded-xl border border-white/10">
                    {attachments.map((att) => (
                      <div
                        key={att.id}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-black/60 border border-white/15 text-xs text-neutral-200"
                      >
                        {att.type.startsWith('image/') ? (
                          <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                        ) : (
                          <FileText className="w-3.5 h-3.5 text-[#EF233C]" />
                        )}
                        <span className="truncate max-w-[120px] font-mono text-[11px]">{att.name}</span>
                        <button
                          onClick={() => removeAttachment(att.id)}
                          type="button"
                          className="text-neutral-400 hover:text-red-400 cursor-pointer p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Active Web Search Banner with 1-Click Turn Off Button */}
                {webSearchEnabled && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-blue-950/70 border border-blue-500/40 text-blue-200 text-xs shadow-md backdrop-blur-sm"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="relative flex h-2 w-2 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-400"></span>
                      </span>
                      <Globe className="w-4 h-4 text-blue-400 shrink-0" />
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-bold text-white text-xs">Web Search Active</span>
                        <span className="text-[10px] text-blue-300/80 hidden sm:inline truncate">
                          • Real-time Google search grounding enabled
                        </span>
                      </div>
                    </div>

                    {/* Turn OFF button explicitly requested by user */}
                    <button
                      onClick={() => handleToggleWebSearch(false)}
                      type="button"
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/35 border border-red-500/50 text-red-200 hover:text-white text-xs font-semibold transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
                      title="Turn off Web Search"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Turn Off Search</span>
                    </button>
                  </motion.div>
                )}

                {/* Input Controls Container - Optimized to be much longer & full-width on mobile */}
                <div className="relative flex flex-col bg-[#12121a] rounded-2xl border border-white/15 p-2 sm:p-2.5 focus-within:border-[#EF233C]/60 focus-within:ring-1 focus-within:ring-[#EF233C]/30 transition-all shadow-xl">
                  {/* Asking Field: Full width, significantly longer on mobile (min-h 74px) with multi-row space */}
                  <div className="w-full relative">
                    <textarea
                      ref={textareaRef}
                      rows={2}
                      value={input}
                      onChange={handleInputChange}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      placeholder={
                        mode === 'cat-code'
                          ? 'Ask cat coder for code, debug errors, or generate architecture...'
                          : mode === 'study'
                          ? 'Ask your study question or math/science problem...'
                          : webSearchEnabled
                          ? 'Search the live web or ask a detailed question...'
                          : 'Ask anything, brainstorm, or type your question...'
                      }
                      className="w-full min-h-[74px] sm:min-h-[48px] max-h-56 py-2 px-2.5 bg-transparent text-neutral-100 placeholder:text-neutral-500 text-base sm:text-sm focus:outline-none resize-none leading-relaxed block"
                    />
                  </div>

                  {/* Action Controls & Send Toolbar (neatly positioned below textarea so input has maximum width) */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/10 mt-1 gap-2">
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-wrap">
                      {/* Attach File Button */}
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        type="button"
                        disabled={loading}
                        className="h-8 sm:h-9 px-2 sm:px-2.5 rounded-lg flex items-center gap-1.5 text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0 disabled:opacity-40 text-xs font-medium"
                        title="Upload image or code/text file"
                      >
                        <Paperclip className="w-4 h-4 text-neutral-400" />
                        <span className="hidden xs:inline text-[11px]">Attach</span>
                      </button>

                      {/* Web Search Toggle Button */}
                      <button
                        onClick={() => handleToggleWebSearch()}
                        type="button"
                        className={`h-8 sm:h-9 px-2 sm:px-2.5 rounded-lg transition-all cursor-pointer shrink-0 flex items-center gap-1.5 text-xs font-semibold ${
                          !providerCapabilities.searchAvailable
                            ? 'opacity-40 text-neutral-500 bg-white/5'
                            : webSearchEnabled
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/40 border border-blue-400'
                            : 'text-neutral-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5'
                        }`}
                        title={
                          !providerCapabilities.searchAvailable
                            ? 'Search grounding temporarily on rate-limit cooldown.'
                            : webSearchEnabled
                            ? 'Web Search is ON - Click to turn OFF'
                            : 'Web Search is OFF - Click to turn ON'
                        }
                      >
                        <Globe className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${webSearchEnabled ? 'text-white' : 'text-neutral-400'}`} />
                        <span className="text-[11px] whitespace-nowrap">
                          {webSearchEnabled ? 'Search ON' : 'Web Search'}
                        </span>
                      </button>

                      {/* Voice Dictation (Speech-to-Text) Button */}
                      <button
                        onClick={handleToggleVoiceInput}
                        type="button"
                        disabled={loading}
                        className={`h-8 sm:h-9 px-2 sm:px-2.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shrink-0 text-xs ${
                          isListening
                            ? 'bg-red-500 text-white animate-pulse shadow-md shadow-red-500/50'
                            : 'text-neutral-400 hover:text-white hover:bg-white/10'
                        }`}
                        title={isListening ? 'Listening... click to stop' : 'Voice dictation (Speech to text)'}
                      >
                        {isListening ? (
                          <>
                            <MicOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            <span className="text-[11px] font-semibold text-white animate-pulse">Listening...</span>
                          </>
                        ) : (
                          <>
                            <Mic className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            <span className="hidden xs:inline text-[11px]">Voice</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Send / Stop Generation Button */}
                    <div className="flex items-center gap-2 shrink-0">
                      {loading ? (
                        <button
                          onClick={handleStopGeneration}
                          type="button"
                          className="h-8 sm:h-9 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-red-600/30"
                          title="Stop generating"
                        >
                          <Square className="w-3.5 h-3.5 fill-white" />
                          <span>Stop</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSend()}
                          disabled={!input.trim() && attachments.length === 0}
                          type="button"
                          className="h-8 sm:h-9 px-3.5 sm:px-4 rounded-xl bg-[#EF233C] hover:bg-red-600 disabled:opacity-40 disabled:hover:bg-[#EF233C] text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-[#EF233C]/30 active:scale-95"
                          title="Send message (Enter)"
                        >
                          <span>Send</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Sub-bar Indicators */}
                <div className="flex items-center justify-between text-[10px] text-neutral-400 px-1 pt-1">
                  <div className="flex items-center gap-2">
                    {webSearchEnabled && (
                      <span className="flex items-center gap-1 text-blue-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                        Web Grounding On
                      </span>
                    )}
                    <span>Shift + Enter for new line</span>
                  </div>

                  <div className="flex items-center gap-2 font-mono text-[9px]">
                    <span>{streamStats.tokenCount} tokens</span>
                    <span>•</span>
                    <span>~{streamStats.latencyMs}ms/t</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Side-by-Side Live Built Website Artifact (Split View on Desktop) */}
          {isSplitView && latestArtifact && (
            <div className="hidden lg:flex w-1/2 flex-col border-l border-white/10 bg-[#07070e] p-3 overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between px-1 pb-2 mb-2 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#EF233C]/20 border border-[#EF233C]/40 text-[#EF233C] text-xs font-bold shadow-sm">
                    <Cat className="w-3.5 h-3.5 animate-pulse" />
                    <span>Cat Code Live Website</span>
                  </div>
                  <span className="text-[11px] text-neutral-400">Interactive Built Website Sandbox</span>
                </div>
                <button
                  onClick={() => setIsSplitView(false)}
                  type="button"
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                  title="Close Split Screen"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <ArtifactRunner
                  language={latestArtifact.language}
                  code={latestArtifact.code}
                  isCatCode={latestArtifact.isCatCode}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
      </div>
    </AnimatePresence>
  );
};
