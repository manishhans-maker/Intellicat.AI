import React, { useState, useEffect, useRef } from 'react';
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
} from 'lucide-react';
import { RobotBackground } from './RobotBackground';
import { INTELLICAT_LOGO_URL } from '../constants';
import { useAuth } from '../context/AuthContext';
import { ChatMessage, ChatMode, AiProvider, ChatAttachment, CitationSource, Conversation } from '../types';
export type { ChatMode, AiProvider };
import { MarkdownRenderer } from './MarkdownRenderer';
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
    consumeRequest,
  } = useAuth();

  const isUnlimitedAccount = isFounder || isVipMember || userProfile?.tier === 'vip' || userProfile?.tier === 'founder';

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

  // Messages & Input
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showEngineModal, setShowEngineModal] = useState(false);

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

  const getWelcomeMessage = (selectedMode: ChatMode = 'normal'): ChatMessage => {
    if (selectedMode === 'normal') {
      return {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: `Hello! I'm your AI conversational companion in **Normal Talk Mode** powered by **Groq LPU (Llama 3.3 70B)** ⚡ and **Google Gemini** ✨.\n\nAsk me anything — brainstorm ideas, summarize content, search real-time web facts, upload images/documents for analysis, or just talk. What's on your mind?`,
        timestamp: 'Just now',
        createdAt: new Date().toISOString(),
        mode: 'normal',
        provider: 'groq',
      };
    } else {
      return {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: `Purr-fect timing! 🐾 I am **IntelicatAI**, your Cybernetic Cat Coder in **Cat Code Mode** powered by **Google Gemini 3.8 Flash** ✨.\n\nI catch bugs faster than mice and engineer pristine, production-grade code across TypeScript, Python, Rust, Go, SQL, React, and Systems Architecture. You can paste snippets or upload full files and screenshots for instant analysis! What are we hacking on today?`,
        timestamp: 'Just now',
        createdAt: new Date().toISOString(),
        mode: 'cat-code',
        provider: 'gemini',
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
          if (userConvs.length > 0 && !currentConversationId) {
            // Load most recent conversation
            const mostRecent = userConvs[0];
            setCurrentConversationId(mostRecent.id);
            setMode(mostRecent.mode);
            setProvider(mostRecent.provider || (mostRecent.mode === 'cat-code' ? 'gemini' : 'gemini'));
            const msgs = await loadConversationMessages(user.uid, mostRecent.id);
            if (isMounted) {
              setMessages(msgs.length > 0 ? msgs : [getWelcomeMessage(mostRecent.mode)]);
            }
          } else if (!currentConversationId) {
            // Fresh conversation
            setMessages([getWelcomeMessage(mode)]);
          }
        }
      } else {
        // Guest / Not logged in
        if (messages.length === 0) {
          setMessages([getWelcomeMessage(mode)]);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, user?.uid]);

  // Sync mode changes when defaultMode prop changes
  useEffect(() => {
    if (isOpen && !currentConversationId) {
      const targetMode: ChatMode = defaultMode === 'cat-code' ? 'cat-code' : 'normal';
      setMode(targetMode);
      setProvider(targetMode === 'normal' && providerCapabilities.groq ? 'groq' : 'gemini');
      setStreamStats((s) => ({ ...s, latencyMs: targetMode === 'normal' ? 3.2 : 6.5 }));
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
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  };

  // File Upload Handlers
  const handleFileUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    if (attachments.length + files.length > 4) {
      setError('You can attach a maximum of 4 files per message.');
      return;
    }

    Array.from(files).forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        setError(`File "${file.name}" exceeds the 5MB size limit.`);
        return;
      }

      const reader = new FileReader();
      const isImage = file.type.startsWith('image/');

      if (isImage) {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }

      reader.onload = () => {
        const rawData = reader.result as string;
        const newAttachment: ChatAttachment = {
          id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: file.name,
          type: file.type || 'text/plain',
          size: file.size,
          data: rawData,
        };

        setAttachments((prev) => [...prev, newAttachment]);
        // If image attached, auto-switch to Gemini for multimodal vision
        if (isImage) {
          setProvider('gemini');
        }
      };

      reader.onerror = () => {
        setError(`Failed to read file ${file.name}`);
      };
    });
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
    setProvider(nextMode === 'normal' && providerCapabilities.groq ? 'groq' : 'gemini');
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

  // Mode Switch
  const handleSwitchMode = (newMode: ChatMode) => {
    if (newMode === mode) return;
    if (loading) handleStopGeneration();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
    }
    const nextProvider: AiProvider = newMode === 'normal'
      ? (providerCapabilities.groq ? 'groq' : 'gemini')
      : 'gemini';
    setMode(newMode);
    setProvider(nextProvider);
    setStreamStats((s) => ({ ...s, latencyMs: newMode === 'normal' ? 3.2 : 6.5 }));
    setError(null);

    // If no messages yet, reset welcome message
    if (messages.length <= 1) {
      setMessages([getWelcomeMessage(newMode)]);
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

    // 2. Quota Check
    if (!isUnlimitedAccount && isLimitReached) {
      setError(`Free limit reached (${maxRequests} queries used). Upgrade to VIP for unlimited access!`);
      return;
    }

    // 3. Consume Quota
    const allowed = await consumeRequest();
    if (!allowed) {
      setError('Request could not be authorized. Please check your account quota.');
      return;
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

    // Keep memory of recent context (up to 12 valid messages)
    const contextMessages = updatedMessages
      .filter((m) => m.content.trim() !== '' || (m.attachments && m.attachments.length > 0))
      .slice(-12)
      .map((m) => ({
        role: m.role,
        content: m.content,
        attachments: m.attachments?.map((a) => ({
          name: a.name,
          type: a.type,
          data: a.data,
        })),
      }));

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: user.getIdToken ? `Bearer ${await user.getIdToken().catch(() => '')}` : '',
        },
        signal: abortController.signal,
        body: JSON.stringify({
          messages: contextMessages,
          mode,
          provider,
          webSearch: webSearchEnabled,
          userId: user.uid,
          isVipOrFounder: isUnlimitedAccount,
        }),
      });

      if (!response.ok) {
        let errMsg = `Server error: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData?.error) {
            errMsg = errorData.error;
          }
        } catch {
          const rawText = await response.text().catch(() => '');
          if (rawText) {
            const stripped = rawText.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
            if (stripped && stripped.length < 150) {
              errMsg = stripped;
            }
          }
        }
        if (response.status === 500 || errMsg.includes('500')) {
          errMsg = 'The AI engine encountered a temporary upstream delay. Please click Retry to continue.';
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
        setError(errMsg);
        // Mark the assistant message as errored so it transitions to an inline retry card
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md">
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
          accept="image/*,text/*,.txt,.py,.js,.ts,.tsx,.json,.md,.html,.css"
          className="hidden"
        />

        {/* Main Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-6xl h-[94vh] sm:h-[90vh] bg-[#0c0c12] rounded-2xl border border-white/10 shadow-2xl flex overflow-hidden text-neutral-100"
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
            {/* Top Bar Header */}
            <header className="p-3 sm:p-4 border-b border-white/10 bg-black/40 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                {/* Sidebar Toggle Button */}
                <button
                  onClick={() => setIsSidebarOpen((prev) => !prev)}
                  type="button"
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white border border-white/10 transition-colors cursor-pointer shrink-0"
                  title="Toggle Chat History"
                >
                  <Menu className="w-4 h-4" />
                </button>

                {/* Logo & Conversation Title */}
                <div className="flex items-center gap-2 min-w-0">
                  <div className="relative w-8 h-8 rounded-xl overflow-hidden bg-gradient-to-tr from-[#EF233C] to-red-600 p-0.5 shrink-0 shadow-md shadow-[#EF233C]/20">
                    <img
                      src={INTELLICAT_LOGO_URL}
                      alt="IntelicatAI Logo"
                      className="w-full h-full object-cover rounded-[10px]"
                    />
                  </div>
                  <div className="min-w-0">
                    <h1 className="font-bold text-xs sm:text-sm text-white truncate flex items-center gap-1.5">
                      <span>{activeConversation?.title || 'IntelicatAI Workspace'}</span>
                    </h1>
                    <div className="flex items-center gap-2 text-[10px] text-neutral-400">
                      <span className="flex items-center gap-1 text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Online
                      </span>
                      <span>•</span>
                      <button
                        onClick={() => setShowEngineModal(true)}
                        type="button"
                        className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/15 border border-white/10 text-neutral-300 hover:text-white uppercase font-mono tracking-wider text-[9px] font-semibold transition-all cursor-pointer group"
                        title="Click to view AI Engine details or switch providers"
                      >
                        <span>{provider === 'groq' ? 'Groq LPU ⚡' : 'Gemini 3.8 ✨'}</span>
                        <ChevronDown className="w-2.5 h-2.5 text-neutral-400 group-hover:text-white transition-colors" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mode Toggle & Actions */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* Mode Selector Pill */}
                <div className="hidden sm:flex bg-black/60 p-1 rounded-xl border border-white/10">
                  <button
                    onClick={() => handleSwitchMode('normal')}
                    type="button"
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      mode === 'normal'
                        ? 'bg-[#EF233C] text-white shadow-md shadow-[#EF233C]/30'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Talk</span>
                  </button>
                  <button
                    onClick={() => handleSwitchMode('cat-code')}
                    type="button"
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      mode === 'cat-code'
                        ? 'bg-amber-500 text-black font-semibold shadow-md shadow-amber-500/30'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Cat className="w-3.5 h-3.5" />
                    <span>Cat Code</span>
                  </button>
                </div>

                {/* Quota / VIP Pill */}
                {isUnlimitedAccount ? (
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
                    <Crown className="w-3.5 h-3.5 text-amber-400" />
                    <span className="hidden md:inline">VIP Unlimited</span>
                  </div>
                ) : (
                  <button
                    onClick={onOpenBuyVip}
                    type="button"
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white text-xs transition-colors cursor-pointer"
                    title="Click to upgrade for unlimited queries"
                  >
                    <Zap className="w-3.5 h-3.5 text-[#EF233C]" />
                    <span>
                      {remainingRequests}/{maxRequests} Free
                    </span>
                  </button>
                )}

                {/* Export Chat Button */}
                <button
                  onClick={() => setShowExportModal((prev) => !prev)}
                  type="button"
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
                  title="Export Chat"
                >
                  <Download className="w-4 h-4" />
                </button>

                {/* Close Modal Button */}
                <button
                  onClick={onClose}
                  type="button"
                  className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-neutral-300 hover:text-red-400 border border-white/10 hover:border-red-500/30 transition-colors cursor-pointer"
                  title="Close Assistant"
                >
                  <X className="w-4 h-4" />
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

            {/* AI Engine Selector & Info Modal */}
            {showEngineModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                <div className="w-full max-w-md bg-[#13131f] border border-white/20 rounded-2xl p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-[#EF233C]/20 border border-[#EF233C]/40 text-[#EF233C]">
                        <Cpu className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-white">AI Inference Engines</h3>
                        <p className="text-[11px] text-neutral-400">Dual-Engine Architecture Overview</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowEngineModal(false)}
                      type="button"
                      className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    {/* Google Gemini Card */}
                    <div
                      onClick={() => {
                        setProvider('gemini');
                        setShowEngineModal(false);
                      }}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                        provider === 'gemini'
                          ? 'bg-blue-500/10 border-blue-500/50 ring-1 ring-blue-500/30'
                          : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-white">Google Gemini 3.8 / Flash</span>
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-medium">
                              Active
                            </span>
                          </div>
                          <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
                            Deep multimodal comprehension, image & document parsing, and real-time Google Search grounding.
                          </p>
                        </div>
                        {provider === 'gemini' && (
                          <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                        )}
                      </div>
                    </div>

                    {/* Groq LPU Card */}
                    <div
                      onClick={() => {
                        if (providerCapabilities.groq) {
                          setProvider('groq');
                          setShowEngineModal(false);
                        }
                      }}
                      className={`p-3.5 rounded-xl border transition-all ${
                        providerCapabilities.groq
                          ? provider === 'groq'
                            ? 'bg-amber-500/10 border-amber-500/50 ring-1 ring-amber-500/30 cursor-pointer'
                            : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06] cursor-pointer'
                          : 'bg-white/[0.02] border-white/5'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-white">Groq LPU (LLaMA 3.3 / 3.1)</span>
                            {providerCapabilities.groq ? (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-medium">
                                Ready ⚡
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono font-medium">
                                Key Required
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
                            Ultra-fast LPUs streaming up to 800 tokens/second for instant conversation turns.
                          </p>
                          {!providerCapabilities.groq && (
                            <div className="mt-2.5 p-2 rounded-lg bg-black/40 border border-amber-500/20 text-[11px] text-amber-200/90 leading-relaxed">
                              <p className="font-medium text-amber-300 mb-0.5">How to enable Groq:</p>
                              Add <code className="px-1 py-0.5 rounded bg-white/10 font-mono text-white">GROQ_API_KEY</code> to your environment variables or Vercel settings, then redeploy. In the meantime, Google Gemini is actively processing all queries without interruptions.
                            </div>
                          )}
                        </div>
                        {provider === 'groq' && providerCapabilities.groq && (
                          <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => setShowEngineModal(false)}
                      type="button"
                      className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Error Banner */}
            {error && (
              <div className="px-4 py-2 bg-red-950/80 border-b border-red-500/30 flex items-center justify-between text-xs text-red-200">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 animate-ping" />
                  <span>{error}</span>
                </div>
                <div className="flex items-center gap-2 ml-2 shrink-0">
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
                        {!isUser && msg.provider && (
                          <span className="px-1.5 py-0.2 rounded bg-white/5 border border-white/10 text-[9px] uppercase font-mono text-neutral-300">
                            {msg.provider}
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
                          <MarkdownRenderer content={msg.content} />
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
            <div className="p-3 sm:p-4 border-t border-white/10 bg-black/50 shrink-0">
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

                {/* Input Controls Container */}
                <div className="relative flex items-end gap-2 bg-[#12121a] rounded-2xl border border-white/15 p-2 focus-within:border-[#EF233C]/60 transition-colors shadow-xl">
                  {/* Attach File Button */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    type="button"
                    disabled={loading}
                    className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0 disabled:opacity-40"
                    title="Upload image or code/text file"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>

                  {/* Web Search Toggle Button */}
                  <button
                    onClick={() => {
                      if (!providerCapabilities.searchAvailable) {
                        setError('Google Web Search grounding is temporarily on rate-limit cooldown. Standard high-speed Gemini reasoning is active.');
                        return;
                      }
                      setWebSearchEnabled((prev) => !prev);
                    }}
                    type="button"
                    className={`p-2 rounded-xl transition-all cursor-pointer shrink-0 ${
                      !providerCapabilities.searchAvailable
                        ? 'opacity-40 text-neutral-500 hover:text-neutral-300'
                        : webSearchEnabled
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                        : 'text-neutral-400 hover:text-white hover:bg-white/10'
                    }`}
                    title={
                      !providerCapabilities.searchAvailable
                        ? 'Search grounding temporarily on rate-limit cooldown. Direct Gemini generation active.'
                        : webSearchEnabled
                        ? 'Google Search Grounding Enabled'
                        : 'Enable Google Web Search'
                    }
                  >
                    <Globe className="w-4 h-4" />
                  </button>

                  {/* Auto-Expanding Textarea */}
                  <textarea
                    ref={textareaRef}
                    rows={1}
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
                        ? 'Ask cat coder for algorithms, debugging, or full-stack code...'
                        : 'Ask anything, brainstorm, or discuss ideas...'
                    }
                    className="flex-1 max-h-40 min-h-[38px] py-1.5 px-2 bg-transparent text-neutral-100 placeholder:text-neutral-500 text-xs sm:text-sm focus:outline-none resize-none leading-relaxed"
                  />

                  {/* Send / Stop Generation Button */}
                  {loading ? (
                    <button
                      onClick={handleStopGeneration}
                      type="button"
                      className="p-2 sm:px-3 sm:py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-red-600/30 shrink-0"
                      title="Stop generating"
                    >
                      <Square className="w-3.5 h-3.5 fill-white" />
                      <span className="hidden sm:inline">Stop</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSend()}
                      disabled={!input.trim() && attachments.length === 0}
                      type="button"
                      className="p-2 sm:px-3 sm:py-2 rounded-xl bg-[#EF233C] hover:bg-red-600 disabled:opacity-40 disabled:hover:bg-[#EF233C] text-white font-medium text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-[#EF233C]/30 shrink-0"
                      title="Send message (Enter)"
                    >
                      <span>Send</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
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
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
