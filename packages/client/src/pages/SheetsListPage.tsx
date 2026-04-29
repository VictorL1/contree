import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, type ScoreSheetSummary } from '../services/api.ts';

const STATUS_LABEL: Record<string, string> = {
  'in-progress': 'En cours',
  'finished': 'Terminée',
};

export function SheetsListPage() {
  const navigate = useNavigate();
  const [sheets, setSheets] = useState<ScoreSheetSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'in-progress' | 'finished'>('all');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    try {
      const data = await api.listSheets();
      setSheets(data);
    } catch (e: any) {
      setError(e.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    try {
      const res = await api.joinSheet(code);
      navigate(`/sheets/${res.id}`);
    } catch (e: any) {
      setError(e.message || 'Code invalide');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer définitivement cette feuille ?')) return;
    try {
      await api.deleteSheet(id);
      setSheets(prev => prev.filter(s => s.id !== id));
    } catch (e: any) {
      setError(e.message || 'Erreur');
    }
  }

  const filtered = sheets.filter(s => filter === 'all' || s.status === filter);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1f0d] to-[#0c0c0c] p-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link to="/" className="text-gray-400 hover:text-white">← Accueil</Link>
          <h1 className="text-2xl font-bold text-white">📋 Feuilles de score</h1>
          <Link
            to="/sheets/new"
            className="px-4 py-2 rounded-lg bg-[#1a6b3c] hover:bg-[#2d8f54] text-white text-sm font-semibold"
          >
            + Nouvelle
          </Link>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Rejoindre via code */}
        <div className="mb-6 rounded-xl bg-[#121225] border border-[#2a2a3e] p-4">
          <div className="text-sm text-gray-300 font-medium mb-2">Rejoindre une feuille partagée</div>
          <div className="flex gap-2">
            <input
              type="text"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              maxLength={8}
              placeholder="Code de partage"
              className="flex-1 px-3 py-2 rounded-lg bg-[#1a1a2e] border border-[#3a3a4e] text-white text-center tracking-widest uppercase placeholder-gray-500 focus:outline-none focus:border-[#2d8f54]"
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
            />
            <button
              onClick={handleJoin}
              disabled={!joinCode.trim()}
              className="px-4 py-2 rounded-lg bg-[#2a2a3e] hover:bg-[#3a3a4e] text-white font-semibold disabled:opacity-50"
            >
              Rejoindre
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4">
          {(['all', 'in-progress', 'finished'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                filter === f
                  ? 'bg-[#2d8f54] text-white'
                  : 'bg-[#1a1a2e] text-gray-400 border border-[#2a2a3e] hover:text-white'
              }`}
            >
              {f === 'all' ? 'Toutes' : f === 'in-progress' ? 'En cours' : 'Terminées'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center text-gray-400 py-8">Chargement...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <div className="text-5xl mb-3">📒</div>
            <p>Aucune feuille pour le moment.</p>
            <Link to="/sheets/new" className="inline-block mt-4 text-[#2d8f54] hover:underline">
              Créer ma première feuille
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(s => {
              const total1 = s.players.team1[0] + ' & ' + s.players.team1[1];
              const total2 = s.players.team2[0] + ' & ' + s.players.team2[1];
              return (
                <div
                  key={s.id}
                  className="rounded-xl bg-[#121225] border border-[#2a2a3e] p-4 hover:border-[#2d8f54] transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      onClick={() => navigate(`/sheets/${s.id}`)}
                      className="flex-1 text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-semibold">{s.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          s.status === 'finished'
                            ? s.winningTeam === 1 ? 'bg-blue-500/20 text-blue-300' : 'bg-orange-500/20 text-orange-300'
                            : 'bg-emerald-500/20 text-emerald-300'
                        }`}>
                          {STATUS_LABEL[s.status]}
                          {s.status === 'finished' && s.winningTeam && ` · Équipe ${s.winningTeam} gagne`}
                        </span>
                        {!s.isOwner && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
                            Partagée par {s.ownerUsername}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        Équipe 1 : {total1} <span className="mx-1 text-gray-600">vs</span> Équipe 2 : {total2}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {s.roundCount} manche{s.roundCount > 1 ? 's' : ''} · Cible {s.targetScore} · Mode {s.scoreMode === 'points-faits' ? 'points faits' : 'points annoncés'}
                      </div>
                    </button>
                    {s.isOwner && (
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="text-gray-500 hover:text-red-400 text-sm px-2"
                        title="Supprimer"
                      >
                        🗑
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
