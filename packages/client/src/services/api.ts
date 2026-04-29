const DEFAULT_BACKEND_URL = 'https://contree-server.onrender.com/api';
export const API_URL = import.meta.env.VITE_API_URL || DEFAULT_BACKEND_URL;

async function readJsonSafe(res: Response): Promise<any> {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await res.text();
    throw new Error(
      `Réponse non JSON du serveur API (${res.status}). Vérifie VITE_API_URL. Début: ${text.slice(0, 60)}`
    );
  }
  return res.json();
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = sessionStorage.getItem('accessToken');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers as Record<string, string>,
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
  const data = await readJsonSafe(res);

  if (!res.ok) {
    // Tenter un refresh si 401
    if (res.status === 401 && sessionStorage.getItem('refreshToken')) {
      const refreshed = await refreshTokens();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${sessionStorage.getItem('accessToken')}`;
        const retry = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
        const retryData = await readJsonSafe(retry);
        if (retry.ok) return retryData;
      }
    }
    throw new Error(data.error || 'Erreur serveur');
  }

  return data;
}

async function refreshTokens(): Promise<boolean> {
  try {
    const refreshToken = sessionStorage.getItem('refreshToken');
    if (!refreshToken) return false;

    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      sessionStorage.removeItem('accessToken');
      sessionStorage.removeItem('refreshToken');
      return false;
    }

    const data = await readJsonSafe(res);
    sessionStorage.setItem('accessToken', data.accessToken);
    sessionStorage.setItem('refreshToken', data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: { id: string; username: string; email: string; isGuest?: boolean };
}

export const api = {
  register(email: string, username: string, password: string) {
    return request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, username, password }),
    });
  },

  login(login: string, password: string) {
    return request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ login, password }),
    });
  },

  guestLogin() {
    return request<AuthResponse>('/auth/guest', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  getMe() {
    return request<{ id: string; username: string; email: string; isGuest?: boolean }>('/auth/me');
  },

  getPublicRooms() {
    return request<Array<{ code: string; name: string; players: number; targetScore: number; inProgress: boolean }>>('/rooms/public');
  },

  getLeaderboard() {
    return request<LeaderboardEntry[]>('/stats/leaderboard');
  },

  getMyStats() {
    return request<PlayerStats>('/stats/me');
  },

  getCosmetics() {
    return request<CosmeticItem[]>('/stats/cosmetics');
  },

  buyCosmetic(itemId: string) {
    return request<{ success: boolean; remainingPoints: number }>('/stats/cosmetics/buy', {
      method: 'POST',
      body: JSON.stringify({ itemId }),
    });
  },

  equipCosmetic(itemName: string, category: string) {
    return request<{ success: boolean }>('/stats/cosmetics/equip', {
      method: 'POST',
      body: JSON.stringify({ itemName, category }),
    });
  },

  // ==========================================================
  // Score sheets (parties physiques)
  // ==========================================================
  listSheets() {
    return request<ScoreSheetSummary[]>('/sheets');
  },
  createSheet(payload: CreateSheetPayload) {
    return request<{ id: string; shareCode: string; name: string }>('/sheets', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  getSheet(id: string) {
    return request<ScoreSheetDetail>(`/sheets/${id}`);
  },
  addRound(id: string, payload: AddRoundPayload) {
    return request<{ round: ScoreSheetRound; status: string; winningTeam: number | null; finishedAt: string | null }>(
      `/sheets/${id}/rounds`,
      { method: 'POST', body: JSON.stringify(payload) },
    );
  },
  deleteLastRound(id: string) {
    return request<{ success: boolean }>(`/sheets/${id}/rounds/last`, { method: 'DELETE' });
  },
  finishSheet(id: string) {
    return request<{ success: boolean }>(`/sheets/${id}/finish`, { method: 'POST' });
  },
  deleteSheet(id: string) {
    return request<{ success: boolean }>(`/sheets/${id}`, { method: 'DELETE' });
  },
  joinSheet(shareCode: string) {
    return request<{ id: string; name: string }>(`/sheets/join/${shareCode.toUpperCase()}`, { method: 'POST' });
  },
};

export interface LeaderboardEntry {
  rank: number;
  username: string;
  victoryPoints: number;
  gamesPlayed: number;
  gamesWon: number;
  winRate: number;
}

export interface PlayerStats {
  stats: {
    gamesPlayed: number;
    gamesWon: number;
    totalPoints: number;
    victoryPoints: number;
    highestBid: number;
  } | null;
  partners: {
    partnerName: string;
    gamesPlayed: number;
    gamesWon: number;
    totalPoints: number;
  }[];
  equipped: {
    border: string;
    table: string;
    cardBack: string;
  };
}

export interface CosmeticItem {
  id: string;
  name: string;
  displayName: string;
  category: string;
  cost: number;
  preview: string;
}

// ============================================================
// Score sheets
// ============================================================
export type ScoreMode = 'points-faits' | 'points-annonces';
export type SheetStatus = 'in-progress' | 'finished';
export type SheetTrumpSuit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
export type SheetBidType = 'normal' | 'capot' | 'generale';

export interface ScoreSheetSummary {
  id: string;
  name: string;
  shareCode: string;
  createdAt: string;
  updatedAt: string;
  finishedAt: string | null;
  status: SheetStatus;
  winningTeam: number | null;
  targetScore: number;
  scoreMode: ScoreMode;
  ownerUsername: string;
  isOwner: boolean;
  roundCount: number;
  players: {
    team1: [string, string];
    team2: [string, string];
  };
}

export interface ScoreSheetRound {
  id: string;
  sheetId: string;
  index: number;
  takerTeam: 1 | 2;
  bidValue: number;
  bidType: SheetBidType;
  trumpSuit: SheetTrumpSuit;
  contred: boolean;
  surcontred: boolean;
  team1Points: number;
  team2Points: number;
  beloteTeam: number | null;
  contractMet: boolean;
  notes: string | null;
  createdAt: string;
}

export interface ScoreSheetDetail {
  id: string;
  name: string;
  shareCode: string;
  createdAt: string;
  updatedAt: string;
  finishedAt: string | null;
  status: SheetStatus;
  winningTeam: number | null;
  targetScore: number;
  scoreMode: ScoreMode;
  isOwner: boolean;
  ownerUsername: string;
  players: {
    team1: [string, string];
    team2: [string, string];
    team1UserIds: [string | null, string | null];
    team2UserIds: [string | null, string | null];
  };
  rounds: ScoreSheetRound[];
}

export interface CreateSheetPayload {
  team1Player1Name: string;
  team1Player2Name: string;
  team2Player1Name: string;
  team2Player2Name: string;
  targetScore: number;
  scoreMode: ScoreMode;
}

export interface AddRoundPayload {
  takerTeam: 1 | 2;
  bidType: SheetBidType;
  bidValue?: number;
  trumpSuit: SheetTrumpSuit;
  contred: boolean;
  surcontred: boolean;
  beloteTeam: 1 | 2 | null;
  notes?: string | null;
  // Mode points-faits :
  takerTrickPoints?: number;
  capotMade?: boolean;
  // Mode points-annonces :
  contractMet?: boolean;
}
