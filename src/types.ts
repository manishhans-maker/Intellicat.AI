export interface PartnerLogo {
  name: string;
  icon: string;
}

export interface StatItem {
  value: string;
  label: string;
}

export type ChatMode = 'normal' | 'cat-code' | 'fast' | 'deep-think' | 'search' | 'creative' | 'coding' | 'study';
export type AiMode = 'fast' | 'deep-think' | 'search' | 'creative' | 'coding' | 'study' | 'normal' | 'cat-code';
export type AiProvider = 'groq' | 'gemini';

export interface AiModelOption {
  id: string;
  name: string;
  provider: AiProvider;
  description: string;
  badge?: string;
  speed?: string;
  capabilities: string[];
}

export const AVAILABLE_AI_MODELS: AiModelOption[] = [
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    provider: 'gemini',
    description: 'Flagship speed & intelligence with live Google search grounding and cybernetic code synthesis.',
    badge: 'Recommended',
    speed: '~140 tok/s',
    capabilities: ['Search Grounding', 'Vision & Audio', 'Code Synthesis', 'Reasoning'],
  },
  {
    id: 'gemini-3.1-pro-preview',
    name: 'Gemini 3.1 Pro (Preview)',
    provider: 'gemini',
    description: 'Advanced reasoning, deep logic, full-stack software architectures, and complex problem solving.',
    badge: 'Deep Pro',
    speed: '~90 tok/s',
    capabilities: ['Deep Logic', 'Complex Coding', 'Math & STEM', 'Full Architecture'],
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash Lite',
    provider: 'gemini',
    description: 'Ultra-lightweight, quota-efficient model optimized for instant response and summaries.',
    badge: 'Eco Speed',
    speed: '~200 tok/s',
    capabilities: ['Quota Efficient', 'Low Latency', 'Document Reading'],
  },
  {
    id: 'gemini-flash-latest',
    name: 'Gemini Flash Latest',
    provider: 'gemini',
    description: 'Always up-to-date Gemini Flash release with continuous performance upgrades.',
    badge: 'Latest',
    speed: '~150 tok/s',
    capabilities: ['Auto-Updating', 'Multimodal', 'Reasoning'],
  },
  {
    id: 'llama-3.3-70b-versatile',
    name: 'Llama 3.3 70B (Versatile)',
    provider: 'groq',
    description: 'Meta premier 70B open model powered by Groq LPUs for advanced reasoning, essays, and debate.',
    badge: '70B Brain',
    speed: '~280 tok/s',
    capabilities: ['70B Reasoning', 'Deep Analysis', 'Long-Form Writing'],
  },
  {
    id: 'llama-3.1-8b-instant',
    name: 'Llama 3.1 8B (Instant)',
    provider: 'groq',
    description: 'Hyper-accelerated inference running at up to 800+ tokens per second for real-time thought flow.',
    badge: '800+ tok/s ⚡',
    speed: '~800 tok/s',
    capabilities: ['Hyper-Fast', 'Instant Stream', 'Brainstorming'],
  },
  {
    id: 'mixtral-8x7b-32768',
    name: 'Mixtral 8x7B (MoE 32k)',
    provider: 'groq',
    description: 'Mistral Mixture-of-Experts routing 8 sub-networks with 32,768 context window on Groq hardware.',
    badge: '32k MoE',
    speed: '~450 tok/s',
    capabilities: ['MoE Architecture', '32k Window', 'Technical Data'],
  },
  {
    id: 'gemma2-9b-it',
    name: 'Gemma 2 9B (Google)',
    provider: 'groq',
    description: 'Google Gemma 2 instruction model powered by Groq LPUs for balanced STEM and general logic.',
    badge: 'Google Open',
    speed: '~500 tok/s',
    capabilities: ['Google Quality', 'Fast Inference', 'STEM / Logic'],
  },
];

export type StudyGrade =
  | 'class-1-5'
  | 'class-6'
  | 'class-7'
  | 'class-8'
  | 'class-9'
  | 'class-10'
  | 'class-11-12'
  | 'college';

export type StudyTaskType = 'homework' | 'step-by-step' | 'quiz' | 'flashcards' | 'summary';

export interface UserMemory {
  id: string;
  userId: string;
  key: string;
  value: string;
  category?: 'preference' | 'profile' | 'study' | 'general';
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectSpace {
  id: string;
  userId: string;
  title: string;
  description?: string;
  icon?: string;
  customInstructions?: string;
  notes?: string;
  fileIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface GeneratedImage {
  id: string;
  prompt: string;
  imageUrl: string;
  aspectRatio: string;
  style?: string;
  provider: string;
  createdAt: string;
}

export interface StudyFlashcard {
  id: string;
  question: string;
  answer: string;
  grade?: string;
  topic?: string;
}

export type AppActiveTab = 'chat' | 'search' | 'files' | 'study' | 'spaces' | 'images' | 'settings';

export interface UserSettings {
  defaultMode: AiMode;
  defaultProvider: AiProvider | 'auto';
  groqApiKey?: string;
  voiceEnabled: boolean;
  autoSpeak: boolean;
  voiceRate: number;
  voicePitch: number;
  selectedVoiceURI?: string;
  memoryEnabled: boolean;
  themeMode: 'vivid' | 'cinema' | 'balanced';
}

export interface ChatAttachment {
  id: string;
  name: string;
  type: string; // mime-type e.g. 'image/png', 'text/plain', 'application/pdf'
  size: number;
  data: string; // base64 string or raw text
  extractedText?: string;
}

export interface CitationSource {
  title: string;
  uri: string;
  snippet?: string;
}

export interface ChatMessage {
  id: string;
  conversationId?: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  createdAt?: string;
  mode?: ChatMode;
  provider?: AiProvider;
  model?: string;
  attachments?: ChatAttachment[];
  citations?: CitationSource[];
  isError?: boolean;
  errorMessage?: string;
  studyGrade?: StudyGrade;
  spaceId?: string;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  mode: ChatMode;
  provider?: AiProvider;
  isPinned?: boolean;
  isArchived?: boolean;
  spaceId?: string;
  createdAt: string;
  updatedAt: string;
  lastMessagePreview?: string;
}
