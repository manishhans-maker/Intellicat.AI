export interface PartnerLogo {
  name: string;
  icon: string;
}

export interface StatItem {
  value: string;
  label: string;
}

export type ChatMode = 'normal' | 'cat-code';
export type AiProvider = 'groq' | 'gemini';

export interface ChatAttachment {
  id: string;
  name: string;
  type: string; // mime-type e.g. 'image/png', 'text/plain'
  size: number;
  data: string; // base64 string or raw text
}

export interface CitationSource {
  title: string;
  uri: string;
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
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  mode: ChatMode;
  provider?: AiProvider;
  isPinned?: boolean;
  isArchived?: boolean;
  createdAt: string;
  updatedAt: string;
  lastMessagePreview?: string;
}
