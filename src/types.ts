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

export type UserPlanTier = 'free' | 'pro' | 'elite' | 'founder' | 'owner';

export interface AiModelOption {
  id: string;
  name: string;
  provider: AiProvider;
  description: string;
  badge?: string;
  speed?: string;
  capabilities: string[];
  requiredTier?: UserPlanTier;
}

export const AVAILABLE_AI_MODELS: AiModelOption[] = [
  {
    id: 'gemini-3.6-flash',
    name: 'Gemini 3.6 Flash (Default)',
    provider: 'gemini',
    description: 'Ultra-reliable flagship multimodal reasoning and code generation with 100% uptime. Default for all plans.',
    badge: 'Default ⚡',
    speed: '~160 tok/s',
    capabilities: ['Ultra Reliable', 'High Speed', 'Full Reasoning', 'Code & STEM'],
    requiredTier: 'free',
  },
  {
    id: 'gemini-3.7-flash',
    name: 'Gemini 3.7 Flash (Hybrid Reasoning)',
    provider: 'gemini',
    description: 'High-performance reasoning engine with hybrid chain-of-thought, rapid multimodal response, and STEM logic.',
    badge: 'Hybrid 🧠',
    speed: '~175 tok/s',
    capabilities: ['Hybrid Reasoning', 'High Uptime', 'Balanced STEM', 'Vision & Audio'],
    requiredTier: 'free',
  },
  {
    id: 'gemini-3.5-flash-lite',
    name: 'Gemini 3.5 Flash Lite',
    provider: 'gemini',
    description: 'Hyper-efficient lightweight model replacing 3.1 Pro for ultra-fast latency, rapid summaries, and instant throughput.',
    badge: 'Lite Speed ⚡',
    speed: '~240 tok/s',
    capabilities: ['Ultra-Low Latency', 'High Throughput', 'Instant Summary', 'Eco-Quota'],
    requiredTier: 'free',
  },
  {
    id: 'gemini-3.5-flash',
    name: 'Gemini 3.5 Flash (Balanced)',
    provider: 'gemini',
    description: 'Dependable production workhorse with consistent latency, balanced reasoning, and robust multimodal vision.',
    badge: 'Balanced ⚡',
    speed: '~170 tok/s',
    capabilities: ['Production Stability', 'High Uptime', 'Balanced STEM', 'Vision & Audio'],
    requiredTier: 'free',
  },
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    provider: 'gemini',
    description: 'Flagship speed & intelligence with live Google search grounding and advanced code synthesis.',
    badge: 'Pro ($10)+ 🔒',
    speed: '~140 tok/s',
    capabilities: ['Search Grounding', 'Vision & Audio', 'Code Synthesis', 'Reasoning'],
    requiredTier: 'pro',
  },
  {
    id: 'llama-3.1-8b-instant',
    name: 'Llama 3.1 8B (Instant)',
    provider: 'groq',
    description: 'Hyper-accelerated inference running at up to 800+ tokens per second for real-time thought flow.',
    badge: '800+ tok/s ⚡',
    speed: '~800 tok/s',
    capabilities: ['Hyper-Fast', 'Instant Stream', 'Brainstorming'],
    requiredTier: 'free',
  },
  {
    id: 'llama-3.3-70b-versatile',
    name: 'Llama 3.3 70B (Versatile)',
    provider: 'groq',
    description: 'Meta premier 70B open model powered by Groq LPUs for advanced reasoning, essays, and debate.',
    badge: 'Pro ($10)+ ⚡',
    speed: '~280 tok/s',
    capabilities: ['70B Reasoning', 'Deep Analysis', 'Long-Form Writing'],
    requiredTier: 'pro',
  },
  {
    id: 'deepseek-r1-distill-llama-70b',
    name: 'DeepSeek R1 Distill 70B',
    provider: 'groq',
    description: 'DeepSeek R1 reasoning architecture distilled into Llama 70B on Groq LPUs for chain-of-thought logic.',
    badge: 'R1 Reasoning ⚡',
    speed: '~250 tok/s',
    capabilities: ['Chain of Thought', 'Math & Logic', 'Complex Reasoning'],
    requiredTier: 'pro',
  },
  {
    id: 'llama-3.2-3b-preview',
    name: 'Llama 3.2 3B (Ultra-Light)',
    provider: 'groq',
    description: 'Ultra-lightweight Llama 3.2 model running at blazing speeds on Groq LPUs with near-zero latency.',
    badge: '1000+ tok/s ⚡',
    speed: '~1000 tok/s',
    capabilities: ['Ultra-Light', 'Zero Latency', 'Rapid Brainstorm'],
    requiredTier: 'free',
  },
  {
    id: 'gemma2-9b-it',
    name: 'Gemma 2 9B (Google)',
    provider: 'groq',
    description: 'Google Gemma 2 instruction model powered by Groq LPUs for balanced STEM and general logic.',
    badge: 'Google Open',
    speed: '~500 tok/s',
    capabilities: ['Google Quality', 'Fast Inference', 'STEM / Logic'],
    requiredTier: 'free',
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
