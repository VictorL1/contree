import { Router, type Request, type Response, type NextFunction } from 'express';
import { verifyAccessToken, type TokenPayload } from '../auth/service.js';
import { prisma } from '../db/prisma.js';

export const sheetsRouter = Router();

// ============================================================
// Auth middleware
// ============================================================
interface AuthedRequest extends Request {
  auth?: TokenPayload;
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
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
  req.auth = payload;
  next();
}

sheetsRouter.use(requireAuth);

// ============================================================
// Helpers
// ============================================================
const VALID_SUITS = ['spades', 'hearts', 'diamonds', 'clubs'];
const VALID_BID_TYPES = ['normal', 'capot', 'generale'];
const VALID_MODES = ['points-faits', 'points-annonces'];
const TOTAL_POINTS = 162;
const BELOTE_BONUS = 20;

function genShareCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function buildInitials(...names: string[]): string {
  return names.map(n => (n || '').replace(/[^a-zA-ZÀ-ÿ]/g, '').slice(0, 3).toUpperCase().padEnd(3, '·')).join('-');
}

function buildSheetName(names: string[], date = new Date()): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yy = String(date.getFullYear()).slice(2);
  const hh = String(date.getHours()).padStart(2, '0');
  const mn = String(date.getMinutes()).padStart(2, '0');
  return `${buildInitials(...names)} - ${dd}/${mm}/${yy} ${hh}:${mn}`;
}

async function getSheetWithAccess(sheetId: string, userId: string) {
  const sheet = await prisma.scoreSheet.findUnique({
    where: { id: sheetId },
    include: {
      rounds: { orderBy: { index: 'asc' } },
      shares: { select: { userId: true } },
    },
  });
  if (!sheet) return { sheet: null, isOwner: false, hasAccess: false };
  const isOwner = sheet.ownerId === userId;
  const isShared = sheet.shares.some(s => s.userId === userId);
  return { sheet, isOwner, hasAccess: isOwner || isShared };
}

/** Calcule team1Points/team2Points/contractMet à partir d'un input mode. */
function computeRoundFromInput(input: any, scoreMode: string): {
  takerTeam: number;
  bidValue: number;
  bidType: string;
  trumpSuit: string;
  contred: boolean;
  surcontred: boolean;
  team1Points: number;
  team2Points: number;
  beloteTeam: number | null;
  contractMet: boolean;
  notes: string | null;
} {
  const takerTeam = Number(input.takerTeam);
  if (takerTeam !== 1 && takerTeam !== 2) throw new Error('takerTeam doit être 1 ou 2');

  const bidType = String(input.bidType || 'normal');
  if (!VALID_BID_TYPES.includes(bidType)) throw new Error('bidType invalide');

  let bidValue: number;
  if (bidType === 'capot') bidValue = 250;
  else if (bidType === 'generale') bidValue = 500;
  else {
    bidValue = Number(input.bidValue);
    if (!Number.isFinite(bidValue) || bidValue < 80 || bidValue > 160 || bidValue % 10 !== 0) {
      throw new Error('bidValue doit être 80..160 par pas de 10');
    }
  }

  const trumpSuit = String(input.trumpSuit);
  if (!VALID_SUITS.includes(trumpSuit)) throw new Error('trumpSuit invalide');

  const contred = Boolean(input.contred);
  const surcontred = Boolean(input.surcontred);
  const multiplier = surcontred ? 4 : contred ? 2 : 1;

  const beloteTeam: number | null =
    input.beloteTeam === 1 ? 1 : input.beloteTeam === 2 ? 2 : null;
  const beloteBonus = beloteTeam ? BELOTE_BONUS : 0;
  const beloteFor = (t: number) => (beloteTeam === t ? beloteBonus : 0);

  const notes = typeof input.notes === 'string' && input.notes.trim() ? input.notes.trim().slice(0, 200) : null;

  let team1Points = 0;
  let team2Points = 0;
  let contractMet: boolean;

  if (scoreMode === 'points-faits') {
    // L'utilisateur saisit les points faits par chaque équipe (somme = 162)
    const takerRaw = Number(input.takerTrickPoints);
    if (!Number.isFinite(takerRaw) || takerRaw < 0 || takerRaw > TOTAL_POINTS) {
      throw new Error('takerTrickPoints doit être entre 0 et 162');
    }
    const defenseRaw = TOTAL_POINTS - takerRaw;
    const capotMade = Boolean(input.capotMade);

    if (bidType === 'capot' || bidType === 'generale') {
      contractMet = capotMade && takerRaw === TOTAL_POINTS;
    } else {
      contractMet = takerRaw >= bidValue;
    }

    if (contractMet) {
      const score = bidValue * multiplier;
      if (takerTeam === 1) {
        team1Points = score + beloteFor(1);
        team2Points = beloteFor(2);
      } else {
        team2Points = score + beloteFor(2);
        team1Points = beloteFor(1);
      }
    } else {
      // Chute : défense marque (162 + valeur du contrat) * multiplier (règle classique Contrée)
      // Mais ici on respecte le scoring du jeu en ligne : chute = 0 pour tous, sauf belote.
      // Pour rester cohérent avec packages/shared/src/scoring.ts.
      team1Points = beloteFor(1);
      team2Points = beloteFor(2);
    }
    // On stocke les points "faits" pour traçabilité dans team1Points/team2Points ?
    // Non, on stocke le score final de la manche (utilisé pour cumul).
  } else {
    // points-annonces : saisit juste si contrat tenu
    contractMet = Boolean(input.contractMet);
    if (contractMet) {
      const score = bidValue * multiplier;
      if (takerTeam === 1) {
        team1Points = score + beloteFor(1);
        team2Points = beloteFor(2);
      } else {
        team2Points = score + beloteFor(2);
        team1Points = beloteFor(1);
      }
    } else {
      team1Points = beloteFor(1);
      team2Points = beloteFor(2);
    }
  }

  return {
    takerTeam,
    bidValue,
    bidType,
    trumpSuit,
    contred,
    surcontred,
    team1Points,
    team2Points,
    beloteTeam,
    contractMet,
    notes,
  };
}

async function recomputeStatus(sheetId: string): Promise<void> {
  const sheet = await prisma.scoreSheet.findUnique({
    where: { id: sheetId },
    include: { rounds: true },
  });
  if (!sheet) return;
  const total1 = sheet.rounds.reduce((s, r) => s + r.team1Points, 0);
  const total2 = sheet.rounds.reduce((s, r) => s + r.team2Points, 0);

  let status = 'in-progress';
  let winningTeam: number | null = null;
  let finishedAt: Date | null = null;

  const t1Reached = total1 >= sheet.targetScore;
  const t2Reached = total2 >= sheet.targetScore;

  if (t1Reached || t2Reached) {
    status = 'finished';
    finishedAt = sheet.finishedAt ?? new Date();
    if (t1Reached && t2Reached) winningTeam = total1 >= total2 ? 1 : 2;
    else winningTeam = t1Reached ? 1 : 2;
  }

  await prisma.scoreSheet.update({
    where: { id: sheetId },
    data: { status, winningTeam, finishedAt },
  });
}

// ============================================================
// Routes
// ============================================================

// GET /api/sheets — mes feuilles + partagées
sheetsRouter.get('/', async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.auth!.userId;
    const sheets = await prisma.scoreSheet.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { shares: { some: { userId } } },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        owner: { select: { username: true } },
        _count: { select: { rounds: true } },
      },
    });
    res.json(sheets.map(s => ({
      id: s.id,
      name: s.name,
      shareCode: s.shareCode,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      finishedAt: s.finishedAt,
      status: s.status,
      winningTeam: s.winningTeam,
      targetScore: s.targetScore,
      scoreMode: s.scoreMode,
      ownerUsername: s.owner.username,
      isOwner: s.ownerId === userId,
      roundCount: s._count.rounds,
      players: {
        team1: [s.team1Player1Name, s.team1Player2Name],
        team2: [s.team2Player1Name, s.team2Player2Name],
      },
    })));
  } catch (err) {
    console.error('List sheets error:', err);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// POST /api/sheets — créer
sheetsRouter.post('/', async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.auth!.userId;
    const {
      team1Player1Name, team1Player2Name,
      team2Player1Name, team2Player2Name,
      team1Player1UserId, team1Player2UserId,
      team2Player1UserId, team2Player2UserId,
      targetScore, scoreMode,
    } = req.body;

    const names = [team1Player1Name, team1Player2Name, team2Player1Name, team2Player2Name];
    if (names.some(n => !n || typeof n !== 'string' || n.trim().length === 0)) {
      res.status(400).json({ error: 'Les 4 noms de joueurs sont requis' });
      return;
    }
    const trimmedNames = names.map(n => String(n).trim().slice(0, 32));

    const target = Number(targetScore);
    if (!Number.isFinite(target) || target < 100 || target > 5000) {
      res.status(400).json({ error: 'Score cible invalide (100-5000)' });
      return;
    }
    const mode = String(scoreMode || 'points-faits');
    if (!VALID_MODES.includes(mode)) {
      res.status(400).json({ error: 'Mode de score invalide' });
      return;
    }

    // Generate unique share code
    let shareCode = '';
    for (let attempt = 0; attempt < 10; attempt++) {
      shareCode = genShareCode();
      const existing = await prisma.scoreSheet.findUnique({ where: { shareCode } });
      if (!existing) break;
    }

    const sheet = await prisma.scoreSheet.create({
      data: {
        ownerId: userId,
        shareCode,
        name: buildSheetName(trimmedNames),
        targetScore: target,
        scoreMode: mode,
        team1Player1Name: trimmedNames[0],
        team1Player2Name: trimmedNames[1],
        team2Player1Name: trimmedNames[2],
        team2Player2Name: trimmedNames[3],
        team1Player1UserId: team1Player1UserId || null,
        team1Player2UserId: team1Player2UserId || null,
        team2Player1UserId: team2Player1UserId || null,
        team2Player2UserId: team2Player2UserId || null,
      },
    });
    res.status(201).json(sheet);
  } catch (err) {
    console.error('Create sheet error:', err);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// GET /api/sheets/:id — détail
sheetsRouter.get('/:id', async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.auth!.userId;
    const sheetId = String(req.params.id);
    const { sheet, isOwner, hasAccess } = await getSheetWithAccess(sheetId, userId);
    if (!sheet) {
      res.status(404).json({ error: 'Feuille introuvable' });
      return;
    }
    if (!hasAccess) {
      res.status(403).json({ error: 'Accès refusé' });
      return;
    }
    const owner = await prisma.user.findUnique({ where: { id: sheet.ownerId }, select: { username: true } });
    res.json({
      id: sheet.id,
      name: sheet.name,
      shareCode: sheet.shareCode,
      createdAt: sheet.createdAt,
      updatedAt: sheet.updatedAt,
      finishedAt: sheet.finishedAt,
      status: sheet.status,
      winningTeam: sheet.winningTeam,
      targetScore: sheet.targetScore,
      scoreMode: sheet.scoreMode,
      isOwner,
      ownerUsername: owner?.username || '?',
      players: {
        team1: [sheet.team1Player1Name, sheet.team1Player2Name],
        team2: [sheet.team2Player1Name, sheet.team2Player2Name],
        team1UserIds: [sheet.team1Player1UserId, sheet.team1Player2UserId],
        team2UserIds: [sheet.team2Player1UserId, sheet.team2Player2UserId],
      },
      rounds: sheet.rounds,
    });
  } catch (err) {
    console.error('Get sheet error:', err);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// POST /api/sheets/:id/rounds — ajouter manche
sheetsRouter.post('/:id/rounds', async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.auth!.userId;
    const sheetId = String(req.params.id);
    const { sheet, hasAccess } = await getSheetWithAccess(sheetId, userId);
    if (!sheet) { res.status(404).json({ error: 'Feuille introuvable' }); return; }
    if (!hasAccess) { res.status(403).json({ error: 'Accès refusé' }); return; }
    if (sheet.status === 'finished') { res.status(400).json({ error: 'Partie terminée' }); return; }

    let computed;
    try {
      computed = computeRoundFromInput(req.body, sheet.scoreMode);
    } catch (e: any) {
      res.status(400).json({ error: e.message || 'Données invalides' });
      return;
    }

    const nextIndex = sheet.rounds.length;
    const round = await prisma.scoreSheetRound.create({
      data: { sheetId: sheet.id, index: nextIndex, ...computed },
    });
    await prisma.scoreSheet.update({ where: { id: sheet.id }, data: { updatedAt: new Date() } });
    await recomputeStatus(sheet.id);

    const updated = await prisma.scoreSheet.findUnique({
      where: { id: sheet.id },
      select: { status: true, winningTeam: true, finishedAt: true },
    });
    res.status(201).json({ round, status: updated?.status, winningTeam: updated?.winningTeam, finishedAt: updated?.finishedAt });
  } catch (err) {
    console.error('Add round error:', err);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// DELETE /api/sheets/:id/rounds/last — annuler la dernière manche
sheetsRouter.delete('/:id/rounds/last', async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.auth!.userId;
    const sheetId = String(req.params.id);
    const { sheet, hasAccess } = await getSheetWithAccess(sheetId, userId);
    if (!sheet) { res.status(404).json({ error: 'Feuille introuvable' }); return; }
    if (!hasAccess) { res.status(403).json({ error: 'Accès refusé' }); return; }
    if (sheet.rounds.length === 0) { res.status(400).json({ error: 'Aucune manche à supprimer' }); return; }

    const last = sheet.rounds[sheet.rounds.length - 1];
    await prisma.scoreSheetRound.delete({ where: { id: last.id } });
    await prisma.scoreSheet.update({
      where: { id: sheet.id },
      data: { status: 'in-progress', winningTeam: null, finishedAt: null },
    });
    await recomputeStatus(sheet.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete last round error:', err);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// DELETE /api/sheets/:id — owner uniquement
sheetsRouter.delete('/:id', async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.auth!.userId;
    const sheetId = String(req.params.id);
    const sheet = await prisma.scoreSheet.findUnique({ where: { id: sheetId } });
    if (!sheet) { res.status(404).json({ error: 'Feuille introuvable' }); return; }
    if (sheet.ownerId !== userId) { res.status(403).json({ error: 'Seul le créateur peut supprimer' }); return; }
    await prisma.scoreSheet.delete({ where: { id: sheet.id } });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete sheet error:', err);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// POST /api/sheets/:id/finish — clôturer manuellement
sheetsRouter.post('/:id/finish', async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.auth!.userId;
    const sheetId = String(req.params.id);
    const { sheet, hasAccess } = await getSheetWithAccess(sheetId, userId);
    if (!sheet) { res.status(404).json({ error: 'Feuille introuvable' }); return; }
    if (!hasAccess) { res.status(403).json({ error: 'Accès refusé' }); return; }
    const total1 = sheet.rounds.reduce((s, r) => s + r.team1Points, 0);
    const total2 = sheet.rounds.reduce((s, r) => s + r.team2Points, 0);
    const winningTeam = total1 === total2 ? null : total1 > total2 ? 1 : 2;
    await prisma.scoreSheet.update({
      where: { id: sheet.id },
      data: { status: 'finished', winningTeam, finishedAt: new Date() },
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Finish sheet error:', err);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// POST /api/sheets/join/:shareCode — rejoindre via QR
sheetsRouter.post('/join/:shareCode', async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.auth!.userId;
    const shareCode = String(req.params.shareCode).toUpperCase();
    const sheet = await prisma.scoreSheet.findUnique({
      where: { shareCode },
    });
    if (!sheet) { res.status(404).json({ error: 'Feuille introuvable' }); return; }
    if (sheet.ownerId !== userId) {
      await prisma.scoreSheetShare.upsert({
        where: { sheetId_userId: { sheetId: sheet.id, userId } },
        update: {},
        create: { sheetId: sheet.id, userId },
      });
    }
    res.json({ id: sheet.id, name: sheet.name });
  } catch (err) {
    console.error('Join sheet error:', err);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});
