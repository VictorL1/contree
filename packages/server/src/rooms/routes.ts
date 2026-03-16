import { Router } from 'express';
import { gameManager } from '../game/manager.js';

export const roomsRouter = Router();

// GET /api/rooms/public
roomsRouter.get('/public', (_req, res) => {
  res.json(gameManager.listPublicRooms());
});
