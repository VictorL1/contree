import {
  type Card, type Bid, type BidValue, type TrumpSuit,
  type Trick, type PlayedCard, type RoundScore,
  type BiddingState,
  Suit, Rank, Position, Team, GamePhase,
  createDeck, shuffleDeck, dealCards, isSameCard,
  createBiddingState, placeBid, passBid, applyContre, applySurcontre,
  isBiddingOver, isBiddingFailed,
  getPlayableCards, determineTrickWinner, isValidPlay,
  hasBelote, isBeloteCard,
  calculateRoundScore,
  isGameOver, getWinner,
  nextPlayer, getTeam, getPartner,
  DEFAULT_TARGET_SCORE, TRICKS_PER_ROUND,
} from '@contree/shared';

/** État d'un joueur côté serveur */
interface ServerPlayerState {
  position: Position;
  hand: Card[];
  userId: string;
  username: string;
  isConnected: boolean;
  hasBelote: boolean;
  beloteAnnounced: boolean;
  rebeloteAnnounced: boolean;
}

/** État complet d'une partie côté serveur */
export interface ServerGameState {
  id: string;
  phase: GamePhase;
  players: Map<Position, ServerPlayerState>;

  // Enchères
  bidding: BiddingState;
  contract: Bid | null;
  contractTeam: Team | null;
  isContred: boolean;
  isSurcontred: boolean;

  // Jeu
  trumpSuit: TrumpSuit | null;
  currentTrick: Trick;
  tricks: Trick[];
  currentPlayer: Position;
  trickCount: number;

  // Scores
  scores: {
    [Team.NorthSouth]: number;
    [Team.EastWest]: number;
  };
  roundHistory: RoundScore[];
  targetScore: number;
  dealer: Position;
}

export type GameEvent =
  | { type: 'cards-dealt'; hands: Map<Position, Card[]> }
  | { type: 'bidding-update'; state: BiddingState }
  | { type: 'contract-set'; contract: Bid; team: Team; contred: boolean; surcontred: boolean }
  | { type: 'bidding-failed' }
  | { type: 'your-turn'; player: Position; playableCards: Card[] }
  | { type: 'card-played'; player: Position; card: Card }
  | { type: 'belote-announced'; player: Position }
  | { type: 'rebelote-announced'; player: Position }
  | { type: 'trick-won'; winner: Position; trick: Trick }
  | { type: 'round-scored'; score: RoundScore }
  | { type: 'game-over'; winner: Team; scores: { [Team.NorthSouth]: number; [Team.EastWest]: number } };

export class GameEngine {
  public state: ServerGameState;
  private events: GameEvent[] = [];

  constructor(id: string, targetScore: number = DEFAULT_TARGET_SCORE) {
    this.state = {
      id,
      phase: GamePhase.Waiting,
      players: new Map(),
      bidding: createBiddingState(Position.South),
      contract: null,
      contractTeam: null,
      isContred: false,
      isSurcontred: false,
      trumpSuit: null,
      currentTrick: { cards: [], leadSuit: Suit.Spades, winner: null },
      tricks: [],
      currentPlayer: Position.South,
      trickCount: 0,
      scores: {
        [Team.NorthSouth]: 0,
        [Team.EastWest]: 0,
      },
      roundHistory: [],
      targetScore,
      dealer: Position.South,
    };
  }

  /** Ajoute un joueur à la partie */
  addPlayer(position: Position, userId: string, username: string): boolean {
    if (this.state.players.has(position)) return false;
    if (this.state.phase !== GamePhase.Waiting) return false;

    this.state.players.set(position, {
      position,
      hand: [],
      userId,
      username,
      isConnected: true,
      hasBelote: false,
      beloteAnnounced: false,
      rebeloteAnnounced: false,
    });
    return true;
  }

  /** Retire un joueur */
  removePlayer(position: Position): void {
    this.state.players.delete(position);
  }

  /** Marque un joueur comme connecté/déconnecté */
  setPlayerConnected(position: Position, connected: boolean): void {
    const player = this.state.players.get(position);
    if (player) player.isConnected = connected;
  }

  /** 4 joueurs → démarre la partie */
  canStart(): boolean {
    return this.state.players.size === 4 && this.state.phase === GamePhase.Waiting;
  }

  /** Démarre une nouvelle manche (distribution + enchères) */
  startRound(): GameEvent[] {
    this.events = [];

    // Mélanger et distribuer
    const deck = shuffleDeck(createDeck());
    const hands = dealCards(deck);
    const positions = [Position.South, Position.West, Position.North, Position.East];

    const handsMap = new Map<Position, Card[]>();
    positions.forEach((pos, i) => {
      const player = this.state.players.get(pos);
      if (player) {
        player.hand = hands[i];
        player.hasBelote = false;
        player.beloteAnnounced = false;
        player.rebeloteAnnounced = false;
      }
      handsMap.set(pos, hands[i]);
    });

    this.emit({ type: 'cards-dealt', hands: handsMap });

    // Lancer les enchères (le joueur après le donneur commence)
    const firstBidder = nextPlayer(this.state.dealer);
    this.state.bidding = createBiddingState(firstBidder);
    this.state.phase = GamePhase.Bidding;
    this.state.contract = null;
    this.state.contractTeam = null;
    this.state.isContred = false;
    this.state.isSurcontred = false;
    this.state.trumpSuit = null;
    this.state.currentTrick = { cards: [], leadSuit: Suit.Spades, winner: null };
    this.state.tricks = [];
    this.state.trickCount = 0;
    this.state.currentPlayer = firstBidder;

    this.emit({ type: 'bidding-update', state: this.state.bidding });

    return this.flushEvents();
  }

  /** Place une enchère */
  handleBid(player: Position, value: BidValue, suit: TrumpSuit): GameEvent[] {
    this.events = [];
    if (this.state.phase !== GamePhase.Bidding) return [];

    const newState = placeBid(this.state.bidding, value, suit, player);
    if (!newState) return [];

    this.state.bidding = newState;
    this.state.currentPlayer = newState.currentBidder;
    this.emit({ type: 'bidding-update', state: newState });

    this.checkBiddingEnd();
    return this.flushEvents();
  }

  /** Passe */
  handlePass(player: Position): GameEvent[] {
    this.events = [];
    if (this.state.phase !== GamePhase.Bidding) return [];

    const newState = passBid(this.state.bidding, player);
    if (!newState) return [];

    this.state.bidding = newState;
    this.state.currentPlayer = newState.currentBidder;
    this.emit({ type: 'bidding-update', state: newState });

    this.checkBiddingEnd();
    return this.flushEvents();
  }

  /** Contre */
  handleContre(player: Position): GameEvent[] {
    this.events = [];
    if (this.state.phase !== GamePhase.Bidding) return [];

    const newState = applyContre(this.state.bidding, player);
    if (!newState) return [];

    this.state.bidding = newState;
    this.state.currentPlayer = newState.currentBidder;
    this.emit({ type: 'bidding-update', state: newState });

    this.checkBiddingEnd();
    return this.flushEvents();
  }

  /** Surcontre */
  handleSurcontre(player: Position): GameEvent[] {
    this.events = [];
    if (this.state.phase !== GamePhase.Bidding) return [];

    const newState = applySurcontre(this.state.bidding, player);
    if (!newState) return [];

    this.state.bidding = newState;
    this.state.currentPlayer = newState.currentBidder;
    this.emit({ type: 'bidding-update', state: newState });

    this.checkBiddingEnd();
    return this.flushEvents();
  }

  /** Joue une carte */
  handlePlayCard(player: Position, card: Card): GameEvent[] {
    this.events = [];
    if (this.state.phase !== GamePhase.Playing) return [];
    if (this.state.currentPlayer !== player) return [];

    const playerState = this.state.players.get(player);
    if (!playerState) return [];

    if (!isValidPlay(card, playerState.hand, this.state.currentTrick, this.state.trumpSuit!, player)) {
      return [];
    }

    // Retirer la carte de la main
    playerState.hand = playerState.hand.filter(c => !isSameCard(c, card));

    // Gérer belote-rebelote
    if (this.state.trumpSuit && isBeloteCard(card, this.state.trumpSuit) && playerState.hasBelote) {
      if (!playerState.beloteAnnounced) {
        playerState.beloteAnnounced = true;
        this.emit({ type: 'belote-announced', player });
      } else if (!playerState.rebeloteAnnounced) {
        playerState.rebeloteAnnounced = true;
        this.emit({ type: 'rebelote-announced', player });
      }
    }

    // Ajouter la carte au pli
    const playedCard: PlayedCard = { card, player };
    if (this.state.currentTrick.cards.length === 0) {
      this.state.currentTrick.leadSuit = card.suit;
    }
    this.state.currentTrick.cards.push(playedCard);

    this.emit({ type: 'card-played', player, card });

    // Pli complet (4 cartes) ?
    if (this.state.currentTrick.cards.length === 4) {
      const winner = determineTrickWinner(this.state.currentTrick, this.state.trumpSuit!);
      this.state.currentTrick.winner = winner;
      this.state.tricks.push({ ...this.state.currentTrick });
      this.state.trickCount++;

      this.emit({ type: 'trick-won', winner, trick: this.state.currentTrick });

      // Tous les plis joués ?
      if (this.state.trickCount >= TRICKS_PER_ROUND) {
        this.scoreRound();
      } else {
        // Nouveau pli, le gagnant commence
        this.state.currentTrick = { cards: [], leadSuit: Suit.Spades, winner: null };
        this.state.currentPlayer = winner;
        this.emitYourTurn(winner);
      }
    } else {
      // Joueur suivant
      this.state.currentPlayer = nextPlayer(player);
      this.emitYourTurn(this.state.currentPlayer);
    }

    return this.flushEvents();
  }

  /** Retourne la main d'un joueur (pour la reconnexion) */
  getPlayerHand(position: Position): Card[] {
    return this.state.players.get(position)?.hand ?? [];
  }

  /** Retourne les cartes jouables pour le joueur actuel */
  getPlayableCards(position: Position): Card[] {
    const player = this.state.players.get(position);
    if (!player || !this.state.trumpSuit) return [];
    return getPlayableCards(player.hand, this.state.currentTrick, this.state.trumpSuit, position);
  }

  // ---- Privé ----

  private checkBiddingEnd(): void {
    if (!isBiddingOver(this.state.bidding)) return;

    if (isBiddingFailed(this.state.bidding)) {
      // Tout le monde a passé → redistribuer
      this.state.dealer = nextPlayer(this.state.dealer);
      this.emit({ type: 'bidding-failed' });
      // Auto-relance une nouvelle manche
      const events = this.startRound();
      this.events.push(...events);
      return;
    }

    // Contrat établi
    const contract = this.state.bidding.highestBid!;
    this.state.contract = contract;
    this.state.contractTeam = getTeam(contract.player);
    this.state.trumpSuit = contract.suit;
    this.state.isContred = this.state.bidding.isContred;
    this.state.isSurcontred = this.state.bidding.isSurcontred;

    // Détecter les joueurs qui ont la belote
    for (const [, player] of this.state.players) {
      player.hasBelote = hasBelote(player.hand, this.state.trumpSuit);
    }

    this.emit({
      type: 'contract-set',
      contract,
      team: this.state.contractTeam,
      contred: this.state.isContred,
      surcontred: this.state.isSurcontred,
    });

    // Passer en phase de jeu
    this.state.phase = GamePhase.Playing;
    this.state.currentTrick = { cards: [], leadSuit: Suit.Spades, winner: null };
    this.state.tricks = [];
    this.state.trickCount = 0;

    // Le joueur après le donneur commence
    const firstPlayer = nextPlayer(this.state.dealer);
    this.state.currentPlayer = firstPlayer;
    this.emitYourTurn(firstPlayer);
  }

  private scoreRound(): void {
    this.state.phase = GamePhase.Scoring;

    // Trouver l'équipe qui a la belote (annoncée belote + rebelote)
    let beloteTeam: Team | null = null;
    for (const [, player] of this.state.players) {
      if (player.beloteAnnounced && player.rebeloteAnnounced) {
        beloteTeam = getTeam(player.position);
        break;
      }
    }

    const score = calculateRoundScore(
      this.state.tricks,
      this.state.trumpSuit!,
      this.state.contract!,
      this.state.contractTeam!,
      beloteTeam,
      this.state.isContred,
      this.state.isSurcontred,
    );

    // Ajouter les scores
    this.state.scores[Team.NorthSouth] += score.teamNorthSouthScore;
    this.state.scores[Team.EastWest] += score.teamEastWestScore;
    this.state.roundHistory.push(score);

    this.emit({ type: 'round-scored', score });

    // Partie terminée ?
    if (isGameOver(this.state.scores, this.state.targetScore)) {
      const winner = getWinner(this.state.scores, this.state.targetScore)!;
      this.state.phase = GamePhase.GameOver;
      this.emit({ type: 'game-over', winner, scores: this.state.scores });
    } else {
      // Nouvelle manche démarrée côté handler avec un délai
      this.state.dealer = nextPlayer(this.state.dealer);
    }
  }

  private emitYourTurn(player: Position): void {
    const playerState = this.state.players.get(player);
    if (!playerState || !this.state.trumpSuit) return;
    const playableCards = getPlayableCards(
      playerState.hand, this.state.currentTrick, this.state.trumpSuit, player,
    );
    this.emit({ type: 'your-turn', player, playableCards });
  }

  private emit(event: GameEvent): void {
    this.events.push(event);
  }

  private flushEvents(): GameEvent[] {
    const events = [...this.events];
    this.events = [];
    return events;
  }
}
