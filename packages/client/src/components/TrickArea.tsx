import { motion, AnimatePresence } from 'framer-motion';
import type { PlayedCard, Trick } from '@contree/shared';
import { Position } from '@contree/shared';
import { Card } from './Card.tsx';

interface TrickAreaProps {
  currentTrick: PlayedCard[];
  playerPosition: Position;
  lastTrick: Trick | null;
  showLastTrick: boolean;
  onToggleLastTrick: () => void;
  onCloseLastTrick: () => void;
}

function getRelativePosition(cardPosition: Position, playerPosition: Position): 'bottom' | 'left' | 'top' | 'right' {
  const order = [Position.South, Position.West, Position.North, Position.East];
  const playerIndex = order.indexOf(playerPosition);
  const cardIndex = order.indexOf(cardPosition);
  const relative = (cardIndex - playerIndex + 4) % 4;
  return (['bottom', 'left', 'top', 'right'] as const)[relative];
}

/** Starting positions far off-screen in the player's direction */
const INITIAL_OFFSETS: Record<string, { x: number; y: number }> = {
  bottom: { x: 0, y: 200 },
  left: { x: -200, y: 0 },
  top: { x: 0, y: -200 },
  right: { x: 200, y: 0 },
};

/** Final resting positions near center */
const FINAL_OFFSETS: Record<string, { x: number; y: number }> = {
  bottom: { x: 0, y: 24 },
  left: { x: -30, y: 0 },
  top: { x: 0, y: -24 },
  right: { x: 30, y: 0 },
};

export function TrickArea({ currentTrick, playerPosition, lastTrick, showLastTrick, onToggleLastTrick, onCloseLastTrick }: TrickAreaProps) {
  return (
    <>
      {/* Click-outside backdrop for last trick (portal-like, outside the relative container) */}
      <AnimatePresence>
        {showLastTrick && lastTrick && (
          <motion.div
            key="last-trick-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            onClick={onCloseLastTrick}
          />
        )}
      </AnimatePresence>

      <div className="relative w-48 h-48 flex items-center justify-center">
        {/* Current trick cards */}
        <AnimatePresence>
          {currentTrick.map(({ card, player }) => {
            const relPos = getRelativePosition(player, playerPosition);
            const initial = INITIAL_OFFSETS[relPos];
            const final = FINAL_OFFSETS[relPos];
            return (
              <motion.div
                key={`${card.suit}-${card.rank}`}
                initial={{ ...initial, scale: 0.6, opacity: 0 }}
                animate={{ x: final.x, y: final.y, scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0, y: -30 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                className="absolute"
              >
                <Card card={card} small />
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Last trick face-down stack */}
        {lastTrick && !showLastTrick && (
          <motion.div
            initial={{ opacity: 0, x: 0 }}
            animate={{ opacity: 1, x: 90, y: -60 }}
            className="absolute cursor-pointer z-30"
            onClick={onToggleLastTrick}
            title="Voir le dernier pli"
          >
            <div className="relative w-10 h-14">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="absolute rounded-md bg-gradient-to-br from-blue-900 to-blue-700 border border-blue-600 shadow-sm w-10 h-14"
                  style={{ top: i * -1, left: i * 1 }} />
              ))}
            </div>
          </motion.div>
        )}

        {/* Last trick shown with cards at player positions */}
        <AnimatePresence>
          {showLastTrick && lastTrick && lastTrick.cards.map(({ card, player }) => {
            const relPos = getRelativePosition(player, playerPosition);
            const pos = FINAL_OFFSETS[relPos];
            return (
              <motion.div
                key={`last-${card.suit}-${card.rank}`}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ x: pos.x, y: pos.y, opacity: 0.85, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                className="absolute z-50"
              >
                <Card card={card} small />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </>
  );
}
