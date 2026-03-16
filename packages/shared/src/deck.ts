import { Suit, Rank, type Card } from './types.js';
import { CARDS_PER_PLAYER, NUM_PLAYERS } from './constants.js';

function randomInt(maxExclusive: number): number {
  const cryptoObj = (globalThis as { crypto?: { getRandomValues?: (array: Uint32Array) => Uint32Array } }).crypto;

  if (!cryptoObj?.getRandomValues) {
    return Math.floor(Math.random() * maxExclusive);
  }

  // Rejection sampling to avoid modulo bias.
  const maxUint32 = 0x100000000;
  const limit = maxUint32 - (maxUint32 % maxExclusive);
  const buffer = new Uint32Array(1);

  while (true) {
    cryptoObj.getRandomValues(buffer);
    const value = buffer[0];
    if (value < limit) return value % maxExclusive;
  }
}

// ============================================================
// Gestion du paquet de 32 cartes
// ============================================================

/** Crée un jeu de 32 cartes ordonné */
export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of Object.values(Suit)) {
    for (const rank of Object.values(Rank)) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}

/**
 * Mélange un paquet de cartes (Fisher-Yates shuffle)
 * Retourne un nouveau tableau, ne modifie pas l'original
 */
export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Distribue 8 cartes à chaque joueur d'un seul coup (règle de la contrée)
 * Retourne un tableau de 4 mains de 8 cartes
 */
export function dealCards(deck: Card[]): Card[][] {
  if (deck.length < CARDS_PER_PLAYER * NUM_PLAYERS) {
    throw new Error(`Le paquet doit contenir au moins ${CARDS_PER_PLAYER * NUM_PLAYERS} cartes`);
  }

  const hands: Card[][] = [];
  for (let i = 0; i < NUM_PLAYERS; i++) {
    hands.push(deck.slice(i * CARDS_PER_PLAYER, (i + 1) * CARDS_PER_PLAYER));
  }
  return hands;
}

/** Vérifie si deux cartes sont identiques */
export function isSameCard(a: Card, b: Card): boolean {
  return a.suit === b.suit && a.rank === b.rank;
}
