import { describe, it, expect } from 'vitest';
import {
  bidValueToNumber, nextPlayer, getTeam, getPartner,
  getOpposingTeam, getCardPoints, getCardStrength,
  TRUMP_POINTS, NON_TRUMP_POINTS,
} from '../constants.js';
import { Suit, Rank, Position, Team } from '../types.js';

describe('bidValueToNumber', () => {
  it('retourne la valeur numérique pour les enchères normales', () => {
    expect(bidValueToNumber(80)).toBe(80);
    expect(bidValueToNumber(160)).toBe(160);
  });

  it('capot = 250, generale = 500', () => {
    expect(bidValueToNumber('capot')).toBe(250);
    expect(bidValueToNumber('generale')).toBe(500);
  });
});

describe('nextPlayer', () => {
  it('suit le sens horaire S→W→N→E→S', () => {
    expect(nextPlayer(Position.South)).toBe(Position.West);
    expect(nextPlayer(Position.West)).toBe(Position.North);
    expect(nextPlayer(Position.North)).toBe(Position.East);
    expect(nextPlayer(Position.East)).toBe(Position.South);
  });
});

describe('getTeam', () => {
  it('N et S sont dans l équipe NorthSouth', () => {
    expect(getTeam(Position.North)).toBe(Team.NorthSouth);
    expect(getTeam(Position.South)).toBe(Team.NorthSouth);
  });

  it('E et O sont dans l équipe EastWest', () => {
    expect(getTeam(Position.East)).toBe(Team.EastWest);
    expect(getTeam(Position.West)).toBe(Team.EastWest);
  });
});

describe('getPartner', () => {
  it('retourne le partenaire opposé', () => {
    expect(getPartner(Position.South)).toBe(Position.North);
    expect(getPartner(Position.North)).toBe(Position.South);
    expect(getPartner(Position.East)).toBe(Position.West);
    expect(getPartner(Position.West)).toBe(Position.East);
  });
});

describe('getOpposingTeam', () => {
  it('retourne l équipe adverse', () => {
    expect(getOpposingTeam(Team.NorthSouth)).toBe(Team.EastWest);
    expect(getOpposingTeam(Team.EastWest)).toBe(Team.NorthSouth);
  });
});

describe('getCardPoints', () => {
  it('valet d atout vaut 20', () => {
    expect(getCardPoints({ suit: Suit.Hearts, rank: Rank.Jack }, Suit.Hearts)).toBe(20);
  });

  it('valet non-atout vaut 2', () => {
    expect(getCardPoints({ suit: Suit.Spades, rank: Rank.Jack }, Suit.Hearts)).toBe(2);
  });

  it('neuf d atout vaut 14', () => {
    expect(getCardPoints({ suit: Suit.Hearts, rank: Rank.Nine }, Suit.Hearts)).toBe(14);
  });

  it('neuf non-atout vaut 0', () => {
    expect(getCardPoints({ suit: Suit.Spades, rank: Rank.Nine }, Suit.Hearts)).toBe(0);
  });

  it('as vaut toujours 11', () => {
    expect(getCardPoints({ suit: Suit.Hearts, rank: Rank.Ace }, Suit.Hearts)).toBe(11);
    expect(getCardPoints({ suit: Suit.Spades, rank: Rank.Ace }, Suit.Hearts)).toBe(11);
  });
});

describe('getCardStrength', () => {
  it('valet atout est le plus fort (index 0)', () => {
    expect(getCardStrength({ suit: Suit.Hearts, rank: Rank.Jack }, Suit.Hearts)).toBe(0);
  });

  it('9 atout est le 2ème plus fort (index 1)', () => {
    expect(getCardStrength({ suit: Suit.Hearts, rank: Rank.Nine }, Suit.Hearts)).toBe(1);
  });

  it('as non-atout est le plus fort (index 0)', () => {
    expect(getCardStrength({ suit: Suit.Spades, rank: Rank.Ace }, Suit.Hearts)).toBe(0);
  });

  it('7 est toujours le plus faible', () => {
    // Atout : index 7
    expect(getCardStrength({ suit: Suit.Hearts, rank: Rank.Seven }, Suit.Hearts)).toBe(7);
    // Non-atout : index 7
    expect(getCardStrength({ suit: Suit.Spades, rank: Rank.Seven }, Suit.Hearts)).toBe(7);
  });
});

describe('TRUMP_POINTS total', () => {
  it('la somme des points atout est correcte', () => {
    const total = Object.values(TRUMP_POINTS).reduce((a, b) => a + b, 0);
    // 20 + 14 + 11 + 10 + 4 + 3 + 0 + 0 = 62
    expect(total).toBe(62);
  });
});

describe('NON_TRUMP_POINTS total', () => {
  it('la somme des points non-atout est correcte', () => {
    const total = Object.values(NON_TRUMP_POINTS).reduce((a, b) => a + b, 0);
    // 11 + 10 + 4 + 3 + 2 + 0 + 0 + 0 = 30
    expect(total).toBe(30);
  });

  it('un jeu complet vaut 152 points', () => {
    // 1 couleur atout (62) + 3 couleurs non-atout (3*30 = 90) = 152
    const total = Object.values(TRUMP_POINTS).reduce((a, b) => a + b, 0)
      + 3 * Object.values(NON_TRUMP_POINTS).reduce((a, b) => a + b, 0);
    expect(total).toBe(152);
  });
});
