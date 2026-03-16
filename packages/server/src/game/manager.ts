import { GameEngine } from './engine.js';
import { GamePhase, Position } from '@contree/shared';

interface Room {
  code: string;
  name?: string;
  isPublic: boolean;
  engine: GameEngine;
  playerSockets: Map<string, Position>; // socketId → Position
  positionToSocket: Map<Position, string>; // Position → socketId
  targetScore: number;
}

interface CreateRoomOptions {
  targetScore?: number;
  code?: string;
  isPublic?: boolean;
  name?: string;
}

class GameManager {
  private rooms = new Map<string, Room>();

  constructor() {
    this.ensurePublicRooms();
  }

  /** Crée un nouveau salon avec un code unique */
  createRoom(optionsOrTargetScore: number | CreateRoomOptions = 1000): Room {
    const options = typeof optionsOrTargetScore === 'number'
      ? { targetScore: optionsOrTargetScore }
      : optionsOrTargetScore;

    const code = options.code?.toUpperCase() ?? this.generateCode();
    const targetScore = options.targetScore ?? 1000;
    const engine = new GameEngine(code, targetScore);
    const room: Room = {
      code,
      name: options.name,
      isPublic: options.isPublic ?? false,
      engine,
      playerSockets: new Map(),
      positionToSocket: new Map(),
      targetScore,
    };
    this.rooms.set(code, room);
    return room;
  }

  /** Récupère un salon par code */
  getRoom(code: string): Room | undefined {
    return this.rooms.get(code);
  }

  /** Supprime un salon */
  deleteRoom(code: string): void {
    const room = this.rooms.get(code);
    if (!room) return;

    // Les salons publics sont persistants pour faciliter l'accès rapide
    if (room.isPublic) {
      const freshEngine = new GameEngine(code, room.targetScore);
      this.rooms.set(code, {
        ...room,
        engine: freshEngine,
        playerSockets: new Map(),
        positionToSocket: new Map(),
      });
      return;
    }

    this.rooms.delete(code);
  }

  /** Trouve le salon d'un socket */
  getRoomBySocketId(socketId: string): Room | undefined {
    for (const room of this.rooms.values()) {
      if (room.playerSockets.has(socketId)) return room;
    }
    return undefined;
  }

  /** Assigne un joueur à une position dans un salon */
  assignPlayer(room: Room, socketId: string, position: Position, userId: string, username: string): boolean {
    if (room.positionToSocket.has(position)) return false;

    const added = room.engine.addPlayer(position, userId, username);
    if (!added) return false;

    room.playerSockets.set(socketId, position);
    room.positionToSocket.set(position, socketId);
    return true;
  }

  movePlayerToPosition(room: Room, socketId: string, newPosition: Position): boolean {
    const currentPosition = room.playerSockets.get(socketId);
    if (!currentPosition) return false;
    if (currentPosition === newPosition) return true;

    const player = room.engine.state.players.get(currentPosition);
    if (!player) return false;

    const otherSocketId = room.positionToSocket.get(newPosition);
    const otherPlayer = room.engine.state.players.get(newPosition);

    if (otherSocketId && otherPlayer) {
      // Swap both players so a full lobby can still reorganize teams.
      room.playerSockets.set(socketId, newPosition);
      room.playerSockets.set(otherSocketId, currentPosition);

      room.positionToSocket.set(newPosition, socketId);
      room.positionToSocket.set(currentPosition, otherSocketId);

      room.engine.state.players.delete(currentPosition);
      room.engine.state.players.delete(newPosition);

      player.position = newPosition;
      otherPlayer.position = currentPosition;

      room.engine.state.players.set(newPosition, player);
      room.engine.state.players.set(currentPosition, otherPlayer);
      return true;
    }

    room.playerSockets.set(socketId, newPosition);
    room.positionToSocket.delete(currentPosition);
    room.positionToSocket.set(newPosition, socketId);

    room.engine.state.players.delete(currentPosition);
    player.position = newPosition;
    room.engine.state.players.set(newPosition, player);
    return true;
  }

  /** Retire un joueur d'un salon */
  removePlayer(room: Room, socketId: string): Position | null {
    const position = room.playerSockets.get(socketId);
    if (!position) return null;

    room.playerSockets.delete(socketId);
    room.positionToSocket.delete(position);
    room.engine.removePlayer(position);
    return position;
  }

  /** Trouve la prochaine position libre */
  getNextFreePosition(room: Room): Position | null {
    const positions = [Position.South, Position.West, Position.North, Position.East];
    for (const pos of positions) {
      if (!room.positionToSocket.has(pos)) return pos;
    }
    return null;
  }

  listPublicRooms(): Array<{ code: string; name: string; players: number; targetScore: number; inProgress: boolean }> {
    const rooms = Array.from(this.rooms.values())
      .filter(room => room.isPublic)
      .map(room => ({
        code: room.code,
        name: room.name ?? `Salon ${room.code}`,
        players: room.engine.state.players.size,
        targetScore: room.targetScore,
        inProgress: room.engine.state.phase !== GamePhase.Waiting,
      }));

    return rooms;
  }

  private ensurePublicRooms(): void {
    const predefined = [
      { code: 'PUB001', name: 'Public 1', targetScore: 1000 },
      { code: 'PUB002', name: 'Public 2', targetScore: 1000 },
      { code: 'PUB003', name: 'Public 3', targetScore: 1000 },
    ];

    for (const r of predefined) {
      if (this.rooms.has(r.code)) continue;
      this.createRoom({ code: r.code, name: r.name, targetScore: r.targetScore, isPublic: true });
    }
  }

  /** Génère un code de salon unique (6 caractères alphanumériques) */
  private generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Pas de I/O/0/1 pour éviter confusion
    let code: string;
    do {
      code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    } while (this.rooms.has(code));
    return code;
  }
}

export const gameManager = new GameManager();
