
import { offlineDb } from './offlineDb';
import { isDesktopApp } from './isDesktopApp';

export async function fetchWithCache<T>(
  apiUrl: string,
  table: string,
  query?: any
): Promise<{ data: T[]; fromCache: boolean }> {
  if (!isDesktopApp()) {
    // Browser: always fetch online
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error('API error');
    const data: T[] = await response.json();
    return { data, fromCache: false };
  }
  // Electron: enable offline caching
  if (navigator.onLine) {
    try {
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error('API error');
      const data: T[] = await response.json();
      // Save to IndexedDB
      // @ts-ignore
      await offlineDb?.[table]?.clear();
      // @ts-ignore
      await offlineDb?.[table]?.bulkPut(data);
      return { data, fromCache: false };
    } catch (error) {
      // Fallback to cache
      // @ts-ignore
      const cached = query ? await query.toArray() : await offlineDb?.[table]?.toArray();
      return { data: cached, fromCache: true };
    }
  } else {
    // Offline: read from cache
    // @ts-ignore
    const cached = query ? await query.toArray() : await offlineDb?.[table]?.toArray();
    return { data: cached, fromCache: true };
  }
}
