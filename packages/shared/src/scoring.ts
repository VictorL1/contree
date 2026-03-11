import { Suit, Team, Position, type Card, type Trick, type Bid, type BidValue, type RoundScore } from './types.js';
import {
  getCardPoints,
  getTeam,
  getOpposingTeam,
  bidValueToNumber,
  DIX_DE_DER,
  TOTAL_POINTS,
  BELOTE_BONUS,
  TRICKS_PER_ROUND,
} from './constants.js';

// ============================================================
// Calcul des scores de la Contrée
// ============================================================

/** Calcule les points d'un pli */
export function calculateTrickPoints(trick: Trick, trumpSuit: Suit): number {
  return trick.cards.reduce((sum, pc) => sum + getCardPoints(pc.card, trumpSuit), 0);
}

/**
 * Calcule le score d'une manche complète
 *
 * Règles de scoring de la Contrée :
 * - Total des points dans les cartes = 152
 * - Dix de der (dernier pli) = 10 points → total = 162
 * - Belote-rebelote = 20 points (toujours acquis, même si contrat chuté)
 * - Si contrat réussi : chaque équipe marque ses points
 * - Si contrat chuté : la défense marque 162 + valeur du contrat
 * - Contre : les points du contrat sont doublés
 * - Surcontre : les points du contrat sont quadruplés
 * - Capot (tous les plis) : 250 points au lieu du décompte normal
 * - Générale (un joueur fait tous les plis seul) : 500 points
 */
export function calculateRoundScore(
  tricks: Trick[],
  trumpSuit: Suit,
  contract: Bid,
  contractTeam: Team,
  beloteTeam: Team | null,
  isContred: boolean,
  isSurcontred: boolean,
): RoundScore {
  if (tricks.length !== TRICKS_PER_ROUND) {
    throw new Error(`Une manche doit contenir exactement ${TRICKS_PER_ROUND} plis`);
  }

  // Calculer les points de chaque équipe
  let attackPoints = 0;
  let defensePoints = 0;
  let attackTricks = 0;
  let defenseTricks = 0;
  const defenseTeam = getOpposingTeam(contractTeam);

  for (let i = 0; i < tricks.length; i++) {
    const trick = tricks[i];
    if (!trick.winner) throw new Error(`Le pli ${i + 1} n'a pas de gagnant`);

    let points = calculateTrickPoints(trick, trumpSuit);

    // Dix de der : le dernier pli vaut 10 points bonus
    if (i === tricks.length - 1) {
      points += DIX_DE_DER;
    }

    if (getTeam(trick.winner) === contractTeam) {
      attackPoints += points;
      attackTricks++;
    } else {
      defensePoints += points;
      defenseTricks++;
    }
  }

  // Vérifier le capot
  const isCapot = attackTricks === TRICKS_PER_ROUND || defenseTricks === TRICKS_PER_ROUND;

  // Score final selon le contrat
  let teamNorthSouthScore: number;
  let teamEastWestScore: number;
  const contractValue = bidValueToNumber(contract.value);
  const multiplier = isSurcontred ? 4 : isContred ? 2 : 1;

  // Belote est toujours acquise, peu importe le résultat du contrat
  const beloteBonus = beloteTeam ? BELOTE_BONUS : 0;

  // Déterminer si le contrat est réussi
  let contractMet: boolean;

  if (contract.value === 'capot') {
    // Capot : l'attaque doit faire tous les plis
    contractMet = attackTricks === TRICKS_PER_ROUND;
  } else if (contract.value === 'generale') {
    // Générale : un seul joueur doit faire tous les plis
    // (simplifié : l'attaque doit faire tous les plis)
    contractMet = attackTricks === TRICKS_PER_ROUND;
  } else {
    // Contrat normal : l'attaque doit atteindre la valeur annoncée
    contractMet = attackPoints >= contract.value;
  }

  if (contractMet) {
    // Contrat réussi
    if (contract.value === 'capot' || contract.value === 'generale') {
      // Capot/Générale réussi
      const bonusPoints = contractValue * multiplier;
      if (contractTeam === Team.NorthSouth) {
        teamNorthSouthScore = bonusPoints + (beloteTeam === Team.NorthSouth ? beloteBonus : 0);
        teamEastWestScore = (beloteTeam === Team.EastWest ? beloteBonus : 0);
      } else {
        teamEastWestScore = bonusPoints + (beloteTeam === Team.EastWest ? beloteBonus : 0);
        teamNorthSouthScore = (beloteTeam === Team.NorthSouth ? beloteBonus : 0);
      }
    } else {
      // Contrat normal réussi : l'attaque marque la valeur du contrat (au point fait)
      if (contractTeam === Team.NorthSouth) {
        teamNorthSouthScore = contractValue * multiplier + (beloteTeam === Team.NorthSouth ? beloteBonus : 0);
        teamEastWestScore = defensePoints * multiplier + (beloteTeam === Team.EastWest ? beloteBonus : 0);
      } else {
        teamEastWestScore = contractValue * multiplier + (beloteTeam === Team.EastWest ? beloteBonus : 0);
        teamNorthSouthScore = defensePoints * multiplier + (beloteTeam === Team.NorthSouth ? beloteBonus : 0);
      }
    }
  } else {
    // Contrat chuté : la défense marque 162 + valeur du contrat
    const defenseScore = (TOTAL_POINTS + contractValue) * multiplier;
    if (contractTeam === Team.NorthSouth) {
      // N/S a chuté → E/O marque tout
      teamNorthSouthScore = (beloteTeam === Team.NorthSouth ? beloteBonus : 0);
      teamEastWestScore = defenseScore + (beloteTeam === Team.EastWest ? beloteBonus : 0);
    } else {
      // E/O a chuté → N/S marque tout
      teamEastWestScore = (beloteTeam === Team.EastWest ? beloteBonus : 0);
      teamNorthSouthScore = defenseScore + (beloteTeam === Team.NorthSouth ? beloteBonus : 0);
    }
  }

  return {
    attackPoints,
    defensePoints,
    beloteBonus,
    contractMet,
    teamNorthSouthScore,
    teamEastWestScore,
  };
}

/** Vérifie si la partie est terminée (une équipe atteint le score cible) */
export function isGameOver(
  scores: { [Team.NorthSouth]: number; [Team.EastWest]: number },
  targetScore: number,
): boolean {
  return scores[Team.NorthSouth] >= targetScore || scores[Team.EastWest] >= targetScore;
}

/** Retourne l'équipe gagnante, ou null si la partie continue */
export function getWinner(
  scores: { [Team.NorthSouth]: number; [Team.EastWest]: number },
  targetScore: number,
): Team | null {
  const nsReached = scores[Team.NorthSouth] >= targetScore;
  const ewReached = scores[Team.EastWest] >= targetScore;

  if (nsReached && ewReached) {
    // Les deux atteignent le score → celui qui a le plus gagne
    return scores[Team.NorthSouth] >= scores[Team.EastWest] ? Team.NorthSouth : Team.EastWest;
  }
  if (nsReached) return Team.NorthSouth;
  if (ewReached) return Team.EastWest;
  return null;
}
