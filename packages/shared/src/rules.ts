import { Suit, Rank, Position, type Card, type Trick, type PlayedCard } from './types.js';
import {
  getCardStrength,
  getPartner,
  TRUMP_ORDER,
  NON_TRUMP_ORDER,
} from './constants.js';
import { isSameCard } from './deck.js';

// ============================================================
// Règles de jeu de la Contrée
// ============================================================

/**
 * Détermine les cartes jouables depuis une main, selon les règles de la Contrée :
 *
 * 1. Si on est le premier à jouer → toutes les cartes
 * 2. Si on a de la couleur demandée → on doit fournir
 *    - Si c'est de l'atout demandé → on doit monter si possible
 * 3. Si on n'a pas la couleur demandée :
 *    a) Si le partenaire est maître du pli → on peut jouer ce qu'on veut (défausser ou couper)
 *    b) Si le partenaire n'est pas maître :
 *       - On doit couper (jouer atout) si on a de l'atout
 *       - On doit surcouper si possible (atout plus fort que celui déjà posé)
 *       - Si on ne peut pas surcouper, on sous-coupe (on met un atout plus faible)
 *       - Si on n'a pas d'atout → on défausse ce qu'on veut
 */
export function getPlayableCards(
  hand: Card[],
  currentTrick: Trick,
  trumpSuit: Suit,
  player: Position,
): Card[] {
  // Premier à jouer → tout est jouable
  if (currentTrick.cards.length === 0) {
    return [...hand];
  }

  const leadSuit = currentTrick.leadSuit;
  const cardsOfLeadSuit = hand.filter(c => c.suit === leadSuit);
  const trumpCards = hand.filter(c => c.suit === trumpSuit);

  // Cas 1 : la couleur demandée est de l'atout
  if (leadSuit === trumpSuit) {
    if (trumpCards.length === 0) {
      // Pas d'atout → défausse libre
      return [...hand];
    }
    // On a de l'atout → on doit monter si possible
    const highestTrumpPlayed = getHighestTrumpInTrick(currentTrick, trumpSuit);
    const higherTrumps = trumpCards.filter(
      c => getCardStrength(c, trumpSuit) < getCardStrength(highestTrumpPlayed!, trumpSuit)
    );
    // Si on peut monter, on doit monter
    if (higherTrumps.length > 0) return higherTrumps;
    // Sinon on joue n'importe quel atout (sous-couper)
    return trumpCards;
  }

  // Cas 2 : la couleur demandée n'est pas l'atout
  if (cardsOfLeadSuit.length > 0) {
    // On a la couleur demandée → on doit fournir (n'importe quelle carte de cette couleur)
    return cardsOfLeadSuit;
  }

  // Cas 3 : on n'a pas la couleur demandée
  const partnerPosition = getPartner(player);
  const partnerIsMaster = isPartnerWinning(currentTrick, trumpSuit, partnerPosition);

  if (partnerIsMaster) {
    // Le partenaire maîtrise → on peut jouer n'importe quoi (défausser ou couper)
    return [...hand];
  }

  // Le partenaire ne maîtrise pas → on doit pisser (couper à l'atout)
  if (trumpCards.length === 0) {
    // Pas d'atout → défausse libre
    return [...hand];
  }

  // On a de l'atout → on doit surcouper si possible
  const highestTrumpInTrick = getHighestTrumpInTrick(currentTrick, trumpSuit);
  if (highestTrumpInTrick) {
    const higherTrumps = trumpCards.filter(
      c => getCardStrength(c, trumpSuit) < getCardStrength(highestTrumpInTrick, trumpSuit)
    );
    if (higherTrumps.length > 0) return higherTrumps;
  }

  // Pas de surcoupage possible → on sous-coupe (n'importe quel atout)
  return trumpCards;
}

/** Retourne l'atout le plus fort joué dans le pli en cours, ou null */
function getHighestTrumpInTrick(trick: Trick, trumpSuit: Suit): Card | null {
  const trumpsPlayed = trick.cards.filter(pc => pc.card.suit === trumpSuit);
  if (trumpsPlayed.length === 0) return null;

  return trumpsPlayed.reduce((best, pc) =>
    getCardStrength(pc.card, trumpSuit) < getCardStrength(best.card, trumpSuit) ? pc : best
  ).card;
}

/** Vérifie si le partenaire est actuellement maître du pli */
function isPartnerWinning(trick: Trick, trumpSuit: Suit, partnerPosition: Position): boolean {
  if (trick.cards.length === 0) return false;
  const winningSoFar = determineTrickWinnerSoFar(trick, trumpSuit);
  return winningSoFar === partnerPosition;
}

/** Détermine qui est en train de gagner le pli (parmi les cartes déjà jouées) */
function determineTrickWinnerSoFar(trick: Trick, trumpSuit: Suit): Position {
  let winningPlay = trick.cards[0];

  for (let i = 1; i < trick.cards.length; i++) {
    const challenger = trick.cards[i];
    if (beats(challenger.card, winningPlay.card, trick.leadSuit, trumpSuit)) {
      winningPlay = challenger;
    }
  }

  return winningPlay.player;
}

/** Vérifie si la carte A bat la carte B */
function beats(a: Card, b: Card, leadSuit: Suit, trumpSuit: Suit): boolean {
  const aIsTrump = a.suit === trumpSuit;
  const bIsTrump = b.suit === trumpSuit;

  // Atout bat toujours non-atout
  if (aIsTrump && !bIsTrump) return true;
  if (!aIsTrump && bIsTrump) return false;

  // Les deux sont atout → le plus fort gagne
  if (aIsTrump && bIsTrump) {
    return getCardStrength(a, trumpSuit) < getCardStrength(b, trumpSuit);
  }

  // Aucun n'est atout
  // La couleur demandée bat les autres couleurs
  if (a.suit === leadSuit && b.suit !== leadSuit) return true;
  if (a.suit !== leadSuit && b.suit === leadSuit) return false;

  // Même couleur → la plus forte gagne
  if (a.suit === b.suit) {
    return getCardStrength(a, trumpSuit) < getCardStrength(b, trumpSuit);
  }

  // Couleurs différentes, aucune n'est la couleur demandée → la première posée gagne
  return false;
}

/** Détermine le gagnant d'un pli complet (4 cartes) */
export function determineTrickWinner(trick: Trick, trumpSuit: Suit): Position {
  if (trick.cards.length !== 4) {
    throw new Error('Un pli doit contenir exactement 4 cartes');
  }
  return determineTrickWinnerSoFar(trick, trumpSuit);
}

/** Vérifie si un joueur peut jouer une carte donnée */
export function isValidPlay(
  card: Card,
  hand: Card[],
  currentTrick: Trick,
  trumpSuit: Suit,
  player: Position,
): boolean {
  // La carte doit être dans la main du joueur
  if (!hand.some(c => isSameCard(c, card))) return false;

  // La carte doit être parmi les cartes jouables
  const playable = getPlayableCards(hand, currentTrick, trumpSuit, player);
  return playable.some(c => isSameCard(c, card));
}

/**
 * Détecte si un joueur possède la Belote (Roi + Dame d'atout)
 */
export function hasBelote(hand: Card[], trumpSuit: Suit): boolean {
  const hasKing = hand.some(c => c.suit === trumpSuit && c.rank === Rank.King);
  const hasQueen = hand.some(c => c.suit === trumpSuit && c.rank === Rank.Queen);
  return hasKing && hasQueen;
}

/**
 * Vérifie si la carte jouée est le Roi ou la Dame d'atout (pour annoncer belote/rebelote)
 */
export function isBeloteCard(card: Card, trumpSuit: Suit): boolean {
  return card.suit === trumpSuit && (card.rank === Rank.King || card.rank === Rank.Queen);
}
