import { describe, it, expect } from 'vitest';
import { createDeck, shuffleDeck, dealCards, isSameCard } from '../deck.js';
import { Suit, Rank } from '../types.js';

describe('createDeck', () => {
  it('crée un jeu de 32 cartes', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(32);
  });

  it('contient toutes les combinaisons couleur/rang', () => {
    const deck = createDeck();
    for (const suit of Object.values(Suit)) {
      for (const rank of Object.values(Rank)) {
        expect(deck.some(c => c.suit === suit && c.rank === rank)).toBe(true);
      }
    }
  });

  it('ne contient pas de doublons', () => {
    const deck = createDeck();
    const keys = deck.map(c => `${c.suit}-${c.rank}`);
    expect(new Set(keys).size).toBe(32);
  });
});

describe('shuffleDeck', () => {
  it('retourne un nouveau tableau de même taille', () => {
    const deck = createDeck();
    const shuffled = shuffleDeck(deck);
    expect(shuffled).toHaveLength(32);
    expect(shuffled).not.toBe(deck); // nouveau tableau
  });

  it('contient les mêmes cartes', () => {
    const deck = createDeck();
    const shuffled = shuffleDeck(deck);
    for (const card of deck) {
      expect(shuffled.some(c => isSameCard(c, card))).toBe(true);
    }
  });
});

describe('dealCards', () => {
  it('distribue 4 mains de 8 cartes', () => {
    const deck = createDeck();
    const hands = dealCards(deck);
    expect(hands).toHaveLength(4);
    for (const hand of hands) {
      expect(hand).toHaveLength(8);
    }
  });

  it('distribue toutes les cartes sans doublons', () => {
    const deck = shuffleDeck(createDeck());
    const hands = dealCards(deck);
    const allCards = hands.flat();
    expect(allCards).toHaveLength(32);
    const keys = allCards.map(c => `${c.suit}-${c.rank}`);
    expect(new Set(keys).size).toBe(32);
  });

  it('refuse un paquet trop petit', () => {
    expect(() => dealCards([])).toThrow();
  });
});

describe('isSameCard', () => {
  it('identifie deux cartes identiques', () => {
    expect(isSameCard(
      { suit: Suit.Hearts, rank: Rank.Ace },
      { suit: Suit.Hearts, rank: Rank.Ace },
    )).toBe(true);
  });

  it('distingue deux cartes différentes', () => {
    expect(isSameCard(
      { suit: Suit.Hearts, rank: Rank.Ace },
      { suit: Suit.Spades, rank: Rank.Ace },
    )).toBe(false);
  });
});
