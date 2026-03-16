import { Router, type Request, type Response } from 'express';
import { hashPassword, verifyPassword, generateTokens, verifyAccessToken } from './service.js';
import { prisma } from '../db/prisma.js';

export const authRouter = Router();

const GUEST_EMAIL_DOMAIN = '@guest.scontree.local';

function isGuestEmail(email: string): boolean {
  return email.endsWith(GUEST_EMAIL_DOMAIN);
}

async function generateUniqueGuestUsername(): Promise<string> {
  let username = '';
  let exists = true;
  while (exists) {
    username = `Invite${Math.floor(1000 + Math.random() * 9000)}`;
    const user = await prisma.user.findUnique({ where: { username } });
    exists = Boolean(user);
  }
  return username;
}

function sanitizeUsername(base: string): string {
  const cleaned = base.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 20);
  return cleaned.length >= 3 ? cleaned : `Player${Math.floor(100 + Math.random() * 900)}`;
}

async function ensureUniqueUsername(base: string): Promise<string> {
  let username = sanitizeUsername(base);
  let suffix = 1;
  while (await prisma.user.findUnique({ where: { username } })) {
    const room = Math.max(3, 20 - String(suffix).length);
    username = `${sanitizeUsername(base).slice(0, room)}${suffix}`;
    suffix++;
  }
  return username;
}

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
      user: { id: user.id, email: user.email, username: user.username, isGuest: isGuestEmail(user.email) },
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
      user: { id: user.id, email: user.email, username: user.username, isGuest: isGuestEmail(user.email) },
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
      isGuest: isGuestEmail(user.email),
      stats: user.stats,
    });
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// POST /api/auth/guest
authRouter.post('/guest', async (_req: Request, res: Response) => {
  try {
    const username = await generateUniqueGuestUsername();
    const email = `${username.toLowerCase()}-${Date.now()}${GUEST_EMAIL_DOMAIN}`;
    const passwordHash = await hashPassword(`guest-${Math.random().toString(36).slice(2)}`);

    const user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        stats: { create: {} },
      },
    });

    const tokens = generateTokens({ userId: user.id, username: user.username, isGuest: true });
    res.status(201).json({
      user: { id: user.id, email: user.email, username: user.username, isGuest: true },
      ...tokens,
    });
  } catch (err) {
    console.error('Guest login error:', err);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// GET /api/auth/oauth/google/start
authRouter.get('/oauth/google/start', async (_req: Request, res: Response) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    res.status(501).json({ error: 'Connexion Google non configurée côté serveur' });
    return;
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    prompt: 'select_account',
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

// GET /api/auth/oauth/google/callback
authRouter.get('/oauth/google/callback', async (req: Request, res: Response) => {
  try {
    const code = req.query.code;
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

    if (!code || typeof code !== 'string') {
      res.status(400).json({ error: 'Code OAuth Google manquant' });
      return;
    }
    if (!clientId || !clientSecret || !redirectUri) {
      res.status(501).json({ error: 'Google OAuth callback non configuré (client secret manquant)' });
      return;
    }

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const txt = await tokenRes.text();
      console.error('Google token exchange error:', txt);
      res.status(401).json({ error: 'Echec de connexion Google' });
      return;
    }

    const tokenData = await tokenRes.json() as { access_token?: string };
    if (!tokenData.access_token) {
      res.status(401).json({ error: 'Token Google invalide' });
      return;
    }

    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!profileRes.ok) {
      res.status(401).json({ error: 'Profil Google introuvable' });
      return;
    }

    const profile = await profileRes.json() as { email?: string; name?: string; id?: string };
    if (!profile.email) {
      res.status(400).json({ error: 'Google n\'a pas fourni d\'email' });
      return;
    }

    let user = await prisma.user.findUnique({ where: { email: profile.email } });
    if (!user) {
      const username = await ensureUniqueUsername(profile.name || profile.email.split('@')[0] || `Google${profile.id || ''}`);
      const passwordHash = await hashPassword(`google-${profile.id || Math.random().toString(36).slice(2)}`);
      user = await prisma.user.create({
        data: {
          email: profile.email,
          username,
          passwordHash,
          stats: { create: {} },
        },
      });
    }

    const tokens = generateTokens({ userId: user.id, username: user.username, isGuest: false });
    const redirect = new URL('/login', clientUrl);
    redirect.searchParams.set('oauth_access', tokens.accessToken);
    redirect.searchParams.set('oauth_refresh', tokens.refreshToken);
    res.redirect(redirect.toString());
  } catch (err) {
    console.error('Google OAuth callback error:', err);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

