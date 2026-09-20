import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from './firebase';
import { ProjectSpace } from '../types';

const LOCAL_STORAGE_KEY = 'intelicat_user_spaces';

const DEFAULT_SPACES: ProjectSpace[] = [
  {
    id: 'space-grade-7',
    userId: 'default',
    title: 'Class 7 Academic Hub',
    description: 'Homework, science experiments, math step-by-step problem solver, and study guides for Class 7.',
    icon: 'GraduationCap',
    customInstructions: 'Act as an encouraging tutor for a Class 7 student. Break down math and science questions step-by-step with clear definitions and practice tips.',
    notes: '# Class 7 Goals\n- Master Fractions & Algebraic Expressions\n- Science: Photosynthesis and Motion & Time\n- Prepare for weekly practice quizzes',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'space-fullstack-dev',
    userId: 'default',
    title: 'Full-Stack Architecture',
    description: 'System design, TypeScript/React components, Express servers, and database optimization.',
    icon: 'Code',
    customInstructions: 'Focus on production-grade TypeScript, robust error handling, minimal latency, and elegant modular design.',
    notes: '# System Architecture Notes\n- Keep API calls minimal and cached\n- Prefer Groq LPU for low latency text tasks\n- Modular component structure with clean interfaces',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export function getLocalSpaces(): ProjectSpace[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEFAULT_SPACES));
      return DEFAULT_SPACES;
    }
    return JSON.parse(raw);
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

export async function loadUserSpaces(userId?: string): Promise<ProjectSpace[]> {
  const localList = getLocalSpaces();
  if (!userId) {
    return localList;
  }

  try {
    const spacesRef = collection(db, 'users', userId, 'spaces');
    const q = query(spacesRef, orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    const firestoreList: ProjectSpace[] = [];

    snap.forEach((docSnap) => {
      firestoreList.push(docSnap.data() as ProjectSpace);
    });

    if (firestoreList.length > 0) {
      saveLocalSpaces(firestoreList);
      return firestoreList;
    }
    return localList;
  } catch (err) {
    console.warn('Firestore loadUserSpaces fallback to local storage:', err);
    return localList;
  }
}

export async function saveUserSpace(
  space: ProjectSpace,
  userId?: string
): Promise<ProjectSpace> {
  const localList = getLocalSpaces();
  const existingIdx = localList.findIndex((s) => s.id === space.id);
  let updatedList: ProjectSpace[];

  if (existingIdx >= 0) {
    updatedList = [...localList];
    updatedList[existingIdx] = space;
  } else {
    updatedList = [space, ...localList];
  }
  saveLocalSpaces(updatedList);

  if (userId) {
    try {
      const docRef = doc(db, 'users', userId, 'spaces', space.id);
      await setDoc(docRef, space, { merge: true });
    } catch (err) {
      console.warn('Failed to sync space to Firestore:', err);
    }
  }

  return space;
}

export async function deleteUserSpace(spaceId: string, userId?: string): Promise<void> {
  const localList = getLocalSpaces().filter((s) => s.id !== spaceId);
  saveLocalSpaces(localList);

  if (userId) {
    try {
      const docRef = doc(db, 'users', userId, 'spaces', spaceId);
      await deleteDoc(docRef);
    } catch (err) {
      console.warn('Failed to delete space from Firestore:', err);
    }
  }
}

export function formatSpaceContext(space?: ProjectSpace | null): string {
  if (!space) return '';
  const parts: string[] = [];
  if (space.title) parts.push(`Project Space: ${space.title}`);
  if (space.customInstructions?.trim()) {
    parts.push(`Space Instructions: ${space.customInstructions.trim()}`);
  }
  if (space.notes?.trim()) {
    // Only send the first 800 chars of notes to protect API quota!
    const noteExcerpt = space.notes.trim().slice(0, 800);
    parts.push(`Reference Notes Excerpt: ${noteExcerpt}`);
  }
  return parts.join('\n');
}
