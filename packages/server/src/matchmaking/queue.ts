import { gameManager } from '../game/manager.js';

interface QueueEntry {
  socketId: string;
  userId: string;
  username: string;
  joinedAt: number;
}

class MatchmakingQueue {
  private queue: QueueEntry[] = [];

  /** Ajoute un joueur à la file d'attente. Retourne un code de salon si 4 joueurs sont prêts. */
  add(socketId: string, userId: string, username: string): string | null {
    // Éviter les doublons
    if (this.queue.some(e => e.userId === userId)) return null;

    this.queue.push({ socketId, userId, username, joinedAt: Date.now() });

    // 4 joueurs → créer un salon
    if (this.queue.length >= 4) {
      const players = this.queue.splice(0, 4);
      const room = gameManager.createRoom();

      return room.code;
    }

    return null;
  }

  /** Retire un joueur de la file */
  remove(socketId: string): void {
    this.queue = this.queue.filter(e => e.socketId !== socketId);
  }

  /** Retourne les joueurs en attente (les 4 premiers si match trouvé) */
  getPendingPlayers(): QueueEntry[] {
    return [...this.queue];
  }

  /** Taille de la file */
  get size(): number {
    return this.queue.length;
  }
}

export const matchmakingQueue = new MatchmakingQueue();
