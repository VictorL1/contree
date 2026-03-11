import { Router, type Request, type Response } from 'express';
import { hashPassword, verifyPassword, generateTokens, verifyAccessToken } from './service.js';
import { prisma } from '../db/prisma.js';

export const authRouter = Router();

// POST /api/auth/register
authRouter.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, username, password } = req.body;

    if (!email || !username || !password) {
      res.status(400).json({ error: 'Email, pseudo et mot de passe requis' });
      return;
    }

    if (typeof email !== 'string' || typeof username !== 'string' || typeof password !== 'string') {
      res.status(400).json({ error: 'Données invalides' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
      return;
    }

    if (username.length < 2 || username.length > 20) {
      res.status(400).json({ error: 'Le pseudo doit contenir entre 2 et 20 caractères' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ error: 'Email invalide' });
      return;
    }

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });

    if (existing) {
      const field = existing.email === email ? 'email' : 'pseudo';
      res.status(409).json({ error: `Ce ${field} est déjà utilisé` });
      return;
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        stats: { create: {} },
      },
    });

    const tokens = generateTokens({ userId: user.id, username: user.username });

    res.status(201).json({
      user: { id: user.id, email: user.email, username: user.username },
      ...tokens,
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// POST /api/auth/login
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { login, password } = req.body;

    if (!login || !password) {
      res.status(400).json({ error: 'Email/pseudo et mot de passe requis' });
      return;
    }

    if (typeof login !== 'string' || typeof password !== 'string') {
      res.status(400).json({ error: 'Données invalides' });
      return;
    }

    // Chercher par email ou par pseudo
    const isEmail = login.includes('@');
    const user = await prisma.user.findFirst({
      where: isEmail ? { email: login } : { username: login },
    });
    if (!user) {
      res.status(401).json({ error: 'Identifiant ou mot de passe incorrect' });
      return;
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Identifiant ou mot de passe incorrect' });
      return;
    }

    const tokens = generateTokens({ userId: user.id, username: user.username });

    res.json({
      user: { id: user.id, email: user.email, username: user.username },
      ...tokens,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// POST /api/auth/refresh
authRouter.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken || typeof refreshToken !== 'string') {
      res.status(400).json({ error: 'Refresh token requis' });
      return;
    }

    const payload = verifyAccessToken(refreshToken);
    if (!payload) {
      res.status(401).json({ error: 'Refresh token invalide' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      res.status(401).json({ error: 'Utilisateur introuvable' });
      return;
    }

    const tokens = generateTokens({ userId: user.id, username: user.username });
    res.json(tokens);
  } catch (err) {
    console.error('Refresh error:', err);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// GET /api/auth/me
authRouter.get('/me', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Token manquant' });
      return;
    }

    const token = authHeader.slice(7);
    const payload = verifyAccessToken(token);
    if (!payload) {
      res.status(401).json({ error: 'Token invalide' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { stats: true },
    });

    if (!user) {
      res.status(404).json({ error: 'Utilisateur introuvable' });
      return;
    }

    res.json({
      id: user.id,
      email: user.email,
      username: user.username,
      stats: user.stats,
    });
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});
