import { useState, useEffect } from 'react';
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

/** points LEFT of card (for right-side column to avoid misalignment) */
function MiniCardReverse({ rank, suit, points }: { rank: Rank; suit: Suit; points: number }) {
  const isRed = suit === Suit.Hearts || suit === Suit.Diamonds;
  const color = isRed ? 'text-red-600' : 'text-gray-900';
  return (
    <div className="flex items-center gap-1">
      <span className={`text-[10px] font-bold w-4 text-right ${points > 0 ? 'text-yellow-300' : 'text-gray-500/60'}`}>{points}</span>
      <div className="w-7 h-10 rounded bg-[#fefefa] shadow flex flex-col items-center justify-center relative border border-gray-200/50 shrink-0">
        <span className={`text-[7px] font-bold absolute top-0 left-0.5 ${color}`}>{rank}</span>
        <span className={`text-xs ${color}`}>{SUIT_SYMBOLS[suit]}</span>
      </div>
    </div>
  );
}

function MiniCard({ rank, suit, points, horizontal = false }: { rank: Rank; suit: Suit; points: number; horizontal?: boolean }) {
  const isRed = suit === Suit.Hearts || suit === Suit.Diamonds;
  const color = isRed ? 'text-red-600' : 'text-gray-900';

  if (horizontal) {
    return (
      <div className="flex items-center gap-1">
        <div className="w-7 h-10 rounded bg-[#fefefa] shadow flex flex-col items-center justify-center relative border border-gray-200/50 shrink-0">
          <span className={`text-[7px] font-bold absolute top-0 left-0.5 ${color}`}>{rank}</span>
          <span className={`text-xs ${color}`}>{SUIT_SYMBOLS[suit]}</span>
        </div>
        <span className={`text-[10px] font-bold ${points > 0 ? 'text-yellow-300' : 'text-gray-500/60'}`}>{points}</span>
      </div>
    );
  }

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

function useIsLandscape() {
  const [landscape, setLandscape] = useState(
    typeof window !== 'undefined' && window.innerWidth > window.innerHeight
  );
  useEffect(() => {
    const handler = () => setLandscape(window.innerWidth > window.innerHeight);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return landscape;
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
}

export function PointsHelper({ trumpSuit }: PointsHelperProps) {
  const [open, setOpen] = useState(false);
  const isLandscape = useIsLandscape();
  const isMobile = typeof window !== 'undefined' && 'ontouchstart' in window;
  const isAndroid = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);

  const trump = trumpSuit ?? Suit.Spades;
  const nonTrumpSuits = NON_TRUMP_SUITS_FOR[trump];

  // Mobile landscape → use PC-style horizontal layout at top
  const usePcLayout = !isMobile || isLandscape;

  return (
    <>
      <div className="flex gap-1">
        {/* Fullscreen button (mobile only) */}
        {isMobile && isAndroid && (
          <button
            onClick={toggleFullscreen}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border text-sm cursor-pointer transition bg-[#1a1a2e] border-[#3a3a4e] text-gray-400 hover:text-white hover:border-[#2d8f54]"
            title="Plein écran"
          >
            ⛶
          </button>
        )}
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
      </div>

      <AnimatePresence>
        {open && usePcLayout && (
          <>
            {/* PC / Mobile landscape: horizontal rows */}
            <motion.div
              key="pc-trump"
              initial={{ opacity: 0, y: isMobile ? -20 : 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: isMobile ? -20 : 20 }}
              className={`fixed z-20 pointer-events-none ${isMobile ? 'top-2 left-12' : 'bottom-16 left-16'}`}
            >
              <div className={`text-[10px] font-bold text-center mb-1 ${SUIT_COLORS[trump]}`}>
                Atout {SUIT_SYMBOLS[trump]}
              </div>
              <div className="flex gap-1 justify-center">
                {TRUMP_CARDS.map(({ rank, points }) => (
                  <MiniCard key={rank} rank={rank} suit={trump} points={points} />
                ))}
              </div>
            </motion.div>
            <motion.div
              key="pc-nontrump"
              initial={{ opacity: 0, y: isMobile ? -20 : 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: isMobile ? -20 : 20 }}
              className={`fixed z-20 pointer-events-none ${isMobile ? 'top-2 right-12' : 'bottom-16 right-16'}`}
            >
              <div className="text-[10px] font-bold text-center mb-1 text-gray-300">
                {nonTrumpSuits.map(s => (
                  <span key={s} className={SUIT_COLORS[s]}>{SUIT_SYMBOLS[s]}</span>
                ))}
              </div>
              <div className="flex gap-1 justify-center">
                {NON_TRUMP_CARDS.map(({ rank, points }) => (
                  <MiniCard key={rank} rank={rank} suit={nonTrumpSuits[0]} points={points} />
                ))}
              </div>
            </motion.div>
          </>
        )}

        {open && !usePcLayout && (
          <>
            {/* Mobile portrait: vertical columns along sides, split 4+4 around center */}
            <motion.div
              key="mob-trump"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="fixed left-1 top-1/2 -translate-y-1/2 z-20 flex flex-col items-start pointer-events-none"
            >
              <div className={`text-[9px] font-bold mb-0.5 ${SUIT_COLORS[trump]}`}>
                Atout {SUIT_SYMBOLS[trump]}
              </div>
              <div className="flex flex-col gap-0.5">
                {TRUMP_CARDS.slice(0, 4).map(({ rank, points }) => (
                  <MiniCard key={rank} rank={rank} suit={trump} points={points} horizontal />
                ))}
              </div>
              <div className="h-10" />
              <div className="flex flex-col gap-0.5">
                {TRUMP_CARDS.slice(4).map(({ rank, points }) => (
                  <MiniCard key={rank} rank={rank} suit={trump} points={points} horizontal />
                ))}
              </div>
            </motion.div>
            <motion.div
              key="mob-nontrump"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="fixed right-1 top-1/2 -translate-y-1/2 z-20 flex flex-col items-end pointer-events-none"
            >
              <div className="text-[9px] font-bold mb-0.5 text-gray-300">
                {nonTrumpSuits.map(s => (
                  <span key={s} className={SUIT_COLORS[s]}>{SUIT_SYMBOLS[s]}</span>
                ))}
              </div>
              <div className="flex flex-col gap-0.5">
                {NON_TRUMP_CARDS.slice(0, 4).map(({ rank, points }) => (
                  <MiniCardReverse key={rank} rank={rank} suit={nonTrumpSuits[0]} points={points} />
                ))}
              </div>
              <div className="h-10" />
              <div className="flex flex-col gap-0.5">
                {NON_TRUMP_CARDS.slice(4).map(({ rank, points }) => (
                  <MiniCardReverse key={rank} rank={rank} suit={nonTrumpSuits[0]} points={points} />
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
