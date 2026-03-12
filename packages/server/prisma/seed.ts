import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client.js';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const COSMETIC_ITEMS = [
  // Borders
  { name: 'gold-border', displayName: 'Bordure dorée', category: 'border', cost: 30, preview: 'border-[#d4a843]' },
  { name: 'diamond-border', displayName: 'Bordure diamant', category: 'border', cost: 50, preview: 'border-cyan-400' },
  { name: 'fire-border', displayName: 'Bordure feu', category: 'border', cost: 40, preview: 'border-orange-500' },
  { name: 'rainbow-border', displayName: 'Bordure arc-en-ciel', category: 'border', cost: 80, preview: 'rainbow' },

  // Tables
  { name: 'red-table', displayName: 'Tapis rouge', category: 'table', cost: 50, preview: '#8b1a1a' },
  { name: 'blue-table', displayName: 'Tapis bleu', category: 'table', cost: 50, preview: '#1a3a6b' },
  { name: 'purple-table', displayName: 'Tapis violet', category: 'table', cost: 60, preview: '#4a1a6b' },
  { name: 'black-table', displayName: 'Tapis noir', category: 'table', cost: 70, preview: '#1a1a1a' },

  // Card backs
  { name: 'red-back', displayName: 'Dos rouge', category: 'cardBack', cost: 30, preview: 'from-red-900 to-red-700' },
  { name: 'gold-back', displayName: 'Dos doré', category: 'cardBack', cost: 50, preview: 'from-yellow-700 to-yellow-500' },
  { name: 'green-back', displayName: 'Dos vert', category: 'cardBack', cost: 30, preview: 'from-green-900 to-green-700' },
  { name: 'purple-back', displayName: 'Dos violet', category: 'cardBack', cost: 40, preview: 'from-purple-900 to-purple-700' },
];

async function seed() {
  console.log('Seeding cosmetic items...');

  for (const item of COSMETIC_ITEMS) {
    await prisma.cosmeticItem.upsert({
      where: { name: item.name },
      update: { displayName: item.displayName, cost: item.cost, preview: item.preview },
      create: item,
    });
  }

  console.log(`Seeded ${COSMETIC_ITEMS.length} cosmetic items.`);
  await pool.end();
}

seed().catch(console.error);
