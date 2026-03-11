import { describe, it, expect } from 'vitest';
import { getPlayableCards, determineTrickWinner, isValidPlay, hasBelote, isBeloteCard } from '../rules.js';
import { Suit, Rank, Position, type Card, type Trick } from '../types.js';

// Helpers
const card = (suit: Suit, rank: Rank): Card => ({ suit, rank });
const emptyTrick = (): Trick => ({ cards: [], leadSuit: Suit.Hearts, winner: null });

describe('getPlayableCards', () => {
  const trump = Suit.Hearts;

  it('toutes les cartes jouables si premier à jouer', () => {
    const hand = [
      card(Suit.Hearts, Rank.Ace),
      card(Suit.Spades, Rank.Seven),
      card(Suit.Clubs, Rank.King),
    ];
    const trick = emptyTrick();
    const playable = getPlayableCards(hand, trick, trump, Position.South);
    expect(playable).toHaveLength(3);
  });

  it('doit fournir la couleur demandée', () => {
    const hand = [
      card(Suit.Spades, Rank.Ace),
      card(Suit.Spades, Rank.Seven),
      card(Suit.Hearts, Rank.King),
      card(Suit.Clubs, Rank.Ten),
    ];
    const trick: Trick = {
      cards: [{ card: card(Suit.Spades, Rank.Ten), player: Position.West }],
      leadSuit: Suit.Spades,
      winner: null,
    };
    const playable = getPlayableCards(hand, trick, trump, Position.South);
    // Doit fournir pique
    expect(playable).toHaveLength(2);
    expect(playable.every(c => c.suit === Suit.Spades)).toBe(true);
  });

  it('doit monter à l atout si atout demandé', () => {
    const hand = [
      card(Suit.Hearts, Rank.Nine),  // Atout fort (2ème plus fort)
      card(Suit.Hearts, Rank.Seven), // Atout faible
      card(Suit.Spades, Rank.Ace),
    ];
    const trick: Trick = {
      cards: [{ card: card(Suit.Hearts, Rank.Queen), player: Position.West }],
      leadSuit: Suit.Hearts,
      winner: null,
    };
    const playable = getPlayableCards(hand, trick, trump, Position.South);
    // Doit monter : seul le 9 de coeur bat la Dame d'atout
    expect(playable).toHaveLength(1);
    expect(playable[0].rank).toBe(Rank.Nine);
  });

  it('sous-coupe à l atout si impossible de monter', () => {
    const hand = [
      card(Suit.Hearts, Rank.Seven), // Atout faible
      card(Suit.Hearts, Rank.Eight), // Atout faible
      card(Suit.Spades, Rank.Ace),
    ];
    const trick: Trick = {
      cards: [{ card: card(Suit.Hearts, Rank.Jack), player: Position.West }], // Valet = plus fort atout
      leadSuit: Suit.Hearts,
      winner: null,
    };
    const playable = getPlayableCards(hand, trick, trump, Position.South);
    // Ne peut pas monter → joue n'importe quel atout
    expect(playable).toHaveLength(2);
    expect(playable.every(c => c.suit === Suit.Hearts)).toBe(true);
  });

  it('partenaire maître → jeu libre', () => {
    const hand = [
      card(Suit.Hearts, Rank.Seven),
      card(Suit.Clubs, Rank.Ace),
      card(Suit.Diamonds, Rank.Ten),
    ];
    // West a joué pique, North (partenaire de South) a joué l'As de pique
    const trick: Trick = {
      cards: [
        { card: card(Suit.Spades, Rank.Ten), player: Position.West },
        { card: card(Suit.Spades, Rank.Ace), player: Position.North },
      ],
      leadSuit: Suit.Spades,
      winner: null,
    };
    // South n'a pas de pique, mais le partenaire (North) est maître → jeu libre
    const playable = getPlayableCards(hand, trick, trump, Position.South);
    expect(playable).toHaveLength(3);
  });

  it('partenaire pas maître → doit pisser à l atout', () => {
    const hand = [
      card(Suit.Hearts, Rank.Seven), // Atout
      card(Suit.Hearts, Rank.Nine),  // Atout
      card(Suit.Clubs, Rank.Ace),    // Pas atout
      card(Suit.Diamonds, Rank.Ten), // Pas atout
    ];
    // West a joué As de pique, North a joué 7 de pique — West est maître
    const trick: Trick = {
      cards: [
        { card: card(Suit.Spades, Rank.Ace), player: Position.West },
        { card: card(Suit.Spades, Rank.Seven), player: Position.North },
      ],
      leadSuit: Suit.Spades,
      winner: null,
    };
    // South n'a pas de pique, partenaire pas maître → doit couper
    const playable = getPlayableCards(hand, trick, trump, Position.South);
    expect(playable).toHaveLength(2);
    expect(playable.every(c => c.suit === Suit.Hearts)).toBe(true);
  });

  it('doit surcouper si possible', () => {
    const hand = [
      card(Suit.Hearts, Rank.Jack),  // Valet d'atout (le plus fort)
      card(Suit.Hearts, Rank.Seven), // Atout faible
      card(Suit.Clubs, Rank.Ace),
    ];
    // West joue carreau, North joue carreau, East coupe avec 9 d'atout
    const trick: Trick = {
      cards: [
        { card: card(Suit.Diamonds, Rank.Ace), player: Position.West },
        { card: card(Suit.Diamonds, Rank.Seven), player: Position.North },
        { card: card(Suit.Hearts, Rank.Nine), player: Position.East },
      ],
      leadSuit: Suit.Diamonds,
      winner: null,
    };
    // South n'a pas de carreau, East a coupé → doit surcouper
    const playable = getPlayableCards(hand, trick, trump, Position.South);
    // Seul le valet surcoupe le 9
    expect(playable).toHaveLength(1);
    expect(playable[0].rank).toBe(Rank.Jack);
  });

  it('sous-coupe si impossible de surcouper', () => {
    const hand = [
      card(Suit.Hearts, Rank.Seven), // Atout faible
      card(Suit.Hearts, Rank.Eight), // Atout faible
      card(Suit.Clubs, Rank.Ace),
    ];
    const trick: Trick = {
      cards: [
        { card: card(Suit.Diamonds, Rank.Ace), player: Position.West },
        { card: card(Suit.Diamonds, Rank.Seven), player: Position.North },
        { card: card(Suit.Hearts, Rank.Jack), player: Position.East }, // Valet = plus fort
      ],
      leadSuit: Suit.Diamonds,
      winner: null,
    };
    const playable = getPlayableCards(hand, trick, trump, Position.South);
    // Ne peut pas surcouper le valet → sous-coupe avec n'importe quel atout
    expect(playable).toHaveLength(2);
    expect(playable.every(c => c.suit === Suit.Hearts)).toBe(true);
  });

  it('défausse libre si pas d atout et pas de couleur demandée', () => {
    const hand = [
      card(Suit.Clubs, Rank.Ace),
      card(Suit.Diamonds, Rank.Ten),
    ];
    const trick: Trick = {
      cards: [{ card: card(Suit.Spades, Rank.Ten), player: Position.West }],
      leadSuit: Suit.Spades,
      winner: null,
    };
    // Pas de pique ni de coeur (atout) → défausse libre
    const playable = getPlayableCards(hand, trick, trump, Position.South);
    expect(playable).toHaveLength(2);
  });
});

describe('determineTrickWinner', () => {
  const trump = Suit.Hearts;

  it('la plus forte carte de la couleur demandée gagne (pas d atout)', () => {
    const trick: Trick = {
      cards: [
        { card: card(Suit.Spades, Rank.Ten), player: Position.South },
        { card: card(Suit.Spades, Rank.Ace), player: Position.West },
        { card: card(Suit.Spades, Rank.Seven), player: Position.North },
        { card: card(Suit.Spades, Rank.King), player: Position.East },
      ],
      leadSuit: Suit.Spades,
      winner: null,
    };
    expect(determineTrickWinner(trick, trump)).toBe(Position.West); // As = plus fort non-atout
  });

  it('l atout bat la couleur demandée', () => {
    const trick: Trick = {
      cards: [
        { card: card(Suit.Spades, Rank.Ace), player: Position.South },
        { card: card(Suit.Hearts, Rank.Seven), player: Position.West }, // Atout, même le 7
        { card: card(Suit.Spades, Rank.King), player: Position.North },
        { card: card(Suit.Clubs, Rank.Ace), player: Position.East },
      ],
      leadSuit: Suit.Spades,
      winner: null,
    };
    expect(determineTrickWinner(trick, trump)).toBe(Position.West);
  });

  it('le plus fort atout gagne entre deux atouts', () => {
    const trick: Trick = {
      cards: [
        { card: card(Suit.Spades, Rank.Ace), player: Position.South },
        { card: card(Suit.Hearts, Rank.Seven), player: Position.West },
        { card: card(Suit.Hearts, Rank.Nine), player: Position.North }, // 9 d'atout = très fort
        { card: card(Suit.Clubs, Rank.Ace), player: Position.East },
      ],
      leadSuit: Suit.Spades,
      winner: null,
    };
    expect(determineTrickWinner(trick, trump)).toBe(Position.North); // 9 > 7 en atout
  });

  it('le valet d atout est le plus fort', () => {
    const trick: Trick = {
      cards: [
        { card: card(Suit.Hearts, Rank.Ace), player: Position.South },  // 3ème en atout
        { card: card(Suit.Hearts, Rank.Jack), player: Position.West },  // 1er en atout
        { card: card(Suit.Hearts, Rank.Nine), player: Position.North }, // 2ème en atout
        { card: card(Suit.Hearts, Rank.Ten), player: Position.East },   // 4ème en atout
      ],
      leadSuit: Suit.Hearts,
      winner: null,
    };
    expect(determineTrickWinner(trick, trump)).toBe(Position.West);
  });

  it('une couleur hors-sujet ne gagne pas', () => {
    const trick: Trick = {
      cards: [
        { card: card(Suit.Spades, Rank.Seven), player: Position.South },
        { card: card(Suit.Clubs, Rank.Ace), player: Position.West },  // Hors-sujet
        { card: card(Suit.Spades, Rank.Ten), player: Position.North },
        { card: card(Suit.Diamonds, Rank.Ace), player: Position.East }, // Hors-sujet
      ],
      leadSuit: Suit.Spades,
      winner: null,
    };
    expect(determineTrickWinner(trick, trump)).toBe(Position.North); // 10 de pique > 7 de pique
  });

  it('refuse un pli incomplet', () => {
    const trick: Trick = {
      cards: [{ card: card(Suit.Spades, Rank.Ace), player: Position.South }],
      leadSuit: Suit.Spades,
      winner: null,
    };
    expect(() => determineTrickWinner(trick, trump)).toThrow();
  });
});

describe('isValidPlay', () => {
  const trump = Suit.Hearts;

  it('accepte une carte jouable de la main', () => {
    const hand = [card(Suit.Spades, Rank.Ace), card(Suit.Hearts, Rank.Seven)];
    const trick = emptyTrick();
    expect(isValidPlay(card(Suit.Spades, Rank.Ace), hand, trick, trump, Position.South)).toBe(true);
  });

  it('refuse une carte absente de la main', () => {
    const hand = [card(Suit.Spades, Rank.Ace)];
    const trick = emptyTrick();
    expect(isValidPlay(card(Suit.Clubs, Rank.King), hand, trick, trump, Position.South)).toBe(false);
  });
});

describe('hasBelote', () => {
  it('détecte Roi + Dame d atout', () => {
    const hand = [
      card(Suit.Hearts, Rank.King),
      card(Suit.Hearts, Rank.Queen),
      card(Suit.Spades, Rank.Ace),
    ];
    expect(hasBelote(hand, Suit.Hearts)).toBe(true);
  });

  it('pas de belote si couleur différente', () => {
    const hand = [
      card(Suit.Spades, Rank.King),
      card(Suit.Spades, Rank.Queen),
      card(Suit.Hearts, Rank.Ace),
    ];
    expect(hasBelote(hand, Suit.Hearts)).toBe(false);
  });

  it('pas de belote s il manque une carte', () => {
    const hand = [
      card(Suit.Hearts, Rank.King),
      card(Suit.Hearts, Rank.Ace),
    ];
    expect(hasBelote(hand, Suit.Hearts)).toBe(false);
  });
});

describe('isBeloteCard', () => {
  it('identifie le Roi d atout', () => {
    expect(isBeloteCard(card(Suit.Hearts, Rank.King), Suit.Hearts)).toBe(true);
  });

  it('identifie la Dame d atout', () => {
    expect(isBeloteCard(card(Suit.Hearts, Rank.Queen), Suit.Hearts)).toBe(true);
  });

  it('rejette une autre carte d atout', () => {
    expect(isBeloteCard(card(Suit.Hearts, Rank.Ace), Suit.Hearts)).toBe(false);
  });

  it('rejette Roi/Dame d une autre couleur', () => {
    expect(isBeloteCard(card(Suit.Spades, Rank.King), Suit.Hearts)).toBe(false);
  });
});
