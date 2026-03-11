import { describe, it, expect } from 'vitest';
import {
  createBiddingState, isValidBid, canContre, canSurcontre,
  placeBid, passBid, applyContre, applySurcontre,
  isBiddingOver, isBiddingFailed,
} from '../bidding.js';
import { Position, Suit } from '../types.js';

describe('createBiddingState', () => {
  it('crée un état initial correct', () => {
    const state = createBiddingState(Position.South);
    expect(state.currentBidder).toBe(Position.South);
    expect(state.highestBid).toBeNull();
    expect(state.consecutivePasses).toBe(0);
    expect(state.isContred).toBe(false);
    expect(state.isSurcontred).toBe(false);
  });
});

describe('isValidBid', () => {
  it('accepte toute enchère quand aucune enchère précédente', () => {
    expect(isValidBid(80, null)).toBe(true);
    expect(isValidBid(160, null)).toBe(true);
    expect(isValidBid('capot', null)).toBe(true);
  });

  it('accepte une enchère supérieure', () => {
    const bid = { player: Position.South, value: 80 as const, suit: Suit.Hearts };
    expect(isValidBid(90, bid)).toBe(true);
    expect(isValidBid(100, bid)).toBe(true);
    expect(isValidBid('capot', bid)).toBe(true);
  });

  it('refuse une enchère égale ou inférieure', () => {
    const bid = { player: Position.South, value: 100 as const, suit: Suit.Hearts };
    expect(isValidBid(80, bid)).toBe(false);
    expect(isValidBid(90, bid)).toBe(false);
    expect(isValidBid(100, bid)).toBe(false);
  });

  it('capot > 160 et generale > capot', () => {
    const bid160 = { player: Position.South, value: 160 as const, suit: Suit.Hearts };
    expect(isValidBid('capot', bid160)).toBe(true);

    const bidCapot = { player: Position.South, value: 'capot' as const, suit: Suit.Hearts };
    expect(isValidBid('generale', bidCapot)).toBe(true);
    expect(isValidBid(160, bidCapot)).toBe(false);
  });
});

describe('placeBid', () => {
  it('place une enchère valide', () => {
    const state = createBiddingState(Position.South);
    const result = placeBid(state, 80, Suit.Hearts, Position.South);
    expect(result).not.toBeNull();
    expect(result!.highestBid!.value).toBe(80);
    expect(result!.highestBid!.suit).toBe(Suit.Hearts);
    expect(result!.currentBidder).toBe(Position.West);
    expect(result!.consecutivePasses).toBe(0);
  });

  it('refuse si ce n est pas le tour du joueur', () => {
    const state = createBiddingState(Position.South);
    const result = placeBid(state, 80, Suit.Hearts, Position.West);
    expect(result).toBeNull();
  });

  it('refuse une enchère inférieure', () => {
    let state = createBiddingState(Position.South);
    state = placeBid(state, 100, Suit.Hearts, Position.South)!;
    const result = placeBid(state, 80, Suit.Clubs, Position.West);
    expect(result).toBeNull();
  });

  it('annule le contre quand nouvelle enchère', () => {
    let state = createBiddingState(Position.South);
    state = placeBid(state, 80, Suit.Hearts, Position.South)!;
    state = applyContre(state, Position.West)!;
    expect(state.isContred).toBe(true);
    // North (même équipe que South) surenchérit
    state = passBid(state, Position.North)!;
    // East enchérit plus haut
    state = placeBid(state, 90, Suit.Clubs, Position.East)!;
    expect(state.isContred).toBe(false);
    expect(state.contredBy).toBeNull();
  });
});

describe('passBid', () => {
  it('incrémente les passes consécutifs', () => {
    const state = createBiddingState(Position.South);
    const result = passBid(state, Position.South);
    expect(result!.consecutivePasses).toBe(1);
    expect(result!.currentBidder).toBe(Position.West);
  });
});

describe('canContre / canSurcontre', () => {
  it('l équipe adverse peut contrer', () => {
    let state = createBiddingState(Position.South);
    state = placeBid(state, 80, Suit.Hearts, Position.South)!;
    // West (E/O) peut contrer une enchère de South (N/S)
    expect(canContre(Position.West, state)).toBe(true);
    // North (N/S) ne peut pas contrer sa propre équipe
    expect(canContre(Position.North, state)).toBe(false);
  });

  it('ne peut pas contrer deux fois', () => {
    let state = createBiddingState(Position.South);
    state = placeBid(state, 80, Suit.Hearts, Position.South)!;
    state = applyContre(state, Position.West)!;
    expect(canContre(Position.East, state)).toBe(false);
  });

  it('l équipe qui a enchéri peut surcontrer après un contre', () => {
    let state = createBiddingState(Position.South);
    state = placeBid(state, 80, Suit.Hearts, Position.South)!;
    state = applyContre(state, Position.West)!;
    // North (N/S, même équipe que South) peut surcontrer
    expect(canSurcontre(Position.North, state)).toBe(true);
    // East (E/O) ne peut pas surcontrer
    expect(canSurcontre(Position.East, state)).toBe(false);
  });

  it('ne peut pas surcontrer sans contre', () => {
    let state = createBiddingState(Position.South);
    state = placeBid(state, 80, Suit.Hearts, Position.South)!;
    expect(canSurcontre(Position.North, state)).toBe(false);
  });
});

describe('isBiddingOver', () => {
  it('terminé après 3 passes consécutifs avec enchère', () => {
    let state = createBiddingState(Position.South);
    state = placeBid(state, 80, Suit.Hearts, Position.South)!;
    state = passBid(state, Position.West)!;
    state = passBid(state, Position.North)!;
    expect(isBiddingOver(state)).toBe(false);
    state = passBid(state, Position.East)!;
    expect(isBiddingOver(state)).toBe(true);
    expect(isBiddingFailed(state)).toBe(false);
  });

  it('terminé (échoué) après 4 passes sans enchère', () => {
    let state = createBiddingState(Position.South);
    state = passBid(state, Position.South)!;
    state = passBid(state, Position.West)!;
    state = passBid(state, Position.North)!;
    expect(isBiddingOver(state)).toBe(false);
    state = passBid(state, Position.East)!;
    expect(isBiddingOver(state)).toBe(true);
    expect(isBiddingFailed(state)).toBe(true);
  });

  it('le contre remet le compteur de passes à 0', () => {
    let state = createBiddingState(Position.South);
    state = placeBid(state, 80, Suit.Hearts, Position.South)!;
    state = applyContre(state, Position.West)!;
    expect(state.consecutivePasses).toBe(0);
    state = passBid(state, Position.North)!;
    state = passBid(state, Position.East)!;
    expect(isBiddingOver(state)).toBe(false);
    state = passBid(state, Position.South)!;
    expect(isBiddingOver(state)).toBe(true);
  });
});
