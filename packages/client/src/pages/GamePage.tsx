import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Position, Team, GamePhase, Suit,
  type Card as CardType, type BiddingState, type Bid,
  type PlayedCard, type RoundScore, type Trick, type BidValue,
  getTeam,
} from '@contree/shared';
import { getSocket } from '../services/socket.ts';
import { useAuth } from '../contexts/AuthContext.tsx';
import { Hand } from '../components/Hand.tsx';
import { TrickArea } from '../components/TrickArea.tsx';
import { BiddingPanel } from '../components/BiddingPanel.tsx';
import { ScoreBoard } from '../components/ScoreBoard.tsx';
import { PlayerLabel } from '../components/PlayerLabel.tsx';
import { PointsHelper } from '../components/PointsHelper.tsx';

interface PlayerInfo {
  position: Position;
  username: string;
  isConnected: boolean;
  cardCount: number;
}

/** Mappe une position absolue vers une position relative à l'écran */
function getRelativePosition(pos: Position, myPos: Position): 'bottom' | 'left' | 'top' | 'right' {
  const order = [Position.South, Position.West, Position.North, Position.East];
  const myIndex = order.indexOf(myPos);
  const posIndex = order.indexOf(pos);
  const relative = (posIndex - myIndex + 4) % 4;
  return (['bottom', 'left', 'top', 'right'] as const)[relative];
}

export function GamePage() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const { user } = useAuth();

  // État du jeu
  const [myPosition, setMyPosition] = useState<Position>(Position.South);
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [hand, setHand] = useState<CardType[]>([]);
  const [playableCards, setPlayableCards] = useState<CardType[]>([]);
  const [currentTrick, setCurrentTrick] = useState<PlayedCard[]>([]);
  const [phase, setPhase] = useState<'bidding' | 'playing' | 'scoring'>('bidding');
  const [biddingState, setBiddingState] = useState<BiddingState | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Position | null>(null);
  const [contract, setContract] = useState<Bid | null>(null);
  const [contractTeam, setContractTeam] = useState<Team | null>(null);
  const [isContred, setIsContred] = useState(false);
  const [isSurcontred, setIsSurcontred] = useState(false);
  const [scores, setScores] = useState<{ [Team.NorthSouth]: number; [Team.EastWest]: number }>({
    [Team.NorthSouth]: 0,
    [Team.EastWest]: 0,
  });
  const [roundResult, setRoundResult] = useState<RoundScore | null>(null);
  const [trickWinner, setTrickWinner] = useState<{ winner: Position; trick: Trick } | null>(null);
  const [lastTrick, setLastTrick] = useState<Trick | null>(null);
  const [showLastTrick, setShowLastTrick] = useState(false);
  const [gameOver, setGameOver] = useState<{ winner: Team; scores: { [Team.NorthSouth]: number; [Team.EastWest]: number } } | null>(null);
  const [announcements, setAnnouncements] = useState<string[]>([]);
  const [roundPoints, setRoundPoints] = useState<{ [Team.NorthSouth]: number; [Team.EastWest]: number } | null>(null);

  const addAnnouncement = useCallback((msg: string) => {
    setAnnouncements(prev => [...prev.slice(-4), msg]);
    setTimeout(() => setAnnouncements(prev => prev.slice(1)), 3000);
  }, []);

  useEffect(() => {
    const socket = getSocket();

    socket.on('room-joined', ({ players: p }) => {
      const myPlayer = p.find(pl => pl.username === user?.username);
      if (myPlayer) setMyPosition(myPlayer.position);
      setPlayers(p.map(pl => ({ ...pl, isConnected: true, cardCount: 8 })));
    });

    socket.on('cards-dealt', ({ hand: h }) => {
      setHand(h);
      setPlayableCards([]);
      setCurrentTrick([]);
      setPhase('bidding');
      setTrickWinner(null);
      setRoundResult(null);
      setRoundPoints(null);
    });

    socket.on('bidding-update', (state) => {
      setBiddingState(state);
      setCurrentPlayer(state.currentBidder);
      setPhase('bidding');
    });

    socket.on('contract-set', ({ contract: c, team, contred, surcontred }) => {
      setContract(c);
      setContractTeam(team);
      setIsContred(contred);
      setIsSurcontred(surcontred);
      setPhase('playing');
      addAnnouncement(`Contrat : ${c.value} ${getSuitSymbol(c.suit)} par ${team === Team.NorthSouth ? 'Nord-Sud' : 'Est-Ouest'}`);
    });

    socket.on('your-turn', ({ playableCards: pc }) => {
      setPlayableCards(pc);
      setCurrentPlayer(myPosition);
    });

    socket.on('card-played', ({ player, card }) => {
      setCurrentTrick(prev => [...prev, { card, player }]);
      setCurrentPlayer(null);
      // Mettre à jour le compteur de cartes
      setPlayers(prev => prev.map(p =>
        p.position === player ? { ...p, cardCount: p.cardCount - 1 } : p
      ));
    });

    socket.on('trick-won', ({ winner, trick, trickPoints }) => {
      setTrickWinner({ winner, trick });
      setShowLastTrick(false);
      if (trickPoints) setRoundPoints(trickPoints);
      addAnnouncement(`Pli remporté par ${getPlayerName(winner)}`);
      setTimeout(() => {
        setLastTrick(trick);
        setCurrentTrick([]);
        setTrickWinner(null);
      }, 1500);
    });

    socket.on('belote-announced', ({ player }) => {
      addAnnouncement(`${getPlayerName(player)} : Belote !`);
    });

    socket.on('rebelote-announced', ({ player }) => {
      addAnnouncement(`${getPlayerName(player)} : Rebelote !`);
    });

    socket.on('round-scored', (score) => {
      setRoundResult(score);
      setScores(prev => ({
        [Team.NorthSouth]: prev[Team.NorthSouth] + score.teamNorthSouthScore,
        [Team.EastWest]: prev[Team.EastWest] + score.teamEastWestScore,
      }));
      setPhase('scoring');
    });

    socket.on('game-over', (data) => {
      setGameOver(data);
    });

    socket.on('player-disconnected', ({ position }) => {
      setPlayers(prev => prev.map(p =>
        p.position === position ? { ...p, isConnected: false } : p
      ));
      addAnnouncement(`${getPlayerName(position)} déconnecté`);
    });

    socket.on('player-reconnected', ({ position }) => {
      setPlayers(prev => prev.map(p =>
        p.position === position ? { ...p, isConnected: true } : p
      ));
      addAnnouncement(`${getPlayerName(position)} reconnecté`);
    });

    // Demander l'état actuel au serveur (rattrape les événements manqués pendant la navigation)
    socket.emit('request-game-state');

    return () => {
      socket.off('room-joined');
      socket.off('cards-dealt');
      socket.off('bidding-update');
      socket.off('contract-set');
      socket.off('your-turn');
      socket.off('card-played');
      socket.off('trick-won');
      socket.off('belote-announced');
      socket.off('rebelote-announced');
      socket.off('round-scored');
      socket.off('game-over');
      socket.off('player-disconnected');
      socket.off('player-reconnected');
    };
  }, [myPosition, user?.username, addAnnouncement]);

  function getPlayerName(pos: Position): string {
    return players.find(p => p.position === pos)?.username ?? pos;
  }

  function getSuitSymbol(suit: Suit): string {
    return { [Suit.Spades]: '♠', [Suit.Hearts]: '♥', [Suit.Diamonds]: '♦', [Suit.Clubs]: '♣' }[suit];
  }

  function handlePlayCard(card: CardType) {
    const socket = getSocket();
    socket.emit('play-card', { card });
    setPlayableCards([]);
    setHand(prev => prev.filter(c => c.suit !== card.suit || c.rank !== card.rank));
  }

  function handleBid(value: BidValue, suit: Suit) {
    getSocket().emit('place-bid', { value, suit });
  }

  function handlePass() {
    getSocket().emit('pass');
  }

  function handleContre() {
    getSocket().emit('contre');
  }

  function handleSurcontre() {
    getSocket().emit('surcontre');
  }

  const myTeam = getTeam(myPosition);
  const isMyTurn = biddingState?.currentBidder === myPosition && phase === 'bidding';

  // Vérifier si l'utilisateur peut contre/surcontrer
  const canContreNow = biddingState?.highestBid
    ? getTeam(biddingState.highestBid.player) !== myTeam && !biddingState.isContred
    : false;
  const canSurcontreNow = biddingState?.isContred && !biddingState?.isSurcontred
    ? biddingState.highestBid && getTeam(biddingState.highestBid.player) === myTeam
    : false;

  return (
    <div className="relative w-full h-screen bg-gradient-to-br from-[#0a1f0d] to-[#0c0c0c] overflow-hidden">
      {/* Tapis de jeu */}
      <div className="absolute inset-8 rounded-3xl bg-[#145830] border-4 border-[#0f4d2a] shadow-2xl" />

      {/* Score */}
      <div className="absolute top-2 right-2 z-20 flex items-start gap-1.5">
        <PointsHelper trumpSuit={contract?.suit ?? null} />
        <ScoreBoard
          scores={scores}
          targetScore={1000}
          contract={contract}
          contractTeam={contractTeam}
          isContred={isContred}
          isSurcontred={isSurcontred}
          playerTeam={myTeam}
          roundPoints={roundPoints}
        />
      </div>

      {/* Labels des joueurs */}
      {players.map(p => (
        <PlayerLabel
          key={p.position}
          position={p.position}
          username={p.username}
          isCurrentPlayer={currentPlayer === p.position}
          isConnected={p.isConnected}
          relativePosition={getRelativePosition(p.position, myPosition)}
          cardCount={p.cardCount}
        />
      ))}

      {/* Zone du pli au centre */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <TrickArea
          currentTrick={currentTrick}
          playerPosition={myPosition}
          lastTrick={lastTrick}
          showLastTrick={showLastTrick}
          onToggleLastTrick={() => setShowLastTrick(v => !v)}
          onCloseLastTrick={() => setShowLastTrick(false)}
        />
      </div>

      {/* Main du joueur */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
        <Hand cards={hand} playableCards={playableCards} onPlayCard={handlePlayCard} trumpSuit={contract?.suit ?? null} />
      </div>

      {/* Panneau d'enchères */}
      {phase === 'bidding' && biddingState && (
        <div className="absolute bottom-36 left-1/2 -translate-x-1/2 z-30">
          <BiddingPanel
            biddingState={biddingState}
            isMyTurn={isMyTurn}
            canContre={canContreNow}
            canSurcontre={canSurcontreNow ?? false}
            onBid={handleBid}
            onPass={handlePass}
            onContre={handleContre}
            onSurcontre={handleSurcontre}
            getPlayerName={getPlayerName}
          />
        </div>
      )}

      {/* Annonces */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 space-y-1">
        <AnimatePresence>
          {announcements.map((msg, i) => (
            <motion.div
              key={`${msg}-${i}`}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="px-4 py-1.5 rounded-lg bg-black/60 text-white text-sm text-center backdrop-blur-sm"
            >
              {msg}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Résultat de manche */}
      <AnimatePresence>
        {roundResult && !gameOver && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-0 flex items-center justify-center z-40 bg-black/50 backdrop-blur-sm"
          >
            <div className="bg-[#1a1a2e] p-8 rounded-2xl border border-[#2a2a3e] shadow-2xl text-center max-w-md">
              <h3 className={`text-3xl font-bold mb-2 ${roundResult.contractMet ? 'text-[#2d8f54]' : 'text-red-400'}`}>
                {roundResult.contractMet ? '✓ Contrat réussi !' : '✗ Contrat chuté !'}
              </h3>
              {contract && (
                <p className="text-gray-400 text-sm mb-4">
                  Contrat : {contract.value} {getSuitSymbol(contract.suit)}
                  {' par '}{contractTeam === myTeam ? 'nous' : 'eux'}
                  {isContred && ' (contré)'}{isSurcontred && ' (surcontré)'}
                </p>
              )}
              <div className="grid grid-cols-2 gap-6 mb-4">
                <div className="bg-[#0a0a1a] rounded-xl p-3">
                  <div className="text-[#2d8f54] text-sm font-medium">Nous</div>
                  <div className="text-white text-2xl font-bold">+{myTeam === Team.NorthSouth ? roundResult.teamNorthSouthScore : roundResult.teamEastWestScore}</div>
                  <div className="text-gray-500 text-xs mt-1">Total : {scores[myTeam]}</div>
                </div>
                <div className="bg-[#0a0a1a] rounded-xl p-3">
                  <div className="text-red-400 text-sm font-medium">Eux</div>
                  <div className="text-white text-2xl font-bold">+{myTeam === Team.NorthSouth ? roundResult.teamEastWestScore : roundResult.teamNorthSouthScore}</div>
                  <div className="text-gray-500 text-xs mt-1">Total : {scores[myTeam === Team.NorthSouth ? Team.EastWest : Team.NorthSouth]}</div>
                </div>
              </div>
              {roundResult.beloteBonus > 0 && (
                <p className="text-yellow-400 text-sm mb-2">Belote-Rebelote : +{roundResult.beloteBonus}</p>
              )}
              <p className="text-gray-500 text-sm">Prochaine manche dans quelques secondes...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fin de partie */}
      <AnimatePresence>
        {gameOver && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 flex items-center justify-center z-50 bg-black/60 backdrop-blur-sm"
          >
            <div className="bg-[#1a1a2e] p-10 rounded-2xl border border-[#d4a843] shadow-2xl text-center max-w-md">
              <h2 className="text-4xl font-bold mb-4">
                {gameOver.winner === myTeam
                  ? <span className="text-[#d4a843]">🏆 Victoire !</span>
                  : <span className="text-red-400">Défaite...</span>
                }
              </h2>
              <p className="text-gray-300 text-lg mb-2">
                {gameOver.winner === myTeam ? 'Félicitations !' : 'Dommage, ce sera pour la prochaine !'}
              </p>
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="bg-[#0a0a1a] rounded-xl p-4">
                  <div className="text-[#2d8f54] text-sm font-medium">Nous</div>
                  <div className="text-white text-3xl font-bold">{gameOver.scores[myTeam]}</div>
                </div>
                <div className="bg-[#0a0a1a] rounded-xl p-4">
                  <div className="text-red-400 text-sm font-medium">Eux</div>
                  <div className="text-white text-3xl font-bold">{gameOver.scores[myTeam === Team.NorthSouth ? Team.EastWest : Team.NorthSouth]}</div>
                </div>
              </div>
              <a
                href="/"
                className="inline-block px-8 py-3 rounded-xl bg-[#1a6b3c] hover:bg-[#2d8f54] text-white font-semibold transition"
              >
                Retour à l'accueil
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
