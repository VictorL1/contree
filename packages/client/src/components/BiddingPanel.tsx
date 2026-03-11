import { useState } from 'react';
import { motion } from 'framer-motion';
import { Suit, Position, type BidValue, type BiddingState } from '@contree/shared';

interface BiddingPanelProps {
  biddingState: BiddingState;
  isMyTurn: boolean;
  canContre: boolean;
  canSurcontre: boolean;
  onBid: (value: BidValue, suit: Suit) => void;
  onPass: () => void;
  onContre: () => void;
  onSurcontre: () => void;
  getPlayerName: (pos: Position) => string;
}

const BID_VALUES: BidValue[] = [80, 90, 100, 110, 120, 130, 140, 150, 160, 'capot', 'generale'];

const SUIT_DISPLAY: { suit: Suit; symbol: string; color: string }[] = [
  { suit: Suit.Spades, symbol: '♠', color: 'text-gray-900' },
  { suit: Suit.Hearts, symbol: '♥', color: 'text-red-600' },
  { suit: Suit.Diamonds, symbol: '♦', color: 'text-red-600' },
  { suit: Suit.Clubs, symbol: '♣', color: 'text-gray-900' },
];

export function BiddingPanel({
  biddingState,
  isMyTurn,
  canContre,
  canSurcontre,
  onBid,
  onPass,
  onContre,
  onSurcontre,
  getPlayerName,
}: BiddingPanelProps) {
  const [selectedSuit, setSelectedSuit] = useState<Suit>(Suit.Spades);

  const minBidValue = biddingState.highestBid
    ? BID_VALUES.indexOf(biddingState.highestBid.value) + 1
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#1a1a2e] rounded-xl p-4 border border-[#2a2a3e] shadow-xl w-full max-w-sm"
    >
      <h3 className="text-white font-semibold text-center mb-3">Enchères</h3>

      {/* Last bid */}
      {biddingState.highestBid && (
        <div className="mb-3 text-sm text-center">
          <span className="font-medium text-gray-300">{getPlayerName(biddingState.highestBid.player)}</span>
          {' → '}
          <span className="text-white font-bold">
            {typeof biddingState.highestBid.value === 'number' ? biddingState.highestBid.value : biddingState.highestBid.value === 'capot' ? 'Capot' : 'Générale'}
            {' '}{SUIT_DISPLAY.find(s => s.suit === biddingState.highestBid!.suit)?.symbol}
          </span>
          {biddingState.isContred && <span className="ml-1 text-red-400 font-bold">Contré !</span>}
          {biddingState.isSurcontred && <span className="ml-1 text-orange-400 font-bold">Surcontré !</span>}
        </div>
      )}

      {isMyTurn && (
        <div className="space-y-3">
          {/* Choix de la couleur */}
          <div className="flex justify-center gap-2">
            {SUIT_DISPLAY.map(({ suit, symbol, color }) => (
              <button
                key={suit}
                onClick={() => setSelectedSuit(suit)}
                className={`w-10 h-10 rounded-lg text-xl font-bold transition cursor-pointer ${
                  selectedSuit === suit
                    ? 'bg-white shadow-md scale-110'
                    : 'bg-[#2a2a3e] hover:bg-[#3a3a4e]'
                } ${selectedSuit === suit ? color : 'text-gray-400'}`}
              >
                {symbol}
              </button>
            ))}
          </div>

          {/* Valeurs d'enchères */}
          <div className="grid grid-cols-4 gap-1.5">
            {BID_VALUES.map((value, i) => (
              <button
                key={value}
                disabled={i < minBidValue}
                onClick={() => onBid(value, selectedSuit)}
                className={`py-1.5 rounded text-sm font-medium transition cursor-pointer ${
                  i >= minBidValue
                    ? 'bg-[#1a6b3c] hover:bg-[#2d8f54] text-white'
                    : 'bg-[#2a2a3e] text-gray-600 cursor-not-allowed'
                }`}
              >
                {typeof value === 'number' ? value : value === 'capot' ? 'Capot' : 'Générale'}
              </button>
            ))}
          </div>

          {/* Passer */}
          <button
            onClick={onPass}
            className="w-full py-2 rounded-lg bg-[#2a2a3e] hover:bg-[#3a3a4e] text-gray-300 font-medium transition cursor-pointer"
          >
            Passer
          </button>
        </div>
      )}

      {/* Contre / Surcontre */}
      {!isMyTurn && (canContre || canSurcontre) && (
        <div className="flex gap-2 mt-2">
          {canContre && (
            <button
              onClick={onContre}
              className="flex-1 py-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 font-semibold border border-red-600/30 transition cursor-pointer"
            >
              Contre !
            </button>
          )}
          {canSurcontre && (
            <button
              onClick={onSurcontre}
              className="flex-1 py-2 rounded-lg bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 font-semibold border border-orange-600/30 transition cursor-pointer"
            >
              Surcontre !
            </button>
          )}
        </div>
      )}

      {!isMyTurn && !canContre && !canSurcontre && (
        <p className="text-center text-gray-500 text-sm mt-2">En attente des autres joueurs...</p>
      )}
    </motion.div>
  );
}
