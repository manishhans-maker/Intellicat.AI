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
import { UserMemory } from '../types';

const LOCAL_STORAGE_KEY = 'intelicat_user_memories';

export function getLocalMemories(): UserMemory[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn('Failed to read local memories:', err);
    return [];
  }
}

export function saveLocalMemories(memories: UserMemory[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(memories));
  } catch (err) {
    console.warn('Failed to save local memories:', err);
  }
}

export async function loadUserMemories(userId?: string): Promise<UserMemory[]> {
  const localList = getLocalMemories();
  if (!userId) {
    return localList;
  }

  try {
    const memRef = collection(db, 'users', userId, 'memories');
    const q = query(memRef, orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    const firestoreList: UserMemory[] = [];

    snap.forEach((docSnap) => {
      firestoreList.push(docSnap.data() as UserMemory);
    });

    if (firestoreList.length > 0) {
      saveLocalMemories(firestoreList);
      return firestoreList;
    }
    return localList;
  } catch (err) {
    console.warn('Firestore loadUserMemories fallback to local storage:', err);
    return localList;
  }
}

export async function saveUserMemory(
  memory: UserMemory,
  userId?: string
): Promise<UserMemory> {
  const localList = getLocalMemories();
  const existingIdx = localList.findIndex((m) => m.id === memory.id);
  let updatedList: UserMemory[];

  if (existingIdx >= 0) {
    updatedList = [...localList];
    updatedList[existingIdx] = memory;
  } else {
    updatedList = [memory, ...localList];
  }
  saveLocalMemories(updatedList);

  if (userId) {
    try {
      const docRef = doc(db, 'users', userId, 'memories', memory.id);
      await setDoc(docRef, memory, { merge: true });
    } catch (err) {
      console.warn('Failed to sync memory to Firestore:', err);
    }
  }

  return memory;
}

export async function deleteUserMemory(memoryId: string, userId?: string): Promise<void> {
  const localList = getLocalMemories().filter((m) => m.id !== memoryId);
  saveLocalMemories(localList);

  if (userId) {
    try {
      const docRef = doc(db, 'users', userId, 'memories', memoryId);
      await deleteDoc(docRef);
    } catch (err) {
      console.warn('Failed to delete memory from Firestore:', err);
    }
  }
}

export async function toggleMemoryState(
  memoryId: string,
  isEnabled: boolean,
  userId?: string
): Promise<void> {
  const localList = getLocalMemories().map((m) =>
    m.id === memoryId ? { ...m, isEnabled, updatedAt: new Date().toISOString() } : m
  );
  saveLocalMemories(localList);

  if (userId) {
    try {
      const docRef = doc(db, 'users', userId, 'memories', memoryId);
      await updateDoc(docRef, { isEnabled, updatedAt: new Date().toISOString() });
    } catch (err) {
      console.warn('Failed to update memory in Firestore:', err);
    }
  }
}

export async function clearAllMemories(userId?: string): Promise<void> {
  const localList = getLocalMemories();
  saveLocalMemories([]);

  if (userId) {
    try {
      for (const m of localList) {
        const docRef = doc(db, 'users', userId, 'memories', m.id);
        await deleteDoc(docRef);
      }
    } catch (err) {
      console.warn('Failed to clear memories in Firestore:', err);
    }
  }
}

export function formatMemoriesForContext(memories: UserMemory[]): string {
  const active = memories.filter((m) => m.isEnabled && m.value.trim());
  if (active.length === 0) return '';

  return active
    .map((m) => `- ${m.key}: ${m.value}`)
    .join('\n')
    .slice(0, 1500); // Keep compact to preserve API quota!
}
