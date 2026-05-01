'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

type LetterStatus = 'correct' | 'present' | 'absent';
type KeyboardLetterStatus = LetterStatus | 'unused';
type GameStatus = 'loading' | 'ready' | 'won' | 'lost' | 'error';

const keyStatusPriority: Record<LetterStatus, number> = {
  absent: 1,
  present: 2,
  correct: 3,
};

const keyboardStatusPriority: Record<KeyboardLetterStatus, number> = {
  unused: 0,
  absent: 1,
  present: 2,
  correct: 3,
};

const keyboardRows = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
const specialKeys = ['ENTER', 'DEL'];

const boardSize = 6;
const wordLength = 5;

const statusPriority: Record<LetterStatus, number> = {
  absent: 1,
  present: 2,
  correct: 3,
};

const createEmptyBoard = () =>
  Array.from({ length: boardSize }, () => Array.from({ length: wordLength }, () => ''));

const createEmptyCellStatuses = () =>
  Array.from({ length: boardSize }, () => Array.from({ length: wordLength }, () => null));

export default function Home() {
  const [boardState, setBoardState] = useState<string[][]>(createEmptyBoard());
  const [cellStatuses, setCellStatuses] = useState<(LetterStatus | null)[][]>(
    createEmptyCellStatuses()
  );
  const [currentRowIndex, setCurrentRowIndex] = useState(0);
  const [currentGuess, setCurrentGuess] = useState('');
  const [keyStatuses, setKeyStatuses] = useState<Record<string, LetterStatus>>({});
  const [targetWord, setTargetWord] = useState('');
  const [gameStatus, setGameStatus] = useState<GameStatus>('ready');
  const [errorMessage, setErrorMessage] = useState('');
  const didSendHistoryRef = useRef(false);

  useEffect(() => {
    const loadTargetWord = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;

        if (!apiUrl) {
          throw new Error('API URL is not configured');
        }

        const response = await fetch(`${apiUrl}/api/word/random`);
        const data = (await response.json()) as {
          success?: boolean;
          word?: string;
          message?: string;
        };

        if (!response.ok || !data.success || !data.word) {
          throw new Error(data.message || 'Failed to load target word');
        }

        setTargetWord(data.word.toLowerCase());
      } catch {
        setErrorMessage('Failed to load target word. Please refresh the page.');
        setGameStatus('error');
      }
    };

    loadTargetWord();
  }, []);

  const attemptsUsed = gameStatus === 'won' || gameStatus === 'lost' ? currentRowIndex + 1 : 0;
  const isInputLocked = gameStatus !== 'ready';

  useEffect(() => {
    if (gameStatus !== 'won' && gameStatus !== 'lost') {
      return;
    }

    if (didSendHistoryRef.current || !targetWord) {
      return;
    }

    didSendHistoryRef.current = true;

    const sendHistory = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;

        if (!apiUrl) {
          throw new Error('API URL is not configured');
        }

        await fetch(`${apiUrl}/api/history`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            targetWord,
            attempts: attemptsUsed,
            isWin: gameStatus === 'won',
          }),
        });
      } catch (error) {
        console.error('Failed to save game history', error);
      }
    };

    sendHistory();
  }, [attemptsUsed, gameStatus, targetWord]);

  const updateBoardRow = useCallback((rowIndex: number, guess: string) => {
    setBoardState((previous) => {
      const next = previous.map((row) => [...row]);
      const nextRow = Array.from({ length: wordLength }, (_, columnIndex) => guess[columnIndex] ?? '');
      next[rowIndex] = nextRow;
      return next;
    });
  }, []);

  const updateKeyStatus = useCallback((letter: string, nextStatus: LetterStatus) => {
    setKeyStatuses((previous) => {
      const currentStatus = previous[letter];

      // CRITICAL: Never downgrade a letter's status. correct > present > absent
      if (currentStatus && keyStatusPriority[nextStatus] <= keyStatusPriority[currentStatus]) {
        return previous;
      }

      return {
        ...previous,
        [letter]: nextStatus,
      };
    });
  }, []);

  const submitGuess = useCallback(() => {
    if (gameStatus !== 'ready' || targetWord.length !== wordLength || currentGuess.length !== wordLength) {
      return;
    }

    const guess = currentGuess.toLowerCase();
    const target = targetWord.toLowerCase();
    const nextCellStatuses = Array.from({ length: wordLength }, () => null as LetterStatus | null);
    const targetLetterCounts = new Map<string, number>();

    for (const letter of target) {
      targetLetterCounts.set(letter, (targetLetterCounts.get(letter) ?? 0) + 1);
    }

    for (let index = 0; index < wordLength; index += 1) {
      if (guess[index] === target[index]) {
        nextCellStatuses[index] = 'correct';
        targetLetterCounts.set(guess[index], (targetLetterCounts.get(guess[index]) ?? 0) - 1);
      }
    }

    for (let index = 0; index < wordLength; index += 1) {
      if (nextCellStatuses[index]) {
        continue;
      }

      const currentLetter = guess[index];
      const remainingCount = targetLetterCounts.get(currentLetter) ?? 0;

      if (remainingCount > 0) {
        nextCellStatuses[index] = 'present';
        targetLetterCounts.set(currentLetter, remainingCount - 1);
      } else {
        nextCellStatuses[index] = 'absent';
      }
    }

    setCellStatuses((previous) => {
      const next = previous.map((row) => [...row]);
      next[currentRowIndex] = nextCellStatuses;
      return next;
    });

    // Update keyboard colors - synchronize with grid evaluation
    for (let index = 0; index < wordLength; index += 1) {
      const letterStatus = nextCellStatuses[index] ?? 'absent';
      updateKeyStatus(guess[index], letterStatus);
    }

    if (guess === target) {
      setGameStatus('won');
      return;
    }

    if (currentRowIndex === boardSize - 1) {
      setGameStatus('lost');
      return;
    }

    setCurrentRowIndex((previous) => previous + 1);
    setCurrentGuess('');
  }, [currentGuess, currentRowIndex, gameStatus, updateKeyStatus, targetWord]);

  const handleInput = useCallback(
    (key: string) => {
      if (gameStatus !== 'ready') {
        return;
      }

      if (/^[A-Z]$/.test(key)) {
        if (currentGuess.length >= wordLength) {
          return;
        }

        const nextGuess = `${currentGuess}${key.toLowerCase()}`;
        setCurrentGuess(nextGuess);
        updateBoardRow(currentRowIndex, nextGuess);
        return;
      }

      if (key === 'DEL') {
        const nextGuess = currentGuess.slice(0, -1);
        setCurrentGuess(nextGuess);
        updateBoardRow(currentRowIndex, nextGuess);
        return;
      }

      if (key === 'ENTER') {
        submitGuess();
      }
    },
    [currentGuess, currentRowIndex, gameStatus, submitGuess, updateBoardRow]
  );

  useEffect(() => {
    const handleKeyboard = (event: KeyboardEvent) => {
      if (event.key === 'Backspace') {
        event.preventDefault();
        handleInput('DEL');
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        handleInput('ENTER');
        return;
      }

      if (/^[a-zA-Z]$/.test(event.key)) {
        handleInput(event.key.toUpperCase());
      }
    };

    window.addEventListener('keydown', handleKeyboard);

    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [handleInput]);

  const getKeyClassName = (status: LetterStatus | undefined, key: string) => {
    const baseClassName =
      'flex h-12 min-w-[2.5rem] items-center justify-center rounded-lg px-2 py-1 text-xs font-bold uppercase transition-all active:scale-95';

    if (status === 'correct') {
      return `${baseClassName} bg-green-600 text-white shadow-md hover:shadow-lg`;
    }

    if (status === 'present') {
      return `${baseClassName} bg-yellow-500 text-white shadow-md hover:shadow-lg`;
    }

    if (status === 'absent') {
      return `${baseClassName} bg-gray-500 text-white shadow-md hover:shadow-lg`;
    }

    // Default state for unused letters
    return `${baseClassName} bg-gray-200 text-black hover:bg-gray-300 shadow-sm`;
  };

  const getSpecialKeyClassName = () => {
    const baseClassName =
      'flex h-12 min-w-16 items-center justify-center rounded-lg px-2 py-1 text-xs font-bold uppercase transition-all active:scale-95';
    return `${baseClassName} bg-gray-200 text-black hover:bg-gray-300 shadow-sm`;
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
            <span className="rounded-full border border-zinc-300 bg-white/70 px-3 py-1 shadow-sm">
              {!targetWord && 'Loading word...'}
              {targetWord && gameStatus === 'ready' && 'Ready to play'}
              {gameStatus === 'won' && 'Solved!'}
              {gameStatus === 'lost' && 'Game over'}
              {gameStatus === 'error' && 'Error'}
            </span>
            <Link
              href="/history"
              className="rounded-full border border-zinc-300 bg-white/70 px-3 py-1 shadow-sm transition-colors hover:bg-zinc-100"
            >
              View History
            </Link>
          </div>
        </header>

        <section className="relative w-full max-w-lg rounded-3xl border border-zinc-300 bg-white/80 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.12)] backdrop-blur-sm sm:p-8">
          {errorMessage ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-center text-sm font-medium text-rose-700">
              {errorMessage}
            </div>
          ) : (
            <>
              <WordleGrid
                boardState={boardState}
                cellStatuses={cellStatuses}
                currentRowIndex={currentRowIndex}
              />

              <WordleKeyboard
                keyboardRows={keyboardRows}
                specialKeys={specialKeys}
                keyStatuses={keyStatuses}
                onKeyPress={handleInput}
                getKeyClassName={getKeyClassName}
                getSpecialKeyClassName={getSpecialKeyClassName}
                disabled={isInputLocked}
              />

              {gameStatus === 'won' || gameStatus === 'lost' ? (
                <GameOverModal
                  isWin={gameStatus === 'won'}
                  targetWord={targetWord}
                  attemptsUsed={attemptsUsed}
                />
              ) : null}
            </>
          )}
        </section>
      </div>
    </main>
  );
}

function WordleGrid({
  boardState,
  cellStatuses,
  currentRowIndex,
}: {
  boardState: string[][];
  cellStatuses: (LetterStatus | null)[][];
  currentRowIndex: number;
}) {
  return (
    <div className="grid gap-3">
      {boardState.map((row, rowIndex) => (
        <div key={rowIndex} className="grid grid-cols-5 gap-3">
          {row.map((letter, columnIndex) => {
            const isCurrentRow = rowIndex === currentRowIndex;
            const status = cellStatuses[rowIndex][columnIndex];

            const statusClassName =
              status === 'correct'
                ? 'border-emerald-600 bg-emerald-600 text-white'
                : status === 'present'
                  ? 'border-amber-500 bg-amber-500 text-white'
                  : status === 'absent'
                    ? 'border-zinc-500 bg-zinc-500 text-white'
                    : isCurrentRow
                      ? 'border-zinc-400 bg-white'
                      : 'border-zinc-200 bg-zinc-50';

            return (
              <div
                key={`${rowIndex}-${columnIndex}`}
                className={`flex aspect-square items-center justify-center rounded-2xl border-2 text-2xl font-bold uppercase transition-colors ${statusClassName}`}
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

function WordleKeyboard({
  keyboardRows,
  specialKeys,
  keyStatuses,
  onKeyPress,
  getKeyClassName,
  getSpecialKeyClassName,
  disabled,
}: {
  keyboardRows: string[];
  specialKeys: string[];
  keyStatuses: Record<string, LetterStatus>;
  onKeyPress: (key: string) => void;
  getKeyClassName: (status: LetterStatus | undefined, key: string) => string;
  getSpecialKeyClassName: () => string;
  disabled: boolean;
}) {
  return (
    <div className="mt-8 flex flex-col gap-3">
      {keyboardRows.map((row) => (
        <div key={row} className="flex justify-center gap-2">
          {row.split('').map((key) => {
            const status = keyStatuses[key];

            return (
              <button
                key={key}
                type="button"
                className={getKeyClassName(status, key)}
                onClick={() => onKeyPress(key)}
                {...(disabled && { disabled: true })}
              >
                {key}
              </button>
            );
          })}
        </div>
      ))}

      <div className="flex justify-center gap-2">
        {specialKeys.map((key) => (
          <button
            key={key}
            type="button"
            className={getSpecialKeyClassName()}
            onClick={() => onKeyPress(key)}
            {...(disabled && { disabled: true })}
          >
            {key}
          </button>
        ))}
      </div>
    </div>
  );
}

function GameOverModal({
  isWin,
  targetWord,
  attemptsUsed,
}: {
  isWin: boolean;
  targetWord: string;
  attemptsUsed: number;
}) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center rounded-3xl bg-zinc-950/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl border border-white/40 bg-white p-6 text-center shadow-2xl">
        <p className={`text-sm font-semibold uppercase tracking-[0.3em] ${isWin ? 'text-emerald-600' : 'text-rose-600'}`}>
          {isWin ? 'You Win' : 'You Lose'}
        </p>
        <h2 className="mt-3 text-3xl font-black tracking-[0.2em] text-zinc-900">
          {isWin ? 'Solved' : 'Game Over'}
        </h2>
        <p className="mt-4 text-sm leading-6 text-zinc-600">
          The correct word was{' '}
          <span className="font-bold uppercase tracking-[0.2em] text-zinc-900">
            {targetWord}
          </span>
          .
        </p>
        <div className="mt-4 rounded-2xl bg-zinc-100 px-4 py-3 text-sm font-medium text-zinc-700">
          Attempts used: {attemptsUsed}
        </div>
      </div>
    </div>
  );
}