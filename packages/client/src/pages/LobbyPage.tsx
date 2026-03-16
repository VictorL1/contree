import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Position, getPartner } from '@contree/shared';
import { connectSocket, getSocket } from '../services/socket.ts';

interface PlayerInfo {
  position: Position;
  username: string;
}

const POSITION_LABELS: Record<Position, string> = {
  [Position.South]: 'Sud',
  [Position.West]: 'Ouest',
  [Position.North]: 'Nord',
  [Position.East]: 'Est',
};

const POSITION_STYLES: Record<Position, string> = {
  [Position.South]: 'bottom-4 left-1/2 -translate-x-1/2',
  [Position.West]: 'left-4 top-1/2 -translate-y-1/2',
  [Position.North]: 'top-4 left-1/2 -translate-x-1/2',
  [Position.East]: 'right-4 top-1/2 -translate-y-1/2',
};

export function LobbyPage() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [myPosition, setMyPosition] = useState<Position | null>(null);
  const [showQr, setShowQr] = useState(false);

  useEffect(() => {
    const socket = connectSocket();

    // Rejoindre le salon
    socket.emit('join-room', { roomCode: roomCode! });

    socket.on('room-joined', ({ players: p, yourPosition }) => {
      setPlayers(p);
      setMyPosition(yourPosition);
    });

    socket.on('player-joined', ({ position, username }) => {
      setPlayers(prev => [...prev, { position, username }]);
    });

    socket.on('player-left', ({ position }) => {
      setPlayers(prev => prev.filter(p => p.position !== position));
    });

    socket.on('game-started', () => {
      navigate(`/game/${roomCode}`, { replace: true });
    });

    socket.on('error', ({ message }) => {
      setError(message);
    });

    return () => {
      socket.off('room-joined');
      socket.off('player-joined');
      socket.off('player-left');
      socket.off('game-started');
      socket.off('error');
    };
  }, [roomCode, navigate]);

  function handleReady() {
    getSocket().emit('player-ready');
  }

  function handleSelectSeat(position: Position) {
    getSocket().emit('select-seat', { position });
  }

  function handleCopyCode() {
    navigator.clipboard.writeText(roomCode!);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleCopyLink() {
    const link = `${window.location.origin}/lobby/${roomCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const inviteLink = `${window.location.origin}/lobby/${roomCode}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(inviteLink)}`;

  const allPositions = [Position.South, Position.West, Position.North, Position.East];
  const partnerPosition = myPosition ? getPartner(myPosition) : null;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[#0a1f0d] to-[#0c0c0c] p-4">
      <h2 className="text-2xl font-bold text-white mb-2">Salon de jeu</h2>

      {/* Code du salon */}
      <button
        onClick={handleCopyCode}
        className="mb-2 px-6 py-2 rounded-lg bg-[#1a1a2e] border border-[#3a3a4e] text-white text-2xl tracking-[0.3em] font-mono hover:border-[#2d8f54] transition cursor-pointer"
        title="Copier le code"
      >
        {roomCode} {copied ? '✓' : '📋'}
      </button>

      {/* Lien de partage */}
      <button
        onClick={handleCopyLink}
        className="mb-2 px-4 py-1.5 rounded-lg bg-[#2a2a3e] hover:bg-[#3a3a4e] text-gray-300 text-sm transition cursor-pointer"
      >
        🔗 Copier le lien d'invitation
      </button>
      <button
        onClick={() => setShowQr(true)}
        className="mb-8 px-4 py-1.5 rounded-lg bg-[#2a2a3e] hover:bg-[#3a3a4e] text-gray-300 text-sm transition cursor-pointer"
      >
        📱 Afficher le QR code
      </button>

      <AnimatePresence>
        {showQr && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div className="bg-[#1a1a2e] border border-[#3a3a4e] rounded-2xl p-5 w-full max-w-sm text-center">
              <h3 className="text-white text-lg font-semibold mb-2">Rejoindre rapidement</h3>
              <p className="text-gray-400 text-xs mb-4">Scannez ce QR code pour ouvrir directement le salon.</p>
              <img src={qrUrl} alt="QR code invitation salon" className="w-64 h-64 mx-auto rounded-lg bg-white p-2" />
              <p className="text-gray-500 text-[11px] mt-3 break-all">{inviteLink}</p>
              <button
                onClick={() => setShowQr(false)}
                className="mt-4 px-4 py-2 rounded-lg bg-[#1a6b3c] hover:bg-[#2d8f54] text-white text-sm cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Table avec positions */}
      <div className="relative w-80 h-80 mb-8">
        {/* Tapis de jeu */}
        <div className="absolute inset-0 rounded-2xl bg-[#145830] border-4 border-[#0f4d2a] shadow-2xl" />

        {/* Positions des joueurs */}
        <AnimatePresence>
          {allPositions.map(pos => {
            const player = players.find(p => p.position === pos);
            return (
              <motion.div
                key={pos}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`absolute ${POSITION_STYLES[pos]}`}
              >
                <div className={`px-4 py-2 rounded-lg text-center text-sm font-medium ${
                  player
                    ? 'bg-[#1a6b3c] text-white border border-[#2d8f54]'
                    : 'bg-[#1a1a2e]/80 text-gray-500 border border-dashed border-gray-600'
                }`}>
                  <div className="text-xs text-gray-400 mb-0.5">{POSITION_LABELS[pos]}</div>
                  {player ? player.username : 'En attente...'}
                  {!player && (
                    <button
                      onClick={() => handleSelectSeat(pos)}
                      className="mt-1 w-full text-[10px] px-2 py-0.5 rounded bg-[#2a2a3e] hover:bg-[#3a3a4e] text-gray-200 cursor-pointer"
                    >
                      Prendre ce siege
                    </button>
                  )}
                  {myPosition === pos && (
                    <div className="text-[10px] text-yellow-300 mt-1">Vous</div>
                  )}
                  {partnerPosition === pos && (
                    <div className="text-[10px] text-cyan-300 mt-1">Votre partenaire</div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <p className="text-gray-400 text-sm mb-4">
        {players.length}/4 joueurs — Partagez le code avec vos amis !
      </p>

      {players.length === 4 && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          onClick={handleReady}
          className="px-8 py-3 rounded-xl bg-[#d4a843] hover:bg-[#e0b84d] text-black font-bold text-lg transition shadow-lg cursor-pointer"
        >
          Lancer la partie !
        </motion.button>
      )}
    </div>
  );
}
