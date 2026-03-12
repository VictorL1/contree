import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Suit } from '@contree/shared';

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

const TRUMP_ROWS: [string, number][] = [
  ['V', 20], ['9', 14], ['As', 11], ['10', 10], ['R', 4], ['D', 3], ['8', 0], ['7', 0],
];

const NON_TRUMP_ROWS: [string, number][] = [
  ['As', 11], ['10', 10], ['R', 4], ['D', 3], ['V', 2], ['9', 0], ['8', 0], ['7', 0],
];

interface PointsHelperProps {
  trumpSuit?: Suit | null;
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
          <motion.div
            key="points-overlay"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-10 right-0 z-30 bg-[#0d0d1a]/95 backdrop-blur-sm rounded-lg border border-[#2a2a3e] shadow-xl p-2 w-[200px] sm:w-[220px]"
          >
            <div className="grid grid-cols-2 gap-2">
              {/* Trump column */}
              <div>
                <div className={`font-bold text-xs text-center mb-1 ${SUIT_COLORS[trump]}`}>
                  {SUIT_SYMBOLS[trump]} Atout
                </div>
                {TRUMP_ROWS.map(([name, pts]) => (
                  <div key={name} className="flex justify-between text-[11px] leading-4 px-1">
                    <span className="text-gray-400">{name}</span>
                    <span className={`font-bold ${pts > 0 ? 'text-white' : 'text-gray-600'}`}>{pts}</span>
                  </div>
                ))}
                <div className="flex justify-between text-[11px] leading-4 px-1 mt-0.5 border-t border-[#2a2a3e] pt-0.5">
                  <span className="text-gray-500 font-medium">Tot.</span>
                  <span className={`font-bold ${SUIT_COLORS[trump]}`}>62</span>
                </div>
              </div>

              {/* Non-trump column */}
              <div>
                <div className="font-bold text-xs text-center mb-1 text-gray-400">
                  {nonTrumpSuits.map(s => (
                    <span key={s} className={SUIT_COLORS[s]}>{SUIT_SYMBOLS[s]}</span>
                  ))}
                </div>
                {NON_TRUMP_ROWS.map(([name, pts]) => (
                  <div key={name} className="flex justify-between text-[11px] leading-4 px-1">
                    <span className="text-gray-400">{name}</span>
                    <span className={`font-bold ${pts > 0 ? 'text-white' : 'text-gray-600'}`}>{pts}</span>
                  </div>
                ))}
                <div className="flex justify-between text-[11px] leading-4 px-1 mt-0.5 border-t border-[#2a2a3e] pt-0.5">
                  <span className="text-gray-500 font-medium">Tot.</span>
                  <span className="font-bold text-gray-400">30</span>
                </div>
              </div>
            </div>
            <div className="text-[10px] text-gray-600 text-center mt-1">
              152 + 10 (der) = 162
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
