import { Position } from '@contree/shared';

interface PlayerLabelProps {
  position: Position;
  username: string;
  isCurrentPlayer: boolean;
  isConnected: boolean;
  relativePosition: 'bottom' | 'left' | 'top' | 'right';
  cardCount?: number;
}

const POSITION_CLASSES: Record<string, string> = {
  bottom: 'bottom-32 left-1/2 -translate-x-1/2',
  left: 'left-4 top-1/2 -translate-y-1/2',
  top: 'top-4 left-1/2 -translate-x-1/2',
  right: 'right-4 top-1/2 -translate-y-1/2',
};

export function PlayerLabel({ username, isCurrentPlayer, isConnected, relativePosition, cardCount }: PlayerLabelProps) {
  return (
    <div className={`absolute ${POSITION_CLASSES[relativePosition]} z-10`}>
      <div className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 ${
        isCurrentPlayer
          ? 'bg-[#1a6b3c] text-white border border-[#2d8f54] shadow-[0_0_8px_rgba(45,143,84,0.4)]'
          : 'bg-[#1a1a2e] text-gray-300 border border-[#2a2a3e]'
      } ${!isConnected ? 'opacity-50' : ''}`}>
        {!isConnected && <span className="text-red-400 text-xs">⏳</span>}
        <span>{username}</span>
        {cardCount !== undefined && relativePosition !== 'bottom' && (
          <span className="text-xs text-gray-500">({cardCount})</span>
        )}
      </div>
    </div>
  );
}
