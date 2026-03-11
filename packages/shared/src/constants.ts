import { Suit, Rank, Position, Team, type BidValue, type Card } from './types.js';

// ============================================================
// Constantes du jeu de Contrée
// ============================================================

/** Toutes les valeurs d'enchères valides, dans l'ordre croissant */
export const BID_VALUES: BidValue[] = [80, 90, 100, 110, 120, 130, 140, 150, 160, 'capot', 'generale'];

/** Valeur numérique des enchères spéciales pour comparaison */
export function bidValueToNumber(value: BidValue): number {
  if (value === 'capot') return 250;
  if (value === 'generale') return 500;
  return value;
}

/**
 * Points des cartes en ATOUT
 * Valet = 20, Neuf = 14, As = 11, Dix = 10, Roi = 4, Dame = 3, Huit = 0, Sept = 0
 */
export const TRUMP_POINTS: Record<Rank, number> = {
  [Rank.Jack]: 20,
  [Rank.Nine]: 14,
  [Rank.Ace]: 11,
  [Rank.Ten]: 10,
  [Rank.King]: 4,
  [Rank.Queen]: 3,
  [Rank.Eight]: 0,
  [Rank.Seven]: 0,
};

/**
 * Points des cartes NON-ATOUT
 * As = 11, Dix = 10, Roi = 4, Dame = 3, Valet = 2, Neuf = 0, Huit = 0, Sept = 0
 */
export const NON_TRUMP_POINTS: Record<Rank, number> = {
  [Rank.Ace]: 11,
  [Rank.Ten]: 10,
  [Rank.King]: 4,
  [Rank.Queen]: 3,
  [Rank.Jack]: 2,
  [Rank.Nine]: 0,
  [Rank.Eight]: 0,
  [Rank.Seven]: 0,
};

/**
 * Ordre de force des cartes en ATOUT (du plus fort au plus faible)
 * Valet > Neuf > As > Dix > Roi > Dame > Huit > Sept
 */
export const TRUMP_ORDER: Rank[] = [
  Rank.Jack, Rank.Nine, Rank.Ace, Rank.Ten, Rank.King, Rank.Queen, Rank.Eight, Rank.Seven,
];

/**
 * Ordre de force des cartes NON-ATOUT (du plus fort au plus faible)
 * As > Dix > Roi > Dame > Valet > Neuf > Huit > Sept
 */
export const NON_TRUMP_ORDER: Rank[] = [
  Rank.Ace, Rank.Ten, Rank.King, Rank.Queen, Rank.Jack, Rank.Nine, Rank.Eight, Rank.Seven,
];

/** Total de points dans un jeu (sans le dix de der) = 152 */
export const TOTAL_CARD_POINTS = 152;

/** Bonus du dernier pli (dix de der) */
export const DIX_DE_DER = 10;

/** Total avec dix de der = 162 */
export const TOTAL_POINTS = TOTAL_CARD_POINTS + DIX_DE_DER;

/** Bonus belote-rebelote */
export const BELOTE_BONUS = 20;

/** Nombre de cartes par joueur */
export const CARDS_PER_PLAYER = 8;

/** Nombre de plis par manche */
export const TRICKS_PER_ROUND = 8;

/** Nombre de joueurs */
export const NUM_PLAYERS = 4;

/** Score cible par défaut */
export const DEFAULT_TARGET_SCORE = 1000;

/** Ordre de jeu (sens horaire) */
export const PLAY_ORDER: Position[] = [Position.South, Position.West, Position.North, Position.East];

/** Retourne le joueur suivant dans le sens horaire */
export function nextPlayer(position: Position): Position {
  const idx = PLAY_ORDER.indexOf(position);
  return PLAY_ORDER[(idx + 1) % 4];
}

/** Retourne l'équipe d'un joueur */
export function getTeam(position: Position): Team {
  if (position === Position.North || position === Position.South) {
    return Team.NorthSouth;
  }
  return Team.EastWest;
}

/** Retourne le partenaire d'un joueur */
export function getPartner(position: Position): Position {
  switch (position) {
    case Position.South: return Position.North;
    case Position.North: return Position.South;
    case Position.East: return Position.West;
    case Position.West: return Position.East;
  }
}

/** Retourne l'équipe adverse */
export function getOpposingTeam(team: Team): Team {
  return team === Team.NorthSouth ? Team.EastWest : Team.NorthSouth;
}

/** Points d'une carte selon qu'elle est atout ou non */
export function getCardPoints(card: Card, trumpSuit: Suit): number {
  return card.suit === trumpSuit ? TRUMP_POINTS[card.rank] : NON_TRUMP_POINTS[card.rank];
}

/** Force d'une carte (index plus bas = plus fort) */
export function getCardStrength(card: Card, trumpSuit: Suit): number {
  const order = card.suit === trumpSuit ? TRUMP_ORDER : NON_TRUMP_ORDER;
  return order.indexOf(card.rank);
}
