import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, type ScoreMode } from '../services/api.ts';

export function NewSheetPage() {
  const navigate = useNavigate();
  const [t1p1, setT1p1] = useState('');
  const [t1p2, setT1p2] = useState('');
  const [t2p1, setT2p1] = useState('');
  const [t2p2, setT2p2] = useState('');
  const [target, setTarget] = useState(1000);
  const [mode, setMode] = useState<ScoreMode>('points-faits');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate() {
    if (!t1p1.trim() || !t1p2.trim() || !t2p1.trim() || !t2p2.trim()) {
      setError('Renseigne les 4 noms');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.createSheet({
        team1Player1Name: t1p1.trim(),
        team1Player2Name: t1p2.trim(),
        team2Player1Name: t2p1.trim(),
        team2Player2Name: t2p2.trim(),
        targetScore: target,
        scoreMode: mode,
      });
      navigate(`/sheets/${res.id}`);
    } catch (e: any) {
      setError(e.message || 'Erreur');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1f0d] to-[#0c0c0c] p-4">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link to="/sheets" className="text-gray-400 hover:text-white">← Retour</Link>
          <h1 className="text-xl font-bold text-white">Nouvelle feuille</h1>
          <span className="w-12" />
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4 rounded-xl bg-[#121225] border border-[#2a2a3e] p-4">
          {/* Équipe 1 */}
          <div>
            <div className="text-sm text-blue-300 font-medium mb-2">Équipe 1</div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text" maxLength={32} value={t1p1} onChange={e => setT1p1(e.target.value)}
                placeholder="Joueur 1"
                className="px-3 py-2 rounded-lg bg-[#1a1a2e] border border-[#3a3a4e] text-white placeholder-gray-500 focus:outline-none focus:border-[#2d8f54]"
              />
              <input
                type="text" maxLength={32} value={t1p2} onChange={e => setT1p2(e.target.value)}
                placeholder="Joueur 2"
                className="px-3 py-2 rounded-lg bg-[#1a1a2e] border border-[#3a3a4e] text-white placeholder-gray-500 focus:outline-none focus:border-[#2d8f54]"
              />
            </div>
          </div>

          {/* Équipe 2 */}
          <div>
            <div className="text-sm text-orange-300 font-medium mb-2">Équipe 2</div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text" maxLength={32} value={t2p1} onChange={e => setT2p1(e.target.value)}
                placeholder="Joueur 3"
                className="px-3 py-2 rounded-lg bg-[#1a1a2e] border border-[#3a3a4e] text-white placeholder-gray-500 focus:outline-none focus:border-[#2d8f54]"
              />
              <input
                type="text" maxLength={32} value={t2p2} onChange={e => setT2p2(e.target.value)}
                placeholder="Joueur 4"
                className="px-3 py-2 rounded-lg bg-[#1a1a2e] border border-[#3a3a4e] text-white placeholder-gray-500 focus:outline-none focus:border-[#2d8f54]"
              />
            </div>
          </div>

          {/* Score cible */}
          <div>
            <label className="text-sm text-gray-300 font-medium mb-2 block">Score cible</label>
            <div className="grid grid-cols-4 gap-2">
              {[500, 1000, 1500, 2000].map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setTarget(v)}
                  className={`py-2 rounded-lg text-sm font-medium transition ${
                    target === v
                      ? 'bg-[#2d8f54] text-white'
                      : 'bg-[#1a1a2e] text-gray-400 border border-[#2a2a3e] hover:text-white'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
            <input
              type="number" min={100} max={5000} step={50}
              value={target} onChange={e => setTarget(Number(e.target.value))}
              className="mt-2 w-full px-3 py-2 rounded-lg bg-[#1a1a2e] border border-[#3a3a4e] text-white text-center"
            />
          </div>

          {/* Mode */}
          <div>
            <label className="text-sm text-gray-300 font-medium mb-2 block">Mode de saisie</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode('points-faits')}
                className={`p-3 rounded-lg text-sm transition text-left ${
                  mode === 'points-faits'
                    ? 'bg-[#2d8f54] text-white'
                    : 'bg-[#1a1a2e] text-gray-400 border border-[#2a2a3e] hover:text-white'
                }`}
              >
                <div className="font-semibold">Points faits</div>
                <div className="text-xs opacity-80 mt-0.5">Saisir les points pris à chaque manche</div>
              </button>
              <button
                type="button"
                onClick={() => setMode('points-annonces')}
                className={`p-3 rounded-lg text-sm transition text-left ${
                  mode === 'points-annonces'
                    ? 'bg-[#2d8f54] text-white'
                    : 'bg-[#1a1a2e] text-gray-400 border border-[#2a2a3e] hover:text-white'
                }`}
              >
                <div className="font-semibold">Points annoncés</div>
                <div className="text-xs opacity-80 mt-0.5">Indiquer juste si le contrat est tenu</div>
              </button>
            </div>
          </div>

          <button
            onClick={handleCreate}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-[#1a6b3c] hover:bg-[#2d8f54] text-white font-semibold transition disabled:opacity-50"
          >
            {loading ? 'Création...' : 'Créer la feuille'}
          </button>
        </div>
      </div>
    </div>
  );
}
