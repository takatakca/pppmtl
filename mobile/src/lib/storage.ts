// Small storage helpers. Receipt tokens go to the phone's secure storage (Keychain / Keystore); the rest
// (menu copy, cart, preferences) to ordinary app storage. On the web preview, secure storage does not exist.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export async function readJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
export async function writeJson(key: string, value: unknown) {
  try {
    if (value === null || value === undefined) await AsyncStorage.removeItem(key);
    else await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or unavailable: the app keeps working in memory */
  }
}
export async function readSecret(key: string): Promise<string | null> {
  if (Platform.OS === 'web') return AsyncStorage.getItem(key).catch(() => null);
  return SecureStore.getItemAsync(key).catch(() => null);
}
export async function writeSecret(key: string, value: string | null) {
  if (Platform.OS === 'web') {
    if (value === null) await AsyncStorage.removeItem(key).catch(() => undefined);
    else await AsyncStorage.setItem(key, value).catch(() => undefined);
    return;
  }
  if (value === null) await SecureStore.deleteItemAsync(key).catch(() => undefined);
  else await SecureStore.setItemAsync(key, value, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY }).catch(() => undefined);
}
export async function clearAll() {
  await AsyncStorage.clear().catch(() => undefined);
}
