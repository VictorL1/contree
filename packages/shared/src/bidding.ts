import { Position, type Bid, type BidValue, type BiddingState, type TrumpSuit } from './types.js';
import { BID_VALUES, bidValueToNumber, nextPlayer, getTeam } from './constants.js';

// ============================================================
// Logique des enchères de la Contrée
// ============================================================

/** Crée un état d'enchères initial */
export function createBiddingState(firstBidder: Position): BiddingState {
  return {
    bids: [],
    currentBidder: firstBidder,
    highestBid: null,
    consecutivePasses: 0,
    isContred: false,
    isSurcontred: false,
    contredBy: null,
    surcontredBy: null,
  };
}

/** Vérifie si une enchère est valide (supérieure à la précédente) */
export function isValidBid(value: BidValue, currentHighest: Bid | null): boolean {
  if (!currentHighest) return true;
  return bidValueToNumber(value) > bidValueToNumber(currentHighest.value);
}

/** Vérifie si un joueur peut contrer (doit être de l'équipe adverse au dernier enchérisseur) */
export function canContre(player: Position, state: BiddingState): boolean {
  if (!state.highestBid) return false;
  if (state.isContred) return false;
  // Seule l'équipe adverse peut contrer
  return getTeam(player) !== getTeam(state.highestBid.player);
}

/** Vérifie si un joueur peut surcontrer (doit être de l'équipe qui a enchéri, après un contre) */
export function canSurcontre(player: Position, state: BiddingState): boolean {
  if (!state.highestBid) return false;
  if (!state.isContred) return false;
  if (state.isSurcontred) return false;
  // Seule l'équipe qui a enchéri peut surcontrer
  return getTeam(player) === getTeam(state.highestBid.player);
}

/**
 * Applique une action d'enchère et retourne le nouvel état
 * Retourne null si l'action est invalide
 */
export function placeBid(
  state: BiddingState,
  value: BidValue,
  suit: TrumpSuit,
  player: Position,
): BiddingState | null {
  if (player !== state.currentBidder) return null;
  if (!isValidBid(value, state.highestBid)) return null;

  const bid: Bid = { player, value, suit };
  return {
    ...state,
    bids: [...state.bids, bid],
    highestBid: bid,
    currentBidder: nextPlayer(player),
    consecutivePasses: 0,
    // Un nouveau contrat annule un éventuel contre/surcontre précédent
    isContred: false,
    isSurcontred: false,
    contredBy: null,
    surcontredBy: null,
  };
}

/** Applique un passe */
export function passBid(state: BiddingState, player: Position): BiddingState | null {
  if (player !== state.currentBidder) return null;

  return {
    ...state,
    currentBidder: nextPlayer(player),
    consecutivePasses: state.consecutivePasses + 1,
  };
}

/** Applique un contre */
export function applyContre(state: BiddingState, player: Position): BiddingState | null {
  if (player !== state.currentBidder) return null;
  if (!canContre(player, state)) return null;

  return {
    ...state,
    isContred: true,
    contredBy: player,
    currentBidder: nextPlayer(player),
    consecutivePasses: 0,
  };
}

/** Applique un surcontre */
export function applySurcontre(state: BiddingState, player: Position): BiddingState | null {
  if (player !== state.currentBidder) return null;
  if (!canSurcontre(player, state)) return null;

  return {
    ...state,
    isSurcontred: true,
    surcontredBy: player,
    currentBidder: nextPlayer(player),
    consecutivePasses: 0,
  };
}

/**
 * Les enchères sont terminées quand :
 * - 3 passes consécutifs après une enchère (ou après un contre/surcontre)
 * - 4 passes consécutifs sans aucune enchère (personne n'enchérit → on redistribue)
 */
export function isBiddingOver(state: BiddingState): boolean {
  // Personne n'a enchéri et tout le monde a passé
  if (!state.highestBid && state.consecutivePasses >= 4) return true;
  // Quelqu'un a enchéri et 3 joueurs ont passé ensuite
  if (state.highestBid && state.consecutivePasses >= 3) return true;
  return false;
}

/** Vérifie si les enchères ont échoué (tout le monde a passé sans enchérir) */
export function isBiddingFailed(state: BiddingState): boolean {
  return !state.highestBid && state.consecutivePasses >= 4;
}
