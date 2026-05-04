import { Platform } from "react-native";

import type { AuthSession } from "../types";

const SESSION_STORAGE_KEY = "check-in-board.auth.session";
const memoryStorage = new Map<string, string>();

type SecureStoreModule = {
  deleteItemAsync: (key: string) => Promise<void>;
  getItemAsync: (key: string) => Promise<string | null>;
  isAvailableAsync?: () => Promise<boolean>;
  setItemAsync: (key: string, value: string) => Promise<void>;
};

async function getSecureStore() {
  if (Platform.OS === "web") {
    return null;
  }

  try {
    const importModule = new Function(
      "modulePath",
      "return import(modulePath);",
    ) as (modulePath: string) => Promise<SecureStoreModule>;
    const secureStore = await importModule("expo-secure-store");

    if (
      typeof secureStore.getItemAsync === "function" &&
      typeof secureStore.setItemAsync === "function" &&
      typeof secureStore.deleteItemAsync === "function"
    ) {
      if (typeof secureStore.isAvailableAsync === "function") {
        const available = await secureStore.isAvailableAsync();

        if (!available) {
          return null;
        }
      }

      return secureStore;
    }
  } catch {
    return null;
  }

  return null;
}

async function getStoredValue(key: string) {
  const secureStore = await getSecureStore();

  if (secureStore) {
    return secureStore.getItemAsync(key);
  }

  if (Platform.OS === "web" && typeof localStorage !== "undefined") {
    return localStorage.getItem(key);
  }

  return memoryStorage.get(key) ?? null;
}

async function setStoredValue(key: string, value: string) {
  const secureStore = await getSecureStore();

  if (secureStore) {
    await secureStore.setItemAsync(key, value);
    return;
  }

  if (Platform.OS === "web" && typeof localStorage !== "undefined") {
    localStorage.setItem(key, value);
    return;
  }

  memoryStorage.set(key, value);
}

async function removeStoredValue(key: string) {
  const secureStore = await getSecureStore();

  if (secureStore) {
    await secureStore.deleteItemAsync(key);
    return;
  }

  if (Platform.OS === "web" && typeof localStorage !== "undefined") {
    localStorage.removeItem(key);
    return;
  }

  memoryStorage.delete(key);
}

export async function readSession() {
  const rawSession = await getStoredValue(SESSION_STORAGE_KEY);

  if (!rawSession) {
    return null;
  }

  try {
    return JSON.parse(rawSession) as AuthSession;
  } catch {
    await removeStoredValue(SESSION_STORAGE_KEY);
    return null;
  }
}

export async function persistSession(session: AuthSession) {
  await setStoredValue(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export async function clearSessionStorage() {
  await removeStoredValue(SESSION_STORAGE_KEY);
}
