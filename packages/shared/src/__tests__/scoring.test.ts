import { describe, it, expect } from 'vitest';
import { calculateRoundScore, calculateTrickPoints, isGameOver, getWinner } from '../scoring.js';
import { Suit, Rank, Position, Team, type Card, type Trick, type Bid } from '../types.js';

const card = (suit: Suit, rank: Rank): Card => ({ suit, rank });

function makeTrick(winner: Position, cards: [Position, Card][], leadSuit: Suit): Trick {
  return {
    cards: cards.map(([player, c]) => ({ player, card: c })),
    leadSuit,
    winner,
  };
}

describe('calculateTrickPoints', () => {
  it('calcule les points d un pli avec atout', () => {
    const trump = Suit.Hearts;
    const trick: Trick = {
      cards: [
        { card: card(Suit.Hearts, Rank.Jack), player: Position.South },  // 20 (atout)
        { card: card(Suit.Hearts, Rank.Nine), player: Position.West },   // 14 (atout)
        { card: card(Suit.Spades, Rank.Ace), player: Position.North },   // 11 (non-atout)
        { card: card(Suit.Clubs, Rank.Seven), player: Position.East },   // 0
      ],
      leadSuit: Suit.Hearts,
      winner: null,
    };
    expect(calculateTrickPoints(trick, trump)).toBe(45); // 20 + 14 + 11 + 0
  });
});

describe('calculateRoundScore', () => {
  const trump = Suit.Hearts;
  const contract: Bid = { player: Position.South, value: 80, suit: Suit.Hearts };

  // Helper : crée 8 plis simples où l'attaque (N/S) gagne les X premiers
  function makeSimpleTricks(attackTrickCount: number): Trick[] {
    const tricks: Trick[] = [];
    const allCards = [
      // 8 plis de 4 cartes chacun = 32 cartes
      // Simplification : on met des cartes de valeur connue
      // Plis 1-4 : cartes à points
      [Rank.Jack, Rank.Nine, Rank.Ace, Rank.Ten],  // 20+14+11+10 = 55 (atout)
      [Rank.Ace, Rank.Ten, Rank.King, Rank.Queen],  // 11+10+4+3 = 28 (non-atout)
      [Rank.Ace, Rank.Ten, Rank.King, Rank.Queen],  // 28
      [Rank.Ace, Rank.Ten, Rank.King, Rank.Jack],   // 11+10+4+2 = 27
      // Plis 5-8 : cartes sans valeur
      [Rank.Seven, Rank.Eight, Rank.Seven, Rank.Eight], // 0
      [Rank.Seven, Rank.Eight, Rank.Nine, Rank.Seven],  // 0
      [Rank.Eight, Rank.Seven, Rank.Eight, Rank.Nine],  // 0
      [Rank.Queen, Rank.Jack, Rank.Nine, Rank.Eight],   // 3+2+0+0 = 5 (non-atout) - adjustment
    ];

    const suits = [Suit.Hearts, Suit.Spades, Suit.Clubs, Suit.Diamonds,
                   Suit.Spades, Suit.Clubs, Suit.Diamonds, Suit.Spades];

    for (let i = 0; i < 8; i++) {
      const winner = i < attackTrickCount ? Position.South : Position.West;
      tricks.push({
        cards: [
          { card: card(suits[i], allCards[i][0]), player: Position.South },
          { card: card(suits[i], allCards[i][1]), player: Position.West },
          { card: card(suits[i], allCards[i][2]), player: Position.North },
          { card: card(suits[i], allCards[i][3]), player: Position.East },
        ],
        leadSuit: suits[i],
        winner,
      });
    }
    return tricks;
  }

  it('contrat réussi : chaque équipe marque ses points', () => {
    // Créons un scénario simple : N/S enchérit 80 à coeur
    // et gagne des plis valant plus de 80 points
    const tricks: Trick[] = [];

    // N/S gagne 5 plis avec des points, E/O gagne 3 plis
    // Pli 1: S gagne avec valet d'atout — 20+14+11+10 = 55 pts
    tricks.push(makeTrick(Position.South, [
      [Position.South, card(Suit.Hearts, Rank.Jack)],
      [Position.West, card(Suit.Hearts, Rank.Nine)],
      [Position.North, card(Suit.Spades, Rank.Ace)],
      [Position.East, card(Suit.Spades, Rank.Ten)],
    ], Suit.Hearts));

    // Pli 2: N gagne — 11+10+4+3 = 28 pts
    tricks.push(makeTrick(Position.North, [
      [Position.West, card(Suit.Clubs, Rank.Queen)],
      [Position.North, card(Suit.Clubs, Rank.Ace)],
      [Position.East, card(Suit.Clubs, Rank.King)],
      [Position.South, card(Suit.Clubs, Rank.Ten)],
    ], Suit.Clubs));

    // Pli 3: S gagne — 11+4+3+2 = 20 pts
    tricks.push(makeTrick(Position.South, [
      [Position.South, card(Suit.Diamonds, Rank.Ace)],
      [Position.West, card(Suit.Diamonds, Rank.King)],
      [Position.North, card(Suit.Diamonds, Rank.Queen)],
      [Position.East, card(Suit.Diamonds, Rank.Jack)],
    ], Suit.Diamonds));

    // Pli 4: W gagne — 10+4+0+0 = 14 pts
    tricks.push(makeTrick(Position.West, [
      [Position.South, card(Suit.Spades, Rank.Seven)],
      [Position.West, card(Suit.Spades, Rank.King)],
      [Position.North, card(Suit.Spades, Rank.Eight)],
      [Position.East, card(Suit.Diamonds, Rank.Ten)],
    ], Suit.Spades));

    // Pli 5: E gagne — 11+2+0+0 = 13 pts
    tricks.push(makeTrick(Position.East, [
      [Position.South, card(Suit.Hearts, Rank.Seven)],
      [Position.West, card(Suit.Clubs, Rank.Jack)],
      [Position.North, card(Suit.Diamonds, Rank.Eight)],
      [Position.East, card(Suit.Hearts, Rank.Ace)],
    ], Suit.Hearts));

    // Pli 6: S gagne — 3+0+0+0 = 3 pts
    tricks.push(makeTrick(Position.South, [
      [Position.South, card(Suit.Hearts, Rank.Queen)],
      [Position.West, card(Suit.Clubs, Rank.Eight)],
      [Position.North, card(Suit.Diamonds, Rank.Seven)],
      [Position.East, card(Suit.Clubs, Rank.Seven)],
    ], Suit.Hearts));

    // Pli 7: W gagne — 0+0+0+0 = 0 pts
    tricks.push(makeTrick(Position.West, [
      [Position.South, card(Suit.Spades, Rank.Nine)],
      [Position.West, card(Suit.Spades, Rank.Queen)],
      [Position.North, card(Suit.Diamonds, Rank.Nine)],
      [Position.East, card(Suit.Clubs, Rank.Nine)],
    ], Suit.Spades));

    // Pli 8 (dernier → +10 dix de der): N gagne — 10+0+0+0 = 10 + 10 = 20 pts
    tricks.push(makeTrick(Position.North, [
      [Position.South, card(Suit.Hearts, Rank.Eight)],
      [Position.West, card(Suit.Spades, Rank.Jack)],
      [Position.North, card(Suit.Hearts, Rank.Ten)],
      [Position.East, card(Suit.Hearts, Rank.King)], // actually won but let's say North wins
    ], Suit.Hearts));

    const score = calculateRoundScore(tricks, trump, contract, Team.NorthSouth, null, false, false);

    // N/S a gagné les plis 1,2,3,6,8 = 55+28+20+3+26(+dix de der) = 132
    // E/O a gagné les plis 4,5,7 = 14+13+3 = 30
    // Total = 132 + 30 = 162 ✓
    // Le contrat de 80 est réussi (132 >= 80)
    expect(score.contractMet).toBe(true);
    expect(score.attackPoints).toBe(132);
    expect(score.defensePoints).toBe(30);
    expect(score.teamNorthSouthScore).toBe(132);
    expect(score.teamEastWestScore).toBe(30);
  });

  it('contrat chuté : la défense marque 162 + valeur contrat', () => {
    const highContract: Bid = { player: Position.South, value: 150, suit: Suit.Hearts };
    const tricks: Trick[] = [];

    // L'attaque ne fait que 80 points → contrat de 150 chuté
    // Simplifions : même plis que ci-dessus mais avec contrat plus élevé
    tricks.push(makeTrick(Position.South, [
      [Position.South, card(Suit.Hearts, Rank.Jack)],
      [Position.West, card(Suit.Hearts, Rank.Nine)],
      [Position.North, card(Suit.Spades, Rank.Ace)],
      [Position.East, card(Suit.Spades, Rank.Ten)],
    ], Suit.Hearts)); // 55

    tricks.push(makeTrick(Position.West, [
      [Position.West, card(Suit.Clubs, Rank.Ace)],
      [Position.North, card(Suit.Clubs, Rank.Queen)],
      [Position.East, card(Suit.Clubs, Rank.King)],
      [Position.South, card(Suit.Clubs, Rank.Ten)],
    ], Suit.Clubs)); // 28 → defense

    tricks.push(makeTrick(Position.West, [
      [Position.South, card(Suit.Diamonds, Rank.Jack)],
      [Position.West, card(Suit.Diamonds, Rank.Ace)],
      [Position.North, card(Suit.Diamonds, Rank.Queen)],
      [Position.East, card(Suit.Diamonds, Rank.King)],
    ], Suit.Diamonds)); // 20 → defense

    tricks.push(makeTrick(Position.East, [
      [Position.South, card(Suit.Spades, Rank.Seven)],
      [Position.West, card(Suit.Spades, Rank.King)],
      [Position.North, card(Suit.Spades, Rank.Eight)],
      [Position.East, card(Suit.Diamonds, Rank.Ten)],
    ], Suit.Spades)); // 14 → defense

    tricks.push(makeTrick(Position.East, [
      [Position.South, card(Suit.Hearts, Rank.Seven)],
      [Position.West, card(Suit.Clubs, Rank.Jack)],
      [Position.North, card(Suit.Diamonds, Rank.Eight)],
      [Position.East, card(Suit.Hearts, Rank.Ace)],
    ], Suit.Hearts)); // 13 → defense

    tricks.push(makeTrick(Position.South, [
      [Position.South, card(Suit.Hearts, Rank.Queen)],
      [Position.West, card(Suit.Clubs, Rank.Eight)],
      [Position.North, card(Suit.Diamonds, Rank.Seven)],
      [Position.East, card(Suit.Clubs, Rank.Seven)],
    ], Suit.Hearts)); // 3 → attack

    tricks.push(makeTrick(Position.West, [
      [Position.South, card(Suit.Spades, Rank.Nine)],
      [Position.West, card(Suit.Spades, Rank.Queen)],
      [Position.North, card(Suit.Diamonds, Rank.Nine)],
      [Position.East, card(Suit.Clubs, Rank.Nine)],
    ], Suit.Spades)); // 3 → defense

    tricks.push(makeTrick(Position.West, [
      [Position.South, card(Suit.Hearts, Rank.Eight)],
      [Position.West, card(Suit.Hearts, Rank.Ten)],
      [Position.North, card(Suit.Hearts, Rank.King)],
      [Position.East, card(Suit.Spades, Rank.Jack)],
    ], Suit.Hearts)); // 10+4+2 + dix de der = 26 → defense

    const score = calculateRoundScore(tricks, trump, highContract, Team.NorthSouth, null, false, false);

    // Attack : 55 + 3 = 58 → contrat 150 chuté
    expect(score.contractMet).toBe(false);
    // Defense marque 162 + 150 = 312
    expect(score.teamNorthSouthScore).toBe(0);
    expect(score.teamEastWestScore).toBe(312);
  });

  it('belote toujours acquise même si contrat chuté', () => {
    const highContract: Bid = { player: Position.South, value: 160, suit: Suit.Hearts };
    // Créer des plis bidon où l'attaque fait peu de points
    const tricks: Trick[] = [];
    for (let i = 0; i < 8; i++) {
      tricks.push(makeTrick(
        i < 1 ? Position.South : Position.West,
        [
          [Position.South, card(Suit.Spades, Rank.Seven)],
          [Position.West, card(Suit.Spades, Rank.Eight)],
          [Position.North, card(Suit.Clubs, Rank.Seven)],
          [Position.East, card(Suit.Clubs, Rank.Eight)],
        ],
        Suit.Spades,
      ));
    }

    const score = calculateRoundScore(tricks, trump, highContract, Team.NorthSouth, Team.NorthSouth, false, false);
    expect(score.contractMet).toBe(false);
    // Belote toujours acquise par N/S
    expect(score.teamNorthSouthScore).toBe(20); // belote bonus
  });

  it('contre double les points', () => {
    const tricks: Trick[] = [];
    for (let i = 0; i < 8; i++) {
      tricks.push(makeTrick(
        Position.West,
        [
          [Position.South, card(Suit.Spades, Rank.Seven)],
          [Position.West, card(Suit.Spades, Rank.Eight)],
          [Position.North, card(Suit.Clubs, Rank.Seven)],
          [Position.East, card(Suit.Clubs, Rank.Eight)],
        ],
        Suit.Spades,
      ));
    }

    // Contrat chuté + contré → (162 + 80) * 2 = 484
    const score = calculateRoundScore(tricks, trump, contract, Team.NorthSouth, null, true, false);
    expect(score.contractMet).toBe(false);
    expect(score.teamEastWestScore).toBe((162 + 80) * 2);
  });

  it('surcontre quadruple les points', () => {
    const tricks: Trick[] = [];
    for (let i = 0; i < 8; i++) {
      tricks.push(makeTrick(
        Position.West,
        [
          [Position.South, card(Suit.Spades, Rank.Seven)],
          [Position.West, card(Suit.Spades, Rank.Eight)],
          [Position.North, card(Suit.Clubs, Rank.Seven)],
          [Position.East, card(Suit.Clubs, Rank.Eight)],
        ],
        Suit.Spades,
      ));
    }

    // Contrat chuté + surcontré → (162 + 80) * 4 = 968
    const score = calculateRoundScore(tricks, trump, contract, Team.NorthSouth, null, false, true);
    expect(score.contractMet).toBe(false);
    expect(score.teamEastWestScore).toBe((162 + 80) * 4);
  });
});

describe('isGameOver / getWinner', () => {
  it('partie non terminée', () => {
    const scores = { [Team.NorthSouth]: 500, [Team.EastWest]: 300 };
    expect(isGameOver(scores, 1000)).toBe(false);
    expect(getWinner(scores, 1000)).toBeNull();
  });

  it('N/S gagne à 1000', () => {
    const scores = { [Team.NorthSouth]: 1050, [Team.EastWest]: 800 };
    expect(isGameOver(scores, 1000)).toBe(true);
    expect(getWinner(scores, 1000)).toBe(Team.NorthSouth);
  });

  it('E/O gagne à 1000', () => {
    const scores = { [Team.NorthSouth]: 800, [Team.EastWest]: 1200 };
    expect(isGameOver(scores, 1000)).toBe(true);
    expect(getWinner(scores, 1000)).toBe(Team.EastWest);
  });

  it('les deux dépassent → le plus haut gagne', () => {
    const scores = { [Team.NorthSouth]: 1100, [Team.EastWest]: 1050 };
    expect(isGameOver(scores, 1000)).toBe(true);
    expect(getWinner(scores, 1000)).toBe(Team.NorthSouth);
  });
});
