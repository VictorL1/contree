import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type CosmeticItem, type PlayerStats } from '../services/api.ts';

const CATEGORY_LABELS: Record<string, string> = {
  border: 'Bordures de pseudo',
  table: 'Tapis de jeu',
  cardBack: 'Dos de cartes',
};

const CATEGORY_ORDER = ['border', 'table', 'cardBack'];

function CosmeticPreview({ item, equipped }: { item: CosmeticItem; equipped: boolean }) {
  if (item.category === 'border') {
    if (item.name === 'rainbow-border') {
      return (
        <div className="w-full h-10 rounded-lg bg-[#1a1a2e] flex items-center justify-center border-2"
          style={{ borderImage: 'linear-gradient(90deg, red, orange, yellow, green, blue, purple) 1' }}>
          <span className="text-white text-xs">{equipped ? '✓ Équipé' : 'Pseudo'}</span>
        </div>
      );
    }
    return (
      <div className={`w-full h-10 rounded-lg bg-[#1a1a2e] flex items-center justify-center border-2 ${item.preview}`}>
        <span className="text-white text-xs">{equipped ? '✓ Équipé' : 'Pseudo'}</span>
      </div>
    );
  }

  if (item.category === 'table') {
    return (
      <div className="w-full h-10 rounded-lg border border-gray-700" style={{ backgroundColor: item.preview }}>
        <div className="flex items-center justify-center h-full">
          <span className="text-white text-xs">{equipped ? '✓ Équipé' : '♠♥♦♣'}</span>
        </div>
      </div>
    );
  }

  // Card back
  return (
    <div className={`w-8 h-12 mx-auto rounded bg-gradient-to-br ${item.preview} border border-white/20 shadow`}>
      <div className="w-full h-full flex items-center justify-center">
        <div className="w-5 h-8 rounded border border-white/20" />
      </div>
    </div>
  );
}

export function ShopPage() {
  const [items, setItems] = useState<CosmeticItem[]>([]);
  const [myStats, setMyStats] = useState<PlayerStats | null>(null);
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    Promise.all([api.getCosmetics(), api.getMyStats()])
      .then(([cosmetics, stats]) => {
        setItems(cosmetics);
        setMyStats(stats);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleBuy(item: CosmeticItem) {
    try {
      const res = await api.buyCosmetic(item.id);
      setOwnedIds(prev => new Set(prev).add(item.id));
      setMyStats(prev => prev ? {
        ...prev,
        stats: prev.stats ? { ...prev.stats, victoryPoints: res.remainingPoints } : prev.stats,
      } : prev);
      setMessage(`${item.displayName} acheté !`);
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setMessage(err.message || 'Erreur');
      setTimeout(() => setMessage(''), 3000);
    }
  }

  async function handleEquip(item: CosmeticItem) {
    try {
      await api.equipCosmetic(item.name, item.category);
      setMyStats(prev => prev ? {
        ...prev,
        equipped: { ...prev.equipped, [item.category]: item.name },
      } : prev);
      setMessage(`${item.displayName} équipé !`);
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setMessage(err.message || 'Erreur');
      setTimeout(() => setMessage(''), 3000);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#0a1f0d] to-[#0c0c0c]">
        <div className="text-gray-400 text-lg">Chargement...</div>
      </div>
    );
  }

  const equippedMap = myStats?.equipped ?? { border: 'default', table: 'default', cardBack: 'default' };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1f0d] to-[#0c0c0c] p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">🛒 Boutique</h1>
          <Link to="/" className="text-gray-400 hover:text-white text-sm transition">
            ← Retour
          </Link>
        </div>

        {/* Points balance */}
        <div className="bg-[#1a1a2e] rounded-xl p-4 border border-[#2a2a3e] mb-6 flex items-center justify-between">
          <span className="text-gray-400">Jetons disponibles</span>
          <span className="text-[#d4a843] text-2xl font-bold">{myStats?.stats?.victoryPoints ?? 0}</span>
        </div>

        {message && (
          <div className="mb-4 p-3 rounded-lg bg-[#2d8f54]/20 border border-[#2d8f54]/30 text-[#2d8f54] text-sm text-center">
            {message}
          </div>
        )}

        {CATEGORY_ORDER.map(cat => {
          const catItems = items.filter(i => i.category === cat);
          if (catItems.length === 0) return null;

          return (
            <div key={cat} className="mb-6">
              <h2 className="text-white font-semibold text-lg mb-3">{CATEGORY_LABELS[cat]}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {catItems.map(item => {
                  const owned = ownedIds.has(item.id);
                  const equipped = equippedMap[cat as keyof typeof equippedMap] === item.name;
                  const canAfford = (myStats?.stats?.victoryPoints ?? 0) >= item.cost;

                  return (
                    <div key={item.id} className="bg-[#1a1a2e] rounded-xl border border-[#2a2a3e] p-3 flex flex-col items-center gap-2">
                      <CosmeticPreview item={item} equipped={equipped} />
                      <span className="text-white text-sm font-medium text-center">{item.displayName}</span>

                      {equipped ? (
                        <span className="text-[#2d8f54] text-xs font-medium">✓ Équipé</span>
                      ) : owned ? (
                        <button
                          onClick={() => handleEquip(item)}
                          className="px-3 py-1 rounded-lg bg-[#1a6b3c] hover:bg-[#2d8f54] text-white text-xs transition cursor-pointer"
                        >
                          Équiper
                        </button>
                      ) : (
                        <button
                          onClick={() => handleBuy(item)}
                          disabled={!canAfford}
                          className={`px-3 py-1 rounded-lg text-xs transition cursor-pointer ${
                            canAfford
                              ? 'bg-[#d4a843] hover:bg-[#e5b954] text-black font-bold'
                              : 'bg-[#2a2a3e] text-gray-600 cursor-not-allowed'
                          }`}
                        >
                          {item.cost} Jetons
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
