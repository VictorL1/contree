// Package @contree/shared — Moteur de règles du jeu de Contrée

// Types
export {
  Suit, Rank, Position, Team, GamePhase,
  type Card, type Bid, type BidValue, type TrumpSuit,
  type BiddingAction, type BiddingState,
  type Trick, type PlayedCard, type PlayerState,
  type RoundScore, type GameState,
  type ClientEvents, type ServerEvents,
} from './types.js';

// Constantes
export {
  BID_VALUES, bidValueToNumber,
  TRUMP_POINTS, NON_TRUMP_POINTS,
  TRUMP_ORDER, NON_TRUMP_ORDER,
  TOTAL_CARD_POINTS, DIX_DE_DER, TOTAL_POINTS,
  BELOTE_BONUS, CARDS_PER_PLAYER, TRICKS_PER_ROUND,
  NUM_PLAYERS, DEFAULT_TARGET_SCORE, PLAY_ORDER,
  nextPlayer, getTeam, getPartner, getOpposingTeam,
  getCardPoints, getCardStrength,
} from './constants.js';

// Deck
export { createDeck, shuffleDeck, dealCards, isSameCard } from './deck.js';

// Enchères
export {
  createBiddingState, isValidBid,
  canContre, canSurcontre,
  placeBid, passBid, applyContre, applySurcontre,
  isBiddingOver, isBiddingFailed,
} from './bidding.js';

// Règles de jeu
export {
  getPlayableCards, determineTrickWinner, isValidPlay,
  hasBelote, isBeloteCard,
} from './rules.js';

// Scoring
export {
  calculateTrickPoints, calculateRoundScore,
  isGameOver, getWinner,
} from './scoring.js';
