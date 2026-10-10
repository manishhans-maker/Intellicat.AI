import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from './firebase';
import { ProjectSpace } from '../types';

const LOCAL_STORAGE_KEY = 'intelicat_user_spaces';
const DELETED_SPACES_KEY = 'intelicat_deleted_space_ids';

export const DEFAULT_SPACES: ProjectSpace[] = [
  {
    id: 'space-grade-7',
    userId: 'default',
    title: 'Class 7 Academic Hub',
    description: 'Homework, science experiments, math step-by-step problem solver, and study guides for Class 7.',
    icon: 'GraduationCap',
    customInstructions: 'Act as an encouraging tutor for a Class 7 student. Break down math and science questions step-by-step with clear formulas, real-world examples, and practice tips.',
    notes: '# Class 7 Curriculum Goals\n- Master Fractions, Decimals & Algebraic Expressions\n- Science: Nutrition in Plants, Acids/Bases, and Motion & Time\n- Prepare for weekly practice quizzes and clear exam solutions',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'space-fullstack-dev',
    userId: 'default',
    title: 'Full-Stack Architecture & TypeScript',
    description: 'System design, TypeScript/React components, Express servers, and database optimization.',
    icon: 'Code',
    customInstructions: 'Focus on production-grade TypeScript, robust error handling, minimal latency, modular component structure, and clean architecture.',
    notes: '# Architecture Notes\n- Keep API calls minimal, cached, and idempotent\n- Stream AI responses using Server-Sent Events (SSE)\n- Modular component design with clean types\n- Zero unused code and instant mobile responsiveness',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'space-cyber-cat',
    userId: 'default',
    title: 'Cyber Cat Coder Prototyping',
    description: 'Rapid prototyping, creative algorithms, cat-themed interactive code snippets, and UI components.',
    icon: 'Sparkles',
    customInstructions: 'Respond as the Cyber Cat Coder: enthusiastic, extremely sharp, delivering complete copy-paste code with playful tech humor and clever feline analogies.',
    notes: '# Cyber Cat Scratchpad\n- Mission: Craft lightning-fast, visually striking web tools\n- Key stack: React, Vite, Tailwind CSS, Lucide icons\n- Always test edge cases and handle offline states',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

export function getDeletedSpaceIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_SPACES_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export function recordDeletedSpaceId(id: string) {
  try {
    const set = getDeletedSpaceIds();
    set.add(id);
    localStorage.setItem(DELETED_SPACES_KEY, JSON.stringify(Array.from(set).slice(-50)));
  } catch {
    // ignore
  }
}

export function unmarkDeletedSpaceId(id: string) {
  try {
    const set = getDeletedSpaceIds();
    set.delete(id);
    localStorage.setItem(DELETED_SPACES_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // ignore
  }
}

export function sanitizeSpace(raw: Partial<ProjectSpace>, userId?: string): ProjectSpace {
  const now = new Date().toISOString();
  const effectiveUserId = (userId || raw.userId || 'anonymous').trim();
  const safeId = (raw.id && raw.id.trim())
    ? raw.id.trim().replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128)
    : `space-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  return {
    id: safeId,
    userId: effectiveUserId,
    title: (raw.title && raw.title.trim()) ? raw.title.trim().slice(0, 128) : 'Untitled Space',
    description: (raw.description || '').trim().slice(0, 2000),
    icon: (raw.icon || 'FolderKanban').slice(0, 64),
    customInstructions: (raw.customInstructions || '').trim().slice(0, 10000),
    notes: (raw.notes || '').trim().slice(0, 50000),
    createdAt: raw.createdAt || now,
    updatedAt: now,
  };
}

export function getLocalSpaces(): ProjectSpace[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEFAULT_SPACES));
      return DEFAULT_SPACES;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEFAULT_SPACES));
      return DEFAULT_SPACES;
    }
    const deleted = getDeletedSpaceIds();
    return parsed.filter((s) => s && s.id && !deleted.has(s.id));
  } catch (err) {
    console.warn('Failed to read local spaces:', err);
    return DEFAULT_SPACES;
  }
}

export function saveLocalSpaces(spaces: ProjectSpace[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(spaces));
  } catch (err) {
    console.warn('Failed to save local spaces:', err);
  }
}

export function mergeSpaces(cloudList: ProjectSpace[], localList: ProjectSpace[]): ProjectSpace[] {
  const deleted = getDeletedSpaceIds();
  const map = new Map<string, ProjectSpace>();

  // Seed with default spaces if nothing exists
  DEFAULT_SPACES.forEach((d) => {
    if (!deleted.has(d.id)) {
      map.set(d.id, d);
    }
  });

  // Layer local spaces
  localList.forEach((s) => {
    if (s && s.id && !deleted.has(s.id)) {
      map.set(s.id, s);
    }
  });

  // Layer cloud spaces
  cloudList.forEach((s) => {
    if (s && s.id && !deleted.has(s.id)) {
      map.set(s.id, s);
    }
  });

  const merged = Array.from(map.values());
  merged.sort((a, b) => {
    const tA = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const tB = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return tB - tA;
  });

  return merged;
}

export async function loadUserSpaces(userId?: string): Promise<ProjectSpace[]> {
  const localList = getLocalSpaces();
  if (!userId || userId === 'anonymous' || userId === 'default') {
    return localList;
  }

  try {
    const spacesRef = collection(db, 'users', userId, 'spaces');
    const q = query(spacesRef, orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    const firestoreList: ProjectSpace[] = [];

    snap.forEach((docSnap) => {
      const data = docSnap.data() as ProjectSpace;
      if (data && data.id && data.title) {
        firestoreList.push(data);
      }
    });

    const merged = mergeSpaces(firestoreList, localList);
    saveLocalSpaces(merged);

    // If completely empty on fresh account, seed defaults
    if (merged.length === 0) {
      for (const def of DEFAULT_SPACES) {
        const seeded = sanitizeSpace(def, userId);
        await saveUserSpace(seeded, userId);
      }
      return getLocalSpaces();
    }

    return merged;
  } catch (err) {
    console.warn('Firestore loadUserSpaces fallback to local storage:', err);
    return localList;
  }
}

export async function saveUserSpace(
  space: Partial<ProjectSpace>,
  userId?: string
): Promise<ProjectSpace> {
  const sanitized = sanitizeSpace(space, userId);
  unmarkDeletedSpaceId(sanitized.id);

  // 1. Immediately persist to localStorage for zero-latency UI update
  const localList = getLocalSpaces();
  const existingIdx = localList.findIndex((s) => s.id === sanitized.id);
  let updatedList: ProjectSpace[];

  if (existingIdx >= 0) {
    updatedList = [...localList];
    updatedList[existingIdx] = sanitized;
  } else {
    updatedList = [sanitized, ...localList];
  }
  saveLocalSpaces(updatedList);

  // 2. Synchronize to Firestore if user is authenticated
  if (userId && userId !== 'anonymous' && userId !== 'default') {
    try {
      const docRef = doc(db, 'users', userId, 'spaces', sanitized.id);
      await setDoc(docRef, sanitized, { merge: true });
    } catch (err) {
      console.warn('Failed to sync space to Firestore:', err);
    }
  }

  return sanitized;
}

export async function deleteUserSpace(spaceId: string, userId?: string): Promise<void> {
  recordDeletedSpaceId(spaceId);

  const localList = getLocalSpaces().filter((s) => s.id !== spaceId);
  saveLocalSpaces(localList);

  if (userId && userId !== 'anonymous' && userId !== 'default') {
    try {
      const docRef = doc(db, 'users', userId, 'spaces', spaceId);
      await deleteDoc(docRef);
    } catch (err) {
      console.warn('Failed to delete space from Firestore:', err);
    }
  }
}

export async function resetDefaultSpaces(userId?: string): Promise<ProjectSpace[]> {
  // Clear any deleted tracking for default spaces
  for (const def of DEFAULT_SPACES) {
    unmarkDeletedSpaceId(def.id);
  }
  saveLocalSpaces(DEFAULT_SPACES);

  if (userId && userId !== 'anonymous' && userId !== 'default') {
    for (const sp of DEFAULT_SPACES) {
      await saveUserSpace(sp, userId);
    }
  }
  return DEFAULT_SPACES;
}

export function formatSpaceContext(space?: ProjectSpace | null): string {
  if (!space) return '';
  const parts: string[] = [];
  if (space.title) parts.push(`Project Space: ${space.title}`);
  if (space.description?.trim()) {
    parts.push(`Space Summary: ${space.description.trim()}`);
  }
  if (space.customInstructions?.trim()) {
    parts.push(`Space Instructions: ${space.customInstructions.trim()}`);
  }
  if (space.notes?.trim()) {
    // Excerpt notes (up to 1200 characters)
    const noteExcerpt = space.notes.trim().slice(0, 1200);
    parts.push(`Active Scratchpad Notes:\n${noteExcerpt}`);
  }
  return parts.join('\n\n');
}
