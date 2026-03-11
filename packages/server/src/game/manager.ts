import { GameEngine } from './engine.js';
import { Position } from '@contree/shared';

interface Room {
  code: string;
  engine: GameEngine;
  playerSockets: Map<string, Position>; // socketId → Position
  positionToSocket: Map<Position, string>; // Position → socketId
  targetScore: number;
}

class GameManager {
  private rooms = new Map<string, Room>();

  /** Crée un nouveau salon avec un code unique */
  createRoom(targetScore: number = 1000): Room {
    const code = this.generateCode();
    const engine = new GameEngine(code, targetScore);
    const room: Room = {
      code,
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
