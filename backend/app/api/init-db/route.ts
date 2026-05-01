import { query } from '../../../lib/db';

const seedWords = [
  'zonal',
  'quirk',
  'joust',
  'vixen',
  'glyph',
  'nexus',
  'prism',
  'quark',
  'crypt',
  'flint',
  'grove',
  'haunt',
  'ivory',
  'jumbo',
  'knave',
  'lumen',
  'mirth',
  'nifty',
  'ogres',
  'pique',
  'quell',
  'raven',
  'slyly',
  'throb',
  'ulcer',
  'verve',
  'waltz',
  'xenon',
  'yacht',
  'zesty',
  'aegis',
  'braid',
  'coven',
  'droll',
  'elude',
  'fable',
  'grime',
  'hovel',
  'irate',
  'jaunt',
  'knack',
  'lucid',
  'mimic',
  'niche',
  'oboes',
  'plume',
  'quash',
  'rivet',
  'spore',
  'tryst',
];

export async function GET() {
  await query(`
    CREATE TABLE IF NOT EXISTS "Word" (
      id SERIAL PRIMARY KEY,
      text VARCHAR(5) NOT NULL
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS "GameHistory" (
      id SERIAL PRIMARY KEY,
      target_word VARCHAR(5) NOT NULL,
      attempts INT NOT NULL,
      is_win BOOLEAN NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const wordCountResult = await query('SELECT COUNT(*)::int AS count FROM "Word"');
  const wordCount = Number(wordCountResult.rows[0]?.count ?? 0);
  let seededWords = 0;

  if (wordCount === 0) {
    const values = seedWords.map((word) => `('${word}')`).join(', ');

    await query(`INSERT INTO "Word" (text) VALUES ${values};`);
    seededWords = seedWords.length;
  }

  return Response.json({
    success: true,
    message: 'Database initialized successfully',
    tables: ['Word', 'GameHistory'],
    seededWords,
  });
}