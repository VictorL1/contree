import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Suit, Rank, type Card as CardType } from '@contree/shared';
import { Card } from './Card.tsx';

const BLACK_SUITS = [Suit.Spades, Suit.Clubs];
const RED_SUITS = [Suit.Hearts, Suit.Diamonds];

/** Build a suit order that always alternates black/red, using all 4 suits */
function buildSuitOrder(_cards: CardType[]): Suit[] {
  // Always alternate: black, red, black, red
  // Spades(black), Hearts(red), Clubs(black), Diamonds(red)
  return [Suit.Spades, Suit.Hearts, Suit.Clubs, Suit.Diamonds];
}

const NON_TRUMP_RANK_ORDER: Rank[] = [
  Rank.Ace, Rank.Ten, Rank.King, Rank.Queen, Rank.Jack, Rank.Nine, Rank.Eight, Rank.Seven,
];

const TRUMP_RANK_ORDER: Rank[] = [
  Rank.Jack, Rank.Nine, Rank.Ace, Rank.Ten, Rank.King, Rank.Queen, Rank.Eight, Rank.Seven,
];

function sortHand(cards: CardType[], trumpSuit: Suit | null): CardType[] {
  const suitOrder = buildSuitOrder(cards);
  return [...cards].sort((a, b) => {
    const suitDiff = suitOrder.indexOf(a.suit) - suitOrder.indexOf(b.suit);
    if (suitDiff !== 0) return suitDiff;
    const order = (trumpSuit && a.suit === trumpSuit) ? TRUMP_RANK_ORDER : NON_TRUMP_RANK_ORDER;
    return order.indexOf(a.rank) - order.indexOf(b.rank);
  });
}

interface HandProps {
  cards: CardType[];
  playableCards: CardType[];
  onPlayCard: (card: CardType) => void;
  trumpSuit: Suit | null;
}

export function Hand({ cards, playableCards, onPlayCard, trumpSuit }: HandProps) {
  const sortedCards = useMemo(() => sortHand(cards, trumpSuit), [cards, trumpSuit]);

  const isPlayable = (card: CardType) =>
    playableCards.some(pc => pc.suit === card.suit && pc.rank === card.rank);

  const overlap = sortedCards.length > 6 ? -20 : -10;

  return (
    <div className="flex items-end justify-center">
      <AnimatePresence>
        {sortedCards.map((card, i) => (
          <motion.div
            key={`${card.suit}-${card.rank}`}
            initial={{ y: 50, opacity: 0, rotate: 0 }}
            animate={{
              y: 0,
              opacity: 1,
              rotate: (i - (sortedCards.length - 1) / 2) * 3,
              x: 0,
            }}
            exit={{ y: -200, opacity: 0, scale: 0.8, transition: { duration: 0.3 } }}
            transition={{ delay: i * 0.05 }}
            style={{ marginLeft: i === 0 ? 0 : overlap, zIndex: i }}
          >
            <Card
              card={card}
              playable={isPlayable(card)}
              onClick={() => isPlayable(card) && onPlayCard(card)}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
