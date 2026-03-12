import { Router, type Request, type Response } from 'express';
import { verifyAccessToken } from '../auth/service.js';
import { prisma } from '../db/prisma.js';

export const statsRouter = Router();

// GET /api/stats/leaderboard
statsRouter.get('/leaderboard', async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        stats: {
          select: {
            gamesPlayed: true,
            gamesWon: true,
            victoryPoints: true,
            totalPoints: true,
          },
        },
      },
      orderBy: {
        stats: { victoryPoints: 'desc' },
      },
      take: 50,
    });

    const leaderboard = users
      .filter(u => u.stats)
      .map((u, i) => ({
        rank: i + 1,
        username: u.username,
        victoryPoints: u.stats!.victoryPoints,
        gamesPlayed: u.stats!.gamesPlayed,
        gamesWon: u.stats!.gamesWon,
        winRate: u.stats!.gamesPlayed > 0
          ? Math.round((u.stats!.gamesWon / u.stats!.gamesPlayed) * 100)
          : 0,
      }));

    res.json(leaderboard);
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// GET /api/stats/me — stats détaillées du joueur connecté
statsRouter.get('/me', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Token manquant' });
      return;
    }

    const payload = verifyAccessToken(authHeader.slice(7));
    if (!payload) {
      res.status(401).json({ error: 'Token invalide' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        stats: true,
        partnerStats: {
          include: { partner: { select: { username: true } } },
          orderBy: { gamesWon: 'desc' },
          take: 10,
        },
      },
    });

    if (!user) {
      res.status(404).json({ error: 'Utilisateur introuvable' });
      return;
    }

    res.json({
      stats: user.stats,
      partners: user.partnerStats.map(ps => ({
        partnerName: ps.partner.username,
        gamesPlayed: ps.gamesPlayed,
        gamesWon: ps.gamesWon,
        totalPoints: ps.totalPoints,
      })),
      equipped: {
        border: user.equippedBorder,
        table: user.equippedTable,
        cardBack: user.equippedCardBack,
      },
    });
  } catch (err) {
    console.error('Stats me error:', err);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// GET /api/stats/cosmetics — liste des objets cosmétiques disponibles
statsRouter.get('/cosmetics', async (_req: Request, res: Response) => {
  try {
    const items = await prisma.cosmeticItem.findMany({
      orderBy: [{ category: 'asc' }, { cost: 'asc' }],
    });
    res.json(items);
  } catch (err) {
    console.error('Cosmetics error:', err);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// POST /api/stats/cosmetics/buy — acheter un cosmétique
statsRouter.post('/cosmetics/buy', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Token manquant' });
      return;
    }

    const payload = verifyAccessToken(authHeader.slice(7));
    if (!payload) {
      res.status(401).json({ error: 'Token invalide' });
      return;
    }

    const { itemId } = req.body;
    if (!itemId || typeof itemId !== 'string') {
      res.status(400).json({ error: 'itemId requis' });
      return;
    }

    const [user, item] = await Promise.all([
      prisma.user.findUnique({ where: { id: payload.userId }, include: { stats: true } }),
      prisma.cosmeticItem.findUnique({ where: { id: itemId } }),
    ]);

    if (!user || !item) {
      res.status(404).json({ error: 'Utilisateur ou objet introuvable' });
      return;
    }

    if (!user.stats || user.stats.victoryPoints < item.cost) {
      res.status(400).json({ error: 'Points insuffisants' });
      return;
    }

    // Check if already owned
    const existing = await prisma.userCosmetic.findUnique({
      where: { userId_itemId: { userId: user.id, itemId: item.id } },
    });
    if (existing) {
      res.status(400).json({ error: 'Objet déjà possédé' });
      return;
    }

    await prisma.$transaction([
      prisma.userStats.update({
        where: { userId: user.id },
        data: { victoryPoints: { decrement: item.cost } },
      }),
      prisma.userCosmetic.create({
        data: { userId: user.id, itemId: item.id },
      }),
    ]);

    res.json({ success: true, remainingPoints: user.stats.victoryPoints - item.cost });
  } catch (err) {
    console.error('Buy cosmetic error:', err);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// POST /api/stats/cosmetics/equip — équiper un cosmétique
statsRouter.post('/cosmetics/equip', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Token manquant' });
      return;
    }

    const payload = verifyAccessToken(authHeader.slice(7));
    if (!payload) {
      res.status(401).json({ error: 'Token invalide' });
      return;
    }

    const { itemName, category } = req.body;
    if (!category || typeof category !== 'string') {
      res.status(400).json({ error: 'Catégorie requise' });
      return;
    }

    const validCategories = ['border', 'table', 'cardBack'];
    if (!validCategories.includes(category)) {
      res.status(400).json({ error: 'Catégorie invalide' });
      return;
    }

    // "default" is always available
    if (itemName !== 'default') {
      const item = await prisma.cosmeticItem.findFirst({
        where: { name: itemName, category },
      });
      if (!item) {
        res.status(404).json({ error: 'Objet introuvable' });
        return;
      }

      const owned = await prisma.userCosmetic.findFirst({
        where: { userId: payload.userId, itemId: item.id },
      });
      if (!owned) {
        res.status(400).json({ error: 'Objet non possédé' });
        return;
      }
    }

    const updateData: Record<string, string> = {};
    if (category === 'border') updateData.equippedBorder = itemName;
    if (category === 'table') updateData.equippedTable = itemName;
    if (category === 'cardBack') updateData.equippedCardBack = itemName;

    await prisma.user.update({
      where: { id: payload.userId },
      data: updateData,
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Equip cosmetic error:', err);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});
