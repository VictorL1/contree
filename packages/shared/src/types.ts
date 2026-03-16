// ============================================================
// Types fondamentaux du jeu de Contrée
// ============================================================

/** Les 4 couleurs du jeu de 32 cartes */
export enum Suit {
  Spades = 'spades',     // Pique
  Hearts = 'hearts',     // Coeur
  Diamonds = 'diamonds', // Carreau
  Clubs = 'clubs',       // Trèfle
}

/** Les 8 rangs du jeu de 32 cartes (du 7 à l'As) */
export enum Rank {
  Seven = '7',
  Eight = '8',
  Nine = '9',
  Ten = '10',
  Jack = 'J',   // Valet
  Queen = 'Q',  // Dame
  King = 'K',   // Roi
  Ace = 'A',    // As
}

/** Une carte = une couleur + un rang */
export interface Card {
  suit: Suit;
  rank: Rank;
}

/** Positions des 4 joueurs autour de la table (sens horaire) */
export enum Position {
  South = 'south',
  West = 'west',
  North = 'north',
  East = 'east',
}

/** Les 2 équipes : Nord/Sud vs Est/Ouest */
export enum Team {
  NorthSouth = 'north-south',
  EastWest = 'east-west',
}

/** Couleur d'atout choisie lors des enchères */
export type TrumpSuit = Suit;

/** Enchère posée par un joueur */
export interface Bid {
  player: Position;
  value: BidValue;
  suit: TrumpSuit;
}

/** Valeurs d'enchères possibles (de 80 à 160 par pas de 10, plus capot et général) */
export type BidValue = 80 | 90 | 100 | 110 | 120 | 130 | 140 | 150 | 160 | 'capot' | 'generale';

/** Actions possibles pendant la phase d'enchères */
export type BiddingAction =
  | { type: 'bid'; bid: Bid }
  | { type: 'pass' }
  | { type: 'contre' }
  | { type: 'surcontre' };

/** État de la phase d'enchères */
export interface BiddingState {
  bids: Bid[];
  currentBidder: Position;
  highestBid: Bid | null;
  consecutivePasses: number;
  isContred: boolean;
  isSurcontred: boolean;
  contredBy: Position | null;
  surcontredBy: Position | null;
}

/** Un pli (4 cartes jouées) */
export interface Trick {
  cards: PlayedCard[];
  leadSuit: Suit;
  winner: Position | null;
}

/** Carte jouée par un joueur */
export interface PlayedCard {
  card: Card;
  player: Position;
}

/** État d'un joueur dans la partie */
export interface PlayerState {
  position: Position;
  hand: Card[];
  userId: string;
  username: string;
  isConnected: boolean;
  hasBelote: boolean; // Possède R+D d'atout
  beloteAnnounced: boolean;
  rebeloteAnnounced: boolean;
}

/** Phases de la partie */
export enum GamePhase {
  Waiting = 'waiting',
  Bidding = 'bidding',
  Playing = 'playing',
  Scoring = 'scoring',
  GameOver = 'game-over',
}

/** Score d'une manche */
export interface RoundScore {
  attackPoints: number;   // Points plis de l'attaque
  defensePoints: number;  // Points plis de la défense
  beloteBonus: number;    // 20 points si belote-rebelote
  contractMet: boolean;   // Contrat réussi ?
  teamNorthSouthScore: number; // Score final de la manche pour N/S
  teamEastWestScore: number;   // Score final de la manche pour E/O
}

/** État complet d'une partie */
export interface GameState {
  id: string;
  phase: GamePhase;
  players: Map<Position, PlayerState>;
  deck: Card[];

  // Enchères
  bidding: BiddingState;
  contract: Bid | null;
  contractTeam: Team | null;
  isContred: boolean;
  isSurcontred: boolean;

  // Jeu
  trumpSuit: TrumpSuit | null;
  currentTrick: Trick;
  tricks: Trick[];
  currentPlayer: Position;
  trickCount: number;

  // Scores
  scores: {
    [Team.NorthSouth]: number;
    [Team.EastWest]: number;
  };
  roundHistory: RoundScore[];
  targetScore: number;
  dealer: Position;
}

/** Événements Socket.IO client → serveur */
export interface ClientEvents {
  'create-room': (data: { targetScore: number }) => void;
  'join-room': (data: { roomCode: string; preferredPosition?: Position }) => void;
  'select-seat': (data: { position: Position }) => void;
  'player-ready': () => void;
  'place-bid': (data: { value: BidValue; suit: TrumpSuit }) => void;
  'pass': () => void;
  'contre': () => void;
  'surcontre': () => void;
  'play-card': (data: { card: Card }) => void;
  'chat-message': (data: { message: string }) => void;
  'request-game-state': () => void;
}

/** Événements Socket.IO serveur → client */
export interface ServerEvents {
  'room-created': (data: { roomCode: string }) => void;
  'room-joined': (data: { players: { position: Position; username: string }[]; yourPosition: Position | null }) => void;
  'player-joined': (data: { position: Position; username: string }) => void;
  'player-left': (data: { position: Position }) => void;
  'game-started': (data: { dealer: Position }) => void;
  'cards-dealt': (data: { hand: Card[] }) => void;
  'bidding-update': (data: BiddingState) => void;
  'contract-set': (data: { contract: Bid; team: Team; contred: boolean; surcontred: boolean }) => void;
  'your-turn': (data: { playableCards: Card[] }) => void;
  'card-played': (data: { player: Position; card: Card }) => void;
  'belote-announced': (data: { player: Position }) => void;
  'rebelote-announced': (data: { player: Position }) => void;
  'trick-won': (data: { winner: Position; trick: Trick; trickPoints: { [Team.NorthSouth]: number; [Team.EastWest]: number } }) => void;
  'round-scored': (data: RoundScore) => void;
  'game-over': (data: { winner: Team; scores: { [Team.NorthSouth]: number; [Team.EastWest]: number } }) => void;
  'chat-message': (data: { username: string; message: string }) => void;
  'player-reconnected': (data: { position: Position }) => void;
  'player-disconnected': (data: { position: Position }) => void;
  'error': (data: { message: string }) => void;
}
