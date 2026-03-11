import { motion } from 'framer-motion';
import { Team, Suit, type Bid } from '@contree/shared';

const SUIT_SYMBOL: Record<Suit, string> = {
  [Suit.Spades]: '♠', [Suit.Hearts]: '♥', [Suit.Diamonds]: '♦', [Suit.Clubs]: '♣',
};

interface ScoreBoardProps {
  scores: { [Team.NorthSouth]: number; [Team.EastWest]: number };
  targetScore: number;
  contract: Bid | null;
  contractTeam: Team | null;
  isContred: boolean;
  isSurcontred: boolean;
  playerTeam: Team;
  roundPoints?: { [Team.NorthSouth]: number; [Team.EastWest]: number } | null;
}

export function ScoreBoard({ scores, targetScore, contract, contractTeam, isContred, isSurcontred, playerTeam, roundPoints }: ScoreBoardProps) {
  const myTeam = playerTeam;
  const otherTeam = myTeam === Team.NorthSouth ? Team.EastWest : Team.NorthSouth;

  return (
    <div className="bg-[#1a1a2e] rounded-xl p-2 sm:p-3 border border-[#2a2a3e] shadow-lg text-xs sm:text-sm w-28 sm:w-44">
      <h3 className="text-white font-semibold text-center mb-1 sm:mb-2 text-[10px] sm:text-xs uppercase tracking-wide">Score</h3>

      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-[#2d8f54] font-medium">Nous</span>
          <span className="text-white font-bold">{scores[myTeam]}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-red-400 font-medium">Eux</span>
          <span className="text-white font-bold">{scores[otherTeam]}</span>
        </div>
        <div className="h-px bg-[#2a2a3e] my-0.5" />
        <div className="text-gray-500 text-[10px] sm:text-xs text-center">Objectif : {targetScore}</div>
      </div>

      {/* Points du round en cours */}
      {roundPoints && (
        <div className="mt-1 sm:mt-2 pt-1 sm:pt-2 border-t border-[#2a2a3e]">
          <div className="text-[10px] sm:text-xs text-gray-400 text-center mb-0.5">Plis</div>
          <div className="flex justify-between items-center">
            <span className="text-[#2d8f54] text-[10px] sm:text-xs">Nous</span>
            <span className="text-white font-bold text-xs sm:text-sm">{roundPoints[myTeam]}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-red-400 text-[10px] sm:text-xs">Eux</span>
            <span className="text-white font-bold text-xs sm:text-sm">{roundPoints[otherTeam]}</span>
          </div>
        </div>
      )}

      {/* Contrat en cours */}
      {contract && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-1 sm:mt-2 pt-1 sm:pt-2 border-t border-[#2a2a3e] text-center"
        >
          <div className="text-[10px] sm:text-xs text-gray-400">Contrat</div>
          <div className="text-white font-bold flex items-center justify-center gap-1 text-xs sm:text-sm">
            {contract.value}
            <span className={contract.suit === Suit.Hearts || contract.suit === Suit.Diamonds ? 'text-red-500' : 'text-white'}>
              {SUIT_SYMBOL[contract.suit]}
            </span>
            {isContred && <span className="text-red-400 ml-1">×2</span>}
            {isSurcontred && <span className="text-orange-400 ml-1">×4</span>}
          </div>
          <div className="text-[10px] sm:text-xs mt-0.5">
            {contractTeam === myTeam
              ? <span className="text-[#2d8f54]">Notre contrat</span>
              : <span className="text-red-400">Leur contrat</span>
            }
          </div>
        </motion.div>
      )}
    </div>
  );
}
