import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from './firebase';
import { Conversation, ChatMessage } from '../types';

const LOCAL_STORAGE_KEY_PREFIX = 'intelicat_convs_';
const LOCAL_STORAGE_MSGS_PREFIX = 'intelicat_msgs_';

export function getLocalConversations(userId: string): Conversation[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}${userId}`);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function setLocalConversations(userId: string, conversations: Conversation[]) {
  try {
    localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(conversations));
  } catch {
    // ignore
  }
}

export function getLocalMessages(convId: string): ChatMessage[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_MSGS_PREFIX}${convId}`);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function setLocalMessages(convId: string, messages: ChatMessage[]) {
  try {
    localStorage.setItem(`${LOCAL_STORAGE_MSGS_PREFIX}${convId}`, JSON.stringify(messages));
  } catch {
    // ignore
  }
}

export function deleteLocalConversation(userId: string, convId: string) {
  try {
    const existing = getLocalConversations(userId);
    const filtered = existing.filter((c) => c.id !== convId);
    setLocalConversations(userId, filtered);
    localStorage.removeItem(`${LOCAL_STORAGE_MSGS_PREFIX}${convId}`);
  } catch {
    // ignore
  }
}

/**
 * Generates an automatic, clean, concise title from the user's prompt
 */
export function generateAutomaticTitle(prompt: string): string {
  if (!prompt || !prompt.trim()) return 'New Chat';
  let clean = prompt.trim().replace(/^([#>*\s-]+)/, '');
  clean = clean.replace(/^(can you|please|help me|i want to|how to|write|code|create|generate|explain)\s+/i, '');
  clean = clean.charAt(0).toUpperCase() + clean.slice(1);
  if (clean.length > 36) {
    const words = clean.slice(0, 36).split(' ');
    words.pop();
    clean = (words.join(' ') || clean.slice(0, 32)) + '...';
  }
  return clean || 'Conversation';
}

/**
 * Load all user conversations with Firestore + localStorage fallback
 */
export async function loadUserConversations(userId: string): Promise<Conversation[]> {
  if (!userId) return [];
  const localList = getLocalConversations(userId);

  try {
    const convsRef = collection(db, 'users', userId, 'conversations');
    const q = query(convsRef, orderBy('updatedAt', 'desc'), limit(100));
    const snap = await getDocs(q);

    if (!snap.empty) {
      const remoteList: Conversation[] = [];
      snap.forEach((d) => {
        const data = d.data() as Conversation;
        remoteList.push({ ...data, id: d.id });
      });

      // Sort: pinned first, then by updatedAt desc
      remoteList.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });

      setLocalConversations(userId, remoteList);
      return remoteList;
    }
  } catch (err) {
    console.warn('Could not fetch conversations from Firestore, using local cache:', err);
  }

  return localList;
}

/**
 * Save or update a conversation in Firestore and local storage
 */
export async function saveConversation(userId: string, conv: Conversation): Promise<void> {
  if (!userId || !conv.id) return;

  // 1. Update local cache immediately for zero-latency UI
  const currentLocal = getLocalConversations(userId);
  const idx = currentLocal.findIndex((c) => c.id === conv.id);
  let updatedLocal: Conversation[];
  if (idx >= 0) {
    updatedLocal = [...currentLocal];
    updatedLocal[idx] = { ...updatedLocal[idx], ...conv };
  } else {
    updatedLocal = [conv, ...currentLocal];
  }
  setLocalConversations(userId, updatedLocal);

  // 2. Persist to Firestore
  try {
    const docRef = doc(db, 'users', userId, 'conversations', conv.id);
    const dataToSave = {
      id: conv.id,
      userId,
      title: conv.title,
      mode: conv.mode,
      provider: conv.provider || (conv.mode === 'normal' ? 'groq' : 'gemini'),
      isPinned: Boolean(conv.isPinned),
      isArchived: Boolean(conv.isArchived),
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
    };
    await setDoc(docRef, dataToSave, { merge: true });
  } catch (err) {
    console.warn('Failed to sync conversation to Firestore:', err);
  }
}

/**
 * Delete a conversation from Firestore and local storage
 */
export async function deleteConversation(userId: string, convId: string): Promise<void> {
  if (!userId || !convId) return;

  deleteLocalConversation(userId, convId);

  try {
    const docRef = doc(db, 'users', userId, 'conversations', convId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Failed to delete conversation from Firestore:', err);
  }
}

/**
 * Toggle pin status
 */
export async function togglePinConversation(userId: string, convId: string, currentPinned: boolean): Promise<void> {
  const newPinned = !currentPinned;
  const currentLocal = getLocalConversations(userId);
  const updated = currentLocal.map((c) => (c.id === convId ? { ...c, isPinned: newPinned } : c));
  setLocalConversations(userId, updated);

  try {
    const docRef = doc(db, 'users', userId, 'conversations', convId);
    await updateDoc(docRef, { isPinned: newPinned, updatedAt: new Date().toISOString() });
  } catch (err) {
    console.warn('Could not update pin status in Firestore:', err);
  }
}

/**
 * Toggle archive status
 */
export async function toggleArchiveConversation(userId: string, convId: string, currentArchived: boolean): Promise<void> {
  const newArchived = !currentArchived;
  const currentLocal = getLocalConversations(userId);
  const updated = currentLocal.map((c) => (c.id === convId ? { ...c, isArchived: newArchived } : c));
  setLocalConversations(userId, updated);

  try {
    const docRef = doc(db, 'users', userId, 'conversations', convId);
    await updateDoc(docRef, { isArchived: newArchived, updatedAt: new Date().toISOString() });
  } catch (err) {
    console.warn('Could not update archive status in Firestore:', err);
  }
}

/**
 * Rename a conversation
 */
export async function renameConversation(userId: string, convId: string, newTitle: string): Promise<void> {
  if (!newTitle.trim()) return;
  const currentLocal = getLocalConversations(userId);
  const updated = currentLocal.map((c) =>
    c.id === convId ? { ...c, title: newTitle.trim(), updatedAt: new Date().toISOString() } : c
  );
  setLocalConversations(userId, updated);

  try {
    const docRef = doc(db, 'users', userId, 'conversations', convId);
    await updateDoc(docRef, { title: newTitle.trim(), updatedAt: new Date().toISOString() });
  } catch (err) {
    console.warn('Could not rename conversation in Firestore:', err);
  }
}

/**
 * Load all messages for a conversation
 */
export async function loadConversationMessages(userId: string, convId: string): Promise<ChatMessage[]> {
  if (!convId) return [];
  const local = getLocalMessages(convId);

  if (!userId) return local;

  try {
    const msgsRef = collection(db, 'users', userId, 'conversations', convId, 'messages');
    const q = query(msgsRef, orderBy('createdAt', 'asc'), limit(200));
    const snap = await getDocs(q);

    if (!snap.empty) {
      const list: ChatMessage[] = [];
      snap.forEach((d) => {
        list.push({ ...(d.data() as ChatMessage), id: d.id });
      });
      setLocalMessages(convId, list);
      return list;
    }
  } catch (err) {
    console.warn('Could not fetch messages from Firestore, using local cache:', err);
  }

  return local;
}

/**
 * Save an individual message to Firestore and local cache
 */
export async function saveMessage(userId: string, convId: string, msg: ChatMessage): Promise<void> {
  if (!convId || !msg.id) return;

  // 1. Update local cache
  const current = getLocalMessages(convId);
  const existsIdx = current.findIndex((m) => m.id === msg.id);
  let updatedMsgs: ChatMessage[];
  if (existsIdx >= 0) {
    updatedMsgs = [...current];
    updatedMsgs[existsIdx] = msg;
  } else {
    updatedMsgs = [...current, msg];
  }
  setLocalMessages(convId, updatedMsgs);

  // 2. Persist to Firestore
  if (!userId) return;

  try {
    const docRef = doc(db, 'users', userId, 'conversations', convId, 'messages', msg.id);
    const payload = {
      id: msg.id,
      conversationId: convId,
      userId,
      role: msg.role,
      content: msg.content,
      createdAt: msg.createdAt || new Date().toISOString(),
      timestamp: msg.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mode: msg.mode || 'normal',
      provider: msg.provider || 'gemini',
    };
    await setDoc(docRef, payload, { merge: true });

    // Also update parent conversation's updatedAt and preview
    const parentRef = doc(db, 'users', userId, 'conversations', convId);
    await updateDoc(parentRef, {
      updatedAt: new Date().toISOString(),
      lastMessagePreview: msg.content.slice(0, 100),
    }).catch(() => {});
  } catch (err) {
    console.warn('Could not save message to Firestore:', err);
  }
}
