import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Suit, Rank } from '@contree/shared';

const SUIT_SYMBOLS: Record<Suit, string> = {
  [Suit.Spades]: '♠', [Suit.Hearts]: '♥', [Suit.Diamonds]: '♦', [Suit.Clubs]: '♣',
};

const SUIT_COLORS: Record<Suit, string> = {
  [Suit.Spades]: 'text-white',
  [Suit.Hearts]: 'text-red-500',
  [Suit.Diamonds]: 'text-red-500',
  [Suit.Clubs]: 'text-white',
};

const NON_TRUMP_SUITS_FOR: Record<Suit, Suit[]> = {
  [Suit.Spades]: [Suit.Hearts, Suit.Diamonds, Suit.Clubs],
  [Suit.Hearts]: [Suit.Spades, Suit.Diamonds, Suit.Clubs],
  [Suit.Diamonds]: [Suit.Spades, Suit.Hearts, Suit.Clubs],
  [Suit.Clubs]: [Suit.Spades, Suit.Hearts, Suit.Diamonds],
};

const TRUMP_CARDS: { rank: Rank; points: number }[] = [
  { rank: Rank.Jack, points: 20 },
  { rank: Rank.Nine, points: 14 },
  { rank: Rank.Ace, points: 11 },
  { rank: Rank.Ten, points: 10 },
  { rank: Rank.King, points: 4 },
  { rank: Rank.Queen, points: 3 },
  { rank: Rank.Eight, points: 0 },
  { rank: Rank.Seven, points: 0 },
];

const NON_TRUMP_CARDS: { rank: Rank; points: number }[] = [
  { rank: Rank.Ace, points: 11 },
  { rank: Rank.Ten, points: 10 },
  { rank: Rank.King, points: 4 },
  { rank: Rank.Queen, points: 3 },
  { rank: Rank.Jack, points: 2 },
  { rank: Rank.Nine, points: 0 },
  { rank: Rank.Eight, points: 0 },
  { rank: Rank.Seven, points: 0 },
];

interface PointsHelperProps {
  trumpSuit?: Suit | null;
}

function MiniCard({ rank, suit, points }: { rank: Rank; suit: Suit; points: number }) {
  const isRed = suit === Suit.Hearts || suit === Suit.Diamonds;
  const color = isRed ? 'text-red-600' : 'text-gray-900';
  return (
    <div className="flex flex-col items-center">
      <div className="w-8 h-11 rounded bg-[#fefefa] shadow-md flex flex-col items-center justify-center relative border border-gray-200/50">
        <span className={`text-[8px] font-bold absolute top-0 left-0.5 ${color}`}>{rank}</span>
        <span className={`text-sm ${color}`}>{SUIT_SYMBOLS[suit]}</span>
      </div>
      <span className={`text-[10px] font-bold mt-0.5 ${points > 0 ? 'text-yellow-300' : 'text-gray-500/60'}`}>{points}</span>
    </div>
  );
}

export function PointsHelper({ trumpSuit }: PointsHelperProps) {
  const [open, setOpen] = useState(false);

  const trump = trumpSuit ?? Suit.Spades;
  const nonTrumpSuits = NON_TRUMP_SUITS_FOR[trump];

  return (
    <>
      <button
        onClick={() => setOpen(v => !v)}
        className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full border text-sm font-bold cursor-pointer transition ${
          open
            ? 'bg-[#2d8f54] border-[#2d8f54] text-white'
            : 'bg-[#1a1a2e] border-[#3a3a4e] text-gray-400 hover:text-white hover:border-[#2d8f54]'
        }`}
        title="Valeur des cartes"
      >
        ?
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="helper-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-35"
              onClick={() => setOpen(false)}
            />
            <motion.div
              key="points-overlay"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 bg-black/25 backdrop-blur-sm rounded-2xl p-4 sm:p-5"
            >
              {/* Trump row */}
              <div className="mb-3">
                <div className={`text-xs font-bold text-center mb-1.5 ${SUIT_COLORS[trump]}`}>
                  Atout {SUIT_SYMBOLS[trump]}
                </div>
                <div className="flex gap-1.5 justify-center">
                  {TRUMP_CARDS.map(({ rank, points }) => (
                    <MiniCard key={rank} rank={rank} suit={trump} points={points} />
                  ))}
                </div>
                <div className="text-[10px] text-center mt-1">
                  <span className="text-gray-400">Total : </span>
                  <span className={`font-bold ${SUIT_COLORS[trump]}`}>62</span>
                </div>
              </div>

              <div className="h-px bg-white/10 my-2" />

              {/* Non-trump row */}
              <div>
                <div className="text-xs font-bold text-center mb-1.5 text-gray-300">
                  Non-atout{' '}
                  {nonTrumpSuits.map(s => (
                    <span key={s} className={SUIT_COLORS[s]}>{SUIT_SYMBOLS[s]}</span>
                  ))}
                </div>
                <div className="flex gap-1.5 justify-center">
                  {NON_TRUMP_CARDS.map(({ rank, points }) => (
                    <MiniCard key={rank} rank={rank} suit={nonTrumpSuits[0]} points={points} />
                  ))}
                </div>
                <div className="text-[10px] text-center mt-1">
                  <span className="text-gray-400">Total : </span>
                  <span className="font-bold text-gray-300">30</span>
                </div>
              </div>

              <div className="text-[10px] text-gray-500 text-center mt-2">
                152 + 10 (der) = 162
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
