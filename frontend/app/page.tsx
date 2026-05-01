'use client';

import { useState } from 'react';

type LetterStatus = 'correct' | 'present' | 'absent';

const keyboardRows = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

const specialKeys = ['ENTER', 'DEL'];

const createEmptyBoard = () =>
  Array.from({ length: 6 }, () => Array.from({ length: 5 }, () => ''));

export default function Home() {
  const [boardState, _setBoardState] = useState<string[][]>(createEmptyBoard());
  const [currentRowIndex, _setCurrentRowIndex] = useState(0);
  const [currentGuess, _setCurrentGuess] = useState('');
  const [letterStatuses, _setLetterStatuses] = useState<Record<string, LetterStatus>>({});

  const getKeyClassName = (key: string) => {
    const status = letterStatuses[key];

    const baseClassName =
      'flex h-14 min-w-[2.25rem] items-center justify-center rounded-md px-2 text-sm font-semibold uppercase tracking-wide transition-colors';

    if (key === 'ENTER' || key === 'DEL') {
      return `${baseClassName} min-w-[4.5rem] bg-zinc-200 text-zinc-700 hover:bg-zinc-300`;
    }

    if (status === 'correct') {
      return `${baseClassName} bg-emerald-600 text-white`;
    }

    if (status === 'present') {
      return `${baseClassName} bg-amber-500 text-white`;
    }

    if (status === 'absent') {
      return `${baseClassName} bg-zinc-500 text-white`;
    }

    return `${baseClassName} bg-zinc-200 text-zinc-800 hover:bg-zinc-300`;
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#f8f4ea,#e9e4d8_45%,#ddd6c9)] px-4 py-8 text-zinc-900">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-3xl flex-col items-center justify-center gap-8">
        <header className="flex w-full flex-col items-center gap-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-500">
            Wordle Clone
          </p>
          <h1 className="text-4xl font-black tracking-[0.2em] text-zinc-900 sm:text-5xl">
            WORDLE
          </h1>
          <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-zinc-600">
            <span className="rounded-full border border-zinc-300 bg-white/70 px-3 py-1 shadow-sm">
              Row {currentRowIndex + 1} of 6
            </span>
            <span className="rounded-full border border-zinc-300 bg-white/70 px-3 py-1 shadow-sm">
              Guess length {currentGuess.length}/5
            </span>
          </div>
        </header>

        <section className="w-full max-w-lg rounded-3xl border border-zinc-300 bg-white/80 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.12)] backdrop-blur-sm sm:p-8">
          <WordleGrid boardState={boardState} currentRowIndex={currentRowIndex} />

          <div className="mt-8 flex flex-col gap-3">
            {keyboardRows.map((row) => (
              <div key={row} className="flex justify-center gap-2">
                {row.split('').map((key) => (
                  <button key={key} type="button" className={getKeyClassName(key)}>
                    {key}
                  </button>
                ))}
              </div>
            ))}

            <div className="flex justify-center gap-2">
              {specialKeys.map((key) => (
                <button key={key} type="button" className={getKeyClassName(key)}>
                  {key}
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function WordleGrid({
  boardState,
  currentRowIndex,
}: {
  boardState: string[][];
  currentRowIndex: number;
}) {
  return (
    <div className="grid gap-3">
      {boardState.map((row, rowIndex) => (
        <div key={rowIndex} className="grid grid-cols-5 gap-3">
          {row.map((letter, columnIndex) => {
            const isCurrentRow = rowIndex === currentRowIndex;

            return (
              <div
                key={`${rowIndex}-${columnIndex}`}
                className={`flex aspect-square items-center justify-center rounded-2xl border-2 text-2xl font-bold uppercase transition-colors ${
                  isCurrentRow ? 'border-zinc-400 bg-white' : 'border-zinc-200 bg-zinc-50'
                }`}
              >
                {letter}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}