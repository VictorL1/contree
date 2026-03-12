import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type LeaderboardEntry, type PlayerStats } from '../services/api.ts';
import { useAuth } from '../contexts/AuthContext.tsx';

export function LeaderboardPage() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [myStats, setMyStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'leaderboard' | 'stats'>('leaderboard');

  useEffect(() => {
    Promise.all([api.getLeaderboard(), api.getMyStats()])
      .then(([lb, stats]) => {
        setLeaderboard(lb);
        setMyStats(stats);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#0a1f0d] to-[#0c0c0c]">
        <div className="text-gray-400 text-lg">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1f0d] to-[#0c0c0c] p-4">
      {/* Header */}
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">♠ Classement</h1>
          <Link to="/" className="text-gray-400 hover:text-white text-sm transition">
            ← Retour
          </Link>
        </div>

        {/* My quick stats banner */}
        {myStats?.stats && (
          <div className="bg-[#1a1a2e] rounded-xl p-4 border border-[#2a2a3e] mb-6 flex items-center justify-between">
            <div>
              <span className="text-white font-semibold">{user?.username}</span>
              <div className="text-gray-400 text-sm mt-1">
                {myStats.stats.gamesPlayed} parties · {myStats.stats.gamesWon} victoires
              </div>
            </div>
            <div className="text-right">
              <div className="text-[#d4a843] text-2xl font-bold">{myStats.stats.victoryPoints}</div>
              <div className="text-gray-500 text-xs">points de victoire</div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-4">
          <button
            onClick={() => setTab('leaderboard')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition cursor-pointer ${
              tab === 'leaderboard'
                ? 'bg-[#1a6b3c] text-white'
                : 'bg-[#1a1a2e] text-gray-400 hover:text-white'
            }`}
          >
            Classement
          </button>
          <button
            onClick={() => setTab('stats')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition cursor-pointer ${
              tab === 'stats'
                ? 'bg-[#1a6b3c] text-white'
                : 'bg-[#1a1a2e] text-gray-400 hover:text-white'
            }`}
          >
            Mes stats
          </button>
        </div>

        {/* Leaderboard tab */}
        {tab === 'leaderboard' && (
          <div className="bg-[#1a1a2e] rounded-xl border border-[#2a2a3e] overflow-hidden">
            <div className="grid grid-cols-[3rem_1fr_5rem_5rem_5rem] gap-2 px-4 py-2 border-b border-[#2a2a3e] text-xs text-gray-500 uppercase tracking-wider">
              <span>#</span>
              <span>Joueur</span>
              <span className="text-right">PV</span>
              <span className="text-right">V/D</span>
              <span className="text-right">Win%</span>
            </div>
            {leaderboard.length === 0 && (
              <div className="px-4 py-8 text-center text-gray-500">Aucune donnée disponible</div>
            )}
            {leaderboard.map((entry) => (
              <div
                key={entry.username}
                className={`grid grid-cols-[3rem_1fr_5rem_5rem_5rem] gap-2 px-4 py-2.5 border-b border-[#2a2a3e]/50 last:border-none ${
                  entry.username === user?.username ? 'bg-[#1a6b3c]/20' : ''
                }`}
              >
                <span className={`font-bold ${
                  entry.rank === 1 ? 'text-[#d4a843]' :
                  entry.rank === 2 ? 'text-gray-300' :
                  entry.rank === 3 ? 'text-orange-400' : 'text-gray-500'
                }`}>
                  {entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : entry.rank}
                </span>
                <span className="text-white font-medium truncate">{entry.username}</span>
                <span className="text-[#d4a843] font-bold text-right">{entry.victoryPoints}</span>
                <span className="text-gray-300 text-right text-sm">{entry.gamesWon}/{entry.gamesPlayed}</span>
                <span className="text-gray-400 text-right text-sm">{entry.winRate}%</span>
              </div>
            ))}
          </div>
        )}

        {/* My stats tab */}
        {tab === 'stats' && myStats && (
          <div className="space-y-4">
            {/* Stats cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Parties jouées" value={myStats.stats?.gamesPlayed ?? 0} />
              <StatCard label="Victoires" value={myStats.stats?.gamesWon ?? 0} color="text-[#2d8f54]" />
              <StatCard label="Points victoire" value={myStats.stats?.victoryPoints ?? 0} color="text-[#d4a843]" />
              <StatCard
                label="Taux de victoire"
                value={`${myStats.stats && myStats.stats.gamesPlayed > 0
                  ? Math.round((myStats.stats.gamesWon / myStats.stats.gamesPlayed) * 100)
                  : 0}%`}
              />
            </div>

            {/* Partners */}
            <div className="bg-[#1a1a2e] rounded-xl border border-[#2a2a3e] p-4">
              <h3 className="text-white font-semibold mb-3">Meilleurs coéquipiers</h3>
              {myStats.partners.length === 0 && (
                <p className="text-gray-500 text-sm">Aucune partie avec partenaire enregistrée</p>
              )}
              {myStats.partners.map((p) => (
                <div key={p.partnerName} className="flex items-center justify-between py-2 border-b border-[#2a2a3e]/50 last:border-none">
                  <div>
                    <span className="text-white font-medium">{p.partnerName}</span>
                    <span className="text-gray-500 text-xs ml-2">{p.gamesPlayed} parties</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[#2d8f54] font-bold">{p.gamesWon}W</span>
                    <span className="text-gray-500 text-xs ml-2">
                      {p.gamesPlayed > 0 ? Math.round((p.gamesWon / p.gamesPlayed) * 100) : 0}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color = 'text-white' }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="bg-[#1a1a2e] rounded-xl border border-[#2a2a3e] p-3 text-center">
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      <div className="text-gray-500 text-xs mt-1">{label}</div>
    </div>
  );
}
