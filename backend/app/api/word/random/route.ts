import { query } from '../../../../lib/db';

type RandomWordRow = {
  text: string;
};

export async function GET() {
  try {
    const result = await query('SELECT text FROM "Word" ORDER BY RANDOM() LIMIT 1');
    const rows = result.rows as RandomWordRow[];

    const word = rows[0]?.text;

    if (!word) {
      return Response.json(
        { success: false, message: 'No word available' },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      word,
    });
  } catch {
    return Response.json(
      { success: false, message: 'Failed to fetch random word' },
      { status: 500 }
    );
  }
}