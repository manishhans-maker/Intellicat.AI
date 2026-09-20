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
