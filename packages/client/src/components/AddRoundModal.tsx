import { useState, useEffect } from 'react';
import type { AddRoundPayload, ScoreMode, SheetBidType, SheetTrumpSuit } from '../services/api.ts';

const SUITS: { value: SheetTrumpSuit; label: string; color: string }[] = [
  { value: 'spades', label: '♠', color: 'text-white' },
  { value: 'hearts', label: '♥', color: 'text-red-400' },
  { value: 'diamonds', label: '♦', color: 'text-red-400' },
  { value: 'clubs', label: '♣', color: 'text-white' },
];

const BID_VALUES = [80, 90, 100, 110, 120, 130, 140, 150, 160];

export interface AddRoundModalProps {
  scoreMode: ScoreMode;
  team1Names: [string, string];
  team2Names: [string, string];
  onSubmit: (payload: AddRoundPayload) => Promise<void> | void;
  onCancel: () => void;
}

export function AddRoundModal({ scoreMode, team1Names, team2Names, onSubmit, onCancel }: AddRoundModalProps) {
  const [takerTeam, setTakerTeam] = useState<1 | 2>(1);
  const [bidType, setBidType] = useState<SheetBidType>('normal');
  const [bidValue, setBidValue] = useState<number>(80);
  const [trumpSuit, setTrumpSuit] = useState<SheetTrumpSuit>('hearts');
  const [contred, setContred] = useState(false);
  const [surcontred, setSurcontred] = useState(false);
  const [beloteTeam, setBeloteTeam] = useState<0 | 1 | 2>(0);
  const [notes, setNotes] = useState('');
  // points-faits
  const [takerTrickPoints, setTakerTrickPoints] = useState<number | ''>('');
  const [capotMade, setCapotMade] = useState(false);
  // points-annonces
  const [contractMet, setContractMet] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!contred) setSurcontred(false);
  }, [contred]);

  // Pré-remplit selon capot/générale
  useEffect(() => {
    if (bidType === 'capot' || bidType === 'generale') {
      setCapotMade(true);
      setTakerTrickPoints(162);
    }
  }, [bidType]);

  async function handleSubmit() {
    setError('');
    if (scoreMode === 'points-faits') {
      const v = Number(takerTrickPoints);
      if (!Number.isFinite(v) || v < 0 || v > 162) {
        setError('Points faits par le preneur : 0 à 162');
        return;
      }
    }
    setSubmitting(true);
    try {
      const payload: AddRoundPayload = {
        takerTeam,
        bidType,
        bidValue: bidType === 'normal' ? bidValue : undefined,
        trumpSuit,
        contred,
        surcontred,
        beloteTeam: beloteTeam === 0 ? null : beloteTeam,
        notes: notes.trim() || null,
        ...(scoreMode === 'points-faits'
          ? { takerTrickPoints: Number(takerTrickPoints), capotMade }
          : { contractMet }),
      };
      await onSubmit(payload);
    } catch (e: any) {
      setError(e.message || 'Erreur');
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-[#0c0c0c] border border-[#2a2a3e] rounded-t-2xl sm:rounded-2xl max-w-md w-full max-h-[95vh] overflow-y-auto">
        <div className="sticky top-0 bg-[#0c0c0c] border-b border-[#2a2a3e] px-4 py-3 flex items-center justify-between">
          <h2 className="text-white font-semibold">Ajouter une manche</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-white text-xl">✕</button>
        </div>

        <div className="p-4 space-y-4">
          {/* Preneur */}
          <div>
            <label className="text-xs text-gray-400 font-medium mb-1.5 block">Équipe preneuse</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button" onClick={() => setTakerTeam(1)}
                className={`p-2 rounded-lg text-sm transition ${
                  takerTeam === 1 ? 'bg-blue-500/30 border border-blue-400 text-white' : 'bg-[#1a1a2e] border border-[#2a2a3e] text-gray-400'
                }`}
              >
                Équipe 1<br/><span className="text-xs opacity-70">{team1Names[0]} & {team1Names[1]}</span>
              </button>
              <button
                type="button" onClick={() => setTakerTeam(2)}
                className={`p-2 rounded-lg text-sm transition ${
                  takerTeam === 2 ? 'bg-orange-500/30 border border-orange-400 text-white' : 'bg-[#1a1a2e] border border-[#2a2a3e] text-gray-400'
                }`}
              >
                Équipe 2<br/><span className="text-xs opacity-70">{team2Names[0]} & {team2Names[1]}</span>
              </button>
            </div>
          </div>

          {/* Atout */}
          <div>
            <label className="text-xs text-gray-400 font-medium mb-1.5 block">Atout</label>
            <div className="grid grid-cols-4 gap-2">
              {SUITS.map(s => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setTrumpSuit(s.value)}
                  className={`py-2 rounded-lg text-2xl transition ${s.color} ${
                    trumpSuit === s.value ? 'bg-[#2d8f54] ring-2 ring-white/30' : 'bg-[#1a1a2e] border border-[#2a2a3e]'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Type de contrat */}
          <div>
            <label className="text-xs text-gray-400 font-medium mb-1.5 block">Contrat</label>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {(['normal', 'capot', 'generale'] as SheetBidType[]).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setBidType(t)}
                  className={`py-2 rounded-lg text-sm font-medium transition ${
                    bidType === t ? 'bg-[#2d8f54] text-white' : 'bg-[#1a1a2e] text-gray-400 border border-[#2a2a3e]'
                  }`}
                >
                  {t === 'normal' ? 'Normal' : t === 'capot' ? 'Capot (250)' : 'Générale (500)'}
                </button>
              ))}
            </div>
            {bidType === 'normal' && (
              <div className="grid grid-cols-5 gap-1.5">
                {BID_VALUES.map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setBidValue(v)}
                    className={`py-1.5 rounded text-sm font-medium transition ${
                      bidValue === v ? 'bg-[#2d8f54] text-white' : 'bg-[#1a1a2e] text-gray-400 border border-[#2a2a3e]'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Contre / Surcontre */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setContred(!contred)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                contred ? 'bg-yellow-500/30 border border-yellow-400 text-white' : 'bg-[#1a1a2e] text-gray-400 border border-[#2a2a3e]'
              }`}
            >
              {contred ? '✓ ' : ''}Contré (×2)
            </button>
            <button
              type="button"
              disabled={!contred}
              onClick={() => setSurcontred(!surcontred)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition disabled:opacity-40 ${
                surcontred ? 'bg-red-500/30 border border-red-400 text-white' : 'bg-[#1a1a2e] text-gray-400 border border-[#2a2a3e]'
              }`}
            >
              {surcontred ? '✓ ' : ''}Surcontré (×4)
            </button>
          </div>

          {/* Belote */}
          <div>
            <label className="text-xs text-gray-400 font-medium mb-1.5 block">Belote-rebelote (+20)</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { v: 0 as const, label: 'Aucune' },
                { v: 1 as const, label: 'Équipe 1' },
                { v: 2 as const, label: 'Équipe 2' },
              ].map(o => (
                <button
                  key={o.v}
                  type="button"
                  onClick={() => setBeloteTeam(o.v)}
                  className={`py-2 rounded-lg text-sm transition ${
                    beloteTeam === o.v ? 'bg-[#2d8f54] text-white' : 'bg-[#1a1a2e] text-gray-400 border border-[#2a2a3e]'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Mode points-faits OU points-annoncés */}
          {scoreMode === 'points-faits' ? (
            <div>
              <label className="text-xs text-gray-400 font-medium mb-1.5 block">
                Points faits par l'équipe preneuse (sur 162)
              </label>
              <input
                type="number" min={0} max={162}
                value={takerTrickPoints}
                onChange={e => setTakerTrickPoints(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0 - 162"
                className="w-full px-3 py-2 rounded-lg bg-[#1a1a2e] border border-[#3a3a4e] text-white text-center text-lg focus:outline-none focus:border-[#2d8f54]"
              />
              {(bidType === 'capot' || bidType === 'generale') && (
                <label className="mt-2 flex items-center gap-2 text-sm text-gray-300">
                  <input type="checkbox" checked={capotMade} onChange={e => setCapotMade(e.target.checked)} />
                  Capot/Générale réussi(e)
                </label>
              )}
            </div>
          ) : (
            <div>
              <label className="text-xs text-gray-400 font-medium mb-1.5 block">Résultat du contrat</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setContractMet(true)}
                  className={`py-2 rounded-lg text-sm font-medium transition ${
                    contractMet ? 'bg-emerald-500/30 border border-emerald-400 text-white' : 'bg-[#1a1a2e] text-gray-400 border border-[#2a2a3e]'
                  }`}
                >
                  ✓ Contrat tenu
                </button>
                <button
                  type="button"
                  onClick={() => setContractMet(false)}
                  className={`py-2 rounded-lg text-sm font-medium transition ${
                    !contractMet ? 'bg-red-500/30 border border-red-400 text-white' : 'bg-[#1a1a2e] text-gray-400 border border-[#2a2a3e]'
                  }`}
                >
                  ✗ Chute
                </button>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-xs text-gray-400 font-medium mb-1.5 block">Notes (optionnel)</label>
            <input
              type="text" maxLength={200}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Remarque sur la manche..."
              className="w-full px-3 py-2 rounded-lg bg-[#1a1a2e] border border-[#3a3a4e] text-white placeholder-gray-500 focus:outline-none focus:border-[#2d8f54]"
            />
          </div>

          {error && <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}

          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-lg bg-[#1a1a2e] border border-[#2a2a3e] text-gray-300 font-medium hover:text-white"
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 py-2.5 rounded-lg bg-[#1a6b3c] hover:bg-[#2d8f54] text-white font-semibold disabled:opacity-50"
            >
              {submitting ? '...' : 'Valider'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
