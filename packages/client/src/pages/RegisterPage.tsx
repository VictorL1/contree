import { useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.tsx';
import { API_URL } from '../services/api.ts';

export function RegisterPage() {
  const { register, loginAsGuest } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    if (password.length < 6) {
      setError('Le mot de passe doit faire au moins 6 caractères');
      return;
    }
    if (username.length < 3) {
      setError('Le pseudo doit faire au moins 3 caractères');
      return;
    }

    setSubmitting(true);
    try {
      await register(email, username, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'inscription");
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
        <p className="text-center text-gray-400 mb-8">Créer un compte</p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-[#0f0f1a] border border-[#3a3a4e] text-white placeholder-gray-500 focus:outline-none focus:border-[#2d8f54] transition"
              placeholder="votre@email.com"
            />
          </div>

          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-1">Pseudo</label>
            <input
              id="username"
              type="text"
              required
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-[#0f0f1a] border border-[#3a3a4e] text-white placeholder-gray-500 focus:outline-none focus:border-[#2d8f54] transition"
              placeholder="Mon pseudo"
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

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-1">Confirmer le mot de passe</label>
            <input
              id="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-[#0f0f1a] border border-[#3a3a4e] text-white placeholder-gray-500 focus:outline-none focus:border-[#2d8f54] transition"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-lg bg-[#1a6b3c] hover:bg-[#2d8f54] text-white font-semibold transition disabled:opacity-50 cursor-pointer"
          >
            {submitting ? 'Inscription...' : "S'inscrire"}
          </button>
        </form>

        <div className="mt-4 space-y-2">
          <button
            type="button"
            onClick={() => { window.location.href = `${API_URL}/auth/oauth/google/start`; }}
            className="w-full py-3 rounded-lg border border-[#3a3a4e] text-white hover:bg-[#222236] transition cursor-pointer"
          >
            S'inscrire avec Google
          </button>
          <button
            type="button"
            onClick={handleGuest}
            disabled={submitting}
            className="w-full py-3 rounded-lg bg-[#2a2a3e] hover:bg-[#3a3a4e] text-white font-medium transition disabled:opacity-50 cursor-pointer"
          >
            Jouer en invite
          </button>
        </div>

        <p className="mt-6 text-center text-gray-400 text-sm">
          Déjà un compte ?{' '}
          <Link to="/login" state={location.state} className="text-[#2d8f54] hover:underline">Se connecter</Link>
        </p>
      </div>
    </div>
  );
}
