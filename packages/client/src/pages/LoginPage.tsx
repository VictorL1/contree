import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.tsx';
import { API_URL } from '../services/api.ts';

export function LoginPage() {
  const { login, loginAsGuest } = useAuth();
  const location = useLocation();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const access = params.get('oauth_access');
    const refresh = params.get('oauth_refresh');
    if (!access || !refresh) return;

    sessionStorage.setItem('accessToken', access);
    sessionStorage.setItem('refreshToken', refresh);
    window.location.replace('/');
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(loginId, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGuest() {
    setError('');
    setSubmitting(true);
    try {
      await loginAsGuest();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion invité');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#0a1f0d] to-[#0c0c0c]">
      <div className="w-full max-w-md p-8 rounded-2xl bg-[#1a1a2e] shadow-2xl border border-[#2a2a3e]">
        <h1 className="text-3xl font-bold text-center mb-2 text-white">♠ S'Contree</h1>
        <p className="text-center text-gray-400 mb-8">Connectez-vous pour jouer</p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="login" className="block text-sm font-medium text-gray-300 mb-1">Email ou pseudo</label>
            <input
              id="login"
              type="text"
              required
              value={loginId}
              onChange={e => setLoginId(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-[#0f0f1a] border border-[#3a3a4e] text-white placeholder-gray-500 focus:outline-none focus:border-[#2d8f54] transition"
              placeholder="votre@email.com ou pseudo"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">Mot de passe</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-[#0f0f1a] border border-[#3a3a4e] text-white placeholder-gray-500 focus:outline-none focus:border-[#2d8f54] transition"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-lg bg-[#1a6b3c] hover:bg-[#2d8f54] text-white font-semibold transition disabled:opacity-50 cursor-pointer"
          >
            {submitting ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <div className="mt-4 space-y-2">
          <button
            type="button"
            onClick={handleGuest}
            disabled={submitting}
            className="w-full py-3 rounded-lg bg-[#2a2a3e] hover:bg-[#3a3a4e] text-white font-medium transition disabled:opacity-50 cursor-pointer"
          >
            Jouer en invite
          </button>
          <button
            type="button"
            onClick={() => { window.location.href = `${API_URL}/auth/oauth/google/start`; }}
            className="w-full py-3 rounded-lg border border-[#3a3a4e] text-white hover:bg-[#222236] transition cursor-pointer"
          >
            Continuer avec Google
          </button>
        </div>

        <p className="mt-6 text-center text-gray-400 text-sm">
          Pas de compte ?{' '}
          <Link to="/register" state={location.state} className="text-[#2d8f54] hover:underline">Créer un compte</Link>
        </p>
      </div>
    </div>
  );
}
