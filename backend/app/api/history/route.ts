import { query } from '../../../lib/db';

type HistoryRow = {
  id: number;
  target_word: string;
  attempts: number;
  is_win: boolean;
  created_at: string;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const targetWord = String(body?.targetWord ?? '').trim();
    const attempts = Number(body?.attempts);
    const isWin = Boolean(body?.isWin);

    if (!targetWord || targetWord.length > 5 || Number.isNaN(attempts)) {
      return Response.json(
        { success: false, message: 'Invalid request body' },
        { status: 400 }
      );
    }

    const result = await query(
      'INSERT INTO "GameHistory" (target_word, attempts, is_win) VALUES ($1, $2, $3) RETURNING id, target_word, attempts, is_win, created_at',
      [targetWord, attempts, isWin]
    );

    const record = result.rows[0] as HistoryRow | undefined;

    return Response.json(
      {
        success: true,
        data: record,
      },
      { status: 201 }
    );
  } catch {
    return Response.json(
      { success: false, message: 'Failed to create history record' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const result = await query(
      'SELECT id, target_word, attempts, is_win, created_at FROM "GameHistory" ORDER BY created_at DESC'
    );

    return Response.json({
      success: true,
      data: result.rows as HistoryRow[],
    });
  } catch {
    return Response.json(
      { success: false, message: 'Failed to fetch history records' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const id = Number(url.searchParams.get('id'));

    if (!id || Number.isNaN(id)) {
      return Response.json(
        { success: false, message: 'History id is required' },
        { status: 400 }
      );
    }

    const result = await query(
      'DELETE FROM "GameHistory" WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rowCount === 0) {
      return Response.json(
        { success: false, message: 'History record not found' },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      message: 'History record deleted',
      deletedId: result.rows[0]?.id,
    });
  } catch {
    return Response.json(
      { success: false, message: 'Failed to delete history record' },
      { status: 500 }
    );
  }
}