import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, type ScoreSheetDetail, type ScoreSheetRound, type AddRoundPayload, type SheetTrumpSuit } from '../services/api.ts';
import { AddRoundModal } from '../components/AddRoundModal.tsx';
import { loadPending, popPending, pushPending } from '../services/sheetOffline.ts';

const SUIT_SYMBOL: Record<SheetTrumpSuit, string> = {
  spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣',
};
const SUIT_COLOR: Record<SheetTrumpSuit, string> = {
  spades: 'text-white', clubs: 'text-white', hearts: 'text-red-400', diamonds: 'text-red-400',
};

function bidLabel(r: ScoreSheetRound): string {
  if (r.bidType === 'capot') return 'Capot';
  if (r.bidType === 'generale') return 'Générale';
  return String(r.bidValue);
}

function teamLabel(t: number, names: [string, string]): string {
  return `Éq.${t} (${names[0]} & ${names[1]})`;
}

function cumulativeTotals(rounds: ScoreSheetRound[]): { team1: number[]; team2: number[]; final1: number; final2: number } {
  const t1: number[] = [];
  const t2: number[] = [];
  let s1 = 0, s2 = 0;
  for (const r of rounds) {
    s1 += r.team1Points;
    s2 += r.team2Points;
    t1.push(s1);
    t2.push(s2);
  }
  return { team1: t1, team2: t2, final1: s1, final2: s2 };
}

export function SheetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [sheet, setSheet] = useState<ScoreSheetDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncBusy, setSyncBusy] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (id) refresh(); }, [id]);

  useEffect(() => {
    if (id) setPendingCount(loadPending(id).length);
  }, [id, sheet?.rounds.length]);

  // Try sync pending rounds when back online
  useEffect(() => {
    function onOnline() { trySyncPending(); }
    window.addEventListener('online', onOnline);
    if (navigator.onLine) trySyncPending();
    return () => window.removeEventListener('online', onOnline);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function refresh() {
    if (!id) return;
    setLoading(true);
    try {
      const data = await api.getSheet(id);
      setSheet(data);
      setError('');
    } catch (e: any) {
      setError(e.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  }

  async function trySyncPending() {
    if (!id || syncBusy) return;
    let pending = loadPending(id);
    if (pending.length === 0) return;
    setSyncBusy(true);
    try {
      while (pending.length > 0) {
        const item = pending[0];
        try {
          await api.addRound(id, item.payload);
          popPending(id);
          pending = loadPending(id);
        } catch {
          break;
        }
      }
      setPendingCount(loadPending(id).length);
      await refresh();
    } finally {
      setSyncBusy(false);
    }
  }

  async function handleAddRound(payload: AddRoundPayload) {
    if (!id) return;
    try {
      await api.addRound(id, payload);
      setShowAdd(false);
      await refresh();
    } catch (e: any) {
      // Mode offline simple : on stocke localement
      if (!navigator.onLine || /failed to fetch|networkerror/i.test(e.message || '')) {
        pushPending(id, payload);
        setPendingCount(loadPending(id).length);
        setShowAdd(false);
        return;
      }
      throw e;
    }
  }

  async function handleUndoLast() {
    if (!sheet || !id) return;
    if (!confirm('Annuler la dernière manche ?')) return;
    try {
      await api.deleteLastRound(id);
      await refresh();
    } catch (e: any) {
      setError(e.message || 'Erreur');
    }
  }

  async function handleFinish() {
    if (!sheet || !id) return;
    if (!confirm('Clôturer la partie maintenant ?')) return;
    try {
      await api.finishSheet(id);
      await refresh();
    } catch (e: any) {
      setError(e.message || 'Erreur');
    }
  }

  async function handleDelete() {
    if (!sheet || !id) return;
    if (!confirm('Supprimer définitivement la feuille ?')) return;
    try {
      await api.deleteSheet(id);
      navigate('/sheets');
    } catch (e: any) {
      setError(e.message || 'Erreur');
    }
  }

  function handleCopyShareCode() {
    if (!sheet) return;
    navigator.clipboard?.writeText(sheet.shareCode);
  }

  async function handleExportPng() {
    if (!sheet) return;
    await exportSheetAsPng(sheet);
  }

  const totals = useMemo(() => sheet ? cumulativeTotals(sheet.rounds) : null, [sheet]);
  const stats = useMemo(() => sheet ? computeStats(sheet) : null, [sheet]);
  const dealerIndex = sheet ? sheet.rounds.length % 4 : 0;
  const dealerLabels = sheet
    ? [sheet.players.team1[0], sheet.players.team2[0], sheet.players.team1[1], sheet.players.team2[1]]
    : [];

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#0c0c0c] text-gray-400">Chargement...</div>;
  }
  if (!sheet) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0c0c0c] text-gray-400">
        <p>{error || 'Feuille introuvable'}</p>
        <Link to="/sheets" className="mt-4 text-emerald-400 hover:underline">← Retour à la liste</Link>
      </div>
    );
  }

  const inviteUrl = `${window.location.origin}/sheets/join/${sheet.shareCode}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(inviteUrl)}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1f0d] to-[#0c0c0c] p-3 sm:p-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4 gap-2">
          <Link to="/sheets" className="text-gray-400 hover:text-white shrink-0">← Liste</Link>
          <h1 className="text-base sm:text-lg font-bold text-white text-center truncate flex-1">{sheet.name}</h1>
          <button
            onClick={() => setShowQr(true)}
            className="text-sm px-3 py-1.5 rounded-lg bg-[#1a1a2e] border border-[#2a2a3e] text-gray-300 hover:text-white"
          >
            📱 Partager
          </button>
        </div>

        {error && (
          <div className="mb-3 p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>
        )}

        {pendingCount > 0 && (
          <div className="mb-3 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 text-sm flex items-center justify-between gap-2">
            <span>⚠ {pendingCount} manche(s) en attente de synchro</span>
            <button onClick={trySyncPending} disabled={syncBusy} className="px-2 py-0.5 rounded bg-yellow-500/20 hover:bg-yellow-500/30 disabled:opacity-50">
              {syncBusy ? '...' : 'Synchroniser'}
            </button>
          </div>
        )}

        {/* En-tête : équipes + cumuls */}
        <div ref={tableRef} className="rounded-xl bg-[#121225] border border-[#2a2a3e] overflow-hidden">
          <div className="grid grid-cols-2 border-b border-[#2a2a3e]">
            <div className="p-3 text-center border-r border-[#2a2a3e]">
              <div className="text-xs text-blue-300 font-medium">Équipe 1</div>
              <div className="text-sm text-white truncate">{sheet.players.team1[0]} & {sheet.players.team1[1]}</div>
              <div className="text-3xl font-bold text-blue-300 mt-1">{totals?.final1 ?? 0}</div>
            </div>
            <div className="p-3 text-center">
              <div className="text-xs text-orange-300 font-medium">Équipe 2</div>
              <div className="text-sm text-white truncate">{sheet.players.team2[0]} & {sheet.players.team2[1]}</div>
              <div className="text-3xl font-bold text-orange-300 mt-1">{totals?.final2 ?? 0}</div>
            </div>
          </div>

          {/* Progress bars */}
          <div className="px-3 py-2 space-y-1.5 border-b border-[#2a2a3e] bg-[#0c0c0c]/40">
            <div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>Cible : {sheet.targetScore}</span>
                <span>Mode : {sheet.scoreMode === 'points-faits' ? 'points faits' : 'points annoncés'}</span>
              </div>
            </div>
            <ProgressBar value={totals?.final1 ?? 0} target={sheet.targetScore} color="bg-blue-400" />
            <ProgressBar value={totals?.final2 ?? 0} target={sheet.targetScore} color="bg-orange-400" />
          </div>

          {/* Donneur */}
          {sheet.status !== 'finished' && (
            <div className="px-3 py-2 text-xs text-gray-400 border-b border-[#2a2a3e] flex items-center justify-between">
              <span>🃏 À distribuer : <span className="text-white font-medium">{dealerLabels[dealerIndex]}</span></span>
              <span>Manche {sheet.rounds.length + 1}</span>
            </div>
          )}

          {/* Tableau */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#0c0c0c]/40 text-gray-400 text-xs">
                <tr>
                  <th className="px-2 py-2 text-left">#</th>
                  <th className="px-2 py-2 text-center">Contrat</th>
                  <th className="px-2 py-2 text-right text-blue-300">Éq.1</th>
                  <th className="px-2 py-2 text-right text-orange-300">Éq.2</th>
                  <th className="px-2 py-2 text-right text-gray-400">Cumul 1</th>
                  <th className="px-2 py-2 text-right text-gray-400">Cumul 2</th>
                </tr>
              </thead>
              <tbody>
                {sheet.rounds.length === 0 && (
                  <tr><td colSpan={6} className="text-center text-gray-500 py-6 text-sm">Aucune manche pour l'instant</td></tr>
                )}
                {sheet.rounds.map((r, i) => (
                  <tr key={r.id} className="border-t border-[#2a2a3e]">
                    <td className="px-2 py-2 text-gray-400">{i + 1}</td>
                    <td className="px-2 py-2 text-center">
                      <span className={`font-semibold ${r.takerTeam === 1 ? 'text-blue-300' : 'text-orange-300'}`}>
                        {bidLabel(r)}
                      </span>
                      <span className={`ml-1 ${SUIT_COLOR[r.trumpSuit]}`}>{SUIT_SYMBOL[r.trumpSuit]}</span>
                      {r.contred && <span className="ml-1 text-yellow-400 text-xs">×2</span>}
                      {r.surcontred && <span className="ml-0.5 text-red-400 text-xs">×4</span>}
                      {r.beloteTeam && <span className="ml-1 text-purple-300 text-xs">B{r.beloteTeam}</span>}
                      {!r.contractMet && <span className="ml-1 text-red-400 text-xs">✗</span>}
                      {r.notes && <span title={r.notes} className="ml-1 text-gray-500">📝</span>}
                    </td>
                    <td className={`px-2 py-2 text-right font-medium ${r.team1Points > 0 ? 'text-blue-200' : 'text-gray-600'}`}>{r.team1Points}</td>
                    <td className={`px-2 py-2 text-right font-medium ${r.team2Points > 0 ? 'text-orange-200' : 'text-gray-600'}`}>{r.team2Points}</td>
                    <td className="px-2 py-2 text-right text-gray-400">{totals?.team1[i]}</td>
                    <td className="px-2 py-2 text-right text-gray-400">{totals?.team2[i]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* État final */}
          {sheet.status === 'finished' && (
            <div className={`p-3 text-center font-semibold border-t border-[#2a2a3e] ${
              sheet.winningTeam === 1 ? 'bg-blue-500/10 text-blue-300' : 'bg-orange-500/10 text-orange-300'
            }`}>
              🏆 Équipe {sheet.winningTeam} gagne — {sheet.winningTeam === 1 ? `${totals?.final1} à ${totals?.final2}` : `${totals?.final2} à ${totals?.final1}`}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={() => setShowAdd(true)}
            disabled={sheet.status === 'finished'}
            className="col-span-2 py-3 rounded-xl bg-[#1a6b3c] hover:bg-[#2d8f54] text-white font-semibold transition disabled:opacity-50"
          >
            + Ajouter une manche
          </button>
          <button
            onClick={handleUndoLast}
            disabled={sheet.rounds.length === 0}
            className="py-2 rounded-lg bg-[#1a1a2e] border border-[#2a2a3e] text-gray-300 hover:text-white text-sm font-medium disabled:opacity-50"
          >
            ↶ Annuler dernière
          </button>
          <button
            onClick={() => setShowStats(s => !s)}
            className="py-2 rounded-lg bg-[#1a1a2e] border border-[#2a2a3e] text-gray-300 hover:text-white text-sm font-medium"
          >
            📊 Stats
          </button>
          <button
            onClick={handleExportPng}
            className="py-2 rounded-lg bg-[#1a1a2e] border border-[#2a2a3e] text-gray-300 hover:text-white text-sm font-medium"
          >
            💾 Export PNG
          </button>
          {sheet.status === 'in-progress' && (
            <button
              onClick={handleFinish}
              className="py-2 rounded-lg bg-[#1a1a2e] border border-[#2a2a3e] text-gray-300 hover:text-white text-sm font-medium"
            >
              🏁 Clôturer
            </button>
          )}
          {sheet.isOwner && (
            <button
              onClick={handleDelete}
              className="col-span-2 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 text-sm font-medium"
            >
              🗑 Supprimer la feuille
            </button>
          )}
        </div>

        {/* Stats */}
        {showStats && stats && (
          <div className="mt-4 rounded-xl bg-[#121225] border border-[#2a2a3e] p-4">
            <h3 className="text-white font-semibold mb-3">Statistiques</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <StatCard label="Contrats pris Éq.1" value={`${stats.team1.contractsTaken}`} sub={`${stats.team1.contractsMet} réussis`} color="blue" />
              <StatCard label="Contrats pris Éq.2" value={`${stats.team2.contractsTaken}`} sub={`${stats.team2.contractsMet} réussis`} color="orange" />
              <StatCard label="Réussite Éq.1" value={`${stats.team1.successRate}%`} color="blue" />
              <StatCard label="Réussite Éq.2" value={`${stats.team2.successRate}%`} color="orange" />
              <StatCard label="Plus haute enchère" value={String(stats.highestBid)} sub={stats.highestBidTeam ? `Éq.${stats.highestBidTeam}` : ''} color="gray" />
              <StatCard label="Capots / Générales" value={String(stats.specials)} color="gray" />
              <StatCard label="Belotes" value={String(stats.belotes)} color="gray" />
              <StatCard label="Manches" value={String(sheet.rounds.length)} color="gray" />
            </div>
          </div>
        )}

        {/* QR Modal */}
        {showQr && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowQr(false)}>
            <div className="bg-[#0c0c0c] border border-[#2a2a3e] rounded-2xl p-5 max-w-sm w-full text-center" onClick={e => e.stopPropagation()}>
              <h3 className="text-white font-semibold mb-2">Partager cette feuille</h3>
              <p className="text-gray-400 text-xs mb-4">Scannez ce QR code ou copiez le code.</p>
              <img src={qrUrl} alt="QR de partage" className="w-64 h-64 mx-auto rounded-lg bg-white p-2" />
              <div className="mt-4 flex items-center justify-center gap-2">
                <code className="px-3 py-1.5 rounded bg-[#1a1a2e] border border-[#2a2a3e] text-emerald-300 tracking-widest font-mono">{sheet.shareCode}</code>
                <button onClick={handleCopyShareCode} className="px-3 py-1.5 rounded bg-[#2a2a3e] hover:bg-[#3a3a4e] text-white text-sm">Copier</button>
              </div>
              <button onClick={() => setShowQr(false)} className="mt-4 w-full py-2 rounded-lg bg-[#1a1a2e] border border-[#2a2a3e] text-white">Fermer</button>
            </div>
          </div>
        )}

        {showAdd && (
          <AddRoundModal
            scoreMode={sheet.scoreMode}
            team1Names={sheet.players.team1}
            team2Names={sheet.players.team2}
            onSubmit={handleAddRound}
            onCancel={() => setShowAdd(false)}
          />
        )}
      </div>
    </div>
  );
}

function ProgressBar({ value, target, color }: { value: number; target: number; color: string }) {
  const pct = Math.min(100, Math.round((value / target) * 100));
  return (
    <div className="h-1.5 rounded-full bg-[#1a1a2e] overflow-hidden">
      <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: 'blue' | 'orange' | 'gray' }) {
  const colorClass = color === 'blue' ? 'text-blue-300' : color === 'orange' ? 'text-orange-300' : 'text-white';
  return (
    <div className="p-3 rounded-lg bg-[#1a1a2e] border border-[#2a2a3e]">
      <div className="text-xs text-gray-400">{label}</div>
      <div className={`text-xl font-bold ${colorClass}`}>{value}</div>
      {sub && <div className="text-xs text-gray-500">{sub}</div>}
    </div>
  );
}

function computeStats(sheet: ScoreSheetDetail) {
  const team1 = { contractsTaken: 0, contractsMet: 0, successRate: 0 };
  const team2 = { contractsTaken: 0, contractsMet: 0, successRate: 0 };
  let highestBid = 0;
  let highestBidTeam: number | null = null;
  let specials = 0;
  let belotes = 0;

  for (const r of sheet.rounds) {
    const t = r.takerTeam === 1 ? team1 : team2;
    t.contractsTaken++;
    if (r.contractMet) t.contractsMet++;
    if (r.bidValue > highestBid) {
      highestBid = r.bidValue;
      highestBidTeam = r.takerTeam;
    }
    if (r.bidType !== 'normal') specials++;
    if (r.beloteTeam) belotes++;
  }
  team1.successRate = team1.contractsTaken === 0 ? 0 : Math.round((team1.contractsMet / team1.contractsTaken) * 100);
  team2.successRate = team2.contractsTaken === 0 ? 0 : Math.round((team2.contractsMet / team2.contractsTaken) * 100);
  return { team1, team2, highestBid, highestBidTeam, specials, belotes };
}

// ============================================================
// Export PNG via Canvas natif (pas de dep externe)
// ============================================================
async function exportSheetAsPng(sheet: ScoreSheetDetail): Promise<void> {
  const totals = cumulativeTotals(sheet.rounds);
  const w = 720;
  const rowH = 28;
  const headerH = 220;
  const h = headerH + (sheet.rounds.length + 2) * rowH + 60;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Fond
  ctx.fillStyle = '#0c0c0c';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#121225';
  ctx.fillRect(20, 20, w - 40, h - 40);

  // Titre
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText(sheet.name, 36, 56);

  // Équipes
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillStyle = '#93c5fd';
  ctx.fillText(`Équipe 1 — ${sheet.players.team1[0]} & ${sheet.players.team1[1]}`, 36, 90);
  ctx.fillStyle = '#fdba74';
  ctx.fillText(`Équipe 2 — ${sheet.players.team2[0]} & ${sheet.players.team2[1]}`, 36, 110);
  ctx.fillStyle = '#9ca3af';
  ctx.fillText(`Cible ${sheet.targetScore} · Mode ${sheet.scoreMode === 'points-faits' ? 'points faits' : 'points annoncés'}`, 36, 132);

  // Totaux
  ctx.font = 'bold 36px system-ui, sans-serif';
  ctx.fillStyle = '#93c5fd';
  ctx.textAlign = 'right';
  ctx.fillText(String(totals.final1), w - 200, 100);
  ctx.fillStyle = '#fdba74';
  ctx.fillText(String(totals.final2), w - 60, 100);
  ctx.textAlign = 'left';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillStyle = '#9ca3af';
  ctx.fillText('Éq.1', w - 240, 110);
  ctx.fillText('Éq.2', w - 100, 110);

  // En-tête tableau
  let y = headerH;
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(36, y - 18, w - 72, 24);
  ctx.fillStyle = '#9ca3af';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText('#', 44, y - 2);
  ctx.fillText('Contrat', 80, y - 2);
  ctx.textAlign = 'right';
  ctx.fillText('Éq.1', 380, y - 2);
  ctx.fillText('Éq.2', 460, y - 2);
  ctx.fillText('Cumul 1', 560, y - 2);
  ctx.fillText('Cumul 2', 660, y - 2);
  ctx.textAlign = 'left';
  y += 14;

  // Lignes
  ctx.font = '14px system-ui, sans-serif';
  for (let i = 0; i < sheet.rounds.length; i++) {
    const r = sheet.rounds[i];
    if (i % 2 === 0) {
      ctx.fillStyle = '#16162a';
      ctx.fillRect(36, y - 14, w - 72, rowH);
    }
    ctx.fillStyle = '#9ca3af';
    ctx.fillText(String(i + 1), 44, y + 4);
    ctx.fillStyle = r.takerTeam === 1 ? '#93c5fd' : '#fdba74';
    const contractTxt = `${bidLabel(r)} ${SUIT_SYMBOL[r.trumpSuit]}${r.contred ? ' ×2' : ''}${r.surcontred ? ' ×4' : ''}${r.contractMet ? '' : ' ✗'}`;
    ctx.fillText(contractTxt, 80, y + 4);
    ctx.fillStyle = r.team1Points > 0 ? '#bfdbfe' : '#4b5563';
    ctx.textAlign = 'right';
    ctx.fillText(String(r.team1Points), 380, y + 4);
    ctx.fillStyle = r.team2Points > 0 ? '#fed7aa' : '#4b5563';
    ctx.fillText(String(r.team2Points), 460, y + 4);
    ctx.fillStyle = '#9ca3af';
    ctx.fillText(String(totals.team1[i] ?? ''), 560, y + 4);
    ctx.fillText(String(totals.team2[i] ?? ''), 660, y + 4);
    ctx.textAlign = 'left';
    y += rowH;
  }

  // Footer
  ctx.fillStyle = '#6b7280';
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillText(`Généré ${new Date().toLocaleString('fr-FR')} · Code partage : ${sheet.shareCode}`, 36, h - 30);

  // Download
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sheet.name.replace(/[^a-zA-Z0-9-_]/g, '_')}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}
