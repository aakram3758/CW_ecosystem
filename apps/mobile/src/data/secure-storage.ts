import * as SecureStore from 'expo-secure-store';

// Count UTF-8 bytes without splitting surrogate pairs; session metadata can contain Arabic.
export function sessionChunks(value: string): string[] {
  const chunks: string[] = [];
  let chunk = '';
  let bytes = 0;
  for (const character of value) {
    const point = character.codePointAt(0)!;
    const size = point <= 0x7f ? 1 : point <= 0x7ff ? 2 : point <= 0xffff ? 3 : 4;
    if (bytes + size > 1800) {
      chunks.push(chunk);
      chunk = '';
      bytes = 0;
    }
    chunk += character;
    bytes += size;
  }
  chunks.push(chunk);
  return chunks;
}

let pending: Promise<unknown> = Promise.resolve();
function serialized<T>(operation: () => Promise<T>): Promise<T> {
  const result = pending.then(operation);
  pending = result.catch(() => {});
  return result;
}

function chunkCount(value: string | null): number {
  const count = Number(value?.replace(/^pending:/, '') ?? 0);
  return Number.isSafeInteger(count) && count > 0 ? count : 0;
}

export const secureStorage = {
  getItem(key: string): Promise<string | null> {
    return serialized(async () => {
      const manifest = await SecureStore.getItemAsync(`${key}.count`);
      if (!manifest || manifest.startsWith('pending:')) return null;
      const count = chunkCount(manifest);
      if (!count) return null;
      const chunks = await Promise.all(Array.from({ length: count }, (_, i) =>
        SecureStore.getItemAsync(`${key}.${i}`)));
      return chunks.some(chunk => chunk === null) ? null : chunks.join('');
    });
  },
  setItem(key: string, value: string): Promise<void> {
    return serialized(async () => {
      const oldCount = chunkCount(await SecureStore.getItemAsync(`${key}.count`));
      const chunks = sessionChunks(value);
      // An interrupted write must never be mistaken for a complete session. Retain the largest
      // count until commit so the next write or removal can also clean up interrupted chunks.
      await SecureStore.setItemAsync(`${key}.count`, `pending:${Math.max(oldCount, chunks.length)}`);
      for (let i = 0; i < chunks.length; i++) {
        await SecureStore.setItemAsync(`${key}.${i}`, chunks[i]);
      }
      for (let i = chunks.length; i < oldCount; i++) {
        await SecureStore.deleteItemAsync(`${key}.${i}`);
      }
      await SecureStore.setItemAsync(`${key}.count`, String(chunks.length));
    });
  },
  removeItem(key: string): Promise<void> {
    return serialized(async () => {
      const count = chunkCount(await SecureStore.getItemAsync(`${key}.count`));
      await SecureStore.setItemAsync(`${key}.count`, `pending:${count}`);
      for (let i = 0; i < count; i++) await SecureStore.deleteItemAsync(`${key}.${i}`);
      await SecureStore.deleteItemAsync(`${key}.count`);
    });
  },
};
