import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const GUEST_ID_KEY = 'voidthreat_guest_id_v1';

export async function getOrCreateGuestId(): Promise<string> {
  const existing = await AsyncStorage.getItem(GUEST_ID_KEY);
  if (existing && typeof existing === 'string' && existing.length >= 16) {
    return existing;
  }

  const id = Crypto.randomUUID();
  await AsyncStorage.setItem(GUEST_ID_KEY, id);
  return id;
}


