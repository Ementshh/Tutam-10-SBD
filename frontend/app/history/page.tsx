'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

type HistoryItem = {
  id: number;
  target_word: string;
  attempts: number;
  is_win: boolean;
  created_at: string;
};

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  const loadHistory = useCallback(async () => {
    try {
      if (!apiUrl) {
        throw new Error('API URL is not configured');
      }

      setIsLoading(true);
      setErrorMessage('');

      const response = await fetch(`${apiUrl}/api/history`);
      const data = (await response.json()) as {
        success?: boolean;
        data?: HistoryItem[];
        message?: string;
      };

      if (!response.ok || !data.success || !Array.isArray(data.data)) {
        throw new Error(data.message || 'Failed to load history records');
      }

      setItems(data.data);
    } catch {
      setErrorMessage('Failed to load history records. Please refresh the page.');
    } finally {
      setIsLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const totalGames = useMemo(() => items.length, [items.length]);

  const handleDelete = useCallback(
    async (id: number) => {
      try {
        if (!apiUrl) {
          throw new Error('API URL is not configured');
        }

        const response = await fetch(`${apiUrl}/api/history?id=${id}`, {
          method: 'DELETE',
        });

        const data = (await response.json()) as {
          success?: boolean;
          message?: string;
        };

        if (!response.ok || !data.success) {
          throw new Error(data.message || 'Failed to delete history record');
        }

        setItems((previous) => previous.filter((item) => item.id !== id));
      } catch {
        setErrorMessage('Failed to delete the selected history record.');
      }
    },
    [apiUrl]
  );

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#f8f4ea,#e9e4d8_45%,#ddd6c9)] px-4 py-8 text-zinc-900">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-col gap-4 rounded-3xl border border-zinc-300 bg-white/80 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.12)] backdrop-blur-sm sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-500">
              Wordle Clone
            </p>
            <h1 className="mt-2 text-4xl font-black tracking-[0.2em] text-zinc-900">
              HISTORY
            </h1>
            <p className="mt-3 text-sm text-zinc-600">
              Total games played: <span className="font-semibold text-zinc-900">{totalGames}</span>
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100"
          >
            Back to Game
          </Link>
        </header>

        <section className="rounded-3xl border border-zinc-300 bg-white/80 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.12)] backdrop-blur-sm sm:p-8">
          {errorMessage ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {errorMessage}
            </div>
          ) : isLoading ? (
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-600">
              Loading history...
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-600">
              No game history found yet.
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-zinc-200">
              <div className="grid grid-cols-[1.2fr_0.7fr_0.8fr_1fr_0.7fr] gap-3 border-b border-zinc-200 bg-zinc-100 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                <span>Word</span>
                <span>Attempts</span>
                <span>Status</span>
                <span>Date</span>
                <span className="text-right">Action</span>
              </div>

              <div className="divide-y divide-zinc-200 bg-white">
                {items.map((item) => {
                  const formattedDate = new Date(item.created_at).toLocaleString('en-US', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  });

                  return (
                    <div
                      key={item.id}
                      className="grid grid-cols-[1.2fr_0.7fr_0.8fr_1fr_0.7fr] gap-3 px-4 py-4 text-sm text-zinc-700"
                    >
                      <span className="font-bold uppercase tracking-[0.2em] text-zinc-900">
                        {item.target_word}
                      </span>
                      <span>{item.attempts}</span>
                      <span>
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${
                            item.is_win
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {item.is_win ? 'Win' : 'Lose'}
                        </span>
                      </span>
                      <span>{formattedDate}</span>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="rounded-full bg-rose-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition-colors hover:bg-rose-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}