const API_URL = import.meta.env.VITE_API_URL || '/api';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = sessionStorage.getItem('accessToken');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers as Record<string, string>,
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    // Tenter un refresh si 401
    if (res.status === 401 && sessionStorage.getItem('refreshToken')) {
      const refreshed = await refreshTokens();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${sessionStorage.getItem('accessToken')}`;
        const retry = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
        const retryData = await retry.json();
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

    const data = await res.json();
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
  user: { id: string; username: string; email: string };
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

  getMe() {
    return request<{ id: string; username: string; email: string }>('/auth/me');
  },
};
