import { Server, Socket } from 'socket.io';
import { Position, Team, GamePhase, type ClientEvents, type ServerEvents, type Card } from '@contree/shared';
import { verifyAccessToken } from '../auth/service.js';
import { gameManager } from '../game/manager.js';
import { matchmakingQueue } from '../matchmaking/queue.js';
import type { GameEvent } from '../game/engine.js';

interface AuthenticatedSocket extends Socket<ClientEvents, ServerEvents> {
  data: {
    userId: string;
    username: string;
  };
}

export function setupSocketHandlers(io: Server<ClientEvents, ServerEvents>): void {
  // Middleware d'authentification
  io.use((socket, next) => {
    const token = socket.handshake.auth.token as string;
    if (!token) {
      return next(new Error('Token manquant'));
    }

    const payload = verifyAccessToken(token);
    if (!payload) {
      return next(new Error('Token invalide'));
    }

    socket.data.userId = payload.userId;
    socket.data.username = payload.username;
    next();
  });

  io.on('connection', (rawSocket) => {
    const socket = rawSocket as AuthenticatedSocket;
    console.log(`${socket.data.username} connecté (${socket.id})`);

    // ---- Créer un salon ----
    socket.on('create-room', ({ targetScore }) => {
      const room = gameManager.createRoom(targetScore || 1000);
      socket.emit('room-created', { roomCode: room.code });
    });

    // ---- Rejoindre un salon ----
    socket.on('join-room', ({ roomCode }) => {
      const room = gameManager.getRoom(roomCode.toUpperCase());
      if (!room) {
        socket.emit('error', { message: 'Salon introuvable' });
        return;
      }

      if (room.engine.state.phase !== GamePhase.Waiting) {
        // Tentative de reconnexion
        handleReconnection(socket, room);
        return;
      }

      // Même socket déjà dans ce salon ? Juste renvoyer l'état
      if (room.playerSockets.has(socket.id)) {
        const players = Array.from(room.engine.state.players.entries()).map(([pos, p]) => ({
          position: pos,
          username: p.username,
        }));
        socket.emit('room-joined', { players });
        return;
      }

      // Même userId déjà dans le salon avec un ancien socket ? (reconnexion HMR / refresh)
      let existingPosition: Position | null = null;
      for (const [pos, player] of room.engine.state.players) {
        if (player.userId === socket.data.userId) {
          existingPosition = pos;
          break;
        }
      }

      if (existingPosition) {
        // Remapper l'ancien socket vers le nouveau
        const oldSocketId = room.positionToSocket.get(existingPosition);
        if (oldSocketId) {
          room.playerSockets.delete(oldSocketId);
        }
        room.playerSockets.set(socket.id, existingPosition);
        room.positionToSocket.set(existingPosition, socket.id);
        room.engine.setPlayerConnected(existingPosition, true);
        socket.join(room.code);

        const players = Array.from(room.engine.state.players.entries()).map(([pos, p]) => ({
          position: pos,
          username: p.username,
        }));
        socket.emit('room-joined', { players });
        return;
      }

      const position = gameManager.getNextFreePosition(room);
      if (!position) {
        socket.emit('error', { message: 'Le salon est plein' });
        return;
      }

      gameManager.assignPlayer(room, socket.id, position, socket.data.userId, socket.data.username);
      socket.join(room.code);

      // Informer le nouveau joueur de tous les joueurs présents
      const players = Array.from(room.engine.state.players.entries()).map(([pos, p]) => ({
        position: pos,
        username: p.username,
      }));
      socket.emit('room-joined', { players });

      // Informer les autres
      socket.to(room.code).emit('player-joined', { position, username: socket.data.username });
    });

    // ---- Joueur prêt → démarrer si 4 joueurs ----
    socket.on('player-ready', () => {
      const room = gameManager.getRoomBySocketId(socket.id);
      if (!room) return;

      if (room.engine.canStart()) {
        const events = room.engine.startRound();
        io.to(room.code).emit('game-started', { dealer: room.engine.state.dealer });
        broadcastGameEvents(io, room.code, room, events);
      }
    });

    // ---- Synchronisation d'état (après navigation vers GamePage) ----
    socket.on('request-game-state', () => {
      const room = gameManager.getRoomBySocketId(socket.id);
      if (!room) return;

      const position = room.playerSockets.get(socket.id);
      if (!position) return;

      // Renvoyer la liste des joueurs
      const players = Array.from(room.engine.state.players.entries()).map(([pos, p]) => ({
        position: pos,
        username: p.username,
      }));
      socket.emit('room-joined', { players });

      // Renvoyer la main
      const hand = room.engine.getPlayerHand(position);
      if (hand.length > 0) {
        socket.emit('cards-dealt', { hand });
      }

      // Renvoyer l'état des enchères
      if (room.engine.state.phase === GamePhase.Bidding) {
        socket.emit('bidding-update', room.engine.state.bidding);
      }

      // Renvoyer le contrat
      if (room.engine.state.contract) {
        socket.emit('contract-set', {
          contract: room.engine.state.contract,
          team: room.engine.state.contractTeam!,
          contred: room.engine.state.isContred,
          surcontred: room.engine.state.isSurcontred,
        });
      }

      // Si c'est le tour de ce joueur
      if (room.engine.state.currentPlayer === position && room.engine.state.phase === GamePhase.Playing) {
        socket.emit('your-turn', { playableCards: room.engine.getPlayableCards(position) });
      }
    });

    // ---- Enchères ----
    socket.on('place-bid', ({ value, suit }) => {
      const room = gameManager.getRoomBySocketId(socket.id);
      if (!room) return;

      const position = room.playerSockets.get(socket.id);
      if (!position) return;

      const events = room.engine.handleBid(position, value, suit);
      broadcastGameEvents(io, room.code, room, events);
    });

    socket.on('pass', () => {
      const room = gameManager.getRoomBySocketId(socket.id);
      if (!room) return;

      const position = room.playerSockets.get(socket.id);
      if (!position) return;

      const events = room.engine.handlePass(position);
      broadcastGameEvents(io, room.code, room, events);
    });

    socket.on('contre', () => {
      const room = gameManager.getRoomBySocketId(socket.id);
      if (!room) return;

      const position = room.playerSockets.get(socket.id);
      if (!position) return;

      const events = room.engine.handleContre(position);
      broadcastGameEvents(io, room.code, room, events);
    });

    socket.on('surcontre', () => {
      const room = gameManager.getRoomBySocketId(socket.id);
      if (!room) return;

      const position = room.playerSockets.get(socket.id);
      if (!position) return;

      const events = room.engine.handleSurcontre(position);
      broadcastGameEvents(io, room.code, room, events);
    });

    // ---- Jeu ----
    socket.on('play-card', ({ card }) => {
      const room = gameManager.getRoomBySocketId(socket.id);
      if (!room) return;

      const position = room.playerSockets.get(socket.id);
      if (!position) return;

      const events = room.engine.handlePlayCard(position, card);
      if (events.length === 0) {
        socket.emit('error', { message: 'Coup invalide' });
      }
      broadcastGameEvents(io, room.code, room, events);
    });

    // ---- Chat ----
    socket.on('chat-message', ({ message }) => {
      const room = gameManager.getRoomBySocketId(socket.id);
      if (!room) return;

      // Limiter la taille du message
      const sanitized = message.slice(0, 200);
      io.to(room.code).emit('chat-message', {
        username: socket.data.username,
        message: sanitized,
      });
    });

    // ---- Déconnexion ----
    socket.on('disconnect', () => {
      console.log(`${socket.data.username} déconnecté`);

      // Retirer du matchmaking
      matchmakingQueue.remove(socket.id);

      const room = gameManager.getRoomBySocketId(socket.id);
      if (!room) return;

      const position = room.playerSockets.get(socket.id);
      if (!position) return;

      if (room.engine.state.phase === GamePhase.Waiting) {
        // En attente → retirer le joueur
        gameManager.removePlayer(room, socket.id);
        io.to(room.code).emit('player-left', { position });

        // Supprimer le salon s'il est vide
        if (room.playerSockets.size === 0) {
          gameManager.deleteRoom(room.code);
        }
      } else {
        // Partie en cours → marquer comme déconnecté (possibilité de reconnexion)
        room.engine.setPlayerConnected(position, false);
        io.to(room.code).emit('player-disconnected', { position });
      }
    });
  });
}

/** Gère la reconnexion d'un joueur à une partie en cours */
function handleReconnection(socket: AuthenticatedSocket, room: ReturnType<typeof gameManager.getRoom>): void {
  if (!room) return;

  // Trouver la position du joueur par son userId
  let reconnectPosition: Position | null = null;
  for (const [pos, player] of room.engine.state.players) {
    if (player.userId === socket.data.userId && !player.isConnected) {
      reconnectPosition = pos;
      break;
    }
  }

  if (!reconnectPosition) {
    socket.emit('error', { message: 'Impossible de se reconnecter' });
    return;
  }

  // Remapper le socket
  room.playerSockets.set(socket.id, reconnectPosition);
  room.positionToSocket.set(reconnectPosition, socket.id);
  room.engine.setPlayerConnected(reconnectPosition, true);
  socket.join(room.code);

  // Renvoyer l'état de la partie
  const players = Array.from(room.engine.state.players.entries()).map(([pos, p]) => ({
    position: pos,
    username: p.username,
  }));
  socket.emit('room-joined', { players });
  socket.emit('cards-dealt', { hand: room.engine.getPlayerHand(reconnectPosition) });

  if (room.engine.state.contract) {
    socket.emit('contract-set', {
      contract: room.engine.state.contract,
      team: room.engine.state.contractTeam!,
      contred: room.engine.state.isContred,
      surcontred: room.engine.state.isSurcontred,
    });
  }

  // Si c'est son tour
  if (room.engine.state.currentPlayer === reconnectPosition && room.engine.state.phase === GamePhase.Playing) {
    socket.emit('your-turn', {
      playableCards: room.engine.getPlayableCards(reconnectPosition),
    });
  }

  socket.to(room.code).emit('player-reconnected', { position: reconnectPosition });
}

/** Broadcast les événements du GameEngine aux bons joueurs */
function broadcastGameEvents(
  io: Server<ClientEvents, ServerEvents>,
  roomCode: string,
  room: ReturnType<typeof gameManager.getRoom>,
  events: GameEvent[],
): void {
  if (!room) return;

  for (const event of events) {
    switch (event.type) {
      case 'cards-dealt':
        // Chaque joueur reçoit uniquement ses propres cartes
        for (const [position, hand] of event.hands) {
          const socketId = room.positionToSocket.get(position);
          if (socketId) {
            io.to(socketId).emit('cards-dealt', { hand });
          }
        }
        break;

      case 'bidding-update':
        io.to(roomCode).emit('bidding-update', event.state);
        break;

      case 'contract-set':
        io.to(roomCode).emit('contract-set', {
          contract: event.contract,
          team: event.team,
          contred: event.contred,
          surcontred: event.surcontred,
        });
        break;

      case 'bidding-failed':
        // La manche va être relancée automatiquement (les événements suivants gèrent ça)
        break;

      case 'your-turn': {
        const socketId = room.positionToSocket.get(event.player);
        if (socketId) {
          io.to(socketId).emit('your-turn', { playableCards: event.playableCards });
        }
        break;
      }

      case 'card-played':
        io.to(roomCode).emit('card-played', { player: event.player, card: event.card });
        break;

      case 'trick-won':
        io.to(roomCode).emit('trick-won', { winner: event.winner, trick: event.trick });
        break;

      case 'round-scored':
        io.to(roomCode).emit('round-scored', event.score);
        // Démarrer la prochaine manche après un délai pour laisser voir le résultat
        if (room && room.engine.state.phase !== GamePhase.GameOver) {
          setTimeout(() => {
            const nextEvents = room.engine.startRound();
            broadcastGameEvents(io, roomCode, room, nextEvents);
          }, 5000);
        }
        break;

      case 'game-over':
        io.to(roomCode).emit('game-over', { winner: event.winner, scores: event.scores });
        break;
    }
  }
}
