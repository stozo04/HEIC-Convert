import { get, set, update, del, entries } from 'idb-keyval';
import { HistoryRecord } from '../types';

const STORE_KEY = 'heic_conversion_history';

export async function saveToHistory(record: HistoryRecord) {
  try {
    const history = await get<HistoryRecord[]>(STORE_KEY) || [];
    history.unshift(record); // Add to beginning
    // Keep max 50 items to prevent huge storage usage
    if (history.length > 50) {
      history.length = 50;
    }
    await set(STORE_KEY, history);
  } catch (error) {
    console.error('Failed to save to history', error);
  }
}

export async function getHistory(): Promise<HistoryRecord[]> {
  try {
    return await get<HistoryRecord[]>(STORE_KEY) || [];
  } catch (error) {
    console.error('Failed to get history', error);
    return [];
  }
}

export async function clearHistory(): Promise<void> {
  try {
    await del(STORE_KEY);
  } catch (error) {
    console.error('Failed to clear history', error);
  }
}
