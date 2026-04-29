// Petit utilitaire pour buffer des manches en attente de sync (mode offline simple).
// Stocké dans localStorage par sheet ID.
import type { AddRoundPayload } from './api.ts';

const PREFIX = 'contree:pending-rounds:';

export interface PendingRound {
  payload: AddRoundPayload;
  queuedAt: number;
}

function key(sheetId: string): string {
  return PREFIX + sheetId;
}

export function loadPending(sheetId: string): PendingRound[] {
  try {
    const raw = localStorage.getItem(key(sheetId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function pushPending(sheetId: string, payload: AddRoundPayload): void {
  const list = loadPending(sheetId);
  list.push({ payload, queuedAt: Date.now() });
  localStorage.setItem(key(sheetId), JSON.stringify(list));
}

export function clearPending(sheetId: string): void {
  localStorage.removeItem(key(sheetId));
}

export function popPending(sheetId: string): PendingRound | null {
  const list = loadPending(sheetId);
  const first = list.shift();
  if (!first) return null;
  if (list.length === 0) clearPending(sheetId);
  else localStorage.setItem(key(sheetId), JSON.stringify(list));
  return first;
}
