import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.tsx';
import { connectSocket } from '../services/socket.ts';
import { api } from '../services/api.ts';

export function HomePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [publicRooms, setPublicRooms] = useState<Array<{ code: string; name: string; players: number; inProgress: boolean }>>([]);

  useEffect(() => {
    api.getPublicRooms()
      .then((rooms) => setPublicRooms(rooms))
      .catch(() => setPublicRooms([]));
  }, []);

  function handleCreate() {
    setCreating(true);
    setError('');
    const socket = connectSocket();

    socket.emit('create-room', { targetScore: 1000 });

    socket.on('room-created', ({ roomCode }) => {
      navigate(`/lobby/${roomCode}`);
    });

    socket.on('error', ({ message }) => {
      setError(message);
      setCreating(false);
    });
  }

  function handleJoin() {
    if (!joinCode.trim()) return;
    navigate(`/lobby/${joinCode.trim().toUpperCase()}`);
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[#0a1f0d] to-[#0c0c0c] p-4">
      {/* Header */}
      <div className="absolute top-4 right-4 flex items-center gap-4">
        <span className="text-gray-400 text-sm">
          Bonjour, <span className="text-white font-medium">{user?.username}</span>
          {user?.isGuest && <span className="ml-2 text-yellow-400">(invite)</span>}
        </span>
        <button onClick={logout} className="text-sm text-gray-400 hover:text-white transition cursor-pointer">
          Déconnexion
        </button>
      </div>

      {/* Logo */}
      <div className="mb-12 text-center">
        <h1 className="text-5xl font-bold text-white mb-2">♠ S'Contree</h1>
        <p className="text-gray-400">Jeu de cartes en ligne</p>
      </div>

      {error && (
        <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm max-w-md w-full text-center">
          {error}
        </div>
      )}

      <div className="space-y-4 w-full max-w-md">
        {/* Créer un salon */}
        <button
          onClick={handleCreate}
          disabled={creating}
          className="w-full py-4 rounded-xl bg-[#1a6b3c] hover:bg-[#2d8f54] text-white text-lg font-semibold transition disabled:opacity-50 shadow-lg cursor-pointer"
        >
          {creating ? 'Création...' : 'Créer un salon'}
        </button>

        {/* Séparateur */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-[#2a2a3e]" />
          <span className="text-gray-500 text-sm">ou</span>
          <div className="flex-1 h-px bg-[#2a2a3e]" />
        </div>

        {/* Rejoindre un salon */}
        <div className="flex gap-3">
          <input
            type="text"
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            maxLength={6}
            placeholder="Code du salon"
            className="flex-1 px-4 py-3 rounded-lg bg-[#1a1a2e] border border-[#3a3a4e] text-white text-center text-lg tracking-widest uppercase placeholder-gray-500 focus:outline-none focus:border-[#2d8f54] transition"
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
          />
          <button
            onClick={handleJoin}
            disabled={!joinCode.trim()}
            className="px-6 py-3 rounded-lg bg-[#2a2a3e] hover:bg-[#3a3a4e] text-white font-semibold transition disabled:opacity-50 cursor-pointer"
          >
            Rejoindre
          </button>
        </div>

        {publicRooms.length > 0 && (
          <div className="rounded-xl bg-[#121225] border border-[#2a2a3e] p-3">
            <div className="text-sm text-gray-300 mb-2 font-medium">Salons publics</div>
            <div className="space-y-2">
              {publicRooms.map(room => (
                <button
                  key={room.code}
                  onClick={() => navigate(`/lobby/${room.code}`)}
                  className="w-full text-left px-3 py-2 rounded-lg bg-[#1a1a2e] hover:bg-[#2a2a3e] border border-[#2a2a3e] transition cursor-pointer"
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white font-medium">{room.name}</span>
                    <span className="text-gray-400">{room.players}/4</span>
                  </div>
                  <div className="text-xs text-gray-500">{room.code}{room.inProgress ? ' · en cours' : ' · en attente'}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Classement */}
        <Link
          to="/leaderboard"
          className="block w-full py-3 rounded-xl bg-[#1a1a2e] hover:bg-[#2a2a3e] text-gray-300 text-center font-medium border border-[#2a2a3e] transition"
        >
          🏆 Classement & Stats
        </Link>

        <Link
          to="/shop"
          className="block w-full py-3 rounded-xl bg-[#1a1a2e] hover:bg-[#2a2a3e] text-gray-300 text-center font-medium border border-[#2a2a3e] transition"
        >
          🛒 Boutique
        </Link>
      </div>
    </div>
  );
}
