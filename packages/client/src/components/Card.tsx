import { motion } from 'framer-motion';
import type { Card as CardType } from '@contree/shared';
import { Suit } from '@contree/shared';

interface CardProps {
  card: CardType;
  playable?: boolean;
  selected?: boolean;
  faceDown?: boolean;
  small?: boolean;
  onClick?: () => void;
}

const SUIT_SYMBOLS: Record<Suit, string> = {
  [Suit.Spades]: '♠',
  [Suit.Hearts]: '♥',
  [Suit.Diamonds]: '♦',
  [Suit.Clubs]: '♣',
};

const SUIT_COLORS: Record<Suit, string> = {
  [Suit.Spades]: 'text-gray-900',
  [Suit.Hearts]: 'text-red-600',
  [Suit.Diamonds]: 'text-red-600',
  [Suit.Clubs]: 'text-gray-900',
};

export function Card({ card, playable = false, selected = false, faceDown = false, small = false, onClick }: CardProps) {
  const w = small ? 'w-12 h-18' : 'w-16 h-24';

  if (faceDown) {
    return (
      <div className={`${w} rounded-lg bg-gradient-to-br from-blue-900 to-blue-700 border border-blue-600 shadow-md flex items-center justify-center`}>
        <div className="w-3/4 h-3/4 rounded border border-blue-500/30 bg-blue-800/50" />
      </div>
    );
  }

  return (
    <motion.button
      onClick={onClick}
      disabled={!playable}
      whileHover={playable ? { y: -12, scale: 1.05 } : {}}
      whileTap={playable ? { scale: 0.95 } : {}}
      animate={selected ? { y: -16, boxShadow: '0 0 12px rgba(45,143,84,0.6)' } : { y: 0 }}
      className={`${w} rounded-lg bg-[#fefefa] border shadow-md flex flex-col items-center justify-center relative transition
        ${playable ? 'cursor-pointer hover:shadow-xl border-gray-300' : 'cursor-default border-gray-200 opacity-70'}
        ${selected ? 'border-[#2d8f54] border-2' : ''}
      `}
    >
      <span className={`text-xs font-bold absolute top-1 left-1.5 ${SUIT_COLORS[card.suit]}`}>
        {card.rank}
      </span>
      <span className={`text-2xl ${SUIT_COLORS[card.suit]}`}>
        {SUIT_SYMBOLS[card.suit]}
      </span>
      <span className={`text-xs font-bold absolute bottom-1 right-1.5 rotate-180 ${SUIT_COLORS[card.suit]}`}>
        {card.rank}
      </span>
    </motion.button>
  );
}
