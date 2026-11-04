export interface PartnerLogo {
  name: string;
  icon: string;
}

export interface StatItem {
  value: string;
  label: string;
}

export type ChatMode = 'normal' | 'cat-code' | 'sassy-cat' | 'fast' | 'deep-think' | 'search' | 'creative' | 'coding' | 'study';
export type AiMode = 'fast' | 'deep-think' | 'search' | 'creative' | 'coding' | 'study' | 'normal' | 'cat-code' | 'sassy-cat';
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
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash Lite (Default ⚡)',
    provider: 'gemini',
    description: 'Hyper-efficient ultra-fast model. Instant responses, high daily quota, and zero lag.',
    badge: 'Default ⚡',
    speed: '~320 tok/s',
    capabilities: ['Instant Speed', 'High Quota', 'Code & STEM', 'Full Vision'],
    requiredTier: 'free',
  },
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash (Pro Frontier ⚡)',
    provider: 'gemini',
    description: 'Flagship speed & intelligence with live Google search grounding and advanced code synthesis.',
    badge: 'Pro ($10)+ ⚡',
    speed: '~180 tok/s',
    capabilities: ['Search Grounding', 'Vision & Audio', 'Code Synthesis', 'Reasoning'],
    requiredTier: 'pro',
  },
  {
    id: 'gemini-flash-latest',
    name: 'Gemini Flash Latest (Ultra-Stable 🌟)',
    provider: 'gemini',
    description: 'Dependable production workhorse with consistent latency, deep reasoning, and high availability.',
    badge: 'Ultra-Stable 🌟',
    speed: '~220 tok/s',
    capabilities: ['Deep Logic', 'High Uptime', 'Stable Quota', 'Vision & Audio'],
    requiredTier: 'free',
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
  enhancedPrompt?: string;
  imageUrl: string;
  fallbackUrl?: string;
  aspectRatio: string;
  style?: string;
  engine?: string;
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

export type ThinkDepthLevel = 'FAST' | 'STANDARD' | 'DEEP' | 'INTENSIVE';

export interface VerificationCheckResult {
  name: string;
  passed: boolean;
  details: string;
}

export interface ThinkVerificationSummary {
  status: 'verified' | 'fast_pass' | 'corrected' | 'unverified';
  depth: ThinkDepthLevel;
  classifiedComplexity: string;
  checks: VerificationCheckResult[];
  correctionApplied: boolean;
  durationMs: number;
  timestamp: string;
}

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
  thinkEnabled?: boolean;
  thinkIntensity?: 'auto' | 'standard' | 'deep' | 'intensive';
  verificationEnabled?: boolean;
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
  verificationSummary?: ThinkVerificationSummary;
  statusStep?: 'thinking' | 'verifying' | 'correcting' | 'ready';
  stepLabel?: string;
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

export interface NewsArticle {
  id: string;
  title: string;
  headline: string;
  source: string;
  link: string;
  pubDate: string;
  timeAgo: string;
  snippet: string;
  category: string;
  newspaperName: string;
}
